/**
 * services/design/syncTool.ts
 *
 * 2.1.316 新增：Claude Design 同步工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-98n6ge4d.js (22)
 * attribution: placement 22
 */
import { resolve, sep, extname } from "path";
import { stat, realpath } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  string,
  _enum,
  E,
  array,
  u,
  discriminatedUnion,
  literal,
  M,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_PLAN_PATH_CHARS,
  DesignGateState,
  normalizePlanPath,
  hasGlobChars,
  registerDesignPlan,
  getPlanByToken,
  isReservedDesignPath,
  pathMatchesAny,
} from "../mcp/designPlanGate.js";
import {
  DESIGNSYNC_METHODS,
  DESIGNSYNC,
  isDesignSyncAllowed,
  buildDesignSyncPrompt,
} from "../../tools/DesignSyncTool/DesignSyncTool.js";
import {
  uploadPlanTitle,
  syncApprovalSummary,
  buildSyncApprovalQuestion,
  isShowableName,
  syncApprovalLines,
  WRITE_GRANT_NOTE,
  REVIEW_UPLOAD_NOTE,
  buildCreateProjectQuestionLines,
  NEW_PROJECT_NOTE,
} from "./syncApprovalDialog.js";
import { count } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import {
  needsDesignLogin,
  getDesignConsentKey,
  DesignAuthError,
  isDesignConsentName,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  recordDesignConsent,
  setDesignConsent,
  redactOAuthToken,
  listOrgProjects,
  PROJECT_TYPE_DESIGN_SYSTEM,
  getDesignProject,
  listDesignFiles,
  getDesignFile,
  writeDesignFiles,
  deleteDesignFiles,
  recordDesignAsset,
  deleteDesignAsset,
  createDesignProject,
} from "./designApi.js";
import { runDesignLogin, isDesignOAuthConfigured, isRemoteEnvironment } from "../oauth/designOAuth.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { isAnyFeatureAvailable } from "../../utils/featureAvailability.js";
import { getCwd } from "../../utils/cwd.js";
import {
  errorMessage,
  AbortError,
  withTelemetryMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify, didInodeChange } from "../../utils/slowOperations.js";
import { layeredReadVerdictForPaths } from "../../utils/permissions/filesystem.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import {
  isCredentialPath,
  isSensitiveBasenameWithVariants,
  isCredentialConfigPath_2,
  MAX_SENSITIVE_PATH_LENGTH,
} from "../../utils/permissions/sensitivePaths.js";
import {
  statChain,
  openReadBoundToApproval,
  lastExistingIdentity,
  readFdTargetPath,
} from "../../utils/fsSafety/pathRevalidation.js";
import { getPlatform } from "../../utils/platform.js";
import { SymlinkReadRefusedError } from "../../utils/fsSafety/atomicWriteStaging.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";

//@ chunk-98n6ge4d.js:12747-17170 placement
/**
 * design 同步工具支持的方法表。
 */
var designSyncInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: string()
      .min(1)
      .max(MAX_PLAN_PATH_CHARS)
      .describe("Path within the project, e.g. components/button/index.html"),
    localPath: string()
      .min(1)
      .optional()
      .describe(
        "Path on disk to read file contents from, relative to the localDir approved at finalize_plan. Preferred for anything you have on disk: the tool reads, encodes, and uploads directly so the contents never enter the model context. Mutually exclusive with data.",
      ),
    data: string()
      .optional()
      .describe(
        "Inline file contents (UTF-8 text, or base64 when encoding is " +
          '"base64"). For small dynamic content only \u2014 anything you have on ' +
          "disk should use localPath instead.",
      ),
    encoding: _enum(["base64"]).optional().describe('Set to "base64" for binary inline data'),
    mimeType: string().optional(),
  }),
);
var designSyncProjectSchema = DoctorLazy(() =>
  zodStrictObject({
    name: string().min(1).max(255).describe('Short human-readable label ("Primary buttons"), not a path'),
    path: string()
      .min(1)
      .max(MAX_PLAN_PATH_CHARS)
      .describe("Project-relative path to the preview/spec file this card renders"),
    subtitle: string()
      .max(255)
      .optional()
      .describe('Variants shown ("Primary / secondary / ghost, 3 sizes")'),
    viewport: zodStrictObject({
      width: E().int().positive(),
      height: E().int().positive().optional(),
    })
      .optional()
      .describe("Card dimensions in the Design System pane"),
    group: string()
      .max(64)
      .optional()
      .describe(
        "Free-form section label for the Design System pane (max 64 chars). " +
          "Use the source design system's own categorization if it has one \u2014 " +
          'e.g. Material has Buttons/Cards/Forms/etc., a corporate kit might have Actions/Forms/Navigation. Common foundational labels: "Type", "Colors", "Spacing", "Components", "Brand". The pane groups by the value you send.',
      ),
  }),
);
var designSyncSchema = DoctorLazy(() =>
  zodStrictObject({
    method: _enum(DESIGNSYNC_METHODS),
    projectId: string()
      .min(1)
      .optional()
      .describe("Required for all methods except list_projects and create_project"),
    path: string().min(1).optional().describe("get_file: file path to read"),
    writes: array(string().min(1).max(MAX_PLAN_PATH_CHARS))
      .max(256)
      .optional()
      .describe(
        "finalize_plan: exact paths or glob patterns that will be written. `*` matches within a single segment, `**` matches any depth (e.g. `ui_kits/acme/**/*.html`). Max 3 `*`/`**` wildcards per " +
          "pattern and max 256 entries \u2014 use broader globs to cover more " +
          "files rather than enumerating paths.",
      ),
    deletes: array(string().min(1).max(MAX_PLAN_PATH_CHARS))
      .max(256)
      .optional()
      .describe(
        "finalize_plan: exact paths or glob patterns that will be deleted (same syntax and limits as writes).",
      ),
    planId: string()
      .min(1)
      .optional()
      .describe(
        "write_files/delete_files/register_assets/unregister_assets: token from a prior finalize_plan call",
      ),
    files: array(designSyncInputSchema())
      .max(256)
      .optional()
      .describe(
        "write_files: file contents to write (max 256 per call \u2014 split " +
          "larger bundles across multiple write_files calls under the same planId).",
      ),
    paths: array(string().min(1).max(MAX_PLAN_PATH_CHARS))
      .max(256)
      .optional()
      .describe(
        "delete_files: paths to delete. unregister_assets: paths whose " +
          "Design System pane card should be removed. Max 256 per call \u2014 " +
          "split larger batches across multiple calls under the same planId.",
      ),
    name: string()
      .min(1)
      .max(200)
      .optional()
      .describe("create_project: name for the new design-system project"),
    assets: array(designSyncProjectSchema())
      .max(256)
      .optional()
      .describe(
        "register_assets: cards to register in the Design System pane. Each path must be in the finalized plan. Run after write_files succeeds. Max 256 per call.",
      ),
    localDir: string()
      .min(1)
      .optional()
      .describe(
        "finalize_plan: directory the bundle was built into. write_files with localPath may only read files inside this directory. Defaults to the current working directory. Resolved to an absolute path and shown in the permission prompt.",
      ),
    counts: u({
      total: E().int().nonnegative(),
      bad: E().int().nonnegative(),
      thin: E().int().nonnegative(),
      variantsIdentical: E().int().nonnegative(),
      iterations: E().int().nonnegative(),
    })
      .optional()
      .describe(
        "report_validate: aggregate from the final .render-check.json \u2014 " +
          "counts only, no component names or paths.",
      ),
  }),
);
var DESIGN_SYNC_METHODS = {
  list_projects: {
    present: [],
    nonEmpty: [],
  },
  get_project: {
    present: ["projectId"],
    nonEmpty: [],
  },
  list_files: {
    present: ["projectId"],
    nonEmpty: [],
  },
  get_file: {
    present: ["projectId", "path"],
    nonEmpty: [],
  },
  finalize_plan: {
    present: ["projectId", "writes", "deletes"],
    nonEmpty: [],
  },
  write_files: {
    present: ["projectId", "planId"],
    nonEmpty: ["files"],
  },
  delete_files: {
    present: ["projectId", "planId"],
    nonEmpty: ["paths"],
  },
  register_assets: {
    present: ["projectId", "planId"],
    nonEmpty: ["assets"],
  },
  unregister_assets: {
    present: ["projectId", "planId"],
    nonEmpty: ["paths"],
  },
  create_project: {
    present: ["name"],
    nonEmpty: [],
  },
  report_validate: {
    present: ["counts"],
    nonEmpty: [],
  },
};
//@ chunk-98n6ge4d.js:17170-17350 placement
function missingRequiredFields(e) {
  let n = DESIGN_SYNC_METHODS[e.method];
  let filtered = n.present.filter((i) => e[i] === undefined);
  let filtered_2 = n.nonEmpty.filter((i) => {
    let a = e[i];
    return a === undefined || (Array.isArray(a) && a.length === 0);
  });
  return [...filtered, ...filtered_2];
}
//@ chunk-98n6ge4d.js:17350-18234 placement
/**
 * Design 同步工具各方法的输出结构（列项目、读项目、列文件、读文件、提交计划、写/删文件、资源登记、建项目等）。
 */
