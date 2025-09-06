import { useCallback, useEffect, useState } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

type UseDrawerResult = {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useDrawer = (): UseDrawerResult => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isDrawerOpen, setIsDrawerOpen] = useState(!isMobile);

  useEffect(() => {
    setIsDrawerOpen(!isMobile);
  }, [isMobile]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return { isDrawerOpen, openDrawer, closeDrawer };
};
