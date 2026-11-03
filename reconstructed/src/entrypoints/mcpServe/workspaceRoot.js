/**
 * entrypoints/mcpServe/workspaceRoot.ts
 *
 * 2.1.316 新增：读取 mcp serve 工作区根目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hegc6e59.js (2)
 * attribution: placement 2
 */
import { posix, resolve } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Tfo } from "../../services/repoRoots/registerRepoRootTool.js";
import { nk } from "../../utils/subprocessEnvLoader.js";
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

//@ chunk-hegc6e59.js:12056-12130 placement
var u = DoctorLazy(() => o().max(Tfo).refine(posix.isAbsolute, "must be an absolute path"));
/**
 * 读取并清除 CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT，校验为绝对路径且不是私有目录。
 */
//@ chunk-hegc6e59.js:12130-12801 placement
async function readServeWorkspaceRoot() {
  let CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT = nk.CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT;
  if ((nk.unset("CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT"), CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT === void 0))
    return { kind: "absent" };
  if (!u().safeParse(CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT).success)
    return { kind: "invalid", fault: "bad_path" };
  let t, n;
  try {
    ((t = await resolveRepoRootCandidate(
      CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT,
      getEmptyToolPermissionContext,
    )),
      (n = getStageFileRoot()));
  } catch (error) {
    return { kind: "invalid", fault: registerRepoRootErrorClass(error) ?? "error" };
  }
  let a = resolve(CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT),
    s = checkRepoRootScope(a, getOriginalCwd(), [], []);
  if (s.allowed || s.code === "is_cwd") return { kind: "absent" };
  let i = getClaudeConfigDirOrNull(),
    any = (await Promise.all((i === null ? [] : [i, n]).map((e) => walkPermissionCheckPathsAsync(e)))).some(
      (e) =>
        e.unresolved ||
        e.spellings.some((spelling) =>
          [a, t].some(
            (d) =>
              pathInWorkingPath(spelling, d, { caseFold: !0 }) ||
              pathInWorkingPath(d, spelling, { caseFold: !0 }),
          ),
        ),
    );
  if (i === null || any) return { kind: "invalid", fault: "private_folder" };
  return { kind: "valid", root: a, real: t };
}
