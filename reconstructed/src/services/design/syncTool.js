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
import { zodStrictObject, o, U, E, A, u, Ir, T, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  GBt,
  DesignGateState,
  XL,
  WBt,
  registerDesignPlan,
  EYn,
  isReservedDesignPath,
  pathMatchesAny,
} from "../mcp/designPlanGate.js";
import { v_n, DESIGNSYNC, UW, buildDesignSyncPrompt } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import {
  uploadPlanTitle,
  syncApprovalSummary,
  buildSyncApprovalQuestion,
  Ie,
  syncApprovalLines,
  WRITE_GRANT_NOTE,
  REVIEW_UPLOAD_NOTE,
  Ee,
  NEW_PROJECT_NOTE,
} from "./syncApprovalDialog.js";
import { count } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import {
  needsDesignLogin,
  XFt,
  DesignAuthError,
  Dan,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  recordDesignConsent,
  setDesignConsent,
  me,
  listOrgProjects,
  PROJECT_TYPE_DESIGN_SYSTEM,
  ae,
  listDesignFiles,
  getDesignFile,
  writeDesignFiles,
  deleteDesignFiles,
  recordDesignAsset,
  ue,
  createDesignProject,
} from "./designApi.js";
import { runDesignLogin, isDesignOAuthConfigured, isRemoteEnvironment } from "../oauth/designOAuth.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { l4e } from "../../utils/featureAvailability.js";
import { getCwd } from "../../utils/cwd.js";
import {
  errorMessage,
  AbortError,
  withTelemetryMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify, Kwr } from "../../utils/slowOperations.js";
import { layeredReadVerdictForPaths } from "../../utils/permissions/filesystem.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { Ope, B$e, isCredentialConfigPath, j$e } from "../../utils/permissions/sensitivePaths.js";
import {
  statChain,
  openReadBoundToApproval,
  lastExistingIdentity,
  cQt,
} from "../../utils/fsSafety/pathRevalidation.js";
import { getPlatform } from "../../utils/platform.js";
import { SymlinkReadRefusedError } from "../../utils/fsSafety/atomicWriteStaging.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";

