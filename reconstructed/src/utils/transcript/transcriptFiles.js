/**
 * utils/transcript/transcriptFiles.ts
 *
 * 2.1.316 新增：转录文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import { open, mkdir, rm as rm_2 } from "fs/promises";
import { dirname, relative, sep, isAbsolute, join } from "path";
import { shouldKeepLine, TRANSCRIPT_ENTRY_TYPES } from "./entryTypes.js";
import { isBeforeCompactBoundary } from "../../components/tasks/BackgroundTaskStatus.js";
import { TRANSCRIPT_READ_CHUNK_SIZE, COMPACT_BOUNDARY_MARKER } from "../sessionStoragePortable.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, union, literal, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParseRaw, jsonStringify } from "../slowOperations.js";
import { sanitizeSessionTitle } from "../stringUtils.js";
import { getCustomTitlePath } from "../../cli/toolPermissionStream.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { pathToSessionSideKey, validateStorageKey, validateStorageScope } from "../storage/storageKeys.js";
import { logForDebugging } from "../debug.js";
import { isDiskless } from "../../bootstrap/state.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isWin32ReadEbadf,
  storageCauseErrnoCode,
  getTelemetryMessage,
  isSadFsErrno,
  isEnvFsErrno,
} from "../errors.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isValidKeySegment, STORAGE_SPACES, transcriptScope } from "../storage/storageSpaces.js";
import { getProjectsDir as getProjectsDir_2 } from "../sessionStorage.js";
import { formatFileSize } from "../format.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";

//@ chunk-e6aww6q8.js:293658-293843 placement
function makeLineEmitter(pill) {
  return (n, r) => {
    let s = [];
    if (shouldKeepLine(pill, n)) s.push(pill.ledgerSubstitutes.get(n) ?? r);
    if (n === pill.lastBoundaryIdx) {
      for (let h of pill.lastMeta.values()) if (isBeforeCompactBoundary(pill, h)) s.push(h.line);
    }
    return s;
  };
}
//@ chunk-e6aww6q8.js:293843-293921 placement
function stripLeadingNuls(e) {
  let n = 0;
  while (e.charCodeAt(n) === 0) n++;
  return n > 0 ? e.slice(n) : e;
}
//@ chunk-e6aww6q8.js:293921-293970 placement
var mapped = [...TRANSCRIPT_ENTRY_TYPES].map((e) => Buffer.from(`"${e}"`));
//@ chunk-e6aww6q8.js:293970-295017 placement
/**
 * 以分块方式读取转录文件前 n 字节，查找 COMPACT_BOUNDARY_MARKER 与各元数据标记的位置，跨块拼接处理半行， 返回最后边界偏移及需要跳过/保留的元数据行信息。
 */
