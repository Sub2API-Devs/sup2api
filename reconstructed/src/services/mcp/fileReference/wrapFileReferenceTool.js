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

//@ chunk-kc2qkj8w.js:5767-6006 placement
/**
 * 取出工具参数中文件引用字段的值（单值，或数组中每个对象的指定键）。
 */
function fileReferenceValues(e, n) {
  let r = e?.[n.argument];
  let { entryKey } = n;
  if (entryKey === undefined)
    return [
      {
        entry: undefined,
        value: r,
      },
    ];
  if (!Array.isArray(r)) return [];
  let o = [];
  for (let [d, y] of r.entries())
    if (isPlainObject(y))
      o.push({
        entry: d,
        value: Object.hasOwn(y, entryKey) ? y[entryKey] : undefined,
      });
  return o;
}
//@ chunk-kc2qkj8w.js:6006-6277 placement
function withFilledReferences(e, n, r) {
  let { entryKey } = n;
  if (entryKey === undefined) {
    let d = r.get(undefined);
    return d === undefined
      ? {
          ...e,
        }
      : {
          ...e,
          [n.argument]: d,
        };
  }
  let o = e[n.argument];
  if (!Array.isArray(o))
    return {
      ...e,
    };
  return {
    ...e,
    [n.argument]: o.map((d, y) => {
      let R = r.get(y);
      return R === undefined || !isPlainObject(d)
        ? d
        : {
            ...d,
            [entryKey]: R,
          };
    }),
  };
}
//@ chunk-kc2qkj8w.js:6277-6422 placement
function cloneReferenceArgument(e, n) {
  let r = e[n.argument];
  if (n.entryKey === undefined || !Array.isArray(r))
    return {
      ...e,
    };
  return {
    ...e,
    [n.argument]: r.map((t) =>
      isPlainObject(t)
        ? {
            ...t,
          }
        : t,
    ),
  };
}
//@ chunk-kc2qkj8w.js:6422-6490 placement
/**
 * 判断值是否为 sha256: 形式。
 */
function isSha256Value(e) {
  return typeof e === "string" && e.startsWith("sha256:");
}
//@ chunk-kc2qkj8w.js:6490-7055 placement
/**
 * 文件引用相关的服务器表：一方 Artifacts 上传服务器（路径、服务器 id、策略键、上传路径前缀），以及 Google Drive create_file 的文件引用行配置（连接器地址、参数名、开关、策略、大小上限）。
 */
