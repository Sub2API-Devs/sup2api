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
import { Wos, Mxt, isFileReferenceCall, Eto, jos } from "../../api/fileReferenceCalls.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../analytics/growthbook.js";
import {
  Jkt,
  fileReferenceUnavailableReason,
  claudeAiConnectorCapability,
  pot,
  iJ,
  X_CCR_OWNER_SLACK_USER_ID,
  X_MCP_SERVER_ORIGIN,
  recordFirstReferenceApproved,
  isFirstReferenceApproved,
} from "./fileReferencePolicy.js";
import { isPolicyVerdictAbsent } from "../../policyLimits/policyVerdicts.js";
import { env } from "../../../utils/env.js";
import { gH, requiresConnectorGrant } from "../claudeai.js";
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
import { hSr } from "../../../utils/remoteEnvironment.js";
import { startupCcrEnv } from "../../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { hasUniqueQueryParams } from "../../analytics/metadata.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { getToolNameForPermissionCheck } from "../mcpStringUtils.js";
import { isHostSessionEntrypoint, isHostEntrypoint } from "../../../utils/entrypointKinds.js";
import { Xlr } from "../../../components/permissions/hooks.js";
import { isBypassAllowedInMode, isAutoAllowedInMode } from "../../../utils/permissions/browserToolNames.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, McpAuthError } from "../client.js";
import { logEvent } from "../../analytics/index.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { ye } from "../../../utils/startupMarks.js";

/**
 * 取出工具参数中文件引用字段的值（单值，或数组中每个对象的指定键）。
 */
//@ chunk-kc2qkj8w.js:5767-6006 placement
function fileReferenceValues(e, n) {
  let r = e?.[n.argument],
    { entryKey: entryKey } = n;
  if (entryKey === void 0) return [{ entry: void 0, value: r }];
  if (!Array.isArray(r)) return [];
  let o = [];
  for (let [d, y] of r.entries())
    if (isPlainObject(y)) o.push({ entry: d, value: Object.hasOwn(y, entryKey) ? y[entryKey] : void 0 });
  return o;
}
//@ chunk-kc2qkj8w.js:6006-6277 placement
function withFilledReferences(e, n, r) {
  let { entryKey: entryKey } = n;
  if (entryKey === void 0) {
    let d = r.get(void 0);
    return d === void 0 ? { ...e } : { ...e, [n.argument]: d };
  }
  let o = e[n.argument];
  if (!Array.isArray(o)) return { ...e };
  return {
    ...e,
    [n.argument]: o.map((d, y) => {
      let R = r.get(y);
      return R === void 0 || !isPlainObject(d) ? d : { ...d, [entryKey]: R };
    }),
  };
}
//@ chunk-kc2qkj8w.js:6277-6422 placement
function cloneReferenceArgument(e, n) {
  let r = e[n.argument];
  if (n.entryKey === void 0 || !Array.isArray(r)) return { ...e };
  return { ...e, [n.argument]: r.map((t) => (isPlainObject(t) ? { ...t } : t)) };
}
//@ chunk-kc2qkj8w.js:6422-6490 placement
function mot(e) {
  return typeof e === "string" && e.startsWith("sha256:");
}
/**
 * 文件引用相关的服务器表：一方 Artifacts 上传服务器（路径、服务器 id、策略键、上传路径前缀），以及 Google Drive create_file 的文件引用行配置（连接器地址、参数名、开关、策略、大小上限）。
 */
//@ chunk-kc2qkj8w.js:6490-7055 placement
var FIRST_PARTY_UPLOAD_SERVERS = [
    {
      path: ARTIFACTS_MCP_PATH,
      serverId: ARTIFACTS_SERVER_ID,
      policy: "allow_cobalt_plinth",
      uploadPathPrefix: `${ARTIFACTS_MCP_PATH}/upload/`,
      ccrEntryPath: CCR_ARTIFACTS_MCP_PATH,
    },
  ],
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
  },
  FILE_REFERENCE_ROWS = [GOOGLE_DRIVE_REFERENCE_ROW];
//@ chunk-kc2qkj8w.js:7055-7319 placement
var FILE_REFERENCE_HINT =
  "FILE REFERENCES: to upload a file you can read here, don't type its base64; set base64Content to a file reference, sha256:<64 lowercase hex>:<its absolute path, with / between folders>. The app fills in the file's content once the user approves the call.";
/**
 * 判断是否向模型提供某个文件引用行：有本地覆盖时直接用；否则看特性开关是否由服务端下发且开启、策略是否已加载并允许，记录 offered/latched_off/undecided 状态。
 */
