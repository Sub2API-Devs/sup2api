/**
 * services/repoRoots/registerRepoRootTool.ts
 *
 * 2.1.316 新增：RegisterRepoRoot 工具的调用：在工作区根下注册文件夹。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0k2xkafk.js (3)
 * attribution: placement 3
 */
import { relative, sep } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, union, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { registerRepoRoot, registerRepoRootErrorClass, checkRepoRootScope } from "./registerRepoRoot.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  getOriginalCwd,
  getAdditionalDirectoriesForClaudeMd,
  setAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { pinResolvedWorkingDirPath } from "../../utils/permissions/filesystem.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { reloadSkillsAfterDirectoryChange } from "../../utils/skills/skillChangeDetector.js";

//@ chunk-0k2xkafk.js:612-862 placement
/**
 * 注册仓库根工具的限制、宿主槽与结果 schema。
 */
var REGISTERREPOROOT = "RegisterRepoRoot";
var MAX_ASKED_BY_CHARS = 32;
var MAX_REGISTER_DIRECTORY_CHARS = 4096;
var _ = DoctorLazy(() =>
  u({
    directory: string().max(MAX_REGISTER_DIRECTORY_CHARS),
    askedBy: string().min(1).max(64).optional(),
  }),
);
var registerRepoRootSlots = new HostScoped(() => new Map());
var registerRepoRootResultSchema = DoctorLazy(() =>
  union([
    u({
      directory: string().min(1).max(4096),
      alreadyTaken: literal(true).optional(),
    }),
    u({
      refusal: string().min(1).max(64),
    }),
  ]),
);
//@ chunk-0k2xkafk.js:862-2022 placement
/**
 * RegisterRepoRoot 工具的调用：在工作区根下注册文件夹。
 */
async function callRegisterRepoRoot(s, f, a) {
  let { directory, askedBy } = _().parse(s);
  let y = a.toolUseContext();
  let {
    workspaceRoot = {
      kind: "absent",
    },
  } = a;
  let e;
  try {
    e = await registerRepoRoot(
      directory,
      () => ({
        ...getToolPermissionContext(y),
        additionalWorkingDirectories: new Map(
          workspaceRoot.kind === "valid"
            ? [
                [
                  workspaceRoot.root,
                  {
                    path: workspaceRoot.root,
                    source: "cliArg",
                  },
                ],
              ]
            : [],
        ),
      }),
      getOriginalCwd(),
    );
  } catch (error) {
    let l = registerRepoRootErrorClass(error);
    if (l === undefined) throw error;
    if (l === "outside_scope") {
      let h =
        workspaceRoot.kind === "valid"
          ? "the folder is not below the workspace root"
          : workspaceRoot.kind === "invalid"
            ? `the workspace root is invalid: ${workspaceRoot.fault}`
            : "no workspace root";
      logForDebugging(`${REGISTERREPOROOT}: outside_scope: ${h}`, {
        level: "warn",
      });
    }
    return refusalResult(l);
  }
  if (
    workspaceRoot.kind === "valid" &&
    !checkRepoRootScope(e, getOriginalCwd(), [], []).allowed &&
    relative(workspaceRoot.real, e)
      .split(sep)
      .some((i) => i === "" || i.startsWith("."))
  ) {
    logForDebugging(
      `${REGISTERREPOROOT}: outside_scope: the folder is not strictly below where the workspace root led at the daemon's start, or a folder on the way has a name that starts with a dot`,
      {
        level: "warn",
      },
    );
    return refusalResult("outside_scope");
  }
  f.throwIfAborted();
  let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
  let c = registerRepoRootSlots.of(a.session.host);
  let included = additionalDirectoriesForClaudeMd.includes(e);
  if (!included) {
    if (additionalDirectoriesForClaudeMd.length >= MAX_ASKED_BY_CHARS) return refusalResult("too_many");
    setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, e]);
    if (askedBy !== undefined) c.set(e, askedBy);
    pinResolvedWorkingDirPath(e);
    SandboxManager.refreshConfig();
  }
  await reloadSkillsAfterDirectoryChange();
  return {
    summary: "folder registered",
    output: {
      directory: e,
      ...(included &&
        (askedBy === undefined || c.get(e) !== askedBy) && {
          alreadyTaken: true,
        }),
    },
  };
}
//@ chunk-0k2xkafk.js:2022-2101 placement
function refusalResult(s) {
  return {
    summary: `folder not registered: ${s}`,
    output: {
      refusal: s,
    },
  };
}
export { MAX_REGISTER_DIRECTORY_CHARS, REGISTERREPOROOT, callRegisterRepoRoot };
