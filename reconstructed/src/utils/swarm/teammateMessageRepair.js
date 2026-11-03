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
import { ge } from "../identity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../json.js";
import { FMt } from "../storage/storageSpaces.js";
import { ci } from "./hostState.js";
import { slugifySessionName } from "../sessionAddresses.js";
import { TEAM_LEAD, USER, SYSTEM } from "./constants.js";
import { notifyTasksUpdated } from "../tasks.js";

//@ chunk-nw7jbebs.js:1466-1723 placement
var SEND_MESSAGE_FIELDS = new Set(["to", "summary", "message", "notify_when_idle"]),
  ANTML = "antml:",
  me = "</summary>",
  Fe = '<parameter name="message">',
  Ne = `<${ANTML}parameter name="message">`,
  regExp = new RegExp(
    `<(?:${ANTML})?parameter\\b|</(?:${ANTML})?(?:parameter|invoke|function_calls|message)>`,
  );
//@ chunk-nw7jbebs.js:1723-1807 placement
function splitRepairedMessage(e) {
  let n = repairSendMessageInput(e);
  return n !== void 0 && n.unrepaired === void 0 ? n.split : void 0;
}
//@ chunk-nw7jbebs.js:1807-2407 placement
function repairSendMessageInput(e) {
  if (!isPlainObject(e)) return;
  let { message: message, summary: summary } = e;
  if (
    typeof e.to !== "string" ||
    (message !== void 0 && message !== null) ||
    typeof summary !== "string" ||
    !Object.keys(e).every((c) => SEND_MESSAGE_FIELDS.has(c))
  )
    return;
  let index = summary.indexOf(me);
  while (index !== -1) {
    let c = index + me.length;
    while (c < summary.length && /\s/.test(summary.charAt(c))) c++;
    let y = summary.startsWith(Ne, c) ? "namespaced" : summary.startsWith(Fe, c) ? "bare" : void 0;
    if (y !== void 0) {
      let a = y === "namespaced" ? Ne : Fe,
        trimEnd = summary.slice(c + a.length).trimEnd();
      if (trimEnd.trim().length === 0) return;
      return {
        split: { summary: summary.slice(0, index).trim(), message: trimEnd, openerForm: y },
        unrepaired: regExp.test(trimEnd) ? "markup" : looksLikeJsonPayload(trimEnd) ? "json" : void 0,
      };
    }
    index = summary.indexOf(me, index + me.length);
  }
  return;
}
/**
 * 修复模型把 summary 等字段混进 message 的 SendMessage 输入，必要时拆分。
 */
//@ chunk-nw7jbebs.js:2407-3132 placement
function normalizeSendMessageInput(e, { applySplit: n = !0 } = {}) {
  if (!isPlainObject(e)) return null;
  let { message: message, summary: summary } = e,
    c = [],
    y = repairSendMessageInput(e),
    a = y?.unrepaired === void 0 ? y?.split : void 0;
  if (a !== void 0 && n)
    ((message = a.message), (summary = a.summary), c.push(`split_slipped_summary_${a.openerForm}`));
  if (typeof message === "string" && (typeof summary !== "string" || summary.trim().length === 0)) {
    let trimmed = getFirstLine(message.trim()).trim();
    if (trimmed.length > 0) ((summary = trimmed), c.push("derive_summary"));
  }
  if (typeof summary === "string" && summary.length > SUMMARY_MAX_CHARS)
    ((summary = truncateToLength(summary, SUMMARY_MAX_CHARS - 1) + "\u2026"), c.push("truncate_summary"));
  let [h] = c,
    b =
      y?.unrepaired !== void 0
        ? `split_slipped_summary_${y.split.openerForm}_unrepaired_${y.unrepaired}`
        : a !== void 0 && !n
          ? `split_slipped_summary_${a.openerForm}_detect_only`
          : h;
  if (b === void 0) return null;
  return {
    input: { ...e, ...(message !== void 0 && { message: message }), summary: summary },
    shapeClass: b,
  };
}
//@ chunk-nw7jbebs.js:3132-3282 placement
function looksLikeJsonPayload(e) {
  let trimmed = e.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return !1;
  try {
    let r = jsonParse(trimmed);
    return typeof r === "object" && r !== null;
  } catch {
    return !1;
  }
}
//@ chunk-nw7jbebs.js:3282-3400 placement
var repairedMessageCache = ge(new Map(), (e) => e.clear()),
  MAX_REPAIR_CACHE = 64,
  shutdownResponseSchema = DoctorLazy(() =>
    u({ type: U(["shutdown_approved", "shutdown_rejected"]), requestId: o() }),
  );
