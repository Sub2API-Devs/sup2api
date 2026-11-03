/**
 * tools/EnterWorktreeTool/EnterWorktreeTool.ts
 *
 * EnterWorktree 工具：新建或进入 git worktree 并把会话（或子代理）工作目录切过去；含 zod custom() 误归代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/EnterWorktreeTool/EnterWorktreeTool.ts
 * pieces: chunk-kxyd0g16.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { sep, resolve } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  validateWorktreeSlug,
  getCurrentWorktreeSession,
  resolveManagedWorktreePath,
  WorktreeIsolationError,
  resolveExistingWorktreeTarget,
  enterExistingWorktreeForSession,
  isPathUnderManagedWorktreesDir,
  createWorktreeForSession,
} from "../../utils/worktree.js";
import { errorMessage } from "../../utils/errors.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { ENTER_WORKTREE_TOOL_NAME } from "./constants.js";
import { enterWorktreePrompt } from "./prompt.js";
import { hasOutermostCallFrame, getCwd } from "../../utils/cwd.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { hasHostWorktreeDeclaration, checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { printableNameOrPlaceholder } from "../../utils/printableName.js";
import { setCwd, registerSandboxWriteDirectory } from "../../utils/Shell.js";
import { getSessionId, setOriginalCwd } from "../../bootstrap/state.js";
import {
  updateAgentMetadata,
  relocateSessionTranscript,
  reportRelocateSessionTranscriptFailure,
  saveWorktreeState,
} from "../../utils/sessionStorage.js";
import { logForDebugging } from "../../utils/debug.js";
import { describeStorageError as describeStorageError_2 } from "../../utils/agentMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { processChdir } from "../../utils/fsOperations.js";
import { getPlanSlug, getPlansDirectory, primePlanSlugCollisions } from "../../utils/plans.js";
import { reanchorGitFileWatcher } from "../../utils/git/gitFilesystem.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { resetEnvironmentCaches } from "../../utils/contextAttachments/environment.js";
import { clearMemoryFilesCache } from "../../components/Message.js";

//@ chunk-kxyd0g16.js:120658-120763 sole-consumer
var UNSAFE_DISPLAY_CHARS_REGEX =
  /[\p{Cc}\p{Cf}\p{Cn}\p{Co}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu;
//@ chunk-kxyd0g16.js:120763-120808 affinity
/**
 * 把控制字符、不可见字符、私用区、非普通空白等替换为 U+FFFD，用于安全显示路径。
 */
function sanitizeForDisplay(e) {
  return e.replace(UNSAFE_DISPLAY_CHARS_REGEX, "\uFFFD");
}
//@ chunk-kxyd0g16.js:120808-126914 fingerprint = EnterWorktreeTool (0.302)
/**
 * EnterWorktree 工具（shouldDefer，未声明 isEnabled）。输入 name（新建，按段校验，≤64）或 path（进入现有 worktree），二者互斥。validateInput：被固定 cwd 的子代理只能用 path；已在 worktree 会话中只能用 path 切换。checkPermissions：新建直接允许；path 在 .claude/worktrees 管理位置内直接允许，否则以 safetyCheck 询问（会迁移工作目录、写权限和项目配置来源，classifier 不可代批）。call：子代理场景只切换该代理 cwd 并返回 working_directory contextLayer；主会话新建/进入 worktree（git 或配置的 hooks），切 cwd、originalCwd，保存 worktree 状态并清缓存，消息区分 Created/Reused/Resumed/Entered。 EnterWorktree 输入 schema（name/path 互斥）与输出 schema（worktreePath/worktreeBranch/message）。
 */
