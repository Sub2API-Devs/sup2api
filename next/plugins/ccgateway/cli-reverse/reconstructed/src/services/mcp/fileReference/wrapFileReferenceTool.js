/**
 * services/mcp/fileReference/wrapFileReferenceTool.ts
 *
 * 2.1.316 新增（门面模块 wrapFileReferenceTool）。包装 MCP 工具以支持文件引用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kc2qkj8w.js (42)
 * attribution: placement 42
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
  recordFirstReferenceApproved,
  isFirstReferenceApproved,
} from "./fileReferencePolicy.js";
import { isPolicyVerdictAbsent } from "../../policyLimits/policyVerdicts.js";
import { env } from "../../../utils/env.js";
import { connectorServerId, requiresConnectorGrant_2 } from "../claudeai.js";
import { isPluginServerConfig } from "../types.js";
import {
  CCR_SESSION_BASE_PATHS,
  isCcrSessionScopedMcpUrl,
  CCR_MCP_QUERY_PARAMS,
  ccrSessionIdFromMcpUrl,
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
import { dialogSourceFor } from "../../../components/permissions/hooks.js";
import { isBypassAllowedInMode, isAutoAllowedInMode } from "../../../utils/permissions/browserToolNames.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, McpAuthError } from "../client.js";
import { logEvent } from "../../analytics/index.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../../utils/startupMarks.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-kc2qkj8w.js:5767-6006 placement
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
//@ chunk-kc2qkj8w.js:6006-6277 placement
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
//@ chunk-kc2qkj8w.js:6277-6422 placement
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
//@ chunk-kc2qkj8w.js:6422-6490 placement
/**
 * 判断值是否为 sha256: 形式。
 */
function isSha256Value(value) {
  return typeof value === "string" && value.startsWith("sha256:");
}
//@ chunk-kc2qkj8w.js:6490-7055 placement
/**
 * 文件引用相关的服务器表：一方 Artifacts 上传服务器（路径、服务器 id、策略键、上传路径前缀），以及 Google Drive create_file 的文件引用行配置（连接器地址、参数名、开关、策略、大小上限）。
 */
var FIRST_PARTY_UPLOAD_SERVERS; // deferred: uses MEMORY_SERVER_ID_2 (../firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var GOOGLE_DRIVE_REFERENCE_ROW;
var FILE_REFERENCE_ROWS;
deferInit("chunk-kc2qkj8w.js:6490", () => {
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
    maxFileBytes: 10485760,
    maxFileText: "10 MB",
  };
  FILE_REFERENCE_ROWS = [GOOGLE_DRIVE_REFERENCE_ROW];
});
//@ chunk-kc2qkj8w.js:7055-7319 placement
var FILE_REFERENCE_HINT =
  "FILE REFERENCES: to upload a file you can read here, don't type its base64; set base64Content to a file reference, sha256:<64 lowercase hex>:<its absolute path, with / between folders>. The app fills in the file's content once the user approves the call.";
//@ chunk-kc2qkj8w.js:7319-7885 placement
/**
 * 判断是否向模型提供某个文件引用行：有本地覆盖时直接用；否则看特性开关是否由服务端下发且开启、策略是否已加载并允许，记录 offered/latched_off/undecided 状态。
 */
