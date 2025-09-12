import React, {
  type ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import { tempPromptRef } from './temp-prompt-ref.ts';
import {
  Stack,
  Box,
  InputBase,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { FileChip } from './file-chip.tsx';

type InputFieldProps = {
  autoFocus?: boolean;
  isMutating: boolean;
  onSubmit: (prompt: string, files: File[]) => Promise<void>;
};

export type InputFieldRef = {
  setPrompt: (prompt: string) => void;
  setFiles: (files: File[]) => void;
  focus: () => void;
};

const MAX_TOTAL_FILES_SIZE = 10 * 1024 * 1024;

export const InputField = forwardRef<InputFieldRef, InputFieldProps>(
  ({ autoFocus = false, isMutating = false, onSubmit }, ref) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [prompt, setPrompt] = useState(tempPromptRef.current?.prompt ?? '');
    const [files, setFiles] = useState<File[]>(
      tempPromptRef.current?.files ?? [],
    );

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      tempPromptRef.current = null;
    }, []);

    const doSubmit = useCallback(() => {
      onSubmit(prompt, files);
    }, [files, onSubmit, prompt]);

    const onInputKeyDown = useCallback(
      async (event: React.KeyboardEvent) => {
        if (
          event.metaKey &&
          event.key === 'Enter' &&
          !(!prompt || isMutating)
        ) {
          doSubmit();
        }
      },
      [prompt, isMutating, doSubmit],
    );

    const onInputFocus = useCallback(
      (event: React.FocusEvent<HTMLTextAreaElement>) =>
        setTimeout(
          () =>
            event.target.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            }),
          150,
        ),
      [],
    );

    const handleAttachmentIconClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const filesToAdd = Array.from(event.target.files);
        const allFiles = [...files, ...filesToAdd];

        if (
          allFiles.reduce((size, file) => size + file.size, 0) <=
          MAX_TOTAL_FILES_SIZE
        ) {
          setFiles(allFiles);
        }

        inputRef.current?.focus();
      },
      [files],
    );

    const handleRemoveFile = useCallback((fileToRemove: File) => {
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.name !== fileToRemove.name),
      );

      inputRef.current?.focus();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        setPrompt: (prompt) => setPrompt(prompt),
        setFiles: (files) => setFiles(files),
        focus: () => inputRef.current?.focus(),
      }),
      [],
    );

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '28px',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          p: '12px 16px',
        }}
      >
        <input
          type="file"
          hidden
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
        />
        <InputBase
          inputRef={inputRef}
          autoFocus={autoFocus}
          multiline
          maxRows={5}
          fullWidth
          placeholder="Prompt"
          value={prompt}
          onKeyDown={onInputKeyDown}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={onInputFocus}
          sx={{
            flexGrow: 1,
            fontSize: '1.1rem',
            '& .MuiInputBase-input': { padding: 0 },
          }}
        />
        <Box sx={{ display: 'flex', mt: 1, alignItems: 'center' }}>
          <IconButton
            size="small"
            onClick={handleAttachmentIconClick}
            disabled={isMutating}
          >
            <AttachFileIcon />
          </IconButton>
          {files.length > 0 ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                ml: 1,
                overflowX: 'auto',
                minWidth: 0,
              }}
            >
              {files.map((file) => (
                <FileChip
                  key={file.name}
                  file={file}
                  disabled={isMutating}
                  onDelete={() => handleRemoveFile(file)}
                />
              ))}
            </Stack>
          ) : null}
          <Box sx={{ flexGrow: 1 }} />
          {isMutating ? (
            <IconButton size="large">
              <CircularProgress size={24} />
            </IconButton>
          ) : (
            <IconButton
              disabled={!prompt}
              onClick={doSubmit}
              size="large"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <SendIcon sx={{ transform: 'translateX(2px)' }} />
            </IconButton>
          )}
        </Box>
      </Box>
    );
  },
);
