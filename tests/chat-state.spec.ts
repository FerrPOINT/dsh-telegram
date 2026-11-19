import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { JsonStorageBackend } from '@deepseek-ai/dsh-storage-json'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { describe, expect, it } from 'vitest'
import { chatSelection, telegramChatDomain } from '../src/chat-state.js'

async function withStorage(run: (facility: DomainFacility, root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-telegram-state-'))
  const ctx = new Context()
  await ctx.plugin(Storage)
  const backend = new JsonStorageBackend(root)
  const unregister = ctx.storage.backend.register('json', backend)
  const facility = new DomainFacility(ctx, { backend: 'json', routes: {} })
  try { await run(facility, root) }
  finally {
    unregister()
    await backend.close()
    assert.equal(resolve(dirname(root)), resolve(tmpdir()))
    await rm(root, { recursive: true, force: true })
  }
}

describe('durable Telegram chat selection', () => {
  it('restores independent bot/chat selections and an archived chat after reopening', async () => {
    await withStorage(async facility => {
      const first = await facility.open(telegramChatDomain)
      await first.table('chats').put('101_501', chatSelection.parse({ workspaceId: 'workspace-a', sessionId: 'session-a' }))
      await first.table('chats').put('102_501', chatSelection.parse({ workspaceId: 'workspace-b', sessionId: 'session-b' }))
      await first.table('chats').put('101_502', chatSelection.parse({ workspaceId: 'workspace-a', sessionId: null }))
      await first.close()
      const restored = await facility.open(telegramChatDomain)
      try {
        expect(restored.table('chats').get('101_501')).toEqual({ workspaceId: 'workspace-a', sessionId: 'session-a' })
        expect(restored.table('chats').get('102_501')).toEqual({ workspaceId: 'workspace-b', sessionId: 'session-b' })
        expect(restored.table('chats').get('101_502')).toEqual({ workspaceId: 'workspace-a', sessionId: null })
      } finally { await restored.close() }
    })
  })

  it.each([
    { workspaceId: 'workspace-a', sessionId: 7 },
    { workspaceId: 'workspace-a', sessionId: 'session-a', unexpected: 'must not be discarded' },
  ])('rejects malformed persisted selections without rewriting them: %j', async record => {
    await withStorage(async (facility, root) => {
      const path = join(root, 'telegram_chats.json')
      const original = JSON.stringify({ unit: { name: 'telegram_chats', version: 1 }, global: null, tables: { chats: { '101_501': record } } })
      await writeFile(path, original)
      await expect(facility.open(telegramChatDomain)).rejects.toMatchObject({ code: 'invalid-record' })
      expect(await readFile(path, 'utf8')).toBe(original)
    })
  })
})
