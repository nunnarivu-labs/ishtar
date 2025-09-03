export const conversationsQueryKey = (currentUserUid: string) => [
  currentUserUid,
  'conversations',
  'list',
];
export const conversationQueryKey = (
  currentUserUid: string,
  conversationId: string,
) => [currentUserUid, 'conversations', 'detail', conversationId];
