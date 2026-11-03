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
import { stripTrailingSlashes, classifyStorePath } from "./orgMemoryDecision.js";
import { readableOrgMemoryStores } from "../memorySync/availability.js";
import { count } from "../../utils/collections.js";

//@ chunk-82kqcve8.js:74473-74551 placement
/**
 * 取记忆存储的标签（路径末段或挂载名）。
 */
function storeLabel(e) {
  let n = stripTrailingSlashes(e.path).split("/").at(-1) ?? "";
  return n === "" ? e.mount : n;
}
//@ chunk-82kqcve8.js:74551-74696 placement
/**
 * 生成记忆存储的作用域标签，同名的按出现顺序加 #序号。
 */
function getStoreScopeLabel(e) {
  let n = readableOrgMemoryStores();
  let index = n.findIndex((w) => w.path === e.path);
  let s = index < 0 ? [] : n.slice(0, index);
  let h = storeLabel(e);
  let y = count(s, (w) => storeLabel(w) === h);
  return y === 0 ? h : `${h}#${y + 1}`;
}
//@ chunk-82kqcve8.js:74696-74816 placement
/**
 * 把分组根路径排在前面，其余保持原顺序。
 */
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