var NOTICE_FIELD = {
  notice: string().optional(),
};
var DESIGN_SYNC_OUTPUT_SCHEMA = DoctorLazy(() =>
  discriminatedUnion("method", [
    u({
      method: literal("list_projects"),
      ...NOTICE_FIELD,
      projects: array(
        u({
          projectId: string(),
          name: string(),
          ownerDisplayName: string().optional(),
          isOwned: M().optional(),
          updatedAt: string().optional(),
        }),
      ),
    }),
    u({
      method: literal("get_project"),
      ...NOTICE_FIELD,
      projectId: string(),
      name: string(),
      type: string().optional(),
      ownerDisplayName: string().optional(),
      isOwned: M().optional(),
      canEdit: M().optional(),
    }),
    u({
      method: literal("list_files"),
      ...NOTICE_FIELD,
      paths: array(string()),
    }),
    u({
      method: literal("get_file"),
      ...NOTICE_FIELD,
      path: string(),
      content: string(),
      contentType: string(),
      isBase64: M(),
      truncated: M(),
    }),
    u({
      method: literal("finalize_plan"),
      ...NOTICE_FIELD,
      planId: string(),
      writes: array(string()),
      deletes: array(string()),
    }),
    u({
      method: literal("write_files"),
      ...NOTICE_FIELD,
      written: E(),
    }),
    u({
      method: literal("delete_files"),
      ...NOTICE_FIELD,
      deleted: E(),
    }),
    u({
      method: literal("register_assets"),
      ...NOTICE_FIELD,
      registered: E(),
    }),
    u({
      method: literal("unregister_assets"),
      ...NOTICE_FIELD,
      unregistered: E(),
    }),
    u({
      method: literal("create_project"),
      ...NOTICE_FIELD,
      projectId: string(),
      name: string(),
    }),
    u({
      method: literal("report_validate"),
      ...NOTICE_FIELD,
    }),
  ]),
);
//@ chunk-98n6ge4d.js:18234-18352 placement
function isReadOnlySyncMethod(method) {
  return (
    method === "list_projects" ||
    method === "get_project" ||
    method === "list_files" ||
    method === "get_file" ||
    method === "report_validate"
  );
}
//@ chunk-98n6ge4d.js:18352-18428 placement
/**
 * 把 id 截短成前 8 位加省略号（空值用 ?）。
 */
function shortId(projectId) {
  if (!projectId) return "?";
  return projectId.length > 12 ? `${projectId.slice(0, 8)}\u2026` : projectId;
}
//@ chunk-98n6ge4d.js:18428-19367 placement
/**
 * 为 Design 同步调用生成简短描述（读取、写入多少文件、删除等）。
 */
function describeSyncCall(input) {
  switch (input?.method) {
    case "list_projects":
      return "List design-system projects";
    case "get_project":
      return "Read project metadata";
    case "list_files":
      return "List project files";
    case "get_file":
      return input.path ? `Read ${input.path}` : "Read file";
    case "finalize_plan":
      return uploadPlanTitle(input);
    case "write_files": {
      let n = input.files?.length ?? 0;
      let s = count(input.files ?? [], (i) => i.localPath !== undefined);
      let r = s > 0 && s < n ? ` (${s} from disk, ${n - s} inline)` : s === n && n > 0 ? " from disk" : "";
      return `Write ${n} ${plural(n, "file")}${r}`;
    }
    case "delete_files":
      return `Delete ${input.paths?.length ?? 0} ${plural(input.paths?.length ?? 0, "file")}`;
    case "register_assets":
      return `Register ${input.assets?.length ?? 0} ${plural(input.assets?.length ?? 0, "asset card")}`;
    case "unregister_assets":
      return `Unregister ${input.paths?.length ?? 0} ${plural(input.paths?.length ?? 0, "asset card")}`;
    case "create_project":
      return input.name ? `Create project "${input.name}"` : "Create design-system project";
    case "report_validate":
      return "Report validate metrics";
    default:
      return "Design sync";
  }
}
//@ chunk-98n6ge4d.js:19367-20868 placement
/**
 * （切分错误，DesignSync）把 DesignSync 前置条件失败原因（需 /design-login、刷新失败、非 claude.ai 认证、仅必要流量）转成给用户的说明。
 */
function formatDesignSyncPreconditionMessage(reason, n) {
  switch (reason) {
    case "needs_design_login":
      if (n?.isNonInteractiveSession)
        return `DesignSync needs design-system authorization, and /design-login cannot run in this non-interactive session. Ask the user to run /design-login once from an interactive Claude Code session on this machine \u2014 headless and SDK runs here then reuse that authorization. If this is claude.ai/code, ask them instead to use Claude Design's "Send to Claude Code Web" (which seeds the project into the workspace) or to provide the project files directly.`;
      return "DesignSync needs design-system authorization. Run /design-login to authorize it with your claude.ai account \u2014 this works even when this session authenticates with an API key or a provider token.";
    case "design_refresh_failed":
      if (n?.isNonInteractiveSession)
        return "Could not refresh the design access token (transient error). Retry shortly; if the error persists, the stored credential needs re-authorization from an interactive Claude Code terminal (not available here).";
      return "Could not refresh the design access token (transient error). Retry shortly, or run /design-login to re-authorize.";
    case "wrong_provider":
      return "DesignSync is only available with claude.ai authentication. It is not supported through Bedrock, Vertex, or other third-party providers.";
    case "essential_traffic_only":
      return "DesignSync is unavailable while nonessential network traffic is restricted (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set). Unset it to use /design-sync.";
  }
}
//@ chunk-98n6ge4d.js:20868-20955 placement
/**
 * （切分错误）DesignSync 前置条件错误类。
 */
class DesignSyncPreconditionError extends Error {
  constructor(message) {
    super(message);
    this.name = "DesignSyncPreconditionError";
  }
}
//@ chunk-98n6ge4d.js:20955-21004 placement = getAutoAllowedCommands (0.728)
var DESIGN_LOGIN_AUTO_PROMPT_MODES = new Set(["default", "acceptEdits", "auto"]);
//@ chunk-98n6ge4d.js:21004-21509 placement
/**
 * （切分错误，DesignSync）取 design 访问令牌；需要登录且在可交互的允许模式下自动发起登录，否则抛 DesignSyncPreconditionError。
 */
