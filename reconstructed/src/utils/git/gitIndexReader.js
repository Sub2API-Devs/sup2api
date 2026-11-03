/**
 * utils/git/gitIndexReader.ts
 *
 * 2.1.316 新增：直接解析 .git/index（DIRC）二进制并结合 cat-file 批量读取，得到工作区 diff。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (57)
 * attribution: placement 57
 */
import { createHash } from "crypto";
import { sep } from "path";
import { open, lstat, readlink } from "fs/promises";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { getErrnoCode } from "../errors.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { stripTrailingDotsSpaces } from "../ignorePatterns.js";
import { uniq } from "../collections.js";
import { getFileExtensionsFromBashCommand } from "../../services/analytics/metadata.js";

//@ chunk-6vnxsn99.js:26111-26191 placement
var DEV_NULL = "/dev/null";
var ISOLATED_GIT_CONFIG_ENV = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};
//@ chunk-6vnxsn99.js:26319-26471 placement
function resolveEolConversion(e, autocrlf) {
  let eol = e?.eol;
  return (
    textAttrToConversion(e?.text) ??
    textAttrToConversion(e?.crlf) ??
    (eol === "lf" || eol === "crlf"
      ? "always"
      : autocrlf?.toLowerCase() === "input" || parseGitBool(autocrlf) === true
        ? "if-text"
        : "never")
  );
}
//@ chunk-6vnxsn99.js:26471-26607 placement
function textAttrToConversion(e) {
  switch (e) {
    case "set":
    case "input":
      return "always";
    case "unset":
      return "never";
    case "auto":
      return "if-text";
    default:
      return null;
  }
}
//@ chunk-6vnxsn99.js:26607-26850 placement
function parseGitBool(e) {
  switch (e?.toLowerCase()) {
    case "true":
    case "yes":
    case "on":
      return true;
    case "false":
    case "no":
    case "off":
    case "":
      return false;
    default: {
      let match = /^\s*[+-]?(?:0x([0-9a-f]+)|(\d+))[kmg]?$/i.exec(e ?? "");
      return match === null ? null : /[^0]/.test(match[1] ?? match[2]);
    }
  }
}
//@ chunk-6vnxsn99.js:26850-26866 placement
var CARRIAGE_RETURN_CODE = 13;
var LINE_FEED_CODE = 10;
//@ chunk-6vnxsn99.js:26866-27118 placement
function looksBinary(e) {
  let n = 0;
  let r = 0;
  for (let j = 0; j < e.length; j++) {
    let s = e[j];
    if (s === CARRIAGE_RETURN_CODE) {
      if (e[j + 1] !== LINE_FEED_CODE) return true;
      j++;
    } else if (s === 0) return true;
    else if (s === LINE_FEED_CODE) continue;
    else if (s === 127 || (s < 32 && s !== 8 && s !== 9 && s !== 12 && s !== 27)) r++;
    else n++;
  }
  if (e.at(-1) === 26) r--;
  return n >> 7 < r;
}
//@ chunk-6vnxsn99.js:27118-27328 placement
function normalizeCrlf(e) {
  let index = e.indexOf(`\r
`);
  if (index === -1) return null;
  let r = Buffer.allocUnsafe(e.length - 1);
  e.copy(r, 0, 0, index);
  let o = index;
  for (let s = index; s < e.length; s++)
    if (e[s] !== CARRIAGE_RETURN_CODE || e[s + 1] !== LINE_FEED_CODE) r[o++] = e[s];
  return r.subarray(0, o);
}
//@ chunk-6vnxsn99.js:27328-27451 placement
function normalizeWorktreeBytes(bytes, n, r) {
  if (
    n === "never" ||
    (n === "if-text" &&
      (looksBinary(bytes) ||
        (r !== undefined &&
          r.includes(`\r
`) &&
          !looksBinary(r))))
  )
    return null;
  return normalizeCrlf(bytes);
}
//@ chunk-6vnxsn99.js:27451-27670 placement
function parseCheckAttrOutput(stdout) {
  let parts = stdout.split("\x00");
  if (parts.pop() !== "" || parts.length % 3 !== 0) return null;
  let r = new Map();
  for (let o = 0; o < parts.length; o += 3) {
    let s = parts[o];
    let a = r.get(s);
    if (a === undefined) {
      a = Object.create(null);
      r.set(s, a);
    }
    a[parts[o + 1]] = parts[o + 2];
  }
  return r;
}
//@ chunk-6vnxsn99.js:27707-27984 placement
var MAX_INDEX_ENTRIES_2 = 1e6;
var MAX_PATH_BYTES = 67108864;
var MAX_EXTENSIONS = 1024;
var HASH_LENGTHS = {
  sha1: 20,
  sha256: 32,
};
var HASH_CHUNK_BYTES = 8388608;
var INDEX_HEADER_BYTES = 12;
var MAX_INDEX_ENTRIES = 8;
var INDEX_CTIME_OFFSET = 20;
var INDEX_MODE_OFFSET = 24;
var INDEX_SIZE_OFFSET = 36;
var INDEX_OID_OFFSET = 40;
var ASSUME_VALID_FLAG = 32768;
var EXTENDED_FLAG = 16384;
var PATH_LENGTH_MASK = 4095;
var SKIP_WORKTREE_FLAG = 16384;
var INTENT_TO_ADD_FLAG = 8192;
var INDEX_MODE_KINDS = new Map([
  [33188, "file"],
  [33261, "executable"],
  [40960, "symlink"],
  [57344, "gitlink"],
]);
var SUPPORTED_INDEX_VERSIONS = [0, 1, 2, 3];
var EXTENSION_HEADER_BYTES = 8;
var cr = Buffer.alloc(0);
var SLASH_CODE = 47;
var DOT_CODE = 46;
//@ chunk-6vnxsn99.js:27984-28903 placement
/**
 * 解析 .git/index（DIRC）二进制：版本、条目、扩展（EOIE/IEOT），超限或格式不支持时返回 refused。
 */
