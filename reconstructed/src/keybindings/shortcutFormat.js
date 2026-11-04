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
import { logEvent } from "../services/analytics/index.js";
import { toActionTelemetryId, toFallbackTelemetryValue } from "./resolver.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { getKeybindings, keybindingsState } from "./loadUserBindings.js";
import { getActionDisplayText } from "./match.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { DEFAULT_VOICE_KEYSTROKE } from "../hooks/useVoiceIntegration.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-x1mwqya5.js:17871-17892 placement
var MACOS_OPTION_CHAR_TO_KEY = {
  "\u2020": "t",
};
//@ chunk-x1mwqya5.js:17892-17933 placement
function isMacOptionChar(key) {
  return Object.hasOwn(MACOS_OPTION_CHAR_TO_KEY, key);
}
//@ chunk-x1mwqya5.js:22493-22606 fingerprint = getShortcutDisplay (0.741)
/**
 * 发 tengu_keybinding_fallback_used：显示快捷键时找不到绑定、用了组件给的回退文字。
 */
function logShortcutFallbackUsed(action, context, fallback, reason) {
  logEvent("tengu_keybinding_fallback_used", {
    action: toActionTelemetryId(action),
    context: fromEnum(context),
    fallback: toFallbackTelemetryValue(fallback),
    reason: fromEnum(reason),
  });
}
//@ chunk-bn7jsn5n.js:347-537 placement
/**
 * 取某快捷键动作的显示文本；动作找不到时返回 fallback，并对每个（上下文:动作）只记一次回退日志。
 */
function getShortcutDisplay(context, action, fallback) {
  let keybindings = getKeybindings(keybindingsState);
  let actionDisplayText = getActionDisplayText(context, action, keybindings);
  if (actionDisplayText === undefined) {
    let key = `${context}:${action}`;
    let loggedShortcutFallbacks = keybindingsState.loggedShortcutFallbacks;
    if (!loggedShortcutFallbacks.has(key)) {
      loggedShortcutFallbacks.add(key);
      logShortcutFallbackUsed(context, action, fallback, "action_not_found");
    }
    return fallback;
  }
  return actionDisplayText === null ? "" : actionDisplayText;
}
//@ chunk-v6kts6xw.js:411-415 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v6kts6xw.js:411", () => {
  init_react_production();
});
//@ chunk-v6kts6xw.js:415-848 placement
/**
 * 快捷键显示风格（default/compact/symbol）
 */
var SHORTCUT_FORMAT_STYLES = {
  default: {
    keyCase: "title",
    modCase: "lower",
    caretCtrl: false,
    modSep: "+",
    arrowSep: "/",
    chordSep: " ",
    shiftAsCase: false,
    charCase: "preserve",
    platform: "other",
  },
  compact: {
    keyCase: "lower",
    modCase: "lower",
    caretCtrl: true,
    modSep: "+",
    arrowSep: "",
    chordSep: " ",
    shiftAsCase: true,
    charCase: "preserve",
    platform: "other",
  },
  symbol: {
    keyCase: "glyph",
    modCase: "glyph",
    caretCtrl: false,
    modSep: "",
    arrowSep: "",
    chordSep: " ",
    shiftAsCase: true,
    charCase: "upper",
    platform: "other",
  },
};
//@ chunk-v6kts6xw.js:848-917 placement
function resolveShortcutFormat(options) {
  let { style, ...rest } = options;
  return {
    ...SHORTCUT_FORMAT_STYLES[style ?? "default"],
    ...omitUndefinedKeys(rest),
  };
}
//@ chunk-v6kts6xw.js:917-991 placement
function omitUndefinedKeys(obj) {
  let clean = {};
  for (let key in obj) if (obj[key] !== undefined) clean[key] = obj[key];
  return clean;
}
//@ chunk-v6kts6xw.js:991-1399 placement
/**
 * 把多组按键和弦格式化为显示文本
 */
function formatKeyChords(chords, style = {}) {
  let options = resolveShortcutFormat(style);
  let formatChord = (chord) => formatKeyChord(chord, options);
  let formatSequence = (chord) => chord.map(formatChord).join(options.chordSep);
  if (chords.length === 0) return "";
  if (chords.length === 1) return formatSequence(chords[0]);
  let singleKeystrokes = chords.every((chord) => chord.length === 1)
    ? chords.map((chord) => chord[0])
    : undefined;
  if (!singleKeystrokes) return chords.map(formatSequence).join("/");
  let shared = sharedModifierChord(singleKeystrokes, options);
  let arrowSep =
    singleKeystrokes.every((keystroke) => ARROW_KEYS.has(keystroke.key)) &&
    (!!shared || singleKeystrokes.every((keystroke) => modifiersOf(keystroke, options).length === 0))
      ? options.arrowSep
      : "/";
  if (shared) {
    let mapped = singleKeystrokes.map((keystroke) =>
      formatChord({
        ...keystroke,
        ...NO_MODIFIERS,
      }),
    );
    return formatModifierPrefix(shared, options) + mapped.join(arrowSep);
  }
  return singleKeystrokes.map(formatChord).join(arrowSep);
}
//@ chunk-v6kts6xw.js:1399-2277 affinity
/**
 * 快捷键显示用的按键名称（标题、小写、符号三种形式）、修饰键名称（按平台区分）与方向键集合。
 */
