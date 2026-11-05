/**
 * services/design/syncTool.ts
 *
 * 2.1.316 新增：Claude Design 同步工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zevfa8jm.js (26)
 * attribution: placement 22, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve, sep, extname } from "path";
import { stat, realpath } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  _enum,
  numberSchema,
  array,
  objectSchema,
  discriminatedUnion,
  literal,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_PLAN_PATH_CHARS,
  hasGlobChars,
  normalizePlanPath,
  planPathKey,
  collisionOf,
  DesignGateState,
  normalizePattern,
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
  PREVIEW_FORMAT_MAP,
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
import { countWhere } from "../../utils/collections.js";
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
  getProjectArtifactExport,
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
import {
  layeredReadVerdictForPaths,
  normalizeCaseForComparison_2,
} from "../../utils/permissions/filesystem.js";
import { READ } from "../../tools/FileReadTool/constants.js";
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

//@ chunk-zevfa8jm.js:13379-17802 placement
/**
 * design 同步工具支持的方法表。
 */
var designSyncInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: stringSchema()
      .min(1)
      .max(MAX_PLAN_PATH_CHARS)
      .describe("Path within the project, e.g. components/button/index.html"),
    localPath: stringSchema()
      .min(1)
      .optional()
      .describe(
        "Path on disk to read file contents from, relative to the localDir approved at finalize_plan. Preferred for anything you have on disk: the tool reads, encodes, and uploads directly so the contents never enter the model context. Mutually exclusive with data.",
      ),
    data: stringSchema()
      .optional()
      .describe(
        "Inline file contents (UTF-8 text, or base64 when encoding is " +
          '"base64"). For small dynamic content only \u2014 anything you have on ' +
          "disk should use localPath instead.",
      ),
    encoding: _enum(["base64"]).optional().describe('Set to "base64" for binary inline data'),
    mimeType: stringSchema().optional(),
  }),
);
var designSyncProjectSchema = DoctorLazy(() =>
  zodStrictObject({
    name: stringSchema()
      .min(1)
      .max(255)
      .describe('Short human-readable label ("Primary buttons"), not a path'),
    path: stringSchema()
      .min(1)
      .max(MAX_PLAN_PATH_CHARS)
      .describe("Project-relative path to the preview/spec file this card renders"),
    subtitle: stringSchema()
      .max(255)
      .optional()
      .describe('Variants shown ("Primary / secondary / ghost, 3 sizes")'),
    viewport: zodStrictObject({
      width: numberSchema().int().positive(),
      height: numberSchema().int().positive().optional(),
    })
      .optional()
      .describe("Card dimensions in the Design System pane"),
    group: stringSchema()
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
    projectId: stringSchema()
      .min(1)
      .optional()
      .describe("Required for all methods except list_projects and create_project"),
    path: stringSchema().min(1).optional().describe("get_file: file path to read"),
    writes: array(stringSchema().min(1).max(MAX_PLAN_PATH_CHARS))
      .max(256)
      .optional()
      .describe(
        "finalize_plan: exact paths or glob patterns that will be written. `*` matches within a single segment, `**` matches any depth (e.g. `ui_kits/acme/**/*.html`). Max 3 `*`/`**` wildcards per " +
          "pattern and max 256 entries \u2014 use broader globs to cover more " +
          "files rather than enumerating paths.",
      ),
    deletes: array(stringSchema().min(1).max(MAX_PLAN_PATH_CHARS))
      .max(256)
      .optional()
      .describe(
        "finalize_plan: exact paths or glob patterns that will be deleted (same syntax and limits as writes).",
      ),
    planId: stringSchema()
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
    paths: array(stringSchema().min(1).max(MAX_PLAN_PATH_CHARS))
      .max(256)
      .optional()
      .describe(
        "delete_files: paths to delete. unregister_assets: paths whose " +
          "Design System pane card should be removed. Max 256 per call \u2014 " +
          "split larger batches across multiple calls under the same planId.",
      ),
    name: stringSchema()
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
    localDir: stringSchema()
      .min(1)
      .optional()
      .describe(
        "finalize_plan: directory the bundle was built into. write_files with localPath may only read files inside this directory. Defaults to the current working directory. Resolved to an absolute path and shown in the permission prompt.",
      ),
    counts: objectSchema({
      total: numberSchema().int().nonnegative(),
      bad: numberSchema().int().nonnegative(),
      thin: numberSchema().int().nonnegative(),
      variantsIdentical: numberSchema().int().nonnegative(),
      iterations: numberSchema().int().nonnegative(),
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
//@ chunk-zevfa8jm.js:17802-18804 layout
function planPathProblem(plan) {
  let writePaths = [
    ...(plan.writes ?? []).filter((path) => !hasGlobChars(normalizePlanPath(path))),
    ...(plan.files ?? []).map((file) => file.path),
  ];
  let allPaths = [
    ...writePaths,
    ...(plan.deletes ?? []).filter((path) => !hasGlobChars(normalizePlanPath(path))),
    ...(plan.paths ?? []),
    ...(plan.assets ?? []).map((asset) => asset.path),
  ];
  let typed = allPaths.filter(
    (path) => planPathKey(path) === "" && !/^$|(^|\/)\.\.$/.test(normalizePlanPath(path)),
  );
  if (typed.length > 0)
    return `${plan.method}: claude.ai/design drops "#", "?" and invisible characters from a file's name, which leaves no usable name for: ${quoteList(typed)}. Rename a file before uploading it. Leave such a path out of a delete: no stored file has that name.`;
  let typed_2 = allPaths.filter((tooLong) => planPathKey(tooLong).length > MAX_PLAN_PATH_CHARS);
  if (typed_2.length > 0)
    return `${plan.method}: claude.ai/design stores "\u2026" as three dots, which takes these paths past ${MAX_PLAN_PATH_CHARS} characters, the longest this tool handles: ${quoteList(typed_2)}. Shorten an upload's path. A stored file with so long a path has to be deleted on claude.ai/design.`;
  let collision = collisionOf(writePaths);
  return collision === undefined
    ? undefined
    : `${plan.method}: claude.ai/design would store ${quoteList(collision.typed)} under one name, "${collision.stored}". Give one of them another path in the project.`;
}
//@ chunk-zevfa8jm.js:18804-18858 layout
function quoteList(typed) {
  return typed.map((path) => `"${path}"`).join(", ");
}
//@ chunk-zevfa8jm.js:18858-18942 layout
function storedVersusTyped(stored) {
  let [normalized, given] = [planPathKey(stored), normalizePlanPath(stored)];
  return normalized === given || normalized === "" ? given : `${normalized} (given as ${given})`;
}
//@ chunk-zevfa8jm.js:18942-19153 layout
function planPathsRetyped(paths) {
  return paths.some((path) => storedVersusTyped(path) !== normalizePlanPath(path))
    ? "Re-run finalize_plan with the full set, each file under the name claude.ai/design stores, which is the one shown first."
    : "Re-run finalize_plan with the full set.";
}
//@ chunk-zevfa8jm.js:19153-19333 placement
function missingRequiredFields(input) {
  let methodSpec = DESIGN_SYNC_METHODS[input.method];
  let filtered = methodSpec.present.filter((field) => input[field] === undefined);
  let filtered_2 = methodSpec.nonEmpty.filter((field) => {
    let value = input[field];
    return value === undefined || (Array.isArray(value) && value.length === 0);
  });
  return [...filtered, ...filtered_2];
}
//@ chunk-zevfa8jm.js:19333-20260 placement
/**
 * Design 同步工具各方法的输出结构（列项目、读项目、列文件、读文件、提交计划、写/删文件、资源登记、建项目等）。
 */
var NOTICE_FIELD = {
  notice: stringSchema().optional(),
};
var DESIGN_SYNC_OUTPUT_SCHEMA = DoctorLazy(() =>
  discriminatedUnion("method", [
    objectSchema({
      method: literal("list_projects"),
      ...NOTICE_FIELD,
      projects: array(
        objectSchema({
          projectId: stringSchema(),
          name: stringSchema(),
          ownerDisplayName: stringSchema().optional(),
          isOwned: booleanSchema().optional(),
          updatedAt: stringSchema().optional(),
        }),
      ),
    }),
    objectSchema({
      method: literal("get_project"),
      ...NOTICE_FIELD,
      projectId: stringSchema(),
      name: stringSchema(),
      type: stringSchema().optional(),
      ownerDisplayName: stringSchema().optional(),
      isOwned: booleanSchema().optional(),
      canEdit: booleanSchema().optional(),
      moveState: _enum(["moving", "moved"]).optional(),
    }),
    objectSchema({
      method: literal("list_files"),
      ...NOTICE_FIELD,
      paths: array(stringSchema()),
    }),
    objectSchema({
      method: literal("get_file"),
      ...NOTICE_FIELD,
      path: stringSchema(),
      content: stringSchema(),
      contentType: stringSchema(),
      isBase64: booleanSchema(),
      truncated: booleanSchema(),
    }),
    objectSchema({
      method: literal("finalize_plan"),
      ...NOTICE_FIELD,
      planId: stringSchema(),
      writes: array(stringSchema()),
      deletes: array(stringSchema()),
    }),
    objectSchema({
      method: literal("write_files"),
      ...NOTICE_FIELD,
      written: numberSchema(),
    }),
    objectSchema({
      method: literal("delete_files"),
      ...NOTICE_FIELD,
      deleted: numberSchema(),
    }),
    objectSchema({
      method: literal("register_assets"),
      ...NOTICE_FIELD,
      registered: numberSchema(),
    }),
    objectSchema({
      method: literal("unregister_assets"),
      ...NOTICE_FIELD,
      unregistered: numberSchema(),
    }),
    objectSchema({
      method: literal("create_project"),
      ...NOTICE_FIELD,
      projectId: stringSchema(),
      name: stringSchema(),
    }),
    objectSchema({
      method: literal("report_validate"),
      ...NOTICE_FIELD,
    }),
  ]),
);
//@ chunk-zevfa8jm.js:20260-20378 placement
function isReadOnlySyncMethod(method) {
  return (
    method === "list_projects" ||
    method === "get_project" ||
    method === "list_files" ||
    method === "get_file" ||
    method === "report_validate"
  );
}
//@ chunk-zevfa8jm.js:20378-20454 placement
/**
 * 把 id 截短成前 8 位加省略号（空值用 ?）。
 */
function shortId(projectId) {
  if (!projectId) return "?";
  return projectId.length > 12 ? `${projectId.slice(0, 8)}\u2026` : projectId;
}
//@ chunk-zevfa8jm.js:20454-21394 placement
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
      let fileCount = input.files?.length ?? 0;
      let fromDiskCount = countWhere(input.files ?? [], (file) => file.localPath !== undefined);
      let sourceNote =
        fromDiskCount > 0 && fromDiskCount < fileCount
          ? ` (${fromDiskCount} from disk, ${fileCount - fromDiskCount} inline)`
          : fromDiskCount === fileCount && fileCount > 0
            ? " from disk"
            : "";
      return `Write ${fileCount} ${plural(fileCount, "file")}${sourceNote}`;
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
//@ chunk-zevfa8jm.js:21394-22895 placement
/**
 * （切分错误，DesignSync）把 DesignSync 前置条件失败原因（需 /design-login、刷新失败、非 claude.ai 认证、仅必要流量）转成给用户的说明。
 */
function formatDesignSyncPreconditionMessage(reason, context) {
  switch (reason) {
    case "needs_design_login":
      if (context?.isNonInteractiveSession)
        return `DesignSync needs design-system authorization, and /design-login cannot run in this non-interactive session. Ask the user to run /design-login once from an interactive Claude Code session on this machine \u2014 headless and SDK runs here then reuse that authorization. If this is claude.ai/code, ask them instead to use Claude Design's "Send to Claude Code Web" (which seeds the project into the workspace) or to provide the project files directly.`;
      return "DesignSync needs design-system authorization. Run /design-login to authorize it with your claude.ai account \u2014 this works even when this session authenticates with an API key or a provider token.";
    case "design_refresh_failed":
      if (context?.isNonInteractiveSession)
        return "Could not refresh the design access token (transient error). Retry shortly; if the error persists, the stored credential needs re-authorization from an interactive Claude Code terminal (not available here).";
      return "Could not refresh the design access token (transient error). Retry shortly, or run /design-login to re-authorize.";
    case "wrong_provider":
      return "DesignSync is only available with claude.ai authentication. It is not supported through Bedrock, Vertex, or other third-party providers.";
    case "essential_traffic_only":
      return "DesignSync is unavailable while nonessential network traffic is restricted (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set). Unset it to use /design-sync.";
  }
}
//@ chunk-zevfa8jm.js:22895-22982 placement
/**
 * （切分错误）DesignSync 前置条件错误类。
 */
class DesignSyncPreconditionError extends Error {
  constructor(message) {
    super(message);
    this.name = "DesignSyncPreconditionError";
  }
}
//@ chunk-zevfa8jm.js:22982-23031 placement
var DESIGN_LOGIN_AUTO_PROMPT_MODES = new Set(["default", "acceptEdits", "auto"]);
//@ chunk-zevfa8jm.js:23031-23536 placement
/**
 * （切分错误，DesignSync）取 design 访问令牌；需要登录且在可交互的允许模式下自动发起登录，否则抛 DesignSyncPreconditionError。
 */
async function getDesignSyncAccessToken(credentials, options) {
  let loginNeeded = await needsDesignLogin(credentials);
  let designConsentKey = await getDesignConsentKey(credentials);
  if (
    !designConsentKey.ok &&
    designConsentKey.reason === "needs_design_login" &&
    loginNeeded &&
    (options?.askReachesUserAtDecision ?? false) &&
    !options?.isNonInteractiveSession &&
    options?.permissionMode !== undefined &&
    DESIGN_LOGIN_AUTO_PROMPT_MODES.has(options.permissionMode)
  ) {
    let loginResult = await runDesignLogin(options?.signal);
    if (loginResult.ok) return loginResult.accessToken;
    throw new DesignSyncPreconditionError(
      `DesignSync needs design-system authorization. ${loginResult.message}`,
    );
  }
  if (!designConsentKey.ok) {
    let detail = designConsentKey.detail ? ` (${designConsentKey.detail})` : "";
    throw new DesignSyncPreconditionError(
      `${formatDesignSyncPreconditionMessage(designConsentKey.reason, {
        isNonInteractiveSession: options?.isNonInteractiveSession,
      })}${detail}`,
    );
  }
  return designConsentKey.accessToken;
}
//@ chunk-zevfa8jm.js:23536-23718 placement
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
//@ chunk-zevfa8jm.js:23718-23874 placement
function canAskForApproval(toolPermissionContext) {
  let permissions = toolPermissionContext.permissions();
  return (
    !toolPermissionContext.isNonInteractiveSession &&
    permissions.mode !== "bypassPermissions" &&
    !(permissions.mode === "plan" && permissions.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-zevfa8jm.js:23874-30117 placement
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
  isReadOnly(input) {
    return isReadOnlySyncMethod(input.method);
  },
  isDestructive(input) {
    return (
      input.method === "write_files" ||
      input.method === "delete_files" ||
      input.method === "unregister_assets"
    );
  },
  userFacingName(input) {
    return `Design: ${input?.method === "create_project" ? "Create design system project" : describeSyncCall(input)}`;
  },
  getToolUseSummary(input) {
    return input?.method ? describeSyncCall(input) : null;
  },
  toAutoClassifierInput(input) {
    if (input.method === "finalize_plan") {
      let summarizePaths = (paths) => {
        let list = paths ?? [];
        let maxListed = 50;
        if (list.length <= 50) return list.join(", ");
        return `${list.length} paths (too many to list here, so leave the decision to the user)`;
      };
      return `project ${input.projectId ?? "?"} from ${resolve(getCwd(), input.localDir ?? ".")}: write ${summarizePaths(input.writes)}; delete ${summarizePaths(input.deletes)}`;
    }
    if (input.method === "create_project") return `create project "${input.name ?? "?"}"`;
    return input.method;
  },
  renderToolUseMessage(input, { verbose }) {
    let summary = verbose ? syncApprovalSummary(input) : undefined;
    if (summary !== undefined) return summary;
    if (input.method === "finalize_plan") return shortId(input.projectId);
    return describeSyncCall(input);
  },
  permissionCard(input, context, notice) {
    return buildSyncApprovalQuestion(input, notice);
  },
  create(context) {
    return {
      async validateInput(input) {
        let missing = missingRequiredFields(input);
        if (missing.length > 0)
          return {
            result: false,
            message: `${input.method} requires: ${missing.join(", ")}.`,
            errorCode: 1,
          };
        if (input.method === "create_project" && input.name !== undefined && !isShowableName(input.name))
          return {
            result: false,
            message:
              "create_project: the person approving must be able to read the project's name, and this one can't be shown in full. Choose a name with ordinary spaces and no tabs, line breaks or stacked accents.",
            errorCode: 1,
          };
        if (
          input.method === "finalize_plan" &&
          (input.writes?.length ?? 0) === 0 &&
          (input.deletes?.length ?? 0) === 0
        )
          return {
            result: false,
            message: "finalize_plan needs at least one write or delete path.",
            errorCode: 1,
          };
        let writeError = planPathProblem(input);
        if (writeError !== undefined)
          return {
            result: false,
            message: writeError,
            errorCode: 1,
          };
        if (input.method === "write_files")
          for (let file of input.files ?? []) {
            let hasData = file.data !== undefined;
            let hasLocalPath = file.localPath !== undefined;
            if (hasData === hasLocalPath)
              return {
                result: false,
                message: `Each file needs exactly one of "data" or "localPath" (offending path: ${file.path}).`,
                errorCode: 1,
              };
            if (hasLocalPath && file.encoding !== undefined)
              return {
                result: false,
                message: `"encoding" only applies to inline "data"; localPath files are encoded automatically (offending path: ${file.path}).`,
                errorCode: 1,
              };
          }
        return {
          result: true,
        };
      },
      async checkPermissions(input) {
        let consentBit = await checkDesignConsent(
          context.toolState.get(DesignGateState),
          context.credentials,
        );
        let updatedInput = {
          ...input,
          __consentBitShown: consentBit,
          __consentAskCanReachUser: canAskForApproval(context),
        };
        let consentMessage = consentBit !== null ? DESIGN_CONSENT_PROMPT(consentBit) : null;
        let loginMessage =
          (await needsDesignLogin(context.credentials)) && isDesignOAuthConfigured() && !isRemoteEnvironment()
            ? "DesignSync needs design-system authorization for your claude.ai account. Approving opens your browser to authorize " +
              "access to your org's design-system projects \u2014 this session's " +
              "own authentication is not changed."
            : null;
        let gateMessage =
          [consentMessage, loginMessage].filter(Boolean).join(`

`) || null;
        if (
          gateMessage &&
          input.method !== "finalize_plan" &&
          input.method !== "create_project" &&
          input.method !== "report_validate"
        )
          return {
            behavior: "ask",
            message: gateMessage,
            updatedInput,
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason:
                [
                  consentMessage
                    ? "design agent consent \u2014 approving records a server-side grant for Claude agents to write your design projects"
                    : null,
                  loginMessage
                    ? "design login \u2014 approving opens a browser OAuth consent and stores a design credential"
                    : null,
                ]
                  .filter(Boolean)
                  .join("; ") || "design credential prompt",
              classifierApprovable: false,
            },
          };
        if (input.method === "finalize_plan") {
          let localDir;
          try {
            localDir = await realpathFromCwd(input.localDir);
          } catch (error) {
            return {
              behavior: "deny",
              message: `localDir does not exist or is not accessible: ${input.localDir ?? getCwd()} (${errorMessage(error)})`,
              decisionReason: {
                type: "safetyCheck",
                reason: "localDir not found",
                classifierApprovable: false,
              },
            };
          }
          let filtered = (input.writes ?? [])
            .map(normalizePlanPath)
            .filter((writePath) => !hasGlobChars(writePath));
          let results = await Promise.all(
            filtered.map(async (writePath) => {
              try {
                await stat(resolve(localDir, writePath));
                return true;
              } catch {
                return false;
              }
            }),
          );
          let filtered_2 = filtered.filter((writePath, index) => !results[index]);
          let missingNote =
            filtered.length - filtered_2.length > 0 && filtered_2.length > 0
              ? `\u26A0 ${filtered_2.length} of ${filtered.length} literal write ${plural(filtered.length, "path")} not found under localDir \u2014 ` +
                `expected if they use a different localPath or inline data, otherwise check for a typo: ${filtered_2.slice(0, 5).join(", ")}` +
                (filtered_2.length > 5 ? `, \u2026 and ${filtered_2.length - 5} more` : "")
              : null;
          return {
            behavior: "ask",
            message: [
              gateMessage,
              ...syncApprovalLines({
                projectId: input.projectId ?? "?",
                localDir,
                writes: input.writes ?? [],
                deletes: input.deletes ?? [],
              }),
              missingNote,
            ].filter((line) => line !== null).join(`
`),
            updatedInput: {
              ...updatedInput,
              localDir,
            },
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason: gateMessage ? WRITE_GRANT_NOTE : REVIEW_UPLOAD_NOTE,
              classifierApprovable: false,
            },
          };
        }
        if (input.method === "create_project")
          return {
            behavior: "ask",
            message: [gateMessage, ...buildCreateProjectQuestionLines(input.name ?? "?")].filter(
              (line) => line !== null,
            ).join(`
`),
            updatedInput,
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason: gateMessage ? WRITE_GRANT_NOTE : NEW_PROJECT_NOTE,
              classifierApprovable: false,
            },
          };
        return {
          behavior: "allow",
          updatedInput,
        };
      },
      async call(input, toolContext) {
        let signal = toolContext.signal;
        if (input.method === "report_validate")
          return {
            data: {
              method: "report_validate",
            },
          };
        let gateState = context.toolState.get(DesignGateState);
        let __consentBitShown = input.__consentBitShown ?? null;
        let permissionState = context.permissions();
        let __consentAskCanReachUser = input.__consentAskCanReachUser ?? false;
        let canAskUser = __consentAskCanReachUser && canAskForApproval(context);
        let accessToken = "";
        try {
          accessToken = await getDesignSyncAccessToken(context.credentials, {
            signal,
            isNonInteractiveSession: context.isNonInteractiveSession,
            permissionMode: permissionState.mode,
            askReachesUserAtDecision: __consentAskCanReachUser,
          });
          if (__consentBitShown !== null && canAskUser && input.method === "finalize_plan")
            await recordDesignConsent(gateState, __consentBitShown, context.credentials).catch((error) => {
              logForDebugging(
                `Proactive design consent POST for finalize_plan failed (${errorMessage(error)}); the next RPC call's 403 intercept will retry.`,
              );
            });
          let methodResult;
          try {
            methodResult = await runDesignSyncMethod(
              gateState,
              input,
              accessToken,
              signal,
              context.permissions,
            );
            if (__consentBitShown !== null && input.method !== "finalize_plan")
              setDesignConsent(gateState, __consentBitShown, true);
          } catch (error) {
            let consentNeeded = readConsentNeeded(error);
            if (consentNeeded === null) {
              if (
                (error instanceof DesignAuthError ? error.body : null)?.error === "insufficient_scope" ||
                (error instanceof DesignAuthError && error.status === 401)
              )
                throw new DesignSyncPreconditionError(
                  formatDesignSyncPreconditionMessage("needs_design_login", {
                    isNonInteractiveSession: context.isNonInteractiveSession,
                  }),
                );
              throw error;
            } else if (consentNeeded !== __consentBitShown) {
              setDesignConsent(gateState, consentNeeded, false);
              throw new DesignSyncPreconditionError(
                `${DESIGN_CONSENT_PROMPT(consentNeeded)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
              );
            } else if (!canAskUser) {
              setDesignConsent(gateState, consentNeeded, false);
              throw new DesignSyncPreconditionError(
                `${DESIGN_CONSENT_PROMPT(consentNeeded)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
              );
            } else {
              await recordDesignConsent(gateState, consentNeeded, context.credentials);
              methodResult = await runDesignSyncMethod(
                gateState,
                input,
                accessToken,
                signal,
                context.permissions,
              );
            }
          }
          return {
            data: methodResult,
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          let message = redactOAuthToken(errorMessage(error), accessToken);
          let telemetryMessage = error?.telemetryMessage;
          let telemetryDetail =
            typeof telemetryMessage === "string" ? telemetryMessage : "DesignSync tool call failed";
          if (error instanceof DesignSyncPreconditionError)
            throw withTelemetryMessage(new DesignSyncPreconditionError(message), telemetryDetail);
          throw withTelemetryMessage(Error(message), telemetryDetail);
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(result),
    };
  },
});
//@ chunk-zevfa8jm.js:30117-30194 placement
/**
 * 必填字段校验，缺失时抛 “<方法> requires \"<字段>\"”。
 */
function requireField(value, fieldName, method) {
  if (value === undefined) throw Error(`${method} requires "${fieldName}"`);
  return value;
}
//@ chunk-zevfa8jm.js:30194-30347 placement
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
var MAX_UPLOAD_BYTES = 5000;
//@ chunk-zevfa8jm.js:30347-30394 placement
/**
 * 把路径解析成相对当前工作目录的真实路径。
 */
async function realpathFromCwd(localDir) {
  return realpath(resolve(getCwd(), localDir ?? "."));
}
//@ chunk-zevfa8jm.js:30394-31104 placement
/**
 * 检查 write_files 的本地路径能否在不询问用户的情况下读取，否则抛出前置条件错误。
 */
function assertReadableWithoutAsking(path, displayPath, permissionContext) {
  let verdict = layeredReadVerdictForPaths([path], permissionContext, {
    refuseAutomounterShapes: true,
  });
  switch (verdict.layer) {
    case "allow":
      return;
    case "path-mode-ask":
      if (verdict.decision.decisionReason?.type === "workingDir") return;
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
      `write_files: the localPath for ${displayPath} may not be read without asking the user, and write_files can't ask. The cause is a ${READ} rule or setting, a network path, a link that can't be resolved, or a name Windows treats specially (such as NAME~1, or one ending in a dot) in the file's name or in any folder above it. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
    ),
    `${DESIGNSYNC} localPath needs ${READ} permission`,
  );
}
//@ chunk-zevfa8jm.js:31104-31487 placement
/**
 * 拒绝读取凭证文件、设备或 Claude Code 自己的配置与令牌文件作为上传来源。
 */
async function assertNotProtectedFile(path, realPath, displayPath) {
  if (
    (await isCredentialPath(path, realPath)) ||
    [path, realPath].some(
      (candidate) => isSensitiveBasenameWithVariants(candidate) || isCredentialConfigPath_2(candidate),
    )
  )
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the localPath for ${displayPath} is or leads to a credential file, a device, or a file that Claude Code keeps for itself (its config and token folders), so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is a protected file`,
    );
}
//@ chunk-zevfa8jm.js:31487-31784 placement
function hardLinkRefusal(path) {
  return withTelemetryMessage(
    new DesignSyncPreconditionError(
      `write_files: the file at the localPath for ${path} is a hard link (it has another name elsewhere whose read permission can't be checked), so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
    ),
    `${DESIGNSYNC} localPath is a hard link`,
  );
}
//@ chunk-zevfa8jm.js:31784-32223 placement
/**
 * 构造"打开的文件不是检查过的那个文件"的错误。
 */
function openedFileMismatch(path) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `write_files: the file at the localPath for ${path} could not be opened as the file that was checked (it may have been moved or replaced, or the system would not say which file was opened), so it was not read. Nothing in this call was uploaded. Try the call once more; if it fails again, stop and ask the user how to proceed.`,
    "write_files: the file at localPath could not be opened as the file that was checked",
  );
}
//@ chunk-zevfa8jm.js:32223-34618 placement
/**
 * 准备 write_files 的单个文件：只有内联 data 时直接返回；有 localPath 时校验在已批准目录内、长度、非受保护/凭证文件、可无需询问读取、真实路径仍在目录内、不是硬链接、打开的正是检查过的文件、大小上限，然后按扩展名以 utf8 或 base64 读入。
 */
async function readLocalFileForUpload(file, approvedDir, permissionContext, getPermissionContext) {
  let planPath = planPathKey(file.path);
  if (file.localPath === undefined) {
    if (file.data === undefined) throw Error(`write_files: ${planPath} has neither data nor localPath`);
    return {
      path: planPath,
      data: file.data,
      encoding: file.encoding,
      mimeType: file.mimeType,
    };
  }
  if (file.data !== undefined) throw Error(`write_files: ${planPath} has both data and localPath`);
  if (approvedDir === undefined)
    throw Error(
      "write_files with localPath requires a plan finalized with localDir. Re-run finalize_plan with the bundle directory.",
    );
  let withTrailingSep = (dir) => (dir.endsWith(sep) ? dir : dir + sep);
  let approvedRoot = resolve(approvedDir);
  let path = resolve(approvedRoot, file.localPath);
  if (path !== approvedRoot && !path.startsWith(withTrailingSep(approvedRoot)))
    throw Error("write_files: localPath must be inside the directory approved at finalize_plan.");
  if (path.length > MAX_SENSITIVE_PATH_LENGTH)
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the full path of the localPath for ${planPath} is longer than ${MAX_SENSITIVE_PATH_LENGTH} characters, so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is too long`,
    );
  await assertNotProtectedFile(path, path, planPath);
  assertReadableWithoutAsking(path, planPath, getPermissionContext());
  let realPath = await realpath(path);
  if (realPath !== approvedRoot && !realPath.startsWith(withTrailingSep(approvedRoot))) {
    if (
      (await realpath(approvedRoot).catch(() => {
        return;
      })) !== approvedRoot
    )
      throw Error(
        "write_files: the directory approved at finalize_plan no longer resolves to the path that was approved (it may have been moved, replaced or deleted). Nothing in this call was uploaded. Run finalize_plan again.",
      );
    throw Error("write_files: localPath resolves outside the directory approved at finalize_plan.");
  }
  await assertNotProtectedFile(path, realPath, planPath);
  if (realPath !== path) assertReadableWithoutAsking(realPath, planPath, getPermissionContext());
  let stats = await statChain(realPath);
  if (stats === undefined)
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the localPath for ${planPath} is not a regular file, or it was moved or replaced while it was checked, so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is not a regular file`,
    );
  if (stats.nlink > 1n) throw hardLinkRefusal(planPath);
  let opened;
  try {
    opened = await openReadBoundToApproval(
      realPath,
      [realPath],
      permissionContext,
      getPlatform() === "macos" ? await lastExistingIdentity([realPath]) : undefined,
      "refused",
    );
  } catch (error) {
    if (error instanceof SymlinkReadRefusedError) throw openedFileMismatch(planPath);
    throw error;
  }
  let handle = opened.handle;
  let contents;
  try {
    let stats_2 = await handle.stat({
      bigint: true,
    });
    if (!stats_2.isFile()) throw Error("write_files: localPath must be a regular file.");
    if (stats_2.nlink > 1n) throw hardLinkRefusal(planPath);
    if (didInodeChange(stats, stats_2)) throw openedFileMismatch(planPath);
    if (getPlatform() === "linux" || getPlatform() === "wsl") {
      let fdPath = await readFdTargetPath(handle.fd).catch(() => null);
      if (fdPath !== undefined && fdPath !== realPath) throw openedFileMismatch(planPath);
    }
    if (stats_2.size > BigInt(MAX_LOCAL_FILE_BYTES))
      throw Error(`write_files: file at localPath exceeds the ${MAX_LOCAL_FILE_BYTES} byte limit.`);
    contents = await handle.readFile();
  } finally {
    await opened.close();
  }
  let lower = extname(realPath).slice(1).toLowerCase();
  return TEXT_FILE_EXTENSIONS.has(lower)
    ? {
        path: planPath,
        data: contents.toString("utf8"),
        mimeType: file.mimeType,
      }
    : {
        path: planPath,
        data: contents.toString("base64"),
        encoding: "base64",
        mimeType: file.mimeType,
      };
}
//@ chunk-zevfa8jm.js:34618-39358 placement
async function runDesignSyncMethod(session, input, credentials, signal, getPermissionContext) {
  let file = planPathProblem(input);
  if (file !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      file,
      "DesignSync: a file name that the server can't keep",
    );
  switch (input.method) {
    case "list_projects": {
      let { items } = await listOrgProjects(
        credentials,
        {
          type: PROJECT_TYPE_DESIGN_SYSTEM,
        },
        signal,
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
      let projectId = requireField(input.projectId, "projectId", input.method);
      let designProject = await getDesignProject(credentials, projectId, signal);
      let projectIdValue = {
        method: "get_project",
        projectId: designProject.projectId,
        name: designProject.name,
        type: designProject.type,
        ownerDisplayName: designProject.ownerDisplayName,
        isOwned: designProject.isOwned,
        canEdit: designProject.callerCanEdit ?? designProject.canEdit,
      };
      if (designProject.type !== PROJECT_TYPE_DESIGN_SYSTEM) return projectIdValue;
      if (designProject.moveState === "MOVE_STATE_MOVING")
        return {
          ...projectIdValue,
          moveState: "moving",
          notice: PREVIEW_FORMAT_MAP.moving,
        };
      if (designProject.moveState === "MOVE_STATE_MOVED") {
        let project = await getProjectArtifactExport(
          credentials,
          projectId,
          AbortSignal.any([signal, AbortSignal.timeout(MAX_UPLOAD_BYTES)]),
        ).catch((error) => {
          if (!signal.aborted)
            logForDebugging(
              `DesignSync could not read where the moved design system went, so its notice has no link: ${redactOAuthToken(errorMessage(error), credentials)}`,
              {
                level: "error",
              },
            );
          return;
        });
        if (signal.aborted) throw new AbortError();
        return {
          ...projectIdValue,
          moveState: "moved",
          notice: project
            ? `${PREVIEW_FORMAT_MAP.moved} ${PREVIEW_FORMAT_MAP.openInClaude} ${project}`
            : PREVIEW_FORMAT_MAP.moved,
        };
      }
      return projectIdValue;
    }
    case "list_files": {
      let projectId = requireField(input.projectId, "projectId", input.method);
      return {
        method: "list_files",
        paths: await listDesignFiles(credentials, projectId, signal),
      };
    }
    case "get_file": {
      let projectId = requireField(input.projectId, "projectId", input.method);
      let path = requireField(input.path, "path", input.method);
      let designFile = await getDesignFile(credentials, projectId, path, undefined, signal);
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
      let projectId = requireField(input.projectId, "projectId", input.method);
      let writes = requireField(input.writes, "writes", input.method).map(normalizePattern);
      let deletes = requireField(input.deletes, "deletes", input.method).map(normalizePattern);
      let localDir = await realpathFromCwd(input.localDir);
      return {
        method: "finalize_plan",
        planId: registerDesignPlan(session, {
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
      let projectId = requireField(input.projectId, "projectId", input.method);
      let planId = requireField(input.planId, "planId", input.method);
      let inputFiles = requireField(input.files, "files", input.method);
      let planByToken = getPlanByToken(session, planId);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let mapped = inputFiles
        .map((file) => file.path)
        .filter(isReservedDesignPath)
        .map(storedVersusTyped);
      if (mapped.length > 0)
        throw Error(
          `Cannot write reserved paths: ${mapped.join(", ")}. CLAUDE.md and .claude/ carry instructions to the design agent and are blocked regardless of the plan.`,
        );
      let filtered = inputFiles
        .map((file) => file.path)
        .filter((writePath) => !pathMatchesAny(writePath, planByToken.writes));
      if (filtered.length > 0)
        throw Error(
          `Cannot write paths outside the finalized plan: ${filtered.map(storedVersusTyped).join(", ")}. ${planPathsRetyped(filtered)}`,
        );
      let batchSize = 32;
      let files = [];
      for (let offset = 0; offset < inputFiles.length; offset += batchSize) {
        if (signal.aborted) throw new AbortError();
        let sliced = inputFiles.slice(offset, offset + batchSize);
        let batchResult = await raceWithAbortSignal(
          Promise.allSettled(
            sliced.map((file) =>
              readLocalFileForUpload(file, planByToken.localDir, signal, getPermissionContext),
            ),
          ),
          signal,
          () => new AbortError(),
        );
        for (let settled of batchResult) {
          if (settled.status === "rejected") throw settled.reason;
          files.push(settled.value);
        }
      }
      return {
        method: "write_files",
        written: (await writeDesignFiles(credentials, projectId, files, {}, signal)).length,
      };
    }
    case "delete_files": {
      let projectId = requireField(input.projectId, "projectId", input.method);
      let planId = requireField(input.planId, "planId", input.method);
      let deletePaths = requireField(input.paths, "paths", input.method);
      let planByToken = getPlanByToken(session, planId);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let mapped = deletePaths.filter(isReservedDesignPath).map(storedVersusTyped);
      if (mapped.length > 0)
        throw Error(
          `Cannot delete reserved paths: ${mapped.join(", ")}. CLAUDE.md and .claude/ carry instructions to the design agent and are blocked regardless of the plan.`,
        );
      let filtered = deletePaths.filter((deletePath) => !pathMatchesAny(deletePath, planByToken.deletes));
      if (filtered.length > 0)
        throw Error(
          `Cannot delete paths outside the finalized plan: ${filtered.map(storedVersusTyped).join(", ")}. ${planPathsRetyped(filtered)}`,
        );
      return {
        method: "delete_files",
        deleted: await deleteDesignFiles(
          credentials,
          projectId,
          normalizeCaseForComparison_2(deletePaths.map(planPathKey)),
          signal,
        ),
      };
    }
    case "register_assets": {
      let projectId = requireField(input.projectId, "projectId", input.method);
      let planId = requireField(input.planId, "planId", input.method);
      let assets = requireField(input.assets, "assets", input.method);
      let planByToken = getPlanByToken(session, planId);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = assets
        .map((asset) => asset.path)
        .filter((assetPath) => !pathMatchesAny(assetPath, planByToken.writes));
      if (filtered.length > 0)
        throw Error(
          `Cannot register paths outside the finalized plan: ${filtered.map(storedVersusTyped).join(", ")}. ${planPathsRetyped(filtered)}`,
        );
      let registered = 0;
      for (let asset of assets) {
        if (signal.aborted) throw new AbortError();
        await recordDesignAsset(
          credentials,
          projectId,
          {
            ...asset,
            path: planPathKey(asset.path),
          },
          signal,
        );
        registered++;
      }
      return {
        method: "register_assets",
        registered,
      };
    }
    case "unregister_assets": {
      let projectId = requireField(input.projectId, "projectId", input.method);
      let planId = requireField(input.planId, "planId", input.method);
      let paths = requireField(input.paths, "paths", input.method);
      let planByToken = getPlanByToken(session, planId);
      if (!planByToken || planByToken.projectId !== projectId)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = paths.filter((assetPath) => !pathMatchesAny(assetPath, planByToken.deletes));
      if (filtered.length > 0)
        throw Error(
          `Cannot unregister cards for paths outside the finalized plan's deletes: ${filtered.map(storedVersusTyped).join(", ")}. ${planPathsRetyped(filtered)}`,
        );
      let unregistered = 0;
      for (let assetPath of normalizeCaseForComparison_2(paths.map(planPathKey))) {
        if (signal.aborted) throw new AbortError();
        await deleteDesignAsset(credentials, projectId, assetPath, signal);
        unregistered++;
      }
      return {
        method: "unregister_assets",
        unregistered,
      };
    }
    case "create_project": {
      let name = requireField(input.name, "name", input.method);
      let designProject = await createDesignProject(credentials, name, signal);
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
export { DesignSyncTool };