async function scanCompactBoundaries(e, n, r = TRANSCRIPT_READ_CHUNK_SIZE) {
  let h = Math.max(COMPACT_BOUNDARY_MARKER.length, ...mapped.map((Se) => Se.length)) - 1;
  let min = Math.min(r, Math.max(n, 1));
  let S = Buffer.allocUnsafe(h + min);
  let w = -1;
  let L = 0;
  let G = 0;
  let q = -1;
  let Z = await open(e, "r");
  try {
    let Se = 0;
    let ke = 0;
    while (Se < n) {
      let { bytesRead } = await Z.read(S, ke, Math.min(min, n - Se), Se);
      if (bytesRead === 0) break;
      let Ee = Se - ke;
      Se += bytesRead;
      let chunk = S.subarray(0, ke + bytesRead);
      for (
        let index = chunk.indexOf(COMPACT_BOUNDARY_MARKER);
        index >= 0;
        index = chunk.indexOf(COMPACT_BOUNDARY_MARKER, index + 1)
      )
        w = Ee + index;
      let Ie = chunk.subarray(0, ke).lastIndexOf(10) + 1;
      if (q >= 0) {
        let index = chunk.indexOf(10, ke);
        if (index < 0) Ie = chunk.length;
        else {
          L += Ee + index + 1 - q;
          q = -1;
          Ie = index + 1;
        }
      }
      let at = -2;
      let mapped_2 = mapped.map((marker) => ({
        marker,
        at,
      }));
      while (Ie < chunk.length) {
        let lt = -1;
        for (let Et of mapped_2) {
          if (Et.at !== -1 && Et.at < Ie) Et.at = chunk.indexOf(Et.marker, Ie);
          if (Et.at >= 0 && (lt < 0 || Et.at < lt)) lt = Et.at;
        }
        if (lt < 0) break;
        let index = chunk.subarray(0, lt).lastIndexOf(10);
        let nt = index >= 0 ? Ee + index + 1 : G;
        let index_2 = chunk.indexOf(10, lt);
        if (index_2 < 0) {
          q = nt;
          break;
        }
        L += Ee + index_2 + 1 - nt;
        Ie = index_2 + 1;
      }
      let index = chunk.lastIndexOf(10);
      if (index >= 0) G = Ee + index + 1;
      ke = Math.min(h, chunk.length);
      S.copy(S, 0, chunk.length - ke, chunk.length);
    }
  } finally {
    await Z.close().catch(() => {});
  }
  if (w < 0) return 0;
  if (q >= 0) L += n - q;
  return Math.min(n, w + L);
}
//@ chunk-e6aww6q8.js:295017-295088 placement
var messageTimestampSchema = DoctorLazy(() =>
  looseObject({
    type: union([literal("user"), literal("assistant")]),
    timestamp: string(),
  }),
);
//@ chunk-e6aww6q8.js:295088-295414 placement
/**
 * 从文本末尾向前找最后一条 user/assistant 消息的时间戳。
 */
