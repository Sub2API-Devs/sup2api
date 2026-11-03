/**
 * tools/DesignTool/DesignTool.ts
 *
 * 2.1.316 新增：Claude Design 工具：操作目录（只读/破坏性属性）、输入 schema、调用与结果转换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-171dhyhe.js (27)
 * attribution: placement 27
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, o, oe, M, zodStrictObject, pe, u, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getClientPlatform } from "../../utils/http.js";
import { LIST, CLAUDE_DESIGN_TOOL_NAME, T$o } from "../ClaudeDesignTool/constants.js";
import { hasHookForEvent } from "../../utils/hooks.js";
import {
  XFt,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  checkDesignGrant,
  setDesignConsent,
  X1s,
  recordDesignProjectGrant,
  recordDesignConsent,
} from "../../services/design/designApi.js";
import {
  callDesignOperation,
  DesignAuth401Error,
  DesignNeedsScopesError,
  DesignNeedsProjectGrantError,
  DesignNeedsConsentError,
} from "./errors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  classifyAxiosError,
} from "../../utils/errors.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isDesignSyncEnabled } from "../../services/designSync/gates.js";
import { l4e } from "../../utils/featureAvailability.js";
import {
  MAX_PLAN_PATH_CHARS,
  DesignGateState,
  checkPlanGatedTargets,
  projectsFitOnCard,
  checkDesignPlanToken,
  qAe,
  vYn,
  Uze,
  vzs,
  clearApprovedPlans,
  $ze,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  F_t,
  readPlanTokenFromResult,
  approveDesignPlan,
} from "../../services/mcp/designPlanGate.js";
import { designCredentialErrorMessage } from "./designMcpClient.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { handleDesignAuth401 } from "./_new/handleDesignAuth401.js";
import { isBase64ImageBlock_2 } from "../../utils/imageValidation.js";

//@ chunk-171dhyhe.js:12468-12517 placement
function x(e) {
  return Buffer.byteLength(e, "utf8");
}
/**
 * Claude Design 操作目录：每个操作的 readOnly/destructive 属性（list_design_systems、get_project、write_files、delete_files、finalize_plan…）。
 */
//@ chunk-171dhyhe.js:12517-15493 placement
var DESIGN_OPERATION_TRAITS = {
    list_design_systems: { readOnly: !0, destructive: !1 },
    get_claude_design_prompt: { readOnly: !0, destructive: !1 },
    list_projects: { readOnly: !0, destructive: !1 },
    get_project: { readOnly: !0, destructive: !1 },
    list_files: { readOnly: !0, destructive: !1 },
    read_file: { readOnly: !0, destructive: !1 },
    get_conversation: { readOnly: !0, destructive: !1 },
    list_members: { readOnly: !0, destructive: !1 },
    render_preview: { readOnly: !1, destructive: !1 },
    create_project: { readOnly: !1, destructive: !1 },
    put_conversation: { readOnly: !1, destructive: !1 },
    finalize_plan: { readOnly: !1, destructive: !1 },
    write_files: { readOnly: !1, destructive: !1 },
    copy_files: { readOnly: !1, destructive: !1 },
    create_support_js: { readOnly: !1, destructive: !1 },
    add_member: { readOnly: !1, destructive: !1 },
    delete_files: { readOnly: !1, destructive: !0 },
    remove_member: { readOnly: !1, destructive: !0 },
    update_member_role: { readOnly: !1, destructive: !0 },
    update_sharing: { readOnly: !1, destructive: !0 },
  },
  q = {
    create_project: { top: new Set(["name", "design_system_id"]) },
    put_conversation: {
      top: new Set(["project_id", "title", "messages"]),
      arrays: { messages: { fields: new Set(["role", "content"]), required: new Set(["role", "content"]) } },
    },
    finalize_plan: {
      top: new Set(["project_id", "writes", "deletes", "scope"]),
      arrays: { writes: "string", deletes: "string" },
      scalarEnums: { scope: new Set(["paths", "project"]) },
    },
    write_files: {
      top: new Set(["project_id", "plan_token", "files"]),
      arrays: {
        files: {
          fields: new Set(["path", "data", "local_path", "encoding", "if_match"]),
          required: new Set(["path"]),
        },
      },
    },
    delete_files: {
      top: new Set(["project_id", "plan_token", "paths", "files"]),
      arrays: {
        paths: "string",
        files: { fields: new Set(["path", "if_match"]), required: new Set(["path"]) },
      },
    },
    copy_files: {
      top: new Set(["project_id", "plan_token", "files"]),
      arrays: {
        files: {
          fields: new Set(["src", "dest", "src_project_id", "if_match"]),
          required: new Set(["src", "dest"]),
        },
      },
    },
    render_preview: {
      top: new Set(["project_id", "path", "render", "validators"]),
      arrays: { validators: "string" },
    },
    create_support_js: { top: new Set(["project_id", "plan_token", "path", "if_match"]) },
    add_member: {
      top: new Set(["project_id", "account_uuid", "email", "role"]),
      scalarEnums: { role: { accepts: new Set(["viewer", "commenter", "editor"]), serverNormalizes: !0 } },
    },
    update_member_role: {
      top: new Set(["project_id", "account_uuid", "role"]),
      scalarEnums: { role: { accepts: new Set(["viewer", "commenter", "editor"]), serverNormalizes: !0 } },
    },
    remove_member: { top: new Set(["project_id", "account_uuid"]) },
    update_sharing: {
      top: new Set(["project_id", "scope", "link_permission"]),
      scalarEnums: {
        scope: { accepts: new Set(["invited", "org"]), serverNormalizes: !0 },
        link_permission: { accepts: new Set(["view", "comment", "edit"]), serverNormalizes: !0 },
      },
    },
  },
  G = {
    list: { top: new Set(["full"]) },
    list_design_systems: { top: new Set() },
    get_claude_design_prompt: { top: new Set(["design_system_id", "project_id"]) },
    list_projects: { top: new Set() },
    get_project: { top: new Set(["project_id"]) },
    list_files: { top: new Set(["project_id", "path"]) },
    read_file: { top: new Set(["project_id", "path"]) },
    get_conversation: { top: new Set(["project_id", "chat_id"]) },
    list_members: { top: new Set(["project_id"]) },
  };
