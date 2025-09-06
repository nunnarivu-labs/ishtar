import { List } from '@mui/material';
import { useConversationsQuery } from '../../data/conversations/use-conversations-query.ts';
import { LoadingSpinner } from '../loading-spinner.tsx';
import { ConversationsListItem } from './conversations-list-item.tsx';

export const ConversationsList = () => {
  const conversationsQuery = useConversationsQuery();

  return (
    <>
      {conversationsQuery.status === 'pending' ? (
        <LoadingSpinner size={50} />
      ) : null}
      {conversationsQuery.status === 'success' ? (
        <List>
          {conversationsQuery.data.map((conversation) => (
            <ConversationsListItem conversation={conversation} />
          ))}
        </List>
      ) : null}
    </>
  );
};