//@ chunk-nw7jbebs.js:3400-3477 placement
function rememberRepair(e, n) {
  if ((repairedMessageCache.set(e, n), repairedMessageCache.size > MAX_REPAIR_CACHE))
    repairedMessageCache.delete(repairedMessageCache.keys().next().value ?? e);
}
//@ chunk-nw7jbebs.js:3477-3527 placement
function wasRepaired(e, n) {
  return n !== void 0 && repairedMessageCache.get(e) === n;
}
//@ chunk-nw7jbebs.js:3527-3555 placement
function forgetRepair(e) {
  repairedMessageCache.delete(e);
}
//@ chunk-nw7jbebs.js:3555-3749 placement
function scanRepairs(e) {
  if (repairedMessageCache.size === 0) return;
  for (let n of e) {
    let r = n?.text;
    if (typeof r !== "string" || !r.includes('"shutdown_')) continue;
    let safeParse = shutdownResponseSchema().safeParse(safeParseJSON(r));
    if (safeParse.success) repairedMessageCache.delete(safeParse.data.requestId);
  }
}
//@ chunk-nw7jbebs.js:3749-3823 placement
function internMailboxKey(e) {
  let n = freezeDefinedFields(e);
  return internFrozenTag(`\x00k${FMt(n)}`, { at: "store", key: n });
}
//@ chunk-nw7jbebs.js:3823-3924 placement
function mailboxKeyOf(e, n, r) {
  if (typeof e === "string") return n(e);
  let s = r(e.key);
  return s === void 0 ? void 0 : internMailboxKey(s);
}
//@ chunk-nw7jbebs.js:3924-4019 placement = propagateAbort (1)
var ye = new Map(),
  finalizationRegistry = new FinalizationRegistry((e) => {
    if (ye.get(e)?.deref() === void 0) ye.delete(e);
  });
//@ chunk-nw7jbebs.js:4019-4178 placement
function internFrozenTag(e, n) {
  let r = ye.get(e)?.deref();
  if (r !== void 0) return r;
  let freeze = Object.freeze({ ...n, toString: () => e });
  return (ye.set(e, new WeakRef(freeze)), finalizationRegistry.register(freeze, e), freeze);
}
//@ chunk-nw7jbebs.js:4178-4339 placement
function freezeDefinedFields(e) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(e)
        .filter(([, n]) => n !== void 0)
        .map(([n, r]) => [n, Array.isArray(r) ? Object.freeze([...r]) : r]),
    ),
  );
}
//@ chunk-nw7jbebs.js:4339-4379 placement
function mailboxLedger() {
  return ci().mailbox.ledger;
}
//@ chunk-nw7jbebs.js:4379-4463 placement
function findTeammateByName(e, n) {
  let r = slugifySessionName(e);
  return Object.values(n ?? {}).find((s) => slugifySessionName(s.name) === r);
}
//@ chunk-nw7jbebs.js:4463-4718 placement
function hasPaneTeammates(e, n) {
  if (n.isPaneTeammate) return !1;
  if (!Object.values(n.roster ?? {}).some((a) => a.tmuxPaneId === "leader")) return !1;
  let s = slugifySessionName(e);
  if (s === TEAM_LEAD || s === USER || s === SYSTEM) return !0;
  let y = findTeammateByName(e, n.roster);
  return y?.tmuxPaneId === "in-process" || y?.tmuxPaneId === "leader";
}
//@ chunk-nw7jbebs.js:4718-4951 placement
function dedupeMailboxMessages(e, n, r) {
  let s = mailboxLedger(),
    c = new Set(),
    y = new Map();
  for (let a of e)
    if (a.msg_id !== void 0 && !c.has(a.msg_id) && s.wrote(n, a) && a.msg_id !== void 0)
      (c.add(a.msg_id), y.set(a, "verified"));
    else y.set(a, hasPaneTeammates(a.from, r) ? "forged" : "unverifiable");
  return y;
}
//@ chunk-nw7jbebs.js:5062-5156 placement
function setLeaderTeamName(e) {
  if (ci().taskList.leaderTeamName === e) return;
  ((ci().taskList.leaderTeamName = e), notifyTasksUpdated());
}
//@ chunk-nw7jbebs.js:5156-5248 placement
function setSessionListId(e) {
  if (ci().taskList.sessionListId === e) return;
  ((ci().taskList.sessionListId = e), notifyTasksUpdated());
}
//@ chunk-nw7jbebs.js:5248-5306 placement
function onTaskListUpdated(e) {
  return ci().taskList.updated.subscribe(e);
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
