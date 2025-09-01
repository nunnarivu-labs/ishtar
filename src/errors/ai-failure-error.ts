export class AiFailureError extends Error {
  conversationId?: string;
  promptMessageId?: string;
  cause: unknown;

  constructor(
    message: string,
    details: {
      conversationId?: string;
      promptMessageId?: string;
      originalError?: unknown;
    },
  ) {
    super(message, { cause: details?.originalError });

    this.conversationId = details.conversationId;
    this.promptMessageId = details.promptMessageId;
    this.cause = details.originalError;
  }
}