//@ chunk-kc2qkj8w.js:7319-7885 placement
function isFileReferenceOffered(row) {
  let override = Wos();
  if (override !== null) return override && H(row);
  let flag = getFeatureValueWithSource_CACHED_MAY_BE_STALE(row.flag, !1),
    tracker = Jkt();
  if (!flag.value) {
    if (isServedFeatureSource(flag.source))
      (Mxt(!1), tracker.note(row, { state: "latched_off", reason: "flag_off_served" }));
    else tracker.holdUndecidedReason("flag_not_served");
    return !1;
  }
  let blockReason = fileReferenceUnavailableReason(row);
  if (!isServedFeatureSource(flag.source)) return (tracker.holdUndecidedReason("flag_not_served"), !1);
  if (blockReason === "policy_not_loaded" || blockReason === "policy_not_asked")
    return (tracker.holdUndecidedReason(blockReason), !1);
  if (isPolicyVerdictAbsent()) return (tracker.holdUndecidedReason("policy_verdict_absent"), !1);
  let offered = blockReason === void 0;
  return (
    Mxt(offered),
    tracker.note(
      row,
      blockReason === void 0 ? { state: "offered" } : { state: "latched_off", reason: blockReason },
    ),
    offered
  );
}
//@ chunk-kc2qkj8w.js:7885-8112 placement
function fileReferenceHintKeyBit(e) {
  z(() => Jkt().flush());
  let n =
    e.mcpInfo?.fileReference === !0 && (!env.CLAUDE_CODE_REMOTE || e.mcpInfo.remoteFileReferenceFill === !0)
      ? FILE_REFERENCE_ROWS.find((r) => r.toolName === e.mcpInfo?.toolName)
      : void 0;
  return n !== void 0 && isFileReferenceOffered(n) ? "FR1:" : "";
}
/**
 * 找到该 MCP 工具对应的文件引用配置行：SDK 服务器按连接器 id 与填充方式，其他按连接器地址匹配。
 */
//@ chunk-kc2qkj8w.js:8112-8519 placement
function fileReferenceRowFor(e, n) {
  if (!FILE_REFERENCE_ROWS.some((t) => t.toolName === n)) return;
  if (e.config.type === "sdk") {
    let t = claudeAiConnectorCapability(e);
    return t === void 0
      ? void 0
      : FILE_REFERENCE_ROWS.find(
          (o) =>
            o.toolName === n && (desktopFillMode(t, o) === "fill" || desktopFillMode(t, o) === "hostFill"),
        );
  }
  if (gH(e.config) === void 0 || !("url" in e.config) || typeof e.config.url !== "string") return;
  let { url: url } = e.config;
  return FILE_REFERENCE_ROWS.find((t) => {
    let o = `${t.connectorOrigin}${t.connectorPath}`;
    return t.toolName === n && (url === o || url === `${o}/`);
  });
}
//@ chunk-kc2qkj8w.js:8519-9646 placement
function fileReferenceToolForRecords(e, n) {
  if (!FILE_REFERENCE_ROWS.some((r) => r.toolName === n)) return;
  try {
    let r = claudeAiConnectorCapability(e),
      t =
        fileReferenceRowFor(e, n) ??
        (r === void 0
          ? void 0
          : FILE_REFERENCE_ROWS.find((E) => E.toolName === n && desktopFillMode(r, E) === "conflicting"));
    if (t !== void 0 || env.CLAUDE_CODE_REMOTE !== !0) return t;
    let { config: config } = e;
    if (
      config.type !== "http" ||
      config.scope !== "dynamic" ||
      isPluginServerConfig(config) ||
      !("url" in config) ||
      typeof config.url !== "string"
    )
      return;
    let d = new URL(config.url, "https://no-origin.invalid"),
      found = CCR_SESSION_BASE_PATHS.find((E) => d.pathname.startsWith(E));
    if (found === void 0 || !/^[^/]+\/mcp$/.test(d.pathname.slice(found.length))) return;
    let all = d.searchParams.getAll("mcp_url");
    return FILE_REFERENCE_ROWS.find((E) => {
      let P = `${E.connectorOrigin}${E.connectorPath}`;
      return E.toolName === n && all.some((F) => F === P || F === `${P}/`);
    });
  } catch (error) {
    if (env.CLAUDE_CODE_REMOTE !== !0) throw error;
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[file reference] could not check whether an MCP server is a connector whose uploads may carry a file's contents (${sanitizedFeatureErrorCodeForTelemetry(error instanceof Error ? error.name : typeof error)}), so it is treated as one: the text of errors from its upload tool is left out of logs and traces.`,
          "[file reference] could not check whether an MCP server is a connector whose uploads may carry a file's contents; it is treated as one",
        ),
      ),
      FILE_REFERENCE_ROWS.find((t) => t.toolName === n)
    );
  }
}
//@ chunk-kc2qkj8w.js:9646-11342 placement
function fileReferenceToolToFill(e, n) {
  if (!FILE_REFERENCE_ROWS.some((r) => r.toolName === n)) return;
  if (!env.CLAUDE_CODE_REMOTE) {
    let r = fileReferenceRowFor(e, n),
      t = claudeAiConnectorCapability(e);
    if (r !== void 0) {
      if (t === void 0) return r;
      let y = desktopFillMode(t, r) === "hostFill" ? { ...r, hostFills: !0 } : r;
      return Object.hasOwn(t, r.desktopAsksFirstMark) && Reflect.get(t, r.desktopAsksFirstMark) === !0
        ? { ...y, hostAsksFirstReference: !0 }
        : y;
    }
    let found = FILE_REFERENCE_ROWS.find((y) => y.toolName === n);
    if (found === void 0 || t === void 0) return noteNotWrapped(e, n, "not_claudeai_connector");
    let d = desktopFillMode(t, found) === "conflicting" ? "conflicting" : "undeclared";
    if (d === "conflicting") noteNotWrapped(e, n, "desktop_conflicting");
    return { ...found, refusesReferences: d };
  }
  try {
    let { config: config } = e,
      t = isCcsTenant();
    if (!(hSr() || t)) {
      let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
      return noteNotWrapped(
        e,
        n,
        CLAUDE_CODE_ENVIRONMENT_KIND === "byoc"
          ? "environment_byoc"
          : CLAUDE_CODE_ENVIRONMENT_KIND === "bridge"
            ? "environment_bridge"
            : "environment_other",
      );
    }
    if (config.type !== "http" || config.scope !== "dynamic" || isPluginServerConfig(config))
      return noteNotWrapped(e, n, "entry_shape");
    if (startupCcrEnv.bridgeCarrier !== void 0) return noteNotWrapped(e, n, "bridge_carrier");
    if (!isCcrSessionScopedMcpUrl(config.url)) return noteNotWrapped(e, n, "not_own_route");
    if (!hasUniqueQueryParams(config.url, CCR_MCP_QUERY_PARAMS))
      return noteNotWrapped(e, n, "route_query_ambiguous");
    let peek = pot.peek(getRootSession()),
      d = peek?.read?.(e.name, config.url);
    if (d === void 0) return noteNotWrapped(e, n, "no_startup_headers");
    if (iJ(d, X_CCR_OWNER_SLACK_USER_ID).length > 0) return noteNotWrapped(e, n, "owner_header");
    let y = iJ(d, X_MCP_SERVER_ORIGIN);
    if (y.length !== 1) return noteNotWrapped(e, n, y.length === 0 ? "origin_missing" : "origin_multiple");
    if (y[0] !== "directory" && y[0] !== "custom") return noteNotWrapped(e, n, "origin_other");
    let R = ccrSessionIdFromMcpUrl(config.url)?.upstreamUrl,
      found = FILE_REFERENCE_ROWS.find((N) => {
        let W = `${N.connectorOrigin}${N.connectorPath}`;
        return N.toolName === n && (R === W || R === `${W}/`);
      });
    if (found === void 0)
      return noteNotWrapped(e, n, R === void 0 ? "upstream_unread" : "upstream_not_drive");
    if (!t && peek?.isStartupEntry?.(e.name, config) !== !0) return noteNotWrapped(e, n, "not_startup_entry");
    let { name: P } = e,
      { url: url } = config;
    return {
      ...found,
      approvalSeesContent: !0,
      stillHeld: () => pot.peek(getRootSession())?.read?.(P, url) !== void 0,
    };
  } catch {
    return;
  }
}
//@ chunk-kc2qkj8w.js:11342-11595 placement
function noteNotWrapped(e, n, r) {
  z(() => {
    let { config: config } = e,
      o = "url" in config ? config.url : void 0,
      d =
        fileReferenceToolForRecords(e, n) ??
        FILE_REFERENCE_ROWS.find((y) => {
          let R = `${y.connectorOrigin}${y.connectorPath}`;
          return y.toolName === n && (o === R || o === `${R}/`);
        });
    if (d !== void 0) Jkt().note(d, { state: "not_wrapped", reason: r });
  });
  return;
}
//@ chunk-kc2qkj8w.js:11595-11676 placement
var ANTHROPIC_FILLEDFROMFILEREFERENCE = "anthropic/filledFromFileReference",
  ANTHROPIC_HOSTFILLSFILEREFERENCE = "anthropic/hostFillsFileReference";
