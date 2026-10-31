import QtQuick
import Quickshell
import Quickshell.Io
import "Theme.js" as Theme

// Keeps Octopus in the colors of the current Omarchy theme: on every theme switch
// it reads the theme's colors.toml and writes ~/.config/octopus/palette.json,
// which a running Octopus follows within seconds (Settings > Theme > Desktop).
Item {
  id: root

  property var settings: ({})

  readonly property string home: Quickshell.env("HOME") || ""
  readonly property string configHome: Quickshell.env("XDG_CONFIG_HOME") || home + "/.config"
  readonly property string themeDir: home + "/.local/state/omarchy/current"
  readonly property string palettePath: configHome + "/octopus/palette.json"

  property string themeName: ""
  property string written: ""

  function sync(toml) {
    var p = Theme.palette(Theme.parseColors(toml), themeName)
    if (!p) return
    var text = JSON.stringify(p, null, 2) + "\n"
    // An unchanged palette is not rewritten: Octopus repaints on every new file.
    if (text === written) return
    written = text
    mkdir.running = true
  }

  // theme.name is written after the new theme is in place, so it marks a switch.
  FileView {
    id: nameFile
    path: root.themeDir + "/theme.name"
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: {
      root.themeName = String(text()).trim()
      colorsFile.reload()
    }
  }

  FileView {
    id: colorsFile
    path: root.themeDir + "/theme/colors.toml"
    printErrors: false
    onLoaded: root.sync(text())
  }

  Process {
    id: mkdir
    command: ["mkdir", "-p", root.configHome + "/octopus"]
    onExited: paletteFile.setText(root.written)
  }

  FileView {
    id: paletteFile
    path: root.palettePath
    atomicWrites: true
    printErrors: false
  }

  // A theme switch replaces the files being watched; look again every second
  // (a tiny file) so Octopus follows within a couple of seconds either way.
  Timer {
    interval: 1000
    repeat: true
    running: true
    onTriggered: nameFile.reload()
  }
}
