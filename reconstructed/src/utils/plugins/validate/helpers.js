/**
 * utils/plugins/validate/helpers.ts
 *
 * 2.1.316 新增：插件目录校验辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (24)
 * attribution: placement 24
 */
import * as pathModule from "path";
import { readdir, lstat } from "fs/promises";
import { PLUGIN_VALIDATION_ISSUES, xe, X, R, sn, $e } from "./validatePluginDirectory.js";
import { jsonStringify } from "../../slowOperations.js";
import { stripCombiningRepeated } from "../../sanitization.js";
import { toWellFormedString } from "../../stringUtils.js";
import { qa } from "../../stripAnsi.js";
import { readRegularFileUpTo, FF } from "../safeFileRead.js";
import { getErrnoCode } from "../../errors.js";
import { getFsImplementation } from "../../fsOperations.js";
import { env } from "../../env.js";
import { H, isPathInside, getTopLevelPaths } from "./directoryName.js";

//@ chunk-5aas12zq.js:15267-15466 placement
function makeFinding(e, n, t, r) {
  let s = PLUGIN_VALIDATION_ISSUES[e];
  return {
    code: e,
    title: s.title,
    severity: s.severity,
    blocking: s.severity === "error" && !s.hold,
    hold: s.hold,
    file: extractToolInputForTelemetry(n, 300),
    field: extractToolInputForTelemetry(t, 200),
    message: extractToolInputForTelemetry(r, 1000),
    fix: s.fix,
    rawFile: n,
  };
}
//@ chunk-5aas12zq.js:15466-15507 placement
function N(e, n) {
  for (let t of n) e.push(t);
}
//@ chunk-5aas12zq.js:15507-15657 placement
function dedupeFindings(e) {
  let n = new Set(),
    t = [];
  for (let { rawFile: rawFile, ...s } of e) {
    let o = jsonStringify([s.code, rawFile ?? s.file, s.field, s.message]);
    if (!n.has(o)) (n.add(o), t.push(s));
  }
  return t;
}
//@ chunk-5aas12zq.js:15657-15693 placement
function vn(e, n) {
  return _e(e) - _e(n);
}
//@ chunk-5aas12zq.js:15693-15762 placement
function _e(e) {
  if (e.blocking) return 0;
  return e.severity === "info" ? 2 : 1;
}
//@ chunk-5aas12zq.js:15762-15795 placement
function q(e, n) {
  return quoteForDisplay(extractToolInputForTelemetry(e, n));
}
//@ chunk-5aas12zq.js:15795-15943 placement
var ESCAPE_SEQUENCES = {
    '"': '\\"',
    "\\": "\\\\",
    "\x07": "\\a",
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
    "\v": "\\v",
  },
  PRINTABLE_CHAR_RE = /^[\p{L}\p{M}\p{N}\p{P}\p{S} ]$/u;
//@ chunk-5aas12zq.js:15943-16165 placement
function quoteForDisplay(e) {
  let n = '"';
  for (let t of e) {
    let r = t.codePointAt(0) ?? 0,
      str = r.toString(16);
    n +=
      ESCAPE_SEQUENCES[t] ??
      (PRINTABLE_CHAR_RE.test(t)
        ? t
        : r < 32 || r === 127
          ? `\\x${str.padStart(2, "0")}`
          : r > 65535
            ? `\\U${str.padStart(8, "0")}`
            : `\\u${str.padStart(4, "0")}`);
  }
  return `${n}"`;
}
//@ chunk-5aas12zq.js:16165-16454 placement = extractToolInputForTelemetry (0.833)
function extractToolInputForTelemetry(e, n) {
  let truncated = stripCombiningRepeated(toWellFormedString(qa(toWellFormedString(e)))),
    r = "",
    s = 0,
    o = !1;
  for (let a of truncated) {
    if (s >= n) {
      r += "\u2026[truncated]";
      break;
    }
    if (
      `
\r	\u2028\u2029`.includes(a)
    ) {
      if (!o) ((r += " "), s++);
      o = !0;
      continue;
    }
    let l = a.codePointAt(0) ?? 0;
    if (l < 32 || l === 127 || (l >= 128 && l <= 159)) continue;
    ((o = a === " "), (r += a), s++);
  }
  return r.slice(countLeadingChars(r), je(r));
}
//@ chunk-5aas12zq.js:16454-16532 placement
function je(e) {
  let n = e.length;
  while (n > 0 && xe.includes(e[n - 1] ?? "")) n--;
  return n;
}
//@ chunk-5aas12zq.js:16532-16575 placement
var Tn = /[\u115F\u1160\u3164\uFFA0\u2800]/g;
//@ chunk-5aas12zq.js:16575-16626 placement
function de(e) {
  return stripCombiningRepeated(e).replace(Tn, " ").trim();
}
//@ chunk-5aas12zq.js:16626-16690 placement
function se(e, n) {
  let t = e[n];
  return typeof t === "string" ? de(t) : "";
}
//@ chunk-5aas12zq.js:16690-16769 placement
function He(e, n) {
  let t = e[n];
  return typeof t === "string" ? t.slice(countLeadingChars(t), je(t)) : "";
}
/**
 * 规范化相对路径并逐段 readdir 确认每段存在且类型正确（中间为目录、最后为文件，链接被拒）； 返回 found、读到的字节（超过上限标 tooLarge）或 refused 的段号。
 */
