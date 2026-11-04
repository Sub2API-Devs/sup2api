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
import { TEAM_MEMORY_SCOPE } from "../../utils/auth.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";

//@ chunk-82kqcve8.js:125363-125573 placement
/**
 * 计算记忆库挂载根：用户记忆对应项目键，团队记忆对应项目键加相对路径，账号记忆无。
 */
function memoryStoreMountRoot(scope, dir) {
  if (scope === "account") return;
  if (scope === "user") {
    let projectKey = projectKeyFromMemoryDir(dir);
    return projectKey === undefined
      ? undefined
      : {
          projectKey,
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
function parseTeamMemoryDir(dir) {
  let parts = projectsRelativeParts(dir);
  if (parts?.length !== 4 || parts[1] !== "memory" || parts[2] !== TEAM_MEMORY_SCOPE) return;
  let projectKey = parts[0];
  let mountName = parts[3];
  return isValidKeySegment(projectKey) && isValidKeySegment(mountName)
    ? {
        projectKey,
        relPath: [TEAM_MEMORY_SCOPE, mountName],
      }
    : undefined;
}
export { memoryStoreMountRoot, memoryMountScope, parseTeamMemoryDir };