function findLastMessageTimestamp(tail) {
  let n = tail.length;
  while (n > 0) {
    let index = tail.lastIndexOf(
      `
`,
      n - 1,
    );
    let sliced = tail.slice(index + 1, n);
    n = index;
    if (
      sliced.includes('"timestamp":') &&
      (sliced.includes('"type":"user"') || sliced.includes('"type":"assistant"'))
    )
      try {
        let h = messageTimestampSchema().safeParse(jsonParseRaw(sliced));
        if (h.success) {
          let timestamp = Date.parse(h.data.timestamp);
          if (!Number.isNaN(timestamp)) return timestamp;
        }
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-e6aww6q8.js:295495-295925 placement
/**
 * 写会话标题旁文件（空标题则删除，v5 存储时写存储）。
 */
async function writeSessionTitleSidecar(e, n, customTitle, s) {
  if (!sanitizeSessionTitle(customTitle)) {
    await deleteSessionTitleSidecar(e, n, s);
    return;
  }
  let customTitlePath = getCustomTitlePath(e, n);
  try {
    if (isStorageV5Enabled() && s !== undefined) {
      let y = pathToSessionSideKey(customTitlePath);
      if (y !== undefined) {
        let S = await s.write(
          y,
          jsonStringify({
            customTitle,
          }),
          {
            mode: 384,
          },
        );
        if (!S.ok)
          logForDebugging(`writeSessionTitleSidecar: ${S.error.code} via storage`, {
            level: "error",
          });
        return;
      }
    }
    if (isDiskless()) return;
    await mkdir(dirname(customTitlePath), {
      recursive: true,
      mode: 448,
    });
    await writeFileAtomic_2(
      customTitlePath,
      jsonStringify({
        customTitle,
      }),
      384,
    );
  } catch (error) {
    logForDebugging(`writeSessionTitleSidecar: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:295925-296237 placement
/**
 * 删除会话标题旁文件。
 */
async function deleteSessionTitleSidecar(e, n, r) {
  try {
    if (isStorageV5Enabled() && r !== undefined) {
      let s = pathToSessionSideKey(getCustomTitlePath(e, n));
      if (s !== undefined) {
        let h = await r.delete(s);
        if (!h.ok)
          logForDebugging(`deleteSessionTitleSidecar: ${h.error.code} via storage`, {
            level: "error",
          });
        return;
      }
    }
    if (isDiskless()) return;
    await rm_2(getCustomTitlePath(e, n), {
      force: true,
    });
  } catch (error) {
    logForDebugging(`deleteSessionTitleSidecar: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:296237-296264 placement
var TRANSCRIPT_STREAM_CHUNK_BYTES = 262144;
var TRANSCRIPT_READ_AHEAD_BYTES = 2097152;
//@ chunk-e6aww6q8.js:296264-297367 placement
/**
 * 打开转录文件流，支持倒序读取，文件不存在时报 ENOENT。
 */
async function* openTranscriptStream(e, n) {
  let r;
  let s;
  let h = TRANSCRIPT_STREAM_CHUNK_BYTES;
  let y = false;
  for (;;) {
    let records = await e.readRecords(
      n,
      y
        ? {
            order: "backward",
            limit: 2,
            fromSeq: r,
          }
        : {
            order: "backward",
            maxBytes: h + (s?.byteLength ?? 0),
            ...(r !== undefined && {
              fromSeq: r,
            }),
          },
    );
    if (!records.ok) {
      if (records.error.code === "NotFound" && r === undefined)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "ENOENT: no such file or directory, open (transcript stream)",
            "ENOENT: no such file or directory",
          ),
          {
            code: "ENOENT",
            syscall: "open",
          },
        );
      logForDebugging(`[transcript-reverse-read] stream read failed: ${formatStorageError(records.error)}`);
      throw Error("v5 transcript stream read failed");
    }
    let items = records.value.items;
    if (s !== undefined) {
      let G = items[0];
      if (G === undefined || G.seq !== r || Buffer.compare(s, G.data) !== 0) {
        logForDebugging(
          "[transcript-reverse-read] transcript stream changed between pages; abandoning the scan",
        );
        throw Error("v5 transcript stream changed between pages");
      }
      items = items.slice(1);
    }
    if (items.length === 0) {
      if (records.value.nextSeq === undefined) return;
      y = true;
      continue;
    }
    y = false;
    let L;
    for (let item of items) {
      let { data: q } = item;
      let Z = q.at(-1) === 10 ? q.length - 1 : q.length;
      let str = Buffer.from(q.buffer, q.byteOffset, Z).toString("utf8");
      if (str) {
        L = item;
        yield str;
      }
    }
    if (records.value.nextSeq === undefined) return;
    if (L === undefined) {
      h += TRANSCRIPT_READ_AHEAD_BYTES;
      continue;
    }
    r = L.seq;
    s = Buffer.from(L.data);
    h = TRANSCRIPT_READ_AHEAD_BYTES;
  }
}
//@ chunk-e6aww6q8.js:297367-298028 placement
/**
 * Windows 读转录报 EBADF 时的说明与遥测消息。
 */
var WIN32_EBADF_HELP =
  "Windows reported an error (EBADF) when Claude Code read this session's transcript file, although the file had opened normally. This can happen when other software intercepts file reads \u2014 security, encryption or endpoint-management tools, for example. If it keeps happening for this conversation, try excluding the folder that holds Claude Code's session transcripts from such software (the .claude folder in your user profile, unless the app or CLAUDE_CONFIG_DIR points Claude Code elsewhere), or adding Claude Code to its allowed applications, then resume again.";
var WIN32_EBADF_TELEMETRY_MESSAGE =
  "loadTranscriptFile: transcript read failed with EBADF (syscall read, win32)";
//@ chunk-e6aww6q8.js:298028-298220 placement
function isWin32TranscriptEbadf(e, n) {
  if (isWin32ReadEbadf(e, n)) return true;
  try {
    let cause = e instanceof Error ? e.cause : undefined;
    let cause_2 = typeof cause === "object" && cause !== null && "cause" in cause ? cause.cause : undefined;
    return storageCauseErrnoCode(e) === "EBADF" && isWin32ReadEbadf(cause_2, n);
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:298220-298267 placement
function isWin32EbadfTranscriptError(e, n) {
  return isWin32TranscriptEbadf(e, n) && getTelemetryMessage(e) === WIN32_EBADF_TELEMETRY_MESSAGE;
}
//@ chunk-e6aww6q8.js:298267-298315 placement
/**
 * 是否是转录加载错误（可容忍的 fs 错误或 Win32 EBADF）。
 */
function isTranscriptLoadError(error, n) {
  return isSadFsErrno(error) || isEnvFsErrno(error) || isWin32EbadfTranscriptError(error, n);
}
//@ chunk-e6aww6q8.js:298315-298360 placement
/**
 * Win32 EBADF 的说明文本。
 */
function win32EbadfHelp(error, n) {
  return isWin32EbadfTranscriptError(error, n) ? WIN32_EBADF_HELP : undefined;
}
//@ chunk-e6aww6q8.js:298435-298887 placement
/**
 * 转录文件路径转存储键（主转录或子代理转录）。
 */
function transcriptStorageKeyForPath(e) {
  let n = splitProjectsPath(e);
  if (n === undefined) return;
  let [r, s] = n;
  let last = n.at(-1);
  if (r === undefined || s === undefined || last === undefined) return;
  if (n.length === 2) {
    let match = /^(.+)\.jsonl$/.exec(last);
    if (match === null) return;
    let G = match[1];
    return isValidKeySegment(r) && isValidKeySegment(G)
      ? validatedTranscriptKey(STORAGE_SPACES.transcript(r, G))
      : undefined;
  }
  if (n.length < 4 || n[2] !== "subagents") return;
  let match = /^agent-(.+)\.jsonl$/.exec(last);
  if (match === null) return;
  let S = match[1];
  let sliced = n.slice(3, -1);
  if (![r, s, S, ...sliced].every(isValidKeySegment)) return;
  return validatedTranscriptKey(STORAGE_SPACES.transcript(r, s, S, sliced.length > 0 ? sliced : undefined));
}
//@ chunk-e6aww6q8.js:298887-298941 placement
function transcriptKeyFor(e) {
  return typeof e === "string" ? transcriptStorageKeyForPath(e) : e.key;
}
//@ chunk-e6aww6q8.js:298941-299033 placement
/**
 * 取主转录的存储键（非子代理）。
 */
function mainTranscriptKeyFor(e) {
  let n = transcriptStorageKeyForPath(e);
  return n?.namespace === "transcript" && n.agentId === undefined ? n : undefined;
}
//@ chunk-e6aww6q8.js:299033-299189 placement
function mainTranscriptKeyOf(key) {
  return key.namespace === "transcript" && (key.agentId ?? key.journal ?? key.sessionJournal) === undefined
    ? {
        projectKey: key.projectKey,
        sessionId: key.sessionId,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:299189-299235 placement
function validatedTranscriptKey(e) {
  return validateStorageKey(e) === undefined ? e : undefined;
}
//@ chunk-e6aww6q8.js:299235-299384 placement
function splitProjectsPath(e) {
  let n = relative(getProjectsDir_2(), e);
  if (n === "" || n === ".." || n.startsWith(`..${sep}`) || isAbsolute(n)) return;
  let parts = n.split(sep);
  return e === join(getProjectsDir_2(), ...parts) ? parts : undefined;
}
//@ chunk-e6aww6q8.js:299384-299701 placement
/**
 * 转录目录路径转存储作用域。
 */
function transcriptScopeForDir(e) {
  let n = splitProjectsPath(e);
  if (n === undefined) return;
  let [projectKey, sessionId, h, ...y] = n;
  let S;
  if (projectKey !== undefined && n.length === 1)
    S = {
      namespace: "transcript",
      projectKey,
    };
  else if (projectKey !== undefined && sessionId !== undefined && h === "subagents")
    S =
      y.length > 0
        ? {
            namespace: "transcript",
            projectKey,
            sessionId,
            agentRelPath: y,
          }
        : transcriptScope(projectKey, sessionId);
  else return;
  return validateStorageScope(S) === undefined ? S : undefined;
}
//@ chunk-e6aww6q8.js:299701-299776 placement
function versionIfMatch(version) {
  return version !== undefined
    ? {
        type: "ifMatch",
        version,
      }
    : {
        type: "none",
      };
}
//@ chunk-e6aww6q8.js:299776-300035 placement
function rowHasUuid(e, n) {
  let buffer = Buffer.from(e.data.buffer, e.data.byteOffset, e.data.byteLength);
  if (!buffer.includes(`"uuid":"${n}"`)) return false;
  try {
    let s = jsonParseRaw(buffer.toString("utf8").replace(/\r?\n$/, ""));
    return typeof s === "object" && s !== null && "uuid" in s && s.uuid === n;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:300035-301017 placement
/**
 * 从转录流中移除墓碑记录。
 */
async function removeTombstones(e, n, r, s) {
  for (let idx = 1; idx <= 3; idx++) {
    let y = await e.statStream(n);
    if (!y.ok) {
      if (y.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned: stream stat failed (${y.error.code})`, {
          level: "warn",
        });
      return;
    }
    let precondition = versionIfMatch(y.value.version);
    let records = await e.readRecords(n, {
      order: "backward",
      maxBytes: s.windowBytes,
    });
    if (!records.ok) {
      if (records.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned: record page failed (${records.error.code})`, {
          level: "warn",
        });
      return;
    }
    let filtered = records.value.items.filter((item) => rowHasUuid(item, r));
    let G = filtered[0];
    let q = records.value.items.length > 1 || (G !== undefined && G.data.byteLength < s.windowBytes);
    if (G === undefined || !q)
      return await removeTombstonesBackward(e, n, r, records.value, filtered, precondition, s);
    let Z = await e.replaceRecords(n, [], {
      keepBefore: G.seq,
      preserveFrom: G.endSeq,
      publishDiscipline: "inPlace",
      precondition,
    });
    if (Z.ok || Z.error.code === "NotFound") return;
    if (
      !(
        Z.error.code === "PreconditionFailed" ||
        (Z.error.code === "Unavailable" && Z.error.retryAfterMs === undefined)
      ) ||
      idx === 3
    ) {
      logForDebugging(`Tombstone removal abandoned after ${idx} attempt(s) (${Z.error.code})`, {
        level: "warn",
      });
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:301017-301962 placement
async function removeTombstonesBackward(e, n, r, s, h, precondition, S) {
  let reduced = s.items.reduce((acc, item) => acc + item.data.byteLength, 0);
  let L = [...h];
  let nextSeq = s.nextSeq;
  while (nextSeq !== undefined) {
    if (reduced > S.maxReadBytes) {
      logForDebugging(
        `Skipping tombstone removal: session stream too large (over ${formatFileSize(S.maxReadBytes)} read)`,
        {
          level: "warn",
        },
      );
      return;
    }
    let records = await e.readRecords(n, {
      order: "backward",
      fromSeq: nextSeq,
      maxBytes: S.pageBytes,
    });
    if (!records.ok) {
      logForDebugging(`Tombstone removal abandoned: paging failed (${records.error.code})`, {
        level: "warn",
      });
      return;
    }
    for (let item of records.value.items) {
      reduced += item.data.byteLength;
      if (rowHasUuid(item, r)) L.push(item);
    }
    let nextSeq_2 = records.value.nextSeq;
    if (nextSeq_2 !== undefined && nextSeq_2 >= nextSeq) {
      logForDebugging("Tombstone removal abandoned: the backward record cursor did not advance", {
        level: "warn",
      });
      return;
    }
    nextSeq = nextSeq_2;
  }
  for (let q of L) {
    let Z = await e.replaceRecords(n, [], {
      keepBefore: q.seq,
      preserveFrom: q.endSeq,
      publishDiscipline: "inPlace",
      precondition,
    });
    if (!Z.ok) {
      if (Z.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned on the paged path (${Z.error.code})`, {
          level: "warn",
        });
      return;
    }
    precondition = versionIfMatch(Z.value.version);
  }
}
//@ chunk-e6aww6q8.js:301962-302034 placement
function contentHasBlockType(content, n) {
  return Array.isArray(content) && content.some((r) => isPlainObject_5(r) && r.type === n);
}
//@ chunk-e6aww6q8.js:302034-302227 placement
function collectLinearChain(e, currentSessionId, r, s) {
  let h = [];
  let logs = e;
  while (logs !== undefined) {
    if (s.has(logs.uuid) || !filterResumableSessions(logs, currentSessionId)) return [];
    h.push(logs);
    let filtered = (r.get(logs.uuid) ?? []).filter((w) => !s.has(w.uuid));
    if (filtered.length > 1) return [];
    logs = filtered[0];
  }
  return h;
}
//@ chunk-e6aww6q8.js:302227-302289 placement = filterResumableSessions (1)
function filterResumableSessions(logs, currentSessionId) {
  return logs.isSidechain === currentSessionId.isSidechain && isAuxiliaryEntry(logs);
}
//@ chunk-e6aww6q8.js:302289-302474 placement
function isAuxiliaryEntry(e) {
  if (e.type === "attachment") return true;
  if (e.type === "system") return e.subtype !== "compact_boundary";
  return e.type === "user" && e.isMeta === true && !contentHasBlockType(e.message?.content, "tool_result");
}
//@ chunk-e6aww6q8.js:302474-302538 placement
function indexOrMax(e, n) {
  return e?.get(n.uuid) ?? Number.MAX_SAFE_INTEGER;
}
//@ chunk-e6aww6q8.js:302538-302615 placement
function mapKeysToIndex(messages) {
  let n = new Map();
  let r = 0;
  for (let key of messages.keys()) n.set(key, r++);
  return n;
}
//@ chunk-e6aww6q8.js:302615-302775 placement
function buildChildrenIndex(e) {
  let n = new Map();
  for (let r of e.values()) {
    if (!r.parentUuid) continue;
    let s = n.get(r.parentUuid);
    if (s) s.push(r);
    else n.set(r.parentUuid, [r]);
  }
  return n;
}
//@ chunk-e6aww6q8.js:303694-304122 placement
/**
 * 对每个末端消息向上回溯到第一个 user/assistant 消息（带记忆），没有 user/assistant 子节点者加入 leafUuids；返回是否遇到环。
 */
function collectLeafUuids({ messages, terminalMessages, hasUserAssistantChild, leafUuids }) {
  let h = new Map();
  let y = false;
  for (let terminalMessage of terminalMessages) {
    let w = [];
    let L = "root";
    let G = terminalMessage;
    while (G) {
      if (G.type === "user" || G.type === "assistant") {
        L = G;
        break;
      }
      let q = h.get(G.uuid);
      if (q !== undefined) {
        L = q;
        break;
      }
      h.set(G.uuid, "cycle");
      w.push(G.uuid);
      G = G.parentUuid ? messages.get(G.parentUuid) : undefined;
    }
    for (let q of w) h.set(q, L);
    if (L === "cycle") y = true;
    else if (L !== "root" && !hasUserAssistantChild.has(L.uuid)) leafUuids.add(L.uuid);
  }
  return y;
}
export {
  isTranscriptLoadError,
  stripLeadingNuls,
  deleteSessionTitleSidecar,
  transcriptStorageKeyForPath,
  removeTombstones,
  scanCompactBoundaries,
  makeLineEmitter,
  transcriptKeyFor,
  transcriptScopeForDir,
  contentHasBlockType,
  isAuxiliaryEntry,
  indexOrMax,
  mapKeysToIndex,
  buildChildrenIndex,
  collectLinearChain,
  writeSessionTitleSidecar,
  openTranscriptStream,
  collectLeafUuids,
  isWin32TranscriptEbadf,
  WIN32_EBADF_TELEMETRY_MESSAGE,
  validatedTranscriptKey,
  findLastMessageTimestamp,
  win32EbadfHelp,
  mainTranscriptKeyOf,
  mainTranscriptKeyFor,
};
