import {
  Toolbar,
  IconButton,
  Box,
  Tooltip,
  useColorScheme,
  useTheme,
  styled,
} from '@mui/material';
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from '@mui/material/AppBar';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsIcon from '@mui/icons-material/Settings';
import { DRAWER_WIDTH } from './constants.ts';

interface StyledAppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<StyledAppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${DRAWER_WIDTH}px)`,
    marginLeft: `${DRAWER_WIDTH}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

type AppBarProps = {
  isOpen: boolean;
  onOpen: () => void;
  onSettingsClick: () => void;
};

export const AppBar = ({ isOpen, onOpen, onSettingsClick }: AppBarProps) => {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <StyledAppBar position="fixed" open={isOpen} color="inherit" elevation={0}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onOpen}
          edge="start"
          sx={{ mr: 2, ...(isOpen && { display: 'none' }) }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          color="inherit"
          onClick={() =>
            colorScheme.setMode(colorScheme.mode === 'dark' ? 'light' : 'dark')
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
    </StyledAppBar>
  );
};
