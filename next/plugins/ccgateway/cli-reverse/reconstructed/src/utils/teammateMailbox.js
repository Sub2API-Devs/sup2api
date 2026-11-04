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
import { join } from "path";
import { logError } from "./log.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  booleanSchema,
  objectSchema,
  literal,
  _enum,
  discriminatedUnion,
  record,
  unknown,
  array,
} from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { swarmHostState } from "./swarm/hostState.js";
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
import { neutralizeTextForAgent, MAIN } from "./sessionPeers.js";
import { TEAMMATE_MESSAGE } from "../constants/xml.js";
import { wrapPeerMessage } from "./crossSessionMessages.js";
import { getFirstLine, truncateToLength, toWellFormedString } from "./stringUtils.js";
import { SENDMESSAGE } from "../tools/SendMessageTool/constants.js";
import { isPlainObject } from "./isPlainObject.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { externalPermissionModeSchema } from "./permissions/browserToolNames.js";
import { TEAM_LEAD } from "./swarm/constants.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-nw7jbebs.js:20333-20574 callgraph-witnessed (2.1.88 match: LOCK_OPTIONS, 0.648)
/**
 * inbox 文件锁参数，以及 inbox 消息 schema（from、text、timestamp 必填；type、read、color、summary、from_plugin 可选）。
 */
var LOCK_OPTIONS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var mailboxMessageSchema;
deferInit("chunk-nw7jbebs.js:20333", () => {
  LOCK_OPTIONS = {
    retries: {
      retries: 10,
      minTimeout: 5,
      maxTimeout: 100,
    },
    onCompromised: (error) => logError(error),
  };
  mailboxMessageSchema = DoctorLazy(() =>
    looseObject({
      type: stringSchema().optional(),
      from: stringSchema(),
      text: stringSchema(),
      timestamp: stringSchema(),
      read: booleanSchema().optional(),
      color: stringSchema().optional(),
      summary: stringSchema().optional(),
      from_plugin: stringSchema().optional(),
    }),
  );
});
//@ chunk-nw7jbebs.js:20574-20899 layout
/**
 * 描述 schema 校验失败的字段（字段:错误码:实际类型）。
 */
function describeSchemaIssues(entry, issues) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry))
    return `entry is ${entry === null ? "null" : Array.isArray(entry) ? "an array" : typeof entry}`;
  return issues
    .map((issue) => {
      let pathPart = issue.path[0];
      let pathText = typeof pathPart === "string" ? pathPart : String(pathPart);
      let rest = entry[pathText];
      let restText =
        rest === undefined
          ? pathText in entry
            ? "undefined"
            : "missing"
          : rest === null
            ? "null"
            : typeof rest;
      return `${pathText}:${issue.code}:${restText}`;
    })
    .join(", ");
}
//@ chunk-nw7jbebs.js:20899-20918 layout
var MAX_REPORTED_DROPS = 100;
var DROP_REPORT_SAMPLE_CHARS = 2048;
//@ chunk-nw7jbebs.js:20918-21035 layout
function dropReportKey(reason, entry) {
  try {
    let json = jsonStringify(entry);
    return `${reason}\x00${json.length}:${json.slice(0, DROP_REPORT_SAMPLE_CHARS)}`;
  } catch {
    return `${reason}\x00(unserializable)`;
  }
}
//@ chunk-nw7jbebs.js:21035-21735 layout
/**
 * 首次见到某条无效 inbox 条目时上报一次（按原因分类）。
 */
