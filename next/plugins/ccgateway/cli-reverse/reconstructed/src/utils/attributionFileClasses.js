/**
 * utils/attributionFileClasses.ts
 *
 * 提交归因：git 命令解析、测试命令、锁文件、生成文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (20)
 * attribution: placement 20
 */
import { posix, sep, basename, extname, isAbsolute, relative } from "path";
import { VERIFY, CODE_REVIEW } from "../skills/bundled/bundledSkillNames.js";
import { truncateToLength } from "./stringUtils.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { findGitRootRecheckingNegative, gitExe } from "./git.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { containsPathTraversal } from "./path.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:200796-200854 placement
/**
 * 字符串参数的长度上限（2048）。
 */
var MAX_STRING_ARG_CHARS = 2048;
var CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;
//@ chunk-s61vbvea.js:200945-201453 placement
/**
 * 匹配 nice 的组合短选项（如 -n5、-c）。
 */
var NICE_ADJUSTMENT_ARG_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TIMEOUT_DURATION_RE;
var NICE_FLAG_RE;
var SHELL_ASSIGNMENT_SUFFIX;
var regExp_6;
var GIT_PATH_OPTIONS;
var GIT_OPTIONS_WITH_VALUE;
deferInit("chunk-s61vbvea.js:200945", () => {
  NICE_ADJUSTMENT_ARG_RE = /^(?:-n|-n?-?\d+|--adjustment(?:=.*)?)$/;
  TIMEOUT_DURATION_RE =
    /^\+?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|0[xX](?:[\da-fA-F]+\.?[\da-fA-F]*|\.[\da-fA-F]+)(?:[pP][+-]?\d+)?|[iI][nN][fF](?:[iI][nN][iI][tT][yY])?)[smhd]?$/;
  NICE_FLAG_RE = /^-(?=[acl])[cl]*(?:a(.*))?$/;
  SHELL_ASSIGNMENT_SUFFIX = "(?:\\[[^\\]]*\\])?\\+?=";
  regExp_6 = new RegExp("^[A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]*\\])?\\+?=");
  GIT_PATH_OPTIONS = new Set([
    "--git-dir",
    "--separate-git-dir",
    "--work-tree",
    "--namespace",
    "--super-prefix",
    "--config-env",
  ]);
  GIT_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--attr-source", "--shallow-file", ...GIT_PATH_OPTIONS]);
});
//@ chunk-s61vbvea.js:201453-201510 placement
/**
 * 判断参数是否为 git 可执行名（含 Windows 的 git.exe）。
 */
function isGitExecutable(commandPath) {
  return /(?:^|[\\/])git(?:\.exe)?$/.test(commandPath);
}
//@ chunk-s61vbvea.js:201510-202828 placement
function stripShellPrefixWords(argv, hasPreamble, isGitName) {
  let fallbackIndex = hasPreamble ? -1 : undefined;
  let index = 0;
  while (index < argv.length && regExp_6.test(argv[index])) index++;
  while (index < argv.length) {
    let word = argv[index];
    switch (word) {
      case "noglob":
      case "nocorrect":
        index++;
        continue;
      case "builtin":
        index++;
        if (argv[index] !== undefined && isGitExecutable(argv[index])) return -1;
        continue;
      case "command":
        index++;
        if (argv[index] === "-p") index++;
        if (argv[index] === "--") index++;
        continue;
      case "exec":
        index++;
        for (
          let match = NICE_FLAG_RE.exec(argv[index] ?? "");
          match !== null;
          match = NICE_FLAG_RE.exec(argv[index] ?? "")
        )
          index += match[1] === "" ? 2 : 1;
        if (argv[index] === "--") index++;
        continue;
      case "nohup":
        index++;
        if (argv[index] === "--") index++;
        continue;
      case "time":
        index++;
        if (argv[index] === "-p") index++;
        if (argv[index] === "--") index++;
        while (index < argv.length && regExp_6.test(argv[index])) index++;
        continue;
      case "nice":
        index++;
        for (let arg = argv[index]; arg !== undefined && NICE_ADJUSTMENT_ARG_RE.test(arg); arg = argv[index])
          index += arg === "-n" || arg === "--adjustment" ? 2 : 1;
        if (argv[index] === "--") index++;
        continue;
      case "env":
        index++;
        while (argv[index] === "-i" || argv[index] === "-" || argv[index] === "--ignore-environment") index++;
        if (argv[index] === "--") index++;
        while (index < argv.length && /^[^-=][^=]*=/.test(argv[index])) index++;
        if (argv[index]?.startsWith("-") === true) return -1;
        continue;
      case "timeout":
      case "gtimeout": {
        index++;
        while (index < argv.length && argv[index].startsWith("-")) {
          let flag = argv[index];
          if (flag === "--") {
            index++;
            break;
          }
          if (flag === "-k" || flag === "-s" || flag === "--kill-after" || flag === "--signal") index += 2;
          else if (
            flag === "--preserve-status" ||
            flag === "--foreground" ||
            flag === "-v" ||
            flag === "--verbose" ||
            flag.startsWith("--kill-after=") ||
            flag.startsWith("--signal=") ||
            /^-[ks]\S+$/.test(flag)
          )
            index++;
          else return -1;
        }
        let duration = argv[index];
        if (duration === undefined) return fallbackIndex;
        if (!TIMEOUT_DURATION_RE.test(duration)) return -1;
        index++;
        continue;
      }
      default:
        return isGitName(word) ? index : -1;
    }
  }
  return fallbackIndex;
}
//@ chunk-s61vbvea.js:202828-202924 placement
/**
 * 判断文本里是否出现 git commit 命令（允许前置 -C/-c 等全局选项）。
 */
