/**
 * utils/hooks/hookCommandResolution.ts
 *
 * 2.1.316 新增：钩子命令程序解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (27)
 * attribution: placement 28
 */
import { realpath, lstat, access, readlink, stat, open } from "fs/promises";
import { isAbsolute, join, dirname, basename, delimiter, resolve as resolve_2 } from "path";
import { userInfo } from "os";
import { constants } from "fs";
import { getErrnoCode } from "../errors.js";
import { uniq } from "../collections.js";
import { subprocessEnv, hipaaCredentialScrubKeys } from "../subprocessEnv.js";
import { anyPairMatches } from "../settings/stickyRoots.js";
import { normalizeCommandForPlatform } from "../git.js";
import { BUILD_TOOL_ENV_VARS, isDangerousEnvName } from "../git/builderGit/gitEnv.js";
import { envVarToUpperSnake } from "../settings/policyHelper/helperExec.js";
import { parseShebangArgs } from "./hookCommandAnalysis.js";
import { getGlobalClaudeFile } from "../env.js";
import { getSurfacedHookSpawnFailures } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../task/taskNotifications.js";
import { logError } from "../log.js";
import { posixPathToWindowsPath } from "../path.js";
import { HostScoped } from "../hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:829244-829372 placement
function omitKeys(object, keys) {
  let omit = new Set(typeof keys === "string" ? [keys] : keys);
  return Object.fromEntries(Object.entries(object).filter(([key]) => !omit.has(key)));
}
//@ chunk-e6aww6q8.js:829372-829685 placement
/**
 * 求路径的真实路径，允许末端不存在（拼回缺失部分）。
 */
async function realpathAllowMissing(path) {
  let suffix = "";
  for (let current = path; ;)
    try {
      let realPath = await realpath(current);
      if (!isAbsolute(realPath)) return "unreadable";
      return join(realPath, suffix);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") return "unreadable";
      if (
        await lstat(current).then(
          (stats) => stats.isSymbolicLink(),
          () => false,
        )
      )
        return "unreadable";
      let parent = dirname(current);
      if (parent === current) return "absent";
      suffix = join(basename(current), suffix);
      current = parent;
    }
}
//@ chunk-e6aww6q8.js:829685-829917 placement
function mergeHookEnv_2({ attached, beforeSettings, ownEnv, childrenSee }) {
  if (beforeSettings === undefined)
    return {
      ...attached,
    };
  return Object.fromEntries(
    uniq([...Object.keys(attached), ...Object.keys(ownEnv).filter(childrenSee)]).map((name) => [
      name,
      Object.hasOwn(ownEnv, name)
        ? ownEnv[name]
        : attached[name] === beforeSettings[name]
          ? attached[name]
          : beforeSettings[name],
    ]),
  );
}
//@ chunk-e6aww6q8.js:829917-829999 placement (2.1.88 match: resolveOptions, 0.831)
function resolveOptions(options) {
  if (options.HOME) return options.HOME;
  try {
    return userInfo().homedir;
  } catch {
    return "/";
  }
}
//@ chunk-e6aww6q8.js:829999-830020 placement
/**
 * 空 PATH 目录（/var/empty），用于让钩子找不到任何程序。
 */
var EMPTY_PATH_DIR = "/var/empty";
//@ chunk-e6aww6q8.js:830020-830076 placement
/**
 * 合并钩子环境：基础环境去掉省略键再叠加额外项。
 */
function mergeHookEnv(env) {
  return {
    ...omitKeys(env.base, env.omit),
    ...env.extra,
  };
}
//@ chunk-e6aww6q8.js:830076-831105 placement
/**
 * 在 PATH 中解析钩子命令对应的程序。
 */
