/**
 * utils/hooks/hookCommandResolution.ts
 *
 * 2.1.316 新增：钩子命令程序解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (28)
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

//@ chunk-e6aww6q8.js:829244-829372 placement
function omitKeys(e, n) {
  let r = new Set(typeof n === "string" ? [n] : n);
  return Object.fromEntries(Object.entries(e).filter(([key]) => !r.has(key)));
}
//@ chunk-e6aww6q8.js:829372-829685 placement
/**
 * 求路径的真实路径，允许末端不存在（拼回缺失部分）。
 */
async function realpathAllowMissing(e) {
  let n = "";
  for (let r = e; ;)
    try {
      let s = await realpath(r);
      if (!isAbsolute(s)) return "unreadable";
      return join(s, n);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") return "unreadable";
      if (
        await lstat(r).then(
          (S) => S.isSymbolicLink(),
          () => false,
        )
      )
        return "unreadable";
      let y = dirname(r);
      if (y === r) return "absent";
      n = join(basename(r), n);
      r = y;
    }
}
//@ chunk-e6aww6q8.js:829685-829917 placement
function mergeHookEnv_2({ attached, beforeSettings, ownEnv, childrenSee }) {
  if (beforeSettings === undefined)
    return {
      ...attached,
    };
  return Object.fromEntries(
    uniq([...Object.keys(attached), ...Object.keys(ownEnv).filter(childrenSee)]).map((h) => [
      h,
      Object.hasOwn(ownEnv, h)
        ? ownEnv[h]
        : attached[h] === beforeSettings[h]
          ? attached[h]
          : beforeSettings[h],
    ]),
  );
}
//@ chunk-e6aww6q8.js:829917-829999 placement = resolveOptions (0.831)
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
function mergeHookEnv(e) {
  return {
    ...omitKeys(e.base, e.omit),
    ...e.extra,
  };
}
//@ chunk-e6aww6q8.js:830076-831105 placement
/**
 * 在 PATH 中解析钩子命令对应的程序。
 */
async function resolveHookProgramOnPath(e, n = subprocessEnv(), r = n) {
  let s = async (Se) => {
    if (!isAbsolute(Se)) return false;
    let ke = await realpathAllowMissing(Se);
    return (
      ke !== "unreadable" &&
      !anyPairMatches([Se, ...(ke === "absent" ? [] : [ke])].map(normalizeCommandForPlatform), e)
    );
  };
  let h = async (Se) => {
    if (!isAbsolute(Se)) return false;
    let ke = await realpathAllowMissing(Se);
    return (
      ke === "unreadable" ||
      anyPairMatches([Se, ...(ke === "absent" ? [] : [ke])].map(normalizeCommandForPlatform), e)
    );
  };
  let y = async (Se) => (await Promise.all(Se.split(delimiter).map(h))).some(Boolean);
  let S = async (Se) =>
    (await Promise.all(Se.split(delimiter).map(async (ke) => ((await s(ke)) ? [ke] : [])))).flat();
  let w = new Set(BUILD_TOOL_ENV_VARS);
  let L = new Set(hipaaCredentialScrubKeys().map((Se) => Se.toUpperCase()));
  let G = L.size > 0 ? subprocessEnv() : {};
  let q = {};
  let Z = [];
  for (let key of Object.keys(n)) {
    let ke = n[key];
    if (ke === undefined) continue;
    if (L.size > 0 && L.has(envVarToUpperSnake(key))) {
      let we = G[key];
      if (we === undefined) Z.push(key);
      else if (we !== ke) q[key] = we;
    } else if (w.has(key)) {
      let we = await S(ke);
      if (key === "PATH") q.PATH = we.length > 0 ? we.join(delimiter) : EMPTY_PATH_DIR;
      else if (we.length > 0) q[key] = we.join(delimiter);
      else Z.push(key);
    } else if (isDangerousEnvName(key)) Z.push(key);
    else if (await y(ke)) Z.push(key);
    else if (r[key] !== ke) q[key] = ke;
  }
  for (let key of Object.keys(r)) if (r[key] !== undefined && n[key] === undefined) Z.push(key);
  return {
    base: n,
    extra: q,
    omit: Z,
  };
}
//@ chunk-e6aww6q8.js:831105-832040 placement
/**
 * 在 PATH 各目录中查找可执行程序并判断是否位于云会话可写范围：PATH 含相对目录即视为在范围内；跟随符号链接（有深度限制）检查目标与所在目录。
 */