function looksLikeGitCommit(command) {
  return /\bgit\b(?:\s+(?:-C\s+\S+|-c\s+\S+=\S+|--\S+))*\s+commit(?:\s|$)/.test(command);
}
//@ chunk-s61vbvea.js:202924-203104 placement
function looksLikeCommitOutput(stdout, stderr, exitCode) {
  if (exitCode !== undefined) return exitCode === 0;
  let commitOutputPatterns = [
    /\[\w+[^\]]*\]\s+/,
    /create mode/,
    /\d+ files? changed/,
    /\d+ insertions?/,
    /\d+ deletions?/,
  ];
  let combinedOutput = stdout + stderr;
  return commitOutputPatterns.some((pattern) => pattern.test(combinedOutput));
}
//@ chunk-s61vbvea.js:203104-203535 placement
/**
 * 测试命令前的包运行器前缀（npx/bunx/uvx 等）。
 */
var TEST_COMMAND_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NPM_BIN_WRAPPER_PREFIX;
var TEST_COMMAND_RE;
var SECONDARY_TEST_COMMAND_RE;
deferInit("chunk-s61vbvea.js:203104", () => {
  TEST_COMMAND_PATTERNS = new Set([VERIFY, CODE_REVIEW]);
  NPM_BIN_WRAPPER_PREFIX = "(?:\\./)?(?:(?:npx|bunx|uvx|uv\\s+run)\\s+)?";
  TEST_COMMAND_RE = [
    /^(?:bun|npm|yarn|pnpm|deno)\s+(?:run\s+)?test\b/,
    /^(?:\.\/)?(?:go|cargo|make|mvn|gradle|gradlew|dotnet|swift|mix|sbt|lein|rake|zig|bazel|nx|turbo)\s+test\b/,
    new RegExp(`^${NPM_BIN_WRAPPER_PREFIX}(?:pytest|jest|vitest|rspec|phpunit|ctest)\\b`),
    /^(?:bun|npm|yarn|pnpm)\s+run\s+test:\S/,
  ];
  SECONDARY_TEST_COMMAND_RE = [
    /^(?:bun|npm|yarn|pnpm)\s+run\s+typecheck\b/,
    new RegExp(`^${NPM_BIN_WRAPPER_PREFIX}(?:tsc|mypy)\\b`),
  ];
});
//@ chunk-s61vbvea.js:203535-203574 placement
var AUTOMATED_TEST = "automated-test";
var TYPECHECK = "typecheck";
//@ chunk-s61vbvea.js:203574-203620 placement
/**
 * 把测试类模式名转成 “/name” 形式。
 */
function slashTestPattern(name) {
  return TEST_COMMAND_PATTERNS.has(name) ? `/${name}` : null;
}
//@ chunk-s61vbvea.js:203620-203675 placement
/**
 * 测试相关模式的斜杠形式集合。
 */
