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
import { looseObject, union, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:293658-293843 placement
function makeLineEmitter(plan) {
  return (line, offset) => {
    let parts = [];
    if (shouldKeepLine(plan, line)) parts.push(plan.ledgerSubstitutes.get(line) ?? offset);
    if (line === plan.lastBoundaryIdx) {
      for (let metaLine of plan.lastMeta.values())
        if (isBeforeCompactBoundary(plan, metaLine)) parts.push(metaLine.line);
    }
    return parts;
  };
}
//@ chunk-e6aww6q8.js:293843-293921 placement
function stripLeadingNuls(text) {
  let offset = 0;
  while (text.charCodeAt(offset) === 0) offset++;
  return offset > 0 ? text.slice(offset) : text;
}
//@ chunk-e6aww6q8.js:293921-293970 placement
var mapped; // deferred: uses TRANSCRIPT_ENTRY_TYPES_2 (./entryTypes.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:293921", () => {
  mapped = [...TRANSCRIPT_ENTRY_TYPES].map((entryType) => Buffer.from(`"${entryType}"`));
});
//@ chunk-e6aww6q8.js:293970-295017 placement
/**
 * 以分块方式读取转录文件前 n 字节，查找 COMPACT_BOUNDARY_MARKER 与各元数据标记的位置，跨块拼接处理半行， 返回最后边界偏移及需要跳过/保留的元数据行信息。
 */
async function scanCompactBoundaries(path, maxBytes, chunkSize = TRANSCRIPT_READ_CHUNK_SIZE) {
  let overlapBytes = Math.max(COMPACT_BOUNDARY_MARKER.length, ...mapped.map((marker) => marker.length)) - 1;
  let min = Math.min(chunkSize, Math.max(maxBytes, 1));
  let buffer = Buffer.allocUnsafe(overlapBytes + min);
  let lastMarkerAt = -1;
  let bytesAfterMarker = 0;
  let lastLineStart = 0;
  let pendingRecordStart = -1;
  let handle = await open(path, "r");
  try {
    let readOffset = 0;
    let retainedBytes = 0;
    while (readOffset < maxBytes) {
      let { bytesRead } = await handle.read(
        buffer,
        retainedBytes,
        Math.min(min, maxBytes - readOffset),
        readOffset,
      );
      if (bytesRead === 0) break;
      let chunkStart = readOffset - retainedBytes;
      readOffset += bytesRead;
      let chunk = buffer.subarray(0, retainedBytes + bytesRead);
      for (
        let index = chunk.indexOf(COMPACT_BOUNDARY_MARKER);
        index >= 0;
        index = chunk.indexOf(COMPACT_BOUNDARY_MARKER, index + 1)
      )
        lastMarkerAt = chunkStart + index;
      let lineStart = chunk.subarray(0, retainedBytes).lastIndexOf(10) + 1;
      if (pendingRecordStart >= 0) {
        let index = chunk.indexOf(10, retainedBytes);
        if (index < 0) lineStart = chunk.length;
        else {
          bytesAfterMarker += chunkStart + index + 1 - pendingRecordStart;
          pendingRecordStart = -1;
          lineStart = index + 1;
        }
      }
      let at = -2;
      let mapped_2 = mapped.map((marker) => ({
        marker,
        at,
      }));
      while (lineStart < chunk.length) {
        let nextMarker = -1;
        for (let marker of mapped_2) {
          if (marker.at !== -1 && marker.at < lineStart) marker.at = chunk.indexOf(marker.marker, lineStart);
          if (marker.at >= 0 && (nextMarker < 0 || marker.at < nextMarker)) nextMarker = marker.at;
        }
        if (nextMarker < 0) break;
        let index = chunk.subarray(0, nextMarker).lastIndexOf(10);
        let recordStart = index >= 0 ? chunkStart + index + 1 : lastLineStart;
        let index_2 = chunk.indexOf(10, nextMarker);
        if (index_2 < 0) {
          pendingRecordStart = recordStart;
          break;
        }
        bytesAfterMarker += chunkStart + index_2 + 1 - recordStart;
        lineStart = index_2 + 1;
      }
      let index = chunk.lastIndexOf(10);
      if (index >= 0) lastLineStart = chunkStart + index + 1;
      retainedBytes = Math.min(overlapBytes, chunk.length);
      buffer.copy(buffer, 0, chunk.length - retainedBytes, chunk.length);
    }
  } finally {
    await handle.close().catch(() => {});
  }
  if (lastMarkerAt < 0) return 0;
  if (pendingRecordStart >= 0) bytesAfterMarker += maxBytes - pendingRecordStart;
  return Math.min(maxBytes, lastMarkerAt + bytesAfterMarker);
}
//@ chunk-e6aww6q8.js:295017-295088 placement
var messageTimestampSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:295017", () => {
  messageTimestampSchema = DoctorLazy(() =>
    looseObject({
      type: union([literal("user"), literal("assistant")]),
      timestamp: stringSchema(),
    }),
  );
});
//@ chunk-e6aww6q8.js:295088-295414 placement
/**
 * 从文本末尾向前找最后一条 user/assistant 消息的时间戳。
 */