function isFileReferenceOffered(row) {
  let override = fileReferenceHintLatch();
  if (override !== null) return override && isRowFlagOn(row);
  let flag = getFeatureValueWithSource_CACHED_MAY_BE_STALE(row.flag, false);
  let tracker = getFileReferenceOffer();
  if (!flag.value) {
    if (isServedFeatureSource(flag.source)) {
      replaceFileReferenceHintLatch(false);
      tracker.note(row, {
        state: "latched_off",
        reason: "flag_off_served",
      });
    } else tracker.holdUndecidedReason("flag_not_served");
    return false;
  }
  let blockReason = fileReferenceUnavailableReason(row);
  if (!isServedFeatureSource(flag.source)) {
    tracker.holdUndecidedReason("flag_not_served");
    return false;
  }
  if (blockReason === "policy_not_loaded" || blockReason === "policy_not_asked") {
    tracker.holdUndecidedReason(blockReason);
    return false;
  }
  if (isPolicyVerdictAbsent()) {
    tracker.holdUndecidedReason("policy_verdict_absent");
    return false;
  }
  let offered = blockReason === undefined;
  replaceFileReferenceHintLatch(offered);
  tracker.note(
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
  return offered;
}
//@ chunk-kc2qkj8w.js:7885-8112 placement
function fileReferenceHintKeyBit(tool) {
  tryIgnore(() => getFileReferenceOffer().flush());
  let row =
    tool.mcpInfo?.fileReference === true &&
    (!env.CLAUDE_CODE_REMOTE || tool.mcpInfo.remoteFileReferenceFill === true)
      ? FILE_REFERENCE_ROWS.find((row) => row.toolName === tool.mcpInfo?.toolName)
      : undefined;
  return row !== undefined && isFileReferenceOffered(row) ? "FR1:" : "";
}
//@ chunk-kc2qkj8w.js:8112-8519 placement
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
//@ chunk-kc2qkj8w.js:8519-9646 placement
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
//@ chunk-kc2qkj8w.js:9646-11342 placement
function fileReferenceToolToFill(client, toolName) {
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
      return Object.hasOwn(capability, declared.desktopAsksFirstMark) &&
        Reflect.get(capability, declared.desktopAsksFirstMark) === true
        ? {
            ...fillRow,
            hostAsksFirstReference: true,
          }
        : fillRow;
    }
    let found = FILE_REFERENCE_ROWS.find((row) => row.toolName === toolName);
    if (found === undefined || capability === undefined)
      return noteNotWrapped(client, toolName, "not_claudeai_connector");
    let refusalKind = desktopFillMode(capability, found) === "conflicting" ? "conflicting" : "undeclared";
    if (refusalKind === "conflicting") noteNotWrapped(client, toolName, "desktop_conflicting");
    return {
      ...found,
      refusesReferences: refusalKind,
    };
  }
  try {
    let { config } = client;
    let isCcs = isCcsTenant();
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
      );
    }
    if (config.type !== "http" || config.scope !== "dynamic" || isPluginServerConfig(config))
      return noteNotWrapped(client, toolName, "entry_shape");
    if (startupCcrEnv.bridgeCarrier !== undefined) return noteNotWrapped(client, toolName, "bridge_carrier");
    if (!isCcrSessionScopedMcpUrl(config.url)) return noteNotWrapped(client, toolName, "not_own_route");
    if (!hasUniqueQueryParams(config.url, CCR_MCP_QUERY_PARAMS))
      return noteNotWrapped(client, toolName, "route_query_ambiguous");
    let capabilityCache = serverCapabilityCache.peek(getRootSession());
    let startupHeaders = capabilityCache?.read?.(client.name, config.url);
    if (startupHeaders === undefined) return noteNotWrapped(client, toolName, "no_startup_headers");
    if (headerValues(startupHeaders, X_CCR_OWNER_SLACK_USER_ID).length > 0)
      return noteNotWrapped(client, toolName, "owner_header");
    let origins = headerValues(startupHeaders, X_MCP_SERVER_ORIGIN);
    if (origins.length !== 1)
      return noteNotWrapped(client, toolName, origins.length === 0 ? "origin_missing" : "origin_multiple");
    if (origins[0] !== "directory" && origins[0] !== "custom")
      return noteNotWrapped(client, toolName, "origin_other");
    let upstreamUrl = ccrSessionIdFromMcpUrl(config.url)?.upstreamUrl;
    let found = FILE_REFERENCE_ROWS.find((row) => {
      let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
      return row.toolName === toolName && (upstreamUrl === expectedUrl || upstreamUrl === `${expectedUrl}/`);
    });
    if (found === undefined)
      return noteNotWrapped(
        client,
        toolName,
        upstreamUrl === undefined ? "upstream_unread" : "upstream_not_drive",
      );
    if (!isCcs && capabilityCache?.isStartupEntry?.(client.name, config) !== true)
      return noteNotWrapped(client, toolName, "not_startup_entry");
    let { name: serverName } = client;
    let { url } = config;
    return {
      ...found,
      approvalSeesContent: true,
      stillHeld: () => serverCapabilityCache.peek(getRootSession())?.read?.(serverName, url) !== undefined,
    };
  } catch {
    return;
  }
}
//@ chunk-kc2qkj8w.js:11342-11595 placement
function noteNotWrapped(client, toolName, reason) {
  tryIgnore(() => {
    let { config } = client;
    let url = "url" in config ? config.url : undefined;
    let row =
      fileReferenceToolForRecords(client, toolName) ??
      FILE_REFERENCE_ROWS.find((row) => {
        let expectedUrl = `${row.connectorOrigin}${row.connectorPath}`;
        return row.toolName === toolName && (url === expectedUrl || url === `${expectedUrl}/`);
      });
    if (row !== undefined)
      getFileReferenceOffer().note(row, {
        state: "not_wrapped",
        reason,
      });
  });
  return;
}
//@ chunk-kc2qkj8w.js:11595-11676 placement
var ANTHROPIC_FILLEDFROMFILEREFERENCE = "anthropic/filledFromFileReference";
var ANTHROPIC_HOSTFILLSFILEREFERENCE = "anthropic/hostFillsFileReference";
//@ chunk-kc2qkj8w.js:11676-11742 placement
function filledCallRequestMeta(client) {
  return client.config.type === "sdk"
    ? {
        [ANTHROPIC_FILLEDFROMFILEREFERENCE]: "true",
      }
    : undefined;
}
//@ chunk-kc2qkj8w.js:11742-11794 placement
function withholdsFileReferenceArguments(row, toolUseId) {
  return row !== undefined && (isFileReferenceCall(toolUseId) || isRowFlagOn(row));
}
//@ chunk-kc2qkj8w.js:11794-11864 placement
function withholdsFileReferenceErrorText(row, toolUseId) {
  return row !== undefined && (env.CLAUDE_CODE_REMOTE || withholdsFileReferenceArguments(row, toolUseId));
}
//@ chunk-kc2qkj8w.js:11864-11974 placement
function withholdsFileReferenceErrors(tool, toolUseID) {
  return (
    tool.mcpInfo?.fileReference === true &&
    withholdsFileReferenceErrorText(
      FILE_REFERENCE_ROWS.find((row) => row.toolName === tool.mcpInfo?.toolName),
      toolUseID,
    )
  );
}
//@ chunk-kc2qkj8w.js:11974-12256 placement
function withheldFileReferenceErrorForLog(toolInfo, messageText, name = "McpToolCallError") {
  return `${name}; its message (${messageText.length} characters) is not logged because errors from ${toolInfo.serviceName}'s ${toolInfo.toolName} tool can contain the file being uploaded. The tool result in this session's transcript shows the message, shortened if long.`;
}
//@ chunk-kc2qkj8w.js:12256-12340 placement
/**
 * 保留尺寸条目的最小数（16）。
 */