//@ chunk-kc2qkj8w.js:11676-11742 placement
function filledCallRequestMeta(e) {
  return e.config.type === "sdk" ? { [ANTHROPIC_FILLEDFROMFILEREFERENCE]: "true" } : void 0;
}
//@ chunk-kc2qkj8w.js:11742-11794 placement
function withholdsFileReferenceArguments(e, n) {
  return e !== void 0 && (isFileReferenceCall(n) || H(e));
}
//@ chunk-kc2qkj8w.js:11794-11864 placement
function withholdsFileReferenceErrorText(e, n) {
  return e !== void 0 && (env.CLAUDE_CODE_REMOTE || withholdsFileReferenceArguments(e, n));
}
//@ chunk-kc2qkj8w.js:11864-11974 placement
function withholdsFileReferenceErrors(e, n) {
  return (
    e.mcpInfo?.fileReference === !0 &&
    withholdsFileReferenceErrorText(
      FILE_REFERENCE_ROWS.find((r) => r.toolName === e.mcpInfo?.toolName),
      n,
    )
  );
}
//@ chunk-kc2qkj8w.js:11974-12256 placement
function withheldFileReferenceErrorForLog(e, n, r = "McpToolCallError") {
  return `${r}; its message (${n.length} characters) is not logged because errors from ${e.serviceName}'s ${e.toolName} tool can contain the file being uploaded. The tool result in this session's transcript shows the message, shortened if long.`;
}
//@ chunk-kc2qkj8w.js:12256-12340 placement
var xe = /^[\r\n]*[A-Za-z0-9+/_-][A-Za-z0-9+/_\r\n-]*(?:=[\r\n]*){0,2}$/,
  dn = 100,
  fn = 16;
