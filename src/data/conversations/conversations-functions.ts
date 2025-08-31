import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { conversationConverter } from '../../converters/conversation-converter.ts';
import type { Conversation } from '@ishtar/commons/types';
import { queryOptions } from '@tanstack/react-query';

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

  const conversationDocs = await getDocs(conversationsRef);

  const conversationsArr: Conversation[] = [];

  conversationDocs.forEach((conversationDoc) => {
    conversationsArr.push(conversationDoc.data() as Conversation);
  });

  return conversationsArr;
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

  return conversationDoc.data() as Conversation;
};

export const conversationsQueryKey = (currentUserUid: string) => [
  currentUserUid,
  'conversations',
];

export const conversationQueryKey = (
  currentUserUid: string,
  conversationId: string,
) => [currentUserUid, 'conversations', conversationId];

export const conversationsQueryOptions = (currentUserUid: string) =>
  queryOptions({
    queryKey: conversationsQueryKey(currentUserUid),
    queryFn: () => fetchConversations(currentUserUid),
  });

export const conversationQueryOptions = (
  currentUserUid: string,
  conversationId: string,
) =>
  queryOptions({
    queryKey: conversationQueryKey(currentUserUid, conversationId),
    queryFn: () => fetchConversation({ currentUserUid, conversationId }),
  });
