import { useEffect, useState, type ReactNode, useCallback } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from '@mui/material/AppBar';
import {
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  useColorScheme,
  useMediaQuery,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {
  useLoaderData,
  useNavigate,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router';
import { useAuthenticated } from '../auth/use-auth.ts';
import Typography from '@mui/material/Typography';
import { Route } from '../routes/_authenticated/app/{-$conversationId}.tsx';
import { LoadingSpinner } from './loading-spinner.tsx';
import { useConversationsQuery } from '../data/conversations/use-conversations-query.ts';
import { deleteConversation } from '../data/conversations/conversations-functions.ts';
import {
  conversationQueryKey,
  conversationsQueryKey,
} from '../data/conversations/conversations-query-keys.ts';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: 0,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

type AppLayoutProps = {
  children: ReactNode;
  onSettingsClick: () => void;
};

export const AppLayout = ({ children, onSettingsClick }: AppLayoutProps) => {
  const router = useRouter();
  const navigate = useNavigate();

  const { queryClient, currentUserUid } = useRouteContext({
    from: '/_authenticated/app/{-$conversationId}',
  });
  const { conversationId } = Route.useParams();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isDrawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const colorScheme = useColorScheme();
  const conversationsQuery = useConversationsQuery();
  const { logout } = useAuthenticated();
  const user = useLoaderData({ from: '/_authenticated' });

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(!isDrawerOpen);
  }, [isDrawerOpen]);

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

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

  const signOut = useCallback(async () => {
    await logout();
    await router.invalidate();
  }, [logout, router]);

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
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        open={isDrawerOpen}
        color="inherit"
        elevation={0}
        // sx={{ borderColor: 'divider' }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2, ...(isDrawerOpen && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            color="inherit"
            onClick={() =>
              colorScheme.setMode(
                colorScheme.mode === 'dark' ? 'light' : 'dark',
              )
            }
          >
            {theme.palette.mode === 'dark' ? (
              <Tooltip title="Switch to Light Mode">
                <LightModeIcon />
              </Tooltip>
            ) : (
              <Tooltip title="Switch to Dark Mode">
                <DarkModeIcon />
              </Tooltip>
            )}
          </IconButton>
          <IconButton color="inherit" onClick={onSettingsClick}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={isDrawerOpen}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
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
          {conversationsQuery.status === 'pending' ? (
            <LoadingSpinner size={50} />
          ) : null}
          {conversationsQuery.status === 'success' ? (
            <List>
              {conversationsQuery.data.map((conversation) => (
                <ListItem
                  key={conversation.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="more options"
                      onClick={(event) =>
                        handleMenuOpen(event, conversation.id)
                      }
                    >
                      <MoreVertIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    onClick={() =>
                      navigate({
                        to: '/app/{-$conversationId}',
                        params: { conversationId: conversation.id },
                      })
                    }
                    selected={conversation.id === conversationId}
                  >
                    <ListItemText primary={conversation.title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : null}
        </Box>
        <Box>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={signOut}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
          <Typography
            variant="caption"
            sx={{
              px: 2,
              pb: 2,
              color: 'text.secondary',
              display: 'block',
            }}
          >
            Logged in as {user.email}
          </Typography>
        </Box>
      </Drawer>

      <Main open={isDrawerOpen}>
        <DrawerHeader />
        {children}
      </Main>

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
    </Box>
  );
};
