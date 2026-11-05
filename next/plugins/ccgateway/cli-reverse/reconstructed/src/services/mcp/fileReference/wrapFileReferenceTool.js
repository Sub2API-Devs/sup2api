/**
 * services/mcp/fileReference/wrapFileReferenceTool.ts
 *
 * 2.1.316 新增（门面模块 wrapFileReferenceTool）。包装 MCP 工具以支持文件引用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xggcs0yq.js (49)
 * attribution: placement 42, layout 7
 */
import { isPlainObject } from "../../../utils/objectUtils.js";
import { ARTIFACTS_MCP_PATH, ARTIFACTS_SERVER_ID, CCR_ARTIFACTS_MCP_PATH } from "../firstPartyServerIds.js";
import {
  fileReferenceHintLatch,
  replaceFileReferenceHintLatch,
  isFileReferenceCall,
  noteFileReferenceCall,
  MAX_TRACKED_CALLS,
} from "../../api/fileReferenceCalls.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../analytics/growthbook.js";
import {
  getFileReferenceOffer,
  fileReferenceUnavailableReason,
  claudeAiConnectorCapability,
  serverCapabilityCache,
  headerValues,
  X_CCR_OWNER_SLACK_USER_ID,
  X_MCP_SERVER_ORIGIN,
  X_CCR_GMAIL_ATTACHMENTS,
  recordFirstReferenceApproved,
  addressLines,
  fileLines,
  isFirstReferenceApproved,
} from "./fileReferencePolicy.js";
import { isPolicyVerdictAbsent } from "../../policyLimits/policyVerdicts.js";
import { env } from "../../../utils/env.js";
import { connectorServerId, requiresConnectorGrant_2 } from "../claudeai.js";
import { isPluginServerConfig } from "../types.js";
import {
  CCR_SESSION_BASE_PATHS,
  ccrSessionIdFromMcpUrl,
  isCcrSessionScopedMcpUrl,
  CCR_MCP_QUERY_PARAMS,
} from "../ccrMcpUrls.js";
import { logError } from "../../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedFeatureErrorCodeForTelemetry,
} from "../../../utils/errors.js";
import { isCcsTenant, getRootSession } from "../../../bootstrap/state.js";
import { isRemoteOrFalse } from "../../../utils/remoteEnvironment.js";
import { startupCcrEnv } from "../../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { hasUniqueQueryParams } from "../../analytics/metadata.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { getToolNameForPermissionCheck } from "../mcpStringUtils.js";
import { isHostSessionEntrypoint, isHostEntrypoint } from "../../../utils/entrypointKinds.js";
import { getHookCaller } from "../../../utils/agentContext.js";
import { dialogSourceFor } from "../../../components/permissions/hooks.js";
import { matchesToolName } from "../../../Tool.js";
import { REPL_TOOL_NAME } from "../../../tools/REPLTool/constants.js";
import { isBypassAllowedInMode, isAutoAllowedInMode } from "../../../utils/permissions/browserToolNames.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, McpAuthError } from "../client.js";
import { logEvent } from "../../analytics/index.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../../utils/startupMarks.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-xggcs0yq.js:4845-5084 placement
/**
 * 取出工具参数中文件引用字段的值（单值，或数组中每个对象的指定键）。
 */
function fileReferenceValues(input, toolSpec) {
  let argValue = input?.[toolSpec.argument];
  let { entryKey } = toolSpec;
  if (entryKey === undefined)
    return [
      {
        entry: undefined,
        value: argValue,
      },
    ];
  if (!Array.isArray(argValue)) return [];
  let values = [];
  for (let [index, entry] of argValue.entries())
    if (isPlainObject(entry))
      values.push({
        entry: index,
        value: Object.hasOwn(entry, entryKey) ? entry[entryKey] : undefined,
      });
  return values;
}
//@ chunk-xggcs0yq.js:5084-5356 placement
function withFilledReferences(input, toolSpec, filled) {
  let { entryKey } = toolSpec;
  if (entryKey === undefined) {
    let singleValue = filled.get(undefined);
    return singleValue === undefined
      ? {
          ...input,
        }
      : {
          ...input,
          [toolSpec.argument]: singleValue,
        };
  }
  let argValue = input[toolSpec.argument];
  if (!Array.isArray(argValue))
    return {
      ...input,
    };
  return {
    ...input,
    [toolSpec.argument]: argValue.map((entry, index) => {
      let value = filled.get(index);
      return value === undefined || !isPlainObject(entry)
        ? entry
        : {
            ...entry,
            [entryKey]: value,
          };
    }),
  };
}
//@ chunk-xggcs0yq.js:5356-5501 placement
function cloneReferenceArgument(input, toolSpec) {
  let argValue = input[toolSpec.argument];
  if (toolSpec.entryKey === undefined || !Array.isArray(argValue))
    return {
      ...input,
    };
  return {
    ...input,
    [toolSpec.argument]: argValue.map((entry) =>
      isPlainObject(entry)
        ? {
            ...entry,
          }
        : entry,
    ),
  };
}
//@ chunk-xggcs0yq.js:5501-5569 placement
/**
 * 判断值是否为 sha256: 形式。
 */
function isSha256Value(value) {
  return typeof value === "string" && value.startsWith("sha256:");
}
//@ chunk-xggcs0yq.js:5569-7969 placement
/**
 * 文件引用相关的服务器表：一方 Artifacts 上传服务器（路径、服务器 id、策略键、上传路径前缀），以及 Google Drive create_file 的文件引用行配置（连接器地址、参数名、开关、策略、大小上限）。
 */
var FIRST_PARTY_UPLOAD_SERVERS; // deferred: uses MEMORY_SERVER_ID_2 (../firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var GOOGLE_DRIVE_REFERENCE_ROW;
var GMAIL_REFERENCE_ROW;
var FILE_REFERENCES_HINT;
var CREATE_DRAFT_ROW;
var UPDATE_DRAFT_ROW;
var REPLY_ROW;
var FORWARD_ROW;
var SEND_MESSAGE_ROW;
var FILE_REFERENCE_ROWS;
deferInit("chunk-xggcs0yq.js:5569", () => {
  FIRST_PARTY_UPLOAD_SERVERS = [
    {
      path: ARTIFACTS_MCP_PATH,
      serverId: ARTIFACTS_SERVER_ID,
      policy: "allow_cobalt_plinth",
      uploadPathPrefix: `${ARTIFACTS_MCP_PATH}/upload/`,
      ccrEntryPath: CCR_ARTIFACTS_MCP_PATH,
    },
  ];
  GOOGLE_DRIVE_REFERENCE_ROW = {
    connectorOrigin: "https://drivemcp.googleapis.com",
    connectorPath: "/mcp/v1",
    desktopMark: "googleDriveFill",
    desktopHostFillMark: "googleDriveHostFill",
    desktopAsksFirstMark: "googleDriveHostAsksFirstReference",
    toolName: "create_file",
    argument: "base64Content",
    wrongArguments: ["content"],
    textArgument: "textContent",
    flag: "tengu_clever_bonbon",
    policy: "allow_drive_file_references",
    serviceName: "Google Drive",
    descriptionHint:
      "FILE REFERENCES: to upload a file you can read here, don't type its base64; set base64Content to a file reference, sha256:<64 lowercase hex>:<its absolute path, with / between folders>. The app fills in the file's content once the user approves the call.",
    uploadEvent: "tengu_mcp_drive_file_reference_upload",
    featureName: "mcp_drive_file_reference",
    maxFileBytes: 10485760,
    maxFileText: "10 MB",
  };
  GMAIL_REFERENCE_ROW = {
    connectorOrigin: "https://gmailmcp.googleapis.com",
    connectorPath: "/mcp/v1",
    argument: "attachments",
    entryKey: "content",
    wrongArguments: [],
    flag: "tengu_snug_pine",
    serviceName: "Gmail",
    policy: "allow_gmail_file_references",
    asksEveryReference: true,
    firstReferenceQuestion:
      "Claude wants to attach a file to a Gmail email or draft. This attachment needs your approval, even if you already allowed this tool.",
    uploadEvent: "tengu_mcp_gmail_file_reference_upload",
    featureName: "mcp_gmail_file_reference",
    maxFileBytes: 10485760,
    maxFileText: "10 MB",
    maxTotalBytes: 24117248,
    maxTotalText: "23 MB",
    maxAttachments: 10,
    proxyFills: {
      toolName: "send_message",
      descriptionIncludes: "ATTACHMENTS: to attach a file from this session",
    },
  };
  FILE_REFERENCES_HINT =
    "FILE REFERENCES: to attach a file you can read here, don't type its base64; set the attachment's content to a file reference, sha256:<64 lowercase hex>:<its absolute path, with / between folders>, and set filename to the file's name. The app fills in the file's content once the user approves the call. An update_draft call removes a draft's files, so to change a draft that has files, make a new draft with the same files.";
  CREATE_DRAFT_ROW = {
    ...GMAIL_REFERENCE_ROW,
    toolName: "create_draft",
    descriptionHint: FILE_REFERENCES_HINT,
    recipientCheck: "draft",
  };
  UPDATE_DRAFT_ROW = {
    ...GMAIL_REFERENCE_ROW,
    toolName: "update_draft",
    recipientCheck: "never",
  };
  REPLY_ROW = {
    ...GMAIL_REFERENCE_ROW,
    toolName: "reply",
    recipientCheck: "other_tool",
  };
  FORWARD_ROW = {
    ...GMAIL_REFERENCE_ROW,
    toolName: "forward",
    recipientCheck: "other_tool",
  };
  SEND_MESSAGE_ROW = {
    ...GMAIL_REFERENCE_ROW,
    toolName: "send_message",
    descriptionHint: FILE_REFERENCES_HINT,
    recipientCheck: "send",
  };
  FILE_REFERENCE_ROWS = [
    GOOGLE_DRIVE_REFERENCE_ROW,
    CREATE_DRAFT_ROW,
    UPDATE_DRAFT_ROW,
    SEND_MESSAGE_ROW,
    REPLY_ROW,
    FORWARD_ROW,
  ];
});
//@ chunk-xggcs0yq.js:7969-8594 placement
/**
 * 判断是否向模型提供某个文件引用行：有本地覆盖时直接用；否则看特性开关是否由服务端下发且开启、策略是否已加载并允许，记录 offered/latched_off/undecided 状态。
 */
