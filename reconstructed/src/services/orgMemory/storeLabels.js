/**
 * services/orgMemory/storeLabels.ts
 *
 * 记忆库范围标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (4)
 * attribution: placement 4
 */
import { rv, classifyStorePath } from "./orgMemoryDecision.js";
import { Qpe } from "../memorySync/availability.js";
import { count } from "../../utils/collections.js";

//@ chunk-82kqcve8.js:74473-74551 placement
function ka(e) {
  let n = rv(e.path).split("/").at(-1) ?? "";
  return n === "" ? e.mount : n;
}
/**
 * 生成记忆存储的作用域标签，同名的按出现顺序加 #序号。
 */
//@ chunk-82kqcve8.js:74551-74696 placement
function getStoreScopeLabel(e) {
  let n = Qpe(),
    index = n.findIndex((w) => w.path === e.path),
    s = index < 0 ? [] : n.slice(0, index),
    h = ka(e),
    y = count(s, (w) => ka(w) === h);
  return y === 0 ? h : `${h}#${y + 1}`;
}
/**
 * 把分组根路径排在前面，其余保持原顺序。
 */
//@ chunk-82kqcve8.js:74696-74816 placement
function sortRootFirst(e) {
  return [
    ...e.filter((n) => classifyStorePath(n.path) === "grouping_root"),
    ...e.filter((n) => classifyStorePath(n.path) !== "grouping_root"),
  ];
}
//@ chunk-82kqcve8.js:74816-74945 placement
function describeStoreScope(e) {
  return classifyStorePath(e.path) === "grouping_root"
    ? "organization-wide store shared by every connected project"
    : "project store";
}

export { getStoreScopeLabel, sortRootFirst, describeStoreScope };
