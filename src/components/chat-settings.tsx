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
  OpenAIReasoningEffort,
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
    conversation?.chatSettings?.systemInstruction ?? '',
  );
  const [temperature, setTemperature] = useState(
    conversation?.chatSettings?.temperature ?? globalSettings.temperature,
  );
  const [model, setModel] = useState<Model>(
    conversation?.chatSettings?.model ?? globalSettings.defaultModel,
  );
  const [enableThinking, setEnableThinking] = useState(
    conversation?.chatSettings?.enableThinking ?? model === 'gemini-2.5-pro',
  );
  const [enableMultiTurnConversation, setEnableMultiTurnConversation] =
    useState(
      conversation?.chatSettings?.enableMultiTurnConversation ??
        globalSettings.enableMultiTurnConversation,
    );

  const [geminiMaxThinkingTokenCount, setGeminiMaxThinkingTokenCount] =
    useState<number>(
      model.includes('gemini') &&
        typeof conversation?.chatSettings?.thinkingCapacity === 'number'
        ? conversation.chatSettings.thinkingCapacity
        : globalSettings.geminiMaxThinkingTokenCount,
    );

  const [openAIReasoningEffort, setOpenAIReasoningEffort] =
    useState<OpenAIReasoningEffort>(
      model.includes('gpt') &&
        typeof conversation?.chatSettings?.thinkingCapacity === 'string'
        ? conversation?.chatSettings.thinkingCapacity
        : globalSettings.openAIReasoningEffort,
    );

  const navigate = useNavigate();

  const onModelChange = useCallback((event: SelectChangeEvent<Model>) => {
    const newModel = event.target.value;

    setModel(newModel);

    if (newModel === 'gemini-2.5-pro') {
      setEnableThinking(true);
    } else if (
      newModel === 'gemini-2.0-flash' ||
      newModel === 'gemini-2.0-flash-lite'
    ) {
      setEnableThinking(false);
    }
  }, []);

  const onSave = useCallback(async () => {
    const thinkingCapacity: number | OpenAIReasoningEffort | null =
      enableThinking
        ? model.includes('gemini')
          ? !isNaN(geminiMaxThinkingTokenCount)
            ? geminiMaxThinkingTokenCount
            : null
          : openAIReasoningEffort
        : null;

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
          thinkingCapacity,
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
          thinkingCapacity,
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
    geminiMaxThinkingTokenCount,
    openAIReasoningEffort,
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

  const shouldDisableSubmitButton = useCallback(
    () =>
      !chatTitle ||
      (enableThinking &&
        model.includes('gemini') &&
        (geminiMaxThinkingTokenCount === 0 ||
          geminiMaxThinkingTokenCount < -1)),
    [chatTitle, enableThinking, geminiMaxThinkingTokenCount, model],
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
                {globalSettings.supportedModels
                  .filter((model) => model.includes('gemini'))
                  .map((model) => (
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
                        model === 'gemini-2.0-flash' ||
                        model === 'gemini-2.0-flash-lite'
                      }
                      checked={enableThinking}
                      onChange={(e) => setEnableThinking(e.target.checked)}
                    />
                  }
                  label="Enable Thinking"
                />
                {model.includes('gemini') && enableThinking ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Max Gemini Thinking Tokens
                    </Typography>
                    <TextField
                      type="number"
                      autoFocus
                      value={geminiMaxThinkingTokenCount}
                      onChange={(e) =>
                        setGeminiMaxThinkingTokenCount(
                          Number.parseInt(e.target.value),
                        )
                      }
                      fullWidth
                    />
                  </>
                ) : null}
                {model.includes('gpt') && enableThinking ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      OpenAI Reasoning Efforts
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        labelId="openai-reasoning-label"
                        value={openAIReasoningEffort}
                        label="AI Model"
                        onChange={(
                          event: SelectChangeEvent<OpenAIReasoningEffort>,
                        ) => {
                          setOpenAIReasoningEffort(event.target.value);
                        }}
                      >
                        <MenuItem key="minimal" value="minimal">
                          minimal
                        </MenuItem>
                        <MenuItem key="low" value="low">
                          low
                        </MenuItem>
                        <MenuItem key="medium" value="medium">
                          medium
                        </MenuItem>
                        <MenuItem key="high" value="high">
                          high
                        </MenuItem>
                      </Select>
                    </FormControl>
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