async function parseGitIndex(bytes, n, r) {
  if (r.aborted)
    return {
      refused: "aborted",
    };
  let o = bytes.length - HASH_LENGTHS[n];
  if (o < INDEX_HEADER_BYTES || bytes.toString("latin1", 0, 4) !== "DIRC")
    return {
      refused: "malformed",
    };
  let uInt32BE = bytes.readUInt32BE(4);
  if (uInt32BE !== 2 && uInt32BE !== 3 && uInt32BE !== 4)
    return {
      refused: "unsupported",
    };
  let uInt32BE_2 = bytes.readUInt32BE(8);
  if (uInt32BE_2 > MAX_INDEX_ENTRIES_2)
    return {
      refused: "too-large",
    };
  let chunk = bytes.subarray(0, o);
  if (
    !isAllZeroBytes(bytes, o, bytes.length) &&
    !(await hashBufferChunked(chunk, n)).equals(bytes.subarray(o))
  )
    return {
      refused: "wrong-checksum",
    };
  if (r.aborted)
    return {
      refused: "aborted",
    };
  let h = [];
  let p = [];
  let S = [];
  let y = INDEX_HEADER_BYTES;
  let T = 0;
  while (h.length < uInt32BE_2) {
    if (h.length % MAX_EXTENSIONS === 0) await yieldToEventLoop();
    if (r.aborted)
      return {
        refused: "aborted",
      };
    p.push(y);
    let indexEntry = parseIndexEntry(chunk, y, uInt32BE, HASH_LENGTHS[n], h.at(-1)?.pathBytes ?? cr);
    if (typeof indexEntry === "string")
      return {
        refused: indexEntry,
      };
    T += indexEntry.entry.pathBytes.length;
    if (T > MAX_PATH_BYTES)
      return {
        refused: "too-large",
      };
    h.push(indexEntry.entry);
    S.push(indexEntry.kept);
    y = indexEntry.next;
  }
  let b = validateExtensionChain(chunk, y) ?? checkIndexExtensions(chunk, y, p, S, n);
  if (b !== null)
    return {
      refused: b,
    };
  return h.every((w, E) => isSafeIndexPath(w.pathBytes) && (E === 0 || isIndexEntryBefore(h[E - 1], w)))
    ? {
        entries: h,
      }
    : {
        refused: "malformed",
      };
}
//@ chunk-6vnxsn99.js:28903-29649 placement
function parseIndexEntry(e, n, r, o, s) {
  let a = n + INDEX_OID_OFFSET + o;
  if (a + 4 > e.length) return "malformed";
  let uInt16BE = e.readUInt16BE(a);
  let h = (uInt16BE & EXTENDED_FLAG) !== 0;
  let p = h ? e.readUInt16BE(a + 2) : 0;
  if ((p & ~(SKIP_WORKTREE_FLAG | INTENT_TO_ADD_FLAG)) !== 0 || (h && (r === 2 || p === 0)))
    return "unsupported";
  let S = INDEX_MODE_KINDS.get(e.readUInt32BE(n + INDEX_MODE_OFFSET));
  if (S === undefined || isAllZeroBytes(e, n + INDEX_OID_OFFSET, a)) return "unsupported";
  let y = a + (h ? 4 : 2);
  let T = uInt16BE & PATH_LENGTH_MASK;
  let b = r === 4 ? readCompressedEntryPath(e, y, s) : readIndexEntryPath(e, n, y, T);
  if (typeof b === "string") return b;
  if (Math.min(b.pathBytes.length, PATH_LENGTH_MASK) !== T) return "malformed";
  return {
    entry: {
      pathBytes: b.pathBytes,
      kind: S,
      id: e.toString("hex", n + INDEX_OID_OFFSET, a),
      stage: SUPPORTED_INDEX_VERSIONS[(uInt16BE >> 12) & 3],
      isSkipWorktree: (p & SKIP_WORKTREE_FLAG) !== 0,
      isIntentToAdd: (p & INTENT_TO_ADD_FLAG) !== 0,
      stat: {
        changedSeconds: e.readUInt32BE(n),
        modifiedSeconds: e.readUInt32BE(n + MAX_INDEX_ENTRIES),
        inode: e.readUInt32BE(n + INDEX_CTIME_OFFSET),
        size: e.readUInt32BE(n + INDEX_SIZE_OFFSET),
        isAssumedUnchanged: (uInt16BE & ASSUME_VALID_FLAG) !== 0,
      },
    },
    next: b.next,
    kept: b.kept ?? 0,
  };
}
//@ chunk-6vnxsn99.js:29649-29824 placement
function readIndexEntryPath(e, n, r, o) {
  let s = o < PATH_LENGTH_MASK ? r + o : e.indexOf(0, r);
  if (s === -1) return "malformed";
  let a = n + ((s - n + 8) & -8);
  return a <= e.length && isAllZeroBytes(e, s, a)
    ? {
        pathBytes: e.subarray(r, s),
        next: a,
      }
    : "malformed";
}
//@ chunk-6vnxsn99.js:29824-30084 placement
function readCompressedEntryPath(e, n, r) {
  let offsetVarint = readOffsetVarint(e, n, r.length);
  let s = offsetVarint === null ? -1 : e.indexOf(0, offsetVarint.next);
  if (offsetVarint === null || s === -1) return "malformed";
  let a = r.length - offsetVarint.value;
  if (a + s - offsetVarint.next > MAX_PATH_BYTES) return "too-large";
  return {
    pathBytes: Buffer.concat([r.subarray(0, a), e.subarray(offsetVarint.next, s)]),
    next: s + 1,
    kept: a,
  };
}
//@ chunk-6vnxsn99.js:30084-30237 placement
function readOffsetVarint(e, n, r) {
  let o = -1;
  for (let s = n; s < e.length; s++) {
    o = (o + 1) * 128 + (e[s] & 127);
    if (o > r) return null;
    if ((e[s] & 128) === 0)
      return {
        value: o,
        next: s + 1,
      };
  }
  return null;
}
//@ chunk-6vnxsn99.js:30237-30425 placement
function isSafeIndexPath(pathBytes) {
  let n = 0;
  for (let j = 0; j <= pathBytes.length; j++)
    if (j === pathBytes.length || pathBytes[j] === SLASH_CODE) {
      let o = j - n;
      if (o === 0 || (pathBytes[n] === DOT_CODE && (o === 1 || (o === 2 && pathBytes[n + 1] === DOT_CODE))))
        return false;
      n = j + 1;
    } else if (pathBytes[j] === 0) return false;
  return true;
}
//@ chunk-6vnxsn99.js:30425-30523 placement
function isIndexEntryBefore(e, n) {
  let r = Buffer.compare(e.pathBytes, n.pathBytes);
  return r < 0 || (r === 0 && e.stage < n.stage);
}
//@ chunk-6vnxsn99.js:30523-30702 placement
function validateExtensionChain(e, n) {
  let r = n;
  while (r < e.length) {
    if (r + EXTENSION_HEADER_BYTES > e.length) return "malformed";
    if (e[r] < 65 || e[r] > 90) return "unsupported";
    r += EXTENSION_HEADER_BYTES + e.readUInt32BE(r + 4);
  }
  return r === e.length ? null : "malformed";
}
//@ chunk-6vnxsn99.js:30702-31650 placement
/**
 * 校验 EOIE/IEOT 扩展（哈希一致）。
 */
