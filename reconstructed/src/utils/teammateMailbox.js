/**
 * utils/teammateMailbox.ts
 *
 * teammate 文件信箱：inbox 路径与锁、读/写/标记已读/清空、消息校验与修剪、各类结构化协议帧（权限、沙箱、计划审批、关机、空闲通知等）的构造与识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teammateMailbox.ts
 * pieces: chunk-nw7jbebs.js (101)
 * attribution: callgraph-witnessed 1, layout 29, facade-exports 69, fingerprint 2
 */
import { join, join as join_2 } from "path";
import { logError } from "./log.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { kt, o, M, u, T, U, Ir, pe, oe, A } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { ci } from "./swarm/hostState.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isSyscallError,
} from "./errors.js";
import { logForDebugging } from "./debug.js";
import { isDiskless } from "../bootstrap/state.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { lock, releaseLockQuietly } from "./lockfile.js";
import { getFileReader } from "./fileStore.js";
import { getTeamName } from "./teammate.js";
import { sanitizePathComponent } from "./tasks.js";
import { getTeamsDir } from "./envUtils.js";
import { isValidKeySegment, STORAGE_SPACES } from "./storage/storageSpaces.js";
import {
  internMailboxKey,
  mailboxLedger,
  scanRepairs,
  splitRepairedMessage,
} from "./swarm/teammateMessageRepair.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { createMessageEnvelope } from "./udsMessaging/messageEnvelope.js";
import { count } from "./collections.js";
import { isAgentColorName } from "../tools/AgentTool/agentColorManager.js";
import { escapeXmlAttr } from "./xml.js";
import { aIt, MAIN } from "./sessionPeers.js";
import { TEAMMATE_MESSAGE } from "../constants/xml.js";
import { wrapPeerMessage } from "./crossSessionMessages.js";
import { getFirstLine, truncateToLength, toWellFormedString } from "./stringUtils.js";
import { SENDMESSAGE } from "../tools/SendMessageTool/constants.js";
import { isPlainObject } from "./isPlainObject.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { externalPermissionModeSchema } from "./permissions/browserToolNames.js";
import { TEAM_LEAD } from "./swarm/constants.js";

/**
 * inbox 文件锁参数，以及 inbox 消息 schema（from、text、timestamp 必填；type、read、color、summary、from_plugin 可选）。
 */
//@ chunk-nw7jbebs.js:20333-20574 callgraph-witnessed = LOCK_OPTIONS (0.648)
var LOCK_OPTIONS = {
    retries: { retries: 10, minTimeout: 5, maxTimeout: 100 },
    onCompromised: (e) => logError(e),
  },
  mailboxMessageSchema = DoctorLazy(() =>
    kt({
      type: o().optional(),
      from: o(),
      text: o(),
      timestamp: o(),
      read: M().optional(),
      color: o().optional(),
      summary: o().optional(),
      from_plugin: o().optional(),
    }),
  );
/**
 * 描述 schema 校验失败的字段（字段:错误码:实际类型）。
 */
//@ chunk-nw7jbebs.js:20574-20899 layout
function describeSchemaIssues(entry, issues) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry))
    return `entry is ${entry === null ? "null" : Array.isArray(entry) ? "an array" : typeof entry}`;
  return issues
    .map((r) => {
      let s = r.path[0],
        c = typeof s === "string" ? s : String(s),
        y = entry[c],
        a = y === void 0 ? (c in entry ? "undefined" : "missing") : y === null ? "null" : typeof y;
      return `${c}:${r.code}:${a}`;
    })
    .join(", ");
}
//@ chunk-nw7jbebs.js:20899-20918 layout
var MAX_REPORTED_DROPS = 100,
  DROP_REPORT_SAMPLE_CHARS = 2048;
//@ chunk-nw7jbebs.js:20918-21035 layout
function dropReportKey(e, n) {
  try {
    let r = jsonStringify(n);
    return `${e}\x00${r.length}:${r.slice(0, DROP_REPORT_SAMPLE_CHARS)}`;
  } catch {
    return `${e}\x00(unserializable)`;
  }
}
/**
 * 首次见到某条无效 inbox 条目时上报一次（按原因分类）。
 */
