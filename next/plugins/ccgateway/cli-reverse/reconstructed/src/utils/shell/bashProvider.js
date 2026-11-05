/**
 * utils/shell/bashProvider.ts
 *
 * bash 提供者：创建 shell 快照，并把用户命令拼成带快照 source、TMPDIR、关闭 extglob、去别名劫持、记录 cwd 的完整命令串。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/bashProvider.ts
 * pieces: chunk-5xgkngpb.js (27)
 * attribution: placement 11, layout 14, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, join } from "path";
import { basename as basename_43, isAbsolute as isAbsolute_41 } from "path/win32";
import { access } from "fs/promises";
import { join as join_38 } from "path/posix";
import { shellQuoteArgs, quoteWithEvalStdinRedirect } from "../bash/bashPipeCommand.js";
import { loginCommand_2 } from "../../commands/login/index.js";
import {
  stubCommand_1,
  stubCommand_3,
  stubCommand_4a,
  stubCommand_4b,
  stubCommand_8,
  stubCommand_5a,
  stubCommand_6a,
  stubCommand_2,
  stubCommand_7,
  stubCommand_9,
  stubCommand_10,
  stubCommand_11,
  stubCommand_12,
  stubCommand_13,
  gatedInternalCommand,
  gatedCommandSlot_2,
} from "../../commands.js";
import { stubTerminalSetupCommand } from "../../commands/terminalSetup/index.js";
import { internalCmdB } from "../../commands/commit-push-pr.js";
import { stubAntTraceCommand } from "../../commands/ant-trace/index.js";
import { internalCmdA, versionNonInteractiveCommand } from "../../commands/version.js";
import { stubScrollSpeedCommand_2, stubScrollSpeedCommand } from "../../commands/scroll-speed/index.js";
import { stubC4EUpsellCommand } from "../../commands/c4eUpsell.js";
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
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { tmpdir, claudeTempDir } from "../tempDir.js";
import { windowsPathToPosixPath } from "../path.js";
import {
  rewriteWindowsNullRedirect,
  shouldAddStdinRedirect,
  quoteShellCommand,
} from "../bash/shellQuoting.js";
import { classifyCommandReliability } from "../bash/heredocLexing.js";
import { bashVersionGuard } from "./bashVersionRefusal.js";
import { getSessionEnvironmentScript } from "../sessionEnvironment.js";
import { buildGitGrepShim } from "./gitGrepShim.js";
import { getSnapshotOverrideStub } from "../sandbox/sandboxRuntimeStubs.js";
import { buildEnvScrubScript } from "../settings/policyHelper/helperEnv.js";
import { getCpuacctJoinCommand } from "./cpuReport.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:835810-835974 placement (2.1.88 match: getGlobBaseDirectory, 1)
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
//@ chunk-5xgkngpb.js:2109457-2110899 placement (2.1.88 match: usageReport, 0.43)
/**
 * promoteMemoryCommands：构建期为 null；注册表里取 .promoteMemory/.promoteMemoryNonInteractive。
 */
