/**
 * tools/DesignTool/DesignTool.ts
 *
 * 2.1.316 新增：Claude Design 工具：操作目录（只读/破坏性属性）、输入 schema、调用与结果转换。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ma8ytfb3.js (27)
 * attribution: placement 27
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  unknown,
  booleanSchema,
  zodStrictObject,
  record,
  objectSchema,
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
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-ma8ytfb3.js:13616-13665 placement
/**
 * 计算字符串的 UTF-8 字节数，用于校验操作参数长度。
 */
function utf8ByteLengthShort(text) {
  return Buffer.byteLength(text, "utf8");
}
//@ chunk-ma8ytfb3.js:13665-16641 placement
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
//@ chunk-ma8ytfb3.js:16641-19655 placement
function describeDesignOperation(operation, args) {
  let schema = Object.hasOwn(WRITE_OP_SCHEMAS, operation)
    ? WRITE_OP_SCHEMAS[operation]
    : Object.hasOwn(READ_OP_SCHEMAS, operation)
      ? READ_OP_SCHEMAS[operation]
      : undefined;
  if (!schema) {
    let hints = designHintsFor(operation);
    if (hints?.readOnly === true) return null;
    if (hints !== undefined)
      return `ClaudeDesign ${operation}: the server reports this operation as write-capable, and this client version can't validate its arguments (it needs a WRITE_OP_SCHEMAS entry). Update Claude Code to use it.`;
    return `ClaudeDesign ${operation}: unrecognized operation. If the server added it recently, call {operation: "list"} first \u2014 a read-only operation becomes callable after discovery; a write-tier operation needs a WRITE_OP_SCHEMAS entry in this client.`;
  }
  let prefix = `ClaudeDesign ${operation}`;
  let truncateName = (value) => (value.length > 60 ? value.slice(0, 60) + "\u2026" : value);
  if (
    operation === "finalize_plan" &&
    args?.scope === "project" &&
    (args.writes !== undefined || args.deletes !== undefined)
  )
    return `${prefix}: scope "project" takes no writes/deletes \u2014 a project-scoped plan covers every path in the project.`;
  for (let [key, value] of Object.entries(args ?? {})) {
    if (!schema.top.has(key)) {
      let found = [...schema.top].find((allowedKey) => allowedKey.toLowerCase() === key.toLowerCase());
      let joined = [...schema.top].join(", ");
      return `${prefix}: unrecognized argument '${truncateName(key)}'${found ? ` (did you mean '${found}'?)` : ""}. ${joined ? `Allowed: ${joined}.` : "This operation takes no arguments."}`;
    }
    if (!(key in (schema.arrays ?? {})) && typeof value === "object" && value !== null)
      return `${prefix}.${key}: must be a scalar (string/bool/number), not ${Array.isArray(value) ? "an array" : "an object"}.`;
    let maxBytes = key === "plan_token" ? 65536 : 4096;
    if (typeof value === "string" && utf8ByteLengthShort(value) > maxBytes)
      return `${prefix}.${key}: too long (${utf8ByteLengthShort(value)} bytes; capped at ${maxBytes}).`;
    let enumSpec = "scalarEnums" in schema ? schema.scalarEnums?.[key] : undefined;
    if (enumSpec !== undefined) {
      let isCaseInsensitive = "accepts" in enumSpec;
      let acceptedValues = isCaseInsensitive ? enumSpec.accepts : enumSpec;
      let normalizedValue =
        isCaseInsensitive && typeof value === "string" ? value.trim().toLowerCase() : value;
      if (typeof normalizedValue !== "string" || !acceptedValues.has(normalizedValue))
        return `${prefix}.${key}: must be one of ${[...acceptedValues].map((allowedValue) => `"${allowedValue}"`).join(", ")}${isCaseInsensitive ? " (case-insensitive)" : ""}.`;
      if (isCaseInsensitive && typeof value === "string" && value.length > normalizedValue.length + 2)
        return `${prefix}.${key}: excess whitespace around the value.`;
    }
  }
  for (let [key, value] of Object.entries(schema.arrays ?? {})) {
    let items = args?.[key];
    if (items === undefined) continue;
    if (!Array.isArray(items)) return `${prefix}.${key}: must be an array.`;
    for (let j = 0; j < items.length; j++) {
      let item = items[j];
      if (value === "string") {
        if (typeof item !== "string") return `${prefix}.${key}[${j}]: must be a string.`;
        if (utf8ByteLengthShort(item) > 4096)
          return `${prefix}.${key}[${j}]: too long (${utf8ByteLengthShort(item)} bytes; capped at 4096).`;
      } else {
        if (typeof item !== "object" || item === null || Array.isArray(item))
          return `${prefix}.${key}[${j}]: must be an object with keys from {${[...value.fields].join(", ")}}.`;
        for (let requiredField of value.required)
          if (typeof item[requiredField] !== "string")
            return `${prefix}.${key}[${j}]: missing required field '${requiredField}'.`;
        for (let [key_2, value_2] of Object.entries(item)) {
          if (!value.fields.has(key_2)) {
            let found = [...value.fields].find((field) => field.toLowerCase() === key_2.toLowerCase());
            return `${prefix}.${key}[${j}]: unrecognized field '${truncateName(key_2)}'${found ? ` (did you mean '${found}'?)` : key_2 === "content" ? " (did you mean 'data'? designmcp's write_files reads 'data', not 'content')" : ""}. Allowed: ${[...value.fields].join(", ")}.`;
          }
          if (typeof value_2 !== "string")
            return `${prefix}.${key}[${j}].${key_2}: must be a string (got ${Array.isArray(value_2) ? "array" : typeof value_2}).`;
          if (key_2 !== "data" && key_2 !== "content" && utf8ByteLengthShort(value_2) > 4096)
            return `${prefix}.${key}[${j}].${key_2}: too long (${utf8ByteLengthShort(value_2)} bytes; non-body fields are capped at 4096).`;
        }
      }
    }
  }
  return null;
}
//@ chunk-ma8ytfb3.js:19655-19707 placement
/**
 * 按操作名取 readOnly/destructive 属性（DESIGN_OPERATION_TRAITS）。
 */