function isFileReferenceOffered(row) {
  let override = fileReferenceHintLatch(row.flag);
  if (override !== null) return override && isRowFlagOn(row);
  let flag = getFeatureValueWithSource_CACHED_MAY_BE_STALE(row.flag, false);
  let tracker = row.recipientCheck === undefined ? getFileReferenceOffer() : undefined;
  if (!flag.value) {
    if (isServedFeatureSource(flag.source)) {
      replaceFileReferenceHintLatch(row.flag, false);
      tracker?.note(row, {
        state: "latched_off",
        reason: "flag_off_served",
      });
    } else tracker?.holdUndecidedReason("flag_not_served");
    return false;
  }
  let blockReason = fileReferenceUnavailableReason(row);
  if (!isServedFeatureSource(flag.source)) {
    tracker?.holdUndecidedReason("flag_not_served");
    return false;
  }
  if (blockReason === "policy_not_loaded" || blockReason === "policy_not_asked") {
    tracker?.holdUndecidedReason(blockReason);
    return false;
  }
  if (isPolicyVerdictAbsent()) {
    tracker?.holdUndecidedReason("policy_verdict_absent");
    return false;
  }
  let sendFlag = blockReason === undefined;
  replaceFileReferenceHintLatch(row.flag, sendFlag);
  tracker?.note(
    row,
    blockReason === undefined
      ? {
          state: "offered",
        }
      : {
          state: "latched_off",
          reason: blockReason,
        },
  );
  return sendFlag;
}
//@ chunk-xggcs0yq.js:8594-8838 placement
function fileReferenceHintKeyBit(tool) {
  tryIgnore(() => getFileReferenceOffer().flush());
  let row =
    tool.mcpInfo?.fileReference === true &&
    (!env.CLAUDE_CODE_REMOTE || tool.mcpInfo.remoteFileReferenceFill === true)
      ? FILE_REFERENCE_ROWS.find((row) => row.toolName === tool.mcpInfo?.toolName)
      : undefined;
  return row?.descriptionHint !== undefined && isFileReferenceOffered(row) ? "FR1:" : "";
}
//@ chunk-xggcs0yq.js:8838-9249 placement
/**
 * 找到该 MCP 工具对应的文件引用配置行：SDK 服务器按连接器 id 与填充方式，其他按连接器地址匹配。
 */
function fileReferenceRowFor(client, toolName) {
  if (!FILE_REFERENCE_ROWS.some((row) => row.toolName === toolName)) return;
  if (client.config.type === "sdk") {
    let capability = claudeAiConnectorCapability(client);
    return capability === undefined
      ? undefined
      : FILE_REFERENCE_ROWS.find(
          (row) =>
            row.toolName === toolName &&
            (desktopFillMode(capability, row) === "fill" || desktopFillMode(capability, row) === "hostFill"),
        );
  }
  if (
    connectorServerId(client.config) === undefined ||
    !("url" in client.config) ||
    typeof client.config.url !== "string"
  )
    return;
  let { url } = client.config;
  return FILE_REFERENCE_ROWS.find((row) => {
    let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
    return row.toolName === toolName && (url === expectedUrl || url === `${expectedUrl}/`);
  });
}
//@ chunk-xggcs0yq.js:9249-10379 placement
function fileReferenceToolForRecords(client, toolName) {
  if (!FILE_REFERENCE_ROWS.some((row) => row.toolName === toolName)) return;
  try {
    let capability = claudeAiConnectorCapability(client);
    let row =
      fileReferenceRowFor(client, toolName) ??
      (capability === undefined
        ? undefined
        : FILE_REFERENCE_ROWS.find(
            (row) => row.toolName === toolName && desktopFillMode(capability, row) === "conflicting",
          ));
    if (row !== undefined || env.CLAUDE_CODE_REMOTE !== true) return row;
    let { config } = client;
    if (
      config.type !== "http" ||
      config.scope !== "dynamic" ||
      isPluginServerConfig(config) ||
      !("url" in config) ||
      typeof config.url !== "string"
    )
      return;
    let url = new URL(config.url, "https://no-origin.invalid");
    let found = CCR_SESSION_BASE_PATHS.find((basePath) => url.pathname.startsWith(basePath));
    if (found === undefined || !/^[^/]+\/mcp$/.test(url.pathname.slice(found.length))) return;
    let all = url.searchParams.getAll("mcp_url");
    return FILE_REFERENCE_ROWS.find((row) => {
      let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
      return (
        row.toolName === toolName &&
        all.some((mcpUrl) => mcpUrl === expectedUrl || mcpUrl === `${expectedUrl}/`)
      );
    });
  } catch (error) {
    if (env.CLAUDE_CODE_REMOTE !== true) throw error;
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[file reference] could not check whether an MCP server is a connector whose uploads may carry a file's contents (${sanitizedFeatureErrorCodeForTelemetry(error instanceof Error ? error.name : typeof error)}), so it is treated as one: the text of errors from its upload tool is left out of logs and traces.`,
        "[file reference] could not check whether an MCP server is a connector whose uploads may carry a file's contents; it is treated as one",
      ),
    );
    return FILE_REFERENCE_ROWS.find((row) => row.toolName === toolName);
  }
}
//@ chunk-xggcs0yq.js:10379-10508 placement
/**
 * 只保留框架里会填补的（toolName 匹配）文件引用工具项。
 */
