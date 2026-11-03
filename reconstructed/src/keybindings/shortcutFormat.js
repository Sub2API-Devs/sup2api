/**
 * keybindings/shortcutFormat.ts
 *
 * 并入旧版已有路径：快捷键格式化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/shortcutFormat.ts
 * pieces: chunk-bn7jsn5n.js (1), chunk-v6kts6xw.js (14), chunk-x1mwqya5.js (3)
 * attribution: placement 12, affinity 5, fingerprint 1
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import { DEFAULT_VOICE_KEYSTROKE } from "../hooks/useVoiceIntegration.js";
import { logEvent } from "../services/analytics/index.js";
import { toActionTelemetryId, toFallbackTelemetryValue } from "./resolver.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { getKeybindings, keybindingsState } from "./loadUserBindings.js";
import { getActionDisplayText } from "./match.js";

//@ chunk-v6kts6xw.js:411-415 placement
j();
/**
 * 快捷键显示风格（default/compact/symbol）
 */
//@ chunk-v6kts6xw.js:415-848 placement
var SHORTCUT_FORMAT_STYLES = {
  default: {
    keyCase: "title",
    modCase: "lower",
    caretCtrl: !1,
    modSep: "+",
    arrowSep: "/",
    chordSep: " ",
    shiftAsCase: !1,
    charCase: "preserve",
    platform: "other",
  },
  compact: {
    keyCase: "lower",
    modCase: "lower",
    caretCtrl: !0,
    modSep: "+",
    arrowSep: "",
    chordSep: " ",
    shiftAsCase: !0,
    charCase: "preserve",
    platform: "other",
  },
  symbol: {
    keyCase: "glyph",
    modCase: "glyph",
    caretCtrl: !1,
    modSep: "",
    arrowSep: "",
    chordSep: " ",
    shiftAsCase: !0,
    charCase: "upper",
    platform: "other",
  },
};
//@ chunk-v6kts6xw.js:848-917 placement
function resolveShortcutFormat(t) {
  let { style: style, ...s } = t;
  return { ...SHORTCUT_FORMAT_STYLES[style ?? "default"], ...omitUndefinedKeys(s) };
}
//@ chunk-v6kts6xw.js:917-991 placement
function omitUndefinedKeys(t) {
  let o = {};
  for (let key in t) if (t[key] !== void 0) o[key] = t[key];
  return o;
}
/**
 * 把多组按键和弦格式化为显示文本
 */
//@ chunk-v6kts6xw.js:991-1399 placement
function formatKeyChords(t, o = {}) {
  let s = resolveShortcutFormat(o),
    n = (i) => formatKeyChord(i, s),
    a = (i) => i.map(n).join(s.chordSep);
  if (t.length === 0) return "";
  if (t.length === 1) return a(t[0]);
  let l = t.every((i) => i.length === 1) ? t.map((i) => i[0]) : void 0;
  if (!l) return t.map(a).join("/");
  let p = sharedModifierChord(l, s),
    c =
      l.every((i) => ARROW_KEYS.has(i.key)) && (!!p || l.every((i) => modifiersOf(i, s).length === 0))
        ? s.arrowSep
        : "/";
  if (p) {
    let mapped = l.map((f) => n({ ...f, ...NO_MODIFIERS }));
    return formatModifierPrefix(p, s) + mapped.join(c);
  }
  return l.map(n).join(c);
}
/**
 * 快捷键显示用的按键名称（标题、小写、符号三种形式）、修饰键名称（按平台区分）与方向键集合。
 */
//@ chunk-v6kts6xw.js:1399-2277 affinity
var KEY_DISPLAY_NAMES = {
    enter: ["Enter", "enter", "\u23CE"],
    escape: ["Esc", "esc", "\u238B"],
    tab: ["Tab", "tab", "\u21E5"],
    " ": ["Space", "space", "\u2423"],
    backspace: ["Backspace", "backspace", "\u232B"],
    delete: ["Delete", "delete", "\u2326"],
    up: ["\u2191", "\u2191", "\u2191"],
    down: ["\u2193", "\u2193", "\u2193"],
    left: ["\u2190", "\u2190", "\u2190"],
    right: ["\u2192", "\u2192", "\u2192"],
    pageup: ["PageUp", "pgup", "\u21DE"],
    pagedown: ["PageDown", "pgdn", "\u21DF"],
    home: ["Home", "home", "\u2196"],
    end: ["End", "end", "\u2198"],
  },
  KEY_CASE_INDEX = { title: 0, lower: 1, glyph: 2 },
  MODIFIER_DISPLAY_NAMES = {
    ctrl: { lower: "ctrl", title: "Ctrl", glyph: "\u2303" },
    shift: { lower: "shift", title: "Shift", glyph: "\u21E7" },
    alt: {
      lower: (t) => (t === "macos" ? "opt" : "alt"),
      title: (t) => (t === "macos" ? "Opt" : "Alt"),
      glyph: "\u2325",
    },
    super: {
      lower: (t) => (t === "macos" ? "cmd" : "super"),
      title: (t) => (t === "macos" ? "Cmd" : "Super"),
      glyph: "\u2318",
    },
  },
  ARROW_KEYS = new Set(["up", "down", "left", "right"]),
  NO_MODIFIERS = { ctrl: !1, alt: !1, shift: !1, meta: !1, super: !1 };
