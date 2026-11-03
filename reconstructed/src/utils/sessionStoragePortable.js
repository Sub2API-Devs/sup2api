/**
 * utils/sessionStoragePortable.ts
 *
 * 会话文件的可移植读取工具（头尾读取、字节级字段扫描、压缩边界标记）；本段混有终端按键与 git 配置常量（疑似错归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionStoragePortable.ts
 * pieces: chunk-dz3q485w.js (2), chunk-e6aww6q8.js (1), chunk-f9pzpnqt.js (86), chunk-g54kbxqw.js (1)
 * attribution: affinity 1, fingerprint 11, placement 77, layout 1
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
import { getClaudeConfigDir, getProjectDirNameOverride } from "./envUtils.js";
import { isDiskless } from "../bootstrap/state.js";
import { getWorktreePathsPortable } from "./getWorktreePathsPortable.js";
import { isByteViewUnsupportedError } from "./storage/storageErrors.js";
import { skipNuls, buffer_5 } from "./transcript/entryTypes.js";
import {
  contentBlockTypeBucket,
  stripCacheControl_2,
  saltedHash,
  summarizeLongText,
  classifyUserText,
} from "../services/api/promptCacheBreakParts.js";

//@ chunk-f9pzpnqt.js:1310-1366 placement
var LITE_READ_BUF_SIZE = 65536;
var PROGRAMMATIC_ENTRYPOINTS = new Set(["sdk-cli", "sdk-ts", "sdk-py"]);
//@ chunk-f9pzpnqt.js:1366-1581 placement
function isHiddenFromSessionPicker(e, n) {
  let t = extractJsonStringField(e, "entrypoint") ?? extractLastJsonStringField(n, "entrypoint");
  if (t && PROGRAMMATIC_ENTRYPOINTS.has(t)) return true;
  let r =
    e
      .split(
        `
`,
      )
      .find((line) => line.includes('"parentUuid":')) ?? e;
  let jsonStringField = extractJsonStringField(r, "sessionKind");
  return jsonStringField === "daemon" || jsonStringField === "daemon-worker";
}
//@ chunk-f9pzpnqt.js:1581-1654 placement
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//@ chunk-f9pzpnqt.js:1654-1729 placement
function validateUuid(maybeUuid) {
  if (typeof maybeUuid !== "string") return null;
  return UUID_RE.test(maybeUuid) ? maybeUuid : null;
}
//@ chunk-f9pzpnqt.js:1729-1821 placement
function unescapeJsonString(raw) {
  if (!raw.includes("\\")) return raw;
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}
//@ chunk-f9pzpnqt.js:1821-2039 placement = extractJsonStringFieldPrefix (1)
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
//@ chunk-f9pzpnqt.js:2039-2301 placement = extractJsonStringFieldPrefix (1)
function extractLastJsonStringField(text, key) {
  let patterns = [`"${key}":"`, `"${key}": "`];
  let r;
  let i = -1;
  for (let pattern of patterns) {
    let a = 0;
    while (true) {
      let index = text.indexOf(pattern, a);
      if (index < 0) break;
      let valueStart = index + pattern.length;
      let i_2 = valueStart;
      while (i_2 < text.length) {
        if (text[i_2] === "\\") {
          i_2 += 2;
          continue;
        }
        if (text[i_2] === '"') {
          if (index > i) {
            r = unescapeJsonString(text.slice(valueStart, i_2));
            i = index;
          }
          break;
        }
        i_2++;
      }
      a = i_2 + 1;
    }
  }
  return r;
}
//@ chunk-f9pzpnqt.js:2301-2337 placement
function extractFieldFromLastEntryOfTypeStrict(tail, n, t) {
  return findLastJsonStringField(tail, t, n);
}
//@ chunk-f9pzpnqt.js:2337-2680 placement
function findLastJsonStringField(e, n, t) {
  let r = t === undefined ? undefined : `"type":"${t}"`;
  let i = `"${n}":`;
  let o = e.length;
  while (o > 0) {
    let index = e.lastIndexOf(
      `
`,
      o - 1,
    );
    let sliced = e.slice(index + 1, o);
    o = index;
    if (sliced.includes(i) && (r === undefined || sliced.includes(r)))
      try {
        let parsed = JSON.parse(sliced);
        if (typeof parsed === "object" && parsed !== null && (t === undefined || parsed.type === t)) {
          let c = parsed[n];
          if (typeof c === "string") return c;
        }
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-f9pzpnqt.js:2680-2942 placement
function extractFieldFromFirstEntryStrict(head, n) {
  let t = `"${n}":`;
  let r = 0;
  while (r < head.length) {
    let index = head.indexOf(
      `
`,
      r,
    );
    let o = index < 0 ? head.slice(r) : head.slice(r, index);
    r = index < 0 ? head.length : index + 1;
    if (o.includes(t))
      try {
        let parsed = JSON.parse(o);
        if (typeof parsed === "object" && parsed !== null) {
          let u = parsed[n];
          if (typeof u === "string") return u;
        }
      } catch {}
  }
  return;
}
//@ chunk-f9pzpnqt.js:2942-2974 placement
function extractFieldFromLastEntryStrict(e, n) {
  return findLastJsonStringField(e, n);
}
//@ chunk-f9pzpnqt.js:2974-3081 placement
function workspaceV5Of(e, hoverRestOn) {
  return e?.realWorkspacePath === undefined
    ? undefined
    : {
        hoverRestOn,
        realPath: e.realWorkspacePath,
      };
}
//@ chunk-f9pzpnqt.js:3081-3127 placement
async function writeEntriesToJsonlFile(e, n, hydratedTranscriptTarget) {
  return writeJsonlRecords(e, n, "w", hydratedTranscriptTarget);
}
//@ chunk-f9pzpnqt.js:3127-3173 placement
async function appendEntriesToJsonlFile(transcriptPathForSession, n, hydratedTranscriptTarget) {
  return writeJsonlRecords(transcriptPathForSession, n, "a", hydratedTranscriptTarget);
}
//@ chunk-f9pzpnqt.js:3173-3437 placement
async function writeJsonlRecords(e, n, t, r) {
  if (r !== undefined && r.hoverRestOn && (t === "w" || n.length > 0))
    return writeRecordsToBackend(r.source, n, t);
  let writeStream = createWriteStream(e, {
    mode: 384,
    flags: t,
  });
  try {
    for (let o of n)
      if (
        !writeStream.write(
          JSON.stringify(o) +
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
//@ chunk-f9pzpnqt.js:3437-3793 placement
/**
 * 通过 v5 存储后端写转录记录：w 模式原地替换全部记录，否则追加；失败抛出带原因的错误。
 */