//@ chunk-nw7jbebs.js:21035-21735 layout
function reportDroppedEntry(e, n, r) {
  let reportedDroppedEntries = ci().mailbox.reportedDroppedEntries;
  if (reportedDroppedEntries.size >= MAX_REPORTED_DROPS) return !1;
  let c = dropReportKey(e, n);
  if (reportedDroppedEntries.has(c)) return !1;
  reportedDroppedEntries.add(c);
  let y = `[TeammateMailbox] dropped schema-invalid inbox entry (${r})`;
  if (n === null || typeof n !== "object" || Array.isArray(n))
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          y,
          "TeammateMailbox: dropped inbox entry that is not an object",
        ),
      ),
      !0
    );
  let text = n.text;
  if (text === void 0)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        y,
        "TeammateMailbox: dropped inbox entry with missing text",
      ),
    );
  else if (text === null)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        y,
        "TeammateMailbox: dropped inbox entry with null text",
      ),
    );
  else if (typeof text !== "string")
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        y,
        "TeammateMailbox: dropped inbox entry with non-string text",
      ),
    );
  else
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        y,
        "TeammateMailbox: dropped inbox entry failing schema validation",
      ),
    );
  return !0;
}
//@ chunk-nw7jbebs.js:21735-22021 layout
function reportNonArrayInbox(e, n) {
  let reportedDroppedEntries = ci().mailbox.reportedDroppedEntries;
  if (reportedDroppedEntries.size >= MAX_REPORTED_DROPS) return;
  let s = `${e}\x00(not-an-array)`;
  if (reportedDroppedEntries.has(s)) return;
  (reportedDroppedEntries.add(s),
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[TeammateMailbox] inbox file top level is ${n === null ? "null" : typeof n}, expected an array`,
        "TeammateMailbox: inbox file is not an array",
      ),
    ));
}
/**
 * 校验 inbox 内容：非数组整体丢弃；逐条 schema 校验，返回 {valid, droppedCount}。
 */
//@ chunk-nw7jbebs.js:22021-22338 layout
function validateInboxEntries(parsed, inboxPath) {
  if (!Array.isArray(parsed)) return (reportNonArrayInbox(inboxPath, parsed), { valid: [], droppedCount: 1 });
  let r = [],
    s = 0;
  for (let c of parsed) {
    let safeParse = mailboxMessageSchema().safeParse(c);
    if (safeParse.success) r.push(c);
    else {
      s++;
      let a = describeSchemaIssues(c, safeParse.error.issues);
      if (reportDroppedEntry(inboxPath, c, a))
        logForDebugging(`[TeammateMailbox] dropping schema-invalid inbox entry (${a})`, { level: "warn" });
    }
  }
  return { valid: r, droppedCount: s };
}
//@ chunk-nw7jbebs.js:22338-22426 facade-exports
async function flushPendingMailboxPrunes() {
  await Promise.all(Array.from(ci().mailbox.pendingPrunes.values()));
}
//@ chunk-nw7jbebs.js:22426-22552 layout
function schedulePruneInvalidEntries(inboxPath, store, storeKey) {
  let pendingPrunes = ci().mailbox.pendingPrunes;
  if (pendingPrunes.has(inboxPath)) return;
  let c = pruneInvalidMailboxEntries(inboxPath, store, storeKey).finally(() => {
    pendingPrunes.delete(inboxPath);
  });
  pendingPrunes.set(inboxPath, c);
}
/**
 * 无盘会话且没有可用存储时，记录"什么都没读写"并返回 true。
 */
//@ chunk-nw7jbebs.js:22552-22838 layout
function isMailboxUnavailable(storeKey, operation, agentName) {
  if (storeKey !== void 0 || !isDiskless()) return !1;
  return (
    logForDebugging(
      `[TeammateMailbox] ${operation}: nothing read or written for "${agentName}": this session has no disk, and the inbox cannot go to a store (tengu_hover_rest is off, no store was handed in, or the agent or team name is not a valid store key)`,
    ),
    !0
  );
}
/**
 * 加锁重写 inbox，去掉无效条目。
 */
//@ chunk-nw7jbebs.js:22838-23596 facade-exports
async function pruneInvalidMailboxEntries(inboxPath, store, storeKey) {
  if (isStorageV5Enabled() && store !== void 0 && storeKey !== void 0) {
    try {
      let y = await updateInboxInStore(
        store,
        storeKey,
        inboxPath,
        (a) =>
          a.droppedCount === 0 ? { skip: !0, result: 0 } : { messages: a.messages, result: a.droppedCount },
        !1,
      );
      if (y)
        logForDebugging(
          `[TeammateMailbox] pruned ${y} schema-invalid entr${y === 1 ? "y" : "ies"} at ${inboxPath}`,
        );
    } catch (error) {
      logForDebugging(`[TeammateMailbox] invalid-entry prune skipped: ${error}`);
    }
    return;
  }
  if (isDiskless()) return;
  let s = `${inboxPath}.lock`,
    c;
  try {
    c = await lock(inboxPath, { lockfilePath: s, ...LOCK_OPTIONS });
    let read = await getFileReader().read(inboxPath),
      { valid: valid, droppedCount: droppedCount } = validateInboxEntries(jsonParse(read), inboxPath);
    if (droppedCount === 0) {
      reconcileMessageLedger(inboxPath, valid, valid);
      return;
    }
    (await getFileReader().atomicWrite(inboxPath, jsonStringify(valid, null, 2)),
      reconcileMessageLedger(inboxPath, valid, valid),
      logForDebugging(
        `[TeammateMailbox] pruned ${droppedCount} schema-invalid entr${droppedCount === 1 ? "y" : "ies"} at ${inboxPath}`,
      ));
  } catch (error) {
    logForDebugging(`[TeammateMailbox] invalid-entry prune skipped: ${error}`);
  } finally {
    await releaseLockQuietly(c, "[TeammateMailbox] pruneInvalidMailboxEntries");
  }
}
/**
 * inbox 路径：<teams 目录>/<团队>/inboxes/<代理名>.json（团队缺省为当前团队或 default）。
 */
//@ chunk-nw7jbebs.js:23596-23781 facade-exports = getInboxPath (1)
function getInboxPath(agentName, teamName) {
  let team = teamName || getTeamName() || "default",
    safeTeam = sanitizePathComponent(team),
    safeAgentName = sanitizePathComponent(agentName),
    inboxDir = join(getTeamsDir(), safeTeam, "inboxes"),
    fullPath = join(inboxDir, `${safeAgentName}.json`);
  return (
    logForDebugging(`[TeammateMailbox] getInboxPath: agent=${agentName}, team=${team}, fullPath=${fullPath}`),
    fullPath
  );
}
//@ chunk-nw7jbebs.js:23781-23932 fingerprint = ensureInboxDir (0.868)
async function ensureInboxDir(teamName) {
  let team = teamName || getTeamName() || "default",
    safeTeam = sanitizePathComponent(team),
    inboxDir = join(getTeamsDir(), safeTeam, "inboxes");
  (await getFileReader().mkdir(inboxDir),
    logForDebugging(`[TeammateMailbox] Ensured inbox directory: ${inboxDir}`));
}
/**
 * inbox 在存储 v5 中的键（团队名与代理名合法时）。
 */
//@ chunk-nw7jbebs.js:23932-24029 layout
function mailboxStoreKey(agentName, teamName) {
  let r = sanitizePathComponent(teamName || getTeamName() || "default"),
    s = sanitizePathComponent(agentName);
  return isValidKeySegment(r) && isValidKeySegment(s) ? STORAGE_SPACES.mailbox(r, s) : void 0;
}
//@ chunk-nw7jbebs.js:24029-24073 layout
function getMailboxLedgerKey(e, n, r) {
  return isDiskless() ? internMailboxKey(e) : getInboxPath(n, r);
}
/**
 * 解析 inbox 文本为消息列表（可选补 type=message），解析失败标 corrupt。
 */
//@ chunk-nw7jbebs.js:24073-24300 layout
function parseInboxText(text, inboxPath, fillType) {
  let s;
  try {
    s = jsonParse(text);
  } catch {
    return { messages: [], droppedCount: 0, corrupt: !0 };
  }
  let { valid: valid, droppedCount: droppedCount } = validateInboxEntries(s, inboxPath);
  if (fillType) {
    for (let a of valid) if (a.type === void 0) a.type = "message";
  }
  return { messages: valid, droppedCount: droppedCount, corrupt: !1 };
}
/**
 * 在存储 v5 上原子更新 inbox（读-改-写回调），并更新消息 ID 台账。
 */
//@ chunk-nw7jbebs.js:24300-24879 layout
async function updateInboxInStore(store, storeKey, inboxPath, mutate, fillType = !0) {
  let y,
    updateText = await store.updateText(
      storeKey,
      (h) => {
        let b =
            h === void 0 ? { messages: [], droppedCount: 0 } : parseInboxText(h.value, inboxPath, fillType),
          w = mutate({ messages: b.messages, droppedCount: b.droppedCount, found: h !== void 0 });
        return (
          (y = { read: b.messages, remaining: "skip" in w ? b.messages : w.messages }),
          "skip" in w
            ? { skip: !0, result: w.result }
            : { write: jsonStringify(w.messages, null, 2), result: w.result }
        );
      },
      { mode: 438 & ~process.umask() },
    );
  if (!updateText.ok)
    throw (
      logForDebugging(`[TeammateMailbox] inbox update failed: ${formatStorageError(updateText.error)}`, {
        level: "error",
      }),
      Error("teammate inbox storage update failed")
    );
  if (y !== void 0) reconcileMessageLedger(inboxPath, y.read, y.remaining);
  return updateText.value.result;
}
/**
 * 根据读前/写后的消息更新 msg_id 台账（保留仍在 inbox 中的 ID）。
 */
//@ chunk-nw7jbebs.js:24879-25087 layout
function reconcileMessageLedger(inboxPath, before, after) {
  let s = new Set(after),
    c = new Set();
  for (let a of before) if (!s.has(a) && a.msg_id !== void 0) c.add(a.msg_id);
  let y = new Set();
  for (let a of after) if (a.msg_id !== void 0 && !c.has(a.msg_id)) y.add(a.msg_id);
  mailboxLedger().retain(inboxPath, y);
}
/**
 * 读 inbox（存储 v5 或文件），校验并补 type=message；文件不存在/不可解析返回空数组；有无效条目时安排修剪。
 */
//@ chunk-nw7jbebs.js:25087-26110 facade-exports = readMailbox (0.528)
async function readMailbox(agentName, teamName, store, options) {
  let c = isStorageV5Enabled() && store !== void 0 ? mailboxStoreKey(agentName, teamName) : void 0;
  if (isMailboxUnavailable(c, "readMailbox", agentName)) return [];
  let inboxPath = getInboxPath(agentName, teamName);
  logForDebugging(`[TeammateMailbox] readMailbox: path=${inboxPath}`);
  try {
    let a;
    if (isStorageV5Enabled() && store !== void 0 && c !== void 0) {
      let text = await store.readText([c]);
      if (!text.ok)
        throw (
          logForDebugging(
            `[TeammateMailbox] readMailbox: inbox read failed: ${formatStorageError(text.error)}`,
          ),
          Error("teammate inbox storage read failed")
        );
      if (!text.value.items[0].found)
        return (logForDebugging("[TeammateMailbox] readMailbox: file does not exist"), []);
      a = text.value.items[0].value;
    } else a = await getFileReader().read(inboxPath);
    let { valid: valid, droppedCount: droppedCount } = validateInboxEntries(jsonParse(a), inboxPath);
    if (droppedCount > 0) schedulePruneInvalidEntries(inboxPath, store, c);
    for (let w of valid) if (w.type === void 0) w.type = "message";
    return (
      logForDebugging(
        `[TeammateMailbox] readMailbox: read ${valid.length} message(s)` +
          (droppedCount > 0 ? `, dropped ${droppedCount} invalid` : ""),
      ),
      valid
    );
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return (logForDebugging("[TeammateMailbox] readMailbox: file does not exist"), []);
    if (error instanceof SyntaxError)
      return (
        logForDebugging(`[TeammateMailbox] readMailbox: unparseable inbox, treating as empty: ${error}`),
        []
      );
    if (options?.throwOnUnknownReadError) throw error;
    return (logForDebugging(`Failed to read inbox for ${agentName}: ${error}`), logError(error), []);
  }
}
/**
 * 读 inbox 中未读的消息。
 */
//@ chunk-nw7jbebs.js:26110-26282 facade-exports = readUnreadMessages (1)
async function readUnreadMessages(agentName, teamName, store) {
  let s = await readMailbox(agentName, teamName, store),
    unread = s.filter((y) => !y.read);
  return (
    logForDebugging(`[TeammateMailbox] readUnreadMessages: ${unread.length} unread of ${s.length} total`),
    scanRepairs(unread),
    unread
  );
}
/**
 * 写一条消息到收件人 inbox：先做 schema 校验；补 msg_id、type=message、read=false；文件型 inbox 先确保目录和文件存在，再加锁追加并原子写入。返回 msg_id。
 */
//@ chunk-nw7jbebs.js:26282-28319 facade-exports = writeToMailbox (0.608)
async function writeToMailbox(recipientName, message, teamName, store) {
  let safeParse = mailboxMessageSchema().safeParse(message);
  if (!safeParse.success) {
    let inboxPath = describeSchemaIssues(message, safeParse.error.issues);
    (logForDebugging(
      `[TeammateMailbox] writeToMailbox: refusing schema-invalid message for ${recipientName} (${inboxPath})`,
      { level: "warn" },
    ),
      logError(
        typeof message.text !== "string"
          ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `[TeammateMailbox] refused mailbox write (${inboxPath})`,
              "TeammateMailbox: refused mailbox write with non-string text",
            )
          : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `[TeammateMailbox] refused mailbox write (${inboxPath})`,
              "TeammateMailbox: refused mailbox write failing schema validation",
            ),
      ));
    return;
  }
  let y = isStorageV5Enabled() && store !== void 0 ? mailboxStoreKey(recipientName, teamName) : void 0;
  if (isStorageV5Enabled() && store !== void 0 && y !== void 0) {
    let w = { ...message, ...createMessageEnvelope(), type: "message", read: !1 },
      x = getMailboxLedgerKey(y, recipientName, teamName);
    try {
      return (
        await updateInboxInStore(
          store,
          y,
          x,
          (S) => (mailboxLedger().record(x, w), { messages: [...S.messages, w], result: !0 }),
        ),
        logForDebugging(`[TeammateMailbox] Wrote message to ${recipientName}'s inbox from ${message.from}`),
        w.msg_id
      );
    } catch (error) {
      (logForDebugging(`Failed to write to inbox for ${recipientName}: ${error}`, { level: "error" }),
        logError(error));
      return;
    }
  }
  if (isDiskless()) {
    logForDebugging(
      `[TeammateMailbox] writeToMailbox: nothing written for "${recipientName}": this session has no disk, and the message cannot go to a store (tengu_hover_rest is off, no store was handed in, or the recipient's name is empty)`,
      { level: "error" },
    );
    return;
  }
  try {
    await ensureInboxDir(teamName);
  } catch (error) {
    logForDebugging(`[TeammateMailbox] writeToMailbox: failed to ensure inbox dir: ${error}`, {
      level: "error",
    });
    return;
  }
  let a = getInboxPath(recipientName, teamName),
    lockFilePath = `${a}.lock`;
  logForDebugging(
    `[TeammateMailbox] writeToMailbox: recipient=${recipientName}, from=${message.from}, path=${a}`,
  );
  try {
    (await getFileReader().writeExclusive(a, "[]"),
      logForDebugging("[TeammateMailbox] writeToMailbox: created new inbox file"));
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") {
      if (
        (logForDebugging(`[TeammateMailbox] writeToMailbox: failed to create inbox file: ${error}`, {
          level: "error",
        }),
        !isSyscallError(error))
      )
        logError(error);
      return;
    }
  }
  let release;
  try {
    release = await lock(a, { lockfilePath: lockFilePath, ...LOCK_OPTIONS });
    let messages = await readMailbox(recipientName, teamName),
      x = { ...message, ...createMessageEnvelope(), type: "message", read: !1 };
    (messages.push(x), mailboxLedger().record(a, x));
    try {
      await getFileReader().atomicWrite(a, jsonStringify(messages, null, 2));
    } catch (error) {
      throw (mailboxLedger().retire(a, x.msg_id === void 0 ? [] : [x.msg_id]), error);
    }
    return (
      logForDebugging(`[TeammateMailbox] Wrote message to ${recipientName}'s inbox from ${message.from}`),
      x.msg_id
    );
  } catch (error) {
    if (
      (logForDebugging(`Failed to write to inbox for ${recipientName}: ${error}`, { level: "error" }),
      !isSyscallError(error))
    )
      logError(error);
    return;
  } finally {
    await releaseLockQuietly(release, `[TeammateMailbox] writeToMailbox(${recipientName})`);
  }
}
/**
 * 从消息列表删除第一条与目标匹配的未读消息，并去掉所有已读消息。
 */
