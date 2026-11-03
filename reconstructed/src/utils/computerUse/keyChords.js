/**
 * utils/computerUse/keyChords.ts
 *
 * 2.1.316 新增：computer use 按键组合解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hrs3dad1.js (5)
 * attribution: placement 5
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { jsonStringify } from "../slowOperations.js";
import { truncateWithCount } from "../stringUtils.js";
import { scaledImageSize, IMAGE_SCALING_DEFAULTS } from "./imageScaling.js";

//@ chunk-hrs3dad1.js:5858-6161 placement
/**
 * 修饰键别名到标准名的映射。
 */
var MODIFIER_KEYS = new Set([
  "shift",
  "lshift",
  "rshift",
  "control",
  "ctrl",
  "lcontrol",
  "lctrl",
  "rcontrol",
  "rctrl",
  "alt",
  "option",
  "meta",
  "super",
  "command",
  "cmd",
  "windows",
  "win",
]);
var MODIFIER_ALIASES = new Set(["shift", "lshift", "rshift"]);
var KEY_NAME_ALIASES = new Set([
  "up",
  "down",
  "left",
  "right",
  "home",
  "end",
  "pageup",
  "pagedown",
  "page_up",
  "page_down",
]);
var MAX_CHORD_COMPONENTS = 8;
var MAX_KEY_NAME_CHARS = 32;
//@ chunk-hrs3dad1.js:6161-6897 placement
/**
 * 解析按键组合字符串（修饰键 + 普通键），校验并规范化。
 */
function parseKeyChord(o, r) {
  let flattened = o.flatMap((a) => {
    let trimmed = a.trim();
    return trimmed !== "" ? [trimmed] : a.length === 1 ? [a] : [];
  });
  if (flattened.length > MAX_CHORD_COMPONENTS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r} ${describeChordKeys(flattened)} has ${flattened.length} components; at most ${MAX_CHORD_COMPONENTS} are allowed. Send one key, with its modifiers, per action.`,
      "key chord rejected: too many components",
    );
  let filtered = flattened.filter((a) => MODIFIER_KEYS.has(a.toLowerCase()));
  let filtered_2 = flattened.filter((a) => !MODIFIER_KEYS.has(a.toLowerCase()));
  if (
    filtered_2.length > 1 &&
    !(
      r === "Key chord" &&
      filtered.every((a) => MODIFIER_ALIASES.has(a.toLowerCase())) &&
      filtered_2.every((a) => KEY_NAME_ALIASES.has(a.toLowerCase()))
    )
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r} ${describeChordKeys(flattened)} has ${filtered_2.length} keys that are not modifiers (${filtered_2.map((a) => jsonStringify(truncateWithCount(a, MAX_KEY_NAME_CHARS))).join(", ")}); a chord is modifier keys plus at most one other key. Send a separate action for each key.`,
      "key chord rejected: more than one non-modifier key",
    );
  return flattened;
}
//@ chunk-hrs3dad1.js:6897-7010 placement
function describeChordKeys(o) {
  let joined = o
    .slice(0, MAX_CHORD_COMPONENTS)
    .map((l) => truncateWithCount(l, MAX_KEY_NAME_CHARS))
    .join("+");
  let s = o.length - MAX_CHORD_COMPONENTS;
  return s > 0 ? `${jsonStringify(joined)} (+${s} more)` : jsonStringify(joined);
}
//@ chunk-hrs3dad1.js:7010-7028 placement
/**
 * 未使用的缩放比例常量（0.75）。
 */
var UNUSED_SCALE_RATIO = 0.75;
var UNUSED_SCALE_TIMEOUT_MS = 5000;
//@ chunk-hrs3dad1.js:7028-7102 placement
/**
 * 按比例缩放坐标点。
 */
function scalePoint(o, r, s) {
  let rounded = Math.round(o * s);
  let rounded_2 = Math.round(r * s);
  return scaledImageSize(rounded, rounded_2, IMAGE_SCALING_DEFAULTS);
}
