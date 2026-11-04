/**
 * utils/shell/bashProvider.ts
 *
 * bash 提供者：创建 shell 快照，并把用户命令拼成带快照 source、TMPDIR、关闭 extglob、去别名劫持、记录 cwd 的完整命令串。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/bashProvider.ts
 * pieces: chunk-e6aww6q8.js (21)
 * attribution: placement 10, layout 9, fingerprint 2
 */
import { basename, join } from "path";
import { basename as basename_44, isAbsolute as isAbsolute_41 } from "path/win32";
import { access } from "fs/promises";
import { join as join_39 } from "path/posix";
import { shellQuoteArgs, quoteWithEvalStdinRedirect } from "../bash/bashPipeCommand.js";
import { safeExecFile } from "../safeSpawn.js";
import {
  SNAPSHOT_TIMEOUT_MS,
  ENV_ASSIGNMENT_RE_4,
  createAndSaveSnapshot,
  getSnapshotOverride,
  CLAUDE_CODE_EXECPATH,
} from "../bash/ShellSnapshot.js";
import { subprocessEnv, ghStandinDir } from "../subprocessEnv.js";
import { logForDebugging } from "../debug.js";
import { setProbedEnvKeys, markSnapshotAvailable } from "./shellEnvSnapshot.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { env } from "../env.js";
import { getPlatform } from "../platform.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { tmpdir, claudeTempDir } from "../tempDir.js";
import { windowsPathToPosixPath } from "../path.js";
import {
  rewriteWindowsNullRedirect,
  shouldAddStdinRedirect,
  quoteShellCommand,
} from "../bash/shellQuoting.js";
import { getSessionEnvironmentScript } from "../sessionEnvironment.js";
import { buildGitGrepShim } from "./gitGrepShim.js";
import { getSnapshotOverrideStub } from "../sandbox/sandboxRuntimeStubs.js";
import { buildEnvScrubScript } from "../settings/policyHelper/helperEnv.js";
import { getCpuacctJoinCommand } from "./cpuReport.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:824194-824358 placement = getGlobBaseDirectory (1)
/**
 * （旧版名配错）为 shell 的 source 命令拼接单引号转义的参数。
 */
function getGlobBaseDirectory(commandText, baseDir) {
  let index = commandText.lastIndexOf(" -");
  if (index > 0) {
    let beforeGlob = commandText.substring(0, index);
    let globPart = commandText.substring(index + 1);
    return `${shellQuoteArgs([beforeGlob])} ${globPart} ${shellQuoteArgs([baseDir])}`;
  } else return `${shellQuoteArgs([commandText])} ${shellQuoteArgs([baseDir])}`;
}
//@ chunk-e6aww6q8.js:3064610-3065136 placement
/**
 * 用目标 shell 执行 env 探测启动时会带上的环境变量名（受控环境、有超时），记录并保存键列表；失败时保存 null。
 */
async function probeSpawnEnv(shellPath) {
  try {
    let result = await safeExecFile(shellPath, ["-c", "env"], {
      reject: false,
      timeout: SNAPSHOT_TIMEOUT_MS,
      maxBuffer: 1048576,
      extendEnv: false,
      env: {
        ...(process.env.CLAUDE_CODE_DONT_INHERIT_ENV ? {} : subprocessEnv()),
        SHELL: shellPath,
        GIT_EDITOR: "true",
        CLAUDECODE: "1",
      },
    });
    if (result.exitCode !== 0 || !result.stdout) {
      logForDebugging(
        `Spawn-env probe failed: exit=${result.exitCode} stderr=${result.stderr?.slice(0, 200)}`,
      );
      setProbedEnvKeys(null);
      return;
    }
    let keys = [];
    for (let line of result.stdout.split(`
`)) {
      let match = line.match(ENV_ASSIGNMENT_RE_4);
      if (match) keys.push(match[1]);
    }
    logForDebugging(`Spawn-env probe captured ${keys.length} keys`);
    setProbedEnvKeys(keys);
  } catch (error) {
    logForDebugging(`Spawn-env probe error: ${error}`);
    setProbedEnvKeys(null);
  }
}
//@ chunk-e6aww6q8.js:3066273-3066290 placement
var sandboxRuntimeConfig = null;
var sandboxRuntimeConfigInit;
//@ chunk-e6aww6q8.js:3066290-3066330 placement
function noopAsync() {
  return Promise.resolve();
}
//@ chunk-e6aww6q8.js:3066330-3066352 placement
function noop() {
  return;
}
//@ chunk-e6aww6q8.js:3066379-3066463 placement
function slugifyIdentifier(identifier) {
  return (identifier ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 63);
}
//@ chunk-e6aww6q8.js:3066524-3066854 placement
/**
 * 通过环境变量传递命令文本的相关常量：变量名、引用串及其正则、变量被提前删除时的提示，以及走环境变量传递的命令字节上限。
 */