//@ chunk-98n6ge4d.js:12747-17170 placement
var designSyncInputSchema = DoctorLazy(() =>
    zodStrictObject({
      path: o().min(1).max(GBt).describe("Path within the project, e.g. components/button/index.html"),
      localPath: o()
        .min(1)
        .optional()
        .describe(
          "Path on disk to read file contents from, relative to the localDir approved at finalize_plan. Preferred for anything you have on disk: the tool reads, encodes, and uploads directly so the contents never enter the model context. Mutually exclusive with data.",
        ),
      data: o()
        .optional()
        .describe(
          "Inline file contents (UTF-8 text, or base64 when encoding is " +
            '"base64"). For small dynamic content only \u2014 anything you have on ' +
            "disk should use localPath instead.",
        ),
      encoding: U(["base64"]).optional().describe('Set to "base64" for binary inline data'),
      mimeType: o().optional(),
    }),
  ),
  Xe = DoctorLazy(() =>
    zodStrictObject({
      name: o().min(1).max(255).describe('Short human-readable label ("Primary buttons"), not a path'),
      path: o().min(1).max(GBt).describe("Project-relative path to the preview/spec file this card renders"),
      subtitle: o().max(255).optional().describe('Variants shown ("Primary / secondary / ghost, 3 sizes")'),
      viewport: zodStrictObject({ width: E().int().positive(), height: E().int().positive().optional() })
        .optional()
        .describe("Card dimensions in the Design System pane"),
      group: o()
        .max(64)
        .optional()
        .describe(
          "Free-form section label for the Design System pane (max 64 chars). " +
            "Use the source design system's own categorization if it has one \u2014 " +
            'e.g. Material has Buttons/Cards/Forms/etc., a corporate kit might have Actions/Forms/Navigation. Common foundational labels: "Type", "Colors", "Spacing", "Components", "Brand". The pane groups by the value you send.',
        ),
    }),
  ),
  Qe = DoctorLazy(() =>
    zodStrictObject({
      method: U(v_n),
      projectId: o()
        .min(1)
        .optional()
        .describe("Required for all methods except list_projects and create_project"),
      path: o().min(1).optional().describe("get_file: file path to read"),
      writes: A(o().min(1).max(GBt))
        .max(256)
        .optional()
        .describe(
          "finalize_plan: exact paths or glob patterns that will be written. `*` matches within a single segment, `**` matches any depth (e.g. `ui_kits/acme/**/*.html`). Max 3 `*`/`**` wildcards per " +
            "pattern and max 256 entries \u2014 use broader globs to cover more " +
            "files rather than enumerating paths.",
        ),
      deletes: A(o().min(1).max(GBt))
        .max(256)
        .optional()
        .describe(
          "finalize_plan: exact paths or glob patterns that will be deleted (same syntax and limits as writes).",
        ),
      planId: o()
        .min(1)
        .optional()
        .describe(
          "write_files/delete_files/register_assets/unregister_assets: token from a prior finalize_plan call",
        ),
      files: A(designSyncInputSchema())
        .max(256)
        .optional()
        .describe(
          "write_files: file contents to write (max 256 per call \u2014 split " +
            "larger bundles across multiple write_files calls under the same planId).",
        ),
      paths: A(o().min(1).max(GBt))
        .max(256)
        .optional()
        .describe(
          "delete_files: paths to delete. unregister_assets: paths whose " +
            "Design System pane card should be removed. Max 256 per call \u2014 " +
            "split larger batches across multiple calls under the same planId.",
        ),
      name: o().min(1).max(200).optional().describe("create_project: name for the new design-system project"),
      assets: A(Xe())
        .max(256)
        .optional()
        .describe(
          "register_assets: cards to register in the Design System pane. Each path must be in the finalized plan. Run after write_files succeeds. Max 256 per call.",
        ),
      localDir: o()
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
  ),
  Ke = {
    list_projects: { present: [], nonEmpty: [] },
    get_project: { present: ["projectId"], nonEmpty: [] },
    list_files: { present: ["projectId"], nonEmpty: [] },
    get_file: { present: ["projectId", "path"], nonEmpty: [] },
    finalize_plan: { present: ["projectId", "writes", "deletes"], nonEmpty: [] },
    write_files: { present: ["projectId", "planId"], nonEmpty: ["files"] },
    delete_files: { present: ["projectId", "planId"], nonEmpty: ["paths"] },
    register_assets: { present: ["projectId", "planId"], nonEmpty: ["assets"] },
    unregister_assets: { present: ["projectId", "planId"], nonEmpty: ["paths"] },
    create_project: { present: ["name"], nonEmpty: [] },
    report_validate: { present: ["counts"], nonEmpty: [] },
  };
//@ chunk-98n6ge4d.js:17170-17350 placement
function missingRequiredFields(e) {
  let n = Ke[e.method],
    filtered = n.present.filter((i) => e[i] === void 0),
    filtered_2 = n.nonEmpty.filter((i) => {
      let a = e[i];
      return a === void 0 || (Array.isArray(a) && a.length === 0);
    });
  return [...filtered, ...filtered_2];
}
/**
 * Design 同步工具各方法的输出结构（列项目、读项目、列文件、读文件、提交计划、写/删文件、资源登记、建项目等）。
 */
//@ chunk-98n6ge4d.js:17350-18234 placement
var NOTICE_FIELD = { notice: o().optional() },
  DESIGN_SYNC_OUTPUT_SCHEMA = DoctorLazy(() =>
    Ir("method", [
      u({
        method: T("list_projects"),
        ...NOTICE_FIELD,
        projects: A(
          u({
            projectId: o(),
            name: o(),
            ownerDisplayName: o().optional(),
            isOwned: M().optional(),
            updatedAt: o().optional(),
          }),
        ),
      }),
      u({
        method: T("get_project"),
        ...NOTICE_FIELD,
        projectId: o(),
        name: o(),
        type: o().optional(),
        ownerDisplayName: o().optional(),
        isOwned: M().optional(),
        canEdit: M().optional(),
      }),
      u({ method: T("list_files"), ...NOTICE_FIELD, paths: A(o()) }),
      u({
        method: T("get_file"),
        ...NOTICE_FIELD,
        path: o(),
        content: o(),
        contentType: o(),
        isBase64: M(),
        truncated: M(),
      }),
      u({ method: T("finalize_plan"), ...NOTICE_FIELD, planId: o(), writes: A(o()), deletes: A(o()) }),
      u({ method: T("write_files"), ...NOTICE_FIELD, written: E() }),
      u({ method: T("delete_files"), ...NOTICE_FIELD, deleted: E() }),
      u({ method: T("register_assets"), ...NOTICE_FIELD, registered: E() }),
      u({ method: T("unregister_assets"), ...NOTICE_FIELD, unregistered: E() }),
      u({ method: T("create_project"), ...NOTICE_FIELD, projectId: o(), name: o() }),
      u({ method: T("report_validate"), ...NOTICE_FIELD }),
    ]),
  );
//@ chunk-98n6ge4d.js:18234-18352 placement
function isReadOnlySyncMethod(e) {
  return (
    e === "list_projects" ||
    e === "get_project" ||
    e === "list_files" ||
    e === "get_file" ||
    e === "report_validate"
  );
}
//@ chunk-98n6ge4d.js:18352-18428 placement
function nt(e) {
  if (!e) return "?";
  return e.length > 12 ? `${e.slice(0, 8)}\u2026` : e;
}
/**
 * 为 Design 同步调用生成简短描述（读取、写入多少文件、删除等）。
 */
//@ chunk-98n6ge4d.js:18428-19367 placement
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
      let n = input.files?.length ?? 0,
        s = count(input.files ?? [], (i) => i.localPath !== void 0),
        r = s > 0 && s < n ? ` (${s} from disk, ${n - s} inline)` : s === n && n > 0 ? " from disk" : "";
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
/**
 * （切分错误，DesignSync）把 DesignSync 前置条件失败原因（需 /design-login、刷新失败、非 claude.ai 认证、仅必要流量）转成给用户的说明。
 */
//@ chunk-98n6ge4d.js:19367-20868 placement
function formatDesignSyncPreconditionMessage(e, n) {
  switch (e) {
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
/**
 * （切分错误）DesignSync 前置条件错误类。
 */
//@ chunk-98n6ge4d.js:20868-20955 placement
class DesignSyncPreconditionError extends Error {
  constructor(e) {
    super(e);
    this.name = "DesignSyncPreconditionError";
  }
}
//@ chunk-98n6ge4d.js:20955-21004 placement = getAutoAllowedCommands (0.728)
var DESIGN_LOGIN_AUTO_PROMPT_MODES = new Set(["default", "acceptEdits", "auto"]);
/**
 * （切分错误，DesignSync）取 design 访问令牌；需要登录且在可交互的允许模式下自动发起登录，否则抛 DesignSyncPreconditionError。
 */
//@ chunk-98n6ge4d.js:21004-21509 placement
async function getDesignSyncAccessToken(e, n) {
  let s = await needsDesignLogin(e),
    r = await XFt(e);
  if (
    !r.ok &&
    r.reason === "needs_design_login" &&
    s &&
    (n?.askReachesUserAtDecision ?? !1) &&
    !n?.isNonInteractiveSession &&
    n?.permissionMode !== void 0 &&
    DESIGN_LOGIN_AUTO_PROMPT_MODES.has(n.permissionMode)
  ) {
    let i = await runDesignLogin(n?.signal);
    if (i.ok) return i.accessToken;
    throw new DesignSyncPreconditionError(`DesignSync needs design-system authorization. ${i.message}`);
  }
  if (!r.ok) {
    let i = r.detail ? ` (${r.detail})` : "";
    throw new DesignSyncPreconditionError(
      `${formatDesignSyncPreconditionMessage(r.reason, { isNonInteractiveSession: n?.isNonInteractiveSession })}${i}`,
    );
  }
  return r.accessToken;
}
//@ chunk-98n6ge4d.js:21509-21691 placement
function readConsentNeeded(e) {
  if (!(e instanceof DesignAuthError) || e.status !== 403) return null;
  let body = e.body;
  if (body == null || typeof body !== "object" || body.error !== "needs_consent" || !Dan(body.consent))
    return null;
  return body.consent;
}
//@ chunk-98n6ge4d.js:21691-21847 placement
function canAskForApproval(e) {
  let permissions = e.permissions();
  return (
    !e.isNonInteractiveSession &&
    permissions.mode !== "bypassPermissions" &&
    !(permissions.mode === "plan" && permissions.isBypassPermissionsModeAvailable)
  );
}
/**
 * 把本地设计系统组件同步到 claude.ai/design 项目的工具。
 */
//@ chunk-98n6ge4d.js:21847-28024 placement
var DesignSyncTool = buildTool({
  name: DESIGNSYNC,
  searchHint: "sync local design system components to a claude.ai/design project",
  shouldDefer: !0,
  backgrounding: "never",
  maxResultSizeChars: 300000,
  isEnabled() {
    return UW();
  },
  async description() {
    return buildDesignSyncPrompt(l4e());
  },
  async prompt() {
    return buildDesignSyncPrompt(l4e());
  },
  get inputSchema() {
    return Qe();
  },
  get outputSchema() {
    return DESIGN_SYNC_OUTPUT_SCHEMA();
  },
  isConcurrencySafe() {
    return !1;
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
        let r = s ?? [],
          i = 50;
        if (r.length <= 50) return r.join(", ");
        return `${r.length} paths (too many to list here, so leave the decision to the user)`;
      };
      return `project ${e.projectId ?? "?"} from ${resolve(getCwd(), e.localDir ?? ".")}: write ${n(e.writes)}; delete ${n(e.deletes)}`;
    }
    if (e.method === "create_project") return `create project "${e.name ?? "?"}"`;
    return e.method;
  },
  renderToolUseMessage(e, { verbose: n }) {
    let s = n ? syncApprovalSummary(e) : void 0;
    if (s !== void 0) return s;
    if (e.method === "finalize_plan") return nt(e.projectId);
    return describeSyncCall(e);
  },
  permissionCard(e, n, s) {
    return buildSyncApprovalQuestion(e, s);
  },
  create(e) {
    return {
      async validateInput(n) {
        let s = missingRequiredFields(n);
        if (s.length > 0)
          return { result: !1, message: `${n.method} requires: ${s.join(", ")}.`, errorCode: 1 };
        if (n.method === "create_project" && n.name !== void 0 && !Ie(n.name))
          return {
            result: !1,
            message:
              "create_project: the person approving must be able to read the project's name, and this one can't be shown in full. Choose a name with ordinary spaces and no tabs, line breaks or stacked accents.",
            errorCode: 1,
          };
        if (n.method === "finalize_plan" && (n.writes?.length ?? 0) === 0 && (n.deletes?.length ?? 0) === 0)
          return {
            result: !1,
            message: "finalize_plan needs at least one write or delete path.",
            errorCode: 1,
          };
        if (n.method === "write_files")
          for (let r of n.files ?? []) {
            let i = r.data !== void 0,
              a = r.localPath !== void 0;
            if (i === a)
              return {
                result: !1,
                message: `Each file needs exactly one of "data" or "localPath" (offending path: ${r.path}).`,
                errorCode: 1,
              };
            if (a && r.encoding !== void 0)
              return {
                result: !1,
                message: `"encoding" only applies to inline "data"; localPath files are encoded automatically (offending path: ${r.path}).`,
                errorCode: 1,
              };
          }
        return { result: !0 };
      },
      async checkPermissions(n) {
        let s = await checkDesignConsent(e.toolState.get(DesignGateState), e.credentials),
          r = { ...n, __consentBitShown: s, __consentAskCanReachUser: canAskForApproval(e) },
          i = s !== null ? DESIGN_CONSENT_PROMPT(s) : null,
          a =
            (await needsDesignLogin(e.credentials)) && isDesignOAuthConfigured() && !isRemoteEnvironment()
              ? "DesignSync needs design-system authorization for your claude.ai account. Approving opens your browser to authorize " +
                "access to your org's design-system projects \u2014 this session's " +
                "own authentication is not changed."
              : null,
          c =
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
            localDisplayOnly: !0,
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
              classifierApprovable: !1,
            },
          };
        if (n.method === "finalize_plan") {
          let l;
          try {
            l = await Oe(n.localDir);
          } catch (error) {
            return {
              behavior: "deny",
              message: `localDir does not exist or is not accessible: ${n.localDir ?? getCwd()} (${errorMessage(error)})`,
              decisionReason: { type: "safetyCheck", reason: "localDir not found", classifierApprovable: !1 },
            };
          }
          let filtered = (n.writes ?? []).map(XL).filter((j) => !WBt(j)),
            results = await Promise.all(
              filtered.map(async (j) => {
                try {
                  return (await stat(resolve(l, j)), !0);
                } catch {
                  return !1;
                }
              }),
            ),
            filtered_2 = filtered.filter((j, Y) => !results[Y]),
            v =
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
            updatedInput: { ...r, localDir: l },
            localDisplayOnly: !0,
            decisionReason: {
              type: "safetyCheck",
              reason: c ? WRITE_GRANT_NOTE : REVIEW_UPLOAD_NOTE,
              classifierApprovable: !1,
            },
          };
        }
        if (n.method === "create_project")
          return {
            behavior: "ask",
            message: [c, ...Ee(n.name ?? "?")].filter((l) => l !== null).join(`
`),
            updatedInput: r,
            localDisplayOnly: !0,
            decisionReason: {
              type: "safetyCheck",
              reason: c ? WRITE_GRANT_NOTE : NEW_PROJECT_NOTE,
              classifierApprovable: !1,
            },
          };
        return { behavior: "allow", updatedInput: r };
      },
      async call(n, s) {
        let signal = s.signal;
        if (n.method === "report_validate") return { data: { method: "report_validate" } };
        let i = e.toolState.get(DesignGateState),
          a = n.__consentBitShown ?? null,
          permissions = e.permissions(),
          l = n.__consentAskCanReachUser ?? !1,
          h = l && canAskForApproval(e),
          g = "";
        try {
          if (
            ((g = await getDesignSyncAccessToken(e.credentials, {
              signal: signal,
              isNonInteractiveSession: e.isNonInteractiveSession,
              permissionMode: permissions.mode,
              askReachesUserAtDecision: l,
            })),
            a !== null && h && n.method === "finalize_plan")
          )
            await recordDesignConsent(i, a, e.credentials).catch((m) => {
              logForDebugging(
                `Proactive design consent POST for finalize_plan failed (${errorMessage(m)}); the next RPC call's 403 intercept will retry.`,
              );
            });
          let f;
          try {
            if (
              ((f = await runDesignSyncMethod(i, n, g, signal, e.permissions)),
              a !== null && n.method !== "finalize_plan")
            )
              setDesignConsent(i, a, !0);
          } catch (error) {
            let y = readConsentNeeded(error);
            if (y === null) {
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
            } else if (y !== a)
              throw (
                setDesignConsent(i, y, !1),
                new DesignSyncPreconditionError(
                  `${DESIGN_CONSENT_PROMPT(y)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
                )
              );
            else if (!h)
              throw (
                setDesignConsent(i, y, !1),
                new DesignSyncPreconditionError(
                  `${DESIGN_CONSENT_PROMPT(y)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
                )
              );
            else
              (await recordDesignConsent(i, y, e.credentials),
                (f = await runDesignSyncMethod(i, n, g, signal, e.permissions)));
          }
          return { data: f };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          let m = me(errorMessage(error), g),
            y = error?.telemetryMessage,
            v = typeof y === "string" ? y : "DesignSync tool call failed";
          if (error instanceof DesignSyncPreconditionError)
            throw withTelemetryMessage(new DesignSyncPreconditionError(m), v);
          throw withTelemetryMessage(Error(m), v);
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, n) {
    return { tool_use_id: n, type: "tool_result", content: jsonStringify(e) };
  },
});
//@ chunk-98n6ge4d.js:28024-28101 placement
function b(e, n, s) {
  if (e === void 0) throw Error(`${s} requires "${n}"`);
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
  ]),
  MAX_LOCAL_FILE_BYTES = 12582912;
//@ chunk-98n6ge4d.js:28246-28293 placement
async function Oe(e) {
  return realpath(resolve(getCwd(), e ?? "."));
}
/**
 * 检查 write_files 的本地路径能否在不询问用户的情况下读取，否则抛出前置条件错误。
 */
//@ chunk-98n6ge4d.js:28293-29003 placement
function assertReadableWithoutAsking(path, displayPath, permissionContext) {
  let r = layeredReadVerdictForPaths([path], permissionContext, { refuseAutomounterShapes: !0 });
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
/**
 * 拒绝读取凭证文件、设备或 Claude Code 自己的配置与令牌文件作为上传来源。
 */
//@ chunk-98n6ge4d.js:29003-29386 placement
async function assertNotProtectedFile(e, n, s) {
  if ((await Ope(e, n)) || [e, n].some((r) => B$e(r) || isCredentialConfigPath(r)))
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
/**
 * 构造"打开的文件不是检查过的那个文件"的错误。
 */
//@ chunk-98n6ge4d.js:29683-30122 placement
function openedFileMismatch(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `write_files: the file at the localPath for ${e} could not be opened as the file that was checked (it may have been moved or replaced, or the system would not say which file was opened), so it was not read. Nothing in this call was uploaded. Try the call once more; if it fails again, stop and ask the user how to proceed.`,
    "write_files: the file at localPath could not be opened as the file that was checked",
  );
}
/**
 * 准备 write_files 的单个文件：只有内联 data 时直接返回；有 localPath 时校验在已批准目录内、长度、非受保护/凭证文件、可无需询问读取、真实路径仍在目录内、不是硬链接、打开的正是检查过的文件、大小上限，然后按扩展名以 utf8 或 base64 读入。
 */
//@ chunk-98n6ge4d.js:30122-32516 placement
async function readLocalFileForUpload(file, approvedDir, permissionContext, getPermissionContext) {
  let i = XL(file.path);
  if (file.localPath === void 0) {
    if (file.data === void 0) throw Error(`write_files: ${i} has neither data nor localPath`);
    return { path: i, data: file.data, encoding: file.encoding, mimeType: file.mimeType };
  }
  if (file.data !== void 0) throw Error(`write_files: ${i} has both data and localPath`);
  if (approvedDir === void 0)
    throw Error(
      "write_files with localPath requires a plan finalized with localDir. Re-run finalize_plan with the bundle directory.",
    );
  let a = (w) => (w.endsWith(sep) ? w : w + sep),
    c = resolve(approvedDir),
    l = resolve(c, file.localPath);
  if (l !== c && !l.startsWith(a(c)))
    throw Error("write_files: localPath must be inside the directory approved at finalize_plan.");
  if (l.length > j$e)
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the full path of the localPath for ${i} is longer than ${j$e} characters, so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is too long`,
    );
  (await assertNotProtectedFile(l, l, i), assertReadableWithoutAsking(l, i, getPermissionContext()));
  let h = await realpath(l);
  if (h !== c && !h.startsWith(a(c))) {
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
  if ((await assertNotProtectedFile(l, h, i), h !== l))
    assertReadableWithoutAsking(h, i, getPermissionContext());
  let g = await statChain(h);
  if (g === void 0)
    throw withTelemetryMessage(
      new DesignSyncPreconditionError(
        `write_files: the localPath for ${i} is not a regular file, or it was moved or replaced while it was checked, so it was not read. Nothing in this call was uploaded. Stop and ask the user how to proceed.`,
      ),
      `${DESIGNSYNC} localPath is not a regular file`,
    );
  if (g.nlink > 1n) throw hardLinkRefusal(i);
  let f;
  try {
    f = await openReadBoundToApproval(
      h,
      [h],
      permissionContext,
      getPlatform() === "macos" ? await lastExistingIdentity([h]) : void 0,
      "refused",
    );
  } catch (error) {
    if (error instanceof SymlinkReadRefusedError) throw openedFileMismatch(i);
    throw error;
  }
  let handle = f.handle,
    y;
  try {
    let stats = await handle.stat({ bigint: !0 });
    if (!stats.isFile()) throw Error("write_files: localPath must be a regular file.");
    if (stats.nlink > 1n) throw hardLinkRefusal(i);
    if (Kwr(g, stats)) throw openedFileMismatch(i);
    if (getPlatform() === "linux" || getPlatform() === "wsl") {
      let j = await cQt(handle.fd).catch(() => null);
      if (j !== void 0 && j !== h) throw openedFileMismatch(i);
    }
    if (stats.size > BigInt(MAX_LOCAL_FILE_BYTES))
      throw Error(`write_files: file at localPath exceeds the ${MAX_LOCAL_FILE_BYTES} byte limit.`);
    y = await handle.readFile();
  } finally {
    await f.close();
  }
  let lower = extname(h).slice(1).toLowerCase();
  return TEXT_FILE_EXTENSIONS.has(lower)
    ? { path: i, data: y.toString("utf8"), mimeType: file.mimeType }
    : { path: i, data: y.toString("base64"), encoding: "base64", mimeType: file.mimeType };
}
//@ chunk-98n6ge4d.js:32516-36768 placement
async function runDesignSyncMethod(e, n, s, r, i) {
  switch (n.method) {
    case "list_projects": {
      let { items: items } = await listOrgProjects(s, { type: PROJECT_TYPE_DESIGN_SYSTEM }, r);
      return {
        method: "list_projects",
        projects: items
          .filter((l) => l.callerCanEdit ?? l.canEdit ?? (l.isOwned || l.sharing?.teamCanEdit) ?? !1)
          .map((l) => ({
            projectId: l.projectId,
            name: l.name,
            ownerDisplayName: l.ownerDisplayName,
            isOwned: l.isOwned,
            updatedAt: l.updatedAt,
          })),
      };
    }
    case "get_project": {
      let a = b(n.projectId, "projectId", n.method),
        c = await ae(s, a, r);
      return {
        method: "get_project",
        projectId: c.projectId,
        name: c.name,
        type: c.type,
        ownerDisplayName: c.ownerDisplayName,
        isOwned: c.isOwned,
        canEdit: c.callerCanEdit ?? c.canEdit,
      };
    }
    case "list_files": {
      let a = b(n.projectId, "projectId", n.method);
      return { method: "list_files", paths: await listDesignFiles(s, a, r) };
    }
    case "get_file": {
      let a = b(n.projectId, "projectId", n.method),
        c = b(n.path, "path", n.method),
        l = await getDesignFile(s, a, c, void 0, r);
      return {
        method: "get_file",
        path: c,
        content: l.content,
        contentType: l.contentType,
        isBase64: l.isBase64,
        truncated: l.truncated,
      };
    }
    case "finalize_plan": {
      let a = b(n.projectId, "projectId", n.method),
        mapped = b(n.writes, "writes", n.method).map(XL),
        mapped_2 = b(n.deletes, "deletes", n.method).map(XL),
        h = await Oe(n.localDir);
      return {
        method: "finalize_plan",
        planId: registerDesignPlan(e, { projectId: a, writes: mapped, deletes: mapped_2, localDir: h }),
        writes: mapped,
        deletes: mapped_2,
      };
    }
    case "write_files": {
      let a = b(n.projectId, "projectId", n.method),
        c = b(n.planId, "planId", n.method),
        l = b(n.files, "files", n.method),
        h = EYn(e, c);
      if (!h || h.projectId !== a)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.map((w) => w.path).filter(isReservedDesignPath);
      if (filtered.length > 0)
        throw Error(
          `Cannot write reserved paths: ${filtered.join(", ")}. CLAUDE.md and .claude/ carry instructions to the design agent and are blocked regardless of the plan.`,
        );
      let filtered_2 = l.map((w) => XL(w.path)).filter((w) => !pathMatchesAny(w, h.writes));
      if (filtered_2.length > 0)
        throw Error(
          `Cannot write paths outside the finalized plan: ${filtered_2.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      let m = 32,
        y = [];
      for (let w = 0; w < l.length; w += m) {
        if (r.aborted) throw new AbortError();
        let sliced = l.slice(w, w + m),
          Y = await raceWithAbortSignal(
            Promise.allSettled(sliced.map((k) => readLocalFileForUpload(k, h.localDir, r, i))),
            r,
            () => new AbortError(),
          );
        for (let k of Y) {
          if (k.status === "rejected") throw k.reason;
          y.push(k.value);
        }
      }
      return { method: "write_files", written: (await writeDesignFiles(s, a, y, {}, r)).length };
    }
    case "delete_files": {
      let a = b(n.projectId, "projectId", n.method),
        c = b(n.planId, "planId", n.method),
        l = b(n.paths, "paths", n.method),
        h = EYn(e, c);
      if (!h || h.projectId !== a)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.filter(isReservedDesignPath);
      if (filtered.length > 0)
        throw Error(
          `Cannot delete reserved paths: ${filtered.join(", ")}. CLAUDE.md and .claude/ carry instructions to the design agent and are blocked regardless of the plan.`,
        );
      let filtered_2 = l.map(XL).filter((y) => !pathMatchesAny(y, h.deletes));
      if (filtered_2.length > 0)
        throw Error(
          `Cannot delete paths outside the finalized plan: ${filtered_2.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      return { method: "delete_files", deleted: await deleteDesignFiles(s, a, l.map(XL), r) };
    }
    case "register_assets": {
      let a = b(n.projectId, "projectId", n.method),
        c = b(n.planId, "planId", n.method),
        l = b(n.assets, "assets", n.method),
        h = EYn(e, c);
      if (!h || h.projectId !== a)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.map((m) => XL(m.path)).filter((m) => !pathMatchesAny(m, h.writes));
      if (filtered.length > 0)
        throw Error(
          `Cannot register paths outside the finalized plan: ${filtered.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      let f = 0;
      for (let m of l) {
        if (r.aborted) throw new AbortError();
        (await recordDesignAsset(s, a, { ...m, path: XL(m.path) }, r), f++);
      }
      return { method: "register_assets", registered: f };
    }
    case "unregister_assets": {
      let a = b(n.projectId, "projectId", n.method),
        c = b(n.planId, "planId", n.method),
        l = b(n.paths, "paths", n.method),
        h = EYn(e, c);
      if (!h || h.projectId !== a)
        throw Error("Plan token is missing or does not match this project. Call finalize_plan first.");
      let filtered = l.map(XL).filter((m) => !pathMatchesAny(m, h.deletes));
      if (filtered.length > 0)
        throw Error(
          `Cannot unregister cards for paths outside the finalized plan's deletes: ${filtered.join(", ")}. Re-run finalize_plan with the full set.`,
        );
      let f = 0;
      for (let m of l.map(XL)) {
        if (r.aborted) throw new AbortError();
        (await ue(s, a, m, r), f++);
      }
      return { method: "unregister_assets", unregistered: f };
    }
    case "create_project": {
      let a = b(n.name, "name", n.method),
        c = await createDesignProject(s, a, r);
      return { method: "create_project", projectId: c.projectId, name: c.name };
    }
    case "report_validate":
      return { method: "report_validate" };
  }
}
