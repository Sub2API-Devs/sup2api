/**
 * utils/attributionFileClasses.ts
 *
 * 提交归因：git 命令解析、测试命令、锁文件、生成文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (22)
 * attribution: placement 22
 */
import {
  posix,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  extname,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
} from "path";
import { VERIFY, CODE_REVIEW } from "../skills/bundled/bundledSkillNames.js";
import { truncateToLength } from "./stringUtils.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { findGitRootRecheckingNegative, gitExe } from "./git.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { containsPathTraversal } from "./path.js";

//@ chunk-s61vbvea.js:200796-200854 placement
var vA = 2048,
  CA = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;
//@ chunk-s61vbvea.js:200854-200911 placement
function bZs(e) {
  return e.length >= 1 && e.length <= vA && vqr(e);
}
//@ chunk-s61vbvea.js:200911-200945 placement
function vqr(e) {
  return !CA.test(e);
}
/**
 * 解析 nice、timeout 等命令前缀参数用的正则（调整值、时长、选项）。
 */
//@ chunk-s61vbvea.js:200945-201453 placement
var NICE_ADJUSTMENT_ARG_RE = /^(?:-n|-n?-?\d+|--adjustment(?:=.*)?)$/,
  TIMEOUT_DURATION_RE =
    /^\+?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|0[xX](?:[\da-fA-F]+\.?[\da-fA-F]*|\.[\da-fA-F]+)(?:[pP][+-]?\d+)?|[iI][nN][fF](?:[iI][nN][iI][tT][yY])?)[smhd]?$/,
  Jh = /^-(?=[acl])[cl]*(?:a(.*))?$/,
  SHELL_ASSIGNMENT_SUFFIX = "(?:\\[[^\\]]*\\])?\\+?=",
  regExp_6 = new RegExp("^[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]*\\])?\\+?="),
  GIT_PATH_OPTIONS = new Set([
    "--git-dir",
    "--separate-git-dir",
    "--work-tree",
    "--namespace",
    "--super-prefix",
    "--config-env",
  ]),
  GIT_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--attr-source", "--shallow-file", ...GIT_PATH_OPTIONS]);
//@ chunk-s61vbvea.js:201453-201510 placement
function Qh(e) {
  return /(?:^|[\\/])git(?:\.exe)?$/.test(e);
}
//@ chunk-s61vbvea.js:201510-202828 placement
function stripShellPrefixWords(e, n, r) {
  let s = n ? -1 : void 0,
    h = 0;
  while (h < e.length && regExp_6.test(e[h])) h++;
  while (h < e.length) {
    let y = e[h];
    switch (y) {
      case "noglob":
      case "nocorrect":
        h++;
        continue;
      case "builtin":
        if ((h++, e[h] !== void 0 && Qh(e[h]))) return -1;
        continue;
      case "command":
        if ((h++, e[h] === "-p")) h++;
        if (e[h] === "--") h++;
        continue;
      case "exec":
        h++;
        for (let match = Jh.exec(e[h] ?? ""); match !== null; match = Jh.exec(e[h] ?? ""))
          h += match[1] === "" ? 2 : 1;
        if (e[h] === "--") h++;
        continue;
      case "nohup":
        if ((h++, e[h] === "--")) h++;
        continue;
      case "time":
        if ((h++, e[h] === "-p")) h++;
        if (e[h] === "--") h++;
        while (h < e.length && regExp_6.test(e[h])) h++;
        continue;
      case "nice":
        h++;
        for (let S = e[h]; S !== void 0 && NICE_ADJUSTMENT_ARG_RE.test(S); S = e[h])
          h += S === "-n" || S === "--adjustment" ? 2 : 1;
        if (e[h] === "--") h++;
        continue;
      case "env":
        h++;
        while (e[h] === "-i" || e[h] === "-" || e[h] === "--ignore-environment") h++;
        if (e[h] === "--") h++;
        while (h < e.length && /^[^-=][^=]*=/.test(e[h])) h++;
        if (e[h]?.startsWith("-") === !0) return -1;
        continue;
      case "timeout":
      case "gtimeout": {
        h++;
        while (h < e.length && e[h].startsWith("-")) {
          let w = e[h];
          if (w === "--") {
            h++;
            break;
          }
          if (w === "-k" || w === "-s" || w === "--kill-after" || w === "--signal") h += 2;
          else if (
            w === "--preserve-status" ||
            w === "--foreground" ||
            w === "-v" ||
            w === "--verbose" ||
            w.startsWith("--kill-after=") ||
            w.startsWith("--signal=") ||
            /^-[ks]\S+$/.test(w)
          )
            h++;
          else return -1;
        }
        let S = e[h];
        if (S === void 0) return s;
        if (!TIMEOUT_DURATION_RE.test(S)) return -1;
        h++;
        continue;
      }
      default:
        return r(y) ? h : -1;
    }
  }
  return s;
}
//@ chunk-s61vbvea.js:202828-202924 placement
function TVo(e) {
  return /\bgit\b(?:\s+(?:-C\s+\S+|-c\s+\S+=\S+|--\S+))*\s+commit(?:\s|$)/.test(e);
}
//@ chunk-s61vbvea.js:202924-203104 placement
function looksLikeCommitOutput(e, n, r) {
  if (r !== void 0) return r === 0;
  let s = [/\[\w+[^\]]*\]\s+/, /create mode/, /\d+ files? changed/, /\d+ insertions?/, /\d+ deletions?/],
    h = e + n;
  return s.some((y) => y.test(h));
}
//@ chunk-s61vbvea.js:203104-203535 placement
var TEST_COMMAND_PATTERNS = new Set([VERIFY, CODE_REVIEW]),
  ey = "(?:\\./)?(?:(?:npx|bunx|uvx|uv\\s+run)\\s+)?",
  V9 = [
    /^(?:bun|npm|yarn|pnpm|deno)\s+(?:run\s+)?test\b/,
    /^(?:\.\/)?(?:go|cargo|make|mvn|gradle|gradlew|dotnet|swift|mix|sbt|lein|rake|zig|bazel|nx|turbo)\s+test\b/,
    new RegExp(`^${ey}(?:pytest|jest|vitest|rspec|phpunit|ctest)\\b`),
    /^(?:bun|npm|yarn|pnpm)\s+run\s+test:\S/,
  ],
  Y9 = [/^(?:bun|npm|yarn|pnpm)\s+run\s+typecheck\b/, new RegExp(`^${ey}(?:tsc|mypy)\\b`)];
