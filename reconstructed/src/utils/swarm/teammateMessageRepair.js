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
import { u, _enum, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../json.js";
import { storageSpaceId } from "../storage/storageSpaces.js";
import { swarmHostState } from "./hostState.js";
import { slugifySessionName } from "../sessionAddresses.js";
import { TEAM_LEAD, USER, SYSTEM } from "./constants.js";
import { notifyTasksUpdated } from "../tasks.js";

//@ chunk-nw7jbebs.js:1466-1723 placement
var SEND_MESSAGE_FIELDS = new Set(["to", "summary", "message", "notify_when_idle"]);
var ANTML = "antml:";
var SUMMARY_CLOSE_TAG = "</summary>";
var BARE_MESSAGE_PARAM = '<parameter name="message">';
var NAMESPACED_MESSAGE_PARAM = `<${ANTML}parameter name="message">`;
var regExp = new RegExp(
  `<(?:${ANTML})?parameter\\b|</(?:${ANTML})?(?:parameter|invoke|function_calls|message)>`,
);
//@ chunk-nw7jbebs.js:1723-1807 placement
function splitRepairedMessage(e) {
  let n = repairSendMessageInput(e);
  return n !== undefined && n.unrepaired === undefined ? n.split : undefined;
}
//@ chunk-nw7jbebs.js:1807-2407 placement
function repairSendMessageInput(e) {
  if (!isPlainObject(e)) return;
  let { message, summary } = e;
  if (
    typeof e.to !== "string" ||
    (message !== undefined && message !== null) ||
    typeof summary !== "string" ||
    !Object.keys(e).every((key) => SEND_MESSAGE_FIELDS.has(key))
  )
    return;
  let index = summary.indexOf(SUMMARY_CLOSE_TAG);
  while (index !== -1) {
    let c = index + SUMMARY_CLOSE_TAG.length;
    while (c < summary.length && /\s/.test(summary.charAt(c))) c++;
    let y = summary.startsWith(NAMESPACED_MESSAGE_PARAM, c)
      ? "namespaced"
      : summary.startsWith(BARE_MESSAGE_PARAM, c)
        ? "bare"
        : undefined;
    if (y !== undefined) {
      let a = y === "namespaced" ? NAMESPACED_MESSAGE_PARAM : BARE_MESSAGE_PARAM;
      let h = summary.slice(c + a.length).trimEnd();
      if (h.trim().length === 0) return;
      return {
        split: {
          summary: summary.slice(0, index).trim(),
          message: h,
          openerForm: y,
        },
        unrepaired: regExp.test(h) ? "markup" : looksLikeJsonPayload(h) ? "json" : undefined,
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
function normalizeSendMessageInput(e, { applySplit: n = true } = {}) {
  if (!isPlainObject(e)) return null;
  let { message, summary } = e;
  let c = [];
  let y = repairSendMessageInput(e);
  let split = y?.unrepaired === undefined ? y?.split : undefined;
  if (split !== undefined && n) {
    message = split.message;
    summary = split.summary;
    c.push(`split_slipped_summary_${split.openerForm}`);
  }
  if (typeof message === "string" && (typeof summary !== "string" || summary.trim().length === 0)) {
    let trimmed = getFirstLine(message.trim()).trim();
    if (trimmed.length > 0) {
      summary = trimmed;
      c.push("derive_summary");
    }
  }
  if (typeof summary === "string" && summary.length > SUMMARY_MAX_CHARS) {
    summary = truncateToLength(summary, SUMMARY_MAX_CHARS - 1) + "\u2026";
    c.push("truncate_summary");
  }
  let [h] = c;
  let b =
    y?.unrepaired !== undefined
      ? `split_slipped_summary_${y.split.openerForm}_unrepaired_${y.unrepaired}`
      : split !== undefined && !n
        ? `split_slipped_summary_${split.openerForm}_detect_only`
        : h;
  if (b === undefined) return null;
  return {
    input: {
      ...e,
      ...(message !== undefined && {
        message,
      }),
      summary,
    },
    shapeClass: b,
  };
}
//@ chunk-nw7jbebs.js:3132-3282 placement
function looksLikeJsonPayload(e) {
  let trimmed = e.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    let r = jsonParse(trimmed);
    return typeof r === "object" && r !== null;
  } catch {
    return false;
  }
}
//@ chunk-nw7jbebs.js:3282-3400 placement
var repairedMessageCache = identity(new Map(), (e) => e.clear());
var MAX_REPAIR_CACHE = 64;
var shutdownResponseSchema = DoctorLazy(() =>
  u({
    type: _enum(["shutdown_approved", "shutdown_rejected"]),
    requestId: string(),
  }),
);
//@ chunk-nw7jbebs.js:3400-3477 placement
function rememberRepair(requestId, n) {
  repairedMessageCache.set(requestId, n);
  if (repairedMessageCache.size > MAX_REPAIR_CACHE)
    repairedMessageCache.delete(repairedMessageCache.keys().next().value ?? requestId);
}
//@ chunk-nw7jbebs.js:3477-3527 placement
function wasRepaired(requestId, n) {
  return n !== undefined && repairedMessageCache.get(requestId) === n;
}
//@ chunk-nw7jbebs.js:3527-3555 placement
function forgetRepair(requestId) {
  repairedMessageCache.delete(requestId);
}
//@ chunk-nw7jbebs.js:3555-3749 placement
function scanRepairs(unread) {
  if (repairedMessageCache.size === 0) return;
  for (let n of unread) {
    let text = n?.text;
    if (typeof text !== "string" || !text.includes('"shutdown_')) continue;
    let s = shutdownResponseSchema().safeParse(safeParseJSON(text));
    if (s.success) repairedMessageCache.delete(s.data.requestId);
  }
}
//@ chunk-nw7jbebs.js:3749-3823 placement
function internMailboxKey(e) {
  let n = freezeDefinedFields(e);
  return internFrozenTag(`\x00k${storageSpaceId(n)}`, {
    at: "store",
    key: n,
  });
}
//@ chunk-nw7jbebs.js:3823-3924 placement
function mailboxKeyOf(e, n, r) {
  if (typeof e === "string") return n(e);
  let s = r(e.key);
  return s === undefined ? undefined : internMailboxKey(s);
}
//@ chunk-nw7jbebs.js:3924-4019 placement = propagateAbort (1)
var internedFrozenTagCache = new Map();
var finalizationRegistry = new FinalizationRegistry((e) => {
  if (internedFrozenTagCache.get(e)?.deref() === undefined) internedFrozenTagCache.delete(e);
});
//@ chunk-nw7jbebs.js:4019-4178 placement
function internFrozenTag(e, n) {
  let r = internedFrozenTagCache.get(e)?.deref();
  if (r !== undefined) return r;
  let s = Object.freeze({
    ...n,
    toString: () => e,
  });
  internedFrozenTagCache.set(e, new WeakRef(s));
  finalizationRegistry.register(s, e);
  return s;
}
//@ chunk-nw7jbebs.js:4178-4339 placement
function freezeDefinedFields(e) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(e)
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
function findTeammateByName(e, roster) {
  let r = slugifySessionName(e);
  return Object.values(roster ?? {}).find((s) => slugifySessionName(s.name) === r);
}
//@ chunk-nw7jbebs.js:4463-4718 placement
function hasPaneTeammates(from, n) {
  if (n.isPaneTeammate) return false;
  if (!Object.values(n.roster ?? {}).some((a) => a.tmuxPaneId === "leader")) return false;
  let s = slugifySessionName(from);
  if (s === TEAM_LEAD || s === USER || s === SYSTEM) return true;
  let teammateByName = findTeammateByName(from, n.roster);
  return teammateByName?.tmuxPaneId === "in-process" || teammateByName?.tmuxPaneId === "leader";
}
//@ chunk-nw7jbebs.js:4718-4951 placement
function dedupeMailboxMessages(e, inboxPath, r) {
  let s = mailboxLedger();
  let c = new Set();
  let y = new Map();
  for (let a of e)
    if (a.msg_id !== undefined && !c.has(a.msg_id) && s.wrote(inboxPath, a) && a.msg_id !== undefined) {
      c.add(a.msg_id);
      y.set(a, "verified");
    } else y.set(a, hasPaneTeammates(a.from, r) ? "forged" : "unverifiable");
  return y;
}
//@ chunk-nw7jbebs.js:5062-5156 placement
function setLeaderTeamName(e) {
  if (swarmHostState().taskList.leaderTeamName === e) return;
  swarmHostState().taskList.leaderTeamName = e;
  notifyTasksUpdated();
}
//@ chunk-nw7jbebs.js:5156-5248 placement
function setSessionListId(sessionListId) {
  if (swarmHostState().taskList.sessionListId === sessionListId) return;
  swarmHostState().taskList.sessionListId = sessionListId;
  notifyTasksUpdated();
}
//@ chunk-nw7jbebs.js:5248-5306 placement
function onTaskListUpdated(e) {
  return swarmHostState().taskList.updated.subscribe(e);
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