function reportDroppedEntry(reason, entry, error) {
  let reportedDroppedEntries = swarmHostState().mailbox.reportedDroppedEntries;
  if (reportedDroppedEntries.size >= MAX_REPORTED_DROPS) return false;
  let key = dropReportKey(reason, entry);
  if (reportedDroppedEntries.has(key)) return false;
  reportedDroppedEntries.add(key);
  let reported = `[TeammateMailbox] dropped schema-invalid inbox entry (${error})`;
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reported,
        "TeammateMailbox: dropped inbox entry that is not an object",
      ),
    );
    return true;
  }
  let text = entry.text;
  if (text === undefined)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reported,
        "TeammateMailbox: dropped inbox entry with missing text",
      ),
    );
  else if (text === null)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reported,
        "TeammateMailbox: dropped inbox entry with null text",
      ),
    );
  else if (typeof text !== "string")
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reported,
        "TeammateMailbox: dropped inbox entry with non-string text",
      ),
    );
  else
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reported,
        "TeammateMailbox: dropped inbox entry failing schema validation",
      ),
    );
  return true;
}
//@ chunk-nw7jbebs.js:21735-22021 layout
function reportNonArrayInbox(inboxPath, parsed) {
  let reportedDroppedEntries = swarmHostState().mailbox.reportedDroppedEntries;
  if (reportedDroppedEntries.size >= MAX_REPORTED_DROPS) return;
  let key = `${inboxPath}\x00(not-an-array)`;
  if (reportedDroppedEntries.has(key)) return;
  reportedDroppedEntries.add(key);
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[TeammateMailbox] inbox file top level is ${parsed === null ? "null" : typeof parsed}, expected an array`,
      "TeammateMailbox: inbox file is not an array",
    ),
  );
}
//@ chunk-nw7jbebs.js:22021-22338 layout
/**
 * 校验 inbox 内容：非数组整体丢弃；逐条 schema 校验，返回 {valid, droppedCount}。
 */
function validateInboxEntries(parsed, inboxPath) {
  if (!Array.isArray(parsed)) {
    reportNonArrayInbox(inboxPath, parsed);
    return {
      valid: [],
      droppedCount: 1,
    };
  }
  let validEntries = [];
  let droppedCount = 0;
  for (let entry of parsed) {
    let result = mailboxMessageSchema().safeParse(entry);
    if (result.success) validEntries.push(entry);
    else {
      droppedCount++;
      let first = describeSchemaIssues(entry, result.error.issues);
      if (reportDroppedEntry(inboxPath, entry, first))
        logForDebugging(`[TeammateMailbox] dropping schema-invalid inbox entry (${first})`, {
          level: "warn",
        });
    }
  }
  return {
    valid: validEntries,
    droppedCount,
  };
}
//@ chunk-nw7jbebs.js:22338-22426 facade-exports
async function flushPendingMailboxPrunes() {
  await Promise.all(Array.from(swarmHostState().mailbox.pendingPrunes.values()));
}
//@ chunk-nw7jbebs.js:22426-22552 layout
function schedulePruneInvalidEntries(inboxPath, store, storeKey) {
  let pendingPrunes = swarmHostState().mailbox.pendingPrunes;
  if (pendingPrunes.has(inboxPath)) return;
  let prune = pruneInvalidMailboxEntries(inboxPath, store, storeKey).finally(() => {
    pendingPrunes.delete(inboxPath);
  });
  pendingPrunes.set(inboxPath, prune);
}
//@ chunk-nw7jbebs.js:22552-22838 layout
/**
 * 无盘会话且没有可用存储时，记录"什么都没读写"并返回 true。
 */
function isMailboxUnavailable(storeKey, operation, agentName) {
  if (storeKey !== undefined || !isDiskless()) return false;
  logForDebugging(
    `[TeammateMailbox] ${operation}: nothing read or written for "${agentName}": this session has no disk, and the inbox cannot go to a store (tengu_hover_rest is off, no store was handed in, or the agent or team name is not a valid store key)`,
  );
  return true;
}
//@ chunk-nw7jbebs.js:22838-23596 facade-exports
/**
 * 加锁重写 inbox，去掉无效条目。
 */
async function pruneInvalidMailboxEntries(inboxPath, store, storeKey) {
  if (isStorageV5Enabled() && store !== undefined && storeKey !== undefined) {
    try {
      let current = await updateInboxInStore(
        store,
        storeKey,
        inboxPath,
        (parsed) =>
          parsed.droppedCount === 0
            ? {
                skip: true,
                result: 0,
              }
            : {
                messages: parsed.messages,
                result: parsed.droppedCount,
              },
        false,
      );
      if (current)
        logForDebugging(
          `[TeammateMailbox] pruned ${current} schema-invalid entr${current === 1 ? "y" : "ies"} at ${inboxPath}`,
        );
    } catch (error) {
      logForDebugging(`[TeammateMailbox] invalid-entry prune skipped: ${error}`);
    }
    return;
  }
  if (isDiskless()) return;
  let lockfilePath = `${inboxPath}.lock`;
  let result;
  try {
    result = await lock(inboxPath, {
      lockfilePath,
      ...LOCK_OPTIONS,
    });
    let error = await getFileReader().read(inboxPath);
    let { valid, droppedCount } = validateInboxEntries(jsonParse(error), inboxPath);
    if (droppedCount === 0) {
      reconcileMessageLedger(inboxPath, valid, valid);
      return;
    }
    await getFileReader().atomicWrite(inboxPath, jsonStringify(valid, null, 2));
    reconcileMessageLedger(inboxPath, valid, valid);
    logForDebugging(
      `[TeammateMailbox] pruned ${droppedCount} schema-invalid entr${droppedCount === 1 ? "y" : "ies"} at ${inboxPath}`,
    );
  } catch (error) {
    logForDebugging(`[TeammateMailbox] invalid-entry prune skipped: ${error}`);
  } finally {
    await releaseLockQuietly(result, "[TeammateMailbox] pruneInvalidMailboxEntries");
  }
}
//@ chunk-nw7jbebs.js:23596-23781 facade-exports (2.1.88 match: getInboxPath, 1)
/**
 * inbox 路径：<teams 目录>/<团队>/inboxes/<代理名>.json（团队缺省为当前团队或 default）。
 */
function getInboxPath(agentName, teamName) {
  let team = teamName || getTeamName() || "default";
  let safeTeam = sanitizePathComponent(team);
  let safeAgentName = sanitizePathComponent(agentName);
  let inboxDir = join(getTeamsDir(), safeTeam, "inboxes");
  let fullPath = join(inboxDir, `${safeAgentName}.json`);
  logForDebugging(`[TeammateMailbox] getInboxPath: agent=${agentName}, team=${team}, fullPath=${fullPath}`);
  return fullPath;
}
//@ chunk-nw7jbebs.js:23781-23932 fingerprint (2.1.88 match: ensureInboxDir, 0.868)
async function ensureInboxDir(teamName) {
  let team = teamName || getTeamName() || "default";
  let safeTeam = sanitizePathComponent(team);
  let inboxDir = join(getTeamsDir(), safeTeam, "inboxes");
  await getFileReader().mkdir(inboxDir);
  logForDebugging(`[TeammateMailbox] Ensured inbox directory: ${inboxDir}`);
}
//@ chunk-nw7jbebs.js:23932-24029 layout
/**
 * inbox 在存储 v5 中的键（团队名与代理名合法时）。
 */
function mailboxStoreKey(agentName, teamName) {
  let team = sanitizePathComponent(teamName || getTeamName() || "default");
  let agent = sanitizePathComponent(agentName);
  return isValidKeySegment(team) && isValidKeySegment(agent)
    ? STORAGE_SPACES.mailbox(team, agent)
    : undefined;
}
//@ chunk-nw7jbebs.js:24029-24073 layout
function getMailboxLedgerKey(inboxPath, recipientName, teamName) {
  return isDiskless() ? internMailboxKey(inboxPath) : getInboxPath(recipientName, teamName);
}
//@ chunk-nw7jbebs.js:24073-24300 layout
/**
 * 解析 inbox 文本为消息列表（可选补 type=message），解析失败标 corrupt。
 */
function parseInboxText(text, inboxPath, fillType) {
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return {
      messages: [],
      droppedCount: 0,
      corrupt: true,
    };
  }
  let { valid, droppedCount } = validateInboxEntries(parsed, inboxPath);
  if (fillType) {
    for (let messages of valid) if (messages.type === undefined) messages.type = "message";
  }
  return {
    messages: valid,
    droppedCount,
    corrupt: false,
  };
}
//@ chunk-nw7jbebs.js:24300-24879 layout
/**
 * 在存储 v5 上原子更新 inbox（读-改-写回调），并更新消息 ID 台账。
 */
async function updateInboxInStore(store, storeKey, inboxPath, mutate, fillType = true) {
  let result;
  let state = await store.updateText(
    storeKey,
    (text) => {
      let parsed =
        text === undefined
          ? {
              messages: [],
              droppedCount: 0,
            }
          : parseInboxText(text.value, inboxPath, fillType);
      let mutation = mutate({
        messages: parsed.messages,
        droppedCount: parsed.droppedCount,
        found: text !== undefined,
      });
      result = {
        read: parsed.messages,
        remaining: "skip" in mutation ? parsed.messages : mutation.messages,
      };
      return "skip" in mutation
        ? {
            skip: true,
            result: mutation.result,
          }
        : {
            write: jsonStringify(mutation.messages, null, 2),
            result: mutation.result,
          };
    },
    {
      mode: 438 & ~process.umask(),
    },
  );
  if (!state.ok) {
    logForDebugging(`[TeammateMailbox] inbox update failed: ${formatStorageError(state.error)}`, {
      level: "error",
    });
    throw Error("teammate inbox storage update failed");
  }
  if (result !== undefined) reconcileMessageLedger(inboxPath, result.read, result.remaining);
  return state.value.result;
}
//@ chunk-nw7jbebs.js:24879-25087 layout
/**
 * 根据读前/写后的消息更新 msg_id 台账（保留仍在 inbox 中的 ID）。
 */
function reconcileMessageLedger(inboxPath, before, after) {
  let afterIds = new Set(after);
  let removedIds = new Set();
  for (let message of before)
    if (!afterIds.has(message) && message.msg_id !== undefined) removedIds.add(message.msg_id);
  let afterMsgIds = new Set();
  for (let message_2 of after)
    if (message_2.msg_id !== undefined && !removedIds.has(message_2.msg_id))
      afterMsgIds.add(message_2.msg_id);
  mailboxLedger().retain(inboxPath, afterMsgIds);
}
//@ chunk-nw7jbebs.js:25087-26110 facade-exports (2.1.88 match: readMailbox, 0.528)
/**
 * 读 inbox（存储 v5 或文件），校验并补 type=message；文件不存在/不可解析返回空数组；有无效条目时安排修剪。
 */
async function readMailbox(agentName, teamName, store, options) {
  let storeKey =
    isStorageV5Enabled() && store !== undefined ? mailboxStoreKey(agentName, teamName) : undefined;
  if (isMailboxUnavailable(storeKey, "readMailbox", agentName)) return [];
  let inboxPath = getInboxPath(agentName, teamName);
  logForDebugging(`[TeammateMailbox] readMailbox: path=${inboxPath}`);
  try {
    let entries;
    if (isStorageV5Enabled() && store !== undefined && storeKey !== undefined) {
      let text = await store.readText([storeKey]);
      if (!text.ok) {
        logForDebugging(
          `[TeammateMailbox] readMailbox: inbox read failed: ${formatStorageError(text.error)}`,
        );
        throw Error("teammate inbox storage read failed");
      }
      if (!text.value.items[0].found) {
        logForDebugging("[TeammateMailbox] readMailbox: file does not exist");
        return [];
      }
      entries = text.value.items[0].value;
    } else entries = await getFileReader().read(inboxPath);
    let { valid, droppedCount } = validateInboxEntries(jsonParse(entries), inboxPath);
    if (droppedCount > 0) schedulePruneInvalidEntries(inboxPath, store, storeKey);
    for (let error of valid) if (error.type === undefined) error.type = "message";
    logForDebugging(
      `[TeammateMailbox] readMailbox: read ${valid.length} message(s)` +
        (droppedCount > 0 ? `, dropped ${droppedCount} invalid` : ""),
    );
    return valid;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      logForDebugging("[TeammateMailbox] readMailbox: file does not exist");
      return [];
    }
    if (error instanceof SyntaxError) {
      logForDebugging(`[TeammateMailbox] readMailbox: unparseable inbox, treating as empty: ${error}`);
      return [];
    }
    if (options?.throwOnUnknownReadError) throw error;
    logForDebugging(`Failed to read inbox for ${agentName}: ${error}`);
    logError(error);
    return [];
  }
}
//@ chunk-nw7jbebs.js:26110-26282 facade-exports (2.1.88 match: readUnreadMessages, 1)
/**
 * 读 inbox 中未读的消息。
 */
async function readUnreadMessages(agentName, teamName, store) {
  let messages = await readMailbox(agentName, teamName, store);
  let unread = messages.filter((m) => !m.read);
  logForDebugging(
    `[TeammateMailbox] readUnreadMessages: ${unread.length} unread of ${messages.length} total`,
  );
  scanRepairs(unread);
  return unread;
}
//@ chunk-nw7jbebs.js:26282-28319 facade-exports (2.1.88 match: writeToMailbox, 0.608)
/**
 * 写一条消息到收件人 inbox：先做 schema 校验；补 msg_id、type=message、read=false；文件型 inbox 先确保目录和文件存在，再加锁追加并原子写入。返回 msg_id。
 */
async function writeToMailbox(recipientName, message, teamName, store) {
  let parsed = mailboxMessageSchema().safeParse(message);
  if (!parsed.success) {
    let inboxPath = describeSchemaIssues(message, parsed.error.issues);
    logForDebugging(
      `[TeammateMailbox] writeToMailbox: refusing schema-invalid message for ${recipientName} (${inboxPath})`,
      {
        level: "warn",
      },
    );
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
    );
    return;
  }
  let updated =
    isStorageV5Enabled() && store !== undefined ? mailboxStoreKey(recipientName, teamName) : undefined;
  if (isStorageV5Enabled() && store !== undefined && updated !== undefined) {
    let readResult = {
      ...message,
      ...createMessageEnvelope(),
      type: "message",
      read: false,
    };
    let mailboxLedgerKey = getMailboxLedgerKey(updated, recipientName, teamName);
    try {
      await updateInboxInStore(store, updated, mailboxLedgerKey, (result) => {
        mailboxLedger().record(mailboxLedgerKey, readResult);
        return {
          messages: [...result.messages, readResult],
          result: true,
        };
      });
      logForDebugging(`[TeammateMailbox] Wrote message to ${recipientName}'s inbox from ${message.from}`);
      return readResult.msg_id;
    } catch (error) {
      logForDebugging(`Failed to write to inbox for ${recipientName}: ${error}`, {
        level: "error",
      });
      logError(error);
      return;
    }
  }
  if (isDiskless()) {
    logForDebugging(
      `[TeammateMailbox] writeToMailbox: nothing written for "${recipientName}": this session has no disk, and the message cannot go to a store (tengu_hover_rest is off, no store was handed in, or the recipient's name is empty)`,
      {
        level: "error",
      },
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
  let inboxPath = getInboxPath(recipientName, teamName);
  let lockFilePath = `${inboxPath}.lock`;
  logForDebugging(
    `[TeammateMailbox] writeToMailbox: recipient=${recipientName}, from=${message.from}, path=${inboxPath}`,
  );
  try {
    await getFileReader().writeExclusive(inboxPath, "[]");
    logForDebugging("[TeammateMailbox] writeToMailbox: created new inbox file");
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") {
      logForDebugging(`[TeammateMailbox] writeToMailbox: failed to create inbox file: ${error}`, {
        level: "error",
      });
      if (!isSyscallError(error)) logError(error);
      return;
    }
  }
  let release;
  try {
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    });
    let messages = await readMailbox(recipientName, teamName);
    let messages_2 = {
      ...message,
      ...createMessageEnvelope(),
      type: "message",
      read: false,
    };
    messages.push(messages_2);
    mailboxLedger().record(inboxPath, messages_2);
    try {
      await getFileReader().atomicWrite(inboxPath, jsonStringify(messages, null, 2));
    } catch (error) {
      mailboxLedger().retire(inboxPath, messages_2.msg_id === undefined ? [] : [messages_2.msg_id]);
      throw error;
    }
    logForDebugging(`[TeammateMailbox] Wrote message to ${recipientName}'s inbox from ${message.from}`);
    return messages_2.msg_id;
  } catch (error) {
    logForDebugging(`Failed to write to inbox for ${recipientName}: ${error}`, {
      level: "error",
    });
    if (!isSyscallError(error)) logError(error);
    return;
  } finally {
    await releaseLockQuietly(release, `[TeammateMailbox] writeToMailbox(${recipientName})`);
  }
}
//@ chunk-nw7jbebs.js:28319-28508 layout
/**
 * 从消息列表删除第一条与目标匹配的未读消息，并去掉所有已读消息。
 */
