/**
 * utils/sessionStoragePortable.ts
 *
 * 会话文件的可移植读取工具（头尾读取、字节级字段扫描、压缩边界标记）；本段混有终端按键与 git 配置常量（疑似错归）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionStoragePortable.ts
 * pieces: chunk-5xgkngpb.js (2), chunk-80bdkzt1.js (86), chunk-jndyh8cy.js (2)
 * attribution: fingerprint 11, placement 77, layout 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createWriteStream, constants } from "fs";
import { once } from "events";
import { lstat, open, rename, readdir, realpath, stat } from "fs/promises";
import { createInterface } from "readline";
import { randomUUID } from "crypto";
import { basename, isAbsolute, join, dirname } from "path";
import { renderPluginPrompt } from "./messages/pluginPrompts.js";
import { readAllPages } from "./pagedRead.js";
import { hashString31 } from "./pastedContent.js";
import { identity } from "./pathClassification.js";
import { isNetworkishPath } from "./networkPaths.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { getProjectDirNameOverride } from "./envUtils.js";
import { isDiskless } from "../bootstrap/state.js";
import { getWorktreePathsPortable } from "./getWorktreePathsPortable.js";
import { isByteViewUnsupportedError } from "./storage/storageErrors.js";
import { skipNuls, buffer_5 } from "./transcript/entryTypes.js";
import {
  contentBlockTypeBucket,
  stripCacheControl_2_2,
  saltedHash,
  summarizeLongText,
  classifyUserText,
} from "../services/api/promptCacheBreakParts.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-80bdkzt1.js:1310-1366 placement
var LITE_READ_BUF_SIZE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROGRAMMATIC_ENTRYPOINTS;
deferInit("chunk-80bdkzt1.js:1310", () => {
  LITE_READ_BUF_SIZE = 65536;
  PROGRAMMATIC_ENTRYPOINTS = new Set(["sdk-cli", "sdk-ts", "sdk-py"]);
});
//@ chunk-80bdkzt1.js:1366-1582 placement
function isHiddenFromSessionPicker(head, tail) {
  let entrypoint =
    extractJsonStringField(head, "entrypoint") ?? extractLastJsonStringField(tail, "entrypoint");
  if (entrypoint && PROGRAMMATIC_ENTRYPOINTS.has(entrypoint)) return true;
  let parentLine =
    head
      .split(
        `
`,
      )
      .find((line) => line.includes('"parentUuid":')) ?? head;
  let jsonStringField = extractJsonStringField(parentLine, "sessionKind");
  return jsonStringField === "daemon" || jsonStringField === "daemon-worker";
}
//@ chunk-80bdkzt1.js:1582-1655 placement
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//@ chunk-80bdkzt1.js:1655-1730 placement
function validateUuid(maybeUuid) {
  if (typeof maybeUuid !== "string") return null;
  return UUID_RE.test(maybeUuid) ? maybeUuid : null;
}
//@ chunk-80bdkzt1.js:1730-1822 placement
function unescapeJsonString(raw) {
  if (!raw.includes("\\")) return raw;
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}
//@ chunk-80bdkzt1.js:1822-2040 placement (2.1.88 match: extractJsonStringFieldPrefix, 1)
function extractJsonStringField(text, key) {
  let patterns = [`"${key}":"`, `"${key}": "`];
  for (let pattern of patterns) {
    let idx = text.indexOf(pattern);
    if (idx < 0) continue;
    let valueStart = idx + pattern.length;
    let i = valueStart;
    while (i < text.length) {
      if (text[i] === "\\") {
        i += 2;
        continue;
      }
      if (text[i] === '"') return unescapeJsonString(text.slice(valueStart, i));
      i++;
    }
  }
  return;
}
//@ chunk-80bdkzt1.js:2040-2303 placement (2.1.88 match: extractJsonStringFieldPrefix, 1)
function extractLastJsonStringField(text, key) {
  let patterns = [`"${key}":"`, `"${key}": "`];
  let value;
  let bestIndex = -1;
  for (let pattern of patterns) {
    let from = 0;
    while (true) {
      let index = text.indexOf(pattern, from);
      if (index < 0) break;
      let valueStart = index + pattern.length;
      let i = valueStart;
      while (i < text.length) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          if (index > bestIndex) {
            value = unescapeJsonString(text.slice(valueStart, i));
            bestIndex = index;
          }
          break;
        }
        i++;
      }
      from = i + 1;
    }
  }
  return value;
}
//@ chunk-80bdkzt1.js:2303-2339 placement
function extractFieldFromLastEntryOfTypeStrict(text, type, key) {
  return findLastJsonStringField(text, key, type);
}
//@ chunk-80bdkzt1.js:2339-2682 placement
function findLastJsonStringField(text, key, type) {
  let typeNeedle = type === undefined ? undefined : `"type":"${type}"`;
  let keyNeedle = `"${key}":`;
  let end = text.length;
  while (end > 0) {
    let index = text.lastIndexOf(
      `
`,
      end - 1,
    );
    let sliced = text.slice(index + 1, end);
    end = index;
    if (sliced.includes(keyNeedle) && (typeNeedle === undefined || sliced.includes(typeNeedle)))
      try {
        let parsed = JSON.parse(sliced);
        if (typeof parsed === "object" && parsed !== null && (type === undefined || parsed.type === type)) {
          let value = parsed[key];
          if (typeof value === "string") return value;
        }
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-80bdkzt1.js:2682-2944 placement
function extractFieldFromFirstEntryStrict(head, key) {
  let keyNeedle = `"${key}":`;
  let start = 0;
  while (start < head.length) {
    let index = head.indexOf(
      `
`,
      start,
    );
    let line = index < 0 ? head.slice(start) : head.slice(start, index);
    start = index < 0 ? head.length : index + 1;
    if (line.includes(keyNeedle))
      try {
        let parsed = JSON.parse(line);
        if (typeof parsed === "object" && parsed !== null) {
          let value = parsed[key];
          if (typeof value === "string") return value;
        }
      } catch {}
  }
  return;
}
//@ chunk-80bdkzt1.js:2944-2976 placement
function extractFieldFromLastEntryStrict(text, key) {
  return findLastJsonStringField(text, key);
}
//@ chunk-80bdkzt1.js:2976-3083 placement
function workspaceV5Of(v5State, hoverRestOn) {
  return v5State?.realWorkspacePath === undefined
    ? undefined
    : {
        hoverRestOn,
        realPath: v5State.realWorkspacePath,
      };
}
//@ chunk-80bdkzt1.js:3083-3129 placement
async function writeEntriesToJsonlFile(path, entries, target) {
  return writeJsonlRecords(path, entries, "w", target);
}
//@ chunk-80bdkzt1.js:3129-3175 placement
async function appendEntriesToJsonlFile(path, entries, target) {
  return writeJsonlRecords(path, entries, "a", target);
}
//@ chunk-80bdkzt1.js:3175-3439 placement
async function writeJsonlRecords(path, entries, flags, target) {
  if (target !== undefined && target.hoverRestOn && (flags === "w" || entries.length > 0))
    return writeRecordsToBackend(target.source, entries, flags);
  let writeStream = createWriteStream(path, {
    mode: 384,
    flags,
  });
  try {
    for (let entry of entries)
      if (
        !writeStream.write(
          JSON.stringify(entry) +
            `
`,
        )
      )
        await once(writeStream, "drain");
    writeStream.end();
    await once(writeStream, "finish");
  } catch (error) {
    writeStream.destroy();
    throw error;
  }
}
//@ chunk-80bdkzt1.js:3439-3795 placement
/**
 * 通过 v5 存储后端写转录记录：w 模式原地替换全部记录，否则追加；失败抛出带原因的错误。
 */
