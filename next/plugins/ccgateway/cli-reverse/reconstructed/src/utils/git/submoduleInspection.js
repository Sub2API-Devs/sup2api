/**
 * utils/git/submoduleInspection.ts
 *
 * 2.1.316 新增：检查单个子模块目录（.git 文件、gitdir 位置、嵌套仓库）；从 ls-files 输出中收集 gitlink 路径等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e3y61d7t.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, resolve, dirname, sep, isAbsolute } from "path";
import { realpath, lstat, opendir, open } from "fs/promises";
import { finished } from "stream/promises";
import { constants } from "fs";
import { withTimeout } from "../sleep.js";
import { printableLabel } from "../printableName.js";
import { buildGitEnvForRepo } from "./gitDirResolution.js";
import { resolveGitDir, rawPointerPathIsUnsafe, GIT_CONFIG_MAX_BYTES } from "./gitFilesystem.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS, SAFE_GIT_ENV_CONSTANTS } from "./gitSafeEnv.js";
import { buildSafeGitInvocation } from "./gitSafeInvocation.js";
import { safeSpawn } from "../safeSpawn.js";
import { foldName, INVISIBLE_FORMAT_CHAR_RE } from "../permissions/protectedDirNames.js";
import { isOnForeignMount } from "../networkPaths.js";
import { getErrnoCode } from "../errors.js";
import { rejectSeparatorPath } from "../gitSafeExec.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildFilterNeutralizingArgs } from "./gitConfigFilters.js";
import { hasDotSegment } from "../pathClassification.js";
import { getPlatform } from "../platform.js";

//@ chunk-e3y61d7t.js:1283-1383 placement
var SUBMODULE_DEADLINE_MS = 15000;
var MAX_SUBMODULES = 512;
var MAX_DEPTH = 8;
var MAX_GITMODULES_BYTES = 1e6;
var MAX_POINTER_BYTES = 4096;
var MAX_PATH_LENGTH = 4096;
var MAX_OUTPUT_BYTES = 8388608;
var MAX_LINE_BYTES = 74 + 4 * MAX_PATH_LENGTH;
var DEADLINE_REASON = "submodule inspection deadline";
//@ chunk-e3y61d7t.js:1383-1566 placement
/**
 * 在截止时间内检查子模块是否有改动（超时/不可读视为无法验证）。
 */
async function inspectSubmodules(repoDir, options) {
  let deadlineMs = options?.deadlineMs ?? SUBMODULE_DEADLINE_MS;
  try {
    return await withTimeout(inspectSubmodulesUnsafe(repoDir, deadlineMs), deadlineMs, DEADLINE_REASON);
  } catch (error) {
    return {
      kind: "unverifiable",
      reason: error instanceof Error && error.message === DEADLINE_REASON ? "timeout" : "unreadable",
    };
  }
}
//@ chunk-e3y61d7t.js:1566-1771 placement
/**
 * 把检查结果转为改动列表。
 */
function submoduleChanges(result) {
  if (result.kind === "unverifiable")
    return {
      kind: "unverifiable",
      reason: result.reason,
      path: result.path,
    };
  let changedPaths = [...result.withTrackedChanges, ...result.withUntrackedFiles];
  return changedPaths.length > 0
    ? {
        kind: "changes",
        paths: changedPaths,
      }
    : undefined;
}
//@ chunk-e3y61d7t.js:1771-2900 placement
/**
 * 描述子模块改动或无法验证的原因。
 */