function checkIndexExtensions(e, n, r, o, s) {
  let a = HASH_LENGTHS[s];
  let u = (O) => {
    let R = e.length - EXTENSION_HEADER_BYTES - 4 - O;
    return (
      R >= INDEX_HEADER_BYTES && e.toString("latin1", R, R + 4) === "EOIE" && e.readUInt32BE(R + 4) === 4 + O
    );
  };
  let any = Object.values(HASH_LENGTHS).some((O) => O !== a && u(O));
  let p = u(a);
  if (any) return "unsupported";
  let S = [];
  for (let O = n; O < e.length;) {
    let uInt32BE = e.readUInt32BE(O + 4);
    S.push({
      name: e.toString("latin1", O, O + 4),
      at: O,
      size: uInt32BE,
    });
    O += EXTENSION_HEADER_BYTES + uInt32BE;
  }
  let last = S.at(-1);
  let T = e.length - EXTENSION_HEADER_BYTES - 4 - a;
  if (p) {
    if (last?.at !== T || last.name !== "EOIE") return "unsupported";
    let hash = createHash(s);
    for (let F of S.slice(0, -1)) hash.update(e.subarray(F.at, F.at + EXTENSION_HEADER_BYTES));
    let R = T + EXTENSION_HEADER_BYTES;
    if (e.readUInt32BE(R) !== n || !hash.digest().equals(e.subarray(R + 4, R + 4 + a))) return "unsupported";
  }
  let filtered = S.filter((O) => O.name === "IEOT");
  if (filtered.length === 0) return null;
  if (!p || filtered.length > 1) return "unsupported";
  let { at, size } = filtered[0];
  let A = at + EXTENSION_HEADER_BYTES;
  if (size < 4 || (size - 4) % 8 !== 0 || e.readUInt32BE(A) !== 1) return "unsupported";
  let x = 0;
  for (let O = A + 4; O < A + size; O += 8) {
    if (e.readUInt32BE(O) !== r[x] || (o[x] ?? 0) > 0) return "unsupported";
    x += e.readUInt32BE(O + 4);
  }
  return x === r.length ? null : "unsupported";
}
//@ chunk-6vnxsn99.js:31650-31719 placement
function isAllZeroBytes(e, n, r) {
  for (let o = n; o < r; o++) if (e[o] !== 0) return false;
  return true;
}
//@ chunk-6vnxsn99.js:31719-31841 placement
async function hashBufferChunked(e, n) {
  let hash = createHash(n);
  for (let o = 0; o < e.length; o += HASH_CHUNK_BYTES) {
    hash.update(e.subarray(o, o + HASH_CHUNK_BYTES));
    await yieldToEventLoop();
  }
  return hash.digest();
}
//@ chunk-6vnxsn99.js:31841-31896 placement
function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}
//@ chunk-6vnxsn99.js:31896-32280 placement
/**
 * 读工作区 diff 的各种上限与模式常量。
 */
var MAX_GIT_OUTPUT_BYTES_2 = 268435456;
var MAX_GIT_BUFFER = 100663296;
var MAX_HELD_FILE_BYTES = 1e7;
var MAX_TOTAL_HELD_BYTES = 67108864;
var BATCH_SIZE = 500;
var MAX_GIT_OUTPUT_BYTES = 40000000;
var MAX_DIFF_FILE_BYTES = 200000000;
var MAX_MYERS_EDIT_DISTANCE = 2000000;
var DIFF_COST_PER_LINE = 32;
var MAX_DIFF_LINES = 5000000;
var STAT_BATCH = 256;
var READ_CHUNK_BYTES = 1048576;
var BINARY_SNIFF_BYTES = 8000;
var MODE_FILE = 33188;
var MODE_EXECUTABLE = 33261;
var MODE_SYMLINK = 40960;
var MODE_GITLINK = 57344;
var MODE_TYPE_MASK = 61440;
var MODE_BY_KIND = {
  file: MODE_FILE,
  executable: MODE_EXECUTABLE,
  symlink: MODE_SYMLINK,
  gitlink: MODE_GITLINK,
};
var RELEVANT_CONFIG_RE =
  "^(core\\.(autocrlf|filemode|symlinks|trustctime|checkstat|quotepath|sparsecheckout)|sparse\\.expectfilesoutsideofpatterns|extensions\\.objectformat)$";
