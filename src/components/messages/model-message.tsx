import type { Message } from '@ishtar/commons/types';
import { Markdown } from '../markdown.tsx';
import { Fragment } from 'react';
import { FileContent } from './content/file-content.tsx';

type ModelMessageProps = {
  message: Message;
};

export const ModelMessage = ({ message }: ModelMessageProps) => {
  const { contents } = message;

  return contents.map((content, index) => (
    <Fragment key={index}>
      {content.type === 'text' ? <Markdown text={content.text} /> : null}
      {content.type === 'file' ? <FileContent content={content} /> : null}
    </Fragment>
  ));
};