async function resolveProgramOnPathInReach(
  cwd,
  searchPath,
  r,
  { linkScreen: s = true, childStartsInReach: h = true, depth = 0 } = {},
) {
  for (let S of searchPath.split(delimiter)) {
    if (!isAbsolute(S)) return "in_reach";
    let candidate = join(S, cwd);
    if (
      !(await access(candidate, constants.X_OK).then(
        () => true,
        () => false,
      ))
    ) {
      if (
        await lstat(candidate).then(
          (Se) => Se.isSymbolicLink(),
          () => false,
        )
      ) {
        let Se = await readlink(candidate).then(
          (we) => resolve_2(dirname(candidate), we),
          () => {
            return;
          },
        );
        let ke = Se === undefined ? "unreadable" : await realpathAllowMissing(Se);
        if (
          ke === "unreadable" ||
          anyPairMatches(
            [candidate, ...(Se === undefined ? [] : [Se]), ...(ke === "absent" ? [] : [ke])].map(
              normalizeCommandForPlatform,
            ),
            r,
          )
        )
          return "in_reach";
      }
      continue;
    }
    let G = await realpathAllowMissing(candidate);
    if (G === "unreadable") return "in_reach";
    let q =
      G === "absent"
        ? undefined
        : await stat(G).catch((error) =>
            error.code === "ENOENT" || error.code === "ENOTDIR" ? undefined : "unreadable",
          );
    if (q === "unreadable") return "in_reach";
    if (!q?.isFile()) continue;
    if (anyPairMatches([candidate, G].map(normalizeCommandForPlatform), r)) return "in_reach";
    if (s && q.nlink > 1 && !(await isNativeBinaryFile(G))) return "in_reach";
    if (depth <= 1) {
      if (
        (await resolveHookCommand(candidate, searchPath, r, {
          linkScreen: s,
          childStartsInReach: h,
          depth,
        })) !== undefined
      )
        return "in_reach";
    } else if (await hasShebang(G)) return "in_reach";
    return candidate;
  }
  return;
}
//@ chunk-e6aww6q8.js:832040-832228 placement
async function isSuspiciousHardLinkedFile(e) {
  let n = await stat(e).catch((error) =>
    error.code === "ENOENT" || error.code === "ENOTDIR" ? "absent" : "unreadable",
  );
  if (n === "absent") return false;
  return n === "unreadable" || (n.nlink > 1 && !(await isNativeBinaryFile(e)));
}
//@ chunk-e6aww6q8.js:832228-832545 placement
/**
 * 判断文件是否为原生可执行文件（读取文件头魔数）。
 */
async function isNativeBinaryFile(e) {
  let n = await open(e, "r").catch(() => {
    return;
  });
  if (n === undefined) return false;
  try {
    let r = Buffer.alloc(4);
    let { bytesRead } = await n.read(r, 0, 4, 0);
    if (bytesRead < 4) return false;
    let uInt32BE = r.readUInt32BE(0);
    return (
      uInt32BE === 2135247942 ||
      uInt32BE === 4277009102 ||
      uInt32BE === 4277009103 ||
      uInt32BE === 3472551422 ||
      uInt32BE === 3489328638 ||
      uInt32BE === 3405691582
    );
  } finally {
    await n.close();
  }
}
//@ chunk-e6aww6q8.js:832545-832664 placement
/**
 * 判断参数词是否为普通选项（-、--、--xxx、短选项组合）。
 */
function isPlainOptionWord(e) {
  return (
    e === "-" ||
    e === "--" ||
    /^--[a-z][a-z-]*$/.test(e) ||
    (/^-[A-Za-z]{1,3}$/.test(e) && !/^-[IMmr]./.test(e))
  );
}
//@ chunk-e6aww6q8.js:832664-832745 placement
async function hasShebang(e) {
  let fileHead = await readFileHead(e, 2);
  return fileHead === undefined || fileHead.startsWith("#!");
}
//@ chunk-e6aww6q8.js:832745-834284 placement
/**
 * 解析钩子命令：确定程序与 shebang 是否存在、可读，供沙箱与固定使用。
 */