function proxyFillsListing(tools) {
  return tools.flatMap(({ name, description }) =>
    FILE_REFERENCE_ROWS.some((proxy) => proxy.proxyFills?.toolName === name)
      ? [
          {
            name,
            description,
          },
        ]
      : [],
  );
}
//@ chunk-xggcs0yq.js:10508-13003 placement
function fileReferenceToolToFill(client, toolName, filledToolName = []) {
  if (!FILE_REFERENCE_ROWS.some((row) => row.toolName === toolName)) return;
  if (!env.CLAUDE_CODE_REMOTE) {
    let declared = fileReferenceRowFor(client, toolName);
    let capability = claudeAiConnectorCapability(client);
    if (declared !== undefined) {
      if (capability === undefined) return declared;
      let fillRow =
        desktopFillMode(capability, declared) === "hostFill"
          ? {
              ...declared,
              hostFills: true,
            }
          : declared;
      return (
        Object.hasOwn(capability, "connectorUrl")
          ? markIsTrue(capability, "hostAsksFirstReference") &&
            (declared.desktopAsksFirstMark === undefined ||
              !Object.hasOwn(capability, declared.desktopAsksFirstMark) ||
              markIsTrue(capability, declared.desktopAsksFirstMark))
          : markIsTrue(capability, declared.desktopAsksFirstMark)
      )
        ? {
            ...fillRow,
            hostAsksFirstReference: true,
          }
        : fillRow;
    }
    let found = FILE_REFERENCE_ROWS.find((row) => row.toolName === toolName);
    let mark =
      capability !== undefined && Object.hasOwn(capability, "connectorUrl")
        ? Reflect.get(capability, "connectorUrl")
        : undefined;
    let connectorUrl = found === undefined ? undefined : `${found.connectorOrigin}${found.connectorPath}`;
    if (
      found === undefined ||
      capability === undefined ||
      (mark !== undefined && mark !== connectorUrl && mark !== `${connectorUrl}/`)
    ) {
      let { config } = client;
      let url = "url" in config ? config.url : undefined;
      return noteNotWrapped(
        client,
        toolName,
        "not_claudeai_connector",
        found?.recipientCheck !== undefined &&
          capability === undefined &&
          (url === connectorUrl || url === `${connectorUrl}/`)
          ? {
              ...found,
              refusesReferences: "not_filled_here",
            }
          : undefined,
      );
    }
    let refusalKind = desktopFillMode(capability, found) === "conflicting" ? "conflicting" : "undeclared";
    if (refusalKind === "conflicting") noteNotWrapped(client, toolName, "desktop_conflicting");
    return {
      ...found,
      refusesReferences: refusalKind,
    };
  }
  let verdict;
  try {
    let { config } = client;
    let isCcs = isCcsTenant();
    let upstreamUrl =
      "url" in config && typeof config.url === "string"
        ? ccrSessionIdFromMcpUrl(config.url)?.upstreamUrl
        : undefined;
    let capability = FILE_REFERENCE_ROWS.find((upstream) => {
      let connector = `${upstream.connectorOrigin}${upstream.connectorPath}`;
      return (
        upstream.toolName === toolName &&
        upstream.recipientCheck !== undefined &&
        (upstreamUrl === connector || upstreamUrl === `${connector}/`)
      );
    });
    verdict =
      capability === undefined || proxyFillsReferences(capability, config, filledToolName)
        ? undefined
        : {
            ...capability,
            refusesReferences: "not_filled_here",
          };
    if (!(isRemoteOrFalse() || isCcs)) {
      let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
      return noteNotWrapped(
        client,
        toolName,
        CLAUDE_CODE_ENVIRONMENT_KIND === "byoc"
          ? "environment_byoc"
          : CLAUDE_CODE_ENVIRONMENT_KIND === "bridge"
            ? "environment_bridge"
            : "environment_other",
        verdict,
      );
    }
    if (config.type !== "http" || config.scope !== "dynamic" || isPluginServerConfig(config))
      return noteNotWrapped(client, toolName, "entry_shape", verdict);
    if (startupCcrEnv.bridgeCarrier !== undefined)
      return noteNotWrapped(client, toolName, "bridge_carrier", verdict);
    if (!isCcrSessionScopedMcpUrl(config.url))
      return noteNotWrapped(client, toolName, "not_own_route", verdict);
    if (!hasUniqueQueryParams(config.url, CCR_MCP_QUERY_PARAMS))
      return noteNotWrapped(client, toolName, "route_query_ambiguous", verdict);
    let capabilityCache = serverCapabilityCache.peek(getRootSession());
    let startupHeaders = capabilityCache?.read?.(client.name, config.url);
    if (startupHeaders === undefined) return noteNotWrapped(client, toolName, "no_startup_headers", verdict);
    if (headerValues(startupHeaders, X_CCR_OWNER_SLACK_USER_ID).length > 0)
      return noteNotWrapped(client, toolName, "owner_header", verdict);
    let origins = headerValues(startupHeaders, X_MCP_SERVER_ORIGIN);
    if (origins.length !== 1)
      return noteNotWrapped(
        client,
        toolName,
        origins.length === 0 ? "origin_missing" : "origin_multiple",
        verdict,
      );
    if (origins[0] !== "directory" && origins[0] !== "custom")
      return noteNotWrapped(client, toolName, "origin_other", verdict);
    let capability_2 = FILE_REFERENCE_ROWS.find((row) => {
      let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
      return row.toolName === toolName && (upstreamUrl === expectedUrl || upstreamUrl === `${expectedUrl}/`);
    });
    if (capability_2 === undefined)
      return noteNotWrapped(
        client,
        toolName,
        upstreamUrl === undefined ? "upstream_unread" : "upstream_not_drive",
      );
    if (
      capability_2.proxyFills !== undefined &&
      (headerValues(startupHeaders, X_CCR_GMAIL_ATTACHMENTS).length > 0 ||
        proxyFillsReferences(capability_2, config, filledToolName))
    )
      return;
    if (!isCcs && capabilityCache?.isStartupEntry?.(client.name, config) !== true)
      return noteNotWrapped(client, toolName, "not_startup_entry", verdict);
    let { name: serverName } = client;
    let { url } = config;
    return {
      ...capability_2,
      approvalSeesContent: true,
      stillHeld: () => serverCapabilityCache.peek(getRootSession())?.read?.(serverName, url) !== undefined,
    };
  } catch {
    return verdict;
  }
}
//@ chunk-xggcs0yq.js:13003-13287 placement
function noteNotWrapped(client, toolName, reason, heldToolName) {
  tryIgnore(() => {
    let { config } = client;
    let url = "url" in config ? config.url : undefined;
    let row =
      fileReferenceToolForRecords(client, toolName) ??
      FILE_REFERENCE_ROWS.find((row) => {
        let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
        return row.toolName === toolName && (url === expectedUrl || url === `${expectedUrl}/`);
      });
    if (row !== undefined && row.recipientCheck === undefined)
      getFileReferenceOffer().note(row, {
        state: "not_wrapped",
        reason,
      });
  });
  return heldToolName;
}
//@ chunk-xggcs0yq.js:13287-13511 layout
function proxyFillsReferences(capability, config, row) {
  let { proxyFills } = capability;
  if (proxyFills === undefined) return false;
  return (
    ("headers" in config && headerValues(config.headers, X_CCR_GMAIL_ATTACHMENTS).length > 0) ||
    row.some(
      (tools) =>
        tools.name === proxyFills.toolName &&
        typeof tools.description === "string" &&
        tools.description.includes(proxyFills.descriptionIncludes),
    )
  );
}
//@ chunk-xggcs0yq.js:13511-13592 placement
var ANTHROPIC_FILLEDFROMFILEREFERENCE = "anthropic/filledFromFileReference";
var ANTHROPIC_HOSTFILLSFILEREFERENCE = "anthropic/hostFillsFileReference";
//@ chunk-xggcs0yq.js:13592-13658 placement
function filledCallRequestMeta(client) {
  return client.config.type === "sdk"
    ? {
        [ANTHROPIC_FILLEDFROMFILEREFERENCE]: "true",
      }
    : undefined;
}
//@ chunk-xggcs0yq.js:13658-13710 placement
function withholdsFileReferenceArguments(row, toolUseId) {
  return row !== undefined && (isFileReferenceCall(toolUseId) || isRowFlagOn(row));
}
//@ chunk-xggcs0yq.js:13710-13780 placement
function withholdsFileReferenceErrorText(row, toolUseId) {
  return row !== undefined && (env.CLAUDE_CODE_REMOTE || withholdsFileReferenceArguments(row, toolUseId));
}
//@ chunk-xggcs0yq.js:13780-13890 placement
function withholdsFileReferenceErrors(tool, toolUseID) {
  return (
    tool.mcpInfo?.fileReference === true &&
    withholdsFileReferenceErrorText(
      FILE_REFERENCE_ROWS.find((row) => row.toolName === tool.mcpInfo?.toolName),
      toolUseID,
    )
  );
}
//@ chunk-xggcs0yq.js:13890-14172 placement
function withheldFileReferenceErrorForLog(toolInfo, messageText, name = "McpToolCallError") {
  return `${name}; its message (${messageText.length} characters) is not logged because errors from ${toolInfo.serviceName}'s ${toolInfo.toolName} tool can contain the file being uploaded. The tool result in this session's transcript shows the message, shortened if long.`;
}
//@ chunk-xggcs0yq.js:14172-14256 placement
/**
 * 保留尺寸条目的最小数（16）。
 */
