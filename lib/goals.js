import { escapeHtml } from './format.js';
/**
 * Render one lifecycle notification; objective edits do not change execution status.
 * @param change - committed goal mutation from the session event stream.
 * @returns a standalone notice, or undefined for an edit.
 */
export function goalNotification(change) {
    if (change.operation === 'edit')
        return undefined;
    if (change.operation === 'clear')
        return '🗑 Цель удалена. История работы сохранена.';
    const titles = {
        create: '🎯 Цель создана',
        resume: '▶️ Цель возобновлена',
        pause: '⏸ Цель приостановлена',
        block: '⚠️ Цель заблокирована',
        complete: '✅ Цель завершена',
    };
    const lines = [
        `<b>${titles[change.operation]}</b>`,
        `<b>Цель:</b> <code>${escapeHtml(change.goal.objective)}</code>`,
        `Раунды: ${change.roundsStarted} / ${change.goal.maxGoalRounds}.`,
    ];
    if (change.operation === 'block') {
        // The goal service requires a reason whenever it commits the blocked phase.
        lines.push(`<b>Причина:</b> <code>${escapeHtml(change.goal.blockedReason.message)}</code>`, 'Автоматическое выполнение остановлено. Чтобы продолжить, сообщи, как устранён блокер, и попроси возобновить цель.');
    }
    else if (change.operation === 'pause') {
        lines.push('Автоматическое выполнение приостановлено до явного возобновления.');
    }
    return lines.join('\n\n');
}
