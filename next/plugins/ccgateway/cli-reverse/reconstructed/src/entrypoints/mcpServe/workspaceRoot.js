/**
 * entrypoints/mcpServe/workspaceRoot.ts
 *
 * 2.1.316 新增：读取 mcp serve 工作区根目录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e2zrm095.js (2)
 * attribution: placement 2
 */
import { posix, resolve } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_REGISTER_DIRECTORY_CHARS } from "../../services/repoRoots/registerRepoRootTool.js";
import { toolServerEnvAccessor } from "../../utils/subprocessEnvLoader.js";
import {
  resolveRepoRootCandidate,
  registerRepoRootErrorClass,
  checkRepoRootScope,
} from "../../services/repoRoots/registerRepoRoot.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { getStageFileRoot } from "../../utils/stageFileRoots.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import { walkPermissionCheckPathsAsync } from "../../utils/fsOperations.js";
import { pathInWorkingPath } from "../../utils/permissions/filesystem.js";

//@ chunk-e2zrm095.js:13233-13307 placement
var AbsolutePathSchema = DoctorLazy(() =>
  stringSchema().max(MAX_REGISTER_DIRECTORY_CHARS).refine(posix.isAbsolute, "must be an absolute path"),
);
//@ chunk-e2zrm095.js:13307-13979 placement
/**
 * 读取并清除 CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT，校验为绝对路径且不是私有目录。
 */
async function readServeWorkspaceRoot() {
  let CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT = toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT;
  toolServerEnvAccessor.unset("CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT");
  if (CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT === undefined)
    return {
      kind: "absent",
    };
  if (!AbsolutePathSchema().safeParse(CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT).success)
    return {
      kind: "invalid",
      fault: "bad_path",
    };
  let realRoot;
  let stageRoot;
  try {
    realRoot = await resolveRepoRootCandidate(
      CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT,
      getEmptyToolPermissionContext,
    );
    stageRoot = getStageFileRoot();
  } catch (error) {
    return {
      kind: "invalid",
      fault: registerRepoRootErrorClass(error) ?? "error",
    };
  }
  let root = resolve(CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT);
  let scope = checkRepoRootScope(root, getOriginalCwd(), [], []);
  if (scope.allowed || scope.code === "is_cwd")
    return {
      kind: "absent",
    };
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  let any = (
    await Promise.all(
      (claudeConfigDirOrNull === null ? [] : [claudeConfigDirOrNull, stageRoot]).map((dir) =>
        walkPermissionCheckPathsAsync(dir),
      ),
    )
  ).some(
    (result) =>
      result.unresolved ||
      result.spellings.some((spelling) =>
        [root, realRoot].some(
          (spelling_2) =>
            pathInWorkingPath(spelling, spelling_2, {
              caseFold: true,
            }) ||
            pathInWorkingPath(spelling_2, spelling, {
              caseFold: true,
            }),
        ),
      ),
  );
  if (claudeConfigDirOrNull === null || any)
    return {
      kind: "invalid",
      fault: "private_folder",
    };
  return {
    kind: "valid",
    root,
    real: realRoot,
  };
}
export { readServeWorkspaceRoot };
