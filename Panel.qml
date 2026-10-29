import QtQuick
import QtQuick.Layouts
import QtQuick.Effects
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// One icon in the bar: while an agent waits for an answer it takes the urgent
// color and a dot (monochrome themes make "urgent" a gray, so the dot carries the
// meaning), the bar's text color while agents work, dimmed when they are idle or
// Octopus is not running. A click lists the agents; a row opens its session.
Panel {
  id: root
  moduleName: "skvorikovcode.octopus"
  manageIpc: false

  property double nowMs: Date.now()
  readonly property var snapshot: service.snapshot
  readonly property string level: Model.level(snapshot)
  readonly property color foreground: Color.popups.text
  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property color urgent: Color.urgent
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family
  // The command that starts Octopus or hands it arguments (a second launch
  // passes them to the running copy).
  readonly property string command: String((settings && settings.command) || "octopus-ai")

  implicitWidth: iconButton.implicitWidth
  implicitHeight: iconButton.implicitHeight

  function launch(args) {
    Quickshell.execDetached(["uwsm-app", "--", root.command].concat(args))
  }

  // Keyboard selection: a row index, or agents.length for "Open Octopus".
  property int selected: 0

  function activateSelected() {
    var agents = root.snapshot.agents
    root.openSession(selected < agents.length ? agents[selected].sessionId : "")
  }

  function openSession(id) {
    root.close()
    root.launch(id ? ["--session", id] : ["--show"])
  }

  onOpenedChanged: if (opened) {
    nowMs = Date.now()
    selected = 0
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  Timer {
    interval: 1000
    repeat: true
    running: root.opened
    onTriggered: root.nowMs = Date.now()
  }

  Service {
    id: service
  }

  WidgetButton {
    id: iconButton
    anchors.fill: parent
    bar: root.bar
    labelVisible: false
    hasVisualContent: true
    fixedWidth: vertical ? -1 : Style.space(30)
    tooltipText: Model.tooltip(root.snapshot)
    active: root.level === "waiting"
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton || root.level === "off") root.launch(["--show"])
      else root.toggle()
    }

    OctopusIcon {
      anchors.centerIn: parent
      iconSize: Style.space(15)
      badge: root.level === "waiting"
      color: root.level === "waiting" ? root.urgent
        : root.level === "working" ? root.barForeground
        : Qt.darker(root.barForeground, 1.8)
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: iconButton
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(360))
    contentHeight: panel.fittedContentHeight(content.implicitHeight, Style.space(520))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onActivateRequested: root.activateSelected()
      onMoveRequested: function(dx, dy) {
        if (dy !== 0) root.selected = Math.max(0, Math.min(root.snapshot.agents.length, root.selected + dy))
      }

      Column {
        id: content
        width: parent.width
        spacing: Style.space(10)

        RowLayout {
          width: parent.width

          Text {
            Layout.fillWidth: true
            text: "OCTOPUS"
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.title
            font.bold: true
          }

          Text {
            text: root.snapshot.running ? Model.tooltip(root.snapshot) : "Not running"
            color: root.level === "waiting" ? root.urgent : root.dim
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
          }
        }

        PanelSeparator { width: parent.width; foreground: root.foreground }

        Text {
          visible: root.snapshot.running && root.snapshot.agents.length === 0
          width: parent.width
          text: "No agents yet."
          color: root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
        }

        Repeater {
          model: root.snapshot.agents
          delegate: AgentRow {
            required property var modelData
            required property int index
            width: content.width
            agent: modelData
            selected: index === root.selected
          }
        }

        PanelSeparator {
          visible: root.snapshot.running
          width: parent.width
          foreground: root.foreground
        }

        Text {
          id: openLink
          text: root.snapshot.running ? "Open Octopus" : "Start Octopus"
          color: openArea.containsMouse || root.selected === root.snapshot.agents.length ? root.foreground : root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
          font.bold: true

          MouseArea {
            id: openArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: root.openSession("")
          }
        }
      }
    }
  }

  component OctopusIcon: Item {
    id: icon
    property real iconSize: Style.space(15)
    property color color: root.barForeground
    property bool badge: false
    width: iconSize
    height: iconSize

    Image {
      id: mask
      anchors.fill: parent
      source: Qt.resolvedUrl("octopus.svg")
      sourceSize.width: icon.iconSize * 2
      sourceSize.height: icon.iconSize * 2
      fillMode: Image.PreserveAspectFit
      visible: false
    }

    MultiEffect {
      anchors.fill: parent
      source: mask
      colorization: 1.0
      colorizationColor: icon.color
    }

    Rectangle {
      visible: icon.badge
      width: Math.max(4, Math.round(icon.iconSize * 0.34))
      height: width
      radius: width / 2
      // The SVG leaves this corner empty, and the button clips anything outside the icon.
      anchors.right: parent.right
      anchors.top: parent.top
      color: root.barForeground
    }
  }

  component AgentRow: Rectangle {
    id: row
    property var agent: ({})
    property bool selected: false
    readonly property bool waiting: agent.status === "waiting"
    implicitHeight: rowContent.implicitHeight + Style.space(10)
    radius: Style.space(6)
    color: rowArea.containsMouse || row.selected ? Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.08) : "transparent"

    MouseArea {
      id: rowArea
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: root.openSession(row.agent.sessionId)
    }

    RowLayout {
      id: rowContent
      anchors.left: parent.left
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      anchors.leftMargin: Style.space(6)
      anchors.rightMargin: Style.space(6)
      spacing: Style.space(8)

      Rectangle {
        width: Style.space(7)
        height: width
        radius: width / 2
        color: row.waiting ? root.urgent
          : row.agent.status === "working" ? root.foreground
          : "transparent"
        border.width: 1
        border.color: row.waiting ? root.urgent : root.dim
      }

      Column {
        Layout.fillWidth: true
        spacing: Style.space(2)

        Text {
          width: parent.width
          text: row.agent.title || "Untitled session"
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
          font.bold: row.agent.unread || row.waiting
          elide: Text.ElideRight
        }

        Text {
          width: parent.width
          text: [Model.statusLabel(row.agent), Model.projectName(row.agent.project), row.agent.branch]
            .filter(function(part) { return part }).join(" · ")
          color: row.waiting ? root.urgent : root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          elide: Text.ElideRight
        }
      }

      Text {
        text: Model.elapsed(row.agent.since, root.nowMs)
        color: root.dim
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption
      }
    }
  }
}