//@ chunk-v6kts6xw.js:2277-2419 affinity = keystrokeToString (0.803)
function getModifierNames(ks) {
  let parts = [];
  if (ks.ctrl) parts.push("ctrl");
  if (ks.shift) parts.push("shift");
  if (ks.alt || ks.meta) parts.push("alt");
  if (ks.super) parts.push("super");
  return parts;
}
//@ chunk-v6kts6xw.js:2419-2502 affinity
function y(t, o) {
  let s = MODIFIER_DISPLAY_NAMES[t][o.modCase];
  return typeof s === "function" ? s(o.platform) : s;
}
//@ chunk-v6kts6xw.js:2502-2603 affinity
function formatKeyName(key, options) {
  let s = KEY_DISPLAY_NAMES[key];
  if (s) return s[KEY_CASE_INDEX[options.keyCase]];
  return options.charCase === "upper" ? key.toUpperCase() : key;
}
//@ chunk-v6kts6xw.js:2710-2965 affinity
function formatKeyChord(chord, options) {
  if (options.shiftAsCase && DEFAULT_VOICE_KEYSTROKE(chord)) return chord.key.toUpperCase();
  let s = getModifierNames(chord),
    n = formatKeyName(chord.key, options);
  if (options.caretCtrl && s.length === 1 && s[0] === "ctrl") return `^${n}`;
  if (options.modCase === "glyph") return s.map((a) => y(a, options)).join("") + n;
  return [...s.map((a) => y(a, options)), n].join(options.modSep);
}
//@ chunk-v6kts6xw.js:2965-3059 placement
function sharedModifierChord(t, o) {
  let [s, ...n] = t;
  if (!modifiersOf(s, o).length) return;
  return n.every((l) => sameModifiers(s, l, o)) ? s : void 0;
}
//@ chunk-v6kts6xw.js:3059-3119 placement
function modifiersOf(t, o) {
  if (o.shiftAsCase && DEFAULT_VOICE_KEYSTROKE(t)) return [];
  return getModifierNames(t);
}
//@ chunk-v6kts6xw.js:3119-3212 placement
function sameModifiers(t, o, s) {
  let n = modifiersOf(t, s),
    a = modifiersOf(o, s);
  return n.length === a.length && n.every((l, p) => l === a[p]);
}
/**
 * 格式化修饰键前缀（^、glyph 或 ctrl+）
 */
//@ chunk-v6kts6xw.js:3212-3401 placement
function formatModifierPrefix(t, o) {
  let s = getModifierNames(t);
  if (o.caretCtrl && s.length === 1 && s[0] === "ctrl") return "^";
  if (o.modCase === "glyph") return s.map((n) => y(n, o)).join("");
  return s.map((n) => y(n, o)).join(o.modSep) + o.modSep;
}
//@ chunk-x1mwqya5.js:17871-17892 placement
var MACOS_OPTION_CHAR_TO_KEY = { "\u2020": "t" };
//@ chunk-x1mwqya5.js:17892-17933 placement
function isMacOptionChar(n) {
  return Object.hasOwn(MACOS_OPTION_CHAR_TO_KEY, n);
}
/**
 * 发 tengu_keybinding_fallback_used：显示快捷键时找不到绑定、用了组件给的回退文字。
 */
//@ chunk-x1mwqya5.js:22493-22606 fingerprint = getShortcutDisplay (0.741)
function logShortcutFallbackUsed(n, r, e, s) {
  logEvent("tengu_keybinding_fallback_used", {
    action: toActionTelemetryId(n),
    context: fromEnum(r),
    fallback: toFallbackTelemetryValue(e),
    reason: fromEnum(s),
  });
}
/**
 * 取某快捷键动作的显示文本；动作找不到时返回 fallback，并对每个（上下文:动作）只记一次回退日志。
 */
//@ chunk-bn7jsn5n.js:347-537 placement
function getShortcutDisplay(context, action, fallback) {
  let n = getKeybindings(keybindingsState),
    e = getActionDisplayText(context, action, n);
  if (e === void 0) {
    let i = `${context}:${action}`,
      loggedShortcutFallbacks = keybindingsState.loggedShortcutFallbacks;
    if (!loggedShortcutFallbacks.has(i))
      (loggedShortcutFallbacks.add(i),
        logShortcutFallbackUsed(context, action, fallback, "action_not_found"));
    return fallback;
  }
  return e === null ? "" : e;
}

export {
  getShortcutDisplay,
  formatKeyChords,
  logShortcutFallbackUsed,
  isMacOptionChar,
  MACOS_OPTION_CHAR_TO_KEY,
};
