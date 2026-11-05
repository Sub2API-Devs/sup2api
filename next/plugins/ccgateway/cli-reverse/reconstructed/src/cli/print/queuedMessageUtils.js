/**
 * cli/print/queuedMessageUtils.ts
 *
 * 2.1.316 新增：暂存消息识别与合并消息 uuid 查找
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { HELD_MESSAGE_FLAGS, TENGU_SNAPPY_SUNRISE_KILLSWITCH } from "./sessionNotices.js";
import { logError } from "../../utils/log.js";
import { isSelfHostedByocEnvironment } from "../../utils/remoteEnvironment.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getSourceUuid, filterUuidList } from "../queuedCommands.js";

//@ chunk-0yw3taqg.js:56912-57035 placement
function isHeldMessageRecognitionOn() {
  try {
    if (env.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION) return false;
    return getFeatureValue_CACHED_MAY_BE_STALE(HELD_MESSAGE_FLAGS, false) === true;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:57035-57158 placement
function isSelfHostedHeldRecognition() {
  try {
    return (
      isSelfHostedByocEnvironment() &&
      !env.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION &&
      !readFlagWithOverride(TENGU_SNAPPY_SUNRISE_KILLSWITCH, {
        safe: false,
      })
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:57158-57194 placement
function heldMessageUuids(message) {
  return isHeldMessageRecognitionOn() ? sourceUuidsOfMessage(message) : [];
}
//@ chunk-0yw3taqg.js:57194-57244 placement
function heldMessageUuidSet(messages) {
  return new Set([...messages].flatMap(sourceUuidsOfMessage));
}
//@ chunk-0yw3taqg.js:57244-57336 placement
function sourceUuidsOfMessage(message) {
  let sourceUuid = getSourceUuid(message);
  if (sourceUuid) return [sourceUuid];
  return message.type === "user" ? filterUuidList(message.mergedSendUuids) : [];
}
//@ chunk-0yw3taqg.js:57336-57377 placement
function heldUuidsIfEnabled(messages) {
  return isHeldMessageRecognitionOn() ? heldMessageUuidSet(messages) : new Set();
}
//@ chunk-0yw3taqg.js:57377-57687 placement
function mergedMessageUuids(messages, uuid) {
  let index = messages.findIndex((message) => message.uuid === uuid);
  if (index === -1 || !isHeldMessageRecognitionOn()) return [uuid];
  let message = messages[index];
  return [
    ...(message.isMeta === true ? [] : sourceUuidsOfMessage(message)),
    uuid,
    ...messages
      .slice(index + 1)
      .flatMap((message) =>
        typeof message.attachment === "object" &&
        message.attachment !== null &&
        Reflect.get(message.attachment, "commandMode") === "prompt" &&
        Reflect.get(message.attachment, "isMeta") !== true
          ? sourceUuidsOfMessage(message)
          : [],
      ),
  ];
}
//@ chunk-0yw3taqg.js:57687-57806 placement
function findMessageIndex(messages, uuid, enabled = isHeldMessageRecognitionOn()) {
  let index = messages.findIndex((message) => message.uuid === uuid);
  return index !== -1 || !enabled
    ? index
    : messages.findLastIndex((message) => sourceUuidsOfMessage(message).includes(uuid));
}
//@ chunk-0yw3taqg.js:57842-57852 placement
var MAX_HELD_MESSAGES = 64;
export {
  heldUuidsIfEnabled,
  isSelfHostedHeldRecognition,
  MAX_HELD_MESSAGES,
  findMessageIndex,
  heldMessageUuidSet,
  isHeldMessageRecognitionOn,
  heldMessageUuids,
  mergedMessageUuids,
};