function removeMatchingMessage(messages, target) {
  let index = messages.findIndex(
    (message) =>
      !message.read &&
      message.from === target.from &&
      message.timestamp === target.timestamp &&
      message.text === target.text,
  );
  return {
    messages: (index === -1 ? messages : messages.toSpliced(index, 1)).filter((remaining) => !remaining.read),
    found: index !== -1,
  };
}
//@ chunk-nw7jbebs.js:28508-29877 facade-exports (2.1.88 match: markMessageAsReadByIndex, 0.275)
/**
 * 把一条消息标为已处理：从 inbox 中删除该条（以及已读的），加锁执行。
 */
async function markSingleMessageAsRead(agentName, teamName, targetMessage, store) {
  let storeKey =
    isStorageV5Enabled() && store !== undefined ? mailboxStoreKey(agentName, teamName) : undefined;
  if (isMailboxUnavailable(storeKey, "markSingleMessageAsRead", agentName)) return;
  let inboxPath = getInboxPath(agentName, teamName);
  logForDebugging(
    `[TeammateMailbox] markSingleMessageAsRead called: agentName=${agentName}, teamName=${teamName}, target=${targetMessage.from}@${targetMessage.timestamp}, path=${inboxPath}`,
  );
  if (isStorageV5Enabled() && store !== undefined && storeKey !== undefined) {
    try {
      let result = await updateInboxInStore(store, storeKey, inboxPath, (readResult) => {
        if (!readResult.found)
          return {
            skip: true,
            result: "absent",
          };
        let messages = removeMatchingMessage(readResult.messages, targetMessage);
        return {
          messages: messages.messages,
          result: messages.found,
        };
      });
      logForDebugging(
        result === "absent"
          ? `[TeammateMailbox] markSingleMessageAsRead: file does not exist at ${inboxPath}`
          : `[TeammateMailbox] markSingleMessageAsRead: dropped target (${result ? "found" : "not found"}) at ${inboxPath}`,
      );
    } catch (error) {
      logForDebugging(`[TeammateMailbox] markSingleMessageAsRead FAILED for ${agentName}: ${error}`);
      logError(error);
    }
    return;
  }
  let lockFilePath = `${inboxPath}.lock`;
  let release;
  try {
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    });
    let messages = await readMailbox(agentName, teamName);
    let updated = [...messages];
    let index = messages.findIndex(
      (message) =>
        !message.read &&
        message.from === targetMessage.from &&
        message.timestamp === targetMessage.timestamp &&
        message.text === targetMessage.text,
    );
    if (index !== -1) messages.splice(index, 1);
    let filtered = messages.filter((message) => !message.read);
    await getFileReader().atomicWrite(inboxPath, jsonStringify(filtered, null, 2));
    reconcileMessageLedger(inboxPath, updated, filtered);
    logForDebugging(
      `[TeammateMailbox] markSingleMessageAsRead: dropped target (${index === -1 ? "not found" : "found"}); ${filtered.length} remain at ${inboxPath}`,
    );
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      mailboxLedger().forget(inboxPath);
      logForDebugging(`[TeammateMailbox] markSingleMessageAsRead: file does not exist at ${inboxPath}`);
      return;
    }
    logForDebugging(`[TeammateMailbox] markSingleMessageAsRead FAILED for ${agentName}: ${error}`);
    logError(error);
  } finally {
    await releaseLockQuietly(release, "[TeammateMailbox] markSingleMessageAsRead");
  }
}
//@ chunk-nw7jbebs.js:29877-29887 facade-exports
/**
 * 标记已读连续失败多少次后不再等待、直接投递（5）。
 */
var MARK_READ_FAILURE_CAP = 5;
//@ chunk-nw7jbebs.js:29887-29945 facade-exports
/**
 * 消息去重键：from|timestamp|text。
 */
function messageIdentityKey(message) {
  return `${message.from}|${message.timestamp}|${message.text}`;
}
//@ chunk-nw7jbebs.js:29945-31782 facade-exports (2.1.88 match: markMessagesAsRead, 0.756)
/**
 * 把已投递的消息从 inbox 删除：给定消息列表时删除这些和所有已读消息，未给定时清空全部；加锁执行（存储 v5 走原子更新）。
 */
async function markMessagesAsRead(agentName, teamName, deliveredMessages, store) {
  let storeKey =
    isStorageV5Enabled() && store !== undefined ? mailboxStoreKey(agentName, teamName) : undefined;
  if (isMailboxUnavailable(storeKey, "markMessagesAsRead", agentName)) return false;
  let inboxPath = getInboxPath(agentName, teamName);
  logForDebugging(
    `[TeammateMailbox] markMessagesAsRead called: agentName=${agentName}, teamName=${teamName}, path=${inboxPath}`,
  );
  if (isStorageV5Enabled() && store !== undefined && storeKey !== undefined) {
    let result = deliveredMessages === undefined ? null : new Set(deliveredMessages.map(messageIdentityKey));
    try {
      let readResult = await updateInboxInStore(store, storeKey, inboxPath, (messages) => {
        if (!messages.found || messages.messages.length === 0)
          return {
            skip: true,
            result: null,
          };
        let filtered = messages.messages.filter(
          (message) => !message.read && result !== null && !result.has(messageIdentityKey(message)),
        );
        return {
          messages: filtered,
          result: {
            pruned: messages.messages.length - filtered.length,
            remain: filtered.length,
          },
        };
      });
      logForDebugging(
        readResult
          ? `[TeammateMailbox] markMessagesAsRead: pruned ${readResult.pruned} delivered message(s), ${readResult.remain} remain at ${inboxPath}`
          : "[TeammateMailbox] markMessagesAsRead: no messages to mark",
      );
      return true;
    } catch (error) {
      logForDebugging(`[TeammateMailbox] markMessagesAsRead FAILED for ${agentName}: ${error}`);
      logError(error);
      return false;
    }
  }
  let lockFilePath = `${inboxPath}.lock`;
  let release;
  try {
    logForDebugging("[TeammateMailbox] markMessagesAsRead: acquiring lock...");
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    });
    logForDebugging("[TeammateMailbox] markMessagesAsRead: lock acquired");
    let mailbox = await readMailbox(agentName, teamName, undefined, {
      throwOnUnknownReadError: true,
    });
    logForDebugging(`[TeammateMailbox] markMessagesAsRead: read ${mailbox.length} messages after lock`);
    if (mailbox.length === 0) {
      reconcileMessageLedger(inboxPath, mailbox, mailbox);
      logForDebugging("[TeammateMailbox] markMessagesAsRead: no messages to mark");
      return true;
    }
    let unreadCount = count(mailbox, (m) => !m.read);
    logForDebugging(`[TeammateMailbox] markMessagesAsRead: ${unreadCount} unread of ${mailbox.length} total`);
    let updated = deliveredMessages === undefined ? null : new Set(deliveredMessages.map(messageIdentityKey));
    let filtered = mailbox.filter(
      (first) => !first.read && updated !== null && !updated.has(messageIdentityKey(first)),
    );
    await getFileReader().atomicWrite(inboxPath, jsonStringify(filtered, null, 2));
    reconcileMessageLedger(inboxPath, mailbox, filtered);
    logForDebugging(
      `[TeammateMailbox] markMessagesAsRead: pruned ${mailbox.length - filtered.length} delivered message(s), ${filtered.length} remain at ${inboxPath}`,
    );
    return true;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      mailboxLedger().forget(inboxPath);
      logForDebugging(`[TeammateMailbox] markMessagesAsRead: file does not exist at ${inboxPath}`);
      return true;
    }
    logForDebugging(`[TeammateMailbox] markMessagesAsRead FAILED for ${agentName}: ${error}`);
    logError(error);
    return false;
  } finally {
    await releaseLockQuietly(release, "[TeammateMailbox] markMessagesAsRead");
  }
}
//@ chunk-nw7jbebs.js:31782-32416 facade-exports (2.1.88 match: clearMailbox, 0.42)
/**
 * 清空 inbox（写入 []）。
 */
async function clearMailbox(agentName, teamName, store) {
  let storeKey =
    isStorageV5Enabled() && store !== undefined ? mailboxStoreKey(agentName, teamName) : undefined;
  if (isMailboxUnavailable(storeKey, "clearMailbox", agentName)) return;
  let inboxPath = getInboxPath(agentName, teamName);
  if (isStorageV5Enabled() && store !== undefined && storeKey !== undefined) {
    try {
      if (
        await updateInboxInStore(store, storeKey, inboxPath, (result) =>
          result.found
            ? {
                messages: [],
                result: true,
              }
            : {
                skip: true,
                result: false,
              },
        )
      )
        logForDebugging(`[TeammateMailbox] Cleared inbox for ${agentName}`);
    } catch (error) {
      logForDebugging(`Failed to clear inbox for ${agentName}: ${error}`);
      logError(error);
    }
    return;
  }
  let lockfilePath = `${inboxPath}.lock`;
  let cleared;
  try {
    cleared = await lock(inboxPath, {
      lockfilePath,
      ...LOCK_OPTIONS,
    });
    await getFileReader().atomicWrite(inboxPath, "[]");
    mailboxLedger().forget(inboxPath);
    logForDebugging(`[TeammateMailbox] Cleared inbox for ${agentName}`);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      mailboxLedger().forget(inboxPath);
      return;
    }
    logForDebugging(`Failed to clear inbox for ${agentName}: ${error}`);
    logError(error);
  } finally {
    await releaseLockQuietly(cleared, "[TeammateMailbox] clearMailbox");
  }
}
//@ chunk-nw7jbebs.js:32416-32748 facade-exports (2.1.88 match: formatTeammateMessages, 0.755)
/**
 * 把一条 teammate 消息格式化为 <teammate-message teammate_id=… color=… summary=…> XML，伪造来源标 verified="false"，并清洗控制字符。
 */
