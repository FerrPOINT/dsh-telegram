/** Durable selection of one DSH conversation per Telegram bot and private chat. */
import { SessionId } from '@deepseek-ai/dsh-session'
import { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { Domain } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'

/** Validated references; an archived chat keeps its workspace without an active conversation. */
export const chatSelection = z.strictObject({
  workspaceId: z.string().min(1).transform(WorkspaceId),
  sessionId: z.string().min(1).transform(SessionId).nullable(),
})

/** Authoritative selections; tokens, messages and request-scoped UI state are never stored here. */
export const telegramChatDomain = defineDomain({
  name: 'telegram_chats',
  version: 1,
  tables: { chats: domainTable<string, z.infer<typeof chatSelection>>(chatSelection) },
})

/** Open DSH storage handle owned by the plugin lifetime. */
export type TelegramChatDomain = Domain<typeof telegramChatDomain>
