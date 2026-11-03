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
import { createHash, createHash as createHash_2 } from "crypto";
import { sep, sep as sep_2, sep as sep_3, sep as sep_4 } from "path";
import { open, lstat, lstat as lstat_2, readlink } from "fs/promises";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { freeze } from "./gitSafeEnv.js";
import { $c } from "../platformTargets.js";
import { getErrnoCode } from "../errors.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { stripTrailingDotsSpaces } from "../ignorePatterns.js";
import { uniq } from "../collections.js";
import { getFileExtensionsFromBashCommand } from "../../services/analytics/metadata.js";

//@ chunk-6vnxsn99.js:26111-26191 placement
var DEV_NULL = "/dev/null",
  ISOLATED_GIT_CONFIG_ENV = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
//@ chunk-6vnxsn99.js:26319-26471 placement
function resolveEolConversion(e, n) {
  let r = e?.eol;
  return (
    textAttrToConversion(e?.text) ??
    textAttrToConversion(e?.crlf) ??
    (r === "lf" || r === "crlf"
      ? "always"
      : n?.toLowerCase() === "input" || parseGitBool(n) === !0
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
      return !0;
    case "false":
    case "no":
    case "off":
    case "":
      return !1;
    default: {
      let match = /^\s*[+-]?(?:0x([0-9a-f]+)|(\d+))[kmg]?$/i.exec(e ?? "");
      return match === null ? null : /[^0]/.test(match[1] ?? match[2]);
    }
  }
}
//@ chunk-6vnxsn99.js:26850-26866 placement
var Et = 13,
  Be = 10;
//@ chunk-6vnxsn99.js:26866-27118 placement
function looksBinary(e) {
  let n = 0,
    r = 0;
  for (let o = 0; o < e.length; o++) {
    let s = e[o];
    if (s === Et) {
      if (e[o + 1] !== Be) return !0;
      o++;
    } else if (s === 0) return !0;
    else if (s === Be) continue;
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
  let allocUnsafe = Buffer.allocUnsafe(e.length - 1);
  e.copy(allocUnsafe, 0, 0, index);
  let o = index;
  for (let s = index; s < e.length; s++) if (e[s] !== Et || e[s + 1] !== Be) allocUnsafe[o++] = e[s];
  return allocUnsafe.subarray(0, o);
}
//@ chunk-6vnxsn99.js:27328-27451 placement
function normalizeWorktreeBytes(e, n, r) {
  if (
    n === "never" ||
    (n === "if-text" &&
      (looksBinary(e) ||
        (r !== void 0 &&
          r.includes(`\r
`) &&
          !looksBinary(r))))
  )
    return null;
  return normalizeCrlf(e);
}
//@ chunk-6vnxsn99.js:27451-27670 placement
function parseCheckAttrOutput(e) {
  let parts = e.split("\x00");
  if (parts.pop() !== "" || parts.length % 3 !== 0) return null;
  let r = new Map();
  for (let o = 0; o < parts.length; o += 3) {
    let s = parts[o],
      a = r.get(s);
    if (a === void 0) ((a = Object.create(null)), r.set(s, a));
    a[parts[o + 1]] = parts[o + 2];
  }
  return r;
}
//@ chunk-6vnxsn99.js:27707-27984 placement
var MAX_INDEX_ENTRIES = 1e6,
  MAX_PATH_BYTES = 67108864,
  MAX_EXTENSIONS = 1024,
  HASH_LENGTHS = { sha1: 20, sha256: 32 },
  HASH_CHUNK_BYTES = 8388608,
  INDEX_HEADER_BYTES = 12,
  nr = 8,
  rr = 20,
  or = 24,
  ir = 36,
  Le = 40,
  ar = 32768,
  ur = 16384,
  Fe = 4095,
  It = 16384,
  vt = 8192,
  INDEX_MODE_KINDS = new Map([
    [33188, "file"],
    [33261, "executable"],
    [40960, "symlink"],
    [57344, "gitlink"],
  ]),
  SUPPORTED_INDEX_VERSIONS = [0, 1, 2, 3],
  EXTENSION_HEADER_BYTES = 8,
  alloc = Buffer.alloc(0),
  SLASH_CODE = 47,
  DOT_CODE = 46;
/**
 * 解析 .git/index（DIRC）二进制：版本、条目、扩展（EOIE/IEOT），超限或格式不支持时返回 refused。
 */
//@ chunk-6vnxsn99.js:27984-28903 placement
async function parseGitIndex(e, n, r) {
  if (r.aborted) return { refused: "aborted" };
  let o = e.length - HASH_LENGTHS[n];
  if (o < INDEX_HEADER_BYTES || e.toString("latin1", 0, 4) !== "DIRC") return { refused: "malformed" };
  let uInt32BE = e.readUInt32BE(4);
  if (uInt32BE !== 2 && uInt32BE !== 3 && uInt32BE !== 4) return { refused: "unsupported" };
  let uInt32BE_2 = e.readUInt32BE(8);
  if (uInt32BE_2 > MAX_INDEX_ENTRIES) return { refused: "too-large" };
  let chunk = e.subarray(0, o);
  if (!De(e, o, e.length) && !(await hashBufferChunked(chunk, n)).equals(e.subarray(o)))
    return { refused: "wrong-checksum" };
  if (r.aborted) return { refused: "aborted" };
  let h = [],
    p = [],
    S = [],
    y = INDEX_HEADER_BYTES,
    T = 0;
  while (h.length < uInt32BE_2) {
    if (h.length % MAX_EXTENSIONS === 0) await Lt();
    if (r.aborted) return { refused: "aborted" };
    p.push(y);
    let w = parseIndexEntry(chunk, y, uInt32BE, HASH_LENGTHS[n], h.at(-1)?.pathBytes ?? alloc);
    if (typeof w === "string") return { refused: w };
    if (((T += w.entry.pathBytes.length), T > MAX_PATH_BYTES)) return { refused: "too-large" };
    (h.push(w.entry), S.push(w.kept), (y = w.next));
  }
  let b = validateExtensionChain(chunk, y) ?? checkIndexExtensions(chunk, y, p, S, n);
  if (b !== null) return { refused: b };
  return h.every((w, E) => isSafeIndexPath(w.pathBytes) && (E === 0 || yr(h[E - 1], w)))
    ? { entries: h }
    : { refused: "malformed" };
}
//@ chunk-6vnxsn99.js:28903-29649 placement
function parseIndexEntry(e, n, r, o, s) {
  let a = n + Le + o;
  if (a + 4 > e.length) return "malformed";
  let uInt16BE = e.readUInt16BE(a),
    h = (uInt16BE & ur) !== 0,
    p = h ? e.readUInt16BE(a + 2) : 0;
  if ((p & ~(It | vt)) !== 0 || (h && (r === 2 || p === 0))) return "unsupported";
  let S = INDEX_MODE_KINDS.get(e.readUInt32BE(n + or));
  if (S === void 0 || De(e, n + Le, a)) return "unsupported";
  let y = a + (h ? 4 : 2),
    T = uInt16BE & Fe,
    b = r === 4 ? readCompressedEntryPath(e, y, s) : readIndexEntryPath(e, n, y, T);
  if (typeof b === "string") return b;
  if (Math.min(b.pathBytes.length, Fe) !== T) return "malformed";
  return {
    entry: {
      pathBytes: b.pathBytes,
      kind: S,
      id: e.toString("hex", n + Le, a),
      stage: SUPPORTED_INDEX_VERSIONS[(uInt16BE >> 12) & 3],
      isSkipWorktree: (p & It) !== 0,
      isIntentToAdd: (p & vt) !== 0,
      stat: {
        changedSeconds: e.readUInt32BE(n),
        modifiedSeconds: e.readUInt32BE(n + nr),
        inode: e.readUInt32BE(n + rr),
        size: e.readUInt32BE(n + ir),
        isAssumedUnchanged: (uInt16BE & ar) !== 0,
      },
    },
    next: b.next,
    kept: b.kept ?? 0,
  };
}
//@ chunk-6vnxsn99.js:29649-29824 placement
function readIndexEntryPath(e, n, r, o) {
  let s = o < Fe ? r + o : e.indexOf(0, r);
  if (s === -1) return "malformed";
  let a = n + ((s - n + 8) & -8);
  return a <= e.length && De(e, s, a) ? { pathBytes: e.subarray(r, s), next: a } : "malformed";
}
//@ chunk-6vnxsn99.js:29824-30084 placement
function readCompressedEntryPath(e, n, r) {
  let o = readOffsetVarint(e, n, r.length),
    s = o === null ? -1 : e.indexOf(0, o.next);
  if (o === null || s === -1) return "malformed";
  let a = r.length - o.value;
  if (a + s - o.next > MAX_PATH_BYTES) return "too-large";
  return { pathBytes: Buffer.concat([r.subarray(0, a), e.subarray(o.next, s)]), next: s + 1, kept: a };
}
//@ chunk-6vnxsn99.js:30084-30237 placement
function readOffsetVarint(e, n, r) {
  let o = -1;
  for (let s = n; s < e.length; s++) {
    if (((o = (o + 1) * 128 + (e[s] & 127)), o > r)) return null;
    if ((e[s] & 128) === 0) return { value: o, next: s + 1 };
  }
  return null;
}
//@ chunk-6vnxsn99.js:30237-30425 placement
function isSafeIndexPath(e) {
  let n = 0;
  for (let r = 0; r <= e.length; r++)
    if (r === e.length || e[r] === SLASH_CODE) {
      let o = r - n;
      if (o === 0 || (e[n] === DOT_CODE && (o === 1 || (o === 2 && e[n + 1] === DOT_CODE)))) return !1;
      n = r + 1;
    } else if (e[r] === 0) return !1;
  return !0;
}
//@ chunk-6vnxsn99.js:30425-30523 placement
function yr(e, n) {
  let compare = Buffer.compare(e.pathBytes, n.pathBytes);
  return compare < 0 || (compare === 0 && e.stage < n.stage);
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
/**
 * 校验 EOIE/IEOT 扩展（哈希一致）。
 */
//@ chunk-6vnxsn99.js:30702-31650 placement
function checkIndexExtensions(e, n, r, o, s) {
  let a = HASH_LENGTHS[s],
    u = (O) => {
      let R = e.length - EXTENSION_HEADER_BYTES - 4 - O;
      return (
        R >= INDEX_HEADER_BYTES &&
        e.toString("latin1", R, R + 4) === "EOIE" &&
        e.readUInt32BE(R + 4) === 4 + O
      );
    },
    any = Object.values(HASH_LENGTHS).some((O) => O !== a && u(O)),
    p = u(a);
  if (any) return "unsupported";
  let S = [];
  for (let O = n; O < e.length;) {
    let uInt32BE = e.readUInt32BE(O + 4);
    (S.push({ name: e.toString("latin1", O, O + 4), at: O, size: uInt32BE }),
      (O += EXTENSION_HEADER_BYTES + uInt32BE));
  }
  let at = S.at(-1),
    T = e.length - EXTENSION_HEADER_BYTES - 4 - a;
  if (p) {
    if (at?.at !== T || at.name !== "EOIE") return "unsupported";
    let O = createHash_2(s);
    for (let F of S.slice(0, -1)) O.update(e.subarray(F.at, F.at + EXTENSION_HEADER_BYTES));
    let R = T + EXTENSION_HEADER_BYTES;
    if (e.readUInt32BE(R) !== n || !O.digest().equals(e.subarray(R + 4, R + 4 + a))) return "unsupported";
  }
  let filtered = S.filter((O) => O.name === "IEOT");
  if (filtered.length === 0) return null;
  if (!p || filtered.length > 1) return "unsupported";
  let { at: at_2, size: size } = filtered[0],
    A = at_2 + EXTENSION_HEADER_BYTES;
  if (size < 4 || (size - 4) % 8 !== 0 || e.readUInt32BE(A) !== 1) return "unsupported";
  let x = 0;
  for (let O = A + 4; O < A + size; O += 8) {
    if (e.readUInt32BE(O) !== r[x] || (o[x] ?? 0) > 0) return "unsupported";
    x += e.readUInt32BE(O + 4);
  }
  return x === r.length ? null : "unsupported";
}
//@ chunk-6vnxsn99.js:31650-31719 placement
function De(e, n, r) {
  for (let o = n; o < r; o++) if (e[o] !== 0) return !1;
  return !0;
}
//@ chunk-6vnxsn99.js:31719-31841 placement
async function hashBufferChunked(e, n) {
  let r = createHash_2(n);
  for (let o = 0; o < e.length; o += HASH_CHUNK_BYTES)
    (r.update(e.subarray(o, o + HASH_CHUNK_BYTES)), await Lt());
  return r.digest();
}
//@ chunk-6vnxsn99.js:31841-31896 placement
function Lt() {
  return new Promise((e) => setImmediate(e));
}
/**
 * 读工作区 diff 的各种上限与模式常量。
 */
//@ chunk-6vnxsn99.js:31896-32280 placement
var MAX_GIT_OUTPUT_BYTES = 268435456,
  MAX_GIT_BUFFER = 100663296,
  MAX_HELD_FILE_BYTES = 1e7,
  MAX_TOTAL_HELD_BYTES = 67108864,
  BATCH_SIZE = 500,
  Ar = 40000000,
  Rr = 200000000,
  xr = 2000000,
  DIFF_COST_PER_LINE = 32,
  Ir = 5000000,
  STAT_BATCH = 256,
  READ_CHUNK_BYTES = 1048576,
  BINARY_SNIFF_BYTES = 8000,
  MODE_FILE = 33188,
  MODE_EXECUTABLE = 33261,
  MODE_SYMLINK = 40960,
  MODE_GITLINK = 57344,
  MODE_TYPE_MASK = 61440,
  MODE_BY_KIND = {
    file: MODE_FILE,
    executable: MODE_EXECUTABLE,
    symlink: MODE_SYMLINK,
    gitlink: MODE_GITLINK,
  },
  RELEVANT_CONFIG_RE =
    "^(core\\.(autocrlf|filemode|symlinks|trustctime|checkstat|quotepath|sparsecheckout)|sparse\\.expectfilesoutsideofpatterns|extensions\\.objectformat)$";
/**
 * 不跑 git diff、直接读索引与工作区文件来计算改动（commit/work-tree/index 三方），供 diff 面板与工作区差异使用。
 */
//@ chunk-6vnxsn99.js:32280-34199 placement
async function readWorkTreeDiffViaIndex(e, n, r, o, s, a = sep_4 === "\\") {
  let u = { repoDir: e, onWindows: a, spawn: n, signal: s, deadline: Date.now() + o },
    h = weakMap.get(n);
  if (h === void 0) ((h = readIndexWithSettings(u)), weakMap.set(n, h));
  let [p, S] = await Promise.all([h, r.from === "commit" ? lsTree(u, r.revision) : new Map()]);
  if (!p || !S) return null;
  let { settings: settings, index: index } = p;
  if (r.to === "work-tree") p.workTree ??= statWorktreeEntries(u, settings, index).catch(() => null);
  let b = r.to === "index" ? { sides: index.sides, unseen: new Set() } : await p.workTree;
  if (!b) return null;
  let { sides: sides, unseen: unseen } = b,
    A =
      r.from === "index"
        ? new Map(
            [...index.sides, ...Array.from(index.intended).filter(([N]) => !sides.has(N))].filter(
              ([N]) => !unseen.has(N),
            ),
          )
        : S,
    x = [];
  for (let [N, q] of sides) {
    let K = A.get(N);
    if (K?.mode !== q.mode || K?.id !== q.id || q.bytes !== void 0) x.push(N);
  }
  for (let N of A.keys()) if (!sides.has(N)) x.push(N);
  x.sort();
  let O = new Map();
  if (
    (
      await Promise.all(x.map((N) => isUnderSymlink(u.repoDir, re(N), O, u.onWindows).catch(() => !0)))
    ).includes(!0)
  )
    return null;
  let F = await gitCheckAttr(u, x);
  if (F === null) return null;
  let P = ke(Buffer.alloc(0), settings.objectFormat),
    D = [],
    M = [],
    G = { bytes: 0 },
    B = 0,
    me = Rr,
    se = 0;
  for (let N = 0; N < x.length; N += BATCH_SIZE) {
    let sliced = x.slice(N, N + BATCH_SIZE);
    if ((await new Promise((U) => setImmediate(U)), Te(u))) B = BATCH_SIZE;
    let K =
      B < BATCH_SIZE
        ? await catFileBatch(
            u,
            sliced.flatMap((U) =>
              [A.get(U), sides.get(U), index.sides.get(U)].flatMap((j) =>
                j !== void 0 && j.mode !== MODE_GITLINK && !j.bytes && !j.uncounted && j.id !== P
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
      let j = F.get(U),
        Z = A.get(U),
        Q = sides.get(U),
        Y = index.sides.get(U)?.id ?? "",
        L = applyEolToEntry(
          Q,
          resolveEolConversion(j, settings.autocrlf),
          K.get(Y) ?? (Q?.id === Y ? Q.bytes?.toString("latin1") : void 0),
          settings.objectFormat,
        );
      if (Z?.mode === L?.mode && Z?.id === L?.id) continue;
      let [z, ee] = [entryText(Z, K), entryText(L, K)],
        ie = quoteGitPath(U, settings.quotesPaths);
      if (
        (D.push(formatRawDiffLine(Z, L, ie)),
        B >= BATCH_SIZE ||
          z === null ||
          ee === null ||
          isBinaryEntry(Z, z, j?.diff) ||
          isBinaryEntry(L, ee, j?.diff))
      ) {
        M.push(`-	-	${ie}`);
        continue;
      }
      let min = Math.min(Ar, me),
        Ae = { left: min },
        { added: added, removed: removed } = countLineChanges(z, ee, Ae);
      if (
        (M.push(`${added}	${removed}	${ie}`),
        B++,
        (me -= min - Math.max(0, Ae.left)),
        (se += min - Math.max(0, Ae.left)),
        se > Ir)
      ) {
        if (((se = 0), await new Promise((Rn) => setImmediate(Rn)), Te(u))) B = BATCH_SIZE;
      }
    }
  }
  return [...D, ...M].join(`
`);
}
//@ chunk-6vnxsn99.js:34199-34371 placement
function formatRawDiffLine(e, n, r) {
  let o = !e ? "A" : !n ? "D" : (e.mode & MODE_TYPE_MASK) !== (n.mode & MODE_TYPE_MASK) ? "T" : "M",
    s = (a) => (a?.mode ?? 0).toString(8).padStart(6, "0");
  return `:${s(e)} ${s(n)} 0000000 0000000 ${o}	${r}`;
}
//@ chunk-6vnxsn99.js:34371-34390 placement
var weakMap = new WeakMap();
//@ chunk-6vnxsn99.js:34390-34495 placement
async function readIndexWithSettings(e) {
  let n = await readObjectFormat(e),
    r = n && (await readIndexFile(e, n.objectFormat));
  return n && r && { settings: n, index: r };
}
//@ chunk-6vnxsn99.js:34495-34567 placement
function Te({ signal: signal, deadline: deadline }) {
  return signal?.aborted === !0 || Date.now() > deadline;
}
//@ chunk-6vnxsn99.js:34567-34853 placement
function runGitLiteral({ repoDir: repoDir, spawn: spawn, signal: signal, deadline: deadline }, s, a) {
  return execFileNoThrowWithCwd(gitExe(), ["--literal-pathspecs", ...freeze, ...s], {
    ...spawn,
    cwd: repoDir,
    timeout: Math.max(1, deadline - Date.now()),
    abortSignal: signal,
    preserveOutputOnError: !1,
    maxBuffer: MAX_GIT_BUFFER,
    encoding: "latin1",
    stripFinalNewline: !1,
    ...(a === void 0 ? { stdin: "ignore" } : { input: a }),
  });
}
//@ chunk-6vnxsn99.js:34853-35546 placement
async function readObjectFormat(e) {
  let { stdout: stdout, exitCode: exitCode } = await runGitLiteral(e, [
    "config",
    "-z",
    "--get-regexp",
    RELEVANT_CONFIG_RE,
  ]);
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
    trustsExecutableBit: Se(o.get("core.filemode")),
    hasSymlinks: Se(o.get("core.symlinks")),
    trustsChangeTime: Se(o.get("core.trustctime")),
    checksWholeStat: o.get("core.checkstat")?.toLowerCase() !== "minimal",
    quotesPaths: Se(o.get("core.quotepath")),
    looksAtSkippedFilesThatAreThere:
      parseGitBool(o.get("core.sparsecheckout")) === !0 &&
      parseGitBool(o.get("sparse.expectfilesoutsideofpatterns")) !== !0,
  };
}
//@ chunk-6vnxsn99.js:35546-35579 placement
function Se(e) {
  return parseGitBool(e) !== !1;
}
//@ chunk-6vnxsn99.js:35579-36465 placement
async function readIndexFile({ spawn: spawn, signal: signal }, r) {
  let GIT_INDEX_FILE = spawn.env.GIT_INDEX_FILE;
  if (GIT_INDEX_FILE === void 0) return null;
  let s;
  try {
    s = await open(GIT_INDEX_FILE, $c());
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? { entries: [], sides: new Map(), intended: new Map(), modifiedSeconds: 0 }
      : null;
  }
  try {
    let stats = await s.stat(),
      u = await readHandleBounded(s, MAX_GIT_OUTPUT_BYTES, stats.size),
      h = u.overLimit ? null : await parseGitIndex(u.bytes, r, signal ?? new AbortController().signal);
    if (h === null || "refused" in h) return null;
    let mapped = h.entries.map((entry) => ({
      path: entry.pathBytes.toString("latin1"),
      entry: entry,
      stat: entry.stat,
    }));
    if (!mapped.every(({ path: path }) => isSafeRelativePath(path))) return null;
    let mapped_2 = mapped
      .filter(({ entry: entry }) => entry.stage === 0)
      .map(({ path: path, entry: entry }) => ({
        isIntended: entry.isIntentToAdd,
        row: [path, { mode: MODE_BY_KIND[entry.kind], id: entry.id }],
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
var Fr = /^(?:\.git|git~1)[. ]*(?::|$)/i;
//@ chunk-6vnxsn99.js:36504-36755 placement
function isSafeRelativePath(e, n = sep_4 === "\\") {
  if (/^\/|\/\/|\/$/.test(e)) return !1;
  if (!/\.\.|\.git|git~1|[\\:]/i.test(e)) return !0;
  let parts = e.split(/[/\\]/);
  if (parts.some((o) => Fr.test(o))) return !1;
  return n
    ? !/[:\\]/.test(e) && parts.every((o) => stripTrailingDotsSpaces(o) !== "..")
    : !e.split("/").includes("..");
}
//@ chunk-6vnxsn99.js:36755-37075 placement
async function lsTree(e, n) {
  let { stdout: stdout, code: code } = await runGitLiteral(e, ["ls-tree", "-r", "-z", "--full-tree", n]);
  if (code !== 0) return null;
  let s = new Map();
  for (let a of stdout.split("\x00")) {
    let match = /^(\d{6}) \S+ ([0-9a-f]{40,64})\t(.+)$/s.exec(a);
    if (match) s.set(match[3], { mode: parseInt(match[1], 8), id: match[2] });
  }
  if (![...s.keys()].every((a) => isSafeRelativePath(a))) return null;
  return s;
}
/**
 * 批量检查索引条目对应的工作区文件。
 */
//@ chunk-6vnxsn99.js:37075-38069 placement
async function statWorktreeEntries(e, n, r) {
  let { repoDir: repoDir } = e,
    s = new Map(),
    a = new Set(),
    u = new Map([["", Promise.resolve(!0)]]),
    h = { bytes: 0 },
    p = [];
  for (let [S, y] of r.entries.entries()) {
    let { path: path, entry: entry, stat: stat } = y;
    if (
      entry.stage === 0 &&
      (stat.isAssumedUnchanged || (entry.isSkipWorktree && !n.looksAtSkippedFilesThatAreThere))
    )
      s.set(path, { mode: MODE_BY_KIND[entry.kind], id: entry.id });
    else if (path !== r.entries[S - 1]?.path) p.push(y);
  }
  for (let S = 0; S < p.length; S += STAT_BATCH) {
    if (Te(e)) return null;
    let sliced = p.slice(S, S + STAT_BATCH),
      T = new Map(
        await Promise.all(
          uniq(sliced.map(({ path: path }) => re(path))).map(async (E) => [
            E,
            await isRealPathWithinTeamDir(repoDir, E, u).catch(() => {
              return;
            }),
          ]),
        ),
      );
    if (e.onWindows && [...T.values()].includes(void 0)) return null;
    let results = await Promise.all(
        sliced.map(({ path: path }) =>
          T.get(re(path)) === !1
            ? "ENOTDIR"
            : T.get(re(path)) === void 0
              ? "EACCES"
              : lstat_2(joinPathLatin1(repoDir, path)).catch(getErrnoCode),
        ),
      ),
      results_2 = await Promise.all(
        sliced.map((E, A) =>
          resolveWorktreeEntry(E, results[A], {
            lookup: e,
            settings: n,
            indexModifiedSeconds: r.modifiedSeconds,
            held: h,
          }),
        ),
      );
    for (let [E, A] of results_2.entries()) {
      if (A === "cannot-tell") return null;
      if (A === "unseen") a.add(sliced[E].path);
      else if (A !== null) s.set(sliced[E].path, A);
    }
  }
  return { sides: s, unseen: a };
}
/**
 * 由 stat 结果推断工作区条目（未变用索引 id，否则读文件）。
 */
//@ chunk-6vnxsn99.js:38069-38719 placement
function resolveWorktreeEntry({ path: path, entry: entry, stat: stat }, o, s) {
  let a = { mode: MODE_BY_KIND[entry.kind], id: entry.id };
  if (o === void 0 || typeof o === "string") {
    if (o !== "ENOENT" && o !== "ENOTDIR") return "unseen";
    return entry.isSkipWorktree ? a : null;
  }
  if (o.isDirectory()) return entry.kind === "gitlink" ? a : null;
  if (!o.isFile() && !o.isSymbolicLink()) return null;
  let { settings: settings } = s,
    h = o.isSymbolicLink() || (!settings.hasSymlinks && entry.kind === "symlink"),
    p = settings.trustsExecutableBit ? (o.mode & 64) !== 0 : entry.kind === "executable",
    S = h ? MODE_SYMLINK : p ? MODE_EXECUTABLE : MODE_FILE;
  if (entry.stage === 0 && S === a.mode && isStatUnchanged(stat, o, settings, s.indexModifiedSeconds))
    return a;
  if (o.isSymbolicLink()) return hashWorktreeFile(path, S, a.id, "link", s);
  let y = o.size <= MAX_HELD_FILE_BYTES && s.held.bytes + o.size <= MAX_TOTAL_HELD_BYTES ? o.size : 0;
  return ((s.held.bytes += y), hashWorktreeFile(path, S, a.id, y, s));
}
/**
 * 读工作区文件或链接并计算对象 id。
 */
//@ chunk-6vnxsn99.js:38719-39102 placement
async function hashWorktreeFile(e, n, r, o, { lookup: lookup, settings: settings, held: held }) {
  let h = joinPathLatin1(lookup.repoDir, e);
  try {
    if (o === "link") {
      let S = await readlink(h, { encoding: "buffer" });
      return { mode: n, id: ke(S, settings.objectFormat), bytes: S };
    }
    let p = await readAndHashFile(h, n, r, lookup, settings, o);
    if (p === null || p === "cannot-tell" || !p.bytes) held.bytes -= o;
    return p;
  } catch (error) {
    held.bytes -= o === "link" ? 0 : o;
    let S = getErrnoCode(error);
    return S === "ENOENT" || S === "ENOTDIR" || S === "ELOOP" ? null : "cannot-tell";
  }
}
/**
 * 读文件内容并计算 blob id（大文件只哈希不保留）。
 */
//@ chunk-6vnxsn99.js:39102-39645 placement
async function readAndHashFile(e, n, r, o, { objectFormat: objectFormat }, a) {
  let u = await open(e, $c());
  try {
    let stats = await u.stat();
    if (!stats.isFile()) return null;
    let { size: size } = stats;
    if (size > a) {
      let update = createHash(objectFormat).update(`blob ${size}\x00`),
        allocUnsafe = Buffer.allocUnsafe(READ_CHUNK_BYTES);
      for (let w = 0; w < size;) {
        if (Te(o)) return "cannot-tell";
        let { bytesRead: bytesRead } = await u.read(allocUnsafe, 0, allocUnsafe.length, w);
        if (bytesRead === 0) break;
        (update.update(allocUnsafe.subarray(0, bytesRead)), (w += bytesRead));
      }
      return { mode: n, id: update.digest("hex"), uncounted: !0 };
    }
    let { bytes: bytes } = await readHandleBounded(u, size, size),
      y = ke(bytes, objectFormat);
    return y === r &&
      !bytes.includes(`\r
`)
      ? { mode: n, id: y }
      : { mode: n, id: y, bytes: bytes };
  } finally {
    await u.close().catch(() => {
      return;
    });
  }
}
//@ chunk-6vnxsn99.js:39645-39920 placement
function isStatUnchanged(e, n, { trustsChangeTime: trustsChangeTime, checksWholeStat: checksWholeStat }, s) {
  return (
    e.size !== 0 &&
    e.size === n.size % 4294967296 &&
    e.modifiedSeconds === Math.floor(n.mtimeMs / 1000) &&
    e.modifiedSeconds < s &&
    (!checksWholeStat ||
      ((!trustsChangeTime || e.changedSeconds === Math.floor(n.ctimeMs / 1000)) &&
        (e.inode === 0 || e.inode === n.ino % 4294967296)))
  );
}
//@ chunk-6vnxsn99.js:39920-39984 placement
function re(e) {
  return e.slice(0, Math.max(0, e.lastIndexOf("/")));
}
//@ chunk-6vnxsn99.js:39984-40249 placement
function isUnderSymlink(e, n, r, o) {
  if (n === "") return Promise.resolve(!1);
  let s = r.get(n);
  if (s === void 0)
    ((s = isUnderSymlink(e, re(n), r, o).then(
      (a) =>
        a ||
        lstat_2(joinPathLatin1(e, n)).then(
          (u) => u.isSymbolicLink(),
          (u) => {
            let h = getErrnoCode(u);
            if (h === "ENOENT" || h === "ENOTDIR" || (h === "EACCES" && !o)) return !1;
            throw u;
          },
        ),
    )),
      r.set(n, s));
  return s;
}
//@ chunk-6vnxsn99.js:40249-40452 placement = isRealPathWithinTeamDir (1)
function isRealPathWithinTeamDir(e, n, r) {
  let o = r.get(n);
  if (o === void 0)
    ((o = isRealPathWithinTeamDir(e, re(n), r).then(
      (s) =>
        s &&
        lstat_2(joinPathLatin1(e, n)).then(
          (a) => a.isDirectory(),
          (a) => {
            let code = getErrnoCode(a);
            if (code === "ENOENT" || code === "ENOTDIR") return !1;
            throw a;
          },
        ),
    )),
      r.set(n, o));
  return o;
}
//@ chunk-6vnxsn99.js:40452-40574 placement
function joinPathLatin1(e, n) {
  return Buffer.byteLength(n) === n.length
    ? e + sep_4 + n
    : Buffer.concat([Buffer.from(e + sep_4), Buffer.from(n, "latin1")]);
}
//@ chunk-6vnxsn99.js:40574-40796 placement
async function gitCheckAttr(e, n) {
  if (n.length === 0) return new Map();
  let { stdout: stdout, code: code } = await runGitLiteral(
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
      .flatMap((S) => {
        let match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(S),
          T = Number(match?.[2]);
        if (!match || T > MAX_HELD_FILE_BYTES || r.bytes + T > MAX_TOTAL_HELD_BYTES) return [];
        return ((r.bytes += T), [match[1]]);
      }),
    u = new Map();
  if (flattened.length === 0) return u;
  let { stdout: stdout, code: code } = await runGitLiteral(
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
      ),
      match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(stdout.slice(S, index));
    if (index === -1 || !match) return null;
    let b = index + 1 + Number(match[2]);
    (u.set(match[1], stdout.slice(index + 1, b)), (S = b + 1));
  }
  return u;
}
//@ chunk-6vnxsn99.js:41562-41762 placement
function applyEolToEntry(e, n, r, o) {
  if (e?.bytes === void 0 || e.mode === MODE_SYMLINK) return e;
  let s = normalizeWorktreeBytes(
    e.bytes,
    n,
    n === "if-text" &&
      r?.includes(`\r
`)
      ? Buffer.from(r, "latin1")
      : void 0,
  );
  return s === null ? e : { mode: e.mode, id: ke(s, o), bytes: s };
}
//@ chunk-6vnxsn99.js:41762-41847 placement
function ke(e, n) {
  return createHash(n).update(`blob ${e.length}\x00`).update(e).digest("hex");
}
//@ chunk-6vnxsn99.js:41847-42018 placement
function entryText(e, n) {
  if (e === void 0) return "";
  if (e.mode === MODE_GITLINK)
    return `Subproject commit ${e.id}
`;
  if (e.uncounted) return null;
  return e.bytes?.toString("latin1") ?? n.get(e.id) ?? null;
}
//@ chunk-6vnxsn99.js:42018-42158 placement
function isBinaryEntry(e, n, r) {
  if ((e?.mode === MODE_FILE || e?.mode === MODE_EXECUTABLE) && (r === "set" || r === "unset"))
    return r === "unset";
  let index = n.indexOf("\x00");
  return index !== -1 && index < BINARY_SNIFF_BYTES;
}
/**
 * 统计增删行数（Myers 差分，带预算，超出时按唯一行锚点分治）。
 */
//@ chunk-6vnxsn99.js:42158-42850 placement
function countLineChanges(e, n, r) {
  let [o, s] = getFileExtensionsFromBashCommand(e, n),
    a = { added: countLines(s), removed: countLines(o) };
  if (((r.left -= (a.added + a.removed) * DIFF_COST_PER_LINE), r.left < 0)) return a;
  let [u, h] = [Kt(o), Kt(s)],
    p = { added: 0, removed: 0 },
    S = [[0, u.length, 0, h.length]];
  for (let y = S.pop(); y !== void 0; y = S.pop()) {
    let [T = 0, b = 0, w = 0, E = 0] = y;
    while (T < b && w < E && u[T] === h[w]) (T++, w++);
    while (T < b && w < E && u[b - 1] === h[E - 1]) (b--, E--);
    let [A, x] = [b - T, E - w];
    if (A === 0 || x === 0) {
      ((p.removed += A), (p.added += x));
      continue;
    }
    let [O, R] = [u.slice(T, b), h.slice(w, E)],
      F = myersDistance(O, R, r, xr);
    if (F === null) {
      r.left -= (A + x) * DIFF_COST_PER_LINE;
      let P = r.left < 0 ? [] : uniqueLineAnchors(O, R);
      if (P.length > 0) {
        let [D, M] = [T, w];
        for (let [G, B] of P) (S.push([D, T + G, M, w + B]), (D = T + G + 1), (M = w + B + 1));
        S.push([D, b, M, E]);
        continue;
      }
      F = myersDistance(O, R, r, r.left) ?? A + x;
    }
    ((p.added += (F + x - A) / 2), (p.removed += (F - x + A) / 2));
  }
  return p;
}
/**
 * Myers 算法求编辑距离（受预算限制）。
 */
//@ chunk-6vnxsn99.js:42850-43248 placement
function myersDistance(e, n, r, o) {
  let min = Math.min(o, r.left),
    a = 0,
    min_2 = Math.min(e.length + n.length, Math.ceil(Math.sqrt(2 * Math.max(0, min)))),
    int32Array = new Int32Array(2 * min_2 + 3),
    p = min_2 + 1;
  for (let S = 0; S <= min_2 && a <= min; S++)
    for (let y = -S; y <= S; y += 2) {
      let [T, b] = [int32Array[p + y - 1], int32Array[p + y + 1]],
        w = y === -S || (y !== S && T < b) ? b : T + 1,
        E = w;
      while (E < e.length && E - y < n.length && e[E] === n[E - y]) E++;
      if (((int32Array[p + y] = E), (a += 1 + E - w), E >= e.length && E - y >= n.length))
        return ((r.left -= a), S);
    }
  return ((r.left -= a), null);
}
/**
 * 两侧唯一行的最长递增匹配（patience 锚点）。
 */
//@ chunk-6vnxsn99.js:43248-43721 placement
function uniqueLineAnchors(e, n) {
  let o = new Map();
  for (let [p, S] of n.entries()) o.set(S, o.has(S) ? -1 : p);
  let s = new Map();
  for (let [p, S] of e.entries()) s.set(S, s.has(S) ? -1 : p);
  let a = [],
    u = [];
  for (let [p, S] of s) {
    let y = o.get(p) ?? -1;
    if (S === -1 || y === -1) continue;
    let T = 0,
      b = u.length;
    while (T < b) {
      let w = (T + b) >> 1;
      if (a[u[w]].newAt < y) T = w + 1;
      else b = w;
    }
    (a.push({ oldAt: S, newAt: y, previous: T === 0 ? -1 : u[T - 1] }), (u[T] = a.length - 1));
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
  for (let r = 0; r < e.length; r++) if (e.charCodeAt(r) === 10) n++;
  return n;
}
//@ chunk-6vnxsn99.js:44170-44235 placement
function Kt(e) {
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
function quoteGitPath(e, n) {
  if (!(n ? /[^\x20-\x7e]|["\\]/ : /[^\x20-\x7e\x80-\xff]|["\\]/).test(e))
    return Buffer.from(e, "latin1").toString("utf8");
  let joined = Array.from(e, (s) => {
    let code = s.charCodeAt(0);
    return (
      C_ESCAPES.get(code) ??
      (code < 32 || code === 127 || (n && code >= 128) ? `\\${code.toString(8).padStart(3, "0")}` : s)
    );
  }).join("");
  return `"${Buffer.from(joined, "latin1").toString("utf8")}"`;
}

export { readWorkTreeDiffViaIndex, ISOLATED_GIT_CONFIG_ENV, DEV_NULL, normalizeCrlf };