function findLastMessageTimestamp(tail) {
  let index = tail.length;
  while (index > 0) {
    let index_2 = tail.lastIndexOf(
      `
`,
      index - 1,
    );
    let sliced = tail.slice(index_2 + 1, index);
    index = index_2;
    if (
      sliced.includes('"timestamp":') &&
      (sliced.includes('"type":"user"') || sliced.includes('"type":"assistant"'))
    )
      try {
        let parsed = messageTimestampSchema().safeParse(jsonParseRaw(sliced));
        if (parsed.success) {
          let timestamp = Date.parse(parsed.data.timestamp);
          if (!Number.isNaN(timestamp)) return timestamp;
        }
      } catch {}
    if (index_2 < 0) break;
  }
  return;
}
//@ chunk-e6aww6q8.js:295495-295925 placement
/**
 * 写会话标题旁文件（空标题则删除，v5 存储时写存储）。
 */
async function writeSessionTitleSidecar(a, b, customTitle, storage) {
  if (!sanitizeSessionTitle(customTitle)) {
    await deleteSessionTitleSidecar(a, b, storage);
    return;
  }
  let customTitlePath = getCustomTitlePath(a, b);
  try {
    if (isStorageV5Enabled() && storage !== undefined) {
      let sideKey = pathToSessionSideKey(customTitlePath);
      if (sideKey !== undefined) {
        let writeResult = await storage.write(
          sideKey,
          jsonStringify({
            customTitle,
          }),
          {
            mode: 384,
          },
        );
        if (!writeResult.ok)
          logForDebugging(`writeSessionTitleSidecar: ${writeResult.error.code} via storage`, {
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
async function deleteSessionTitleSidecar(a, b, c) {
  try {
    if (isStorageV5Enabled() && c !== undefined) {
      let sideKey = pathToSessionSideKey(getCustomTitlePath(a, b));
      if (sideKey !== undefined) {
        let deleteResult = await c.delete(sideKey);
        if (!deleteResult.ok)
          logForDebugging(`deleteSessionTitleSidecar: ${deleteResult.error.code} via storage`, {
            level: "error",
          });
        return;
      }
    }
    if (isDiskless()) return;
    await rm_2(getCustomTitlePath(a, b), {
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
async function* openTranscriptStream(a, b) {
  let lastSeq;
  let lastData;
  let maxBytes = TRANSCRIPT_STREAM_CHUNK_BYTES;
  let isProbing = false;
  for (;;) {
    let records = await a.readRecords(
      b,
      isProbing
        ? {
            order: "backward",
            limit: 2,
            fromSeq: lastSeq,
          }
        : {
            order: "backward",
            maxBytes: maxBytes + (lastData?.byteLength ?? 0),
            ...(lastSeq !== undefined && {
              fromSeq: lastSeq,
            }),
          },
    );
    if (!records.ok) {
      if (records.error.code === "NotFound" && lastSeq === undefined)
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
    if (lastData !== undefined) {
      let firstItem = items[0];
      if (
        firstItem === undefined ||
        firstItem.seq !== lastSeq ||
        Buffer.compare(lastData, firstItem.data) !== 0
      ) {
        logForDebugging(
          "[transcript-reverse-read] transcript stream changed between pages; abandoning the scan",
        );
        throw Error("v5 transcript stream changed between pages");
      }
      items = items.slice(1);
    }
    if (items.length === 0) {
      if (records.value.nextSeq === undefined) return;
      isProbing = true;
      continue;
    }
    isProbing = false;
    let lastItem;
    for (let item of items) {
      let { data } = item;
      let cutLength = data.at(-1) === 10 ? data.length - 1 : data.length;
      let str = Buffer.from(data.buffer, data.byteOffset, cutLength).toString("utf8");
      if (str) {
        lastItem = item;
        yield str;
      }
    }
    if (records.value.nextSeq === undefined) return;
    if (lastItem === undefined) {
      maxBytes += TRANSCRIPT_READ_AHEAD_BYTES;
      continue;
    }
    lastSeq = lastItem.seq;
    lastData = Buffer.from(lastItem.data);
    maxBytes = TRANSCRIPT_READ_AHEAD_BYTES;
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
function isWin32TranscriptEbadf(error, extra) {
  if (isWin32ReadEbadf(error, extra)) return true;
  try {
    let cause = error instanceof Error ? error.cause : undefined;
    let cause_2 = typeof cause === "object" && cause !== null && "cause" in cause ? cause.cause : undefined;
    return storageCauseErrnoCode(error) === "EBADF" && isWin32ReadEbadf(cause_2, extra);
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:298220-298267 placement
function isWin32EbadfTranscriptError(error, extra) {
  return isWin32TranscriptEbadf(error, extra) && getTelemetryMessage(error) === WIN32_EBADF_TELEMETRY_MESSAGE;
}
//@ chunk-e6aww6q8.js:298267-298315 placement
/**
 * 是否是转录加载错误（可容忍的 fs 错误或 Win32 EBADF）。
 */
function isTranscriptLoadError(error, extra) {
  return isSadFsErrno(error) || isEnvFsErrno(error) || isWin32EbadfTranscriptError(error, extra);
}
//@ chunk-e6aww6q8.js:298315-298360 placement
/**
 * Win32 EBADF 的说明文本。
 */
function win32EbadfHelp(error, extra) {
  return isWin32EbadfTranscriptError(error, extra) ? WIN32_EBADF_HELP : undefined;
}
//@ chunk-e6aww6q8.js:298435-298887 placement
/**
 * 转录文件路径转存储键（主转录或子代理转录）。
 */
function transcriptStorageKeyForPath(path) {
  let parts = splitProjectsPath(path);
  if (parts === undefined) return;
  let [projectKey, sessionId] = parts;
  let last = parts.at(-1);
  if (projectKey === undefined || sessionId === undefined || last === undefined) return;
  if (parts.length === 2) {
    let match = /^(.+)\.jsonl$/.exec(last);
    if (match === null) return;
    let sessionKey = match[1];
    return isValidKeySegment(projectKey) && isValidKeySegment(sessionKey)
      ? validatedTranscriptKey(STORAGE_SPACES.transcript(projectKey, sessionKey))
      : undefined;
  }
  if (parts.length < 4 || parts[2] !== "subagents") return;
  let match = /^agent-(.+)\.jsonl$/.exec(last);
  if (match === null) return;
  let agentId = match[1];
  let sliced = parts.slice(3, -1);
  if (![projectKey, sessionId, agentId, ...sliced].every(isValidKeySegment)) return;
  return validatedTranscriptKey(
    STORAGE_SPACES.transcript(projectKey, sessionId, agentId, sliced.length > 0 ? sliced : undefined),
  );
}
//@ chunk-e6aww6q8.js:298887-298941 placement
function transcriptKeyFor(key) {
  return typeof key === "string" ? transcriptStorageKeyForPath(key) : key.key;
}
//@ chunk-e6aww6q8.js:298941-299033 placement
/**
 * 取主转录的存储键（非子代理）。
 */
function mainTranscriptKeyFor(dir) {
  let storageKey = transcriptStorageKeyForPath(dir);
  return storageKey?.namespace === "transcript" && storageKey.agentId === undefined ? storageKey : undefined;
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
function validatedTranscriptKey(key) {
  return validateStorageKey(key) === undefined ? key : undefined;
}
//@ chunk-e6aww6q8.js:299235-299384 placement
function splitProjectsPath(dir) {
  let relativePath = relative(getProjectsDir_2(), dir);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  )
    return;
  let parts = relativePath.split(sep);
  return dir === join(getProjectsDir_2(), ...parts) ? parts : undefined;
}
//@ chunk-e6aww6q8.js:299384-299701 placement
/**
 * 转录目录路径转存储作用域。
 */
function transcriptScopeForDir(dir) {
  let parts = splitProjectsPath(dir);
  if (parts === undefined) return;
  let [projectKey, sessionId, subagentsDir, ...agentRelPath] = parts;
  let scope;
  if (projectKey !== undefined && parts.length === 1)
    scope = {
      namespace: "transcript",
      projectKey,
    };
  else if (projectKey !== undefined && sessionId !== undefined && subagentsDir === "subagents")
    scope =
      agentRelPath.length > 0
        ? {
            namespace: "transcript",
            projectKey,
            sessionId,
            agentRelPath,
          }
        : transcriptScope(projectKey, sessionId);
  else return;
  return validateStorageScope(scope) === undefined ? scope : undefined;
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
function rowHasUuid(line, offset) {
  let buffer = Buffer.from(line.data.buffer, line.data.byteOffset, line.data.byteLength);
  if (!buffer.includes(`"uuid":"${offset}"`)) return false;
  try {
    let parsed = jsonParseRaw(buffer.toString("utf8").replace(/\r?\n$/, ""));
    return typeof parsed === "object" && parsed !== null && "uuid" in parsed && parsed.uuid === offset;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:300035-301017 placement
/**
 * 从转录流中移除墓碑记录。
 */
async function removeTombstones(a, b, c, d) {
  for (let idx = 1; idx <= 3; idx++) {
    let streamStat = await a.statStream(b);
    if (!streamStat.ok) {
      if (streamStat.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned: stream stat failed (${streamStat.error.code})`, {
          level: "warn",
        });
      return;
    }
    let precondition = versionIfMatch(streamStat.value.version);
    let records = await a.readRecords(b, {
      order: "backward",
      maxBytes: d.windowBytes,
    });
    if (!records.ok) {
      if (records.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned: record page failed (${records.error.code})`, {
          level: "warn",
        });
      return;
    }
    let filtered = records.value.items.filter((item) => rowHasUuid(item, c));
    let firstMatch = filtered[0];
    let coversWholeStream =
      records.value.items.length > 1 ||
      (firstMatch !== undefined && firstMatch.data.byteLength < d.windowBytes);
    if (firstMatch === undefined || !coversWholeStream)
      return await removeTombstonesBackward(a, b, c, records.value, filtered, precondition, d);
    let replaceResult = await a.replaceRecords(b, [], {
      keepBefore: firstMatch.seq,
      preserveFrom: firstMatch.endSeq,
      publishDiscipline: "inPlace",
      precondition,
    });
    if (replaceResult.ok || replaceResult.error.code === "NotFound") return;
    if (
      !(
        replaceResult.error.code === "PreconditionFailed" ||
        (replaceResult.error.code === "Unavailable" && replaceResult.error.retryAfterMs === undefined)
      ) ||
      idx === 3
    ) {
      logForDebugging(`Tombstone removal abandoned after ${idx} attempt(s) (${replaceResult.error.code})`, {
        level: "warn",
      });
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:301017-301962 placement
async function removeTombstonesBackward(a, b, c, d, e, precondition, limits) {
  let reduced = d.items.reduce((acc, item) => acc + item.data.byteLength, 0);
  let matches = [...e];
  let nextSeq = d.nextSeq;
  while (nextSeq !== undefined) {
    if (reduced > limits.maxReadBytes) {
      logForDebugging(
        `Skipping tombstone removal: session stream too large (over ${formatFileSize(limits.maxReadBytes)} read)`,
        {
          level: "warn",
        },
      );
      return;
    }
    let records = await a.readRecords(b, {
      order: "backward",
      fromSeq: nextSeq,
      maxBytes: limits.pageBytes,
    });
    if (!records.ok) {
      logForDebugging(`Tombstone removal abandoned: paging failed (${records.error.code})`, {
        level: "warn",
      });
      return;
    }
    for (let item of records.value.items) {
      reduced += item.data.byteLength;
      if (rowHasUuid(item, c)) matches.push(item);
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
  for (let item of matches) {
    let replaceResult = await a.replaceRecords(b, [], {
      keepBefore: item.seq,
      preserveFrom: item.endSeq,
      publishDiscipline: "inPlace",
      precondition,
    });
    if (!replaceResult.ok) {
      if (replaceResult.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned on the paged path (${replaceResult.error.code})`, {
          level: "warn",
        });
      return;
    }
    precondition = versionIfMatch(replaceResult.value.version);
  }
}
//@ chunk-e6aww6q8.js:301962-302034 placement
function contentHasBlockType(content, blockType) {
  return (
    Array.isArray(content) && content.some((block) => isPlainObject_5(block) && block.type === blockType)
  );
}
//@ chunk-e6aww6q8.js:302034-302227 placement
function collectLinearChain(logs, currentSessionId, index, options) {
  let ids = [];
  let logs_2 = logs;
  while (logs_2 !== undefined) {
    if (options.has(logs_2.uuid) || !filterResumableSessions(logs_2, currentSessionId)) return [];
    ids.push(logs_2);
    let filtered = (index.get(logs_2.uuid) ?? []).filter((child) => !options.has(child.uuid));
    if (filtered.length > 1) return [];
    logs_2 = filtered[0];
  }
  return ids;
}
//@ chunk-e6aww6q8.js:302227-302289 placement = filterResumableSessions (1)
function filterResumableSessions(logs, currentSessionId) {
  return logs.isSidechain === currentSessionId.isSidechain && isAuxiliaryEntry(logs);
}
//@ chunk-e6aww6q8.js:302289-302474 placement
function isAuxiliaryEntry(entry) {
  if (entry.type === "attachment") return true;
  if (entry.type === "system") return entry.subtype !== "compact_boundary";
  return (
    entry.type === "user" &&
    entry.isMeta === true &&
    !contentHasBlockType(entry.message?.content, "tool_result")
  );
}
//@ chunk-e6aww6q8.js:302474-302538 placement
function indexOrMax(index, message) {
  return index?.get(message.uuid) ?? Number.MAX_SAFE_INTEGER;
}
//@ chunk-e6aww6q8.js:302538-302615 placement
function mapKeysToIndex(messages) {
  let index = new Map();
  let i = 0;
  for (let key of messages.keys()) index.set(key, i++);
  return index;
}
//@ chunk-e6aww6q8.js:302615-302775 placement
function buildChildrenIndex(messages) {
  let children = new Map();
  for (let message of messages.values()) {
    if (!message.parentUuid) continue;
    let siblings = children.get(message.parentUuid);
    if (siblings) siblings.push(message);
    else children.set(message.parentUuid, [message]);
  }
  return children;
}
//@ chunk-e6aww6q8.js:303694-304122 placement
/**
 * 对每个末端消息向上回溯到第一个 user/assistant 消息（带记忆），没有 user/assistant 子节点者加入 leafUuids；返回是否遇到环。
 */
function collectLeafUuids({ messages, terminalMessages, hasUserAssistantChild, leafUuids }) {
  let ownerByUuid = new Map();
  let sawCycle = false;
  for (let terminalMessage of terminalMessages) {
    let walkUuids = [];
    let owner = "root";
    let row = terminalMessage;
    while (row) {
      if (row.type === "user" || row.type === "assistant") {
        owner = row;
        break;
      }
      let knownOwner = ownerByUuid.get(row.uuid);
      if (knownOwner !== undefined) {
        owner = knownOwner;
        break;
      }
      ownerByUuid.set(row.uuid, "cycle");
      walkUuids.push(row.uuid);
      row = row.parentUuid ? messages.get(row.parentUuid) : undefined;
    }
    for (let uuid of walkUuids) ownerByUuid.set(uuid, owner);
    if (owner === "cycle") sawCycle = true;
    else if (owner !== "root" && !hasUserAssistantChild.has(owner.uuid)) leafUuids.add(owner.uuid);
  }
  return sawCycle;
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