//@ chunk-kc2qkj8w.js:12340-12575 placement = base64URLEncode (1)
function base64URLEncode(e, n) {
  if (typeof e !== "string") return;
  let buffer = Buffer.from(e, "base64");
  if (computeContentHash(buffer) !== n.split(":")[1]) return;
  let t = (o) => o.replace(/[\s=]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  return t(e) === t(buffer.toString("base64")) ? buffer.length : void 0;
}
/**
 * 包装 MCP 工具以支持文件引用（桌面 Drive 填充）：在 validateInput/call 前检查服务器是否声明支持文件引用，解析引用、上传文件并在不可用时以 not_available 拒绝。
 */
//@ chunk-kc2qkj8w.js:12575-21496 placement
function wrapFileReferenceTool(e, n, r, t, o) {
  let d = () => import("./chunk-0p9fd9na.js");
  if (n.refusesReferences) {
    let _ = { validateInput: e.validateInput, call: e.call },
      s =
        n.refusesReferences === "conflicting"
          ? "desktop_drive_fill_declaration_conflict"
          : "desktop_drive_fill_not_declared";
    ((e.validateInput = async (u, p) => {
      let I = matchingReferenceRow(n, u, !1);
      if (I === void 0) return (await _.validateInput?.(u, p)) ?? { result: !0 };
      (logFeatureSad("mcp_drive_file_reference", "not_available"),
        logFileReferenceUpload({
          stage: "plan",
          outcome: "refused",
          reason: "not_available",
          detail: s,
          toolUseId: p.toolUseId,
        }));
      let { refusalText: refusalText } = await d();
      return { result: !1, message: refusalText(I, "not_available", {}), errorCode: 2, notAnError: !0 };
    }),
      (e.call = async (u, p, ...I) => {
        let h = matchingReferenceRow(n, u, p.toolUseId !== void 0 && isFileReferenceCall(p.toolUseId));
        if (h === void 0) return _.call(u, p, ...I);
        (logFeatureSad("mcp_drive_file_reference", "not_available"),
          logFileReferenceUpload({
            stage: "fill",
            outcome: "refused",
            reason: "not_available",
            detail: s,
            toolUseId: p.toolUseId,
            requestId: I[1]?.requestId,
          }));
        let { refusalText: refusalText } = await d();
        return { data: refusalText(h, "not_available", {}) };
      }));
    return;
  }
  let prompt = e.prompt;
  e.prompt = async (_) => {
    let s = await prompt(_);
    if (!isFileReferenceOffered(n)) return s;
    return s === "" ? FILE_REFERENCE_HINT : `${FILE_REFERENCE_HINT} ${s}`;
  };
  let R = new Map(),
    E = new Set(),
    P,
    F = new Map(),
    N = { validateInput: e.validateInput, call: e.call, askInputPreparer: e.askInputPreparer },
    W = (_) => (_ !== void 0 && isFileReferenceCall(_) ? r : N);
  e.validateInput = async (_, s) => {
    P = void 0;
    let u = F.size > 0 ? fileReferenceValues(_, n) : [];
    for (let { value: O } of u) {
      if (typeof O !== "string") continue;
      let A = computeContentHash(Buffer.from(O, "base64")),
        w = F.get(A);
      if (w !== void 0 && !w.toolUses.has(s.toolUseId ?? "") && base64URLEncode(O, w.reference) !== void 0)
        F.delete(A);
    }
    let p = s.toolUseId === void 0 ? void 0 : R.get(s.toolUseId);
    if (
      s.toolUseId !== void 0 &&
      p !== void 0 &&
      !(n.approvalSeesContent && filledBytesTotal(_, n, p.references) !== void 0)
    )
      R.delete(s.toolUseId);
    if (!j(n)) {
      if (H(n) && Y(_, n))
        return {
          result: !1,
          message: await refuseUnavailableReference(n, "plan", { toolUseId: s.toolUseId }),
          errorCode: 2,
          notAnError: !0,
        };
      return (await W(s.toolUseId).validateInput?.(_, s)) ?? { result: !0 };
    }
    let I = (await r.validateInput?.(_, s)) ?? { result: !0 };
    if (!I.result) return I;
    Eto(s.toolUseId);
    let h = cloneReferenceArgument(_, n);
    if (!Y(h, n)) return I;
    let { readReferencedFile: readReferencedFile } = await d(),
      now = Date.now(),
      k = await readReferencedFile(h, getToolPermissionContext(s), "check", n, {
        session: s.session,
        signal: s.abortController.signal,
      }),
      V = Date.now() - now;
    if ("refusal" in k)
      return (
        logFileReferenceUpload({
          stage: k.beforeRead ? "plan" : "check",
          outcome: "refused",
          reason: k.refusal,
          detail: k.detail,
          fileRefPathKind: k.fileRefPathKind,
          checkReadMs: V,
          toolUseId: s.toolUseId,
        }),
        { result: !1, message: k.message, errorCode: 2, ...(k.notAnError && { notAnError: k.notAnError }) }
      );
    logFileReferenceUpload(
      "files" in k
        ? {
            stage: "check",
            outcome: "passed",
            sizeBytes: k.files.reduce((O, A) => O + A.buf.length, 0),
            checkReadMs: V,
            toolUseId: s.toolUseId,
          }
        : { stage: "plan", outcome: "passed", detail: "host_fills", checkReadMs: V, toolUseId: s.toolUseId },
    );
    let G =
      "files" in k
        ? k.files.map(({ entry: entry, reference: reference }) => ({ entry: entry, reference: reference }))
        : k.references;
    if (s.toolUseId !== void 0 && G.length > 0) {
      if (R.size >= dn) {
        let O = R.keys().next().value;
        if (O !== void 0) {
          if ((R.delete(O), n.approvalSeesContent)) {
            let A = E.values().next().value;
            if (E.size >= jos && A !== void 0) E.delete(A);
            E.add(O);
          }
        }
      }
      if (
        (E.delete(s.toolUseId),
        R.set(s.toolUseId, { references: G, checkReadMs: V }),
        n.approvalSeesContent && "files" in k)
      )
        P = {
          fills: k.files.map(({ entry: entry, reference: reference, buf: buf }) => ({
            entry: entry,
            reference: reference,
            base64: buf.toString("base64"),
          })),
          toolUseId: s.toolUseId,
        };
    }
    return I;
  };
  let x = {
      tool: e,
      row: n,
      permissionName: getToolNameForPermissionCheck(e),
      checkedByToolUse: R,
      droppedFills: E,
      shownFills: F,
      asked: new WeakSet(),
    },
    checkPermissions = e.checkPermissions;
  e.checkPermissions = async (_, s) => {
    let u;
    try {
      u = await checkPermissions.call(e, _, s);
    } catch (error) {
      if (!needsUploadApproval(x, _, s)) throw error;
      return (logPreUploadCheckFailure(error), uploadApprovalAsk(x));
    }
    return u.behavior !== "deny" && needsUploadApproval(x, _, s) ? uploadApprovalAsk(x) : u;
  };
  let permissionCheckFailureDecision = e.permissionCheckFailureDecision;
  if (
    ((e.permissionCheckFailureDecision = (_, s) =>
      needsUploadApproval(x, typeof _ === "object" && _ !== null ? { ..._ } : void 0, s)
        ? uploadApprovalAsk(x)
        : permissionCheckFailureDecision?.call(e, _, s)),
    (e.owesPersonOnlyAsk = (_, s, u) => needsUploadApproval(x, _, { ...s, toolUseId: u ?? s.toolUseId })),
    (e.settleUnaskedQuestion = async (_, s, u, p, I) => {
      let h = isHostSessionEntrypoint() || isHostEntrypoint(),
        S = !1;
      if (
        _.decisionReason === void 0 ||
        !x.asked.has(_.decisionReason) ||
        ((!p || e.requiresUserInteraction?.() || requiresConnectorGrant(e) || h) &&
          (_.matchedAskRule !== void 0 || e.mcpInfo?.effectiveMaxPermission === "ask")) ||
        (h && I)
      )
        return;
      let { refusalText: refusalText } = await d();
      if ((R.delete(s), u.abortController.signal.aborted)) return;
      return (
        logFeatureSad("mcp_drive_file_reference", "not_available"),
        logFileReferenceUpload({
          stage: "fill",
          outcome: "refused",
          reason: "not_available",
          detail: I ? "dont_ask_mode" : "nobody_to_ask",
          toolUseId: s,
        }),
        refusalText(n, "not_available", {})
      );
    }),
    n.approvalSeesContent)
  ) {
    if (e.mcpInfo !== void 0) e.mcpInfo = { ...e.mcpInfo, remoteFileReferenceFill: !0 };
    let backfillObservableInput = e.backfillObservableInput;
    e.backfillObservableInput = (u) => {
      let p = backfillObservableInput?.call(e, u),
        I = new Map(
          P === void 0 ? [] : fileReferenceValues(u, n).map(({ entry: entry, value: S }) => [entry, S]),
        );
      if (P !== void 0 && P.fills.every((fill) => I.get(fill.entry) === fill.reference)) {
        if (H(n)) {
          u[n.argument] = withFilledReferences(
            u,
            n,
            new Map(P.fills.map((fill) => [fill.entry, fill.base64])),
          )[n.argument];
          for (let fill of P.fills) {
            let S = fill.reference.split(":")[1] ?? "",
              K = F.get(S);
            (F.delete(S),
              F.set(S, { reference: fill.reference, toolUses: (K?.toolUses ?? new Set()).add(P.toolUseId) }));
          }
          for (let [h, S] of F) {
            if (F.size <= fn) break;
            if (!S.toolUses.has(P.toolUseId)) F.delete(h);
          }
        }
        P = void 0;
      }
      return p;
    };
    let toAutoClassifierInput = e.toAutoClassifierInput;
    e.toAutoClassifierInput = (u) => {
      let p = referencesForShownFills(u, n, F);
      return toAutoClassifierInput.call(e, p.size === 0 ? u : withFilledReferences(u, n, p));
    };
  }
  let J = r.call;
  if (
    ((e.call = async (_, s, ...u) => {
      let { toolUseId: toolUseId } = s;
      for (let [M, b] of F) if (b.toolUses.delete(toolUseId ?? "") && b.toolUses.size === 0) F.delete(M);
      if (
        !(toolUseId !== void 0 && (R.has(toolUseId) || E.has(toolUseId) || isFileReferenceCall(toolUseId))) &&
        !j(n)
      ) {
        if (H(n) && Y(_, n))
          return {
            data: await refuseUnavailableReference(n, "fill", {
              toolUseId: toolUseId,
              requestId: u[1]?.requestId,
            }),
          };
        return N.call(_, s, ...u);
      }
      Eto(toolUseId ?? (u[1] === void 0 ? void 0 : t(u[1])));
      let h = cloneReferenceArgument(_, n),
        S = toolUseId === void 0 ? void 0 : R.get(toolUseId),
        K = Y(h, n),
        k = S !== void 0 && n.approvalSeesContent && !K ? filledBytesTotal(h, n, S.references) : void 0,
        V =
          !K &&
          S === void 0 &&
          toolUseId !== void 0 &&
          E.has(toolUseId) &&
          (!j(n) || fileReferenceUnavailableReason(n) !== void 0 || n.stillHeld?.() === !1);
      if (k === void 0 && !K && !V) {
        let M = Wos(),
          b = !1;
        try {
          b = M === !0 && Jkt().mayLogTypedRow(n);
        } catch {}
        if (!b || !H(n)) {
          if (M === null && H(n))
            z(() => {
              let T = Jkt();
              T.note(n, { state: "undecided", reason: T.undecidedReason() });
            });
          return J(h, s, ...u);
        }
        let flattened = fileReferenceValues(h, n).flatMap(({ value: T }) =>
            typeof T === "string" && xe.test(T) ? [T] : [],
          ),
          found = n.wrongArguments
            .map((wrongArgument) => h[wrongArgument])
            .find((T) => typeof T === "string" && xe.test(T)),
          Se = flattened.length > 0 ? flattened : typeof found === "string" ? [found] : [],
          Te = h[n.textArgument],
          ne;
        if (Se.length > 0) {
          let T = 0;
          for (let re of Se) {
            let Ae = 0;
            for (let ce = 0; ce < re.length; ce++) {
              let code = re.charCodeAt(ce);
              Ae += Number(code !== 10 && code !== 13 && code !== 61);
            }
            T += Math.floor((Ae * 3) / 4);
          }
          ne = { stage: "typed_base64", sizeBytes: T, toolUseId: toolUseId, requestId: u[1]?.requestId };
        } else if (typeof Te === "string")
          ne = {
            stage: "typed_text",
            sizeBytes: Buffer.byteLength(Te, "utf8"),
            toolUseId: toolUseId,
            requestId: u[1]?.requestId,
          };
        else return J(h, s, ...u);
        let now = Date.now(),
          fe;
        try {
          fe = await J(h, s, ...u);
        } catch (error) {
          let re = Date.now() - now;
          throw (
            z(() =>
              logFileReferenceUpload({
                ...ne,
                result: uploadFailureOutcome(error, s.abortController.signal),
                callMs: re,
              }),
            ),
            error
          );
        }
        let Ze = Date.now() - now;
        return (
          z(() =>
            logFileReferenceUpload({
              ...ne,
              result: uploadSuccessOutcome(fe, s.taskRegistry, toolUseId),
              callMs: Ze,
            }),
          ),
          fe
        );
      }
      let G = { toolUseId: toolUseId, requestId: u[1]?.requestId, checkReadMs: S?.checkReadMs },
        { readReferencedFile: readReferencedFile, refusalText: refusalText } = await d(),
        w = (M, b, U) =>
          logFileReferenceUpload({
            ...G,
            stage: "fill",
            outcome: "refused",
            reason: M,
            detail: b,
            fileRefPathKind: U,
          });
      if (!j(n))
        return (
          logFeatureSad("mcp_drive_file_reference", "not_available"),
          w("not_available", je(n)),
          { data: refusalText(n, "not_available", {}) }
        );
      let ve =
        k === void 0 && !V
          ? void 0
          : (fileReferenceUnavailableReason(n) ?? (n.stillHeld?.() === !1 ? "entry_not_held" : void 0));
      if (ve !== void 0)
        return (
          logFeatureSad("mcp_drive_file_reference", "not_available"),
          w("not_available", ve),
          { data: refusalText(n, "not_available", {}) }
        );
      let ie = h,
        ke,
        be = k,
        se = !1;
      if (k === void 0) {
        let now = Date.now(),
          b = await readReferencedFile(
            h,
            getToolPermissionContext(s),
            "send",
            n,
            { session: s.session, signal: s.abortController.signal },
            S?.references,
          );
        if (((ke = Date.now() - now), "refusal" in b)) {
          if ((w(b.refusal, b.detail, b.fileRefPathKind), b.notAnError)) return { data: b.message };
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            b.message,
            "file reference refused",
          );
        }
        if ("files" in b)
          ((ie = withFilledReferences(
            h,
            n,
            new Map(b.files.map(({ entry: entry, buf: buf }) => [entry, buf.toString("base64")])),
          )),
            (be = b.files.reduce((U, { buf: buf }) => U + buf.length, 0)));
        else if (!j(n))
          return (
            logFeatureSad("mcp_drive_file_reference", "not_available"),
            w("not_available", je(n)),
            { data: refusalText(n, "not_available", {}) }
          );
        else ((ie = h), (se = !0));
      }
      if (n.stillHeld?.() === !1)
        return (
          logFeatureSad("mcp_drive_file_reference", "not_available"),
          w("not_available", "entry_not_held"),
          { data: refusalText(n, "not_available", {}) }
        );
      let le = s.permissionPhase?.pipeline?.result;
      if (le?.behavior === "ask" && le.decisionReason !== void 0 && x.asked.has(le.decisionReason))
        recordFirstReferenceApproved(
          s.session,
          x.permissionName,
          toolUseId !== void 0 &&
            (s.toolDecisions.get(toolUseId)?.surface !== void 0 || Xlr(s.session, toolUseId) !== void 0),
          s.storageV5,
        );
      let ee = se ? void 0 : { ...G, stage: "fill", outcome: "filled", fillMs: ke, sizeBytes: be },
        Fe = se ? { [ANTHROPIC_HOSTFILLSFILEREFERENCE]: "true" } : o,
        now = Date.now(),
        de;
      try {
        de = await J(ie, Fe === void 0 ? s : { ...s, mcpRequestMeta: { ...s.mcpRequestMeta, ...Fe } }, ...u);
      } catch (error) {
        let b = Date.now() - now;
        throw (
          z(() => {
            if (ee === void 0) return;
            let U = uploadFailureOutcome(error, s.abortController.signal);
            if (U === "aborted" || U === "auth_failed") logFeatureSad("mcp_drive_file_reference", U);
            else logFeatureBad("mcp_drive_file_reference", U);
            logFileReferenceUpload({ ...ee, result: U, callMs: b });
          }),
          error
        );
      }
      let Qe = Date.now() - now;
      return (
        z(() => {
          if (ee === void 0) return;
          let M = uploadSuccessOutcome(de, s.taskRegistry, toolUseId);
          if (M === "auth_failed") logFeatureSad("mcp_drive_file_reference", M);
          else if (M === "uploaded") logFeatureOk("mcp_drive_file_reference");
          logFileReferenceUpload({ ...ee, result: M, callMs: Qe });
        }),
        de
      );
    }),
    N.askInputPreparer !== r.askInputPreparer)
  )
    e.askInputPreparer = async (_, s, u) => {
      if (!j(n)) return W(u).askInputPreparer?.(_, s, u);
      return (Eto(u), r.askInputPreparer?.(_, s, u));
    };
}
//@ chunk-kc2qkj8w.js:21496-21729 placement
function referencesForShownFills(e, n, r) {
  let t = new Map();
  if (r.size === 0) return t;
  for (let { entry: entry, value: d } of fileReferenceValues(e, n)) {
    let y = typeof d === "string" ? r.get(computeContentHash(Buffer.from(d, "base64"))) : void 0;
    if (y !== void 0 && base64URLEncode(d, y.reference) !== void 0) t.set(entry, y.reference);
  }
  return t;
}
//@ chunk-kc2qkj8w.js:21729-21972 placement
function filledBytesTotal(e, n, r) {
  let t = new Map(r.map(({ reference: reference }) => [reference.split(":")[1] ?? "", reference])),
    o;
  for (let { value: d } of fileReferenceValues(e, n)) {
    let y = typeof d === "string" ? t.get(computeContentHash(Buffer.from(d, "base64"))) : void 0,
      R = y === void 0 ? void 0 : base64URLEncode(d, y);
    if (R !== void 0) o = (o ?? 0) + R;
  }
  return o;
}
/**
 * 生成上传文件需要用户批准的询问（只能由人批准、不提供"始终允许"）。
 */
