/** Durable selection of one DSH conversation per Telegram bot and private chat. */
import { SessionId } from '@deepseek-ai/dsh-session';
import type { Domain } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
/** Validated references; an archived chat keeps its workspace without an active conversation. */
export declare const chatSelection: z.ZodObject<{
    workspaceId: z.ZodPipe<z.ZodString, z.ZodTransform<import("@deepseek-ai/dsh-workspace/types").WorkspaceId, string>>;
    sessionId: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<SessionId, string>>>;
}, z.core.$strict>;
/** Authoritative selections; tokens, messages and request-scoped UI state are never stored here. */
export declare const telegramChatDomain: {
    name: string;
    version: number;
    tables: {
        chats: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, {
            workspaceId: import("@deepseek-ai/dsh-workspace/types").WorkspaceId;
            sessionId: SessionId | null;
        }>;
    };
};
/** Open DSH storage handle owned by the plugin lifetime. */
export type TelegramChatDomain = Domain<typeof telegramChatDomain>;