//@ chunk-6vnxsn99.js:32280-34199 placement
/**
 * 不跑 git diff、直接读索引与工作区文件来计算改动（commit/work-tree/index 三方），供 diff 面板与工作区差异使用。
 */
async function readWorkTreeDiffViaIndex(repoDir, n, r, o, signal, onWindows = sep === "\\") {
  let u = {
    repoDir,
    onWindows,
    spawn: n,
    signal,
    deadline: Date.now() + o,
  };
  let h = weakMap.get(n);
  if (h === undefined) {
    h = readIndexWithSettings(u);
    weakMap.set(n, h);
  }
  let [p, S] = await Promise.all([h, r.from === "commit" ? lsTree(u, r.revision) : new Map()]);
  if (!p || !S) return null;
  let { settings, index } = p;
  if (r.to === "work-tree") p.workTree ??= statWorktreeEntries(u, settings, index).catch(() => null);
  let b =
    r.to === "index"
      ? {
          sides: index.sides,
          unseen: new Set(),
        }
      : await p.workTree;
  if (!b) return null;
  let { sides, unseen } = b;
  let A =
    r.from === "index"
      ? new Map(
          [...index.sides, ...Array.from(index.intended).filter(([N]) => !sides.has(N))].filter(
            ([N]) => !unseen.has(N),
          ),
        )
      : S;
  let x = [];
  for (let [N, q] of sides) {
    let K = A.get(N);
    if (K?.mode !== q.mode || K?.id !== q.id || q.bytes !== undefined) x.push(N);
  }
  for (let key of A.keys()) if (!sides.has(key)) x.push(key);
  x.sort();
  let O = new Map();
  if (
    (
      await Promise.all(
        x.map((N) => isUnderSymlink(u.repoDir, dirnamePosix(N), O, u.onWindows).catch(() => true)),
      )
    ).includes(true)
  )
    return null;
  let F = await gitCheckAttr(u, x);
  if (F === null) return null;
  let P = gitBlobId(Buffer.alloc(0), settings.objectFormat);
  let D = [];
  let M = [];
  let G = {
    bytes: 0,
  };
  let B = 0;
  let me = MAX_DIFF_FILE_BYTES;
  let se = 0;
  for (let N = 0; N < x.length; N += BATCH_SIZE) {
    let sliced = x.slice(N, N + BATCH_SIZE);
    await new Promise((resolve) => setImmediate(resolve));
    if (isCancelledOrExpired(u)) B = BATCH_SIZE;
    let K =
      B < BATCH_SIZE
        ? await catFileBatch(
            u,
            sliced.flatMap((U) =>
              [A.get(U), sides.get(U), index.sides.get(U)].flatMap((j) =>
                j !== undefined && j.mode !== MODE_GITLINK && !j.bytes && !j.uncounted && j.id !== P
                  ? [j.id]
                  : [],
              ),
            ),
            G,
          )
        : new Map();
    if (K === null) return null;
    K.set(P, "");
    for (let U of sliced) {
      let j = F.get(U);
      let Z = A.get(U);
      let Q = sides.get(U);
      let id = index.sides.get(U)?.id ?? "";
      let L = applyEolToEntry(
        Q,
        resolveEolConversion(j, settings.autocrlf),
        K.get(id) ?? (Q?.id === id ? Q.bytes?.toString("latin1") : undefined),
        settings.objectFormat,
      );
      if (Z?.mode === L?.mode && Z?.id === L?.id) continue;
      let [z, ee] = [entryText(Z, K), entryText(L, K)];
      let ie = quoteGitPath(U, settings.quotesPaths);
      D.push(formatRawDiffLine(Z, L, ie));
      if (
        B >= BATCH_SIZE ||
        z === null ||
        ee === null ||
        isBinaryEntry(Z, z, j?.diff) ||
        isBinaryEntry(L, ee, j?.diff)
      ) {
        M.push(`-	-	${ie}`);
        continue;
      }
      let min = Math.min(MAX_GIT_OUTPUT_BYTES, me);
      let Ae = {
        left: min,
      };
      let { added, removed } = countLineChanges(z, ee, Ae);
      M.push(`${added}	${removed}	${ie}`);
      B++;
      me -= min - Math.max(0, Ae.left);
      se += min - Math.max(0, Ae.left);
      if (se > MAX_DIFF_LINES) {
        se = 0;
        await new Promise((resolve) => setImmediate(resolve));
        if (isCancelledOrExpired(u)) B = BATCH_SIZE;
      }
    }
  }
  return [...D, ...M].join(`
`);
}
//@ chunk-6vnxsn99.js:34199-34371 placement
function formatRawDiffLine(e, n, r) {
  let o = !e ? "A" : !n ? "D" : (e.mode & MODE_TYPE_MASK) !== (n.mode & MODE_TYPE_MASK) ? "T" : "M";
  let s = (a) => (a?.mode ?? 0).toString(8).padStart(6, "0");
  return `:${s(e)} ${s(n)} 0000000 0000000 ${o}	${r}`;
}
//@ chunk-6vnxsn99.js:34371-34390 placement
var weakMap = new WeakMap();
//@ chunk-6vnxsn99.js:34390-34495 placement
async function readIndexWithSettings(e) {
  let objectFormat = await readObjectFormat(e);
  let r = objectFormat && (await readIndexFile(e, objectFormat.objectFormat));
  return (
    objectFormat &&
    r && {
      settings: objectFormat,
      index: r,
    }
  );
}
//@ chunk-6vnxsn99.js:34495-34567 placement
function isCancelledOrExpired({ signal, deadline }) {
  return signal?.aborted === true || Date.now() > deadline;
}
//@ chunk-6vnxsn99.js:34567-34853 placement
function runGitLiteral({ repoDir, spawn, signal, deadline }, s, a) {
  return execFileNoThrowWithCwd(gitExe(), ["--literal-pathspecs", ...GIT_SAFE_GLOBAL_ARGS, ...s], {
    ...spawn,
    cwd: repoDir,
    timeout: Math.max(1, deadline - Date.now()),
    abortSignal: signal,
    preserveOutputOnError: false,
    maxBuffer: MAX_GIT_BUFFER,
    encoding: "latin1",
    stripFinalNewline: false,
    ...(a === undefined
      ? {
          stdin: "ignore",
        }
      : {
          input: a,
        }),
  });
}
//@ chunk-6vnxsn99.js:34853-35546 placement
async function readObjectFormat(e) {
  let { stdout, exitCode } = await runGitLiteral(e, ["config", "-z", "--get-regexp", RELEVANT_CONFIG_RE]);
  if (exitCode !== 0 && exitCode !== 1) return null;
  let o = new Map();
  for (let s of stdout.split("\x00")) {
    let [a = "", u] = s.split(
      `
`,
      2,
    );
    o.set(a, u ?? "true");
  }
  return {
    objectFormat: o.get("extensions.objectformat") === "sha256" ? "sha256" : "sha1",
    autocrlf: o.get("core.autocrlf") ?? null,
    trustsExecutableBit: configBoolNotFalse(o.get("core.filemode")),
    hasSymlinks: configBoolNotFalse(o.get("core.symlinks")),
    trustsChangeTime: configBoolNotFalse(o.get("core.trustctime")),
    checksWholeStat: o.get("core.checkstat")?.toLowerCase() !== "minimal",
    quotesPaths: configBoolNotFalse(o.get("core.quotepath")),
    looksAtSkippedFilesThatAreThere:
      parseGitBool(o.get("core.sparsecheckout")) === true &&
      parseGitBool(o.get("sparse.expectfilesoutsideofpatterns")) !== true,
  };
}
//@ chunk-6vnxsn99.js:35546-35579 placement
function configBoolNotFalse(e) {
  return parseGitBool(e) !== false;
}
//@ chunk-6vnxsn99.js:35579-36465 placement
async function readIndexFile({ spawn, signal }, objectFormat) {
  let GIT_INDEX_FILE = spawn.env.GIT_INDEX_FILE;
  if (GIT_INDEX_FILE === undefined) return null;
  let s;
  try {
    s = await open(GIT_INDEX_FILE, readOnlyNoFollowFlags());
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          entries: [],
          sides: new Map(),
          intended: new Map(),
          modifiedSeconds: 0,
        }
      : null;
  }
  try {
    let stats = await s.stat();
    let handleBounded = await readHandleBounded(s, MAX_GIT_OUTPUT_BYTES_2, stats.size);
    let h = handleBounded.overLimit
      ? null
      : await parseGitIndex(handleBounded.bytes, objectFormat, signal ?? new AbortController().signal);
    if (h === null || "refused" in h) return null;
    let mapped = h.entries.map((entry) => ({
      path: entry.pathBytes.toString("latin1"),
      entry,
      stat: entry.stat,
    }));
    if (!mapped.every(({ path }) => isSafeRelativePath(path))) return null;
    let mapped_2 = mapped
      .filter(({ entry }) => entry.stage === 0)
      .map(({ path, entry }) => ({
        isIntended: entry.isIntentToAdd,
        row: [
          path,
          {
            mode: MODE_BY_KIND[entry.kind],
            id: entry.id,
          },
        ],
      }));
    return {
      entries: mapped,
      sides: new Map(mapped_2.filter((y) => !y.isIntended).map((y) => y.row)),
      intended: new Map(mapped_2.filter((y) => y.isIntended).map((y) => y.row)),
      modifiedSeconds: Math.floor(stats.mtimeMs / 1000),
    };
  } catch {
    return null;
  } finally {
    await s.close().catch(() => {
      return;
    });
  }
}
//@ chunk-6vnxsn99.js:36465-36504 placement
var GIT_METADATA_NAME_RE = /^(?:\.git|git~1)[. ]*(?::|$)/i;
//@ chunk-6vnxsn99.js:36504-36755 placement
function isSafeRelativePath(e, n = sep === "\\") {
  if (/^\/|\/\/|\/$/.test(e)) return false;
  if (!/\.\.|\.git|git~1|[\\:]/i.test(e)) return true;
  let parts = e.split(/[/\\]/);
  if (parts.some((o) => GIT_METADATA_NAME_RE.test(o))) return false;
  return n
    ? !/[:\\]/.test(e) && parts.every((o) => stripTrailingDotsSpaces(o) !== "..")
    : !e.split("/").includes("..");
}
//@ chunk-6vnxsn99.js:36755-37075 placement
async function lsTree(e, revision) {
  let { stdout, code } = await runGitLiteral(e, ["ls-tree", "-r", "-z", "--full-tree", revision]);
  if (code !== 0) return null;
  let s = new Map();
  for (let a of stdout.split("\x00")) {
    let match = /^(\d{6}) \S+ ([0-9a-f]{40,64})\t(.+)$/s.exec(a);
    if (match)
      s.set(match[3], {
        mode: parseInt(match[1], 8),
        id: match[2],
      });
  }
  if (![...s.keys()].every((key) => isSafeRelativePath(key))) return null;
  return s;
}
//@ chunk-6vnxsn99.js:37075-38069 placement
/**
 * 批量检查索引条目对应的工作区文件。
 */
