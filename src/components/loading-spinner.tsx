import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

type LoadingSpinnerProps = { size?: number };

export const LoadingSpinner = ({ size = 100 }: LoadingSpinnerProps) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress size={size} />
  </Box>
);
