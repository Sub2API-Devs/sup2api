/**
 * utils/transcriptDiagnostics.ts
 *
 * 2.1.316 新增：描述消息的诊断字段；描述转录中的位置（诊断）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (20)
 * attribution: placement 20
 */
import { hasStringUuid, MESSAGES_ENTRY_WITHOUT_UUID, ET, Qv, Xv, Zv } from "../bridge/inboundMessages.js";
import { UUID_PREFIX_LENGTH, ATTACHMENT_MESSAGE_RENDERERS } from "./messages.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { Xj } from "./sessionRestore.js";
import { logError } from "./log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { isKnownContentBlockType } from "../services/api/requestHeaders.js";
import { tE } from "./permissions/currentPermissionContext.js";
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getMarketingNameForModel } from "./model/model.js";
import { displayModelName } from "./model/validateModel.js";
import { normalizeEffortLevel } from "./effort.js";

/**
 * 消息 uuid 的短形式。
 */
//@ chunk-ah34pb7m.js:9262-9316 placement
function shortUuid(m) {
  return hasStringUuid(m) ? m.uuid.slice(0, UUID_PREFIX_LENGTH) : void 0;
}
/**
 * 首次发现缺 uuid 的消息时上报位置。
 */
//@ chunk-ah34pb7m.js:9316-9560 placement
function reportMessageWithoutUuid(m, d, c) {
  try {
    let of = claimOnceStore.of(m);
    if (of.has(MESSAGES_ENTRY_WITHOUT_UUID)) return;
    let index = d.findIndex((M) => !hasStringUuid(M));
    if (index < 0 || !of.claim(MESSAGES_ENTRY_WITHOUT_UUID)) return;
    let h;
    try {
      h = describeTranscriptPosition(d, index, { ...c, resumed: Xj(m), uptimeSeconds: process.uptime() });
    } catch {
      h = `${ET} (describe=failed)`;
    }
    logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(h));
  } catch {}
}
/**
 * 描述转录中的位置（诊断）。
 */
//@ chunk-ah34pb7m.js:9560-9893 placement
function describeTranscriptPosition(
  m,
  d,
  { resumed: resumed, virtualized: virtualized, screen: screen, uptimeSeconds: uptimeSeconds },
) {
  let M = [
    ...describeTranscriptMessage(m[d]),
    `index=${d}`,
    `length=${m.length}`,
    `previous=${d > 0 ? describeMessageTypeSafe(m[d - 1]) : "none"}`,
    `next=${d + 1 < m.length ? describeMessageTypeSafe(m[d + 1]) : "none"}`,
    `resumed=${resumed}`,
    `virtualized=${virtualized}`,
    `screen=${screen === "transcript" ? "transcript" : "prompt"}`,
    `uptime=${uptimeBucket(uptimeSeconds)}`,
  ];
  return `${ET} (${M.join(" ")})`;
}
/**
 * 描述消息的诊断字段。
 */
