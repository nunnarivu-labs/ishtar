import { Box, Stack, Skeleton } from '@mui/material';

export const ContentLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        maxWidth: '90%',
        minWidth: { xs: '70%', md: 200 },
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={1}>
        <Skeleton variant="text" width="80%" animation="wave" />
        <Skeleton variant="text" width="95%" animation="wave" />
        <Skeleton variant="text" width="60%" animation="wave" />
      </Stack>
    </Box>
  </Box>
);