async function writeRecordsToBackend(source, entries, flags) {
  let { backend, key } = source;
  let mapped = entries.map((entry) => ({
    data:
      JSON.stringify(entry) +
      `
`,
  }));
  if (flags === "w") {
    let result = await backend.replaceRecords(key, mapped, {
      publishDiscipline: "inPlace",
      mode: 384,
    });
    if (!result.ok)
      throw Error("transcript stream replace failed", {
        cause: result.error,
      });
    return;
  }
  let result = await backend.append(key, mapped);
  if (!result.ok)
    throw Error("transcript stream append failed", {
      cause: result.error,
    });
}
//@ chunk-80bdkzt1.js:3795-4318 placement (2.1.88 match: extractFirstPromptFromHead, 0.915)
function extractFirstPromptFromHead(head, mode = "stored") {
  let start = 0;
  let commandFallback = {
    commandFallback: "",
  };
  while (start < head.length) {
    let newlineIdx = head.indexOf(
      `
`,
      start,
    );
    let line = newlineIdx >= 0 ? head.slice(start, newlineIdx) : head.slice(start);
    start = newlineIdx >= 0 ? newlineIdx + 1 : head.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true')) continue;
    if (line.includes('"isCompactSummary":true') || line.includes('"isCompactSummary": true')) continue;
    try {
      let entry = JSON.parse(line);
      let prompt = renderPluginPrompt(entry, commandFallback, mode);
      if (prompt !== undefined) return prompt;
    } catch {
      continue;
    }
  }
  return commandFallback.commandFallback;
}
//@ chunk-80bdkzt1.js:4318-4788 placement
function attachmentPromptLabelFromHead(head) {
  let start = 0;
  while (start < head.length) {
    let newlineIdx = head.indexOf(
      `
`,
      start,
    );
    let line = newlineIdx >= 0 ? head.slice(start, newlineIdx) : head.slice(start);
    start = newlineIdx >= 0 ? newlineIdx + 1 : head.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true')) continue;
    if (line.includes('"type":"image"') || line.includes('"type": "image"')) return "Image";
    if (line.includes('"type":"document"') || line.includes('"type": "document"')) return "Document";
  }
  return "";
}
//@ chunk-80bdkzt1.js:4788-4965 placement
function extractFirstPromptFromEntries(entries, mode = "stored") {
  let state = {
    commandFallback: "",
  };
  for (let entry of entries) {
    if (typeof entry !== "object" || entry === null) continue;
    let prompt = renderPluginPrompt(entry, state, mode);
    if (prompt !== undefined) return prompt;
  }
  return state.commandFallback;
}
//@ chunk-80bdkzt1.js:4965-5008 placement
var READ_NOFOLLOW_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
//@ chunk-80bdkzt1.js:5008-5519 placement
async function readHeadAndTail(path, fileSize, buf, target) {
  if (target !== undefined && target.hoverRestOn) return readHeadAndTail_2(target.source);
  try {
    if (READ_NOFOLLOW_FLAGS === constants.O_RDONLY) {
      if (!(await lstat(path)).isFile())
        return {
          head: "",
          tail: "",
        };
    }
    let handle = await open(path, READ_NOFOLLOW_FLAGS);
    try {
      if (!(await handle.stat()).isFile())
        return {
          head: "",
          tail: "",
        };
      let headResult = await handle.read(buf, 0, LITE_READ_BUF_SIZE, 0);
      if (headResult.bytesRead === 0)
        return {
          head: "",
          tail: "",
        };
      let head = buf.toString("utf8", 0, headResult.bytesRead);
      let tailOffset = Math.max(0, fileSize - LITE_READ_BUF_SIZE);
      let tail = head;
      if (tailOffset > 0) {
        let tailResult = await handle.read(buf, 0, LITE_READ_BUF_SIZE, tailOffset);
        tail = buf.toString("utf8", 0, tailResult.bytesRead);
      }
      return {
        head,
        tail,
      };
    } finally {
      await handle.close();
    }
  } catch {
    return {
      head: "",
      tail: "",
    };
  }
}
//@ chunk-80bdkzt1.js:5519-5617 placement (2.1.88 match: readHeadAndTail, 0.802)
async function readHeadAndTail_2(target) {
  let headTailV5 = await readHeadTailV5(target);
  return headTailV5 === null
    ? {
        head: "",
        tail: "",
      }
    : {
        head: headTailV5.head,
        tail: headTailV5.tail,
      };
}
//@ chunk-80bdkzt1.js:5617-5682 placement
function anchorOffsetTail(tail) {
  let index = tail.indexOf(`
`);
  return index >= 0 ? tail.slice(index + 1) : "";
}
//@ chunk-80bdkzt1.js:5682-6023 placement
/**
 * 从 v5 存储后端一次读取转录的头部与尾部缓冲，返回 {head, tail, mtimeMs, totalBytes}；不存在或失败返回 null。
 */
async function readHeadTailV5(target) {
  let { backend, key } = target;
  try {
    let read = await backend.read([
      {
        key,
        offset: 0,
        length: LITE_READ_BUF_SIZE,
      },
      {
        key,
        tail: LITE_READ_BUF_SIZE,
      },
    ]);
    if (!read.ok) return null;
    let [headItem, tailItem] = read.value.items;
    if (!headItem.found || headItem.value.length === 0) return null;
    let head = bufferToString(headItem.value);
    let tail = tailItem.found && tailItem.value.length > 0 ? bufferToString(tailItem.value) : head;
    return {
      head,
      tail,
      mtimeMs: headItem.mtimeMs,
      totalBytes: headItem.totalBytes,
    };
  } catch {
    return null;
  }
}
//@ chunk-80bdkzt1.js:6023-6109 placement
function bufferToString(bytes) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf8");
}
//@ chunk-80bdkzt1.js:6109-6160 placement
async function _(path, target) {
  return (await getTranscriptMessagesState(path, target)) !== "none";
}
//@ chunk-80bdkzt1.js:6160-6604 placement
/**
 * 判断转录文件是否含 user/assistant 消息：逐行扫描，返回 has / none / unknown（v5 存储时交给后端判断）。
 */
