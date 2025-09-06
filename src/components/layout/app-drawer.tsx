import {
  Drawer,
  styled,
  IconButton,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { DRAWER_WIDTH } from './constants.ts';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import { ConversationsList } from '../conversations/conversations-list.tsx';
import { UserMenu } from './user-menu.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

type AppDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const AppDrawer = ({ isOpen, onClose }: AppDrawerProps) => {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();

  return (
    <Drawer
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
      variant="persistent"
      anchor="left"
      open={isOpen}
    >
      <DrawerHeader>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() =>
                navigate({
                  to: '/app/{-$conversationId}',
                  params: { conversationId: undefined },
                })
              }
              disabled={!conversationId}
            >
              <ListItemIcon>
                <EditSquareIcon />
              </ListItemIcon>
              <ListItemText primary="New Chat" />
            </ListItemButton>
          </ListItem>
        </List>
        <ConversationsList />
      </Box>
      <Box>
        <UserMenu />
      </Box>
    </Drawer>
  );
};