var SLASH_TEST_PATTERNS; // deferred: uses TEST_COMMAND_PATTERNS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:203620", () => {
  SLASH_TEST_PATTERNS = new Set([
    AUTOMATED_TEST,
    TYPECHECK,
    ...Array.from(TEST_COMMAND_PATTERNS, (name) => `/${name}`),
  ]);
});
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
var LOCKFILE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GENERATED_FILE_EXTENSIONS;
var GENERATED_CONTENT_MARKERS;
var GENERATED_HEADER_RE;
deferInit("chunk-s61vbvea.js:203966", () => {
  LOCKFILE_NAMES = new Set([
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
  GENERATED_FILE_EXTENSIONS = new Set([
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
  GENERATED_CONTENT_MARKERS = [
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
  GENERATED_HEADER_RE = [
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
});
//@ chunk-s61vbvea.js:204912-205250 placement
/**
 * 判断文件是否为锁文件或生成文件（按文件名、扩展名与目录特征）。
 */
function isLockOrGeneratedFile(filePath) {
  let normalizedPath = posix.sep + filePath.split(sep).join(posix.sep).replace(/^\/+/, "");
  let lower = basename(filePath).toLowerCase();
  let lower_2 = extname(filePath).toLowerCase();
  if (LOCKFILE_NAMES.has(lower)) return true;
  if (GENERATED_FILE_EXTENSIONS.has(lower_2)) return true;
  let parts = lower.split(".");
  if (parts.length > 2) {
    let doubleExt = "." + parts.slice(-2).join(".");
    if (GENERATED_FILE_EXTENSIONS.has(doubleExt)) return true;
  }
  for (let marker of GENERATED_CONTENT_MARKERS) if (normalizedPath.includes(marker)) return true;
  for (let pattern of GENERATED_HEADER_RE) if (pattern.test(lower)) return true;
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
function gitListingError(commandLabel, result) {
  let detail = result.stderr.trim() || result.error || "";
  return new GitListingError(
    result.maxBufferExceeded
      ? `${commandLabel}: output exceeded ${MAX_GIT_OUTPUT_BYTES} bytes`
      : result.timedOut
        ? `${commandLabel} timed out after ${GIT_COMMAND_TIMEOUT_MS}ms`
        : `${commandLabel} failed (code ${result.code}): ${truncateToLength(detail, 200)}`,
  );
}
//@ chunk-s61vbvea.js:205531-206241 placement
async function checkLinguistGenerated(stagedFiles, repoRoot, options) {
  let generatedPaths = new Set();
  let linguistGeneratedByPath = getGitRepoCache().linguistGeneratedByPath;
  let joined = (options.repoArgs ?? []).join(" ");
  let uncheckedPaths = [];
  for (let filePath of stagedFiles) {
    if (isLockOrGeneratedFile(filePath)) {
      generatedPaths.add(filePath);
      continue;
    }
    if (!isRepoRelativePath(filePath, repoRoot)) continue;
    let cachedFlag = linguistGeneratedByPath.get(`${repoRoot}\x00${filePath}\x00${joined}`);
    if (cachedFlag === undefined) uncheckedPaths.push(filePath);
    else if (cachedFlag) generatedPaths.add(filePath);
  }
  if (uncheckedPaths.length === 0 || !(options.inRepo ?? findGitRootRecheckingNegative(repoRoot) !== null))
    return generatedPaths;
  let checkResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...(options.repoArgs ?? []), "check-attr", "-z", "--stdin", "linguist-generated"],
    {
      cwd: repoRoot,
      timeout: GIT_COMMAND_TIMEOUT_MS,
      input: uncheckedPaths.join("\x00") + "\x00",
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      env: options.env,
      extendEnv: false,
    },
  );
  if (checkResult.code !== 0 || checkResult.maxBufferExceeded)
    throw gitListingError("git check-attr", checkResult);
  let parts = checkResult.stdout.split("\x00");
  for (let offset = 0; offset + 3 < parts.length; offset += 3) {
    let lower = parts[offset + 2].toLowerCase();
    let isGenerated = lower === "set" || lower === "true";
    linguistGeneratedByPath.set(`${repoRoot}\x00${parts[offset]}\x00${joined}`, isGenerated);
    if (isGenerated) generatedPaths.add(parts[offset]);
  }
  return generatedPaths;
}
//@ chunk-s61vbvea.js:206241-206310 placement
/**
 * 判断路径是否位于仓库内（相对路径且不含 ..）。
 */
function isRepoRelativePath(filePath, repoRoot) {
  let repoRelative = isAbsolute(filePath) ? relative(repoRoot, filePath) : filePath;
  return repoRelative !== "" && !isAbsolute(repoRelative) && !containsPathTraversal(repoRelative);
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
  let normalizedPath = posix.sep + path.split(sep).join(posix.sep).replace(/^\/+/, "");
  let fileName = basename(path);
  for (let segment of TEST_DIR_SEGMENTS) if (normalizedPath.includes(segment)) return true;
  for (let pattern of TEST_FILE_PATTERNS) if (pattern.test(fileName)) return true;
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
  MAX_STRING_ARG_CHARS,
  CONTROL_CHARS_RE,
  ANY_PATTERN,
  GIT_OPTIONS_WITH_VALUE,
  stripShellPrefixWords,
  looksLikeGitCommit,
  looksLikeCommitOutput,
};
