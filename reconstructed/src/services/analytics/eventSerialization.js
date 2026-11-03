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
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomInt,
} from "crypto";
import { promisify } from "util";
import { gzip, gzipSync } from "zlib";
import {
  fr,
  sn,
  lx,
  we,
  sanitizeFields,
  Dz,
  tx,
  sanitizeEventMetadata,
  Vl,
  isBoolean,
  nt,
  fs,
  cs,
  VR,
  dx,
  cx,
  fx,
  px,
  mx,
  HIPAA_REDACTED,
} from "./metadataSanitizers.js";
import { ClaudeCodeInternalEvent } from "../../types/generated/events_mono/claude_code/v1/claude_code_internal_event.js";
import { ms, isHipaaMode, pg, Tz } from "./privacyLevel.js";
import { GrowthbookExperimentEvent } from "../../types/generated/events_mono/growthbook/v1/growthbook_experiment_event.js";
import { TR } from "./authOutcomeTelemetry.js";
import { decodeTaggedUuid } from "../mcp/serverIdentity.js";
import { LANGUAGE_NAMES, sgr } from "../../utils/cliHighlight.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Qm } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";

//@ chunk-aepeg2w5.js:745825-746041 placement = shouldShowDevBar (0.425)
var EXPERIMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/,
  isVariationId = (e) => typeof e === "number" && Number.isInteger(e) && e >= 0 && e < 65536,
  EXPERIMENT_EVENT_FIELDS = {
    event_id: fr,
    experiment_id: sn(EXPERIMENT_ID_PATTERN),
    variation_id: isVariationId,
    timestamp: lx,
    environment: we("production", "staging", "development"),
  };
//@ chunk-aepeg2w5.js:746041-746072 placement
function gg(e) {
  return sanitizeFields(e, EXPERIMENT_EVENT_FIELDS);
}
/**
 * 从事件元数据里挑出数值型指标字段（按事件名的允许表）。
 */
//@ chunk-aepeg2w5.js:746072-746388 placement
function pickNumericMetrics(e, n) {
  let r = {};
  if (!e) return r;
  for (let h of Dz) {
    let y = e[h];
    if (typeof y === "number") r[h] = y;
  }
  let s = n !== void 0 && Object.hasOwn(tx, n) ? tx[n] : void 0;
  if (s)
    for (let [h, y] of Object.entries(s)) {
      let S = Object.hasOwn(e, h) ? e[h] : void 0;
      if ((typeof S === "number" || typeof S === "boolean" || typeof S === "string") && y(S)) r[h] = S;
    }
  return r;
}
/**
 * base64 JSON 中只保留数值指标后重新编码。
 */
//@ chunk-aepeg2w5.js:746388-746586 placement
function filterNumericMetrics(e, n) {
  try {
    let parsed = JSON.parse(Buffer.from(e, "base64").toString("utf-8")),
      s = pickNumericMetrics(parsed, n);
    if (Object.keys(s).length === 0) return;
    return Buffer.from(JSON.stringify(s)).toString("base64");
  } catch {
    return;
  }
}
/**
 * 导出前清洗事件 JSON（安全事件跳过、附加元数据过滤）。
 */
//@ chunk-aepeg2w5.js:746586-746966 placement
function sanitizeEventForExport(e, n) {
  try {
    if (n === null || typeof n !== "object" || Array.isArray(n)) return;
    if (e === "ClaudeCodeInternalEvent") {
      let fromJSON = ClaudeCodeInternalEvent.fromJSON(n);
      if (ms(fromJSON.event_name)) return;
      let s = sanitizeEventMetadata(fromJSON);
      if (s.additional_metadata !== void 0)
        s.additional_metadata = filterNumericMetrics(s.additional_metadata, s.event_name);
      return ClaudeCodeInternalEvent.toJSON(s);
    }
    if (e === "GrowthbookExperimentEvent")
      return GrowthbookExperimentEvent.toJSON(gg(GrowthbookExperimentEvent.fromJSON(n)));
  } catch {
    return;
  }
  return;
}
/**
 * 按隐私级别过滤要上报的事件批次。
 */
