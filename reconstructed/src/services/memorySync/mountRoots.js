/**
 * services/memorySync/mountRoots.ts
 *
 * 2.1.316 新增：计算记忆库挂载根：用户记忆对应项目键，团队记忆对应项目键加相对路径，账号记忆无。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (3)
 * attribution: placement 3
 */
import { projectKeyFromMemoryDir, projectsRelativeParts } from "../../memdir/teamMemPrompts.js";
import { isTeamSubscriber_2 } from "../../utils/auth.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";

//@ chunk-82kqcve8.js:125363-125573 placement
/**
 * 计算记忆库挂载根：用户记忆对应项目键，团队记忆对应项目键加相对路径，账号记忆无。
 */
function memoryStoreMountRoot(scope, dir) {
  if (scope === "account") return;
  if (scope === "user") {
    let s = projectKeyFromMemoryDir(dir);
    return s === undefined
      ? undefined
      : {
          projectKey: s,
          baseRelPath: [],
        };
  }
  let teamMemoryDir = parseTeamMemoryDir(dir);
  return teamMemoryDir === undefined
    ? undefined
    : {
        projectKey: teamMemoryDir.projectKey,
        baseRelPath: teamMemoryDir.relPath,
      };
}
//@ chunk-82kqcve8.js:125790-125913 placement
/**
 * 由挂载根生成记忆存储的作用域。
 */
function memoryMountScope(base) {
  return {
    namespace: "memory",
    projectKey: base.projectKey,
    ...(base.baseRelPath.length > 0 && {
      relPath: [...base.baseRelPath],
    }),
  };
}
//@ chunk-82kqcve8.js:126057-126214 placement
/**
 * 解析团队记忆目录路径，得到项目键与相对路径。
 */
function parseTeamMemoryDir(e) {
  let n = projectsRelativeParts(e);
  if (n?.length !== 4 || n[1] !== "memory" || n[2] !== isTeamSubscriber_2) return;
  let r = n[0];
  let s = n[3];
  return isValidKeySegment(r) && isValidKeySegment(s)
    ? {
        projectKey: r,
        relPath: [isTeamSubscriber_2, s],
      }
    : undefined;
}
export { memoryStoreMountRoot, memoryMountScope, parseTeamMemoryDir };