var BASE64_BLOB_RE = /^[\r\n]*[A-Za-z0-9+/_-][A-Za-z0-9+/_\r\n-]*(?:=[\r\n]*){0,2}$/;
var MAX_TRACKED_SIZE_ENTRIES = 100;
var MIN_SIZE_ENTRIES = 16;
//@ chunk-xggcs0yq.js:14256-14491 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(base64, reference) {
  if (typeof base64 !== "string") return;
  let buffer = Buffer.from(base64, "base64");
  if (computeContentHash(buffer) !== reference.split(":")[1]) return;
  let normalize = (text) => text.replace(/[\s=]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  return normalize(base64) === normalize(buffer.toString("base64")) ? buffer.length : undefined;
}
//@ chunk-xggcs0yq.js:14491-25683 placement
/**
 * 包装 MCP 工具以支持文件引用（桌面 Drive 填充）：在 validateInput/call 前检查服务器是否声明支持文件引用，解析引用、上传文件并在不可用时以 not_available 拒绝。
 */
function wrapFileReferenceTool(tool, refToolName, rowImpl, toolUseIdFromMeta, mcpCallMeta) {
  let loadModule = () => import("../../../components/LogoV2/callBinding.lazy.js");
  if (refToolName.refusesReferences) {
    let data = {
      validateInput: tool.validateInput,
      call: tool.call,
    };
    let detail =
      refToolName.refusesReferences === "conflicting"
        ? "desktop_drive_fill_declaration_conflict"
        : refToolName.refusesReferences === "not_filled_here"
          ? "gmail_entry_not_filled_here"
          : "desktop_drive_fill_not_declared";
    tool.validateInput = async (input, context) => {
      let refRow = matchingReferenceRow(refToolName, input, false);
      if (refRow === undefined)
        return (
          (await data.validateInput?.(input, context)) ?? {
            result: true,
          }
        );
      logFeatureSad(refToolName.featureName, "not_available");
      logFileReferenceUpload(refToolName, {
        stage: "plan",
        outcome: "refused",
        reason: "not_available",
        detail,
        toolUseId: context.toolUseId,
      });
      let { refusalText } = await loadModule();
      return {
        result: false,
        message: refusalText(refRow, "not_available", {}),
        errorCode: 2,
        notAnError: true,
      };
    };
    tool.call = async (input, context, ...rest) => {
      let refRow = matchingReferenceRow(
        refToolName,
        input,
        context.toolUseId !== undefined && isFileReferenceCall(context.toolUseId),
      );
      if (refRow === undefined) return data.call(input, context, ...rest);
      logFeatureSad(refToolName.featureName, "not_available");
      logFileReferenceUpload(refToolName, {
        stage: "fill",
        outcome: "refused",
        reason: "not_available",
        detail,
        toolUseId: context.toolUseId,
        requestId: rest[1]?.requestId,
      });
      let { refusalText } = await loadModule();
      return {
        data: refusalText(refRow, "not_available", {}),
      };
    };
    return;
  }
  let prompt = tool.prompt;
  tool.prompt = async (input) => {
    let basePrompt = await prompt(input);
    let descriptionHint = refToolName.descriptionHint;
    if (
      descriptionHint === undefined ||
      !isFileReferenceOffered(refToolName) ||
      (refToolName.recipientCheck !== undefined && listHasNonMcpBuiltin(input.tools))
    )
      return basePrompt;
    return basePrompt === "" ? descriptionHint : `${descriptionHint} ${basePrompt}`;
  };
  let checkedByToolUse = new Map();
  let droppedFills = new Set();
  let pendingFill;
  let shownFills = new Map();
  let baseImpl = {
    validateInput: tool.validateInput,
    call: tool.call,
    askInputPreparer: tool.askInputPreparer,
  };
  let implFor = (input) => (input !== undefined && isFileReferenceCall(input) ? rowImpl : baseImpl);
  tool.validateInput = async (context, context_2) => {
    pendingFill = undefined;
    let refValues = shownFills.size > 0 ? fileReferenceValues(context, refToolName) : [];
    for (let { value } of refValues) {
      if (typeof value !== "string") continue;
      let contentHash = computeContentHash(Buffer.from(value, "base64"));
      let shown = shownFills.get(contentHash);
      if (
        shown !== undefined &&
        !shown.toolUses.has(context_2.toolUseId ?? "") &&
        base64URLEncode(value, shown.reference) !== undefined
      )
        shownFills.delete(contentHash);
    }
    let tracked = context_2.toolUseId === undefined ? undefined : checkedByToolUse.get(context_2.toolUseId);
    if (
      context_2.toolUseId !== undefined &&
      tracked !== undefined &&
      !(
        refToolName.approvalSeesContent &&
        filledBytesTotal(context, refToolName, tracked.references) !== undefined
      )
    )
      checkedByToolUse.delete(context_2.toolUseId);
    if (!isRowFlagServed(refToolName)) {
      if (needsAskForRow(refToolName, context))
        return {
          result: false,
          message: await refuseUnavailableReference(refToolName, "plan", {
            toolUseId: context_2.toolUseId,
          }),
          errorCode: 2,
          notAnError: true,
        };
      return (
        (await implFor(context_2.toolUseId).validateInput?.(context, context_2)) ?? {
          result: true,
        }
      );
    }
    let validation = (await rowImpl.validateInput?.(context, context_2)) ?? {
      result: true,
    };
    if (!validation.result) return validation;
    noteFileReferenceCall(context_2.toolUseId);
    let cloned = cloneReferenceArgument(
      refToolName.recipientCheck === undefined ? context : cloneToolInput(context),
      refToolName,
    );
    if (!hasSha256Args(cloned, refToolName)) return validation;
    if (refToolName.recipientCheck !== undefined && listHasNonMcpBuiltin(context_2.options.tools)) {
      logFileReferenceUpload(refToolName, {
        stage: "plan",
        outcome: "refused",
        reason: "not_available",
        detail: "code_mode",
        toolUseId: context_2.toolUseId,
      });
      logFeatureSad(refToolName.featureName, "not_available");
      let { refusalText } = await loadModule();
      return {
        result: false,
        message: refusalText(refToolName, "not_available", {
          case: "code_mode",
        }),
        errorCode: 2,
        notAnError: true,
      };
    }
    let { readReferencedFile, callBinding } = await loadModule();
    let now = Date.now();
    let referencedFile = await readReferencedFile(
      cloned,
      getToolPermissionContext(context_2),
      "check",
      refToolName,
      {
        session: context_2.session,
        signal: context_2.abortController.signal,
      },
    );
    let checkReadMs = Date.now() - now;
    if ("refusal" in referencedFile) {
      logFileReferenceUpload(refToolName, {
        stage: referencedFile.beforeRead ? "plan" : "check",
        outcome: "refused",
        reason: referencedFile.refusal,
        detail: referencedFile.detail,
        fileRefPathKind: referencedFile.fileRefPathKind,
        checkReadMs,
        toolUseId: context_2.toolUseId,
      });
      return {
        result: false,
        message: referencedFile.message,
        errorCode: 2,
        ...(referencedFile.notAnError && {
          notAnError: referencedFile.notAnError,
        }),
      };
    }
    logFileReferenceUpload(
      refToolName,
      "files" in referencedFile
        ? {
            stage: "check",
            outcome: "passed",
            sizeBytes: referencedFile.files.reduce((acc, file) => acc + file.buf.length, 0),
            checkReadMs,
            toolUseId: context_2.toolUseId,
          }
        : {
            stage: "plan",
            outcome: "passed",
            detail: "host_fills",
            checkReadMs,
            toolUseId: context_2.toolUseId,
          },
    );
    let references =
      "files" in referencedFile
        ? referencedFile.files.map(({ entry, reference }) => ({
            entry,
            reference,
          }))
        : referencedFile.references;
    if (context_2.toolUseId !== undefined && references.length > 0) {
      if (checkedByToolUse.size >= MAX_TRACKED_SIZE_ENTRIES) {
        let oldestKey = checkedByToolUse.keys().next().value;
        if (oldestKey !== undefined) {
          checkedByToolUse.delete(oldestKey);
          if (refToolName.approvalSeesContent) {
            let oldestDropped = droppedFills.values().next().value;
            if (droppedFills.size >= MAX_TRACKED_CALLS && oldestDropped !== undefined)
              droppedFills.delete(oldestDropped);
            droppedFills.add(oldestKey);
          }
        }
      }
      droppedFills.delete(context_2.toolUseId);
      checkedByToolUse.set(context_2.toolUseId, {
        references,
        checkReadMs,
        ...(refToolName.recipientCheck !== undefined && {
          binding: callBinding(cloned, refToolName, references),
        }),
      });
      if (refToolName.approvalSeesContent && "files" in referencedFile)
        pendingFill = {
          fills: referencedFile.files.map(({ entry, reference, buf }) => ({
            entry,
            reference,
            base64: buf.toString("base64"),
          })),
          toolUseId: context_2.toolUseId,
        };
    }
    return validation;
  };
  let state = {
    tool,
    row: refToolName,
    permissionName: getToolNameForPermissionCheck(tool),
    checkedByToolUse,
    droppedFills,
    shownFills,
    asked: new WeakSet(),
  };
  let checkPermissions = tool.checkPermissions;
  tool.checkPermissions = async (input, context) => {
    let toolContext = context.toolUseId === undefined ? undefined : checkedByToolUse.get(context.toolUseId);
    if (toolContext?.binding !== undefined)
      toolContext.binding = (await loadModule()).callBinding(input, refToolName, toolContext.references);
    let decision;
    try {
      decision = await checkPermissions.call(tool, input, context);
    } catch (error) {
      if (!needsUploadApproval(state, input, context)) throw error;
      logPreUploadCheckFailure(error);
      return uploadApprovalAsk(state, input, toolContext?.references);
    }
    return decision.behavior !== "deny" && needsUploadApproval(state, input, context)
      ? uploadApprovalAsk(state, input, toolContext?.references, alwaysFalse(state, context))
      : decision;
  };
  let permissionCheckFailureDecision = tool.permissionCheckFailureDecision;
  tool.permissionCheckFailureDecision = (decision, context) => {
    let patched =
      typeof decision === "object" && decision !== null
        ? {
            ...decision,
          }
        : undefined;
    return needsUploadApproval(state, patched, context)
      ? uploadApprovalAsk(state, patched)
      : permissionCheckFailureDecision?.call(tool, decision, context);
  };
  tool.owesPersonOnlyAsk = (input, context, toolUseId) =>
    needsUploadApproval(state, input, {
      ...context,
      toolUseId: toolUseId ?? context.toolUseId,
    });
  tool.settleUnaskedQuestion = async (decision, toolUseId, context, approved, toolContext2) => {
    let hostEntry = isHostSessionEntrypoint() || isHostEntrypoint();
    let settled = context.replScriptCall === true;
    if (
      decision.decisionReason === undefined ||
      !state.asked.has(decision.decisionReason) ||
      ((!approved || tool.requiresUserInteraction?.() || requiresConnectorGrant_2(tool) || hostEntry) &&
        (decision.matchedAskRule !== undefined || tool.mcpInfo?.effectiveMaxPermission === "ask")) ||
      (hostEntry && (settled || toolContext2))
    )
      return;
    let { refusalText } = await loadModule();
    checkedByToolUse.delete(toolUseId);
    if (context.abortController.signal.aborted) return;
    logFeatureSad(refToolName.featureName, "not_available");
    logFileReferenceUpload(refToolName, {
      stage: "fill",
      outcome: "refused",
      reason: "not_available",
      detail: toolContext2 ? "dont_ask_mode" : "nobody_to_ask",
      toolUseId,
    });
    return refusalText(refToolName, "not_available", {});
  };
  if (refToolName.approvalSeesContent) {
    if (tool.mcpInfo !== undefined)
      tool.mcpInfo = {
        ...tool.mcpInfo,
        remoteFileReferenceFill: true,
      };
    let backfillObservableInput = tool.backfillObservableInput;
    tool.backfillObservableInput = (input) => {
      let result = backfillObservableInput?.call(tool, input);
      let current = new Map(
        pendingFill === undefined
          ? []
          : fileReferenceValues(input, refToolName).map(({ entry, value }) => [entry, value]),
      );
      if (
        pendingFill !== undefined &&
        pendingFill.fills.every((fill) => current.get(fill.entry) === fill.reference)
      ) {
        if (isRowFlagOn(refToolName)) {
          input[refToolName.argument] = withFilledReferences(
            input,
            refToolName,
            new Map(pendingFill.fills.map((fill) => [fill.entry, fill.base64])),
          )[refToolName.argument];
          for (let fill of pendingFill.fills) {
            let contentHash = fill.reference.split(":")[1] ?? "";
            let previous = shownFills.get(contentHash);
            shownFills.delete(contentHash);
            shownFills.set(contentHash, {
              reference: fill.reference,
              toolUses: (previous?.toolUses ?? new Set()).add(pendingFill.toolUseId),
            });
          }
          for (let [contentHash, shown] of shownFills) {
            if (shownFills.size <= MIN_SIZE_ENTRIES) break;
            if (!shown.toolUses.has(pendingFill.toolUseId)) shownFills.delete(contentHash);
          }
        }
        pendingFill = undefined;
      }
      return result;
    };
    let toAutoClassifierInput = tool.toAutoClassifierInput;
    tool.toAutoClassifierInput = (input) => {
      let shown = referencesForShownFills(input, refToolName, shownFills);
      return toAutoClassifierInput.call(
        tool,
        shown.size === 0 ? input : withFilledReferences(input, refToolName, shown),
      );
    };
  }
  let baseCall = rowImpl.call;
  tool.call = async (input, context, ...rest) => {
    let { toolUseId } = context;
    for (let [contentHash, shown] of shownFills)
      if (shown.toolUses.delete(toolUseId ?? "") && shown.toolUses.size === 0) shownFills.delete(contentHash);
    if (
      !(
        toolUseId !== undefined &&
        (checkedByToolUse.has(toolUseId) || droppedFills.has(toolUseId) || isFileReferenceCall(toolUseId))
      ) &&
      !isRowFlagServed(refToolName)
    ) {
      if (needsAskForRow(refToolName, input))
        return {
          data: await refuseUnavailableReference(refToolName, "fill", {
            toolUseId,
            requestId: rest[1]?.requestId,
          }),
        };
      return baseImpl.call(input, context, ...rest);
    }
    noteFileReferenceCall(toolUseId ?? (rest[1] === undefined ? undefined : toolUseIdFromMeta(rest[1])));
    let cloned = cloneReferenceArgument(
      refToolName.recipientCheck === undefined ? input : cloneToolInput(input),
      refToolName,
    );
    let tracked = toolUseId === undefined ? undefined : checkedByToolUse.get(toolUseId);
    let hasSha = hasSha256Args(cloned, refToolName);
    if (
      refToolName.recipientCheck !== undefined &&
      (context.innerCall === true || getHookCaller(context) !== undefined) &&
      (hasSha || tracked !== undefined)
    ) {
      let { refusalText } = await loadModule();
      logFeatureSad(refToolName.featureName, "not_available");
      logFileReferenceUpload(refToolName, {
        toolUseId,
        requestId: rest[1]?.requestId,
        stage: "fill",
        outcome: "refused",
        reason: "not_available",
        detail: "not_a_direct_call",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        refusalText(refToolName, "not_available", {
          case: "not_a_direct_call",
        }),
        "file reference refused",
      );
    }
    let references =
      tracked !== undefined && refToolName.approvalSeesContent && !hasSha
        ? filledBytesTotal(cloned, refToolName, tracked.references)
        : undefined;
    let droppedRefusal =
      !hasSha &&
      tracked === undefined &&
      toolUseId !== undefined &&
      droppedFills.has(toolUseId) &&
      (!isRowFlagServed(refToolName) ||
        fileReferenceUnavailableReason(refToolName) !== undefined ||
        refToolName.stillHeld?.() === false ||
        refToolName.recipientCheck !== undefined);
    let known =
      refToolName.recipientCheck === undefined || tracked === undefined || hasSha
        ? undefined
        : new Map(
            fileReferenceValues(cloned, refToolName).map(({ entry, value: refEntry }) => [entry, refEntry]),
          );
    if (
      known !== undefined &&
      tracked !== undefined &&
      (references === undefined ||
        tracked.references.some(
          ({ entry, reference }) => base64URLEncode(known.get(entry), reference) === undefined,
        ))
    ) {
      let { refusalText } = await loadModule();
      logFeatureSad(refToolName.featureName, "not_available");
      logFileReferenceUpload(refToolName, {
        toolUseId,
        requestId: rest[1]?.requestId,
        checkReadMs: tracked.checkReadMs,
        stage: "fill",
        outcome: "refused",
        reason: "not_available",
        detail: "call_changed",
      });
      return {
        data: refusalText(refToolName, "not_available", {
          case: "call_changed",
        }),
      };
    }
    if (references === undefined && !hasSha && !droppedRefusal) {
      let latch = fileReferenceHintLatch(refToolName.flag);
      let mayLog = false;
      try {
        mayLog = latch === true && getFileReferenceOffer().mayLogTypedRow(refToolName);
      } catch {}
      if (!mayLog || !isRowFlagOn(refToolName)) {
        if (latch === null && refToolName.recipientCheck === undefined && isRowFlagOn(refToolName))
          tryIgnore(() => {
            let fileReferenceOffer = getFileReferenceOffer();
            fileReferenceOffer.note(refToolName, {
              state: "undecided",
              reason: fileReferenceOffer.undecidedReason(),
            });
          });
        return baseCall(cloned, context, ...rest);
      }
      let flattened = fileReferenceValues(cloned, refToolName).flatMap(({ value }) =>
        typeof value === "string" && BASE64_BLOB_RE.test(value) ? [value] : [],
      );
      let found = refToolName.wrongArguments
        .map((wrongArgument) => cloned[wrongArgument])
        .find((value) => typeof value === "string" && BASE64_BLOB_RE.test(value));
      let blobs = flattened.length > 0 ? flattened : typeof found === "string" ? [found] : [];
      let textValue = refToolName.textArgument === undefined ? undefined : cloned[refToolName.textArgument];
      let logBase;
      if (blobs.length > 0) {
        let sizeBytes = 0;
        for (let blob of blobs) {
          let blobBytes = 0;
          for (let idx = 0; idx < blob.length; idx++) {
            let code = blob.charCodeAt(idx);
            blobBytes += Number(code !== 10 && code !== 13 && code !== 61);
          }
          sizeBytes += Math.floor((blobBytes * 3) / 4);
        }
        logBase = {
          stage: "typed_base64",
          sizeBytes,
          toolUseId,
          requestId: rest[1]?.requestId,
        };
      } else if (typeof textValue === "string")
        logBase = {
          stage: "typed_text",
          sizeBytes: Buffer.byteLength(textValue, "utf8"),
          toolUseId,
          requestId: rest[1]?.requestId,
        };
      else return baseCall(cloned, context, ...rest);
      let now = Date.now();
      let result;
      try {
        result = await baseCall(cloned, context, ...rest);
      } catch (error) {
        let callMs = Date.now() - now;
        tryIgnore(() =>
          logFileReferenceUpload(refToolName, {
            ...logBase,
            result: uploadFailureOutcome(error, context.abortController.signal),
            callMs,
          }),
        );
        throw error;
      }
      let callMs = Date.now() - now;
      tryIgnore(() =>
        logFileReferenceUpload(refToolName, {
          ...logBase,
          result: uploadSuccessOutcome(result, context.taskRegistry, toolUseId),
          callMs,
        }),
      );
      return result;
    }
    let logFields = {
      toolUseId,
      requestId: rest[1]?.requestId,
      checkReadMs: tracked?.checkReadMs,
    };
    let { readReferencedFile, callBinding, gmailShapeRefusal, recipientsNotShown, refusalText } =
      await loadModule();
    let logRefusal = (reason, detail, fileRefPathKind) =>
      logFileReferenceUpload(refToolName, {
        ...logFields,
        stage: "fill",
        outcome: "refused",
        reason,
        detail,
        fileRefPathKind,
      });
    if (!isRowFlagServed(refToolName)) {
      logFeatureSad(refToolName.featureName, "not_available");
      logRefusal("not_available", notAvailableReason(refToolName));
      return {
        data: refusalText(refToolName, "not_available", {}),
      };
    }
    let unavailableReason =
      references === undefined && !droppedRefusal
        ? undefined
        : (fileReferenceUnavailableReason(refToolName) ??
          (refToolName.stillHeld?.() === false ? "entry_not_held" : undefined));
    if (unavailableReason !== undefined) {
      logFeatureSad(refToolName.featureName, "not_available");
      logRefusal("not_available", unavailableReason);
      return {
        data: refusalText(refToolName, "not_available", {}),
      };
    }
    if (
      tracked?.binding !== undefined &&
      callBinding(cloned, refToolName, tracked.references) !== tracked.binding
    ) {
      logFeatureSad(refToolName.featureName, "not_available");
      logRefusal("not_available", "call_changed");
      return {
        data: refusalText(refToolName, "not_available", {
          case: "call_changed",
        }),
      };
    }
    if (droppedRefusal && refToolName.recipientCheck !== undefined) {
      logFeatureSad(refToolName.featureName, "not_available");
      logRefusal("not_available", "record_dropped");
      return {
        data: refusalText(refToolName, "not_available", {
          case: "record_dropped",
        }),
      };
    }
    let parsed =
      references === undefined ? undefined : recipientsNotShown(cloned, refToolName.recipientCheck);
    let refusal =
      references === undefined || parsed !== undefined || refToolName.recipientCheck === undefined
        ? undefined
        : gmailShapeRefusal(cloned, refToolName);
    if (parsed !== undefined || refusal !== undefined) {
      let refusal_2 = refusal ?? {
        error: "not_available",
        case: parsed,
      };
      logFeatureSad(refToolName.featureName, refusal_2.error);
      logRefusal(refusal_2.error, refusal_2.case);
      return {
        data: refusalText(refToolName, refusal_2.error, refusal_2),
      };
    }
    let filledInput = cloned;
    let fillMs;
    let sizeBytes = references;
    let hostFills = false;
    if (references === undefined) {
      let now = Date.now();
      let referencedFile = await readReferencedFile(
        cloned,
        getToolPermissionContext(context),
        "send",
        refToolName,
        {
          session: context.session,
          signal: context.abortController.signal,
        },
        tracked?.references,
      );
      fillMs = Date.now() - now;
      if ("refusal" in referencedFile) {
        logRefusal(referencedFile.refusal, referencedFile.detail, referencedFile.fileRefPathKind);
        if (referencedFile.notAnError)
          return {
            data: referencedFile.message,
          };
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          referencedFile.message,
          "file reference refused",
        );
      }
      if ("files" in referencedFile) {
        filledInput = withFilledReferences(
          cloned,
          refToolName,
          new Map(referencedFile.files.map(({ entry, buf }) => [entry, buf.toString("base64")])),
        );
        sizeBytes = referencedFile.files.reduce((acc, { buf }) => acc + buf.length, 0);
      } else if (!isRowFlagServed(refToolName)) {
        logFeatureSad(refToolName.featureName, "not_available");
        logRefusal("not_available", notAvailableReason(refToolName));
        return {
          data: refusalText(refToolName, "not_available", {}),
        };
      } else {
        filledInput = cloned;
        hostFills = true;
      }
    }
    if (refToolName.stillHeld?.() === false) {
      logFeatureSad(refToolName.featureName, "not_available");
      logRefusal("not_available", "entry_not_held");
      return {
        data: refusalText(refToolName, "not_available", {}),
      };
    }
    let permissionResult = context.permissionPhase?.pipeline?.result;
    if (
      !refToolName.asksEveryReference &&
      permissionResult?.behavior === "ask" &&
      permissionResult.decisionReason !== undefined &&
      state.asked.has(permissionResult.decisionReason)
    )
      recordFirstReferenceApproved(
        context.session,
        state.permissionName,
        toolUseId !== undefined &&
          (context.toolDecisions.get(toolUseId)?.surface !== undefined ||
            dialogSourceFor(context.session, toolUseId) !== undefined),
        context.storageV5,
      );
    let fillLog = hostFills
      ? undefined
      : {
          ...logFields,
          stage: "fill",
          outcome: "filled",
          fillMs,
          sizeBytes,
        };
    let extraMeta = hostFills
      ? {
          [ANTHROPIC_HOSTFILLSFILEREFERENCE]: "true",
        }
      : mcpCallMeta;
    let now = Date.now();
    let result;
    try {
      result = await baseCall(
        filledInput,
        extraMeta === undefined
          ? context
          : {
              ...context,
              mcpRequestMeta: {
                ...context.mcpRequestMeta,
                ...extraMeta,
              },
            },
        ...rest,
      );
    } catch (error) {
      let callMs = Date.now() - now;
      tryIgnore(() => {
        if (fillLog === undefined) return;
        let elapsed = uploadFailureOutcome(error, context.abortController.signal);
        if (elapsed === "aborted" || elapsed === "auth_failed")
          logFeatureSad(refToolName.featureName, elapsed);
        else logFeatureBad(refToolName.featureName, elapsed);
        logFileReferenceUpload(refToolName, {
          ...fillLog,
          result: elapsed,
          callMs,
        });
      });
      throw error;
    }
    let callMs = Date.now() - now;
    tryIgnore(() => {
      if (fillLog === undefined) return;
      let outcome = uploadSuccessOutcome(result, context.taskRegistry, toolUseId);
      if (outcome === "auth_failed") logFeatureSad(refToolName.featureName, outcome);
      else if (outcome === "uploaded") logFeatureOk(refToolName.featureName);
      logFileReferenceUpload(refToolName, {
        ...fillLog,
        result: outcome,
        callMs,
      });
    });
    return result;
  };
  if (baseImpl.askInputPreparer !== rowImpl.askInputPreparer)
    tool.askInputPreparer = async (input, input_2, context) => {
      if (!isRowFlagServed(refToolName)) return implFor(context).askInputPreparer?.(input, input_2, context);
      noteFileReferenceCall(context);
      return rowImpl.askInputPreparer?.(input, input_2, context);
    };
}
//@ chunk-xggcs0yq.js:25683-25747 layout
function listHasNonMcpBuiltin(tools) {
  return tools?.some((tools) => tools.isMcp !== true && matchesToolName(tools, REPL_TOOL_NAME)) === true;
}
//@ chunk-xggcs0yq.js:25747-25856 layout
function cloneToolInput(input) {
  let copy = {
    ...input,
  };
  for (let key of Object.keys(copy)) {
    let fieldName = copy[key];
    if (Array.isArray(fieldName)) copy[key] = [...fieldName];
  }
  return copy;
}
//@ chunk-xggcs0yq.js:25856-26089 placement
function referencesForShownFills(input, row, shownFills) {
  let referencesByEntry = new Map();
  if (shownFills.size === 0) return referencesByEntry;
  for (let { entry, value } of fileReferenceValues(input, row)) {
    let fill =
      typeof value === "string"
        ? shownFills.get(computeContentHash(Buffer.from(value, "base64")))
        : undefined;
    if (fill !== undefined && base64URLEncode(value, fill.reference) !== undefined)
      referencesByEntry.set(entry, fill.reference);
  }
  return referencesByEntry;
}
//@ chunk-xggcs0yq.js:26089-26332 placement
function filledBytesTotal(input, row, references) {
  let byHash = new Map(references.map(({ reference }) => [reference.split(":")[1] ?? "", reference]));
  let total;
  for (let { value } of fileReferenceValues(input, row)) {
    let reference =
      typeof value === "string" ? byHash.get(computeContentHash(Buffer.from(value, "base64"))) : undefined;
    let byteLength = reference === undefined ? undefined : base64URLEncode(value, reference);
    if (byteLength !== undefined) total = (total ?? 0) + byteLength;
  }
  return total;
}
//@ chunk-xggcs0yq.js:26332-26808 placement
/**
 * 生成上传文件需要用户批准的询问（只能由人批准、不提供"始终允许"）。
 */
