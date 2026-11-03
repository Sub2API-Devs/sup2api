/**
 * utils/shell/bashProvider.ts
 *
 * bash 提供者：创建 shell 快照，并把用户命令拼成带快照 source、TMPDIR、关闭 extglob、去别名劫持、记录 cwd 的完整命令串。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/bashProvider.ts
 * pieces: chunk-e6aww6q8.js (28)
 * attribution: placement 17, layout 9, fingerprint 2
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { basename as basename_44, isAbsolute as isAbsolute_41 } from "path/win32";
import { access, access as access_2, access as access_3 } from "fs/promises";
import { join as join_39, join as join_83 } from "path/posix";
import { shellQuoteArgs, quoteWithEvalStdinRedirect } from "../bash/bashPipeCommand.js";
import { mn } from "../remoteEnvironment.js";
import { env } from "../env.js";
import { getPlatform } from "../platform.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logForDebugging } from "../debug.js";
import { createAndSaveSnapshot, getSnapshotOverride, CLAUDE_CODE_EXECPATH } from "../bash/ShellSnapshot.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { Ghe } from "./shellEnvSnapshot.js";
import { probeSpawnEnv } from "./_new/probeSpawnEnv.js";
import { tmpdir, claudeTempDir } from "../tempDir.js";
import { windowsPathToPosixPath } from "../path.js";
import {
  rewriteWindowsNullRedirect,
  shouldAddStdinRedirect,
  quoteShellCommand,
} from "../bash/shellQuoting.js";
import { getSessionEnvironmentScript } from "../sessionEnvironment.js";
import { ghStandinDir } from "../subprocessEnv.js";
import { buildGitGrepShim } from "./gitGrepShim.js";
import { buildEnvScrubScript } from "../settings/policyHelper/helperEnv.js";
import { VXs } from "./cpuReport.js";

/**
 * （旧版名配错）为 shell 的 source 命令拼接单引号转义的参数。
 */
//@ chunk-e6aww6q8.js:824194-824358 placement = getGlobBaseDirectory (1)
function getGlobBaseDirectory(e, n) {
  let index = e.lastIndexOf(" -");
  if (index > 0) {
    let beforeGlob = e.substring(0, index),
      substring = e.substring(index + 1);
    return `${shellQuoteArgs([beforeGlob])} ${substring} ${shellQuoteArgs([n])}`;
  } else return `${shellQuoteArgs([e])} ${shellQuoteArgs([n])}`;
}
//@ chunk-e6aww6q8.js:3066031-3066093 placement
var Uwn = { enabled: !1, enforce: !1, everywhere: !1, python_leg: "on" };
//@ chunk-e6aww6q8.js:3066093-3066119 placement
function Qvr() {
  return Uwn;
}
//@ chunk-e6aww6q8.js:3066119-3066143 placement
function Jvr() {
  return !1;
}
//@ chunk-e6aww6q8.js:3066143-3066167 placement
function pZe() {
  return !1;
}
//@ chunk-e6aww6q8.js:3066167-3066194 placement
function Gwn() {
  return null;
}
//@ chunk-e6aww6q8.js:3066194-3066273 placement
function Zvr(e) {
  return e.python_leg === "on" || (e.python_leg === "containers" && pZe());
}
//@ chunk-e6aww6q8.js:3066273-3066290 placement
var wne = null,
  jwn;
//@ chunk-e6aww6q8.js:3066290-3066330 placement
function zwn() {
  return Promise.resolve();
}
//@ chunk-e6aww6q8.js:3066330-3066352 placement
function qwn() {
  return;
}
//@ chunk-e6aww6q8.js:3066352-3066379 placement
function Kwn() {
  return null;
}
//@ chunk-e6aww6q8.js:3066379-3066463 placement
function Wwn(e) {
  return (e ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 63);
}
//@ chunk-e6aww6q8.js:3066463-3066490 placement
function eEr() {
  return null;
}
/**
 * 通过环境变量传递命令文本的相关常量：变量名、引用串及其正则、变量被提前删除时的提示，以及走环境变量传递的命令字节上限。
 */
