import { Typography } from '@mui/material';
import type { Message } from '@ishtar/commons';
import { Fragment } from 'react';
import { LocalFileContent } from './content/local-file-content.tsx';
import { FileContent } from './content/file-content.tsx';

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
        {content.type === 'file' ? (
          <FileContent key={index} content={content} />
        ) : null}
      </Fragment>
    );
  });
};
