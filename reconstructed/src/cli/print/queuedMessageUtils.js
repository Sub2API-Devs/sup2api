/**
 * cli/print/queuedMessageUtils.ts
 *
 * 2.1.316 新增：暂存消息识别与合并消息 uuid 查找
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (9)
 * attribution: placement 9
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { HELD_MESSAGE_FLAGS, TENGU_SNAPPY_SUNRISE_KILLSWITCH } from "./sessionNotices.js";
import { logError } from "../../utils/log.js";
import { isSelfHostedRemoteEnvironment } from "../../utils/remoteEnvironment.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getSourceUuid, filterUuidList } from "../queuedCommands.js";

//@ chunk-tyg7f3ek.js:38353-38476 placement
function isHeldMessageRecognitionOn() {
  try {
    if (env.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION) return !1;
    return getFeatureValue_CACHED_MAY_BE_STALE(HELD_MESSAGE_FLAGS, !1) === !0;
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-tyg7f3ek.js:38476-38600 placement
function isSelfHostedHeldRecognition() {
  try {
    return (
      isSelfHostedRemoteEnvironment() &&
      !env.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION &&
      !readFlagWithOverride(TENGU_SNAPPY_SUNRISE_KILLSWITCH, { safe: !1 })
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-tyg7f3ek.js:38600-38636 placement
function heldMessageUuids(e) {
  return isHeldMessageRecognitionOn() ? Bc(e) : [];
}
//@ chunk-tyg7f3ek.js:38636-38686 placement
function heldMessageUuidSet(e) {
  return new Set([...e].flatMap(Bc));
}
//@ chunk-tyg7f3ek.js:38686-38778 placement
function Bc(e) {
  let n = getSourceUuid(e);
  if (n) return [n];
  return e.type === "user" ? filterUuidList(e.mergedSendUuids) : [];
}
//@ chunk-tyg7f3ek.js:38778-38819 placement
function heldUuidsIfEnabled(e) {
  return isHeldMessageRecognitionOn() ? heldMessageUuidSet(e) : new Set();
}
//@ chunk-tyg7f3ek.js:38819-39129 placement
function mergedMessageUuids(e, n) {
  let index = e.findIndex((h) => h.uuid === n);
  if (index === -1 || !isHeldMessageRecognitionOn()) return [n];
  let s = e[index];
  return [
    ...(s.isMeta === !0 ? [] : Bc(s)),
    n,
    ...e
      .slice(index + 1)
      .flatMap((h) =>
        typeof h.attachment === "object" &&
        h.attachment !== null &&
        Reflect.get(h.attachment, "commandMode") === "prompt" &&
        Reflect.get(h.attachment, "isMeta") !== !0
          ? Bc(h)
          : [],
      ),
  ];
}
//@ chunk-tyg7f3ek.js:39129-39248 placement
function findMessageIndex(e, n, r = isHeldMessageRecognitionOn()) {
  let index = e.findIndex((h) => h.uuid === n);
  return index !== -1 || !r ? index : e.findLastIndex((h) => Bc(h).includes(n));
}
//@ chunk-tyg7f3ek.js:39284-39294 placement
var MAX_HELD_MESSAGES = 64;

export {
  heldUuidsIfEnabled,
  isSelfHostedHeldRecognition,
  mergedMessageUuids,
  MAX_HELD_MESSAGES,
  findMessageIndex,
  heldMessageUuidSet,
  isHeldMessageRecognitionOn,
  heldMessageUuids,
};