function uploadApprovalAsk(context, state, uploadRow, entry = false) {
  let question =
    context.row.firstReferenceQuestion ??
    `Claude wants to upload a file to ${context.row.serviceName}. This upload needs your approval even if you already allowed this tool.`;
  let reason =
    context.row.recipientCheck === undefined
      ? question
      : [question, ...askedReferences(state, context.row, uploadRow)].join(" ");
  let decision = {
    type: "safetyCheck",
    reason,
    classifierApprovable: false,
  };
  context.asked.add(decision);
  return {
    behavior: "ask",
    message: reason,
    decisionReason: decision,
    personOnly: true,
    suppressAlwaysAllowRule: true,
    askRequiresUserInteraction: true,
    ...(entry && {
      classifierMayAllow: true,
    }),
  };
}
//@ chunk-xggcs0yq.js:26808-26834 layout
function alwaysFalse(state, context) {
  return false;
}
//@ chunk-xggcs0yq.js:26834-27043 layout
function askedReferences(state, row, uploadRow) {
  let files = fileReferenceValues(state, row).flatMap(({ entry, value: refEntry }) => {
    let value = isSha256Value(refEntry)
      ? refEntry
      : uploadRow?.find((known) => known.entry === entry)?.reference;
    return typeof value === "string" ? [value.replace(/^sha256:[^:]*:/, "")] : [];
  });
  return [...addressLines(state), ...fileLines(files)];
}
//@ chunk-xggcs0yq.js:27043-27486 placement
/**
 * 判断这次通过文件引用的上传是否需要用户批准：宿主已先询问、无引用、已批准过或工具可自动放行时不需要，检查出错时需要。
 */