var KEY_DISPLAY_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var KEY_CASE_INDEX;
var MODIFIER_DISPLAY_NAMES;
var ARROW_KEYS;
var NO_MODIFIERS;
deferInit("chunk-v6kts6xw.js:1399", () => {
  KEY_DISPLAY_NAMES = {
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
  };
  KEY_CASE_INDEX = {
    title: 0,
    lower: 1,
    glyph: 2,
  };
  MODIFIER_DISPLAY_NAMES = {
    ctrl: {
      lower: "ctrl",
      title: "Ctrl",
      glyph: "\u2303",
    },
    shift: {
      lower: "shift",
      title: "Shift",
      glyph: "\u21E7",
    },
    alt: {
      lower: (platform) => (platform === "macos" ? "opt" : "alt"),
      title: (platform) => (platform === "macos" ? "Opt" : "Alt"),
      glyph: "\u2325",
    },
    super: {
      lower: (platform) => (platform === "macos" ? "cmd" : "super"),
      title: (platform) => (platform === "macos" ? "Cmd" : "Super"),
      glyph: "\u2318",
    },
  };
  ARROW_KEYS = new Set(["up", "down", "left", "right"]);
  NO_MODIFIERS = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    super: false,
  };
});
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
/**
 * 按 modCase 取出修饰键的显示文本（可能是按平台区分的函数）。
 */
function modifierDisplayName(modifierName, options) {
  let name = MODIFIER_DISPLAY_NAMES[modifierName][options.modCase];
  return typeof name === "function" ? name(options.platform) : name;
}
//@ chunk-v6kts6xw.js:2502-2603 affinity
function formatKeyName(key, options) {
  let names = KEY_DISPLAY_NAMES[key];
  if (names) return names[KEY_CASE_INDEX[options.keyCase]];
  return options.charCase === "upper" ? key.toUpperCase() : key;
}
//@ chunk-v6kts6xw.js:2710-2965 affinity
function formatKeyChord(chord, options) {
  if (options.shiftAsCase && DEFAULT_VOICE_KEYSTROKE(chord)) return chord.key.toUpperCase();
  let modifierNames = getModifierNames(chord);
  let keyText = formatKeyName(chord.key, options);
  if (options.caretCtrl && modifierNames.length === 1 && modifierNames[0] === "ctrl") return `^${keyText}`;
  if (options.modCase === "glyph")
    return modifierNames.map((modifierName) => modifierDisplayName(modifierName, options)).join("") + keyText;
  return [...modifierNames.map((modifierName) => modifierDisplayName(modifierName, options)), keyText].join(
    options.modSep,
  );
}
//@ chunk-v6kts6xw.js:2965-3059 placement
function sharedModifierChord(keystrokes, options) {
  let [first, ...rest] = keystrokes;
  if (!modifiersOf(first, options).length) return;
  return rest.every((keystroke) => sameModifiers(first, keystroke, options)) ? first : undefined;
}
//@ chunk-v6kts6xw.js:3059-3119 placement
function modifiersOf(chord, options) {
  if (options.shiftAsCase && DEFAULT_VOICE_KEYSTROKE(chord)) return [];
  return getModifierNames(chord);
}
//@ chunk-v6kts6xw.js:3119-3212 placement
function sameModifiers(left, right, options) {
  let leftMods = modifiersOf(left, options);
  let rightMods = modifiersOf(right, options);
  return (
    leftMods.length === rightMods.length && leftMods.every((modifier, index) => modifier === rightMods[index])
  );
}
//@ chunk-v6kts6xw.js:3212-3401 placement
/**
 * 格式化修饰键前缀（^、glyph 或 ctrl+）
 */
function formatModifierPrefix(modifiers, options) {
  let modifierNames = getModifierNames(modifiers);
  if (options.caretCtrl && modifierNames.length === 1 && modifierNames[0] === "ctrl") return "^";
  if (options.modCase === "glyph")
    return modifierNames.map((modifierName) => modifierDisplayName(modifierName, options)).join("");
  return (
    modifierNames.map((modifierName) => modifierDisplayName(modifierName, options)).join(options.modSep) +
    options.modSep
  );
}
export {
  getShortcutDisplay,
  formatKeyChords,
  logShortcutFallbackUsed,
  isMacOptionChar,
  MACOS_OPTION_CHAR_TO_KEY,
};
