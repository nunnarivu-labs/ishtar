import type { Message } from '@ishtar/commons/types';
import { Markdown } from '../markdown.tsx';

type ModelMessageProps = {
  message: Message;
};

export const ModelMessage = ({ message }: ModelMessageProps) => {
  const content = message.contents.find((content) => content.type === 'text');

  return content ? <Markdown text={content.text} /> : null;
};
