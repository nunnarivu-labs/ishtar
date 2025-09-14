import { queryOptions } from '@tanstack/react-query';
import { fetchFileData } from './file-data-functions.ts';
import { getDownloadURL, ref } from 'firebase/storage';
import { firebaseApp } from '../../firebase.ts';

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

export const fileDownloadUrlOptions = (
  props: {
    currentUserUid: string;
    conversationId: string;
    fileId: string;
    storagePath: string;
  },
  isEnabled: boolean,
) =>
  queryOptions({
    queryKey: [
      props.currentUserUid,
      'conversations',
      props.conversationId,
      'files',
      props.fileId,
      props.storagePath,
    ],
    queryFn: async () => {
      const reference = ref(firebaseApp.storage, props.storagePath);
      return await getDownloadURL(reference);
    },
    enabled: isEnabled,
  });