//@ chunk-5aas12zq.js:16769-17481 placement
async function readPluginFileSafe(e, n, t) {
  let filtered = pathModule.posix
    .normalize(n.split(pathModule.sep).join("/"))
    .split("/")
    .filter((a) => a !== "" && a !== ".");
  if (filtered.includes("..")) return { found: !1 };
  if (filtered.length === 0) return { found: !1, refused: { segment: 0, isLink: !1 } };
  let s = e;
  for (let [a, l] of filtered.entries()) {
    let d = await readdir(s, { withFileTypes: !0 }).catch((S) => (isNotFoundErrno_4(S) ? [] : void 0));
    if (d === void 0) return { found: !1, refused: { segment: a, isLink: !1 } };
    let found = d.find((S) => S.name === l),
      p = a === filtered.length - 1;
    if (found === void 0) return { found: !1 };
    if (!(p ? found.isFile() : found.isDirectory()))
      return { found: !1, refused: { segment: a, isLink: found.isSymbolicLink() } };
    s = pathModule.join(s, l);
  }
  let o = await readRegularFileUpTo(pathModule.join(e, ...filtered), t).catch(() => {
    return;
  });
  return {
    found: !0,
    bytes: o?.kind === "ok" ? o.bytes : void 0,
    ...(o?.kind === "too-large" && { tooLarge: !0 }),
  };
}
//@ chunk-5aas12zq.js:17481-17542 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno_4(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
/**
 * 目录只有 skills/*\/SKILL.md 而无 plugin.json/marketplace.json。
 */
//@ chunk-5aas12zq.js:17542-18245 placement
async function isSkillsOnlyFolder(e) {
  let n = (o) =>
    readdir(o, { withFileTypes: !0 }).catch(() => {
      return;
    });
  if (!(await FF(e))) return !1;
  let t = await n(e);
  if (t === void 0 || t.some((o) => o.name === "plugin.json")) return !1;
  let found = t.find((o) => o.name === ".claude-plugin");
  if (found !== void 0) {
    let o = found.isDirectory() ? await n(pathModule.join(e, ".claude-plugin")) : void 0;
    if (o === void 0 || o.some((a) => a.name === "plugin.json" || a.name === "marketplace.json")) return !1;
  }
  if (!t.some((o) => o.name === "skills" && o.isDirectory())) return !1;
  let toSorted = ((await n(pathModule.join(e, "skills"))) ?? []).toSorted((o, a) =>
    o.name < a.name ? -1 : o.name > a.name ? 1 : 0,
  );
  for (let o of toSorted.slice(0, X)) {
    if (!o.isDirectory()) continue;
    if ((await n(pathModule.join(e, "skills", o.name)))?.some((l) => l.name === "SKILL.md" && l.isFile()))
      return !0;
  }
  return !1;
}
//@ chunk-5aas12zq.js:18245-18297 placement
var Fn = /^[a-z0-9]+(-[a-z0-9]+)*$/,
  Ln = /[^\x20-\x7E]/;
