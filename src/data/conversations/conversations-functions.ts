import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { conversationConverter } from '../../converters/conversation-converter.ts';
import type { Conversation, DraftConversation } from '@ishtar/commons';

export const fetchConversations = async (currentUserUid: string) => {
  const conversationsRef = query(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
    ).withConverter(conversationConverter),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'asc'),
  );

  const conversationsDocs = await getDocs(conversationsRef);

  return conversationsDocs.docs.map(
    (conversationDoc) => conversationDoc.data() as Conversation,
  );
};

export const fetchConversation = async ({
  currentUserUid,
  conversationId,
}: {
  currentUserUid: string;
  conversationId: string;
}) => {
  const conversationRef = doc(
    firebaseApp.firestore,
    'users',
    currentUserUid,
    'conversations',
    conversationId,
  ).withConverter(conversationConverter);

  const conversationDoc = await getDoc(conversationRef);

  if (!conversationDoc.exists()) {
    throw new Error(`Conversation with ID ${conversationId} does not exist.`);
  }

  const conversation = conversationDoc.data() as Conversation;

  if (conversation.isDeleted) {
    throw new Error(`Conversation with ID ${conversationId} is deleted.`);
  }

  return conversationDoc.data() as Conversation;
};

export const persistConversation = async ({
  currentUserUid,
  draftConversation,
}: {
  currentUserUid: string;
  draftConversation: DraftConversation;
}) => {
  const newConversationRef = await addDoc(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
    ).withConverter(conversationConverter),
    draftConversation,
  );

  return newConversationRef.id;
};

const updateOrDeleteConversation = async ({
  currentUserUid,
  conversationId,
  conversation,
}: {
  currentUserUid: string;
  conversationId: string;
  conversation?: Partial<Conversation>;
}) =>
  await updateDoc(
    doc(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
      conversationId,
    ).withConverter(conversationConverter),
    conversation ?? { isDeleted: true },
  );

export const updateConversation = async ({
  currentUserUid,
  conversationId,
  conversation,
}: {
  currentUserUid: string;
  conversationId: string;
  conversation: Partial<Conversation>;
}) =>
  await updateOrDeleteConversation({
    currentUserUid,
    conversationId,
    conversation,
  });

export const deleteConversation = async ({
  currentUserUid,
  conversationId,
}: {
  currentUserUid: string;
  conversationId: string;
}) =>
  await updateOrDeleteConversation({
    currentUserUid,
    conversationId,
  });
