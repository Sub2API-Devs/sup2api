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
import {
  looseObject,
  string,
  unknown,
  M,
  zodStrictObject,
  record,
  u,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getClientPlatform } from "../../utils/http.js";
import { LIST, CLAUDE_DESIGN_TOOL_NAME, claudeDesignToolDescription } from "../ClaudeDesignTool/constants.js";
import { hasHookForEvent } from "../../utils/hooks.js";
import {
  getDesignConsentKey,
  checkDesignConsent,
  DESIGN_CONSENT_PROMPT,
  checkDesignGrant,
  setDesignConsent,
  invalidateDesignConsentCache,
  recordDesignProjectGrant,
  recordDesignConsent,
} from "../../services/design/designApi.js";
import {
  callDesignOperation,
  DesignAuth401Error,
  handleDesignAuth401,
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
import { isAnyFeatureAvailable } from "../../utils/featureAvailability.js";
import {
  MAX_PLAN_PATH_CHARS_2,
  DesignGateState,
  checkPlanGatedTargets,
  projectsFitOnCard,
  checkDesignPlanToken,
  isRecardProject,
  isProjectGrantVerified,
  markProjectGrantVerified,
  isGrantIneligibleProject,
  clearApprovedPlans,
  MEMBERSHIP_METHODS,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  markRecardProject,
  readPlanTokenFromResult,
  approveDesignPlan,
} from "../../services/mcp/designPlanGate.js";
import { designCredentialErrorMessage } from "./designMcpClient.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { isBase64ImageBlock_2 } from "../../utils/imageValidation.js";

//@ chunk-171dhyhe.js:12468-12517 placement
/**
 * 计算字符串的 UTF-8 字节数，用于校验操作参数长度。
 */
function utf8ByteLengthShort(e) {
  return Buffer.byteLength(e, "utf8");
}
//@ chunk-171dhyhe.js:12517-15493 placement
/**
 * 写类操作的参数结构（允许的顶层字段、数组元素字段、枚举取值），describeDesignOperation 用它校验参数。
 */
var DESIGN_OPERATION_TRAITS = {
  list_design_systems: {
    readOnly: true,
    destructive: false,
  },
  get_claude_design_prompt: {
    readOnly: true,
    destructive: false,
  },
  list_projects: {
    readOnly: true,
    destructive: false,
  },
  get_project: {
    readOnly: true,
    destructive: false,
  },
  list_files: {
    readOnly: true,
    destructive: false,
  },
  read_file: {
    readOnly: true,
    destructive: false,
  },
  get_conversation: {
    readOnly: true,
    destructive: false,
  },
  list_members: {
    readOnly: true,
    destructive: false,
  },
  render_preview: {
    readOnly: false,
    destructive: false,
  },
  create_project: {
    readOnly: false,
    destructive: false,
  },
  put_conversation: {
    readOnly: false,
    destructive: false,
  },
  finalize_plan: {
    readOnly: false,
    destructive: false,
  },
  write_files: {
    readOnly: false,
    destructive: false,
  },
  copy_files: {
    readOnly: false,
    destructive: false,
  },
  create_support_js: {
    readOnly: false,
    destructive: false,
  },
  add_member: {
    readOnly: false,
    destructive: false,
  },
  delete_files: {
    readOnly: false,
    destructive: true,
  },
  remove_member: {
    readOnly: false,
    destructive: true,
  },
  update_member_role: {
    readOnly: false,
    destructive: true,
  },
  update_sharing: {
    readOnly: false,
    destructive: true,
  },
};
var WRITE_OP_SCHEMAS = {
  create_project: {
    top: new Set(["name", "design_system_id"]),
  },
  put_conversation: {
    top: new Set(["project_id", "title", "messages"]),
    arrays: {
      messages: {
        fields: new Set(["role", "content"]),
        required: new Set(["role", "content"]),
      },
    },
  },
  finalize_plan: {
    top: new Set(["project_id", "writes", "deletes", "scope"]),
    arrays: {
      writes: "string",
      deletes: "string",
    },
    scalarEnums: {
      scope: new Set(["paths", "project"]),
    },
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
      files: {
        fields: new Set(["path", "if_match"]),
        required: new Set(["path"]),
      },
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
    arrays: {
      validators: "string",
    },
  },
  create_support_js: {
    top: new Set(["project_id", "plan_token", "path", "if_match"]),
  },
  add_member: {
    top: new Set(["project_id", "account_uuid", "email", "role"]),
    scalarEnums: {
      role: {
        accepts: new Set(["viewer", "commenter", "editor"]),
        serverNormalizes: true,
      },
    },
  },
  update_member_role: {
    top: new Set(["project_id", "account_uuid", "role"]),
    scalarEnums: {
      role: {
        accepts: new Set(["viewer", "commenter", "editor"]),
        serverNormalizes: true,
      },
    },
  },
  remove_member: {
    top: new Set(["project_id", "account_uuid"]),
  },
  update_sharing: {
    top: new Set(["project_id", "scope", "link_permission"]),
    scalarEnums: {
      scope: {
        accepts: new Set(["invited", "org"]),
        serverNormalizes: true,
      },
      link_permission: {
        accepts: new Set(["view", "comment", "edit"]),
        serverNormalizes: true,
      },
    },
  },
};
var READ_OP_SCHEMAS = {
  list: {
    top: new Set(["full"]),
  },
  list_design_systems: {
    top: new Set(),
  },
  get_claude_design_prompt: {
    top: new Set(["design_system_id", "project_id"]),
  },
  list_projects: {
    top: new Set(),
  },
  get_project: {
    top: new Set(["project_id"]),
  },
  list_files: {
    top: new Set(["project_id", "path"]),
  },
  read_file: {
    top: new Set(["project_id", "path"]),
  },
  get_conversation: {
    top: new Set(["project_id", "chat_id"]),
  },
  list_members: {
    top: new Set(["project_id"]),
  },
};
//@ chunk-171dhyhe.js:15493-18507 placement
function describeDesignOperation(operation, t) {
  let c = Object.hasOwn(WRITE_OP_SCHEMAS, operation)
    ? WRITE_OP_SCHEMAS[operation]
    : Object.hasOwn(READ_OP_SCHEMAS, operation)
      ? READ_OP_SCHEMAS[operation]
      : undefined;
  if (!c) {
    let l = designHintsFor(operation);
    if (l?.readOnly === true) return null;
    if (l !== undefined)
      return `ClaudeDesign ${operation}: the server reports this operation as write-capable, and this client version can't validate its arguments (it needs a WRITE_OP_SCHEMAS entry). Update Claude Code to use it.`;
    return `ClaudeDesign ${operation}: unrecognized operation. If the server added it recently, call {operation: "list"} first \u2014 a read-only operation becomes callable after discovery; a write-tier operation needs a WRITE_OP_SCHEMAS entry in this client.`;
  }
  let n = `ClaudeDesign ${operation}`;
  let r = (l) => (l.length > 60 ? l.slice(0, 60) + "\u2026" : l);
  if (
    operation === "finalize_plan" &&
    t?.scope === "project" &&
    (t.writes !== undefined || t.deletes !== undefined)
  )
    return `${n}: scope "project" takes no writes/deletes \u2014 a project-scoped plan covers every path in the project.`;
  for (let [key, value] of Object.entries(t ?? {})) {
    if (!c.top.has(key)) {
      let found = [...c.top].find((f) => f.toLowerCase() === key.toLowerCase());
      let joined = [...c.top].join(", ");
      return `${n}: unrecognized argument '${r(key)}'${found ? ` (did you mean '${found}'?)` : ""}. ${joined ? `Allowed: ${joined}.` : "This operation takes no arguments."}`;
    }
    if (!(key in (c.arrays ?? {})) && typeof value === "object" && value !== null)
      return `${n}.${key}: must be a scalar (string/bool/number), not ${Array.isArray(value) ? "an array" : "an object"}.`;
    let y = key === "plan_token" ? 65536 : 4096;
    if (typeof value === "string" && utf8ByteLengthShort(value) > y)
      return `${n}.${key}: too long (${utf8ByteLengthShort(value)} bytes; capped at ${y}).`;
    let v = "scalarEnums" in c ? c.scalarEnums?.[key] : undefined;
    if (v !== undefined) {
      let h = "accepts" in v;
      let m = h ? v.accepts : v;
      let f = h && typeof value === "string" ? value.trim().toLowerCase() : value;
      if (typeof f !== "string" || !m.has(f))
        return `${n}.${key}: must be one of ${[...m].map((w) => `"${w}"`).join(", ")}${h ? " (case-insensitive)" : ""}.`;
      if (h && typeof value === "string" && value.length > f.length + 2)
        return `${n}.${key}: excess whitespace around the value.`;
    }
  }
  for (let [key, value] of Object.entries(c.arrays ?? {})) {
    let y = t?.[key];
    if (y === undefined) continue;
    if (!Array.isArray(y)) return `${n}.${key}: must be an array.`;
    for (let j = 0; j < y.length; j++) {
      let h = y[j];
      if (value === "string") {
        if (typeof h !== "string") return `${n}.${key}[${j}]: must be a string.`;
        if (utf8ByteLengthShort(h) > 4096)
          return `${n}.${key}[${j}]: too long (${utf8ByteLengthShort(h)} bytes; capped at 4096).`;
      } else {
        if (typeof h !== "object" || h === null || Array.isArray(h))
          return `${n}.${key}[${j}]: must be an object with keys from {${[...value.fields].join(", ")}}.`;
        for (let m of value.required)
          if (typeof h[m] !== "string") return `${n}.${key}[${j}]: missing required field '${m}'.`;
        for (let [key_2, value_2] of Object.entries(h)) {
          if (!value.fields.has(key_2)) {
            let found = [...value.fields].find((field) => field.toLowerCase() === key_2.toLowerCase());
            return `${n}.${key}[${j}]: unrecognized field '${r(key_2)}'${found ? ` (did you mean '${found}'?)` : key_2 === "content" ? " (did you mean 'data'? designmcp's write_files reads 'data', not 'content')" : ""}. Allowed: ${[...value.fields].join(", ")}.`;
          }
          if (typeof value_2 !== "string")
            return `${n}.${key}[${j}].${key_2}: must be a string (got ${Array.isArray(value_2) ? "array" : typeof value_2}).`;
          if (key_2 !== "data" && key_2 !== "content" && utf8ByteLengthShort(value_2) > 4096)
            return `${n}.${key}[${j}].${key_2}: too long (${utf8ByteLengthShort(value_2)} bytes; non-body fields are capped at 4096).`;
        }
      }
    }
  }
  return null;
}
//@ chunk-171dhyhe.js:18507-18559 placement
/**
 * 按操作名取 readOnly/destructive 属性（DESIGN_OPERATION_TRAITS）。
 */
function designOperationTraits(operation) {
  return Object.hasOwn(DESIGN_OPERATION_TRAITS, operation) ? DESIGN_OPERATION_TRAITS[operation] : undefined;
}
//@ chunk-171dhyhe.js:18559-18731 placement
var DESIGN_TOOL_ENTRY_SCHEMA = DoctorLazy(() =>
  looseObject({
    name: string(),
    description: string().optional(),
    inputSchema: unknown().optional(),
    annotations: looseObject({
      readOnlyHint: M().optional(),
      destructiveHint: M().optional(),
    }).optional(),
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
/**
 * 按宿主隔离的“设计操作提示”注册表缓存。
 */
var designHintsByHost = new HostScoped(() => new DesignHintsRegistry());
//@ chunk-171dhyhe.js:18940-18977 placement
/**
 * 取出当前根会话宿主的设计操作提示注册表。
 */
function getDesignHints() {
  return designHintsByHost.of(getRootSession().host);
}
//@ chunk-171dhyhe.js:18977-19015 placement
function designHintsFor(operation) {
  return getDesignHints().hintsFor(operation);
}
//@ chunk-171dhyhe.js:19015-19485 placement
/**
 * 解析设计服务返回的操作列表，结合内置特性表确定只读/破坏性提示并登记，返回工具描述列表。
 */
function recordDesignTools(tools) {
  let designHints = getDesignHints();
  designHints.reset();
  let c = [];
  for (let n of tools) {
    let r = DESIGN_TOOL_ENTRY_SCHEMA().safeParse(n);
    if (!r.success) continue;
    let l = r.data;
    let a = Object.hasOwn(DESIGN_OPERATION_TRAITS, l.name) ? DESIGN_OPERATION_TRAITS[l.name] : undefined;
    let y = l.annotations?.readOnlyHint ?? a?.readOnly ?? false;
    let v = l.annotations?.destructiveHint ?? a?.destructive ?? true;
    if (a) {
      y &&= a.readOnly;
      v ||= a.destructive;
    }
    designHints.record(l.name, {
      readOnly: y,
      destructive: v,
    });
    c.push({
      name: l.name,
      description: l.description ?? "",
      inputSchema: l.inputSchema ?? {},
      readOnlyHint: y,
      destructiveHint: v,
    });
  }
  return c;
}
//@ chunk-171dhyhe.js:19485-19521 placement
function isUnknownDesignOperation(e) {
  return !getDesignHints().knows(e);
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
/**
 * 把字节数格式化成 “123B / 1.2KB”，用于错误与省略提示。
 */
function formatByteSize(e) {
  return e < 1024 ? `${e}B` : `${(e / 1024).toFixed(1)}KB`;
}
//@ chunk-171dhyhe.js:19815-19864 placement
/**
 * 计算字符串的 UTF-8 字节数（与 x 相同的实现，用于输出裁剪）。
 */
function utf8ByteLength(e) {
  return Buffer.byteLength(e, "utf8");
}
//@ chunk-171dhyhe.js:19864-20856 placement
function designOperationTitle(operation) {
  switch (operation) {
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
      return operation ?? "";
  }
}
//@ chunk-171dhyhe.js:20856-21255 placement
/**
 * Claude Design 工具的输出 schema：operation、content 块数组与 isError。
 */
var DesignToolInputSchema = DoctorLazy(() =>
  zodStrictObject({
    operation: string()
      .regex(/^[\w.-]{1,64}$/)
      .describe(
        `Claude Design action to perform. Call with "${LIST}" first to discover the available operations and their argument schemas.`,
      ),
    arguments: record(string(), unknown())
      .default({})
      .describe("Action input object (server-validated). Pass {} for operations that take no input."),
  }),
);
var designToolOutputSchema = DoctorLazy(() =>
  u({
    operation: string(),
    content: array(record(string(), unknown())),
    isError: M().optional(),
  }),
);
//@ chunk-171dhyhe.js:21255-21411 placement
function needsDesignWritePrompt(e) {
  let t = e.permissions();
  return (
    !e.isNonInteractiveSession &&
    t.mode !== "bypassPermissions" &&
    !(t.mode === "plan" && t.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-171dhyhe.js:21411-21883 placement
/**
 * 分享范围到展示文案的映射（邀请成员、全组织可见、公开）。
 */
var DESIGN_WRITE_APPROVAL_NOTE =
  "Approving also lets writes and deletes to exactly these paths run without another prompt for up to 15 minutes (file contents are not shown again; anything to any other path will still ask).";
var SHARING_LABELS = {
  invited: "private: invited members only",
  org: "visible to your whole organization",
  public: "PUBLIC",
};
var MAX_PROJECT_NAME_DISPLAY_CHARS = 60;
var UNSAFE_PROJECT_TEXT_RE =
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
/**
 * 匹配各种引号与破折号写法，避免被用于伪造项目名。
 */
var TAG_CHAR_RE = /\uDB40[\uDC20-\uDC7F\uDD00-\uDDEF]|\uD834[\uDD73-\uDD7A]/;
var QUOTE_LIKE_CHARS_RE =
  /["\u201C\u201D\u201E\u201F\uFF02\u2033\u2036\u02BA\u02DD\u02EE\u05F4\u3003\u301D-\u301F\u275D\u275E\u2014\u2015]/;
//@ chunk-171dhyhe.js:22238-22401 placement
function canPromptForDesign(e) {
  if (e.agentContext?.agentType !== "main") return false;
  try {
    return !hasHookForEvent("PermissionRequest", e.sessionHooksRegistry, e.agentContext?.agentId ?? "");
  } catch {
    return false;
  }
}
//@ chunk-171dhyhe.js:22401-23375 placement
/**
 * 读取设计项目的名字、分享范围与 URL，做严格清洗（控制字符、可疑 Unicode、URL 形状），不合格返回 null。
 */
async function fetchDesignProjectInfo(e, projectId, signal, credentials) {
  try {
    let designConsentKey = await getDesignConsentKey(credentials);
    if (designConsentKey.ok !== true) return null;
    let l = await callDesignOperation(
      e,
      "get_project",
      {
        project_id: projectId,
      },
      designConsentKey.accessToken,
      signal,
      null,
      credentials,
    );
    if (l.isError === true) return null;
    for (let a of l.content)
      if (a?.type === "text" && typeof a.text === "string") {
        let y = jsonParse(a.text);
        let { name: v, url } = y;
        let scope = y.sharing?.scope;
        if (typeof v !== "string") return null;
        let trimmed = v.replace(/\s+/g, " ").trim();
        if (
          trimmed.length === 0 ||
          UNSAFE_PROJECT_TEXT_RE.test(trimmed) ||
          TAG_CHAR_RE.test(trimmed) ||
          hasStrayJoiners(trimmed) ||
          trimmed.includes("://")
        )
          return null;
        if (QUOTE_LIKE_CHARS_RE.test(trimmed)) return null;
        if (typeof scope !== "string" || !Object.hasOwn(SHARING_LABELS, scope)) return null;
        if (typeof url !== "string") return null;
        let w;
        try {
          w = new URL(url);
        } catch {
          return null;
        }
        if (
          w.protocol !== "https:" ||
          !w.pathname.endsWith(`/p/${projectId}`) ||
          w.username !== "" ||
          w.password !== "" ||
          w.search !== "" ||
          w.hash !== "" ||
          url.length > 200 ||
          /\s/.test(url) ||
          QUOTE_LIKE_CHARS_RE.test(url) ||
          UNSAFE_PROJECT_TEXT_RE.test(url) ||
          TAG_CHAR_RE.test(url) ||
          /[\u200C\u200D\uFE0F]/.test(url)
        )
          return null;
        let b = truncateToLength(trimmed, MAX_PROJECT_NAME_DISPLAY_CHARS);
        return {
          name: b === trimmed ? trimmed : `${b.trimEnd()}\u2026`,
          sharingLabel: SHARING_LABELS[scope],
          url,
        };
      }
    return null;
  } catch {
    if (signal.aborted) throw new AbortError();
    return null;
  }
}
//@ chunk-171dhyhe.js:23375-43714 placement
/**
 * Claude Design 工具（2.1.316 新增）：通过 /v1/design/mcp 与 claude.ai/design 的设计系统和项目交互（列出操作、读写文件、渲染预览、finalize_plan），写操作需要项目授权与同意。
 */
var DesignTool = buildTool({
  name: CLAUDE_DESIGN_TOOL_NAME,
  searchHint: "work with Claude Design (claude.ai/design) projects",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  get inputSchema() {
    return DesignToolInputSchema();
  },
  get outputSchema() {
    return designToolOutputSchema();
  },
  isEnabled: isDesignSyncEnabled,
  isConcurrencySafe(e) {
    if (e.operation === LIST) return true;
    return (designHintsFor(e.operation) ?? designOperationTraits(e.operation))?.readOnly === true;
  },
  isReadOnly(e) {
    if (e.operation === LIST) return true;
    return (designHintsFor(e.operation) ?? designOperationTraits(e.operation))?.readOnly === true;
  },
  async description() {
    return claudeDesignToolDescription(isAnyFeatureAvailable());
  },
  async prompt() {
    return claudeDesignToolDescription(isAnyFeatureAvailable());
  },
  userFacingName(e) {
    let t = designOperationTitle(e?.operation);
    return t ? `Claude Design: ${t}` : "Claude Design";
  },
  toAutoClassifierInput(e) {
    return {
      operation: e.operation,
      arguments: e.arguments ?? {},
    };
  },
  create(e) {
    return {
      async validateInput(t) {
        let c = describeDesignOperation(t.operation, t.arguments);
        if (c)
          return {
            result: false,
            message: c,
            errorCode: 1,
          };
        if (t.operation === "finalize_plan") {
          let projectId = t.arguments?.project_id;
          if (typeof projectId !== "string" || projectId.length === 0)
            return {
              result: false,
              message:
                "ClaudeDesign finalize_plan: project_id is required (a plan is always scoped to one project).",
              errorCode: 1,
            };
          if (!/^[A-Za-z0-9._-]+$/.test(projectId))
            return {
              result: false,
              message:
                "ClaudeDesign finalize_plan: project_id contains characters outside the server id charset (letters, digits, dot, underscore, dash).",
              errorCode: 1,
            };
          if (projectId.length > MAX_PLAN_PATH_CHARS_2 - 2)
            return {
              result: false,
              message: "ClaudeDesign finalize_plan: project_id is longer than any server-issued project id.",
              errorCode: 1,
            };
        }
        return {
          result: true,
        };
      },
      async checkPermissions(t, c) {
        let n = e;
        let state = n.toolState.get(DesignGateState);
        let l = t.operation === LIST ? null : await checkDesignConsent(state, n.credentials);
        let a = {
          ...t,
          __consentBitShown: l,
          __consentAskCanReachUser: needsDesignWritePrompt(n),
          __projectGrantAskShown: undefined,
          __projectGrantServerObserved: undefined,
          __reservedTargetsAskShown: undefined,
          __finalizePlanAskShown: undefined,
        };
        let y = l !== null ? DESIGN_CONSENT_PROMPT(l) : null;
        if (t.operation === "finalize_plan" && t.arguments?.scope === "project")
          return {
            behavior: "deny",
            message:
              'ClaudeDesign finalize_plan: scope "project" is no longer supported by this client. Write files directly without plan_token \u2014 the first write to a project asks for a one-time durable approval \u2014 or use finalize_plan with writes/deletes for path-scoped plans and deletes.',
            decisionReason: {
              type: "safetyCheck",
              reason: 'finalize_plan scope:"project" is superseded by the durable per-project write grant',
              classifierApprovable: false,
            },
          };
        let v =
          t.operation === LIST
            ? {
                readOnly: true,
                destructive: false,
              }
            : (designHintsFor(t.operation) ?? designOperationTraits(t.operation));
        let h = v?.readOnly !== true;
        let m = h && v?.destructive !== false;
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
              classifierApprovable: false,
            },
          };
        if (y) {
          if (
            (t.operation === "write_files" || t.operation === "create_support_js") &&
            !(typeof t.arguments?.plan_token === "string" && t.arguments.plan_token.length > 0)
          ) {
            let b = checkPlanGatedTargets(t.operation, t.arguments);
            if (b.outcome !== "pass" || !projectsFitOnCard(b.targets)) {
              let D = b.targets !== undefined && b.targets.length === 0;
              let j = b.outcome === "pass";
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
                  classifierApprovable: false,
                },
              };
            }
          }
          let f = h ? `Design ${t.operation} writes to claude.ai/design.` : "";
          let w = t.operation === "finalize_plan" ? DESIGN_WRITE_APPROVAL_NOTE : "";
          return {
            behavior: "ask",
            message: [y, f, w].filter(Boolean).join(" "),
            updatedInput:
              t.operation === "finalize_plan"
                ? {
                    ...a,
                    __finalizePlanAskShown: true,
                  }
                : a,
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason:
                "design agent consent \u2014 approving records a server-side grant for Claude agents to read and write your design projects",
              classifierApprovable: false,
            },
          };
        }
        if (!h)
          return {
            behavior: "allow",
            updatedInput: a,
          };
        if (
          n.permissions().mode !== "plan" &&
          canPromptForDesign(n) &&
          checkDesignPlanToken(state, t.operation, t.arguments).outcome === "allow"
        )
          return {
            behavior: "allow",
            updatedInput: a,
          };
        if (
          (t.operation === "write_files" || t.operation === "create_support_js") &&
          !(typeof t.arguments?.plan_token === "string" && t.arguments.plan_token.length > 0)
        ) {
          if (n.isNonInteractiveSession === true) {
            let w = {
              behavior: "deny",
              message: `ClaudeDesign ${t.operation}: writing without a plan_token requires a one-time interactive project approval, which is not available in non-interactive sessions \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
              decisionReason: {
                type: "safetyCheck",
                reason:
                  "a durable project write grant requires an interactive approval with a server-verified project identity",
                classifierApprovable: false,
              },
            };
            let projectId = t.arguments?.project_id;
            if (
              typeof projectId !== "string" ||
              projectId.length === 0 ||
              !canPromptForDesign(n) ||
              isRecardProject(state, projectId)
            )
              return w;
            if (checkPlanGatedTargets(t.operation, t.arguments).outcome !== "pass") return w;
            if (n.permissions().mode === "plan") return w;
            if (isProjectGrantVerified(state, projectId))
              return {
                behavior: "allow",
                updatedInput: a,
              };
            if (
              (await checkDesignGrant(state, projectId, n.credentials)) === "granted" &&
              !isRecardProject(state, projectId)
            ) {
              markProjectGrantVerified(state, projectId);
              if (n.permissions().mode !== "plan")
                return {
                  behavior: "allow",
                  updatedInput: a,
                };
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
                classifierApprovable: false,
              },
            };
          let projectId = t.arguments?.project_id;
          if (typeof projectId === "string" && projectId.length > 0) {
            if (isGrantIneligibleProject(state, projectId))
              return {
                behavior: "deny",
                message: `ClaudeDesign ${t.operation}: this project cannot hold a durable write grant for this account (it may be shared from another organization) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "the server refused to mint a durable grant for this project \u2014 per-batch plans only",
                  classifierApprovable: false,
                },
              };
            let w = checkPlanGatedTargets(t.operation, t.arguments);
            let b = n.permissions().mode === "plan";
            if (w.outcome === "pass" && b) {
              if (!(
                isProjectGrantVerified(state, projectId) ||
                (!isRecardProject(state, projectId) &&
                  (await checkDesignGrant(state, projectId, n.credentials)) === "granted" &&
                  !isRecardProject(state, projectId))
              ))
                return {
                  behavior: "deny",
                  message: `ClaudeDesign ${t.operation}: writing without a plan_token requires a one-time project approval, which is not shown in plan mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "a durable project write grant cannot be minted from plan mode \u2014 per-batch plans only",
                    classifierApprovable: false,
                  },
                };
              markProjectGrantVerified(state, projectId);
            } else if (w.outcome === "pass") {
              if (isProjectGrantVerified(state, projectId))
                return {
                  behavior: "allow",
                  updatedInput: a,
                };
              let D = await checkDesignGrant(state, projectId, n.credentials);
              if (D === "granted" && !isRecardProject(state, projectId)) {
                markProjectGrantVerified(state, projectId);
                if (n.permissions().mode !== "plan")
                  return {
                    behavior: "allow",
                    updatedInput: a,
                  };
              } else if (D === "unavailable")
                return {
                  behavior: "deny",
                  message: `ClaudeDesign ${t.operation}: could not check for a project write grant (this server may not support durable grants) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "the grant state could not be verified \u2014 fail toward the per-batch plan flow",
                    classifierApprovable: false,
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
                          classifierApprovable: false,
                        },
                      };
                let R = j();
                if (R) return R;
                if (!needsDesignWritePrompt(n))
                  return {
                    behavior: "deny",
                    message: `ClaudeDesign ${t.operation}: writing without a plan_token to a project without a write grant requires a one-time interactive approval, which cannot be shown in this permission mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason:
                        "a durable project write grant requires an interactive approval with a server-verified project identity",
                      classifierApprovable: false,
                    },
                  };
                let designProjectInfo = await fetchDesignProjectInfo(
                  state,
                  projectId,
                  c.signal,
                  n.credentials,
                );
                if (designProjectInfo === null)
                  return {
                    behavior: "deny",
                    message: `ClaudeDesign ${t.operation}: a durable project write grant is only offered when the approval dialog can name its target, and the project identity (name, sharing, URL) could not be verified or rendered faithfully. If this is a fresh connection, read the project first (e.g. get_project \u2014 approve the Claude Design connection if prompted) and retry once; otherwise use finalize_plan with writes/deletes and pass the returned plan_token (the per-batch flow), which is always supported.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason:
                        "a durable project write grant requires a server-verified project identity in the approval card",
                      classifierApprovable: false,
                    },
                  };
                let g = j();
                if (g) return g;
                return {
                  behavior: "ask",
                  message: `Approving writes the listed files now, and lets Claude write to ANY file in the project "${designProjectInfo.name}" (${designProjectInfo.sharingLabel}) \u2014 ${designProjectInfo.url} \u2014 without asking again. This approval is remembered for this project until you revoke it in settings at claude.ai/design (future writes and file contents are not shown for approval). Deletes and CLAUDE.md/.claude paths still ask every time.`,
                  updatedInput: {
                    ...a,
                    __projectGrantAskShown: projectId,
                  },
                  localDisplayOnly: true,
                  serverApprovalWatch: {
                    kind: "design_project_grant",
                    projectId,
                  },
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "first write under a project grant \u2014 approval mints a durable write grant for this project, revocable at claude.ai/design settings",
                    classifierApprovable: false,
                  },
                };
              }
            } else {
              if (!(
                projectsFitOnCard(w.targets) &&
                (isProjectGrantVerified(state, projectId) ||
                  (!isRecardProject(state, projectId) &&
                    (await checkDesignGrant(state, projectId, n.credentials)) === "granted" &&
                    !isRecardProject(state, projectId)))
              )) {
                let R = w.targets !== undefined && w.targets.length === 0;
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
                    classifierApprovable: false,
                  },
                };
              }
              markProjectGrantVerified(state, projectId);
              return {
                behavior: "ask",
                message: `Design ${t.operation} writes to claude.ai/design.`,
                updatedInput: {
                  ...a,
                  __reservedTargetsAskShown: true,
                },
                localDisplayOnly: true,
                decisionReason: {
                  type: "safetyCheck",
                  reason: m
                    ? "destructive \u2014 model-generated arguments"
                    : "remote write \u2014 model-generated arguments",
                  classifierApprovable: false,
                },
              };
            }
          }
        }
        if (t.operation === "finalize_plan")
          return {
            behavior: "ask",
            message: `Design finalize_plan writes to claude.ai/design. ${DESIGN_WRITE_APPROVAL_NOTE}`,
            updatedInput: {
              ...a,
              __finalizePlanAskShown: true,
            },
            localDisplayOnly: true,
            decisionReason: {
              type: "safetyCheck",
              reason:
                "finalize_plan \u2014 the human is the path-review boundary; approval also grants prompt-free writes to these paths for 15 min",
              classifierApprovable: false,
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
              classifierApprovable: false,
            },
          };
        return {
          behavior: "ask",
          message: `Design ${t.operation} writes to claude.ai/design.`,
          updatedInput: a,
          decisionReason: {
            type: "safetyCheck",
            reason: "remote write \u2014 model-generated arguments",
            classifierApprovable: false,
          },
        };
      },
      async call(t, c) {
        let n = e;
        let r = n.toolState.get(DesignGateState);
        let __consentAskCanReachUser = t.__consentAskCanReachUser ?? false;
        let a = __consentAskCanReachUser && needsDesignWritePrompt(n);
        if (t.operation === "finalize_plan" && __consentAskCanReachUser) {
          let projectId = (t.arguments ?? {}).project_id;
          if (typeof projectId === "string" && projectId.length > 0) clearApprovedPlans(r, projectId);
        }
        if (MEMBERSHIP_METHODS.has(t.operation)) {
          let projectId = (t.arguments ?? {}).project_id;
          if (typeof projectId === "string" && projectId.length > 0) {
            clearApprovedPlans(r, projectId);
            clearPlansForProject(r, projectId);
            clearVerifiedProjectGrant(r, projectId);
            markRecardProject(r, projectId);
          }
        }
        let designConsentKey = await getDesignConsentKey(n.credentials);
        if (!designConsentKey.ok) {
          let s = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            designCredentialErrorMessage(designConsentKey, {
              isNonInteractiveSession: n.isNonInteractiveSession,
            }),
            "design_tool_auth_failed",
          );
          throw designConsentKey.reason === "needs_design_login"
            ? tagObject(s, {
                kind: "design_needs_authorization",
                provider: "claude_design",
              })
            : s;
        }
        let accessToken = designConsentKey.accessToken;
        let __consentBitShown = t.__consentBitShown ?? null;
        let __projectGrantAskShown = t.__projectGrantAskShown ?? null;
        let f = t.__projectGrantServerObserved === true;
        let w = (() => {
          if (t.operation !== "write_files" && t.operation !== "create_support_js") return null;
          let s = t.arguments ?? {};
          if (typeof s.plan_token === "string" && s.plan_token.length > 0) return null;
          let projectId = s.project_id;
          return typeof projectId === "string" && projectId.length > 0 ? projectId : null;
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
          let s = checkPlanGatedTargets(t.operation, t.arguments);
          let g = t.__reservedTargetsAskShown === true;
          if (s.outcome !== "pass" && !g)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${t.operation} without a plan_token: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
              "design_tool_exec_backstop_safety_trip",
            );
        }
        let signal = c.signal;
        let agentId = n.agentContext?.agentId ?? null;
        let j;
        try {
          j = await R({});
          if (
            t.operation === "finalize_plan" &&
            t.__finalizePlanAskShown === true &&
            a &&
            canPromptForDesign(n)
          ) {
            let s = t.arguments ?? {};
            let g = j.isError !== true ? readPlanTokenFromResult(j.content) : null;
            let S = (k) => (Array.isArray(k) ? k.filter((T) => typeof T === "string") : []);
            if (g !== null && typeof s.project_id === "string" && s.scope !== "project")
              approveDesignPlan(r, g.token, {
                projectId: s.project_id,
                writes: S(s.writes),
                deletes: S(s.deletes),
                serverExpiresAtMs: g.expiresAtMs ?? undefined,
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
            throw g.remedy === undefined ? S : tagObject(S, g.remedy);
          }
          if (error instanceof DesignNeedsScopesError && n.isNonInteractiveSession)
            throw new DesignNeedsScopesError({
              isNonInteractiveSession: true,
            });
          throw error;
        }
        return {
          data: j,
        };
        async function R(s) {
          try {
            let g = await callDesignOperation(
              r,
              t.operation,
              t.arguments,
              accessToken,
              signal,
              agentId,
              n.credentials,
            );
            if (__consentBitShown !== null && !signal.aborted && g.isError !== true)
              setDesignConsent(r, __consentBitShown, true);
            if (
              w !== null &&
              !signal.aborted &&
              g.isError !== true &&
              ((__projectGrantAskShown === w && !f) || !isRecardProject(r, w))
            )
              markProjectGrantVerified(r, w);
            return g;
          } catch (error) {
            if (error instanceof DesignNeedsProjectGrantError) {
              clearVerifiedProjectGrant(r, error.projectId);
              invalidateDesignConsentCache(r);
              if (s.grant === true) throw error;
              if (error.projectId !== __projectGrantAskShown || f) {
                if (t.operation === "write_files" || t.operation === "create_support_js") {
                  if (n.isNonInteractiveSession === true)
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
              return R({
                ...s,
                grant: true,
              });
            }
            if (!(error instanceof DesignNeedsConsentError)) throw error;
            if (s.consent === true) throw error;
            let consent = error.consent;
            if (consent !== __consentBitShown) {
              setDesignConsent(r, consent, false);
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${DESIGN_CONSENT_PROMPT(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
                "design_tool_needs_consent_not_shown",
              );
            }
            if (!a) {
              setDesignConsent(r, consent, false);
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${DESIGN_CONSENT_PROMPT(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
                "design_tool_needs_consent_no_prompt",
              );
            }
            await recordDesignConsent(r, consent, n.credentials);
            return R({
              ...s,
              consent: true,
            });
          }
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    let c = capDesignImageBlocks(e.content.flatMap(designContentToBlocks));
    let n = e.isError
      ? c
          .flatMap((r) => (r.type === "text" ? [r.text] : []))
          .join(
            `
`,
          )
          .trim() || "(error with no message)"
      : null;
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      is_error: e.isError,
      content: n ?? (c.length > 0 ? c : "(empty result)"),
    };
  },
  renderToolUseMessage(e, { verbose }) {
    let n = (s, g = 80) => {
      let replaced = s.replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
      return replaced.length > g ? replaced.slice(0, g).trimEnd() + "\u2026" : replaced;
    };
    let r = e.arguments;
    if (!r || Object.keys(r).length === 0) return "";
    if (!verbose) {
      let s = {};
      for (let [key, value] of Object.entries(r))
        if (Array.isArray(value)) {
          let k = key === "messages" ? "message" : key === "validators" ? "validator" : "file";
          s[k] = (s[k] ?? 0) + value.length;
        }
      return Object.entries(s)
        .map(([key, value]) => `${value} ${value === 1 ? key : key + "s"}`)
        .join(", ");
    }
    if (
      !Object.hasOwn(WRITE_OP_SCHEMAS, e.operation ?? "") &&
      !Object.hasOwn(READ_OP_SCHEMAS, e.operation ?? "")
    ) {
      let s = jsonStringify(r) ?? "";
      return `${n(e.operation ?? "")} (${formatByteSize(utf8ByteLength(s))} of arguments not shown \u2014 operation unknown to this client version)`;
    }
    let l = (s, g) => {
      if (typeof s === "string")
        return s.length > 80 ? `${n(s)} (${formatByteSize(utf8ByteLength(s))})` : n(s);
      if (typeof s === "object" && s !== null) {
        let k = s;
        let T = utf8ByteLength(jsonStringify(s) ?? "");
        if (typeof k.path === "string") {
          let I = typeof k.data === "string" ? k.data : "";
          let filtered = ["encoding", "local_path", "if_match"].filter(
            (P) => typeof k[P] === "string" && k[P],
          );
          let E = `${n(k.path)} (${formatByteSize(T)})${filtered.length ? ` [+${filtered.join(",")}]` : ""}`;
          return g > 0 && I ? `${E}: ${n(I, g)}` : E;
        }
        if (typeof k.content === "string") {
          let role = typeof k.role === "string" ? k.role : "?";
          let z = `${n(role, 12)} (${formatByteSize(T)})`;
          return g > 0 && k.content ? `${z}: ${n(k.content, g)}` : z;
        }
        if (typeof k.src === "string" || typeof k.dest === "string")
          return `${n(String(k.src ?? "?"), 40)} \u2192 ${n(String(k.dest ?? "?"), 40)}${k.src_project_id ? ` [from ${n(String(k.src_project_id), 24)}]` : ""}${typeof k.if_match === "string" && k.if_match ? " [+if_match]" : ""}${T > 256 ? ` (${formatByteSize(T)})` : ""}`;
      }
      let S = jsonStringify(s) ?? String(s);
      return `${n(S)} (${formatByteSize(utf8ByteLength(S))})`;
    };
    let a = (s) =>
      typeof s === "string"
        ? n(s, 40)
        : typeof s === "object" && s !== null
          ? n(String(s.path ?? s.dest ?? s.role ?? "?"), 40)
          : "?";
    let y = (s) => {
      if (Array.isArray(s) && s.length > 0) {
        let sliced = s.slice(0, 20);
        let k = verbose ? Math.max(0, Math.min(200, Math.floor(1800 / sliced.length) - 95)) : 0;
        let T =
          verbose &&
          k === 0 &&
          sliced.some((E) => {
            if (typeof E !== "object" || E === null) return false;
            let P = E;
            return (typeof P.data === "string" && P.data) || (typeof P.content === "string" && P.content);
          });
        let sliced_2 = s.slice(20);
        let z =
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
      return g.length > 80 ? `${n(g)} (${formatByteSize(utf8ByteLength(g))})` : n(g);
    };
    let sorted = Object.entries(r).sort(
      ([, s], [, g]) => Number(Array.isArray(s)) - Number(Array.isArray(g)),
    );
    let filtered = sorted.filter(([, s]) => Array.isArray(s));
    let m = filtered.length >= 2 ? ` (${filtered.map(([s, g]) => `${n(s)}: ${g.length}`).join(", ")})` : "";
    let joined = sorted.map(([s, g]) => `${n(s)}: ${y(g)}`).join(", ");
    let w = jsonStringify(r) ?? "";
    let b = utf8ByteLength(w);
    let j = `${b > 256 ? ` (${formatByteSize(b)} total)` : ""}${m} ${joined}`.trimStart();
    let R = verbose ? 2000 : 1500;
    return j.length > R ? j.slice(0, R - 1).trimEnd() + "\u2026" : j;
  },
});
//@ chunk-171dhyhe.js:43714-43772 placement
/**
 * 单个 render_preview 图片 base64 的字符上限，超出换成说明文本。
 */
var DESIGN_IMAGE_MEDIA_PATTERN = /^image\/(png|jpeg|gif|webp)$/;
var MAX_PREVIEW_IMAGE_CHARS = 130000;
var MAX_RESULT_IMAGE_CHARS = 130000;
//@ chunk-171dhyhe.js:43772-44240 placement
function designContentToBlocks(e) {
  if (e.type === "text" && typeof e.text === "string")
    return [
      {
        type: "text",
        text: e.text,
      },
    ];
  if (
    e.type === "image" &&
    typeof e.data === "string" &&
    typeof e.mimeType === "string" &&
    DESIGN_IMAGE_MEDIA_PATTERN.test(e.mimeType)
  ) {
    if (e.data.length > MAX_PREVIEW_IMAGE_CHARS)
      return [
        {
          type: "text",
          text: `[render_preview image omitted \u2014 ${Math.round(e.data.length / 1024)}KB exceeds ${Math.round(MAX_PREVIEW_IMAGE_CHARS / 1024)}KB cap]`,
        },
      ];
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: e.mimeType,
          data: e.data,
        },
      },
    ];
  }
  return [
    {
      type: "text",
      text: jsonStringify(e) ?? "",
    },
  ];
}
//@ chunk-171dhyhe.js:44358-44646 placement
function capDesignImageBlocks(e) {
  let t = MAX_RESULT_IMAGE_CHARS;
  let c = [];
  let n = 0;
  let r = 0;
  for (let l of e) {
    let a = isBase64ImageBlock_2(l);
    if (a <= t) {
      t -= a;
      c.push(l);
    } else {
      n++;
      r += a;
    }
  }
  if (n > 0)
    c.push({
      type: "text",
      text: `[ClaudeDesign result truncated \u2014 ${n} block(s) (${Math.round(r / 1024)}k chars) omitted; aggregate over ${Math.round(MAX_RESULT_IMAGE_CHARS / 1024)}k-char cap]`,
    });
  return c;
}
export {
  isUnknownDesignOperation,
  designHintsFor,
  redactToken,
  recordDesignTools,
  getOAuthHeaders,
  MAX_RESULT_IMAGE_CHARS,
};
