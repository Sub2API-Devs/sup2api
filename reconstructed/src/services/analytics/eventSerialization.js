/**
 * services/analytics/eventSerialization.ts
 *
 * 2.1.316 新增：用户 id 格式与 IDE 名称白名单等校验器；元数据字段校验器与键映射表（会话 id 等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (21)
 * attribution: placement 21
 */
import { randomBytes, randomInt } from "crypto";
import { promisify } from "util";
import { gzip, gzipSync } from "zlib";
import {
  isUuid,
  regexValidator,
  isDateValidator,
  oneOfValidator,
  sanitizeFields,
  SAMPLE_RATE_FIELDS,
  EVENT_FIELD_VALIDATORS,
  sanitizeEventMetadata,
  anyOfValidators,
  isBoolean,
  TOP_LEVEL_FIELD_VALIDATORS,
  ENV_FIELD_VALIDATORS,
  AUTH_FIELD_VALIDATORS,
  SEMVER_PLAIN_RE,
  SEMVER_WITH_PRERELEASE_RE,
  PLATFORM_NAMES,
  ARCH_NAMES,
  ENTRYPOINT_VALIDATOR,
  isKnownModelOrNonconforming,
  HIPAA_REDACTED,
} from "./metadataSanitizers.js";
import { ClaudeCodeInternalEvent } from "../../types/generated/events_mono/claude_code/v1/claude_code_internal_event.js";
import { isSafetyEvent, isHipaaMode, isVerdictMissing, isCurrentPrincipalStamp } from "./privacyLevel.js";
import { GrowthbookExperimentEvent } from "../../types/generated/events_mono/growthbook/v1/growthbook_experiment_event.js";
import { AUTH_SURFACE_NAMES } from "./authOutcomeTelemetry.js";
import { decodeTaggedUuid } from "../mcp/serverIdentity.js";
import { LANGUAGE_NAMES, CEDAR_DISPLAY_NAMES } from "../../utils/cliHighlight.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";

//@ chunk-aepeg2w5.js:745825-746041 placement = shouldShowDevBar (0.425)
var EXPERIMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
var isVariationId = (e) => typeof e === "number" && Number.isInteger(e) && e >= 0 && e < 65536;
var EXPERIMENT_EVENT_FIELDS = {
  event_id: isUuid,
  experiment_id: regexValidator(EXPERIMENT_ID_PATTERN),
  variation_id: isVariationId,
  timestamp: isDateValidator,
  environment: oneOfValidator("production", "staging", "development"),
};
//@ chunk-aepeg2w5.js:746041-746072 placement
function sanitizeExperimentEventFields(e) {
  return sanitizeFields(e, EXPERIMENT_EVENT_FIELDS);
}
//@ chunk-aepeg2w5.js:746072-746388 placement
/**
 * 从事件元数据里挑出数值型指标字段（按事件名的允许表）。
 */
function pickNumericMetrics(e, n) {
  let r = {};
  if (!e) return r;
  for (let h of SAMPLE_RATE_FIELDS) {
    let y = e[h];
    if (typeof y === "number") r[h] = y;
  }
  let s = n !== undefined && Object.hasOwn(EVENT_FIELD_VALIDATORS, n) ? EVENT_FIELD_VALIDATORS[n] : undefined;
  if (s)
    for (let [key, value] of Object.entries(s)) {
      let S = Object.hasOwn(e, key) ? e[key] : undefined;
      if ((typeof S === "number" || typeof S === "boolean" || typeof S === "string") && value(S)) r[key] = S;
    }
  return r;
}
//@ chunk-aepeg2w5.js:746388-746586 placement
/**
 * base64 JSON 中只保留数值指标后重新编码。
 */