function needsUploadApproval(offer, input, toolContext) {
  let { row } = offer;
  if (row.hostAsksFirstReference) return false;
  try {
    let { toolUseId } = toolContext;
    if (
      !(
        (toolUseId === undefined
          ? referencesForShownFills(input, row, offer.shownFills).size > 0
          : offer.checkedByToolUse.has(toolUseId) || offer.droppedFills.has(toolUseId)) ||
        (isRowFlagServed(row) && hasSha256Args(input, row))
      ) ||
      (!row.asksEveryReference && isFirstReferenceApproved(toolContext.session, offer.permissionName))
    )
      return false;
    let toolPermissionContext = getToolPermissionContext(toolContext);
    return !(
      isBypassAllowedInMode(
        offer.tool,
        isAutoAllowedInMode(offer.tool, toolPermissionContext),
        toolPermissionContext.isBypassPermissionsModeAvailable,
        toolContext.forRemoteExecution,
      ) && offer.tool.mcpInfo?.effectiveMaxPermission !== "ask"
    );
  } catch (error) {
    logPreUploadCheckFailure(error);
    return true;
  }
}
//@ chunk-xggcs0yq.js:27486-27825 placement
/**
 * 记录上传前检查失败的错误，并说明该调用按需要人工批准处理。
 */
