/** Telegram notices derived from committed DSH goal changes. */
import type { GoalChangeMeta } from '@deepseek-ai/dsh-goal';
/**
 * Render one lifecycle notification; objective edits do not change execution status.
 * @param change - committed goal mutation from the session event stream.
 * @returns a standalone notice, or undefined for an edit.
 */
export declare function goalNotification(change: GoalChangeMeta): string | undefined;