var FIRST_PARTY_UPLOAD_SERVERS = [
  {
    path: ARTIFACTS_MCP_PATH,
    serverId: ARTIFACTS_SERVER_ID,
    policy: "allow_cobalt_plinth",
    uploadPathPrefix: `${ARTIFACTS_MCP_PATH}/upload/`,
    ccrEntryPath: CCR_ARTIFACTS_MCP_PATH,
  },
];
var GOOGLE_DRIVE_REFERENCE_ROW = {
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
var FILE_REFERENCE_ROWS = [GOOGLE_DRIVE_REFERENCE_ROW];
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
function fileReferenceHintKeyBit(e) {
  tryIgnore(() => getFileReferenceOffer().flush());
  let row =
    e.mcpInfo?.fileReference === true &&
    (!env.CLAUDE_CODE_REMOTE || e.mcpInfo.remoteFileReferenceFill === true)
      ? FILE_REFERENCE_ROWS.find((r) => r.toolName === e.mcpInfo?.toolName)
      : undefined;
  return row !== undefined && isFileReferenceOffered(row) ? "FR1:" : "";
}
//@ chunk-kc2qkj8w.js:8112-8519 placement
/**
 * 找到该 MCP 工具对应的文件引用配置行：SDK 服务器按连接器 id 与填充方式，其他按连接器地址匹配。
 */
function fileReferenceRowFor(e, n) {
  if (!FILE_REFERENCE_ROWS.some((t) => t.toolName === n)) return;
  if (e.config.type === "sdk") {
    let t = claudeAiConnectorCapability(e);
    return t === undefined
      ? undefined
      : FILE_REFERENCE_ROWS.find(
          (o) =>
            o.toolName === n && (desktopFillMode(t, o) === "fill" || desktopFillMode(t, o) === "hostFill"),
        );
  }
  if (connectorServerId(e.config) === undefined || !("url" in e.config) || typeof e.config.url !== "string")
    return;
  let { url } = e.config;
  return FILE_REFERENCE_ROWS.find((t) => {
    let o = `${t.connectorOrigin}${t.connectorPath}`;
    return t.toolName === n && (url === o || url === `${o}/`);
  });
}
//@ chunk-kc2qkj8w.js:8519-9646 placement
function fileReferenceToolForRecords(client, n) {
  if (!FILE_REFERENCE_ROWS.some((r) => r.toolName === n)) return;
  try {
    let r = claudeAiConnectorCapability(client);
    let t =
      fileReferenceRowFor(client, n) ??
      (r === undefined
        ? undefined
        : FILE_REFERENCE_ROWS.find((E) => E.toolName === n && desktopFillMode(r, E) === "conflicting"));
    if (t !== undefined || env.CLAUDE_CODE_REMOTE !== true) return t;
    let { config } = client;
    if (
      config.type !== "http" ||
      config.scope !== "dynamic" ||
      isPluginServerConfig(config) ||
      !("url" in config) ||
      typeof config.url !== "string"
    )
      return;
    let d = new URL(config.url, "https://no-origin.invalid");
    let found = CCR_SESSION_BASE_PATHS.find((E) => d.pathname.startsWith(E));
    if (found === undefined || !/^[^/]+\/mcp$/.test(d.pathname.slice(found.length))) return;
    let all = d.searchParams.getAll("mcp_url");
    return FILE_REFERENCE_ROWS.find((E) => {
      let P = `${E.connectorOrigin}${E.connectorPath}`;
      return E.toolName === n && all.some((F) => F === P || F === `${P}/`);
    });
  } catch (error) {
    if (env.CLAUDE_CODE_REMOTE !== true) throw error;
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[file reference] could not check whether an MCP server is a connector whose uploads may carry a file's contents (${sanitizedFeatureErrorCodeForTelemetry(error instanceof Error ? error.name : typeof error)}), so it is treated as one: the text of errors from its upload tool is left out of logs and traces.`,
        "[file reference] could not check whether an MCP server is a connector whose uploads may carry a file's contents; it is treated as one",
      ),
    );
    return FILE_REFERENCE_ROWS.find((t) => t.toolName === n);
  }
}
//@ chunk-kc2qkj8w.js:9646-11342 placement
function fileReferenceToolToFill(e, name) {
  if (!FILE_REFERENCE_ROWS.some((r) => r.toolName === name)) return;
  if (!env.CLAUDE_CODE_REMOTE) {
    let r = fileReferenceRowFor(e, name);
    let t = claudeAiConnectorCapability(e);
    if (r !== undefined) {
      if (t === undefined) return r;
      let y =
        desktopFillMode(t, r) === "hostFill"
          ? {
              ...r,
              hostFills: true,
            }
          : r;
      return Object.hasOwn(t, r.desktopAsksFirstMark) && Reflect.get(t, r.desktopAsksFirstMark) === true
        ? {
            ...y,
            hostAsksFirstReference: true,
          }
        : y;
    }
    let found = FILE_REFERENCE_ROWS.find((y) => y.toolName === name);
    if (found === undefined || t === undefined) return noteNotWrapped(e, name, "not_claudeai_connector");
    let d = desktopFillMode(t, found) === "conflicting" ? "conflicting" : "undeclared";
    if (d === "conflicting") noteNotWrapped(e, name, "desktop_conflicting");
    return {
      ...found,
      refusesReferences: d,
    };
  }
  try {
    let { config } = e;
    let t = isCcsTenant();
    if (!(isRemoteOrFalse() || t)) {
      let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
      return noteNotWrapped(
        e,
        name,
        CLAUDE_CODE_ENVIRONMENT_KIND === "byoc"
          ? "environment_byoc"
          : CLAUDE_CODE_ENVIRONMENT_KIND === "bridge"
            ? "environment_bridge"
            : "environment_other",
      );
    }
    if (config.type !== "http" || config.scope !== "dynamic" || isPluginServerConfig(config))
      return noteNotWrapped(e, name, "entry_shape");
    if (startupCcrEnv.bridgeCarrier !== undefined) return noteNotWrapped(e, name, "bridge_carrier");
    if (!isCcrSessionScopedMcpUrl(config.url)) return noteNotWrapped(e, name, "not_own_route");
    if (!hasUniqueQueryParams(config.url, CCR_MCP_QUERY_PARAMS))
      return noteNotWrapped(e, name, "route_query_ambiguous");
    let o = serverCapabilityCache.peek(getRootSession());
    let d = o?.read?.(e.name, config.url);
    if (d === undefined) return noteNotWrapped(e, name, "no_startup_headers");
    if (headerValues(d, X_CCR_OWNER_SLACK_USER_ID).length > 0) return noteNotWrapped(e, name, "owner_header");
    let y = headerValues(d, X_MCP_SERVER_ORIGIN);
    if (y.length !== 1) return noteNotWrapped(e, name, y.length === 0 ? "origin_missing" : "origin_multiple");
    if (y[0] !== "directory" && y[0] !== "custom") return noteNotWrapped(e, name, "origin_other");
    let upstreamUrl = ccrSessionIdFromMcpUrl(config.url)?.upstreamUrl;
    let found = FILE_REFERENCE_ROWS.find((N) => {
      let W = `${N.connectorOrigin}${N.connectorPath}`;
      return N.toolName === name && (upstreamUrl === W || upstreamUrl === `${W}/`);
    });
    if (found === undefined)
      return noteNotWrapped(e, name, upstreamUrl === undefined ? "upstream_unread" : "upstream_not_drive");
    if (!t && o?.isStartupEntry?.(e.name, config) !== true)
      return noteNotWrapped(e, name, "not_startup_entry");
    let { name: P } = e;
    let { url } = config;
    return {
      ...found,
      approvalSeesContent: true,
      stillHeld: () => serverCapabilityCache.peek(getRootSession())?.read?.(P, url) !== undefined,
    };
  } catch {
    return;
  }
}
//@ chunk-kc2qkj8w.js:11342-11595 placement
function noteNotWrapped(e, n, reason) {
  tryIgnore(() => {
    let { config } = e;
    let url = "url" in config ? config.url : undefined;
    let d =
      fileReferenceToolForRecords(e, n) ??
      FILE_REFERENCE_ROWS.find((y) => {
        let R = `${y.connectorOrigin}${y.connectorPath}`;
        return y.toolName === n && (url === R || url === `${R}/`);
      });
    if (d !== undefined)
      getFileReferenceOffer().note(d, {
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
function filledCallRequestMeta(e) {
  return e.config.type === "sdk"
    ? {
        [ANTHROPIC_FILLEDFROMFILEREFERENCE]: "true",
      }
    : undefined;
}
//@ chunk-kc2qkj8w.js:11742-11794 placement
function withholdsFileReferenceArguments(e, toolUseId) {
  return e !== undefined && (isFileReferenceCall(toolUseId) || isRowFlagOn(e));
}
//@ chunk-kc2qkj8w.js:11794-11864 placement
function withholdsFileReferenceErrorText(e, toolUseId) {
  return e !== undefined && (env.CLAUDE_CODE_REMOTE || withholdsFileReferenceArguments(e, toolUseId));
}
//@ chunk-kc2qkj8w.js:11864-11974 placement
function withholdsFileReferenceErrors(tool, toolUseID) {
  return (
    tool.mcpInfo?.fileReference === true &&
    withholdsFileReferenceErrorText(
      FILE_REFERENCE_ROWS.find((r) => r.toolName === tool.mcpInfo?.toolName),
      toolUseID,
    )
  );
}
//@ chunk-kc2qkj8w.js:11974-12256 placement
function withheldFileReferenceErrorForLog(withheldFileRef, message, name = "McpToolCallError") {
  return `${name}; its message (${message.length} characters) is not logged because errors from ${withheldFileRef.serviceName}'s ${withheldFileRef.toolName} tool can contain the file being uploaded. The tool result in this session's transcript shows the message, shortened if long.`;
}
//@ chunk-kc2qkj8w.js:12256-12340 placement
/**
 * 保留尺寸条目的最小数（16）。
 */
var BASE64_BLOB_RE = /^[\r\n]*[A-Za-z0-9+/_-][A-Za-z0-9+/_\r\n-]*(?:=[\r\n]*){0,2}$/;
var MAX_TRACKED_SIZE_ENTRIES = 100;
var MIN_SIZE_ENTRIES = 16;
//@ chunk-kc2qkj8w.js:12340-12575 placement = base64URLEncode (1)
function base64URLEncode(e, reference) {
  if (typeof e !== "string") return;
  let buffer = Buffer.from(e, "base64");
  if (computeContentHash(buffer) !== reference.split(":")[1]) return;
  let t = (o) => o.replace(/[\s=]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  return t(e) === t(buffer.toString("base64")) ? buffer.length : undefined;
}
//@ chunk-kc2qkj8w.js:12575-21496 placement
/**
 * 包装 MCP 工具以支持文件引用（桌面 Drive 填充）：在 validateInput/call 前检查服务器是否声明支持文件引用，解析引用、上传文件并在不可用时以 not_available 拒绝。
 */
function wrapFileReferenceTool(e, row, r, t, o) {
  let d = () => import("./chunk-0p9fd9na.js");
  if (row.refusesReferences) {
    let _ = {
      validateInput: e.validateInput,
      call: e.call,
    };
    let detail =
      row.refusesReferences === "conflicting"
        ? "desktop_drive_fill_declaration_conflict"
        : "desktop_drive_fill_not_declared";
    e.validateInput = async (u, p) => {
      let I = matchingReferenceRow(row, u, false);
      if (I === undefined)
        return (
          (await _.validateInput?.(u, p)) ?? {
            result: true,
          }
        );
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logFileReferenceUpload({
        stage: "plan",
        outcome: "refused",
        reason: "not_available",
        detail,
        toolUseId: p.toolUseId,
      });
      let { refusalText } = await d();
      return {
        result: false,
        message: refusalText(I, "not_available", {}),
        errorCode: 2,
        notAnError: true,
      };
    };
    e.call = async (u, p, ...I) => {
      let h = matchingReferenceRow(row, u, p.toolUseId !== undefined && isFileReferenceCall(p.toolUseId));
      if (h === undefined) return _.call(u, p, ...I);
      logFeatureSad("mcp_drive_file_reference", "not_available");
      logFileReferenceUpload({
        stage: "fill",
        outcome: "refused",
        reason: "not_available",
        detail,
        toolUseId: p.toolUseId,
        requestId: I[1]?.requestId,
      });
      let { refusalText } = await d();
      return {
        data: refusalText(h, "not_available", {}),
      };
    };
    return;
  }
  let prompt = e.prompt;
  e.prompt = async (_) => {
    let s = await prompt(_);
    if (!isFileReferenceOffered(row)) return s;
    return s === "" ? FILE_REFERENCE_HINT : `${FILE_REFERENCE_HINT} ${s}`;
  };
  let R = new Map();
  let E = new Set();
  let P;
  let F = new Map();
  let N = {
    validateInput: e.validateInput,
    call: e.call,
    askInputPreparer: e.askInputPreparer,
  };
  let W = (_) => (_ !== undefined && isFileReferenceCall(_) ? r : N);
  e.validateInput = async (_, s) => {
    P = undefined;
    let u = F.size > 0 ? fileReferenceValues(_, row) : [];
    for (let { value: O } of u) {
      if (typeof O !== "string") continue;
      let contentHash = computeContentHash(Buffer.from(O, "base64"));
      let w = F.get(contentHash);
      if (
        w !== undefined &&
        !w.toolUses.has(s.toolUseId ?? "") &&
        base64URLEncode(O, w.reference) !== undefined
      )
        F.delete(contentHash);
    }
    let p = s.toolUseId === undefined ? undefined : R.get(s.toolUseId);
    if (
      s.toolUseId !== undefined &&
      p !== undefined &&
      !(row.approvalSeesContent && filledBytesTotal(_, row, p.references) !== undefined)
    )
      R.delete(s.toolUseId);
    if (!isRowFlagServed(row)) {
      if (isRowFlagOn(row) && hasSha256Args(_, row))
        return {
          result: false,
          message: await refuseUnavailableReference(row, "plan", {
            toolUseId: s.toolUseId,
          }),
          errorCode: 2,
          notAnError: true,
        };
      return (
        (await W(s.toolUseId).validateInput?.(_, s)) ?? {
          result: true,
        }
      );
    }
    let I = (await r.validateInput?.(_, s)) ?? {
      result: true,
    };
    if (!I.result) return I;
    noteFileReferenceCall(s.toolUseId);
    let h = cloneReferenceArgument(_, row);
    if (!hasSha256Args(h, row)) return I;
    let { readReferencedFile } = await d();
    let now = Date.now();
    let referencedFile = await readReferencedFile(h, getToolPermissionContext(s), "check", row, {
      session: s.session,
      signal: s.abortController.signal,
    });
    let checkReadMs = Date.now() - now;
    if ("refusal" in referencedFile) {
      logFileReferenceUpload({
        stage: referencedFile.beforeRead ? "plan" : "check",
        outcome: "refused",
        reason: referencedFile.refusal,
        detail: referencedFile.detail,
        fileRefPathKind: referencedFile.fileRefPathKind,
        checkReadMs,
        toolUseId: s.toolUseId,
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
            toolUseId: s.toolUseId,
          }
        : {
            stage: "plan",
            outcome: "passed",
            detail: "host_fills",
            checkReadMs,
            toolUseId: s.toolUseId,
          },
    );
    let G =
      "files" in referencedFile
        ? referencedFile.files.map(({ entry, reference }) => ({
            entry,
            reference,
          }))
        : referencedFile.references;
    if (s.toolUseId !== undefined && G.length > 0) {
      if (R.size >= MAX_TRACKED_SIZE_ENTRIES) {
        let O = R.keys().next().value;
        if (O !== undefined) {
          R.delete(O);
          if (row.approvalSeesContent) {
            let A = E.values().next().value;
            if (E.size >= MAX_TRACKED_CALLS && A !== undefined) E.delete(A);
            E.add(O);
          }
        }
      }
      E.delete(s.toolUseId);
      R.set(s.toolUseId, {
        references: G,
        checkReadMs,
      });
      if (row.approvalSeesContent && "files" in referencedFile)
        P = {
          fills: referencedFile.files.map(({ entry, reference, buf }) => ({
            entry,
            reference,
            base64: buf.toString("base64"),
          })),
          toolUseId: s.toolUseId,
        };
    }
    return I;
  };
  let x = {
    tool: e,
    row,
    permissionName: getToolNameForPermissionCheck(e),
    checkedByToolUse: R,
    droppedFills: E,
    shownFills: F,
    asked: new WeakSet(),
  };
  let checkPermissions = e.checkPermissions;
  e.checkPermissions = async (_, s) => {
    let u;
    try {
      u = await checkPermissions.call(e, _, s);
    } catch (error) {
      if (!needsUploadApproval(x, _, s)) throw error;
      logPreUploadCheckFailure(error);
      return uploadApprovalAsk(x);
    }
    return u.behavior !== "deny" && needsUploadApproval(x, _, s) ? uploadApprovalAsk(x) : u;
  };
  let permissionCheckFailureDecision = e.permissionCheckFailureDecision;
  e.permissionCheckFailureDecision = (_, s) =>
    needsUploadApproval(
      x,
      typeof _ === "object" && _ !== null
        ? {
            ..._,
          }
        : undefined,
      s,
    )
      ? uploadApprovalAsk(x)
      : permissionCheckFailureDecision?.call(e, _, s);
  e.owesPersonOnlyAsk = (_, s, u) =>
    needsUploadApproval(x, _, {
      ...s,
      toolUseId: u ?? s.toolUseId,
    });
  e.settleUnaskedQuestion = async (_, s, u, p, I) => {
    let h = isHostSessionEntrypoint() || isHostEntrypoint();
    let S = false;
    if (
      _.decisionReason === undefined ||
      !x.asked.has(_.decisionReason) ||
      ((!p || e.requiresUserInteraction?.() || requiresConnectorGrant_2(e) || h) &&
        (_.matchedAskRule !== undefined || e.mcpInfo?.effectiveMaxPermission === "ask")) ||
      (h && I)
    )
      return;
    let { refusalText } = await d();
    R.delete(s);
    if (u.abortController.signal.aborted) return;
    logFeatureSad("mcp_drive_file_reference", "not_available");
    logFileReferenceUpload({
      stage: "fill",
      outcome: "refused",
      reason: "not_available",
      detail: I ? "dont_ask_mode" : "nobody_to_ask",
      toolUseId: s,
    });
    return refusalText(row, "not_available", {});
  };
  if (row.approvalSeesContent) {
    if (e.mcpInfo !== undefined)
      e.mcpInfo = {
        ...e.mcpInfo,
        remoteFileReferenceFill: true,
      };
    let backfillObservableInput = e.backfillObservableInput;
    e.backfillObservableInput = (u) => {
      let p = backfillObservableInput?.call(e, u);
      let I = new Map(
        P === undefined ? [] : fileReferenceValues(u, row).map(({ entry, value: S }) => [entry, S]),
      );
      if (P !== undefined && P.fills.every((fill) => I.get(fill.entry) === fill.reference)) {
        if (isRowFlagOn(row)) {
          u[row.argument] = withFilledReferences(
            u,
            row,
            new Map(P.fills.map((fill) => [fill.entry, fill.base64])),
          )[row.argument];
          for (let fill of P.fills) {
            let S = fill.reference.split(":")[1] ?? "";
            let K = F.get(S);
            F.delete(S);
            F.set(S, {
              reference: fill.reference,
              toolUses: (K?.toolUses ?? new Set()).add(P.toolUseId),
            });
          }
          for (let [h, S] of F) {
            if (F.size <= MIN_SIZE_ENTRIES) break;
            if (!S.toolUses.has(P.toolUseId)) F.delete(h);
          }
        }
        P = undefined;
      }
      return p;
    };
    let toAutoClassifierInput = e.toAutoClassifierInput;
    e.toAutoClassifierInput = (u) => {
      let p = referencesForShownFills(u, row, F);
      return toAutoClassifierInput.call(e, p.size === 0 ? u : withFilledReferences(u, row, p));
    };
  }
  let J = r.call;
  e.call = async (_, s, ...u) => {
    let { toolUseId } = s;
    for (let [M, b] of F) if (b.toolUses.delete(toolUseId ?? "") && b.toolUses.size === 0) F.delete(M);
    if (
      !(
        toolUseId !== undefined &&
        (R.has(toolUseId) || E.has(toolUseId) || isFileReferenceCall(toolUseId))
      ) &&
      !isRowFlagServed(row)
    ) {
      if (isRowFlagOn(row) && hasSha256Args(_, row))
        return {
          data: await refuseUnavailableReference(row, "fill", {
            toolUseId,
            requestId: u[1]?.requestId,
          }),
        };
      return N.call(_, s, ...u);
    }
    noteFileReferenceCall(toolUseId ?? (u[1] === undefined ? undefined : t(u[1])));
    let h = cloneReferenceArgument(_, row);
    let S = toolUseId === undefined ? undefined : R.get(toolUseId);
    let K = hasSha256Args(h, row);
    let k =
      S !== undefined && row.approvalSeesContent && !K ? filledBytesTotal(h, row, S.references) : undefined;
    let V =
      !K &&
      S === undefined &&
      toolUseId !== undefined &&
      E.has(toolUseId) &&
      (!isRowFlagServed(row) ||
        fileReferenceUnavailableReason(row) !== undefined ||
        row.stillHeld?.() === false);
    if (k === undefined && !K && !V) {
      let M = fileReferenceHintLatch();
      let b = false;
      try {
        b = M === true && getFileReferenceOffer().mayLogTypedRow(row);
      } catch {}
      if (!b || !isRowFlagOn(row)) {
        if (M === null && isRowFlagOn(row))
          tryIgnore(() => {
            let fileReferenceOffer = getFileReferenceOffer();
            fileReferenceOffer.note(row, {
              state: "undecided",
              reason: fileReferenceOffer.undecidedReason(),
            });
          });
        return J(h, s, ...u);
      }
      let flattened = fileReferenceValues(h, row).flatMap(({ value: T }) =>
        typeof T === "string" && BASE64_BLOB_RE.test(T) ? [T] : [],
      );
      let found = row.wrongArguments
        .map((wrongArgument) => h[wrongArgument])
        .find((T) => typeof T === "string" && BASE64_BLOB_RE.test(T));
      let Se = flattened.length > 0 ? flattened : typeof found === "string" ? [found] : [];
      let Te = h[row.textArgument];
      let ne;
      if (Se.length > 0) {
        let sizeBytes = 0;
        for (let re of Se) {
          let Ae = 0;
          for (let idx = 0; idx < re.length; idx++) {
            let code = re.charCodeAt(idx);
            Ae += Number(code !== 10 && code !== 13 && code !== 61);
          }
          sizeBytes += Math.floor((Ae * 3) / 4);
        }
        ne = {
          stage: "typed_base64",
          sizeBytes,
          toolUseId,
          requestId: u[1]?.requestId,
        };
      } else if (typeof Te === "string")
        ne = {
          stage: "typed_text",
          sizeBytes: Buffer.byteLength(Te, "utf8"),
          toolUseId,
          requestId: u[1]?.requestId,
        };
      else return J(h, s, ...u);
      let now = Date.now();
      let fe;
      try {
        fe = await J(h, s, ...u);
      } catch (error) {
        let callMs = Date.now() - now;
        tryIgnore(() =>
          logFileReferenceUpload({
            ...ne,
            result: uploadFailureOutcome(error, s.abortController.signal),
            callMs,
          }),
        );
        throw error;
      }
      let callMs = Date.now() - now;
      tryIgnore(() =>
        logFileReferenceUpload({
          ...ne,
          result: uploadSuccessOutcome(fe, s.taskRegistry, toolUseId),
          callMs,
        }),
      );
      return fe;
    }
    let G = {
      toolUseId,
      requestId: u[1]?.requestId,
      checkReadMs: S?.checkReadMs,
    };
    let { readReferencedFile, refusalText } = await d();
    let w = (reason, detail, fileRefPathKind) =>
      logFileReferenceUpload({
        ...G,
        stage: "fill",
        outcome: "refused",
        reason,
        detail,
        fileRefPathKind,
      });
    if (!isRowFlagServed(row)) {
      logFeatureSad("mcp_drive_file_reference", "not_available");
      w("not_available", notAvailableReason(row));
      return {
        data: refusalText(row, "not_available", {}),
      };
    }
    let ve =
      k === undefined && !V
        ? undefined
        : (fileReferenceUnavailableReason(row) ??
          (row.stillHeld?.() === false ? "entry_not_held" : undefined));
    if (ve !== undefined) {
      logFeatureSad("mcp_drive_file_reference", "not_available");
      w("not_available", ve);
      return {
        data: refusalText(row, "not_available", {}),
      };
    }
    let ie = h;
    let fillMs;
    let sizeBytes = k;
    let se = false;
    if (k === undefined) {
      let now = Date.now();
      let referencedFile = await readReferencedFile(
        h,
        getToolPermissionContext(s),
        "send",
        row,
        {
          session: s.session,
          signal: s.abortController.signal,
        },
        S?.references,
      );
      fillMs = Date.now() - now;
      if ("refusal" in referencedFile) {
        w(referencedFile.refusal, referencedFile.detail, referencedFile.fileRefPathKind);
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
        ie = withFilledReferences(
          h,
          row,
          new Map(referencedFile.files.map(({ entry, buf }) => [entry, buf.toString("base64")])),
        );
        sizeBytes = referencedFile.files.reduce((acc, { buf }) => acc + buf.length, 0);
      } else if (!isRowFlagServed(row)) {
        logFeatureSad("mcp_drive_file_reference", "not_available");
        w("not_available", notAvailableReason(row));
        return {
          data: refusalText(row, "not_available", {}),
        };
      } else {
        ie = h;
        se = true;
      }
    }
    if (row.stillHeld?.() === false) {
      logFeatureSad("mcp_drive_file_reference", "not_available");
      w("not_available", "entry_not_held");
      return {
        data: refusalText(row, "not_available", {}),
      };
    }
    let le = s.permissionPhase?.pipeline?.result;
    if (le?.behavior === "ask" && le.decisionReason !== undefined && x.asked.has(le.decisionReason))
      recordFirstReferenceApproved(
        s.session,
        x.permissionName,
        toolUseId !== undefined &&
          (s.toolDecisions.get(toolUseId)?.surface !== undefined ||
            dialogSourceFor(s.session, toolUseId) !== undefined),
        s.storageV5,
      );
    let ee = se
      ? undefined
      : {
          ...G,
          stage: "fill",
          outcome: "filled",
          fillMs,
          sizeBytes,
        };
    let Fe = se
      ? {
          [ANTHROPIC_HOSTFILLSFILEREFERENCE]: "true",
        }
      : o;
    let now = Date.now();
    let de;
    try {
      de = await J(
        ie,
        Fe === undefined
          ? s
          : {
              ...s,
              mcpRequestMeta: {
                ...s.mcpRequestMeta,
                ...Fe,
              },
            },
        ...u,
      );
    } catch (error) {
      let callMs = Date.now() - now;
      tryIgnore(() => {
        if (ee === undefined) return;
        let U = uploadFailureOutcome(error, s.abortController.signal);
        if (U === "aborted" || U === "auth_failed") logFeatureSad("mcp_drive_file_reference", U);
        else logFeatureBad("mcp_drive_file_reference", U);
        logFileReferenceUpload({
          ...ee,
          result: U,
          callMs,
        });
      });
      throw error;
    }
    let callMs = Date.now() - now;
    tryIgnore(() => {
      if (ee === undefined) return;
      let M = uploadSuccessOutcome(de, s.taskRegistry, toolUseId);
      if (M === "auth_failed") logFeatureSad("mcp_drive_file_reference", M);
      else if (M === "uploaded") logFeatureOk("mcp_drive_file_reference");
      logFileReferenceUpload({
        ...ee,
        result: M,
        callMs,
      });
    });
    return de;
  };
  if (N.askInputPreparer !== r.askInputPreparer)
    e.askInputPreparer = async (_, s, u) => {
      if (!isRowFlagServed(row)) return W(u).askInputPreparer?.(_, s, u);
      noteFileReferenceCall(u);
      return r.askInputPreparer?.(_, s, u);
    };
}
//@ chunk-kc2qkj8w.js:21496-21729 placement
function referencesForShownFills(e, n, r) {
  let t = new Map();
  if (r.size === 0) return t;
  for (let { entry, value: d } of fileReferenceValues(e, n)) {
    let y = typeof d === "string" ? r.get(computeContentHash(Buffer.from(d, "base64"))) : undefined;
    if (y !== undefined && base64URLEncode(d, y.reference) !== undefined) t.set(entry, y.reference);
  }
  return t;
}
//@ chunk-kc2qkj8w.js:21729-21972 placement
function filledBytesTotal(e, n, references) {
  let t = new Map(references.map(({ reference }) => [reference.split(":")[1] ?? "", reference]));
  let o;
  for (let { value: d } of fileReferenceValues(e, n)) {
    let y = typeof d === "string" ? t.get(computeContentHash(Buffer.from(d, "base64"))) : undefined;
    let R = y === undefined ? undefined : base64URLEncode(d, y);
    if (R !== undefined) o = (o ?? 0) + R;
  }
  return o;
}
//@ chunk-kc2qkj8w.js:21972-22314 placement
/**
 * 生成上传文件需要用户批准的询问（只能由人批准、不提供"始终允许"）。
 */
function uploadApprovalAsk(e) {
  let n = `Claude wants to upload a file to ${e.row.serviceName}. This upload needs your approval even if you already allowed this tool.`;
  let r = {
    type: "safetyCheck",
    reason: n,
    classifierApprovable: false,
  };
  e.asked.add(r);
  return {
    behavior: "ask",
    message: n,
    decisionReason: r,
    personOnly: true,
    suppressAlwaysAllowRule: true,
    askRequiresUserInteraction: true,
  };
}
//@ chunk-kc2qkj8w.js:22314-22733 placement
/**
 * 判断这次通过文件引用的上传是否需要用户批准：宿主已先询问、无引用、已批准过或工具可自动放行时不需要，检查出错时需要。
 */
function needsUploadApproval(e, n, r) {
  let { row } = e;
  if (row.hostAsksFirstReference) return false;
  try {
    let { toolUseId } = r;
    if (
      !(
        (toolUseId === undefined
          ? referencesForShownFills(n, row, e.shownFills).size > 0
          : e.checkedByToolUse.has(toolUseId) || e.droppedFills.has(toolUseId)) ||
        (isRowFlagServed(row) && hasSha256Args(n, row))
      ) ||
      isFirstReferenceApproved(r.session, e.permissionName)
    )
      return false;
    let toolPermissionContext = getToolPermissionContext(r);
    return !(
      isBypassAllowedInMode(
        e.tool,
        isAutoAllowedInMode(e.tool, toolPermissionContext),
        toolPermissionContext.isBypassPermissionsModeAvailable,
        r.forRemoteExecution,
      ) && e.tool.mcpInfo?.effectiveMaxPermission !== "ask"
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
function tryIgnore(e) {
  try {
    e();
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
function uploadSuccessOutcome(e, taskRegistry, toolUseId) {
  if (e.urlElicitationDeclined !== undefined) return "auth_failed";
  return isBackgroundedCall(taskRegistry, toolUseId) ? "backgrounded" : "uploaded";
}
//@ chunk-kc2qkj8w.js:23346-23567 placement
function isAuthFailureError(e) {
  if (e instanceof McpAuthError) return true;
  if (!(e instanceof Error)) return false;
  if ("code" in e && e.code === "CLAUDEAI_BEARER_REJECTED") return true;
  return (
    e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    /^(McpError|ProtocolError) -32042$/.test(e.telemetryMessage)
  );
}
//@ chunk-kc2qkj8w.js:23567-23674 placement
function isBackgroundedCall(e, n) {
  return n !== undefined && Object.values(e.all()).some((r) => r.type === "mcp_task" && r.toolUseId === n);
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
function hasSha256Args(e, n) {
  return (
    fileReferenceValues(e, n).some((r) => isSha256Value(r.value)) ||
    n.wrongArguments.some((wrongArgument) => isSha256Value(e?.[wrongArgument]))
  );
}
//@ chunk-kc2qkj8w.js:24333-24380 placement
/**
 * 匹配 sha256:<hash>:/path 形式的正则。
 */
var SHA256_PATH_RE = /^sha256:[0-9a-f]{64}:(?:[A-Za-z]:)?\//;
//@ chunk-kc2qkj8w.js:24380-24580 placement
function matchingReferenceRow(e, n, r) {
  return FILE_REFERENCE_ROWS.find(
    (t) =>
      t.toolName === e.toolName &&
      (r
        ? hasSha256Args(n, t)
        : (fileReferenceValues(n, t).some((o) => isSha256Value(o.value)) ||
            t.wrongArguments.some((wrongArgument) => {
              let d = n?.[wrongArgument];
              return typeof d === "string" && SHA256_PATH_RE.test(d);
            })) &&
          isRowFlagOn(t)),
  );
}
//@ chunk-kc2qkj8w.js:24580-24770 placement
function desktopFillMode(e, n) {
  let r = Reflect.get(e, n.desktopMark) === true;
  let t = Reflect.get(e, n.desktopHostFillMark);
  if (r && t !== undefined && t !== false) return "conflicting";
  if (r) return "fill";
  return t === true ? "hostFill" : undefined;
}
//@ chunk-kc2qkj8w.js:24770-25011 placement
async function refuseUnavailableReference(e, stage, r) {
  logFeatureSad("mcp_drive_file_reference", "not_available");
  logFileReferenceUpload({
    stage,
    outcome: "refused",
    reason: "not_available",
    detail: "flag_not_served",
    ...r,
  });
  let { refusalText } = await import("./chunk-0p9fd9na.js");
  return refusalText(e, "not_available", {});
}
//@ chunk-kc2qkj8w.js:25011-25045 placement
/**
 * 判断某行的特性开关是否打开。
 */
function isRowFlagOn(e) {
  return getFeatureValue_CACHED_MAY_BE_STALE(e.flag, false);
}
//@ chunk-kc2qkj8w.js:25045-25108 placement
/**
 * 判断特性开关是否打开且来源为已服务。
 */
function isRowFlagServed(e) {
  let n = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e.flag, false);
  return n.value && isServedFeatureSource(n.source);
}
//@ chunk-kc2qkj8w.js:25108-25172 placement
/**
 * 特性不可用原因（开关未服务 / 填充时关闭）。
 */
function notAvailableReason(e) {
  return isRowFlagOn(e) ? "flag_not_served" : "flag_off_at_fill";
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
};
