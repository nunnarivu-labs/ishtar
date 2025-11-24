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
import { useCallback, useState } from 'react';
import {
  type Conversation,
  type DraftConversation,
  type PresetThinkingCapacity,
  type ThinkingDefaultState,
  ThinkingMode,
  ThinkingConfigType,
  ThinkingCapacity,
  DYNAMIC_TOKEN_BUDGET,
} from '@ishtar/commons';
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

  const activeModel = globalSettings.models[model ?? selectedModel];

  const [enableThinking, setEnableThinking] = useState<ThinkingDefaultState>(
    () => {
      // 1. Saved Settings Priority
      if (conversation?.chatSettings.enableThinking !== undefined) {
        if (!conversation.chatSettings.enableThinking) return 'off';

        return conversation.chatSettings.thinkingCapacity ===
          DYNAMIC_TOKEN_BUDGET
          ? 'dynamic'
          : 'on';
      }

      return activeModel.capabilities.thinking.defaultState;
    },
  );

  const [enableMultiTurnConversation, setEnableMultiTurnConversation] =
    useState(
      conversation?.chatSettings.enableMultiTurnConversation ??
        activeModel.capabilities.multiTurn,
    );

  const [maxThinkingTokenCount, setMaxThinkingTokenCount] = useState<
    number | PresetThinkingCapacity | null
  >(
    conversation
      ? conversation.chatSettings.thinkingCapacity
      : activeModel.capabilities.thinking.defaultBudget,
  );

  const navigate = useNavigate();

  const onThinkingChange = useCallback(
    (newThinking: ThinkingDefaultState | null) => {
      if (newThinking === null) return;

      setEnableThinking(newThinking);

      if (newThinking === 'off') {
        setMaxThinkingTokenCount(null);
      } else if (newThinking === 'dynamic') {
        setMaxThinkingTokenCount(DYNAMIC_TOKEN_BUDGET);
      } else if (newThinking === 'on') {
        setMaxThinkingTokenCount(
          activeModel.capabilities.thinking.defaultBudget,
        );
      }
    },
    [activeModel.capabilities.thinking.defaultBudget],
  );

  const onModelChange = useCallback(
    (event: SelectChangeEvent) => {
      setModel(event.target.value);

      const nextModel = globalSettings.models[event.target.value];

      setEnableThinking(nextModel.capabilities.thinking.defaultState);
      setMaxThinkingTokenCount(nextModel.capabilities.thinking.defaultBudget);
    },
    [globalSettings.models],
  );

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
    if (activeModel.capabilities.thinking.mode === ThinkingMode.DISABLED)
      return maxThinkingTokenCount === null;

    if (
      activeModel.capabilities.thinking.mode === ThinkingMode.FORCED &&
      activeModel.capabilities.thinking.configType === ThinkingConfigType.PRESET
    )
      return ThinkingCapacity.safeParse(maxThinkingTokenCount).success;

    if (
      (activeModel.capabilities.thinking.mode === ThinkingMode.FORCED ||
        activeModel.capabilities.thinking.mode === ThinkingMode.OPTIONAL) &&
      activeModel.capabilities.thinking.configType ===
        ThinkingConfigType.TOKEN_LIMIT
    ) {
      if (enableThinking === 'off') return maxThinkingTokenCount === null;
      if (enableThinking === 'dynamic')
        return maxThinkingTokenCount === DYNAMIC_TOKEN_BUDGET;

      const numberTokenCount = Number(maxThinkingTokenCount);

      if (!isNaN(numberTokenCount)) {
        return (
          numberTokenCount >= activeModel.capabilities.thinking.limits.min &&
          numberTokenCount <= activeModel.capabilities.thinking.limits.max
        );
      }
    }

    return false;
  }, [
    enableThinking,
    maxThinkingTokenCount,
    activeModel.capabilities.thinking,
  ]);

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
                {Object.values(globalSettings.models).map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.title}
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
              {activeModel.capabilities.thinking.mode !==
              ThinkingMode.DISABLED ? (
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
                      disabled={
                        activeModel.capabilities.thinking
                          .availableThinkingStates.length === 1
                      }
                      onChange={(_, val) => onThinkingChange(val)}
                      aria-label="enable thinking"
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      {activeModel.capabilities.thinking.availableThinkingStates.map(
                        (thinkingState) => (
                          <ToggleButton
                            key={thinkingState}
                            value={thinkingState}
                          >
                            {thinkingState}
                          </ToggleButton>
                        ),
                      )}
                    </ToggleButtonGroup>
                  </FormControl>
                  {enableThinking === 'on' &&
                  activeModel.capabilities.thinking.configType ===
                    ThinkingConfigType.PRESET ? (
                    <FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
                      <InputLabel id="preset-thinking-capacity-label">
                        Thinking Capacity
                      </InputLabel>
                      <Select
                        labelId="preset-thinking-capacity-label"
                        value={maxThinkingTokenCount}
                        label="Gemini 3 Pro Thinking Capacity"
                        onChange={(e) =>
                          setMaxThinkingTokenCount(
                            e.target.value as PresetThinkingCapacity,
                          )
                        }
                      >
                        {activeModel.capabilities.thinking.availablePresets.map(
                          (preset) => (
                            <MenuItem key={preset} value={preset}>
                              {preset}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </FormControl>
                  ) : null}
                  {enableThinking === 'on' &&
                  activeModel.capabilities.thinking.configType ===
                    ThinkingConfigType.TOKEN_LIMIT ? (
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
              ) : null}
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
