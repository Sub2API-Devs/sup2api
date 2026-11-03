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
//@ chunk-khj4kcw5.js:12248-12452 fingerprint = deriveFirstPrompt (0.567)
function deriveFirstPrompt(firstUserMessage) {
  let p = {
    commandFallback: "",
  };
  let d;
  for (let s of firstUserMessage) {
    d = renderPluginPrompt(s, p, "shown");
    if (d !== undefined) break;
  }
  d ??= p.commandFallback;
  return d.replace(/\s+/g, " ").trim().slice(0, 100).trimEnd() || "Branched conversation";
}
//@ chunk-khj4kcw5.js:12452-15231 fingerprint = createFork (0.46)
async function createFork(messages, customTitle, extraMessages, storageV5) {
  let forkSessionId = randomUUID();
  let originalSessionId = getSessionId();
  let O = isSessionHistorySuppressed() || isSessionHistorySuppressedFor(pinSessionId(originalSessionId));
  let conversationAtisLatch = getConversationAtisLatch();
  let v = isSillyShoreGateOn() ? getConversationToolsUsed().names() : [];
  let B = undefined;
  let j = undefined;
  let projectDir = getProjectDir(getOriginalCwd());
  let forkSessionPath = getTranscriptPathForSession(forkSessionId);
  let f = getMaterializedSessionFile() ?? getTranscriptPath();
  let transcriptStorageKey = getTranscriptStorageKey(f, storageV5);
  if (transcriptStorageKey !== undefined)
    return createForkFromStorage({
      sourceV5: transcriptStorageKey,
      forkKey: STORAGE_SPACES.transcript(getProjectKey(getOriginalCwd()), forkSessionId),
      forkSessionId,
      originalSessionId,
      sourceTaintAtEntry: O,
      atisLatchAtEntry: conversationAtisLatch,
      toolsUsedAtEntry: v,
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
  let U;
  try {
    U = createReadStream(f, {
      encoding: "utf8",
    });
    await once(U, "open");
  } catch (error) {
    if (isENOENT(error)) throw Error("No conversation to branch");
    logError(error);
    throw error;
  }
  let writeStream = createWriteStream(forkSessionPath, {
    encoding: "utf8",
    mode: 384,
  });
  let w = null;
  writeStream.on("error", (entry) => {
    w = toError(entry);
  });
  let P = new Set(messages.map((entry) => entry.uuid));
  let g = new Map();
  let I = [];
  let C = [];
  let h;
  let A = async () => {
    writeStream.destroy();
    await unlink(forkSessionPath).catch(() => {});
  };
  let M = async (entry) => {
    if (w) {
      await A();
      throw w;
    }
    if (!writeStream.write(entry)) await once(writeStream, "drain").catch(() => {});
  };
  let n = O;
  let r = () =>
    M(
      jsonStringify(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")) +
        `
`,
    );
  try {
    if (n) await r();
    for await (let e of transcriptLines(U)) {
      if (e.length === 0) continue;
      let c;
      try {
        c = jsonParse(e);
      } catch {
        continue;
      }
      if (!isPlainObject(c)) continue;
      let i = c;
      if (
        i.type === "content-replacement" &&
        i.sessionId === originalSessionId &&
        Array.isArray(i.replacements)
      ) {
        I.push(...i.replacements);
        continue;
      }
      if (
        i.type === "relocated" &&
        i.sessionId === originalSessionId &&
        typeof i.relocatedCwd === "string" &&
        i.relocatedCwd !== ""
      ) {
        h = i.relocatedCwd;
        continue;
      }
      if (i.type === "memory-mode" && i.sessionId === originalSessionId) {
        C.push(i);
        continue;
      }
      if (i.type === "history-suppression") {
        if (!n) {
          n = true;
          await r();
        }
        continue;
      }
      if (!isTranscriptMessage(i) || i.isSidechain || !P.has(i.uuid)) continue;
      g.set(i.uuid, i);
    }
  } catch (error) {
    await A();
    throw error;
  } finally {
    U.destroy();
  }
  let parentUuid = null;
  let T = null;
  let F = [];
  try {
    for (let e of messages) {
      let c = g.get(e.uuid);
      if (!c) continue;
      let i =
        c.type === "system" && c.subtype === "model_refusal_fallback"
          ? {
              neutralizedByFork: true,
            }
          : undefined;
      let x = {
        ...c,
        ...i,
        sessionId: forkSessionId,
        parentUuid,
        isSidechain: false,
        sessionKind: undefined,
        forkedFrom: {
          sessionId: originalSessionId,
          messageUuid: c.uuid,
        },
      };
      let V = {
        ...c,
        ...i,
        sessionId: forkSessionId,
      };
      F.push(V);
      T = c;
      await M(
        jsonStringify(x) +
          `
`,
      );
      if (c.type !== "progress") parentUuid = c.uuid;
    }
  } catch (error) {
    await A();
    throw error;
  }
  if (T === null) {
    await A();
    throw Error("No messages to branch");
  }
  if (extraMessages?.length)
    for (let e of extraMessages) {
      let c = {
        ...e,
        cwd: T.cwd,
        userType: T.userType,
        entrypoint: T.entrypoint,
        version: T.version,
        gitBranch: T.gitBranch,
        sessionId: forkSessionId,
        timestamp: new Date().toISOString(),
      };
      let i = {
        ...c,
        parentUuid,
        isSidechain: false,
      };
      F.push(c);
      await M(
        jsonStringify(i) +
          `
`,
      );
      if (e.type !== "progress") parentUuid = e.uuid;
    }
  if (I.length > 0)
    await M(
      jsonStringify({
        type: "content-replacement",
        sessionId: forkSessionId,
        replacements: I,
      }) +
        `
`,
    );
  for (let entry of C) {
    let serialized = {
      ...entry,
      sessionId: forkSessionId,
    };
    await M(
      jsonStringify(serialized) +
        `
`,
    );
  }
  if (h)
    await M(
      jsonStringify({
        type: "relocated",
        sessionId: forkSessionId,
        relocatedCwd: h,
      }) +
        `
`,
    );
  if (conversationAtisLatch !== undefined)
    await M(
      jsonStringify({
        type: "atis-latch",
        sessionId: forkSessionId,
        atis: conversationAtisLatch,
      }) +
        `
`,
    );
  if (v.length > 0)
    await M(
      jsonStringify({
        type: "tools-used",
        sessionId: forkSessionId,
        tools: v,
      }) +
        `
`,
    );
  writeStream.end();
  await finished(writeStream).catch(() => {});
  if (w) {
    await A();
    throw w;
  }
  return {
    sessionId: forkSessionId,
    title: customTitle,
    forkPath: forkSessionPath,
    serializedMessages: F,
    contentReplacementRecords: I,
    sessionHistorySuppressed: n,
  };
}
//@ chunk-khj4kcw5.js:15231-15267 layout
function toJsonlLine(t) {
  return {
    data:
      jsonStringify(t) +
      `
`,
  };
}
//@ chunk-khj4kcw5.js:15267-18005 layout
/**
 * createForkFromStorage：storage v5 路径的 createFork。
 */
async function createForkFromStorage(t) {
  let {
    sourceV5,
    forkKey,
    forkSessionId,
    originalSessionId,
    currentMessages,
    customTitle,
    extraMessages,
    forkSessionPath,
  } = t;
  let B = undefined;
  let j = undefined;
  let { backend, key } = sourceV5;
  let f = [];
  let R = new Set(currentMessages.map((currentMessage) => currentMessage.uuid));
  let U = new Map();
  let S = [];
  let w = [];
  let P;
  let sourceTaintAtEntry = t.sourceTaintAtEntry;
  if (sourceTaintAtEntry) f.push(toJsonlLine(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")));
  let I;
  for (let i = 0; ; i++) {
    if (i >= MAX_BRANCH_MESSAGES) throw Error("Conversation too long to branch through storage");
    let records = await backend.readRecords(key, {
      order: "forward",
      maxBytes: MAX_FORK_TRANSCRIPT_BYTES,
      ...(I !== undefined && {
        fromSeq: I,
      }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound") throw Error("No conversation to branch");
      let E = Error("Conversation unreadable through storage", {
        cause: records.error,
      });
      logError(E);
      throw E;
    }
    for (let item of records.value.items) {
      let T = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength)
        .toString("utf8")
        .trimEnd();
      if (T.length === 0) continue;
      let F;
      try {
        F = jsonParse(T);
      } catch {
        continue;
      }
      if (!isPlainObject(F)) continue;
      let e = F;
      if (
        e.type === "content-replacement" &&
        e.sessionId === originalSessionId &&
        Array.isArray(e.replacements)
      ) {
        S.push(...e.replacements);
        continue;
      }
      if (
        e.type === "relocated" &&
        e.sessionId === originalSessionId &&
        typeof e.relocatedCwd === "string" &&
        e.relocatedCwd !== ""
      ) {
        P = e.relocatedCwd;
        continue;
      }
      if (e.type === "memory-mode" && e.sessionId === originalSessionId) {
        w.push(e);
        continue;
      }
      if (e.type === "history-suppression") {
        if (!sourceTaintAtEntry) {
          sourceTaintAtEntry = true;
          f.push(toJsonlLine(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")));
        }
        continue;
      }
      if (!isTranscriptMessage(e) || e.isSidechain || !R.has(e.uuid)) continue;
      U.set(e.uuid, e);
    }
    I = records.value.nextSeq;
    if (I === undefined) break;
  }
  let C = null;
  let h = null;
  let A = [];
  for (let currentMessage of currentMessages) {
    let r = U.get(currentMessage.uuid);
    if (!r) continue;
    let E =
      r.type === "system" && r.subtype === "model_refusal_fallback"
        ? {
            neutralizedByFork: true,
          }
        : undefined;
    let T = {
      ...r,
      ...E,
      sessionId: forkSessionId,
      parentUuid: C,
      isSidechain: false,
      sessionKind: undefined,
      forkedFrom: {
        sessionId: originalSessionId,
        messageUuid: r.uuid,
      },
    };
    A.push({
      ...r,
      ...E,
      sessionId: forkSessionId,
    });
    h = r;
    f.push(toJsonlLine(T));
    if (r.type !== "progress") C = r.uuid;
  }
  if (h === null) throw Error("No messages to branch");
  if (extraMessages?.length)
    for (let extraMessage of extraMessages) {
      let r = {
        ...extraMessage,
        cwd: h.cwd,
        userType: h.userType,
        entrypoint: h.entrypoint,
        version: h.version,
        gitBranch: h.gitBranch,
        sessionId: forkSessionId,
        timestamp: new Date().toISOString(),
      };
      A.push(r);
      f.push(
        toJsonlLine({
          ...r,
          parentUuid: C,
          isSidechain: false,
        }),
      );
      if (extraMessage.type !== "progress") C = extraMessage.uuid;
    }
  if (S.length > 0) {
    let n = {
      type: "content-replacement",
      sessionId: forkSessionId,
      replacements: S,
    };
    f.push(toJsonlLine(n));
  }
  for (let n of w) {
    let r = {
      ...n,
      sessionId: forkSessionId,
    };
    f.push(toJsonlLine(r));
  }
  if (P) {
    let n = {
      type: "relocated",
      sessionId: forkSessionId,
      relocatedCwd: P,
    };
    f.push(toJsonlLine(n));
  }
  if (t.atisLatchAtEntry !== undefined) {
    let n = {
      type: "atis-latch",
      sessionId: forkSessionId,
      atis: t.atisLatchAtEntry,
    };
    f.push(toJsonlLine(n));
  }
  if (t.toolsUsedAtEntry.length > 0) {
    let n = {
      type: "tools-used",
      sessionId: forkSessionId,
      tools: [...t.toolsUsedAtEntry],
    };
    f.push(toJsonlLine(n));
  }
  let M = await backend.append(forkKey, f);
  if (!M.ok) {
    await backend.delete(forkKey).catch(() => {
      return;
    });
    throw Error("Branch could not be written through storage", {
      cause: M.error,
    });
  }
  return {
    sessionId: forkSessionId,
    title: customTitle,
    forkPath: forkSessionPath,
    serializedMessages: A,
    contentReplacementRecords: S,
    sessionHistorySuppressed: sourceTaintAtEntry,
  };
}
//@ chunk-khj4kcw5.js:18005-18361 fingerprint = getUniqueForkName (1)
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
//@ chunk-khj4kcw5.js:18361-19802 fingerprint = call (0.745)
async function call(onDone, context, args = {}) {
  let sessionId = getSessionId();
  let currentSessionTitle = getCurrentSessionTitle(sessionId);
  let m = isSessionHistorySuppressed() || isSessionHistorySuppressedFor(pinSessionId(sessionId));
  let originalSessionId = getConversationAtisLatch();
  let toolsUsed = getConversationToolsUsed().names();
  let v = undefined;
  let B = undefined;
  let memoryModeStamps = getCurrentSessionMemoryModeStamps().map(({ inFlight, ...y }) => y);
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
    let g = title?.replace(/\s+/g, " ").trim() ?? (await getUniqueForkName(firstPrompt, onDone.storageV5));
    let I = title ? "user" : "auto";
    await saveCustomTitle(sessionId_2, g, forkPath, I, onDone.storageV5);
    await saveAgentName(sessionId_2, g, forkPath, I, onDone.storageV5);
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
      customTitle: g,
      agentName: g,
      contentReplacements: contentReplacementRecords,
      sessionHistorySuppressed: sessionHistorySuppressed || m ? true : undefined,
      atisLatch: originalSessionId,
      toolsUsed,
      memoryModeStamps,
      precautionarySuppressionHeld: isPrecautionarySuppressionHeldFor(pinSessionId(sessionId))
        ? true
        : undefined,
      forkedFromSessionId: sessionId,
    };
    let titleInfo = title ? ` "${g}"` : "";
    let A = currentSessionTitle ? ` ("${currentSessionTitle}")` : "";
    let successMessage = `Branched conversation${titleInfo}. You are now in the new branch (session ${sessionId_2}). Use /resume ${sessionId}${A} to return to the original, or run \`claude -r ${sessionId}\` in a new terminal.`;
    if (onDone.resume) {
      await onDone.resume(sessionId_2, forkLog, "fork");
      syncJobName(getOwnJobShortId(), g, "user", onDone.storageV5);
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