//@ chunk-aepeg2w5.js:746966-747445 placement
function filterEventsForPrivacy(e) {
  if (!isHipaaMode()) {
    let r = pg();
    return e.filter((s) => {
      try {
        if (s.event_type !== "ClaudeCodeInternalEvent")
          return s.event_type === "GrowthbookExperimentEvent" || !r;
        if ("eventName" in Object(s.event_data)) return !1;
        return (
          !ms(ClaudeCodeInternalEvent.fromJSON(s.event_data).event_name) || (!r && Tz(s.principal_stamp))
        );
      } catch {
        return !1;
      }
    });
  }
  let n = [];
  for (let r of e) {
    if (!r || typeof r !== "object") continue;
    let s = sanitizeEventForExport(r.event_type, r.event_data);
    if (s !== void 0) {
      let h = { event_type: r.event_type, event_data: s };
      n.push(h);
    }
  }
  return n;
}
/**
 * 元数据字段校验器与键映射表（会话 id 等）。
 */
//@ chunk-aepeg2w5.js:747445-748448 placement
var isFiniteNumber = (e) => typeof e === "number" && Number.isFinite(e),
  rx = Vl(isBoolean, we("true", "false")),
  ox = we(...TR),
  ix = we("1"),
  Vz = {
    sessionId: nt.session_id,
    session_id: nt.session_id,
    parentSessionId: nt.parent_session_id,
    parent_session_id: nt.parent_session_id,
    deviceId: nt.device_id,
    device_id: nt.device_id,
    userType: nt.user_type,
    user_type: nt.user_type,
    clientType: nt.client_type,
    client_type: nt.client_type,
    agentType: nt.agent_type,
    agent_type: nt.agent_type,
    isInteractive: rx,
    is_interactive: rx,
    entrypoint: nt.entrypoint,
    remoteControlLane: ox,
    remote_control_lane: ox,
    projectsSession: ix,
    projects_session: ix,
    model: Vl(nt.model, we("other")),
    version: fs.version,
    platform: fs.platform,
    arch: fs.arch,
    organizationUuid: cs.organization_uuid,
    organization_uuid: cs.organization_uuid,
    accountUuid: cs.account_uuid,
    account_uuid: cs.account_uuid,
    userBucket: isVariationId,
    sample_rate: isFiniteNumber,
    droppedSinceLastForward: isFiniteNumber,
    http_status: sn(/^[1-5]\d\d$/),
    http_status_range: we("1xx", "2xx", "3xx", "4xx", "5xx"),
    triage_severity: we("high", "critical"),
    versionBase: sn(VR),
    version_base: sn(VR),
  };
//@ chunk-aepeg2w5.js:748448-748480 placement
function Tki(e) {
  return sanitizeFields(e, Vz);
}
/**
 * 用户 id 格式与 IDE 名称白名单等校验器。
 */
//@ chunk-aepeg2w5.js:748480-750766 placement
var USER_ID_PATTERN = /^user(_(local|staging))?_01[1-9A-HJ-NP-Za-km-z]{22}$/,
  qz = (e) => typeof e === "string" && USER_ID_PATTERN.test(e) && decodeTaggedUuid(e) !== void 0,
  Xz = we(
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
  ),
  Jz = sn(/^[0-9]{1,6}$/),
  Qz = we(...Object.values(LANGUAGE_NAMES), ...Object.values(sgr), "plugin", "unknown"),
  Ho = we("custom", "third-party", "builtin", "bundled"),
  Aki = {
    "service.name": we("claude-code"),
    "service.version": sn(dx),
    "os.type": we(...cx, "solaris"),
    "host.arch": we(...fx, "amd64", "arm32", "ppc32"),
    "os.version": () => !1,
    "wsl.version": Jz,
    "aggregation.temporality": we("delta", "cumulative"),
    "user.customer_type": we("claude_ai", "api"),
    "user.subscription_type": we("max", "pro", "enterprise", "team"),
  },
  Cki = {
    "user.id": nt.device_id,
    "session.id": nt.session_id,
    "ccr.session.id": nt.session_id,
    "organization.id": fr,
    "user.account_uuid": fr,
    "user.account_id": qz,
    "app.version": fs.version,
    "app.entrypoint": px,
    "terminal.type": Xz,
    type: we("input", "output", "cacheRead", "cacheCreation", "added", "removed", "user", "cli"),
    model: mx,
    decision: we("accept", "reject"),
    source: we(
      "config",
      "hook",
      "classifier",
      "user_permanent",
      "user_temporary",
      "user_abort",
      "user_reject",
      "unknown",
    ),
    tool_name: we(FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME),
    language: Qz,
    query_source: we("main", "subagent", "auxiliary"),
    effort: we("low", "medium", "high", "xhigh", "max"),
    speed: we("fast", "standard"),
    start_type: we("fresh", "resume", "continue", "agents_view"),
    "skill.name": Ho,
    "plugin.name": Ho,
    "marketplace.name": Ho,
    "agent.name": Ho,
    "mcp_server.name": Ho,
    "mcp_tool.name": Ho,
  };