async function statWorktreeEntries(e, settings, index) {
  let { repoDir } = e;
  let s = new Map();
  let a = new Set();
  let u = new Map([["", Promise.resolve(true)]]);
  let held = {
    bytes: 0,
  };
  let p = [];
  for (let [S, y] of index.entries.entries()) {
    let { path, entry, stat } = y;
    if (
      entry.stage === 0 &&
      (stat.isAssumedUnchanged || (entry.isSkipWorktree && !settings.looksAtSkippedFilesThatAreThere))
    )
      s.set(path, {
        mode: MODE_BY_KIND[entry.kind],
        id: entry.id,
      });
    else if (path !== index.entries[S - 1]?.path) p.push(y);
  }
  for (let S = 0; S < p.length; S += STAT_BATCH) {
    if (isCancelledOrExpired(e)) return null;
    let sliced = p.slice(S, S + STAT_BATCH);
    let T = new Map(
      await Promise.all(
        uniq(sliced.map(({ path }) => dirnamePosix(path))).map(async (E) => [
          E,
          await isRealPathWithinTeamDir(repoDir, E, u).catch(() => {
            return;
          }),
        ]),
      ),
    );
    if (e.onWindows && [...T.values()].includes(undefined)) return null;
    let results = await Promise.all(
      sliced.map(({ path }) =>
        T.get(dirnamePosix(path)) === false
          ? "ENOTDIR"
          : T.get(dirnamePosix(path)) === undefined
            ? "EACCES"
            : lstat(joinPathLatin1(repoDir, path)).catch(getErrnoCode),
      ),
    );
    let results_2 = await Promise.all(
      sliced.map((E, A) =>
        resolveWorktreeEntry(E, results[A], {
          lookup: e,
          settings,
          indexModifiedSeconds: index.modifiedSeconds,
          held,
        }),
      ),
    );
    for (let [E, A] of results_2.entries()) {
      if (A === "cannot-tell") return null;
      if (A === "unseen") a.add(sliced[E].path);
      else if (A !== null) s.set(sliced[E].path, A);
    }
  }
  return {
    sides: s,
    unseen: a,
  };
}
//@ chunk-6vnxsn99.js:38069-38719 placement
/**
 * 由 stat 结果推断工作区条目（未变用索引 id，否则读文件）。
 */
