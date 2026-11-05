/**
 * utils/computerUse/keyChords.ts
 *
 * 2.1.316 新增：computer use 按键组合解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p57a7983.js (5)
 * attribution: placement 5
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { jsonStringify } from "../slowOperations.js";
import { truncateWithCount } from "../stringUtils.js";
import { scaledImageSize, IMAGE_SCALING_DEFAULTS } from "./imageScaling.js";

//@ chunk-p57a7983.js:6082-6385 placement
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
//@ chunk-p57a7983.js:6385-7121 placement
/**
 * 解析按键组合字符串（修饰键 + 普通键），校验并规范化。
 */
function parseKeyChord(components, label) {
  let keys = components.flatMap((component) => {
    let trimmed = component.trim();
    return trimmed !== "" ? [trimmed] : component.length === 1 ? [component] : [];
  });
  if (keys.length > MAX_CHORD_COMPONENTS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label} ${describeChordKeys(keys)} has ${keys.length} components; at most ${MAX_CHORD_COMPONENTS} are allowed. Send one key, with its modifiers, per action.`,
      "key chord rejected: too many components",
    );
  let filtered = keys.filter((key) => MODIFIER_KEYS.has(key.toLowerCase()));
  let filtered_2 = keys.filter((key) => !MODIFIER_KEYS.has(key.toLowerCase()));
  if (
    filtered_2.length > 1 &&
    !(
      label === "Key chord" &&
      filtered.every((key) => MODIFIER_ALIASES.has(key.toLowerCase())) &&
      filtered_2.every((key) => KEY_NAME_ALIASES.has(key.toLowerCase()))
    )
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label} ${describeChordKeys(keys)} has ${filtered_2.length} keys that are not modifiers (${filtered_2.map((key) => jsonStringify(truncateWithCount(key, MAX_KEY_NAME_CHARS))).join(", ")}); a chord is modifier keys plus at most one other key. Send a separate action for each key.`,
      "key chord rejected: more than one non-modifier key",
    );
  return keys;
}
//@ chunk-p57a7983.js:7121-7234 placement
function describeChordKeys(keys) {
  let joined = keys
    .slice(0, MAX_CHORD_COMPONENTS)
    .map((key) => truncateWithCount(key, MAX_KEY_NAME_CHARS))
    .join("+");
  let hiddenCount = keys.length - MAX_CHORD_COMPONENTS;
  return hiddenCount > 0 ? `${jsonStringify(joined)} (+${hiddenCount} more)` : jsonStringify(joined);
}
//@ chunk-p57a7983.js:7234-7252 placement
/**
 * 未使用的缩放比例常量（0.75）。
 */
var UNUSED_SCALE_RATIO = 0.75;
var UNUSED_SCALE_TIMEOUT_MS = 5000;
//@ chunk-p57a7983.js:7252-7326 placement
/**
 * 按比例缩放坐标点。
 */
function scalePoint(x, y, scale) {
  let rounded = Math.round(x * scale);
  let rounded_2 = Math.round(y * scale);
  return scaledImageSize(rounded, rounded_2, IMAGE_SCALING_DEFAULTS);
}
