import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Slider,
  Switch,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useCallback, useState } from 'react';
import type {
  Conversation,
  DraftConversation,
  Model,
} from '@ishtar/commons/types';
import { getGlobalSettings } from '../data/global-settings.ts';
import {
  useLoaderData,
  useNavigate,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router';
import {
  persistConversation,
  updateConversation,
} from '../data/conversations/conversations-functions.ts';
import {
  conversationQueryKey,
  conversationsQueryKey,
} from '../data/conversations/conversations-query-keys.ts';

type ChatSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ChatSettings = ({ isOpen, onClose }: ChatSettingsProps) => {
  const conversation = useLoaderData({
    from: '/_authenticated/app/{-$conversationId}',
  });

  const { currentUserUid, queryClient } = useRouteContext({
    from: '/_authenticated/app/{-$conversationId}',
  });

  const router = useRouter();

  const conversationId = conversation?.id;

  const globalSettings = getGlobalSettings(
    useLoaderData({ from: '/_authenticated' }).role,
  );

  const [chatTitle, setChatTitle] = useState(
    conversation?.title ?? `New Chat - ${Date.now()}`,
  );
  const [systemInstruction, setSystemInstruction] = useState<string>(
    conversation?.chatSettings.systemInstruction ?? '',
  );
  const [temperature, setTemperature] = useState(
    conversation?.chatSettings.temperature ?? globalSettings.temperature,
  );
  const [model, setModel] = useState<Model>(
    conversation?.chatSettings.model ?? globalSettings.defaultModel,
  );
  const [enableThinking, setEnableThinking] = useState(
    model === 'gemini-2.5-pro' ||
      (conversation?.chatSettings.enableThinking ??
        globalSettings.enableThinking),
  );
  const [enableMultiTurnConversation, setEnableMultiTurnConversation] =
    useState(
      conversation?.chatSettings.enableMultiTurnConversation ??
        globalSettings.enableMultiTurnConversation,
    );

  const [maxThinkingTokenCount, setMaxThinkingTokenCount] = useState<
    number | null
  >(
    conversation
      ? conversation.chatSettings.thinkingCapacity
      : globalSettings.thinkingBudget,
  );

  const navigate = useNavigate();

  const onModelChange = useCallback((event: SelectChangeEvent<Model>) => {
    const newModel = event.target.value;

    setModel(newModel);

    if (newModel === 'gemini-2.5-pro') {
      setEnableThinking(true);
    } else if (
      newModel === 'gemini-2.5-flash-image-preview' ||
      newModel === 'gemini-2.0-flash' ||
      newModel === 'gemini-2.0-flash-lite'
    ) {
      setEnableThinking(false);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!conversationId) {
      const newConversation: DraftConversation = {
        createdAt: new Date(),
        lastUpdated: new Date(),
        title: chatTitle,
        isDeleted: false,
        summarizedMessageId: null,
        chatSettings: {
          temperature,
          model: model,
          systemInstruction: systemInstruction ?? null,
          enableThinking,
          thinkingCapacity: maxThinkingTokenCount,
          enableMultiTurnConversation,
        },
        textTokenCountSinceLastSummary: 0,
        inputTokenCount: 0,
        outputTokenCount: 0,
      };

      const persistedConversationId = await persistConversation({
        currentUserUid,
        draftConversation: newConversation,
      });

      if (persistedConversationId) {
        await queryClient.invalidateQueries({
          queryKey: conversationsQueryKey(currentUserUid),
        });

        navigate({
          to: '/app/{-$conversationId}',
          params: { conversationId: persistedConversationId },
        });

        onClose();
      }
    } else {
      const convoToUpdate: Partial<Conversation> = {
        lastUpdated: new Date(),
        title: chatTitle,
        chatSettings: {
          temperature,
          model: model,
          systemInstruction: systemInstruction ?? null,
          enableThinking,
          thinkingCapacity: maxThinkingTokenCount,
          enableMultiTurnConversation,
        },
      };

      await updateConversation({
        currentUserUid,
        conversationId,
        conversation: convoToUpdate,
      });

      const promises: Promise<void>[] = [];

      if (conversation?.title !== chatTitle) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: conversationsQueryKey(currentUserUid),
          }),
        );
      }

      promises.push(
        queryClient.invalidateQueries({
          queryKey: conversationQueryKey(currentUserUid, conversationId),
        }),
      );

      promises.push(router.invalidate());

      await Promise.all(promises);

      onClose();
    }
  }, [
    enableThinking,
    model,
    maxThinkingTokenCount,
    conversationId,
    chatTitle,
    temperature,
    systemInstruction,
    enableMultiTurnConversation,
    navigate,
    onClose,
    currentUserUid,
    conversation?.title,
    router,
    queryClient,
  ]);

  const isThinkingTokenCountValid = useCallback(
    () =>
      maxThinkingTokenCount === null ||
      maxThinkingTokenCount === -1 ||
      maxThinkingTokenCount >= 512,
    [maxThinkingTokenCount],
  );

  const shouldDisableSubmitButton = useCallback(
    () => !chatTitle || (enableThinking && !isThinkingTokenCountValid()),
    [chatTitle, enableThinking, isThinkingTokenCountValid],
  );

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            mt: 2,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Title of the Chat.
            </Typography>
            <TextField
              autoFocus
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
              fullWidth
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Define the AI Model.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="ai-model-select-label">AI Model</InputLabel>
              <Select
                labelId="ai-model-select-label"
                value={model}
                label="AI Model"
                onChange={onModelChange}
              >
                {globalSettings.supportedModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Temperature
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Slider
                value={temperature}
                onChange={(_e, value) => setTemperature(Number(value))}
                valueLabelDisplay="auto"
                step={0.1}
                marks
                min={0.1}
                max={2}
                sx={{ width: '50%' }}
              />
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      disabled={
                        model === 'gemini-2.5-pro' ||
                        model === 'gemini-2.5-flash-image-preview' ||
                        model === 'gemini-2.0-flash' ||
                        model === 'gemini-2.0-flash-lite'
                      }
                      checked={enableThinking}
                      onChange={(e) => setEnableThinking(e.target.checked)}
                    />
                  }
                  label="Enable Thinking"
                />
                {enableThinking ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Max Thinking Tokens
                    </Typography>
                    <TextField
                      type="number"
                      autoFocus
                      value={maxThinkingTokenCount ?? ''}
                      onChange={(e) =>
                        setMaxThinkingTokenCount(
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : null,
                        )
                      }
                      fullWidth
                    />
                  </>
                ) : null}
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableMultiTurnConversation}
                      onChange={(e) =>
                        setEnableMultiTurnConversation(e.target.checked)
                      }
                    />
                  }
                  label="Enable Multi-turn Conversation"
                />
              </Box>
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Define the AI's behavior and personality for the conversation.
            </Typography>
            <TextField
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              multiline
              minRows={5}
              maxRows={10}
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={shouldDisableSubmitButton()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
