import {
  Content,
  GenerateContentConfig,
  GoogleGenAI,
  Part,
  createPartFromUri,
  GenerateContentResponse,
} from '@google/genai';
import { safetySettings } from '../gemini/safety-settings';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AiRequest,
  AiResponse,
  Conversation,
  DraftMessage,
  Message,
  Model,
} from '@ishtar/commons/types';
import { db } from '../index';
import admin from 'firebase-admin';
import { chatMessageConverter } from '../converters/message-converter';
import { fileConverter } from '../converters/file-converter';
import { fileCacheConverter } from '../converters/file-cache-converter';

let geminiAI: GoogleGenAI;

const chatConfig: GenerateContentConfig = {
  safetySettings,
};

async function buildContentFromMessage(
  message: Message,
  {
    currentUserUid,
    conversationId,
  }: { currentUserUid: string; conversationId: string },
): Promise<Content> {
  const parts: (Part | null)[] = await Promise.all(
    message.contents.map(async (content): Promise<Part | null> => {
      if (content.type === 'file') {
        const { uri, mimeType } = await getFileContent(geminiAI, {
          fileId: content.fileId,
          currentUserUid,
          conversationId,
        });

        return createPartFromUri(uri, mimeType);
      } else if (content.type === 'text') {
        return { text: content.text };
      }

      return null;
    }),
  );

  return { role: message.role, parts: parts.filter((part) => part !== null) };
}

async function getContentsArray(
  data: admin.firestore.QuerySnapshot<Message, admin.firestore.DocumentData>,
  {
    currentUserUid,
    conversationId,
  }: { currentUserUid: string; conversationId: string },
): Promise<Content[]> {
  return await Promise.all(
    data.docs
      .filter((doc) => doc.exists && doc.data().role !== 'system')
      .map(
        async (doc) =>
          await buildContentFromMessage(doc.data(), {
            conversationId,
            currentUserUid,
          }),
      ),
  );
}