function describeSubmoduleChanges(result) {
  if (result.kind === "changes") {
    let filtered = result.paths.slice(0, 3).map(printableShortLabel).filter(Boolean);
    let omittedCount = result.paths.length - filtered.length;
    return `changes inside ${result.paths.length === 1 ? "submodule" : "submodules"} ${filtered.join(", ")}${omittedCount > 0 ? ` and ${omittedCount} more` : ""}`;
  }
  let shownPath = result.path === undefined ? undefined : printableShortLabel(result.path) || undefined;
  switch (result.reason) {
    case "nested_repository":
      return `${shownPath ?? "a directory"} is a separate git repository inside the worktree, not a submodule checkout`;
    case "gitdir_outside_modules":
      return `submodule ${shownPath ?? "checkout"} points at a git directory outside this worktree's own, or its object alternates or config lead somewhere this worktree cannot vouch for`;
    case "unconfigured_gitlink":
      return `${shownPath ?? "a directory"} is a nested repository recorded in the index but not a configured submodule`;
    case "nested_submodules":
      return `submodule ${shownPath ?? "checkout"} holds submodules of its own, which can't be inspected`;
    case "too_many":
      return `it records more than ${MAX_SUBMODULES} submodules, too many to inspect`;
    case "unreadable":
      return shownPath === undefined
        ? "its submodules' state could not be read"
        : `the state of submodule ${shownPath} could not be read`;
    case "timeout":
      return "inspecting its submodules took too long";
  }
}
//@ chunk-e3y61d7t.js:2900-2925 placement
var LABEL_HEAD_TAIL = {
  head: 24,
  tail: 16,
};
//@ chunk-e3y61d7t.js:2925-2955 placement
function printableShortLabel(path) {
  return printableLabel(path, LABEL_HEAD_TAIL);
}
//@ chunk-e3y61d7t.js:2955-3849 placement
/**
 * 子模块检查的实际逻辑（gitmodules、ls-files、各子模块状态）。
 */
async function inspectSubmodulesUnsafe(repoDir, deadlineMs) {
  let options = {
    repository: [],
    env: buildGitEnvForRepo(repoDir),
    deadlineMs,
  };
  let gitlinks = await listGitlinkEntries(repoDir, options);
  if (typeof gitlinks === "string")
    return {
      kind: "unverifiable",
      reason: gitlinks,
    };
  if (gitlinks.length === 0)
    return {
      kind: "verified",
      withTrackedChanges: [],
      withUntrackedFiles: [],
    };
  let submodulePaths = await listSubmodulePaths(repoDir, options);
  if (typeof submodulePaths === "string")
    return {
      kind: "unverifiable",
      reason: submodulePaths,
    };
  let gitDir = await resolveGitDir(repoDir);
  if (gitDir === null)
    return {
      kind: "unverifiable",
      reason: "unreadable",
    };
  let real;
  try {
    real = join(await realpath(gitDir), "modules");
  } catch {
    return {
      kind: "unverifiable",
      reason: "unreadable",
    };
  }
  let modulesDirs = {
    lexical: join(gitDir, "modules"),
    real,
  };
  let configuredPaths = new Set(submodulePaths);
  let inspect = limitConcurrency(MAX_DEPTH, (path) =>
    configuredPaths.has(path)
      ? inspectSubmodule(repoDir, path, modulesDirs, options)
      : classifySubmoduleDir(repoDir, path),
  );
  let results = await Promise.all(gitlinks.map((path) => inspect(path)));
  let withTrackedChanges = [];
  let withUntrackedFiles = [];
  for (let [index, result] of results.entries()) {
    let path = gitlinks[index];
    switch (result) {
      case "absent":
      case "clean":
        break;
      case "tracked":
        withTrackedChanges.push(path);
        break;
      case "untracked":
        withUntrackedFiles.push(path);
        break;
      default:
        return {
          kind: "unverifiable",
          reason: result.unverifiable,
          path,
        };
    }
  }
  return {
    kind: "verified",
    withTrackedChanges,
    withUntrackedFiles,
  };
}
//@ chunk-e3y61d7t.js:3849-4112 placement
/**
 * 读 .gitmodules 中的子模块路径。
 */
async function listSubmodulePaths(cwd, options) {
  let gitmodulesEntry = await statEntry(join(cwd, ".gitmodules"), MAX_GITMODULES_BYTES);
  switch (gitmodulesEntry.kind) {
    case "absent":
      return [];
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  let entries = await gitConfigFromStdin(gitmodulesEntry.text, "^submodule\\..*\\.path$", cwd, options);
  return entries === "unreadable" ? entries : dedupeSubmodulePaths(entries.map((entry) => entry.value));
}
//@ chunk-e3y61d7t.js:4112-4598 placement
/**
 * 用 git config --file - 读取配置。
 */
async function gitConfigFromStdin(input, keyPattern, cwd, { repository, env, deadlineMs }) {
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...repository,
      ...GIT_SAFE_GLOBAL_ARGS,
      "config",
      "--file",
      "-",
      "--no-includes",
      "-z",
      "--get-regexp",
      keyPattern,
    ],
    {
      cwd,
      env,
      input,
      timeout: deadlineMs,
      preserveOutputOnError: false,
    },
  );
  let isNoMatch =
    result.exitCode === 1 && result.error === undefined && !result.timedOut && !result.maxBufferExceeded;
  if (result.code !== 0 && !isNoMatch) return "unreadable";
  let entries = [];
  for (let line of result.stdout.split("\x00")) {
    if (line === "") continue;
    let index = line.indexOf(`
`);
    if (index === -1) return "unreadable";
    entries.push({
      key: line.slice(0, index),
      value: line.slice(index + 1),
    });
  }
  return entries;
}
//@ chunk-e3y61d7t.js:4598-4649 placement
/**
 * 列出索引中的 gitlink（子模块）条目。
 */