function formatTeammateMessage(messages) {
  let colorAttr = isAgentColorName(messages.color) ? ` color="${messages.color}"` : "";
  let summary = capFrameFieldForDisplay(messages.summary);
  let summaryAttr = summary ? ` summary="${escapeXmlAttr(summary)}"` : "";
  let from = capIdFrameField(messages.from, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER;
  let verifiedAttr = messages.provenance === "forged" ? ' verified="false"' : "";
  let sanitizedText = neutralizeTextForAgent(messages.text);
  if (sanitizedText !== messages.text)
    for (let idx = 0; idx < 4; idx++) {
      let nextText = neutralizeTextForAgent(capRawFrameTextForDisplay(sanitizedText, messages.from));
      if (nextText === sanitizedText) break;
      sanitizedText = nextText;
    }
  return `<${TEAMMATE_MESSAGE} teammate_id="${escapeXmlAttr(from)}"${colorAttr}${summaryAttr}${verifiedAttr}>
${sanitizedText}
</${TEAMMATE_MESSAGE}>`;
}
//@ chunk-nw7jbebs.js:32748-32928 facade-exports
function formatTeammateMessages(messages, options) {
  let joined = applyAggregateIdleResultBudget(messages).map((message) =>
    formatTeammateMessage(
      options.recipientIsLead || message.provenance === "forged"
        ? message
        : {
            ...message,
            text: withShutdownReplyInstructions(message.text, message.from),
          },
    ),
  ).join(`

`);
  return options.recipientIsLead
    ? wrapPeerMessage(joined, {
        midTurn: false,
      })
    : joined;
}
//@ chunk-nw7jbebs.js:32928-33244 facade-exports
var IdleNotificationMessageSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FAILURE_REASON_MAX_LENGTH;
var SUMMARY_DISPLAY_MAX_LENGTH;
deferInit("chunk-nw7jbebs.js:32928", () => {
  IdleNotificationMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("idle_notification"),
      from: stringSchema(),
      timestamp: stringSchema(),
      idleReason: _enum(["available", "interrupted", "failed"]).optional(),
      summary: stringSchema().optional(),
      completedTaskId: stringSchema().optional(),
      completedStatus: _enum(["resolved", "blocked", "failed"]).optional(),
      failureReason: stringSchema().optional(),
      result: stringSchema().optional(),
    }),
  );
  FAILURE_REASON_MAX_LENGTH = 200;
  SUMMARY_DISPLAY_MAX_LENGTH = 200;
});
//@ chunk-nw7jbebs.js:33244-33302 facade-exports
function capFrameFieldForDisplay(text) {
  let firstLine = text ? getFirstLine(text).trim() : "";
  return capStrippedFrameField(firstLine, SUMMARY_DISPLAY_MAX_LENGTH);
}
//@ chunk-nw7jbebs.js:33302-33363 facade-exports
function capFailureReasonForDisplay(failureReason) {
  let firstLine = failureReason ? getFirstLine(failureReason).trim() : "";
  return stripFrameControlChars(truncateToLength(firstLine, FAILURE_REASON_MAX_LENGTH));
}
//@ chunk-nw7jbebs.js:33363-33377 facade-exports
var PLAN_CONTENT_DISPLAY_BOUND = 40000;
//@ chunk-nw7jbebs.js:33377-33503 facade-exports
function capFrameBodyForDisplay(text, maxLength) {
  if (!text) return "";
  let stripped = stripFrameControlChars(text);
  let truncated = truncateToLength(stripped, maxLength);
  if (truncated.length >= stripped.length) return stripped;
  return `${stripFrameControlChars(truncated)}
[truncated for display]`;
}
//@ chunk-nw7jbebs.js:33503-33525 facade-exports
var IDLE_RESULT_MAX_LENGTH = 4000;
var IDLE_RESULT_TOTAL_BUDGET = 16000;
//@ chunk-nw7jbebs.js:33525-33741 facade-exports
function capIdleResult(text, allowTail = true) {
  let normalized = text ? normalizeResultText(text) : "";
  if (!normalized) return "";
  let truncated = truncateToLength(normalized, IDLE_RESULT_MAX_LENGTH);
  if (truncated.length >= normalized.length) return truncated;
  let result = stripFrameControlChars(truncated);
  return allowTail
    ? `${result}
[result truncated \u2014 ask the agent for the rest via ${SENDMESSAGE}]`
    : `${result}
[result truncated]`;
}
//@ chunk-nw7jbebs.js:33741-33810 facade-exports
var IDLE_RESULT_TAIL_RESERVE_CHARS; // deferred: uses IdleNotificationMessageSchema of its import cycle while loading; runs once the cycle is complete
var IDLE_SUMMARY_RECEIVE_BOUND;
var IDLE_ID_FIELD_RECEIVE_BOUND;
var MAX_FRAME_FIELD_CHARS;
var MAX_FRAME_DEPTH;
var IDLE_FRAME_TOTAL_RECEIVE_BOUND;
deferInit("chunk-nw7jbebs.js:33741", () => {
  IDLE_RESULT_TAIL_RESERVE_CHARS = 200;
  IDLE_SUMMARY_RECEIVE_BOUND = SUMMARY_DISPLAY_MAX_LENGTH * 2 + 16;
  IDLE_ID_FIELD_RECEIVE_BOUND = 256;
  MAX_FRAME_FIELD_CHARS = 256;
  MAX_FRAME_DEPTH = 4;
  IDLE_FRAME_TOTAL_RECEIVE_BOUND =
    IDLE_RESULT_MAX_LENGTH +
    IDLE_RESULT_TAIL_RESERVE_CHARS +
    IDLE_SUMMARY_RECEIVE_BOUND +
    FAILURE_REASON_MAX_LENGTH +
    3 * IDLE_ID_FIELD_RECEIVE_BOUND +
    1024;
});
//@ chunk-nw7jbebs.js:33810-34079 layout
function capFrameValue(value, depth) {
  if (typeof value === "string") return capStrippedFrameField(value, MAX_FRAME_FIELD_CHARS);
  if (value === null || typeof value !== "object") return value;
  if (depth <= 0) return null;
  if (Array.isArray(value)) return value.map((item) => capFrameValue(item, depth - 1));
  let entry = [];
  for (let [key, value_2] of Object.entries(value))
    entry.push([capStrippedFrameField(key, MAX_FRAME_FIELD_CHARS), capFrameValue(value_2, depth - 1)]);
  return Object.fromEntries(entry);
}
//@ chunk-nw7jbebs.js:34079-34274 facade-exports
function capReceivedIdleResult(text, allowTail) {
  let stripped = stripFrameControlChars(text);
  if (
    truncateToLength(stripped, IDLE_RESULT_MAX_LENGTH + IDLE_RESULT_TAIL_RESERVE_CHARS).length >=
    stripped.length
  )
    return stripped;
  let truncated = stripFrameControlChars(truncateToLength(stripped, IDLE_RESULT_MAX_LENGTH));
  return allowTail
    ? `${truncated}
[result truncated \u2014 ask the agent for the rest via ${SENDMESSAGE}]`
    : `${truncated}
[result truncated]`;
}
//@ chunk-nw7jbebs.js:34274-34606 facade-exports
/**
 * 队友信箱帧校验常量：时间戳格式、无效标记、权限/关机/计划审批请求 id 格式与长度上限。
 */
var ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
var INVALID_TIMESTAMP_MARKER = "[invalid timestamp]";
var INVALID_ID_MARKER = "[invalid id]";
var FRAME_SANITIZED_FOR_DISPLAY_MARKER = "[display sanitized; the agent reads the raw frame]";
var UNKNOWN_SENDER = "[unknown sender]";
var PERMISSION_REQUEST_ID_PATTERN = /^perm-[0-9]{1,20}-[0-9a-z]{1,12}$/;
var SHUTDOWN_OR_PLAN_REQUEST_ID_PATTERN =
  /^(?:shutdown|plan_approval)-[0-9]{1,20}@[^@\n]{1,300}(?:@[^@\n]{1,300})?$/u;