async function writeRecordsToBackend(source, n, t) {
  let { backend, key } = source;
  let mapped = n.map((u) => ({
    data:
      JSON.stringify(u) +
      `
`,
  }));
  if (t === "w") {
    let u = await backend.replaceRecords(key, mapped, {
      publishDiscipline: "inPlace",
      mode: 384,
    });
    if (!u.ok)
      throw Error("transcript stream replace failed", {
        cause: u.error,
      });
    return;
  }
  let a = await backend.append(key, mapped);
  if (!a.ok)
    throw Error("transcript stream append failed", {
      cause: a.error,
    });
}
//@ chunk-f9pzpnqt.js:3793-4316 placement = extractFirstPromptFromHead (0.914)
function extractFirstPromptFromHead(head, n = "stored") {
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
      let u = renderPluginPrompt(entry, commandFallback, n);
      if (u !== undefined) return u;
    } catch {
      continue;
    }
  }
  return commandFallback.commandFallback;
}
//@ chunk-f9pzpnqt.js:4316-4786 placement
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
//@ chunk-f9pzpnqt.js:4786-4963 placement
function extractFirstPromptFromEntries(e, n = "stored") {
  let t = {
    commandFallback: "",
  };
  for (let r of e) {
    if (typeof r !== "object" || r === null) continue;
    let i = renderPluginPrompt(r, t, n);
    if (i !== undefined) return i;
  }
  return t.commandFallback;
}
//@ chunk-f9pzpnqt.js:4963-5006 placement
var READ_NOFOLLOW_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
//@ chunk-f9pzpnqt.js:5006-5517 placement
async function readHeadAndTail(e, fileSize, buf, r) {
  if (r !== undefined && r.hoverRestOn) return readHeadAndTail_2(r.source);
  try {
    if (READ_NOFOLLOW_FLAGS === constants.O_RDONLY) {
      if (!(await lstat(e)).isFile())
        return {
          head: "",
          tail: "",
        };
    }
    let i = await open(e, READ_NOFOLLOW_FLAGS);
    try {
      if (!(await i.stat()).isFile())
        return {
          head: "",
          tail: "",
        };
      let headResult = await i.read(buf, 0, LITE_READ_BUF_SIZE, 0);
      if (headResult.bytesRead === 0)
        return {
          head: "",
          tail: "",
        };
      let head = buf.toString("utf8", 0, headResult.bytesRead);
      let tailOffset = Math.max(0, fileSize - LITE_READ_BUF_SIZE);
      let tail = head;
      if (tailOffset > 0) {
        let tailResult = await i.read(buf, 0, LITE_READ_BUF_SIZE, tailOffset);
        tail = buf.toString("utf8", 0, tailResult.bytesRead);
      }
      return {
        head,
        tail,
      };
    } finally {
      await i.close();
    }
  } catch {
    return {
      head: "",
      tail: "",
    };
  }
}
//@ chunk-f9pzpnqt.js:5517-5615 placement = readHeadAndTail (0.802)
async function readHeadAndTail_2(source) {
  let headTailV5 = await readHeadTailV5(source);
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
//@ chunk-f9pzpnqt.js:5615-5680 placement
function anchorOffsetTail(tail) {
  let index = tail.indexOf(`
`);
  return index >= 0 ? tail.slice(index + 1) : "";
}
//@ chunk-f9pzpnqt.js:5680-6021 placement
/**
 * 从 v5 存储后端一次读取转录的头部与尾部缓冲，返回 {head, tail, mtimeMs, totalBytes}；不存在或失败返回 null。
 */
async function readHeadTailV5(e) {
  let { backend, key } = e;
  try {
    let r = await backend.read([
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
    if (!r.ok) return null;
    let [i, o] = r.value.items;
    if (!i.found || i.value.length === 0) return null;
    let a = bufferToString(i.value);
    let tail = o.found && o.value.length > 0 ? bufferToString(o.value) : a;
    return {
      head: a,
      tail,
      mtimeMs: i.mtimeMs,
      totalBytes: i.totalBytes,
    };
  } catch {
    return null;
  }
}
//@ chunk-f9pzpnqt.js:6021-6107 placement
function bufferToString(e) {
  return Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8");
}
//@ chunk-f9pzpnqt.js:6107-6158 placement
async function _(filePath, n) {
  return (await getTranscriptMessagesState(filePath, n)) !== "none";
}
//@ chunk-f9pzpnqt.js:6158-6602 placement
/**
 * 判断转录文件是否含 user/assistant 消息：逐行扫描，返回 has / none / unknown（v5 存储时交给后端判断）。
 */
async function getTranscriptMessagesState(e, n) {
  if (n !== undefined && n.hoverRestOn) return transcriptMessagesStateV5(n.source);
  try {
    if (!(await lstat(e)).isFile()) return "none";
  } catch (error) {
    return isEnoentError(error) ? "none" : "unknown";
  }
  let t;
  try {
    t = await open(e, "r");
  } catch (error) {
    return isEnoentError(error) ? "none" : "unknown";
  }
  try {
    let r = createInterface({
      input: t.createReadStream(),
    });
    for await (let i of r)
      if (i.includes('"type":"user"') || i.includes('"type":"assistant"')) {
        r.close();
        return "has";
      }
    return "none";
  } catch {
    return "unknown";
  } finally {
    await t.close().catch(() => {});
  }
}
//@ chunk-f9pzpnqt.js:6602-6695 placement
var TRANSCRIPT_TAIL_READ_BYTES = 65536;
var TRANSCRIPT_FULL_READ_BYTES = 4194304;
var buffer = Buffer.from('"type":"user"');
var buffer_2 = Buffer.from('"type":"assistant"');
//@ chunk-f9pzpnqt.js:6695-6748 placement
function hasConversationMarker(e) {
  return e.includes(buffer) || e.includes(buffer_2);
}
//@ chunk-f9pzpnqt.js:6748-6760 placement
var MAX_LISTING_PAGES = 1e4;
//@ chunk-f9pzpnqt.js:6760-6946 placement
function listedProjectKey(e, n) {
  if (
    e.kind !== "scope" ||
    e.scope.namespace !== "transcript" ||
    e.scope.projectKey === undefined ||
    e.scope.sessionId !== undefined ||
    !n(e.scope.projectKey)
  )
    return;
  return e.scope.projectKey;
}
//@ chunk-f9pzpnqt.js:6946-7686 placement
async function transcriptMessagesStateV5(e, n = hasConversationMarker) {
  let { backend, key } = e;
  let i;
  let o = false;
  let a = 0;
  let u = 0;
  try {
    for (;;) {
      if (++u > MAX_LISTING_PAGES) return "unknown";
      let records = await backend.readRecords(key, {
        order: "forward",
        maxBytes: i === undefined ? TRANSCRIPT_TAIL_READ_BYTES : TRANSCRIPT_FULL_READ_BYTES,
        ...(i !== undefined && {
          fromSeq: i,
        }),
      });
      if (!records.ok) return records.error.code === "NotFound" ? "none" : "unknown";
      a += records.value.items.length;
      for (let item of records.value.items) {
        let buffer = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength);
        if (n(buffer)) return "has";
        if (item.truncated === true) o = true;
      }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === undefined) {
        if (o) return "unknown";
        if (records.value.items.length === 0 && i !== undefined) return "unknown";
        let p = await backend.statStream(key);
        if (!p.ok) return p.error.code === "NotFound" ? "none" : "unknown";
        return p.value.recordCount > a ? "unknown" : "none";
      }
      if (i !== undefined && nextSeq <= i) return "unknown";
      i = nextSeq;
    }
  } catch {
    return "unknown";
  }
}
//@ chunk-f9pzpnqt.js:7686-8156 placement
async function quarantineJobTranscript(path, n) {
  let t = `orphaned-${Date.now()}-${randomUUID().slice(0, 8)}`;
  let source = n !== undefined && n.hoverRestOn ? n.source : undefined;
  let i =
    source !== undefined && path.endsWith(".jsonl")
      ? transcriptStoreKey(path, basename(path, ".jsonl"), source)
      : undefined;
  if (i !== undefined && source !== undefined) {
    let { key } = i;
    if (key.namespace !== "transcript") return false;
    try {
      return (await i.backend.move(key, source.transcriptKey(key.projectKey, `${key.sessionId}.${t}`))).ok;
    } catch {
      return false;
    }
  }
  let o = `${path.endsWith(".jsonl") ? path.slice(0, -6) : path}.${t}.jsonl`;
  try {
    await rename(path, o);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-f9pzpnqt.js:8156-8207 placement = getErrorsPath (1)
function isTranscriptFileResumeArg(e) {
  return isAbsolute(e) && e.endsWith(".jsonl");
}
//@ chunk-f9pzpnqt.js:8207-9391 placement
/**
 * 为恢复会话定位 transcript 文件：依次查链接路径、项目目录、计算路径，必要时跨 worktree 与全项目扫描，返回 {path, via, hasMessages, unverifiable?}。与 bridge 无关（会话存储）。
 */
async function resolveJobTranscript(sessionId, cwd, linkScanPath, r, i) {
  let o = await canonicalizePath(cwd, workspaceV5Of(i?.source, i?.hoverRestOn === true));
  if (validateUuid(sessionId) === null)
    return {
      path: join(getProjectDir(o), "invalid-resume-id.jsonl"),
      hasMessages: false,
      via: "computed",
    };
  let path = join(getProjectDir(o), `${sessionId}.jsonl`);
  let u = [];
  if (linkScanPath !== undefined)
    u.push(
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
  let s =
    i !== undefined && i.hoverRestOn
      ? {
          ...i,
          source: withSharedTranscriptListing(i.source),
        }
      : undefined;
  for (let f of await findProjectDirs(o, s))
    u.push({
      path: join(f, `${sessionId}.jsonl`),
      via: "projectDir",
    });
  u.push({
    path,
    via: "computed",
  });
  let c = new Set();
  let p = (filePath) => transcriptHasMessages(filePath, sessionId, s);
  let l;
  for (let f of u) {
    if (c.has(f.path)) continue;
    c.add(f.path);
    let d = await p(f.path);
    if (d === "has")
      return {
        ...f,
        hasMessages: true,
      };
    if (d === "unverifiable" && l === undefined) l = f;
  }
  if (r?.crossWorktree !== false)
    for (let { projectDir } of await findWorktreeProjectDirs(o, s)) {
      let d = join(projectDir, `${sessionId}.jsonl`);
      if (s !== undefined) {
        if (c.has(d)) continue;
        c.add(d);
      }
      let m = await p(d);
      if (m === "has")
        return {
          path: d,
          via: "worktreeProjectDir",
          hasMessages: true,
        };
      if (m === "unverifiable" && l === undefined)
        l = {
          path: d,
          via: "worktreeProjectDir",
        };
    }
  if (r?.crossWorktree !== false) {
    let soleTranscriptWithMessagesById = await findSoleTranscriptWithMessagesById(sessionId, c, s);
    if (soleTranscriptWithMessagesById !== null)
      return {
        path: soleTranscriptWithMessagesById,
        via: "projectsScan",
        hasMessages: true,
      };
  }
  if (l !== undefined)
    return {
      ...l,
      hasMessages: true,
      unverifiable: true,
    };
  return {
    ...u[0],
    hasMessages: false,
  };
}
//@ chunk-f9pzpnqt.js:9391-9553 placement
function transcriptStoreKey(e, n, source) {
  let r = addressableProjectKey(dirname(e), source.isKeySegment);
  if (r === undefined || basename(e) !== `${n}.jsonl` || !source.isKeySegment(n)) return;
  return {
    backend: source.backend,
    key: source.transcriptKey(r, n),
  };
}
//@ chunk-f9pzpnqt.js:9553-9869 placement
async function transcriptHasMessages(filePath, sessionId, t) {
  let r = t !== undefined && t.hoverRestOn ? transcriptStoreKey(filePath, sessionId, t.source) : undefined;
  if (r === undefined) return (await _(filePath)) ? "has" : "none";
  let i = await transcriptMessagesStateV5(r);
  if (i === "has") return "has";
  try {
    if (!(await lstat(filePath)).isFile()) return "none";
  } catch (error) {
    if (!isEnoentError(error)) return "has";
    return i === "unknown" ? "unverifiable" : "none";
  }
  return (await _(filePath)) ? "has" : "none";
}
//@ chunk-f9pzpnqt.js:9869-9951 placement = isConnectionError (1)
function isEnoentError(err) {
  return err !== null && typeof err === "object" && "code" in err && err.code === "ENOENT";
}
//@ chunk-f9pzpnqt.js:9951-10033 placement
function cursorOptions(e) {
  return {
    skipScopeStats: true,
    skipKeyStats: true,
    ...(e !== undefined && {
      cursor: e,
    }),
  };
}
//@ chunk-f9pzpnqt.js:10033-10594 placement
function withSharedTranscriptListing(e) {
  let n = new Map();
  let backend = new Proxy(e.backend, {
    get(r, i, o) {
      let a = Reflect.get(r, i, o);
      if (i !== "listEntries") return typeof a === "function" ? a.bind(r) : a;
      return (s, c) => {
        if (!(
          s.namespace === "transcript" &&
          !("projectKey" in s) &&
          Object.keys(c ?? {}).every(
            (key) => key === "cursor" || key === "skipScopeStats" || key === "skipKeyStats",
          )
        ))
          return r.listEntries(s, c);
        let joined = [c?.cursor ?? "", c?.skipScopeStats, c?.skipKeyStats].map(String).join("\x00");
        let f = n.get(joined);
        if (f === undefined) {
          f = r.listEntries(s, c);
          n.set(joined, f);
          let d = () => {
            n.delete(joined);
          };
          f.then((m) => {
            if (!m.ok) d();
          }, d);
        }
        return f;
      };
    },
  });
  return {
    ...e,
    backend,
  };
}
//@ chunk-f9pzpnqt.js:10594-10969 placement
async function findSoleTranscriptWithMessagesById(sessionId, excluded = new Set(), t) {
  if (validateUuid(sessionId) === null) return null;
  if (t !== undefined && t.hoverRestOn && t.source.isKeySegment(sessionId))
    return findTranscriptInOtherProjects(sessionId, excluded, t.source);
  let projectsDir = getProjectsDir();
  let i = null;
  try {
    for (let o of await readdir(projectsDir, {
      withFileTypes: true,
    })) {
      if (!o.isDirectory()) continue;
      let a = join(projectsDir, o.name, `${sessionId}.jsonl`);
      if (excluded.has(a)) continue;
      if ((await getTranscriptMessagesState(a)) !== "has") continue;
      if (i !== null) return null;
      i = a;
    }
  } catch {
    return null;
  }
  return i;
}
//@ chunk-f9pzpnqt.js:10969-11512 placement
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
      (l) =>
        backend.listEntries(
          {
            namespace: "transcript",
          },
          cursorOptions(l),
        ),
      async (l) => {
        for (let f of l) {
          let projectKey = listedProjectKey(f, isKeySegment);
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
//@ chunk-f9pzpnqt.js:11512-12042 placement = readSessionLite (0.859)
async function readSessionLite(filePath, n) {
  if (n !== undefined && n.hoverRestOn) return statWithHeadTail(n.source);
  try {
    if (READ_NOFOLLOW_FLAGS === constants.O_RDONLY) {
      if (!(await lstat(filePath)).isFile()) return null;
    }
    let t = await open(filePath, READ_NOFOLLOW_FLAGS);
    try {
      let stat = await t.stat();
      if (!stat.isFile()) return null;
      let buf = Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
      let headResult = await t.read(buf, 0, LITE_READ_BUF_SIZE, 0);
      if (headResult.bytesRead === 0) return null;
      let head = buf.toString("utf8", 0, headResult.bytesRead);
      let tailOffset = Math.max(0, stat.size - LITE_READ_BUF_SIZE);
      let tail = head;
      if (tailOffset > 0) {
        let tailResult = await t.read(buf, 0, LITE_READ_BUF_SIZE, tailOffset);
        tail = buf.toString("utf8", 0, tailResult.bytesRead);
      }
      return {
        mtime: stat.mtime.getTime(),
        size: stat.size,
        head,
        tail,
      };
    } finally {
      await t.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-f9pzpnqt.js:12042-12181 placement
async function statWithHeadTail(source) {
  let headTailV5 = await readHeadTailV5(source);
  if (headTailV5 === null) return null;
  return {
    mtime: Math.trunc(headTailV5.mtimeMs),
    size: headTailV5.totalBytes,
    head: headTailV5.head,
    tail: headTailV5.tail,
  };
}
//@ chunk-f9pzpnqt.js:12181-12193 placement
var MAX_SANITIZED_LENGTH = 200;
//@ chunk-f9pzpnqt.js:12193-12245 placement
function hashPathForSuffix(str) {
  return Math.abs(hashString31(str)).toString(36);
}
//@ chunk-f9pzpnqt.js:12245-12297 placement
function sanitizePath_2(e) {
  return e.replace(/[^a-zA-Z0-9]/g, "-");
}
//@ chunk-f9pzpnqt.js:12297-12384 placement
/**
 * 把路径清洗成目录名：非字母数字替换为 '-'，超 200 字符时保留前 200 字符并追加 '-<hash36>'。
 */
function sanitizePath(e) {
  let n = sanitizePath_2(e);
  if (n.length <= MAX_SANITIZED_LENGTH) return n;
  return `${n.slice(0, MAX_SANITIZED_LENGTH)}-${hashPathForSuffix(e)}`;
}
//@ chunk-f9pzpnqt.js:12384-12458 placement
function normalizePathForCwdCompare(e, n) {
  let replaced = e.replaceAll("\\", "/");
  return n ? replaced.toLowerCase() : replaced;
}
//@ chunk-f9pzpnqt.js:12458-12580 placement
function isSanitizedNameCollision(e, n, t) {
  let r = identity(e);
  let i = identity(n);
  let o = (a) => (t ? a.toLowerCase() : a);
  if (o(sanitizePath_2(r)) !== o(sanitizePath_2(i))) return false;
  return normalizePathForCwdCompare(r, t) !== normalizePathForCwdCompare(i, t);
}
//@ chunk-f9pzpnqt.js:12580-12884 placement
async function recordedCwdCollidesWithProjectResolved(
  e,
  n,
  t,
  hasUntouchableRecordSpellingAsync,
  realPathOptions,
) {
  if (!isSanitizedNameCollision(e, n, t)) return false;
  if (isNetworkishPath(e) || isNetworkishPath(n)) return false;
  if ((await hasUntouchableRecordSpellingAsync(e)) || (await hasUntouchableRecordSpellingAsync(n)))
    return false;
  let o;
  try {
    if (realPathOptions !== undefined && realPathOptions.hoverRestOn) {
      let u = await realPathOptions.realPath(e);
      if (!u.ok || !u.value.found) return false;
      o = identity(u.value.path);
    } else o = identity(await realpath(e));
  } catch {
    return false;
  }
  let a = await canonicalizePath(n, realPathOptions);
  return isSanitizedNameCollision(o, a, t);
}
//@ chunk-f9pzpnqt.js:12884-13039 placement
function recordedCwdIsWithinOwnWorktrees(e, n, t) {
  if (n === undefined) return false;
  let r = normalizePathForCwdCompare(identity(e), t);
  return n.some((i) => {
    let o = normalizePathForCwdCompare(identity(i), t);
    return r === o || r.startsWith(o.endsWith("/") ? o : o + "/");
  });
}
//@ chunk-f9pzpnqt.js:13039-13063 placement
function slugCollisionGuardFoldsCase() {
  return false;
}
//@ chunk-f9pzpnqt.js:13063-13103 placement = getProjectsDir (1)
/**
 * <配置目录>/projects：所有会话转录的根目录。
 */
function getProjectsDir() {
  return join(getClaudeConfigDir(), "projects");
}
//@ chunk-f9pzpnqt.js:13103-13138 placement
/**
 * 项目目录名：自定义配置目录或 diskless 时可由 CLAUDE_CODE_PROJECT_DIR_NAME 覆盖，否则清洗 cwd。
 */
function getProjectKey(e) {
  return getProjectDirNameOverride() ?? sanitizePath(e);
}
//@ chunk-f9pzpnqt.js:13138-13192 placement
function legacyDerivedProjectKey(e) {
  let n = sanitizePath(e);
  return n === getProjectKey(e) ? undefined : n;
}
//@ chunk-f9pzpnqt.js:13192-13232 placement
function getProjectDir(e, n = getProjectsDir()) {
  return join(n, getProjectKey(e));
}
//@ chunk-f9pzpnqt.js:13232-13292 placement
function getPinnedProjectDir() {
  let projectDirNameOverride = getProjectDirNameOverride();
  return projectDirNameOverride === undefined ? null : join(getProjectsDir(), projectDirNameOverride);
}
//@ chunk-f9pzpnqt.js:13292-13355 placement
function addressableProjectKey(e, isKeySegment) {
  let t = basename(e);
  return dirname(e) === getProjectsDir() && isKeySegment(t) ? t : undefined;
}
//@ chunk-f9pzpnqt.js:13355-13526 placement
async function canonicalizePath(e, realPathOptions) {
  try {
    if (realPathOptions !== undefined && realPathOptions.hoverRestOn) {
      let t = await realPathOptions.realPath(e);
      return identity(t.ok && t.value.found ? t.value.path : e);
    }
    return identity(await realpath(e));
  } catch {
    return identity(e);
  }
}
//@ chunk-f9pzpnqt.js:13526-13554 placement
function projectPathSpellingsForRead(e, n) {
  return [n];
}
//@ chunk-f9pzpnqt.js:13554-13975 placement
async function dirBelongsToProject(e, cwd, caseInsensitive, r) {
  let source = r !== undefined && r.hoverRestOn ? r.source : undefined;
  let projectKey = source === undefined ? undefined : addressableProjectKey(e, source.isKeySegment);
  if (source !== undefined && projectKey !== undefined) {
    let s = await hasSessionForCwd(projectKey, cwd, caseInsensitive, source);
    if (s !== undefined) return s;
  }
  if (isDiskless()) return false;
  let a = sanitizePath_2(cwd);
  let u;
  try {
    u = await readdir(e, {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  for (let s of u) {
    if (!s.isFile() || !s.name.endsWith(".jsonl")) continue;
    let sessionLite = await readSessionLite(join(e, s.name));
    if (sessionLite === null) continue;
    if (matchesSessionCwd(sessionLite, a, caseInsensitive)) return true;
  }
  return false;
}
//@ chunk-f9pzpnqt.js:13975-14145 placement
function matchesSessionCwd(e, n, t) {
  let r =
    extractFieldFromLastEntryOfTypeStrict(e.tail, "relocated", "relocatedCwd") ??
    extractFieldFromFirstEntryStrict(e.head, "cwd");
  if (r === undefined) return false;
  let i = sanitizePath_2(identity(r));
  return t ? i.toLowerCase() === n.toLowerCase() : i === n;
}
//@ chunk-f9pzpnqt.js:14145-14695 placement
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
      (l) =>
        backend.listEntries(
          {
            namespace: "transcript",
            projectKey,
          },
          cursorOptions(l),
        ),
      async (l) => {
        for (let f of l) {
          if (
            f.kind !== "key" ||
            f.key.namespace !== "transcript" ||
            f.key.projectKey !== projectKey ||
            f.key.agentId !== undefined ||
            !isKeySegment(f.key.sessionId) ||
            seen.has(f.key.sessionId)
          )
            continue;
          let sessionId = f.key.sessionId;
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
//@ chunk-f9pzpnqt.js:14695-15202 placement
async function findProjectDirs(e, n, t = getProjectsDir()) {
  if (n !== undefined && n.hoverRestOn) return listProjectDirsForCwd(e, n);
  if (isDiskless()) return [];
  let projectDir = getProjectDir(e, t);
  let i = [];
  try {
    await readdir(projectDir);
    i.push(projectDir);
  } catch {}
  let exact = legacyDerivedProjectKey(e);
  if (exact !== undefined) {
    let l = join(t, exact);
    try {
      await readdir(l);
      i.push(l);
    } catch {}
    return i;
  }
  let sanitized = sanitizePath(e);
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return i;
  let u = false;
  let s = (l) => (u ? l.toLowerCase() : l);
  let prefix = s(sanitized.slice(0, MAX_SANITIZED_LENGTH) + "-");
  let p = s(projectDir);
  try {
    for (let l of await readdir(t, {
      withFileTypes: true,
    })) {
      if (!l.isDirectory() || !s(l.name).startsWith(prefix)) continue;
      let f = join(t, l.name);
      if (s(f) !== p && (await dirBelongsToProject(f, e, u))) i.push(f);
    }
  } catch {}
  return i;
}
//@ chunk-f9pzpnqt.js:15202-15341 placement
async function listProjectDirsForCwd(e, n) {
  let t = await listProjectDirNamesV5(n.source);
  if (t === null) {
    let r = legacyDerivedProjectKey(e);
    return [getProjectDir(e), ...(r !== undefined ? [join(getProjectsDir(), r)] : [])];
  }
  return projectDirsFromListedNames(e, t, false, n);
}
//@ chunk-f9pzpnqt.js:15341-15641 placement
async function listProjectDirNamesV5(source) {
  let { backend, isKeySegment } = source;
  let r = [];
  let i = new Set();
  let o = 0;
  try {
    if (
      (
        await readAllPages(
          (u) =>
            backend.listEntries(
              {
                namespace: "transcript",
              },
              cursorOptions(u),
            ),
          (u) => {
            for (let s of u) {
              let c = listedProjectKey(s, isKeySegment);
              if (c !== undefined && !i.has(c)) {
                i.add(c);
                r.push(c);
              }
            }
            o++;
          },
        )
      ).status === "error"
    )
      return o === 0 ? null : r;
  } catch {
    return o === 0 ? null : r;
  }
  return r;
}
//@ chunk-f9pzpnqt.js:15641-16125 placement
async function projectDirsFromListedNames(e, n, t, r) {
  let projectKey = getProjectKey(e);
  let projectDir = getProjectDir(e);
  let a = legacyDerivedProjectKey(e);
  let u =
    a === undefined && projectKey.length > MAX_SANITIZED_LENGTH
      ? projectKey.slice(0, MAX_SANITIZED_LENGTH) + "-"
      : undefined;
  let projectsDir = getProjectsDir();
  let c = (g) => (t ? g.toLowerCase() : g);
  let p = u !== undefined ? c(u) : undefined;
  let l = c(projectKey);
  let f = false;
  let d;
  let m = [];
  let y = new Set();
  for (let g of n)
    if (g === projectKey) f = true;
    else if (a !== undefined) {
      if (d === undefined && c(g) === c(a)) d = join(projectsDir, g);
    } else if (p !== undefined && c(g).startsWith(p) && c(g) !== l && !y.has(c(g))) {
      y.add(c(g));
      m.push(g);
    }
  let h = [];
  for (let g of m) {
    let I = join(projectsDir, g);
    if (await dirBelongsToProject(I, e, t, r)) h.push(I);
  }
  return [...(f ? [projectDir] : []), ...(d !== undefined ? [d] : []), ...h];
}
//@ chunk-f9pzpnqt.js:16125-16175 placement
async function findProjectDir(originalCwd, n) {
  return (await findProjectDirs(originalCwd, n))[0];
}
//@ chunk-f9pzpnqt.js:16175-16414 placement
async function findWorktreeProjectDirs(cwd, n, t = getProjectsDir()) {
  let r = [];
  for (let i of await getWorktreePathsPortable(cwd)) {
    if (i === cwd) continue;
    let projectDirs = await findProjectDirs(i, n, t);
    if (n !== undefined && n.hoverRestOn) {
      let projectDir = getProjectDir(i);
      if (!projectDirs.includes(projectDir)) projectDirs.push(projectDir);
    }
    for (let projectDir of projectDirs)
      r.push({
        worktreePath: i,
        projectDir,
      });
  }
  return r;
}
//@ chunk-f9pzpnqt.js:16414-17894 placement
async function resolveSessionFilePath(e, n, transcriptStorageContext, hoverRestOn, i = getProjectsDir()) {
  let o = `${e}.jsonl`;
  let a =
    hoverRestOn && transcriptStorageContext !== undefined && transcriptStorageContext.isKeySegment(e)
      ? withSharedTranscriptListing(transcriptStorageContext)
      : undefined;
  let u =
    a === undefined
      ? undefined
      : {
          source: a,
          hoverRestOn,
        };
  async function s(p, projectPath) {
    let f = join(p, o);
    if (a) {
      let d = addressableProjectKey(p, a.isKeySegment);
      if (d !== undefined) {
        try {
          let stats = await a.backend.stat(a.transcriptKey(d, e));
          if (stats.ok) {
            let y = stats.value.storedBytes ?? stats.value.size;
            if (y > 0)
              return {
                filePath: f,
                projectPath,
                fileSize: y,
              };
          }
        } catch {}
        return;
      }
    }
    try {
      let d = await stat(f);
      if (d.size > 0)
        return {
          filePath: f,
          projectPath,
          fileSize: d.size,
        };
    } catch {}
    return;
  }
  if (n) {
    let p = await canonicalizePath(n, workspaceV5Of(transcriptStorageContext, hoverRestOn));
    let l = new Set();
    for (let f of projectPathSpellingsForRead(n, p))
      for (let d of await findProjectDirs(f, u, i)) {
        let m = d;
        if (l.has(m)) continue;
        l.add(m);
        let y = await s(d, f);
        if (y) return y;
      }
    for (let { worktreePath, projectDir } of await findWorktreeProjectDirs(p, u, i)) {
      let m = await s(projectDir, worktreePath);
      if (m) return m;
    }
    return;
  }
  if (a) {
    let p = new Map();
    try {
      if (
        (
          await readAllPages(
            (d) =>
              a.backend.listEntries(
                {
                  namespace: "transcript",
                },
                d !== undefined
                  ? {
                      cursor: d,
                    }
                  : undefined,
              ),
            (d) => {
              for (let m of d) {
                let y = listedProjectKey(m, a.isKeySegment);
                if (y === undefined) continue;
                let h = m.kind === "scope" && m.mtimeMs !== undefined ? m.mtimeMs : Number.NEGATIVE_INFINITY;
                let g = p.get(y);
                if (g === undefined)
                  p.set(y, {
                    projectKey: y,
                    mtimeMs: h,
                  });
                else if (h > g.mtimeMs) g.mtimeMs = h;
              }
            },
          )
        ).status === "error"
      )
        return;
    } catch {
      return;
    }
    let l = [...p.values()];
    l.sort((f, d) =>
      f.mtimeMs !== d.mtimeMs
        ? d.mtimeMs - f.mtimeMs
        : f.projectKey < d.projectKey
          ? -1
          : f.projectKey > d.projectKey
            ? 1
            : 0,
    );
    for (let { projectKey } of l) {
      let d = await s(join(i, projectKey), undefined);
      if (d) return d;
    }
    return;
  }
  let c;
  try {
    c = await readdir(i);
  } catch {
    return;
  }
  for (let p of c) {
    let l = await s(join(i, p), undefined);
    if (l) return l;
  }
  return;
}
//@ chunk-f9pzpnqt.js:17894-17960 placement = compactBoundaryMarker (1)
var TRANSCRIPT_READ_CHUNK_SIZE = 1048576;
var SKIP_PRECOMPACT_THRESHOLD = 5242880;
var COMPACT_BOUNDARY_MARKER = Buffer.from('"compact_boundary"');
//@ chunk-f9pzpnqt.js:17960-18194 fingerprint = parseBoundaryLine (0.909)
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
//@ chunk-f9pzpnqt.js:18194-18404 fingerprint = sinkWrite (1)
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
//@ chunk-f9pzpnqt.js:18404-18487 layout = hasPrefix (1)
function hasPrefix_2(src, prefix, at, end) {
  return end - at >= prefix.length && src.compare(prefix, 0, prefix.length, at, at + prefix.length) === 0;
}
//@ chunk-f9pzpnqt.js:18487-18606 fingerprint = SYSTEM_PREFIX (0.681)
var ATTRIBUTION_SNAPSHOT_PREFIX = Buffer.from('{"type":"attribution-snapshot"');
var buffer_3 = Buffer.from('{"type":"system"');
var ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER = 10;
var buffer_4 = Buffer.from([ATTRIBUTION_SNAPSHOT_PREFIX_BUFFER]);
var ATTRIBUTION_SNAPSHOT_MARKER = 256;
//@ chunk-f9pzpnqt.js:18606-19241 fingerprint = processStraddle (1)
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
//@ chunk-f9pzpnqt.js:19241-19778 fingerprint = scanChunkLines (1)
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
//@ chunk-f9pzpnqt.js:19778-20354 fingerprint = captureSnap (1)
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
//@ chunk-f9pzpnqt.js:20354-20539 fingerprint = captureCarry (1)
function captureCarry(s, buf, trailStart) {
  s.carryLen = buf.length - trailStart;
  if (s.carryLen > 0) {
    if (s.carryBuf === undefined || s.carryLen > s.carryBuf.length)
      s.carryBuf = Buffer.allocUnsafe(s.carryLen);
    buf.copy(s.carryBuf, 0, trailStart, buf.length);
  }
}
//@ chunk-f9pzpnqt.js:20539-20797 fingerprint = finalizeOutput (1)
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
//@ chunk-f9pzpnqt.js:20797-21325 placement
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
//@ chunk-f9pzpnqt.js:21325-23272 placement = readTranscriptForLoad (0.788)
async function readTranscriptForLoad(filePath, maxBytes, t) {
  let boundaryMarker = COMPACT_BOUNDARY_MARKER;
  let CHUNK_SIZE = TRANSCRIPT_READ_CHUNK_SIZE;
  let o = {
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
  if (t !== undefined && t.hoverRestOn) {
    let { backend, key } = t.source;
    let p = 0;
    let onChunk = (chunk) => {
      let bytesRead = chunk.length;
      p += bytesRead;
      let m = processStraddle(o, chunk, bytesRead);
      let buf;
      if (o.carryLen > 0) {
        let g = o.carryLen + (bytesRead - m);
        buf = Buffer.allocUnsafe(g);
        o.carryBuf.copy(buf, 0, 0, o.carryLen);
        chunk.copy(buf, o.carryLen, m, bytesRead);
      } else buf = chunk.subarray(m, bytesRead);
      let h = scanChunkLines(o, buf, boundaryMarker);
      captureSnap(o, buf, chunk, h.lastSnapStart, h.lastSnapEnd);
      captureCarry(o, buf, h.trailStart);
      o.bufFileOff += h.trailStart;
    };
    while (p < maxBytes) {
      let f = await backend.read([
        {
          key,
          offset: p,
          length: Math.min(CHUNK_SIZE, maxBytes - p),
        },
      ]);
      if (!f.ok) {
        if (p === 0 && isByteViewUnsupportedError(f.error)) {
          await streamTranscriptRecords(backend, key, maxBytes, onChunk);
          break;
        }
        throw Error("transcript ranged read failed", {
          cause: f.error,
        });
      }
      let [d] = f.value.items;
      if (!d.found) throw Error("transcript stream absent during load");
      if (d.value.length === 0) break;
      onChunk(Buffer.from(d.value.buffer, d.value.byteOffset, d.value.length));
    }
    finalizeOutput(o);
    return {
      boundaryStartOffset: o.boundaryStartOffset,
      postBoundaryBuf: o.out.buf.subarray(0, o.out.len),
      hasPreservedSegment: o.hasPreservedSegment,
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
      let chunkOff = processStraddle(o, chunk, bytesRead);
      let buf;
      if (o.carryLen > 0) {
        let bufLen = o.carryLen + (bytesRead - chunkOff);
        buf = Buffer.allocUnsafe(bufLen);
        o.carryBuf.copy(buf, 0, 0, o.carryLen);
        chunk.copy(buf, o.carryLen, chunkOff, bytesRead);
      } else buf = chunk.subarray(chunkOff, bytesRead);
      let f = scanChunkLines(o, buf, boundaryMarker);
      captureSnap(o, buf, chunk, f.lastSnapStart, f.lastSnapEnd);
      captureCarry(o, buf, f.trailStart);
      o.bufFileOff += f.trailStart;
    }
    finalizeOutput(o);
  } finally {
    await fd.close();
  }
  return {
    boundaryStartOffset: o.boundaryStartOffset,
    postBoundaryBuf: o.out.buf.subarray(0, o.out.len),
    hasPreservedSegment: o.hasPreservedSegment,
  };
}
//@ chunk-f9pzpnqt.js:23272-23319 placement
var BACKUP_FILE_NAME_PATTERN_WITH_LEGACY = /^[0-9a-f]{16}(?:[0-9a-f]{48})?@v\d+$/;
//@ chunk-f9pzpnqt.js:23319-23355 placement
function isUuidShaped(e) {
  return validateUuid(e) !== null;
}
//@ chunk-f9pzpnqt.js:23355-23493 placement
function buildHistorySuppressionEntry(sessionId, cause, t) {
  return {
    type: "history-suppression",
    sessionId,
    cause,
    ...(t && {
      vetoedAgainstAccountUuid: t,
    }),
    ts: new Date().toISOString(),
  };
}
//@ chunk-dz3q485w.js:15117-15133 affinity
var MAX_PORTABLE_TRANSCRIPT_BYTES = 67108864;
//@ chunk-dz3q485w.js:15133-15191 fingerprint = resolveSessionFilePath (0.396)
function resolveSessionFilePath_2(e) {
  return e.fileSize !== undefined && e.fileSize <= MAX_PORTABLE_TRANSCRIPT_BYTES;
}
//@ chunk-e6aww6q8.js:288436-288553 fingerprint = hasPrefix (1)
function hasPrefix(src, n = 0, r = src.length) {
  let s = skipNuls(src, n, r);
  return r - s >= buffer_5.length && src.compare(buffer_5, 0, buffer_5.length, s, s + buffer_5.length) === 0;
}
//@ chunk-g54kbxqw.js:54348-54510 fingerprint = sanitizePath (0.358)
function sanitizePath_3(name) {
  let n = contentBlockTypeBucket(name);
  let s = stripCacheControl_2(name);
  let hash = "text" in name ? name.text : undefined;
  return {
    type: n,
    hash: saltedHash(summarizeLongText(s, name)),
    length: s.length,
    prefixClass: n === "text" && typeof hash === "string" ? classifyUserText(hash) : n,
  };
}
export {
  getProjectDir,
  findProjectDirs,
  findSoleTranscriptWithMessagesById,
  PROGRAMMATIC_ENTRYPOINTS,
  LITE_READ_BUF_SIZE,
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
  getProjectKey,
  legacyDerivedProjectKey,
  MAX_SANITIZED_LENGTH,
  MAX_LISTING_PAGES,
  dirBelongsToProject,
  listedProjectKey,
  sanitizePath,
  normalizePathForCwdCompare,
  recordedCwdIsWithinOwnWorktrees,
  slugCollisionGuardFoldsCase,
  recordedCwdCollidesWithProjectResolved,
  readHeadAndTail,
  extractJsonStringField,
  extractFieldFromFirstEntryStrict,
  getPinnedProjectDir,
  getProjectsDir,
  readSessionLite,
  resolveSessionFilePath_2,
  isTranscriptFileResumeArg,
  extractFieldFromLastEntryStrict,
  validateUuid,
  sanitizePath_3,
  anchorOffsetTail,
  BACKUP_FILE_NAME_PATTERN_WITH_LEGACY,
  resolveJobTranscript,
  quarantineJobTranscript,
  TRANSCRIPT_READ_CHUNK_SIZE,
  COMPACT_BOUNDARY_MARKER,
  readTranscriptForLoad,
  resolveSessionFilePath,
};