//@ chunk-s61vbvea.js:203535-203574 placement
var AUTOMATED_TEST = "automated-test",
  TYPECHECK = "typecheck";
//@ chunk-s61vbvea.js:203574-203620 placement
function exe(e) {
  return TEST_COMMAND_PATTERNS.has(e) ? `/${e}` : null;
}
//@ chunk-s61vbvea.js:203620-203675 placement
var q9 = new Set([AUTOMATED_TEST, TYPECHECK, ...Array.from(TEST_COMMAND_PATTERNS, (e) => `/${e}`)]);
//@ chunk-s61vbvea.js:203675-203693 placement
var wZs = "*",
  ty = 64;
//@ chunk-s61vbvea.js:203966-204912 placement
var LOCKFILE_NAMES = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    "bun.lock",
    "composer.lock",
    "gemfile.lock",
    "cargo.lock",
    "poetry.lock",
    "pipfile.lock",
    "shrinkwrap.json",
    "npm-shrinkwrap.json",
  ]),
  ry = new Set([
    ".lock",
    ".min.js",
    ".min.css",
    ".min.html",
    ".bundle.js",
    ".bundle.css",
    ".generated.ts",
    ".generated.js",
    ".d.ts",
  ]),
  $A = [
    "/dist/",
    "/build/",
    "/out/",
    "/output/",
    "/node_modules/",
    "/vendor/",
    "/vendored/",
    "/third_party/",
    "/third-party/",
    "/external/",
    "/.next/",
    "/.nuxt/",
    "/.svelte-kit/",
    "/coverage/",
    "/__pycache__/",
    "/.tox/",
    "/venv/",
    "/.venv/",
    "/target/release/",
    "/target/debug/",
    ".generated/",
    "/__snapshots__/",
  ],
  UA = [
    /^.*\.min\.[a-z]+$/i,
    /^.*-min\.[a-z]+$/i,
    /^.*\.bundle\.[a-z]+$/i,
    /^.*\.generated\.[a-z]+$/i,
    /^.*\.gen\.[a-z]+$/i,
    /^.*\.auto\.[a-z]+$/i,
    /^.*_generated\.[a-z]+$/i,
    /^.*_gen\.[a-z]+$/i,
    /^.*\.pb\.(go|js|ts|py|rb)$/i,
    /^.*_pb2?\.py$/i,
    /^.*\.pb\.h$/i,
    /^.*\.grpc\.[a-z]+$/i,
    /^.*\.swagger\.[a-z]+$/i,
    /^.*\.openapi\.[a-z]+$/i,
    /\.snap$/i,
  ];
/**
 * 判断文件是否为锁文件或生成文件（按文件名、扩展名与目录特征）。
 */