async function resolveHookProgramOnPath(roots, searchPath = subprocessEnv(), originalEnv = searchPath) {
  let isOutsideReach = async (path) => {
    if (!isAbsolute(path)) return false;
    let realPath = await realpathAllowMissing(path);
    return (
      realPath !== "unreadable" &&
      !anyPairMatches(
        [path, ...(realPath === "absent" ? [] : [realPath])].map(normalizeCommandForPlatform),
        roots,
      )
    );
  };
  let isInsideReach = async (path) => {
    if (!isAbsolute(path)) return false;
    let realPath = await realpathAllowMissing(path);
    return (
      realPath === "unreadable" ||
      anyPairMatches(
        [path, ...(realPath === "absent" ? [] : [realPath])].map(normalizeCommandForPlatform),
        roots,
      )
    );
  };
  let anyEntryInside = async (list) =>
    (await Promise.all(list.split(delimiter).map(isInsideReach))).some(Boolean);
  let filterOutside = async (list) =>
    (
      await Promise.all(
        list.split(delimiter).map(async (entry) => ((await isOutsideReach(entry)) ? [entry] : [])),
      )
    ).flat();
  let buildToolVars = new Set(BUILD_TOOL_ENV_VARS);
  let scrubKeys = new Set(hipaaCredentialScrubKeys().map((key) => key.toUpperCase()));
  let processEnv = scrubKeys.size > 0 ? subprocessEnv() : {};
  let extra = {};
  let omit = [];
  for (let key of Object.keys(searchPath)) {
    let value = searchPath[key];
    if (value === undefined) continue;
    if (scrubKeys.size > 0 && scrubKeys.has(envVarToUpperSnake(key))) {
      let originalValue = processEnv[key];
      if (originalValue === undefined) omit.push(key);
      else if (originalValue !== value) extra[key] = originalValue;
    } else if (buildToolVars.has(key)) {
      let kept = await filterOutside(value);
      if (key === "PATH") extra.PATH = kept.length > 0 ? kept.join(delimiter) : EMPTY_PATH_DIR;
      else if (kept.length > 0) extra[key] = kept.join(delimiter);
      else omit.push(key);
    } else if (isDangerousEnvName(key)) omit.push(key);
    else if (await anyEntryInside(value)) omit.push(key);
    else if (originalEnv[key] !== value) extra[key] = value;
  }
  for (let key of Object.keys(originalEnv))
    if (originalEnv[key] !== undefined && searchPath[key] === undefined) omit.push(key);
  return {
    base: searchPath,
    extra,
    omit,
  };
}
//@ chunk-e6aww6q8.js:831105-832040 placement
/**
 * 在 PATH 各目录中查找可执行程序并判断是否位于云会话可写范围：PATH 含相对目录即视为在范围内；跟随符号链接（有深度限制）检查目标与所在目录。
 */
async function resolveProgramOnPathInReach(
  cwd,
  searchPath,
  roots,
  { linkScreen = true, childStartsInReach = true, depth = 0 } = {},
) {
  for (let dir of searchPath.split(delimiter)) {
    if (!isAbsolute(dir)) return "in_reach";
    let candidate = join(dir, cwd);
    if (
      !(await access(candidate, constants.X_OK).then(
        () => true,
        () => false,
      ))
    ) {
      if (
        await lstat(candidate).then(
          (stats) => stats.isSymbolicLink(),
          () => false,
        )
      ) {
        let linkTarget = await readlink(candidate).then(
          (target) => resolve_2(dirname(candidate), target),
          () => {
            return;
          },
        );
        let realTarget = linkTarget === undefined ? "unreadable" : await realpathAllowMissing(linkTarget);
        if (
          realTarget === "unreadable" ||
          anyPairMatches(
            [
              candidate,
              ...(linkTarget === undefined ? [] : [linkTarget]),
              ...(realTarget === "absent" ? [] : [realTarget]),
            ].map(normalizeCommandForPlatform),
            roots,
          )
        )
          return "in_reach";
      }
      continue;
    }
    let realPath = await realpathAllowMissing(candidate);
    if (realPath === "unreadable") return "in_reach";
    let stats =
      realPath === "absent"
        ? undefined
        : await stat(realPath).catch((error) =>
            error.code === "ENOENT" || error.code === "ENOTDIR" ? undefined : "unreadable",
          );
    if (stats === "unreadable") return "in_reach";
    if (!stats?.isFile()) continue;
    if (anyPairMatches([candidate, realPath].map(normalizeCommandForPlatform), roots)) return "in_reach";
    if (linkScreen && stats.nlink > 1 && !(await isNativeBinaryFile(realPath))) return "in_reach";
    if (depth <= 1) {
      if (
        (await resolveHookCommand(candidate, searchPath, roots, {
          linkScreen,
          childStartsInReach,
          depth,
        })) !== undefined
      )
        return "in_reach";
    } else if (await hasShebang(realPath)) return "in_reach";
    return candidate;
  }
  return;
}
//@ chunk-e6aww6q8.js:832040-832228 placement
async function isSuspiciousHardLinkedFile(path) {
  let stats = await stat(path).catch((error) =>
    error.code === "ENOENT" || error.code === "ENOTDIR" ? "absent" : "unreadable",
  );
  if (stats === "absent") return false;
  return stats === "unreadable" || (stats.nlink > 1 && !(await isNativeBinaryFile(path)));
}
//@ chunk-e6aww6q8.js:832228-832545 placement
/**
 * 判断文件是否为原生可执行文件（读取文件头魔数）。
 */
