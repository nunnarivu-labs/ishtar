import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';
import { tempPromptRef } from './temp-prompt-ref.ts';

type InputFieldProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  onSubmit: (prompt: string, files: File[]) => Promise<void>;
};

export type InputFieldRef = {
  setPrompt: (prompt: string) => void;
  focus: () => void;
};

export const InputField = forwardRef<InputFieldRef, InputFieldProps>(
  ({ autoFocus = false, disabled = false, onSubmit }, ref) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [prompt, setPrompt] = useState(tempPromptRef.current?.prompt ?? '');

    useEffect(() => {
      tempPromptRef.current = null;
    }, []);

    const doSubmit = useCallback(() => {
      onSubmit(prompt, []);
    }, [onSubmit, prompt]);

    const onInputKeyDown = useCallback(
      async (event: React.KeyboardEvent) => {
        if (event.metaKey && event.key === 'Enter' && !(!prompt || disabled)) {
          await doSubmit();
        }
      },
      [prompt, disabled, doSubmit],
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

    useImperativeHandle(
      ref,
      () => ({
        setPrompt: (prompt) => setPrompt(prompt),
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
        <InputBase
          inputRef={inputRef}
          autoFocus={autoFocus}
          disabled={disabled}
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
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <IconButton size="small" disabled>
            <AttachFileIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          {!prompt && disabled ? (
            <IconButton size="large">
              <CircularProgress size={24} />
            </IconButton>
          ) : null}
          {prompt ? (
            <IconButton
              disabled={disabled}
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
          ) : null}
        </Box>
      </Box>
    );
  },
);
