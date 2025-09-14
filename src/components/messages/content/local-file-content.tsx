import type { LocalFileContent as LocalFileContentType } from '@ishtar/commons/types';
import { useEffect, useState } from 'react';
import { isDocument, isImage } from '../../../utilities/file.ts';
import { Box, Link, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

type LocalFileContentProps = {
  content: LocalFileContentType;
};

export const LocalFileContent = ({ content }: LocalFileContentProps) => {
  const { file } = content;
  const { type, name } = file;

  const [fileUrl, setFileUrl] = useState<string>();

  useEffect(() => {
    const objectURL = URL.createObjectURL(file);
    setFileUrl(objectURL);

    return () => {
      URL.revokeObjectURL(objectURL);
    };
  }, [file]);

  if (!fileUrl) return null;

  if (isImage(type)) {
    return (
      <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
        <Box
          component="img"
          src={fileUrl}
          alt={name}
          sx={{
            maxWidth: '100%',
            maxHeight: '400px',
            borderRadius: 2,
            mt: 1,
          }}
        />
      </Link>
    );
  } else if (isDocument(type)) {
    return (
      <Link
        href={fileUrl}
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
          <Typography variant="body2">{name}</Typography>
        </Box>
      </Link>
    );
  }

  return null;
};