//@ chunk-171dhyhe.js:15493-18507 placement
function describeDesignOperation(e, t) {
  let c = Object.hasOwn(q, e) ? q[e] : Object.hasOwn(G, e) ? G[e] : void 0;
  if (!c) {
    let l = designHintsFor(e);
    if (l?.readOnly === !0) return null;
    if (l !== void 0)
      return `ClaudeDesign ${e}: the server reports this operation as write-capable, and this client version can't validate its arguments (it needs a WRITE_OP_SCHEMAS entry). Update Claude Code to use it.`;
    return `ClaudeDesign ${e}: unrecognized operation. If the server added it recently, call {operation: "list"} first \u2014 a read-only operation becomes callable after discovery; a write-tier operation needs a WRITE_OP_SCHEMAS entry in this client.`;
  }
  let n = `ClaudeDesign ${e}`,
    r = (l) => (l.length > 60 ? l.slice(0, 60) + "\u2026" : l);
  if (e === "finalize_plan" && t?.scope === "project" && (t.writes !== void 0 || t.deletes !== void 0))
    return `${n}: scope "project" takes no writes/deletes \u2014 a project-scoped plan covers every path in the project.`;
  for (let [l, a] of Object.entries(t ?? {})) {
    if (!c.top.has(l)) {
      let found = [...c.top].find((f) => f.toLowerCase() === l.toLowerCase()),
        joined = [...c.top].join(", ");
      return `${n}: unrecognized argument '${r(l)}'${found ? ` (did you mean '${found}'?)` : ""}. ${joined ? `Allowed: ${joined}.` : "This operation takes no arguments."}`;
    }
    if (!(l in (c.arrays ?? {})) && typeof a === "object" && a !== null)
      return `${n}.${l}: must be a scalar (string/bool/number), not ${Array.isArray(a) ? "an array" : "an object"}.`;
    let y = l === "plan_token" ? 65536 : 4096;
    if (typeof a === "string" && x(a) > y) return `${n}.${l}: too long (${x(a)} bytes; capped at ${y}).`;
    let v = "scalarEnums" in c ? c.scalarEnums?.[l] : void 0;
    if (v !== void 0) {
      let h = "accepts" in v,
        m = h ? v.accepts : v,
        f = h && typeof a === "string" ? a.trim().toLowerCase() : a;
      if (typeof f !== "string" || !m.has(f))
        return `${n}.${l}: must be one of ${[...m].map((w) => `"${w}"`).join(", ")}${h ? " (case-insensitive)" : ""}.`;
      if (h && typeof a === "string" && a.length > f.length + 2)
        return `${n}.${l}: excess whitespace around the value.`;
    }
  }
  for (let [l, a] of Object.entries(c.arrays ?? {})) {
    let y = t?.[l];
    if (y === void 0) continue;
    if (!Array.isArray(y)) return `${n}.${l}: must be an array.`;
    for (let v = 0; v < y.length; v++) {
      let h = y[v];
      if (a === "string") {
        if (typeof h !== "string") return `${n}.${l}[${v}]: must be a string.`;
        if (x(h) > 4096) return `${n}.${l}[${v}]: too long (${x(h)} bytes; capped at 4096).`;
      } else {
        if (typeof h !== "object" || h === null || Array.isArray(h))
          return `${n}.${l}[${v}]: must be an object with keys from {${[...a.fields].join(", ")}}.`;
        for (let m of a.required)
          if (typeof h[m] !== "string") return `${n}.${l}[${v}]: missing required field '${m}'.`;
        for (let [m, f] of Object.entries(h)) {
          if (!a.fields.has(m)) {
            let found = [...a.fields].find((b) => b.toLowerCase() === m.toLowerCase());
            return `${n}.${l}[${v}]: unrecognized field '${r(m)}'${found ? ` (did you mean '${found}'?)` : m === "content" ? " (did you mean 'data'? designmcp's write_files reads 'data', not 'content')" : ""}. Allowed: ${[...a.fields].join(", ")}.`;
          }
          if (typeof f !== "string")
            return `${n}.${l}[${v}].${m}: must be a string (got ${Array.isArray(f) ? "array" : typeof f}).`;
          if (m !== "data" && m !== "content" && x(f) > 4096)
            return `${n}.${l}[${v}].${m}: too long (${x(f)} bytes; non-body fields are capped at 4096).`;
        }
      }
    }
  }
  return null;
}
//@ chunk-171dhyhe.js:18507-18559 placement
function V(e) {
  return Object.hasOwn(DESIGN_OPERATION_TRAITS, e) ? DESIGN_OPERATION_TRAITS[e] : void 0;
}
//@ chunk-171dhyhe.js:18559-18731 placement
var DESIGN_TOOL_ENTRY_SCHEMA = DoctorLazy(() =>
  kt({
    name: o(),
    description: o().optional(),
    inputSchema: oe().optional(),
    annotations: kt({ readOnlyHint: M().optional(), destructiveHint: M().optional() }).optional(),
  }),
);
//@ chunk-171dhyhe.js:18731-18915 placement
class DesignHintsRegistry {
  byOperation = new Map();
  hintsFor(e) {
    return this.byOperation.get(e);
  }
  knows(e) {
    return this.byOperation.has(e);
  }
  record(e, t) {
    this.byOperation.set(e, t);
  }
  reset() {
    this.byOperation.clear();
  }
}
//@ chunk-171dhyhe.js:18915-18940 placement
var je = new HostScoped(() => new DesignHintsRegistry());
//@ chunk-171dhyhe.js:18940-18977 placement
function re() {
  return je.of(getRootSession().host);
}
//@ chunk-171dhyhe.js:18977-19015 placement
function designHintsFor(e) {
  return re().hintsFor(e);
}
/**
 * 解析设计服务返回的操作列表，结合内置特性表确定只读/破坏性提示并登记，返回工具描述列表。
 */
