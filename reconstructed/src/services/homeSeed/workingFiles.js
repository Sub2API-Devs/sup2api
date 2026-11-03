/**
 * services/homeSeed/workingFiles.ts
 *
 * 云会话工作文件（CLAUDE.md、rules、output-styles）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (16), chunk-wgxf9vhj.js (8)
 * attribution: placement 23, layout 1
 */
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  relative,
  relative as relative_2,
  relative as relative_3,
  posix,
} from "path";
import { lstat, lstat as lstat_2, realpath, realpath as realpath_2, open } from "fs/promises";
import { MAX_WORKING_FILE_BYTES } from "../syncedFiles/syncedFileSyncer.js";
import { readJSONLFile } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { rc } from "../../utils/pathClassification.js";
import { $c } from "../../utils/platformTargets.js";
import { getErrnoCode } from "../../utils/errors.js";
import { lexMarkdown } from "../../utils/claudemd.js";
import { hasUnvettedInclude, escapeAtSigns, isBackslashEscaped } from "../../utils/claudemdIncludes.js";
import { firstLineOf, isWellFormedString } from "../../utils/stringUtils.js";
import { joined_5 } from "../../utils/teleport/seedPaths.js";
import { hasWindowsUnsafeSegment } from "../../utils/windowsPathNames.js";
import { nfcLowerNfc } from "../../utils/teleport/remoteTaskLabels.js";

//@ chunk-axmbhcjg.js:1940-2111 placement
function getWorkingFileSkipReason(e, n = MAX_WORKING_FILE_BYTES) {
  if (e.isSymbolicLink()) return "symlink";
  if (!e.isFile()) return "not_regular_file";
  if (e.nlink > 1) return "hard_link";
  if (e.size > n) return "too_large";
  return null;
}
//@ chunk-axmbhcjg.js:2111-2182 placement
function un(e) {
  return e === "" || e === ".." || e.startsWith(`..${sep_2}`) || isAbsolute(e);
}
/**
 * 读取已打开的工作文件内容与元数据；读到的字节少于 stat 给出的大小时视为文件已变更并跳过。
 */
//@ chunk-axmbhcjg.js:2332-2728 placement
async function readWorkingFileContent(e, n, r) {
  let o = await readJSONLFile(e, Number(n.size));
  if (BigInt(o.length) < n.size)
    return (
      logForDebugging(
        `working file ${r}: ${o.length} of the ${n.size} bytes that its stat promised came, with no error; skipped as changed`,
      ),
      { kind: "skip", skipped: { path: r, reason: "changed" } }
    );
  return {
    kind: "read",
    content: o,
    mode: Number(n.mode) & 511,
    dev: n.dev,
    ino: n.ino,
    mtimeMs: Number(n.mtimeNs) / 1e6,
    ctimeMs: Number(n.ctimeNs) / 1e6,
  };
}
/**
 * 安全读取工作文件：拒绝符号链接、非常规文件、硬链接、过大、不可读、真实路径在根外以及打开前后变更的文件；返回内容或跳过原因。
 */
