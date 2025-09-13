import { queryOptions } from '@tanstack/react-query';
import { fetchFileData } from './file-data-functions.ts';

export const fileQueryOptions = (props: {
  currentUserUid: string;
  conversationId: string;
  fileId: string;
}) =>
  queryOptions({
    queryKey: [
      props.currentUserUid,
      'conversations',
      props.conversationId,
      'files',
      props.fileId,
    ],
    queryFn: () => fetchFileData(props),
  });