async function listGitlinkEntries(cwd, options, reader) {
  return listGitlinks(cwd, options, "160000", reader);
}
//@ chunk-e3y61d7t.js:4649-4696 placement
/**
 * 列出索引中的符号链接条目。
 */
async function listSymlinkEntries(cwd, options) {
  return listGitlinks(cwd, options, "120000");
}
//@ chunk-e3y61d7t.js:4696-5061 placement
/**
 * 列出索引中的 gitlink（子模块）条目。
 */
async function listGitlinks(cwd, options, reader, verbose) {
  let args = [
    ...options.repository,
    ...GIT_SAFE_GLOBAL_ARGS,
    "ls-files",
    "-s",
    ...(verbose === undefined ? [] : ["-v"]),
    "-z",
  ];
  let result = await execFileNoThrowWithCwd(options.git ?? gitExe(), args, {
    cwd,
    env: options.env,
    timeout: options.deadlineMs,
    maxBuffer: MAX_OUTPUT_BYTES,
    preserveOutputOnError: false,
    stdin: "ignore",
  });
  if (result.maxBufferExceeded) return streamGitlinks(cwd, args, options, reader, verbose);
  if (result.code !== 0) return "unreadable";
  let collector = new GitlinkCollector(reader, verbose);
  collector.push(Buffer.from(result.stdout, "utf8"));
  return collector.end();
}
//@ chunk-e3y61d7t.js:5061-5618 placement
/**
 * 输出过大时流式读取 gitlink。
 */
