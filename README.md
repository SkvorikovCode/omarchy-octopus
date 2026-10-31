# omarchy-octopus

An [Omarchy](https://omarchy.org/) shell plugin that puts your
[Octopus AI](https://github.com/SkvorikovCode/Octopus-AI) agents in the top bar:
how many are working, how many are waiting for you, and a way to jump straight
into a session without leaving what you're doing.

## How it works

While it runs, Octopus AI writes a snapshot of its agents to
`$XDG_RUNTIME_DIR/octopus/status.json` — atomically, mode `0600`, removed on
exit. The plugin watches that file and renders it in the bar. Clicking an agent
opens its session with `octopus-ai --session <id>`.

The file looks like this:

```json
{
  "format": 1,
  "pid": 546976,
  "updatedAt": 1792670000000,
  "agents": [
    {
      "sessionId": "…",
      "title": "Fix login",
      "project": "/home/u/app",
      "branch": "octopus/fix-login",
      "status": "waiting",
      "unread": false,
      "since": 1792669900000
    }
  ],
  "counts": { "working": 1, "waiting": 1, "unread": 0 }
}
```

`status` is one of `starting`, `working`, `waiting`, `idle`, `offline`. Agents
waiting for an answer come first, then working ones.

## Install

```bash
omarchy plugin add https://github.com/SkvorikovCode/omarchy-octopus.git --enable
```

Plugins run unsandboxed inside the long-lived `omarchy-shell` process. Read the
code before you enable it.

## Development

Work on a copy under `~/.config/omarchy/plugins/` — edits there reload on save.
Check the manifest before publishing:

```bash
omarchy plugin validate .
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
