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
import { posix, sep, basename, extname, isAbsolute, relative } from "path";
import { VERIFY, CODE_REVIEW } from "../skills/bundled/bundledSkillNames.js";
import { truncateToLength } from "./stringUtils.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { findGitRootRecheckingNegative, gitExe } from "./git.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { containsPathTraversal } from "./path.js";

//@ chunk-s61vbvea.js:200796-200854 placement
/**
 * 字符串参数的长度上限（2048）。
 */
var MAX_STRING_ARG_CHARS = 2048;
var CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;
//@ chunk-s61vbvea.js:200854-200911 placement
/**
 * 判断字符串长度合法且不含控制字符。
 */
function isBoundedCleanString(e) {
  return e.length >= 1 && e.length <= MAX_STRING_ARG_CHARS && hasNoControlChars(e);
}
//@ chunk-s61vbvea.js:200911-200945 placement
/**
 * 判断字符串不含控制字符。
 */
function hasNoControlChars(e) {
  return !CONTROL_CHARS_RE.test(e);
}
//@ chunk-s61vbvea.js:200945-201453 placement
/**
 * 匹配 nice 的组合短选项（如 -n5、-c）。
 */
var NICE_ADJUSTMENT_ARG_RE = /^(?:-n|-n?-?\d+|--adjustment(?:=.*)?)$/;
var TIMEOUT_DURATION_RE =
  /^\+?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|0[xX](?:[\da-fA-F]+\.?[\da-fA-F]*|\.[\da-fA-F]+)(?:[pP][+-]?\d+)?|[iI][nN][fF](?:[iI][nN][iI][tT][yY])?)[smhd]?$/;
var NICE_FLAG_RE = /^-(?=[acl])[cl]*(?:a(.*))?$/;
var SHELL_ASSIGNMENT_SUFFIX = "(?:\\[[^\\]]*\\])?\\+?=";
var regExp_6 = new RegExp("^[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]*\\])?\\+?=");
var GIT_PATH_OPTIONS = new Set([
  "--git-dir",
  "--separate-git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--config-env",
]);
var GIT_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--attr-source", "--shallow-file", ...GIT_PATH_OPTIONS]);
//@ chunk-s61vbvea.js:201453-201510 placement
/**
 * 判断参数是否为 git 可执行名（含 Windows 的 git.exe）。
 */