var promoteMemoryCommands; // deferred: loads other modules while loading; runs once its import cycle is complete
var accountMemoryCommands;
var gatedCommandSlot_1;
var gatedCommandSlot_5;
var gatedCommandSlot_3;
var gatedCommandSlot_13;
var gatedCommandSlot_16;
var gatedCommandSlot_4;
var briefCommand;
var remoteControlCommand;
var desktopCmdModule;
var gatedCommandSlot_6;
var antGatedCmdA;
var sandboxRuntimeConfig;
var gatedInPlaceWriteCommand;
var recapCommand;
var gatedCommandSlot_8;
var gatedCommandSlot_9;
var gatedCommandSlot_10;
var gatedCommandSlot_11;
var goalCommandModule;
var goalCommand;
var goalNonInteractive;
var diffCmdModule;
var webSetupCommand;
var EMPTY_COMMAND_LIST;
var listAgentsCommand;
var gatedCommandSlot_12;
var internalGatedCmdA;
var gatedCommandSlot_14;
var antGatedCmdB;
var backgroundCommand;
var stopCommandModule;
var stopCommand;
var stopNonInteractive;
var internalGatedCmdB;
var loginCommand;
var usageReport;
var INTERNAL_ONLY_COMMANDS;
var ANT_GATED_COMMANDS;
deferInit("chunk-5xgkngpb.js:2109457", () => {
  promoteMemoryCommands = null;
  accountMemoryCommands = null;
  gatedCommandSlot_1 = null;
  gatedCommandSlot_5 = null;
  gatedCommandSlot_3 = null;
  gatedCommandSlot_13 = null;
  gatedCommandSlot_16 = null;
  gatedCommandSlot_4 = null;
  briefCommand = require("../../commands/default.lazy.js").default;
  remoteControlCommand = require("../../commands/bridge/default.lazy.js").default;
  desktopCmdModule = require("../../commands/daemon/default.lazy.js").default;
  gatedCommandSlot_6 = null;
  antGatedCmdA = null;
  sandboxRuntimeConfig = null;
  gatedInPlaceWriteCommand = null;
  recapCommand = require("../../commands/recap/default.lazy.js").default;
  gatedCommandSlot_8 = null;
  gatedCommandSlot_9 = null;
  gatedCommandSlot_10 = null;
  gatedCommandSlot_11 = null;
  goalCommandModule = require("../../commands/goal/default.lazy.js");
  goalCommand = goalCommandModule.default;
  goalNonInteractive = goalCommandModule.goalNonInteractive;
  diffCmdModule = require("../../commands/workflows/default.lazy.js").default;
  webSetupCommand = require("../../services/cloudSessions/connectGithubUrl.lazy.js").default;
  EMPTY_COMMAND_LIST = [];
  listAgentsCommand = require("../../commands/list-agents/default.lazy.js").default;
  gatedCommandSlot_12 = null;
  internalGatedCmdA = null;
  gatedCommandSlot_14 = null;
  antGatedCmdB = null;
  backgroundCommand = require("../../commands/background/default.lazy.js").default;
  stopCommandModule = require("../../commands/stop/default.lazy.js");
  stopCommand = stopCommandModule?.default ?? null;
  stopNonInteractive = stopCommandModule?.stopNonInteractive ?? null;
  internalGatedCmdB = null;
  loginCommand = loginCommand_2();
  usageReport = {
    type: "prompt",
    name: "insights",
    description: "Generate a report analyzing your Claude Code sessions",
    contentLength: 0,
    progressMessage: "analyzing your sessions",
    source: "builtin",
    disableModelInvocation: true,
    policyGate: {
      policy: "allow_insights",
    },
    requires: {
      workspace: true,
    },
    async getPromptForCommand(args, context) {
      let real = (await import("../../commands/default_2.lazy.js")).default;
      if (real.type !== "prompt") throw Error("unreachable");
      return real.getPromptForCommand(args, context);
    },
  };
  INTERNAL_ONLY_COMMANDS = [
    ...(gatedCommandSlot_3 ? [gatedCommandSlot_3] : []),
    ...(gatedCommandSlot_13 ? [gatedCommandSlot_13] : []),
    ...(gatedCommandSlot_1 ? [gatedCommandSlot_1] : []),
    stubCommand_1,
    stubTerminalSetupCommand,
    internalCmdB,
    ...(gatedCommandSlot_16 ? [gatedCommandSlot_16] : []),
    stubAntTraceCommand,
    ...(internalGatedCmdB ? [internalGatedCmdB] : []),
    stubCommand_3,
    internalCmdA,
    versionNonInteractiveCommand,
    stubCommand_4a,
    stubCommand_4b,
    stubCommand_8,
    stubCommand_5a,
    stubCommand_6a,
    stubCommand_2,
    stubScrollSpeedCommand_2,
    stubScrollSpeedCommand,
    stubCommand_7,
    stubCommand_9,
    stubCommand_10,
    stubC4EUpsellCommand,
    stubCommand_11,
    stubCommand_12,
    stubCommand_13,
    gatedInternalCommand,
    ...(internalGatedCmdA ? [internalGatedCmdA] : []),
    ...(gatedCommandSlot_14 ? [gatedCommandSlot_14] : []),
  ].filter(Boolean);
  ANT_GATED_COMMANDS = [
    gatedCommandSlot_2,
    gatedCommandSlot_8,
    gatedCommandSlot_9,
    gatedCommandSlot_10,
    gatedCommandSlot_11,
    gatedCommandSlot_6,
    antGatedCmdA,
    antGatedCmdB,
    gatedCommandSlot_5,
    sandboxRuntimeConfig,
    gatedInPlaceWriteCommand,
  ].filter(Boolean);
});
//@ chunk-5xgkngpb.js:3148723-3149249 placement
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
//@ chunk-5xgkngpb.js:3150386-3150403 placement
var sandboxRuntimeConfigSlot = null;
var sandboxRuntimeConfigInit;
//@ chunk-5xgkngpb.js:3150403-3150443 placement
function noopAsync() {
  return Promise.resolve();
}
//@ chunk-5xgkngpb.js:3150443-3150465 placement
function noop() {
  return;
}
//@ chunk-5xgkngpb.js:3150492-3150576 placement
function slugifyIdentifier(identifier) {
  return (identifier ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 63);
}
//@ chunk-5xgkngpb.js:3150637-3150967 placement
/**
 * 通过环境变量传递命令文本的相关常量：变量名、引用串及其正则、变量被提前删除时的提示，以及走环境变量传递的命令字节上限。
 */