var BASE64_BLOB_RE = /^[\r\n]*[A-Za-z0-9+/_-][A-Za-z0-9+/_\r\n-]*(?:=[\r\n]*){0,2}$/;
var MAX_TRACKED_SIZE_ENTRIES = 100;
var MIN_SIZE_ENTRIES = 16;
//@ chunk-kc2qkj8w.js:12340-12575 placement = base64URLEncode (1)
function base64URLEncode(base64, reference) {
  if (typeof base64 !== "string") return;
  let buffer = Buffer.from(base64, "base64");
  if (computeContentHash(buffer) !== reference.split(":")[1]) return;
  let normalize = (text) => text.replace(/[\s=]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  return normalize(base64) === normalize(buffer.toString("base64")) ? buffer.length : undefined;
}
//@ chunk-kc2qkj8w.js:12575-21496 placement
/**
 * 包装 MCP 工具以支持文件引用（桌面 Drive 填充）：在 validateInput/call 前检查服务器是否声明支持文件引用，解析引用、上传文件并在不可用时以 not_available 拒绝。
 */
function wrapFileReferenceTool(tool, refToolName, rowImpl, toolUseIdFromMeta, mcpCallMeta) {
  let loadModule = () => import("../checkCall.lazy.js");
  if (refToolName.refusesReferences) {
    let _ = {
      validateInput: tool.validateInput,
      call: tool.call,
    };
    let detail =
      refToolName.refusesReferences === "conflicting"
        ? "desktop_drive_fill_declaration_conflict"
        : "desktop_drive_fill_not_declared";
    tool.validateInput = async (input, context) => {
      let refRow = matchingReferenceRow(refToolName, input, false);
      if (refRow === undefined)
        return (
          (await _.validateInput?.(input, context)) ?? {
            result: true,
          }
        );
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logFileReferenceUpload({
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
      if (refRow === undefined) return _.call(input, context, ...rest);
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logFileReferenceUpload({
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
  tool.prompt = async (_) => {
    let basePrompt = await prompt(_);
    if (!isFileReferenceOffered(refToolName)) return basePrompt;
    return basePrompt === "" ? FILE_REFERENCE_HINT : `${FILE_REFERENCE_HINT} ${basePrompt}`;
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
  let implFor = (_) => (_ !== undefined && isFileReferenceCall(_) ? rowImpl : baseImpl);
  tool.validateInput = async (_, context) => {
    pendingFill = undefined;
    let refValues = shownFills.size > 0 ? fileReferenceValues(_, refToolName) : [];
    for (let { value } of refValues) {
      if (typeof value !== "string") continue;
      let contentHash = computeContentHash(Buffer.from(value, "base64"));
      let shown = shownFills.get(contentHash);
      if (
        shown !== undefined &&
        !shown.toolUses.has(context.toolUseId ?? "") &&
        base64URLEncode(value, shown.reference) !== undefined
      )
        shownFills.delete(contentHash);
    }
    let tracked = context.toolUseId === undefined ? undefined : checkedByToolUse.get(context.toolUseId);
    if (
      context.toolUseId !== undefined &&
      tracked !== undefined &&
      !(refToolName.approvalSeesContent && filledBytesTotal(_, refToolName, tracked.references) !== undefined)
    )
      checkedByToolUse.delete(context.toolUseId);
    if (!isRowFlagServed(refToolName)) {
      if (isRowFlagOn(refToolName) && hasSha256Args(_, refToolName))
        return {
          result: false,
          message: await refuseUnavailableReference(refToolName, "plan", {
            toolUseId: context.toolUseId,
          }),
          errorCode: 2,
          notAnError: true,
        };
      return (
        (await implFor(context.toolUseId).validateInput?.(_, context)) ?? {
          result: true,
        }
      );
    }
    let validation = (await rowImpl.validateInput?.(_, context)) ?? {
      result: true,
    };
    if (!validation.result) return validation;
    noteFileReferenceCall(context.toolUseId);
    let cloned = cloneReferenceArgument(_, refToolName);
    if (!hasSha256Args(cloned, refToolName)) return validation;
    let { readReferencedFile } = await loadModule();
    let now = Date.now();
    let referencedFile = await readReferencedFile(
      cloned,
      getToolPermissionContext(context),
      "check",
      refToolName,
      {
        session: context.session,
        signal: context.abortController.signal,
      },
    );
    let checkReadMs = Date.now() - now;
    if ("refusal" in referencedFile) {
      logFileReferenceUpload({
        stage: referencedFile.beforeRead ? "plan" : "check",
        outcome: "refused",
        reason: referencedFile.refusal,
        detail: referencedFile.detail,
        fileRefPathKind: referencedFile.fileRefPathKind,
        checkReadMs,
        toolUseId: context.toolUseId,
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
      "files" in referencedFile
        ? {
            stage: "check",
            outcome: "passed",
            sizeBytes: referencedFile.files.reduce((acc, file) => acc + file.buf.length, 0),
            checkReadMs,
            toolUseId: context.toolUseId,
          }
        : {
            stage: "plan",
            outcome: "passed",
            detail: "host_fills",
            checkReadMs,
            toolUseId: context.toolUseId,
          },
    );
    let references =
      "files" in referencedFile
        ? referencedFile.files.map(({ entry, reference }) => ({
            entry,
            reference,
          }))
        : referencedFile.references;
    if (context.toolUseId !== undefined && references.length > 0) {
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
      droppedFills.delete(context.toolUseId);
      checkedByToolUse.set(context.toolUseId, {
        references,
        checkReadMs,
      });
      if (refToolName.approvalSeesContent && "files" in referencedFile)
        pendingFill = {
          fills: referencedFile.files.map(({ entry, reference, buf }) => ({
            entry,
            reference,
            base64: buf.toString("base64"),
          })),
          toolUseId: context.toolUseId,
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
  tool.checkPermissions = async (_, context) => {
    let decision;
    try {
      decision = await checkPermissions.call(tool, _, context);
    } catch (error) {
      if (!needsUploadApproval(state, _, context)) throw error;
      logPreUploadCheckFailure(error);
      return uploadApprovalAsk(state);
    }
    return decision.behavior !== "deny" && needsUploadApproval(state, _, context)
      ? uploadApprovalAsk(state)
      : decision;
  };
  let permissionCheckFailureDecision = tool.permissionCheckFailureDecision;
  tool.permissionCheckFailureDecision = (_, context) =>
    needsUploadApproval(
      state,
      typeof _ === "object" && _ !== null
        ? {
            ..._,
          }
        : undefined,
      context,
    )
      ? uploadApprovalAsk(state)
      : permissionCheckFailureDecision?.call(tool, _, context);
  tool.owesPersonOnlyAsk = (_, context, toolUseId) =>
    needsUploadApproval(state, _, {
      ...context,
      toolUseId: toolUseId ?? context.toolUseId,
    });
  tool.settleUnaskedQuestion = async (_, toolUseId, context, approved, dontAsk) => {
    let hostEntry = isHostSessionEntrypoint() || isHostEntrypoint();
    let settled = false;
    if (
      _.decisionReason === undefined ||
      !state.asked.has(_.decisionReason) ||
      ((!approved || tool.requiresUserInteraction?.() || requiresConnectorGrant_2(tool) || hostEntry) &&
        (_.matchedAskRule !== undefined || tool.mcpInfo?.effectiveMaxPermission === "ask")) ||
      (hostEntry && dontAsk)
    )
      return;
    let { refusalText } = await loadModule();
    checkedByToolUse.delete(toolUseId);
    if (context.abortController.signal.aborted) return;
    logFeatureSad("mcp_drive_file_reference", "not_available");
    logFileReferenceUpload({
      stage: "fill",
      outcome: "refused",
      reason: "not_available",
      detail: dontAsk ? "dont_ask_mode" : "nobody_to_ask",
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
      if (isRowFlagOn(refToolName) && hasSha256Args(input, refToolName))
        return {
          data: await refuseUnavailableReference(refToolName, "fill", {
            toolUseId,
            requestId: rest[1]?.requestId,
          }),
        };
      return baseImpl.call(input, context, ...rest);
    }
    noteFileReferenceCall(toolUseId ?? (rest[1] === undefined ? undefined : toolUseIdFromMeta(rest[1])));
    let cloned = cloneReferenceArgument(input, refToolName);
    let tracked = toolUseId === undefined ? undefined : checkedByToolUse.get(toolUseId);
    let hasSha = hasSha256Args(cloned, refToolName);
    let filledBytes =
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
        refToolName.stillHeld?.() === false);
    if (filledBytes === undefined && !hasSha && !droppedRefusal) {
      let latch = fileReferenceHintLatch();
      let mayLog = false;
      try {
        mayLog = latch === true && getFileReferenceOffer().mayLogTypedRow(refToolName);
      } catch {}
      if (!mayLog || !isRowFlagOn(refToolName)) {
        if (latch === null && isRowFlagOn(refToolName))
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
      let textValue = cloned[refToolName.textArgument];
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
          logFileReferenceUpload({
            ...logBase,
            result: uploadFailureOutcome(error, context.abortController.signal),
            callMs,
          }),
        );
        throw error;
      }
      let callMs = Date.now() - now;
      tryIgnore(() =>
        logFileReferenceUpload({
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
    let { readReferencedFile, refusalText } = await loadModule();
    let logRefusal = (reason, detail, fileRefPathKind) =>
      logFileReferenceUpload({
        ...logFields,
        stage: "fill",
        outcome: "refused",
        reason,
        detail,
        fileRefPathKind,
      });
    if (!isRowFlagServed(refToolName)) {
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logRefusal("not_available", notAvailableReason(refToolName));
      return {
        data: refusalText(refToolName, "not_available", {}),
      };
    }
    let unavailableReason =
      filledBytes === undefined && !droppedRefusal
        ? undefined
        : (fileReferenceUnavailableReason(refToolName) ??
          (refToolName.stillHeld?.() === false ? "entry_not_held" : undefined));
    if (unavailableReason !== undefined) {
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logRefusal("not_available", unavailableReason);
      return {
        data: refusalText(refToolName, "not_available", {}),
      };
    }
    let filledInput = cloned;
    let fillMs;
    let sizeBytes = filledBytes;
    let hostFills = false;
    if (filledBytes === undefined) {
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
        logFeatureSad("mcp_drive_file_reference", "not_available");
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
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logRefusal("not_available", "entry_not_held");
      return {
        data: refusalText(refToolName, "not_available", {}),
      };
    }
    let permissionResult = context.permissionPhase?.pipeline?.result;
    if (
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
        let outcome = uploadFailureOutcome(error, context.abortController.signal);
        if (outcome === "aborted" || outcome === "auth_failed")
          logFeatureSad("mcp_drive_file_reference", outcome);
        else logFeatureBad("mcp_drive_file_reference", outcome);
        logFileReferenceUpload({
          ...fillLog,
          result: outcome,
          callMs,
        });
      });
      throw error;
    }
    let callMs = Date.now() - now;
    tryIgnore(() => {
      if (fillLog === undefined) return;
      let outcome = uploadSuccessOutcome(result, context.taskRegistry, toolUseId);
      if (outcome === "auth_failed") logFeatureSad("mcp_drive_file_reference", outcome);
      else if (outcome === "uploaded") logFeatureOk("mcp_drive_file_reference");
      logFileReferenceUpload({
        ...fillLog,
        result: outcome,
        callMs,
      });
    });
    return result;
  };
  if (baseImpl.askInputPreparer !== rowImpl.askInputPreparer)
    tool.askInputPreparer = async (_, input, context) => {
      if (!isRowFlagServed(refToolName)) return implFor(context).askInputPreparer?.(_, input, context);
      noteFileReferenceCall(context);
      return rowImpl.askInputPreparer?.(_, input, context);
    };
}
//@ chunk-kc2qkj8w.js:21496-21729 placement
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
//@ chunk-kc2qkj8w.js:21729-21972 placement
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
//@ chunk-kc2qkj8w.js:21972-22314 placement
/**
 * 生成上传文件需要用户批准的询问（只能由人批准、不提供"始终允许"）。
 */
function uploadApprovalAsk(context) {
  let message = `Claude wants to upload a file to ${context.row.serviceName}. This upload needs your approval even if you already allowed this tool.`;
  let reason = {
    type: "safetyCheck",
    reason: message,
    classifierApprovable: false,
  };
  context.asked.add(reason);
  return {
    behavior: "ask",
    message,
    decisionReason: reason,
    personOnly: true,
    suppressAlwaysAllowRule: true,
    askRequiresUserInteraction: true,
  };
}
//@ chunk-kc2qkj8w.js:22314-22733 placement
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
      isFirstReferenceApproved(toolContext.session, offer.permissionName)
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
//@ chunk-kc2qkj8w.js:22733-23072 placement
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
//@ chunk-kc2qkj8w.js:23072-23102 placement
/**
 * 执行函数并忽略异常。
 */
function tryIgnore(fn) {
  try {
    fn();
  } catch {}
}
//@ chunk-kc2qkj8w.js:23102-23229 placement
function uploadFailureOutcome(error, signal) {
  if (signal.aborted) return "aborted";
  if (isAuthFailureError(error)) return "auth_failed";
  return error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    ? "error_result"
    : "call_failed";
}
//@ chunk-kc2qkj8w.js:23229-23346 placement
function uploadSuccessOutcome(result, taskRegistry, toolUseId) {
  if (result.urlElicitationDeclined !== undefined) return "auth_failed";
  return isBackgroundedCall(taskRegistry, toolUseId) ? "backgrounded" : "uploaded";
}
//@ chunk-kc2qkj8w.js:23346-23567 placement
function isAuthFailureError(error) {
  if (error instanceof McpAuthError) return true;
  if (!(error instanceof Error)) return false;
  if ("code" in error && error.code === "CLAUDEAI_BEARER_REJECTED") return true;
  return (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    /^(McpError|ProtocolError) -32042$/.test(error.telemetryMessage)
  );
}
//@ chunk-kc2qkj8w.js:23567-23674 placement
function isBackgroundedCall(taskRegistry, toolUseId) {
  return (
    toolUseId !== undefined &&
    Object.values(taskRegistry.all()).some((task) => task.type === "mcp_task" && task.toolUseId === toolUseId)
  );
}
//@ chunk-kc2qkj8w.js:23674-24236 placement
/**
 * 上报文件引用上传事件：阶段、结果、原因、路径类型、读取/填充/调用耗时与大小。
 */
function logFileReferenceUpload(event) {
  logEvent("tengu_mcp_drive_file_reference_upload", {
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
//@ chunk-kc2qkj8w.js:24236-24333 placement
/**
 * 调用参数里是否有 sha256 形式的引用。
 */
function hasSha256Args(input, row) {
  return (
    fileReferenceValues(input, row).some((candidate) => isSha256Value(candidate.value)) ||
    row.wrongArguments.some((wrongArgument) => isSha256Value(input?.[wrongArgument]))
  );
}
//@ chunk-kc2qkj8w.js:24333-24380 placement
/**
 * 匹配 sha256:<hash>:/path 形式的正则。
 */
var SHA256_PATH_RE = /^sha256:[0-9a-f]{64}:(?:[A-Za-z]:)?\//;
//@ chunk-kc2qkj8w.js:24380-24580 placement
function matchingReferenceRow(response, input, requireFlag) {
  return FILE_REFERENCE_ROWS.find(
    (row) =>
      row.toolName === response.toolName &&
      (requireFlag
        ? hasSha256Args(input, row)
        : (fileReferenceValues(input, row).some((candidate) => isSha256Value(candidate.value)) ||
            row.wrongArguments.some((wrongArgument) => {
              let value = input?.[wrongArgument];
              return typeof value === "string" && SHA256_PATH_RE.test(value);
            })) &&
          isRowFlagOn(row)),
  );
}
//@ chunk-kc2qkj8w.js:24580-24770 placement
function desktopFillMode(capability, row) {
  let fills = Reflect.get(capability, row.desktopMark) === true;
  let hostFills = Reflect.get(capability, row.desktopHostFillMark);
  if (fills && hostFills !== undefined && hostFills !== false) return "conflicting";
  if (fills) return "fill";
  return hostFills === true ? "hostFill" : undefined;
}
//@ chunk-kc2qkj8w.js:24770-25011 placement
async function refuseUnavailableReference(input, stage, fields) {
  logFeatureSad("mcp_drive_file_reference", "not_available");
  logFileReferenceUpload({
    stage,
    outcome: "refused",
    reason: "not_available",
    detail: "flag_not_served",
    ...fields,
  });
  let { refusalText } = await import("../checkCall.lazy.js");
  return refusalText(input, "not_available", {});
}
//@ chunk-kc2qkj8w.js:25011-25045 placement
/**
 * 判断某行的特性开关是否打开。
 */
function isRowFlagOn(row) {
  return getFeatureValue_CACHED_MAY_BE_STALE(row.flag, false);
}
//@ chunk-kc2qkj8w.js:25045-25108 placement
/**
 * 判断特性开关是否打开且来源为已服务。
 */
function isRowFlagServed(row) {
  let flagState = getFeatureValueWithSource_CACHED_MAY_BE_STALE(row.flag, false);
  return flagState.value && isServedFeatureSource(flagState.source);
}
//@ chunk-kc2qkj8w.js:25108-25172 placement
/**
 * 特性不可用原因（开关未服务 / 填充时关闭）。
 */
function notAvailableReason(row) {
  return isRowFlagOn(row) ? "flag_not_served" : "flag_off_at_fill";
}
//@ chunk-kc2qkj8w.js:25172-25203 placement
/**
 * 请求超时的上限（300000 毫秒）。
 */
var LARGE_BODY_CHARS = 1048576;
var TIMEOUT_PER_CHARS = 40;
var MAX_BODY_TIMEOUT_MS = 300000;
//@ chunk-kc2qkj8w.js:25203-25335 placement
function requestTimeoutForBody(mcpRequestTimeoutMs, body) {
  if (typeof body !== "string" || body.length <= LARGE_BODY_CHARS || !FILE_REFERENCE_ROWS.some(isRowFlagOn))
    return mcpRequestTimeoutMs;
  return Math.max(
    mcpRequestTimeoutMs,
    Math.min(MAX_BODY_TIMEOUT_MS, Math.ceil(body.length / TIMEOUT_PER_CHARS)),
  );
}
export {
  isSha256Value,
  fileReferenceValues,
  requestTimeoutForBody,
  fileReferenceToolToFill,
  wrapFileReferenceTool,
  filledCallRequestMeta,
  fileReferenceToolForRecords,
  withholdsFileReferenceArguments,
  withholdsFileReferenceErrorText,
  withheldFileReferenceErrorForLog,
  FIRST_PARTY_UPLOAD_SERVERS,
  withholdsFileReferenceErrors,
  FILE_REFERENCE_ROWS,
  fileReferenceHintKeyBit,
};
