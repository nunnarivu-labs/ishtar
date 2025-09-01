export const conversationsQueryKey = (currentUserUid: string) => [
  currentUserUid,
  'conversations',
];
export const conversationQueryKey = (
  currentUserUid: string,
  conversationId: string,
) => [currentUserUid, 'conversations', conversationId];
