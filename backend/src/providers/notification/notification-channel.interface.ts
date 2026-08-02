import { NotificationChannelType } from '@prisma/client';

export interface TemplateMessage {
  /** Recipient in E.164 digits (no '+'), already validated by the caller. */
  to: string;
  /** Provider-side template name, e.g. the Meta-approved 'order_confirmation'. */
  templateName: string;
  /** Positional body variables, in the order the provider template declares them. */
  bodyParams: string[];
}

export interface ChannelSendResult {
  success: boolean;
  /** Provider message id, used later to match delivery-status webhooks. */
  messageId?: string;
  error?: string;
  /** How many provider calls were made (1 when it succeeded first try). */
  attempts: number;
}

/**
 * A delivery channel for customer notifications. NotificationService only ever
 * talks to this interface, so adding SMS/Email/Push means writing one more
 * implementation — no changes to the orchestration or the log schema.
 */
export interface NotificationChannel {
  readonly type: NotificationChannelType;
  /** False when credentials are missing — the send is then recorded as SKIPPED. */
  isConfigured(): boolean;
  send(message: TemplateMessage): Promise<ChannelSendResult>;
}
