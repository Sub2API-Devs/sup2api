/**
 * services/memorySync/mountRoots.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (3)
 * attribution: placement 3
 */
import { projectKeyFromMemoryDir, projectsRelativeParts } from "../../memdir/teamMemPrompts.js";
import { isTeamSubscriber_2 } from "../../utils/auth.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";

/**
 * 计算记忆库挂载根：用户记忆对应项目键，团队记忆对应项目键加相对路径，账号记忆无。
 */
//@ chunk-82kqcve8.js:125363-125573 placement
function memoryStoreMountRoot(scope, dir) {
  if (scope === "account") return;
  if (scope === "user") {
    let s = projectKeyFromMemoryDir(dir);
    return s === void 0 ? void 0 : { projectKey: s, baseRelPath: [] };
  }
  let r = parseTeamMemoryDir(dir);
  return r === void 0 ? void 0 : { projectKey: r.projectKey, baseRelPath: r.relPath };
}
/**
 * 由挂载根生成记忆存储的作用域。
 */
//@ chunk-82kqcve8.js:125790-125913 placement
function memoryMountScope(e) {
  return {
    namespace: "memory",
    projectKey: e.projectKey,
    ...(e.baseRelPath.length > 0 && { relPath: [...e.baseRelPath] }),
  };
}
/**
 * 解析团队记忆目录路径，得到项目键与相对路径。
 */
//@ chunk-82kqcve8.js:126057-126214 placement
function parseTeamMemoryDir(e) {
  let n = projectsRelativeParts(e);
  if (n?.length !== 4 || n[1] !== "memory" || n[2] !== isTeamSubscriber_2) return;
  let r = n[0],
    s = n[3];
  return isValidKeySegment(r) && isValidKeySegment(s)
    ? { projectKey: r, relPath: [isTeamSubscriber_2, s] }
    : void 0;
}

export { memoryStoreMountRoot, memoryMountScope, parseTeamMemoryDir };