var COMMAND_TEXT_VAR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMMAND_TEXT_REF;
var COMMAND_TEXT_REF_RE;
var COMMAND_TEXT_MISSING_MESSAGE;
var MAX_ENV_COMMAND_BYTES;
deferInit("chunk-5xgkngpb.js:3150637", () => {
  COMMAND_TEXT_VAR = "__CLAUDE_CC_COMMAND_TEXT";
  COMMAND_TEXT_REF = `${COMMAND_TEXT_VAR}?`;
  COMMAND_TEXT_REF_RE = new RegExp(`^${COMMAND_TEXT_VAR}\\?$`, "m");
  COMMAND_TEXT_MISSING_MESSAGE =
    "Claude Code did not run this command: something that the shell runs first (a hook's environment file, say) removed the variable that held the command's text. Run it again: commands are now passed on the shell's command line instead.";
  MAX_ENV_COMMAND_BYTES = 122880;
});
//@ chunk-5xgkngpb.js:3150967-3151149 placement
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
//@ chunk-5xgkngpb.js:3151149-3151236 layout
/**
 * 生成取消导出 __CLAUDE_CC_COMMAND_TEXT 的片段（命令文本经环境变量携带时使用）。
 */
function buildCommandTextCarrierUnexport() {
  return `{ \\builtin typeset +x '${COMMAND_TEXT_VAR}' 2>/dev/null || \\builtin true; }`;
}
//@ chunk-5xgkngpb.js:3151236-3151408 layout
/**
 * 生成从 __CLAUDE_CC_COMMAND_TEXT 取出命令文本、unset 后 eval 的片段；变量丢失则 exit 126。
 */