function isGitExecutable(e) {
  return /(?:^|[\\/])git(?:\.exe)?$/.test(e);
}
//@ chunk-s61vbvea.js:201510-202828 placement
function stripShellPrefixWords(argv, n, r) {
  let s = n ? -1 : undefined;
  let h = 0;
  while (h < argv.length && regExp_6.test(argv[h])) h++;
  while (h < argv.length) {
    let y = argv[h];
    switch (y) {
      case "noglob":
      case "nocorrect":
        h++;
        continue;
      case "builtin":
        h++;
        if (argv[h] !== undefined && isGitExecutable(argv[h])) return -1;
        continue;
      case "command":
        h++;
        if (argv[h] === "-p") h++;
        if (argv[h] === "--") h++;
        continue;
      case "exec":
        h++;
        for (
          let match = NICE_FLAG_RE.exec(argv[h] ?? "");
          match !== null;
          match = NICE_FLAG_RE.exec(argv[h] ?? "")
        )
          h += match[1] === "" ? 2 : 1;
        if (argv[h] === "--") h++;
        continue;
      case "nohup":
        h++;
        if (argv[h] === "--") h++;
        continue;
      case "time":
        h++;
        if (argv[h] === "-p") h++;
        if (argv[h] === "--") h++;
        while (h < argv.length && regExp_6.test(argv[h])) h++;
        continue;
      case "nice":
        h++;
        for (let S = argv[h]; S !== undefined && NICE_ADJUSTMENT_ARG_RE.test(S); S = argv[h])
          h += S === "-n" || S === "--adjustment" ? 2 : 1;
        if (argv[h] === "--") h++;
        continue;
      case "env":
        h++;
        while (argv[h] === "-i" || argv[h] === "-" || argv[h] === "--ignore-environment") h++;
        if (argv[h] === "--") h++;
        while (h < argv.length && /^[^-=][^=]*=/.test(argv[h])) h++;
        if (argv[h]?.startsWith("-") === true) return -1;
        continue;
      case "timeout":
      case "gtimeout": {
        h++;
        while (h < argv.length && argv[h].startsWith("-")) {
          let w = argv[h];
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
        let S = argv[h];
        if (S === undefined) return s;
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
/**
 * 判断文本里是否出现 git commit 命令（允许前置 -C/-c 等全局选项）。
 */
function looksLikeGitCommit(command) {
  return /\bgit\b(?:\s+(?:-C\s+\S+|-c\s+\S+=\S+|--\S+))*\s+commit(?:\s|$)/.test(command);
}
//@ chunk-s61vbvea.js:202924-203104 placement
function looksLikeCommitOutput(stdout, stderr, r) {
  if (r !== undefined) return r === 0;
  let s = [/\[\w+[^\]]*\]\s+/, /create mode/, /\d+ files? changed/, /\d+ insertions?/, /\d+ deletions?/];
  let h = stdout + stderr;
  return s.some((y) => y.test(h));
}
//@ chunk-s61vbvea.js:203104-203535 placement
/**
 * 测试命令前的包运行器前缀（npx/bunx/uvx 等）。
 */
var TEST_COMMAND_PATTERNS = new Set([VERIFY, CODE_REVIEW]);
var NPM_BIN_WRAPPER_PREFIX = "(?:\\./)?(?:(?:npx|bunx|uvx|uv\\s+run)\\s+)?";
var TEST_COMMAND_RE = [
  /^(?:bun|npm|yarn|pnpm|deno)\s+(?:run\s+)?test\b/,
  /^(?:\.\/)?(?:go|cargo|make|mvn|gradle|gradlew|dotnet|swift|mix|sbt|lein|rake|zig|bazel|nx|turbo)\s+test\b/,
  new RegExp(`^${NPM_BIN_WRAPPER_PREFIX}(?:pytest|jest|vitest|rspec|phpunit|ctest)\\b`),
  /^(?:bun|npm|yarn|pnpm)\s+run\s+test:\S/,
];
var SECONDARY_TEST_COMMAND_RE = [
  /^(?:bun|npm|yarn|pnpm)\s+run\s+typecheck\b/,
  new RegExp(`^${NPM_BIN_WRAPPER_PREFIX}(?:tsc|mypy)\\b`),
];
//@ chunk-s61vbvea.js:203535-203574 placement
var AUTOMATED_TEST = "automated-test";
var TYPECHECK = "typecheck";
//@ chunk-s61vbvea.js:203574-203620 placement
/**
 * 把测试类模式名转成 “/name” 形式。
 */
function slashTestPattern(e) {
  return TEST_COMMAND_PATTERNS.has(e) ? `/${e}` : null;
}
//@ chunk-s61vbvea.js:203620-203675 placement
/**
 * 测试相关模式的斜杠形式集合。
 */
var SLASH_TEST_PATTERNS = new Set([
  AUTOMATED_TEST,
  TYPECHECK,
  ...Array.from(TEST_COMMAND_PATTERNS, (e) => `/${e}`),
]);
//@ chunk-s61vbvea.js:203675-203693 placement
/**
 * 通配模式 “*”。
 */
var ANY_PATTERN = "*";
var MAX_PATTERN_CHARS = 64;
//@ chunk-s61vbvea.js:203966-204912 placement
/**
 * 视为生成/锁文件的扩展名集合。
 */
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
]);
var GENERATED_FILE_EXTENSIONS = new Set([
  ".lock",
  ".min.js",
  ".min.css",
  ".min.html",
  ".bundle.js",
  ".bundle.css",
  ".generated.ts",
  ".generated.js",
  ".d.ts",
]);
var GENERATED_CONTENT_MARKERS = [
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
];
var GENERATED_HEADER_RE = [
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
//@ chunk-s61vbvea.js:204912-205250 placement
/**
 * 判断文件是否为锁文件或生成文件（按文件名、扩展名与目录特征）。
 */
function isLockOrGeneratedFile(e) {
  let n = posix.sep + e.split(sep).join(posix.sep).replace(/^\/+/, "");
  let lower = basename(e).toLowerCase();
  let lower_2 = extname(e).toLowerCase();
  if (LOCKFILE_NAMES.has(lower)) return true;
  if (GENERATED_FILE_EXTENSIONS.has(lower_2)) return true;
  let parts = lower.split(".");
  if (parts.length > 2) {
    let y = "." + parts.slice(-2).join(".");
    if (GENERATED_FILE_EXTENSIONS.has(y)) return true;
  }
  for (let y of GENERATED_CONTENT_MARKERS) if (n.includes(y)) return true;
  for (let y of GENERATED_HEADER_RE) if (y.test(lower)) return true;
  return false;
}
//@ chunk-s61vbvea.js:205250-205273 placement
/**
 * git 命令输出的字节上限（10 MiB）。
 */
var MAX_GIT_OUTPUT_BYTES = 10485760;
var GIT_COMMAND_TIMEOUT_MS = 1e4;
//@ chunk-s61vbvea.js:205273-205320 placement
class GitListingError extends Error {
  name = "GitListingError";
}
//@ chunk-s61vbvea.js:205320-205531 placement
function gitListingError(e, n) {
  let r = n.stderr.trim() || n.error || "";
  return new GitListingError(
    n.maxBufferExceeded
      ? `${e}: output exceeded ${MAX_GIT_OUTPUT_BYTES} bytes`
      : n.timedOut
        ? `${e} timed out after ${GIT_COMMAND_TIMEOUT_MS}ms`
        : `${e} failed (code ${n.code}): ${truncateToLength(r, 200)}`,
  );
}
//@ chunk-s61vbvea.js:205531-206241 placement
async function checkLinguistGenerated(stagedFiles, n, r) {
  let s = new Set();
  let linguistGeneratedByPath = getGitRepoCache().linguistGeneratedByPath;
  let joined = (r.repoArgs ?? []).join(" ");
  let S = [];
  for (let x of stagedFiles) {
    if (isLockOrGeneratedFile(x)) {
      s.add(x);
      continue;
    }
    if (!isRepoRelativePath(x, n)) continue;
    let P = linguistGeneratedByPath.get(`${n}\x00${x}\x00${joined}`);
    if (P === undefined) S.push(x);
    else if (P) s.add(x);
  }
  if (S.length === 0 || !(r.inRepo ?? findGitRootRecheckingNegative(n) !== null)) return s;
  let w = await execFileNoThrowWithCwd(
    gitExe(),
    [...(r.repoArgs ?? []), "check-attr", "-z", "--stdin", "linguist-generated"],
    {
      cwd: n,
      timeout: GIT_COMMAND_TIMEOUT_MS,
      input: S.join("\x00") + "\x00",
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      env: r.env,
      extendEnv: false,
    },
  );
  if (w.code !== 0 || w.maxBufferExceeded) throw gitListingError("git check-attr", w);
  let parts = w.stdout.split("\x00");
  for (let x = 0; x + 3 < parts.length; x += 3) {
    let lower = parts[x + 2].toLowerCase();
    let j = lower === "set" || lower === "true";
    linguistGeneratedByPath.set(`${n}\x00${parts[x]}\x00${joined}`, j);
    if (j) s.add(parts[x]);
  }
  return s;
}
//@ chunk-s61vbvea.js:206241-206310 placement
/**
 * 判断路径是否位于仓库内（相对路径且不含 ..）。
 */
function isRepoRelativePath(e, n) {
  let r = isAbsolute(e) ? relative(n, e) : e;
  return r !== "" && !isAbsolute(r) && !containsPathTraversal(r);
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
];
var TEST_FILE_PATTERNS = [
  /\.test\.[a-z]+$/i,
  /\.spec\.[a-z]+$/i,
  /_test\.[a-z]+$/i,
  /_spec\.[a-z]+$/i,
  /\.snap$/i,
];
//@ chunk-s61vbvea.js:206536-206706 placement
function isTestFile(path) {
  let n = posix.sep + path.split(sep).join(posix.sep).replace(/^\/+/, "");
  let r = basename(path);
  for (let s of TEST_DIR_SEGMENTS) if (n.includes(s)) return true;
  for (let s of TEST_FILE_PATTERNS) if (s.test(r)) return true;
  return false;
}
export {
  slashTestPattern,
  SHELL_ASSIGNMENT_SUFFIX,
  MAX_PATTERN_CHARS,
  checkLinguistGenerated,
  GitListingError,
  GIT_COMMAND_TIMEOUT_MS,
  MAX_GIT_OUTPUT_BYTES,
  gitListingError,
  isLockOrGeneratedFile,
  isTestFile,
  isBoundedCleanString,
  hasNoControlChars,
  ANY_PATTERN,
  GIT_OPTIONS_WITH_VALUE,
  stripShellPrefixWords,
  looksLikeGitCommit,
  looksLikeCommitOutput,
};
