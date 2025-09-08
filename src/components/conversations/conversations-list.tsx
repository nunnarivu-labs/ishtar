import { List, Box } from '@mui/material';
import { useConversationsQuery } from '../../data/conversations/use-conversations-query.ts';
import { LoadingSpinner } from '../loading-spinner.tsx';
import { ConversationsListItem } from './conversations-list-item.tsx';
import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';

export const ConversationsList = () => {
  const conversationsQuery = useConversationsQuery();
  const { conversationId } = Route.useParams();

  const conversations = useMemo(
    () =>
      conversationsQuery.status === 'success' ? conversationsQuery.data : [],
    [conversationsQuery.data, conversationsQuery.status],
  );

  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 2,
  });

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      virtualizer.scrollToIndex(
        conversations.findIndex(
          (conversation) => conversation.id === conversationId,
        ),
        { align: 'center', behavior: 'smooth' },
      );
    }
  }, [conversationId, conversations, virtualizer]);

  return (
    <>
      {conversationsQuery.status === 'pending' ? (
        <LoadingSpinner size={50} />
      ) : null}
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }} ref={parentRef}>
        <List
          sx={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const conversation = conversations[virtualItem.index];
            return (
              <ConversationsListItem
                conversation={conversation}
                index={virtualItem.index}
                height={virtualItem.size}
                start={virtualItem.start}
                key={virtualItem.index}
              />
            );
          })}
        </List>
      </Box>
    </>
  );
};