//@ chunk-s61vbvea.js:204912-205250 placement
function isLockOrGeneratedFile(e) {
  let n = posix.sep + e.split(sep_4).join(posix.sep).replace(/^\/+/, ""),
    lower = basename(e).toLowerCase(),
    lower_2 = extname(e).toLowerCase();
  if (LOCKFILE_NAMES.has(lower)) return !0;
  if (ry.has(lower_2)) return !0;
  let parts = lower.split(".");
  if (parts.length > 2) {
    let y = "." + parts.slice(-2).join(".");
    if (ry.has(y)) return !0;
  }
  for (let y of $A) if (n.includes(y)) return !0;
  for (let y of UA) if (y.test(lower)) return !0;
  return !1;
}
//@ chunk-s61vbvea.js:205250-205273 placement
var qs = 10485760,
  Qs = 1e4;
//@ chunk-s61vbvea.js:205273-205320 placement
class GitListingError extends Error {
  name = "GitListingError";
}
//@ chunk-s61vbvea.js:205320-205531 placement
function gitListingError(e, n) {
  let r = n.stderr.trim() || n.error || "";
  return new GitListingError(
    n.maxBufferExceeded
      ? `${e}: output exceeded ${qs} bytes`
      : n.timedOut
        ? `${e} timed out after ${Qs}ms`
        : `${e} failed (code ${n.code}): ${truncateToLength(r, 200)}`,
  );
}
//@ chunk-s61vbvea.js:205531-206241 placement
async function checkLinguistGenerated(e, n, r) {
  let s = new Set(),
    linguistGeneratedByPath = getGitRepoCache().linguistGeneratedByPath,
    joined = (r.repoArgs ?? []).join(" "),
    S = [];
  for (let x of e) {
    if (isLockOrGeneratedFile(x)) {
      s.add(x);
      continue;
    }
    if (!BA(x, n)) continue;
    let P = linguistGeneratedByPath.get(`${n}\x00${x}\x00${joined}`);
    if (P === void 0) S.push(x);
    else if (P) s.add(x);
  }
  if (S.length === 0 || !(r.inRepo ?? findGitRootRecheckingNegative(n) !== null)) return s;
  let w = await execFileNoThrowWithCwd(
    gitExe(),
    [...(r.repoArgs ?? []), "check-attr", "-z", "--stdin", "linguist-generated"],
    { cwd: n, timeout: Qs, input: S.join("\x00") + "\x00", maxBuffer: qs, env: r.env, extendEnv: !1 },
  );
  if (w.code !== 0 || w.maxBufferExceeded) throw gitListingError("git check-attr", w);
  let parts = w.stdout.split("\x00");
  for (let x = 0; x + 3 < parts.length; x += 3) {
    let lower = parts[x + 2].toLowerCase(),
      j = lower === "set" || lower === "true";
    if ((linguistGeneratedByPath.set(`${n}\x00${parts[x]}\x00${joined}`, j), j)) s.add(parts[x]);
  }
  return s;
}
//@ chunk-s61vbvea.js:206241-206310 placement
function BA(e, n) {
  let r = isAbsolute_5(e) ? relative_4(n, e) : e;
  return r !== "" && !isAbsolute_5(r) && !containsPathTraversal(r);
}
//@ chunk-s61vbvea.js:206310-206536 placement
var TEST_DIR_SEGMENTS = [
    "/test/",
    "/tests/",
    "/spec/",
    "/specs/",
    "/__tests__/",
    "/__mocks__/",
    "/__snapshots__/",
    "/__fixtures__/",
    "/fixtures/",
    "/testdata/",
  ],
  TEST_FILE_PATTERNS = [
    /\.test\.[a-z]+$/i,
    /\.spec\.[a-z]+$/i,
    /_test\.[a-z]+$/i,
    /_spec\.[a-z]+$/i,
    /\.snap$/i,
  ];
//@ chunk-s61vbvea.js:206536-206706 placement
function isTestFile(e) {
  let n = posix.sep + e.split(sep_4).join(posix.sep).replace(/^\/+/, ""),
    r = basename(e);
  for (let s of TEST_DIR_SEGMENTS) if (n.includes(s)) return !0;
  for (let s of TEST_FILE_PATTERNS) if (s.test(r)) return !0;
  return !1;
}

export {
  exe,
  SHELL_ASSIGNMENT_SUFFIX,
  ty,
  checkLinguistGenerated,
  GitListingError,
  Qs,
  qs,
  gitListingError,
  isLockOrGeneratedFile,
  isTestFile,
  bZs,
  vqr,
  wZs,
  GIT_OPTIONS_WITH_VALUE,
  stripShellPrefixWords,
  TVo,
  looksLikeCommitOutput,
};
