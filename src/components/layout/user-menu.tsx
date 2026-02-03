import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useCallback } from 'react';
import { useAuthenticated } from '../../auth/use-auth.ts';
import { useLoaderData, useRouter } from '@tanstack/react-router';

export const UserMenu = () => {
  const { logout } = useAuthenticated();
  const router = useRouter();

  const user = useLoaderData({ from: '/_authenticated' });

  const signOut = useCallback(async () => {
    await logout();
    await router.invalidate();
  }, [logout, router]);

  return (
    <>
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
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        Logged in as {user.email}
      </Typography>
    </>
  );
};
