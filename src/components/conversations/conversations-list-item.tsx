import type { Conversation } from '@ishtar/commons/types';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';
import {
  useNavigate,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import {
  ListItemIcon,
  Menu,
  MenuItem,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteConversation } from '../../data/conversations/conversations-functions.ts';
import {
  conversationQueryKey,
  conversationsQueryKey,
} from '../../data/conversations/conversations-query-keys.ts';

type ConversationsListItemProps = {
  conversation: Conversation;
  index: number;
  height?: number;
  start?: number;
};

export const ConversationsListItem = ({
  conversation,
  index,
  height,
  start,
}: ConversationsListItemProps) => {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const { queryClient, currentUserUid } = useRouteContext({
    from: '/_authenticated',
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, id: string) => {
      setAnchorEl(event.currentTarget);
      setSelectedConversationId(id);
    },
    [],
  );

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const doDeleteConversation = useCallback(async () => {
    if (selectedConversationId) {
      await deleteConversation({
        currentUserUid,
        conversationId: selectedConversationId,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: conversationsQueryKey(currentUserUid),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: conversationQueryKey(
            currentUserUid,
            selectedConversationId,
          ),
          exact: true,
        }),
        router.invalidate(),
      ]);
    }

    handleMenuClose();
  }, [
    currentUserUid,
    handleMenuClose,
    queryClient,
    router,
    selectedConversationId,
  ]);

  return (
    <>
      <ListItem
        data-index={index}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: height ? `${height}px` : undefined,
          transform: start ? `translateY(${start}px)` : undefined,
        }}
        disablePadding
        secondaryAction={
          <IconButton
            edge="end"
            aria-label="more options"
            onClick={(event) => handleMenuOpen(event, conversation.id)}
          >
            <MoreVertIcon />
          </IconButton>
        }
      >
        <Tooltip title={conversation.title} placement="auto">
          <ListItemButton
            onClick={() =>
              navigate({
                to: '/app/{-$conversationId}',
                params: { conversationId: conversation.id },
              })
            }
            selected={conversation.id === conversationId}
            sx={{ height: '100%' }}
          >
            <ListItemText
              primary={conversation.title}
              sx={{ minWidth: 0 }}
              slotProps={{
                primary: {
                  sx: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                },
              }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={doDeleteConversation} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </>
  );
};