function designOperationTraits(operation) {
  return Object.hasOwn(DESIGN_OPERATION_TRAITS, operation) ? DESIGN_OPERATION_TRAITS[operation] : undefined;
}
//@ chunk-ma8ytfb3.js:19707-19879 placement
var DESIGN_TOOL_ENTRY_SCHEMA = DoctorLazy(() =>
  looseObject({
    name: stringSchema(),
    description: stringSchema().optional(),
    inputSchema: unknown().optional(),
    annotations: looseObject({
      readOnlyHint: booleanSchema().optional(),
      destructiveHint: booleanSchema().optional(),
    }).optional(),
  }),
);
//@ chunk-ma8ytfb3.js:19879-20063 placement
class DesignHintsRegistry {
  byOperation = new Map();
  hintsFor(operation) {
    return this.byOperation.get(operation);
  }
  knows(operation) {
    return this.byOperation.has(operation);
  }
  record(operation, hints) {
    this.byOperation.set(operation, hints);
  }
  reset() {
    this.byOperation.clear();
  }
}
//@ chunk-ma8ytfb3.js:20063-20088 placement
/**
 * 按宿主隔离的“设计操作提示”注册表缓存。
 */
var designHintsByHost; // deferred: uses DesignHintsRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ma8ytfb3.js:20063", () => {
  designHintsByHost = new HostScoped(() => new DesignHintsRegistry());
});
//@ chunk-ma8ytfb3.js:20088-20125 placement
/**
 * 取出当前根会话宿主的设计操作提示注册表。
 */
function getDesignHints() {
  return designHintsByHost.of(getRootSession().host);
}
//@ chunk-ma8ytfb3.js:20125-20163 placement
function designHintsFor(operation) {
  return getDesignHints().hintsFor(operation);
}
//@ chunk-ma8ytfb3.js:20163-20633 placement
/**
 * 解析设计服务返回的操作列表，结合内置特性表确定只读/破坏性提示并登记，返回工具描述列表。
 */
function recordDesignTools(tools) {
  let designHints = getDesignHints();
  designHints.reset();
  let recordedTools = [];
  for (let tool of tools) {
    let parseResult = DESIGN_TOOL_ENTRY_SCHEMA().safeParse(tool);
    if (!parseResult.success) continue;
    let toolEntry = parseResult.data;
    let traits = Object.hasOwn(DESIGN_OPERATION_TRAITS, toolEntry.name)
      ? DESIGN_OPERATION_TRAITS[toolEntry.name]
      : undefined;
    let readOnly = toolEntry.annotations?.readOnlyHint ?? traits?.readOnly ?? false;
    let destructive = toolEntry.annotations?.destructiveHint ?? traits?.destructive ?? true;
    if (traits) {
      readOnly &&= traits.readOnly;
      destructive ||= traits.destructive;
    }
    designHints.record(toolEntry.name, {
      readOnly,
      destructive,
    });
    recordedTools.push({
      name: toolEntry.name,
      description: toolEntry.description ?? "",
      inputSchema: toolEntry.inputSchema ?? {},
      readOnlyHint: readOnly,
      destructiveHint: destructive,
    });
  }
  return recordedTools;
}
//@ chunk-ma8ytfb3.js:20633-20669 placement
function isUnknownDesignOperation(operation) {
  return !getDesignHints().knows(operation);
}
//@ chunk-ma8ytfb3.js:20669-20749 placement
function redactToken(text, token) {
  if (!token) return text;
  return text.split(token).join("[redacted-oauth-token]");
}
//@ chunk-ma8ytfb3.js:20749-20900 placement (2.1.88 match: getOAuthHeaders, 0.875)
function getOAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-client-platform": getClientPlatform(),
  };
}
//@ chunk-ma8ytfb3.js:20900-20963 placement
/**
 * 把字节数格式化成 “123B / 1.2KB”，用于错误与省略提示。
 */