export const callAi = onCall<AiRequest>(
  { secrets: ['GEMINI_API_KEY'], timeoutSeconds: 300 },
  async (request): Promise<AiResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        'unauthenticated',
        'You must be authenticated to call this function.',
      );
    }

    const currentUserUid = request.auth.uid;

    if (!geminiAI) {
      geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    }

    const { promptMessageId, conversationId } = request.data;

    const conversationsRef = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('conversations');

    const conversationRef = conversationsRef.doc(conversationId);
    const conversationData = await conversationRef.get();
    const conversation = conversationData.data() as Conversation;

    if (!conversation) {
      throw new HttpsError(
        'internal',
        'Something went wrong while creating the conversation.',
      );
    }

    const textTokenCountSinceLastSummary =
      conversation.textTokenCountSinceLastSummary;

    const messagesRef = conversationRef
      .collection('messages')
      .withConverter(chatMessageConverter);

    const promptMessageRef = messagesRef.doc(promptMessageId);
    const promptMessageSnapshot = await promptMessageRef.get();

    if (!promptMessageSnapshot.exists) {
      throw new HttpsError(
        'permission-denied',
        `Prompt with ID ${promptMessageId} is not found.`,
      );
    }

    const prompt = promptMessageSnapshot.data();

    if (!prompt) {
      throw new HttpsError(
        'permission-denied',
        `Prompt with ID ${promptMessageId} is undefined.`,
      );
    }

    let messagesInOrderDoc: admin.firestore.QuerySnapshot<
      Message,
      admin.firestore.DocumentData
    >;
    const contents: Content[] = [];

    const model = conversation.chatSettings.model;

    if (!model) {
      throw new HttpsError('permission-denied', 'No AI model available.');
    }

    const isChatModel = conversation.chatSettings.enableMultiTurnConversation;

    const systemInstruction =
      conversation.chatSettings.systemInstruction ?? undefined;

    let tokenCount = 0;

    const batch = db.batch();

    if (isChatModel) {
      let textPromptsTokenCount: number;

      if (conversation.summarizedMessageId) {
        const summarizedMessageDoc = await messagesRef
          .doc(conversation.summarizedMessageId)
          .get();

        const previousMessagesInOrderSnapshot = await messagesRef
          .orderBy('timestamp', 'desc')
          .orderBy(admin.firestore.FieldPath.documentId())
          .startAfter(summarizedMessageDoc)
          .limit(10)
          .get();

        contents.push(
          ...(
            await getContentsArray(previousMessagesInOrderSnapshot, {
              currentUserUid,
              conversationId,
            })
          ).reverse(),
        );

        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .orderBy(admin.firestore.FieldPath.documentId())
          .startAt(summarizedMessageDoc)
          .get();

        const contentsSinceSummary = await getContentsArray(
          messagesInOrderDoc,
          {
            currentUserUid,
            conversationId,
          },
        );

        contents.push(...contentsSinceSummary);

        textPromptsTokenCount = await getTextPromptsTokenCount(geminiAI, {
          contents: contentsSinceSummary,
          model,
        });
      } else {
        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .get();

        const contentsFromBeginning = await getContentsArray(
          messagesInOrderDoc,
          {
            currentUserUid,
            conversationId,
          },
        );

        contents.push(...contentsFromBeginning);

        textPromptsTokenCount = await getTextPromptsTokenCount(geminiAI, {
          contents: contentsFromBeginning,
          model,
        });
      }

      tokenCount = textTokenCountSinceLastSummary + textPromptsTokenCount;

      batch.update(conversationRef, {
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        textTokenCountSinceLastSummary: tokenCount,
      });
    } else {
      contents.push(
        await buildContentFromMessage(prompt, {
          currentUserUid,
          conversationId,
        }),
      );
    }

    let response: GenerateContentResponse;

    try {
      response = await geminiAI.models.generateContent({
        model,
        contents,
        config: {
          ...chatConfig,
          systemInstruction,
          temperature: conversation.chatSettings.temperature,
          ...(conversation.chatSettings.enableThinking
            ? {
                ...(conversation.chatSettings.thinkingCapacity === null
                  ? {}
                  : {
                      thinkingConfig: {
                        thinkingBudget:
                          conversation.chatSettings.thinkingCapacity,
                      },
                    }),
              }
            : {
                thinkingConfig: {
                  thinkingBudget: 0,
                },
              }),
        },
      });
    } catch (error) {
      await batch.commit();

      console.error(error);
      throw new HttpsError(
        'internal',
        'Something went wrong while generating response.',
      );
    }

    if (!response) {
      await batch.commit();

      throw new HttpsError('internal', 'AI server failed to respond.');
    }

    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount =
      (response.usageMetadata?.candidatesTokenCount ?? 0) +
      (response.usageMetadata?.thoughtsTokenCount ?? 0);

    console.log(`Usage metadata: ${JSON.stringify(response.usageMetadata)}`);

    let totalInputTokenCount = conversation.inputTokenCount + inputTokenCount;
    let totalOutputTokenCount =
      conversation.outputTokenCount + outputTokenCount;

    batch.update(conversationRef, {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      inputTokenCount: totalInputTokenCount,
      outputTokenCount: totalOutputTokenCount,
    });

    if (!response.text) {
      console.log('Response not generated by AI.');
      console.log(JSON.stringify(response));

      await batch.commit();

      if (response.promptFeedback?.blockReason) {
        throw new HttpsError(
          'permission-denied',
          response.promptFeedback.blockReasonMessage ??
            'AI refused to generate a response.',
        );
      }

      throw new HttpsError(
        'permission-denied',
        'The AI model failed to generate a response. Please try again.',
      );
    }

    const newModelMessageRef = messagesRef.doc();

    batch.set(newModelMessageRef, {
      role: 'model',
      contents: [{ type: 'text', text: response.text }],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isSummary: false,
    } as unknown as DraftMessage);

    await batch.commit();

    if (isChatModel && tokenCount >= 75000) {
      try {
        const summaryResponse = await generateSummary({
          messagesInOrderDoc: messagesInOrderDoc!,
          messagesRef,
          systemInstruction: conversation.chatSettings.systemInstruction,
          responseFromModel: response.text,
          currentUserUid,
          conversationId,
        });

        if (summaryResponse) {
          const { summarizedMessageId, inputTokenCount, outputTokenCount } =
            summaryResponse;

          totalInputTokenCount += inputTokenCount;
          totalOutputTokenCount += outputTokenCount;

          await conversationsRef.doc(conversationId).set(
            {
              summarizedMessageId: summarizedMessageId,
              textTokenCountSinceLastSummary: 0,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
              inputTokenCount: totalInputTokenCount,
              outputTokenCount: totalOutputTokenCount,
            },
            { merge: true },
          );
        }
      } catch (error) {
        console.warn('Summarization failed.');
        console.error(error);
      }
    }

    return {
      promptMessageId,
      modelMessageId: newModelMessageRef.id,
      conversationId,
    };
  },
);

async function getTextPromptsTokenCount(
  ai: GoogleGenAI,
  {
    contents,
    model,
  }: {
    contents: Content[];
    model: Model;
  },
): Promise<number> {
  const contentsWithoutFileParts = contents.map((content) => {
    const newContent = { ...content };
    newContent.parts = newContent.parts?.filter(
      (part) => !!part.text && !part.fileData,
    );

    return newContent;
  });

  const result = await ai.models.countTokens({
    contents: contentsWithoutFileParts,
    model,
  });

  return result?.totalTokens ?? 0;
}

