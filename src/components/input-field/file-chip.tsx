import { useEffect, useState } from 'react';
import { isImage } from '../../utilities/file.ts';
import { Avatar, Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

type FileChipProps = {
  file: File;
  onDelete: () => void;
};

export const FileChip = ({ file, onDelete }: FileChipProps) => {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (isImage(file.type)) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  return (
    <Chip
      avatar={
        <Avatar alt={file.name} src={previewUrl}>
          {!previewUrl && <DescriptionIcon />}
        </Avatar>
      }
      label={file.name}
      onDelete={onDelete}
    />
  );
};