//@ chunk-nw7jbebs.js:28319-28508 layout
function removeMatchingMessage(messages, target) {
  let index = messages.findIndex(
    (c) => !c.read && c.from === target.from && c.timestamp === target.timestamp && c.text === target.text,
  );
  return {
    messages: (index === -1 ? messages : messages.toSpliced(index, 1)).filter((c) => !c.read),
    found: index !== -1,
  };
}
/**
 * 把一条消息标为已处理：从 inbox 中删除该条（以及已读的），加锁执行。
 */
//@ chunk-nw7jbebs.js:28508-29877 facade-exports = markMessageAsReadByIndex (0.275)
async function markSingleMessageAsRead(agentName, teamName, targetMessage, store) {
  let c = isStorageV5Enabled() && store !== void 0 ? mailboxStoreKey(agentName, teamName) : void 0;
  if (isMailboxUnavailable(c, "markSingleMessageAsRead", agentName)) return;
  let inboxPath = getInboxPath(agentName, teamName);
  if (
    (logForDebugging(
      `[TeammateMailbox] markSingleMessageAsRead called: agentName=${agentName}, teamName=${teamName}, target=${targetMessage.from}@${targetMessage.timestamp}, path=${inboxPath}`,
    ),
    isStorageV5Enabled() && store !== void 0 && c !== void 0)
  ) {
    try {
      let b = await updateInboxInStore(store, c, inboxPath, (w) => {
        if (!w.found) return { skip: !0, result: "absent" };
        let x = removeMatchingMessage(w.messages, targetMessage);
        return { messages: x.messages, result: x.found };
      });
      logForDebugging(
        b === "absent"
          ? `[TeammateMailbox] markSingleMessageAsRead: file does not exist at ${inboxPath}`
          : `[TeammateMailbox] markSingleMessageAsRead: dropped target (${b ? "found" : "not found"}) at ${inboxPath}`,
      );
    } catch (error) {
      (logForDebugging(`[TeammateMailbox] markSingleMessageAsRead FAILED for ${agentName}: ${error}`),
        logError(error));
    }
    return;
  }
  let lockFilePath = `${inboxPath}.lock`,
    release;
  try {
    release = await lock(inboxPath, { lockfilePath: lockFilePath, ...LOCK_OPTIONS });
    let messages = await readMailbox(agentName, teamName),
      w = [...messages],
      index = messages.findIndex(
        (E) =>
          !E.read &&
          E.from === targetMessage.from &&
          E.timestamp === targetMessage.timestamp &&
          E.text === targetMessage.text,
      );
    if (index !== -1) messages.splice(index, 1);
    let filtered = messages.filter((E) => !E.read);
    (await getFileReader().atomicWrite(inboxPath, jsonStringify(filtered, null, 2)),
      reconcileMessageLedger(inboxPath, w, filtered),
      logForDebugging(
        `[TeammateMailbox] markSingleMessageAsRead: dropped target (${index === -1 ? "not found" : "found"}); ${filtered.length} remain at ${inboxPath}`,
      ));
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      (mailboxLedger().forget(inboxPath),
        logForDebugging(`[TeammateMailbox] markSingleMessageAsRead: file does not exist at ${inboxPath}`));
      return;
    }
    (logForDebugging(`[TeammateMailbox] markSingleMessageAsRead FAILED for ${agentName}: ${error}`),
      logError(error));
  } finally {
    await releaseLockQuietly(release, "[TeammateMailbox] markSingleMessageAsRead");
  }
}
/**
 * 标记已读连续失败多少次后不再等待、直接投递（5）。
 */
//@ chunk-nw7jbebs.js:29877-29887 facade-exports
var MARK_READ_FAILURE_CAP = 5;
/**
 * 消息去重键：from|timestamp|text。
 */
//@ chunk-nw7jbebs.js:29887-29945 facade-exports
function messageIdentityKey(message) {
  return `${message.from}|${message.timestamp}|${message.text}`;
}
/**
 * 把已投递的消息从 inbox 删除：给定消息列表时删除这些和所有已读消息，未给定时清空全部；加锁执行（存储 v5 走原子更新）。
 */
//@ chunk-nw7jbebs.js:29945-31782 facade-exports = markMessagesAsRead (0.756)
async function markMessagesAsRead(agentName, teamName, deliveredMessages, store) {
  let c = isStorageV5Enabled() && store !== void 0 ? mailboxStoreKey(agentName, teamName) : void 0;
  if (isMailboxUnavailable(c, "markMessagesAsRead", agentName)) return !1;
  let inboxPath = getInboxPath(agentName, teamName);
  if (
    (logForDebugging(
      `[TeammateMailbox] markMessagesAsRead called: agentName=${agentName}, teamName=${teamName}, path=${inboxPath}`,
    ),
    isStorageV5Enabled() && store !== void 0 && c !== void 0)
  ) {
    let b = deliveredMessages === void 0 ? null : new Set(deliveredMessages.map(messageIdentityKey));
    try {
      let w = await updateInboxInStore(store, c, inboxPath, (x) => {
        if (!x.found || x.messages.length === 0) return { skip: !0, result: null };
        let filtered = x.messages.filter(
          (message) => !message.read && b !== null && !b.has(messageIdentityKey(message)),
        );
        return {
          messages: filtered,
          result: { pruned: x.messages.length - filtered.length, remain: filtered.length },
        };
      });
      return (
        logForDebugging(
          w
            ? `[TeammateMailbox] markMessagesAsRead: pruned ${w.pruned} delivered message(s), ${w.remain} remain at ${inboxPath}`
            : "[TeammateMailbox] markMessagesAsRead: no messages to mark",
        ),
        !0
      );
    } catch (error) {
      return (
        logForDebugging(`[TeammateMailbox] markMessagesAsRead FAILED for ${agentName}: ${error}`),
        logError(error),
        !1
      );
    }
  }
  let lockFilePath = `${inboxPath}.lock`,
    release;
  try {
    (logForDebugging("[TeammateMailbox] markMessagesAsRead: acquiring lock..."),
      (release = await lock(inboxPath, { lockfilePath: lockFilePath, ...LOCK_OPTIONS })),
      logForDebugging("[TeammateMailbox] markMessagesAsRead: lock acquired"));
    let b = await readMailbox(agentName, teamName, void 0, { throwOnUnknownReadError: !0 });
    if (
      (logForDebugging(`[TeammateMailbox] markMessagesAsRead: read ${b.length} messages after lock`),
      b.length === 0)
    )
      return (
        reconcileMessageLedger(inboxPath, b, b),
        logForDebugging("[TeammateMailbox] markMessagesAsRead: no messages to mark"),
        !0
      );
    let unreadCount = count(b, (E) => !E.read);
    logForDebugging(`[TeammateMailbox] markMessagesAsRead: ${unreadCount} unread of ${b.length} total`);
    let x = deliveredMessages === void 0 ? null : new Set(deliveredMessages.map(messageIdentityKey)),
      filtered = b.filter((E) => !E.read && x !== null && !x.has(messageIdentityKey(E)));
    return (
      await getFileReader().atomicWrite(inboxPath, jsonStringify(filtered, null, 2)),
      reconcileMessageLedger(inboxPath, b, filtered),
      logForDebugging(
        `[TeammateMailbox] markMessagesAsRead: pruned ${b.length - filtered.length} delivered message(s), ${filtered.length} remain at ${inboxPath}`,
      ),
      !0
    );
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return (
        mailboxLedger().forget(inboxPath),
        logForDebugging(`[TeammateMailbox] markMessagesAsRead: file does not exist at ${inboxPath}`),
        !0
      );
    return (
      logForDebugging(`[TeammateMailbox] markMessagesAsRead FAILED for ${agentName}: ${error}`),
      logError(error),
      !1
    );
  } finally {
    await releaseLockQuietly(release, "[TeammateMailbox] markMessagesAsRead");
  }
}
/**
 * 清空 inbox（写入 []）。
 */