//@ chunk-e6aww6q8.js:3066524-3066854 placement
var COMMAND_TEXT_VAR = "__CLAUDE_CC_COMMAND_TEXT",
  COMMAND_TEXT_REF = `${COMMAND_TEXT_VAR}?`,
  COMMAND_TEXT_REF_RE = new RegExp(`^${COMMAND_TEXT_VAR}\\?$`, "m"),
  COMMAND_TEXT_MISSING_MESSAGE =
    "Claude Code did not run this command: something that the shell runs first (a hook's environment file, say) removed the variable that held the command's text. Run it again: commands are now passed on the shell's command line instead.",
  MAX_ENV_COMMAND_BYTES = 122880;
//@ chunk-e6aww6q8.js:3066854-3067036 placement
function shouldGuardPkill(e, n) {
  return (
    /\b(pkill|pgrep|pidwait)\b/.test(e) &&
    basename_45(n) === "bash" &&
    mn() &&
    !env.CLAUDE_CODE_SHELL_PREFIX &&
    getPlatform() === "linux" &&
    Buffer.byteLength(e) <= MAX_ENV_COMMAND_BYTES &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_golden_wirth", !1)
  );
}
/**
 * 生成取消导出 __CLAUDE_CC_COMMAND_TEXT 的片段（命令文本经环境变量携带时使用）。
 */
//@ chunk-e6aww6q8.js:3067036-3067123 layout
function buildCommandTextCarrierUnexport() {
  return `{ \\builtin typeset +x '${COMMAND_TEXT_VAR}' 2>/dev/null || \\builtin true; }`;
}
/**
 * 生成从 __CLAUDE_CC_COMMAND_TEXT 取出命令文本、unset 后 eval 的片段；变量丢失则 exit 126。
 */
//@ chunk-e6aww6q8.js:3067123-3067295 layout
function buildCommandTextCarrierEval() {
  return `{ \\builtin [ -n "\${${COMMAND_TEXT_VAR}:+1}" ] || { \\builtin echo '${COMMAND_TEXT_REF}' >&2; \\builtin exit 126; }; } && 'eval' "\\builtin 'unset' -v '${COMMAND_TEXT_VAR}'; 'eval' $${COMMAND_TEXT_VAR}"`;
}
/**
 * 返回关闭扩展 glob 的命令：bash `shopt -u extglob`，zsh `setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL`；设了 CLAUDE_CODE_SHELL_PREFIX 时两者都试。
 */
//@ chunk-e6aww6q8.js:3067295-3067615 fingerprint = getDisableExtglobCommand (0.729)
function getDisableExtglobCommand(shellPath) {
  if (env.CLAUDE_CODE_SHELL_PREFIX)
    return "{ shopt -u extglob || setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL; } >/dev/null 2>&1 || true";
  if (shellPath.includes("bash")) return "shopt -u extglob 2>/dev/null || true";
  else if (shellPath.includes("zsh")) return "setopt NO_EXTENDED_GLOB NO_BARE_GLOB_QUAL 2>/dev/null || true";
  return null;
}
//@ chunk-e6aww6q8.js:3067615-3067674 layout
var BUN_OPTIONS_CARRIER_VAR = "__CLAUDE_CC_BUN_OPTIONS",
  UNSHADOWED_COMMANDS = ["unsetenv", "which"];
/**
 * 生成 `unalias`+`unset -f` 指定命令名的片段，防止用户 rc 里的别名/函数劫持。
 */
//@ chunk-e6aww6q8.js:3067674-3067785 layout
function buildUnshadowCommand(e) {
  return `{ \\builtin unalias -- '${e}'; \\builtin unset -f -- '${e}'; } >/dev/null 2>&1 || true`;
}
//@ chunk-e6aww6q8.js:3067785-3067820 layout
function buildUnshadowWhichCommand() {
  return buildUnshadowCommand("which");
}
//@ chunk-e6aww6q8.js:3067820-3067944 layout
var TENGU_SWIRLING_KOALA = "tengu_swirling_koala",
  EXPORTED_FUNCTION_ENV_NAMES = new Set(
    UNSHADOWED_COMMANDS.flatMap((e) => [`BASH_FUNC_${e}%%`, `BASH_FUNC_${e}()`, `__BASH_FUNC<${e}>()`]),
  );
/**
 * tengu_swirling_koala 打开时，返回环境里存在的 BASH_FUNC_which%%/unsetenv 之类导出函数变量名，供 spawn 时 unset。
 */