var COMMAND_TEXT_VAR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMMAND_TEXT_REF;
var COMMAND_TEXT_REF_RE;
var COMMAND_TEXT_MISSING_MESSAGE;
var MAX_ENV_COMMAND_BYTES;
deferInit("chunk-e6aww6q8.js:3066524", () => {
  COMMAND_TEXT_VAR = "__CLAUDE_CC_COMMAND_TEXT";
  COMMAND_TEXT_REF = `${COMMAND_TEXT_VAR}?`;
  COMMAND_TEXT_REF_RE = new RegExp(`^${COMMAND_TEXT_VAR}\\?$`, "m");
  COMMAND_TEXT_MISSING_MESSAGE =
    "Claude Code did not run this command: something that the shell runs first (a hook's environment file, say) removed the variable that held the command's text. Run it again: commands are now passed on the shell's command line instead.";
  MAX_ENV_COMMAND_BYTES = 122880;
});
//@ chunk-e6aww6q8.js:3066854-3067036 placement
function shouldGuardPkill(quotedCommand, shellPath) {
  return (
    /\b(pkill|pgrep|pidwait)\b/.test(quotedCommand) &&
    basename(shellPath) === "bash" &&
    isRemoteManagedEnvironment() &&
    !env.CLAUDE_CODE_SHELL_PREFIX &&
    getPlatform() === "linux" &&
    Buffer.byteLength(quotedCommand) <= MAX_ENV_COMMAND_BYTES &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_golden_wirth", false)
  );
}
//@ chunk-e6aww6q8.js:3067036-3067123 layout
/**
 * 生成取消导出 __CLAUDE_CC_COMMAND_TEXT 的片段（命令文本经环境变量携带时使用）。
 */
function buildCommandTextCarrierUnexport() {
  return `{ \\builtin typeset +x '${COMMAND_TEXT_VAR}' 2>/dev/null || \\builtin true; }`;
}
//@ chunk-e6aww6q8.js:3067123-3067295 layout
/**
 * 生成从 __CLAUDE_CC_COMMAND_TEXT 取出命令文本、unset 后 eval 的片段；变量丢失则 exit 126。
 */
function buildCommandTextCarrierEval() {
  return `{ \\builtin [ -n "\${${COMMAND_TEXT_VAR}:+1}" ] || { \\builtin echo '${COMMAND_TEXT_REF}' >&2; \\builtin exit 126; }; } && 'eval' "\\builtin 'unset' -v '${COMMAND_TEXT_VAR}'; 'eval' $${COMMAND_TEXT_VAR}"`;
}
//@ chunk-e6aww6q8.js:3067295-3067615 fingerprint = getDisableExtglobCommand (0.729)
/**
 * 返回关闭扩展 glob 的命令：bash `shopt -u extglob`，zsh `setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL`；设了 CLAUDE_CODE_SHELL_PREFIX 时两者都试。
 */
