import React, {
  type JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NoMessageScreen } from './no-message-screen.tsx';
import { useRenderMessage } from './hooks/use-render-message.tsx';
import { InputField, type InputFieldRef } from './input-field.tsx';
import { useMediaQuery, useTheme } from '@mui/material';
import { useMessages } from '../data/messages/use-messages.ts';
import { useLoaderData } from '@tanstack/react-router';

export const AiContent = (): JSX.Element => {
  const inputFieldRef = useRef<InputFieldRef>(null);
  const elementHeightCacheRef = useRef(new Map<string, number>());
  const parentRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const scrollHeightBeforeFetch = useRef(0);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const {
    messages,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
    status,
    mutationStatus,
    mutate,
  } = useMessages({
    inputFieldRef,
  });

  const lastMessageId = useRef(
    messages.length > 0 ? messages[messages.length - 1].id : null,
  );

  const conversation = useLoaderData({
    from: '/_authenticated/app/{-$conversationId}',
  });

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index) => {
        const message = messages[index];

        if (!message) return 150;

        return elementHeightCacheRef.current.get(message.id) ?? 150;
      },
      [messages],
    ),
    overscan: 2,
  });

  useLayoutEffect(() => {
    if (
      !isFetchingPreviousPage &&
      scrollHeightBeforeFetch.current > 0 &&
      parentRef.current
    ) {
      parentRef.current.scrollTop =
        parentRef.current.scrollTop - scrollHeightBeforeFetch.current;

      scrollHeightBeforeFetch.current = 0;
    }
  }, [isFetchingPreviousPage]);

  useEffect(() => {
    if (!messages.length) return;

    const lastMessageIdValue = messages[messages.length - 1].id;

    if (lastMessageIdValue !== lastMessageId.current) {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'start' });

      lastMessageId.current = lastMessageIdValue;
    }
  }, [messages, rowVirtualizer]);

  const onSubmit = useCallback(
    async (prompt: string, files: File[]) => {
      if (prompt || files.length > 0) {
        mutate(prompt, files);
      }
    },
    [mutate],
  );

  const onParentScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (
        event.currentTarget.scrollTop === 0 &&
        hasPreviousPage &&
        !isFetchingPreviousPage
      ) {
        scrollHeightBeforeFetch.current = event.currentTarget.scrollHeight;
        fetchPreviousPage();
      }
    },
    [fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage],
  );

  const measureElement = useCallback(
    (element: HTMLDivElement | null | undefined, messageId: string) => {
      if (element) {
        rowVirtualizer.measureElement(element);

        const newHeight = element.offsetHeight;
        const cachedHeight = elementHeightCacheRef.current.get(messageId);

        if (cachedHeight !== newHeight) {
          elementHeightCacheRef.current.set(messageId, newHeight);
        }
      }
    },
    [rowVirtualizer],
  );

  const { renderMessage } = useRenderMessage({ measureElement });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        onScroll={onParentScroll}
        ref={parentRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
        }}
      >
        {!conversation || (status === 'success' && messages.length === 0) ? (
          <NoMessageScreen />
        ) : null}
        <Box
          ref={innerRef}
          sx={{
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) =>
            renderMessage({
              virtualItem,
              message: messages[virtualItem.index],
            }),
          )}
        </Box>
      </Box>
      <Box
        component="footer"
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <InputField
          autoFocus={!isSmallBreakpoint}
          disabled={mutationStatus === 'pending'}
          onSubmit={onSubmit}
          ref={inputFieldRef}
        />
        {conversation ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
            <Typography variant="caption">
              {`${conversation?.inputTokenCount ?? 0} input tokens and ${conversation?.outputTokenCount ?? 0} output tokens consumed.`}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};