//@ chunk-e6aww6q8.js:3067944-3068033 layout
function getExportedShellFunctionEnvVars(e) {
  if (!readFlagWithOverride(TENGU_SWIRLING_KOALA, { safe: !0 })) return [];
  return [...EXPORTED_FUNCTION_ENV_NAMES].filter((n) => e[n] !== void 0);
}
//@ chunk-e6aww6q8.js:3068033-3068071 layout
function buildUnshadowUnsetenvCommand() {
  return buildUnshadowCommand("unsetenv");
}
/**
 * Windows 沙箱里只接受绝对路径的 bash.exe/sh.exe 作内层 shell（返回 {exe,args:['-c']}），否则告警并返回 null（改用 Git Bash）。
 */
//@ chunk-e6aww6q8.js:3068071-3068351 layout
function resolveWindowsSandboxInnerShell(e) {
  let lower = basename_44(e).toLowerCase();
  if (isAbsolute_41(e) && (lower === "bash.exe" || lower === "sh.exe")) return { exe: e, args: ["-c"] };
  return (
    logForDebugging(
      `sandbox: shell "${e}" is not an absolute bash-family exe SRT accepts as an inner shell; falling back to Git Bash for the sandboxed child`,
      { level: "warn" },
    ),
    null
  );
}
/**
 * 创建 bash 提供者：异步生成 shell 快照（失败则回落到 login shell，-l）；buildExecCommand 依次拼接：source 快照、Windows TEMP/TMP、沙箱 TMPDIR、会话环境脚本、PATH 追加、BUN_OPTIONS 搬运、额外 git config、关闭 extglob、去掉 which/unsetenv 劫持、scrub 凭据环境、cgroup 记账、`eval '<命令>'` 和 `pwd -P >| <cwd 文件>`，再套 CLAUDE_CODE_SHELL_PREFIX；getEnvironmentOverrides 设 CLAUDE_CODE_EXECPATH、沙箱 TMPDIR/TMPPREFIX。
 */