async function getDesignSyncAccessToken(credentials, n) {
  let s = await needsDesignLogin(credentials);
  let designConsentKey = await getDesignConsentKey(credentials);
  if (
    !designConsentKey.ok &&
    designConsentKey.reason === "needs_design_login" &&
    s &&
    (n?.askReachesUserAtDecision ?? false) &&
    !n?.isNonInteractiveSession &&
    n?.permissionMode !== undefined &&
    DESIGN_LOGIN_AUTO_PROMPT_MODES.has(n.permissionMode)
  ) {
    let i = await runDesignLogin(n?.signal);
    if (i.ok) return i.accessToken;
    throw new DesignSyncPreconditionError(`DesignSync needs design-system authorization. ${i.message}`);
  }
  if (!designConsentKey.ok) {
    let i = designConsentKey.detail ? ` (${designConsentKey.detail})` : "";
    throw new DesignSyncPreconditionError(
      `${formatDesignSyncPreconditionMessage(designConsentKey.reason, {
        isNonInteractiveSession: n?.isNonInteractiveSession,
      })}${i}`,
    );
  }
  return designConsentKey.accessToken;
}
//@ chunk-98n6ge4d.js:21509-21691 placement
function readConsentNeeded(error) {
  if (!(error instanceof DesignAuthError) || error.status !== 403) return null;
  let body = error.body;
  if (
    body == null ||
    typeof body !== "object" ||
    body.error !== "needs_consent" ||
    !isDesignConsentName(body.consent)
  )
    return null;
  return body.consent;
}
//@ chunk-98n6ge4d.js:21691-21847 placement
function canAskForApproval(e) {
  let n = e.permissions();
  return (
    !e.isNonInteractiveSession &&
    n.mode !== "bypassPermissions" &&
    !(n.mode === "plan" && n.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-98n6ge4d.js:21847-28024 placement
/**
 * 把本地设计系统组件同步到 claude.ai/design 项目的工具。
 */
var DesignSyncTool = buildTool({
  name: DESIGNSYNC,
  searchHint: "sync local design system components to a claude.ai/design project",
  shouldDefer: true,
  backgrounding: "never",
  maxResultSizeChars: 300000,
  isEnabled() {
    return isDesignSyncAllowed();
  },
  async description() {
    return buildDesignSyncPrompt(isAnyFeatureAvailable());
  },
  async prompt() {
    return buildDesignSyncPrompt(isAnyFeatureAvailable());
  },
  get inputSchema() {
    return designSyncSchema();
  },
  get outputSchema() {
    return DESIGN_SYNC_OUTPUT_SCHEMA();
  },
  isConcurrencySafe() {
    return false;
  },
  isReadOnly(e) {
    return isReadOnlySyncMethod(e.method);
  },
  isDestructive(e) {
    return e.method === "write_files" || e.method === "delete_files" || e.method === "unregister_assets";
  },
  userFacingName(e) {
    return `Design: ${e?.method === "create_project" ? "Create design system project" : describeSyncCall(e)}`;
  },
  getToolUseSummary(e) {
    return e?.method ? describeSyncCall(e) : null;
  },
  toAutoClassifierInput(e) {
    if (e.method === "finalize_plan") {
      let n = (s) => {
        let r = s ?? [];
        let i = 50;
        if (r.length <= 50) return r.join(", ");
        return `${r.length} paths (too many to list here, so leave the decision to the user)`;
      };
      return `project ${e.projectId ?? "?"} from ${resolve(getCwd(), e.localDir ?? ".")}: write ${n(e.writes)}; delete ${n(e.deletes)}`;
    }
    if (e.method === "create_project") return `create project "${e.name ?? "?"}"`;
    return e.method;
  },
  renderToolUseMessage(e, { verbose }) {
    let s = verbose ? syncApprovalSummary(e) : undefined;
    if (s !== undefined) return s;
    if (e.method === "finalize_plan") return shortId(e.projectId);
    return describeSyncCall(e);
  },
  permissionCard(e, n, notice) {
    return buildSyncApprovalQuestion(e, notice);
  },
  create(e) {
    return {
      async validateInput(n) {
        let s = missingRequiredFields(n);
        if (s.length > 0)
          return {
            result: false,
            message: `${n.method} requires: ${s.join(", ")}.`,
            errorCode: 1,
          };
        if (n.method === "create_project" && n.name !== undefined && !isShowableName(n.name))
          return {
            result: false,
            message:
              "create_project: the person approving must be able to read the project's name, and this one can't be shown in full. Choose a name with ordinary spaces and no tabs, line breaks or stacked accents.",
            errorCode: 1,
          };
        if (n.method === "finalize_plan" && (n.writes?.length ?? 0) === 0 && (n.deletes?.length ?? 0) === 0)
          return {
            result: false,
            message: "finalize_plan needs at least one write or delete path.",
            errorCode: 1,
          };
        if (n.method === "write_files")
          for (let r of n.files ?? []) {
            let i = r.data !== undefined;
            let a = r.localPath !== undefined;
            if (i === a)
              return {
                result: false,
                message: `Each file needs exactly one of "data" or "localPath" (offending path: ${r.path}).`,
                errorCode: 1,
              };
            if (a && r.encoding !== undefined)
              return {
                result: false,
                message: `"encoding" only applies to inline "data"; localPath files are encoded automatically (offending path: ${r.path}).`,
                errorCode: 1,
              };
          }
        return {
          result: true,
        };
      },
      async checkPermissions(n) {
        let s = await checkDesignConsent(e.toolState.get(DesignGateState), e.credentials);
        let r = {
          ...n,
          __consentBitShown: s,
          __consentAskCanReachUser: canAskForApproval(e),
        };
        let i = s !== null ? DESIGN_CONSENT_PROMPT(s) : null;
        let a =
          (await needsDesignLogin(e.credentials)) && isDesignOAuthConfigured() && !isRemoteEnvironment()
            ? "DesignSync needs design-system authorization for your claude.ai account. Approving opens your browser to authorize " +
              "access to your org's design-system projects \u2014 this session's " +
              "own authentication is not changed."
            : null;
        let c =
          [i, a].filter(Boolean).join(`

`) || null;
        if (
          c &&
          n.method !== "finalize_plan" &&
          n.method !== "create_project" &&
          n.method !== "report_validate"
        )
          return {
            behavior: "ask",
            message: c,
            updatedInput: r,
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason:
                [
                  i
                    ? "design agent consent \u2014 approving records a server-side grant for Claude agents to write your design projects"
                    : null,
                  a
                    ? "design login \u2014 approving opens a browser OAuth consent and stores a design credential"
                    : null,
                ]
                  .filter(Boolean)
                  .join("; ") || "design credential prompt",
              classifierApprovable: false,
            },
          };
        if (n.method === "finalize_plan") {
          let l;
          try {
            l = await realpathFromCwd(n.localDir);
          } catch (error) {
            return {
              behavior: "deny",
              message: `localDir does not exist or is not accessible: ${n.localDir ?? getCwd()} (${errorMessage(error)})`,
              decisionReason: {
                type: "safetyCheck",
                reason: "localDir not found",
                classifierApprovable: false,
              },
            };
          }
          let filtered = (n.writes ?? []).map(normalizePlanPath).filter((j) => !hasGlobChars(j));
          let results = await Promise.all(
            filtered.map(async (j) => {
              try {
                await stat(resolve(l, j));
                return true;
              } catch {
                return false;
              }
            }),
          );
          let filtered_2 = filtered.filter((j, Y) => !results[Y]);
          let v =
            filtered.length - filtered_2.length > 0 && filtered_2.length > 0
              ? `\u26A0 ${filtered_2.length} of ${filtered.length} literal write ${plural(filtered.length, "path")} not found under localDir \u2014 ` +
                `expected if they use a different localPath or inline data, otherwise check for a typo: ${filtered_2.slice(0, 5).join(", ")}` +
                (filtered_2.length > 5 ? `, \u2026 and ${filtered_2.length - 5} more` : "")
              : null;
          return {
            behavior: "ask",
            message: [
              c,
              ...syncApprovalLines({
                projectId: n.projectId ?? "?",
                localDir: l,
                writes: n.writes ?? [],
                deletes: n.deletes ?? [],
              }),
              v,
            ].filter((j) => j !== null).join(`
`),
            updatedInput: {
              ...r,
              localDir: l,
            },
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason: c ? WRITE_GRANT_NOTE : REVIEW_UPLOAD_NOTE,
              classifierApprovable: false,
            },
          };
        }
        if (n.method === "create_project")
          return {
            behavior: "ask",
            message: [c, ...buildCreateProjectQuestionLines(n.name ?? "?")].filter((l) => l !== null).join(`
`),
            updatedInput: r,
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason: c ? WRITE_GRANT_NOTE : NEW_PROJECT_NOTE,
              classifierApprovable: false,
            },
          };
        return {
          behavior: "allow",
          updatedInput: r,
        };
      },
      async call(n, s) {
        let signal = s.signal;
        if (n.method === "report_validate")
          return {
            data: {
              method: "report_validate",
            },
          };
        let i = e.toolState.get(DesignGateState);
        let __consentBitShown = n.__consentBitShown ?? null;
        let c = e.permissions();
        let __consentAskCanReachUser = n.__consentAskCanReachUser ?? false;
        let h = __consentAskCanReachUser && canAskForApproval(e);
        let g = "";
        try {
          g = await getDesignSyncAccessToken(e.credentials, {
            signal,
            isNonInteractiveSession: e.isNonInteractiveSession,
            permissionMode: c.mode,
            askReachesUserAtDecision: __consentAskCanReachUser,
          });
          if (__consentBitShown !== null && h && n.method === "finalize_plan")
            await recordDesignConsent(i, __consentBitShown, e.credentials).catch((error) => {
              logForDebugging(
                `Proactive design consent POST for finalize_plan failed (${errorMessage(error)}); the next RPC call's 403 intercept will retry.`,
              );
            });
          let f;
          try {
            f = await runDesignSyncMethod(i, n, g, signal, e.permissions);
            if (__consentBitShown !== null && n.method !== "finalize_plan")
              setDesignConsent(i, __consentBitShown, true);
          } catch (error) {
            let consentNeeded = readConsentNeeded(error);
            if (consentNeeded === null) {
              if (
                (error instanceof DesignAuthError ? error.body : null)?.error === "insufficient_scope" ||
                (error instanceof DesignAuthError && error.status === 401)
              )
                throw new DesignSyncPreconditionError(
                  formatDesignSyncPreconditionMessage("needs_design_login", {
                    isNonInteractiveSession: e.isNonInteractiveSession,
                  }),
                );
              throw error;
            } else if (consentNeeded !== __consentBitShown) {
              setDesignConsent(i, consentNeeded, false);
              throw new DesignSyncPreconditionError(
                `${DESIGN_CONSENT_PROMPT(consentNeeded)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
              );
            } else if (!h) {
              setDesignConsent(i, consentNeeded, false);
              throw new DesignSyncPreconditionError(
                `${DESIGN_CONSENT_PROMPT(consentNeeded)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
              );
            } else {
              await recordDesignConsent(i, consentNeeded, e.credentials);
              f = await runDesignSyncMethod(i, n, g, signal, e.permissions);
            }
          }
          return {
            data: f,
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          let message = redactOAuthToken(errorMessage(error), g);
          let telemetryMessage = error?.telemetryMessage;
          let v = typeof telemetryMessage === "string" ? telemetryMessage : "DesignSync tool call failed";
          if (error instanceof DesignSyncPreconditionError)
            throw withTelemetryMessage(new DesignSyncPreconditionError(message), v);
          throw withTelemetryMessage(Error(message), v);
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(e),
    };
  },
});
//@ chunk-98n6ge4d.js:28024-28101 placement
/**
 * 必填字段校验，缺失时抛 “<方法> requires \"<字段>\"”。
 */
function requireField(e, n, method) {
  if (e === undefined) throw Error(`${method} requires "${n}"`);
  return e;
}
//@ chunk-98n6ge4d.js:28101-28246 placement
var TEXT_FILE_EXTENSIONS = new Set([
  "html",
  "css",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "mts",
  "cts",
  "json",
  "svg",
  "xml",
  "md",
  "txt",
  "csv",
  "yaml",
  "yml",
  "toml",
]);
var MAX_LOCAL_FILE_BYTES = 12582912;
//@ chunk-98n6ge4d.js:28246-28293 placement
/**
 * 把路径解析成相对当前工作目录的真实路径。
 */
async function realpathFromCwd(localDir) {
  return realpath(resolve(getCwd(), localDir ?? "."));
}
//@ chunk-98n6ge4d.js:28293-29003 placement
/**
 * 检查 write_files 的本地路径能否在不询问用户的情况下读取，否则抛出前置条件错误。
 */
function assertReadableWithoutAsking(path, displayPath, permissionContext) {
  let r = layeredReadVerdictForPaths([path], permissionContext, {
    refuseAutomounterShapes: true,
  });
  switch (r.layer) {
    case "allow":
      return;
    case "path-mode-ask":
      if (r.decision.decisionReason?.type === "workingDir") return;
      break;
    case "bare-deny":
    case "path-deny":
    case "path-rule-ask":
    case "bare-ask":
      break;
    default:
  }
  throw withTelemetryMessage(
    new DesignSyncPreconditionError(
      `write_files: the localPath for ${displayPath} may not be read without asking the user, and write_files can't ask. The cause is a ${FILE_READ_TOOL_NAME} rule or setting, a network path, a link that can't be resolved, or a name Windows treats specially (such as NAME~1, or one ending in a dot) in the file's name or in any folder above it. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
    ),
    `${DESIGNSYNC} localPath needs ${FILE_READ_TOOL_NAME} permission`,
  );
}
//@ chunk-98n6ge4d.js:29003-29386 placement
/**
 * 拒绝读取凭证文件、设备或 Claude Code 自己的配置与令牌文件作为上传来源。
 */
async function assertNotProtectedFile(e, n, s) {
  if (
    (await isCredentialPath(e, n)) ||
    [e, n].some((r) => isSensitiveBasenameWithVariants(r) || isCredentialConfigPath_2(r))
  )
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the localPath for ${s} is or leads to a credential file, a device, or a file that Claude Code keeps for itself (its config and token folders), so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is a protected file`,
    );
}
//@ chunk-98n6ge4d.js:29386-29683 placement
function hardLinkRefusal(e) {
  return withTelemetryMessage(
    new DesignSyncPreconditionError(
      `write_files: the file at the localPath for ${e} is a hard link (it has another name elsewhere whose read permission can't be checked), so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
    ),
    `${DESIGNSYNC} localPath is a hard link`,
  );
}
//@ chunk-98n6ge4d.js:29683-30122 placement
/**
 * 构造"打开的文件不是检查过的那个文件"的错误。
 */
function openedFileMismatch(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `write_files: the file at the localPath for ${e} could not be opened as the file that was checked (it may have been moved or replaced, or the system would not say which file was opened), so it was not read. Nothing in this call was uploaded. Try the call once more; if it fails again, stop and ask the user how to proceed.`,
    "write_files: the file at localPath could not be opened as the file that was checked",
  );
}
//@ chunk-98n6ge4d.js:30122-32516 placement
/**
 * 准备 write_files 的单个文件：只有内联 data 时直接返回；有 localPath 时校验在已批准目录内、长度、非受保护/凭证文件、可无需询问读取、真实路径仍在目录内、不是硬链接、打开的正是检查过的文件、大小上限，然后按扩展名以 utf8 或 base64 读入。
 */
async function readLocalFileForUpload(file, approvedDir, permissionContext, getPermissionContext) {
  let displayPath = normalizePlanPath(file.path);
  if (file.localPath === undefined) {
    if (file.data === undefined) throw Error(`write_files: ${displayPath} has neither data nor localPath`);
    return {
      path: displayPath,
      data: file.data,
      encoding: file.encoding,
      mimeType: file.mimeType,
    };
  }
  if (file.data !== undefined) throw Error(`write_files: ${displayPath} has both data and localPath`);
  if (approvedDir === undefined)
    throw Error(
      "write_files with localPath requires a plan finalized with localDir. Re-run finalize_plan with the bundle directory.",
    );
  let a = (w) => (w.endsWith(sep) ? w : w + sep);
  let c = resolve(approvedDir);
  let path = resolve(c, file.localPath);
  if (path !== c && !path.startsWith(a(c)))
    throw Error("write_files: localPath must be inside the directory approved at finalize_plan.");
  if (path.length > MAX_SENSITIVE_PATH_LENGTH)
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the full path of the localPath for ${displayPath} is longer than ${MAX_SENSITIVE_PATH_LENGTH} characters, so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is too long`,
    );
  await assertNotProtectedFile(path, path, displayPath);
  assertReadableWithoutAsking(path, displayPath, getPermissionContext());
  let path_2 = await realpath(path);
  if (path_2 !== c && !path_2.startsWith(a(c))) {
    if (
      (await realpath(c).catch(() => {
        return;
      })) !== c
    )
      throw Error(
        "write_files: the directory approved at finalize_plan no longer resolves to the path that was approved (it may have been moved, replaced or deleted). Nothing in this call was uploaded. Run finalize_plan again.",
      );
    throw Error("write_files: localPath resolves outside the directory approved at finalize_plan.");
  }
  await assertNotProtectedFile(path, path_2, displayPath);
  if (path_2 !== path) assertReadableWithoutAsking(path_2, displayPath, getPermissionContext());
  let g = await statChain(path_2);
  if (g === undefined)
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the localPath for ${displayPath} is not a regular file, or it was moved or replaced while it was checked, so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is not a regular file`,
    );
  if (g.nlink > 1n) throw hardLinkRefusal(displayPath);
  let f;
  try {
    f = await openReadBoundToApproval(
      path_2,
      [path_2],
      permissionContext,
      getPlatform() === "macos" ? await lastExistingIdentity([path_2]) : undefined,
      "refused",
    );
  } catch (error) {
    if (error instanceof SymlinkReadRefusedError) throw openedFileMismatch(displayPath);
    throw error;
  }
  let handle = f.handle;
  let y;
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (!stats.isFile()) throw Error("write_files: localPath must be a regular file.");
    if (stats.nlink > 1n) throw hardLinkRefusal(displayPath);
    if (didInodeChange(g, stats)) throw openedFileMismatch(displayPath);
    if (getPlatform() === "linux" || getPlatform() === "wsl") {
      let j = await readFdTargetPath(handle.fd).catch(() => null);
      if (j !== undefined && j !== path_2) throw openedFileMismatch(displayPath);
    }
    if (stats.size > BigInt(MAX_LOCAL_FILE_BYTES))
      throw Error(`write_files: file at localPath exceeds the ${MAX_LOCAL_FILE_BYTES} byte limit.`);
    y = await handle.readFile();
  } finally {
    await f.close();
  }
  let lower = extname(path_2).slice(1).toLowerCase();
  return TEXT_FILE_EXTENSIONS.has(lower)
    ? {
        path: displayPath,
        data: y.toString("utf8"),
        mimeType: file.mimeType,
      }
    : {
        path: displayPath,
        data: y.toString("base64"),
        encoding: "base64",
        mimeType: file.mimeType,
      };
}
//@ chunk-98n6ge4d.js:32516-36768 placement
async function runDesignSyncMethod(e, n, s, permissionContext, getPermissionContext) {
  switch (n.method) {
    case "list_projects": {
      let { items } = await listOrgProjects(
        s,
        {
          type: PROJECT_TYPE_DESIGN_SYSTEM,
        },
        permissionContext,
      );
      return {
        method: "list_projects",
        projects: items
          .filter(
            (item) =>
              item.callerCanEdit ?? item.canEdit ?? (item.isOwned || item.sharing?.teamCanEdit) ?? false,
          )
          .map((item) => ({
            projectId: item.projectId,
            name: item.name,
            ownerDisplayName: item.ownerDisplayName,
            isOwned: item.isOwned,
            updatedAt: item.updatedAt,
          })),
      };
    }
    case "get_project": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let designProject = await getDesignProject(s, projectId, permissionContext);
      return {
        method: "get_project",
        projectId: designProject.projectId,
        name: designProject.name,
        type: designProject.type,
        ownerDisplayName: designProject.ownerDisplayName,
        isOwned: designProject.isOwned,
        canEdit: designProject.callerCanEdit ?? designProject.canEdit,
      };
    }
    case "list_files": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      return {
        method: "list_files",
        paths: await listDesignFiles(s, projectId, permissionContext),
      };
    }
    case "get_file": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let path = requireField(n.path, "path", n.method);
      let designFile = await getDesignFile(s, projectId, path, undefined, permissionContext);
      return {
        method: "get_file",
        path,
        content: designFile.content,
        contentType: designFile.contentType,
        isBase64: designFile.isBase64,
        truncated: designFile.truncated,
      };
    }
    case "finalize_plan": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let writes = requireField(n.writes, "writes", n.method).map(normalizePlanPath);
      let deletes = requireField(n.deletes, "deletes", n.method).map(normalizePlanPath);
      let localDir = await realpathFromCwd(n.localDir);
      return {
        method: "finalize_plan",
        planId: registerDesignPlan(e, {
          projectId,
          writes,
          deletes,
          localDir,
        }),
        writes,
        deletes,
      };
    }
    case "write_files": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let c = requireField(n.planId, "planId", n.method);
      let l = requireField(n.files, "files", n.method);
      let planByToken = getPlanByToken(e, c);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.map((w) => w.path).filter(isReservedDesignPath);
      if (filtered.length > 0)
        throw Error(
          `Cannot write reserved paths: ${filtered.join(", ")}. CLAUDE.md and .claude/ carry instructions to the design agent and are blocked regardless of the plan.`,
        );
      let filtered_2 = l
        .map((w) => normalizePlanPath(w.path))
        .filter((w) => !pathMatchesAny(w, planByToken.writes));
      if (filtered_2.length > 0)
        throw Error(
          `Cannot write paths outside the finalized plan: ${filtered_2.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      let m = 32;
      let files = [];
      for (let w = 0; w < l.length; w += m) {
        if (permissionContext.aborted) throw new AbortError();
        let sliced = l.slice(w, w + m);
        let Y = await raceWithAbortSignal(
          Promise.allSettled(
            sliced.map((k) =>
              readLocalFileForUpload(k, planByToken.localDir, permissionContext, getPermissionContext),
            ),
          ),
          permissionContext,
          () => new AbortError(),
        );
        for (let k of Y) {
          if (k.status === "rejected") throw k.reason;
          files.push(k.value);
        }
      }
      return {
        method: "write_files",
        written: (await writeDesignFiles(s, projectId, files, {}, permissionContext)).length,
      };
    }
    case "delete_files": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let c = requireField(n.planId, "planId", n.method);
      let l = requireField(n.paths, "paths", n.method);
      let planByToken = getPlanByToken(e, c);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.filter(isReservedDesignPath);
      if (filtered.length > 0)
        throw Error(
          `Cannot delete reserved paths: ${filtered.join(", ")}. CLAUDE.md and .claude/ carry instructions to the design agent and are blocked regardless of the plan.`,
        );
      let filtered_2 = l.map(normalizePlanPath).filter((y) => !pathMatchesAny(y, planByToken.deletes));
      if (filtered_2.length > 0)
        throw Error(
          `Cannot delete paths outside the finalized plan: ${filtered_2.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      return {
        method: "delete_files",
        deleted: await deleteDesignFiles(s, projectId, l.map(normalizePlanPath), permissionContext),
      };
    }
    case "register_assets": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let c = requireField(n.planId, "planId", n.method);
      let l = requireField(n.assets, "assets", n.method);
      let planByToken = getPlanByToken(e, c);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l
        .map((m) => normalizePlanPath(m.path))
        .filter((m) => !pathMatchesAny(m, planByToken.writes));
      if (filtered.length > 0)
        throw Error(
          `Cannot register paths outside the finalized plan: ${filtered.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      let f = 0;
      for (let m of l) {
        if (permissionContext.aborted) throw new AbortError();
        await recordDesignAsset(
          s,
          projectId,
          {
            ...m,
            path: normalizePlanPath(m.path),
          },
          permissionContext,
        );
        f++;
      }
      return {
        method: "register_assets",
        registered: f,
      };
    }
    case "unregister_assets": {
      let projectId = requireField(n.projectId, "projectId", n.method);
      let c = requireField(n.planId, "planId", n.method);
      let l = requireField(n.paths, "paths", n.method);
      let planByToken = getPlanByToken(e, c);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.map(normalizePlanPath).filter((m) => !pathMatchesAny(m, planByToken.deletes));
      if (filtered.length > 0)
        throw Error(
          `Cannot unregister cards for paths outside the finalized plan's deletes: ${filtered.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      let f = 0;
      for (let m of l.map(normalizePlanPath)) {
        if (permissionContext.aborted) throw new AbortError();
        await deleteDesignAsset(s, projectId, m, permissionContext);
        f++;
      }
      return {
        method: "unregister_assets",
        unregistered: f,
      };
    }
    case "create_project": {
      let name = requireField(n.name, "name", n.method);
      let designProject = await createDesignProject(s, name, permissionContext);
      return {
        method: "create_project",
        projectId: designProject.projectId,
        name: designProject.name,
      };
    }
    case "report_validate":
      return {
        method: "report_validate",
      };
  }
}