function filterNumericMetrics(additionalMetadata, eventName) {
  try {
    let parsed = JSON.parse(Buffer.from(additionalMetadata, "base64").toString("utf-8"));
    let s = pickNumericMetrics(parsed, eventName);
    if (Object.keys(s).length === 0) return;
    return Buffer.from(JSON.stringify(s)).toString("base64");
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:746586-746966 placement
/**
 * 导出前清洗事件 JSON（安全事件跳过、附加元数据过滤）。
 */
function sanitizeEventForExport(eventType, eventData) {
  try {
    if (eventData === null || typeof eventData !== "object" || Array.isArray(eventData)) return;
    if (eventType === "ClaudeCodeInternalEvent") {
      let r = ClaudeCodeInternalEvent.fromJSON(eventData);
      if (isSafetyEvent(r.event_name)) return;
      let s = sanitizeEventMetadata(r);
      if (s.additional_metadata !== undefined)
        s.additional_metadata = filterNumericMetrics(s.additional_metadata, s.event_name);
      return ClaudeCodeInternalEvent.toJSON(s);
    }
    if (eventType === "GrowthbookExperimentEvent")
      return GrowthbookExperimentEvent.toJSON(
        sanitizeExperimentEventFields(GrowthbookExperimentEvent.fromJSON(eventData)),
      );
  } catch {
    return;
  }
  return;
}
//@ chunk-aepeg2w5.js:746966-747445 placement
/**
 * 按隐私级别过滤要上报的事件批次。
 */
function filterEventsForPrivacy(events) {
  if (!isHipaaMode()) {
    let r = isVerdictMissing();
    return events.filter((s) => {
      try {
        if (s.event_type !== "ClaudeCodeInternalEvent")
          return s.event_type === "GrowthbookExperimentEvent" || !r;
        if ("eventName" in Object(s.event_data)) return false;
        return (
          !isSafetyEvent(ClaudeCodeInternalEvent.fromJSON(s.event_data).event_name) ||
          (!r && isCurrentPrincipalStamp(s.principal_stamp))
        );
      } catch {
        return false;
      }
    });
  }
  let n = [];
  for (let r of events) {
    if (!r || typeof r !== "object") continue;
    let s = sanitizeEventForExport(r.event_type, r.event_data);
    if (s !== undefined) {
      let h = {
        event_type: r.event_type,
        event_data: s,
      };
      n.push(h);
    }
  }
  return n;
}
//@ chunk-aepeg2w5.js:747445-748448 placement
/**
 * 元数据字段校验器与键映射表（会话 id 等）。
 */
var isFiniteNumber = (e) => typeof e === "number" && Number.isFinite(e);
var IS_BOOLEAN_FIELD = anyOfValidators(isBoolean, oneOfValidator("true", "false"));
var REMOTE_CONTROL_LANE_FIELD = oneOfValidator(...AUTH_SURFACE_NAMES);
var PROJECTS_SESSION_FIELD = oneOfValidator("1");
var COMMON_EVENT_FIELD_VALIDATORS = {
  sessionId: TOP_LEVEL_FIELD_VALIDATORS.session_id,
  session_id: TOP_LEVEL_FIELD_VALIDATORS.session_id,
  parentSessionId: TOP_LEVEL_FIELD_VALIDATORS.parent_session_id,
  parent_session_id: TOP_LEVEL_FIELD_VALIDATORS.parent_session_id,
  deviceId: TOP_LEVEL_FIELD_VALIDATORS.device_id,
  device_id: TOP_LEVEL_FIELD_VALIDATORS.device_id,
  userType: TOP_LEVEL_FIELD_VALIDATORS.user_type,
  user_type: TOP_LEVEL_FIELD_VALIDATORS.user_type,
  clientType: TOP_LEVEL_FIELD_VALIDATORS.client_type,
  client_type: TOP_LEVEL_FIELD_VALIDATORS.client_type,
  agentType: TOP_LEVEL_FIELD_VALIDATORS.agent_type,
  agent_type: TOP_LEVEL_FIELD_VALIDATORS.agent_type,
  isInteractive: IS_BOOLEAN_FIELD,
  is_interactive: IS_BOOLEAN_FIELD,
  entrypoint: TOP_LEVEL_FIELD_VALIDATORS.entrypoint,
  remoteControlLane: REMOTE_CONTROL_LANE_FIELD,
  remote_control_lane: REMOTE_CONTROL_LANE_FIELD,
  projectsSession: PROJECTS_SESSION_FIELD,
  projects_session: PROJECTS_SESSION_FIELD,
  model: anyOfValidators(TOP_LEVEL_FIELD_VALIDATORS.model, oneOfValidator("other")),
  version: ENV_FIELD_VALIDATORS.version,
  platform: ENV_FIELD_VALIDATORS.platform,
  arch: ENV_FIELD_VALIDATORS.arch,
  organizationUuid: AUTH_FIELD_VALIDATORS.organization_uuid,
  organization_uuid: AUTH_FIELD_VALIDATORS.organization_uuid,
  accountUuid: AUTH_FIELD_VALIDATORS.account_uuid,
  account_uuid: AUTH_FIELD_VALIDATORS.account_uuid,
  userBucket: isVariationId,
  sample_rate: isFiniteNumber,
  droppedSinceLastForward: isFiniteNumber,
  http_status: regexValidator(/^[1-5]\d\d$/),
  http_status_range: oneOfValidator("1xx", "2xx", "3xx", "4xx", "5xx"),
  triage_severity: oneOfValidator("high", "critical"),
  versionBase: regexValidator(SEMVER_PLAIN_RE),
  version_base: regexValidator(SEMVER_PLAIN_RE),
};
//@ chunk-aepeg2w5.js:748448-748480 placement
/**
 * 导出函数 `sanitizeCommonFields`：参数 e，返回 sanitizeFields(e, Vz)。
 */
function sanitizeCommonFields(allData) {
  return sanitizeFields(allData, COMMON_EVENT_FIELD_VALIDATORS);
}
//@ chunk-aepeg2w5.js:748480-750766 placement
/**
 * 用户 id 格式与 IDE 名称白名单等校验器。
 */
var USER_ID_PATTERN = /^user(_(local|staging))?_01[1-9A-HJ-NP-Za-km-z]{22}$/;
var isValidUserId = (e) =>
  typeof e === "string" && USER_ID_PATTERN.test(e) && decodeTaggedUuid(e) !== undefined;
var TERMINAL_NAME_ALLOWLIST = oneOfValidator(
  "cursor",
  "windsurf",
  "antigravity",
  "codium",
  "androidstudio",
  "visualstudio",
  "vscode",
  "pycharm",
  "intellij",
  "webstorm",
  "phpstorm",
  "rubymine",
  "clion",
  "goland",
  "rider",
  "datagrip",
  "appcode",
  "dataspell",
  "aqua",
  "gateway",
  "fleet",
  "jetbrains",
  "ghostty",
  "xterm-ghostty",
  "kitty",
  "xterm-kitty",
  "tmux",
  "tmux-256color",
  "screen",
  "screen-256color",
  "konsole",
  "gnome-terminal",
  "xterm",
  "xterm-color",
  "xterm-256color",
  "vte-based",
  "terminator",
  "alacritty",
  "tilix",
  "rxvt",
  "termite",
  "foot",
  "wezterm",
  "WezTerm",
  "iTerm.app",
  "Apple_Terminal",
  "WarpTerminal",
  "Hyper",
  "Tabby",
  "rio",
  "zed",
  "contour",
  "mintty",
  "windows-terminal",
  "conemu",
  "cygwin",
  "mingw64",
  "mingw32",
  "msys",
  "ucrt64",
  "clang64",
  "clangarm64",
  "wsl-Ubuntu",
  "wsl-Ubuntu-20.04",
  "wsl-Ubuntu-22.04",
  "wsl-Ubuntu-24.04",
  "wsl-Debian",
  "wsl-kali-linux",
  "wsl-openSUSE-Tumbleweed",
  "wsl-archlinux",
  "wsl-Alpine",
  "wsl-fedora",
  "ssh-session",
  "non-interactive",
  "linux",
  "dumb",
  "vt100",
  "vt220",
  "ansi",
);
var IDE_NAME_VALIDATOR = regexValidator(/^[0-9]{1,6}$/);
var TERMINAL_NAME_VALIDATOR = oneOfValidator(
  ...Object.values(LANGUAGE_NAMES),
  ...Object.values(CEDAR_DISPLAY_NAMES),
  "plugin",
  "unknown",
);
var PLATFORM_VALIDATOR = oneOfValidator("custom", "third-party", "builtin", "bundled");
var validateCommonField = {
  "service.name": oneOfValidator("claude-code"),
  "service.version": regexValidator(SEMVER_WITH_PRERELEASE_RE),
  "os.type": oneOfValidator(...PLATFORM_NAMES, "solaris"),
  "host.arch": oneOfValidator(...ARCH_NAMES, "amd64", "arm32", "ppc32"),
  "os.version": () => false,
  "wsl.version": IDE_NAME_VALIDATOR,
  "aggregation.temporality": oneOfValidator("delta", "cumulative"),
  "user.customer_type": oneOfValidator("claude_ai", "api"),
  "user.subscription_type": oneOfValidator("max", "pro", "enterprise", "team"),
};
var sanitizeFieldValue = {
  "user.id": TOP_LEVEL_FIELD_VALIDATORS.device_id,
  "session.id": TOP_LEVEL_FIELD_VALIDATORS.session_id,
  "ccr.session.id": TOP_LEVEL_FIELD_VALIDATORS.session_id,
  "organization.id": isUuid,
  "user.account_uuid": isUuid,
  "user.account_id": isValidUserId,
  "app.version": ENV_FIELD_VALIDATORS.version,
  "app.entrypoint": ENTRYPOINT_VALIDATOR,
  "terminal.type": TERMINAL_NAME_ALLOWLIST,
  type: oneOfValidator("input", "output", "cacheRead", "cacheCreation", "added", "removed", "user", "cli"),
  model: isKnownModelOrNonconforming,
  decision: oneOfValidator("accept", "reject"),
  source: oneOfValidator(
    "config",
    "hook",
    "classifier",
    "user_permanent",
    "user_temporary",
    "user_abort",
    "user_reject",
    "unknown",
  ),
  tool_name: oneOfValidator(FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME),
  language: TERMINAL_NAME_VALIDATOR,
  query_source: oneOfValidator("main", "subagent", "auxiliary"),
  effort: oneOfValidator("low", "medium", "high", "xhigh", "max"),
  speed: oneOfValidator("fast", "standard"),
  start_type: oneOfValidator("fresh", "resume", "continue", "agents_view"),
  "skill.name": PLATFORM_VALIDATOR,
  "plugin.name": PLATFORM_VALIDATOR,
  "marketplace.name": PLATFORM_VALIDATOR,
  "agent.name": PLATFORM_VALIDATOR,
  "mcp_server.name": PLATFORM_VALIDATOR,
  "mcp_tool.name": PLATFORM_VALIDATOR,
};
//@ chunk-aepeg2w5.js:750766-750911 placement
/**
 * 按校验器表过滤字段，不合格的值替换为占位。
 */
function sanitizeByValidators(e, n) {
  let r = {};
  for (let [key, value] of Object.entries(e)) {
    let y = Object.hasOwn(n, key) ? n[key] : undefined;
    if (y === undefined) continue;
    r[key] = y(value) ? value : HIPAA_REDACTED;
  }
  return r;
}
//@ chunk-aepeg2w5.js:750911-750929 placement
var nodeGzipModule = Re(require_core(), 1);
//@ chunk-aepeg2w5.js:751236-751256 placement
/**
 * 导出常量或表 `lastWatermark`：值为 null, Nis = 257。
 */
var lastWatermark = null;
var WATERMARK_BITS = 257;
//@ chunk-aepeg2w5.js:751256-751336 placement
/**
 * 在文本末尾附加由空格/制表符编码的水印。
 */
function appendWatermark(e) {
  return (
    e +
    `
` +
    Array.from(randomBytes(randomInt(WATERMARK_BITS)), (n) => (n & 1 ? " " : "\t")).join("")
  );
}
//@ chunk-aepeg2w5.js:751336-751557 placement
/**
 * 在请求体缓冲后追加水印。
 */
function appendWatermarkBuffer(body, n) {
  let r = appendWatermark("");
  let s = body.byteOffset + body.length;
  let h =
    n !== undefined && body.buffer.byteLength - s >= r.length
      ? Buffer.from(body.buffer, body.byteOffset, body.length + r.length)
      : Buffer.concat([body], body.length + r.length);
  h.write(r, body.length);
  return h;
}
//@ chunk-aepeg2w5.js:751557-751571 placement
var gzipAsync = promisify(gzip);
//@ chunk-aepeg2w5.js:751571-751600 placement
/**
 * 导出函数 `gzipBody`：参数 e，返回 _x(e)。
 */
function gzipBody(e) {
  return gzipAsync(e);
}
//@ chunk-aepeg2w5.js:751600-751634 placement
/**
 * 导出函数 `gzipWatermarkedBody`：参数 e，返回 _x(appendWatermark(e))。
 */
function gzipWatermarkedBody(json) {
  return gzipAsync(appendWatermark(json));
}
//@ chunk-aepeg2w5.js:751634-751673 placement
/**
 * 导出函数 `swapWatermark`：参数 e，返回 ((Jl = e), n)。
 */
function swapWatermark(e) {
  let n = lastWatermark;
  lastWatermark = e;
  return n;
}
//@ chunk-aepeg2w5.js:751673-751899 placement
/**
 * 按配置决定遥测请求体是否 gzip（附水印）。
 */
function gzipTelemetryBody({ url, payload, storageV5 }) {
  if (lastWatermark === null) return null;
  let s = jsonStringify(payload);
  if (typeof s !== "string") return null;
  let h = lastWatermark(url, s, storageV5);
  if (h === undefined || !h.gzip) return null;
  return {
    body: gzipSync(appendWatermark(s)),
    headers: {
      "Content-Encoding": "gzip",
    },
  };
}
//@ chunk-aepeg2w5.js:751931-751944 placement
/**
 * 导出常量或表 `MAX_NORMALIZED_TEXT_CHARS`：值为 2048。
 */
var MAX_NORMALIZED_TEXT_CHARS = 2048;
//@ chunk-aepeg2w5.js:751944-751986 placement
/**
 * 导出函数 `truncateNormalizedText`：参数 e，返回 normalizeFullWidthSpace(e.slice(0, $is)); } export { Tki, K6e, filterEventsForPrivacy, _r, gzipTelemetryBody, …。
 */
function truncateNormalizedText(e) {
  return normalizeFullWidthSpace(e.slice(0, MAX_NORMALIZED_TEXT_CHARS));
}
export {
  sanitizeCommonFields,
  truncateNormalizedText,
  filterEventsForPrivacy,
  nodeGzipModule,
  gzipTelemetryBody,
  sanitizeExperimentEventFields,
  pickNumericMetrics,
  sanitizeByValidators,
  validateCommonField,
  sanitizeFieldValue,
  appendWatermark,
  appendWatermarkBuffer,
  WATERMARK_BITS,
  swapWatermark,
  gzipBody,
  gzipWatermarkedBody,
  MAX_NORMALIZED_TEXT_CHARS,
};