//@ chunk-e6aww6q8.js:3068351-3072279 fingerprint = createBashShellProvider (0.542)
async function createBashShellProvider(shellPath, options) {
  qwn();
  let sandboxTmpDir,
    snapshotResult = null,
    now = Date.now(),
    snapshotPromise = options?.skipSnapshot
      ? Promise.resolve(void 0)
      : createAndSaveSnapshot(shellPath, options?.pluginBinPaths ?? [])
          .then((error) => {
            snapshotResult = error;
            let q = Date.now() - now;
            if (error !== void 0) logFeatureOk("shell_snapshot_create", { duration_ms: q });
            else logFeatureSad("shell_snapshot_create", "snapshot_failed", { duration_ms: q });
            return (Ghe(error !== void 0), error);
          })
          .catch((G) => {
            (logForDebugging(`Failed to create shell snapshot: ${G}`),
              logFeatureSad("shell_snapshot_create", "snapshot_unexpected_throw"),
              Ghe(!1),
              (snapshotResult = void 0));
            return;
          });
  if (!options?.skipSnapshot) probeSpawnEnv(shellPath).catch(() => {});
  let activeSnapshotPath,
    reportedSnapshotMissing = !1,
    carryCommandText = !0;
  return {
    type: "bash",
    shellPath: shellPath,
    detached: !0,
    stdin: "pipe",
    snapshotSettled: snapshotPromise,
    async buildExecCommand(command, execOpts) {
      let snapshotFilePath = await snapshotPromise;
      if (snapshotFilePath)
        try {
          await access_3(snapshotFilePath);
        } catch {
          if (
            (logForDebugging(`Snapshot file missing, falling back to login shell: ${snapshotFilePath}`),
            !reportedSnapshotMissing)
          )
            ((reportedSnapshotMissing = !0),
              logFeatureSad("shell_snapshot_create", "snapshot_missing_at_exec"));
          snapshotFilePath = void 0;
        }
      ((activeSnapshotPath = snapshotFilePath),
        Ghe(snapshotFilePath !== void 0),
        (sandboxTmpDir = execOpts.sandboxTmpDir));
      let tmpdir_2 = tmpdir(),
        isWindows = getPlatform() === "windows",
        we = isWindows ? windowsPathToPosixPath(tmpdir_2) : tmpdir_2,
        useSandboxTmp = execOpts.useSandbox && execOpts.sandboxTmpDir,
        Ae =
          useSandboxTmp && isWindows
            ? windowsPathToPosixPath(execOpts.sandboxTmpDir)
            : execOpts.sandboxTmpDir,
        cwdFileShellPath = useSandboxTmp
          ? join_83(Ae, `cwd-${execOpts.id}`)
          : join_83(we, `claude-${execOpts.id}-cwd`),
        cwdFilePath = useSandboxTmp
          ? (isWindows ? join_82 : join_83)(execOpts.sandboxTmpDir, `cwd-${execOpts.id}`)
          : join_82(tmpdir_2, `claude-${execOpts.id}-cwd`),
        normalizedCommand = rewriteWindowsNullRedirect(command),
        addStdinRedirect = shouldAddStdinRedirect(normalizedCommand),
        quotedCommand = quoteShellCommand(normalizedCommand, addStdinRedirect);
      if (normalizedCommand.includes("|") && addStdinRedirect)
        quotedCommand = quoteWithEvalStdinRedirect(normalizedCommand);
      let useCommandTextCarrier =
          carryCommandText &&
          !execOpts.useSandbox &&
          !execOpts.scrubCredentialEnv &&
          snapshotFilePath !== void 0 &&
          execOpts.noBashEnv === !0 &&
          shouldGuardPkill(quotedCommand, shellPath),
        prefixParts = useCommandTextCarrier ? [buildCommandTextCarrierUnexport()] : [];
      if (snapshotFilePath) {
        let Zt = getPlatform() === "windows" ? windowsPathToPosixPath(snapshotFilePath) : snapshotFilePath;
        prefixParts.push(`source ${shellQuoteArgs([Zt])} 2>/dev/null || true`);
      }
      if (isWindows) {
        let Zt = useSandboxTmp ? execOpts.sandboxTmpDir : tmpdir_2,
          rn = useSandboxTmp ? ` TMPDIR=${shellQuoteArgs([Ae])}` : "",
          pn = `export TEMP=${shellQuoteArgs([Zt])} TMP=${shellQuoteArgs([Zt])}${rn}`;
        if ((prefixParts.push(pn), useSandboxTmp))
          prefixParts.push(
            `{ [ -z "\${BASH_VERSION:-}" ] || [ -z "\${LOCALAPPDATA:-}" ] || { TMP=\${LOCALAPPDATA#*:} && TMP=\${TMP%"\${TMP#?}"} && TEMP=$LOCALAPPDATA\${TMP}Temp && TMPDIR=\${TEMP//"$TMP"//} && TMPDIR=/\${TMPDIR%%:*}\${TMPDIR#*:} && case $TMPDIR in *[![:alnum:][:blank:]/._-]*) false;; esac && [ -d "$TMPDIR" ] && TMP=$TEMP || ${pn}; }; }`,
          );
      } else if (useSandboxTmp) prefixParts.push(`export TMPDIR=${shellQuoteArgs([execOpts.sandboxTmpDir])}`);
      if (execOpts.tmpDirBackstop !== void 0) {
        let Zt = isWindows ? windowsPathToPosixPath(execOpts.tmpDirBackstop) : execOpts.tmpDirBackstop;
        prefixParts.push(`{ [ -n "\${TMPDIR:-}" ] || export TMPDIR=${shellQuoteArgs([Zt])}; }`);
      }
      let sessionEnvScript = execOpts.scrubCredentialEnv
        ? null
        : await getSessionEnvironmentScript(execOpts.storageV5);
      if (sessionEnvScript)
        prefixParts.push(`${sessionEnvScript}
:`);
      let Et = ghStandinDir();
      if (Et !== void 0) prefixParts.push(`export PATH="\${PATH:+$PATH:}"${shellQuoteArgs([Et])}`);
      if (execOpts.bunOptions !== void 0)
        prefixParts.push(
          `{ \\builtin test -n "\${${BUN_OPTIONS_CARRIER_VAR}-}" && \\builtin export BUN_OPTIONS="$${BUN_OPTIONS_CARRIER_VAR}" && \\builtin unset -v ${BUN_OPTIONS_CARRIER_VAR} || { \\builtin printf '%s\\n' 'Claude Code did not run this command: it could not set BUN_OPTIONS, which turns off automatic package installs in Bun. A read-only BUN_OPTIONS, or a CLAUDE_CODE_SHELL_PREFIX that drops the environment, can cause this.' >&2; \\builtin exit 126; }; }`,
        );
      if (env.CLAUDE_CODE_REMOTE)
        prefixParts.push('\\builtin export BUN_OPTIONS="--smol${BUN_OPTIONS:+ $BUN_OPTIONS}"');
      if (execOpts.extraGitConfig !== void 0 && execOpts.extraGitConfig.length > 0)
        prefixParts.push(buildGitConfigExport(execOpts.extraGitConfig));
      let disableExtglobCmd = getDisableExtglobCommand(shellPath);
      if (disableExtglobCmd) prefixParts.push(disableExtglobCmd);
      if (readFlagWithOverride(TENGU_SWIRLING_KOALA, { safe: !0 }))
        prefixParts.push(buildUnshadowWhichCommand());
      prefixParts.push(buildUnshadowUnsetenvCommand());
      let gt = await buildGitGrepShim(normalizedCommand);
      if (gt !== null) prefixParts.push(gt);
      let At = Kwn() ?? getSnapshotOverride();
      if (At !== null) prefixParts.push(At);
      if (execOpts.scrubCredentialEnv)
        prefixParts.push(buildEnvScrubScript({ sandboxMasked: execOpts.sandboxMaskedEnv }));
      let It = execOpts.shellToolCommand ? VXs() : void 0;
      if (It !== void 0) prefixParts.push(It);
      (prefixParts.push(useCommandTextCarrier ? buildCommandTextCarrierEval() : `eval ${quotedCommand}`),
        prefixParts.push(`pwd -P >| ${shellQuoteArgs([cwdFileShellPath])}`));
      let commandString = prefixParts.join(" && "),
        CLAUDE_CODE_SHELL_PREFIX = env.CLAUDE_CODE_SHELL_PREFIX;
      if (CLAUDE_CODE_SHELL_PREFIX)
        commandString = getGlobBaseDirectory(CLAUDE_CODE_SHELL_PREFIX, commandString);
      return {
        commandString: commandString,
        cwdFilePath: cwdFilePath,
        ...(It !== void 0 && {
          cpuAccountJoin: execOpts.useSandbox || CLAUDE_CODE_SHELL_PREFIX ? "uncertain" : "certain",
        }),
        ...(useCommandTextCarrier && { carriedCommandText: quotedCommand }),
      };
    },
    stopCarryingCommandText() {
      carryCommandText = !1;
    },
    getSpawnArgs(G) {
      let q = activeSnapshotPath !== void 0;
      if (q) logForDebugging("Spawning shell without login (-l flag skipped)");
      return ["-c", ...(q ? [] : ["-l"]), G];
    },
    async isSnapshotUsable() {
      if (options?.skipSnapshot || snapshotResult === null) return !0;
      if (snapshotResult === void 0) return !1;
      try {
        return (await access_3(snapshotResult), !0);
      } catch {
        return !1;
      }
    },
    async getEnvironmentOverrides(G, q, Z) {
      let Se = null,
        env = {};
      if (((env[CLAUDE_CODE_EXECPATH] = process.execPath), Se)) env.TMUX = Se;
      if (Z) for (let [we, Ee] of Z) env[we] = Ee;
      if (sandboxTmpDir) {
        let posixTmpDir = sandboxTmpDir;
        if (getPlatform() === "windows") posixTmpDir = windowsPathToPosixPath(posixTmpDir);
        ((env.TMPDIR = posixTmpDir),
          (env.CLAUDE_CODE_TMPDIR = claudeTempDir()),
          (env.TMPPREFIX = join_83(posixTmpDir, "zsh")));
      }
      return env;
    },
  };
}
//@ chunk-e6aww6q8.js:3072279-3072352 placement
var oTn = /^[A-Za-z0-9@:/._-]+$/,
  pEr = /^credential\.[a-z]+:\/\/.+\.helper$/;
/**
 * 生成追加 GIT_CONFIG_PARAMETERS 的 export 语句；键值含 shell 敏感字符时拒绝并抛错。
 */
//@ chunk-e6aww6q8.js:3072352-3072654 placement
function buildGitConfigExport(e) {
  return `export GIT_CONFIG_PARAMETERS="\${GIT_CONFIG_PARAMETERS:+\${GIT_CONFIG_PARAMETERS} }${e
    .map(([r, s]) => {
      let h = s === "" && pEr.test(r);
      if (!oTn.test(r) || !(h || oTn.test(s)))
        throw Error("refusing to export a git config entry with shell-active characters");
      return `'${r}=${s}'`;
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