//@ chunk-kc2qkj8w.js:21972-22314 placement
function uploadApprovalAsk(e) {
  let n = `Claude wants to upload a file to ${e.row.serviceName}. This upload needs your approval even if you already allowed this tool.`,
    r = { type: "safetyCheck", reason: n, classifierApprovable: !1 };
  return (
    e.asked.add(r),
    {
      behavior: "ask",
      message: n,
      decisionReason: r,
      personOnly: !0,
      suppressAlwaysAllowRule: !0,
      askRequiresUserInteraction: !0,
    }
  );
}
/**
 * 判断这次通过文件引用的上传是否需要用户批准：宿主已先询问、无引用、已批准过或工具可自动放行时不需要，检查出错时需要。
 */
//@ chunk-kc2qkj8w.js:22314-22733 placement
function needsUploadApproval(e, n, r) {
  let { row: row } = e;
  if (row.hostAsksFirstReference) return !1;
  try {
    let { toolUseId: toolUseId } = r;
    if (
      !(
        (toolUseId === void 0
          ? referencesForShownFills(n, row, e.shownFills).size > 0
          : e.checkedByToolUse.has(toolUseId) || e.droppedFills.has(toolUseId)) ||
        (j(row) && Y(n, row))
      ) ||
      isFirstReferenceApproved(r.session, e.permissionName)
    )
      return !1;
    let y = getToolPermissionContext(r);
    return !(
      isBypassAllowedInMode(
        e.tool,
        isAutoAllowedInMode(e.tool, y),
        y.isBypassPermissionsModeAvailable,
        r.forRemoteExecution,
      ) && e.tool.mcpInfo?.effectiveMaxPermission !== "ask"
    );
  } catch (error) {
    return (logPreUploadCheckFailure(error), !0);
  }
}
/**
 * 记录上传前检查失败的错误，并说明该调用按需要人工批准处理。
 */