/**
 * 按校验器表过滤字段，不合格的值替换为占位。
 */
//@ chunk-aepeg2w5.js:750766-750911 placement
function sanitizeByValidators(e, n) {
  let r = {};
  for (let [s, h] of Object.entries(e)) {
    let y = Object.hasOwn(n, s) ? n[s] : void 0;
    if (y === void 0) continue;
    r[s] = y(h) ? h : HIPAA_REDACTED;
  }
  return r;
}
//@ chunk-aepeg2w5.js:750911-750929 placement
var _r = Re(Qm(), 1);
//@ chunk-aepeg2w5.js:751236-751256 placement
var Jl = null,
  Nis = 257;
/**
 * 在文本末尾附加由空格/制表符编码的水印。
 */
//@ chunk-aepeg2w5.js:751256-751336 placement
function appendWatermark(e) {
  return (
    e +
    `
` +
    Array.from(randomBytes_5(randomInt(Nis)), (n) => (n & 1 ? " " : "\t")).join("")
  );
}
/**
 * 在请求体缓冲后追加水印。
 */
//@ chunk-aepeg2w5.js:751336-751557 placement
function appendWatermarkBuffer(e, n) {
  let r = appendWatermark(""),
    s = e.byteOffset + e.length,
    h =
      n !== void 0 && e.buffer.byteLength - s >= r.length
        ? Buffer.from(e.buffer, e.byteOffset, e.length + r.length)
        : Buffer.concat([e], e.length + r.length);
  return (h.write(r, e.length), h);
}
//@ chunk-aepeg2w5.js:751557-751571 placement
var _x = promisify(gzip);
//@ chunk-aepeg2w5.js:751571-751600 placement
function xki(e) {
  return _x(e);
}
//@ chunk-aepeg2w5.js:751600-751634 placement
function Pki(e) {
  return _x(appendWatermark(e));
}
//@ chunk-aepeg2w5.js:751634-751673 placement
function Iki(e) {
  let n = Jl;
  return ((Jl = e), n);
}
/**
 * 按配置决定遥测请求体是否 gzip（附水印）。
 */
//@ chunk-aepeg2w5.js:751673-751899 placement
function gzipTelemetryBody({ url: url, payload: payload, storageV5: storageV5 }) {
  if (Jl === null) return null;
  let s = jsonStringify(payload);
  if (typeof s !== "string") return null;
  let h = Jl(url, s, storageV5);
  if (h === void 0 || !h.gzip) return null;
  return { body: gzipSync(appendWatermark(s)), headers: { "Content-Encoding": "gzip" } };
}
//@ chunk-aepeg2w5.js:751931-751944 placement
var $is = 2048;
//@ chunk-aepeg2w5.js:751944-751986 placement
function K6e(e) {
  return normalizeFullWidthSpace(e.slice(0, $is));
}

export {
  Tki,
  K6e,
  filterEventsForPrivacy,
  _r,
  gzipTelemetryBody,
  gg,
  pickNumericMetrics,
  sanitizeByValidators,
  Aki,
  Cki,
  appendWatermark,
  appendWatermarkBuffer,
  Nis,
  Iki,
  xki,
  Pki,
  $is,
};
