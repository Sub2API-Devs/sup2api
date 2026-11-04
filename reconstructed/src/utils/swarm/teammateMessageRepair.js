/**
 * utils/swarm/teammateMessageRepair.ts
 *
 * 2.1.316 新增：SendMessage 输入修复与邮箱去重
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nw7jbebs.js (22)
 * attribution: placement 22
 */
import { isPlainObject } from "../isPlainObject.js";
import { getFirstLine, truncateToLength } from "../stringUtils.js";
import { SUMMARY_MAX_CHARS } from "../../tools/SendMessageTool/constants.js";
import { jsonParse } from "../slowOperations.js";
import { identity } from "../identity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, _enum, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../json.js";
import { storageSpaceId } from "../storage/storageSpaces.js";
import { swarmHostState } from "./hostState.js";
import { slugifySessionName } from "../sessionAddresses.js";
import { TEAM_LEAD, USER, SYSTEM } from "./constants.js";
import { notifyTasksUpdated } from "../tasks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nw7jbebs.js:1466-1723 placement
var SEND_MESSAGE_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANTML;
var SUMMARY_CLOSE_TAG;
var BARE_MESSAGE_PARAM;
var NAMESPACED_MESSAGE_PARAM;
var regExp;
deferInit("chunk-nw7jbebs.js:1466", () => {
  SEND_MESSAGE_FIELDS = new Set(["to", "summary", "message", "notify_when_idle"]);
  ANTML = "antml:";
  SUMMARY_CLOSE_TAG = "</summary>";
  BARE_MESSAGE_PARAM = '<parameter name="message">';
  NAMESPACED_MESSAGE_PARAM = `<${ANTML}parameter name="message">`;
  regExp = new RegExp(
    `<(?:${ANTML})?parameter\\b|</(?:${ANTML})?(?:parameter|invoke|function_calls|message)>`,
  );
});
//@ chunk-nw7jbebs.js:1723-1807 placement
function splitRepairedMessage(input) {
  let repaired = repairSendMessageInput(input);
  return repaired !== undefined && repaired.unrepaired === undefined ? repaired.split : undefined;
}
//@ chunk-nw7jbebs.js:1807-2407 placement
function repairSendMessageInput(input) {
  if (!isPlainObject(input)) return;
  let { message, summary } = input;
  if (
    typeof input.to !== "string" ||
    (message !== undefined && message !== null) ||
    typeof summary !== "string" ||
    !Object.keys(input).every((key) => SEND_MESSAGE_FIELDS.has(key))
  )
    return;
  let index = summary.indexOf(SUMMARY_CLOSE_TAG);
  while (index !== -1) {
    let afterClose = index + SUMMARY_CLOSE_TAG.length;
    while (afterClose < summary.length && /\s/.test(summary.charAt(afterClose))) afterClose++;
    let openerForm = summary.startsWith(NAMESPACED_MESSAGE_PARAM, afterClose)
      ? "namespaced"
      : summary.startsWith(BARE_MESSAGE_PARAM, afterClose)
        ? "bare"
        : undefined;
    if (openerForm !== undefined) {
      let opener = openerForm === "namespaced" ? NAMESPACED_MESSAGE_PARAM : BARE_MESSAGE_PARAM;
      let messageText = summary.slice(afterClose + opener.length).trimEnd();
      if (messageText.trim().length === 0) return;
      return {
        split: {
          summary: summary.slice(0, index).trim(),
          message: messageText,
          openerForm,
        },
        unrepaired: regExp.test(messageText)
          ? "markup"
          : looksLikeJsonPayload(messageText)
            ? "json"
            : undefined,
      };
    }
    index = summary.indexOf(SUMMARY_CLOSE_TAG, index + SUMMARY_CLOSE_TAG.length);
  }
  return;
}
//@ chunk-nw7jbebs.js:2407-3132 placement
/**
 * 修复模型把 summary 等字段混进 message 的 SendMessage 输入，必要时拆分。
 */