var QUOTE_LIKE_CHARS_REGEX =
  /["\u201C\u201D\u201F\u2033\u2036\uFF02\u301D\u301E\u301F\u02BA\u02EE\u02DD\u05F4]/g;
var enterWorktreeInputSchema = DoctorLazy(() =>
  zodStrictObject({
    name: string()
      .superRefine((e, ctx) => {
        try {
          validateWorktreeSlug(e);
        } catch (e) {
          ctx.addIssue({
            code: "custom",
            message: errorMessage(e),
          });
        }
      })
      .optional()
      .describe(
        'Optional name for a new worktree. Each "/"-separated segment may contain only letters, digits, dots, underscores, and dashes; max 64 chars total. A random name is generated if not provided. Mutually exclusive with `path`.',
      ),
    path: string()
      .optional()
      .describe(
        "Path to an existing worktree to switch into instead of creating a new one. Must appear in `git worktree list` for the current repo \u2014 or, on first entry from the launch directory, for a repo nested inside it (multi-repo workspace). Mutually exclusive with `name`.",
      ),
  }).refine((e) => !(e.name && e.path), {
    message: "Provide at most one of `name` or `path`, not both.",
  }),
);
var enterWorktreeOutputSchema = DoctorLazy(() =>
  u({
    worktreePath: string(),
    worktreeBranch: string().optional(),
    message: string(),
  }),
);
var EnterWorktreeTool = buildTool({
  name: ENTER_WORKTREE_TOOL_NAME,
  searchHint: "create an isolated git worktree and switch into it",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return "Creates an isolated worktree (via git or configured hooks) and switches the session into it";
  },
  async prompt() {
    return enterWorktreePrompt();
  },
  get inputSchema() {
    return enterWorktreeInputSchema();
  },
  get outputSchema() {
    return enterWorktreeOutputSchema();
  },
  userFacingName(e) {
    return e?.path ? "Entering worktree" : "Creating worktree";
  },
  shouldDefer: true,
  toAutoClassifierInput(e) {
    return e.path ?? e.name ?? "";
  },
  renderToolUseMessage({ name: e, path }) {
    return (path !== undefined ? sanitizeForDisplay(path) : null) ?? e ?? "";
  },
  create(e) {
    return {
      async validateInput(r) {
        if (hasOutermostCallFrame()) {
          if (r.path)
            return {
              result: true,
            };
          let cwd = getCwd();
          let canonicalGitRoot = findCanonicalGitRoot(cwd);
          return {
            result: false,
            message:
              `EnterWorktree cannot create a worktree from a subagent with a cwd override (isolation: "worktree" or explicit cwd) \u2014 it would mutate the parent session's process-wide working directory. ` +
              (canonicalGitRoot != null && cwd !== canonicalGitRoot && cwd.startsWith(canonicalGitRoot + sep)
                ? "To switch this agent into an existing worktree managed by Claude Code (under .claude/worktrees/ of this repository), call EnterWorktree with `path`. To work in any other directory, spawn an Agent with `cwd` set to it."
                : "To work in a different directory (including a worktree), spawn an Agent with `cwd` set to it."),
            errorCode: 1,
          };
        }
        if (getCurrentWorktreeSession() && !r.path)
          return {
            result: false,
            message:
              "Already in a worktree session. Pass `path` to switch into another existing worktree, or use ExitWorktree to leave this one before creating a new worktree.",
            errorCode: 2,
          };
        return {
          result: true,
        };
      },
      async checkPermissions(r) {
        if (!r.path)
          return {
            behavior: "allow",
            updatedInput: r,
          };
        let managedWorktreePath = await resolveManagedWorktreePath(r.path);
        if (managedWorktreePath?.managed)
          return {
            behavior: "allow",
            updatedInput: {
              ...r,
              path: managedWorktreePath.targetReal,
            },
          };
        let s = resolve(getCwd(), r.path);
        let f = (S) => sanitizeForDisplay(S).replace(QUOTE_LIKE_CHARS_REGEX, "\uFFFD");
        let h = f(s);
        let y = managedWorktreePath ? f(managedWorktreePath.targetReal) : null;
        let k =
          h !== s || (managedWorktreePath && y !== managedWorktreePath.targetReal)
            ? " (path sanitized for display)"
            : "";
        let w = y !== null && y.normalize("NFC") !== h.normalize("NFC") ? ` (resolves to "${y}")` : "";
        return {
          behavior: "ask",
          message: `Enter the worktree at "${h}"${w}${k}? This moves the session's working directory and write access there, and loads project configuration (CLAUDE.md, settings) from that location.`,
          updatedInput: {
            ...r,
            path: s,
          },
          decisionReason: {
            type: "safetyCheck",
            reason: `permission-root relocation to "${h}"${w}${k} \u2014 a model-supplied worktree outside .claude/worktrees/`,
            classifierApprovable: false,
          },
          localDisplayOnly: true,
        };
      },
      async call(r) {
        if (hasOutermostCallFrame()) {
          if (!r.path)
            throw new WorktreeIsolationError(
              "EnterWorktree from a session with a pinned working directory requires `path`.",
            );
          let existingWorktreeTarget = await resolveExistingWorktreeTarget(r.path, {
            requireManagedLocation: true,
            requireCwdInsideRepo: true,
          });
          let R = hasHostWorktreeDeclaration()
            ? null
            : checkWorktreeIsolation_2(existingWorktreeTarget.worktreePath, {
                agentId: e.agentId,
                agentWorktree: e.agentWorktree,
                session: e.session,
              });
          if (R !== null)
            throw new WorktreeIsolationError(
              `Entering ${printableNameOrPlaceholder(existingWorktreeTarget.worktreePath)} would not give this agent write access there, so the switch was not made. ${R}`,
            );
          setCwd(existingWorktreeTarget.worktreePath, e.session);
          registerSandboxWriteDirectory(existingWorktreeTarget.worktreePath, e.agentId ?? getSessionId());
          if (e.agentId)
            try {
              await updateAgentMetadata(
                e.agentId,
                {
                  cwd: existingWorktreeTarget.worktreePath,
                },
                e.storageV5,
              );
            } catch (error) {
              logForDebugging(
                `Failed to update agent metadata cwd after worktree switch: ${describeStorageError_2(error)}`,
              );
            }
          logEvent("tengu_worktree_entered_existing", {
            mid_session: true,
            cwd_override: true,
          });
          let I = existingWorktreeTarget.worktreeBranch
            ? ` on branch ${printableNameOrPlaceholder(existingWorktreeTarget.worktreeBranch)}`
            : "";
          return {
            data: {
              worktreePath: existingWorktreeTarget.worktreePath,
              worktreeBranch: existingWorktreeTarget.worktreeBranch,
              message: `Entered worktree at ${printableNameOrPlaceholder(existingWorktreeTarget.worktreePath)}${I}. This agent's working directory and write access now point at the worktree; the previous directory was left untouched.`,
            },
            contextLayers: [
              {
                kind: "working_directory",
                directory: existingWorktreeTarget.worktreePath,
              },
            ],
          };
        }
        if (getCurrentWorktreeSession() && !r.path) throw Error("Already in a worktree session");
        let n;
        if (r.path)
          n = await enterExistingWorktreeForSession(
            getSessionId(),
            r.path,
            (await isPathUnderManagedWorktreesDir(resolve(getCwd(), r.path)))
              ? {
                  requireManagedLocation: true,
                  storageV5: e.storageV5,
                }
              : {
                  storageV5: e.storageV5,
                },
          );
        else {
          let cwd = getCwd();
          let canonicalGitRoot = findCanonicalGitRoot(cwd);
          let I = false;
          if (canonicalGitRoot && canonicalGitRoot !== cwd) {
            processChdir(canonicalGitRoot);
            setCwd(canonicalGitRoot, e.session);
            I = true;
          }
          try {
            n = await createWorktreeForSession(getSessionId(), r.name ?? getPlanSlug(), undefined, {
              fromCwd: cwd,
              repoRoot: canonicalGitRoot ?? undefined,
              slugPick: undefined,
              fromHead: undefined,
              storageV5: e.storageV5,
              credentials: e.credentials,
            });
          } catch (error) {
            if (I)
              try {
                processChdir(cwd);
                setCwd(cwd, e.session);
              } catch {
                reanchorGitFileWatcher();
                getReplBridgeHandle()?.refreshGitBranch?.();
              }
            throw error;
          }
        }
        processChdir(n.worktreePath);
        setCwd(n.worktreePath, e.session);
        setOriginalCwd(getCwd());
        if (!n.hookBased && !n.nestedRepoRoot)
          try {
            await relocateSessionTranscript(e.storageV5);
          } catch (error) {
            reportRelocateSessionTranscriptFailure(error, "EnterWorktree");
          }
        registerSandboxWriteDirectory(n.worktreePath, getSessionId());
        saveWorktreeState(n, isStorageV5Enabled() ? e.storageV5 : undefined);
        resetEnvironmentCaches("worktree");
        clearMemoryFilesCache(e.session);
        getPlansDirectory.cache.clear?.();
        primePlanSlugCollisions(e.storageV5);
        reanchorGitFileWatcher();
        getReplBridgeHandle()?.refreshGitBranch?.();
        logEvent(r.path ? "tengu_worktree_entered_existing" : "tengu_worktree_created", {
          mid_session: true,
          ...{},
        });
        let s = n.worktreeBranch ? ` on branch ${printableNameOrPlaceholder(n.worktreeBranch)}` : "";
        let f = r.path
          ? "Entered"
          : n.resetToFreshBase
            ? "Reused"
            : n.resumedExisting
              ? "Resumed"
              : "Created";
        let h = n.resetToFreshBase
          ? " A worktree with this name already existed; its previous work was fully merged upstream, so it was reset to the current base."
          : n.resumedExisting
            ? " A worktree with this name already existed and was resumed as-is \u2014 it may carry an earlier session\u2019s commits. Pass a different name if you wanted a fresh worktree."
            : "";
        let y = "";
        let w = "Use ExitWorktree to leave mid-session, or exit the session to be prompted.";
        return {
          data: {
            worktreePath: n.worktreePath,
            worktreeBranch: n.worktreeBranch,
            message: `${f} worktree at ${printableNameOrPlaceholder(n.worktreePath)}${s}.${h}${y} The session is now working in the worktree. ${w}`,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam({ message }, toolUseId) {
    return {
      type: "tool_result",
      content: message,
      tool_use_id: toolUseId,
    };
  },
});
export { EnterWorktreeTool };