//@ chunk-nw7jbebs.js:31782-32416 facade-exports = clearMailbox (0.42)
async function clearMailbox(agentName, teamName, store) {
  let s = isStorageV5Enabled() && store !== void 0 ? mailboxStoreKey(agentName, teamName) : void 0;
  if (isMailboxUnavailable(s, "clearMailbox", agentName)) return;
  let inboxPath = getInboxPath(agentName, teamName);
  if (isStorageV5Enabled() && store !== void 0 && s !== void 0) {
    try {
      if (
        await updateInboxInStore(store, s, inboxPath, (b) =>
          b.found ? { messages: [], result: !0 } : { skip: !0, result: !1 },
        )
      )
        logForDebugging(`[TeammateMailbox] Cleared inbox for ${agentName}`);
    } catch (error) {
      (logForDebugging(`Failed to clear inbox for ${agentName}: ${error}`), logError(error));
    }
    return;
  }
  let y = `${inboxPath}.lock`,
    a;
  try {
    ((a = await lock(inboxPath, { lockfilePath: y, ...LOCK_OPTIONS })),
      await getFileReader().atomicWrite(inboxPath, "[]"),
      mailboxLedger().forget(inboxPath),
      logForDebugging(`[TeammateMailbox] Cleared inbox for ${agentName}`));
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      mailboxLedger().forget(inboxPath);
      return;
    }
    (logForDebugging(`Failed to clear inbox for ${agentName}: ${error}`), logError(error));
  } finally {
    await releaseLockQuietly(a, "[TeammateMailbox] clearMailbox");
  }
}
/**
 * 把一条 teammate 消息格式化为 <teammate-message teammate_id=… color=… summary=…> XML，伪造来源标 verified="false"，并清洗控制字符。
 */
