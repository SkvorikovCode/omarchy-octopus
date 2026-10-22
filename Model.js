.pragma library

// Reads Octopus's status file ($XDG_RUNTIME_DIR/octopus/status.json, format 1)
// and turns it into what the bar icon and the panel show. Pure functions: the
// same file runs in QML and under `node --test`.

var FORMAT = 1
var STATUSES = ["starting", "working", "waiting", "idle", "offline"]

function text(value, max) {
  var t = String(value === undefined || value === null ? "" : value).replace(/\s+/g, " ").trim()
  return max && t.length > max ? t.substring(0, max - 1) + "…" : t
}

function count(value) {
  var n = parseInt(value, 10)
  return isFinite(n) && n > 0 ? n : 0
}

// { ok, pid, agents, counts } or { ok: false, error }. A file from a newer format
// is rejected rather than misread.
function parseStatus(raw) {
  var data
  try {
    data = JSON.parse(String(raw || ""))
  } catch (e) {
    return { ok: false, error: "Unreadable status file" }
  }
  if (!data || typeof data !== "object") return { ok: false, error: "Unreadable status file" }
  if (data.format !== FORMAT) return { ok: false, error: "Unsupported status format " + data.format }
  var agents = (Array.isArray(data.agents) ? data.agents : []).map(function(a) {
    var status = STATUSES.indexOf(a && a.status) >= 0 ? a.status : "idle"
    return {
      sessionId: text(a && a.sessionId, 200),
      title: text(a && a.title, 80),
      project: text(a && a.project, 500),
      branch: text(a && a.branch, 200),
      status: status,
      unread: !!(a && a.unread),
      since: a && isFinite(Number(a.since)) && Number(a.since) > 0 ? Number(a.since) : 0
    }
  })
  var counts = data.counts || {}
  return {
    ok: true,
    pid: count(data.pid),
    agents: agents,
    counts: { working: count(counts.working), waiting: count(counts.waiting), unread: count(counts.unread) }
  }
}

// What the single bar icon says: "off" (Octopus not running), "waiting" (an agent
// needs an answer), "working", or "idle".
function level(state) {
  if (!state || !state.ok || !state.running) return "off"
  if (state.counts.waiting > 0) return "waiting"
  if (state.counts.working > 0) return "working"
  return "idle"
}

function tooltip(state) {
  switch (level(state)) {
    case "off": return "Octopus is not running · click to open"
    case "waiting": return plural(state.counts.waiting, "agent waits", "agents wait") + " for your answer"
    case "working": return plural(state.counts.working, "agent working", "agents working")
    default: return state.agents.length ? "Agents are idle" : "No agents"
  }
}

function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many)
}

// The last folder of a project path, for a compact row.
function projectName(path) {
  var parts = text(path).split("/").filter(function(p) { return p.length > 0 })
  return parts.length ? parts[parts.length - 1] : ""
}

// "m:ss" or "h:mm:ss" since a turn started; "" when unknown or in the future.
function elapsed(sinceMs, nowMs) {
  if (!sinceMs || nowMs < sinceMs) return ""
  var s = Math.floor((nowMs - sinceMs) / 1000)
  var h = Math.floor(s / 3600)
  var m = Math.floor((s % 3600) / 60)
  var sec = s % 60
  var pad = function(v) { return v < 10 ? "0" + v : String(v) }
  return h > 0 ? h + ":" + pad(m) + ":" + pad(sec) : m + ":" + pad(sec)
}

function statusLabel(agent) {
  switch (agent.status) {
    case "waiting": return "Waiting for you"
    case "working": return "Working"
    case "starting": return "Starting"
    case "offline": return "Stopped"
    default: return agent.unread ? "Done · unread" : "Idle"
  }
}

var exportsObject = {
  parseStatus: parseStatus,
  level: level,
  tooltip: tooltip,
  projectName: projectName,
  elapsed: elapsed,
  statusLabel: statusLabel
}

if (typeof module !== "undefined" && module.exports) module.exports = exportsObject
