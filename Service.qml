import QtQuick
import Quickshell
import Quickshell.Io
import "Model.js" as Model

// Watches the status file Octopus writes and checks that the app that wrote it
// is still alive: a crash leaves the file behind with a dead pid.
Item {
  id: root

  readonly property string statusPath: (Quickshell.env("XDG_RUNTIME_DIR") || "") + "/octopus/status.json"
  property var parsed: ({ ok: false, pid: 0, agents: [], counts: { working: 0, waiting: 0, unread: 0 } })
  property bool alive: false
  readonly property var snapshot: ({
    ok: parsed.ok,
    running: parsed.ok && alive,
    pid: parsed.pid,
    agents: parsed.ok && alive ? parsed.agents : [],
    counts: parsed.ok && alive ? parsed.counts : { working: 0, waiting: 0, unread: 0 }
  })

  function apply(raw) {
    parsed = Model.parseStatus(raw)
    if (parsed.ok && parsed.pid > 0) procFile.reload()
    else alive = false
  }

  function clear() {
    parsed = { ok: false, pid: 0, agents: [], counts: { working: 0, waiting: 0, unread: 0 } }
    alive = false
  }

  FileView {
    id: statusFile
    path: root.statusPath
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: root.apply(text())
    onLoadFailed: root.clear()
  }

  // /proc/<pid>/comm names the process; the file of a crashed app points nowhere.
  FileView {
    id: procFile
    path: root.parsed.pid > 0 ? "/proc/" + root.parsed.pid + "/comm" : ""
    printErrors: false
    onLoaded: root.alive = String(text()).trim().indexOf("octopus") === 0
    onLoadFailed: root.alive = false
  }

  // The watch ends when the app deletes the file on exit, and a new one appears
  // only on the next start, so look again every few seconds.
  Timer {
    interval: 3000
    repeat: true
    running: true
    onTriggered: statusFile.reload()
  }
}