async function isNativeBinaryFile(path) {
  let handle = await open(path, "r").catch(() => {
    return;
  });
  if (handle === undefined) return false;
  try {
    let header = Buffer.alloc(4);
    let { bytesRead } = await handle.read(header, 0, 4, 0);
    if (bytesRead < 4) return false;
    let uInt32BE = header.readUInt32BE(0);
    return (
      uInt32BE === 2135247942 ||
      uInt32BE === 4277009102 ||
      uInt32BE === 4277009103 ||
      uInt32BE === 3472551422 ||
      uInt32BE === 3489328638 ||
      uInt32BE === 3405691582
    );
  } finally {
    await handle.close();
  }
}
//@ chunk-e6aww6q8.js:832545-832664 placement
/**
 * 判断参数词是否为普通选项（-、--、--xxx、短选项组合）。
 */
function isPlainOptionWord(word) {
  return (
    word === "-" ||
    word === "--" ||
    /^--[a-z][a-z-]*$/.test(word) ||
    (/^-[A-Za-z]{1,3}$/.test(word) && !/^-[IMmr]./.test(word))
  );
}
//@ chunk-e6aww6q8.js:832664-832745 placement
async function hasShebang(path) {
  let fileHead = await readFileHead(path, 2);
  return fileHead === undefined || fileHead.startsWith("#!");
}
//@ chunk-e6aww6q8.js:832745-834284 placement
/**
 * 解析钩子命令：确定程序与 shebang 是否存在、可读，供沙箱与固定使用。
 */