//@ chunk-171dhyhe.js:19015-19485 placement
function recordDesignTools(e) {
  let t = re();
  t.reset();
  let c = [];
  for (let n of e) {
    let safeParse = DESIGN_TOOL_ENTRY_SCHEMA().safeParse(n);
    if (!safeParse.success) continue;
    let l = safeParse.data,
      a = Object.hasOwn(DESIGN_OPERATION_TRAITS, l.name) ? DESIGN_OPERATION_TRAITS[l.name] : void 0,
      y = l.annotations?.readOnlyHint ?? a?.readOnly ?? !1,
      v = l.annotations?.destructiveHint ?? a?.destructive ?? !0;
    if (a) ((y &&= a.readOnly), (v ||= a.destructive));
    (t.record(l.name, { readOnly: y, destructive: v }),
      c.push({
        name: l.name,
        description: l.description ?? "",
        inputSchema: l.inputSchema ?? {},
        readOnlyHint: y,
        destructiveHint: v,
      }));
  }
  return c;
}
//@ chunk-171dhyhe.js:19485-19521 placement
function isUnknownDesignOperation(e) {
  return !re().knows(e);
}
//@ chunk-171dhyhe.js:19521-19601 placement
function redactToken(e, t) {
  if (!t) return e;
  return e.split(t).join("[redacted-oauth-token]");
}
//@ chunk-171dhyhe.js:19601-19752 placement = getOAuthHeaders (0.875)
function getOAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-client-platform": getClientPlatform(),
  };
}
//@ chunk-171dhyhe.js:19752-19815 placement
function O(e) {
  return e < 1024 ? `${e}B` : `${(e / 1024).toFixed(1)}KB`;
}
//@ chunk-171dhyhe.js:19815-19864 placement
function F(e) {
  return Buffer.byteLength(e, "utf8");
}
//@ chunk-171dhyhe.js:19864-20856 placement
function designOperationTitle(e) {
  switch (e) {
    case "list":
      return "List operations";
    case "list_design_systems":
      return "List design systems";
    case "get_claude_design_prompt":
      return "Get design prompt";
    case "list_projects":
      return "List projects";
    case "get_project":
      return "Read project metadata";
    case "list_files":
      return "List project files";
    case "read_file":
      return "Read file";
    case "get_conversation":
      return "Read conversation";
    case "list_members":
      return "List project members";
    case "create_project":
      return "Create project";
    case "put_conversation":
      return "Write conversation";
    case "finalize_plan":
      return "Finalize plan";
    case "write_files":
      return "Write files";
    case "copy_files":
      return "Copy files";
    case "delete_files":
      return "Delete files";
    case "render_preview":
      return "Render preview";
    case "create_support_js":
      return "Create support.js";
    case "add_member":
      return "Add project member";
    case "update_member_role":
      return "Update member role";
    case "remove_member":
      return "Remove project member";
    case "update_sharing":
      return "Update sharing";
    default:
      return e ?? "";
  }
}
//@ chunk-171dhyhe.js:20856-21255 placement
var DesignToolInputSchema = DoctorLazy(() =>
    zodStrictObject({
      operation: o()
        .regex(/^[\w.-]{1,64}$/)
        .describe(
          `Claude Design action to perform. Call with "${LIST}" first to discover the available operations and their argument schemas.`,
        ),
      arguments: pe(o(), oe())
        .default({})
        .describe("Action input object (server-validated). Pass {} for operations that take no input."),
    }),
  ),
  Re = DoctorLazy(() => u({ operation: o(), content: A(pe(o(), oe())), isError: M().optional() }));
//@ chunk-171dhyhe.js:21255-21411 placement
function needsDesignWritePrompt(e) {
  let permissions = e.permissions();
  return (
    !e.isNonInteractiveSession &&
    permissions.mode !== "bypassPermissions" &&
    !(permissions.mode === "plan" && permissions.isBypassPermissionsModeAvailable)
  );
}
/**
 * Design 写操作同意提示的常量（批准说明、分享范围标签、名字长度与可疑字符正则）。
 */
//@ chunk-171dhyhe.js:21411-21883 placement
var DESIGN_WRITE_APPROVAL_NOTE =
    "Approving also lets writes and deletes to exactly these paths run without another prompt for up to 15 minutes (file contents are not shown again; anything to any other path will still ask).",
  ge = {
    invited: "private: invited members only",
    org: "visible to your whole organization",
    public: "PUBLIC",
  },
  Ie = 60,
  he =
    /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u2026\u2800\u3164\uFE00-\uFE0E\uFEFF\uFFF9-\uFFFB\uFFA0]/;