function getDisableExtglobCommand(shellPath) {
  if (env.CLAUDE_CODE_SHELL_PREFIX)
    return "{ shopt -u extglob || setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL; } >/dev/null 2>&1 || true";
  if (shellPath.includes("bash")) return "shopt -u extglob 2>/dev/null || true";
  else if (shellPath.includes("zsh")) return "setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL 2>/dev/null || true";
  return null;
}
//@ chunk-e6aww6q8.js:3067615-3067674 layout
var BUN_OPTIONS_CARRIER_VAR = "__CLAUDE_CC_BUN_OPTIONS";
var UNSHADOWED_COMMANDS = ["unsetenv", "which"];
//@ chunk-e6aww6q8.js:3067674-3067785 layout
/**
 * 生成 `unalias`+`unset -f` 指定命令名的片段，防止用户 rc 里的别名/函数劫持。
 */
function buildUnshadowCommand(commandName) {
  return `{ \\builtin unalias -- '${commandName}'; \\builtin unset -f -- '${commandName}'; } >/dev/null 2>&1 || true`;
}
//@ chunk-e6aww6q8.js:3067785-3067820 layout
function buildUnshadowWhichCommand() {
  return buildUnshadowCommand("which");
}
//@ chunk-e6aww6q8.js:3067820-3067944 layout
var TENGU_SWIRLING_KOALA; // deferred: uses BUN_OPTIONS_CARRIER_VAR of its import cycle while loading; runs once the cycle is complete
var EXPORTED_FUNCTION_ENV_NAMES;
deferInit("chunk-e6aww6q8.js:3067820", () => {
  TENGU_SWIRLING_KOALA = "tengu_swirling_koala";
  EXPORTED_FUNCTION_ENV_NAMES = new Set(
    UNSHADOWED_COMMANDS.flatMap((commandName) => [
      `BASH_FUNC_${commandName}%%`,
      `BASH_FUNC_${commandName}()`,
      `__BASH_FUNC<${commandName}>()`,
    ]),
  );
});
//@ chunk-e6aww6q8.js:3067944-3068033 layout
/**
 * tengu_swirling_koala 打开时，返回环境里存在的 BASH_FUNC_which%%/unsetenv 之类导出函数变量名，供 spawn 时 unset。
 */
function getExportedShellFunctionEnvVars(env) {
  if (
    !readFlagWithOverride(TENGU_SWIRLING_KOALA, {
      safe: true,
    })
  )
    return [];
  return [...EXPORTED_FUNCTION_ENV_NAMES].filter((envName) => env[envName] !== undefined);
}
//@ chunk-e6aww6q8.js:3068033-3068071 layout
function buildUnshadowUnsetenvCommand() {
  return buildUnshadowCommand("unsetenv");
}
//@ chunk-e6aww6q8.js:3068071-3068351 layout
/**
 * Windows 沙箱里只接受绝对路径的 bash.exe/sh.exe 作内层 shell（返回 {exe,args:['-c']}），否则告警并返回 null（改用 Git Bash）。
 */
function resolveWindowsSandboxInnerShell(binShell) {
  let lower = basename_44(binShell).toLowerCase();
  if (isAbsolute_41(binShell) && (lower === "bash.exe" || lower === "sh.exe"))
    return {
      exe: binShell,
      args: ["-c"],
    };
  logForDebugging(
    `sandbox: shell "${binShell}" is not an absolute bash-family exe SRT accepts as an inner shell; falling back to Git Bash for the sandboxed child`,
    {
      level: "warn",
    },
  );
  return null;
}
//@ chunk-e6aww6q8.js:3068351-3072279 fingerprint = createBashShellProvider (0.542)
/**
 * 创建 bash 提供者：异步生成 shell 快照（失败则回落到 login shell，-l）；buildExecCommand 依次拼接：source 快照、Windows TEMP/TMP、沙箱 TMPDIR、会话环境脚本、PATH 追加、BUN_OPTIONS 搬运、额外 git config、关闭 extglob、去掉 which/unsetenv 劫持、scrub 凭据环境、cgroup 记账、`eval '<命令>'` 和 `pwd -P >| <cwd 文件>`，再套 CLAUDE_CODE_SHELL_PREFIX；getEnvironmentOverrides 设 CLAUDE_CODE_EXECPATH、沙箱 TMPDIR/TMPPREFIX。
 */
