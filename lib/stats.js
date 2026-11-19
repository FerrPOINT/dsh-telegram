/**
 * `/stats` report: the figures behind the DSH Web composer's statistics pills
 * and context meter, read from the session's `sessionStats`, `tokenUsage`,
 * `contextPressure` and `contextBreakdown` projections. Those projection keys
 * belong to DSH packages outside this plugin's peers, so values are checked
 * here and a missing or malformed one only drops its section.
 * @module telegram/stats
 */
const STATS_FIELDS = ['turns', 'steps', 'llmMs', 'toolMs', 'ttftMs', 'ttftSteps', 'decodeMs', 'decodeTokens'];
const USAGE_FIELDS = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'];
const BREAKDOWN_FIELDS = ['systemTokens', 'toolsTokens', 'messageTokens'];
function count(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
/** The object when every listed field is a non-negative finite number. */
function numericRecord(value, fields) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    const record = value;
    return fields.every(field => count(record[field])) ? record : undefined;
}
export function sessionStats(values) {
    return numericRecord(values.sessionStats, STATS_FIELDS);
}
export function tokenUsage(values) {
    return numericRecord(values.tokenUsage, USAGE_FIELDS);
}
/** Prefer the delta-repriced `projectedTokens`, like the Web meter; null until usage and capacity are known. */
export function contextOccupancy(values) {
    const pressure = values.contextPressure;
    if (typeof pressure !== 'object' || pressure === null)
        return undefined;
    const usedTokens = count(pressure.projectedTokens) ? pressure.projectedTokens : pressure.pressureTokens;
    const contextWindow = pressure.contextWindow;
    if (!count(usedTokens) || !count(contextWindow) || contextWindow === 0)
        return undefined;
    return { percent: Math.min(100, Math.round(usedTokens / contextWindow * 100)), usedTokens, contextWindow };
}
export function contextBreakdown(values) {
    return numericRecord(values.contextBreakdown, BREAKDOWN_FIELDS);
}
/** 45.2秒 under a minute, 2分42秒 from there on. */
export function formatDuration(ms) {
    const seconds = ms / 1000;
    if (seconds < 60)
        return `${Math.round(seconds * 10) / 10} с`;
    const whole = Math.round(seconds);
    return `${Math.floor(whole / 60)} мин ${whole % 60} с`;
}
/** Compact token count: 517 / 12.4K / 1M. */
export function formatTokens(value) {
    const scaled = (candidate) => candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10);
    if (value < 1000)
        return String(value);
    if (value < 1_000_000)
        return `${scaled(value / 1000)}K`;
    return `${scaled(value / 1_000_000)}M`;
}
/** Exact count with thousands separators: 12,364. */
export function formatExactTokens(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function formatTokensPerSecond(tps) {
    return tps >= 10 ? String(Math.round(tps)) : String(Math.round(tps * 10) / 10);
}
/** Integer percentage, with just enough decimals that a partial hit never reads 100. */
export function cacheHitPercent(usage) {
    const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
    if (billed === 0)
        return undefined;
    if (usage.cacheReadTokens >= billed)
        return '100';
    const ratio = usage.cacheReadTokens / billed * 100;
    for (let places = 0;; places += 1) {
        const rounded = ratio.toFixed(places);
        if (Number(rounded) < 100 || places === 6)
            return rounded;
    }
}
function table(header, rows) {
    return [`| ${header} | Значение |`, '| :--- | ---: |', ...rows.map(([label, value]) => `| ${label} | ${value} |`)].join('\n');
}
/**
 * Render the `/stats` report as Telegram Rich Markdown. Sections follow the Web
 * composer: time once a step closed, usage once tokens were billed, context once
 * a provider reported usage against a known window.
 * @param values - the session's projection values.
 * @param sessionLabel - preformatted inline label of the session.
 * @returns the report, or a notice when no section has data yet.
 */
export function formatSessionStats(values, sessionLabel) {
    const stats = sessionStats(values);
    const usage = tokenUsage(values);
    const occupancy = contextOccupancy(values);
    const breakdown = contextBreakdown(values);
    const sections = [];
    if (stats !== undefined && stats.steps > 0) {
        const rows = [['Ходы', `${stats.turns} ходов, ${stats.steps} шагов`]];
        if (stats.llmMs > 0)
            rows.push(['Время модели', formatDuration(stats.llmMs)]);
        if (stats.toolMs > 0)
            rows.push(['Время инструментов', formatDuration(stats.toolMs)]);
        if (stats.ttftSteps > 0)
            rows.push(['Среднее время первого токена (TTFT)', formatDuration(stats.ttftMs / stats.ttftSteps)]);
        if (stats.decodeMs > 0) {
            rows.push(['Скорость ответа (TPS)', `${formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1000))} tok/s`]);
        }
        sections.push(`## ⏱ Время и скорость\n\n${table('Показатель', rows)}`);
    }
    const billed = usage === undefined ? 0 : usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
    if (usage !== undefined && (billed > 0 || usage.outputTokens > 0)) {
        const hit = cacheHitPercent(usage);
        const rows = [];
        if (hit !== undefined)
            rows.push(['Попадание в кеш', `${hit}%`]);
        rows.push(['Вход без кеша', `${formatExactTokens(usage.uncachedInputTokens)} tok`]);
        rows.push(['Чтение кеша', `${formatExactTokens(usage.cacheReadTokens)} tok`]);
        if (usage.cacheWriteTokens !== 0)
            rows.push(['Запись кеша', `${formatExactTokens(usage.cacheWriteTokens)} tok`]);
        rows.push(['Ответ', `${formatExactTokens(usage.outputTokens)} tok`]);
        sections.push(`## 🗄 Расход токенов · ${formatExactTokens(billed + usage.outputTokens)} tok\n\n${table('Показатель', rows)}`);
    }
    if (occupancy !== undefined) {
        // Each figure is a heuristic estimate, so none is presented as an exact total.
        const lines = [
            `## 🧭 Контекст использован на ${occupancy.percent}%`,
            `около ${formatTokens(occupancy.usedTokens)} / ${formatTokens(occupancy.contextWindow)}`,
        ];
        if (breakdown !== undefined) {
            lines.push(table('Состав', [
                ['Системные инструкции', `около ${formatTokens(breakdown.systemTokens)}`],
                ['Определения инструментов', `около ${formatTokens(breakdown.toolsTokens)}`],
                ['Сообщения', `около ${formatTokens(breakdown.messageTokens)}`],
            ]));
        }
        sections.push(lines.join('\n\n'));
    }
    if (sections.length === 0) {
        return `ℹ️ Статистики пока нет.\n\n**Разговор**: ${sessionLabel}\n\nВ этом разговоре ещё не было запросов к модели.`;
    }
    return ['# 📊 Статистика разговора', `**Разговор**: ${sessionLabel}`, ...sections.flatMap(section => ['---', section])].join('\n\n');
}
