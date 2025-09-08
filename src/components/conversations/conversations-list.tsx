import { List, Box } from '@mui/material';
import { useConversationsQuery } from '../../data/conversations/use-conversations-query.ts';
import { LoadingSpinner } from '../loading-spinner.tsx';
import { ConversationsListItem } from './conversations-list-item.tsx';
import { useRef } from 'react';

export const ConversationsList = () => {
  const conversationsQuery = useConversationsQuery();
  const conversations =
    conversationsQuery.status === 'success' ? conversationsQuery.data : [];

  const parentRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      {conversationsQuery.status === 'pending' ? (
        <LoadingSpinner size={50} />
      ) : null}
      <Box sx={{ overflowY: 'auto' }} ref={parentRef}>
        <List>
          {conversations.map((conversation) => (
            <ConversationsListItem conversation={conversation} />
          ))}
        </List>
      </Box>
    </>
  );
};
