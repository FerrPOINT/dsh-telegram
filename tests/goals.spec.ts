import { describe, expect, it } from 'vitest'
import { GoalId } from '@deepseek-ai/dsh-goal'
import type { GoalSnapshotChangeMeta } from '@deepseek-ai/dsh-goal'
import { goalNotification } from '../src/goals.js'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { TelegramResultCache } from '../src/result-cache.js'

const change: GoalSnapshotChangeMeta = {
  kind: 'goal/change', version: 1, operation: 'block',
  goal: { id: GoalId('goal-example'), revision: 2, objective: 'Проверить <PR> & тесты', phase: 'blocked',
    maxGoalRounds: 256, blockedReason: { code: 'model-reported', message: 'Нужен <доступ> & ответ' } },
  roundsStarted: 3, createdAt: 1, updatedAt: 2,
}

describe('Telegram goal lifecycle notices', () => {
  it('makes the blocker and the need for explicit continuation visible as literal text', () => {
    const notice = goalNotification(change)
    expect(notice).toContain('<b>⚠️ Цель заблокирована</b>')
    expect(notice).toContain('Проверить &lt;PR&gt; &amp; тесты')
    expect(notice).toContain('Нужен &lt;доступ&gt; &amp; ответ')
    expect(notice).toContain('Раунды: 3 / 256')
    expect(notice).toContain('попроси возобновить цель')
  })

  it.each([
    ['create', 'active', '🎯 Цель создана'],
    ['resume', 'active', '▶️ Цель возобновлена'],
    ['pause', 'paused', '⏸ Цель приостановлена'],
    ['complete', 'complete', '✅ Цель завершена'],
  ] as const)('reports %s independently of turn completion', (operation, phase, title) => {
    const { blockedReason: _reason, ...goal } = change.goal
    const notice = goalNotification({ ...change, operation, goal: { ...goal, phase } })
    expect(notice).toContain(title)
    expect(notice).not.toContain('Причина:')
  })

  it('keeps edits quiet and reports a clear without replaying the old objective', () => {
    expect(goalNotification({ ...change, operation: 'edit' })).toBeUndefined()
    expect(goalNotification({ kind: 'goal/change', version: 1, operation: 'clear',
      cleared: { id: change.goal.id, revision: 3 }, clearedAt: 3 })).toBe('🗑 Цель удалена. История работы сохранена.')
  })

  it('retains a rejected notification for explicit resend after reopening the cache', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-goal-notice-'))
    try {
      const notice = goalNotification(change)!
      const cache = new TelegramResultCache('123:fixture', root)
      let attempts = 0
      await expect(cache.deliver(501, notice, async () => {
        attempts++
        throw new Error('Telegram rejected the notice')
      })).rejects.toThrow('Telegram rejected the notice')
      expect(attempts).toBe(1)
      const restored = new TelegramResultCache('123:fixture', root)
      const delivered: string[] = []
      expect(await restored.resend(501, async text => { delivered.push(text) })).toBe(true)
      expect(delivered).toEqual([notice])
      expect(await restored.resend(502, async text => { delivered.push(text) })).toBe(false)
      expect(delivered).toHaveLength(1)
    } finally {
      assert.equal(resolve(dirname(root)), resolve(tmpdir()))
      await rm(root, { recursive: true, force: true })
    }
  })
})
