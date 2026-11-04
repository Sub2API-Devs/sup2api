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
import { objectSchema, stringSchema, union, literal } from "../../../vendor/zod/v4/classic/schemas.js";
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
  objectSchema({
    directory: stringSchema().max(MAX_REGISTER_DIRECTORY_CHARS),
    askedBy: stringSchema().min(1).max(64).optional(),
  }),
);
var registerRepoRootSlots = new HostScoped(() => new Map());
var registerRepoRootResultSchema = DoctorLazy(() =>
  union([
    objectSchema({
      directory: stringSchema().min(1).max(4096),
      alreadyTaken: literal(true).optional(),
    }),
    objectSchema({
      refusal: stringSchema().min(1).max(64),
    }),
  ]),
);
//@ chunk-0k2xkafk.js:862-2022 placement
/**
 * RegisterRepoRoot 工具的调用：在工作区根下注册文件夹。
 */
async function callRegisterRepoRoot(input, abortSignal, context) {
  let { directory, askedBy } = _().parse(input);
  let toolContext = context.toolUseContext();
  let {
    workspaceRoot = {
      kind: "absent",
    },
  } = context;
  let repoRoot;
  try {
    repoRoot = await registerRepoRoot(
      directory,
      () => ({
        ...getToolPermissionContext(toolContext),
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
    let errorCode = registerRepoRootErrorClass(error);
    if (errorCode === undefined) throw error;
    if (errorCode === "outside_scope") {
      let outsideScopeDetail =
        workspaceRoot.kind === "valid"
          ? "the folder is not below the workspace root"
          : workspaceRoot.kind === "invalid"
            ? `the workspace root is invalid: ${workspaceRoot.fault}`
            : "no workspace root";
      logForDebugging(`${REGISTERREPOROOT}: outside_scope: ${outsideScopeDetail}`, {
        level: "warn",
      });
    }
    return refusalResult(errorCode);
  }
  if (
    workspaceRoot.kind === "valid" &&
    !checkRepoRootScope(repoRoot, getOriginalCwd(), [], []).allowed &&
    relative(workspaceRoot.real, repoRoot)
      .split(sep)
      .some((segment) => segment === "" || segment.startsWith("."))
  ) {
    logForDebugging(
      `${REGISTERREPOROOT}: outside_scope: the folder is not strictly below where the workspace root led at the daemon's start, or a folder on the way has a name that starts with a dot`,
      {
        level: "warn",
      },
    );
    return refusalResult("outside_scope");
  }
  abortSignal.throwIfAborted();
  let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
  let askedBySlots = registerRepoRootSlots.of(context.session.host);
  let included = additionalDirectoriesForClaudeMd.includes(repoRoot);
  if (!included) {
    if (additionalDirectoriesForClaudeMd.length >= MAX_ASKED_BY_CHARS) return refusalResult("too_many");
    setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, repoRoot]);
    if (askedBy !== undefined) askedBySlots.set(repoRoot, askedBy);
    pinResolvedWorkingDirPath(repoRoot);
    SandboxManager.refreshConfig();
  }
  await reloadSkillsAfterDirectoryChange();
  return {
    summary: "folder registered",
    output: {
      directory: repoRoot,
      ...(included &&
        (askedBy === undefined || askedBySlots.get(repoRoot) !== askedBy) && {
          alreadyTaken: true,
        }),
    },
  };
}
//@ chunk-0k2xkafk.js:2022-2101 placement
function refusalResult(refusalCode) {
  return {
    summary: `folder not registered: ${refusalCode}`,
    output: {
      refusal: refusalCode,
    },
  };
}
export { MAX_REGISTER_DIRECTORY_CHARS, REGISTERREPOROOT, callRegisterRepoRoot };
