import { Link, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { Message } from '@ishtar/commons/types';
import { Fragment } from 'react';
import { LocalFileContent } from './content/local-file-content.tsx';

type UserMessageProps = {
  message: Message;
};

export const UserMessage = ({ message }: UserMessageProps) => {
  const { contents } = message;

  return contents.map((content, index) => {
    return (
      <Fragment key={index}>
        {content.type === 'text' ? (
          <Typography
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              mt: contents.length === 1 ? undefined : 1,
            }}
          >
            {content.text}
          </Typography>
        ) : null}
        {content.type === 'localFile' ? (
          <LocalFileContent key={index} content={content} />
        ) : null}
        {content.type === 'image' ? (
          <Link
            key={index}
            href={content.image.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Box
              component="img"
              src={content.image.url}
              alt={content.image.name}
              sx={{
                maxWidth: '100%',
                maxHeight: '400px',
                borderRadius: 2,
                mt: 1,
              }}
            />
          </Link>
        ) : null}
        {content.type === 'document' ? (
          <Link
            key={index}
            href={content.document.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            color="inherit"
            sx={{ display: 'block', mt: 1 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              <PictureAsPdfIcon />
              <Typography variant="body2">{content.document.name}</Typography>
            </Box>
          </Link>
        ) : null}
      </Fragment>
    );
  });
};