function logPreUploadCheckFailure(error) {
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[file reference] a check made before an upload by file reference failed (${sanitizedFeatureErrorCodeForTelemetry(error instanceof Error ? error.name : typeof error)}), so the call is treated as one that needs a person's approval.`,
      "[file reference] a check made before an upload by file reference failed; the call is treated as one that needs a person's approval",
    ),
  );
}
//@ chunk-xggcs0yq.js:27825-27855 placement
/**
 * 执行函数并忽略异常。
 */
function tryIgnore(fn) {
  try {
    fn();
  } catch {}
}
//@ chunk-xggcs0yq.js:27855-27982 placement
function uploadFailureOutcome(error, signal) {
  if (signal.aborted) return "aborted";
  if (isAuthFailureError(error)) return "auth_failed";
  return error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    ? "error_result"
    : "call_failed";
}
//@ chunk-xggcs0yq.js:27982-28099 placement
function uploadSuccessOutcome(result, taskRegistry, toolUseId) {
  if (result.urlElicitationDeclined !== undefined) return "auth_failed";
  return isBackgroundedCall(taskRegistry, toolUseId) ? "backgrounded" : "uploaded";
}
//@ chunk-xggcs0yq.js:28099-28320 placement
function isAuthFailureError(error) {
  if (error instanceof McpAuthError) return true;
  if (!(error instanceof Error)) return false;
  if ("code" in error && error.code === "CLAUDEAI_BEARER_REJECTED") return true;
  return (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    /^(McpError|ProtocolError) -32042$/.test(error.telemetryMessage)
  );
}
//@ chunk-xggcs0yq.js:28320-28427 placement
function isBackgroundedCall(taskRegistry, toolUseId) {
  return (
    toolUseId !== undefined &&
    Object.values(taskRegistry.all()).some((task) => task.type === "mcp_task" && task.toolUseId === toolUseId)
  );
}
//@ chunk-xggcs0yq.js:28427-28965 placement
/**
 * 上报文件引用上传事件：阶段、结果、原因、路径类型、读取/填充/调用耗时与大小。
 */