function buildCommandTextCarrierEval() {
  return `{ \\builtin [ -n "\${${COMMAND_TEXT_VAR}:+1}" ] || { \\builtin echo '${COMMAND_TEXT_REF}' >&2; \\builtin exit 126; }; } && 'eval' "\\builtin 'unset' -v '${COMMAND_TEXT_VAR}'; 'eval' $${COMMAND_TEXT_VAR}"`;
}
//@ chunk-5xgkngpb.js:3151408-3151436 layout
var CWD_FD = 3;
var TAIL_FD = 198;
var MAX_OUTPUT_FILE_BLOCKS = 65536;
//@ chunk-5xgkngpb.js:3151436-3151586 layout
function tailFdDupPrefix(path) {
  return `{ { \\builtin test /dev/fd/${CWD_FD} -ef ${shellQuoteArgs([path])} && command exec ${TAIL_FD}>&${CWD_FD} ${CWD_FD}>&-; } 2>/dev/null || \\builtin true; }`;
}
//@ chunk-5xgkngpb.js:3151586-3152818 layout
function tailTeeOverridePrefix(path, outputPath) {
  let tailFdPath = `/dev/fd/${TAIL_FD}`;
  let resetTeeScript = `{ \\builtin true >| ${tailFdPath}; \\builtin command rm -f -- ${shellQuoteArgs([path])} </dev/null >/dev/null 2>&1; }`;
  let bothStdoutStderrToFile = `\\builtin test /dev/fd/1 -ef ${shellQuoteArgs([outputPath])} && \\builtin test /dev/fd/2 -ef ${shellQuoteArgs([outputPath])}`;
  let joined = [
    "tail() {",
    "{ \\builtin local -; \\builtin set +xe; } 2>/dev/null;",
    'case "$#:$*" in 0:|1:-[0-9]*|1:-n[0-9+-]*|2:-n\\ [0-9+-]*|1:--lines=[0-9+-]*) ;;',
    '*) \\builtin command tail "$@"; \\builtin return ;; esac;',
    `if \\builtin test -p /dev/stdin && \\builtin test ${tailFdPath} -ef ${shellQuoteArgs([path])} && \\builtin type -P tee >/dev/null 2>&1; then`,
    `if ${bothStdoutStderrToFile}; then`,
    `( \\builtin trap - ERR PIPE; \\builtin trap '' XFSZ; \\builtin set +o posix; \\builtin hash -d tee; \\builtin ulimit -f ${MAX_OUTPUT_FILE_BLOCKS};`,
    `\\builtin command tee -a ${tailFdPath} || ${resetTeeScript}; \\builtin true ) 2>/dev/null | \\builtin command tail "$@";`,
    `else ${resetTeeScript} 2>/dev/null; \\builtin command tail "$@"; fi;`,
    'else \\builtin command tail "$@"; fi; };',
    "\\builtin export -fn tail",
  ].join(" ");
  return `{ ${bothStdoutStderrToFile} && \\builtin test -z "$({ \\builtin set +o posix; \\builtin trap -p EXIT ERR DEBUG RETURN CHLD; \\builtin jobs -p; } 2>/dev/null)" && { \\builtin alias tail >/dev/null 2>&1 || \\builtin declare -F tail >/dev/null 2>&1 || \\builtin eval ${shellQuoteArgs([joined])}; } || \\builtin true; }`;
}
//@ chunk-5xgkngpb.js:3152818-3152847 layout
var TENGU_GOOFY_CHURCH = "tengu_goofy_church";
//@ chunk-5xgkngpb.js:3152847-3152901 layout
function zshNoEqualsSuffix() {
  return getFeatureValue_SESSION_PINNED(TENGU_GOOFY_CHURCH, false) === true ? " NO_EQUALS" : "";
}
//@ chunk-5xgkngpb.js:3152901-3153237 fingerprint (2.1.88 match: getDisableExtglobCommand, 0.577)
/**
 * 返回关闭扩展 glob 的命令：bash `shopt -u extglob`，zsh `setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL`；设了 CLAUDE_CODE_SHELL_PREFIX 时两者都试。
 */
function getDisableExtglobCommand(shellPath) {
  if (env.CLAUDE_CODE_SHELL_PREFIX)
    return `{ shopt -u extglob || setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL${zshNoEqualsSuffix()}; } >/dev/null 2>&1 || true`;
  if (shellPath.includes("bash")) return "shopt -u extglob 2>/dev/null || true";
  else if (shellPath.includes("zsh"))
    return `setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL${zshNoEqualsSuffix()} 2>/dev/null || true`;
  return null;
}
//@ chunk-5xgkngpb.js:3153237-3153296 layout
var BUN_OPTIONS_CARRIER_VAR = "__CLAUDE_CC_BUN_OPTIONS";
var UNSHADOWED_COMMANDS = ["unsetenv", "which"];
//@ chunk-5xgkngpb.js:3153296-3153407 layout
/**
 * 生成 `unalias`+`unset -f` 指定命令名的片段，防止用户 rc 里的别名/函数劫持。
 */
