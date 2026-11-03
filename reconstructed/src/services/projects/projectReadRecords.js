/**
 * services/projects/projectReadRecords.ts
 *
 * 2.1.316 新增：Projects 文档读取（project_read）的工具输入/结果记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6tqjcxkp.js (3)
 * attribution: placement 3
 */
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-6tqjcxkp.js:226-322 placement
function tbn(t, e, r, n) {
  return { method: "project_read", path: t, ...(e !== void 0 && { version: e }), ...r, ...n };
}
//@ chunk-6tqjcxkp.js:322-375 placement
function dYo(t) {
  return { method: "project_read", path: t };
}
//@ chunk-6tqjcxkp.js:375-442 placement
function enr({ docId: docId, read: read }) {
  return { input: jsonStringify(dYo(docId)), result: jsonStringify(read) };
}

export { dYo, enr, tbn };
