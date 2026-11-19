# DSH Telegram

[Русский](README.md)

A fork of [IgnatAi401/dsh-telegram](https://github.com/IgnatAi401/dsh-telegram) for ordinary private-chat conversations. Version 0.5.1 targets DSH **0.2.2-rc.5** and Node **24.9+**. It remains a native Cordis plugin using DSH's Session Controller and storage domain, with no separate gateway or runner.

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

## Goal notifications

Committed goal creation, blocking, pause, resume, completion and removal produce standalone persistent Telegram messages. Blocking includes the recorded reason and asks for explicit resumption after resolving it. Notices enter the existing chat delivery queue immediately, independently of turn completion or the model's closing answer. Objective edits stay quiet; reopening a session does not replay old notices. The plugin observes goal state without changing the execution policy. DSH also requires explicit resumption to rearm automatic continuation after a process restart.

Notices share the existing result cache and `/resend` behavior with answers: only the latest attempted output is retained, and later output replaces it. Unknown transport outcomes are not automatically retried. Successful Bot API acceptance is logged with the Telegram message ID, session ID, and goal revision/operation; the objective, blocker text and bot token are excluded. API acceptance does not prove that a person read the message.

## Persistence and upgrade from 0.4

DSH domain `telegram_chats`, version 1, owns table `chats`. Keys are `<bot-id>_<private-chat-id>`; records contain `workspaceId` and nullable `sessionId`. Message history stays in DSH session logs; tokens and transient widget state are never stored in this domain. Writes complete before active selection changes; stop retains the durable selection. Restoration enforces the current allowlist. An unavailable saved reference is reported explicitly and never replaced with another conversation implicitly.

`workspacePath` is now required. Version 0.4 held selections only in memory. To preserve a known former conversation, migrate its workspace/session IDs to this domain before startup, or choose it using `/sessions` and `/resume`. For the JSON backend the document is `<DSH_HOME>/storages/telegram_chats.json`; use the current storage-domain format without overwriting existing records.

Run `pnpm install --frozen-lockfile`, `pnpm run typecheck` and `pnpm run build`. The deployment integration check runs the real DSH and plugin with only Telegram/model API fixtures, covering ordinary messages, restart restoration, `/new` isolation, `/resume`, authorization and typing renewal. Original copyright and license are retained in [LICENSE](LICENSE).
