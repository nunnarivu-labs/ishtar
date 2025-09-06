import { type ReactNode } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { DRAWER_WIDTH } from './constants.ts';
import { AppDrawer } from './app-drawer.tsx';
import { useDrawer } from './use-drawer.ts';
import { AppBar } from './app-bar.tsx';

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: 0,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${DRAWER_WIDTH}px`,
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
  const { isDrawerOpen, openDrawer, closeDrawer } = useDrawer();

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar
        isOpen={isDrawerOpen}
        onOpen={openDrawer}
        onSettingsClick={onSettingsClick}
      />
      <AppDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
      <Main open={isDrawerOpen}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
};