function logFileReferenceUpload(toolUseId, event) {
  logEvent(toolUseId.uploadEvent, {
    stage: fromEnum(event.stage),
    ...(event.outcome !== undefined && {
      outcome: fromEnum(event.outcome),
    }),
    ...(event.reason !== undefined && {
      reason: sanitizedFeatureErrorCodeForTelemetry(event.reason),
    }),
    ...(event.detail !== undefined && {
      detail: sanitizedFeatureErrorCodeForTelemetry(event.detail),
    }),
    ...(event.fileRefPathKind !== undefined && {
      fileRefPathKind: sanitizedFeatureErrorCodeForTelemetry(event.fileRefPathKind),
    }),
    ...(event.result !== undefined && {
      result: fromEnum(event.result),
    }),
    ...(event.checkReadMs !== undefined && {
      checkReadMs: event.checkReadMs,
    }),
    ...(event.fillMs !== undefined && {
      fill_ms: event.fillMs,
    }),
    ...(event.callMs !== undefined && {
      callMs: event.callMs,
    }),
    ...(event.sizeBytes !== undefined && {
      size_bytes: event.sizeBytes,
    }),
    toolUseID: sanitizeMarkName(event.toolUseId),
    requestId: sanitizeMarkName(event.requestId),
  });
}
//@ chunk-xggcs0yq.js:28965-29063 placement
/**
 * 调用参数里是否有 sha256 形式的引用。
 */
function hasSha256Args(input, row) {
  return (
    fileReferenceValues(input, row).some((candidate) => isSha256Value(candidate.value)) ||
    row.wrongArguments.some((wrongArgument) => isSha256Value(input?.[wrongArgument]))
  );
}
//@ chunk-xggcs0yq.js:29063-29110 placement
/**
 * 匹配 sha256:<hash>:/path 形式的正则。
 */
var SHA256_PATH_RE = /^sha256:[0-9a-f]{64}:(?:[A-Za-z]:)?\//;
//@ chunk-xggcs0yq.js:29110-29403 placement
function matchingReferenceRow(response, input, requireFlag) {
  return FILE_REFERENCE_ROWS.find(
    (row) =>
      row.toolName === response.toolName &&
      (requireFlag
        ? hasSha256Args(input, row)
        : (row.recipientCheck !== undefined &&
            fileReferenceValues(input, row).some(
              (candidate) => typeof candidate.value === "string" && SHA256_PATH_RE.test(candidate.value),
            )) ||
          ((fileReferenceValues(input, row).some((capability) => isSha256Value(capability.value)) ||
            row.wrongArguments.some((wrongArgument) => {
              let value = input?.[wrongArgument];
              return typeof value === "string" && SHA256_PATH_RE.test(value);
            })) &&
            isRowFlagOn(row))),
  );
}
//@ chunk-xggcs0yq.js:29403-30135 placement
function desktopFillMode(capability, row) {
  let marked = row.desktopMark !== undefined && Reflect.get(capability, row.desktopMark) === true;
  let hostFills =
    row.desktopHostFillMark === undefined ? undefined : Reflect.get(capability, row.desktopHostFillMark);
  let mode =
    marked && hostFills !== undefined && hostFills !== false
      ? "conflicting"
      : marked
        ? "fill"
        : hostFills === true
          ? "hostFill"
          : undefined;
  if (!Object.hasOwn(capability, "connectorUrl")) return mode;
  let capabilityUrl = Reflect.get(capability, "connectorUrl");
  let connectorUrl = `${row.connectorOrigin}${row.connectorPath}`;
  if (capabilityUrl !== connectorUrl && capabilityUrl !== `${connectorUrl}/`) return;
  let fillsReference = markIsTrue(capability, "fileReferenceFill");
  let hostFillsReference = Object.hasOwn(capability, "fileReferenceHostFill")
    ? Reflect.get(capability, "fileReferenceHostFill")
    : undefined;
  let verdict =
    fillsReference && hostFillsReference !== undefined && hostFillsReference !== false
      ? "conflicting"
      : fillsReference
        ? "fill"
        : hostFillsReference === true
          ? "hostFill"
          : undefined;
  return [
    [row.desktopMark, "fill"],
    [row.desktopHostFillMark, "hostFill"],
  ].some(
    ([mark, kind]) =>
      mark !== undefined &&
      Object.hasOwn(capability, mark) &&
      Reflect.get(capability, mark) !== (verdict === kind),
  )
    ? "conflicting"
    : verdict;
}
//@ chunk-xggcs0yq.js:30135-30213 layout
function markIsTrue(capability, desktopAsksFirstMark) {
  return (
    desktopAsksFirstMark !== undefined &&
    Object.hasOwn(capability, desktopAsksFirstMark) &&
    Reflect.get(capability, desktopAsksFirstMark) === true
  );
}
//@ chunk-xggcs0yq.js:30213-30279 layout
function needsAskForRow(row, input) {
  return (row.recipientCheck !== undefined || isRowFlagOn(row)) && hasSha256Args(input, row);
}
//@ chunk-xggcs0yq.js:30279-30497 placement
async function refuseUnavailableReference(input, stage, fields) {
  logFeatureSad(input.featureName, "not_available");
  logFileReferenceUpload(input, {
    stage,
    outcome: "refused",
    reason: "not_available",
    detail: notAvailableReason(input),
    ...fields,
  });
  let { refusalText } = await import("../../../components/LogoV2/callBinding.lazy.js");
  return refusalText(input, "not_available", {});
}
//@ chunk-xggcs0yq.js:30497-30531 placement
/**
 * 判断某行的特性开关是否打开。
 */
function isRowFlagOn(row) {
  return getFeatureValue_CACHED_MAY_BE_STALE(row.flag, false);
}
//@ chunk-xggcs0yq.js:30531-30594 placement
/**
 * 判断特性开关是否打开且来源为已服务。
 */
function isRowFlagServed(row) {
  let flagState = getFeatureValueWithSource_CACHED_MAY_BE_STALE(row.flag, false);
  return flagState.value && isServedFeatureSource(flagState.source);
}
//@ chunk-xggcs0yq.js:30594-30658 placement
/**
 * 特性不可用原因（开关未服务 / 填充时关闭）。
 */
function notAvailableReason(row) {
  return isRowFlagOn(row) ? "flag_not_served" : "flag_off_at_fill";
}
//@ chunk-xggcs0yq.js:30658-30689 placement
/**
 * 请求超时的上限（300000 毫秒）。
 */
var LARGE_BODY_CHARS = 1048576;
var TIMEOUT_PER_CHARS = 40;
var MAX_BODY_TIMEOUT_MS = 300000;
//@ chunk-xggcs0yq.js:30689-30821 placement
function requestTimeoutForBody(mcpRequestTimeoutMs, body) {
  if (typeof body !== "string" || body.length <= LARGE_BODY_CHARS || !FILE_REFERENCE_ROWS.some(isRowFlagOn))
    return mcpRequestTimeoutMs;
  return Math.max(
    mcpRequestTimeoutMs,
    Math.min(MAX_BODY_TIMEOUT_MS, Math.ceil(body.length / TIMEOUT_PER_CHARS)),
  );
}
export {
  requestTimeoutForBody,
  proxyFillsListing,
  fileReferenceToolToFill,
  wrapFileReferenceTool,
  filledCallRequestMeta,
  fileReferenceToolForRecords,
  withholdsFileReferenceArguments,
  withholdsFileReferenceErrorText,
  withheldFileReferenceErrorForLog,
  withholdsFileReferenceErrors,
  FIRST_PARTY_UPLOAD_SERVERS,
  FILE_REFERENCE_ROWS,
  withFilledReferences,
  isSha256Value,
  fileReferenceValues,
  CREATE_DRAFT_ROW,
  fileReferenceHintKeyBit,
};
