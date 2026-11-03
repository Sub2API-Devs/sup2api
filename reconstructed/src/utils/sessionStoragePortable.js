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
import { lstat, lstat as lstat_2, open, rename, readdir, realpath, stat } from "fs/promises";
import { createInterface } from "readline";
import { randomUUID } from "crypto";
import { basename, isAbsolute, join, dirname } from "path";
import { renderPluginPrompt } from "./messages/pluginPrompts.js";
import { readAllPages } from "./pagedRead.js";
import { zhe } from "./pastedContent.js";
import { Mn } from "./pathClassification.js";
import { AV } from "./networkPaths.js";
import { getClaudeConfigDir, getProjectDirNameOverride } from "./envUtils.js";
import { isDiskless } from "../bootstrap/state.js";
import { getWorktreePathsPortable } from "./getWorktreePathsPortable.js";
import { d7t } from "./storage/storageErrors.js";
import { yG, buffer_5 } from "./transcript/entryTypes.js";
import {
  contentBlockTypeBucket,
  stripCacheControl_2,
  saltedHash,
  summarizeLongText,
  classifyUserText,
} from "../services/api/promptCacheBreakParts.js";

//@ chunk-f9pzpnqt.js:1310-1366 placement
var LITE_READ_BUF_SIZE = 65536,
  PROGRAMMATIC_ENTRYPOINTS = new Set(["sdk-cli", "sdk-ts", "sdk-py"]);