async function createBashShellProvider(shellPath, options) {
  noop();
  let sandboxTmpDir;
  let snapshotResult = null;
  let now = Date.now();
  let snapshotPromise = options?.skipSnapshot
    ? Promise.resolve(undefined)
    : createAndSaveSnapshot(shellPath, options?.pluginBinPaths ?? [])
        .then((error) => {
          snapshotResult = error;
          let durationMs = Date.now() - now;
          if (error !== undefined)
            logFeatureOk("shell_snapshot_create", {
              duration_ms: durationMs,
            });
          else
            logFeatureSad("shell_snapshot_create", "snapshot_failed", {
              duration_ms: durationMs,
            });
          markSnapshotAvailable(error !== undefined);
          return error;
        })
        .catch((error) => {
          logForDebugging(`Failed to create shell snapshot: ${error}`);
          logFeatureSad("shell_snapshot_create", "snapshot_unexpected_throw");
          markSnapshotAvailable(false);
          snapshotResult = undefined;
          return;
        });
  if (!options?.skipSnapshot) probeSpawnEnv(shellPath).catch(() => {});
  let activeSnapshotPath;
  let reportedSnapshotMissing = false;
  let carryCommandText = true;
  return {
    type: "bash",
    shellPath,
    detached: true,
    stdin: "pipe",
    snapshotSettled: snapshotPromise,
    async buildExecCommand(command, execOpts) {
      let snapshotFilePath = await snapshotPromise;
      if (snapshotFilePath)
        try {
          await access(snapshotFilePath);
        } catch {
          logForDebugging(`Snapshot file missing, falling back to login shell: ${snapshotFilePath}`);
          if (!reportedSnapshotMissing) {
            reportedSnapshotMissing = true;
            logFeatureSad("shell_snapshot_create", "snapshot_missing_at_exec");
          }
          snapshotFilePath = undefined;
        }
      activeSnapshotPath = snapshotFilePath;
      markSnapshotAvailable(snapshotFilePath !== undefined);
      sandboxTmpDir = execOpts.sandboxTmpDir;
      let tmpdir_2 = tmpdir();
      let isWindows = getPlatform() === "windows";
      let shellTmpdir = isWindows ? windowsPathToPosixPath(tmpdir_2) : tmpdir_2;
      let useSandboxTmp = execOpts.useSandbox && execOpts.sandboxTmpDir;
      let sandboxTmpPosix =
        useSandboxTmp && isWindows ? windowsPathToPosixPath(execOpts.sandboxTmpDir) : execOpts.sandboxTmpDir;
      let cwdFileShellPath = useSandboxTmp
        ? join_39(sandboxTmpPosix, `cwd-${execOpts.id}`)
        : join_39(shellTmpdir, `claude-${execOpts.id}-cwd`);
      let cwdFilePath = useSandboxTmp
        ? (isWindows ? join : join_39)(execOpts.sandboxTmpDir, `cwd-${execOpts.id}`)
        : join(tmpdir_2, `claude-${execOpts.id}-cwd`);
      let normalizedCommand = rewriteWindowsNullRedirect(command);
      let addStdinRedirect = shouldAddStdinRedirect(normalizedCommand);
      let quotedCommand = quoteShellCommand(normalizedCommand, addStdinRedirect);
      if (normalizedCommand.includes("|") && addStdinRedirect)
        quotedCommand = quoteWithEvalStdinRedirect(normalizedCommand);
      let useCommandTextCarrier =
        carryCommandText &&
        !execOpts.useSandbox &&
        !execOpts.scrubCredentialEnv &&
        snapshotFilePath !== undefined &&
        execOpts.noBashEnv === true &&
        shouldGuardPkill(quotedCommand, shellPath);
      let prefixParts = useCommandTextCarrier ? [buildCommandTextCarrierUnexport()] : [];
      if (snapshotFilePath) {
        let finalPath =
          getPlatform() === "windows" ? windowsPathToPosixPath(snapshotFilePath) : snapshotFilePath;
        prefixParts.push(`source ${shellQuoteArgs([finalPath])} 2>/dev/null || true`);
      }
      if (isWindows) {
        let nativeTmpDir = useSandboxTmp ? execOpts.sandboxTmpDir : tmpdir_2;
        let tmpdirExport = useSandboxTmp ? ` TMPDIR=${shellQuoteArgs([sandboxTmpPosix])}` : "";
        let tempExport = `export TEMP=${shellQuoteArgs([nativeTmpDir])} TMP=${shellQuoteArgs([nativeTmpDir])}${tmpdirExport}`;
        prefixParts.push(tempExport);
        if (useSandboxTmp)
          prefixParts.push(
            `{ [ -z "\${BASH_VERSION:-}" ] || [ -z "\${LOCALAPPDATA:-}" ] || { TMP=\${LOCALAPPDATA#*:} && TMP=\${TMP%"\${TMP#?}"} && TEMP=$LOCALAPPDATA\${TMP}Temp && TMPDIR=\${TEMP//"$TMP"//} && TMPDIR=/\${TMPDIR%%:*}\${TMPDIR#*:} && case $TMPDIR in *[![:alnum:][:blank:]/._-]*) false;; esac && [ -d "$TMPDIR" ] && TMP=$TEMP || ${tempExport}; }; }`,
          );
      } else if (useSandboxTmp) prefixParts.push(`export TMPDIR=${shellQuoteArgs([execOpts.sandboxTmpDir])}`);
      if (execOpts.tmpDirBackstop !== undefined) {
        let backstopPosix = isWindows
          ? windowsPathToPosixPath(execOpts.tmpDirBackstop)
          : execOpts.tmpDirBackstop;
        prefixParts.push(`{ [ -n "\${TMPDIR:-}" ] || export TMPDIR=${shellQuoteArgs([backstopPosix])}; }`);
      }
      let sessionEnvScript = execOpts.scrubCredentialEnv
        ? null
        : await getSessionEnvironmentScript(execOpts.storageV5);
      if (sessionEnvScript)
        prefixParts.push(`${sessionEnvScript}
:`);
      let standinDir = ghStandinDir();
      if (standinDir !== undefined)
        prefixParts.push(`export PATH="\${PATH:+$PATH:}"${shellQuoteArgs([standinDir])}`);
      if (execOpts.bunOptions !== undefined)
        prefixParts.push(
          `{ \\builtin test -n "\${${BUN_OPTIONS_CARRIER_VAR}-}" && \\builtin export BUN_OPTIONS="$${BUN_OPTIONS_CARRIER_VAR}" && \\builtin unset -v ${BUN_OPTIONS_CARRIER_VAR} || { \\builtin printf '%s\\n' 'Claude Code did not run this command: it could not set BUN_OPTIONS, which turns off automatic package installs in Bun. A read-only BUN_OPTIONS, or a CLAUDE_CODE_SHELL_PREFIX that drops the environment, can cause this.' >&2; \\builtin exit 126; }; }`,
        );
      if (env.CLAUDE_CODE_REMOTE)
        prefixParts.push('\\builtin export BUN_OPTIONS="--smol${BUN_OPTIONS:+ $BUN_OPTIONS}"');
      if (execOpts.extraGitConfig !== undefined && execOpts.extraGitConfig.length > 0)
        prefixParts.push(buildGitConfigExport(execOpts.extraGitConfig));
      let disableExtglobCmd = getDisableExtglobCommand(shellPath);
      if (disableExtglobCmd) prefixParts.push(disableExtglobCmd);
      if (
        readFlagWithOverride(TENGU_SWIRLING_KOALA, {
          safe: true,
        })
      )
        prefixParts.push(buildUnshadowWhichCommand());
      prefixParts.push(buildUnshadowUnsetenvCommand());
      let gitGrepShim = await buildGitGrepShim(normalizedCommand);
      if (gitGrepShim !== null) prefixParts.push(gitGrepShim);
      let overrideStub = getSnapshotOverrideStub() ?? getSnapshotOverride();
      if (overrideStub !== null) prefixParts.push(overrideStub);
      if (execOpts.scrubCredentialEnv)
        prefixParts.push(
          buildEnvScrubScript({
            sandboxMasked: execOpts.sandboxMaskedEnv,
          }),
        );
      let cpuacctCommand = execOpts.shellToolCommand ? getCpuacctJoinCommand() : undefined;
      if (cpuacctCommand !== undefined) prefixParts.push(cpuacctCommand);
      prefixParts.push(useCommandTextCarrier ? buildCommandTextCarrierEval() : `eval ${quotedCommand}`);
      prefixParts.push(`pwd -P >| ${shellQuoteArgs([cwdFileShellPath])}`);
      let commandString = prefixParts.join(" && ");
      let CLAUDE_CODE_SHELL_PREFIX = env.CLAUDE_CODE_SHELL_PREFIX;
      if (CLAUDE_CODE_SHELL_PREFIX)
        commandString = getGlobBaseDirectory(CLAUDE_CODE_SHELL_PREFIX, commandString);
      return {
        commandString,
        cwdFilePath,
        ...(cpuacctCommand !== undefined && {
          cpuAccountJoin: execOpts.useSandbox || CLAUDE_CODE_SHELL_PREFIX ? "uncertain" : "certain",
        }),
        ...(useCommandTextCarrier && {
          carriedCommandText: quotedCommand,
        }),
      };
    },
    stopCarryingCommandText() {
      carryCommandText = false;
    },
    getSpawnArgs(commandString) {
      let skipLoginShell = activeSnapshotPath !== undefined;
      if (skipLoginShell) logForDebugging("Spawning shell without login (-l flag skipped)");
      return ["-c", ...(skipLoginShell ? [] : ["-l"]), commandString];
    },
    async isSnapshotUsable() {
      if (options?.skipSnapshot || snapshotResult === null) return true;
      if (snapshotResult === undefined) return false;
      try {
        await access(snapshotResult);
        return true;
      } catch {
        return false;
      }
    },
    async getEnvironmentOverrides(commandString, cwdFilePath, envEntries) {
      let claudeTmuxEnv = null;
      let env = {};
      env[CLAUDE_CODE_EXECPATH] = process.execPath;
      if (claudeTmuxEnv) env.TMUX = claudeTmuxEnv;
      if (envEntries) for (let [name, value] of envEntries) env[name] = value;
      if (sandboxTmpDir) {
        let posixTmpDir = sandboxTmpDir;
        if (getPlatform() === "windows") posixTmpDir = windowsPathToPosixPath(posixTmpDir);
        env.TMPDIR = posixTmpDir;
        env.CLAUDE_CODE_TMPDIR = claudeTempDir();
        env.TMPPREFIX = join_39(posixTmpDir, "zsh");
      }
      return env;
    },
  };
}
//@ chunk-e6aww6q8.js:3072279-3072352 placement
var GIT_CONFIG_TOKEN_RE = /^[A-Za-z0-9@:/._-]+$/;
var GIT_CREDENTIAL_HELPER_KEY_RE = /^credential\.[a-z]+:\/\/.+\.helper$/;
//@ chunk-e6aww6q8.js:3072352-3072654 placement
/**
 * 生成追加 GIT_CONFIG_PARAMETERS 的 export 语句；键值含 shell 敏感字符时拒绝并抛错。
 */
function buildGitConfigExport(extraGitConfig) {
  return `export GIT_CONFIG_PARAMETERS="\${GIT_CONFIG_PARAMETERS:+\${GIT_CONFIG_PARAMETERS} }${extraGitConfig
    .map(([key, value]) => {
      let isHelperKey = value === "" && GIT_CREDENTIAL_HELPER_KEY_RE.test(key);
      if (!GIT_CONFIG_TOKEN_RE.test(key) || !(isHelperKey || GIT_CONFIG_TOKEN_RE.test(value)))
        throw Error("refusing to export a git config entry with shell-active characters");
      return `'${key}=${value}'`;
    })
    .join(" ")}"`;
}
export {
  getGlobBaseDirectory,
  createBashShellProvider,
  resolveWindowsSandboxInnerShell,
  getExportedShellFunctionEnvVars,
  COMMAND_TEXT_REF_RE,
  COMMAND_TEXT_MISSING_MESSAGE,
  BUN_OPTIONS_CARRIER_VAR,
  COMMAND_TEXT_VAR,
};
