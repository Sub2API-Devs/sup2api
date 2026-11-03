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
import { u, o, Ue, T } from "../../../vendor/zod/v4/classic/schemas.js";
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
var REGISTERREPOROOT = "RegisterRepoRoot",
  x = 32,
  Tfo = 4096,
  _ = DoctorLazy(() => u({ directory: o().max(Tfo), askedBy: o().min(1).max(64).optional() })),
  C = new HostScoped(() => new Map()),
  B = DoctorLazy(() =>
    Ue([
      u({ directory: o().min(1).max(4096), alreadyTaken: T(!0).optional() }),
      u({ refusal: o().min(1).max(64) }),
    ]),
  );
/**
 * RegisterRepoRoot 工具的调用：在工作区根下注册文件夹。
 */
//@ chunk-0k2xkafk.js:862-2022 placement
async function callRegisterRepoRoot(s, f, a) {
  let { directory: directory, askedBy: askedBy } = _().parse(s),
    toolUseContext = a.toolUseContext(),
    { workspaceRoot: workspaceRoot = { kind: "absent" } } = a,
    e;
  try {
    e = await registerRepoRoot(
      directory,
      () => ({
        ...getToolPermissionContext(toolUseContext),
        additionalWorkingDirectories: new Map(
          workspaceRoot.kind === "valid"
            ? [[workspaceRoot.root, { path: workspaceRoot.root, source: "cliArg" }]]
            : [],
        ),
      }),
      getOriginalCwd(),
    );
  } catch (error) {
    let l = registerRepoRootErrorClass(error);
    if (l === void 0) throw error;
    if (l === "outside_scope") {
      let h =
        workspaceRoot.kind === "valid"
          ? "the folder is not below the workspace root"
          : workspaceRoot.kind === "invalid"
            ? `the workspace root is invalid: ${workspaceRoot.fault}`
            : "no workspace root";
      logForDebugging(`${REGISTERREPOROOT}: outside_scope: ${h}`, { level: "warn" });
    }
    return R(l);
  }
  if (
    workspaceRoot.kind === "valid" &&
    !checkRepoRootScope(e, getOriginalCwd(), [], []).allowed &&
    relative(workspaceRoot.real, e)
      .split(sep)
      .some((i) => i === "" || i.startsWith("."))
  )
    return (
      logForDebugging(
        `${REGISTERREPOROOT}: outside_scope: the folder is not strictly below where the workspace root led at the daemon's start, or a folder on the way has a name that starts with a dot`,
        { level: "warn" },
      ),
      R("outside_scope")
    );
  f.throwIfAborted();
  let d = getAdditionalDirectoriesForClaudeMd(),
    of = C.of(a.session.host),
    included = d.includes(e);
  if (!included) {
    if (d.length >= x) return R("too_many");
    if ((setAdditionalDirectoriesForClaudeMd([...d, e]), askedBy !== void 0)) of.set(e, askedBy);
    (pinResolvedWorkingDirPath(e), SandboxManager.refreshConfig());
  }
  return (
    await reloadSkillsAfterDirectoryChange(),
    {
      summary: "folder registered",
      output: {
        directory: e,
        ...(included && (askedBy === void 0 || of.get(e) !== askedBy) && { alreadyTaken: !0 }),
      },
    }
  );
}
//@ chunk-0k2xkafk.js:2022-2101 placement
function R(s) {
  return { summary: `folder not registered: ${s}`, output: { refusal: s } };
}

export { Tfo, REGISTERREPOROOT, callRegisterRepoRoot };