//@ chunk-171dhyhe.js:21883-22054 placement
function hasStrayJoiners(e) {
  return (
    /(?:^|\s)[\u200C\u200D\uFE0F]/.test(e) ||
    /[\u200C\u200D](?=\s|$)/.test(e) ||
    /[\u200C\u200D][\u200C\u200D]/.test(e) ||
    /(?:^|[^\p{Emoji}])\uFE0F/u.test(e)
  );
}
//@ chunk-171dhyhe.js:22054-22238 placement
var TAG_CHAR_RE = /\uDB40[\uDC20-\uDC7F\uDD00-\uDDEF]|\uD834[\uDD73-\uDD7A]/,
  _e =
    /["\u201C\u201D\u201E\u201F\uFF02\u2033\u2036\u02BA\u02DD\u02EE\u05F4\u3003\u301D-\u301F\u275D\u275E\u2014\u2015]/;
//@ chunk-171dhyhe.js:22238-22401 placement
function canPromptForDesign(e) {
  if (e.agentContext?.agentType !== "main") return !1;
  try {
    return !hasHookForEvent("PermissionRequest", e.sessionHooksRegistry, e.agentContext?.agentId ?? "");
  } catch {
    return !1;
  }
}
/**
 * 读取设计项目的名字、分享范围与 URL，做严格清洗（控制字符、可疑 Unicode、URL 形状），不合格返回 null。
 */
//@ chunk-171dhyhe.js:22401-23375 placement
async function fetchDesignProjectInfo(e, t, c, n) {
  try {
    let r = await XFt(n);
    if (r.ok !== !0) return null;
    let l = await callDesignOperation(e, "get_project", { project_id: t }, r.accessToken, c, null, n);
    if (l.isError === !0) return null;
    for (let a of l.content)
      if (a?.type === "text" && typeof a.text === "string") {
        let y = jsonParse(a.text),
          { name: v, url: url } = y,
          m = y.sharing?.scope;
        if (typeof v !== "string") return null;
        let trimmed = v.replace(/\s+/g, " ").trim();
        if (
          trimmed.length === 0 ||
          he.test(trimmed) ||
          TAG_CHAR_RE.test(trimmed) ||
          hasStrayJoiners(trimmed) ||
          trimmed.includes("://")
        )
          return null;
        if (_e.test(trimmed)) return null;
        if (typeof m !== "string" || !Object.hasOwn(ge, m)) return null;
        if (typeof url !== "string") return null;
        let w;
        try {
          w = new URL(url);
        } catch {
          return null;
        }
        if (
          w.protocol !== "https:" ||
          !w.pathname.endsWith(`/p/${t}`) ||
          w.username !== "" ||
          w.password !== "" ||
          w.search !== "" ||
          w.hash !== "" ||
          url.length > 200 ||
          /\s/.test(url) ||
          _e.test(url) ||
          he.test(url) ||
          TAG_CHAR_RE.test(url) ||
          /[\u200C\u200D\uFE0F]/.test(url)
        )
          return null;
        let b = truncateToLength(trimmed, Ie);
        return { name: b === trimmed ? trimmed : `${b.trimEnd()}\u2026`, sharingLabel: ge[m], url: url };
      }
    return null;
  } catch {
    if (c.aborted) throw new AbortError();
    return null;
  }
}
/**
 * Claude Design 工具（2.1.316 新增）：通过 /v1/design/mcp 与 claude.ai/design 的设计系统和项目交互（列出操作、读写文件、渲染预览、finalize_plan），写操作需要项目授权与同意。
 */
//@ chunk-171dhyhe.js:23375-43714 placement
var DesignTool = buildTool({
  name: CLAUDE_DESIGN_TOOL_NAME,
  searchHint: "work with Claude Design (claude.ai/design) projects",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  get inputSchema() {
    return DesignToolInputSchema();
  },
  get outputSchema() {
    return Re();
  },
  isEnabled: isDesignSyncEnabled,
  isConcurrencySafe(e) {
    if (e.operation === LIST) return !0;
    return (designHintsFor(e.operation) ?? V(e.operation))?.readOnly === !0;
  },
  isReadOnly(e) {
    if (e.operation === LIST) return !0;
    return (designHintsFor(e.operation) ?? V(e.operation))?.readOnly === !0;
  },
  async description() {
    return T$o(l4e());
  },
  async prompt() {
    return T$o(l4e());
  },
  userFacingName(e) {
    let t = designOperationTitle(e?.operation);
    return t ? `Claude Design: ${t}` : "Claude Design";
  },
  toAutoClassifierInput(e) {
    return { operation: e.operation, arguments: e.arguments ?? {} };
  },
  create(e) {
    return {
      async validateInput(t) {
        let c = describeDesignOperation(t.operation, t.arguments);
        if (c) return { result: !1, message: c, errorCode: 1 };
        if (t.operation === "finalize_plan") {
          let n = t.arguments?.project_id;
          if (typeof n !== "string" || n.length === 0)
            return {
              result: !1,
              message:
                "ClaudeDesign finalize_plan: project_id is required (a plan is always scoped to one project).",
              errorCode: 1,
            };
          if (!/^[A-Za-z0-9._-]+$/.test(n))
            return {
              result: !1,
              message:
                "ClaudeDesign finalize_plan: project_id contains characters outside the server id charset (letters, digits, dot, underscore, dash).",
              errorCode: 1,
            };
          if (n.length > MAX_PLAN_PATH_CHARS - 2)
            return {
              result: !1,
              message: "ClaudeDesign finalize_plan: project_id is longer than any server-issued project id.",
              errorCode: 1,
            };
        }
        return { result: !0 };
      },
      async checkPermissions(t, c) {
        let n = e,
          r = n.toolState.get(DesignGateState),
          l = t.operation === LIST ? null : await checkDesignConsent(r, n.credentials),
          a = {
            ...t,
            __consentBitShown: l,
            __consentAskCanReachUser: needsDesignWritePrompt(n),
            __projectGrantAskShown: void 0,
            __projectGrantServerObserved: void 0,
            __reservedTargetsAskShown: void 0,
            __finalizePlanAskShown: void 0,
          },
          y = l !== null ? DESIGN_CONSENT_PROMPT(l) : null;
        if (t.operation === "finalize_plan" && t.arguments?.scope === "project")
          return {
            behavior: "deny",
            message:
              'ClaudeDesign finalize_plan: scope "project" is no longer supported by this client. Write files directly without plan_token \u2014 the first write to a project asks for a one-time durable approval \u2014 or use finalize_plan with writes/deletes for path-scoped plans and deletes.',
            decisionReason: {
              type: "safetyCheck",
              reason: 'finalize_plan scope:"project" is superseded by the durable per-project write grant',
              classifierApprovable: !1,
            },
          };
        let v =
            t.operation === LIST
              ? { readOnly: !0, destructive: !1 }
              : (designHintsFor(t.operation) ?? V(t.operation)),
          h = v?.readOnly !== !0,
          m = h && v?.destructive !== !1;
        if (
          t.operation === "copy_files" &&
          !(typeof t.arguments?.plan_token === "string" && t.arguments.plan_token.length > 0)
        )
          return {
            behavior: "deny",
            message:
              "ClaudeDesign copy_files: copying without a plan_token always requires per-batch approval \u2014 use finalize_plan declaring every destination in writes, then pass the returned plan_token.",
            decisionReason: {
              type: "safetyCheck",
              reason:
                "tokenless copy_files is per-batch-only \u2014 its destinations have no reserved-path or render-integrity gate",
              classifierApprovable: !1,
            },
          };
        if (y) {
          if (
            (t.operation === "write_files" || t.operation === "create_support_js") &&
            !(typeof t.arguments?.plan_token === "string" && t.arguments.plan_token.length > 0)
          ) {
            let b = checkPlanGatedTargets(t.operation, t.arguments);
            if (b.outcome !== "pass" || !projectsFitOnCard(b.targets)) {
              let D = b.targets !== void 0 && b.targets.length === 0,
                j = b.outcome === "pass";
              return {
                behavior: "deny",
                message: D
                  ? `ClaudeDesign ${t.operation}: this call names no target paths \u2014 list the files to write, or use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`
                  : j
                    ? `ClaudeDesign ${t.operation}: this batch is too large to display fully for approval \u2014 split it into smaller batches, or use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`
                    : `ClaudeDesign ${t.operation}: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes/deletes and pass the returned plan_token.`,
                decisionReason: {
                  type: "safetyCheck",
                  reason: D
                    ? "a write batch naming no target paths \u2014 malformed call"
                    : j
                      ? "the batch cannot be rendered fully in the approval dialog \u2014 split it or use per-batch plans"
                      : "reserved or unenumerable target paths always require per-batch approval",
                  classifierApprovable: !1,
                },
              };
            }
          }
          let f = h ? `Design ${t.operation} writes to claude.ai/design.` : "",
            w = t.operation === "finalize_plan" ? DESIGN_WRITE_APPROVAL_NOTE : "";
          return {
            behavior: "ask",
            message: [y, f, w].filter(Boolean).join(" "),
            updatedInput: t.operation === "finalize_plan" ? { ...a, __finalizePlanAskShown: !0 } : a,
            localDisplayOnly: !0,
            decisionReason: {
              type: "safetyCheck",
              reason:
                "design agent consent \u2014 approving records a server-side grant for Claude agents to read and write your design projects",
              classifierApprovable: !1,
            },
          };
        }
        if (!h) return { behavior: "allow", updatedInput: a };
        if (
          n.permissions().mode !== "plan" &&
          canPromptForDesign(n) &&
          checkDesignPlanToken(r, t.operation, t.arguments).outcome === "allow"
        )
          return { behavior: "allow", updatedInput: a };
        if (
          (t.operation === "write_files" || t.operation === "create_support_js") &&
          !(typeof t.arguments?.plan_token === "string" && t.arguments.plan_token.length > 0)
        ) {
          if (n.isNonInteractiveSession === !0) {
            let w = {
                behavior: "deny",
                message: `ClaudeDesign ${t.operation}: writing without a plan_token requires a one-time interactive project approval, which is not available in non-interactive sessions \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "a durable project write grant requires an interactive approval with a server-verified project identity",
                  classifierApprovable: !1,
                },
              },
              b = t.arguments?.project_id;
            if (typeof b !== "string" || b.length === 0 || !canPromptForDesign(n) || qAe(r, b)) return w;
            if (checkPlanGatedTargets(t.operation, t.arguments).outcome !== "pass") return w;
            if (n.permissions().mode === "plan") return w;
            if (vYn(r, b)) return { behavior: "allow", updatedInput: a };
            if ((await checkDesignGrant(r, b, n.credentials)) === "granted" && !qAe(r, b)) {
              if ((Uze(r, b), n.permissions().mode !== "plan")) return { behavior: "allow", updatedInput: a };
            }
            return w;
          }
          if (!canPromptForDesign(n))
            return {
              behavior: "deny",
              message: `ClaudeDesign ${t.operation}: writing without a plan_token requires a one-time project approval, which is not available in subagent or PermissionRequest-hook sessions \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
              decisionReason: {
                type: "safetyCheck",
                reason:
                  "a durable project write grant requires a context where the approval card reaches the user directly",
                classifierApprovable: !1,
              },
            };
          let f = t.arguments?.project_id;
          if (typeof f === "string" && f.length > 0) {
            if (vzs(r, f))
              return {
                behavior: "deny",
                message: `ClaudeDesign ${t.operation}: this project cannot hold a durable write grant for this account (it may be shared from another organization) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "the server refused to mint a durable grant for this project \u2014 per-batch plans only",
                  classifierApprovable: !1,
                },
              };
            let w = checkPlanGatedTargets(t.operation, t.arguments),
              b = n.permissions().mode === "plan";
            if (w.outcome === "pass" && b) {
              if (!(
                vYn(r, f) ||
                (!qAe(r, f) && (await checkDesignGrant(r, f, n.credentials)) === "granted" && !qAe(r, f))
              ))
                return {
                  behavior: "deny",
                  message: `ClaudeDesign ${t.operation}: writing without a plan_token requires a one-time project approval, which is not shown in plan mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "a durable project write grant cannot be minted from plan mode \u2014 per-batch plans only",
                    classifierApprovable: !1,
                  },
                };
              Uze(r, f);
            } else if (w.outcome === "pass") {
              if (vYn(r, f)) return { behavior: "allow", updatedInput: a };
              let D = await checkDesignGrant(r, f, n.credentials);
              if (D === "granted" && !qAe(r, f)) {
                if ((Uze(r, f), n.permissions().mode !== "plan"))
                  return { behavior: "allow", updatedInput: a };
              } else if (D === "unavailable")
                return {
                  behavior: "deny",
                  message: `ClaudeDesign ${t.operation}: could not check for a project write grant (this server may not support durable grants) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "the grant state could not be verified \u2014 fail toward the per-batch plan flow",
                    classifierApprovable: !1,
                  },
                };
              else {
                let j = () =>
                    n.permissions().mode !== "plan"
                      ? null
                      : {
                          behavior: "deny",
                          message: `ClaudeDesign ${t.operation}: writing without a plan_token requires a one-time project approval, which is not shown in plan mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                          decisionReason: {
                            type: "safetyCheck",
                            reason:
                              "a durable project write grant cannot be minted from plan mode \u2014 per-batch plans only",
                            classifierApprovable: !1,
                          },
                        },
                  R = j();
                if (R) return R;
                if (!needsDesignWritePrompt(n))
                  return {
                    behavior: "deny",
                    message: `ClaudeDesign ${t.operation}: writing without a plan_token to a project without a write grant requires a one-time interactive approval, which cannot be shown in this permission mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason:
                        "a durable project write grant requires an interactive approval with a server-verified project identity",
                      classifierApprovable: !1,
                    },
                  };
                let s = await fetchDesignProjectInfo(r, f, c.signal, n.credentials);
                if (s === null)
                  return {
                    behavior: "deny",
                    message: `ClaudeDesign ${t.operation}: a durable project write grant is only offered when the approval dialog can name its target, and the project identity (name, sharing, URL) could not be verified or rendered faithfully. If this is a fresh connection, read the project first (e.g. get_project \u2014 approve the Claude Design connection if prompted) and retry once; otherwise use finalize_plan with writes/deletes and pass the returned plan_token (the per-batch flow), which is always supported.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason:
                        "a durable project write grant requires a server-verified project identity in the approval card",
                      classifierApprovable: !1,
                    },
                  };
                let g = j();
                if (g) return g;
                return {
                  behavior: "ask",
                  message: `Approving writes the listed files now, and lets Claude write to ANY file in the project "${s.name}" (${s.sharingLabel}) \u2014 ${s.url} \u2014 without asking again. This approval is remembered for this project until you revoke it in settings at claude.ai/design (future writes and file contents are not shown for approval). Deletes and CLAUDE.md/.claude paths still ask every time.`,
                  updatedInput: { ...a, __projectGrantAskShown: f },
                  localDisplayOnly: !0,
                  serverApprovalWatch: { kind: "design_project_grant", projectId: f },
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "first write under a project grant \u2014 approval mints a durable write grant for this project, revocable at claude.ai/design settings",
                    classifierApprovable: !1,
                  },
                };
              }
            } else {
              if (!(
                projectsFitOnCard(w.targets) &&
                (vYn(r, f) ||
                  (!qAe(r, f) && (await checkDesignGrant(r, f, n.credentials)) === "granted" && !qAe(r, f)))
              )) {
                let R = w.targets !== void 0 && w.targets.length === 0;
                return {
                  behavior: "deny",
                  message: R
                    ? `ClaudeDesign ${t.operation}: this call names no target paths \u2014 list the files to write, or use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`
                    : `ClaudeDesign ${t.operation}: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes/deletes and pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason: R
                      ? "a write batch naming no target paths \u2014 malformed call"
                      : "reserved or unenumerable target paths always require per-batch approval",
                    classifierApprovable: !1,
                  },
                };
              }
              return (
                Uze(r, f),
                {
                  behavior: "ask",
                  message: `Design ${t.operation} writes to claude.ai/design.`,
                  updatedInput: { ...a, __reservedTargetsAskShown: !0 },
                  localDisplayOnly: !0,
                  decisionReason: {
                    type: "safetyCheck",
                    reason: m
                      ? "destructive \u2014 model-generated arguments"
                      : "remote write \u2014 model-generated arguments",
                    classifierApprovable: !1,
                  },
                }
              );
            }
          }
        }
        if (t.operation === "finalize_plan")
          return {
            behavior: "ask",
            message: `Design finalize_plan writes to claude.ai/design. ${DESIGN_WRITE_APPROVAL_NOTE}`,
            updatedInput: { ...a, __finalizePlanAskShown: !0 },
            localDisplayOnly: !0,
            decisionReason: {
              type: "safetyCheck",
              reason:
                "finalize_plan \u2014 the human is the path-review boundary; approval also grants prompt-free writes to these paths for 15 min",
              classifierApprovable: !1,
            },
          };
        if (m)
          return {
            behavior: "ask",
            message: `Design ${t.operation} writes to claude.ai/design.`,
            updatedInput: a,
            decisionReason: {
              type: "safetyCheck",
              reason: v
                ? "destructive \u2014 model-generated arguments"
                : "unknown operation \u2014 fail-closed to destructive write",
              classifierApprovable: !1,
            },
          };
        return {
          behavior: "ask",
          message: `Design ${t.operation} writes to claude.ai/design.`,
          updatedInput: a,
          decisionReason: {
            type: "safetyCheck",
            reason: "remote write \u2014 model-generated arguments",
            classifierApprovable: !1,
          },
        };
      },
      async call(t, c) {
        let n = e,
          r = n.toolState.get(DesignGateState),
          l = t.__consentAskCanReachUser ?? !1,
          a = l && needsDesignWritePrompt(n);
        if (t.operation === "finalize_plan" && l) {
          let project_id = (t.arguments ?? {}).project_id;
          if (typeof project_id === "string" && project_id.length > 0) clearApprovedPlans(r, project_id);
        }
        if ($ze.has(t.operation)) {
          let project_id = (t.arguments ?? {}).project_id;
          if (typeof project_id === "string" && project_id.length > 0)
            (clearApprovedPlans(r, project_id),
              clearPlansForProject(r, project_id),
              clearVerifiedProjectGrant(r, project_id),
              F_t(r, project_id));
        }
        let y = await XFt(n.credentials);
        if (!y.ok) {
          let s = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            designCredentialErrorMessage(y, { isNonInteractiveSession: n.isNonInteractiveSession }),
            "design_tool_auth_failed",
          );
          throw y.reason === "needs_design_login"
            ? tagObject(s, { kind: "design_needs_authorization", provider: "claude_design" })
            : s;
        }
        let accessToken = y.accessToken,
          h = t.__consentBitShown ?? null,
          m = t.__projectGrantAskShown ?? null,
          f = t.__projectGrantServerObserved === !0,
          w = (() => {
            if (t.operation !== "write_files" && t.operation !== "create_support_js") return null;
            let s = t.arguments ?? {};
            if (typeof s.plan_token === "string" && s.plan_token.length > 0) return null;
            let project_id = s.project_id;
            return typeof project_id === "string" && project_id.length > 0 ? project_id : null;
          })();
        if (
          t.operation === "copy_files" &&
          !(typeof t.arguments?.plan_token === "string" && t.arguments.plan_token.length > 0)
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "copy_files without a plan_token always requires per-batch approval \u2014 use finalize_plan declaring every destination in writes, then pass the returned plan_token.",
            "design_tool_exec_backstop_tokenless_copy",
          );
        if (w !== null) {
          let s = checkPlanGatedTargets(t.operation, t.arguments),
            g = t.__reservedTargetsAskShown === !0;
          if (s.outcome !== "pass" && !g)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${t.operation} without a plan_token: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
              "design_tool_exec_backstop_safety_trip",
            );
        }
        let signal = c.signal,
          D = n.agentContext?.agentId ?? null,
          j;
        try {
          if (
            ((j = await R({})),
            t.operation === "finalize_plan" && t.__finalizePlanAskShown === !0 && a && canPromptForDesign(n))
          ) {
            let s = t.arguments ?? {},
              g = j.isError !== !0 ? readPlanTokenFromResult(j.content) : null,
              S = (k) => (Array.isArray(k) ? k.filter((T) => typeof T === "string") : []);
            if (g !== null && typeof s.project_id === "string" && s.scope !== "project")
              approveDesignPlan(r, g.token, {
                projectId: s.project_id,
                writes: S(s.writes),
                deletes: S(s.deletes),
                serverExpiresAtMs: g.expiresAtMs ?? void 0,
              });
          }
        } catch (error) {
          if (signal.aborted && !(error instanceof AbortError)) throw new AbortError();
          if (error instanceof DesignAuth401Error) {
            let g = await handleDesignAuth401(n.credentials, {
              isNonInteractiveSession: n.isNonInteractiveSession,
              wasRetried: error.wasRetried,
            });
            if (signal.aborted) throw new AbortError();
            let S = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              g.message,
              "design_tool_auth_401",
            );
            throw g.remedy === void 0 ? S : tagObject(S, g.remedy);
          }
          if (error instanceof DesignNeedsScopesError && n.isNonInteractiveSession)
            throw new DesignNeedsScopesError({ isNonInteractiveSession: !0 });
          throw error;
        }
        return { data: j };
        async function R(s) {
          try {
            let g = await callDesignOperation(
              r,
              t.operation,
              t.arguments,
              accessToken,
              signal,
              D,
              n.credentials,
            );
            if (h !== null && !signal.aborted && g.isError !== !0) setDesignConsent(r, h, !0);
            if (w !== null && !signal.aborted && g.isError !== !0 && ((m === w && !f) || !qAe(r, w)))
              Uze(r, w);
            return g;
          } catch (error) {
            if (error instanceof DesignNeedsProjectGrantError) {
              if ((clearVerifiedProjectGrant(r, error.projectId), X1s(r), s.grant === !0)) throw error;
              if (error.projectId !== m || f) {
                if (t.operation === "write_files" || t.operation === "create_support_js") {
                  if (n.isNonInteractiveSession === !0)
                    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      "Writing to this project needs a project write grant that is not currently active (it may have been revoked) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token. A durable project write grant can be approved from an interactive Claude Code session.",
                      "design_tool_needs_project_grant_non_interactive",
                    );
                  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    "Writing to this project needs a one-time approval \u2014 retry the write: you will be shown the approval, or routed to the per-batch finalize_plan flow.",
                    "design_tool_needs_project_grant_not_shown",
                  );
                }
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "This operation needs a plan_token here \u2014 use finalize_plan (listing the destination paths in writes) and pass the returned plan_token. (It can run without one only under an existing project write grant, set up by a write_files to this project.)",
                  "design_tool_needs_project_grant_ineligible_op",
                );
              }
              if (!a || !canPromptForDesign(n))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "Writing to this project needs a one-time approval, which cannot be granted automatically in this permission mode \u2014 use finalize_plan with writes/deletes and pass the returned plan_token.",
                  "design_tool_needs_project_grant_no_prompt",
                );
              try {
                await recordDesignProjectGrant(r, error.projectId, n.credentials);
              } catch (error) {
                if (classifyAxiosError(error).kind === "auth")
                  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    "This session's credential cannot record the project approval \u2014 approve this project from an interactive Claude Code session (run the write there and accept the approval card), then retry here: this session picks the recorded approval up from the server.",
                    "design_tool_grant_mint_bearer_refused",
                  );
                throw error;
              }
              return R({ ...s, grant: !0 });
            }
            if (!(error instanceof DesignNeedsConsentError)) throw error;
            if (s.consent === !0) throw error;
            let consent = error.consent;
            if (consent !== h)
              throw (
                setDesignConsent(r, consent, !1),
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `${DESIGN_CONSENT_PROMPT(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
                  "design_tool_needs_consent_not_shown",
                )
              );
            if (!a)
              throw (
                setDesignConsent(r, consent, !1),
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `${DESIGN_CONSENT_PROMPT(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
                  "design_tool_needs_consent_no_prompt",
                )
              );
            return (await recordDesignConsent(r, consent, n.credentials), R({ ...s, consent: !0 }));
          }
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, t) {
    let c = capDesignImageBlocks(e.content.flatMap(designContentToBlocks)),
      n = e.isError
        ? c
            .flatMap((r) => (r.type === "text" ? [r.text] : []))
            .join(
              `
`,
            )
            .trim() || "(error with no message)"
        : null;
    return {
      tool_use_id: t,
      type: "tool_result",
      is_error: e.isError,
      content: n ?? (c.length > 0 ? c : "(empty result)"),
    };
  },
  renderToolUseMessage(e, { verbose: t }) {
    let n = (s, g = 80) => {
        let replaced = s.replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
        return replaced.length > g ? replaced.slice(0, g).trimEnd() + "\u2026" : replaced;
      },
      r = e.arguments;
    if (!r || Object.keys(r).length === 0) return "";
    if (!t) {
      let s = {};
      for (let [g, S] of Object.entries(r))
        if (Array.isArray(S)) {
          let k = g === "messages" ? "message" : g === "validators" ? "validator" : "file";
          s[k] = (s[k] ?? 0) + S.length;
        }
      return Object.entries(s)
        .map(([g, S]) => `${S} ${S === 1 ? g : g + "s"}`)
        .join(", ");
    }
    if (!Object.hasOwn(q, e.operation ?? "") && !Object.hasOwn(G, e.operation ?? "")) {
      let s = jsonStringify(r) ?? "";
      return `${n(e.operation ?? "")} (${O(F(s))} of arguments not shown \u2014 operation unknown to this client version)`;
    }
    let l = (s, g) => {
        if (typeof s === "string") return s.length > 80 ? `${n(s)} (${O(F(s))})` : n(s);
        if (typeof s === "object" && s !== null) {
          let k = s,
            T = F(jsonStringify(s) ?? "");
          if (typeof k.path === "string") {
            let I = typeof k.data === "string" ? k.data : "",
              filtered = ["encoding", "local_path", "if_match"].filter(
                (P) => typeof k[P] === "string" && k[P],
              ),
              E = `${n(k.path)} (${O(T)})${filtered.length ? ` [+${filtered.join(",")}]` : ""}`;
            return g > 0 && I ? `${E}: ${n(I, g)}` : E;
          }
          if (typeof k.content === "string") {
            let I = typeof k.role === "string" ? k.role : "?",
              z = `${n(I, 12)} (${O(T)})`;
            return g > 0 && k.content ? `${z}: ${n(k.content, g)}` : z;
          }
          if (typeof k.src === "string" || typeof k.dest === "string")
            return `${n(String(k.src ?? "?"), 40)} \u2192 ${n(String(k.dest ?? "?"), 40)}${k.src_project_id ? ` [from ${n(String(k.src_project_id), 24)}]` : ""}${typeof k.if_match === "string" && k.if_match ? " [+if_match]" : ""}${T > 256 ? ` (${O(T)})` : ""}`;
        }
        let S = jsonStringify(s) ?? String(s);
        return `${n(S)} (${O(F(S))})`;
      },
      a = (s) =>
        typeof s === "string"
          ? n(s, 40)
          : typeof s === "object" && s !== null
            ? n(String(s.path ?? s.dest ?? s.role ?? "?"), 40)
            : "?",
      y = (s) => {
        if (Array.isArray(s) && s.length > 0) {
          let sliced = s.slice(0, 20),
            k = t ? Math.max(0, Math.min(200, Math.floor(1800 / sliced.length) - 95)) : 0,
            T =
              t &&
              k === 0 &&
              sliced.some((E) => {
                if (typeof E !== "object" || E === null) return !1;
                let P = E;
                return (typeof P.data === "string" && P.data) || (typeof P.content === "string" && P.content);
              }),
            sliced_2 = s.slice(20),
            z =
              sliced_2.length > 0
                ? `, +${sliced_2.length} more: ${sliced_2.slice(0, 10).map(a).join(", ")}${sliced_2.length > 10 ? ", \u2026" : ""}`
                : "";
          return (
            `[${s.length} ${s.length === 1 ? "entry" : "entries"}: ` +
            sliced.map((E) => l(E, k)).join(", ") +
            z +
            "]" +
            (T ? " (content previews omitted)" : "")
          );
        }
        let g = jsonStringify(s) ?? String(s);
        return g.length > 80 ? `${n(g)} (${O(F(g))})` : n(g);
      },
      sorted = Object.entries(r).sort(([, s], [, g]) => Number(Array.isArray(s)) - Number(Array.isArray(g))),
      filtered = sorted.filter(([, s]) => Array.isArray(s)),
      m = filtered.length >= 2 ? ` (${filtered.map(([s, g]) => `${n(s)}: ${g.length}`).join(", ")})` : "",
      joined = sorted.map(([s, g]) => `${n(s)}: ${y(g)}`).join(", "),
      w = jsonStringify(r) ?? "",
      b = F(w),
      trimStart = `${b > 256 ? ` (${O(b)} total)` : ""}${m} ${joined}`.trimStart(),
      R = t ? 2000 : 1500;
    return trimStart.length > R ? trimStart.slice(0, R - 1).trimEnd() + "\u2026" : trimStart;
  },
});
//@ chunk-171dhyhe.js:43714-43772 placement
var DESIGN_IMAGE_MEDIA_PATTERN = /^image\/(png|jpeg|gif|webp)$/,
  ye = 130000,
  ae = 130000;
//@ chunk-171dhyhe.js:43772-44240 placement
function designContentToBlocks(e) {
  if (e.type === "text" && typeof e.text === "string") return [{ type: "text", text: e.text }];
  if (
    e.type === "image" &&
    typeof e.data === "string" &&
    typeof e.mimeType === "string" &&
    DESIGN_IMAGE_MEDIA_PATTERN.test(e.mimeType)
  ) {
    if (e.data.length > ye)
      return [
        {
          type: "text",
          text: `[render_preview image omitted \u2014 ${Math.round(e.data.length / 1024)}KB exceeds ${Math.round(ye / 1024)}KB cap]`,
        },
      ];
    return [{ type: "image", source: { type: "base64", media_type: e.mimeType, data: e.data } }];
  }
  return [{ type: "text", text: jsonStringify(e) ?? "" }];
}
//@ chunk-171dhyhe.js:44358-44646 placement
function capDesignImageBlocks(e) {
  let t = ae,
    c = [],
    n = 0,
    r = 0;
  for (let l of e) {
    let a = isBase64ImageBlock_2(l);
    if (a <= t) ((t -= a), c.push(l));
    else (n++, (r += a));
  }
  if (n > 0)
    c.push({
      type: "text",
      text: `[ClaudeDesign result truncated \u2014 ${n} block(s) (${Math.round(r / 1024)}k chars) omitted; aggregate over ${Math.round(ae / 1024)}k-char cap]`,
    });
  return c;
}

export { isUnknownDesignOperation, designHintsFor, redactToken, recordDesignTools, getOAuthHeaders, ae };