function buildUnshadowCommand(commandName) {
  return `{ \\builtin unalias -- '${commandName}'; \\builtin unset -f -- '${commandName}'; } >/dev/null 2>&1 || true`;
}
//@ chunk-5xgkngpb.js:3153407-3153442 layout
function buildUnshadowWhichCommand() {
  return buildUnshadowCommand("which");
}
//@ chunk-5xgkngpb.js:3153442-3153594 layout
var TENGU_SWIRLING_KOALA; // deferred: uses BUN_OPTIONS_CARRIER_VAR of its import cycle while loading; runs once the cycle is complete
var TENGU_QUIZZICAL_ZEBRA;
var EXPORTED_FUNCTION_ENV_NAMES;
deferInit("chunk-5xgkngpb.js:3153442", () => {
  TENGU_SWIRLING_KOALA = "tengu_swirling_koala";
  TENGU_QUIZZICAL_ZEBRA = "tengu_quizzical_zebra";
  EXPORTED_FUNCTION_ENV_NAMES = new Set(
    UNSHADOWED_COMMANDS.flatMap((commandName) => [
      `BASH_FUNC_${commandName}%%`,
      `BASH_FUNC_${commandName}()`,
      `__BASH_FUNC<${commandName}>()`,
    ]),
  );
});
//@ chunk-5xgkngpb.js:3153594-3153683 layout
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
//@ chunk-5xgkngpb.js:3153683-3153721 layout
function buildUnshadowUnsetenvCommand() {
  return buildUnshadowCommand("unsetenv");
}
//@ chunk-5xgkngpb.js:3153721-3154001 layout
/**
 * Windows 沙箱里只接受绝对路径的 bash.exe/sh.exe 作内层 shell（返回 {exe,args:['-c']}），否则告警并返回 null（改用 Git Bash）。
 */
function resolveWindowsSandboxInnerShell(binShell) {
  let lower = basename_43(binShell).toLowerCase();
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
//@ chunk-5xgkngpb.js:3154001-3158216 fingerprint (2.1.88 match: createBashShellProvider, 0.526)
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
        ? join_38(sandboxTmpPosix, `cwd-${execOpts.id}`)
        : join_38(shellTmpdir, `claude-${execOpts.id}-cwd`);
      let cwdFilePath = useSandboxTmp
        ? (isWindows ? join : join_38)(execOpts.sandboxTmpDir, `cwd-${execOpts.id}`)
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
      let rewritten = readFlagWithOverride(TENGU_QUIZZICAL_ZEBRA, {
        safe: true,
      })
        ? classifyCommandReliability(normalizedCommand)
        : null;
      if (rewritten !== null) prefixParts.push(bashVersionGuard(rewritten));
      let tailInput = /(^|\/)bash$/.test(shellPath) ? execOpts.tailInput : undefined;
      if (tailInput !== undefined) prefixParts.push(tailFdDupPrefix(tailInput.path));
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
      if (tailInput !== undefined)
        prefixParts.push(tailTeeOverridePrefix(tailInput.path, tailInput.outputPath));
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
        ...(rewritten !== null && {
          refusedBeforeBash: rewritten,
        }),
        ...(tailInput !== undefined && {
          takesTailInput: true,
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
        env.TMPPREFIX = join_38(posixTmpDir, "zsh");
      }
      return env;
    },
  };
}
//@ chunk-5xgkngpb.js:3158216-3158289 placement
var GIT_CONFIG_TOKEN_RE = /^[A-Za-z0-9@:/._-]+$/;
var GIT_CREDENTIAL_HELPER_KEY_RE = /^credential\.[a-z]+:\/\/.+\.helper$/;
//@ chunk-5xgkngpb.js:3158289-3158591 placement
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
  backgroundCommand,
  stopCommand,
  desktopCmdModule,
  gatedCommandSlot_4,
  usageReport,
  webSetupCommand,
  briefCommand,
  remoteControlCommand,
  recapCommand,
  goalCommand,
  goalNonInteractive,
  loginCommand,
  listAgentsCommand,
  gatedCommandSlot_12,
  EMPTY_COMMAND_LIST,
  diffCmdModule,
  gatedCommandSlot_8,
  gatedCommandSlot_9,
  gatedCommandSlot_10,
  gatedCommandSlot_11,
  gatedCommandSlot_6,
  antGatedCmdA,
  antGatedCmdB,
  sandboxRuntimeConfig,
  gatedInPlaceWriteCommand,
  promoteMemoryCommands,
  accountMemoryCommands,
  gatedCommandSlot_5,
  gatedCommandSlot_1,
  gatedCommandSlot_14,
  internalGatedCmdB,
  stopNonInteractive,
  CWD_FD,
  createBashShellProvider,
  resolveWindowsSandboxInnerShell,
  getExportedShellFunctionEnvVars,
  COMMAND_TEXT_REF_RE,
  COMMAND_TEXT_MISSING_MESSAGE,
  BUN_OPTIONS_CARRIER_VAR,
  COMMAND_TEXT_VAR,
  getGlobBaseDirectory,
  ANT_GATED_COMMANDS,
  INTERNAL_ONLY_COMMANDS,
};
