/**
 * tools/EnterWorktreeTool/EnterWorktreeTool.ts
 *
 * EnterWorktree 工具：新建或进入 git worktree 并把会话（或子代理）工作目录切过去；含 zod custom() 误归代码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/EnterWorktreeTool/EnterWorktreeTool.ts
 * pieces: chunk-fmnbrxwy.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { sep, resolve } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:135382-135487 sole-consumer
var UNSAFE_DISPLAY_CHARS_REGEX =
  /[\p{Cc}\p{Cf}\p{Cn}\p{Co}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu;
//@ chunk-fmnbrxwy.js:135487-135532 affinity
/**
 * 把控制字符、不可见字符、私用区、非普通空白等替换为 U+FFFD，用于安全显示路径。
 */
function sanitizeForDisplay(text) {
  return text.replace(UNSAFE_DISPLAY_CHARS_REGEX, "\uFFFD");
}
//@ chunk-fmnbrxwy.js:135532-141639 fingerprint (2.1.88 match: EnterWorktreeTool, 0.303)
/**
 * EnterWorktree 工具（shouldDefer，未声明 isEnabled）。输入 name（新建，按段校验，≤64）或 path（进入现有 worktree），二者互斥。validateInput：被固定 cwd 的子代理只能用 path；已在 worktree 会话中只能用 path 切换。checkPermissions：新建直接允许；path 在 .claude/worktrees 管理位置内直接允许，否则以 safetyCheck 询问（会迁移工作目录、写权限和项目配置来源，classifier 不可代批）。call：子代理场景只切换该代理 cwd 并返回 working_directory contextLayer；主会话新建/进入 worktree（git 或配置的 hooks），切 cwd、originalCwd，保存 worktree 状态并清缓存，消息区分 Created/Reused/Resumed/Entered。 EnterWorktree 输入 schema（name/path 互斥）与输出 schema（worktreePath/worktreeBranch/message）。
 */