function formatByteSize(bytes) {
  return bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}KB`;
}
//@ chunk-ma8ytfb3.js:20963-21012 placement
/**
 * 计算字符串的 UTF-8 字节数（与 x 相同的实现，用于输出裁剪）。
 */
function utf8ByteLength(text) {
  return Buffer.byteLength(text, "utf8");
}
//@ chunk-ma8ytfb3.js:21012-22004 placement
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
//@ chunk-ma8ytfb3.js:22004-22403 placement
/**
 * Claude Design 工具的输出 schema：operation、content 块数组与 isError。
 */
var DesignToolInputSchema; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var designToolOutputSchema;
deferInit("chunk-ma8ytfb3.js:22004", () => {
  DesignToolInputSchema = DoctorLazy(() =>
    zodStrictObject({
      operation: stringSchema()
        .regex(/^[\w.-]{1,64}$/)
        .describe(
          `Claude Design action to perform. Call with "${LIST}" first to discover the available operations and their argument schemas.`,
        ),
      arguments: record(stringSchema(), unknown())
        .default({})
        .describe("Action input object (server-validated). Pass {} for operations that take no input."),
    }),
  );
  designToolOutputSchema = DoctorLazy(() =>
    objectSchema({
      operation: stringSchema(),
      content: array(record(stringSchema(), unknown())),
      isError: booleanSchema().optional(),
    }),
  );
});
//@ chunk-ma8ytfb3.js:22403-22559 placement
function needsDesignWritePrompt(context) {
  let permissionState = context.permissions();
  return (
    !context.isNonInteractiveSession &&
    permissionState.mode !== "bypassPermissions" &&
    !(permissionState.mode === "plan" && permissionState.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-ma8ytfb3.js:22559-23031 placement
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
//@ chunk-ma8ytfb3.js:23031-23202 placement
function hasStrayJoiners(text) {
  return (
    /(?:^|\s)[\u200C\u200D\uFE0F]/.test(text) ||
    /[\u200C\u200D](?=\s|$)/.test(text) ||
    /[\u200C\u200D][\u200C\u200D]/.test(text) ||
    /(?:^|[^\p{Emoji}])\uFE0F/u.test(text)
  );
}
//@ chunk-ma8ytfb3.js:23202-23386 placement
/**
 * 匹配各种引号与破折号写法，避免被用于伪造项目名。
 */
var TAG_CHAR_RE = /\uDB40[\uDC20-\uDC7F\uDD00-\uDDEF]|\uD834[\uDD73-\uDD7A]/;
var QUOTE_LIKE_CHARS_RE =
  /["\u201C\u201D\u201E\u201F\uFF02\u2033\u2036\u02BA\u02DD\u02EE\u05F4\u3003\u301D-\u301F\u275D\u275E\u2014\u2015]/;
//@ chunk-ma8ytfb3.js:23386-23550 placement
function canPromptForDesign(context) {
  if (context.agentContext?.agentType !== "main") return false;
  try {
    return !hasHookForEvent(
      "PermissionRequest",
      context.sessionHooksRegistry,
      context.agentContext?.agentId ?? "",
    );
  } catch {
    return false;
  }
}
//@ chunk-ma8ytfb3.js:23550-24523 placement
/**
 * 读取设计项目的名字、分享范围与 URL，做严格清洗（控制字符、可疑 Unicode、URL 形状），不合格返回 null。
 */
async function fetchDesignProjectInfo(toolContext, projectId, signal, credentials) {
  try {
    let designConsentKey = await getDesignConsentKey(credentials);
    if (designConsentKey.ok !== true) return null;
    let projectResult = await callDesignOperation(
      toolContext,
      "get_project",
      {
        project_id: projectId,
      },
      designConsentKey.accessToken,
      signal,
      null,
      credentials,
    );
    if (projectResult.isError === true) return null;
    for (let contentBlock of projectResult.content)
      if (contentBlock?.type === "text" && typeof contentBlock.text === "string") {
        let projectInfo = jsonParse(contentBlock.text);
        let { name: projectName, url } = projectInfo;
        let scope = projectInfo.sharing?.scope;
        if (typeof projectName !== "string") return null;
        let text = projectName.replace(/\s+/g, " ").trim();
        if (
          text.length === 0 ||
          UNSAFE_PROJECT_TEXT_RE.test(text) ||
          TAG_CHAR_RE.test(text) ||
          hasStrayJoiners(text) ||
          text.includes("://")
        )
          return null;
        if (QUOTE_LIKE_CHARS_RE.test(text)) return null;
        if (typeof scope !== "string" || !Object.hasOwn(SHARING_LABELS, scope)) return null;
        if (typeof url !== "string") return null;
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch {
          return null;
        }
        if (
          parsedUrl.protocol !== "https:" ||
          !parsedUrl.pathname.endsWith(`/p/${projectId}`) ||
          parsedUrl.username !== "" ||
          parsedUrl.password !== "" ||
          parsedUrl.search !== "" ||
          parsedUrl.hash !== "" ||
          url.length > 200 ||
          /\s/.test(url) ||
          QUOTE_LIKE_CHARS_RE.test(url) ||
          UNSAFE_PROJECT_TEXT_RE.test(url) ||
          TAG_CHAR_RE.test(url) ||
          /[\u200C\u200D\uFE0F]/.test(url)
        )
          return null;
        let trimmedName = truncateToLength(text, MAX_PROJECT_NAME_DISPLAY_CHARS);
        return {
          name: trimmedName === text ? text : `${trimmedName.trimEnd()}\u2026`,
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
//@ chunk-ma8ytfb3.js:24523-44862 placement
/**
 * Claude Design 工具（2.1.316 新增）：通过 /v1/design/mcp 与 claude.ai/design 的设计系统和项目交互（列出操作、读写文件、渲染预览、finalize_plan），写操作需要项目授权与同意。
 */
var DesignTool; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ma8ytfb3.js:24523", () => {
  DesignTool = buildTool({
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
    isConcurrencySafe(input) {
      if (input.operation === LIST) return true;
      return (designHintsFor(input.operation) ?? designOperationTraits(input.operation))?.readOnly === true;
    },
    isReadOnly(input) {
      if (input.operation === LIST) return true;
      return (designHintsFor(input.operation) ?? designOperationTraits(input.operation))?.readOnly === true;
    },
    async description() {
      return claudeDesignToolDescription(isAnyFeatureAvailable());
    },
    async prompt() {
      return claudeDesignToolDescription(isAnyFeatureAvailable());
    },
    userFacingName(input) {
      let operationTitle = designOperationTitle(input?.operation);
      return operationTitle ? `Claude Design: ${operationTitle}` : "Claude Design";
    },
    toAutoClassifierInput(input) {
      return {
        operation: input.operation,
        arguments: input.arguments ?? {},
      };
    },
    create(toolContext) {
      return {
        async validateInput(input) {
          let validationMessage = describeDesignOperation(input.operation, input.arguments);
          if (validationMessage)
            return {
              result: false,
              message: validationMessage,
              errorCode: 1,
            };
          if (input.operation === "finalize_plan") {
            let projectId = input.arguments?.project_id;
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
                message:
                  "ClaudeDesign finalize_plan: project_id is longer than any server-issued project id.",
                errorCode: 1,
              };
          }
          return {
            result: true,
          };
        },
        async checkPermissions(input, callOptions) {
          let context = toolContext;
          let gateState = context.toolState.get(DesignGateState);
          let consentAsk =
            input.operation === LIST ? null : await checkDesignConsent(gateState, context.credentials);
          let annotatedInput = {
            ...input,
            __consentBitShown: consentAsk,
            __consentAskCanReachUser: needsDesignWritePrompt(context),
            __projectGrantAskShown: undefined,
            __projectGrantServerObserved: undefined,
            __reservedTargetsAskShown: undefined,
            __finalizePlanAskShown: undefined,
          };
          let consentPrompt = consentAsk !== null ? DESIGN_CONSENT_PROMPT(consentAsk) : null;
          if (input.operation === "finalize_plan" && input.arguments?.scope === "project")
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
          let traits =
            input.operation === LIST
              ? {
                  readOnly: true,
                  destructive: false,
                }
              : (designHintsFor(input.operation) ?? designOperationTraits(input.operation));
          let isWrite = traits?.readOnly !== true;
          let isDestructiveWrite = isWrite && traits?.destructive !== false;
          if (
            input.operation === "copy_files" &&
            !(typeof input.arguments?.plan_token === "string" && input.arguments.plan_token.length > 0)
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
          if (consentPrompt) {
            if (
              (input.operation === "write_files" || input.operation === "create_support_js") &&
              !(typeof input.arguments?.plan_token === "string" && input.arguments.plan_token.length > 0)
            ) {
              let targetCheck = checkPlanGatedTargets(input.operation, input.arguments);
              if (targetCheck.outcome !== "pass" || !projectsFitOnCard(targetCheck.targets)) {
                let namesNoTargets = targetCheck.targets !== undefined && targetCheck.targets.length === 0;
                let targetsOk = targetCheck.outcome === "pass";
                return {
                  behavior: "deny",
                  message: namesNoTargets
                    ? `ClaudeDesign ${input.operation}: this call names no target paths \u2014 list the files to write, or use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`
                    : targetsOk
                      ? `ClaudeDesign ${input.operation}: this batch is too large to display fully for approval \u2014 split it into smaller batches, or use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`
                      : `ClaudeDesign ${input.operation}: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes/deletes and pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason: namesNoTargets
                      ? "a write batch naming no target paths \u2014 malformed call"
                      : targetsOk
                        ? "the batch cannot be rendered fully in the approval dialog \u2014 split it or use per-batch plans"
                        : "reserved or unenumerable target paths always require per-batch approval",
                    classifierApprovable: false,
                  },
                };
              }
            }
            let writeNote = isWrite ? `Design ${input.operation} writes to claude.ai/design.` : "";
            let finalizeNote = input.operation === "finalize_plan" ? DESIGN_WRITE_APPROVAL_NOTE : "";
            return {
              behavior: "ask",
              message: [consentPrompt, writeNote, finalizeNote].filter(Boolean).join(" "),
              updatedInput:
                input.operation === "finalize_plan"
                  ? {
                      ...annotatedInput,
                      __finalizePlanAskShown: true,
                    }
                  : annotatedInput,
              localDisplayOnly: true,
              decisionReason: {
                type: "safetyCheck",
                reason:
                  "design agent consent \u2014 approving records a server-side grant for Claude agents to read and write your design projects",
                classifierApprovable: false,
              },
            };
          }
          if (!isWrite)
            return {
              behavior: "allow",
              updatedInput: annotatedInput,
            };
          if (
            context.permissions().mode !== "plan" &&
            canPromptForDesign(context) &&
            checkDesignPlanToken(gateState, input.operation, input.arguments).outcome === "allow"
          )
            return {
              behavior: "allow",
              updatedInput: annotatedInput,
            };
          if (
            (input.operation === "write_files" || input.operation === "create_support_js") &&
            !(typeof input.arguments?.plan_token === "string" && input.arguments.plan_token.length > 0)
          ) {
            if (context.isNonInteractiveSession === true) {
              let needsGrantDenial = {
                behavior: "deny",
                message: `ClaudeDesign ${input.operation}: writing without a plan_token requires a one-time interactive project approval, which is not available in non-interactive sessions \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "a durable project write grant requires an interactive approval with a server-verified project identity",
                  classifierApprovable: false,
                },
              };
              let projectId = input.arguments?.project_id;
              if (
                typeof projectId !== "string" ||
                projectId.length === 0 ||
                !canPromptForDesign(context) ||
                isRecardProject(gateState, projectId)
              )
                return needsGrantDenial;
              if (checkPlanGatedTargets(input.operation, input.arguments).outcome !== "pass")
                return needsGrantDenial;
              if (context.permissions().mode === "plan") return needsGrantDenial;
              if (isProjectGrantVerified(gateState, projectId))
                return {
                  behavior: "allow",
                  updatedInput: annotatedInput,
                };
              if (
                (await checkDesignGrant(gateState, projectId, context.credentials)) === "granted" &&
                !isRecardProject(gateState, projectId)
              ) {
                markProjectGrantVerified(gateState, projectId);
                if (context.permissions().mode !== "plan")
                  return {
                    behavior: "allow",
                    updatedInput: annotatedInput,
                  };
              }
              return needsGrantDenial;
            }
            if (!canPromptForDesign(context))
              return {
                behavior: "deny",
                message: `ClaudeDesign ${input.operation}: writing without a plan_token requires a one-time project approval, which is not available in subagent or PermissionRequest-hook sessions \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "a durable project write grant requires a context where the approval card reaches the user directly",
                  classifierApprovable: false,
                },
              };
            let projectId = input.arguments?.project_id;
            if (typeof projectId === "string" && projectId.length > 0) {
              if (isGrantIneligibleProject(gateState, projectId))
                return {
                  behavior: "deny",
                  message: `ClaudeDesign ${input.operation}: this project cannot hold a durable write grant for this account (it may be shared from another organization) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "the server refused to mint a durable grant for this project \u2014 per-batch plans only",
                    classifierApprovable: false,
                  },
                };
              let targetCheck = checkPlanGatedTargets(input.operation, input.arguments);
              let isPlanMode = context.permissions().mode === "plan";
              if (targetCheck.outcome === "pass" && isPlanMode) {
                if (!(
                  isProjectGrantVerified(gateState, projectId) ||
                  (!isRecardProject(gateState, projectId) &&
                    (await checkDesignGrant(gateState, projectId, context.credentials)) === "granted" &&
                    !isRecardProject(gateState, projectId))
                ))
                  return {
                    behavior: "deny",
                    message: `ClaudeDesign ${input.operation}: writing without a plan_token requires a one-time project approval, which is not shown in plan mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason:
                        "a durable project write grant cannot be minted from plan mode \u2014 per-batch plans only",
                      classifierApprovable: false,
                    },
                  };
                markProjectGrantVerified(gateState, projectId);
              } else if (targetCheck.outcome === "pass") {
                if (isProjectGrantVerified(gateState, projectId))
                  return {
                    behavior: "allow",
                    updatedInput: annotatedInput,
                  };
                let grantState = await checkDesignGrant(gateState, projectId, context.credentials);
                if (grantState === "granted" && !isRecardProject(gateState, projectId)) {
                  markProjectGrantVerified(gateState, projectId);
                  if (context.permissions().mode !== "plan")
                    return {
                      behavior: "allow",
                      updatedInput: annotatedInput,
                    };
                } else if (grantState === "unavailable")
                  return {
                    behavior: "deny",
                    message: `ClaudeDesign ${input.operation}: could not check for a project write grant (this server may not support durable grants) \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason:
                        "the grant state could not be verified \u2014 fail toward the per-batch plan flow",
                      classifierApprovable: false,
                    },
                  };
                else {
                  let planModeDenial = () =>
                    context.permissions().mode !== "plan"
                      ? null
                      : {
                          behavior: "deny",
                          message: `ClaudeDesign ${input.operation}: writing without a plan_token requires a one-time project approval, which is not shown in plan mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                          decisionReason: {
                            type: "safetyCheck",
                            reason:
                              "a durable project write grant cannot be minted from plan mode \u2014 per-batch plans only",
                            classifierApprovable: false,
                          },
                        };
                  let denial = planModeDenial();
                  if (denial) return denial;
                  if (!needsDesignWritePrompt(context))
                    return {
                      behavior: "deny",
                      message: `ClaudeDesign ${input.operation}: writing without a plan_token to a project without a write grant requires a one-time interactive approval, which cannot be shown in this permission mode \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                      decisionReason: {
                        type: "safetyCheck",
                        reason:
                          "a durable project write grant requires an interactive approval with a server-verified project identity",
                        classifierApprovable: false,
                      },
                    };
                  let designProjectInfo = await fetchDesignProjectInfo(
                    gateState,
                    projectId,
                    callOptions.signal,
                    context.credentials,
                  );
                  if (designProjectInfo === null)
                    return {
                      behavior: "deny",
                      message: `ClaudeDesign ${input.operation}: a durable project write grant is only offered when the approval dialog can name its target, and the project identity (name, sharing, URL) could not be verified or rendered faithfully. If this is a fresh connection, read the project first (e.g. get_project \u2014 approve the Claude Design connection if prompted) and retry once; otherwise use finalize_plan with writes/deletes and pass the returned plan_token (the per-batch flow), which is always supported.`,
                      decisionReason: {
                        type: "safetyCheck",
                        reason:
                          "a durable project write grant requires a server-verified project identity in the approval card",
                        classifierApprovable: false,
                      },
                    };
                  let scanResult = planModeDenial();
                  if (scanResult) return scanResult;
                  return {
                    behavior: "ask",
                    message: `Approving writes the listed files now, and lets Claude write to ANY file in the project "${designProjectInfo.name}" (${designProjectInfo.sharingLabel}) \u2014 ${designProjectInfo.url} \u2014 without asking again. This approval is remembered for this project until you revoke it in settings at claude.ai/design (future writes and file contents are not shown for approval). Deletes and CLAUDE.md/.claude paths still ask every time.`,
                    updatedInput: {
                      ...annotatedInput,
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
                  projectsFitOnCard(targetCheck.targets) &&
                  (isProjectGrantVerified(gateState, projectId) ||
                    (!isRecardProject(gateState, projectId) &&
                      (await checkDesignGrant(gateState, projectId, context.credentials)) === "granted" &&
                      !isRecardProject(gateState, projectId)))
                )) {
                  let namesNoTargets = targetCheck.targets !== undefined && targetCheck.targets.length === 0;
                  return {
                    behavior: "deny",
                    message: namesNoTargets
                      ? `ClaudeDesign ${input.operation}: this call names no target paths \u2014 list the files to write, or use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`
                      : `ClaudeDesign ${input.operation}: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes/deletes and pass the returned plan_token.`,
                    decisionReason: {
                      type: "safetyCheck",
                      reason: namesNoTargets
                        ? "a write batch naming no target paths \u2014 malformed call"
                        : "reserved or unenumerable target paths always require per-batch approval",
                      classifierApprovable: false,
                    },
                  };
                }
                markProjectGrantVerified(gateState, projectId);
                return {
                  behavior: "ask",
                  message: `Design ${input.operation} writes to claude.ai/design.`,
                  updatedInput: {
                    ...annotatedInput,
                    __reservedTargetsAskShown: true,
                  },
                  localDisplayOnly: true,
                  decisionReason: {
                    type: "safetyCheck",
                    reason: isDestructiveWrite
                      ? "destructive \u2014 model-generated arguments"
                      : "remote write \u2014 model-generated arguments",
                    classifierApprovable: false,
                  },
                };
              }
            }
          }
          if (input.operation === "finalize_plan")
            return {
              behavior: "ask",
              message: `Design finalize_plan writes to claude.ai/design. ${DESIGN_WRITE_APPROVAL_NOTE}`,
              updatedInput: {
                ...annotatedInput,
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
          if (isDestructiveWrite)
            return {
              behavior: "ask",
              message: `Design ${input.operation} writes to claude.ai/design.`,
              updatedInput: annotatedInput,
              decisionReason: {
                type: "safetyCheck",
                reason: traits
                  ? "destructive \u2014 model-generated arguments"
                  : "unknown operation \u2014 fail-closed to destructive write",
                classifierApprovable: false,
              },
            };
          return {
            behavior: "ask",
            message: `Design ${input.operation} writes to claude.ai/design.`,
            updatedInput: annotatedInput,
            decisionReason: {
              type: "safetyCheck",
              reason: "remote write \u2014 model-generated arguments",
              classifierApprovable: false,
            },
          };
        },
        async call(input, callOptions) {
          let context = toolContext;
          let gateState = context.toolState.get(DesignGateState);
          let __consentAskCanReachUser = input.__consentAskCanReachUser ?? false;
          let canAskUser = __consentAskCanReachUser && needsDesignWritePrompt(context);
          if (input.operation === "finalize_plan" && __consentAskCanReachUser) {
            let projectId = (input.arguments ?? {}).project_id;
            if (typeof projectId === "string" && projectId.length > 0)
              clearApprovedPlans(gateState, projectId);
          }
          if (MEMBERSHIP_METHODS.has(input.operation)) {
            let projectId = (input.arguments ?? {}).project_id;
            if (typeof projectId === "string" && projectId.length > 0) {
              clearApprovedPlans(gateState, projectId);
              clearPlansForProject(gateState, projectId);
              clearVerifiedProjectGrant(gateState, projectId);
              markRecardProject(gateState, projectId);
            }
          }
          let designConsentKey = await getDesignConsentKey(context.credentials);
          if (!designConsentKey.ok) {
            let authError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              designCredentialErrorMessage(designConsentKey, {
                isNonInteractiveSession: context.isNonInteractiveSession,
              }),
              "design_tool_auth_failed",
            );
            throw designConsentKey.reason === "needs_design_login"
              ? tagObject(authError, {
                  kind: "design_needs_authorization",
                  provider: "claude_design",
                })
              : authError;
          }
          let accessToken = designConsentKey.accessToken;
          let __consentBitShown = input.__consentBitShown ?? null;
          let __projectGrantAskShown = input.__projectGrantAskShown ?? null;
          let grantObservedByServer = input.__projectGrantServerObserved === true;
          let grantProjectId = (() => {
            if (input.operation !== "write_files" && input.operation !== "create_support_js") return null;
            let args = input.arguments ?? {};
            if (typeof args.plan_token === "string" && args.plan_token.length > 0) return null;
            let projectId = args.project_id;
            return typeof projectId === "string" && projectId.length > 0 ? projectId : null;
          })();
          if (
            input.operation === "copy_files" &&
            !(typeof input.arguments?.plan_token === "string" && input.arguments.plan_token.length > 0)
          )
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "copy_files without a plan_token always requires per-batch approval \u2014 use finalize_plan declaring every destination in writes, then pass the returned plan_token.",
              "design_tool_exec_backstop_tokenless_copy",
            );
          if (grantProjectId !== null) {
            let targetCheck = checkPlanGatedTargets(input.operation, input.arguments);
            let reservedAskShown = input.__reservedTargetsAskShown === true;
            if (targetCheck.outcome !== "pass" && !reservedAskShown)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${input.operation} without a plan_token: this batch includes paths that always require per-batch approval \u2014 use finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
                "design_tool_exec_backstop_safety_trip",
              );
          }
          let signal = callOptions.signal;
          let agentId = context.agentContext?.agentId ?? null;
          let operationResult;
          try {
            operationResult = await runOperation({});
            if (
              input.operation === "finalize_plan" &&
              input.__finalizePlanAskShown === true &&
              canAskUser &&
              canPromptForDesign(context)
            ) {
              let args = input.arguments ?? {};
              let planToken =
                operationResult.isError !== true ? readPlanTokenFromResult(operationResult.content) : null;
              let stringList = (candidate) =>
                Array.isArray(candidate)
                  ? candidate.filter((pathValue) => typeof pathValue === "string")
                  : [];
              if (planToken !== null && typeof args.project_id === "string" && args.scope !== "project")
                approveDesignPlan(gateState, planToken.token, {
                  projectId: args.project_id,
                  writes: stringList(args.writes),
                  deletes: stringList(args.deletes),
                  serverExpiresAtMs: planToken.expiresAtMs ?? undefined,
                });
            }
          } catch (error) {
            if (signal.aborted && !(error instanceof AbortError)) throw new AbortError();
            if (error instanceof DesignAuth401Error) {
              let remedy = await handleDesignAuth401(context.credentials, {
                isNonInteractiveSession: context.isNonInteractiveSession,
                wasRetried: error.wasRetried,
              });
              if (signal.aborted) throw new AbortError();
              let authError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                remedy.message,
                "design_tool_auth_401",
              );
              throw remedy.remedy === undefined ? authError : tagObject(authError, remedy.remedy);
            }
            if (error instanceof DesignNeedsScopesError && context.isNonInteractiveSession)
              throw new DesignNeedsScopesError({
                isNonInteractiveSession: true,
              });
            throw error;
          }
          return {
            data: operationResult,
          };
          async function runOperation(retryFlags) {
            try {
              let result = await callDesignOperation(
                gateState,
                input.operation,
                input.arguments,
                accessToken,
                signal,
                agentId,
                context.credentials,
              );
              if (__consentBitShown !== null && !signal.aborted && result.isError !== true)
                setDesignConsent(gateState, __consentBitShown, true);
              if (
                grantProjectId !== null &&
                !signal.aborted &&
                result.isError !== true &&
                ((__projectGrantAskShown === grantProjectId && !grantObservedByServer) ||
                  !isRecardProject(gateState, grantProjectId))
              )
                markProjectGrantVerified(gateState, grantProjectId);
              return result;
            } catch (error) {
              if (error instanceof DesignNeedsProjectGrantError) {
                clearVerifiedProjectGrant(gateState, error.projectId);
                invalidateDesignConsentCache(gateState);
                if (retryFlags.grant === true) throw error;
                if (error.projectId !== __projectGrantAskShown || grantObservedByServer) {
                  if (input.operation === "write_files" || input.operation === "create_support_js") {
                    if (context.isNonInteractiveSession === true)
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
                if (!canAskUser || !canPromptForDesign(context))
                  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    "Writing to this project needs a one-time approval, which cannot be granted automatically in this permission mode \u2014 use finalize_plan with writes/deletes and pass the returned plan_token.",
                    "design_tool_needs_project_grant_no_prompt",
                  );
                try {
                  await recordDesignProjectGrant(gateState, error.projectId, context.credentials);
                } catch (error) {
                  if (classifyAxiosError(error).kind === "auth")
                    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      "This session's credential cannot record the project approval \u2014 approve this project from an interactive Claude Code session (run the write there and accept the approval card), then retry here: this session picks the recorded approval up from the server.",
                      "design_tool_grant_mint_bearer_refused",
                    );
                  throw error;
                }
                return runOperation({
                  ...retryFlags,
                  grant: true,
                });
              }
              if (!(error instanceof DesignNeedsConsentError)) throw error;
              if (retryFlags.consent === true) throw error;
              let consent = error.consent;
              if (consent !== __consentBitShown) {
                setDesignConsent(gateState, consent, false);
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `${DESIGN_CONSENT_PROMPT(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
                  "design_tool_needs_consent_not_shown",
                );
              }
              if (!canAskUser) {
                setDesignConsent(gateState, consent, false);
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `${DESIGN_CONSENT_PROMPT(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
                  "design_tool_needs_consent_no_prompt",
                );
              }
              await recordDesignConsent(gateState, consent, context.credentials);
              return runOperation({
                ...retryFlags,
                consent: true,
              });
            }
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(rawResult, toolUseId) {
      let blocks = capDesignImageBlocks(rawResult.content.flatMap(designContentToBlocks));
      let errorText = rawResult.isError
        ? blocks
            .flatMap((block) => (block.type === "text" ? [block.text] : []))
            .join(
              `
`,
            )
            .trim() || "(error with no message)"
        : null;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        is_error: rawResult.isError,
        content: errorText ?? (blocks.length > 0 ? blocks : "(empty result)"),
      };
    },
    renderToolUseMessage(input, { verbose }) {
      let truncate = (value, maxChars = 80) => {
        let replaced = value.replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
        return replaced.length > maxChars ? replaced.slice(0, maxChars).trimEnd() + "\u2026" : replaced;
      };
      let args = input.arguments;
      if (!args || Object.keys(args).length === 0) return "";
      if (!verbose) {
        let arrayCounts = {};
        for (let [key, value] of Object.entries(args))
          if (Array.isArray(value)) {
            let countKey = key === "messages" ? "message" : key === "validators" ? "validator" : "file";
            arrayCounts[countKey] = (arrayCounts[countKey] ?? 0) + value.length;
          }
        return Object.entries(arrayCounts)
          .map(([key, value]) => `${value} ${value === 1 ? key : key + "s"}`)
          .join(", ");
      }
      if (
        !Object.hasOwn(WRITE_OP_SCHEMAS, input.operation ?? "") &&
        !Object.hasOwn(READ_OP_SCHEMAS, input.operation ?? "")
      ) {
        let serializedArgs = jsonStringify(args) ?? "";
        return `${truncate(input.operation ?? "")} (${formatByteSize(utf8ByteLength(serializedArgs))} of arguments not shown \u2014 operation unknown to this client version)`;
      }
      let describeValue = (value, previewChars) => {
        if (typeof value === "string")
          return value.length > 80
            ? `${truncate(value)} (${formatByteSize(utf8ByteLength(value))})`
            : truncate(value);
        if (typeof value === "object" && value !== null) {
          let objectValue = value;
          let byteLength = utf8ByteLength(jsonStringify(value) ?? "");
          if (typeof objectValue.path === "string") {
            let fileData = typeof objectValue.data === "string" ? objectValue.data : "";
            let filtered = ["encoding", "local_path", "if_match"].filter(
              (extraFieldName) =>
                typeof objectValue[extraFieldName] === "string" && objectValue[extraFieldName],
            );
            let pathSummary = `${truncate(objectValue.path)} (${formatByteSize(byteLength)})${filtered.length ? ` [+${filtered.join(",")}]` : ""}`;
            return previewChars > 0 && fileData
              ? `${pathSummary}: ${truncate(fileData, previewChars)}`
              : pathSummary;
          }
          if (typeof objectValue.content === "string") {
            let role = typeof objectValue.role === "string" ? objectValue.role : "?";
            let messageSummary = `${truncate(role, 12)} (${formatByteSize(byteLength)})`;
            return previewChars > 0 && objectValue.content
              ? `${messageSummary}: ${truncate(objectValue.content, previewChars)}`
              : messageSummary;
          }
          if (typeof objectValue.src === "string" || typeof objectValue.dest === "string")
            return `${truncate(String(objectValue.src ?? "?"), 40)} \u2192 ${truncate(String(objectValue.dest ?? "?"), 40)}${objectValue.src_project_id ? ` [from ${truncate(String(objectValue.src_project_id), 24)}]` : ""}${typeof objectValue.if_match === "string" && objectValue.if_match ? " [+if_match]" : ""}${byteLength > 256 ? ` (${formatByteSize(byteLength)})` : ""}`;
        }
        let serializedValue = jsonStringify(value) ?? String(value);
        return `${truncate(serializedValue)} (${formatByteSize(utf8ByteLength(serializedValue))})`;
      };
      let describeEntry = (entry) =>
        typeof entry === "string"
          ? truncate(entry, 40)
          : typeof entry === "object" && entry !== null
            ? truncate(String(entry.path ?? entry.dest ?? entry.role ?? "?"), 40)
            : "?";
      let describeArgument = (argument) => {
        if (Array.isArray(argument) && argument.length > 0) {
          let sliced = argument.slice(0, 20);
          let entryPreviewChars = verbose
            ? Math.max(0, Math.min(200, Math.floor(1800 / sliced.length) - 95))
            : 0;
          let previewsOmitted =
            verbose &&
            entryPreviewChars === 0 &&
            sliced.some((entry) => {
              if (typeof entry !== "object" || entry === null) return false;
              let entryObject = entry;
              return (
                (typeof entryObject.data === "string" && entryObject.data) ||
                (typeof entryObject.content === "string" && entryObject.content)
              );
            });
          let sliced_2 = argument.slice(20);
          let moreEntriesSuffix =
            sliced_2.length > 0
              ? `, +${sliced_2.length} more: ${sliced_2.slice(0, 10).map(describeEntry).join(", ")}${sliced_2.length > 10 ? ", \u2026" : ""}`
              : "";
          return (
            `[${argument.length} ${argument.length === 1 ? "entry" : "entries"}: ` +
            sliced.map((entry) => describeValue(entry, entryPreviewChars)).join(", ") +
            moreEntriesSuffix +
            "]" +
            (previewsOmitted ? " (content previews omitted)" : "")
          );
        }
        let serializedArgument = jsonStringify(argument) ?? String(argument);
        return serializedArgument.length > 80
          ? `${truncate(serializedArgument)} (${formatByteSize(utf8ByteLength(serializedArgument))})`
          : truncate(serializedArgument);
      };
      let sorted = Object.entries(args).sort(
        ([, leftValue], [, rightValue]) =>
          Number(Array.isArray(leftValue)) - Number(Array.isArray(rightValue)),
      );
      let filtered = sorted.filter(([, entryValue]) => Array.isArray(entryValue));
      let arrayCountsSuffix =
        filtered.length >= 2
          ? ` (${filtered.map(([argName, argValue]) => `${truncate(argName)}: ${argValue.length}`).join(", ")})`
          : "";
      let joined = sorted
        .map(([argName, argValue]) => `${truncate(argName)}: ${describeArgument(argValue)}`)
        .join(", ");
      let serializedArgs = jsonStringify(args) ?? "";
      let totalBytes = utf8ByteLength(serializedArgs);
      let summaryText =
        `${totalBytes > 256 ? ` (${formatByteSize(totalBytes)} total)` : ""}${arrayCountsSuffix} ${joined}`.trimStart();
      let maxChars = verbose ? 2000 : 1500;
      return summaryText.length > maxChars
        ? summaryText.slice(0, maxChars - 1).trimEnd() + "\u2026"
        : summaryText;
    },
  });
});
//@ chunk-ma8ytfb3.js:44862-44920 placement
/**
 * 单个 render_preview 图片 base64 的字符上限，超出换成说明文本。
 */
var DESIGN_IMAGE_MEDIA_PATTERN = /^image\/(png|jpeg|gif|webp)$/;
var MAX_PREVIEW_IMAGE_CHARS = 130000;
var MAX_RESULT_IMAGE_CHARS = 130000;
//@ chunk-ma8ytfb3.js:44920-45388 placement
function designContentToBlocks(block) {
  if (block.type === "text" && typeof block.text === "string")
    return [
      {
        type: "text",
        text: block.text,
      },
    ];
  if (
    block.type === "image" &&
    typeof block.data === "string" &&
    typeof block.mimeType === "string" &&
    DESIGN_IMAGE_MEDIA_PATTERN.test(block.mimeType)
  ) {
    if (block.data.length > MAX_PREVIEW_IMAGE_CHARS)
      return [
        {
          type: "text",
          text: `[render_preview image omitted \u2014 ${Math.round(block.data.length / 1024)}KB exceeds ${Math.round(MAX_PREVIEW_IMAGE_CHARS / 1024)}KB cap]`,
        },
      ];
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: block.mimeType,
          data: block.data,
        },
      },
    ];
  }
  return [
    {
      type: "text",
      text: jsonStringify(block) ?? "",
    },
  ];
}
//@ chunk-ma8ytfb3.js:45506-45794 placement
function capDesignImageBlocks(blocks) {
  let remainingChars = MAX_RESULT_IMAGE_CHARS;
  let keptBlocks = [];
  let droppedCount = 0;
  let droppedChars = 0;
  for (let block of blocks) {
    let blockChars = isBase64ImageBlock_2(block);
    if (blockChars <= remainingChars) {
      remainingChars -= blockChars;
      keptBlocks.push(block);
    } else {
      droppedCount++;
      droppedChars += blockChars;
    }
  }
  if (droppedCount > 0)
    keptBlocks.push({
      type: "text",
      text: `[ClaudeDesign result truncated \u2014 ${droppedCount} block(s) (${Math.round(droppedChars / 1024)}k chars) omitted; aggregate over ${Math.round(MAX_RESULT_IMAGE_CHARS / 1024)}k-char cap]`,
    });
  return keptBlocks;
}

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/tools/DesignTool/DesignTool.js");
export {
  isUnknownDesignOperation,
  designHintsFor,
  redactToken,
  recordDesignTools,
  getOAuthHeaders,
  MAX_RESULT_IMAGE_CHARS,
  DesignTool,
};