async function resolveHookCommand(
  e,
  n,
  roots,
  { linkScreen: s = true, childStartsInReach: h = true, depth: y = 0 } = {},
) {
  let S = await realpathAllowMissing(e);
  if (S === "unreadable") return "unreadable";
  let w =
    S === "absent"
      ? "absent"
      : await stat(S).catch((error) =>
          error.code === "ENOENT" || error.code === "ENOTDIR" ? "absent" : undefined,
        );
  if (w === undefined) return "unreadable";
  if (w === "absent" || !w.isFile()) return;
  if (s && w.nlink > 1 && !(await isNativeBinaryFile(S))) return "program_unresolved";
  let fileHead = await readFileHead(S, 512);
  if (fileHead === undefined) return y === 0 ? "unreadable" : undefined;
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
  let q = parts[0];
  if (q === undefined || !isAbsolute(q)) return "shebang_in_reach";
  if (parts.some((ke) => /[^\x21-\x7e]/.test(ke))) return "program_unresolved";
  let Z = normalizeCommandForPlatform(q) === "/usr/bin/env" || normalizeCommandForPlatform(q) === "/bin/env";
  if (normalizeCommandForPlatform(basename(q)) === "env" && !Z) return "program_unresolved";
  if (Z) {
    let flattened = parts.slice(1).flatMap((Ie) => Ie.split(/[ \t]+/));
    let we = flattened[0] === "-S" ? flattened.slice(1) : flattened;
    let Ee = we[0];
    if (
      Ee === undefined ||
      Ee.startsWith("-") ||
      Ee.includes("=") ||
      Ee.includes("/") ||
      !parseShebangArgs(we.slice(1), Ee, {
        childStartsInReach: h,
      })
    )
      return "program_unresolved";
    let programOnPathInReach = await resolveProgramOnPathInReach(Ee, n, roots, {
      linkScreen: s,
      childStartsInReach: h,
      depth: y + 1,
    });
    return programOnPathInReach === undefined
      ? "program_unresolved"
      : programOnPathInReach === "in_reach"
        ? "shebang_in_reach"
        : undefined;
  }
  if (
    !parseShebangArgs(parts.slice(1), basename(q), {
      childStartsInReach: h,
    })
  )
    return "program_unresolved";
  let Se = await realpathAllowMissing(q);
  if (Se === "unreadable") return "unreadable";
  if (Se !== "absent" && anyPairMatches([q, Se].map(normalizeCommandForPlatform), roots))
    return "shebang_in_reach";
  if (Se === "absent") return;
  if (y < 2)
    return resolveHookCommand(q, n, roots, {
      linkScreen: s,
      childStartsInReach: h,
      depth: y + 1,
    });
  return (await hasShebang(Se)) ? "program_unresolved" : undefined;
}
//@ chunk-e6aww6q8.js:834284-834499 placement
async function readFileHead(e, n) {
  let r = await open(e, "r").catch(() => {
    return;
  });
  if (r === undefined) return;
  try {
    let s = Buffer.alloc(n);
    let { bytesRead } = await r.read(s, 0, n, 0);
    return s.subarray(0, bytesRead).toString("utf8");
  } finally {
    await r.close();
  }
}
//@ chunk-e6aww6q8.js:834499-834573 placement
/**
 * 取 legacy 环境 pin（未设置时返回默认值）。
 */
function legacyPinOr(e, appliedGlobalConfigEnv) {
  return e.legacyEnvPin === undefined ? appliedGlobalConfigEnv : (e.legacyEnvPin ?? undefined);
}
//@ chunk-e6aww6q8.js:834573-834671 placement
/**
 * 首次读到时锁定 legacy 环境 pin。
 */
function latchLegacyPin(e, n) {
  if (e.legacyEnvPin === undefined) e.legacyEnvPin = n ?? null;
  return e.legacyEnvPin ?? undefined;
}
//@ chunk-e6aww6q8.js:834671-834840 placement
/**
 * 若钩子脚本位于可疑硬链接/全局 CLI 文件内则返回 undefined，否则返回脚本路径。
 */
