import {
  Content,
  GenerateContentConfig,
  GoogleGenAI,
  Part,
  createPartFromUri,
} from '@google/genai';
import { safetySettings } from '../gemini/safety-settings';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AiRequest,
  AiResponse,
  Conversation,
  DraftMessage,
  Message,
  FileData,
} from '@ishtar/commons/types';
import { db } from '../index';
import admin from 'firebase-admin';
import { chatMessageConverter } from '../converters/message-converter';
import { getUserById } from '../cache/user-cache';
import { getGlobalSettings } from '../cache/global-settings';
import { fileConverter } from '../converters/file-converter';
import { fileCacheConverter } from '../converters/file-cache-converter';

let geminiAI: GoogleGenAI;

const chatConfig: GenerateContentConfig = {
  safetySettings,
};

function countTokens(
  data: admin.firestore.QuerySnapshot<Message, admin.firestore.DocumentData>,
): number {
  return data.docs.reduce((count, item) => {
    if (item.exists) {
      count += item.data().tokenCount ?? 0;
    }

    return count;
  }, 0);
}

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

    const user = await getUserById(request.auth.uid);
    const globalSettings = getGlobalSettings(user.role);

    const { promptMessageId, conversationId } = request.data;

    const conversationsRef = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('conversations');

    const conversationRef = conversationsRef.doc(conversationId);
    const conversationData = await conversationRef.get();

    if (!conversationData.exists) {
      throw new HttpsError(
        'internal',
        'Something went wrong while creating the conversation.',
      );
    }

    const conversation = conversationData.data() as Conversation;

    const messagesRef = conversationRef
      .collection('messages')
      .withConverter(chatMessageConverter);

    const promptMessageRef = messagesRef.doc(promptMessageId);
    const promptMessage = await promptMessageRef.get();

    if (!promptMessage.exists) {
      throw new HttpsError(
        'permission-denied',
        `Prompt with ID ${promptMessageId} is not found.`,
      );
    }

    const prompt = promptMessage.data() as Message;

    let messagesInOrderDoc: admin.firestore.QuerySnapshot<
      Message,
      admin.firestore.DocumentData
    >;
    const contents: Content[] = [];

    const model =
      conversation?.chatSettings?.model ?? globalSettings.defaultModel;

    if (!model) {
      throw new HttpsError('permission-denied', 'No AI model available.');
    }

    const isChatModel =
      conversation?.chatSettings?.enableMultiTurnConversation ?? false;

    /**
     * If chat token and this count crosses 50,000, summarize.
     */
    let tokenCount = 0;

    if (isChatModel) {
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

        tokenCount += countTokens(previousMessagesInOrderSnapshot);

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

        tokenCount += countTokens(messagesInOrderDoc);

        contents.push(
          ...(await getContentsArray(messagesInOrderDoc, {
            currentUserUid,
            conversationId,
          })),
        );
      } else {
        messagesInOrderDoc = await messagesRef
          .orderBy('timestamp', 'asc')
          .get();

        tokenCount += countTokens(messagesInOrderDoc);

        contents.push(
          ...(await getContentsArray(messagesInOrderDoc, {
            currentUserUid,
            conversationId,
          })),
        );
      }
    } else {
      contents.push(
        await buildContentFromMessage(prompt, {
          currentUserUid,
          conversationId,
        }),
      );
    }

    const response = await geminiAI.models.generateContent({
      model,
      contents,
      config: {
        ...chatConfig,
        systemInstruction:
          conversation?.chatSettings?.systemInstruction ?? undefined,
        temperature:
          conversation?.chatSettings?.temperature ?? globalSettings.temperature,
        ...(conversation?.chatSettings?.enableThinking
          ? {
              ...(conversation?.chatSettings?.thinkingCapacity === null
                ? {}
                : {
                    thinkingConfig: {
                      thinkingBudget: conversation.chatSettings
                        .thinkingCapacity as number,
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

    if (!response) {
      throw new HttpsError('internal', 'AI server failed to respond.');
    }

    const inputTokenCount = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokenCount =
      (response.usageMetadata?.candidatesTokenCount ?? 0) +
      (response.usageMetadata?.thoughtsTokenCount ?? 0);

    console.log(`Usage metadata: ${JSON.stringify(response.usageMetadata)}`);

    const batch = db.batch();

    batch.update(promptMessageRef, {
      tokenCount: inputTokenCount,
    });

    tokenCount += inputTokenCount;

    let totalInputTokenCount =
      (conversation.inputTokenCount ?? 0) + inputTokenCount;
    let totalOutputTokenCount =
      (conversation.outputTokenCount ?? 0) + outputTokenCount;

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

    const modelMessage: DraftMessage = {
      role: 'model',
      contents: [{ type: 'text', text: response.text }],
      timestamp: new Date(),
      tokenCount: outputTokenCount,
      isSummary: false,
    };

    batch.set(newModelMessageRef, modelMessage);

    tokenCount += outputTokenCount;

    await batch.commit();

    if (isChatModel && tokenCount >= 75000) {
      try {
        const summaryResponse = await generateSummary({
          messagesInOrderDoc: messagesInOrderDoc!,
          messagesRef,
          systemInstruction: conversation?.chatSettings?.systemInstruction,
          responseFromModel: response.text,
          currentUserUid,
          conversationId,
        });

        if (summaryResponse) {
          const { summarizedMessageId, inputTokenCount, outputTokenCount } =
            summaryResponse;

          totalInputTokenCount += inputTokenCount;
          totalOutputTokenCount += outputTokenCount;

          const convoRef = conversationsRef.doc(conversationId);
          const convo = await convoRef.get();

          if (convo.exists) {
            await convoRef.update({
              summarizedMessageId: summarizedMessageId,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
              inputTokenCount: totalInputTokenCount,
              outputTokenCount: totalOutputTokenCount,
            });
          }
        }
      } catch (error) {
        console.warn('Summarization failed.');
        console.error(error);
      }
    }

    JSON.stringify(`model used: ${JSON.stringify(response.modelVersion)}`);
    JSON.stringify(
      `prompt feedback: ${JSON.stringify(response.promptFeedback)}`,
    );

    return {
      promptMessageId,
      modelMessageId: newModelMessageRef.id,
      conversationId,
    };
  },
);

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
    tokenCount: null,
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

    batch.update(newSystemMessageRef, {
      tokenCount: inputTokenCount,
    });

    const newModelSummarizedMessageRef = messagesRef.doc();
    batch.set(newModelSummarizedMessageRef, {
      role: 'model',
      contents: [{ type: 'text', text: summaryResponse.text }],
      timestamp: new Date(),
      tokenCount: outputTokenCount,
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

  if (fileCacheSnapshot.exists) {
    console.log('cache found');

    const cacheData = fileCacheSnapshot.data();

    if (!cacheData) throw new Error('Cache data is undefined');

    return { uri: cacheData.uri, mimeType: cacheData.mimeType };
  }

  console.log('cache does not exist');

  const fileDataRef = conversationRef
    .collection('files')
    .doc(fileId)
    .withConverter(fileConverter);

  const fileDataSnapshot = await fileDataRef.get();

  if (!fileDataSnapshot.exists) {
    throw new Error(
      `File document with ID ${fileId} in conversation ${conversationId} for user ${currentUserUid} is not found`,
    );
  }

  const fileData: FileData = fileDataSnapshot.data() as FileData;

  const blob = await fetch(fileData.url).then((resp) => resp.blob());

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