//@ chunk-kc2qkj8w.js:22733-23072 placement
function logPreUploadCheckFailure(e) {
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[file reference] a check made before an upload by file reference failed (${sanitizedFeatureErrorCodeForTelemetry(e instanceof Error ? e.name : typeof e)}), so the call is treated as one that needs a person's approval.`,
      "[file reference] a check made before an upload by file reference failed; the call is treated as one that needs a person's approval",
    ),
  );
}
//@ chunk-kc2qkj8w.js:23072-23102 placement
function z(e) {
  try {
    e();
  } catch {}
}
//@ chunk-kc2qkj8w.js:23102-23229 placement
function uploadFailureOutcome(e, n) {
  if (n.aborted) return "aborted";
  if (isAuthFailureError(e)) return "auth_failed";
  return e instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    ? "error_result"
    : "call_failed";
}
//@ chunk-kc2qkj8w.js:23229-23346 placement
function uploadSuccessOutcome(e, n, r) {
  if (e.urlElicitationDeclined !== void 0) return "auth_failed";
  return isBackgroundedCall(n, r) ? "backgrounded" : "uploaded";
}
//@ chunk-kc2qkj8w.js:23346-23567 placement
function isAuthFailureError(e) {
  if (e instanceof McpAuthError) return !0;
  if (!(e instanceof Error)) return !1;
  if ("code" in e && e.code === "CLAUDEAI_BEARER_REJECTED") return !0;
  return (
    e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    /^(McpError|ProtocolError) -32042$/.test(e.telemetryMessage)
  );
}
//@ chunk-kc2qkj8w.js:23567-23674 placement
function isBackgroundedCall(e, n) {
  return n !== void 0 && Object.values(e.all()).some((r) => r.type === "mcp_task" && r.toolUseId === n);
}
/**
 * 上报文件引用上传事件：阶段、结果、原因、路径类型、读取/填充/调用耗时与大小。
 */
