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
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Slider,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useCallback, useEffect, useState } from 'react';
import type {
  Conversation,
  DraftConversation,
  ThinkingCapacity,
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
import { modelIds, modelsObject } from '../data/models.ts';

type ChatSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Thinking = 'off' | 'dynamic' | 'on';

export const ChatSettings = ({ isOpen, onClose }: ChatSettingsProps) => {
  const conversation = useLoaderData({
    from: '/_authenticated/app/{-$conversationId}',
  });

  const { currentUserUid, queryClient } = useRouteContext({
    from: '/_authenticated/app/{-$conversationId}',
  });

  const router = useRouter();

  const conversationId = conversation?.id;

  const role = useLoaderData({ from: '/_authenticated' }).role;

  const globalSettings = getGlobalSettings(role);

  const [chatTitle, setChatTitle] = useState(
    conversation?.title ?? `New Chat - ${Date.now()}`,
  );

  const [systemInstruction, setSystemInstruction] = useState<string>(
    conversation?.chatSettings.systemInstruction ?? '',
  );

  const [temperature, setTemperature] = useState(
    conversation?.chatSettings.temperature ?? globalSettings.temperature,
  );

  const selectedModel =
    conversation?.chatSettings.model ?? globalSettings.defaultModelId;

  const [model, setModel] = useState<string>(selectedModel);

  const modelObj = globalSettings.models[model ?? selectedModel];

  const thinkingBudget = conversation
    ? conversation.chatSettings.thinkingCapacity
    : role === 'admin'
      ? globalSettings.thinkingBudget
      : null;

  const [enableThinking, setEnableThinking] = useState<Thinking>(() => {
    if (model === modelIds.GEMINI_2_5_PRO || model === modelIds.GEMINI_3_PRO) {
      return 'on';
    }

    const thinking =
      conversation?.chatSettings.enableThinking ??
      globalSettings.enableThinking;

    if (!thinking || thinkingBudget === null) return 'off';

    return thinkingBudget === -1 ? 'dynamic' : 'on';
  });

  const [enableMultiTurnConversation, setEnableMultiTurnConversation] =
    useState(
      conversation?.chatSettings.enableMultiTurnConversation ??
        globalSettings.enableMultiTurnConversation,
    );

  const [maxThinkingTokenCount, setMaxThinkingTokenCount] = useState<
    number | ThinkingCapacity | null
  >(thinkingBudget);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const navigate = useNavigate();

  const onThinkingChange = useCallback(
    (newThinking: Thinking) => {
      setEnableThinking(newThinking);

      if (newThinking === 'off') {
        setMaxThinkingTokenCount(null);
      } else if (newThinking === 'on') {
        if (model === modelIds.GEMINI_3_PRO) {
          setMaxThinkingTokenCount('high');
        } else {
          setMaxThinkingTokenCount(globalSettings.thinkingBudget);
        }
      } else {
        setMaxThinkingTokenCount(-1);
      }
    },
    [globalSettings.thinkingBudget, model],
  );

  const onModelChange = useCallback(
    (event: SelectChangeEvent) => setModel(event.target.value),
    [],
  );

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (model === modelIds.GEMINI_2_5_PRO || model === modelIds.GEMINI_3_PRO) {
      onThinkingChange('on');
    } else if (model === modelIds.NANO_BANANA) {
      onThinkingChange('off');
    }
  }, [isInitialized, model, onThinkingChange]);

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
          enableThinking: enableThinking !== 'off',
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
          enableThinking: enableThinking !== 'off',
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

  const isThinkingTokenCountValid = useCallback(() => {
    if (modelsObject[model].id === modelIds.GEMINI_3_PRO) {
      return (
        maxThinkingTokenCount === 'high' || maxThinkingTokenCount === 'low'
      );
    }

    const tokenCount = maxThinkingTokenCount as number | null;

    return (
      tokenCount === null ||
      (enableThinking === 'dynamic' && tokenCount === -1) ||
      (enableThinking === 'on' && tokenCount >= 512)
    );
  }, [enableThinking, maxThinkingTokenCount, model]);

  const shouldDisableSubmitButton = useCallback(
    () => !chatTitle || !isThinkingTokenCountValid(),
    [chatTitle, isThinkingTokenCountValid],
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
              error={!chatTitle}
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
                  <MenuItem key={model} value={modelsObject[model].id}>
                    {modelsObject[model].title}
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
                <FormControl component="fieldset" color="secondary">
                  <FormLabel
                    component="legend"
                    sx={{ fontSize: '0.8rem', mb: 1 }}
                  >
                    Enable Thinking
                  </FormLabel>

                  <ToggleButtonGroup
                    value={enableThinking}
                    exclusive
                    onChange={(_, val) => onThinkingChange(val)}
                    disabled={
                      model === modelIds.GEMINI_3_PRO ||
                      model === modelIds.GEMINI_2_5_PRO ||
                      model === modelIds.NANO_BANANA
                    }
                    aria-label="enable thinking"
                    size="small"
                    sx={{ mb: 1 }}
                  >
                    <ToggleButton value="off">Off</ToggleButton>
                    <ToggleButton value="dynamic">Dynamic</ToggleButton>
                    <ToggleButton value="on">On</ToggleButton>
                  </ToggleButtonGroup>
                </FormControl>
                {enableThinking === 'on' && model === modelIds.GEMINI_3_PRO ? (
                  <FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
                    <InputLabel id="gemini-3-pro-thinking-capacity-label">
                      Thinking Capacity
                    </InputLabel>
                    <Select
                      labelId="gemini-3-pro-thinking-capacity-label"
                      value={maxThinkingTokenCount}
                      label="Gemini 3 Pro Thinking Capacity"
                      onChange={(e) =>
                        setMaxThinkingTokenCount(
                          e.target.value as ThinkingCapacity,
                        )
                      }
                    >
                      <MenuItem key="high" value="high">
                        High
                      </MenuItem>
                      <MenuItem key="low" value="low">
                        Low
                      </MenuItem>
                    </Select>
                  </FormControl>
                ) : null}
                {enableThinking === 'on' && model !== modelIds.GEMINI_3_PRO ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Max Thinking Tokens
                    </Typography>
                    <TextField
                      error={!isThinkingTokenCountValid()}
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
