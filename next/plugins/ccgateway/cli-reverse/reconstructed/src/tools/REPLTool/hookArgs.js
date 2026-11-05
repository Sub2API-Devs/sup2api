/**
 * tools/REPLTool/hookArgs.ts
 *
 * 检查内层调用参数能否安全交给插件 hook（深度/规模上限）（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { clone } from "../../utils/slowOperations.js";

//@ chunk-n51jggtb.js:87913-87932 placement
/**
 * hook 参数规模阈值（1000 层 / 1e5 个值）。
 */
var MAX_CLONE_DEPTH = 1000;
var MAX_CLONE_VALUES = 1e5;
//@ chunk-n51jggtb.js:87932-88498 placement
/**
 * 参数对 hook 过深过大时的说明；否则试拷贝一次。
 */
function checkCloneableForHooks(tool, args) {
  if (cloneTooDeepOrLarge(args))
    return `${tool.name} was not called, because its arguments are too deep or too large for the plugin hooks that check this tool's calls: they are nested more than ${MAX_CLONE_DEPTH} levels deep, have more than ${MAX_CLONE_VALUES} values, or contain themselves. Pass a smaller, flatter value, or split it over several calls.`;
  try {
    clone(args);
    return;
  } catch {
    return `${tool.name} was not called, because one of its arguments (a symbol, for example) can't be copied to the plugin hooks that check this tool's calls. Pass only strings, numbers, booleans, null, arrays and plain objects.`;
  }
}
//@ chunk-n51jggtb.js:88498-88790 placement
/**
 * 迭代检查参数深度与值个数是否超限。
 */
function cloneTooDeepOrLarge(value) {
  let frames = [];
  let nodeCount = 1;
  let pushFrame = (object) => {
    let values = Object.values(object);
    nodeCount += values.length;
    frames.push({
      inner: values,
      next: 0,
    });
  };
  pushFrame(value);
  for (let frame = frames.at(-1); frame !== undefined; frame = frames.at(-1)) {
    if (nodeCount > MAX_CLONE_VALUES || frames.length > MAX_CLONE_DEPTH + 1) return true;
    if (frame.next === frame.inner.length) {
      frames.pop();
      continue;
    }
    let value = frame.inner[frame.next++];
    if (value !== null && typeof value === "object") pushFrame(value);
  }
  return false;
}
export { checkCloneableForHooks };
