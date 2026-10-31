// node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Theme.js is a QML JavaScript library: drop its `.pragma library` line and run it as CommonJS.
const source = readFileSync(new URL("../Theme.js", import.meta.url), "utf8").replace(/^\.pragma library\s*$/m, "");
const module = { exports: {} };
new Function("module", source)(module);
const Theme = module.exports;

const TOKYO = `
mode = "dark"
accent = "#7aa2f7"
background = "#1a1b26"
dark_background = "#16161e"
foreground = "#a9b1d6"
yellow = "#e0af68"
hyprland_active_border = "rgba(33ccffee) rgba(00ff99ee) 45deg"
`;

const LATTE = `
mode = "light"
accent = "#1e66f5"
background = "#eff1f5"
foreground = "#4c4f69"
`;

test("reads the color lines of colors.toml and skips the rest", () => {
  const c = Theme.parseColors(TOKYO);
  assert.equal(c.mode, "dark");
  assert.equal(c.background, "#1a1b26");
  assert.equal(c.hyprland_active_border, "rgba(33ccffee) rgba(00ff99ee) 45deg");
});

test("mixes like Omarchy's templates", () => {
  assert.equal(Theme.mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(Theme.mix("#102030", "#102030", 0.3), "#102030");
});

test("a dark theme: the page is the theme's background, tiles rise towards the text", () => {
  const p = Theme.palette(Theme.parseColors(TOKYO), "tokyo-night");
  assert.equal(p.format, 1);
  assert.equal(p.name, "tokyo-night");
  assert.equal(p.scheme, "dark");
  assert.equal(p.colors.bg, "#1a1b26");
  assert.equal(p.colors.ink, "#a9b1d6");
  assert.equal(p.colors.accent, "#7aa2f7");
  assert.equal(p.colors["on-accent"], "#1a1b26");
  assert.equal(p.colors["code-bg"], "#16161e");
  assert.ok(Theme.contrast(p.colors.panel, p.colors.bg) > 1);
});

test("a light theme: tiles are the theme's background on a darker page", () => {
  const p = Theme.palette(Theme.parseColors(LATTE), "catppuccin-latte");
  assert.equal(p.scheme, "light");
  assert.equal(p.colors.panel, "#eff1f5");
  assert.notEqual(p.colors.bg, "#eff1f5");
  // On Latte's blue the theme's text reads at 1.6:1 and its background at 4.3:1: white it is.
  assert.equal(p.colors["on-accent"], "#ffffff");
});

test("text steps keep 4.5:1 (mute 4:1, dim 3:1) on their tiles, even for soft-contrast themes", () => {
  for (const toml of [TOKYO, LATTE]) {
    const p = Theme.palette(Theme.parseColors(toml));
    const c = p.colors;
    const tile = p.scheme === "light" ? c.panel : c["panel-2"];
    assert.ok(Theme.contrast(c["ink-2"], tile) >= 4.5);
    assert.ok(Theme.contrast(c["ink-3"], tile) >= 4.5);
    assert.ok(Theme.contrast(c.mute, tile) >= 4);
    assert.ok(Theme.contrast(c.dim, tile) >= 3);
  }
});

test("no palette without a background or text color; an accent falls back to the text", () => {
  assert.equal(Theme.palette({ foreground: "#ffffff" }), null);
  assert.equal(Theme.palette({ background: "#000000", foreground: "white" }), null);
  assert.equal(Theme.palette({ background: "#000000", foreground: "#FFFFFF" }).colors.accent, "#ffffff");
});
