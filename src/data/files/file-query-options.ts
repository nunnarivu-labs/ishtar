import { queryOptions } from '@tanstack/react-query';
import { fetchFileDataWithDownloadUrl } from './file-data-functions.ts';

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
    queryFn: () => fetchFileDataWithDownloadUrl(props),
  });
