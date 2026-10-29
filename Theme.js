.pragma library

// Turns the current Omarchy theme (colors.toml) into the palette file Octopus
// follows (~/.config/octopus/palette.json, format 1): the color keys are the CSS
// variables of Octopus's stylesheet. Pure functions: the same file runs in QML
// and under `node --test`.
//
// Shades are mixes of the theme's background and foreground in the proportions
// of Octopus's own schemes. Dark: the page is the theme's background and tiles
// rise towards the text color. Light: tiles are the theme's background on a page
// a step darker, as in Octopus's light scheme.

var HEX = /^#[0-9a-fA-F]{6}$/

// The `key = "#rrggbb"` lines of colors.toml (mode too); other lines are ignored.
function parseColors(toml) {
  var out = {}
  var lines = String(toml || "").split("\n")
  for (var i = 0; i < lines.length; i++) {
    var m = /^\s*([a-z_]+)\s*=\s*"([^"]*)"\s*$/.exec(lines[i])
    if (m) out[m[1]] = m[2]
  }
  return out
}

function rgb(hex) {
  var n = parseInt(hex.substring(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function hex(c) {
  var s = "#"
  for (var i = 0; i < 3; i++) {
    var v = Math.max(0, Math.min(255, Math.round(c[i])))
    s += (v < 16 ? "0" : "") + v.toString(16)
  }
  return s
}

// `amount` of the way from a to b, as Omarchy's own `mix` in its templates.
function mix(a, b, amount) {
  var x = rgb(a), y = rgb(b)
  return hex([x[0] + (y[0] - x[0]) * amount, x[1] + (y[1] - x[1]) * amount, x[2] + (y[2] - x[2]) * amount])
}

// A text step: up to `amount` of the way from fg to bg, less where that would
// fall below `min` contrast on `surface` (themes whose text is already soft).
function step(fg, bg, amount, surface, min) {
  for (var t = amount; t > 0; t -= 0.01) {
    var c = mix(fg, bg, t)
    if (contrast(c, surface) >= min) return c
  }
  return fg
}

// Text on accent buttons: the theme's background, else its text color, else plain
// white or black, the first that reads at 4.5:1; failing all, the best of them.
function onAccent(accent, bg, fg) {
  var options = [bg, fg, "#ffffff", "#000000"]
  var best = options[0]
  for (var i = 0; i < options.length; i++) {
    if (contrast(options[i], accent) >= 4.5) return options[i]
    if (contrast(options[i], accent) > contrast(best, accent)) best = options[i]
  }
  return best
}

function color(colors, key, fallback) {
  var c = colors[key]
  return typeof c === "string" && HEX.test(c) ? c.toLowerCase() : fallback
}

// The palette file's object, or null when the theme lacks a background or text
// color. Text steps keep their contrast on the tile they sit on: panel-2 in the
// dark scheme, the theme's background in the light one.
function palette(colors, name) {
  var bg = color(colors, "background", null)
  var fg = color(colors, "foreground", null)
  if (!bg || !fg) return null
  var light = colors.mode === "light"
  var accent = color(colors, "accent", fg)
  var yellow = color(colors, "yellow", fg)
  var c
  if (light) {
    c = {
      "bg": mix(bg, fg, 0.06),
      "panel": bg,
      "panel-2": mix(bg, fg, 0.03),
      "raise": mix(bg, fg, 0.05),
      "line": mix(bg, fg, 0.1),
      "line-2": mix(bg, fg, 0.15),
      "line-3": mix(bg, fg, 0.22),
      "dot": mix(bg, fg, 0.3),
      "ink": fg,
      "ink-2": step(fg, bg, 0.12, bg, 4.5),
      "ink-3": step(fg, bg, 0.25, bg, 4.5),
      "mute": step(fg, bg, 0.35, bg, 4),
      "dim": step(fg, bg, 0.48, bg, 3),
      "code-bg": mix(bg, fg, 0.04),
      "composer": bg,
      "syn-str": mix(yellow, fg, 0.45)
    }
  } else {
    c = {
      "bg": bg,
      "panel": mix(bg, fg, 0.03),
      "panel-2": mix(bg, fg, 0.055),
      "raise": mix(bg, fg, 0.08),
      "line": mix(bg, fg, 0.09),
      "line-2": mix(bg, fg, 0.13),
      "line-3": mix(bg, fg, 0.155),
      "dot": mix(bg, fg, 0.18),
      "ink": fg,
      "ink-2": step(fg, bg, 0.17, mix(bg, fg, 0.055), 4.5),
      "ink-3": step(fg, bg, 0.34, mix(bg, fg, 0.055), 4.5),
      "mute": step(fg, bg, 0.445, mix(bg, fg, 0.055), 4),
      "dim": step(fg, bg, 0.595, mix(bg, fg, 0.055), 3),
      "code-bg": color(colors, "dark_background", mix(bg, "#000000", 0.25)),
      "composer": mix(bg, fg, 0.035),
      "syn-str": mix(yellow, fg, 0.25)
    }
  }
  c["accent"] = accent
  c["on-accent"] = onAccent(accent, bg, fg)
  return { format: 1, name: name || undefined, scheme: light ? "light" : "dark", colors: c }
}

// WCAG contrast of two #rrggbb colors, for the tests and the contrast table.
function contrast(a, b) {
  function lum(h) {
    var c = rgb(h).map(function(v) {
      var x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  var la = lum(a), lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

if (typeof module !== "undefined") module.exports = { parseColors: parseColors, palette: palette, mix: mix, contrast: contrast }
