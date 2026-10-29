# Octopus for Omarchy

A bar widget for [Octopus](https://github.com/SkvorikovCode/Octopus-AI), the desktop app for coding agents.

One icon in the Omarchy bar shows the state of your agents:
- in the theme's urgent color, with a dot, while an agent waits for your answer (the dot keeps it visible in monochrome themes, where "urgent" is a gray);
- in the bar's text color while agents work;
- dimmed while they are idle or Octopus is not running.

Click it for the list of agents: title, project, branch of a worktree copy, and how long the current turn has run. Click a row to open that session in Octopus. Right-click, or a click while Octopus is not running, opens the Octopus window.

![Octopus widget](preview.png)

## Requirements

- Omarchy with the Quattro shell (plugin support).
- Octopus 0.3 or newer. Octopus writes `$XDG_RUNTIME_DIR/octopus/status.json` and accepts `--show` and `--session <id>`; the widget only reads that file and runs `octopus-ai`.

## Install

```sh
omarchy plugin add https://github.com/SkvorikovCode/omarchy-octopus.git --enable
```

From a local checkout:

```sh
omarchy plugin add ~/code/omarchy-octopus --enable
```

## Configure

If Octopus is not on your `PATH` as `octopus-ai` (an AppImage, a build from source), point the widget at it:

```sh
omarchy bar set skvorikovcode.octopus command /path/to/octopus-ai
```

Move the icon:

```sh
omarchy bar move skvorikovcode.octopus --section right
```

## How it works

Octopus writes `$XDG_RUNTIME_DIR/octopus/status.json` atomically whenever an agent's status changes, and removes it on exit. The widget watches that file, and checks `/proc/<pid>/comm` so that a file left by a crash does not show stale agents. Commands run through `uwsm-app` as an argument list, never through a shell.

## Develop

```sh
node --test tests/
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" Panel.qml Service.qml
```

The shell reloads a changed plugin on save, but a bar widget that is already placed can keep running the previous QML. Run `omarchy restart shell` before judging a change.

## Remove

```sh
omarchy plugin remove skvorikovcode.octopus
```

## License

[Apache-2.0](LICENSE)