//@ chunk-f9pzpnqt.js:1366-1581 placement
function isHiddenFromSessionPicker(e, n) {
  let t = extractJsonStringField(e, "entrypoint") ?? extractLastJsonStringField(n, "entrypoint");
  if (t && PROGRAMMATIC_ENTRYPOINTS.has(t)) return !0;
  let r =
      e
        .split(
          `
`,
        )
        .find((o) => o.includes('"parentUuid":')) ?? e,
    i = extractJsonStringField(r, "sessionKind");
  return i === "daemon" || i === "daemon-worker";
}
//@ chunk-f9pzpnqt.js:1581-1654 placement
var le = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//@ chunk-f9pzpnqt.js:1654-1729 placement
function validateUuid(maybeUuid) {
  if (typeof maybeUuid !== "string") return null;
  return le.test(maybeUuid) ? maybeUuid : null;
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
function extractJsonStringField(e, n) {
  let patterns = [`"${n}":"`, `"${n}": "`];
  for (let pattern of patterns) {
    let idx = e.indexOf(pattern);
    if (idx < 0) continue;
    let valueStart = idx + pattern.length,
      a = valueStart;
    while (a < e.length) {
      if (e[a] === "\\") {
        a += 2;
        continue;
      }
      if (e[a] === '"') return unescapeJsonString(e.slice(valueStart, a));
      a++;
    }
  }
  return;
}
//@ chunk-f9pzpnqt.js:2039-2301 placement = extractJsonStringFieldPrefix (1)
function extractLastJsonStringField(e, n) {
  let patterns = [`"${n}":"`, `"${n}": "`],
    r,
    i = -1;
  for (let pattern of patterns) {
    let a = 0;
    while (!0) {
      let index = e.indexOf(pattern, a);
      if (index < 0) break;
      let valueStart = index + pattern.length,
        c = valueStart;
      while (c < e.length) {
        if (e[c] === "\\") {
          c += 2;
          continue;
        }
        if (e[c] === '"') {
          if (index > i) ((r = unescapeJsonString(e.slice(valueStart, c))), (i = index));
          break;
        }
        c++;
      }
      a = c + 1;
    }
  }
  return r;
}
//@ chunk-f9pzpnqt.js:2301-2337 placement
function extractFieldFromLastEntryOfTypeStrict(e, n, t) {
  return findLastJsonStringField(e, t, n);
}
//@ chunk-f9pzpnqt.js:2337-2680 placement
function findLastJsonStringField(e, n, t) {
  let r = t === void 0 ? void 0 : `"type":"${t}"`,
    i = `"${n}":`,
    o = e.length;
  while (o > 0) {
    let index = e.lastIndexOf(
        `
`,
        o - 1,
      ),
      sliced = e.slice(index + 1, o);
    if (((o = index), sliced.includes(i) && (r === void 0 || sliced.includes(r))))
      try {
        let parsed = JSON.parse(sliced);
        if (typeof parsed === "object" && parsed !== null && (t === void 0 || parsed.type === t)) {
          let c = parsed[n];
          if (typeof c === "string") return c;
        }
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-f9pzpnqt.js:2680-2942 placement
function extractFieldFromFirstEntryStrict(e, n) {
  let t = `"${n}":`,
    r = 0;
  while (r < e.length) {
    let index = e.indexOf(
        `
`,
        r,
      ),
      o = index < 0 ? e.slice(r) : e.slice(r, index);
    if (((r = index < 0 ? e.length : index + 1), o.includes(t)))
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
function workspaceV5Of(e, n) {
  return e?.realWorkspacePath === void 0 ? void 0 : { hoverRestOn: n, realPath: e.realWorkspacePath };
}
//@ chunk-f9pzpnqt.js:3081-3127 placement
async function writeEntriesToJsonlFile(e, n, t) {
  return writeJsonlRecords(e, n, "w", t);
}
//@ chunk-f9pzpnqt.js:3127-3173 placement
async function appendEntriesToJsonlFile(e, n, t) {
  return writeJsonlRecords(e, n, "a", t);
}
//@ chunk-f9pzpnqt.js:3173-3437 placement
async function writeJsonlRecords(e, n, t, r) {
  if (r !== void 0 && r.hoverRestOn && (t === "w" || n.length > 0))
    return writeRecordsToBackend(r.source, n, t);
  let i = createWriteStream(e, { mode: 384, flags: t });
  try {
    for (let o of n)
      if (
        !i.write(
          JSON.stringify(o) +
            `
`,
        )
      )
        await once(i, "drain");
    (i.end(), await once(i, "finish"));
  } catch (error) {
    throw (i.destroy(), error);
  }
}
/**
 * 通过 v5 存储后端写转录记录：w 模式原地替换全部记录，否则追加；失败抛出带原因的错误。
 */
//@ chunk-f9pzpnqt.js:3437-3793 placement
async function writeRecordsToBackend(e, n, t) {
  let { backend: backend, key: key } = e,
    mapped = n.map((u) => ({
      data:
        JSON.stringify(u) +
        `
`,
    }));
  if (t === "w") {
    let replaceRecords = await backend.replaceRecords(key, mapped, {
      publishDiscipline: "inPlace",
      mode: 384,
    });
    if (!replaceRecords.ok) throw Error("transcript stream replace failed", { cause: replaceRecords.error });
    return;
  }
  let append = await backend.append(key, mapped);
  if (!append.ok) throw Error("transcript stream append failed", { cause: append.error });
}
//@ chunk-f9pzpnqt.js:3793-4316 placement = extractFirstPromptFromHead (0.914)
function extractFirstPromptFromHead(e, n = "stored") {
  let start = 0,
    r = { commandFallback: "" };
  while (start < e.length) {
    let index = e.indexOf(
        `
`,
        start,
      ),
      line = index >= 0 ? e.slice(start, index) : e.slice(start);
    if (
      ((start = index >= 0 ? index + 1 : e.length),
      !line.includes('"type":"user"') && !line.includes('"type": "user"'))
    )
      continue;
    if (line.includes('"tool_result"')) continue;
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true')) continue;
    if (line.includes('"isCompactSummary":true') || line.includes('"isCompactSummary": true')) continue;
    try {
      let entry = JSON.parse(line),
        u = renderPluginPrompt(entry, r, n);
      if (u !== void 0) return u;
    } catch {
      continue;
    }
  }
  return r.commandFallback;
}
//@ chunk-f9pzpnqt.js:4316-4786 placement
function attachmentPromptLabelFromHead(e) {
  let n = 0;
  while (n < e.length) {
    let index = e.indexOf(
        `
`,
        n,
      ),
      r = index >= 0 ? e.slice(n, index) : e.slice(n);
    if (
      ((n = index >= 0 ? index + 1 : e.length), !r.includes('"type":"user"') && !r.includes('"type": "user"'))
    )
      continue;
    if (r.includes('"tool_result"')) continue;
    if (r.includes('"isMeta":true') || r.includes('"isMeta": true')) continue;
    if (r.includes('"type":"image"') || r.includes('"type": "image"')) return "Image";
    if (r.includes('"type":"document"') || r.includes('"type": "document"')) return "Document";
  }
  return "";
}
//@ chunk-f9pzpnqt.js:4786-4963 placement
function extractFirstPromptFromEntries(e, n = "stored") {
  let t = { commandFallback: "" };
  for (let r of e) {
    if (typeof r !== "object" || r === null) continue;
    let i = renderPluginPrompt(r, t, n);
    if (i !== void 0) return i;
  }
  return t.commandFallback;
}
//@ chunk-f9pzpnqt.js:4963-5006 placement
var READ_NOFOLLOW_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
//@ chunk-f9pzpnqt.js:5006-5517 placement
async function readHeadAndTail(e, n, t, r) {
  if (r !== void 0 && r.hoverRestOn) return readHeadAndTail_2(r.source);
  try {
    if (READ_NOFOLLOW_FLAGS === constants.O_RDONLY) {
      if (!(await lstat(e)).isFile()) return { head: "", tail: "" };
    }
    let i = await open(e, READ_NOFOLLOW_FLAGS);
    try {
      if (!(await i.stat()).isFile()) return { head: "", tail: "" };
      let read = await i.read(t, 0, LITE_READ_BUF_SIZE, 0);
      if (read.bytesRead === 0) return { head: "", tail: "" };
      let str = t.toString("utf8", 0, read.bytesRead),
        max = Math.max(0, n - LITE_READ_BUF_SIZE),
        s = str;
      if (max > 0) {
        let read = await i.read(t, 0, LITE_READ_BUF_SIZE, max);
        s = t.toString("utf8", 0, read.bytesRead);
      }
      return { head: str, tail: s };
    } finally {
      await i.close();
    }
  } catch {
    return { head: "", tail: "" };
  }
}
//@ chunk-f9pzpnqt.js:5517-5615 placement = readHeadAndTail (0.802)
async function readHeadAndTail_2(e) {
  let n = await readHeadTailV5(e);
  return n === null ? { head: "", tail: "" } : { head: n.head, tail: n.tail };
}
//@ chunk-f9pzpnqt.js:5615-5680 placement
function anchorOffsetTail(e) {
  let index = e.indexOf(`
`);
  return index >= 0 ? e.slice(index + 1) : "";
}
/**
 * 从 v5 存储后端一次读取转录的头部与尾部缓冲，返回 {head, tail, mtimeMs, totalBytes}；不存在或失败返回 null。
 */
//@ chunk-f9pzpnqt.js:5680-6021 placement
async function readHeadTailV5(e) {
  let { backend: backend, key: key } = e;
  try {
    let read = await backend.read([
      { key: key, offset: 0, length: LITE_READ_BUF_SIZE },
      { key: key, tail: LITE_READ_BUF_SIZE },
    ]);
    if (!read.ok) return null;
    let [i, o] = read.value.items;
    if (!i.found || i.value.length === 0) return null;
    let a = K(i.value),
      u = o.found && o.value.length > 0 ? K(o.value) : a;
    return { head: a, tail: u, mtimeMs: i.mtimeMs, totalBytes: i.totalBytes };
  } catch {
    return null;
  }
}
//@ chunk-f9pzpnqt.js:6021-6107 placement
function K(e) {
  return Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8");
}
//@ chunk-f9pzpnqt.js:6107-6158 placement
async function _(e, n) {
  return (await getTranscriptMessagesState(e, n)) !== "none";
}
/**
 * 判断转录文件是否含 user/assistant 消息：逐行扫描，返回 has / none / unknown（v5 存储时交给后端判断）。
 */
//@ chunk-f9pzpnqt.js:6158-6602 placement
async function getTranscriptMessagesState(e, n) {
  if (n !== void 0 && n.hoverRestOn) return transcriptMessagesStateV5(n.source);
  try {
    if (!(await lstat_2(e)).isFile()) return "none";
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
    let r = createInterface({ input: t.createReadStream() });
    for await (let i of r)
      if (i.includes('"type":"user"') || i.includes('"type":"assistant"')) return (r.close(), "has");
    return "none";
  } catch {
    return "unknown";
  } finally {
    await t.close().catch(() => {});
  }
}
//@ chunk-f9pzpnqt.js:6602-6695 placement
var ye = 65536,
  ge = 4194304,
  buffer = Buffer.from('"type":"user"'),
  buffer_2 = Buffer.from('"type":"assistant"');
//@ chunk-f9pzpnqt.js:6695-6748 placement
function we(e) {
  return e.includes(buffer) || e.includes(buffer_2);
}
//@ chunk-f9pzpnqt.js:6748-6760 placement
var MAX_LISTING_PAGES = 1e4;
//@ chunk-f9pzpnqt.js:6760-6946 placement
function listedProjectKey(e, n) {
  if (
    e.kind !== "scope" ||
    e.scope.namespace !== "transcript" ||
    e.scope.projectKey === void 0 ||
    e.scope.sessionId !== void 0 ||
    !n(e.scope.projectKey)
  )
    return;
  return e.scope.projectKey;
}
//@ chunk-f9pzpnqt.js:6946-7686 placement
async function transcriptMessagesStateV5(e, n = we) {
  let { backend: backend, key: key } = e,
    i,
    o = !1,
    a = 0,
    u = 0;
  try {
    for (;;) {
      if (++u > MAX_LISTING_PAGES) return "unknown";
      let records = await backend.readRecords(key, {
        order: "forward",
        maxBytes: i === void 0 ? ye : ge,
        ...(i !== void 0 && { fromSeq: i }),
      });
      if (!records.ok) return records.error.code === "NotFound" ? "none" : "unknown";
      a += records.value.items.length;
      for (let item of records.value.items) {
        let buffer = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength);
        if (n(buffer)) return "has";
        if (item.truncated === !0) o = !0;
      }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === void 0) {
        if (o) return "unknown";
        if (records.value.items.length === 0 && i !== void 0) return "unknown";
        let statStream = await backend.statStream(key);
        if (!statStream.ok) return statStream.error.code === "NotFound" ? "none" : "unknown";
        return statStream.value.recordCount > a ? "unknown" : "none";
      }
      if (i !== void 0 && nextSeq <= i) return "unknown";
      i = nextSeq;
    }
  } catch {
    return "unknown";
  }
}
//@ chunk-f9pzpnqt.js:7686-8156 placement
async function quarantineJobTranscript(e, n) {
  let t = `orphaned-${Date.now()}-${randomUUID().slice(0, 8)}`,
    r = n !== void 0 && n.hoverRestOn ? n.source : void 0,
    i = r !== void 0 && e.endsWith(".jsonl") ? transcriptStoreKey(e, basename(e, ".jsonl"), r) : void 0;
  if (i !== void 0 && r !== void 0) {
    let { key: key } = i;
    if (key.namespace !== "transcript") return !1;
    try {
      return (await i.backend.move(key, r.transcriptKey(key.projectKey, `${key.sessionId}.${t}`))).ok;
    } catch {
      return !1;
    }
  }
  let o = `${e.endsWith(".jsonl") ? e.slice(0, -6) : e}.${t}.jsonl`;
  try {
    return (await rename(e, o), !0);
  } catch {
    return !1;
  }
}
//@ chunk-f9pzpnqt.js:8156-8207 placement = getErrorsPath (1)
function isTranscriptFileResumeArg(e) {
  return isAbsolute(e) && e.endsWith(".jsonl");
}
/**
 * 为恢复会话定位 transcript 文件：依次查链接路径、项目目录、计算路径，必要时跨 worktree 与全项目扫描，返回 {path, via, hasMessages, unverifiable?}。与 bridge 无关（会话存储）。
 */
//@ chunk-f9pzpnqt.js:8207-9391 placement
async function resolveJobTranscript(sessionId, n, t, r, i) {
  let o = await canonicalizePath(n, workspaceV5Of(i?.source, i?.hoverRestOn === !0));
  if (validateUuid(sessionId) === null)
    return { path: join(getProjectDir(o), "invalid-resume-id.jsonl"), hasMessages: !1, via: "computed" };
  let a = join(getProjectDir(o), `${sessionId}.jsonl`),
    u = [];
  if (t !== void 0)
    u.push(
      t.endsWith(`${sessionId}.jsonl`)
        ? { path: t, via: "linkScanPath" }
        : { path: join(dirname(t), `${sessionId}.jsonl`), via: "linkScanDir" },
    );
  let s = i !== void 0 && i.hoverRestOn ? { ...i, source: withSharedTranscriptListing(i.source) } : void 0;
  for (let f of await findProjectDirs(o, s))
    u.push({ path: join(f, `${sessionId}.jsonl`), via: "projectDir" });
  u.push({ path: a, via: "computed" });
  let c = new Set(),
    p = (f) => transcriptHasMessages(f, sessionId, s),
    l;
  for (let f of u) {
    if (c.has(f.path)) continue;
    c.add(f.path);
    let d = await p(f.path);
    if (d === "has") return { ...f, hasMessages: !0 };
    if (d === "unverifiable" && l === void 0) l = f;
  }
  if (r?.crossWorktree !== !1)
    for (let { projectDir: projectDir } of await findWorktreeProjectDirs(o, s)) {
      let d = join(projectDir, `${sessionId}.jsonl`);
      if (s !== void 0) {
        if (c.has(d)) continue;
        c.add(d);
      }
      let m = await p(d);
      if (m === "has") return { path: d, via: "worktreeProjectDir", hasMessages: !0 };
      if (m === "unverifiable" && l === void 0) l = { path: d, via: "worktreeProjectDir" };
    }
  if (r?.crossWorktree !== !1) {
    let f = await findSoleTranscriptWithMessagesById(sessionId, c, s);
    if (f !== null) return { path: f, via: "projectsScan", hasMessages: !0 };
  }
  if (l !== void 0) return { ...l, hasMessages: !0, unverifiable: !0 };
  return { ...u[0], hasMessages: !1 };
}
//@ chunk-f9pzpnqt.js:9391-9553 placement
function transcriptStoreKey(e, n, t) {
  let r = addressableProjectKey(dirname(e), t.isKeySegment);
  if (r === void 0 || basename(e) !== `${n}.jsonl` || !t.isKeySegment(n)) return;
  return { backend: t.backend, key: t.transcriptKey(r, n) };
}
//@ chunk-f9pzpnqt.js:9553-9869 placement
async function transcriptHasMessages(filePath, sessionId, t) {
  let r = t !== void 0 && t.hoverRestOn ? transcriptStoreKey(filePath, sessionId, t.source) : void 0;
  if (r === void 0) return (await _(filePath)) ? "has" : "none";
  let i = await transcriptMessagesStateV5(r);
  if (i === "has") return "has";
  try {
    if (!(await lstat_2(filePath)).isFile()) return "none";
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
function M(e) {
  return { skipScopeStats: !0, skipKeyStats: !0, ...(e !== void 0 && { cursor: e }) };
}
//@ chunk-f9pzpnqt.js:10033-10594 placement
function withSharedTranscriptListing(e) {
  let n = new Map(),
    proxy = new Proxy(e.backend, {
      get(r, i, o) {
        let a = Reflect.get(r, i, o);
        if (i !== "listEntries") return typeof a === "function" ? a.bind(r) : a;
        return (s, c) => {
          if (!(
            s.namespace === "transcript" &&
            !("projectKey" in s) &&
            Object.keys(c ?? {}).every(
              (d) => d === "cursor" || d === "skipScopeStats" || d === "skipKeyStats",
            )
          ))
            return r.listEntries(s, c);
          let joined = [c?.cursor ?? "", c?.skipScopeStats, c?.skipKeyStats].map(String).join("\x00"),
            f = n.get(joined);
          if (f === void 0) {
            ((f = r.listEntries(s, c)), n.set(joined, f));
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
  return { ...e, backend: proxy };
}
//@ chunk-f9pzpnqt.js:10594-10969 placement
async function findSoleTranscriptWithMessagesById(e, n = new Set(), t) {
  if (validateUuid(e) === null) return null;
  if (t !== void 0 && t.hoverRestOn && t.source.isKeySegment(e))
    return findTranscriptInOtherProjects(e, n, t.source);
  let r = getProjectsDir(),
    i = null;
  try {
    for (let o of await readdir(r, { withFileTypes: !0 })) {
      if (!o.isDirectory()) continue;
      let a = join(r, o.name, `${e}.jsonl`);
      if (n.has(a)) continue;
      if ((await getTranscriptMessagesState(a)) !== "has") continue;
      if (i !== null) return null;
      i = a;
    }
  } catch {
    return null;
  }
  return i;
}
/**
 * 在 v5 存储的所有项目中查找含消息的同名会话转录（跳过已排除路径）；找到唯一一个返回其路径，多个或列举未完成返回 null。
 */
//@ chunk-f9pzpnqt.js:10969-11512 placement
async function findTranscriptInOtherProjects(sessionId, excluded, storage) {
  let { backend: backend, transcriptKey: transcriptKey, isKeySegment: isKeySegment } = storage,
    projectsDir = getProjectsDir(),
    found = null,
    ambiguous = !1,
    seen = new Set();
  try {
    let p = await readAllPages(
      (l) => backend.listEntries({ namespace: "transcript" }, M(l)),
      async (l) => {
        for (let f of l) {
          let projectKey = listedProjectKey(f, isKeySegment);
          if (projectKey === void 0) continue;
          let transcriptPath = join(projectsDir, projectKey, `${sessionId}.jsonl`);
          if (seen.has(transcriptPath) || excluded.has(transcriptPath)) continue;
          seen.add(transcriptPath);
          let state = await transcriptMessagesStateV5({
            backend: backend,
            key: transcriptKey(projectKey, sessionId),
          });
          if (state === "unknown")
            try {
              state = (await lstat_2(transcriptPath)).isFile()
                ? await getTranscriptMessagesState(transcriptPath)
                : "none";
            } catch {}
          if (state !== "has") continue;
          if (found !== null) {
            ambiguous = !0;
            return;
          }
          found = transcriptPath;
        }
      },
      { until: () => ambiguous },
    );
    if (ambiguous || p.status !== "done") return null;
  } catch {
    return null;
  }
  return found;
}
//@ chunk-f9pzpnqt.js:11512-12042 placement = readSessionLite (0.859)
async function readSessionLite(e, n) {
  if (n !== void 0 && n.hoverRestOn) return statWithHeadTail(n.source);
  try {
    if (READ_NOFOLLOW_FLAGS === constants.O_RDONLY) {
      if (!(await lstat(e)).isFile()) return null;
    }
    let t = await open(e, READ_NOFOLLOW_FLAGS);
    try {
      let stat = await t.stat();
      if (!stat.isFile()) return null;
      let buf = Buffer.allocUnsafe(LITE_READ_BUF_SIZE),
        headResult = await t.read(buf, 0, LITE_READ_BUF_SIZE, 0);
      if (headResult.bytesRead === 0) return null;
      let head = buf.toString("utf8", 0, headResult.bytesRead),
        tailOffset = Math.max(0, stat.size - LITE_READ_BUF_SIZE),
        tail = head;
      if (tailOffset > 0) {
        let tailResult = await t.read(buf, 0, LITE_READ_BUF_SIZE, tailOffset);
        tail = buf.toString("utf8", 0, tailResult.bytesRead);
      }
      return { mtime: stat.mtime.getTime(), size: stat.size, head: head, tail: tail };
    } finally {
      await t.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-f9pzpnqt.js:12042-12181 placement
async function statWithHeadTail(e) {
  let n = await readHeadTailV5(e);
  if (n === null) return null;
  return { mtime: Math.trunc(n.mtimeMs), size: n.totalBytes, head: n.head, tail: n.tail };
}
//@ chunk-f9pzpnqt.js:12181-12193 placement
var MAX_SANITIZED_LENGTH = 200;
//@ chunk-f9pzpnqt.js:12193-12245 placement
function hashPathForSuffix(str) {
  return Math.abs(zhe(str)).toString(36);
}
//@ chunk-f9pzpnqt.js:12245-12297 placement
function sanitizePath_2(e) {
  return e.replace(/[^a-zA-Z0-9]/g, "-");
}
/**
 * 把路径清洗成目录名：非字母数字替换为 '-'，超 200 字符时保留前 200 字符并追加 '-<hash36>'。
 */
//@ chunk-f9pzpnqt.js:12297-12384 placement
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
  let r = Mn(e),
    i = Mn(n),
    o = (a) => (t ? a.toLowerCase() : a);
  if (o(sanitizePath_2(r)) !== o(sanitizePath_2(i))) return !1;
  return normalizePathForCwdCompare(r, t) !== normalizePathForCwdCompare(i, t);
}
//@ chunk-f9pzpnqt.js:12580-12884 placement
async function recordedCwdCollidesWithProjectResolved(e, n, t, r, i) {
  if (!isSanitizedNameCollision(e, n, t)) return !1;
  if (AV(e) || AV(n)) return !1;
  if ((await r(e)) || (await r(n))) return !1;
  let o;
  try {
    if (i !== void 0 && i.hoverRestOn) {
      let realPath = await i.realPath(e);
      if (!realPath.ok || !realPath.value.found) return !1;
      o = Mn(realPath.value.path);
    } else o = Mn(await realpath(e));
  } catch {
    return !1;
  }
  let a = await canonicalizePath(n, i);
  return isSanitizedNameCollision(o, a, t);
}
//@ chunk-f9pzpnqt.js:12884-13039 placement
function recordedCwdIsWithinOwnWorktrees(e, n, t) {
  if (n === void 0) return !1;
  let r = normalizePathForCwdCompare(Mn(e), t);
  return n.some((i) => {
    let o = normalizePathForCwdCompare(Mn(i), t);
    return r === o || r.startsWith(o.endsWith("/") ? o : o + "/");
  });
}
//@ chunk-f9pzpnqt.js:13039-13063 placement
function slugCollisionGuardFoldsCase() {
  return !1;
}
/**
 * <配置目录>/projects：所有会话转录的根目录。
 */
//@ chunk-f9pzpnqt.js:13063-13103 placement = getProjectsDir (1)
function getProjectsDir() {
  return join(getClaudeConfigDir(), "projects");
}
/**
 * 项目目录名：自定义配置目录或 diskless 时可由 CLAUDE_CODE_PROJECT_DIR_NAME 覆盖，否则清洗 cwd。
 */
//@ chunk-f9pzpnqt.js:13103-13138 placement
function getProjectKey(e) {
  return getProjectDirNameOverride() ?? sanitizePath(e);
}
//@ chunk-f9pzpnqt.js:13138-13192 placement
function legacyDerivedProjectKey(e) {
  let n = sanitizePath(e);
  return n === getProjectKey(e) ? void 0 : n;
}
//@ chunk-f9pzpnqt.js:13192-13232 placement
function getProjectDir(e, n = getProjectsDir()) {
  return join(n, getProjectKey(e));
}
//@ chunk-f9pzpnqt.js:13232-13292 placement
function getPinnedProjectDir() {
  let e = getProjectDirNameOverride();
  return e === void 0 ? null : join(getProjectsDir(), e);
}
//@ chunk-f9pzpnqt.js:13292-13355 placement
function addressableProjectKey(e, n) {
  let t = basename(e);
  return dirname(e) === getProjectsDir() && n(t) ? t : void 0;
}
//@ chunk-f9pzpnqt.js:13355-13526 placement
async function canonicalizePath(e, n) {
  try {
    if (n !== void 0 && n.hoverRestOn) {
      let realPath = await n.realPath(e);
      return Mn(realPath.ok && realPath.value.found ? realPath.value.path : e);
    }
    return Mn(await realpath(e));
  } catch {
    return Mn(e);
  }
}
//@ chunk-f9pzpnqt.js:13526-13554 placement
function projectPathSpellingsForRead(e, n) {
  return [n];
}
//@ chunk-f9pzpnqt.js:13554-13975 placement
async function dirBelongsToProject(e, n, t, r) {
  let i = r !== void 0 && r.hoverRestOn ? r.source : void 0,
    o = i === void 0 ? void 0 : addressableProjectKey(e, i.isKeySegment);
  if (i !== void 0 && o !== void 0) {
    let s = await hasSessionForCwd(o, n, t, i);
    if (s !== void 0) return s;
  }
  if (isDiskless()) return !1;
  let a = sanitizePath_2(n),
    u;
  try {
    u = await readdir(e, { withFileTypes: !0 });
  } catch {
    return !1;
  }
  for (let s of u) {
    if (!s.isFile() || !s.name.endsWith(".jsonl")) continue;
    let c = await readSessionLite(join(e, s.name));
    if (c === null) continue;
    if (matchesSessionCwd(c, a, t)) return !0;
  }
  return !1;
}
//@ chunk-f9pzpnqt.js:13975-14145 placement
function matchesSessionCwd(e, n, t) {
  let r =
    extractFieldFromLastEntryOfTypeStrict(e.tail, "relocated", "relocatedCwd") ??
    extractFieldFromFirstEntryStrict(e.head, "cwd");
  if (r === void 0) return !1;
  let i = sanitizePath_2(Mn(r));
  return t ? i.toLowerCase() === n.toLowerCase() : i === n;
}
/**
 * 在 v5 存储的某项目下逐个检查会话转录的工作目录（含重定位后的目录）是否等于给定目录；找到返回 true，列举未完成返回 undefined。
 */
//@ chunk-f9pzpnqt.js:14145-14695 placement
async function hasSessionForCwd(projectKey, cwd, caseInsensitive, storage) {
  let { backend: backend, transcriptKey: transcriptKey, isKeySegment: isKeySegment } = storage,
    sanitizedCwd = sanitizePath_2(cwd),
    found = !1,
    seen = new Set();
  try {
    let p = await readAllPages(
      (l) => backend.listEntries({ namespace: "transcript", projectKey: projectKey }, M(l)),
      async (l) => {
        for (let f of l) {
          if (
            f.kind !== "key" ||
            f.key.namespace !== "transcript" ||
            f.key.projectKey !== projectKey ||
            f.key.agentId !== void 0 ||
            !isKeySegment(f.key.sessionId) ||
            seen.has(f.key.sessionId)
          )
            continue;
          let sessionId = f.key.sessionId,
            headTail = await statWithHeadTail({
              backend: backend,
              key: transcriptKey(projectKey, sessionId),
            });
          if (headTail === null) continue;
          if ((seen.add(sessionId), matchesSessionCwd(headTail, sanitizedCwd, caseInsensitive))) {
            found = !0;
            return;
          }
        }
      },
      { until: () => found },
    );
    if (found) return !0;
    if (p.status !== "done") return;
  } catch {
    return;
  }
  return !1;
}
//@ chunk-f9pzpnqt.js:14695-15202 placement
async function findProjectDirs(e, n, t = getProjectsDir()) {
  if (n !== void 0 && n.hoverRestOn) return listProjectDirsForCwd(e, n);
  if (isDiskless()) return [];
  let r = getProjectDir(e, t),
    i = [];
  try {
    (await readdir(r), i.push(r));
  } catch {}
  let exact = legacyDerivedProjectKey(e);
  if (exact !== void 0) {
    let l = join(t, exact);
    try {
      (await readdir(l), i.push(l));
    } catch {}
    return i;
  }
  let sanitized = sanitizePath(e);
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return i;
  let u = !1,
    s = (l) => (u ? l.toLowerCase() : l),
    c = s(sanitized.slice(0, MAX_SANITIZED_LENGTH) + "-"),
    p = s(r);
  try {
    for (let l of await readdir(t, { withFileTypes: !0 })) {
      if (!l.isDirectory() || !s(l.name).startsWith(c)) continue;
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
    return [getProjectDir(e), ...(r !== void 0 ? [join(getProjectsDir(), r)] : [])];
  }
  return projectDirsFromListedNames(e, t, !1, n);
}
//@ chunk-f9pzpnqt.js:15341-15641 placement
async function listProjectDirNamesV5(e) {
  let { backend: backend, isKeySegment: isKeySegment } = e,
    r = [],
    i = new Set(),
    o = 0;
  try {
    if (
      (
        await readAllPages(
          (u) => backend.listEntries({ namespace: "transcript" }, M(u)),
          (u) => {
            for (let s of u) {
              let c = listedProjectKey(s, isKeySegment);
              if (c !== void 0 && !i.has(c)) (i.add(c), r.push(c));
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
  let i = getProjectKey(e),
    o = getProjectDir(e),
    a = legacyDerivedProjectKey(e),
    u = a === void 0 && i.length > MAX_SANITIZED_LENGTH ? i.slice(0, MAX_SANITIZED_LENGTH) + "-" : void 0,
    s = getProjectsDir(),
    c = (g) => (t ? g.toLowerCase() : g),
    p = u !== void 0 ? c(u) : void 0,
    l = c(i),
    f = !1,
    d,
    m = [],
    y = new Set();
  for (let g of n)
    if (g === i) f = !0;
    else if (a !== void 0) {
      if (d === void 0 && c(g) === c(a)) d = join(s, g);
    } else if (p !== void 0 && c(g).startsWith(p) && c(g) !== l && !y.has(c(g))) (y.add(c(g)), m.push(g));
  let h = [];
  for (let g of m) {
    let I = join(s, g);
    if (await dirBelongsToProject(I, e, t, r)) h.push(I);
  }
  return [...(f ? [o] : []), ...(d !== void 0 ? [d] : []), ...h];
}
//@ chunk-f9pzpnqt.js:16125-16175 placement
async function findProjectDir(e, n) {
  return (await findProjectDirs(e, n))[0];
}
//@ chunk-f9pzpnqt.js:16175-16414 placement
async function findWorktreeProjectDirs(e, n, t = getProjectsDir()) {
  let r = [];
  for (let i of await getWorktreePathsPortable(e)) {
    if (i === e) continue;
    let o = await findProjectDirs(i, n, t);
    if (n !== void 0 && n.hoverRestOn) {
      let a = getProjectDir(i);
      if (!o.includes(a)) o.push(a);
    }
    for (let a of o) r.push({ worktreePath: i, projectDir: a });
  }
  return r;
}
//@ chunk-f9pzpnqt.js:16414-17894 placement
async function resolveSessionFilePath(e, n, t, r, i = getProjectsDir()) {
  let o = `${e}.jsonl`,
    a = r && t !== void 0 && t.isKeySegment(e) ? withSharedTranscriptListing(t) : void 0,
    u = a === void 0 ? void 0 : { source: a, hoverRestOn: r };
  async function s(p, l) {
    let f = join(p, o);
    if (a) {
      let d = addressableProjectKey(p, a.isKeySegment);
      if (d !== void 0) {
        try {
          let stats = await a.backend.stat(a.transcriptKey(d, e));
          if (stats.ok) {
            let y = stats.value.storedBytes ?? stats.value.size;
            if (y > 0) return { filePath: f, projectPath: l, fileSize: y };
          }
        } catch {}
        return;
      }
    }
    try {
      let d = await stat(f);
      if (d.size > 0) return { filePath: f, projectPath: l, fileSize: d.size };
    } catch {}
    return;
  }
  if (n) {
    let p = await canonicalizePath(n, workspaceV5Of(t, r)),
      l = new Set();
    for (let f of projectPathSpellingsForRead(n, p))
      for (let d of await findProjectDirs(f, u, i)) {
        let m = d;
        if (l.has(m)) continue;
        l.add(m);
        let y = await s(d, f);
        if (y) return y;
      }
    for (let { worktreePath: worktreePath, projectDir: projectDir } of await findWorktreeProjectDirs(
      p,
      u,
      i,
    )) {
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
            (d) => a.backend.listEntries({ namespace: "transcript" }, d !== void 0 ? { cursor: d } : void 0),
            (d) => {
              for (let m of d) {
                let y = listedProjectKey(m, a.isKeySegment);
                if (y === void 0) continue;
                let h = m.kind === "scope" && m.mtimeMs !== void 0 ? m.mtimeMs : Number.NEGATIVE_INFINITY,
                  g = p.get(y);
                if (g === void 0) p.set(y, { projectKey: y, mtimeMs: h });
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
    for (let { projectKey: projectKey } of l) {
      let d = await s(join(i, projectKey), void 0);
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
    let l = await s(join(i, p), void 0);
    if (l) return l;
  }
  return;
}
//@ chunk-f9pzpnqt.js:17894-17960 placement = compactBoundaryMarker (1)
var TRANSCRIPT_READ_CHUNK_SIZE = 1048576,
  SKIP_PRECOMPACT_THRESHOLD = 5242880,
  COMPACT_BOUNDARY_MARKER = Buffer.from('"compact_boundary"');
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
  let i = end - start;
  if (i <= 0) return;
  if (s.len + i > s.buf.length) {
    let grown = Buffer.allocUnsafe(Math.min(Math.max(s.buf.length * 2, s.len + i), s.cap));
    (s.buf.copy(grown, 0, 0, s.len), (s.buf = grown));
  }
  (src.copy(s.buf, s.len, start, end), (s.len += i));
}
//@ chunk-f9pzpnqt.js:18404-18487 layout = hasPrefix (1)
function hasPrefix_2(src, prefix, at, end) {
  return end - at >= prefix.length && src.compare(prefix, 0, prefix.length, at, at + prefix.length) === 0;
}
//@ chunk-f9pzpnqt.js:18487-18606 fingerprint = SYSTEM_PREFIX (0.681)
var ATTRIBUTION_SNAPSHOT_PREFIX = Buffer.from('{"type":"attribution-snapshot"'),
  buffer_3 = Buffer.from('{"type":"system"'),
  v = 10,
  buffer_4 = Buffer.from([v]),
  Be = 256;
//@ chunk-f9pzpnqt.js:18606-19241 fingerprint = processStraddle (1)
function processStraddle(s, chunk, bytesRead) {
  if (((s.straddleSnapCarryLen = 0), (s.straddleSnapTailEnd = 0), s.carryLen === 0)) return 0;
  let cb = s.carryBuf,
    firstNl = chunk.indexOf(v);
  if (firstNl === -1 || firstNl >= bytesRead) return 0;
  let tailEnd = firstNl + 1;
  if (hasPrefix_2(cb, ATTRIBUTION_SNAPSHOT_PREFIX, 0, s.carryLen))
    ((s.straddleSnapCarryLen = s.carryLen), (s.straddleSnapTailEnd = tailEnd), (s.lastSnapSrc = null));
  else if (s.carryLen < ATTRIBUTION_SNAPSHOT_PREFIX.length) return 0;
  else {
    if (hasPrefix_2(cb, buffer_3, 0, s.carryLen)) {
      let hit = parseBoundaryLine(cb.toString("utf-8", 0, s.carryLen) + chunk.toString("utf-8", 0, firstNl));
      if (hit?.hasPreservedSegment) s.hasPreservedSegment = !0;
      else if (hit)
        ((s.out.len = 0),
          (s.boundaryStartOffset = s.bufFileOff),
          (s.hasPreservedSegment = !1),
          (s.lastSnapSrc = null));
    }
    (sinkWrite(s.out, cb, 0, s.carryLen), sinkWrite(s.out, chunk, 0, tailEnd));
  }
  return ((s.bufFileOff += s.carryLen + tailEnd), (s.carryLen = 0), tailEnd);
}
//@ chunk-f9pzpnqt.js:19241-19778 fingerprint = scanChunkLines (1)
function scanChunkLines(s_2, buf, boundaryMarker) {
  let boundaryAt = buf.indexOf(boundaryMarker),
    i = 0,
    o = 0,
    lastSnapStart = -1,
    lastSnapEnd = -1,
    nl = buf.indexOf(v);
  while (nl !== -1) {
    let lineEnd = nl + 1;
    if (boundaryAt !== -1 && boundaryAt < o) boundaryAt = buf.indexOf(boundaryMarker, o);
    if (hasPrefix_2(buf, ATTRIBUTION_SNAPSHOT_PREFIX, o, lineEnd))
      (sinkWrite(s_2.out, buf, i, o), (lastSnapStart = o), (lastSnapEnd = lineEnd), (i = lineEnd));
    else if (boundaryAt >= o && boundaryAt < Math.min(o + Be, lineEnd)) {
      let hit = parseBoundaryLine(buf.toString("utf-8", o, nl));
      if (hit?.hasPreservedSegment) s_2.hasPreservedSegment = !0;
      else if (hit)
        ((s_2.out.len = 0),
          (s_2.boundaryStartOffset = s_2.bufFileOff + o),
          (s_2.hasPreservedSegment = !1),
          (s_2.lastSnapSrc = null),
          (lastSnapStart = -1),
          (s_2.straddleSnapCarryLen = 0),
          (i = o));
      boundaryAt = buf.indexOf(boundaryMarker, boundaryAt + boundaryMarker.length);
    }
    ((o = lineEnd), (nl = buf.indexOf(v, o)));
  }
  return (
    sinkWrite(s_2.out, buf, i, o),
    { lastSnapStart: lastSnapStart, lastSnapEnd: lastSnapEnd, trailStart: o }
  );
}
//@ chunk-f9pzpnqt.js:19778-20354 fingerprint = captureSnap (1)
function captureSnap(s, buf, chunk, lastSnapStart, lastSnapEnd) {
  if (lastSnapStart !== -1) {
    if (
      ((s.lastSnapLen = lastSnapEnd - lastSnapStart),
      s.lastSnapBuf === void 0 || s.lastSnapLen > s.lastSnapBuf.length)
    )
      s.lastSnapBuf = Buffer.allocUnsafe(s.lastSnapLen);
    (buf.copy(s.lastSnapBuf, 0, lastSnapStart, lastSnapEnd), (s.lastSnapSrc = s.lastSnapBuf));
  } else if (s.straddleSnapCarryLen > 0) {
    if (
      ((s.lastSnapLen = s.straddleSnapCarryLen + s.straddleSnapTailEnd),
      s.lastSnapBuf === void 0 || s.lastSnapLen > s.lastSnapBuf.length)
    )
      s.lastSnapBuf = Buffer.allocUnsafe(s.lastSnapLen);
    (s.carryBuf.copy(s.lastSnapBuf, 0, 0, s.straddleSnapCarryLen),
      chunk.copy(s.lastSnapBuf, s.straddleSnapCarryLen, 0, s.straddleSnapTailEnd),
      (s.lastSnapSrc = s.lastSnapBuf));
  }
}
//@ chunk-f9pzpnqt.js:20354-20539 fingerprint = captureCarry (1)
function captureCarry(s, buf, trailStart) {
  if (((s.carryLen = buf.length - trailStart), s.carryLen > 0)) {
    if (s.carryBuf === void 0 || s.carryLen > s.carryBuf.length) s.carryBuf = Buffer.allocUnsafe(s.carryLen);
    buf.copy(s.carryBuf, 0, trailStart, buf.length);
  }
}
//@ chunk-f9pzpnqt.js:20539-20797 fingerprint = finalizeOutput (1)
function finalizeOutput(s) {
  if (s.carryLen > 0) {
    let cb = s.carryBuf;
    if (hasPrefix_2(cb, ATTRIBUTION_SNAPSHOT_PREFIX, 0, s.carryLen))
      ((s.lastSnapSrc = cb), (s.lastSnapLen = s.carryLen));
    else sinkWrite(s.out, cb, 0, s.carryLen);
  }
  if (s.lastSnapSrc) {
    if (s.out.len > 0 && s.out.buf[s.out.len - 1] !== v) sinkWrite(s.out, buffer_4, 0, 1);
    sinkWrite(s.out, s.lastSnapSrc, 0, s.lastSnapLen);
  }
}
/**
 * 按序分页读取转录记录，累计不超过字节上限，把每页拼接后的字节交给回调；游标不前进时抛错。
 */
//@ chunk-f9pzpnqt.js:20797-21325 placement
async function streamTranscriptRecords(backend, key, maxBytes, onChunk) {
  let bytesRead = 0,
    fromSeq;
  while (bytesRead < maxBytes) {
    let records = await backend.readRecords(key, {
      order: "forward",
      maxBytes: TRANSCRIPT_READ_CHUNK_SIZE,
      ...(fromSeq !== void 0 && { fromSeq: fromSeq }),
    });
    if (!records.ok) throw Error("transcript record page failed during load", { cause: records.error });
    let chunks = [],
      chunkBytes = 0;
    for (let item of records.value.items) {
      if (bytesRead + chunkBytes + item.data.byteLength > maxBytes) break;
      (chunks.push(item.data), (chunkBytes += item.data.byteLength));
    }
    if (chunkBytes > 0) (onChunk(Buffer.concat(chunks, chunkBytes)), (bytesRead += chunkBytes));
    let nextSeq = records.value.nextSeq;
    if (nextSeq === void 0 || chunks.length < records.value.items.length) return;
    if (fromSeq !== void 0 && nextSeq <= fromSeq)
      throw Error("transcript record cursor did not advance during load");
    fromSeq = nextSeq;
  }
}
//@ chunk-f9pzpnqt.js:21325-23272 placement = readTranscriptForLoad (0.788)
async function readTranscriptForLoad(e, n, t) {
  let r = COMPACT_BOUNDARY_MARKER,
    i = TRANSCRIPT_READ_CHUNK_SIZE,
    o = {
      out: { buf: Buffer.allocUnsafe(Math.min(n, 8388608)), len: 0, cap: n + 1 },
      boundaryStartOffset: 0,
      hasPreservedSegment: !1,
      lastSnapSrc: null,
      lastSnapLen: 0,
      lastSnapBuf: void 0,
      bufFileOff: 0,
      carryLen: 0,
      carryBuf: void 0,
      straddleSnapCarryLen: 0,
      straddleSnapTailEnd: 0,
    };
  if (t !== void 0 && t.hoverRestOn) {
    let { backend: backend, key: key } = t.source,
      p = 0,
      l = (f) => {
        let d = f.length;
        p += d;
        let m = processStraddle(o, f, d),
          y;
        if (o.carryLen > 0) {
          let g = o.carryLen + (d - m);
          ((y = Buffer.allocUnsafe(g)), o.carryBuf.copy(y, 0, 0, o.carryLen), f.copy(y, o.carryLen, m, d));
        } else y = f.subarray(m, d);
        let h = scanChunkLines(o, y, r);
        (captureSnap(o, y, f, h.lastSnapStart, h.lastSnapEnd),
          captureCarry(o, y, h.trailStart),
          (o.bufFileOff += h.trailStart));
      };
    while (p < n) {
      let read = await backend.read([{ key: key, offset: p, length: Math.min(i, n - p) }]);
      if (!read.ok) {
        if (p === 0 && d7t(read.error)) {
          await streamTranscriptRecords(backend, key, n, l);
          break;
        }
        throw Error("transcript ranged read failed", { cause: read.error });
      }
      let [d] = read.value.items;
      if (!d.found) throw Error("transcript stream absent during load");
      if (d.value.length === 0) break;
      l(Buffer.from(d.value.buffer, d.value.byteOffset, d.value.length));
    }
    return (
      finalizeOutput(o),
      {
        boundaryStartOffset: o.boundaryStartOffset,
        postBoundaryBuf: o.out.buf.subarray(0, o.out.len),
        hasPreservedSegment: o.hasPreservedSegment,
      }
    );
  }
  if (typeof e !== "string")
    throw Error(
      "readTranscriptForLoad: this transcript has a storage key and no file, so it can be read only through a storage backend. The caller passed none, or tengu_hover_rest is off.",
    );
  let chunk = Buffer.allocUnsafe(i),
    fd = await open(e, "r");
  try {
    let s = 0;
    while (s < n) {
      let { bytesRead: bytesRead } = await fd.read(chunk, 0, Math.min(i, n - s), s);
      if (bytesRead === 0) break;
      s += bytesRead;
      let chunkOff = processStraddle(o, chunk, bytesRead),
        l;
      if (o.carryLen > 0) {
        let d = o.carryLen + (bytesRead - chunkOff);
        ((l = Buffer.allocUnsafe(d)),
          o.carryBuf.copy(l, 0, 0, o.carryLen),
          chunk.copy(l, o.carryLen, chunkOff, bytesRead));
      } else l = chunk.subarray(chunkOff, bytesRead);
      let f = scanChunkLines(o, l, r);
      (captureSnap(o, l, chunk, f.lastSnapStart, f.lastSnapEnd),
        captureCarry(o, l, f.trailStart),
        (o.bufFileOff += f.trailStart));
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
function buildHistorySuppressionEntry(e, n, t) {
  return {
    type: "history-suppression",
    sessionId: e,
    cause: n,
    ...(t && { vetoedAgainstAccountUuid: t }),
    ts: new Date().toISOString(),
  };
}
//@ chunk-dz3q485w.js:15117-15133 affinity
var Lo = 67108864;
//@ chunk-dz3q485w.js:15133-15191 fingerprint = resolveSessionFilePath (0.396)
function resolveSessionFilePath_2(e) {
  return e.fileSize !== void 0 && e.fileSize <= Lo;
}
//@ chunk-e6aww6q8.js:288436-288553 fingerprint = hasPrefix (1)
function hasPrefix(e, n = 0, r = e.length) {
  let s = yG(e, n, r);
  return r - s >= buffer_5.length && e.compare(buffer_5, 0, buffer_5.length, s, s + buffer_5.length) === 0;
}
//@ chunk-g54kbxqw.js:54348-54510 fingerprint = sanitizePath (0.358)
function sanitizePath_3(name) {
  let n = contentBlockTypeBucket(name),
    s = stripCacheControl_2(name),
    hash = "text" in name ? name.text : void 0;
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