async function getTranscriptMessagesState(path, target) {
  if (target !== undefined && target.hoverRestOn) return transcriptMessagesStateV5(target.source);
  try {
    if (!(await lstat(path)).isFile()) return "none";
  } catch (error) {
    return isEnoentError(error) ? "none" : "unknown";
  }
  let handle;
  try {
    handle = await open(path, "r");
  } catch (error) {
    return isEnoentError(error) ? "none" : "unknown";
  }
  try {
    let lines = createInterface({
      input: handle.createReadStream(),
    });
    for await (let line of lines)
      if (line.includes('"type":"user"') || line.includes('"type":"assistant"')) {
        lines.close();
        return "has";
      }
    return "none";
  } catch {
    return "unknown";
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-80bdkzt1.js:6604-6697 placement
var TRANSCRIPT_TAIL_READ_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TRANSCRIPT_FULL_READ_BYTES;
var buffer;
var buffer_2;
deferInit("chunk-80bdkzt1.js:6604", () => {
  TRANSCRIPT_TAIL_READ_BYTES = 65536;
  TRANSCRIPT_FULL_READ_BYTES = 4194304;
  buffer = Buffer.from('"type":"user"');
  buffer_2 = Buffer.from('"type":"assistant"');
});
//@ chunk-80bdkzt1.js:6697-6750 placement
function hasConversationMarker(chunk) {
  return chunk.includes(buffer) || chunk.includes(buffer_2);
}
//@ chunk-80bdkzt1.js:6750-6762 placement
var MAX_LISTING_PAGES = 1e4;
//@ chunk-80bdkzt1.js:6762-6948 placement
function listedProjectKey(item, isKeySegment) {
  if (
    item.kind !== "scope" ||
    item.scope.namespace !== "transcript" ||
    item.scope.projectKey === undefined ||
    item.scope.sessionId !== undefined ||
    !isKeySegment(item.scope.projectKey)
  )
    return;
  return item.scope.projectKey;
}
//@ chunk-80bdkzt1.js:6948-7688 placement
async function transcriptMessagesStateV5(target, hasMarker = hasConversationMarker) {
  let { backend, key } = target;
  let fromSeq;
  let truncated = false;
  let count = 0;
  let pages = 0;
  try {
    for (;;) {
      if (++pages > MAX_LISTING_PAGES) return "unknown";
      let records = await backend.readRecords(key, {
        order: "forward",
        maxBytes: fromSeq === undefined ? TRANSCRIPT_TAIL_READ_BYTES : TRANSCRIPT_FULL_READ_BYTES,
        ...(fromSeq !== undefined && {
          fromSeq,
        }),
      });
      if (!records.ok) return records.error.code === "NotFound" ? "none" : "unknown";
      count += records.value.items.length;
      for (let item of records.value.items) {
        let buffer = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength);
        if (hasMarker(buffer)) return "has";
        if (item.truncated === true) truncated = true;
      }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === undefined) {
        if (truncated) return "unknown";
        if (records.value.items.length === 0 && fromSeq !== undefined) return "unknown";
        let stream = await backend.statStream(key);
        if (!stream.ok) return stream.error.code === "NotFound" ? "none" : "unknown";
        return stream.value.recordCount > count ? "unknown" : "none";
      }
      if (fromSeq !== undefined && nextSeq <= fromSeq) return "unknown";
      fromSeq = nextSeq;
    }
  } catch {
    return "unknown";
  }
}
//@ chunk-80bdkzt1.js:7688-8158 placement
async function quarantineJobTranscript(path, target) {
  let suffix = `orphaned-${Date.now()}-${randomUUID().slice(0, 8)}`;
  let source = target !== undefined && target.hoverRestOn ? target.source : undefined;
  let key =
    source !== undefined && path.endsWith(".jsonl")
      ? transcriptStoreKey(path, basename(path, ".jsonl"), source)
      : undefined;
  if (key !== undefined && source !== undefined) {
    let { key: key_2 } = key;
    if (key_2.namespace !== "transcript") return false;
    try {
      return (
        await key.backend.move(key_2, source.transcriptKey(key_2.projectKey, `${key_2.sessionId}.${suffix}`))
      ).ok;
    } catch {
      return false;
    }
  }
  let targetPath = `${path.endsWith(".jsonl") ? path.slice(0, -6) : path}.${suffix}.jsonl`;
  try {
    await rename(path, targetPath);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-80bdkzt1.js:8158-8209 placement (2.1.88 match: getErrorsPath, 1)
function isTranscriptFileResumeArg(value) {
  return isAbsolute(value) && value.endsWith(".jsonl");
}
//@ chunk-80bdkzt1.js:8209-9394 placement
/**
 * 为恢复会话定位 transcript 文件：依次查链接路径、项目目录、计算路径，必要时跨 worktree 与全项目扫描，返回 {path, via, hasMessages, unverifiable?}。与 bridge 无关（会话存储）。
 */
async function resolveJobTranscript(sessionId, cwd, linkScanPath, options, target) {
  let canonical = await canonicalizePath(cwd, workspaceV5Of(target?.source, target?.hoverRestOn === true));
  if (validateUuid(sessionId) === null)
    return {
      path: join(getProjectDir(canonical), "invalid-resume-id.jsonl"),
      hasMessages: false,
      via: "computed",
    };
  let path = join(getProjectDir(canonical), `${sessionId}.jsonl`);
  let candidates = [];
  if (linkScanPath !== undefined)
    candidates.push(
      linkScanPath.endsWith(`${sessionId}.jsonl`)
        ? {
            path: linkScanPath,
            via: "linkScanPath",
          }
        : {
            path: join(dirname(linkScanPath), `${sessionId}.jsonl`),
            via: "linkScanDir",
          },
    );
  let targetOpts =
    target !== undefined && target.hoverRestOn
      ? {
          ...target,
          source: withSharedTranscriptListing(target.source),
        }
      : undefined;
  for (let dir of await findProjectDirs(canonical, targetOpts))
    candidates.push({
      path: join(dir, `${sessionId}.jsonl`),
      via: "projectDir",
    });
  candidates.push({
    path,
    via: "computed",
  });
  let seen = new Set();
  let hasMessages = (filePath) => transcriptHasMessages(filePath, sessionId, targetOpts);
  let unverifiable;
  for (let candidate of candidates) {
    if (seen.has(candidate.path)) continue;
    seen.add(candidate.path);
    let state = await hasMessages(candidate.path);
    if (state === "has")
      return {
        ...candidate,
        hasMessages: true,
      };
    if (state === "unverifiable" && unverifiable === undefined) unverifiable = candidate;
  }
  if (options?.crossWorktree !== false)
    for (let { projectDir } of await findWorktreeProjectDirs(canonical, targetOpts)) {
      let path = join(projectDir, `${sessionId}.jsonl`);
      if (targetOpts !== undefined) {
        if (seen.has(path)) continue;
        seen.add(path);
      }
      let state = await hasMessages(path);
      if (state === "has")
        return {
          path,
          via: "worktreeProjectDir",
          hasMessages: true,
        };
      if (state === "unverifiable" && unverifiable === undefined)
        unverifiable = {
          path,
          via: "worktreeProjectDir",
        };
    }
  if (options?.crossWorktree !== false) {
    let soleTranscriptWithMessagesById = await findSoleTranscriptWithMessagesById(
      sessionId,
      seen,
      targetOpts,
    );
    if (soleTranscriptWithMessagesById !== null)
      return {
        path: soleTranscriptWithMessagesById,
        via: "projectsScan",
        hasMessages: true,
      };
  }
  if (unverifiable !== undefined)
    return {
      ...unverifiable,
      hasMessages: true,
      unverifiable: true,
    };
  return {
    ...candidates[0],
    hasMessages: false,
  };
}
//@ chunk-80bdkzt1.js:9394-9556 placement
function transcriptStoreKey(path, sessionId, source) {
  let projectKey = addressableProjectKey(dirname(path), source.isKeySegment);
  if (projectKey === undefined || basename(path) !== `${sessionId}.jsonl` || !source.isKeySegment(sessionId))
    return;
  return {
    backend: source.backend,
    key: source.transcriptKey(projectKey, sessionId),
  };
}
//@ chunk-80bdkzt1.js:9556-9872 placement
async function transcriptHasMessages(filePath, sessionId, target) {
  let key =
    target !== undefined && target.hoverRestOn
      ? transcriptStoreKey(filePath, sessionId, target.source)
      : undefined;
  if (key === undefined) return (await _(filePath)) ? "has" : "none";
  let state = await transcriptMessagesStateV5(key);
  if (state === "has") return "has";
  try {
    if (!(await lstat(filePath)).isFile()) return "none";
  } catch (error) {
    if (!isEnoentError(error)) return "has";
    return state === "unknown" ? "unverifiable" : "none";
  }
  return (await _(filePath)) ? "has" : "none";
}
//@ chunk-80bdkzt1.js:9872-9954 placement (2.1.88 match: isConnectionError, 1)
function isEnoentError(err) {
  return err !== null && typeof err === "object" && "code" in err && err.code === "ENOENT";
}
//@ chunk-80bdkzt1.js:9954-10036 placement
function cursorOptions(cursor) {
  return {
    skipScopeStats: true,
    skipKeyStats: true,
    ...(cursor !== undefined && {
      cursor,
    }),
  };
}
//@ chunk-80bdkzt1.js:10036-10597 placement
function withSharedTranscriptListing(target) {
  let cache = new Map();
  let backend = new Proxy(target.backend, {
    get(backend, prop, receiver) {
      let value = Reflect.get(backend, prop, receiver);
      if (prop !== "listEntries") return typeof value === "function" ? value.bind(backend) : value;
      return (filter, opts) => {
        if (!(
          filter.namespace === "transcript" &&
          !("projectKey" in filter) &&
          Object.keys(opts ?? {}).every(
            (key) => key === "cursor" || key === "skipScopeStats" || key === "skipKeyStats",
          )
        ))
          return backend.listEntries(filter, opts);
        let joined = [opts?.cursor ?? "", opts?.skipScopeStats, opts?.skipKeyStats].map(String).join("\x00");
        let cached = cache.get(joined);
        if (cached === undefined) {
          cached = backend.listEntries(filter, opts);
          cache.set(joined, cached);
          let evict = () => {
            cache.delete(joined);
          };
          cached.then((result) => {
            if (!result.ok) evict();
          }, evict);
        }
        return cached;
      };
    },
  });
  return {
    ...target,
    backend,
  };
}
//@ chunk-80bdkzt1.js:10597-10972 placement
async function findSoleTranscriptWithMessagesById(sessionId, excluded = new Set(), target) {
  if (validateUuid(sessionId) === null) return null;
  if (target !== undefined && target.hoverRestOn && target.source.isKeySegment(sessionId))
    return findTranscriptInOtherProjects(sessionId, excluded, target.source);
  let projectsDir = getProjectsDir();
  let found = null;
  try {
    for (let dirent of await readdir(projectsDir, {
      withFileTypes: true,
    })) {
      if (!dirent.isDirectory()) continue;
      let path = join(projectsDir, dirent.name, `${sessionId}.jsonl`);
      if (excluded.has(path)) continue;
      if ((await getTranscriptMessagesState(path)) !== "has") continue;
      if (found !== null) return null;
      found = path;
    }
  } catch {
    return null;
  }
  return found;
}
//@ chunk-80bdkzt1.js:10972-11515 placement
/**
 * 在 v5 存储的所有项目中查找含消息的同名会话转录（跳过已排除路径）；找到唯一一个返回其路径，多个或列举未完成返回 null。
 */
async function findTranscriptInOtherProjects(sessionId, excluded, storage) {
  let { backend, transcriptKey, isKeySegment } = storage;
  let projectsDir = getProjectsDir();
  let found = null;
  let ambiguous = false;
  let seen = new Set();
  try {
    let allPages = await readAllPages(
      (cursor) =>
        backend.listEntries(
          {
            namespace: "transcript",
          },
          cursorOptions(cursor),
        ),
      async (items) => {
        for (let item of items) {
          let projectKey = listedProjectKey(item, isKeySegment);
          if (projectKey === undefined) continue;
          let transcriptPath = join(projectsDir, projectKey, `${sessionId}.jsonl`);
          if (seen.has(transcriptPath) || excluded.has(transcriptPath)) continue;
          seen.add(transcriptPath);
          let state = await transcriptMessagesStateV5({
            backend,
            key: transcriptKey(projectKey, sessionId),
          });
          if (state === "unknown")
            try {
              state = (await lstat(transcriptPath)).isFile()
                ? await getTranscriptMessagesState(transcriptPath)
                : "none";
            } catch {}
          if (state !== "has") continue;
          if (found !== null) {
            ambiguous = true;
            return;
          }
          found = transcriptPath;
        }
      },
      {
        until: () => ambiguous,
      },
    );
    if (ambiguous || allPages.status !== "done") return null;
  } catch {
    return null;
  }
  return found;
}
//@ chunk-80bdkzt1.js:11515-12045 placement (2.1.88 match: readSessionLite, 0.859)
async function readSessionLite(filePath, target) {
  if (target !== undefined && target.hoverRestOn) return statWithHeadTail(target.source);
  try {
    if (READ_NOFOLLOW_FLAGS === constants.O_RDONLY) {
      if (!(await lstat(filePath)).isFile()) return null;
    }
    let handle = await open(filePath, READ_NOFOLLOW_FLAGS);
    try {
      let stat = await handle.stat();
      if (!stat.isFile()) return null;
      let buf = Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
      let headResult = await handle.read(buf, 0, LITE_READ_BUF_SIZE, 0);
      if (headResult.bytesRead === 0) return null;
      let head = buf.toString("utf8", 0, headResult.bytesRead);
      let tailOffset = Math.max(0, stat.size - LITE_READ_BUF_SIZE);
      let tail = head;
      if (tailOffset > 0) {
        let tailResult = await handle.read(buf, 0, LITE_READ_BUF_SIZE, tailOffset);
        tail = buf.toString("utf8", 0, tailResult.bytesRead);
      }
      return {
        mtime: stat.mtime.getTime(),
        size: stat.size,
        head,
        tail,
      };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-80bdkzt1.js:12045-12184 placement
async function statWithHeadTail(target) {
  let headTailV5 = await readHeadTailV5(target);
  if (headTailV5 === null) return null;
  return {
    mtime: Math.trunc(headTailV5.mtimeMs),
    size: headTailV5.totalBytes,
    head: headTailV5.head,
    tail: headTailV5.tail,
  };
}
//@ chunk-80bdkzt1.js:12184-12196 placement
var MAX_SANITIZED_LENGTH = 200;
//@ chunk-80bdkzt1.js:12196-12248 placement
function hashPathForSuffix(str) {
  return Math.abs(hashString31(str)).toString(36);
}
//@ chunk-80bdkzt1.js:12248-12300 placement
function sanitizePath_2(path) {
  return path.replace(/[^a-zA-Z0-9]/g, "-");
}
//@ chunk-80bdkzt1.js:12300-12387 placement
/**
 * 把路径清洗成目录名：非字母数字替换为 '-'，超 200 字符时保留前 200 字符并追加 '-<hash36>'。
 */
function sanitizePath(path) {
  let sanitized = sanitizePath_2(path);
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized;
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hashPathForSuffix(path)}`;
}
//@ chunk-80bdkzt1.js:12387-12461 placement
function normalizePathForCwdCompare(path, foldCase) {
  let replaced = path.replaceAll("\\", "/");
  return foldCase ? replaced.toLowerCase() : replaced;
}
//@ chunk-80bdkzt1.js:12461-12583 placement
function isSanitizedNameCollision(a, b, foldCase) {
  let left = identity(a);
  let right = identity(b);
  let fold = (value) => (foldCase ? value.toLowerCase() : value);
  if (fold(sanitizePath_2(left)) !== fold(sanitizePath_2(right))) return false;
  return normalizePathForCwdCompare(left, foldCase) !== normalizePathForCwdCompare(right, foldCase);
}
//@ chunk-80bdkzt1.js:12583-12887 placement
async function recordedCwdCollidesWithProjectResolved(
  recorded,
  projectPath,
  foldCase,
  hasUntouchableRecordSpellingAsync,
  realPathOptions,
) {
  if (!isSanitizedNameCollision(recorded, projectPath, foldCase)) return false;
  if (isNetworkishPath(recorded) || isNetworkishPath(projectPath)) return false;
  if (
    (await hasUntouchableRecordSpellingAsync(recorded)) ||
    (await hasUntouchableRecordSpellingAsync(projectPath))
  )
    return false;
  let resolved;
  try {
    if (realPathOptions !== undefined && realPathOptions.hoverRestOn) {
      let realResult = await realPathOptions.realPath(recorded);
      if (!realResult.ok || !realResult.value.found) return false;
      resolved = identity(realResult.value.path);
    } else resolved = identity(await realpath(recorded));
  } catch {
    return false;
  }
  let canonical = await canonicalizePath(projectPath, realPathOptions);
  return isSanitizedNameCollision(resolved, canonical, foldCase);
}
//@ chunk-80bdkzt1.js:12887-13042 placement
function recordedCwdIsWithinOwnWorktrees(recorded, worktrees, foldCase) {
  if (worktrees === undefined) return false;
  let path = normalizePathForCwdCompare(identity(recorded), foldCase);
  return worktrees.some((wt) => {
    let normalized = normalizePathForCwdCompare(identity(wt), foldCase);
    return path === normalized || path.startsWith(normalized.endsWith("/") ? normalized : normalized + "/");
  });
}
//@ chunk-80bdkzt1.js:13042-13066 placement
function slugCollisionGuardFoldsCase() {
  return false;
}
//@ chunk-80bdkzt1.js:13066-13106 placement (2.1.88 match: getProjectsDir, 1)
/**
 * <配置目录>/projects：所有会话转录的根目录。
 */
function getProjectsDir() {
  return join(getClaudeConfigDir(), "projects");
}
//@ chunk-80bdkzt1.js:13106-13141 placement
/**
 * 项目目录名：自定义配置目录或 diskless 时可由 CLAUDE_CODE_PROJECT_DIR_NAME 覆盖，否则清洗 cwd。
 */
function getProjectKey(path) {
  return getProjectDirNameOverride() ?? sanitizePath(path);
}
//@ chunk-80bdkzt1.js:13141-13195 placement
function legacyDerivedProjectKey(path) {
  let legacyKey = sanitizePath(path);
  return legacyKey === getProjectKey(path) ? undefined : legacyKey;
}
//@ chunk-80bdkzt1.js:13195-13235 placement
function getProjectDir(path, projectsDir = getProjectsDir()) {
  return join(projectsDir, getProjectKey(path));
}
//@ chunk-80bdkzt1.js:13235-13295 placement
function getPinnedProjectDir() {
  let projectDirNameOverride = getProjectDirNameOverride();
  return projectDirNameOverride === undefined ? null : join(getProjectsDir(), projectDirNameOverride);
}
//@ chunk-80bdkzt1.js:13295-13358 placement
function addressableProjectKey(dir, isKeySegment) {
  let key = basename(dir);
  return dirname(dir) === getProjectsDir() && isKeySegment(key) ? key : undefined;
}
//@ chunk-80bdkzt1.js:13358-13529 placement
async function canonicalizePath(path, realPathOptions) {
  try {
    if (realPathOptions !== undefined && realPathOptions.hoverRestOn) {
      let realResult = await realPathOptions.realPath(path);
      return identity(realResult.ok && realResult.value.found ? realResult.value.path : path);
    }
    return identity(await realpath(path));
  } catch {
    return identity(path);
  }
}
//@ chunk-80bdkzt1.js:13529-13557 placement
function projectPathSpellingsForRead(path, cwd) {
  return [cwd];
}
//@ chunk-80bdkzt1.js:13557-13978 placement
async function dirBelongsToProject(dir, cwd, foldCase, target) {
  let source = target !== undefined && target.hoverRestOn ? target.source : undefined;
  let projectKey = source === undefined ? undefined : addressableProjectKey(dir, source.isKeySegment);
  if (source !== undefined && projectKey !== undefined) {
    let result = await hasSessionForCwd(projectKey, cwd, foldCase, source);
    if (result !== undefined) return result;
  }
  if (isDiskless()) return false;
  let sanitizedCwd = sanitizePath_2(cwd);
  let dirents;
  try {
    dirents = await readdir(dir, {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  for (let dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".jsonl")) continue;
    let lite = await readSessionLite(join(dir, dirent.name));
    if (lite === null) continue;
    if (matchesSessionCwd(lite, sanitizedCwd, foldCase)) return true;
  }
  return false;
}
//@ chunk-80bdkzt1.js:13978-14148 placement
function matchesSessionCwd(lite, sanitizedCwd, foldCase) {
  let recorded =
    extractFieldFromLastEntryOfTypeStrict(lite.tail, "relocated", "relocatedCwd") ??
    extractFieldFromFirstEntryStrict(lite.head, "cwd");
  if (recorded === undefined) return false;
  let sanitized = sanitizePath_2(identity(recorded));
  return foldCase ? sanitized.toLowerCase() === sanitizedCwd.toLowerCase() : sanitized === sanitizedCwd;
}
//@ chunk-80bdkzt1.js:14148-14698 placement
/**
 * 在 v5 存储的某项目下逐个检查会话转录的工作目录（含重定位后的目录）是否等于给定目录；找到返回 true，列举未完成返回 undefined。
 */
async function hasSessionForCwd(projectKey, cwd, caseInsensitive, storage) {
  let { backend, transcriptKey, isKeySegment } = storage;
  let sanitizedCwd = sanitizePath_2(cwd);
  let found = false;
  let seen = new Set();
  try {
    let allPages = await readAllPages(
      (cursor) =>
        backend.listEntries(
          {
            namespace: "transcript",
            projectKey,
          },
          cursorOptions(cursor),
        ),
      async (items) => {
        for (let item of items) {
          if (
            item.kind !== "key" ||
            item.key.namespace !== "transcript" ||
            item.key.projectKey !== projectKey ||
            item.key.agentId !== undefined ||
            !isKeySegment(item.key.sessionId) ||
            seen.has(item.key.sessionId)
          )
            continue;
          let sessionId = item.key.sessionId;
          let headTail = await statWithHeadTail({
            backend,
            key: transcriptKey(projectKey, sessionId),
          });
          if (headTail === null) continue;
          seen.add(sessionId);
          if (matchesSessionCwd(headTail, sanitizedCwd, caseInsensitive)) {
            found = true;
            return;
          }
        }
      },
      {
        until: () => found,
      },
    );
    if (found) return true;
    if (allPages.status !== "done") return;
  } catch {
    return;
  }
  return false;
}
//@ chunk-80bdkzt1.js:14698-15205 placement
async function findProjectDirs(cwd, target, projectsDir = getProjectsDir()) {
  if (target !== undefined && target.hoverRestOn) return listProjectDirsForCwd(cwd, target);
  if (isDiskless()) return [];
  let projectDir = getProjectDir(cwd, projectsDir);
  let dirs = [];
  try {
    await readdir(projectDir);
    dirs.push(projectDir);
  } catch {}
  let exact = legacyDerivedProjectKey(cwd);
  if (exact !== undefined) {
    let legacyDir = join(projectsDir, exact);
    try {
      await readdir(legacyDir);
      dirs.push(legacyDir);
    } catch {}
    return dirs;
  }
  let sanitized = sanitizePath(cwd);
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return dirs;
  let foldCase = false;
  let fold = (value) => (foldCase ? value.toLowerCase() : value);
  let prefix = fold(sanitized.slice(0, MAX_SANITIZED_LENGTH) + "-");
  let ownDir = fold(projectDir);
  try {
    for (let dirent of await readdir(projectsDir, {
      withFileTypes: true,
    })) {
      if (!dirent.isDirectory() || !fold(dirent.name).startsWith(prefix)) continue;
      let dir = join(projectsDir, dirent.name);
      if (fold(dir) !== ownDir && (await dirBelongsToProject(dir, cwd, foldCase))) dirs.push(dir);
    }
  } catch {}
  return dirs;
}
//@ chunk-80bdkzt1.js:15205-15344 placement
async function listProjectDirsForCwd(cwd, target) {
  let names = await listProjectDirNamesV5(target.source);
  if (names === null) {
    let legacyKey = legacyDerivedProjectKey(cwd);
    return [getProjectDir(cwd), ...(legacyKey !== undefined ? [join(getProjectsDir(), legacyKey)] : [])];
  }
  return projectDirsFromListedNames(cwd, names, false, target);
}
//@ chunk-80bdkzt1.js:15344-15644 placement
async function listProjectDirNamesV5(source) {
  let { backend, isKeySegment } = source;
  let names = [];
  let seen = new Set();
  let pages = 0;
  try {
    if (
      (
        await readAllPages(
          (cursor) =>
            backend.listEntries(
              {
                namespace: "transcript",
              },
              cursorOptions(cursor),
            ),
          (items) => {
            for (let item of items) {
              let key = listedProjectKey(item, isKeySegment);
              if (key !== undefined && !seen.has(key)) {
                seen.add(key);
                names.push(key);
              }
            }
            pages++;
          },
        )
      ).status === "error"
    )
      return pages === 0 ? null : names;
  } catch {
    return pages === 0 ? null : names;
  }
  return names;
}
//@ chunk-80bdkzt1.js:15644-16128 placement
async function projectDirsFromListedNames(cwd, names, foldCase, target) {
  let projectKey = getProjectKey(cwd);
  let projectDir = getProjectDir(cwd);
  let legacyKey = legacyDerivedProjectKey(cwd);
  let truncatedPrefix =
    legacyKey === undefined && projectKey.length > MAX_SANITIZED_LENGTH
      ? projectKey.slice(0, MAX_SANITIZED_LENGTH) + "-"
      : undefined;
  let projectsDir = getProjectsDir();
  let fold = (value) => (foldCase ? value.toLowerCase() : value);
  let prefix = truncatedPrefix !== undefined ? fold(truncatedPrefix) : undefined;
  let ownKey = fold(projectKey);
  let hasOwn = false;
  let legacyDir;
  let candidates = [];
  let seen = new Set();
  for (let name of names)
    if (name === projectKey) hasOwn = true;
    else if (legacyKey !== undefined) {
      if (legacyDir === undefined && fold(name) === fold(legacyKey)) legacyDir = join(projectsDir, name);
    } else if (
      prefix !== undefined &&
      fold(name).startsWith(prefix) &&
      fold(name) !== ownKey &&
      !seen.has(fold(name))
    ) {
      seen.add(fold(name));
      candidates.push(name);
    }
  let dirs = [];
  for (let name of candidates) {
    let dir = join(projectsDir, name);
    if (await dirBelongsToProject(dir, cwd, foldCase, target)) dirs.push(dir);
  }
  return [...(hasOwn ? [projectDir] : []), ...(legacyDir !== undefined ? [legacyDir] : []), ...dirs];
}
//@ chunk-80bdkzt1.js:16128-16178 placement
async function findProjectDir(originalCwd, target) {
  return (await findProjectDirs(originalCwd, target))[0];
}
//@ chunk-80bdkzt1.js:16178-16417 placement
async function findWorktreeProjectDirs(cwd, target, projectsDir = getProjectsDir()) {
  let out = [];
  for (let wt of await getWorktreePathsPortable(cwd)) {
    if (wt === cwd) continue;
    let projectDirs = await findProjectDirs(wt, target, projectsDir);
    if (target !== undefined && target.hoverRestOn) {
      let projectDir = getProjectDir(wt);
      if (!projectDirs.includes(projectDir)) projectDirs.push(projectDir);
    }
    for (let projectDir of projectDirs)
      out.push({
        worktreePath: wt,
        projectDir,
      });
  }
  return out;
}
//@ chunk-80bdkzt1.js:16417-17897 placement
async function resolveSessionFilePath(
  sessionId,
  projectPath,
  transcriptStorageContext,
  hoverRestOn,
  projectsDir = getProjectsDir(),
) {
  let fileName = `${sessionId}.jsonl`;
  let source =
    hoverRestOn && transcriptStorageContext !== undefined && transcriptStorageContext.isKeySegment(sessionId)
      ? withSharedTranscriptListing(transcriptStorageContext)
      : undefined;
  let target =
    source === undefined
      ? undefined
      : {
          source,
          hoverRestOn,
        };
  async function tryDir(dir, projectPath) {
    let filePath = join(dir, fileName);
    if (source) {
      let projectKey = addressableProjectKey(dir, source.isKeySegment);
      if (projectKey !== undefined) {
        try {
          let stats = await source.backend.stat(source.transcriptKey(projectKey, sessionId));
          if (stats.ok) {
            let size = stats.value.storedBytes ?? stats.value.size;
            if (size > 0)
              return {
                filePath,
                projectPath,
                fileSize: size,
              };
          }
        } catch {}
        return;
      }
    }
    try {
      let stats = await stat(filePath);
      if (stats.size > 0)
        return {
          filePath,
          projectPath,
          fileSize: stats.size,
        };
    } catch {}
    return;
  }
  if (projectPath) {
    let canonical = await canonicalizePath(projectPath, workspaceV5Of(transcriptStorageContext, hoverRestOn));
    let seen = new Set();
    for (let spelling of projectPathSpellingsForRead(projectPath, canonical))
      for (let dir of await findProjectDirs(spelling, target, projectsDir)) {
        let candidateDir = dir;
        if (seen.has(candidateDir)) continue;
        seen.add(candidateDir);
        let found = await tryDir(dir, spelling);
        if (found) return found;
      }
    for (let { worktreePath, projectDir } of await findWorktreeProjectDirs(canonical, target, projectsDir)) {
      let found = await tryDir(projectDir, worktreePath);
      if (found) return found;
    }
    return;
  }
  if (source) {
    let byKey = new Map();
    try {
      if (
        (
          await readAllPages(
            (cursor) =>
              source.backend.listEntries(
                {
                  namespace: "transcript",
                },
                cursor !== undefined
                  ? {
                      cursor,
                    }
                  : undefined,
              ),
            (items) => {
              for (let item of items) {
                let key = listedProjectKey(item, source.isKeySegment);
                if (key === undefined) continue;
                let mtime =
                  item.kind === "scope" && item.mtimeMs !== undefined
                    ? item.mtimeMs
                    : Number.NEGATIVE_INFINITY;
                let existing = byKey.get(key);
                if (existing === undefined)
                  byKey.set(key, {
                    projectKey: key,
                    mtimeMs: mtime,
                  });
                else if (mtime > existing.mtimeMs) existing.mtimeMs = mtime;
              }
            },
          )
        ).status === "error"
      )
        return;
    } catch {
      return;
    }
    let entries = [...byKey.values()];
    entries.sort((a, b) =>
      a.mtimeMs !== b.mtimeMs
        ? b.mtimeMs - a.mtimeMs
        : a.projectKey < b.projectKey
          ? -1
          : a.projectKey > b.projectKey
            ? 1
            : 0,
    );
    for (let { projectKey } of entries) {
      let found = await tryDir(join(projectsDir, projectKey), undefined);
      if (found) return found;
    }
    return;
  }
  let names;
  try {
    names = await readdir(projectsDir);
  } catch {
    return;
  }
  for (let name of names) {
    let found = await tryDir(join(projectsDir, name), undefined);
    if (found) return found;
  }
  return;
}
//@ chunk-80bdkzt1.js:17897-17963 placement (2.1.88 match: compactBoundaryMarker, 1)
var TRANSCRIPT_READ_CHUNK_SIZE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SKIP_PRECOMPACT_THRESHOLD;
var COMPACT_BOUNDARY_MARKER;
deferInit("chunk-80bdkzt1.js:17897", () => {
  TRANSCRIPT_READ_CHUNK_SIZE = 1048576;
  SKIP_PRECOMPACT_THRESHOLD = 5242880;
  COMPACT_BOUNDARY_MARKER = Buffer.from('"compact_boundary"');
});
//@ chunk-80bdkzt1.js:17963-18197 fingerprint (2.1.88 match: parseBoundaryLine, 0.909)
function parseBoundaryLine(line) {
  try {
    let parsed = JSON.parse(line);
    if (parsed.type !== "system" || parsed.subtype !== "compact_boundary") return null;
    return {
      hasPreservedSegment: Boolean(
        parsed.compactMetadata?.preservedSegment || parsed.compactMetadata?.preservedMessages,
      ),
    };
  } catch {
    return null;
  }
}
//@ chunk-80bdkzt1.js:18197-18407 fingerprint (2.1.88 match: sinkWrite, 1)
function sinkWrite(s, src, start, end) {
  let n = end - start;
  if (n <= 0) return;
  if (s.len + n > s.buf.length) {
    let grown = Buffer.allocUnsafe(Math.min(Math.max(s.buf.length * 2, s.len + n), s.cap));
    s.buf.copy(grown, 0, 0, s.len);
    s.buf = grown;
  }
  src.copy(s.buf, s.len, start, end);
  s.len += n;
}
//@ chunk-80bdkzt1.js:18407-18490 layout (2.1.88 match: hasPrefix, 1)
function hasPrefix_2(src, prefix, at, end) {
  return end - at >= prefix.length && src.compare(prefix, 0, prefix.length, at, at + prefix.length) === 0;
}
//@ chunk-80bdkzt1.js:18490-18609 fingerprint (2.1.88 match: SYSTEM_PREFIX, 0.681)
var ATTRIBUTION_SNAPSHOT_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer_3;
var ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER;
var buffer_4;
var ATTRIBUTION_SNAPSHOT_MARKER;
deferInit("chunk-80bdkzt1.js:18490", () => {
  ATTRIBUTION_SNAPSHOT_PREFIX = Buffer.from('{"type":"attribution-snapshot"');
  buffer_3 = Buffer.from('{"type":"system"');
  ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER = 10;
  buffer_4 = Buffer.from([ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER]);
  ATTRIBUTION_SNAPSHOT_MARKER = 256;
});
//@ chunk-80bdkzt1.js:18609-19244 fingerprint (2.1.88 match: processStraddle, 1)
function processStraddle(s, chunk, bytesRead) {
  s.straddleSnapCarryLen = 0;
  s.straddleSnapTailEnd = 0;
  if (s.carryLen === 0) return 0;
  let cb = s.carryBuf;
  let firstNl = chunk.indexOf(ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER);
  if (firstNl === -1 || firstNl >= bytesRead) return 0;
  let tailEnd = firstNl + 1;
  if (hasPrefix_2(cb, ATTRIBUTION_SNAPSHOT_PREFIX, 0, s.carryLen)) {
    s.straddleSnapCarryLen = s.carryLen;
    s.straddleSnapTailEnd = tailEnd;
    s.lastSnapSrc = null;
  } else if (s.carryLen < ATTRIBUTION_SNAPSHOT_PREFIX.length) return 0;
  else {
    if (hasPrefix_2(cb, buffer_3, 0, s.carryLen)) {
      let hit = parseBoundaryLine(cb.toString("utf-8", 0, s.carryLen) + chunk.toString("utf-8", 0, firstNl));
      if (hit?.hasPreservedSegment) s.hasPreservedSegment = true;
      else if (hit) {
        s.out.len = 0;
        s.boundaryStartOffset = s.bufFileOff;
        s.hasPreservedSegment = false;
        s.lastSnapSrc = null;
      }
    }
    sinkWrite(s.out, cb, 0, s.carryLen);
    sinkWrite(s.out, chunk, 0, tailEnd);
  }
  s.bufFileOff += s.carryLen + tailEnd;
  s.carryLen = 0;
  return tailEnd;
}
//@ chunk-80bdkzt1.js:19244-19781 fingerprint (2.1.88 match: scanChunkLines, 1)
function scanChunkLines(s_2, buf, boundaryMarker) {
  let boundaryAt = buf.indexOf(boundaryMarker);
  let runStart = 0;
  let lineStart = 0;
  let lastSnapStart = -1;
  let lastSnapEnd = -1;
  let nl = buf.indexOf(ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER);
  while (nl !== -1) {
    let lineEnd = nl + 1;
    if (boundaryAt !== -1 && boundaryAt < lineStart) boundaryAt = buf.indexOf(boundaryMarker, lineStart);
    if (hasPrefix_2(buf, ATTRIBUTION_SNAPSHOT_PREFIX, lineStart, lineEnd)) {
      sinkWrite(s_2.out, buf, runStart, lineStart);
      lastSnapStart = lineStart;
      lastSnapEnd = lineEnd;
      runStart = lineEnd;
    } else if (
      boundaryAt >= lineStart &&
      boundaryAt < Math.min(lineStart + ATTRIBUTION_SNAPSHOT_MARKER, lineEnd)
    ) {
      let hit = parseBoundaryLine(buf.toString("utf-8", lineStart, nl));
      if (hit?.hasPreservedSegment) s_2.hasPreservedSegment = true;
      else if (hit) {
        s_2.out.len = 0;
        s_2.boundaryStartOffset = s_2.bufFileOff + lineStart;
        s_2.hasPreservedSegment = false;
        s_2.lastSnapSrc = null;
        lastSnapStart = -1;
        s_2.straddleSnapCarryLen = 0;
        runStart = lineStart;
      }
      boundaryAt = buf.indexOf(boundaryMarker, boundaryAt + boundaryMarker.length);
    }
    lineStart = lineEnd;
    nl = buf.indexOf(ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER, lineStart);
  }
  sinkWrite(s_2.out, buf, runStart, lineStart);
  return {
    lastSnapStart,
    lastSnapEnd,
    trailStart: lineStart,
  };
}
//@ chunk-80bdkzt1.js:19781-20357 fingerprint (2.1.88 match: captureSnap, 1)
function captureSnap(s, buf, chunk, lastSnapStart, lastSnapEnd) {
  if (lastSnapStart !== -1) {
    s.lastSnapLen = lastSnapEnd - lastSnapStart;
    if (s.lastSnapBuf === undefined || s.lastSnapLen > s.lastSnapBuf.length)
      s.lastSnapBuf = Buffer.allocUnsafe(s.lastSnapLen);
    buf.copy(s.lastSnapBuf, 0, lastSnapStart, lastSnapEnd);
    s.lastSnapSrc = s.lastSnapBuf;
  } else if (s.straddleSnapCarryLen > 0) {
    s.lastSnapLen = s.straddleSnapCarryLen + s.straddleSnapTailEnd;
    if (s.lastSnapBuf === undefined || s.lastSnapLen > s.lastSnapBuf.length)
      s.lastSnapBuf = Buffer.allocUnsafe(s.lastSnapLen);
    s.carryBuf.copy(s.lastSnapBuf, 0, 0, s.straddleSnapCarryLen);
    chunk.copy(s.lastSnapBuf, s.straddleSnapCarryLen, 0, s.straddleSnapTailEnd);
    s.lastSnapSrc = s.lastSnapBuf;
  }
}
//@ chunk-80bdkzt1.js:20357-20542 fingerprint (2.1.88 match: captureCarry, 1)
function captureCarry(s, buf, trailStart) {
  s.carryLen = buf.length - trailStart;
  if (s.carryLen > 0) {
    if (s.carryBuf === undefined || s.carryLen > s.carryBuf.length)
      s.carryBuf = Buffer.allocUnsafe(s.carryLen);
    buf.copy(s.carryBuf, 0, trailStart, buf.length);
  }
}
//@ chunk-80bdkzt1.js:20542-20800 fingerprint (2.1.88 match: finalizeOutput, 1)
function finalizeOutput(s) {
  if (s.carryLen > 0) {
    let cb = s.carryBuf;
    if (hasPrefix_2(cb, ATTRIBUTION_SNAPSHOT_PREFIX, 0, s.carryLen)) {
      s.lastSnapSrc = cb;
      s.lastSnapLen = s.carryLen;
    } else sinkWrite(s.out, cb, 0, s.carryLen);
  }
  if (s.lastSnapSrc) {
    if (s.out.len > 0 && s.out.buf[s.out.len - 1] !== ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER)
      sinkWrite(s.out, buffer_4, 0, 1);
    sinkWrite(s.out, s.lastSnapSrc, 0, s.lastSnapLen);
  }
}
//@ chunk-80bdkzt1.js:20800-21328 placement
/**
 * 按序分页读取转录记录，累计不超过字节上限，把每页拼接后的字节交给回调；游标不前进时抛错。
 */
async function streamTranscriptRecords(backend, key, maxBytes, onChunk) {
  let bytesRead = 0;
  let fromSeq;
  while (bytesRead < maxBytes) {
    let records = await backend.readRecords(key, {
      order: "forward",
      maxBytes: TRANSCRIPT_READ_CHUNK_SIZE,
      ...(fromSeq !== undefined && {
        fromSeq,
      }),
    });
    if (!records.ok)
      throw Error("transcript record page failed during load", {
        cause: records.error,
      });
    let chunks = [];
    let chunkBytes = 0;
    for (let item of records.value.items) {
      if (bytesRead + chunkBytes + item.data.byteLength > maxBytes) break;
      chunks.push(item.data);
      chunkBytes += item.data.byteLength;
    }
    if (chunkBytes > 0) {
      onChunk(Buffer.concat(chunks, chunkBytes));
      bytesRead += chunkBytes;
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === undefined || chunks.length < records.value.items.length) return;
    if (fromSeq !== undefined && nextSeq <= fromSeq)
      throw Error("transcript record cursor did not advance during load");
    fromSeq = nextSeq;
  }
}
//@ chunk-80bdkzt1.js:21328-23275 placement (2.1.88 match: readTranscriptForLoad, 0.788)
async function readTranscriptForLoad(filePath, maxBytes, target) {
  let boundaryMarker = COMPACT_BOUNDARY_MARKER;
  let CHUNK_SIZE = TRANSCRIPT_READ_CHUNK_SIZE;
  let scanState = {
    out: {
      buf: Buffer.allocUnsafe(Math.min(maxBytes, 8388608)),
      len: 0,
      cap: maxBytes + 1,
    },
    boundaryStartOffset: 0,
    hasPreservedSegment: false,
    lastSnapSrc: null,
    lastSnapLen: 0,
    lastSnapBuf: undefined,
    bufFileOff: 0,
    carryLen: 0,
    carryBuf: undefined,
    straddleSnapCarryLen: 0,
    straddleSnapTailEnd: 0,
  };
  if (target !== undefined && target.hoverRestOn) {
    let { backend, key } = target.source;
    let position = 0;
    let onChunk = (chunk) => {
      let bytesRead = chunk.length;
      position += bytesRead;
      let chunkOff = processStraddle(scanState, chunk, bytesRead);
      let buf;
      if (scanState.carryLen > 0) {
        let bufLen = scanState.carryLen + (bytesRead - chunkOff);
        buf = Buffer.allocUnsafe(bufLen);
        scanState.carryBuf.copy(buf, 0, 0, scanState.carryLen);
        chunk.copy(buf, scanState.carryLen, chunkOff, bytesRead);
      } else buf = chunk.subarray(chunkOff, bytesRead);
      let scan = scanChunkLines(scanState, buf, boundaryMarker);
      captureSnap(scanState, buf, chunk, scan.lastSnapStart, scan.lastSnapEnd);
      captureCarry(scanState, buf, scan.trailStart);
      scanState.bufFileOff += scan.trailStart;
    };
    while (position < maxBytes) {
      let read = await backend.read([
        {
          key,
          offset: position,
          length: Math.min(CHUNK_SIZE, maxBytes - position),
        },
      ]);
      if (!read.ok) {
        if (position === 0 && isByteViewUnsupportedError(read.error)) {
          await streamTranscriptRecords(backend, key, maxBytes, onChunk);
          break;
        }
        throw Error("transcript ranged read failed", {
          cause: read.error,
        });
      }
      let [item] = read.value.items;
      if (!item.found) throw Error("transcript stream absent during load");
      if (item.value.length === 0) break;
      onChunk(Buffer.from(item.value.buffer, item.value.byteOffset, item.value.length));
    }
    finalizeOutput(scanState);
    return {
      boundaryStartOffset: scanState.boundaryStartOffset,
      postBoundaryBuf: scanState.out.buf.subarray(0, scanState.out.len),
      hasPreservedSegment: scanState.hasPreservedSegment,
    };
  }
  if (typeof filePath !== "string")
    throw Error(
      "readTranscriptForLoad: this transcript has a storage key and no file, so it can be read only through a storage backend. The caller passed none, or tengu_hover_rest is off.",
    );
  let chunk = Buffer.allocUnsafe(CHUNK_SIZE);
  let fd = await open(filePath, "r");
  try {
    let filePos = 0;
    while (filePos < maxBytes) {
      let { bytesRead } = await fd.read(chunk, 0, Math.min(CHUNK_SIZE, maxBytes - filePos), filePos);
      if (bytesRead === 0) break;
      filePos += bytesRead;
      let chunkOff = processStraddle(scanState, chunk, bytesRead);
      let buf;
      if (scanState.carryLen > 0) {
        let bufLen = scanState.carryLen + (bytesRead - chunkOff);
        buf = Buffer.allocUnsafe(bufLen);
        scanState.carryBuf.copy(buf, 0, 0, scanState.carryLen);
        chunk.copy(buf, scanState.carryLen, chunkOff, bytesRead);
      } else buf = chunk.subarray(chunkOff, bytesRead);
      let scan = scanChunkLines(scanState, buf, boundaryMarker);
      captureSnap(scanState, buf, chunk, scan.lastSnapStart, scan.lastSnapEnd);
      captureCarry(scanState, buf, scan.trailStart);
      scanState.bufFileOff += scan.trailStart;
    }
    finalizeOutput(scanState);
  } finally {
    await fd.close();
  }
  return {
    boundaryStartOffset: scanState.boundaryStartOffset,
    postBoundaryBuf: scanState.out.buf.subarray(0, scanState.out.len),
    hasPreservedSegment: scanState.hasPreservedSegment,
  };
}
//@ chunk-80bdkzt1.js:23275-23322 placement
var BACKUP_FILE_NAME_PATTERN_WITH_LEGACY = /^[0-9a-f]{16}(?:[0-9a-f]{48})?@v\d+$/;
//@ chunk-80bdkzt1.js:23322-23358 placement
function isUuidShaped(value) {
  return validateUuid(value) !== null;
}
//@ chunk-80bdkzt1.js:23358-23496 placement
function buildHistorySuppressionEntry(sessionId, cause, vetoed) {
  return {
    type: "history-suppression",
    sessionId,
    cause,
    ...(vetoed && {
      vetoedAgainstAccountUuid: vetoed,
    }),
    ts: new Date().toISOString(),
  };
}
//@ chunk-5xgkngpb.js:289119-289236 fingerprint (2.1.88 match: hasPrefix, 1)
function hasPrefix(src, start = 0, end = src.length) {
  let offset = skipNuls(src, start, end);
  return (
    end - offset >= buffer_5.length &&
    src.compare(buffer_5, 0, buffer_5.length, offset, offset + buffer_5.length) === 0
  );
}
//@ chunk-5xgkngpb.js:1551465-1551633 fingerprint (2.1.88 match: sanitizePath, 0.358)
function sanitizePath_3(name) {
  let type = contentBlockTypeBucket(name);
  let text = stripCacheControl_2_2(name);
  let hash = "text" in name ? name.text : undefined;
  return {
    type,
    hash: saltedHash(summarizeLongText(text, name)),
    length: text.length,
    prefixClass: type === "text" && typeof hash === "string" ? classifyUserText(hash) : type,
  };
}
//@ chunk-jndyh8cy.js:15215-15231 affinity
var MAX_PORTABLE_TRANSCRIPT_BYTES = 67108864;
//@ chunk-jndyh8cy.js:15231-15289 fingerprint (2.1.88 match: resolveSessionFilePath, 0.396)
function resolveSessionFilePath_2(log) {
  return log.fileSize !== undefined && log.fileSize <= MAX_PORTABLE_TRANSCRIPT_BYTES;
}
export {
  getPinnedProjectDir,
  getProjectDir,
  getProjectsDir,
  sanitizePath_3,
  getProjectKey,
  readSessionLite,
  LITE_READ_BUF_SIZE,
  PROGRAMMATIC_ENTRYPOINTS,
  extractLastJsonStringField,
  extractFieldFromLastEntryOfTypeStrict,
  buildHistorySuppressionEntry,
  canonicalizePath,
  transcriptMessagesStateV5,
  writeEntriesToJsonlFile,
  appendEntriesToJsonlFile,
  findProjectDir,
  hasPrefix,
  isUuidShaped,
  SKIP_PRECOMPACT_THRESHOLD,
  legacyDerivedProjectKey,
  MAX_SANITIZED_LENGTH,
  MAX_LISTING_PAGES,
  dirBelongsToProject,
  findProjectDirs,
  listedProjectKey,
  sanitizePath,
  normalizePathForCwdCompare,
  recordedCwdIsWithinOwnWorktrees,
  slugCollisionGuardFoldsCase,
  recordedCwdCollidesWithProjectResolved,
  readHeadAndTail,
  extractJsonStringField,
  extractFieldFromFirstEntryStrict,
  resolveSessionFilePath_2,
  readTranscriptForLoad,
  findSoleTranscriptWithMessagesById,
  isTranscriptFileResumeArg,
  anchorOffsetTail,
  extractFieldFromLastEntryStrict,
  TRANSCRIPT_READ_CHUNK_SIZE,
  COMPACT_BOUNDARY_MARKER,
  BACKUP_FILE_NAME_PATTERN_WITH_LEGACY,
  resolveJobTranscript,
  validateUuid,
  resolveSessionFilePath,
  quarantineJobTranscript,
  addressableProjectKey,
  attachmentPromptLabelFromHead,
  extractFirstPromptFromEntries,
  extractFirstPromptFromHead,
  isHiddenFromSessionPicker,
  listProjectDirNamesV5,
  projectDirsFromListedNames,
  projectPathSpellingsForRead,
  withSharedTranscriptListing,
  workspaceV5Of,
};