var MAX_REQUEST_ID_LENGTH = 320;
//@ chunk-nw7jbebs.js:34606-34725 layout
function sanitizeRequestId(requestId) {
  return !requestId.includes(`
`) &&
    !requestId.includes("\r") &&
    stripFrameControlChars(requestId) === requestId &&
    [...requestId].length <= MAX_REQUEST_ID_LENGTH &&
    (PERMISSION_REQUEST_ID_PATTERN.test(requestId) || SHUTDOWN_OR_PLAN_REQUEST_ID_PATTERN.test(requestId))
    ? requestId
    : INVALID_ID_MARKER;
}
//@ chunk-nw7jbebs.js:34725-34827 layout
var PANE_ID_PATTERN =
  /^(%[0-9]{1,10}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$/;
//@ chunk-nw7jbebs.js:34827-34866 layout
function sanitizePaneId(paneId) {
  return PANE_ID_PATTERN.test(paneId) ? paneId : INVALID_ID_MARKER;
}
//@ chunk-nw7jbebs.js:34866-34909 layout
var PANE_BACKENDS = {
  tmux: true,
  iterm2: true,
  "in-process": true,
};
//@ chunk-nw7jbebs.js:34909-34957 layout
function sanitizePaneBackend(backend) {
  return Object.hasOwn(PANE_BACKENDS, backend) ? backend : INVALID_ID_MARKER;
}
//@ chunk-nw7jbebs.js:34957-36390 layout
/**
 * 清洗收到的空闲通知帧以便显示：截断结果、摘要、失败原因与各 id 字段，发送者以信封为准，时间戳不合法则标记；未知字段截断；整体超长时反复对最长文本字段减半，结果被截断时追加说明。
 */
function sanitizeIdleNotificationFrame(text, idle, from) {
  let result =
    typeof idle.result === "string" && idle.result
      ? capReceivedIdleResult(idle.result, idle.idleReason !== "failed")
      : idle.result;
  let summary =
    typeof idle.summary === "string" && idle.summary
      ? capStrippedFrameField(idle.summary, IDLE_SUMMARY_RECEIVE_BOUND)
      : idle.summary;
  let failureReason =
    typeof idle.failureReason === "string" && idle.failureReason
      ? capFailureReasonForDisplay(idle.failureReason)
      : idle.failureReason;
  let from_2 =
    typeof idle.from === "string" && idle.from
      ? capIdFrameField(idle.from, IDLE_ID_FIELD_RECEIVE_BOUND)
      : idle.from;
  let sender =
    typeof from === "string"
      ? capIdFrameField(from, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER
      : undefined;
  let from_3 = sender !== undefined && typeof from_2 === "string" && from_2 !== sender ? sender : from_2;
  let timestamp =
    typeof idle.timestamp === "string" && ISO_TIMESTAMP_PATTERN.test(idle.timestamp)
      ? idle.timestamp
      : INVALID_TIMESTAMP_MARKER;
  let completedTaskId =
    typeof idle.completedTaskId === "string" && idle.completedTaskId
      ? capIdFrameField(idle.completedTaskId, IDLE_ID_FIELD_RECEIVE_BOUND)
      : idle.completedTaskId;
  let parsed = jsonParse(text);
  let payload =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {
          ...idle,
        };
  let knownKeys = new Set(Object.keys(IdleNotificationMessageSchema().shape));
  let entries = [];
  for (let [key, value] of Object.entries(payload)) {
    if (knownKeys.has(key)) {
      entries.push([key, value]);
      continue;
    }
    let key_2 = capStrippedFrameField(key, MAX_FRAME_FIELD_CHARS);
    if (knownKeys.has(key_2)) continue;
    entries.push([key_2, capFrameValue(value, MAX_FRAME_DEPTH)]);
  }
  let rawFields = Object.fromEntries(entries);
  let sanitizedFields = {
    result,
    summary,
    failureReason,
    from: from_3,
    timestamp,
    completedTaskId,
  };
  let idle_2 = {
    ...idle,
    ...sanitizedFields,
  };
  let text_2 = jsonStringify({
    ...rawFields,
    ...sanitizedFields,
  });
  if (text_2.length > IDLE_FRAME_TOTAL_RECEIVE_BOUND) text_2 = jsonStringify(idle_2);
  let resultTruncated = false;
  while (text_2.length > IDLE_FRAME_TOTAL_RECEIVE_BOUND) {
    let largest;
    let largestLength = 0;
    for (let keyName of ["result", "summary", "failureReason"]) {
      let value = idle_2[keyName];
      if (typeof value === "string" && value) {
        let valueLength = jsonStringify(value).length;
        if (valueLength > largestLength) {
          largest = {
            key: keyName,
            value,
          };
          largestLength = valueLength;
        }
      }
    }
    if (!largest) break;
    let charCount = [...largest.value].length;
    resultTruncated ||= largest.key === "result";
    idle_2 = {
      ...idle_2,
      [largest.key]: stripFrameControlChars(truncateToLength(largest.value, Math.floor(charCount / 2))),
    };
    text_2 = jsonStringify(idle_2);
  }
  if (resultTruncated && idle_2.result) {
    let withMarker = {
      ...idle_2,
      result: `${idle_2.result}
[result truncated]`,
    };
    let markerText = jsonStringify(withMarker);
    if (markerText.length <= IDLE_FRAME_TOTAL_RECEIVE_BOUND) {
      idle_2 = withMarker;
      text_2 = markerText;
    }
  }
  return text_2 === text
    ? {
        text,
        idle,
      }
    : {
        text: text_2,
        idle: idle_2,
      };
}
//@ chunk-nw7jbebs.js:36390-36489 layout
function capDisplayText(text, maxLength) {
  let stripped = stripFrameControlChars(text);
  let truncated = truncateToLength(stripped, maxLength);
  if (truncated.length >= stripped.length) return stripped;
  return `${stripFrameControlChars(truncated)}
[truncated]`;
}
//@ chunk-nw7jbebs.js:36489-37964 facade-exports
/**
 * teammate 协议帧字段规范表（每种帧的字段类型与长度上限），用于把帧改写成安全的可读形式。与 bridge 无关，属于 utils/teammateMailbox.ts。
 */
var MAX_UNKNOWN_FIELD_CHARS; // deferred: uses IDLE_RESULT_TAIL_RESERVE_CHARS of its import cycle while loading; runs once the cycle is complete
var MAX_EXTRA_FIELDS_CHARS;
var STRUCTURED_FRAME_RECEIVE_SPECS;
deferInit("chunk-nw7jbebs.js:36489", () => {
  MAX_UNKNOWN_FIELD_CHARS = 1024;
  MAX_EXTRA_FIELDS_CHARS = 2048;
  STRUCTURED_FRAME_RECEIVE_SPECS = new Map([
    [
      "plan_approval_request",
      {
        from: {
          kind: "envelope-pinned-id",
        },
        timestamp: {
          kind: "timestamp",
        },
        planFilePath: {
          kind: "id",
        },
        planContent: {
          kind: "body",
          bound: PLAN_CONTENT_DISPLAY_BOUND,
        },
        requestId: {
          kind: "request-id",
        },
      },
    ],
    [
      "plan_approval_response",
      {
        requestId: {
          kind: "request-id",
        },
        approved: {
          kind: "generic",
        },
        feedback: {
          kind: "body",
          bound: IDLE_RESULT_MAX_LENGTH,
        },
        timestamp: {
          kind: "timestamp",
        },
        permissionMode: {
          kind: "generic",
        },
      },
    ],
    [
      "shutdown_request",
      {
        requestId: {
          kind: "request-id",
        },
        from: {
          kind: "envelope-pinned-id",
        },
        reason: {
          kind: "body",
          bound: IDLE_SUMMARY_RECEIVE_BOUND,
        },
        timestamp: {
          kind: "timestamp",
        },
      },
    ],
    [
      "shutdown_approved",
      {
        requestId: {
          kind: "request-id",
        },
        from: {
          kind: "envelope-pinned-id",
        },
        timestamp: {
          kind: "timestamp",
        },
        paneId: {
          kind: "pane-id",
        },
        backendType: {
          kind: "backend-type",
        },
      },
    ],
    [
      "shutdown_rejected",
      {
        requestId: {
          kind: "request-id",
        },
        from: {
          kind: "envelope-pinned-id",
        },
        reason: {
          kind: "body",
          bound: IDLE_SUMMARY_RECEIVE_BOUND,
        },
        timestamp: {
          kind: "timestamp",
        },
      },
    ],
    [
      "task_assignment",
      {
        taskId: {
          kind: "id",
        },
        subject: {
          kind: "line",
        },
        description: {
          kind: "body",
          bound: IDLE_RESULT_MAX_LENGTH,
        },
        assignedBy: {
          kind: "envelope-pinned-id",
        },
        timestamp: {
          kind: "timestamp",
        },
      },
    ],
    [
      "task_completed",
      {
        from: {
          kind: "envelope-pinned-id",
        },
        taskId: {
          kind: "id",
        },
        taskSubject: {
          kind: "line",
        },
        timestamp: {
          kind: "timestamp",
        },
      },
    ],
    [
      "teammate_terminated",
      {
        message: {
          kind: "body",
          bound: IDLE_RESULT_MAX_LENGTH,
        },
      },
    ],
    [
      "idle_notification",
      {
        from: {
          kind: "envelope-pinned-id",
        },
        timestamp: {
          kind: "timestamp",
        },
        idleReason: {
          kind: "generic",
        },
        summary: {
          kind: "line",
        },
        completedTaskId: {
          kind: "id",
        },
        completedStatus: {
          kind: "generic",
        },
        failureReason: {
          kind: "body",
          bound: FAILURE_REASON_MAX_LENGTH,
        },
        result: {
          kind: "body",
          bound: IDLE_RESULT_MAX_LENGTH,
        },
      },
    ],
  ]);
});
//@ chunk-nw7jbebs.js:37964-38475 facade-exports (2.1.88 match: extractErrorTypeFromData, 0.779)
/**
 * 规范化一条 teammate 协议帧 JSON：按字段规范截断/清洗已知字段、限制未知字段总量；无变化返回 null。
 */
function sanitizeReceivedStructuredFrame(text, from) {
  if (!JSON_OBJECT_START.test(text)) return null;
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  let obj = parsed;
  let type = obj.type;
  let fromText = typeof type === "string" ? STRUCTURED_FRAME_RECEIVE_SPECS.get(type) : undefined;
  if (!fromText) return null;
  let result = new Set(Object.keys(fromText));
  let keptEntries = [];
  let extraChars = 0;
  for (let [key, value] of Object.entries(obj)) {
    if (key === "type") {
      keptEntries.push([key, type]);
      continue;
    }
    if (result.has(key)) {
      keptEntries.push([key, sanitizeFrameField(fromText[key], value, from)]);
      continue;
    }
    let envelope = capStrippedFrameField(key, MAX_FRAME_FIELD_CHARS);
    if (envelope === "type" || result.has(envelope)) continue;
    let fields = capFrameValue(value, MAX_FRAME_DEPTH);
    let out = jsonStringify(fields).length + envelope.length;
    if (extraChars + out > MAX_EXTRA_FIELDS_CHARS) continue;
    extraChars += out;
    keptEntries.push([envelope, fields]);
  }
  let rebuiltText = jsonStringify(Object.fromEntries(keptEntries));
  return rebuiltText === text ? null : rebuiltText;
}
//@ chunk-nw7jbebs.js:38475-39217 layout
/**
 * 按字段种类清洗收到的结构化帧字段：通用值截断、id/请求 id/窗格 id/后端类型校验格式、以信封发送者为准的 id、时间戳校验、单行与正文按上限截断；类型不对时给出无效标记。
 */
function sanitizeFrameField(fieldSpec, value, envelopeSender) {
  if (fieldSpec.kind === "generic") {
    let capped =
      typeof value === "string"
        ? capStrippedFrameField(value, MAX_FRAME_FIELD_CHARS)
        : capFrameValue(value, MAX_FRAME_DEPTH);
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
            : undefined) ?? INVALID_ID_MARKER
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
      return sanitizePaneId(value);
    case "backend-type":
      return sanitizePaneBackend(value);
    case "envelope-pinned-id": {
      let fieldId = capIdFrameField(value, IDLE_ID_FIELD_RECEIVE_BOUND);
      let sender =
        typeof envelopeSender === "string"
          ? capIdFrameField(envelopeSender, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER
          : undefined;
      return sender !== undefined && fieldId !== sender ? sender : fieldId;
    }
    case "timestamp":
      return ISO_TIMESTAMP_PATTERN.test(value) ? value : INVALID_TIMESTAMP_MARKER;
    case "line":
      return capIdFrameField(value, IDLE_SUMMARY_RECEIVE_BOUND);
    case "body":
      return capDisplayText(value, fieldSpec.bound);
  }
}
//@ chunk-nw7jbebs.js:39217-39327 facade-exports
function idleFrameRecency(idle, now) {
  let timestamp = Date.parse(idle.timestamp);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : Math.min(timestamp, now);
}
//@ chunk-nw7jbebs.js:39327-40557 facade-exports
function applyAggregateIdleResultBudget(messages) {
  if (weakSet_2.has(messages)) return messages;
  let sliced = messages.slice();
  let kept = [];
  let now = Date.now();
  for (let idx = 0; idx < sliced.length; idx++) {
    let isIdle = isIdleNotification(sliced[idx].text);
    if (!isIdle) {
      let sanitized = sanitizeReceivedStructuredFrame(sliced[idx].text, sliced[idx].from);
      if (sanitized !== null)
        sliced[idx] = {
          ...sliced[idx],
          text: sanitized,
        };
      continue;
    }
    let frame = sanitizeIdleNotificationFrame(sliced[idx].text, isIdle, sliced[idx].from);
    if (frame.text !== sliced[idx].text)
      sliced[idx] = {
        ...sliced[idx],
        text: frame.text,
      };
    let idle = frame.idle;
    if (typeof idle.result === "string" && idle.result)
      kept.push({
        index: idx,
        recency: idleFrameRecency(idle, now),
        idle,
      });
  }
  kept.sort((left, right) => right.recency - left.recency || right.index - left.index);
  let remainingBudget = IDLE_RESULT_TOTAL_BUDGET;
  let truncatedCount = 0;
  for (let { index, idle } of kept) {
    let entry = sliced[index];
    if (entry.text.length <= remainingBudget) {
      remainingBudget -= entry.text.length;
      continue;
    }
    let askHint = idle.idleReason === "failed" ? "" : `; ask the agent for it via ${SENDMESSAGE}`;
    let idleRecord = {
      type: "idle_notification",
      from: idle.from,
      timestamp: idle.timestamp,
      idleReason: idle.idleReason,
      summary: idle.summary,
      completedTaskId: idle.completedTaskId,
      completedStatus: idle.completedStatus,
      failureReason: idle.failureReason,
    };
    let truncatedText = jsonStringify({
      ...idleRecord,
      result: `[result truncated \u2014 this drain's results exceeded ${IDLE_RESULT_TOTAL_BUDGET} characters${askHint}]`,
    });
    if (truncatedText.length > remainingBudget)
      truncatedText = jsonStringify({
        ...idleRecord,
        result: "[result truncated]",
      });
    if (truncatedText.length >= entry.text.length) {
      remainingBudget = Math.max(0, remainingBudget - entry.text.length);
      continue;
    }
    remainingBudget = Math.max(0, remainingBudget - truncatedText.length);
    if (truncatedText !== entry.text) {
      truncatedCount++;
      sliced[index] = {
        ...entry,
        text: truncatedText,
      };
    }
  }
  if (truncatedCount > 0 && !weakSet.has(messages)) {
    weakSet.add(messages);
    logFeatureSad("swarm_idle_result_delivery", "budget_truncated");
  }
  if (sliced.every((message, index) => message === messages[index])) {
    weakSet_2.add(messages);
    return messages;
  }
  weakSet_2.add(sliced);
  return sliced;
}
//@ chunk-nw7jbebs.js:40557-40591 layout
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_2;
deferInit("chunk-nw7jbebs.js:40557", () => {
  weakSet = new WeakSet();
  weakSet_2 = new WeakSet();
});
//@ chunk-nw7jbebs.js:40591-40973 facade-exports (2.1.88 match: createIdleNotification, 0.929)
/**
 * 构造 idle_notification：idleReason（available/interrupted/failed）、摘要、完成的任务 ID 与状态、失败原因、结果（截断清洗）。
 */
function createIdleNotification(agentId, options) {
  let result =
    capIdleResult(options?.result, options?.senderReachable ?? options?.idleReason !== "failed") || undefined;
  return {
    type: "idle_notification",
    from: agentId,
    timestamp: new Date().toISOString(),
    idleReason: options?.idleReason,
    summary: options?.summary ? stripFrameControlChars(options.summary) : undefined,
    completedTaskId: options?.completedTaskId,
    completedStatus: options?.completedStatus,
    failureReason:
      capFailureReasonForDisplay(
        options?.failureReason ? stripFrameControlChars(options.failureReason) : undefined,
      ) || undefined,
    result,
  };
}
//@ chunk-nw7jbebs.js:40973-41218 facade-exports
/**
 * 记 swarm_idle_result_delivery：结果写入失败、完整送达或被截断。
 */
function logIdleResultDeliveryOutcome(notification, fullResult, msgId) {
  if (notification.result === undefined) return;
  if (msgId === undefined) logFeatureBad("swarm_idle_result_delivery", "mailbox_write_failed");
  else if (fullResult !== undefined && notification.result === normalizeResultText(fullResult))
    logFeatureOk("swarm_idle_result_delivery");
  else logFeatureSad("swarm_idle_result_delivery", "per_frame_truncated");
}
//@ chunk-nw7jbebs.js:41218-41478 layout
/**
 * 文本清洗用正则与上限：控制/格式字符、变体选择符等的保留个数。
 */
var UNSAFE_CHAR_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_2;
var VARIATION_SELECTOR_PATTERN;
var MIN_SELECTORS_PER_LINE;
var SELECTOR_LINE_DIVISOR;
var MIN_SELECTORS_TOTAL;
var SELECTOR_TOTAL_DIVISOR;
deferInit("chunk-nw7jbebs.js:41218", () => {
  UNSAFE_CHAR_PATTERN =
    /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029]|(?![\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}])[\p{Cf}\p{Default_Ignorable_Code_Point}]/u;
  regExp_2 = new RegExp(UNSAFE_CHAR_PATTERN.source, "gu");
  VARIATION_SELECTOR_PATTERN = /[\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
  MIN_SELECTORS_PER_LINE = 8;
  SELECTOR_LINE_DIVISOR = 7;
  MIN_SELECTORS_TOTAL = 16;
  SELECTOR_TOTAL_DIVISOR = 4;
});
//@ chunk-nw7jbebs.js:41478-41742 layout
function limitVariationSelectors(text) {
  let selectorCount = (text.match(VARIATION_SELECTOR_PATTERN) ?? []).length;
  let charCount = [...text].length - selectorCount;
  let max = Math.max(MIN_SELECTORS_TOTAL, Math.ceil(charCount / SELECTOR_TOTAL_DIVISOR));
  return text
    .split(
      `
`,
    )
    .map((line) => {
      let line_2 = (line.match(VARIATION_SELECTOR_PATTERN) ?? []).length;
      let max_2 = Math.max(
        MIN_SELECTORS_PER_LINE,
        Math.ceil(([...line].length - line_2) / SELECTOR_LINE_DIVISOR),
      );
      let replacedCount = 0;
      return line.replace(VARIATION_SELECTOR_PATTERN, (selector) =>
        replacedCount++ < max_2 && max-- > 0 ? selector : "",
      );
    }).join(`
`);
}
//@ chunk-nw7jbebs.js:41742-41789 facade-exports
/**
 * 清洗文本：规范化后去掉控制/不可见字符并限制变体选择符。
 */
function stripFrameControlChars(text) {
  return limitVariationSelectors(toWellFormedString(text).replace(regExp_2, ""));
}
//@ chunk-nw7jbebs.js:41789-41863 facade-exports
/**
 * 清洗后截断到指定长度（截断后再清洗一次）。
 */
function capStrippedFrameField(text, maxLength) {
  let messages = stripFrameControlChars(text);
  let truncated = truncateToLength(messages, maxLength);
  return truncated.length >= messages.length ? truncated : stripFrameControlChars(truncated);
}
//@ chunk-nw7jbebs.js:41863-41923 facade-exports
/**
 * 清洗、截断并压成单行。
 */
function capIdFrameField(text, maxLength) {
  return capStrippedFrameField(text, maxLength).replace(/\s+/g, " ").trim();
}
//@ chunk-nw7jbebs.js:41923-41939 layout
var JSON_OBJECT_START = /^\s*\{/;
//@ chunk-nw7jbebs.js:41939-42032 facade-exports
/**
 * 把消息正文中的协议帧（idle_notification 等）改写成可读文本。
 */
function capRawFrameTextForDisplay(text, from) {
  let idle = JSON_OBJECT_START.test(text) ? isIdleNotification(text) : null;
  if (idle) return sanitizeIdleNotificationFrame(text, idle, from).text;
  return sanitizeReceivedStructuredFrame(text, from) ?? text;
}
//@ chunk-nw7jbebs.js:42032-42067 layout
function normalizeResultText(text) {
  return stripFrameControlChars(text.trim());
}
//@ chunk-nw7jbebs.js:42067-42164 facade-exports
/**
 * 解析消息正文是否为 idle_notification 帧（schema 校验），返回帧或 null。
 */
function isIdleNotification(messageText) {
  try {
    let result = IdleNotificationMessageSchema().safeParse(jsonParse(messageText));
    return result.success ? result.data : null;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:42164-42645 facade-exports
/**
 * permission_response 帧 schema：success（updated_input、permission_updates）或 error（error），可带 approved_request {tool_use_id, tool_name, input_digest}。
 */
var ApprovedPermissionRequestSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PermissionResponseMessageSchema;
deferInit("chunk-nw7jbebs.js:42164", () => {
  ApprovedPermissionRequestSchema = DoctorLazy(() =>
    objectSchema({
      tool_use_id: stringSchema(),
      tool_name: stringSchema(),
      input_digest: stringSchema(),
    }),
  );
  PermissionResponseMessageSchema = DoctorLazy(() =>
    discriminatedUnion("subtype", [
      objectSchema({
        type: literal("permission_response"),
        request_id: stringSchema().min(1),
        subtype: literal("success"),
        tool_use_id: stringSchema().optional(),
        approved_request: ApprovedPermissionRequestSchema().optional(),
        response: objectSchema({
          updated_input: record(stringSchema(), unknown()).optional(),
          permission_updates: array(unknown()).optional(),
        }).optional(),
      }),
      objectSchema({
        type: literal("permission_response"),
        request_id: stringSchema().min(1),
        subtype: literal("error"),
        tool_use_id: stringSchema().optional(),
        approved_request: ApprovedPermissionRequestSchema().optional(),
        error: stringSchema(),
      }),
    ]),
  );
});
//@ chunk-nw7jbebs.js:42645-42879 facade-exports (2.1.88 match: createPermissionRequestMessage, 1)
/**
 * 构造 permission_request 帧（request_id、agent_id、tool_name、tool_use_id、description、input、permission_suggestions）。
 */
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
//@ chunk-nw7jbebs.js:42879-43310 facade-exports (2.1.88 match: createPermissionResponseMessage, 0.939)
/**
 * 构造 permission_response 帧：error（缺省 "Permission denied"）或 success（updated_input、permission_updates），可带 approved_request。
 */
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
    response: {
      updated_input: params.updated_input,
      permission_updates: params.permission_updates,
    },
  };
}
//@ chunk-nw7jbebs.js:43310-43406 facade-exports (2.1.88 match: isPermissionRequest, 1)
/**
 * 解析 permission_request 帧（不做 schema 校验）。
 */
function isPermissionRequest(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (parsed && parsed.type === "permission_request") return parsed;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:43406-43773 facade-exports (2.1.88 match: isPermissionResponse, 0.485)
/**
 * 解析并校验 permission_response 帧，格式不对时记日志返回 null。
 */
function isPermissionResponse(messageText) {
  let parsed;
  try {
    parsed = jsonParse(messageText);
  } catch {
    return null;
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("type" in parsed) ||
    parsed.type !== "permission_response"
  )
    return null;
  let response = PermissionResponseMessageSchema().safeParse(parsed);
  if (response.success) return response.data;
  logForDebugging(
    `[TeammateMailbox] Dropping malformed permission_response frame: ${response.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    {
      level: "warn",
    },
  );
  return null;
}
//@ chunk-nw7jbebs.js:43773-43970 facade-exports (2.1.88 match: createSandboxPermissionRequestMessage, 1)
/**
 * 构造 sandbox_permission_request 帧（requestId、worker 身份、hostPattern.host、createdAt）。
 */
function createSandboxPermissionRequestMessage(params) {
  return {
    type: "sandbox_permission_request",
    requestId: params.requestId,
    workerId: params.workerId,
    workerName: params.workerName,
    workerColor: params.workerColor,
    hostPattern: {
      host: params.host,
    },
    createdAt: Date.now(),
  };
}
//@ chunk-nw7jbebs.js:43970-44112 facade-exports (2.1.88 match: createSandboxPermissionResponseMessage, 1)
/**
 * 构造 sandbox_permission_response 帧（requestId、host、allow、timestamp）。
 */
function createSandboxPermissionResponseMessage(params) {
  return {
    type: "sandbox_permission_response",
    requestId: params.requestId,
    host: params.host,
    allow: params.allow,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-nw7jbebs.js:44112-44216 facade-exports (2.1.88 match: isSandboxPermissionRequest, 1)
/**
 * 解析 sandbox_permission_request 帧。
 */
function isSandboxPermissionRequest(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (parsed && parsed.type === "sandbox_permission_request") return parsed;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:44216-44321 facade-exports (2.1.88 match: isSandboxPermissionResponse, 1)
/**
 * 解析 sandbox_permission_response 帧。
 */
function isSandboxPermissionResponse(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (parsed && parsed.type === "sandbox_permission_response") return parsed;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:44321-44913 facade-exports
/**
 * 计划审批与关机帧的 schema：plan_approval_request、plan_approval_response、shutdown_request、shutdown_approved、shutdown_rejected。
 */
var PlanApprovalRequestMessageSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PlanApprovalResponseMessageSchema;
var ShutdownRequestMessageSchema;
var ShutdownApprovedMessageSchema;
var ShutdownRejectedMessageSchema;
deferInit("chunk-nw7jbebs.js:44321", () => {
  PlanApprovalRequestMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("plan_approval_request"),
      from: stringSchema(),
      timestamp: stringSchema(),
      planFilePath: stringSchema(),
      planContent: stringSchema(),
      requestId: stringSchema(),
    }),
  );
  PlanApprovalResponseMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("plan_approval_response"),
      requestId: stringSchema(),
      approved: booleanSchema(),
      feedback: stringSchema().optional(),
      timestamp: stringSchema(),
      permissionMode: externalPermissionModeSchema().optional(),
    }),
  );
  ShutdownRequestMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("shutdown_request"),
      requestId: stringSchema(),
      from: stringSchema(),
      reason: stringSchema().optional(),
      timestamp: stringSchema(),
    }),
  );
  ShutdownApprovedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("shutdown_approved"),
      requestId: stringSchema(),
      from: stringSchema(),
      timestamp: stringSchema(),
      paneId: stringSchema().optional(),
      backendType: stringSchema().optional(),
    }),
  );
  ShutdownRejectedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("shutdown_rejected"),
      requestId: stringSchema(),
      from: stringSchema(),
      reason: stringSchema(),
      timestamp: stringSchema(),
    }),
  );
});
//@ chunk-nw7jbebs.js:44913-45046 facade-exports (2.1.88 match: createShutdownRequestMessage, 1)
/**
 * 构造 shutdown_request 帧（requestId、from、reason、timestamp）。
 */
function createShutdownRequestMessage(params) {
  return {
    type: "shutdown_request",
    requestId: params.requestId,
    from: params.from,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-nw7jbebs.js:45046-45206 facade-exports (2.1.88 match: createShutdownApprovedMessage, 1)
/**
 * 构造 shutdown_approved 帧（可带 paneId、backendType 供 leader 清理 pane）。
 */
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
//@ chunk-nw7jbebs.js:45206-45340 facade-exports (2.1.88 match: createShutdownRejectedMessage, 1)
/**
 * 构造 shutdown_rejected 帧（附拒绝原因）。
 */
function createShutdownRejectedMessage(params) {
  return {
    type: "shutdown_rejected",
    requestId: params.requestId,
    from: params.from,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-nw7jbebs.js:45340-45435 facade-exports
/**
 * 解析 shutdown_request 帧（用 shutdownRequestSchema）。
 */
function isShutdownRequest(messageText) {
  try {
    let result = ShutdownRequestMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:45435-45530 facade-exports
/**
 * 解析 plan_approval_request 帧。
 */
function isPlanApprovalRequest(messageText) {
  try {
    let result = PlanApprovalRequestMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:45530-45625 facade-exports
/**
 * 解析 shutdown_approved 帧。
 */
function isShutdownApproved(messageText) {
  try {
    let result = ShutdownApprovedMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:45625-45636 facade-exports
var UNBOUND_PLAN_VERDICT_HONOURED = true;
//@ chunk-nw7jbebs.js:45636-45783 facade-exports
/**
 * 判断 leader 的计划审批回复与当前等待中的请求关系：unbound / already_answered / bound / mismatch。
 */
function planVerdictBinding(pendingApproval, response) {
  if (!pendingApproval) return UNBOUND_PLAN_VERDICT_HONOURED ? "unbound" : "mismatch";
  if (pendingApproval.answered) return "already_answered";
  return pendingApproval.requestId === response.requestId ? "bound" : "mismatch";
}
//@ chunk-nw7jbebs.js:45783-46025 facade-exports (2.1.88 match: PlanApprovalResponseMessageSchema, 0.611)
/**
 * 回复与等待中的请求不匹配时，构造一个"拒绝并要求重新提交"的 plan_approval_response。
 */
function planVerdictMismatchRejection(rejection) {
  return {
    type: "plan_approval_response",
    requestId: rejection.requestId,
    approved: false,
    feedback:
      "The team lead's verdict was for a different request, not this plan. Call ExitPlanMode again to resubmit it for approval.",
    timestamp: rejection.timestamp,
  };
}
//@ chunk-nw7jbebs.js:46025-46120 facade-exports
/**
 * 解析 plan_approval_response 帧。
 */
function isPlanApprovalResponse(messageText) {
  try {
    let result = PlanApprovalResponseMessageSchema().safeParse(jsonParse(messageText));
    if (result.success) return result.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:46120-46233 fingerprint (2.1.88 match: isTaskAssignment, 0.558)
/**
 * task_assignment 帧 schema（taskId、subject、description、assignedBy、timestamp）。
 */
var taskAssignmentSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nw7jbebs.js:46120", () => {
  taskAssignmentSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("task_assignment"),
      taskId: stringSchema(),
      subject: stringSchema(),
      description: stringSchema(),
      assignedBy: stringSchema(),
      timestamp: stringSchema(),
    }),
  );
});
//@ chunk-nw7jbebs.js:46233-46267 facade-exports
function isTaskAssignment(content) {
  return parseFrameForDisplay(taskAssignmentSchema(), content);
}
//@ chunk-nw7jbebs.js:46267-46453 facade-exports (2.1.88 match: UserTeammateMessage, 0.485)
var TaskCompletedMessageSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TeammateTerminatedMessageSchema;
deferInit("chunk-nw7jbebs.js:46267", () => {
  TaskCompletedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("task_completed"),
      from: stringSchema().optional(),
      taskId: stringSchema(),
      taskSubject: stringSchema().optional(),
      timestamp: stringSchema().optional(),
    }),
  );
  TeammateTerminatedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("teammate_terminated"),
      message: stringSchema(),
    }),
  );
});
//@ chunk-nw7jbebs.js:46453-46554 facade-exports
function parseFrameForDisplay(schema, text) {
  try {
    let parsed = schema.strict().safeParse(jsonParse(text));
    if (parsed.success) return parsed.data;
  } catch {}
  return null;
}
//@ chunk-nw7jbebs.js:46554-46804 facade-exports
function visibleTeammateMailboxMessages(messages) {
  return messages.filter((message) => {
    let msg = message;
    if (!isPlainObject(msg)) return false;
    if (msg.provenance === "forged") return true;
    if (msg.summary !== undefined && typeof msg.summary !== "string") return true;
    if (capFrameFieldForDisplay(msg.summary)) return true;
    if (typeof msg.text !== "string") return true;
    return !parseFrameForDisplay(ShutdownApprovedMessageSchema(), msg.text);
  });
}
//@ chunk-nw7jbebs.js:46804-46897 facade-exports (2.1.88 match: isTeamPermissionUpdate, 1)
/**
 * 正文是否为 team_permission_update 帧。
 */
function isTeamPermissionUpdate(messageText) {
  try {
    let parsed = jsonParse(messageText);
    return !!parsed && parsed.type === "team_permission_update";
  } catch {
    return false;
  }
}
//@ chunk-nw7jbebs.js:46897-46984 facade-exports (2.1.88 match: createModeSetRequestMessage, 1)
/**
 * 正文是否是 mode_set_request 帧。
 */
function isModeSetRequest(messageText) {
  try {
    let parsed = jsonParse(messageText);
    return !!parsed && parsed.type === "mode_set_request";
  } catch {
    return false;
  }
}
//@ chunk-nw7jbebs.js:46984-47120 facade-exports
/**
 * 拒绝把协议帧当作 teammate 初始提示词时的错误文字。
 */
var PROTOCOL_FRAME_PROMPT_ERROR =
  "Teammate prompt must not be a mailbox protocol frame (permission/mode/plan/shutdown JSON) \u2014 pass plain-text instructions";
//@ chunk-nw7jbebs.js:47120-47546 facade-exports (2.1.88 match: isStructuredProtocolMessage, 0.956)
/**
 * 正文是否是任一结构化协议帧（权限/沙箱/关机/团队权限/模式/计划审批）。
 */
function isStructuredProtocolMessage(messageText) {
  try {
    let parsed = jsonParse(messageText);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return false;
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
    return false;
  }
}
//@ chunk-nw7jbebs.js:47546-47760 facade-exports (2.1.88 match: getPlanApprovalSummary, 0.882)
function planApprovalResumeText(content) {
  let feedback = content.feedback ? capDisplayText(content.feedback, IDLE_RESULT_MAX_LENGTH) : "";
  if (content.approved)
    return feedback
      ? `[Plan Approved] ${feedback}`
      : "[Plan Approved] You can now proceed with implementation";
  return `[Plan Rejected] ${feedback || "Please revise your plan"}`;
}
//@ chunk-nw7jbebs.js:47760-47846 layout
var SHUTDOWN_REQUEST_ID_RE = /^shutdown-[0-9]{1,20}@[\w.-]{1,64}$/;
var SHUTDOWN_REQUEST_ID_PLACEHOLDER = "<requestId of the shutdown request>";
//@ chunk-nw7jbebs.js:47846-48339 facade-exports
function shutdownRequestReplyInstructions(requestId) {
  let matches = SHUTDOWN_REQUEST_ID_RE.test(requestId);
  let reply = jsonStringify({
    to: TEAM_LEAD,
    message: {
      type: "shutdown_response",
      request_id: matches ? requestId : SHUTDOWN_REQUEST_ID_PLACEHOLDER,
      approve: true,
    },
  });
  return `To approve it, call ${SENDMESSAGE} with exactly this input, where "message" is a JSON object rather than a string${matches ? "" : " and request_id is the request's requestId value, copied verbatim"}: ${reply}. Approving ends your process; a plain-text acknowledgment does not shut you down. To decline, for example because you're mid-task, send the same input with "approve": false and a "reason".`;
}
//@ chunk-nw7jbebs.js:48339-48491 facade-exports
function withShutdownReplyInstructions(text, from) {
  if (from !== TEAM_LEAD || !text.includes('"shutdown_request"')) return text;
  let request = isShutdownRequest(text);
  return request
    ? `${text}

This is a shutdown request. ${shutdownRequestReplyInstructions(request.requestId)}`
    : text;
}
//@ chunk-nw7jbebs.js:48491-48565 facade-exports
/**
 * 消息是否应作为普通文本展示给模型：非协议帧，或是 shutdown_approved / shutdown_request / plan_approval_request 帧（按 schema 实际解析的类型）。
 */
function isHeadlessLeadDisplayableMessage(messageText) {
  return (
    !isStructuredProtocolMessage(messageText) ||
    isShutdownApproved(messageText) !== null ||
    isShutdownRequest(messageText) !== null ||
    isPlanApprovalRequest(messageText) !== null
  );
}
//@ chunk-nw7jbebs.js:48565-49290 facade-exports
/**
 * 按谓词删除 inbox 中的消息（同时去掉已读的），加锁执行。
 */
async function markMessagesAsReadByPredicate(agentName, predicate, teamName, store) {
  let storeKey =
    isStorageV5Enabled() && store !== undefined ? mailboxStoreKey(agentName, teamName) : undefined;
  if (isMailboxUnavailable(storeKey, "markMessagesAsReadByPredicate", agentName)) return false;
  let inboxPath = getInboxPath(agentName, teamName);
  if (isStorageV5Enabled() && store !== undefined && storeKey !== undefined)
    try {
      await updateInboxInStore(store, storeKey, inboxPath, (result) =>
        !result.found || result.messages.length === 0
          ? {
              skip: true,
              result: undefined,
            }
          : {
              messages: result.messages.filter((message) => !message.read && !predicate(message)),
              result: undefined,
            },
      );
      return true;
    } catch (error) {
      logError(error);
      return false;
    }
  let lockfilePath = `${inboxPath}.lock`;
  let readResult;
  try {
    readResult = await lock(inboxPath, {
      lockfilePath,
      ...LOCK_OPTIONS,
    });
    let mailbox = await readMailbox(agentName, teamName, undefined, {
      throwOnUnknownReadError: true,
    });
    if (mailbox.length === 0) {
      reconcileMessageLedger(inboxPath, mailbox, mailbox);
      return true;
    }
    let filtered = mailbox.filter((messages) => !messages.read && !predicate(messages));
    await getFileReader().atomicWrite(inboxPath, jsonStringify(filtered, null, 2));
    reconcileMessageLedger(inboxPath, mailbox, filtered);
    return true;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      mailboxLedger().forget(inboxPath);
      return true;
    }
    logError(error);
    return false;
  } finally {
    await releaseLockQuietly(readResult, "[TeammateMailbox] markMessagesAsReadByPredicate");
  }
}
//@ chunk-nw7jbebs.js:49290-49459 facade-exports
/**
 * 是否是真实用户输入（非 meta、非 tool_result）。
 */
function isTeammateWakeupPrompt(message) {
  return (
    message.type === "user" &&
    message.isMeta !== true &&
    message.turnCompanion !== true &&
    (typeof message.message.content === "string" ||
      !message.message.content.some((block) => block.type === "tool_result"))
  );
}
//@ chunk-nw7jbebs.js:49459-50127 facade-exports (2.1.88 match: getLastPeerDmSummary, 1)
/**
 * 自最近一次用户输入以来，最后一条发给具体 peer（非广播、非 team-lead、非 main）的 SendMessage 摘要："[to 名字] 摘要"。
 */
function getLastPeerDmSummary(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
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
        let message = "message" in block.input ? block.input.message : undefined;
        let summary =
          "summary" in block.input && typeof block.input.summary === "string"
            ? block.input.summary
            : undefined;
        let block_2 = splitRepairedMessage(block.input);
        if (block_2 !== undefined)
          return `[to ${capFrameFieldForDisplay(block.input.to)}] ${capFrameFieldForDisplay(block_2.summary.length > 0 ? block_2.summary : block_2.message.trim())}`;
        if (typeof message === "string")
          return `[to ${capFrameFieldForDisplay(block.input.to)}] ${capFrameFieldForDisplay(summary !== undefined ? summary : truncateToLength(message, 80))}`;
      }
  }
  return;
}
export {
  writeToMailbox,
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
  logIdleResultDeliveryOutcome,
  markMessagesAsReadByPredicate,
  isStructuredProtocolMessage,
  createShutdownRequestMessage,
  createShutdownApprovedMessage,
  createShutdownRejectedMessage,
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
  visibleTeammateMailboxMessages,
  capIdFrameField,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  capFrameFieldForDisplay,
  TaskCompletedMessageSchema,
  IDLE_SUMMARY_RECEIVE_BOUND,
  ShutdownRequestMessageSchema,
  ShutdownApprovedMessageSchema,
  ShutdownRejectedMessageSchema,
  IDLE_RESULT_MAX_LENGTH,
  isTaskAssignment,
  TeammateTerminatedMessageSchema,
  PlanApprovalRequestMessageSchema,
  PlanApprovalResponseMessageSchema,
  capFailureReasonForDisplay,
  capReceivedIdleResult,
  clearMailbox,
  PROTOCOL_FRAME_PROMPT_ERROR,
  getLastPeerDmSummary,
  isTeammateWakeupPrompt,
  isHeadlessLeadDisplayableMessage,
  ApprovedPermissionRequestSchema,
  FAILURE_REASON_MAX_LENGTH,
  IDLE_RESULT_TOTAL_BUDGET,
  INVALID_ID_MARKER,
  INVALID_TIMESTAMP_MARKER,
  PermissionResponseMessageSchema,
  STRUCTURED_FRAME_RECEIVE_SPECS,
  SUMMARY_DISPLAY_MAX_LENGTH,
  UNBOUND_PLAN_VERDICT_HONOURED,
  applyAggregateIdleResultBudget,
  capIdleResult,
  flushPendingMailboxPrunes,
  idleFrameRecency,
  pruneInvalidMailboxEntries,
  shutdownRequestReplyInstructions,
};
