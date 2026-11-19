# DSH Telegram

[Русский](README.md)

A fork of [IgnatAi401/dsh-telegram](https://github.com/IgnatAi401/dsh-telegram) for ordinary private-chat conversations. Version 0.5.0 targets DSH **0.2.2-rc.5** and Node **24.9+**. It remains a native Cordis plugin using DSH's Session Controller and storage domain, with no separate gateway or runner.

Install a qualified commit with `dsh plugin --profile web add github:FerrPOINT/dsh-telegram#<commit>`. The profile must provide session, workspace, storage-domain, model and agent-preset services. Register a workspace and configure its absolute path:

```yaml
- id: telegram
  config:
    workspacePath: /opt/dev
    preset: standard
```

Configure the token and allowlist through the plugin settings or a protected profile configuration. Only authorized private chats are admitted; never run two pollers with the same token.

## Chat and sessions

Send text, images or files directly. A new chat creates its own conversation in the configured workspace; later messages resume its durable selection, including after DSH restarts and token rotation for the same bot.

- `/new`: start a clean conversation and retain the previous history.
- `/sessions [page]`: list saved conversations.
- `/resume ID`: continue a saved conversation in the selected workspace.
- `/stats`, `/compact`, `/resend`, `/help`: statistics, compaction, resend and help.

`/menu` is optional advanced control. Ordinary chatting and text-based conversation selection require no widget menu. Advanced upstream panels, questions and approvals use Telegram widgets.

## Persistence and upgrade from 0.4

DSH domain `telegram_chats`, version 1, owns table `chats`. Keys are `<bot-id>_<private-chat-id>`; records contain `workspaceId` and nullable `sessionId`. Message history stays in DSH session logs; tokens and transient widget state are never stored in this domain. Writes complete before active selection changes; stop retains the durable selection. Restoration enforces the current allowlist. An unavailable saved reference is reported explicitly and never replaced with another conversation implicitly.

`workspacePath` is now required. Version 0.4 held selections only in memory. To preserve a known former conversation, migrate its workspace/session IDs to this domain before startup, or choose it using `/sessions` and `/resume`. For the JSON backend the document is `<DSH_HOME>/storages/telegram_chats.json`; use the current storage-domain format without overwriting existing records.

Run `pnpm install --frozen-lockfile`, `pnpm run typecheck` and `pnpm run build`. The deployment integration check runs the real DSH and plugin with only Telegram/model API fixtures, covering ordinary messages, restart restoration, `/new` isolation, `/resume`, authorization and typing renewal. Original copyright and license are retained in [LICENSE](LICENSE).
