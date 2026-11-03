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
/**
 * 构造项目读取的输入记录。
 */
function projectReadInput(path, e, r, n) {
  return {
    method: "project_read",
    path,
    ...(e !== undefined && {
      version: e,
    }),
    ...r,
    ...n,
  };
}
//@ chunk-6tqjcxkp.js:322-375 placement
/**
 * 按项目与路径构造读取输入。
 */
function projectReadInputFor(path) {
  return {
    method: "project_read",
    path,
  };
}
//@ chunk-6tqjcxkp.js:375-442 placement
/**
 * 构造项目读取结果记录。
 */
function projectReadRecord({ docId, read }) {
  return {
    input: jsonStringify(projectReadInputFor(docId)),
    result: jsonStringify(read),
  };
}
export { projectReadInputFor, projectReadRecord, projectReadInput };
