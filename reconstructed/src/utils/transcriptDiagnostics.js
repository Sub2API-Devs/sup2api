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
import {
  hasStringUuid,
  MESSAGES_ENTRY_WITHOUT_UUID,
  MESSAGES_ENTRY_WITHOUT_UUID_TEXT,
  KNOWN_MESSAGE_ENTRY_TYPES,
  SYSTEM_SUBTYPES,
  ATTACHMENT_TYPES,
} from "../bridge/inboundMessages.js";
import { UUID_PREFIX_LENGTH, ATTACHMENT_MESSAGE_RENDERERS } from "./messages.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { isSessionRestored } from "./sessionRestore.js";
import { logError } from "./log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { isKnownContentBlockType } from "../services/api/requestHeaders.js";
import { currentToolPermissionContext } from "./permissions/currentPermissionContext.js";
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getMarketingNameForModel } from "./model/model.js";
import { displayModelName } from "./model/validateModel.js";
import { normalizeEffortLevel } from "./effort.js";

//@ chunk-ah34pb7m.js:9262-9316 placement
/**
 * 消息 uuid 的短形式。
 */
function shortUuid(m) {
  return hasStringUuid(m) ? m.uuid.slice(0, UUID_PREFIX_LENGTH) : undefined;
}
//@ chunk-ah34pb7m.js:9316-9560 placement
/**
 * 首次发现缺 uuid 的消息时上报位置。
 */
function reportMessageWithoutUuid(host, renderableMessages, c) {
  try {
    let g = claimOnceStore.of(host);
    if (g.has(MESSAGES_ENTRY_WITHOUT_UUID)) return;
    let index = renderableMessages.findIndex((M) => !hasStringUuid(M));
    if (index < 0 || !g.claim(MESSAGES_ENTRY_WITHOUT_UUID)) return;
    let h;
    try {
      h = describeTranscriptPosition(renderableMessages, index, {
        ...c,
        resumed: isSessionRestored(host),
        uptimeSeconds: process.uptime(),
      });
    } catch {
      h = `${MESSAGES_ENTRY_WITHOUT_UUID_TEXT} (describe=failed)`;
    }
    logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(h));
  } catch {}
}
//@ chunk-ah34pb7m.js:9560-9893 placement
/**
 * 描述转录中的位置（诊断）。
 */
function describeTranscriptPosition(m, d, { resumed, virtualized, screen, uptimeSeconds }) {
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
  return `${MESSAGES_ENTRY_WITHOUT_UUID_TEXT} (${M.join(" ")})`;
}
//@ chunk-ah34pb7m.js:9893-10377 placement
/**
 * 描述消息的诊断字段。
 */