//@ chunk-5aas12zq.js:18297-18521 placement
function checkNonAsciiName(e, n) {
  return typeof e === "string" && Ln.test(e)
    ? [
        makeFinding(
          "IDENTIFIER_NON_ASCII",
          n === "written" ? R : "",
          n === "written" ? "name" : "",
          `Plugin name ${quoteForDisplay(e)} contains non-ASCII characters; directory names must be printable ASCII.`,
        ),
      ]
    : [];
}
/**
 * 无 plugin.json 时用目录名作插件名，检查格式与 kebab-case。
 */
//@ chunk-5aas12zq.js:18521-19090 placement
function checkDerivedName(e) {
  if (e === "") return [];
  let n = [];
  if (e.includes(" "))
    n.push(
      makeFinding(
        "MANIFEST_NAME_FORMAT",
        "",
        "",
        `There is no plugin.json, so ${quoteForDisplay(e)} (the folder or repository name) stands in for the plugin name, and it is not a valid one: ${sn}`,
      ),
    );
  else if (!Fn.test(e))
    n.push(
      makeFinding(
        "MANIFEST_NAME_NOT_KEBAB",
        "",
        "",
        `There is no plugin.json, so ${quoteForDisplay(e)} stands in for the plugin name, and it is not kebab-case. Claude Code accepts it, but the Claude.ai marketplace sync requires kebab-case (lowercase letters, digits, and hyphens only, e.g., "my-plugin").`,
      ),
    );
  return (N(n, checkNonAsciiName(e, "derived")), n);
}
//@ chunk-5aas12zq.js:19090-19347 placement
async function preferPwdSpelling(e, n = getFsImplementation().cwd(), t = env.PWD) {
  if (t === void 0 || !pathModule.isAbsolute(t) || t === n) return e;
  let relativePath = pathModule.relative(n, e);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${pathModule.sep}`) ||
    pathModule.isAbsolute(relativePath)
  )
    return e;
  let [s, o] = await Promise.all([H(t), H(n)]);
  return s !== void 0 && s === o ? pathModule.join(t, relativePath) : e;
}
/**
 * 找出插件所在 git 仓库：own/parent/link/unresolved/none。
 */
//@ chunk-5aas12zq.js:19347-19965 placement
async function locateGitRepository(e) {
  let n = await findGitDirUpward(e);
  if (n === void 0 || n.otherKind) return { kind: "none" };
  if (n.dir === e) return { kind: "own" };
  let [t, r] = await Promise.all([H(e), H(n.dir)]);
  if (t === void 0 || r === void 0) return { kind: "unresolved", dir: t === void 0 ? e : n.dir };
  if (!isPathInside(t, r))
    return { kind: "link", dir: await getTopLevelPaths(n.dir, r, e), repository: n.dir, realPlugin: t };
  for (let dir = pathModule.dirname(n.dir); ;) {
    if (
      (await lstat(pathModule.join(dir, ".git")).catch(() => {
        return;
      })) !== void 0
    ) {
      let a = await H(dir);
      if (a === void 0) return { kind: "unresolved", dir: dir };
      if (!isPathInside(r, a))
        return { kind: "link", dir: await getTopLevelPaths(dir, a, e), repository: dir, realPlugin: t };
    }
    let dir_2 = pathModule.dirname(dir);
    if (dir_2 === dir) return { kind: "parent", dir: n.dir };
    dir = dir_2;
  }
}
//@ chunk-5aas12zq.js:19965-20183 placement
async function findGitDirUpward(e) {
  let n = e;
  for (let t = 0; t <= $e; t++) {
    let r = await lstat(pathModule.join(n, ".git")).catch(() => {
      return;
    });
    if (r !== void 0) return { dir: n, otherKind: !r.isDirectory() && !r.isFile() };
    let dir = pathModule.dirname(n);
    if (dir === n) return;
    n = dir;
  }
  return;
}
//@ chunk-5aas12zq.js:24938-25014 placement
function countLeadingChars(e) {
  let n = 0;
  while (n < e.length && xe.includes(e[n] ?? "")) n++;
  return n;
}

export {
  readPluginFileSafe,
  preferPwdSpelling,
  locateGitRepository,
  makeFinding,
  N,
  checkNonAsciiName,
  isSkillsOnlyFolder,
  quoteForDisplay,
  checkDerivedName,
  He,
  extractToolInputForTelemetry,
  dedupeFindings,
  vn,
  countLeadingChars,
  se,
  de,
  q,
  isNotFoundErrno_4,
};
