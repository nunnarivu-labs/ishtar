import type { FileContent as FileContentType } from '@ishtar/commons/types';
import { useRouteContext } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fileQueryOptions } from '../../../data/files/file-query-options.ts';
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

  const query = useQuery(
    fileQueryOptions({
      currentUserUid,
      conversationId: conversation.id,
      fileId: content.fileId,
    }),
  );

  if (query.isLoading) return <ContentLoader />;

  if (query.isSuccess) {
    const file = query.data;

    if (isImage(file.type)) {
      return (
        <Link href={file.url} target="_blank" rel="noopener noreferrer">
          <Box
            component="img"
            src={file.url}
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
          href={file.url}
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