//@ chunk-kc2qkj8w.js:23674-24236 placement
function logFileReferenceUpload(event) {
  logEvent("tengu_mcp_drive_file_reference_upload", {
    stage: fromEnum(event.stage),
    ...(event.outcome !== void 0 && { outcome: fromEnum(event.outcome) }),
    ...(event.reason !== void 0 && { reason: sanitizedFeatureErrorCodeForTelemetry(event.reason) }),
    ...(event.detail !== void 0 && { detail: sanitizedFeatureErrorCodeForTelemetry(event.detail) }),
    ...(event.fileRefPathKind !== void 0 && {
      fileRefPathKind: sanitizedFeatureErrorCodeForTelemetry(event.fileRefPathKind),
    }),
    ...(event.result !== void 0 && { result: fromEnum(event.result) }),
    ...(event.checkReadMs !== void 0 && { checkReadMs: event.checkReadMs }),
    ...(event.fillMs !== void 0 && { fill_ms: event.fillMs }),
    ...(event.callMs !== void 0 && { callMs: event.callMs }),
    ...(event.sizeBytes !== void 0 && { size_bytes: event.sizeBytes }),
    toolUseID: ye(event.toolUseId),
    requestId: ye(event.requestId),
  });
}
//@ chunk-kc2qkj8w.js:24236-24333 placement
function Y(e, n) {
  return (
    fileReferenceValues(e, n).some((r) => mot(r.value)) ||
    n.wrongArguments.some((wrongArgument) => mot(e?.[wrongArgument]))
  );
}
//@ chunk-kc2qkj8w.js:24333-24380 placement
var pn = /^sha256:[0-9a-f]{64}:(?:[A-Za-z]:)?\//;
//@ chunk-kc2qkj8w.js:24380-24580 placement
function matchingReferenceRow(e, n, r) {
  return FILE_REFERENCE_ROWS.find(
    (t) =>
      t.toolName === e.toolName &&
      (r
        ? Y(n, t)
        : (fileReferenceValues(n, t).some((o) => mot(o.value)) ||
            t.wrongArguments.some((wrongArgument) => {
              let d = n?.[wrongArgument];
              return typeof d === "string" && pn.test(d);
            })) &&
          H(t)),
  );
}
//@ chunk-kc2qkj8w.js:24580-24770 placement
function desktopFillMode(e, n) {
  let r = Reflect.get(e, n.desktopMark) === !0,
    t = Reflect.get(e, n.desktopHostFillMark);
  if (r && t !== void 0 && t !== !1) return "conflicting";
  if (r) return "fill";
  return t === !0 ? "hostFill" : void 0;
}
//@ chunk-kc2qkj8w.js:24770-25011 placement
async function refuseUnavailableReference(e, n, r) {
  (logFeatureSad("mcp_drive_file_reference", "not_available"),
    logFileReferenceUpload({
      stage: n,
      outcome: "refused",
      reason: "not_available",
      detail: "flag_not_served",
      ...r,
    }));
  let { refusalText: refusalText } = await import("./chunk-0p9fd9na.js");
  return refusalText(e, "not_available", {});
}
//@ chunk-kc2qkj8w.js:25011-25045 placement
function H(e) {
  return getFeatureValue_CACHED_MAY_BE_STALE(e.flag, !1);
}
//@ chunk-kc2qkj8w.js:25045-25108 placement
function j(e) {
  let n = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e.flag, !1);
  return n.value && isServedFeatureSource(n.source);
}
//@ chunk-kc2qkj8w.js:25108-25172 placement
function je(e) {
  return H(e) ? "flag_not_served" : "flag_off_at_fill";
}
//@ chunk-kc2qkj8w.js:25172-25203 placement
var _n = 1048576,
  gn = 40,
  yn = 300000;
//@ chunk-kc2qkj8w.js:25203-25335 placement
function requestTimeoutForBody(e, n) {
  if (typeof n !== "string" || n.length <= _n || !FILE_REFERENCE_ROWS.some(H)) return e;
  return Math.max(e, Math.min(yn, Math.ceil(n.length / gn)));
}

export {
  mot,
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
