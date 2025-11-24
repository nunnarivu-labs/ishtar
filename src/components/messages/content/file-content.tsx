import type { FileContent as FileContentType } from '@ishtar/commons';
import { useRouteContext } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  fileDownloadUrlOptions,
  fileQueryOptions,
} from '../../../data/files/file-query-options.ts';
import { useGetCurrentConversation } from '../../../data/conversations/use-get-current-conversation.ts';
import { ContentLoader } from './content-loader.tsx';
import { isDocument, isImage } from '../../../utilities/file.ts';
import { Link, Box, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

type FileContentProps = {
  content: FileContentType;
};

export const FileContent = ({ content }: FileContentProps) => {
  const { currentUserUid } = useRouteContext({
    from: '/_authenticated/app/{-$conversationId}',
  });

  const conversation = useGetCurrentConversation();

  const fileDataQuery = useQuery(
    fileQueryOptions({
      currentUserUid,
      conversationId: conversation.id,
      fileId: content.fileId,
    }),
  );

  const downloadUrlQuery = useQuery(
    fileDownloadUrlOptions(
      {
        currentUserUid,
        conversationId: conversation.id,
        fileId: content.fileId,
        storagePath: fileDataQuery.isSuccess
          ? fileDataQuery.data.storagePath
          : '',
      },
      fileDataQuery.isSuccess,
    ),
  );

  if (fileDataQuery.isLoading || downloadUrlQuery.isLoading)
    return <ContentLoader />;

  if (fileDataQuery.isSuccess && downloadUrlQuery.isSuccess) {
    const file = fileDataQuery.data;

    if (isImage(file.type)) {
      return (
        <Link
          href={downloadUrlQuery.data}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Box
            component="img"
            src={downloadUrlQuery.data}
            alt={file.originalFileName}
            sx={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: 2,
              mt: 1,
            }}
          />
        </Link>
      );
    } else if (isDocument(file.type)) {
      return (
        <Link
          href={downloadUrlQuery.data}
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
            <Typography variant="body2">{file.originalFileName}</Typography>
          </Box>
        </Link>
      );
    }
  }

  return null;
};