async function hookScriptInReach(legacyEnvAtAttach, n) {
  let globalClaudeFile = getGlobalClaudeFile();
  if (legacyEnvAtAttach === undefined || !isAbsolute(globalClaudeFile)) return;
  let s = await realpath(globalClaudeFile).catch(() => {
    return;
  });
  if (
    s === undefined ||
    (await isSuspiciousHardLinkedFile(s)) ||
    anyPairMatches([globalClaudeFile, s].map(normalizeCommandForPlatform), n)
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
  let w = args === undefined;
  let L = w ? splitHookCommandWords(command) : [command, ...args];
  let G = w && posixShell ? INTERPRETER_SCRIPT_VAR_RE.exec(command)?.[1] : undefined;
  let q = [];
  for (let Z of L) {
    if (!FILE_EXTENSION_RE.test(Z)) continue;
    let replaced = Z.replaceAll("${CLAUDE_PROJECT_DIR}", () => projectDir);
    if (pluginRoot !== undefined) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => pluginRoot);
    if (w) {
      replaced = replaced
        .replace(/^(?:~(?=[\\/])|\$HOME\b|\$\{HOME\})/, () => homeDir)
        .replace(/\$CLAUDE_PROJECT_DIR\b/g, () => projectDir);
      if (pluginRoot !== undefined) replaced = replaced.replace(/\$CLAUDE_PLUGIN_ROOT\b/g, () => pluginRoot);
      if (windowsBash && replaced.startsWith("/")) replaced = posixPathToWindowsPath(replaced);
    }
    if (/[$`*?[]/.test(replaced) || !isAbsolute(replaced)) continue;
    q.push({
      path: replaced,
      cutFrom: undefined,
    });
    let ke = Z === G ? /^[^ \t\n]+(?= )/.exec(replaced)?.[0] : undefined;
    if (ke !== undefined)
      q.push({
        path: ke,
        cutFrom: replaced,
      });
  }
  return q;
}
//@ chunk-e6aww6q8.js:946439-946779 placement
/**
 * 把 hook 命令行按 shell 规则拆成单词（处理引号与转义）。
 */
function splitHookCommandWords(command) {
  let n = [];
  let r = "";
  let s = false;
  let h;
  for (let idx = 0; idx < command.length; idx++) {
    let S = command[idx];
    if (h !== undefined) {
      if (S === h) h = undefined;
      else r += S;
      continue;
    }
    if (S === '"' || S === "'") {
      h = S;
      s = true;
    } else if (S === "\\" && idx + 1 < command.length) {
      r += command[++idx];
      s = true;
    } else if (/\s/.test(S)) {
      if (s) {
        n.push(r);
        r = "";
        s = false;
      }
    } else {
      r += S;
      s = true;
    }
  }
  if (s) n.push(r);
  return n.filter((y, S) => !REDIRECT_TOKEN_RE.test(y) && !REDIRECT_OPERATOR_RE.test(n[S - 1] ?? ""));
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
  let s = stderr.trim() ? stderr : stdout;
  let filtered = s
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .filter(Boolean);
  if (filtered.length === 0) return;
  let y = new Map();
  for (let scriptPath of scriptPaths) y.set(normalizeScriptPathKey(scriptPath), scriptPath);
  let S = new Set();
  for (let L of filtered) {
    let match = CANNOT_OPEN_SCRIPT_RE.exec(L);
    let q = match?.[2] ?? match?.[3];
    let Z = q === undefined ? undefined : y.get(normalizeScriptPathKey(q));
    if (Z === undefined) return;
    S.add(Z);
  }
  for (let L of S)
    if (
      await access(L, constants.R_OK).then(
        () => true,
        () => false,
      )
    )
      return;
  let [w] = S;
  return w === undefined
    ? undefined
    : {
        scriptPath: w,
        output: s,
      };
}
//@ chunk-e6aww6q8.js:947406-947500 placement
function normalizeScriptPathKey(e) {
  let replaced = e.replace(/[\\/]+/g, "/");
  return /^[A-Za-z]:\//.test(replaced) ? replaced.toLowerCase() : replaced;
}
//@ chunk-e6aww6q8.js:947500-947534 placement
/**
 * 记住的脚本路径数量上限与宿主隔离的 Map。
 */
var MAX_REMEMBERED_SCRIPTS = 64;
var rememberedScriptsRegistry = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:947534-947704 placement
function rememberBounded(e, n, output) {
  if (output === undefined) {
    e.delete(n);
    return false;
  }
  if (e.get(n) === output) return true;
  e.delete(n);
  e.set(n, output);
  if (e.size > MAX_REMEMBERED_SCRIPTS) {
    let [s] = e.keys();
    if (s !== undefined) e.delete(s);
  }
  return false;
}
//@ chunk-e6aww6q8.js:947704-947712 placement
/**
 * 缓存的钩子展示文本构造器。
 */
var cachedHookDisplayBuilder;
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
  cachedHookDisplayBuilder,
  isPlainOptionWord,
  isSuspiciousHardLinkedFile,
  legacyPinOr,
};