function normalizeSendMessageInput(input, { applySplit = true } = {}) {
  if (!isPlainObject(input)) return null;
  let { message, summary } = input;
  let changes = [];
  let repaired = repairSendMessageInput(input);
  let split = repaired?.unrepaired === undefined ? repaired?.split : undefined;
  if (split !== undefined && applySplit) {
    message = split.message;
    summary = split.summary;
    changes.push(`split_slipped_summary_${split.openerForm}`);
  }
  if (typeof message === "string" && (typeof summary !== "string" || summary.trim().length === 0)) {
    let trimmed = getFirstLine(message.trim()).trim();
    if (trimmed.length > 0) {
      summary = trimmed;
      changes.push("derive_summary");
    }
  }
  if (typeof summary === "string" && summary.length > SUMMARY_MAX_CHARS) {
    summary = truncateToLength(summary, SUMMARY_MAX_CHARS - 1) + "\u2026";
    changes.push("truncate_summary");
  }
  let [firstChange] = changes;
  let shapeClass =
    repaired?.unrepaired !== undefined
      ? `split_slipped_summary_${repaired.split.openerForm}_unrepaired_${repaired.unrepaired}`
      : split !== undefined && !applySplit
        ? `split_slipped_summary_${split.openerForm}_detect_only`
        : firstChange;
  if (shapeClass === undefined) return null;
  return {
    input: {
      ...input,
      ...(message !== undefined && {
        message,
      }),
      summary,
    },
    shapeClass,
  };
}
//@ chunk-nw7jbebs.js:3132-3282 placement
function looksLikeJsonPayload(text) {
  let trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    let parsed = jsonParse(trimmed);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}