async function streamGitlinks(cwd, args, { git = gitExe(), env, deadlineMs }, mode, reader) {
  let safeGitInvocation = buildSafeGitInvocation(git, args, env);
  let collector = new GitlinkCollector(mode, reader);
  try {
    let child = safeSpawn(git, safeGitInvocation?.args ?? args, {
      cwd,
      env: safeGitInvocation?.env ?? env,
      timeout: deadlineMs,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
    child.stdout?.on("data", (chunk) => {
      if (collector.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8")) !== undefined)
        child.kill();
    });
    let stdoutDone = child.stdout ? finished(child.stdout).catch(() => {}) : Promise.resolve();
    let result = await child;
    let succeeded =
      !result.timedOut && !result.isCanceled && result.signal === undefined && result.exitCode === 0;
    if (!succeeded) child.stdout?.destroy();
    await stdoutDone;
    let collected = collector.end();
    if (typeof collected === "string") return collected;
    return succeeded ? collected : "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-e3y61d7t.js:5618-7302 placement
/**
 * 从 ls-files 输出中收集 gitlink 路径。
 */
class GitlinkCollector {
  bitsSeen;
  prefix;
  paths = new Set();
  record = "none";
  pending = [];
  pendingBytes = 0;
  verdict = undefined;
  letterBytes;
  constructor(modePrefix, bitsSeen) {
    this.bitsSeen = bitsSeen;
    this.prefix = `${modePrefix} `;
    this.letterBytes = bitsSeen === undefined ? 0 : 2;
  }
  push(chunk) {
    let cursor = 0;
    while (this.verdict === undefined && cursor < chunk.length) {
      let index = chunk.indexOf(0, cursor);
      let recordEnd = index === -1 ? chunk.length : index;
      this.append(chunk.subarray(cursor, recordEnd));
      if (index === -1) break;
      this.completeRecord();
      cursor = index + 1;
    }
    return this.verdict;
  }
  end() {
    if (this.verdict !== undefined) return this.verdict;
    if (this.record !== "none") return "unreadable";
    return dedupeSubmodulePaths([...this.paths]);
  }
  append(chunk) {
    if (chunk.length === 0 || this.record === "other") return;
    this.pending.push(chunk);
    this.pendingBytes += chunk.length;
    if (this.record === "none") this.record = "undecided";
    let headerBytes = this.letterBytes + this.prefix.length;
    if (this.record === "undecided" && this.pendingBytes >= headerBytes) {
      let combined = this.pending.length === 1 ? chunk : Buffer.concat(this.pending);
      this.noteLetter(combined.toString("latin1", 0, this.letterBytes));
      if (combined.toString("latin1", this.letterBytes, headerBytes) === this.prefix) {
        this.record = "listed";
        this.pending = [combined];
      } else {
        this.record = "other";
        this.pending = [];
      }
    }
    if (this.record === "listed" && this.pendingBytes > MAX_LINE_BYTES) this.verdict = "unreadable";
  }
  noteLetter(letterPair) {
    if (this.bitsSeen === undefined) return;
    if (!/^[A-Za-z] $/.test(letterPair)) {
      this.verdict = "unreadable";
      return;
    }
    let letter = letterPair[0];
    this.bitsSeen.assumeUnchanged ||= letter === letter.toLowerCase();
    this.bitsSeen.skipWorktree ||= letter.toUpperCase() === "S";
  }
  completeRecord() {
    if (this.record === "undecided" && this.bitsSeen !== undefined) this.verdict ??= "unreadable";
    if (this.record === "listed" && this.verdict === undefined) {
      let str = Buffer.concat(this.pending).toString("utf8");
      let index = str.indexOf("\t");
      if (index === -1) this.verdict = "unreadable";
      else {
        this.paths.add(str.slice(index + 1));
        if (this.paths.size > MAX_SUBMODULES) this.verdict = "too_many";
      }
    }
    this.record = "none";
    this.pending = [];
    this.pendingBytes = 0;
  }
}
//@ chunk-e3y61d7t.js:7302-7448 placement
function dedupeSubmodulePaths(paths) {
  let unique = new Set();
  for (let path of paths) {
    if (path.includes("\uFFFD") || !isSafeSubmodulePath(path)) return "unreadable";
    unique.add(path);
    if (unique.size > MAX_SUBMODULES) return "too_many";
  }
  return [...unique];
}
//@ chunk-e3y61d7t.js:7448-7689 placement
function isSafeSubmodulePath(path) {
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return false;
  return path.split("/").every((segment) => {
    let folded = foldName(segment);
    return (
      segment.replace(/[. ]+$/, "") !== "" &&
      folded !== ".git" &&
      folded !== "git~1" &&
      !INVISIBLE_FORMAT_CHAR_RE.test(segment) &&
      [...segment].every(
        (char) => char !== "\\" && char !== ":" && char !== ";" && char > "\x1F" && char !== "\x7F",
      )
    );
  });
}
//@ chunk-e3y61d7t.js:7689-9504 placement
/**
 * 检查单个子模块目录（.git 文件、gitdir 位置、嵌套仓库）。
 */
async function inspectSubmodule(repoDir, submodulePath, modulesDirs, options) {
  let { deadlineMs } = options;
  let walkResult = await walkSubmodulePath(repoDir, submodulePath);
  if (walkResult.kind !== "directory")
    return walkResult.kind === "absent"
      ? "absent"
      : {
          unverifiable: "unreadable",
        };
  let path = walkResult.path;
  let dotGitEntry = await statEntry(join(path, ".git"), MAX_POINTER_BYTES);
  switch (dotGitEntry.kind) {
    case "absent":
      return isDirEmpty(path);
    case "directory":
      return {
        unverifiable: "nested_repository",
      };
    case "other":
      return {
        unverifiable: "unreadable",
      };
    case "file":
      break;
  }
  let trimmed = dotGitEntry.text.trim();
  if (!trimmed.startsWith("gitdir:"))
    return {
      unverifiable: "unreadable",
    };
  let trimmed_2 = trimmed.slice(7).trim();
  if (trimmed_2 === "" || isOnForeignMount(trimmed_2, path))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  let gitDirPath = resolve(path, trimmed_2);
  if (!isPathUnder(gitDirPath, modulesDirs.lexical) && !isPathUnder(gitDirPath, modulesDirs.real))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  if (rawPointerPathIsUnsafe(trimmed_2, path))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  let realGitDir;
  try {
    realGitDir = await realpath(gitDirPath);
  } catch {
    return {
      unverifiable: "unreadable",
    };
  }
  if (!isPathUnder(realGitDir, modulesDirs.real))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  try {
    await lstat(join(realGitDir, "commondir"));
    return {
      unverifiable: "gitdir_outside_modules",
    };
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      return {
        unverifiable: "unreadable",
      };
  }
  let objectsDir = join(realGitDir, "objects");
  let objectsProblem = await checkModuleGitDir(objectsDir, 0, new Set([objectsDir]));
  if (objectsProblem !== undefined)
    return {
      unverifiable: objectsProblem,
    };
  let configPaths = [join(realGitDir, "config"), join(realGitDir, "config.worktree")];
  let seenConfigs = new Set(configPaths);
  for (let configPath of configPaths) {
    let configProblem = await checkModuleConfig(configPath, repoDir, options, 0, seenConfigs);
    if (configProblem !== undefined)
      return {
        unverifiable: configProblem,
      };
  }
  let ceilingDir = rejectSeparatorPath(dirname(path));
  if (ceilingDir === null)
    return {
      unverifiable: "unreadable",
    };
  let gitOptions = {
    GIT_CEILING_DIRECTORIES: ceilingDir,
    GIT_COMMON_DIR: realGitDir,
  };
  let moduleContext = {
    repository: [`--git-dir=${realGitDir}`, `--work-tree=${path}`],
    env: getRemoteHostSessionCount(gitOptions),
    deadlineMs,
  };
  if (await anySubmoduleCheckedOut(path, moduleContext))
    return {
      unverifiable: "nested_submodules",
    };
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(path, {
    repository: moduleContext.repository,
    envPins: gitOptions,
  });
  if (!filterNeutralizingArgs.ok)
    return {
      unverifiable: "unreadable",
    };
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...moduleContext.repository,
      ...filterNeutralizingArgs.args,
      ...GIT_SAFE_GLOBAL_ARGS,
      ...SAFE_GIT_ENV_CONSTANTS,
    ],
    {
      cwd: path,
      env: getRemoteHostSessionCount(gitOptions, {
        userLocale: true,
      }),
      timeout: deadlineMs,
      preserveOutputOnError: false,
    },
  );
  if (result.code !== 0)
    return {
      unverifiable: "unreadable",
    };
  let filtered = result.stdout
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.some((line) => !line.startsWith("??"))) return "tracked";
  return filtered.length > 0 ? "untracked" : "clean";
}
//@ chunk-e3y61d7t.js:9504-9707 placement
async function classifySubmoduleDir(repoDir, submodulePath) {
  let dirKind = await inspectSubmoduleDir(repoDir, submodulePath);
  switch (dirKind) {
    case "absent":
    case "untracked":
      return dirKind;
    case "repository":
      return {
        unverifiable: "unconfigured_gitlink",
      };
    case "unreadable":
      return {
        unverifiable: "unreadable",
      };
  }
}
//@ chunk-e3y61d7t.js:9707-9749 placement
function isPathUnder(path, rootPath) {
  return path.startsWith(rootPath + sep);
}
//@ chunk-e3y61d7t.js:9749-9813 placement
var MAX_GITDIR_POINTER_DEPTH = 5;
var MAX_SUBMODULE_NESTING = 10;
var MAX_GITDIR_POINTER_ENTRIES = 16;
var DRIVE_PATH_WITHOUT_SEP_RE = /^[A-Za-z]:(?![\\/])/;
var LEADING_PARENT_SEGMENTS_RE = /^(?:\.\.\/+)*/;
//@ chunk-e3y61d7t.js:9813-9916 placement
function isUnsafeGitdirPointer(pointer, baseDir) {
  return (
    pointer.includes("\uFFFD") ||
    DRIVE_PATH_WITHOUT_SEP_RE.test(pointer) ||
    hasDotSegment(isAbsolute(pointer) ? pointer : pointer.replace(LEADING_PARENT_SEGMENTS_RE, "")) ||
    isOnForeignMount(pointer, baseDir) ||
    rawPointerPathIsUnsafe(pointer, baseDir)
  );
}
//@ chunk-e3y61d7t.js:9916-10756 placement
/**
 * 检查子模块 gitdir 必须在 .git/modules 内。
 */
async function checkModuleGitDir(objectsDir, depth, seen) {
  if (depth > MAX_GITDIR_POINTER_DEPTH || seen.size > MAX_GITDIR_POINTER_ENTRIES)
    return "gitdir_outside_modules";
  try {
    if (!(await lstat(objectsDir)).isDirectory()) return "gitdir_outside_modules";
  } catch {
    return "unreadable";
  }
  let infoDir = join(objectsDir, "info");
  try {
    if (!(await lstat(infoDir)).isDirectory()) return "gitdir_outside_modules";
  } catch (error) {
    return isNotFoundCode(getErrnoCode(error)) ? undefined : "unreadable";
  }
  try {
    await lstat(join(infoDir, "http-alternates"));
    return "gitdir_outside_modules";
  } catch (error) {
    if (!isNotFoundCode(getErrnoCode(error))) return "unreadable";
  }
  let alternatesEntry = await statEntry(join(infoDir, "alternates"), MAX_POINTER_BYTES);
  switch (alternatesEntry.kind) {
    case "absent":
      return;
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  let lineCount = 0;
  for (let line of alternatesEntry.text.split(`
`)) {
    if (line === "" || line.startsWith("#")) continue;
    lineCount++;
    if (
      lineCount > MAX_GITDIR_POINTER_ENTRIES ||
      line.startsWith('"') ||
      isUnsafeGitdirPointer(line, objectsDir)
    )
      return "gitdir_outside_modules";
    let alternatePath;
    try {
      alternatePath = await realpath(resolve(objectsDir, line));
    } catch (error) {
      if (isNotFoundCode(getErrnoCode(error))) continue;
      return "unreadable";
    }
    if (seen.has(alternatePath)) continue;
    seen.add(alternatePath);
    let problem = await checkModuleGitDir(alternatePath, depth + 1, seen);
    if (problem !== undefined) return problem;
  }
  return;
}
//@ chunk-e3y61d7t.js:10756-10848 placement
var SUBMODULE_UNSAFE_CONFIG_RE =
  "^(include\\.path|includeif\\..*\\.path|core\\.excludesfile|core\\.attributesfile)$";
//@ chunk-e3y61d7t.js:10848-11619 placement
/**
 * 检查子模块配置是否含危险项。
 */
async function checkModuleConfig(configPath, cwd, repoDir, depth, seen) {
  if (depth > MAX_SUBMODULE_NESTING || seen.size > MAX_GITDIR_POINTER_ENTRIES)
    return "gitdir_outside_modules";
  let configEntry = await statEntry(configPath, GIT_CONFIG_MAX_BYTES);
  switch (configEntry.kind) {
    case "absent":
      return;
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  if (!/include|excludesfile|attributesfile/i.test(configEntry.text)) return;
  let unsafeEntries = await gitConfigFromStdin(configEntry.text, SUBMODULE_UNSAFE_CONFIG_RE, cwd, repoDir);
  if (unsafeEntries === "unreadable") return "unreadable";
  if (unsafeEntries.length > MAX_GITDIR_POINTER_ENTRIES) return "gitdir_outside_modules";
  let configDir = dirname(configPath);
  for (let { key, value } of unsafeEntries) {
    let isInclude = key.startsWith("include");
    if (
      value === "" ||
      value.startsWith("~") ||
      value.startsWith("%(prefix)/") ||
      (!isInclude && !isAbsolute(value)) ||
      isUnsafeGitdirPointer(value, configDir)
    )
      return "gitdir_outside_modules";
    if (!isInclude) continue;
    let includePath = resolve(configDir, value);
    let realInclude;
    try {
      realInclude = await realpath(includePath);
    } catch (error) {
      if (isNotFoundCode(getErrnoCode(error))) continue;
      return "unreadable";
    }
    if (realInclude !== includePath) return "gitdir_outside_modules";
    if (seen.has(realInclude)) continue;
    seen.add(realInclude);
    let problem = await checkModuleConfig(realInclude, cwd, repoDir, depth + 1, seen);
    if (problem !== undefined) return problem;
  }
  return;
}
//@ chunk-e3y61d7t.js:11619-11765 placement
async function anySubmoduleCheckedOut(repoDir, options) {
  let gitlinks = await listGitlinkEntries(repoDir, options);
  if (typeof gitlinks === "string") return true;
  return (await Promise.all(gitlinks.map((path) => inspectSubmoduleDir(repoDir, path)))).some(
    (state) => state !== "absent",
  );
}
//@ chunk-e3y61d7t.js:11765-12008 placement
async function inspectSubmoduleDir(repoDir, submodulePath) {
  let walkResult = await walkSubmodulePath(repoDir, submodulePath);
  if (walkResult.kind !== "directory") return walkResult.kind;
  try {
    await lstat(join(walkResult.path, ".git"));
    return "repository";
  } catch (error) {
    if (!isNotFoundCode(getErrnoCode(error))) return "unreadable";
  }
  let emptyKind = await isDirEmpty(walkResult.path);
  return emptyKind === "absent" || emptyKind === "untracked" ? emptyKind : "unreadable";
}
//@ chunk-e3y61d7t.js:12008-12244 placement
async function isDirEmpty(path) {
  let dirHandle;
  try {
    dirHandle = await opendir(path);
  } catch (error) {
    return isNotFoundCode(getErrnoCode(error))
      ? "absent"
      : {
          unverifiable: "unreadable",
        };
  }
  try {
    return (await dirHandle.read()) === null ? "absent" : "untracked";
  } catch {
    return {
      unverifiable: "unreadable",
    };
  } finally {
    try {
      await dirHandle.close();
    } catch {}
  }
}
//@ chunk-e3y61d7t.js:12244-12460 placement
async function walkSubmodulePath(repoDir, submodulePath) {
  let currentDir = repoDir;
  for (let segment of submodulePath.split("/")) {
    currentDir = join(currentDir, segment);
    try {
      if (!(await lstat(currentDir)).isDirectory())
        return {
          kind: "absent",
        };
    } catch (error) {
      return isNotFoundCode(getErrnoCode(error))
        ? {
            kind: "absent",
          }
        : {
            kind: "unreadable",
          };
    }
  }
  return {
    kind: "directory",
    path: currentDir,
  };
}
//@ chunk-e3y61d7t.js:12460-12509 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isNotFoundCode(realCandidate) {
  return realCandidate === "ENOENT" || realCandidate === "ENOTDIR";
}
//@ chunk-e3y61d7t.js:12509-13342 placement
/**
 * 判断路径类型（目录/文件/其他/不存在）。
 */
async function statEntry(filePath, maxBytes) {
  let isWindows = getPlatform() === "windows";
  let beforeIdentity;
  if (isWindows)
    try {
      let stats = await lstat(filePath, {
        bigint: true,
      });
      if (stats.isDirectory())
        return {
          kind: "directory",
        };
      if (!stats.isFile())
        return {
          kind: "other",
        };
      beforeIdentity = {
        dev: stats.dev,
        ino: stats.ino,
      };
    } catch (error) {
      return isNotFoundCode(getErrnoCode(error))
        ? {
            kind: "absent",
          }
        : {
            kind: "other",
          };
    }
  let handle;
  try {
    handle = await open(
      filePath,
      isWindows ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (isNotFoundCode(errnoCode))
      return {
        kind: "absent",
      };
    return errnoCode === "EISDIR"
      ? {
          kind: "directory",
        }
      : {
          kind: "other",
        };
  }
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (
      beforeIdentity !== undefined &&
      (stats.dev !== beforeIdentity.dev || stats.ino !== beforeIdentity.ino)
    )
      return {
        kind: "other",
      };
    if (stats.isDirectory())
      return {
        kind: "directory",
      };
    if (!stats.isFile() || stats.size > BigInt(maxBytes))
      return {
        kind: "other",
      };
    let size = Number(stats.size);
    let { buffer, bytesRead } = await handle.read(Buffer.alloc(size + 1), 0, size + 1, 0);
    if (bytesRead > size)
      return {
        kind: "other",
      };
    return {
      kind: "file",
      text: buffer.toString("utf8", 0, bytesRead),
    };
  } catch {
    return {
      kind: "other",
    };
  } finally {
    await handle.close();
  }
}
export {
  listSubmodulePaths,
  listGitlinkEntries,
  inspectSubmodules,
  submoduleChanges,
  describeSubmoduleChanges,
  listSymlinkEntries,
};