async function resolveHookCommand(
  path,
  searchPath,
  roots,
  { linkScreen = true, childStartsInReach = true, depth = 0 } = {},
) {
  let realPath = await realpathAllowMissing(path);
  if (realPath === "unreadable") return "unreadable";
  let stats =
    realPath === "absent"
      ? "absent"
      : await stat(realPath).catch((error) =>
          error.code === "ENOENT" || error.code === "ENOTDIR" ? "absent" : undefined,
        );
  if (stats === undefined) return "unreadable";
  if (stats === "absent" || !stats.isFile()) return;
  if (linkScreen && stats.nlink > 1 && !(await isNativeBinaryFile(realPath))) return "program_unresolved";
  let fileHead = await readFileHead(realPath, 512);
  if (fileHead === undefined) return depth === 0 ? "unreadable" : undefined;
  if (!fileHead.startsWith("#!")) return;
  let parts = fileHead
    .slice(
      2,
      fileHead.includes(`
`)
        ? fileHead.indexOf(`
`)
        : undefined,
    )
    .replace(/^[ \t]+|[ \t]+$/g, "")
    .split(/[ \t]+/);
  let interpreterPath = parts[0];
  if (interpreterPath === undefined || !isAbsolute(interpreterPath)) return "shebang_in_reach";
  if (parts.some((word) => /[^\x21-\x7e]/.test(word))) return "program_unresolved";
  let isEnv =
    normalizeCommandForPlatform(interpreterPath) === "/usr/bin/env" ||
    normalizeCommandForPlatform(interpreterPath) === "/bin/env";
  if (normalizeCommandForPlatform(basename(interpreterPath)) === "env" && !isEnv) return "program_unresolved";
  if (isEnv) {
    let flattened = parts.slice(1).flatMap((part) => part.split(/[ \t]+/));
    let words = flattened[0] === "-S" ? flattened.slice(1) : flattened;
    let program = words[0];
    if (
      program === undefined ||
      program.startsWith("-") ||
      program.includes("=") ||
      program.includes("/") ||
      !parseShebangArgs(words.slice(1), program, {
        childStartsInReach,
      })
    )
      return "program_unresolved";
    let programOnPathInReach = await resolveProgramOnPathInReach(program, searchPath, roots, {
      linkScreen,
      childStartsInReach,
      depth: depth + 1,
    });
    return programOnPathInReach === undefined
      ? "program_unresolved"
      : programOnPathInReach === "in_reach"
        ? "shebang_in_reach"
        : undefined;
  }
  if (
    !parseShebangArgs(parts.slice(1), basename(interpreterPath), {
      childStartsInReach,
    })
  )
    return "program_unresolved";
  let interpreterReal = await realpathAllowMissing(interpreterPath);
  if (interpreterReal === "unreadable") return "unreadable";
  if (
    interpreterReal !== "absent" &&
    anyPairMatches([interpreterPath, interpreterReal].map(normalizeCommandForPlatform), roots)
  )
    return "shebang_in_reach";
  if (interpreterReal === "absent") return;
  if (depth < 2)
    return resolveHookCommand(interpreterPath, searchPath, roots, {
      linkScreen,
      childStartsInReach,
      depth: depth + 1,
    });
  return (await hasShebang(interpreterReal)) ? "program_unresolved" : undefined;
}
//@ chunk-e6aww6q8.js:834284-834499 placement
async function readFileHead(path, byteCount) {
  let handle = await open(path, "r").catch(() => {
    return;
  });
  if (handle === undefined) return;
  try {
    let buffer = Buffer.alloc(byteCount);
    let { bytesRead } = await handle.read(buffer, 0, byteCount, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}
//@ chunk-e6aww6q8.js:834499-834573 placement
/**
 * 取 legacy 环境 pin（未设置时返回默认值）。
 */
function legacyPinOr(memory, appliedGlobalConfigEnv) {
  return memory.legacyEnvPin === undefined ? appliedGlobalConfigEnv : (memory.legacyEnvPin ?? undefined);
}
//@ chunk-e6aww6q8.js:834573-834671 placement
/**
 * 首次读到时锁定 legacy 环境 pin。
 */
function latchLegacyPin(memory, env) {
  if (memory.legacyEnvPin === undefined) memory.legacyEnvPin = env ?? null;
  return memory.legacyEnvPin ?? undefined;
}
//@ chunk-e6aww6q8.js:834671-834840 placement
/**
 * 若钩子脚本位于可疑硬链接/全局 CLI 文件内则返回 undefined，否则返回脚本路径。
 */
async function hookScriptInReach(legacyEnvAtAttach, roots) {
  let globalClaudeFile = getGlobalClaudeFile();
  if (legacyEnvAtAttach === undefined || !isAbsolute(globalClaudeFile)) return;
  let realPath = await realpath(globalClaudeFile).catch(() => {
    return;
  });
  if (
    realPath === undefined ||
    (await isSuspiciousHardLinkedFile(realPath)) ||
    anyPairMatches([globalClaudeFile, realPath].map(normalizeCommandForPlatform), roots)
  )
    return;
  return legacyEnvAtAttach;
}
//@ chunk-e6aww6q8.js:834840-835067 placement
var GIT_FOR_WINDOWS_LINK = "Git for Windows (https://git-scm.com/downloads/win)";
var INSTALL_GIT_FOR_WINDOWS = `Install ${GIT_FOR_WINDOWS_LINK}`;
var NO_BASH_FIX_HINT =
  'put the program in "command" and its arguments in "args", or set "shell" to "powershell" on a command written for PowerShell';
var NO_BASH = "no-bash";
//@ chunk-e6aww6q8.js:835067-835636 placement
function describeNoBashFallback(hookEvent) {
  try {
    let surfacedHookSpawnFailures = getSurfacedHookSpawnFailures();
    if (surfacedHookSpawnFailures.has(NO_BASH)) return;
    surfacedHookSpawnFailures.add(NO_BASH);
    logEvent("tengu_shell_no_bash_fallback", {
      source: fromEnum(hookEvent),
    });
    enqueueTaskNotification_2({
      type: "system",
      subtype: "informational",
      content: `Git Bash wasn't found, so ${hookEvent === "skill" ? "a skill's shell command" : `a ${hookEvent} hook`} ran in PowerShell. Commands written for bash can fail there. ${INSTALL_GIT_FOR_WINDOWS} and start a new session, or ${hookEvent === "skill" || hookEvent === "StatusLine" || hookEvent === "FileSuggestion" ? 'set "shell" to "powershell" on commands written for PowerShell' : NO_BASH_FIX_HINT}.`,
      level: "warning",
      tag: "no_bash_shell",
    });
  } catch (error) {
    logError(
      Error("Failed to send the no-bash notice", {
        cause: error,
      }),
    );
  }
}
//@ chunk-e6aww6q8.js:945437-945735 placement
var FILE_EXTENSION_RE = /\.[A-Za-z][A-Za-z0-9]*$/;
var REDIRECT_TOKEN_RE = /^(?:\d*|&)[<>]/;
var REDIRECT_OPERATOR_RE = /^(?:\d*|&)[<>]{1,2}$/;
var INTERPRETER_SCRIPT_VAR_RE =
  /^\s*(?:\/(?:[\w.-]+\/)*)?(?:python[\d.]*|perl|sh|bash|dash)[ \t]+(\$(?:\{(?:CLAUDE_PLUGIN_ROOT|CLAUDE_PROJECT_DIR|HOME)\}|(?:CLAUDE_PLUGIN_ROOT|CLAUDE_PROJECT_DIR|HOME)\b)[\w./-]*)(?:[ \t]+[\w./=:@%+,-]+)*\s*$/;
//@ chunk-e6aww6q8.js:945735-946439 placement
/**
 * 展开钩子命令中的 ${CLAUDE_PROJECT_DIR}、${CLAUDE_PLUGIN_ROOT}。
 */
function expandHookPathVariables({
  command,
  args,
  pluginRoot,
  projectDir,
  homeDir,
  windowsBash,
  posixShell,
}) {
  let splitWords = args === undefined;
  let words = splitWords ? splitHookCommandWords(command) : [command, ...args];
  let scriptVar = splitWords && posixShell ? INTERPRETER_SCRIPT_VAR_RE.exec(command)?.[1] : undefined;
  let found = [];
  for (let word of words) {
    if (!FILE_EXTENSION_RE.test(word)) continue;
    let replaced = word.replaceAll("${CLAUDE_PROJECT_DIR}", () => projectDir);
    if (pluginRoot !== undefined) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => pluginRoot);
    if (splitWords) {
      replaced = replaced
        .replace(/^(?:~(?=[\\/])|\$HOME\b|\$\{HOME\})/, () => homeDir)
        .replace(/\$CLAUDE_PROJECT_DIR\b/g, () => projectDir);
      if (pluginRoot !== undefined) replaced = replaced.replace(/\$CLAUDE_PLUGIN_ROOT\b/g, () => pluginRoot);
      if (windowsBash && replaced.startsWith("/")) replaced = posixPathToWindowsPath(replaced);
    }
    if (/[$`*?[]/.test(replaced) || !isAbsolute(replaced)) continue;
    found.push({
      path: replaced,
      cutFrom: undefined,
    });
    let leading = word === scriptVar ? /^[^ \t\n]+(?= )/.exec(replaced)?.[0] : undefined;
    if (leading !== undefined)
      found.push({
        path: leading,
        cutFrom: replaced,
      });
  }
  return found;
}
//@ chunk-e6aww6q8.js:946439-946779 placement
/**
 * 把 hook 命令行按 shell 规则拆成单词（处理引号与转义）。
 */
function splitHookCommandWords(command) {
  let words = [];
  let buffer = "";
  let hasContent = false;
  let quote;
  for (let idx = 0; idx < command.length; idx++) {
    let char = command[idx];
    if (quote !== undefined) {
      if (char === quote) quote = undefined;
      else buffer += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      hasContent = true;
    } else if (char === "\\" && idx + 1 < command.length) {
      buffer += command[++idx];
      hasContent = true;
    } else if (/\s/.test(char)) {
      if (hasContent) {
        words.push(buffer);
        buffer = "";
        hasContent = false;
      }
    } else {
      buffer += char;
      hasContent = true;
    }
  }
  if (hasContent) words.push(buffer);
  return words.filter(
    (word, wordIndex) =>
      !REDIRECT_TOKEN_RE.test(word) && !REDIRECT_OPERATOR_RE.test(words[wordIndex - 1] ?? ""),
  );
}
//@ chunk-e6aww6q8.js:946779-946918 placement
var CANNOT_OPEN_SCRIPT_RE =
  /^(?:(?:[A-Za-z]:\\[^:]*|[^\s:]+): )?(?:\d+: )?(?:[Cc]an't|cannot) open (?:file |perl script )?(?:(['"])(.+?)\1[:( ]|([^'"]+?): )/;
//@ chunk-e6aww6q8.js:946918-947406 placement
/**
 * 钩子失败时判断输出是否只是"无法打开脚本"错误（如 can't open file 'x'），若每行都指向钩子命令中的脚本路径，返回缺失的脚本集合，用于给出更明确的提示。
 */
async function detectMissingHookScript({ stdout, stderr, scriptPaths }) {
  if (scriptPaths.length === 0 || (stdout.trim() && stderr.trim())) return;
  let output = stderr.trim() ? stderr : stdout;
  let filtered = output
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .filter(Boolean);
  if (filtered.length === 0) return;
  let byKey = new Map();
  for (let scriptPath of scriptPaths) byKey.set(normalizeScriptPathKey(scriptPath), scriptPath);
  let missing = new Set();
  for (let line of filtered) {
    let match = CANNOT_OPEN_SCRIPT_RE.exec(line);
    let pathText = match?.[2] ?? match?.[3];
    let scriptPath = pathText === undefined ? undefined : byKey.get(normalizeScriptPathKey(pathText));
    if (scriptPath === undefined) return;
    missing.add(scriptPath);
  }
  for (let scriptPath of missing)
    if (
      await access(scriptPath, constants.R_OK).then(
        () => true,
        () => false,
      )
    )
      return;
  let [first] = missing;
  return first === undefined
    ? undefined
    : {
        scriptPath: first,
        output,
      };
}
//@ chunk-e6aww6q8.js:947406-947500 placement
function normalizeScriptPathKey(path) {
  let replaced = path.replace(/[\\/]+/g, "/");
  return /^[A-Za-z]:\//.test(replaced) ? replaced.toLowerCase() : replaced;
}
//@ chunk-e6aww6q8.js:947500-947534 placement
/**
 * 记住的脚本路径数量上限与宿主隔离的 Map。
 */
var MAX_REMEMBERED_SCRIPTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var rememberedScriptsRegistry;
deferInit("chunk-e6aww6q8.js:947500", () => {
  MAX_REMEMBERED_SCRIPTS = 64;
  rememberedScriptsRegistry = new HostScoped(() => new Map());
});
//@ chunk-e6aww6q8.js:947534-947704 placement
function rememberBounded(cache, key, output) {
  if (output === undefined) {
    cache.delete(key);
    return false;
  }
  if (cache.get(key) === output) return true;
  cache.delete(key);
  cache.set(key, output);
  if (cache.size > MAX_REMEMBERED_SCRIPTS) {
    let [oldest] = cache.keys();
    if (oldest !== undefined) cache.delete(oldest);
  }
  return false;
}
export {
  omitKeys,
  detectMissingHookScript,
  rememberBounded,
  rememberedScriptsRegistry,
  describeNoBashFallback,
  mergeHookEnv,
  INSTALL_GIT_FOR_WINDOWS,
  NO_BASH_FIX_HINT,
  expandHookPathVariables,
  hookScriptInReach,
  mergeHookEnv_2,
  resolveHookProgramOnPath,
  resolveOptions,
  realpathAllowMissing,
  resolveProgramOnPathInReach,
  resolveHookCommand,
  EMPTY_PATH_DIR,
  latchLegacyPin,
  GIT_FOR_WINDOWS_LINK,
  isPlainOptionWord,
  isSuspiciousHardLinkedFile,
  legacyPinOr,
};
