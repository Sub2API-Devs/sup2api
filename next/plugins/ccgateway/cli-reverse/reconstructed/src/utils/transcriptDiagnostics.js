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
function shortUuid(msg) {
  return hasStringUuid(msg) ? msg.uuid.slice(0, UUID_PREFIX_LENGTH) : undefined;
}
//@ chunk-ah34pb7m.js:9316-9560 placement
/**
 * 首次发现缺 uuid 的消息时上报位置。
 */
function reportMessageWithoutUuid(host, msg, reason) {
  try {
    let claim = claimOnceStore.of(host);
    if (claim.has(MESSAGES_ENTRY_WITHOUT_UUID)) return;
    let messageIndex = msg.findIndex((message) => !hasStringUuid(message));
    if (messageIndex < 0 || !claim.claim(MESSAGES_ENTRY_WITHOUT_UUID)) return;
    let description;
    try {
      description = describeTranscriptPosition(msg, messageIndex, {
        ...reason,
        resumed: isSessionRestored(host),
        uptimeSeconds: process.uptime(),
      });
    } catch {
      description = `${MESSAGES_ENTRY_WITHOUT_UUID_TEXT} (describe=failed)`;
    }
    logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(description));
  } catch {}
}
//@ chunk-ah34pb7m.js:9560-9893 placement
/**
 * 描述转录中的位置（诊断）。
 */
function describeTranscriptPosition(msg, messageIndex, { resumed, virtualized, screen, uptimeSeconds }) {
  let details = [
    ...describeTranscriptMessage(msg[messageIndex]),
    `index=${messageIndex}`,
    `length=${msg.length}`,
    `previous=${messageIndex > 0 ? describeMessageTypeSafe(msg[messageIndex - 1]) : "none"}`,
    `next=${messageIndex + 1 < msg.length ? describeMessageTypeSafe(msg[messageIndex + 1]) : "none"}`,
    `resumed=${resumed}`,
    `virtualized=${virtualized}`,
    `screen=${screen === "transcript" ? "transcript" : "prompt"}`,
    `uptime=${uptimeBucket(uptimeSeconds)}`,
  ];
  return `${MESSAGES_ENTRY_WITHOUT_UUID_TEXT} (${details.join(" ")})`;
}
//@ chunk-ah34pb7m.js:9893-10377 placement
/**
 * 描述消息的诊断字段。
 */
function describeTranscriptMessage(msg) {
  try {
    let field = readField(msg, "type");
    return [
      `uuid=${describeUuidField(msg)}`,
      `kind=${getReceivedType(msg)}`,
      `type=${describeMessageType(msg)}`,
      ...(field === "user" || field === "assistant"
        ? [`block=${describeMessageContent(readField(msg, "message"))}`]
        : field === "attachment"
          ? [
              `attachment=${describeTypeField(readField(readField(msg, "attachment"), "type"), isKnownAttachmentType)}`,
            ]
          : field === "system"
            ? [`subtype=${describeTypeField(readField(msg, "subtype"), isKnownSubtype)}`]
            : []),
      `has_message=${readField(msg, "message") !== undefined}`,
      `has_timestamp=${readField(msg, "timestamp") !== undefined}`,
      `has_parentUuid=${readField(msg, "parentUuid") !== undefined}`,
      `isMeta=${describeBooleanish(readField(msg, "isMeta"))}`,
    ];
  } catch {
    return ["describe=failed"];
  }
}
//@ chunk-ah34pb7m.js:10377-10440 placement
function describeMessageTypeSafe(msg) {
  try {
    return describeMessageType(msg);
  } catch {
    return "describe_failed";
  }
}
//@ chunk-ah34pb7m.js:10440-10494 placement = extractErrorTypeFromData (1)
function describeMessageType(data) {
  return describeTypeField(readField(data, "type"), (isKnownType) =>
    KNOWN_MESSAGE_ENTRY_TYPES.has(isKnownType),
  );
}
//@ chunk-ah34pb7m.js:10494-10723 placement
function describeMessageContent(field) {
  if (field === undefined) return "no_message";
  let field_2 = readField(field, "content");
  if (typeof field_2 === "string") return "string_content";
  if (!Array.isArray(field_2)) return "non_array_content";
  let firstBlock = field_2[0];
  return firstBlock === undefined
    ? "empty_content"
    : describeTypeField(readField(firstBlock, "type"), isKnownContentBlockType);
}
//@ chunk-ah34pb7m.js:10723-10765 placement
function isKnownSubtype(subtype) {
  return Object.hasOwn(SYSTEM_SUBTYPES, subtype);
}
//@ chunk-ah34pb7m.js:10765-10829 placement
function isKnownAttachmentType(attachmentType) {
  return (
    Object.hasOwn(ATTACHMENT_MESSAGE_RENDERERS, attachmentType) ||
    Object.hasOwn(ATTACHMENT_TYPES, attachmentType)
  );
}
//@ chunk-ah34pb7m.js:10829-10943 placement
function describeTypeField(field, isKnown) {
  if (typeof field !== "string")
    return field === undefined ? "absent" : `non_string_${getReceivedType(field)}`;
  return isKnown(field) ? field : "unlisted";
}
//@ chunk-ah34pb7m.js:10943-11132 placement
function describeUuidField(record) {
  if (typeof record !== "object" || record === null || !("uuid" in record)) return "absent";
  let { uuid } = record;
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
function readField(target, fieldName) {
  return typeof target === "object" && target !== null && fieldName in target
    ? Reflect.get(target, fieldName)
    : undefined;
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
  let modelName = getMarketingNameForModel(model) ?? displayModelName(model);
  let effortLabel = effortLevelOf(effort);
  return effortLabel !== undefined ? `${modelName} (${effortLabel})` : modelName;
}
//@ chunk-ah34pb7m.js:11723-11803 placement
/**
 * 把值规范成努力等级（数字/undefined 原样跳过）。
 */
function effortLevelOf(effort) {
  if (effort === undefined) return;
  if (typeof effort === "number") return;
  return normalizeEffortLevel(effort);
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
