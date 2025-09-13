import { useLoaderData } from '@tanstack/react-router';

export const useGetCurrentConversation = () => {
  const conversation = useLoaderData({
    from: '/_authenticated/app/{-$conversationId}',
  });

  if (!conversation) {
    throw new Error('Conversation does not exist');
  }

  return conversation;
};
