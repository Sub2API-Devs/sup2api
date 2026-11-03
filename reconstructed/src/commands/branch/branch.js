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

/**
 * MAX_FORK_TRANSCRIPT_BYTES：4194304。
 */
//@ chunk-khj4kcw5.js:12227-12248 affinity
var MAX_FORK_TRANSCRIPT_BYTES = 4194304,
  ee = 1e5;
//@ chunk-khj4kcw5.js:12248-12452 fingerprint = deriveFirstPrompt (0.567)
function deriveFirstPrompt(firstUserMessage) {
  let p = { commandFallback: "" },
    d;
  for (let s of firstUserMessage) if (((d = renderPluginPrompt(s, p, "shown")), d !== void 0)) break;
  return (
    (d ??= p.commandFallback),
    d.replace(/\s+/g, " ").trim().slice(0, 100).trimEnd() || "Branched conversation"
  );
}
//@ chunk-khj4kcw5.js:12452-15231 fingerprint = createFork (0.46)
async function createFork(t, p, d, s) {
  let forkSessionId = randomUUID(),
    originalSessionId = getSessionId(),
    O = isSessionHistorySuppressed() || isSessionHistorySuppressedFor(pinSessionId(originalSessionId)),
    k = getConversationAtisLatch(),
    v = isSillyShoreGateOn() ? getConversationToolsUsed().names() : [],
    B = void 0,
    j = void 0,
    projectDir = getProjectDir(getOriginalCwd()),
    forkSessionPath = getTranscriptPathForSession(forkSessionId),
    f = getMaterializedSessionFile() ?? getTranscriptPath(),
    R = getTranscriptStorageKey(f, s);
  if (R !== void 0)
    return createForkFromStorage({
      sourceV5: R,
      forkKey: STORAGE_SPACES.transcript(getProjectKey(getOriginalCwd()), forkSessionId),
      forkSessionId: forkSessionId,
      originalSessionId: originalSessionId,
      sourceTaintAtEntry: O,
      atisLatchAtEntry: k,
      toolsUsedAtEntry: v,
      currentMessages: t,
      customTitle: p,
      extraMessages: d,
      forkSessionPath: forkSessionPath,
    });
  if (isDiskless()) throw Error("No conversation to branch");
  await mkdir(projectDir, { recursive: !0, mode: 448 });
  let U;
  try {
    ((U = createReadStream(f, { encoding: "utf8" })), await once(U, "open"));
  } catch (error) {
    if (isENOENT(error)) throw Error("No conversation to branch");
    throw (logError(error), error);
  }
  let S = createWriteStream(forkSessionPath, { encoding: "utf8", mode: 384 }),
    w = null;
  S.on("error", (entry) => {
    w = toError(entry);
  });
  let P = new Set(t.map((entry) => entry.uuid)),
    g = new Map(),
    I = [],
    C = [],
    h,
    A = async () => {
      (S.destroy(), await unlink(forkSessionPath).catch(() => {}));
    },
    M = async (entry) => {
      if (w) throw (await A(), w);
      if (!S.write(entry)) await once(S, "drain").catch(() => {});
    },
    n = O,
    r = () =>
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
        if (!n) ((n = !0), await r());
        continue;
      }
      if (!isTranscriptMessage(i) || i.isSidechain || !P.has(i.uuid)) continue;
      g.set(i.uuid, i);
    }
  } catch (error) {
    throw (await A(), error);
  } finally {
    U.destroy();
  }
  let parentUuid = null,
    T = null,
    F = [];
  try {
    for (let e of t) {
      let c = g.get(e.uuid);
      if (!c) continue;
      let i =
          c.type === "system" && c.subtype === "model_refusal_fallback" ? { neutralizedByFork: !0 } : void 0,
        x = {
          ...c,
          ...i,
          sessionId: forkSessionId,
          parentUuid: parentUuid,
          isSidechain: !1,
          sessionKind: void 0,
          forkedFrom: { sessionId: originalSessionId, messageUuid: c.uuid },
        },
        V = { ...c, ...i, sessionId: forkSessionId };
      if (
        (F.push(V),
        (T = c),
        await M(
          jsonStringify(x) +
            `
`,
        ),
        c.type !== "progress")
      )
        parentUuid = c.uuid;
    }
  } catch (error) {
    throw (await A(), error);
  }
  if (T === null) throw (await A(), Error("No messages to branch"));
  if (d?.length)
    for (let e of d) {
      let c = {
          ...e,
          cwd: T.cwd,
          userType: T.userType,
          entrypoint: T.entrypoint,
          version: T.version,
          gitBranch: T.gitBranch,
          sessionId: forkSessionId,
          timestamp: new Date().toISOString(),
        },
        i = { ...c, parentUuid: parentUuid, isSidechain: !1 };
      if (
        (F.push(c),
        await M(
          jsonStringify(i) +
            `
`,
        ),
        e.type !== "progress")
      )
        parentUuid = e.uuid;
    }
  if (I.length > 0)
    await M(
      jsonStringify({ type: "content-replacement", sessionId: forkSessionId, replacements: I }) +
        `
`,
    );
  for (let entry of C) {
    let serialized = { ...entry, sessionId: forkSessionId };
    await M(
      jsonStringify(serialized) +
        `
`,
    );
  }
  if (h)
    await M(
      jsonStringify({ type: "relocated", sessionId: forkSessionId, relocatedCwd: h }) +
        `
`,
    );
  if (k !== void 0)
    await M(
      jsonStringify({ type: "atis-latch", sessionId: forkSessionId, atis: k }) +
        `
`,
    );
  if (v.length > 0)
    await M(
      jsonStringify({ type: "tools-used", sessionId: forkSessionId, tools: v }) +
        `
`,
    );
  if ((S.end(), await finished(S).catch(() => {}), w)) throw (await A(), w);
  return {
    sessionId: forkSessionId,
    title: p,
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
/**
 * createForkFromStorage：storage v5 路径的 createFork。
 */
//@ chunk-khj4kcw5.js:15267-18005 layout
async function createForkFromStorage(t) {
  let {
      sourceV5: sourceV5,
      forkKey: forkKey,
      forkSessionId: forkSessionId,
      originalSessionId: originalSessionId,
      currentMessages: currentMessages,
      customTitle: customTitle,
      extraMessages: extraMessages,
      forkSessionPath: forkSessionPath,
    } = t,
    B = void 0,
    j = void 0,
    { backend: backend, key: key } = sourceV5,
    f = [],
    R = new Set(currentMessages.map((n) => n.uuid)),
    U = new Map(),
    S = [],
    w = [],
    P,
    sourceTaintAtEntry = t.sourceTaintAtEntry;
  if (sourceTaintAtEntry) f.push(toJsonlLine(buildHistorySuppressionEntry(forkSessionId, "fork_inherit")));
  let I;
  for (let n = 0; ; n++) {
    if (n >= ee) throw Error("Conversation too long to branch through storage");
    let records = await backend.readRecords(key, {
      order: "forward",
      maxBytes: MAX_FORK_TRANSCRIPT_BYTES,
      ...(I !== void 0 && { fromSeq: I }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound") throw Error("No conversation to branch");
      let E = Error("Conversation unreadable through storage", { cause: records.error });
      throw (logError(E), E);
    }
    for (let item of records.value.items) {
      let trimEnd = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength)
        .toString("utf8")
        .trimEnd();
      if (trimEnd.length === 0) continue;
      let F;
      try {
        F = jsonParse(trimEnd);
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
        if (!sourceTaintAtEntry)
          ((sourceTaintAtEntry = !0),
            f.push(toJsonlLine(buildHistorySuppressionEntry(forkSessionId, "fork_inherit"))));
        continue;
      }
      if (!isTranscriptMessage(e) || e.isSidechain || !R.has(e.uuid)) continue;
      U.set(e.uuid, e);
    }
    if (((I = records.value.nextSeq), I === void 0)) break;
  }
  let C = null,
    h = null,
    A = [];
  for (let n of currentMessages) {
    let r = U.get(n.uuid);
    if (!r) continue;
    let E =
        r.type === "system" && r.subtype === "model_refusal_fallback" ? { neutralizedByFork: !0 } : void 0,
      T = {
        ...r,
        ...E,
        sessionId: forkSessionId,
        parentUuid: C,
        isSidechain: !1,
        sessionKind: void 0,
        forkedFrom: { sessionId: originalSessionId, messageUuid: r.uuid },
      };
    if (
      (A.push({ ...r, ...E, sessionId: forkSessionId }),
      (h = r),
      f.push(toJsonlLine(T)),
      r.type !== "progress")
    )
      C = r.uuid;
  }
  if (h === null) throw Error("No messages to branch");
  if (extraMessages?.length)
    for (let n of extraMessages) {
      let r = {
        ...n,
        cwd: h.cwd,
        userType: h.userType,
        entrypoint: h.entrypoint,
        version: h.version,
        gitBranch: h.gitBranch,
        sessionId: forkSessionId,
        timestamp: new Date().toISOString(),
      };
      if ((A.push(r), f.push(toJsonlLine({ ...r, parentUuid: C, isSidechain: !1 })), n.type !== "progress"))
        C = n.uuid;
    }
  if (S.length > 0) {
    let n = { type: "content-replacement", sessionId: forkSessionId, replacements: S };
    f.push(toJsonlLine(n));
  }
  for (let n of w) {
    let r = { ...n, sessionId: forkSessionId };
    f.push(toJsonlLine(r));
  }
  if (P) {
    let n = { type: "relocated", sessionId: forkSessionId, relocatedCwd: P };
    f.push(toJsonlLine(n));
  }
  if (t.atisLatchAtEntry !== void 0) {
    let n = { type: "atis-latch", sessionId: forkSessionId, atis: t.atisLatchAtEntry };
    f.push(toJsonlLine(n));
  }
  if (t.toolsUsedAtEntry.length > 0) {
    let n = { type: "tools-used", sessionId: forkSessionId, tools: [...t.toolsUsedAtEntry] };
    f.push(toJsonlLine(n));
  }
  let append = await backend.append(forkKey, f);
  if (!append.ok)
    throw (
      await backend.delete(forkKey).catch(() => {
        return;
      }),
      Error("Branch could not be written through storage", { cause: append.error })
    );
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
async function getUniqueForkName(t, p) {
  let candidateName = `${t} (Branch)`;
  if ((await searchSessionsByCustomTitle(candidateName, { exact: !0 }, p)).length === 0) return candidateName;
  let o = await searchSessionsByCustomTitle(`${t} (Branch`, void 0, p),
    usedNumbers = new Set([1]),
    forkNumberPattern = new RegExp(`^${urlPatternToRegex(t)} \\(Branch(?: (\\d+))?\\)$`);
  for (let session of o) {
    let match = session.customTitle?.match(forkNumberPattern);
    if (match)
      if (match[1]) usedNumbers.add(parseInt(match[1], 10));
      else usedNumbers.add(1);
  }
  let nextNumber = 2;
  while (usedNumbers.has(nextNumber)) nextNumber++;
  return `${t} (Branch ${nextNumber})`;
}
//@ chunk-khj4kcw5.js:18361-19802 fingerprint = call (0.745)
async function call(onDone, context, args = {}) {
  let s = getSessionId(),
    o = getCurrentSessionTitle(s),
    m = isSessionHistorySuppressed() || isSessionHistorySuppressedFor(pinSessionId(s)),
    originalSessionId = getConversationAtisLatch(),
    names = getConversationToolsUsed().names(),
    v = void 0,
    B = void 0,
    mapped = getCurrentSessionMemoryModeStamps().map(({ inFlight: inFlight, ...y }) => y);
  try {
    let {
      sessionId: sessionId,
      title: title,
      forkPath: forkPath,
      serializedMessages: serializedMessages,
      contentReplacementRecords: contentReplacementRecords,
      sessionHistorySuppressed: sessionHistorySuppressed,
    } = await createFork(onDone.messages, args.customTitle, args.extraMessages, onDone.storageV5);
    primeSessionMessagesCache(
      sessionId,
      serializedMessages.map((n) => n.uuid),
    );
    let now = new Date(),
      firstPrompt = deriveFirstPrompt(serializedMessages),
      g = title?.replace(/\s+/g, " ").trim() ?? (await getUniqueForkName(firstPrompt, onDone.storageV5)),
      I = title ? "user" : "auto";
    (await saveCustomTitle(sessionId, g, forkPath, I, onDone.storageV5),
      await saveAgentName(sessionId, g, forkPath, I, onDone.storageV5),
      logEvent("tengu_conversation_forked", {
        message_count: serializedMessages.length,
        has_custom_title: !!title,
      }));
    let C = {
        date: firstLineOf(now.toISOString(), "T"),
        messages: serializedMessages,
        fullPath: forkPath,
        value: now.getTime(),
        created: now,
        modified: now,
        firstPrompt: firstPrompt,
        messageCount: serializedMessages.length,
        isSidechain: !1,
        sessionId: sessionId,
        customTitle: g,
        agentName: g,
        contentReplacements: contentReplacementRecords,
        sessionHistorySuppressed: sessionHistorySuppressed || m ? !0 : void 0,
        atisLatch: originalSessionId,
        toolsUsed: names,
        memoryModeStamps: mapped,
        precautionarySuppressionHeld: isPrecautionarySuppressionHeldFor(pinSessionId(s)) ? !0 : void 0,
        forkedFromSessionId: s,
      },
      h = title ? ` "${g}"` : "",
      A = o ? ` ("${o}")` : "",
      resumeHint = `Branched conversation${h}. You are now in the new branch (session ${sessionId}). Use /resume ${s}${A} to return to the original, or run \`claude -r ${s}\` in a new terminal.`;
    if (onDone.resume)
      (await onDone.resume(sessionId, C, "fork"),
        syncJobName(getOwnJobShortId(), g, "user", onDone.storageV5),
        context(resumeHint, { display: "system" }));
    else context(`Branched conversation${h}. Resume with: /resume ${sessionId}`);
    return !0;
  } catch (error) {
    let y = error instanceof Error ? error.message : "Unknown error occurred";
    return (context(`Failed to branch conversation: ${y}`), !1);
  }
}
/**
 * /branch 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-khj4kcw5.js:19802-19885 affinity
async function _e(onDone, context, args) {
  return (await call(context, onDone, { customTitle: args?.trim() || void 0 }), null);
}