var QUOTE_LIKE_CHARS_REGEX; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var enterWorktreeInputSchema;
var enterWorktreeOutputSchema;
var EnterWorktreeTool;
deferInit("chunk-fmnbrxwy.js:135532", () => {
  QUOTE_LIKE_CHARS_REGEX =
    /["\u201C\u201D\u201F\u2033\u2036\uFF02\u301D\u301E\u301F\u02BA\u02EE\u02DD\u05F4]/g;
  enterWorktreeInputSchema = DoctorLazy(() =>
    zodStrictObject({
      name: stringSchema()
        .superRefine((name, ctx) => {
          try {
            validateWorktreeSlug(name);
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
      path: stringSchema()
        .optional()
        .describe(
          "Path to an existing worktree to switch into instead of creating a new one. Must appear in `git worktree list` for the current repo \u2014 or, on first entry from the launch directory, for a repo nested inside it (multi-repo workspace). Mutually exclusive with `name`.",
        ),
    }).refine((input) => !(input.name && input.path), {
      message: "Provide at most one of `name` or `path`, not both.",
    }),
  );
  enterWorktreeOutputSchema = DoctorLazy(() =>
    objectSchema({
      worktreePath: stringSchema(),
      worktreeBranch: stringSchema().optional(),
      message: stringSchema(),
    }),
  );
  EnterWorktreeTool = buildTool({
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
    userFacingName(input) {
      return input?.path ? "Entering worktree" : "Creating worktree";
    },
    shouldDefer: true,
    toAutoClassifierInput(input) {
      return input.path ?? input.name ?? "";
    },
    renderToolUseMessage({ name, path }) {
      return (path !== undefined ? sanitizeForDisplay(path) : null) ?? name ?? "";
    },
    create(toolContext) {
      return {
        async validateInput(input) {
          if (hasOutermostCallFrame()) {
            if (input.path)
              return {
                result: true,
              };
            let cwd = getCwd();
            let canonicalGitRoot = findCanonicalGitRoot(cwd);
            return {
              result: false,
              message:
                `EnterWorktree cannot create a worktree from a subagent with a cwd override (isolation: "worktree" or explicit cwd) \u2014 it would mutate the parent session's process-wide working directory. ` +
                (canonicalGitRoot != null &&
                cwd !== canonicalGitRoot &&
                cwd.startsWith(canonicalGitRoot + sep)
                  ? "To switch this agent into an existing worktree managed by Claude Code (under .claude/worktrees/ of this repository), call EnterWorktree with `path`. To work in any other directory, spawn an Agent with `cwd` set to it."
                  : "To work in a different directory (including a worktree), spawn an Agent with `cwd` set to it."),
              errorCode: 1,
            };
          }
          if (getCurrentWorktreeSession() && !input.path)
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
        async checkPermissions(input) {
          if (!input.path)
            return {
              behavior: "allow",
              updatedInput: input,
            };
          let managedWorktreePath = await resolveManagedWorktreePath(input.path);
          if (managedWorktreePath?.managed)
            return {
              behavior: "allow",
              updatedInput: {
                ...input,
                path: managedWorktreePath.targetReal,
              },
            };
          let resolvedPath = resolve(getCwd(), input.path);
          let sanitizePath = (rawPath) =>
            sanitizeForDisplay(rawPath).replace(QUOTE_LIKE_CHARS_REGEX, "\uFFFD");
          let displayPath = sanitizePath(resolvedPath);
          let managedDisplayPath = managedWorktreePath ? sanitizePath(managedWorktreePath.targetReal) : null;
          let sanitizedNote =
            displayPath !== resolvedPath ||
            (managedWorktreePath && managedDisplayPath !== managedWorktreePath.targetReal)
              ? " (path sanitized for display)"
              : "";
          let resolutionNote =
            managedDisplayPath !== null &&
            managedDisplayPath.normalize("NFC") !== displayPath.normalize("NFC")
              ? ` (resolves to "${managedDisplayPath}")`
              : "";
          return {
            behavior: "ask",
            message: `Enter the worktree at "${displayPath}"${resolutionNote}${sanitizedNote}? This moves the session's working directory and write access there, and loads project configuration (CLAUDE.md, settings) from that location.`,
            updatedInput: {
              ...input,
              path: resolvedPath,
            },
            decisionReason: {
              type: "safetyCheck",
              reason: `permission-root relocation to "${displayPath}"${resolutionNote}${sanitizedNote} \u2014 a model-supplied worktree outside .claude/worktrees/`,
              classifierApprovable: false,
            },
            localDisplayOnly: true,
          };
        },
        async call(input) {
          if (hasOutermostCallFrame()) {
            if (!input.path)
              throw new WorktreeIsolationError(
                "EnterWorktree from a session with a pinned working directory requires `path`.",
              );
            let existingWorktreeTarget = await resolveExistingWorktreeTarget(input.path, {
              requireManagedLocation: true,
              requireCwdInsideRepo: true,
            });
            let isolationRefusal = hasHostWorktreeDeclaration()
              ? null
              : checkWorktreeIsolation_2(existingWorktreeTarget.worktreePath, {
                  agentId: toolContext.agentId,
                  agentWorktree: toolContext.agentWorktree,
                  session: toolContext.session,
                });
            if (isolationRefusal !== null)
              throw new WorktreeIsolationError(
                `Entering ${printableNameOrPlaceholder(existingWorktreeTarget.worktreePath)} would not give this agent write access there, so the switch was not made. ${isolationRefusal}`,
              );
            setCwd(existingWorktreeTarget.worktreePath, toolContext.session);
            registerSandboxWriteDirectory(
              existingWorktreeTarget.worktreePath,
              toolContext.agentId ?? getSessionId(),
            );
            if (toolContext.agentId)
              try {
                await updateAgentMetadata(
                  toolContext.agentId,
                  {
                    cwd: existingWorktreeTarget.worktreePath,
                  },
                  toolContext.storageV5,
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
            let branchSuffix = existingWorktreeTarget.worktreeBranch
              ? ` on branch ${printableNameOrPlaceholder(existingWorktreeTarget.worktreeBranch)}`
              : "";
            return {
              data: {
                worktreePath: existingWorktreeTarget.worktreePath,
                worktreeBranch: existingWorktreeTarget.worktreeBranch,
                message: `Entered worktree at ${printableNameOrPlaceholder(existingWorktreeTarget.worktreePath)}${branchSuffix}. This agent's working directory and write access now point at the worktree; the previous directory was left untouched.`,
              },
              contextLayers: [
                {
                  kind: "working_directory",
                  directory: existingWorktreeTarget.worktreePath,
                },
              ],
            };
          }
          if (getCurrentWorktreeSession() && !input.path) throw Error("Already in a worktree session");
          let worktreeResult;
          if (input.path)
            worktreeResult = await enterExistingWorktreeForSession(
              getSessionId(),
              input.path,
              (await isPathUnderManagedWorktreesDir(resolve(getCwd(), input.path)))
                ? {
                    requireManagedLocation: true,
                    storageV5: toolContext.storageV5,
                  }
                : {
                    storageV5: toolContext.storageV5,
                  },
            );
          else {
            let cwd = getCwd();
            let canonicalGitRoot = findCanonicalGitRoot(cwd);
            let movedToRepoRoot = false;
            if (canonicalGitRoot && canonicalGitRoot !== cwd) {
              processChdir(canonicalGitRoot);
              setCwd(canonicalGitRoot, toolContext.session);
              movedToRepoRoot = true;
            }
            try {
              worktreeResult = await createWorktreeForSession(
                getSessionId(),
                input.name ?? getPlanSlug(),
                undefined,
                {
                  fromCwd: cwd,
                  repoRoot: canonicalGitRoot ?? undefined,
                  slugPick: undefined,
                  fromHead: undefined,
                  storageV5: toolContext.storageV5,
                  credentials: toolContext.credentials,
                },
              );
            } catch (error) {
              if (movedToRepoRoot)
                try {
                  processChdir(cwd);
                  setCwd(cwd, toolContext.session);
                } catch {
                  reanchorGitFileWatcher();
                  getReplBridgeHandle()?.refreshGitBranch?.();
                }
              throw error;
            }
          }
          processChdir(worktreeResult.worktreePath);
          setCwd(worktreeResult.worktreePath, toolContext.session);
          setOriginalCwd(getCwd());
          if (!worktreeResult.hookBased && !worktreeResult.nestedRepoRoot)
            try {
              await relocateSessionTranscript(toolContext.storageV5);
            } catch (error) {
              reportRelocateSessionTranscriptFailure(error, "EnterWorktree");
            }
          registerSandboxWriteDirectory(worktreeResult.worktreePath, getSessionId());
          saveWorktreeState(worktreeResult, isStorageV5Enabled() ? toolContext.storageV5 : undefined);
          resetEnvironmentCaches("worktree");
          clearMemoryFilesCache(toolContext.session);
          getPlansDirectory.cache.clear?.();
          primePlanSlugCollisions(toolContext.storageV5);
          reanchorGitFileWatcher();
          getReplBridgeHandle()?.refreshGitBranch?.();
          logEvent(input.path ? "tengu_worktree_entered_existing" : "tengu_worktree_created", {
            mid_session: true,
            ...{},
          });
          let branchSuffix = worktreeResult.worktreeBranch
            ? ` on branch ${printableNameOrPlaceholder(worktreeResult.worktreeBranch)}`
            : "";
          let verb = input.path
            ? "Entered"
            : worktreeResult.resetToFreshBase
              ? "Reused"
              : worktreeResult.resumedExisting
                ? "Resumed"
                : "Created";
          let reuseNote = worktreeResult.resetToFreshBase
            ? " A worktree with this name already existed; its previous work was fully merged upstream, so it was reset to the current base."
            : worktreeResult.resumedExisting
              ? " A worktree with this name already existed and was resumed as-is \u2014 it may carry an earlier session\u2019s commits. Pass a different name if you wanted a fresh worktree."
              : "";
          let hint = "";
          let exitHint = "Use ExitWorktree to leave mid-session, or exit the session to be prompted.";
          return {
            data: {
              worktreePath: worktreeResult.worktreePath,
              worktreeBranch: worktreeResult.worktreeBranch,
              message: `${verb} worktree at ${printableNameOrPlaceholder(worktreeResult.worktreePath)}${branchSuffix}.${reuseNote}${hint} The session is now working in the worktree. ${exitHint}`,
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
});
export { EnterWorktreeTool };
