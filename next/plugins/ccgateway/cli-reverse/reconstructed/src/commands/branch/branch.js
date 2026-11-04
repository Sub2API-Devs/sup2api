/**
 * commands/branch/branch.ts
 *
 * /branch 实现：把当前对话在此处分叉成新会话（存储 v5 直接 createFork，旧存储复制 JSONL），记录 fork_inherit
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/branch/branch.ts
 * pieces: chunk-khj4kcw5.js (8)
 * attribution: affinity 2, fingerprint 4, layout 2
 */
import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { once } from "events";
import { finished } from "stream/promises";
import { renderPluginPrompt } from "../../utils/messages/pluginPrompts.js";
import {
  getSessionId,
  getConversationAtisLatch,
  getConversationToolsUsed,
  getOriginalCwd,
  isDiskless,
} from "../../bootstrap/state.js";
import {
  isSessionHistorySuppressed,
  isSessionHistorySuppressedFor,
  pinSessionId,
  getProjectDir,
  getTranscriptPathForSession,
  getMaterializedSessionFile,
  getTranscriptPath,
  getTranscriptStorageKey,
  isTranscriptMessage,
  searchSessionsByCustomTitle,
  getCurrentSessionTitle,
  getCurrentSessionMemoryModeStamps,
  primeSessionMessagesCache,
  saveCustomTitle,
  saveAgentName,
  isPrecautionarySuppressionHeldFor,
} from "../../utils/sessionStorage.js";
import { isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getProjectKey, buildHistorySuppressionEntry } from "../../utils/sessionStoragePortable.js";
import { isENOENT, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { transcriptLines } from "../../utils/backgroundSessionResume.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { urlPatternToRegex, firstLineOf } from "../../utils/stringUtils.js";
import { logEvent } from "../../services/analytics/index.js";
import { syncJobName, getOwnJobShortId } from "../../services/daemon/jobState.js";

//@ chunk-khj4kcw5.js:12227-12248 affinity
/**
 * MAX_FORK_TRANSCRIPT_BYTES：4194304。
 */
var MAX_FORK_TRANSCRIPT_BYTES = 4194304;
var MAX_BRANCH_MESSAGES = 1e5;
//@ chunk-khj4kcw5.js:12248-12452 fingerprint (2.1.88 match: deriveFirstPrompt, 0.567)
function deriveFirstPrompt(firstUserMessage) {
  let firstMessageSeed = {
    commandFallback: "",
  };
  let text;
  for (let part of firstUserMessage) {
    text = renderPluginPrompt(part, firstMessageSeed, "shown");
    if (text !== undefined) break;
  }
  text ??= firstMessageSeed.commandFallback;
  return text.replace(/\s+/g, " ").trim().slice(0, 100).trimEnd() || "Branched conversation";
}
//@ chunk-khj4kcw5.js:12452-15231 fingerprint (2.1.88 match: createFork, 0.46)
async function createFork(messages, customTitle, extraMessages, storageV5) {
  let forkSessionId = randomUUID();
  let originalSessionId = getSessionId();
  let historySuppressed =
    isSessionHistorySuppressed() || isSessionHistorySuppressedFor(pinSessionId(originalSessionId));
  let conversationAtisLatch = getConversationAtisLatch();
  let toolsUsed = isSillyShoreGateOn() ? getConversationToolsUsed().names() : [];
  let atisLatch = undefined;
  let relocatedCwd = undefined;
  let projectDir = getProjectDir(getOriginalCwd());
  let forkSessionPath = getTranscriptPathForSession(forkSessionId);
  let sessionFile = getMaterializedSessionFile() ?? getTranscriptPath();
  let transcriptStorageKey = getTranscriptStorageKey(sessionFile, storageV5);
  if (transcriptStorageKey !== undefined)
    return createForkFromStorage({
      sourceV5: transcriptStorageKey,
      forkKey: STORAGE_SPACES.transcript(getProjectKey(getOriginalCwd()), forkSessionId),
      forkSessionId,
      originalSessionId,
      sourceTaintAtEntry: historySuppressed,
      atisLatchAtEntry: conversationAtisLatch,
      toolsUsedAtEntry: toolsUsed,
      currentMessages: messages,
      customTitle,
      extraMessages,
      forkSessionPath,
    });
  if (isDiskless()) throw Error("No conversation to branch");
  await mkdir(projectDir, {
    recursive: true,
    mode: 448,
  });
  let transcript;
  try {
    transcript = createReadStream(sessionFile, {
      encoding: "utf8",
    });
    await once(transcript, "open");
  } catch (error) {
    if (isENOENT(error)) throw Error("No conversation to branch");
    logError(error);
    throw error;
  }
  let writeStream = createWriteStream(forkSessionPath, {
    encoding: "utf8",
    mode: 384,
  });
  let outStream = null;
  writeStream.on("error", (entry) => {
    outStream = toError(entry);
  });
  let seenUuids = new Set(messages.map((entry) => entry.uuid));
  let rowsByUuid = new Map();
  let lines = [];
  let extraLines = [];
  let tally;
  let cleanup = async () => {
    writeStream.destroy();
    await unlink(forkSessionPath).catch(() => {});
  };
  let writeRow = async (entry) => {
    if (outStream) {
      await cleanup();
      throw outStream;
    }
    if (!writeStream.write(entry)) await once(writeStream, "drain").catch(() => {});
  };
  let suppressedFlag = historySuppressed;
  let nextLine = () =>
    writeRow(
      jsonStringify(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")) +
        `
`,
    );
  try {
    if (suppressedFlag) await nextLine();
    for await (let line of transcriptLines(transcript)) {
      if (line.length === 0) continue;
      let parsed;
      try {
        parsed = jsonParse(line);
      } catch {
        continue;
      }
      if (!isPlainObject(parsed)) continue;
      let row = parsed;
      if (
        row.type === "content-replacement" &&
        row.sessionId === originalSessionId &&
        Array.isArray(row.replacements)
      ) {
        lines.push(...row.replacements);
        continue;
      }
      if (
        row.type === "relocated" &&
        row.sessionId === originalSessionId &&
        typeof row.relocatedCwd === "string" &&
        row.relocatedCwd !== ""
      ) {
        tally = row.relocatedCwd;
        continue;
      }
      if (row.type === "memory-mode" && row.sessionId === originalSessionId) {
        extraLines.push(row);
        continue;
      }
      if (row.type === "history-suppression") {
        if (!suppressedFlag) {
          suppressedFlag = true;
          await nextLine();
        }
        continue;
      }
      if (!isTranscriptMessage(row) || row.isSidechain || !seenUuids.has(row.uuid)) continue;
      rowsByUuid.set(row.uuid, row);
    }
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    transcript.destroy();
  }
  let parentUuid = null;
  let lastRow = null;
  let tail = [];
  try {
    for (let message of messages) {
      let row = rowsByUuid.get(message.uuid);
      if (!row) continue;
      let patch =
        row.type === "system" && row.subtype === "model_refusal_fallback"
          ? {
              neutralizedByFork: true,
            }
          : undefined;
      let rewritten = {
        ...row,
        ...patch,
        sessionId: forkSessionId,
        parentUuid,
        isSidechain: false,
        sessionKind: undefined,
        forkedFrom: {
          sessionId: originalSessionId,
          messageUuid: row.uuid,
        },
      };
      let mergedRow = {
        ...row,
        ...patch,
        sessionId: forkSessionId,
      };
      tail.push(mergedRow);
      lastRow = row;
      await writeRow(
        jsonStringify(rewritten) +
          `
`,
      );
      if (row.type !== "progress") parentUuid = row.uuid;
    }
  } catch (error) {
    await cleanup();
    throw error;
  }
  if (lastRow === null) {
    await cleanup();
    throw Error("No messages to branch");
  }
  if (extraMessages?.length)
    for (let message of extraMessages) {
      let base = {
        ...message,
        cwd: lastRow.cwd,
        userType: lastRow.userType,
        entrypoint: lastRow.entrypoint,
        version: lastRow.version,
        gitBranch: lastRow.gitBranch,
        sessionId: forkSessionId,
        timestamp: new Date().toISOString(),
      };
      let row = {
        ...base,
        parentUuid,
        isSidechain: false,
      };
      tail.push(base);
      await writeRow(
        jsonStringify(row) +
          `
`,
      );
      if (message.type !== "progress") parentUuid = message.uuid;
    }
  if (lines.length > 0)
    await writeRow(
      jsonStringify({
        type: "content-replacement",
        sessionId: forkSessionId,
        replacements: lines,
      }) +
        `
`,
    );
  for (let entry of extraLines) {
    let serialized = {
      ...entry,
      sessionId: forkSessionId,
    };
    await writeRow(
      jsonStringify(serialized) +
        `
`,
    );
  }
  if (tally)
    await writeRow(
      jsonStringify({
        type: "relocated",
        sessionId: forkSessionId,
        relocatedCwd: tally,
      }) +
        `
`,
    );
  if (conversationAtisLatch !== undefined)
    await writeRow(
      jsonStringify({
        type: "atis-latch",
        sessionId: forkSessionId,
        atis: conversationAtisLatch,
      }) +
        `
`,
    );
  if (toolsUsed.length > 0)
    await writeRow(
      jsonStringify({
        type: "tools-used",
        sessionId: forkSessionId,
        tools: toolsUsed,
      }) +
        `
`,
    );
  writeStream.end();
  await finished(writeStream).catch(() => {});
  if (outStream) {
    await cleanup();
    throw outStream;
  }
  return {
    sessionId: forkSessionId,
    title: customTitle,
    forkPath: forkSessionPath,
    serializedMessages: tail,
    contentReplacementRecords: lines,
    sessionHistorySuppressed: suppressedFlag,
  };
}
//@ chunk-khj4kcw5.js:15231-15267 layout
function toJsonlLine(message) {
  return {
    data:
      jsonStringify(message) +
      `
`,
  };
}
//@ chunk-khj4kcw5.js:15267-18005 layout
/**
 * createForkFromStorage：storage v5 路径的 createFork。
 */
async function createForkFromStorage(entry) {
  let {
    sourceV5,
    forkKey,
    forkSessionId,
    originalSessionId,
    currentMessages,
    customTitle,
    extraMessages,
    forkSessionPath,
  } = entry;
  let atisLatch = undefined;
  let relocatedCwd = undefined;
  let { backend, key } = sourceV5;
  let records = [];
  let currentUuids = new Set(currentMessages.map((currentMessage) => currentMessage.uuid));
  let byUuid = new Map();
  let replacements = [];
  let extraRows = [];
  let cwdAfterMove;
  let sourceTaintAtEntry = entry.sourceTaintAtEntry;
  if (sourceTaintAtEntry)
    records.push(toJsonlLine(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")));
  let parsed;
  for (let i = 0; ; i++) {
    if (i >= MAX_BRANCH_MESSAGES) throw Error("Conversation too long to branch through storage");
    let records_2 = await backend.readRecords(key, {
      order: "forward",
      maxBytes: MAX_FORK_TRANSCRIPT_BYTES,
      ...(parsed !== undefined && {
        fromSeq: parsed,
      }),
    });
    if (!records_2.ok) {
      if (records_2.error.code === "NotFound") throw Error("No conversation to branch");
      let unreadable = Error("Conversation unreadable through storage", {
        cause: records_2.error,
      });
      logError(unreadable);
      throw unreadable;
    }
    for (let item of records_2.value.items) {
      let text = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength)
        .toString("utf8")
        .trimEnd();
      if (text.length === 0) continue;
      let row;
      try {
        row = jsonParse(text);
      } catch {
        continue;
      }
      if (!isPlainObject(row)) continue;
      let parsedRow = row;
      if (
        parsedRow.type === "content-replacement" &&
        parsedRow.sessionId === originalSessionId &&
        Array.isArray(parsedRow.replacements)
      ) {
        replacements.push(...parsedRow.replacements);
        continue;
      }
      if (
        parsedRow.type === "relocated" &&
        parsedRow.sessionId === originalSessionId &&
        typeof parsedRow.relocatedCwd === "string" &&
        parsedRow.relocatedCwd !== ""
      ) {
        cwdAfterMove = parsedRow.relocatedCwd;
        continue;
      }
      if (parsedRow.type === "memory-mode" && parsedRow.sessionId === originalSessionId) {
        extraRows.push(parsedRow);
        continue;
      }
      if (parsedRow.type === "history-suppression") {
        if (!sourceTaintAtEntry) {
          sourceTaintAtEntry = true;
          records.push(toJsonlLine(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")));
        }
        continue;
      }
      if (!isTranscriptMessage(parsedRow) || parsedRow.isSidechain || !currentUuids.has(parsedRow.uuid))
        continue;
      byUuid.set(parsedRow.uuid, parsedRow);
    }
    parsed = records_2.value.nextSeq;
    if (parsed === undefined) break;
  }
  let prevUuid = null;
  let prevBranch = null;
  let out = [];
  for (let currentMessage of currentMessages) {
    let orig = byUuid.get(currentMessage.uuid);
    if (!orig) continue;
    let next =
      orig.type === "system" && orig.subtype === "model_refusal_fallback"
        ? {
            neutralizedByFork: true,
          }
        : undefined;
    let record = {
      ...orig,
      ...next,
      sessionId: forkSessionId,
      parentUuid: prevUuid,
      isSidechain: false,
      sessionKind: undefined,
      forkedFrom: {
        sessionId: originalSessionId,
        messageUuid: orig.uuid,
      },
    };
    out.push({
      ...orig,
      ...next,
      sessionId: forkSessionId,
    });
    prevBranch = orig;
    records.push(toJsonlLine(record));
    if (orig.type !== "progress") prevUuid = orig.uuid;
  }
  if (prevBranch === null) throw Error("No messages to branch");
  if (extraMessages?.length)
    for (let extraMessage of extraMessages) {
      let record = {
        ...extraMessage,
        cwd: prevBranch.cwd,
        userType: prevBranch.userType,
        entrypoint: prevBranch.entrypoint,
        version: prevBranch.version,
        gitBranch: prevBranch.gitBranch,
        sessionId: forkSessionId,
        timestamp: new Date().toISOString(),
      };
      out.push(record);
      records.push(
        toJsonlLine({
          ...record,
          parentUuid: prevUuid,
          isSidechain: false,
        }),
      );
      if (extraMessage.type !== "progress") prevUuid = extraMessage.uuid;
    }
  if (replacements.length > 0) {
    let replacementRecord = {
      type: "content-replacement",
      sessionId: forkSessionId,
      replacements,
    };
    records.push(toJsonlLine(replacementRecord));
  }
  for (let message of extraRows) {
    let record = {
      ...message,
      sessionId: forkSessionId,
    };
    records.push(toJsonlLine(record));
  }
  if (cwdAfterMove) {
    let record = {
      type: "relocated",
      sessionId: forkSessionId,
      relocatedCwd: cwdAfterMove,
    };
    records.push(toJsonlLine(record));
  }
  if (entry.atisLatchAtEntry !== undefined) {
    let record = {
      type: "atis-latch",
      sessionId: forkSessionId,
      atis: entry.atisLatchAtEntry,
    };
    records.push(toJsonlLine(record));
  }
  if (entry.toolsUsedAtEntry.length > 0) {
    let record = {
      type: "tools-used",
      sessionId: forkSessionId,
      tools: [...entry.toolsUsedAtEntry],
    };
    records.push(toJsonlLine(record));
  }
  let appended = await backend.append(forkKey, records);
  if (!appended.ok) {
    await backend.delete(forkKey).catch(() => {
      return;
    });
    throw Error("Branch could not be written through storage", {
      cause: appended.error,
    });
  }
  return {
    sessionId: forkSessionId,
    title: customTitle,
    forkPath: forkSessionPath,
    serializedMessages: out,
    contentReplacementRecords: replacements,
    sessionHistorySuppressed: sourceTaintAtEntry,
  };
}
//@ chunk-khj4kcw5.js:18005-18361 fingerprint (2.1.88 match: getUniqueForkName, 1)
async function getUniqueForkName(baseName, storageV5) {
  let candidateName = `${baseName} (Branch)`;
  if (
    (
      await searchSessionsByCustomTitle(
        candidateName,
        {
          exact: true,
        },
        storageV5,
      )
    ).length === 0
  )
    return candidateName;
  let existingForks = await searchSessionsByCustomTitle(`${baseName} (Branch`, undefined, storageV5);
  let usedNumbers = new Set([1]);
  let forkNumberPattern = new RegExp(`^${urlPatternToRegex(baseName)} \\(Branch(?: (\\d+))?\\)$`);
  for (let session of existingForks) {
    let match = session.customTitle?.match(forkNumberPattern);
    if (match)
      if (match[1]) usedNumbers.add(parseInt(match[1], 10));
      else usedNumbers.add(1);
  }
  let nextNumber = 2;
  while (usedNumbers.has(nextNumber)) nextNumber++;
  return `${baseName} (Branch ${nextNumber})`;
}
//@ chunk-khj4kcw5.js:18361-19802 fingerprint (2.1.88 match: call, 0.745)
async function call(onDone, context, args = {}) {
  let sessionId = getSessionId();
  let currentSessionTitle = getCurrentSessionTitle(sessionId);
  let historySuppressed =
    isSessionHistorySuppressed() || isSessionHistorySuppressedFor(pinSessionId(sessionId));
  let originalSessionId = getConversationAtisLatch();
  let toolsUsed = getConversationToolsUsed().names();
  let atisLatch = undefined;
  let relocatedCwd = undefined;
  let memoryModeStamps = getCurrentSessionMemoryModeStamps().map(({ inFlight, ...stamp }) => stamp);
  try {
    let {
      sessionId: sessionId_2,
      title,
      forkPath,
      serializedMessages,
      contentReplacementRecords,
      sessionHistorySuppressed,
    } = await createFork(onDone.messages, args.customTitle, args.extraMessages, onDone.storageV5);
    primeSessionMessagesCache(
      sessionId_2,
      serializedMessages.map((m) => m.uuid),
    );
    let now = new Date();
    let firstPrompt = deriveFirstPrompt(serializedMessages);
    let forkName =
      title?.replace(/\s+/g, " ").trim() ?? (await getUniqueForkName(firstPrompt, onDone.storageV5));
    let nameSource = title ? "user" : "auto";
    await saveCustomTitle(sessionId_2, forkName, forkPath, nameSource, onDone.storageV5);
    await saveAgentName(sessionId_2, forkName, forkPath, nameSource, onDone.storageV5);
    logEvent("tengu_conversation_forked", {
      message_count: serializedMessages.length,
      has_custom_title: !!title,
    });
    let forkLog = {
      date: firstLineOf(now.toISOString(), "T"),
      messages: serializedMessages,
      fullPath: forkPath,
      value: now.getTime(),
      created: now,
      modified: now,
      firstPrompt,
      messageCount: serializedMessages.length,
      isSidechain: false,
      sessionId: sessionId_2,
      customTitle: forkName,
      agentName: forkName,
      contentReplacements: contentReplacementRecords,
      sessionHistorySuppressed: sessionHistorySuppressed || historySuppressed ? true : undefined,
      atisLatch: originalSessionId,
      toolsUsed,
      memoryModeStamps,
      precautionarySuppressionHeld: isPrecautionarySuppressionHeldFor(pinSessionId(sessionId))
        ? true
        : undefined,
      forkedFromSessionId: sessionId,
    };
    let titleInfo = title ? ` "${forkName}"` : "";
    let titleSuffix = currentSessionTitle ? ` ("${currentSessionTitle}")` : "";
    let successMessage = `Branched conversation${titleInfo}. You are now in the new branch (session ${sessionId_2}). Use /resume ${sessionId}${titleSuffix} to return to the original, or run \`claude -r ${sessionId}\` in a new terminal.`;
    if (onDone.resume) {
      await onDone.resume(sessionId_2, forkLog, "fork");
      syncJobName(getOwnJobShortId(), forkName, "user", onDone.storageV5);
      context(successMessage, {
        display: "system",
      });
    } else context(`Branched conversation${titleInfo}. Resume with: /resume ${sessionId_2}`);
    return true;
  } catch (error) {
    let message = error instanceof Error ? error.message : "Unknown error occurred";
    context(`Failed to branch conversation: ${message}`);
    return false;
  }
}
//@ chunk-khj4kcw5.js:19802-19885 affinity
/**
 * /branch 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function branchCommandCall(onDone, context, args) {
  await call(context, onDone, {
    customTitle: args?.trim() || undefined,
  });
  return null;
}
export { call, branchCommandCall, createFork, deriveFirstPrompt };
