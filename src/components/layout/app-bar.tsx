import { Toolbar, IconButton, Box, styled } from '@mui/material';
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from '@mui/material/AppBar';
import MenuIcon from '@mui/icons-material/Menu';
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

export const AppBar = ({ isOpen, onOpen, onSettingsClick }: AppBarProps) => (
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
      <IconButton color="inherit" onClick={onSettingsClick}>
        <SettingsIcon />
      </IconButton>
    </Toolbar>
  </StyledAppBar>
);