function resolveWorktreeEntry({ path, entry, stat }, o, s) {
  let a = {
    mode: MODE_BY_KIND[entry.kind],
    id: entry.id,
  };
  if (o === undefined || typeof o === "string") {
    if (o !== "ENOENT" && o !== "ENOTDIR") return "unseen";
    return entry.isSkipWorktree ? a : null;
  }
  if (o.isDirectory()) return entry.kind === "gitlink" ? a : null;
  if (!o.isFile() && !o.isSymbolicLink()) return null;
  let { settings } = s;
  let h = o.isSymbolicLink() || (!settings.hasSymlinks && entry.kind === "symlink");
  let p = settings.trustsExecutableBit ? (o.mode & 64) !== 0 : entry.kind === "executable";
  let S = h ? MODE_SYMLINK : p ? MODE_EXECUTABLE : MODE_FILE;
  if (entry.stage === 0 && S === a.mode && isStatUnchanged(stat, o, settings, s.indexModifiedSeconds))
    return a;
  if (o.isSymbolicLink()) return hashWorktreeFile(path, S, a.id, "link", s);
  let size = o.size <= MAX_HELD_FILE_BYTES && s.held.bytes + o.size <= MAX_TOTAL_HELD_BYTES ? o.size : 0;
  s.held.bytes += size;
  return hashWorktreeFile(path, S, a.id, size, s);
}
//@ chunk-6vnxsn99.js:38719-39102 placement
/**
 * 读工作区文件或链接并计算对象 id。
 */
async function hashWorktreeFile(path, mode, id, o, { lookup, settings, held }) {
  let h = joinPathLatin1(lookup.repoDir, path);
  try {
    if (o === "link") {
      let S = await readlink(h, {
        encoding: "buffer",
      });
      return {
        mode,
        id: gitBlobId(S, settings.objectFormat),
        bytes: S,
      };
    }
    let p = await readAndHashFile(h, mode, id, lookup, settings, o);
    if (p === null || p === "cannot-tell" || !p.bytes) held.bytes -= o;
    return p;
  } catch (error) {
    held.bytes -= o === "link" ? 0 : o;
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP" ? null : "cannot-tell";
  }
}
//@ chunk-6vnxsn99.js:39102-39645 placement
/**
 * 读文件内容并计算 blob id（大文件只哈希不保留）。
 */