async function generateSummary({
  messagesInOrderDoc,
  responseFromModel,
  systemInstruction,
  messagesRef,
  currentUserUid,
  conversationId,
}: {
  currentUserUid: string;
  conversationId: string;
  messagesInOrderDoc: admin.firestore.QuerySnapshot<
    Message,
    admin.firestore.DocumentData
  >;
  messagesRef: admin.firestore.CollectionReference<
    Message,
    admin.firestore.DocumentData
  >;
  responseFromModel: string;
  systemInstruction?: string | null;
}): Promise<{
  summarizedMessageId: string;
  inputTokenCount: number;
  outputTokenCount: number;
} | null> {
  const summarizationPrompt =
    'Based on the conversation above, provide a concise summary that captures the essence for future reference.';

  const contentsToSummarize: Content[] = [
    ...(messagesInOrderDoc.size > 0
      ? await getContentsArray(messagesInOrderDoc, {
          currentUserUid,
          conversationId,
        })
      : []),
    { role: 'model', parts: [{ text: responseFromModel }] },
    {
      role: 'user',
      parts: [
        {
          text: summarizationPrompt,
        },
      ],
    },
  ];

  const batch = db.batch();

  const instructions = [
    `You are an AI tasked with generating concise, factual summaries of chat conversations for long-term memory. Extract all key information: user's primary goal, decisions made, critical facts exchanged, any unresolved issues, and the current status of the conversation. The summary should be readable by another AI for future context. Do NOT include conversational filler, greetings, or pleasantries. Keep it under 4000 tokens.`,
  ];

  if (systemInstruction) {
    instructions.push(
      `Original system instruction used in the chats you are to summarize: "${systemInstruction}"`,
    );
  }

  const newSystemMessageRef = messagesRef.doc();
  batch.set(newSystemMessageRef, {
    role: 'system',
    contents: [{ type: 'text', text: summarizationPrompt }],
    timestamp: new Date(),
    isSummary: false,
  } as Message);

  const summaryResponse = await geminiAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contentsToSummarize,
    config: {
      ...chatConfig,
      temperature: 0.3,
      systemInstruction: instructions,
      thinkingConfig: { thinkingBudget: -1 },
    },
  });

  if (
    summaryResponse.text &&
    !summaryResponse.promptFeedback?.blockReasonMessage
  ) {
    const inputTokenCount =
      summaryResponse.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount =
      (summaryResponse.usageMetadata?.candidatesTokenCount ?? 0) +
      (summaryResponse.usageMetadata?.thoughtsTokenCount ?? 0);

    const newModelSummarizedMessageRef = messagesRef.doc();
    batch.set(newModelSummarizedMessageRef, {
      role: 'model',
      contents: [{ type: 'text', text: summaryResponse.text }],
      timestamp: new Date(),
      isSummary: true,
    } as Message);

    await batch.commit();

    return {
      summarizedMessageId: newModelSummarizedMessageRef.id,
      inputTokenCount,
      outputTokenCount,
    };
  }

  return null;
}

const FORTY_FIVE_HOURS_IN_MILLISECONDS = 45 * 60 * 60 * 1000;

async function getFileContent(
  ai: GoogleGenAI,
  {
    currentUserUid,
    conversationId,
    fileId,
  }: { currentUserUid: string; conversationId: string; fileId: string },
): Promise<{ uri: string; mimeType: string }> {
  const conversationRef = db.doc(
    `users/${currentUserUid}/conversations/${conversationId}`,
  );

  const filesCacheRef = conversationRef.collection('fileCache');

  const fileCacheRef = filesCacheRef
    .doc(fileId)
    .withConverter(fileCacheConverter);

  const fileCacheSnapshot = await fileCacheRef.get();

  const cacheData = fileCacheSnapshot.data();

  if (
    cacheData &&
    new Date().getTime() - new Date(cacheData.createdAt).getTime() <=
      FORTY_FIVE_HOURS_IN_MILLISECONDS
  ) {
    console.log('cache found and valid');
    return { uri: cacheData.uri, mimeType: cacheData.mimeType };
  }

  console.log(cacheData ? 'cache expired' : 'cache does not exist');

  const fileDataRef = conversationRef
    .collection('files')
    .doc(fileId)
    .withConverter(fileConverter);

  const fileDataSnapshot = await fileDataRef.get();
  const fileData = fileDataSnapshot.data();

  if (!fileData) {
    throw new Error(
      `File document with ID ${fileId} in conversation ${conversationId} for user ${currentUserUid} is not found`,
    );
  }

  const blob = new Blob(
    await admin.storage().bucket().file(fileData.storagePath).download(),
  );

  const file = await ai.files.upload({
    file: blob,
    config: {
      mimeType: fileData.type,
      displayName: fileData.originalFileName,
    },
  });

  if (!file.name || !file.uri || !file.mimeType)
    throw new Error('File upload to AI failed');

  await filesCacheRef.doc(fileId).set({
    uri: file.uri,
    mimeType: file.mimeType,
    name: file.name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uri: file.uri, mimeType: file.mimeType };
}
