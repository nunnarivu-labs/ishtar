import type { VirtualItem } from '@tanstack/react-virtual';
import { type JSX, useCallback } from 'react';
import { Markdown } from '../markdown.tsx';
import { Typography, Box } from '@mui/material';
import type { Message } from '@ishtar/commons/types';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';

type RenderMessageArgs = {
  virtualItem: VirtualItem;
  message?: Message;
};

type UseRenderMessageReturn = {
  renderMessage: (args: RenderMessageArgs) => JSX.Element | null;
};

type UseRenderMessageProps = {
  measureElement: (
    node: HTMLDivElement | null | undefined,
    messageId: string,
  ) => void;
};

export const useRenderMessage = ({
  measureElement,
}: UseRenderMessageProps): UseRenderMessageReturn => {
  const renderModelText = (message: Message) =>
    message.contents
      .filter((content) => content.type === 'text')
      .map((content) => <Markdown text={content.text} />);

  const renderUserText = (message: Message) =>
    message.contents
      .filter((content) => content.type === 'text')
      .map((content) => (
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{content.text}</Typography>
      ));

  const handleCopy = (message: Message) =>
    navigator.clipboard.writeText(
      message.contents.find((content) => content.type === 'text')?.text ?? '',
    );

  const renderMessage = useCallback(
    ({ virtualItem, message }: RenderMessageArgs): JSX.Element | null => {
      if (!message) return null;

      return (
        <Box
          key={message.id}
          data-index={virtualItem.index}
          ref={(el: HTMLDivElement) => measureElement(el, message.id)}
          sx={{
            transform: `translateY(${virtualItem.start}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            padding: '8px 0',
            '&:hover .copy-button': {
              opacity: 1,
            },
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              maxWidth: '98%',
              bgcolor:
                message.role === 'user' ? 'primary.main' : 'background.default',
              color:
                message.role === 'user'
                  ? 'primary.contrastText'
                  : 'text.primary',
            }}
          >
            <>
              {message.role === 'model'
                ? renderModelText(message)
                : renderUserText(message)}
            </>
          </Box>
          {message.role === 'model' ? (
            <IconButton
              className="copy-button"
              onClick={() => handleCopy(message)}
              sx={{
                alignSelf: 'flex-end',
                marginRight: 'auto',
                opacity: 0,
                transition: (theme) => theme.transitions.create('opacity'),
              }}
            >
              <ContentCopyIcon sx={{ fontSize: '12px' }} />
            </IconButton>
          ) : null}
        </Box>
      );
    },
    [measureElement],
  );

  return { renderMessage };
};