//@ chunk-ah34pb7m.js:9893-10377 placement
function describeTranscriptMessage(m) {
  try {
    let d = zo(m, "type");
    return [
      `uuid=${describeUuidField(m)}`,
      `kind=${getReceivedType(m)}`,
      `type=${describeMessageType(m)}`,
      ...(d === "user" || d === "assistant"
        ? [`block=${describeMessageContent(zo(m, "message"))}`]
        : d === "attachment"
          ? [`attachment=${describeTypeField(zo(zo(m, "attachment"), "type"), nP)}`]
          : d === "system"
            ? [`subtype=${describeTypeField(zo(m, "subtype"), rP)}`]
            : []),
      `has_message=${zo(m, "message") !== void 0}`,
      `has_timestamp=${zo(m, "timestamp") !== void 0}`,
      `has_parentUuid=${zo(m, "parentUuid") !== void 0}`,
      `isMeta=${lP(zo(m, "isMeta"))}`,
    ];
  } catch {
    return ["describe=failed"];
  }
}
//@ chunk-ah34pb7m.js:10377-10440 placement
function describeMessageTypeSafe(m) {
  try {
    return describeMessageType(m);
  } catch {
    return "describe_failed";
  }
}
//@ chunk-ah34pb7m.js:10440-10494 placement = extractErrorTypeFromData (1)
function describeMessageType(data) {
  return describeTypeField(zo(data, "type"), (d) => Qv.has(d));
}
//@ chunk-ah34pb7m.js:10494-10723 placement
function describeMessageContent(m) {
  if (m === void 0) return "no_message";
  let d = zo(m, "content");
  if (typeof d === "string") return "string_content";
  if (!Array.isArray(d)) return "non_array_content";
  let c = d[0];
  return c === void 0 ? "empty_content" : describeTypeField(zo(c, "type"), isKnownContentBlockType);
}
//@ chunk-ah34pb7m.js:10723-10765 placement
function rP(m) {
  return Object.hasOwn(Xv, m);
}
//@ chunk-ah34pb7m.js:10765-10829 placement
function nP(m) {
  return Object.hasOwn(ATTACHMENT_MESSAGE_RENDERERS, m) || Object.hasOwn(Zv, m);
}
//@ chunk-ah34pb7m.js:10829-10943 placement
function describeTypeField(m, d) {
  if (typeof m !== "string") return m === void 0 ? "absent" : `non_string_${getReceivedType(m)}`;
  return d(m) ? m : "unlisted";
}
//@ chunk-ah34pb7m.js:10943-11132 placement
function describeUuidField(m) {
  if (typeof m !== "object" || m === null || !("uuid" in m)) return "absent";
  let { uuid: uuid } = m;
  if (typeof uuid === "string") return uuid === "" ? "string_empty" : "string";
  return uuid === void 0 ? "undefined" : getReceivedType(uuid);
}
//@ chunk-ah34pb7m.js:11132-11204 placement = getReceivedType (0.776)
function getReceivedType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-ah34pb7m.js:11204-11300 placement
function lP(m) {
  return typeof m === "boolean" ? String(m) : m === void 0 ? "absent" : `non_boolean_${getReceivedType(m)}`;
}
//@ chunk-ah34pb7m.js:11300-11386 placement
function zo(m, d) {
  return typeof m === "object" && m !== null && d in m ? Reflect.get(m, d) : void 0;
}
//@ chunk-ah34pb7m.js:11386-11494 placement
function uptimeBucket(m) {
  return m < 60
    ? "lt_1m"
    : m < 600
      ? "lt_10m"
      : m < 3600
        ? "lt_1h"
        : m < 21600
          ? "lt_6h"
          : m < 86400
            ? "lt_24h"
            : "gte_24h";
}
/**
 * 协调者面板是否启用。
 */
//@ chunk-ah34pb7m.js:11494-11526 placement
function isCoordinatorPanelActive() {
  return tE() && isFullscreenEnvEnabled();
}
//@ chunk-ah34pb7m.js:11526-11555 placement
function Xre() {
  return renderWithForceUpdate(isCoordinatorPanelActive);
}
//@ chunk-ah34pb7m.js:11555-11625 placement
function Hn() {
  if (getIsNonInteractiveSession()) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_coordinator_panel", !0);
}
/**
 * 代理显示标签。
 */
//@ chunk-ah34pb7m.js:11625-11723 placement
function agentLabel(m, d) {
  if (!m) return null;
  let c = getMarketingNameForModel(m) ?? displayModelName(m),
    g = OAr(d);
  return g !== void 0 ? `${c} (${g})` : c;
}
//@ chunk-ah34pb7m.js:11723-11803 placement
function OAr(m) {
  if (m === void 0) return;
  if (typeof m === "number") return;
  return normalizeEffortLevel(m);
}

export { shortUuid, reportMessageWithoutUuid, isCoordinatorPanelActive, Xre, Hn, agentLabel, OAr };
