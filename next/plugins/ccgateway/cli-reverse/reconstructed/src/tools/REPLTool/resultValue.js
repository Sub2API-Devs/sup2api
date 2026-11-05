/**
 * tools/REPLTool/resultValue.ts
 *
 * 返回值渲染：安全 inspect 副本、深度复制与截断（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (6)
 * attribution: placement 6
 */
import { inspect } from "util";
import { readShellOutput } from "./shellResult.js";
import { REPL_PART_CAP } from "../../utils/codeMode.js";
import { NON_TEXT_RESULT_KEYS } from "./EvalTool.js";
import { truncatePart, getMarkerLength } from "./render.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { truncateMiddle } from "../../utils/stringUtils.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";

//@ chunk-n51jggtb.js:165057-165259 placement
/**
 * 去掉输入对象里值为 undefined/symbol 的键。
 */
function stripUndefinedProps(toolInput) {
  if (toolInput === null || typeof toolInput !== "object" || Array.isArray(toolInput)) return toolInput;
  let entries = Object.entries(toolInput);
  let filtered = entries.filter(([, value]) => value !== undefined && typeof value !== "symbol");
  return filtered.length === entries.length ? toolInput : Object.fromEntries(filtered);
}
//@ chunk-n51jggtb.js:171217-171558 placement
/**
 * 把任意返回值渲染成文本：字符串原样、命令结果取其 output、普通对象走 inspect。
 */
function formatResultValue(value, depth, cap) {
  if (typeof value === "string" && value.trim() !== "") return value;
  let customText = readShellOutput(value);
  if (customText !== undefined && customText.trim() !== "") return customText;
  let flatObjectText = formatFlatObject(value);
  if (flatObjectText !== undefined) return flatObjectText;
  try {
    let copy = value;
    try {
      copy = cloneDeepForDisplay(value, depth, new Map(), cap);
    } catch {}
    return inspect(copy, {
      colors: false,
      depth,
      customInspect: false,
      maxStringLength: cap === undefined ? REPL_PART_CAP : 2 * cap.max,
      maxArrayLength: MAX_ARRAY_LENGTH,
    });
  } catch {
    return "[non-serializable value]";
  }
}
//@ chunk-n51jggtb.js:171558-171940 placement
/**
 * 把 {名: 字符串} 对象渲染成 key: 值 的多行文本。
 */
function formatFlatObject(value, pretty = false) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return;
    let prototypeOf = Object.getPrototypeOf(value);
    if (prototypeOf === null || Object.getPrototypeOf(prototypeOf) !== null) return;
    let entries = [];
    for (let [key, value_2] of Object.entries(value)) {
      let text = typeof value_2 === "string" ? value_2 : readShellOutput(value_2);
      if (text === undefined || NON_TEXT_RESULT_KEYS.has(key)) return;
      entries.push([key, text]);
    }
    if (entries.length === 0) return;
    return entries.map(
      ([key, value]) => `${key}:
${pretty ? truncatePart(key, value) : value}`,
    ).join(`

`);
  } catch {
    return;
  }
}
//@ chunk-n51jggtb.js:171940-171977 placement
/**
 * inspect 的数组长度与省略标记常量。
 */
var MAX_ARRAY_LENGTH = 1000;
var RESULT_LIMITS = {
  notes: 20,
  chars: 1000,
};
//@ chunk-n51jggtb.js:171977-172099 placement
/**
 * 按预算脱敏字符串内部（Code Mode 下）。
 */
function truncateForCap(text, cap) {
  if (codeModeAccepted()) {
    let markerLength = getMarkerLength(cap.max);
    return truncateMiddle(
      text,
      markerLength,
      cap.max - markerLength,
      (marker) => ` ... [${marker} chars elided ${cap.token}] ... `,
    );
  }
  return text;
}
//@ chunk-n51jggtb.js:172099-173217 placement
/**
 * 按深度复制可安全 inspect 的普通对象，越界时用占位符。
 */
function cloneDeepForDisplay(value, depth, seen, cap) {
  if (typeof value === "string") return cap === undefined ? value : truncateForCap(value, cap);
  if (value === null || typeof value !== "object" || isUntrustedObject(value)) return value;
  let customText = readShellOutput(value);
  if (customText !== undefined) return cap === undefined ? customText : truncateForCap(customText, cap);
  let previous = seen.get(value);
  if (previous !== undefined && previous.depth >= depth) return previous.copy;
  let prototypeOf = Object.getPrototypeOf(value);
  let isArray = Array.isArray(value);
  let proto = isArray && prototypeOf !== null ? Object.getPrototypeOf(prototypeOf) : prototypeOf;
  if (
    proto === null ||
    Object.getPrototypeOf(proto) !== null ||
    Object.getOwnPropertySymbols(value).length > 0
  )
    return value;
  if (depth < 0) {
    let placeholder = isArray
      ? value.length > 0
        ? [undefined]
        : []
      : Object.keys(value).length > 0
        ? {
            _: undefined,
          }
        : {};
    seen.set(value, {
      copy: placeholder,
      depth,
    });
    return placeholder;
  }
  if (isArray) {
    let length = Number.isSafeInteger(value.length) ? value.length : 0;
    let slots = [];
    for (let idx = 0; idx < Math.min(length, MAX_ARRAY_LENGTH); idx++) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(value, idx);
      if (ownPropertyDescriptor === undefined) continue;
      if (!("value" in ownPropertyDescriptor)) return value;
      slots.push([idx, ownPropertyDescriptor]);
    }
    let list = [];
    seen.set(value, {
      copy: list,
      depth,
    });
    for (let [index, descriptor] of slots)
      list[index] = cloneDeepForDisplay(descriptor.value, depth - 1, seen, cap);
    list.length = length;
    return list;
  }
  let props = [];
  for (let key of Object.keys(value)) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(value, key);
    if (ownPropertyDescriptor === undefined || !("value" in ownPropertyDescriptor)) return value;
    props.push([key, ownPropertyDescriptor]);
  }
  let copy = {};
  seen.set(value, {
    copy,
    depth,
  });
  for (let [key, descriptor] of props)
    Object.defineProperty(copy, key, {
      value: cloneDeepForDisplay(descriptor.value, depth - 1, seen, cap),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return copy;
}
export { stripUndefinedProps, formatResultValue, formatFlatObject, RESULT_LIMITS };