//@ chunk-nw7jbebs.js:3282-3400 placement
var repairedMessageCache; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REPAIR_CACHE;
var shutdownResponseSchema;
deferInit("chunk-nw7jbebs.js:3282", () => {
  repairedMessageCache = identity(new Map(), (cache) => cache.clear());
  MAX_REPAIR_CACHE = 64;
  shutdownResponseSchema = DoctorLazy(() =>
    objectSchema({
      type: _enum(["shutdown_approved", "shutdown_rejected"]),
      requestId: stringSchema(),
    }),
  );
});
//@ chunk-nw7jbebs.js:3400-3477 placement
function rememberRepair(requestId, fingerprint) {
  repairedMessageCache.set(requestId, fingerprint);
  if (repairedMessageCache.size > MAX_REPAIR_CACHE)
    repairedMessageCache.delete(repairedMessageCache.keys().next().value ?? requestId);
}
//@ chunk-nw7jbebs.js:3477-3527 placement
function wasRepaired(requestId, fingerprint) {
  return fingerprint !== undefined && repairedMessageCache.get(requestId) === fingerprint;
}
//@ chunk-nw7jbebs.js:3527-3555 placement
function forgetRepair(requestId) {
  repairedMessageCache.delete(requestId);
}
//@ chunk-nw7jbebs.js:3555-3749 placement
function scanRepairs(unread) {
  if (repairedMessageCache.size === 0) return;
  for (let message of unread) {
    let text = message?.text;
    if (typeof text !== "string" || !text.includes('"shutdown_')) continue;
    let parsed = shutdownResponseSchema().safeParse(safeParseJSON(text));
    if (parsed.success) repairedMessageCache.delete(parsed.data.requestId);
  }
}
//@ chunk-nw7jbebs.js:3749-3823 placement
function internMailboxKey(key) {
  let frozenKey = freezeDefinedFields(key);
  return internFrozenTag(`\x00k${storageSpaceId(frozenKey)}`, {
    at: "store",
    key: frozenKey,
  });
}
//@ chunk-nw7jbebs.js:3823-3924 placement
function mailboxKeyOf(input, fromString, fromKey) {
  if (typeof input === "string") return fromString(input);
  let keyObject = fromKey(input.key);
  return keyObject === undefined ? undefined : internMailboxKey(keyObject);
}
//@ chunk-nw7jbebs.js:3924-4019 placement = propagateAbort (1)
var internedFrozenTagCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var finalizationRegistry;
deferInit("chunk-nw7jbebs.js:3924", () => {
  internedFrozenTagCache = new Map();
  finalizationRegistry = new FinalizationRegistry((tagKey) => {
    if (internedFrozenTagCache.get(tagKey)?.deref() === undefined) internedFrozenTagCache.delete(tagKey);
  });
});
//@ chunk-nw7jbebs.js:4019-4178 placement
function internFrozenTag(tagKey, fields) {
  let existing = internedFrozenTagCache.get(tagKey)?.deref();
  if (existing !== undefined) return existing;
  let frozen = Object.freeze({
    ...fields,
    toString: () => tagKey,
  });
  internedFrozenTagCache.set(tagKey, new WeakRef(frozen));
  finalizationRegistry.register(frozen, tagKey);
  return frozen;
}
//@ chunk-nw7jbebs.js:4178-4339 placement
function freezeDefinedFields(record) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, Array.isArray(value) ? Object.freeze([...value]) : value]),
    ),
  );
}
//@ chunk-nw7jbebs.js:4339-4379 placement
function mailboxLedger() {
  return swarmHostState().mailbox.ledger;
}
//@ chunk-nw7jbebs.js:4379-4463 placement
function findTeammateByName(name, roster) {
  let slug = slugifySessionName(name);
  return Object.values(roster ?? {}).find((member) => slugifySessionName(member.name) === slug);
}
//@ chunk-nw7jbebs.js:4463-4718 placement
function hasPaneTeammates(name, options) {
  if (options.isPaneTeammate) return false;
  if (!Object.values(options.roster ?? {}).some((member) => member.tmuxPaneId === "leader")) return false;
  let slug = slugifySessionName(name);
  if (slug === TEAM_LEAD || slug === USER || slug === SYSTEM) return true;
  let teammateByName = findTeammateByName(name, options.roster);
  return teammateByName?.tmuxPaneId === "in-process" || teammateByName?.tmuxPaneId === "leader";
}
//@ chunk-nw7jbebs.js:4718-4951 placement
function dedupeMailboxMessages(messages, inboxPath, options) {
  let ledger = mailboxLedger();
  let seenIds = new Set();
  let provenance = new Map();
  for (let message of messages)
    if (
      message.msg_id !== undefined &&
      !seenIds.has(message.msg_id) &&
      ledger.wrote(inboxPath, message) &&
      message.msg_id !== undefined
    ) {
      seenIds.add(message.msg_id);
      provenance.set(message, "verified");
    } else provenance.set(message, hasPaneTeammates(message.from, options) ? "forged" : "unverifiable");
  return provenance;
}
//@ chunk-nw7jbebs.js:5062-5156 placement
function setLeaderTeamName(teamName) {
  if (swarmHostState().taskList.leaderTeamName === teamName) return;
  swarmHostState().taskList.leaderTeamName = teamName;
  notifyTasksUpdated();
}
//@ chunk-nw7jbebs.js:5156-5248 placement
function setSessionListId(sessionListId) {
  if (swarmHostState().taskList.sessionListId === sessionListId) return;
  swarmHostState().taskList.sessionListId = sessionListId;
  notifyTasksUpdated();
}
//@ chunk-nw7jbebs.js:5248-5306 placement
function onTaskListUpdated(listener) {
  return swarmHostState().taskList.updated.subscribe(listener);
}
export {
  onTaskListUpdated,
  normalizeSendMessageInput,
  rememberRepair,
  splitRepairedMessage,
  wasRepaired,
  forgetRepair,
  dedupeMailboxMessages,
  setSessionListId,
  setLeaderTeamName,
  findTeammateByName,
  mailboxKeyOf,
  internMailboxKey,
  mailboxLedger,
  scanRepairs,
};