async function readAndHashFile(e, mode, r, lookup, { objectFormat }, a) {
  let u = await open(e, readOnlyNoFollowFlags());
  try {
    let stats = await u.stat();
    if (!stats.isFile()) return null;
    let { size } = stats;
    if (size > a) {
      let T = createHash(objectFormat).update(`blob ${size}\x00`);
      let b = Buffer.allocUnsafe(READ_CHUNK_BYTES);
      for (let w = 0; w < size;) {
        if (isCancelledOrExpired(lookup)) return "cannot-tell";
        let { bytesRead } = await u.read(b, 0, b.length, w);
        if (bytesRead === 0) break;
        T.update(b.subarray(0, bytesRead));
        w += bytesRead;
      }
      return {
        mode,
        id: T.digest("hex"),
        uncounted: true,
      };
    }
    let { bytes } = await readHandleBounded(u, size, size);
    let y = gitBlobId(bytes, objectFormat);
    return y === r &&
      !bytes.includes(`\r
`)
      ? {
          mode,
          id: y,
        }
      : {
          mode,
          id: y,
          bytes,
        };
  } finally {
    await u.close().catch(() => {
      return;
    });
  }
}
//@ chunk-6vnxsn99.js:39645-39920 placement
function isStatUnchanged(stat, n, { trustsChangeTime, checksWholeStat }, indexModifiedSeconds) {
  return (
    stat.size !== 0 &&
    stat.size === n.size % 4294967296 &&
    stat.modifiedSeconds === Math.floor(n.mtimeMs / 1000) &&
    stat.modifiedSeconds < indexModifiedSeconds &&
    (!checksWholeStat ||
      ((!trustsChangeTime || stat.changedSeconds === Math.floor(n.ctimeMs / 1000)) &&
        (stat.inode === 0 || stat.inode === n.ino % 4294967296)))
  );
}
//@ chunk-6vnxsn99.js:39920-39984 placement
function dirnamePosix(path) {
  return path.slice(0, Math.max(0, path.lastIndexOf("/")));
}
//@ chunk-6vnxsn99.js:39984-40249 placement
function isUnderSymlink(e, n, r, o) {
  if (n === "") return Promise.resolve(false);
  let s = r.get(n);
  if (s === undefined) {
    s = isUnderSymlink(e, dirnamePosix(n), r, o).then(
      (a) =>
        a ||
        lstat(joinPathLatin1(e, n)).then(
          (u) => u.isSymbolicLink(),
          (error) => {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || (errnoCode === "EACCES" && !o))
              return false;
            throw error;
          },
        ),
    );
    r.set(n, s);
  }
  return s;
}
//@ chunk-6vnxsn99.js:40249-40452 placement = isRealPathWithinTeamDir (1)
function isRealPathWithinTeamDir(e, n, r) {
  let o = r.get(n);
  if (o === undefined) {
    o = isRealPathWithinTeamDir(e, dirnamePosix(n), r).then(
      (s) =>
        s &&
        lstat(joinPathLatin1(e, n)).then(
          (a) => a.isDirectory(),
          (error) => {
            let code = getErrnoCode(error);
            if (code === "ENOENT" || code === "ENOTDIR") return false;
            throw error;
          },
        ),
    );
    r.set(n, o);
  }
  return o;
}
//@ chunk-6vnxsn99.js:40452-40574 placement
function joinPathLatin1(repoDir, n) {
  return Buffer.byteLength(n) === n.length
    ? repoDir + sep + n
    : Buffer.concat([Buffer.from(repoDir + sep), Buffer.from(n, "latin1")]);
}
//@ chunk-6vnxsn99.js:40574-40796 placement
async function gitCheckAttr(e, n) {
  if (n.length === 0) return new Map();
  let { stdout, code } = await runGitLiteral(
    e,
    ["check-attr", "-z", "--stdin", "text", "crlf", "eol", "diff"],
    Buffer.from(n.map((s) => `${s}\x00`).join(""), "latin1"),
  );
  return code === 0 ? parseCheckAttrOutput(stdout) : null;
}
//@ chunk-6vnxsn99.js:40796-41562 placement
async function catFileBatch(e, n, r) {
  let o = uniq(n);
  if (o.length === 0) return new Map();
  let s = await runGitLiteral(
    e,
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    Buffer.from(
      o
        .map(
          (S) => `${S}
`,
        )
        .join(""),
    ),
  );
  if (s.code !== 0 || / missing$/m.test(s.stdout)) return null;
  let flattened = s.stdout
    .split(
      `
`,
    )
    .flatMap((line) => {
      let match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(line);
      let T = Number(match?.[2]);
      if (!match || T > MAX_HELD_FILE_BYTES || r.bytes + T > MAX_TOTAL_HELD_BYTES) return [];
      r.bytes += T;
      return [match[1]];
    });
  let u = new Map();
  if (flattened.length === 0) return u;
  let { stdout, code } = await runGitLiteral(
    e,
    ["cat-file", "--batch"],
    Buffer.from(
      flattened
        .map(
          (S) => `${S}
`,
        )
        .join(""),
    ),
  );
  if (code !== 0) return null;
  for (let S = 0; S < stdout.length;) {
    let index = stdout.indexOf(
      `
`,
      S,
    );
    let match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(stdout.slice(S, index));
    if (index === -1 || !match) return null;
    let b = index + 1 + Number(match[2]);
    u.set(match[1], stdout.slice(index + 1, b));
    S = b + 1;
  }
  return u;
}
//@ chunk-6vnxsn99.js:41562-41762 placement
function applyEolToEntry(e, eolConversion, r, objectFormat) {
  if (e?.bytes === undefined || e.mode === MODE_SYMLINK) return e;
  let s = normalizeWorktreeBytes(
    e.bytes,
    eolConversion,
    eolConversion === "if-text" &&
      r?.includes(`\r
`)
      ? Buffer.from(r, "latin1")
      : undefined,
  );
  return s === null
    ? e
    : {
        mode: e.mode,
        id: gitBlobId(s, objectFormat),
        bytes: s,
      };
}
//@ chunk-6vnxsn99.js:41762-41847 placement
function gitBlobId(e, objectFormat) {
  return createHash(objectFormat).update(`blob ${e.length}\x00`).update(e).digest("hex");
}
//@ chunk-6vnxsn99.js:41847-42018 placement
function entryText(e, n) {
  if (e === undefined) return "";
  if (e.mode === MODE_GITLINK)
    return `Subproject commit ${e.id}
`;
  if (e.uncounted) return null;
  return e.bytes?.toString("latin1") ?? n.get(e.id) ?? null;
}
//@ chunk-6vnxsn99.js:42018-42158 placement
function isBinaryEntry(e, n, diff) {
  if ((e?.mode === MODE_FILE || e?.mode === MODE_EXECUTABLE) && (diff === "set" || diff === "unset"))
    return diff === "unset";
  let index = n.indexOf("\x00");
  return index !== -1 && index < BINARY_SNIFF_BYTES;
}
//@ chunk-6vnxsn99.js:42158-42850 placement
/**
 * 统计增删行数（Myers 差分，带预算，超出时按唯一行锚点分治）。
 */