//@ chunk-nw7jbebs.js:32416-32748 facade-exports = formatTeammateMessages (0.755)
function formatTeammateMessage(messages) {
  let n = isAgentColorName(messages.color) ? ` color="${messages.color}"` : "",
    r = capFrameFieldForDisplay(messages.summary),
    s = r ? ` summary="${escapeXmlAttr(r)}"` : "",
    c = capIdFrameField(messages.from, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER,
    y = messages.provenance === "forged" ? ' verified="false"' : "",
    a = aIt(messages.text);
  if (a !== messages.text)
    for (let h = 0; h < 4; h++) {
      let b = aIt(capRawFrameTextForDisplay(a, messages.from));
      if (b === a) break;
      a = b;
    }
  return `<${TEAMMATE_MESSAGE} teammate_id="${escapeXmlAttr(c)}"${n}${s}${y}>
${a}
</${TEAMMATE_MESSAGE}>`;
}
//@ chunk-nw7jbebs.js:32748-32928 facade-exports
function formatTeammateMessages(e, n) {
  let joined = applyAggregateIdleResultBudget(e).map((c) =>
    formatTeammateMessage(
      n.recipientIsLead || c.provenance === "forged"
        ? c
        : { ...c, text: withShutdownReplyInstructions(c.text, c.from) },
    ),
  ).join(`

`);
  return n.recipientIsLead ? wrapPeerMessage(joined, { midTurn: !1 }) : joined;
}
//@ chunk-nw7jbebs.js:32928-33244 facade-exports
var IdleNotificationMessageSchema = DoctorLazy(() =>
    u({
      type: T("idle_notification"),
      from: o(),
      timestamp: o(),
      idleReason: U(["available", "interrupted", "failed"]).optional(),
      summary: o().optional(),
      completedTaskId: o().optional(),
      completedStatus: U(["resolved", "blocked", "failed"]).optional(),
      failureReason: o().optional(),
      result: o().optional(),
    }),
  ),
  FAILURE_REASON_MAX_LENGTH = 200,
  SUMMARY_DISPLAY_MAX_LENGTH = 200;
//@ chunk-nw7jbebs.js:33244-33302 facade-exports
function capFrameFieldForDisplay(e) {
  let n = e ? getFirstLine(e).trim() : "";
  return capStrippedFrameField(n, SUMMARY_DISPLAY_MAX_LENGTH);
}
//@ chunk-nw7jbebs.js:33302-33363 facade-exports
function capFailureReasonForDisplay(e) {
  let n = e ? getFirstLine(e).trim() : "";
  return stripFrameControlChars(truncateToLength(n, FAILURE_REASON_MAX_LENGTH));
}
//@ chunk-nw7jbebs.js:33363-33377 facade-exports
var PLAN_CONTENT_DISPLAY_BOUND = 40000;
//@ chunk-nw7jbebs.js:33377-33503 facade-exports
function capFrameBodyForDisplay(e, n) {
  if (!e) return "";
  let r = stripFrameControlChars(e),
    s = truncateToLength(r, n);
  if (s.length >= r.length) return r;
  return `${stripFrameControlChars(s)}
[truncated for display]`;
}
//@ chunk-nw7jbebs.js:33503-33525 facade-exports
var IDLE_RESULT_MAX_LENGTH = 4000,
  IDLE_RESULT_TOTAL_BUDGET = 16000;
//@ chunk-nw7jbebs.js:33525-33741 facade-exports
function capIdleResult(e, n = !0) {
  let r = e ? normalizeResultText(e) : "";
  if (!r) return "";
  let s = truncateToLength(r, IDLE_RESULT_MAX_LENGTH);
  if (s.length >= r.length) return s;
  let c = stripFrameControlChars(s);
  return n
    ? `${c}
[result truncated \u2014 ask the agent for the rest via ${SENDMESSAGE}]`
    : `${c}
[result truncated]`;
}
//@ chunk-nw7jbebs.js:33741-33810 facade-exports
var ut = 200,
  IDLE_SUMMARY_RECEIVE_BOUND = SUMMARY_DISPLAY_MAX_LENGTH * 2 + 16,
  IDLE_ID_FIELD_RECEIVE_BOUND = 256,
  ae = 256,
  Ie = 4,
  IDLE_FRAME_TOTAL_RECEIVE_BOUND =
    IDLE_RESULT_MAX_LENGTH +
    ut +
    IDLE_SUMMARY_RECEIVE_BOUND +
    FAILURE_REASON_MAX_LENGTH +
    3 * IDLE_ID_FIELD_RECEIVE_BOUND +
    1024;
//@ chunk-nw7jbebs.js:33810-34079 layout
function capFrameValue(e, n) {
  if (typeof e === "string") return capStrippedFrameField(e, ae);
  if (e === null || typeof e !== "object") return e;
  if (n <= 0) return null;
  if (Array.isArray(e)) return e.map((s) => capFrameValue(s, n - 1));
  let r = [];
  for (let [s, c] of Object.entries(e)) r.push([capStrippedFrameField(s, ae), capFrameValue(c, n - 1)]);
  return Object.fromEntries(r);
}
//@ chunk-nw7jbebs.js:34079-34274 facade-exports
function capReceivedIdleResult(e, n) {
  let r = stripFrameControlChars(e);
  if (truncateToLength(r, IDLE_RESULT_MAX_LENGTH + ut).length >= r.length) return r;
  let c = stripFrameControlChars(truncateToLength(r, IDLE_RESULT_MAX_LENGTH));
  return n
    ? `${c}
[result truncated \u2014 ask the agent for the rest via ${SENDMESSAGE}]`
    : `${c}
[result truncated]`;
}
/**
 * 队友信箱帧校验常量：时间戳格式、无效标记、权限/关机/计划审批请求 id 格式与长度上限。
 */
//@ chunk-nw7jbebs.js:34274-34606 facade-exports
var ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/,
  INVALID_TIMESTAMP_MARKER = "[invalid timestamp]",
  INVALID_ID_MARKER = "[invalid id]",
  FRAME_SANITIZED_FOR_DISPLAY_MARKER = "[display sanitized; the agent reads the raw frame]",
  UNKNOWN_SENDER = "[unknown sender]",
  PERMISSION_REQUEST_ID_PATTERN = /^perm-[0-9]{1,20}-[0-9a-z]{1,12}$/,
  SHUTDOWN_OR_PLAN_REQUEST_ID_PATTERN =
    /^(?:shutdown|plan_approval)-[0-9]{1,20}@[^@\n]{1,300}(?:@[^@\n]{1,300})?$/u,
  MAX_REQUEST_ID_LENGTH = 320;
//@ chunk-nw7jbebs.js:34606-34725 layout
function sanitizeRequestId(e) {
  return !e.includes(`
`) &&
    !e.includes("\r") &&
    stripFrameControlChars(e) === e &&
    [...e].length <= MAX_REQUEST_ID_LENGTH &&
    (PERMISSION_REQUEST_ID_PATTERN.test(e) || SHUTDOWN_OR_PLAN_REQUEST_ID_PATTERN.test(e))
    ? e
    : INVALID_ID_MARKER;
}
//@ chunk-nw7jbebs.js:34725-34827 layout
var PANE_ID_PATTERN =
  /^(%[0-9]{1,10}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$/;
//@ chunk-nw7jbebs.js:34827-34866 layout
function Ht(e) {
  return PANE_ID_PATTERN.test(e) ? e : INVALID_ID_MARKER;
}
//@ chunk-nw7jbebs.js:34866-34909 layout
var Qt = { tmux: !0, iterm2: !0, "in-process": !0 };
//@ chunk-nw7jbebs.js:34909-34957 layout
function Gt(e) {
  return Object.hasOwn(Qt, e) ? e : INVALID_ID_MARKER;
}
/**
 * 清洗收到的空闲通知帧以便显示：截断结果、摘要、失败原因与各 id 字段，发送者以信封为准，时间戳不合法则标记；未知字段截断；整体超长时反复对最长文本字段减半，结果被截断时追加说明。
 */
//@ chunk-nw7jbebs.js:34957-36390 layout
function sanitizeIdleNotificationFrame(e, n, r) {
  let s =
      typeof n.result === "string" && n.result
        ? capReceivedIdleResult(n.result, n.idleReason !== "failed")
        : n.result,
    c =
      typeof n.summary === "string" && n.summary
        ? capStrippedFrameField(n.summary, IDLE_SUMMARY_RECEIVE_BOUND)
        : n.summary,
    y =
      typeof n.failureReason === "string" && n.failureReason
        ? capFailureReasonForDisplay(n.failureReason)
        : n.failureReason,
    from =
      typeof n.from === "string" && n.from ? capIdFrameField(n.from, IDLE_ID_FIELD_RECEIVE_BOUND) : n.from,
    sender =
      typeof r === "string" ? capIdFrameField(r, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER : void 0,
    b = sender !== void 0 && typeof from === "string" && from !== sender ? sender : from,
    w =
      typeof n.timestamp === "string" && ISO_TIMESTAMP_PATTERN.test(n.timestamp)
        ? n.timestamp
        : INVALID_TIMESTAMP_MARKER,
    x =
      typeof n.completedTaskId === "string" && n.completedTaskId
        ? capIdFrameField(n.completedTaskId, IDLE_ID_FIELD_RECEIVE_BOUND)
        : n.completedTaskId,
    parsed = jsonParse(e),
    E = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { ...n },
    knownKeys = new Set(Object.keys(IdleNotificationMessageSchema().shape)),
    entries = [];
  for (let [v, B] of Object.entries(E)) {
    if (knownKeys.has(v)) {
      entries.push([v, B]);
      continue;
    }
    let ce = capStrippedFrameField(v, ae);
    if (knownKeys.has(ce)) continue;
    entries.push([ce, capFrameValue(B, Ie)]);
  }
  let fromEntries = Object.fromEntries(entries),
    sanitizedFields = { result: s, summary: c, failureReason: y, from: b, timestamp: w, completedTaskId: x },
    idle = { ...n, ...sanitizedFields },
    text = jsonStringify({ ...fromEntries, ...sanitizedFields });
  if (text.length > IDLE_FRAME_TOTAL_RECEIVE_BOUND) text = jsonStringify(idle);
  let resultTruncated = !1;
  while (text.length > IDLE_FRAME_TOTAL_RECEIVE_BOUND) {
    let v,
      B = 0;
    for (let Oe of ["result", "summary", "failureReason"]) {
      let fe = idle[Oe];
      if (typeof fe === "string" && fe) {
        let De = jsonStringify(fe).length;
        if (De > B) ((v = { key: Oe, value: fe }), (B = De));
      }
    }
    if (!v) break;
    let ce = [...v.value].length;
    ((resultTruncated ||= v.key === "result"),
      (idle = { ...idle, [v.key]: stripFrameControlChars(truncateToLength(v.value, Math.floor(ce / 2))) }),
      (text = jsonStringify(idle)));
  }
  if (resultTruncated && idle.result) {
    let v = {
        ...idle,
        result: `${idle.result}
[result truncated]`,
      },
      B = jsonStringify(v);
    if (B.length <= IDLE_FRAME_TOTAL_RECEIVE_BOUND) ((idle = v), (text = B));
  }
  return text === e ? { text: e, idle: n } : { text: text, idle: idle };
}
//@ chunk-nw7jbebs.js:36390-36489 layout
function ct(e, n) {
  let r = stripFrameControlChars(e),
    s = truncateToLength(r, n);
  if (s.length >= r.length) return r;
  return `${stripFrameControlChars(s)}
[truncated]`;
}
/**
 * teammate 协议帧字段规范表（每种帧的字段类型与长度上限），用于把帧改写成安全的可读形式。与 bridge 无关，属于 utils/teammateMailbox.ts。
 */
//@ chunk-nw7jbebs.js:36489-37964 facade-exports
var MAX_UNKNOWN_FIELD_CHARS = 1024,
  MAX_EXTRA_FIELDS_CHARS = 2048,
  STRUCTURED_FRAME_RECEIVE_SPECS = new Map([
    [
      "plan_approval_request",
      {
        from: { kind: "envelope-pinned-id" },
        timestamp: { kind: "timestamp" },
        planFilePath: { kind: "id" },
        planContent: { kind: "body", bound: PLAN_CONTENT_DISPLAY_BOUND },
        requestId: { kind: "request-id" },
      },
    ],
    [
      "plan_approval_response",
      {
        requestId: { kind: "request-id" },
        approved: { kind: "generic" },
        feedback: { kind: "body", bound: IDLE_RESULT_MAX_LENGTH },
        timestamp: { kind: "timestamp" },
        permissionMode: { kind: "generic" },
      },
    ],
    [
      "shutdown_request",
      {
        requestId: { kind: "request-id" },
        from: { kind: "envelope-pinned-id" },
        reason: { kind: "body", bound: IDLE_SUMMARY_RECEIVE_BOUND },
        timestamp: { kind: "timestamp" },
      },
    ],
    [
      "shutdown_approved",
      {
        requestId: { kind: "request-id" },
        from: { kind: "envelope-pinned-id" },
        timestamp: { kind: "timestamp" },
        paneId: { kind: "pane-id" },
        backendType: { kind: "backend-type" },
      },
    ],
    [
      "shutdown_rejected",
      {
        requestId: { kind: "request-id" },
        from: { kind: "envelope-pinned-id" },
        reason: { kind: "body", bound: IDLE_SUMMARY_RECEIVE_BOUND },
        timestamp: { kind: "timestamp" },
      },
    ],
    [
      "task_assignment",
      {
        taskId: { kind: "id" },
        subject: { kind: "line" },
        description: { kind: "body", bound: IDLE_RESULT_MAX_LENGTH },
        assignedBy: { kind: "envelope-pinned-id" },
        timestamp: { kind: "timestamp" },
      },
    ],
    [
      "task_completed",
      {
        from: { kind: "envelope-pinned-id" },
        taskId: { kind: "id" },
        taskSubject: { kind: "line" },
        timestamp: { kind: "timestamp" },
      },
    ],
    ["teammate_terminated", { message: { kind: "body", bound: IDLE_RESULT_MAX_LENGTH } }],
    [
      "idle_notification",
      {
        from: { kind: "envelope-pinned-id" },
        timestamp: { kind: "timestamp" },
        idleReason: { kind: "generic" },
        summary: { kind: "line" },
        completedTaskId: { kind: "id" },
        completedStatus: { kind: "generic" },
        failureReason: { kind: "body", bound: FAILURE_REASON_MAX_LENGTH },
        result: { kind: "body", bound: IDLE_RESULT_MAX_LENGTH },
      },
    ],
  ]);
/**
 * 规范化一条 teammate 协议帧 JSON：按字段规范截断/清洗已知字段、限制未知字段总量；无变化返回 null。
 */
//@ chunk-nw7jbebs.js:37964-38475 facade-exports = extractErrorTypeFromData (0.779)
function sanitizeReceivedStructuredFrame(text, from) {
  if (!JSON_OBJECT_START.test(text)) return null;
  let r;
  try {
    r = jsonParse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(r)) return null;
  let s = r,
    c = s.type,
    y = typeof c === "string" ? STRUCTURED_FRAME_RECEIVE_SPECS.get(c) : void 0;
  if (!y) return null;
  let a = new Set(Object.keys(y)),
    h = [],
    b = 0;
  for (let [x, S] of Object.entries(s)) {
    if (x === "type") {
      h.push([x, c]);
      continue;
    }
    if (a.has(x)) {
      h.push([x, sanitizeFrameField(y[x], S, from)]);
      continue;
    }
    let E = capStrippedFrameField(x, ae);
    if (E === "type" || a.has(E)) continue;
    let P = capFrameValue(S, Ie),
      N = jsonStringify(P).length + E.length;
    if (b + N > MAX_EXTRA_FIELDS_CHARS) continue;
    ((b += N), h.push([E, P]));
  }
  let w = jsonStringify(Object.fromEntries(h));
  return w === text ? null : w;
}
/**
 * 按字段种类清洗收到的结构化帧字段：通用值截断、id/请求 id/窗格 id/后端类型校验格式、以信封发送者为准的 id、时间戳校验、单行与正文按上限截断；类型不对时给出无效标记。
 */
//@ chunk-nw7jbebs.js:38475-39217 layout
function sanitizeFrameField(fieldSpec, value, envelopeSender) {
  if (fieldSpec.kind === "generic") {
    let capped = typeof value === "string" ? capStrippedFrameField(value, ae) : capFrameValue(value, Ie);
    if (
      capped !== null &&
      typeof capped === "object" &&
      jsonStringify(capped).length > MAX_UNKNOWN_FIELD_CHARS
    )
      return null;
    return capped;
  }
  if (typeof value !== "string")
    switch (fieldSpec.kind) {
      case "envelope-pinned-id":
        return (
          (typeof envelopeSender === "string"
            ? capIdFrameField(envelopeSender, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER
            : void 0) ?? INVALID_ID_MARKER
        );
      case "id":
      case "request-id":
      case "pane-id":
      case "backend-type":
        return INVALID_ID_MARKER;
      case "timestamp":
        return INVALID_TIMESTAMP_MARKER;
      case "line":
      case "body":
        return "";
    }
  switch (fieldSpec.kind) {
    case "id":
      return capIdFrameField(value, IDLE_ID_FIELD_RECEIVE_BOUND);
    case "request-id":
      return sanitizeRequestId(value);
    case "pane-id":
      return Ht(value);
    case "backend-type":
      return Gt(value);
    case "envelope-pinned-id": {
      let s = capIdFrameField(value, IDLE_ID_FIELD_RECEIVE_BOUND),
        sender =
          typeof envelopeSender === "string"
            ? capIdFrameField(envelopeSender, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER
            : void 0;
      return sender !== void 0 && s !== sender ? sender : s;
    }
    case "timestamp":
      return ISO_TIMESTAMP_PATTERN.test(value) ? value : INVALID_TIMESTAMP_MARKER;
    case "line":
      return capIdFrameField(value, IDLE_SUMMARY_RECEIVE_BOUND);
    case "body":
      return ct(value, fieldSpec.bound);
  }
}
//@ chunk-nw7jbebs.js:39217-39327 facade-exports
function idleFrameRecency(e, n) {
  let parse = Date.parse(e.timestamp);
  return Number.isNaN(parse) ? Number.NEGATIVE_INFINITY : Math.min(parse, n);
}
//@ chunk-nw7jbebs.js:39327-40557 facade-exports
function applyAggregateIdleResultBudget(e) {
  if (weakSet_2.has(e)) return e;
  let sliced = e.slice(),
    r = [],
    now = Date.now();
  for (let a = 0; a < sliced.length; a++) {
    let h = isIdleNotification(sliced[a].text);
    if (!h) {
      let x = sanitizeReceivedStructuredFrame(sliced[a].text, sliced[a].from);
      if (x !== null) sliced[a] = { ...sliced[a], text: x };
      continue;
    }
    let b = sanitizeIdleNotificationFrame(sliced[a].text, h, sliced[a].from);
    if (b.text !== sliced[a].text) sliced[a] = { ...sliced[a], text: b.text };
    let idle = b.idle;
    if (typeof idle.result === "string" && idle.result)
      r.push({ index: a, recency: idleFrameRecency(idle, now), idle: idle });
  }
  r.sort((a, h) => h.recency - a.recency || h.index - a.index);
  let c = IDLE_RESULT_TOTAL_BUDGET,
    y = 0;
  for (let { index: index, idle: idle } of r) {
    let b = sliced[index];
    if (b.text.length <= c) {
      c -= b.text.length;
      continue;
    }
    let w = idle.idleReason === "failed" ? "" : `; ask the agent for it via ${SENDMESSAGE}`,
      x = {
        type: "idle_notification",
        from: idle.from,
        timestamp: idle.timestamp,
        idleReason: idle.idleReason,
        summary: idle.summary,
        completedTaskId: idle.completedTaskId,
        completedStatus: idle.completedStatus,
        failureReason: idle.failureReason,
      },
      S = jsonStringify({
        ...x,
        result: `[result truncated \u2014 this drain's results exceeded ${IDLE_RESULT_TOTAL_BUDGET} characters${w}]`,
      });
    if (S.length > c) S = jsonStringify({ ...x, result: "[result truncated]" });
    if (S.length >= b.text.length) {
      c = Math.max(0, c - b.text.length);
      continue;
    }
    if (((c = Math.max(0, c - S.length)), S !== b.text)) (y++, (sliced[index] = { ...b, text: S }));
  }
  if (y > 0 && !weakSet.has(e))
    (weakSet.add(e), logFeatureSad("swarm_idle_result_delivery", "budget_truncated"));
  if (sliced.every((a, h) => a === e[h])) return (weakSet_2.add(e), e);
  return (weakSet_2.add(sliced), sliced);
}
//@ chunk-nw7jbebs.js:40557-40591 layout
var weakSet = new WeakSet(),
  weakSet_2 = new WeakSet();
/**
 * 构造 idle_notification：idleReason（available/interrupted/failed）、摘要、完成的任务 ID 与状态、失败原因、结果（截断清洗）。
 */
//@ chunk-nw7jbebs.js:40591-40973 facade-exports = createIdleNotification (0.929)
function createIdleNotification(agentId, options) {
  let r =
    capIdleResult(options?.result, options?.senderReachable ?? options?.idleReason !== "failed") || void 0;
  return {
    type: "idle_notification",
    from: agentId,
    timestamp: new Date().toISOString(),
    idleReason: options?.idleReason,
    summary: options?.summary ? stripFrameControlChars(options.summary) : void 0,
    completedTaskId: options?.completedTaskId,
    completedStatus: options?.completedStatus,
    failureReason:
      capFailureReasonForDisplay(
        options?.failureReason ? stripFrameControlChars(options.failureReason) : void 0,
      ) || void 0,
    result: r,
  };
}
/**
 * 记 swarm_idle_result_delivery：结果写入失败、完整送达或被截断。
 */
//@ chunk-nw7jbebs.js:40973-41218 facade-exports
function logIdleResultDeliveryOutcome(notification, fullResult, msgId) {
  if (notification.result === void 0) return;
  if (msgId === void 0) logFeatureBad("swarm_idle_result_delivery", "mailbox_write_failed");
  else if (fullResult !== void 0 && notification.result === normalizeResultText(fullResult))
    logFeatureOk("swarm_idle_result_delivery");
  else logFeatureSad("swarm_idle_result_delivery", "per_frame_truncated");
}
/**
 * 文本清洗用正则与上限：控制/格式字符、变体选择符等的保留个数。
 */
//@ chunk-nw7jbebs.js:41218-41478 layout
var UNSAFE_CHAR_PATTERN =
    /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029]|(?![\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}])[\p{Cf}\p{Default_Ignorable_Code_Point}]/u,
  regExp_2 = new RegExp(UNSAFE_CHAR_PATTERN.source, "gu"),
  VARIATION_SELECTOR_PATTERN = /[\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu,
  MIN_SELECTORS_PER_LINE = 8,
  SELECTOR_LINE_DIVISOR = 7,
  MIN_SELECTORS_TOTAL = 16,
  SELECTOR_TOTAL_DIVISOR = 4;
//@ chunk-nw7jbebs.js:41478-41742 layout
function limitVariationSelectors(e) {
  let n = (e.match(VARIATION_SELECTOR_PATTERN) ?? []).length,
    r = [...e].length - n,
    max = Math.max(MIN_SELECTORS_TOTAL, Math.ceil(r / SELECTOR_TOTAL_DIVISOR));
  return e
    .split(
      `
`,
    )
    .map((c) => {
      let y = (c.match(VARIATION_SELECTOR_PATTERN) ?? []).length,
        max_2 = Math.max(MIN_SELECTORS_PER_LINE, Math.ceil(([...c].length - y) / SELECTOR_LINE_DIVISOR)),
        h = 0;
      return c.replace(VARIATION_SELECTOR_PATTERN, (b) => (h++ < max_2 && max-- > 0 ? b : ""));
    }).join(`
`);
}
/**
 * 清洗文本：规范化后去掉控制/不可见字符并限制变体选择符。
 */
//@ chunk-nw7jbebs.js:41742-41789 facade-exports
function stripFrameControlChars(e) {
  return limitVariationSelectors(toWellFormedString(e).replace(regExp_2, ""));
}
/**
 * 清洗后截断到指定长度（截断后再清洗一次）。
 */
//@ chunk-nw7jbebs.js:41789-41863 facade-exports
function capStrippedFrameField(text, maxLength) {
  let r = stripFrameControlChars(text),
    s = truncateToLength(r, maxLength);
  return s.length >= r.length ? s : stripFrameControlChars(s);
}
/**
 * 清洗、截断并压成单行。
 */
//@ chunk-nw7jbebs.js:41863-41923 facade-exports
function capIdFrameField(text, maxLength) {
  return capStrippedFrameField(text, maxLength).replace(/\s+/g, " ").trim();
}
//@ chunk-nw7jbebs.js:41923-41939 layout
var JSON_OBJECT_START = /^\s*\{/;
/**
 * 把消息正文中的协议帧（idle_notification 等）改写成可读文本。
 */
//@ chunk-nw7jbebs.js:41939-42032 facade-exports
function capRawFrameTextForDisplay(text, from) {
  let r = JSON_OBJECT_START.test(text) ? isIdleNotification(text) : null;
  if (r) return sanitizeIdleNotificationFrame(text, r, from).text;
  return sanitizeReceivedStructuredFrame(text, from) ?? text;
}
//@ chunk-nw7jbebs.js:42032-42067 layout
function normalizeResultText(e) {
  return stripFrameControlChars(e.trim());
}
/**
 * 解析消息正文是否为 idle_notification 帧（schema 校验），返回帧或 null。
 */
//@ chunk-nw7jbebs.js:42067-42164 facade-exports
function isIdleNotification(messageText) {
  try {
    let result = IdleNotificationMessageSchema().safeParse(jsonParse(messageText));
    return result.success ? result.data : null;
  } catch {}
  return null;
}
/**
 * permission_response 帧 schema：success（updated_input、permission_updates）或 error（error），可带 approved_request {tool_use_id, tool_name, input_digest}。
 */
//@ chunk-nw7jbebs.js:42164-42645 facade-exports
var ApprovedPermissionRequestSchema = DoctorLazy(() =>
    u({ tool_use_id: o(), tool_name: o(), input_digest: o() }),
  ),
  PermissionResponseMessageSchema = DoctorLazy(() =>
    Ir("subtype", [
      u({
        type: T("permission_response"),
        request_id: o().min(1),
        subtype: T("success"),
        tool_use_id: o().optional(),
        approved_request: ApprovedPermissionRequestSchema().optional(),
        response: u({
          updated_input: pe(o(), oe()).optional(),
          permission_updates: A(oe()).optional(),
        }).optional(),
      }),
      u({
        type: T("permission_response"),
        request_id: o().min(1),
        subtype: T("error"),
        tool_use_id: o().optional(),
        approved_request: ApprovedPermissionRequestSchema().optional(),
        error: o(),
      }),
    ]),
  );
/**
 * 构造 permission_request 帧（request_id、agent_id、tool_name、tool_use_id、description、input、permission_suggestions）。
 */
//@ chunk-nw7jbebs.js:42645-42879 facade-exports = createPermissionRequestMessage (1)
function createPermissionRequestMessage(params) {
  return {
    type: "permission_request",
    request_id: params.request_id,
    agent_id: params.agent_id,
    tool_name: params.tool_name,
    tool_use_id: params.tool_use_id,
    description: params.description,
    input: params.input,
    permission_suggestions: params.permission_suggestions || [],
  };
}
/**
 * 构造 permission_response 帧：error（缺省 "Permission denied"）或 success（updated_input、permission_updates），可带 approved_request。
 */
//@ chunk-nw7jbebs.js:42879-43310 facade-exports = createPermissionResponseMessage (0.939)
function createPermissionResponseMessage(params) {
  if (params.subtype === "error")
    return {
      type: "permission_response",
      request_id: params.request_id,
      subtype: "error",
      tool_use_id: params.tool_use_id,
      approved_request: params.approved_request,
      error: params.error || "Permission denied",
    };
  return {
    type: "permission_response",
    request_id: params.request_id,
    subtype: "success",
    tool_use_id: params.tool_use_id,
    approved_request: params.approved_request,
    response: { updated_input: params.updated_input, permission_updates: params.permission_updates },
  };
}
/**
 * 解析 permission_request 帧（不做 schema 校验）。
 */
//@ chunk-nw7jbebs.js:43310-43406 facade-exports = isPermissionRequest (1)
function isPermissionRequest(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (parsed && parsed.type === "permission_request") return parsed;
  } catch {}
  return null;
}
/**
 * 解析并校验 permission_response 帧，格式不对时记日志返回 null。
 */
//@ chunk-nw7jbebs.js:43406-43773 facade-exports = isPermissionResponse (0.485)
function isPermissionResponse(messageText) {
  let n;
  try {
    n = jsonParse(messageText);
  } catch {
    return null;
  }
  if (n === null || typeof n !== "object" || !("type" in n) || n.type !== "permission_response") return null;
  let safeParse = PermissionResponseMessageSchema().safeParse(n);
  if (safeParse.success) return safeParse.data;
  return (
    logForDebugging(
      `[TeammateMailbox] Dropping malformed permission_response frame: ${safeParse.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      { level: "warn" },
    ),
    null
  );
}
/**
 * 构造 sandbox_permission_request 帧（requestId、worker 身份、hostPattern.host、createdAt）。
 */
//@ chunk-nw7jbebs.js:43773-43970 facade-exports = createSandboxPermissionRequestMessage (1)
function createSandboxPermissionRequestMessage(params) {
  return {
    type: "sandbox_permission_request",
    requestId: params.requestId,
    workerId: params.workerId,
    workerName: params.workerName,
    workerColor: params.workerColor,
    hostPattern: { host: params.host },
    createdAt: Date.now(),
  };
}
/**
 * 构造 sandbox_permission_response 帧（requestId、host、allow、timestamp）。
 */
//@ chunk-nw7jbebs.js:43970-44112 facade-exports = createSandboxPermissionResponseMessage (1)
function createSandboxPermissionResponseMessage(params) {
  return {
    type: "sandbox_permission_response",
    requestId: params.requestId,
    host: params.host,
    allow: params.allow,
    timestamp: new Date().toISOString(),
  };
}
/**
 * 解析 sandbox_permission_request 帧。
 */
//@ chunk-nw7jbebs.js:44112-44216 facade-exports = isSandboxPermissionRequest (1)
function isSandboxPermissionRequest(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (parsed && parsed.type === "sandbox_permission_request") return parsed;
  } catch {}
  return null;
}
/**
 * 解析 sandbox_permission_response 帧。
 */
//@ chunk-nw7jbebs.js:44216-44321 facade-exports = isSandboxPermissionResponse (1)
function isSandboxPermissionResponse(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (parsed && parsed.type === "sandbox_permission_response") return parsed;
  } catch {}
  return null;
}
/**
 * 计划审批与关机帧的 schema：plan_approval_request、plan_approval_response、shutdown_request、shutdown_approved、shutdown_rejected。
 */
//@ chunk-nw7jbebs.js:44321-44913 facade-exports
var PlanApprovalRequestMessageSchema = DoctorLazy(() =>
    u({
      type: T("plan_approval_request"),
      from: o(),
      timestamp: o(),
      planFilePath: o(),
      planContent: o(),
      requestId: o(),
    }),
  ),
  PlanApprovalResponseMessageSchema = DoctorLazy(() =>
    u({
      type: T("plan_approval_response"),
      requestId: o(),
      approved: M(),
      feedback: o().optional(),
      timestamp: o(),
      permissionMode: externalPermissionModeSchema().optional(),
    }),
  ),
  ShutdownRequestMessageSchema = DoctorLazy(() =>
    u({ type: T("shutdown_request"), requestId: o(), from: o(), reason: o().optional(), timestamp: o() }),
  ),
  ShutdownApprovedMessageSchema = DoctorLazy(() =>
    u({
      type: T("shutdown_approved"),
      requestId: o(),
      from: o(),
      timestamp: o(),
      paneId: o().optional(),
      backendType: o().optional(),
    }),
  ),
  ShutdownRejectedMessageSchema = DoctorLazy(() =>
    u({ type: T("shutdown_rejected"), requestId: o(), from: o(), reason: o(), timestamp: o() }),
  );
/**
 * 构造 shutdown_request 帧（requestId、from、reason、timestamp）。
 */
//@ chunk-nw7jbebs.js:44913-45046 facade-exports = createShutdownRequestMessage (1)
function createShutdownRequestMessage(params) {
  return {
    type: "shutdown_request",
    requestId: params.requestId,
    from: params.from,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  };
}
/**
 * 构造 shutdown_approved 帧（可带 paneId、backendType 供 leader 清理 pane）。
 */
//@ chunk-nw7jbebs.js:45046-45206 facade-exports = createShutdownApprovedMessage (1)
function createShutdownApprovedMessage(params) {
  return {
    type: "shutdown_approved",
    requestId: params.requestId,
    from: params.from,
    timestamp: new Date().toISOString(),
    paneId: params.paneId,
    backendType: params.backendType,
  };
}
/**
 * 构造 shutdown_rejected 帧（附拒绝原因）。
 */
//@ chunk-nw7jbebs.js:45206-45340 facade-exports = createShutdownRejectedMessage (1)
function createShutdownRejectedMessage(params) {
  return {
    type: "shutdown_rejected",
    requestId: params.requestId,
    from: params.from,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  };
}
/**
 * 解析 shutdown_request 帧（用 shutdownRequestSchema）。
 */
//@ chunk-nw7jbebs.js:45340-45435 facade-exports
function isShutdownRequest(messageText) {
  try {
    let result = ShutdownRequestMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
/**
 * 解析 plan_approval_request 帧。
 */
//@ chunk-nw7jbebs.js:45435-45530 facade-exports
function isPlanApprovalRequest(messageText) {
  try {
    let result = PlanApprovalRequestMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
/**
 * 解析 shutdown_approved 帧。
 */
//@ chunk-nw7jbebs.js:45530-45625 facade-exports
function isShutdownApproved(messageText) {
  try {
    let result = ShutdownApprovedMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:45625-45636 facade-exports
var UNBOUND_PLAN_VERDICT_HONOURED = !0;
/**
 * 判断 leader 的计划审批回复与当前等待中的请求关系：unbound / already_answered / bound / mismatch。
 */
//@ chunk-nw7jbebs.js:45636-45783 facade-exports
function planVerdictBinding(pendingApproval, response) {
  if (!pendingApproval) return UNBOUND_PLAN_VERDICT_HONOURED ? "unbound" : "mismatch";
  if (pendingApproval.answered) return "already_answered";
  return pendingApproval.requestId === response.requestId ? "bound" : "mismatch";
}
/**
 * 回复与等待中的请求不匹配时，构造一个"拒绝并要求重新提交"的 plan_approval_response。
 */
//@ chunk-nw7jbebs.js:45783-46025 facade-exports = PlanApprovalResponseMessageSchema (0.611)
function planVerdictMismatchRejection(e) {
  return {
    type: "plan_approval_response",
    requestId: e.requestId,
    approved: !1,
    feedback:
      "The team lead's verdict was for a different request, not this plan. Call ExitPlanMode again to resubmit it for approval.",
    timestamp: e.timestamp,
  };
}
/**
 * 解析 plan_approval_response 帧。
 */
//@ chunk-nw7jbebs.js:46025-46120 facade-exports
function isPlanApprovalResponse(messageText) {
  try {
    let result = PlanApprovalResponseMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
/**
 * task_assignment 帧 schema（taskId、subject、description、assignedBy、timestamp）。
 */
//@ chunk-nw7jbebs.js:46120-46233 fingerprint = isTaskAssignment (0.558)
var taskAssignmentSchema = DoctorLazy(() =>
  u({
    type: T("task_assignment"),
    taskId: o(),
    subject: o(),
    description: o(),
    assignedBy: o(),
    timestamp: o(),
  }),
);
//@ chunk-nw7jbebs.js:46233-46267 facade-exports
function isTaskAssignment(e) {
  return parseFrameForDisplay(taskAssignmentSchema(), e);
}
//@ chunk-nw7jbebs.js:46267-46453 facade-exports = UserTeammateMessage (0.485)
var TaskCompletedMessageSchema = DoctorLazy(() =>
    u({
      type: T("task_completed"),
      from: o().optional(),
      taskId: o(),
      taskSubject: o().optional(),
      timestamp: o().optional(),
    }),
  ),
  TeammateTerminatedMessageSchema = DoctorLazy(() => u({ type: T("teammate_terminated"), message: o() }));
//@ chunk-nw7jbebs.js:46453-46554 facade-exports
function parseFrameForDisplay(e, n) {
  try {
    let safeParse = e.strict().safeParse(jsonParse(n));
    if (safeParse.success) return safeParse.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:46554-46804 facade-exports
function visibleTeammateMailboxMessages(e) {
  return e.filter((n) => {
    let r = n;
    if (!isPlainObject(r)) return !1;
    if (r.provenance === "forged") return !0;
    if (r.summary !== void 0 && typeof r.summary !== "string") return !0;
    if (capFrameFieldForDisplay(r.summary)) return !0;
    if (typeof r.text !== "string") return !0;
    return !parseFrameForDisplay(ShutdownApprovedMessageSchema(), r.text);
  });
}
/**
 * 正文是否为 team_permission_update 帧。
 */
//@ chunk-nw7jbebs.js:46804-46897 facade-exports = isTeamPermissionUpdate (1)
function isTeamPermissionUpdate(messageText) {
  try {
    let parsed = jsonParse(messageText);
    return !!parsed && parsed.type === "team_permission_update";
  } catch {
    return !1;
  }
}
/**
 * 正文是否是 mode_set_request 帧。
 */
//@ chunk-nw7jbebs.js:46897-46984 facade-exports = createModeSetRequestMessage (1)
function isModeSetRequest(messageText) {
  try {
    let n = jsonParse(messageText);
    return !!n && n.type === "mode_set_request";
  } catch {
    return !1;
  }
}
/**
 * 拒绝把协议帧当作 teammate 初始提示词时的错误文字。
 */
//@ chunk-nw7jbebs.js:46984-47120 facade-exports
var PROTOCOL_FRAME_PROMPT_ERROR =
  "Teammate prompt must not be a mailbox protocol frame (permission/mode/plan/shutdown JSON) \u2014 pass plain-text instructions";
/**
 * 正文是否是任一结构化协议帧（权限/沙箱/关机/团队权限/模式/计划审批）。
 */
//@ chunk-nw7jbebs.js:47120-47546 facade-exports = isStructuredProtocolMessage (0.956)
function isStructuredProtocolMessage(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return !1;
    let type = parsed.type;
    return (
      type === "permission_request" ||
      type === "permission_response" ||
      type === "sandbox_permission_request" ||
      type === "sandbox_permission_response" ||
      type === "shutdown_request" ||
      type === "shutdown_response" ||
      type === "shutdown_approved" ||
      type === "team_permission_update" ||
      type === "mode_set_request" ||
      type === "plan_approval_request" ||
      type === "plan_approval_response"
    );
  } catch {
    return !1;
  }
}
//@ chunk-nw7jbebs.js:47546-47760 facade-exports = getPlanApprovalSummary (0.882)
function planApprovalResumeText(content) {
  let n = content.feedback ? ct(content.feedback, IDLE_RESULT_MAX_LENGTH) : "";
  if (content.approved)
    return n ? `[Plan Approved] ${n}` : "[Plan Approved] You can now proceed with implementation";
  return `[Plan Rejected] ${n || "Please revise your plan"}`;
}
//@ chunk-nw7jbebs.js:47760-47846 layout
var an = /^shutdown-[0-9]{1,20}@[\w.-]{1,64}$/,
  un = "<requestId of the shutdown request>";
//@ chunk-nw7jbebs.js:47846-48339 facade-exports
function shutdownRequestReplyInstructions(e) {
  let matches = an.test(e),
    r = jsonStringify({
      to: TEAM_LEAD,
      message: { type: "shutdown_response", request_id: matches ? e : un, approve: !0 },
    });
  return `To approve it, call ${SENDMESSAGE} with exactly this input, where "message" is a JSON object rather than a string${matches ? "" : " and request_id is the request's requestId value, copied verbatim"}: ${r}. Approving ends your process; a plain-text acknowledgment does not shut you down. To decline, for example because you're mid-task, send the same input with "approve": false and a "reason".`;
}
//@ chunk-nw7jbebs.js:48339-48491 facade-exports
function withShutdownReplyInstructions(e, n) {
  if (n !== TEAM_LEAD || !e.includes('"shutdown_request"')) return e;
  let r = isShutdownRequest(e);
  return r
    ? `${e}

This is a shutdown request. ${shutdownRequestReplyInstructions(r.requestId)}`
    : e;
}
/**
 * 消息是否应作为普通文本展示给模型：非协议帧，或是 shutdown_approved / shutdown_request / plan_approval_request 帧（按 schema 实际解析的类型）。
 */
//@ chunk-nw7jbebs.js:48491-48565 facade-exports
function isHeadlessLeadDisplayableMessage(messageText) {
  return (
    !isStructuredProtocolMessage(messageText) ||
    isShutdownApproved(messageText) !== null ||
    isShutdownRequest(messageText) !== null ||
    isPlanApprovalRequest(messageText) !== null
  );
}
/**
 * 按谓词删除 inbox 中的消息（同时去掉已读的），加锁执行。
 */
//@ chunk-nw7jbebs.js:48565-49290 facade-exports
async function markMessagesAsReadByPredicate(agentName, predicate, teamName, store) {
  let c = isStorageV5Enabled() && store !== void 0 ? mailboxStoreKey(agentName, teamName) : void 0;
  if (isMailboxUnavailable(c, "markMessagesAsReadByPredicate", agentName)) return !1;
  let y = getInboxPath(agentName, teamName);
  if (isStorageV5Enabled() && store !== void 0 && c !== void 0)
    try {
      return (
        await updateInboxInStore(store, c, y, (b) =>
          !b.found || b.messages.length === 0
            ? { skip: !0, result: void 0 }
            : {
                messages: b.messages.filter((message) => !message.read && !predicate(message)),
                result: void 0,
              },
        ),
        !0
      );
    } catch (error) {
      return (logError(error), !1);
    }
  let a = `${y}.lock`,
    h;
  try {
    h = await lock(y, { lockfilePath: a, ...LOCK_OPTIONS });
    let b = await readMailbox(agentName, teamName, void 0, { throwOnUnknownReadError: !0 });
    if (b.length === 0) return (reconcileMessageLedger(y, b, b), !0);
    let filtered = b.filter((x) => !x.read && !predicate(x));
    return (
      await getFileReader().atomicWrite(y, jsonStringify(filtered, null, 2)),
      reconcileMessageLedger(y, b, filtered),
      !0
    );
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return (mailboxLedger().forget(y), !0);
    return (logError(error), !1);
  } finally {
    await releaseLockQuietly(h, "[TeammateMailbox] markMessagesAsReadByPredicate");
  }
}
/**
 * 是否是真实用户输入（非 meta、非 tool_result）。
 */
//@ chunk-nw7jbebs.js:49290-49459 facade-exports
function isTeammateWakeupPrompt(message) {
  return (
    message.type === "user" &&
    message.isMeta !== !0 &&
    message.turnCompanion !== !0 &&
    (typeof message.message.content === "string" ||
      !message.message.content.some((n) => n.type === "tool_result"))
  );
}
/**
 * 自最近一次用户输入以来，最后一条发给具体 peer（非广播、非 team-lead、非 main）的 SendMessage 摘要："[to 名字] 摘要"。
 */
//@ chunk-nw7jbebs.js:49459-50127 facade-exports = getLastPeerDmSummary (1)
function getLastPeerDmSummary(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let msg = messages[n];
    if (!msg) continue;
    if (isTeammateWakeupPrompt(msg)) break;
    if (msg.type !== "assistant") continue;
    for (let block of msg.message.content)
      if (
        block.type === "tool_use" &&
        block.name === SENDMESSAGE &&
        typeof block.input === "object" &&
        block.input !== null &&
        "to" in block.input &&
        typeof block.input.to === "string" &&
        block.input.to !== "*" &&
        block.input.to !== TEAM_LEAD &&
        block.input.to !== MAIN
      ) {
        let c = "message" in block.input ? block.input.message : void 0,
          y =
            "summary" in block.input && typeof block.input.summary === "string"
              ? block.input.summary
              : void 0,
          a = splitRepairedMessage(block.input);
        if (a !== void 0)
          return `[to ${capFrameFieldForDisplay(block.input.to)}] ${capFrameFieldForDisplay(a.summary.length > 0 ? a.summary : a.message.trim())}`;
        if (typeof c === "string")
          return `[to ${capFrameFieldForDisplay(block.input.to)}] ${capFrameFieldForDisplay(y !== void 0 ? y : truncateToLength(c, 80))}`;
      }
  }
  return;
}

export {
  parseFrameForDisplay,
  IdleNotificationMessageSchema,
  capRawFrameTextForDisplay,
  IDLE_FRAME_TOTAL_RECEIVE_BOUND,
  FRAME_SANITIZED_FOR_DISPLAY_MARKER,
  capStrippedFrameField,
  stripFrameControlChars,
  capFrameBodyForDisplay,
  PLAN_CONTENT_DISPLAY_BOUND,
  createIdleNotification,
  writeToMailbox,
  logIdleResultDeliveryOutcome,
  createShutdownRequestMessage,
  createShutdownApprovedMessage,
  createShutdownRejectedMessage,
  isStructuredProtocolMessage,
  getInboxPath,
  isPlanApprovalResponse,
  planVerdictBinding,
  planVerdictMismatchRejection,
  messageIdentityKey,
  isPermissionRequest,
  isPermissionResponse,
  isSandboxPermissionRequest,
  isSandboxPermissionResponse,
  isShutdownRequest,
  isShutdownApproved,
  isModeSetRequest,
  isPlanApprovalRequest,
  isTeamPermissionUpdate,
  planApprovalResumeText,
  formatTeammateMessages,
  readUnreadMessages,
  markMessagesAsRead,
  createPermissionRequestMessage,
  createPermissionResponseMessage,
  createSandboxPermissionRequestMessage,
  createSandboxPermissionResponseMessage,
  isIdleNotification,
  readMailbox,
  markSingleMessageAsRead,
  MARK_READ_FAILURE_CAP,
  formatTeammateMessage,
  UNKNOWN_SENDER,
  withShutdownReplyInstructions,
  sanitizeReceivedStructuredFrame,
  IDLE_SUMMARY_RECEIVE_BOUND,
  ShutdownRequestMessageSchema,
  ShutdownApprovedMessageSchema,
  ShutdownRejectedMessageSchema,
  capIdFrameField,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  IDLE_RESULT_MAX_LENGTH,
  isTaskAssignment,
  TeammateTerminatedMessageSchema,
  PlanApprovalRequestMessageSchema,
  PlanApprovalResponseMessageSchema,
  capFrameFieldForDisplay,
  TaskCompletedMessageSchema,
  capFailureReasonForDisplay,
  capReceivedIdleResult,
  visibleTeammateMailboxMessages,
  markMessagesAsReadByPredicate,
  clearMailbox,
  PROTOCOL_FRAME_PROMPT_ERROR,
  getLastPeerDmSummary,
  isTeammateWakeupPrompt,
  isHeadlessLeadDisplayableMessage,
};