//@ chunk-axmbhcjg.js:2728-3524 placement
async function readWorkingFile(
  baseDir,
  rootDir,
  relPath,
  dirHandle = null,
  maxBytes = MAX_WORKING_FILE_BYTES,
) {
  try {
    if (dirHandle !== null) return await readWorkingFileFromDir(dirHandle, relPath, maxBytes);
    let fullPath = join_2(baseDir, relPath),
      lstat = await lstat_2(fullPath, { bigint: !0 }),
      skipReason = getWorkingFileSkipReason(lstat, maxBytes);
    if (skipReason !== null) return { kind: "skip", skipped: { path: relPath, reason: skipReason } };
    if (rc(fullPath)) return { kind: "skip", skipped: { path: relPath, reason: "unreadable" } };
    if (un(relative_2(rootDir, await realpath_2(fullPath))))
      return { kind: "skip", skipped: { path: relPath, reason: "outside_root" } };
    let handle = await open(fullPath, $c());
    try {
      let stats = await handle.stat({ bigint: !0 });
      if (stats.dev !== lstat.dev || stats.ino !== lstat.ino)
        return { kind: "skip", skipped: { path: relPath, reason: "changed" } };
      if (stats.size > maxBytes) return { kind: "skip", skipped: { path: relPath, reason: "too_large" } };
      return await readWorkingFileContent(handle, stats, relPath);
    } finally {
      await handle.close();
    }
  } catch (error) {
    let u = getErrnoCode(error),
      d = u === "ELOOP" || u === "EMLINK" || u === "WORKING_PARENT_NOT_DIRECTORY" ? "symlink" : "unreadable";
    return {
      kind: "skip",
      skipped: { path: relPath, reason: d },
      ...(d === "unreadable" && u !== void 0 && { errnoCode: u }),
    };
  }
}
//@ chunk-axmbhcjg.js:3524-3728 placement
async function readWorkingFileFromDir(e, n, r) {
  let open = await e.open(n, $c());
  try {
    let stats = await open.stat({ bigint: !0 }),
      s = getWorkingFileSkipReason(stats, r);
    if (s !== null) return { kind: "skip", skipped: { path: n, reason: s } };
    return await readWorkingFileContent(open, stats, n);
  } finally {
    await open.close();
  }
}
//@ chunk-axmbhcjg.js:3728-3773 placement
var He = /(^|[\s\][])@(?=((?:[^\s\\]|\\ )+))/g;
//@ chunk-axmbhcjg.js:3773-3926 placement
function escapeUnvettedIncludes(e, n = oe, r) {
  let replaced = e.replace(
      /\r\n?/g,
      `
`,
    ),
    i =
      r === void 0
        ? n
        : (u) => {
            let d = n(u);
            if (!d) r.push(u);
            return d;
          },
    s = rebuildWithEscapes(replaced, lexMarkdown(replaced), escapeAtSignsOutsideFences, i);
  return hasUnvettedInclude(s, n) ? escapeAtSigns(s) : s;
}
//@ chunk-axmbhcjg.js:3926-3940 placement
var oe = () => !1;
//@ chunk-axmbhcjg.js:3940-4223 placement
function escapeTokenIncludes(e, n) {
  if (e.type === "code" || e.type === "codespan" || e.type === "escape") return e.raw;
  if (e.type === "html") return escapeHtmlCommentIncludes(e.raw, n);
  let r = [...(e.tokens ?? []), ...(e.items ?? [])];
  if (r.length === 0) return e.type === "text" ? ot(e.raw, n) : e.raw;
  let o = rebuildWithEscapes(e.raw, r, (i) => i, n);
  return e.type === "text" ? ot(o, n) : o;
}
//@ chunk-axmbhcjg.js:4223-4399 placement
function rebuildWithEscapes(e, n, r, o) {
  let i = "",
    s = 0;
  for (let u of n) {
    let index = e.indexOf(u.raw, s);
    if (index === -1) return i + escapeAtSignsOutsideFences(e.slice(s));
    ((i += r(e.slice(s, index)) + escapeTokenIncludes(u, o)), (s = index + u.raw.length));
  }
  return i + r(e.slice(s));
}
//@ chunk-axmbhcjg.js:4399-4467 placement
function ot(e, n) {
  return e.replace(He, (r, o, i) => (n(me(i)) ? r : `${o}\\@`));
}
//@ chunk-axmbhcjg.js:4467-4521 placement
function me(e) {
  return firstLineOf(e, "#").replaceAll("\\ ", " ");
}
/**
 * 在 HTML 注释残余文本中找出未审查的 @ 引用，并在原文对应位置前加反斜杠转义。
 */