function countLineChanges(command, simulatedSedEditFilePath, r) {
  let [o, s] = getFileExtensionsFromBashCommand(command, simulatedSedEditFilePath);
  let a = {
    added: countLines(s),
    removed: countLines(o),
  };
  r.left -= (a.added + a.removed) * DIFF_COST_PER_LINE;
  if (r.left < 0) return a;
  let [u, h] = [splitKeepingNewlines(o), splitKeepingNewlines(s)];
  let p = {
    added: 0,
    removed: 0,
  };
  let S = [[0, u.length, 0, h.length]];
  for (let y = S.pop(); y !== undefined; y = S.pop()) {
    let [T = 0, b = 0, w = 0, E = 0] = y;
    while (T < b && w < E && u[T] === h[w]) {
      T++;
      w++;
    }
    while (T < b && w < E && u[b - 1] === h[E - 1]) {
      b--;
      E--;
    }
    let [A, x] = [b - T, E - w];
    if (A === 0 || x === 0) {
      p.removed += A;
      p.added += x;
      continue;
    }
    let [O, R] = [u.slice(T, b), h.slice(w, E)];
    let F = myersDistance(O, R, r, MAX_MYERS_EDIT_DISTANCE);
    if (F === null) {
      r.left -= (A + x) * DIFF_COST_PER_LINE;
      let P = r.left < 0 ? [] : uniqueLineAnchors(O, R);
      if (P.length > 0) {
        let [D, M] = [T, w];
        for (let [G, B] of P) {
          S.push([D, T + G, M, w + B]);
          D = T + G + 1;
          M = w + B + 1;
        }
        S.push([D, b, M, E]);
        continue;
      }
      F = myersDistance(O, R, r, r.left) ?? A + x;
    }
    p.added += (F + x - A) / 2;
    p.removed += (F - x + A) / 2;
  }
  return p;
}
//@ chunk-6vnxsn99.js:42850-43248 placement
/**
 * Myers 算法求编辑距离（受预算限制）。
 */
function myersDistance(e, n, r, o) {
  let min = Math.min(o, r.left);
  let a = 0;
  let min_2 = Math.min(e.length + n.length, Math.ceil(Math.sqrt(2 * Math.max(0, min))));
  let int32Array = new Int32Array(2 * min_2 + 3);
  let p = min_2 + 1;
  for (let j = 0; j <= min_2 && a <= min; j++)
    for (let y = -j; y <= j; y += 2) {
      let [T, b] = [int32Array[p + y - 1], int32Array[p + y + 1]];
      let w = y === -j || (y !== j && T < b) ? b : T + 1;
      let E = w;
      while (E < e.length && E - y < n.length && e[E] === n[E - y]) E++;
      int32Array[p + y] = E;
      a += 1 + E - w;
      if (E >= e.length && E - y >= n.length) {
        r.left -= a;
        return j;
      }
    }
  r.left -= a;
  return null;
}
//@ chunk-6vnxsn99.js:43248-43721 placement
/**
 * 两侧唯一行的最长递增匹配（patience 锚点）。
 */
function uniqueLineAnchors(e, n) {
  let o = new Map();
  for (let [p, S] of n.entries()) o.set(S, o.has(S) ? -1 : p);
  let s = new Map();
  for (let [p, S] of e.entries()) s.set(S, s.has(S) ? -1 : p);
  let a = [];
  let u = [];
  for (let [p, S] of s) {
    let y = o.get(p) ?? -1;
    if (S === -1 || y === -1) continue;
    let T = 0;
    let b = u.length;
    while (T < b) {
      let w = (T + b) >> 1;
      if (a[u[w]].newAt < y) T = w + 1;
      else b = w;
    }
    a.push({
      oldAt: S,
      newAt: y,
      previous: T === 0 ? -1 : u[T - 1],
    });
    u[T] = a.length - 1;
  }
  let h = [];
  for (let p = u.at(-1) ?? -1; p !== -1; p = a[p].previous) h.push([a[p].oldAt, a[p].newAt]);
  return h.reverse();
}
//@ chunk-6vnxsn99.js:44057-44170 placement
function countLines(e) {
  let n =
    e === "" ||
    e.endsWith(`
`)
      ? 0
      : 1;
  for (let j = 0; j < e.length; j++) if (e.charCodeAt(j) === 10) n++;
  return n;
}
//@ chunk-6vnxsn99.js:44170-44235 placement
function splitKeepingNewlines(e) {
  return e === "" ? [] : (e.match(/[^\n]*\n|[^\n]+$/g) ?? []);
}
//@ chunk-6vnxsn99.js:44235-44351 placement
var C_ESCAPES = new Map([
  [7, "\\a"],
  [8, "\\b"],
  [9, "\\t"],
  [10, "\\n"],
  [11, "\\v"],
  [12, "\\f"],
  [13, "\\r"],
  [34, '\\"'],
  [92, "\\\\"],
]);
//@ chunk-6vnxsn99.js:44351-44679 placement
function quoteGitPath(e, quotesPaths) {
  if (!(quotesPaths ? /[^\x20-\x7e]|["\\]/ : /[^\x20-\x7e\x80-\xff]|["\\]/).test(e))
    return Buffer.from(e, "latin1").toString("utf8");
  let joined = Array.from(e, (s) => {
    let code = s.charCodeAt(0);
    return (
      C_ESCAPES.get(code) ??
      (code < 32 || code === 127 || (quotesPaths && code >= 128)
        ? `\\${code.toString(8).padStart(3, "0")}`
        : s)
    );
  }).join("");
  return `"${Buffer.from(joined, "latin1").toString("utf8")}"`;
}
export { readWorkTreeDiffViaIndex, ISOLATED_GIT_CONFIG_ENV, DEV_NULL, normalizeCrlf };