function describeTranscriptMessage(m) {
  try {
    let field = readField(m, "type");
    return [
      `uuid=${describeUuidField(m)}`,
      `kind=${getReceivedType(m)}`,
      `type=${describeMessageType(m)}`,
      ...(field === "user" || field === "assistant"
        ? [`block=${describeMessageContent(readField(m, "message"))}`]
        : field === "attachment"
          ? [
              `attachment=${describeTypeField(readField(readField(m, "attachment"), "type"), isKnownAttachmentType)}`,
            ]
          : field === "system"
            ? [`subtype=${describeTypeField(readField(m, "subtype"), isKnownSubtype)}`]
            : []),
      `has_message=${readField(m, "message") !== undefined}`,
      `has_timestamp=${readField(m, "timestamp") !== undefined}`,
      `has_parentUuid=${readField(m, "parentUuid") !== undefined}`,
      `isMeta=${describeBooleanish(readField(m, "isMeta"))}`,
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
  return describeTypeField(readField(data, "type"), (d) => KNOWN_MESSAGE_ENTRY_TYPES.has(d));
}
//@ chunk-ah34pb7m.js:10494-10723 placement
function describeMessageContent(field) {
  if (field === undefined) return "no_message";
  let field_2 = readField(field, "content");
  if (typeof field_2 === "string") return "string_content";
  if (!Array.isArray(field_2)) return "non_array_content";
  let c = field_2[0];
  return c === undefined ? "empty_content" : describeTypeField(readField(c, "type"), isKnownContentBlockType);
}
//@ chunk-ah34pb7m.js:10723-10765 placement
function isKnownSubtype(m) {
  return Object.hasOwn(SYSTEM_SUBTYPES, m);
}
//@ chunk-ah34pb7m.js:10765-10829 placement
function isKnownAttachmentType(m) {
  return Object.hasOwn(ATTACHMENT_MESSAGE_RENDERERS, m) || Object.hasOwn(ATTACHMENT_TYPES, m);
}
//@ chunk-ah34pb7m.js:10829-10943 placement
function describeTypeField(field, d) {
  if (typeof field !== "string")
    return field === undefined ? "absent" : `non_string_${getReceivedType(field)}`;
  return d(field) ? field : "unlisted";
}
//@ chunk-ah34pb7m.js:10943-11132 placement
function describeUuidField(m) {
  if (typeof m !== "object" || m === null || !("uuid" in m)) return "absent";
  let { uuid } = m;
  if (typeof uuid === "string") return uuid === "" ? "string_empty" : "string";
  return uuid === undefined ? "undefined" : getReceivedType(uuid);
}
//@ chunk-ah34pb7m.js:11132-11204 placement = getReceivedType (0.776)
function getReceivedType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-ah34pb7m.js:11204-11300 placement
function describeBooleanish(field) {
  return typeof field === "boolean"
    ? String(field)
    : field === undefined
      ? "absent"
      : `non_boolean_${getReceivedType(field)}`;
}
//@ chunk-ah34pb7m.js:11300-11386 placement
function readField(m, d) {
  return typeof m === "object" && m !== null && d in m ? Reflect.get(m, d) : undefined;
}
//@ chunk-ah34pb7m.js:11386-11494 placement
function uptimeBucket(uptimeSeconds) {
  return uptimeSeconds < 60
    ? "lt_1m"
    : uptimeSeconds < 600
      ? "lt_10m"
      : uptimeSeconds < 3600
        ? "lt_1h"
        : uptimeSeconds < 21600
          ? "lt_6h"
          : uptimeSeconds < 86400
            ? "lt_24h"
            : "gte_24h";
}
//@ chunk-ah34pb7m.js:11494-11526 placement
/**
 * 协调者面板是否启用。
 */
function isCoordinatorPanelActive() {
  return currentToolPermissionContext() && isFullscreenEnvEnabled();
}
//@ chunk-ah34pb7m.js:11526-11555 placement
/**
 * 订阅协调者面板可见性并强制刷新渲染。
 */
function subscribeCoordinatorPanel() {
  return renderWithForceUpdate(isCoordinatorPanelActive);
}
//@ chunk-ah34pb7m.js:11555-11625 placement
function isCoordinatorPanelEnabled() {
  if (getIsNonInteractiveSession()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_coordinator_panel", true);
}
//@ chunk-ah34pb7m.js:11625-11723 placement
/**
 * 代理显示标签。
 */
function agentLabel(model, effort) {
  if (!model) return null;
  let c = getMarketingNameForModel(model) ?? displayModelName(model);
  let g = effortLevelOf(effort);
  return g !== undefined ? `${c} (${g})` : c;
}
//@ chunk-ah34pb7m.js:11723-11803 placement
/**
 * 把值规范成努力等级（数字/undefined 原样跳过）。
 */
function effortLevelOf(m) {
  if (m === undefined) return;
  if (typeof m === "number") return;
  return normalizeEffortLevel(m);
}
export {
  shortUuid,
  reportMessageWithoutUuid,
  subscribeCoordinatorPanel,
  isCoordinatorPanelActive,
  isCoordinatorPanelEnabled,
  agentLabel,
  effortLevelOf,
};