//@ chunk-axmbhcjg.js:4521-5082 placement
function escapeHtmlCommentIncludes(text, isAllowed) {
  let trimStart = text.trimStart();
  if (!(trimStart.startsWith("<!--") && trimStart.includes("-->"))) return text;
  let segments = [],
    residue = "",
    rawPos = 0;
  for (let d of text.matchAll(/<!--[\s\S]*?-->/g))
    (segments.push({ rawStart: rawPos, residueStart: residue.length }),
      (residue += text.slice(rawPos, d.index)),
      (rawPos = d.index + d[0].length));
  return (
    segments.push({ rawStart: rawPos, residueStart: residue.length }),
    (residue += text.slice(rawPos)),
    [...residue.matchAll(He)]
      .filter((d) => !isAllowed(me(d[2] ?? "")))
      .map((d) => {
        let f = d.index + (d[1] ?? "").length,
          { rawStart: rawStart, residueStart: residueStart } = segments.findLast(
            (y) => y.residueStart <= f,
          ) ?? { rawStart: 0, residueStart: 0 };
        return rawStart + (f - residueStart);
      })
      .reduceRight((d, f) => `${d.slice(0, f)}\\${d.slice(f)}`, text)
  );
}
//@ chunk-axmbhcjg.js:5082-5338 layout
function escapeAtSignsOutsideFences(e) {
  let n = null;
  return e
    .split(
      `
`,
    )
    .map((r) => {
      let o = /^[\s>]*(`{3,}|~{3,})/.exec(r)?.[1] ?? null;
      if (n === null) {
        if (o === null) return escapeStandaloneAtSigns(r);
        return ((n = o), r);
      }
      if (o !== null && o[0] === n[0] && o.length >= n.length && /^[\s>]*[`~]+\s*$/.test(r)) n = null;
      return r;
    }).join(`
`);
}
//@ chunk-axmbhcjg.js:5338-5433 placement
function escapeStandaloneAtSigns(e) {
  return e.replace(/@/g, (n, r) =>
    isBackslashEscaped(e, r) || /[\p{L}\p{N}]/u.test(e[r - 1] ?? "") ? n : "\\@",
  );
}
//@ chunk-axmbhcjg.js:5433-5490 placement
function hasMarkdownLinks(e) {
  return Object.keys(lexMarkdown(e).links).length > 0;
}
//@ chunk-wgxf9vhj.js:367-840 placement
var dir = posix.dirname(joined_5),
  l = "/mnt/user-data/working",
  joined = posix.join(l, joined_5),
  O7e = 32,
  uue = 524288,
  Sln = 2097152,
  FOo = 200,
  E = 237,
  a = 4,
  CLAUDE_MD = "CLAUDE.md",
  RULES = "rules",
  OUTPUT_STYLES = "output-styles",
  SETTINGS_JSON = "settings.json",
  e = ".md",
  p =
    /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u2024-\u2026\u2044\u2215\u2216\u2236\u2571\u2572\u27CB\u27CD\u29F5\u29F8\u29F9\u02D0\u05C3\u0589\uA789\uFE13\uFE52\uFE55\uFE68\uFF0E\uFF0F\uFF1A\uFF3C\uFF61\u3002]|(?!\u0020)\p{Zs}/u,
  c = /^\p{M}/u;
//@ chunk-wgxf9vhj.js:840-1046 placement
function isValidWorkingFileName(t) {
  return (
    t !== "" &&
    t === t.trim() &&
    Buffer.byteLength(t, "utf8") <= E &&
    !t.startsWith(".") &&
    !hasWindowsUnsafeSegment(t) &&
    !t.includes("\\") &&
    !p.test(t) &&
    !c.test(t) &&
    !t.endsWith("~") &&
    !t.endsWith(".swp") &&
    !t.endsWith(".tmp")
  );
}
//@ chunk-wgxf9vhj.js:1046-1100 placement
function u(t) {
  return t.length > e.length && t.endsWith(e);
}
//@ chunk-wgxf9vhj.js:1100-1130 placement
function wln(t) {
  return nfcLowerNfc(t);
}
//@ chunk-wgxf9vhj.js:1130-1161 placement
function M(t) {
  return u(wln(t));
}
//@ chunk-wgxf9vhj.js:1161-1488 placement
function classifyWorkingFile(t) {
  if (t.length > FOo || !isWellFormedString(t) || t.normalize("NFC") !== t) return null;
  let parts = t.split("/");
  if (!parts.every(isValidWorkingFileName)) return null;
  let [i, ...o] = parts;
  if (o.length === 0) return i === CLAUDE_MD ? "claude_md" : null;
  let sliced = o.slice(0, -1),
    _ = o.at(-1) ?? "";
  if (!u(_) || sliced.some(M)) return null;
  if (o.length > a) return null;
  return i === RULES ? "rule" : i === OUTPUT_STYLES ? "output_style" : null;
}
//@ chunk-wgxf9vhj.js:1488-1525 placement
function RUt(t) {
  return classifyWorkingFile(t) !== null;
}
//@ chunk-wgxf9vhj.js:1525-1598 placement
function Kyt(t) {
  let n = classifyWorkingFile(t);
  return n === null ? null : { destination: t, kind: n };
}

export {
  SETTINGS_JSON,
  CLAUDE_MD,
  RULES,
  me,
  oe,
  He,
  OUTPUT_STYLES,
  classifyWorkingFile,
  Kyt,
  wln,
  uue,
  hasMarkdownLinks,
  escapeUnvettedIncludes,
  readWorkingFile,
  O7e,
  Sln,
  joined,
  RUt,
  FOo,
};
