/**
 * services/orgMemory/storeLabels.ts
 *
 * 记忆库范围标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (4)
 * attribution: placement 4
 */
import { stripTrailingSlashes, classifyStorePath } from "./orgMemoryDecision.js";
import { readableOrgMemoryStores } from "../memorySync/availability.js";
import { countWhere } from "../../utils/collections.js";

//@ chunk-a2q0x549.js:75641-75719 placement
/**
 * 取记忆存储的标签（路径末段或挂载名）。
 */
function storeLabel(store) {
  let lastSegment = stripTrailingSlashes(store.path).split("/").at(-1) ?? "";
  return lastSegment === "" ? store.mount : lastSegment;
}
//@ chunk-a2q0x549.js:75719-75864 placement
/**
 * 生成记忆存储的作用域标签，同名的按出现顺序加 #序号。
 */
function getStoreScopeLabel(store) {
  let stores = readableOrgMemoryStores();
  let index = stores.findIndex((candidate) => candidate.path === store.path);
  let precedingStores = index < 0 ? [] : stores.slice(0, index);
  let label = storeLabel(store);
  let duplicateCount = countWhere(precedingStores, (store) => storeLabel(store) === label);
  return duplicateCount === 0 ? label : `${label}#${duplicateCount + 1}`;
}
//@ chunk-a2q0x549.js:75864-75984 placement
/**
 * 把分组根路径排在前面，其余保持原顺序。
 */
function sortRootFirst(stores) {
  return [
    ...stores.filter((store) => classifyStorePath(store.path) === "grouping_root"),
    ...stores.filter((store) => classifyStorePath(store.path) !== "grouping_root"),
  ];
}
//@ chunk-a2q0x549.js:75984-76113 placement
function describeStoreScope(store) {
  return classifyStorePath(store.path) === "grouping_root"
    ? "organization-wide store shared by every connected project"
    : "project store";
}
export { getStoreScopeLabel, sortRootFirst, describeStoreScope };
