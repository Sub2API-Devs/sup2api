/**
 * utils/gitSafeExec.ts
 *
 * 2.1.316 新增：安全运行 git：清除危险环境与 config（hooksPath、fsmonitor、askPass）、禁用交互凭据与 ssh 主机确认、发现上限
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hb44av3w.js (48)
 * attribution: placement 48
 */
import { parse, sep, isAbsolute, delimiter, resolve, basename, dirname } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { GIT_NO_PROMPT_ENV } from "./plugins/marketplaceManager.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { firstLineOf } from "./stringUtils.js";
import { GIT_SAFE_GLOBAL_ARGS, LFS_SKIP_ENV, GIT_LOCATION_ENV_VARS } from "./git/gitSafeEnv.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hb44av3w.js:4141-4354 placement
function formatGitErrorFrames(error, frames) {
  return [
    `${error.name}: ${error.message}`,
    ...frames.map((frame) => {
      let location = `${frame.file}${frame.line ? `:${frame.line}` : ""}${frame.column ? `:${frame.column}` : ""}`;
      return frame.function ? `    at ${frame.function} (${location})` : `    at ${location}`;
    }),
  ].join(`
`);
}
//@ chunk-hb44av3w.js:4411-4645 placement
class GitStartFolderError {
  #e;
  constructor(path) {
    this.#e = path;
  }
  get path() {
    return this.#e;
  }
  static filesystemRoot() {
    return new GitStartFolderError(parse(process.execPath).root || sep);
  }
  static forTests(path) {
    if (!isAbsolute(path)) throw Error("a test start folder must be absolute");
    return new GitStartFolderError(path);
  }
}
//@ chunk-hb44av3w.js:4645-4791 placement
function buildGitInvocation(gitStartsIn, cwd, args, env) {
  let cleanedEnv = {
    ...env,
  };
  for (let key of Object.keys(env)) if (/^(?:OLD)?PWD$/i.test(key)) delete cleanedEnv[key];
  return {
    cwd: gitStartsIn.path,
    args: ["-C", cwd, ...args],
    env: cleanedEnv,
  };
}
//@ chunk-hb44av3w.js:4791-4834 placement
var CLAUDE_CODE_FOUND_REPOSITORY_GIT = "CLAUDE_CODE_FOUND_REPOSITORY_GIT";
//@ chunk-hb44av3w.js:4871-4951 placement
/**
 * 归一化一次环境读取结果（payload 显式给出默认主机时取反）。
 */
function resolveEnvRead(read, fallback) {
  return read.value === !fallback && read.source === "payload" && read.defaultHost ? !fallback : fallback;
}
//@ chunk-hb44av3w.js:4951-5111 placement
class envReaderHolder {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  read(key, fallback) {
    let reader = this.reader;
    if (!reader) return fallback;
    try {
      return resolveEnvRead(reader(key, fallback), fallback);
    } catch {
      return fallback;
    }
  }
}
//@ chunk-hb44av3w.js:5232-5311 placement
/**
 * 替代 core.alternateRefsCommand 的安全脚本（用 git-dir 列 ref 名）。
 */
var ALTERNATE_REFS_COMMAND = `f() { git --git-dir="$1" for-each-ref --format='%(objectname)'; }; f`;
//@ chunk-hb44av3w.js:5345-5390 placement
/**
 * 路径含路径分隔列表符时返回 null（拒绝）。
 */
function rejectSeparatorPath(path) {
  return path.includes(delimiter) ? null : path;
}
//@ chunk-hb44av3w.js:5390-5468 placement
/**
 * 判断是否应优先用 HTTPS 传输（远程或插件偏好）。
 */
function preferHttpsGitTransport() {
  return env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_PLUGIN_PREFER_HTTPS;
}
//@ chunk-hb44av3w.js:5468-5707 placement
/**
 * 运行 git 时附加的安全 -c 参数（upload-pack、alternateRefsCommand、签名显示等）。
 */
var SAFE_UPLOAD_PACK_ARG_2 = "--upload-pack=git-upload-pack";
var SAFE_UPLOAD_PACK_ARG = ["-c", `core.alternateRefsCommand=${ALTERNATE_REFS_COMMAND}`];
var LOG_SAFETY_CONFIG = [
  ["log.showSignature", "false"],
  ["format.pretty", "medium"],
];
var MAINTENANCE_OFF_CONFIG = [
  ["gc.auto", "0"],
  ["maintenance.auto", "false"],
];
var DIFF_SAFETY_CONFIG = [["diff.autoRefreshIndex", "false"]];
//@ chunk-hb44av3w.js:5707-5770 placement
/**
 * 返回平台的空设备路径（Windows 用 \\.\NUL）。
 */
function nullDevicePath() {
  return getPlatform() === "windows" ? "\\\\.\\NUL" : "/dev/null";
}
//@ chunk-hb44av3w.js:5770-6376 placement
/**
 * 空 hooksPath 配置匹配正则、git 钩子名清单与对应的 hook.<name>.enabled=false 覆盖，以及环境读取器单例。
 */
var NULL_HOOKS_PATH_PATTERN; // deferred: uses envReaderHolder of its import cycle while loading; runs once the cycle is complete
var GIT_HOOK_NAMES;
var mapped;
var TENGU_COZY_PARASOL;
var envReaderSingleton;
deferInit("chunk-hb44av3w.js:5770", () => {
  NULL_HOOKS_PATH_PATTERN = /^core\.hooksPath=(?:\/dev\/null|\\\\\.\\nul)$/i;
  GIT_HOOK_NAMES = [
    "applypatch-msg",
    "pre-applypatch",
    "post-applypatch",
    "pre-commit",
    "pre-merge-commit",
    "prepare-commit-msg",
    "commit-msg",
    "post-commit",
    "pre-rebase",
    "post-checkout",
    "post-merge",
    "pre-push",
    "pre-receive",
    "update",
    "proc-receive",
    "post-receive",
    "post-update",
    "reference-transaction",
    "push-to-checkout",
    "pre-auto-gc",
    "post-rewrite",
    "sendemail-validate",
    "fsmonitor-watchman",
    "p4-changelist",
    "p4-prepare-changelist",
    "p4-post-changelist",
    "p4-pre-submit",
    "post-index-change",
  ];
  mapped = GIT_HOOK_NAMES.map((hookName) => [`hook.${hookName}.enabled`, "false"]);
  TENGU_COZY_PARASOL = "tengu_cozy_parasol";
  envReaderSingleton = new envReaderHolder();
});
//@ chunk-hb44av3w.js:6376-6414 placement
/**
 * 注册环境读取器（返回旧值）。
 */
function registerEnvReader(reader) {
  return envReaderSingleton.register(reader);
}
//@ chunk-hb44av3w.js:6414-6450 placement
function isAlternateRefsCommandEnabled() {
  return envReaderSingleton.read(TENGU_COZY_PARASOL, true);
}
//@ chunk-hb44av3w.js:6450-6676 placement
/**
 * （切分错误，git 安全）运行 git 时强制的 -c 配置：清空 core.fsmonitor、core.hooksPath 指向安全目录、清空 core.askPass、禁 ext 协议、submodule.recurse=false 等。
 */
function getGitSafetyConfigPairs() {
  return [
    ["core.fsmonitor", ""],
    ["core.hooksPath", nullDevicePath()],
    ["core.askPass", ""],
    ["protocol.ext.allow", "never"],
    ...(isAlternateRefsCommandEnabled() ? [["core.alternateRefsCommand", ALTERNATE_REFS_COMMAND]] : []),
    ["submodule.recurse", "false"],
    ...LOG_SAFETY_CONFIG,
    ...MAINTENANCE_OFF_CONFIG,
    ...DIFF_SAFETY_CONFIG,
    ...mapped,
  ];
}
//@ chunk-hb44av3w.js:7924-8020 placement
/**
 * 补齐禁止交互提示的 git 环境变量默认值（不覆盖已有值）。
 */
function noPromptEnvDefaults(env) {
  let missing = {};
  for (let [key, value] of Object.entries(GIT_NO_PROMPT_ENV))
    if (getEnvVarCaseInsensitiveOnWindows(env, key) === undefined) missing[key] = value;
  return missing;
}
//@ chunk-hb44av3w.js:8020-8182 placement
function withGitNoPromptEnv(env = process.env) {
  return {
    ...env,
    ...blankEnvKeys(env, (upperKey, key) => Object.hasOwn(GIT_NO_PROMPT_ENV, upperKey) && key !== upperKey),
    ...GIT_NO_PROMPT_ENV,
    ...buildGitConfigEnv(
      getEnvVarCaseInsensitiveOnWindows(env, "GIT_CONFIG_COUNT"),
      [["credential.interactive", "false"]],
      env,
    ),
  };
}
//@ chunk-hb44av3w.js:8182-8280 placement
function blankEnvKeys(env, predicate) {
  let cleared = {};
  for (let key of Object.keys(env)) if (predicate(key.toUpperCase(), key)) cleared[key] = undefined;
  return cleared;
}
//@ chunk-hb44av3w.js:8280-8427 placement
function getEnvVarCaseInsensitiveOnWindows(env, name) {
  if (env[name] !== undefined || getPlatform() !== "windows") return env[name];
  for (let [key, value] of Object.entries(env))
    if (key.toUpperCase() === name && value !== undefined) return value;
  return;
}
//@ chunk-hb44av3w.js:8427-8545 placement
function hasEnvVar(env, name) {
  if (Object.hasOwn(env, name)) return true;
  return getPlatform() === "windows" && Object.keys(env).some((key) => key.toUpperCase() === name);
}
//@ chunk-hb44av3w.js:8545-8816 placement
function buildGitConfigEnv(count, pairs, env = {}) {
  let baseCount = Number(count);
  let existingCount = Number.isInteger(baseCount) && baseCount > 0 ? baseCount : 0;
  let out = {
    GIT_CONFIG_COUNT: String(existingCount + pairs.length),
  };
  pairs.forEach(([key, value], index) => {
    out[`GIT_CONFIG_KEY_${existingCount + index}`] = key;
    out[`GIT_CONFIG_VALUE_${existingCount + index}`] = value;
  });
  let writtenKeys = new Set(Object.keys(out));
  return {
    ...blankEnvKeys(env, (upperKey, key) => writtenKeys.has(upperKey) && !writtenKeys.has(key)),
    ...out,
  };
}
//@ chunk-hb44av3w.js:8816-8984 placement
var SSH_BATCH_CONFIG_ARGS = ["-c", "core.sshCommand=ssh -o BatchMode=yes -o StrictHostKeyChecking=yes"];
var SSH_BATCH_STRICT_OPTIONS = "-o BatchMode=yes -o StrictHostKeyChecking=yes";
var SSH_BATCH_OPTIONS = "-o BatchMode=yes";
var PLINK_BATCH_OPTION = "-batch";
//@ chunk-hb44av3w.js:8984-9078 placement
function sshBatchOptionsFor(variant, strictHostKeys) {
  switch (variant) {
    case "ssh":
      return strictHostKeys ? SSH_BATCH_STRICT_OPTIONS : SSH_BATCH_OPTIONS;
    case "plink":
      return PLINK_BATCH_OPTION;
    case "other":
      return;
  }
}
//@ chunk-hb44av3w.js:9078-9210 placement
function wrapWithCdCommand(dir, command) {
  let posixDir = getPlatform() === "windows" ? dir.replace(/\\/g, "/") : dir;
  return `CDPATH= cd -- ${shellQuoteArgs([posixDir])} 2>/dev/null || cd / || exit 1; ${command}`;
}
//@ chunk-hb44av3w.js:9210-9274 placement
/**
 * 取主目录，取不到时返回 "/"。
 */
function homeDirOrDefault() {
  let home = "";
  try {
    home = homedir();
  } catch {}
  return isAbsolute(home) ? home : resolve("/");
}
//@ chunk-hb44av3w.js:9274-9433 placement
function resolveSshVariant(variant, command) {
  if (variant !== undefined && variant !== "auto") return variant;
  let replaced = quoteForShell(command)
    .toLowerCase()
    .replace(/\.exe$/, "");
  return ["ssh", "plink", "tortoiseplink"].includes(replaced) ? replaced : "auto";
}
//@ chunk-hb44av3w.js:9433-9811 placement
function quoteForShell(command) {
  let plain = "";
  let quote;
  let leading = true;
  for (let idx = 0; idx < command.length; idx++) {
    let char = command[idx];
    let emitted;
    if (quote === undefined && /[ \t\n\r]/.test(char)) leading = false;
    else if (quote === undefined && (char === "'" || char === '"')) quote = char;
    else if (char === quote) quote = undefined;
    else if (char === "\\" && quote !== "'") {
      idx++;
      if (idx >= command.length) return "";
      emitted = command[idx];
    } else emitted = char;
    if (leading && emitted !== undefined) plain += emitted;
  }
  if (quote !== undefined) return "";
  let separatorRe = getPlatform() === "windows" ? /[\\/]/ : /\//;
  return (
    plain
      .split(separatorRe)
      .filter((segment) => segment !== "")
      .at(-1) ?? ""
  );
}
//@ chunk-hb44av3w.js:9811-9924 placement
function withGitSshCommand(env, command) {
  return {
    ...env,
    ...blankEnvKeys(env, (key) => key === "GIT_SSH_COMMAND" || key === "GIT_SSH"),
    GIT_SSH: undefined,
    GIT_SSH_COMMAND: command,
  };
}
//@ chunk-hb44av3w.js:9924-10130 placement
/**
 * 构造非交互的 git ssh 命令：从 GIT_SSH_COMMAND/GIT_SSH 或给定命令选出 ssh 程序，按变体（ssh/plink）追加 BatchMode（可选 StrictHostKeyChecking）或 -batch；已有 -batch 时不重复，返回命令与更新后的环境。
 */
function buildBatchSshCommand(env, command, { strictHostKeys = true } = {}) {
  let { chosen, named } = chooseSshCommand(env, command);
  let options = sshBatchOptionsFor(
    named === undefined ? "ssh" : detectSshVariant(env, named),
    strictHostKeys,
  );
  if (options === undefined || (options === PLINK_BATCH_OPTION && hasPlinkBatchFlag(chosen)))
    return {
      command: chosen,
      env,
    };
  let withOptions = `${chosen} ${options}`;
  return {
    command: withOptions,
    env: withGitSshCommand(env, withOptions),
  };
}
//@ chunk-hb44av3w.js:10130-10264 placement
function chooseSshCommand(env, configured) {
  let command =
    safeSshVariant(getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_COMMAND")) ?? safeSshVariant(configured);
  let program = safeSshVariant(getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH"));
  return {
    chosen: command ?? shellQuoteArgs([program ?? "ssh"]),
    named: command !== undefined ? firstShellWord(command) : program,
  };
}
//@ chunk-hb44av3w.js:10264-10440 placement
function unknownSshCommandVariant(env, configured) {
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT");
  let { chosen, named } = chooseSshCommand(env, configured);
  return (envVarCaseInsensitiveOnWindows === undefined || envVarCaseInsensitiveOnWindows === "auto") &&
    named !== undefined &&
    !["ssh", "plink", "tortoiseplink"].includes(normalizeSshProgramName(named))
    ? chosen
    : undefined;
}
//@ chunk-hb44av3w.js:10440-10796 placement
async function readSshCommandConfig(env, runGit) {
  if (getPlatform() !== "windows") return env;
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_COMMAND");
  if (envVarCaseInsensitiveOnWindows !== undefined)
    return envVarCaseInsensitiveOnWindows.trim() === ""
      ? env
      : buildBatchSshCommand(env, undefined, {
          strictHostKeys: false,
        }).env;
  let result = await runGit(["config", "--null", "--get", "core.sshCommand"]);
  let sshCommand =
    result.exitCode === 0 && result.stdout.includes("\x00") ? firstLineOf(result.stdout, "\x00") : undefined;
  if (sshCommand?.trim() === "") return env;
  return buildBatchSshCommand(env, sshCommand, {
    strictHostKeys: false,
  }).env;
}
//@ chunk-hb44av3w.js:10796-10852 placement
function safeSshVariant(value) {
  return value !== undefined && value.trim() !== "" ? value : undefined;
}
//@ chunk-hb44av3w.js:10852-11065 placement
function detectSshVariant(env, name) {
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT");
  if (envVarCaseInsensitiveOnWindows !== undefined && envVarCaseInsensitiveOnWindows !== "auto")
    return envVarCaseInsensitiveOnWindows === "plink"
      ? "plink"
      : ["putty", "tortoiseplink", "simple"].includes(envVarCaseInsensitiveOnWindows)
        ? "other"
        : "ssh";
  let programName = normalizeSshProgramName(name);
  return programName === "ssh" || programName === "plink" ? programName : "other";
}
//@ chunk-hb44av3w.js:11065-11154 placement
function normalizeSshProgramName(name) {
  return basename(name.trim().replace(/\\/g, "/"))
    .toLowerCase()
    .replace(/\.exe$/, "");
}
//@ chunk-hb44av3w.js:11154-11289 placement
function hasPlinkBatchFlag(chosen) {
  let firstWord = chosen.trim().match(/^(?:"[^"]*"|'[^']*'|\S+)/)?.[0] ?? "";
  return /(?:^|\s)-batch(?:\s|$)/.test(chosen.trim().slice(firstWord.length));
}
//@ chunk-hb44av3w.js:11289-11393 placement
function firstShellWord(command) {
  let match = command.trim().match(/^(?:"([^"]*)"|'([^']*)'|(\S+))/);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}
//@ chunk-hb44av3w.js:11393-11562 placement
var DISABLED_GIT_PROTOCOL_ARGS = [
  "-c",
  "protocol.ext.allow=never",
  "-c",
  "protocol.fd.allow=never",
  "-c",
  "protocol.git.allow=never",
  "-c",
  "protocol.ftp.allow=never",
  "-c",
  "protocol.ftps.allow=never",
];
//@ chunk-hb44av3w.js:11562-11654 placement
function withoutAllowProtocolEnv(env) {
  return {
    ...env,
    ...blankEnvKeys(env, (key) => key === "GIT_ALLOW_PROTOCOL"),
    GIT_ALLOW_PROTOCOL: undefined,
  };
}
//@ chunk-hb44av3w.js:11654-11861 placement
function restrictGitProtocols(env) {
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_ALLOW_PROTOCOL");
  if (envVarCaseInsensitiveOnWindows === undefined) return [];
  let allowed = new Set(envVarCaseInsensitiveOnWindows.split(":"));
  return ["https", "http", "ssh", "file"]
    .filter((protocol) => !allowed.has(protocol))
    .flatMap((protocol) => ["-c", `protocol.${protocol}.allow=never`]);
}
//@ chunk-hb44av3w.js:11861-11899 placement
function FILE_REF_BACKEND_ARGS(env) {
  return [...DISABLED_GIT_PROTOCOL_ARGS, ...restrictGitProtocols(env)];
}
//@ chunk-hb44av3w.js:11899-11979 placement
var sameAsFileRefBackendArgs = ["-c", "init.defaultRefFormat=files"];
var FILE_REF_BACKEND_ENV = {
  GIT_DEFAULT_REF_FORMAT: "files",
};
//@ chunk-hb44av3w.js:11979-12383 placement
function buildSshCommand(env = withGitNoPromptEnv(scrubbedGitEnv()), sshConfig) {
  let pinArgs = [...FILE_REF_BACKEND_ARGS(env), ...sameAsFileRefBackendArgs];
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT");
  let baseEnv =
    envVarCaseInsensitiveOnWindows === undefined || envVarCaseInsensitiveOnWindows === "auto"
      ? {
          ...env,
          ...blankEnvKeys(env, (key) => key === "GIT_SSH_VARIANT"),
          GIT_SSH_VARIANT: resolveSshVariant(
            sshConfig.variant,
            chooseSshCommand(env, sshConfig.command).chosen,
          ),
        }
      : env;
  return {
    pinArgs,
    inCheckoutArgs: [...GIT_SAFE_GLOBAL_ARGS, ...SSH_BATCH_CONFIG_ARGS, ...pinArgs],
    env: {
      ...withGitSshCommand(
        withoutAllowProtocolEnv(baseEnv),
        wrapWithCdCommand(homeDirOrDefault(), buildBatchSshCommand(baseEnv, sshConfig.command).command),
      ),
      ...blankEnvKeys(env, (upperKey, key) => Object.hasOwn(LFS_SKIP_ENV, upperKey) && key !== upperKey),
      ...LFS_SKIP_ENV,
      ...blankEnvKeys(
        env,
        (upperKey, key) => Object.hasOwn(FILE_REF_BACKEND_ENV, upperKey) && key !== upperKey,
      ),
      ...FILE_REF_BACKEND_ENV,
    },
  };
}
//@ chunk-hb44av3w.js:12383-12516 placement
function scrubbedGitEnv() {
  let locationVars = new Set(GIT_LOCATION_ENV_VARS);
  let env = process.env;
  return {
    ...env,
    ...blankEnvKeys(env, (upperKey) => locationVars.has(upperKey)),
    ...Object.fromEntries([...locationVars].map((key) => [key, undefined])),
  };
}
//@ chunk-hb44av3w.js:12516-12614 placement
/**
 * 运行 git 时附加 GIT_CEILING_DIRECTORIES 的版本。
 */
function runGitWithCeilingDirs(dirPath, gitSshConfig) {
  let sshCommand = buildSshCommand(undefined, gitSshConfig);
  return {
    ...sshCommand,
    env: {
      ...sshCommand.env,
      GIT_CEILING_DIRECTORIES: checkGitCeilingPath(dirname(dirPath)),
    },
  };
}
//@ chunk-hb44av3w.js:12614-12741 placement
function pickGitNoPromptEnv(env) {
  let picked = {};
  for (let key of [...Object.keys(GIT_NO_PROMPT_ENV), "GIT_CEILING_DIRECTORIES"]) {
    let value = env[key];
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}
//@ chunk-hb44av3w.js:12741-13220 placement
function checkGitCeilingPath(path) {
  let resolved = rejectSeparatorPath(resolve(path));
  if (resolved === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot run git under ${resolve(path)}: its path contains "${delimiter}", which git's discovery ceiling (a "${delimiter}"-separated list) cannot express. Use a location without "${delimiter}" for this directory (the plugins cache \u2014 CLAUDE_CODE_PLUGIN_CACHE_DIR \u2014 or the temporary directory \u2014 TMPDIR \u2014 whichever this path is under).`,
      "git working directory path contains the PATH delimiter; git discovery ceiling inexpressible",
    );
  return resolved;
}
//@ chunk-hb44av3w.js:13220-13341 placement
async function prepareGitWorkDir(dirPath, env) {
  let parentDir = dirname(dirPath);
  await mkdir(parentDir, {
    recursive: true,
  });
  return {
    cwd: parentDir,
    env: {
      ...env,
      GIT_CEILING_DIRECTORIES: checkGitCeilingPath(dirname(parentDir)),
    },
  };
}
export {
  getEnvVarCaseInsensitiveOnWindows,
  buildGitConfigEnv,
  buildBatchSshCommand,
  wrapWithCdCommand,
  homeDirOrDefault,
  resolveSshVariant,
  getGitSafetyConfigPairs,
  CLAUDE_CODE_FOUND_REPOSITORY_GIT,
  GitStartFolderError,
  preferHttpsGitTransport,
  runGitWithCeilingDirs,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  SAFE_UPLOAD_PACK_ARG_2,
  pickGitNoPromptEnv,
  ALTERNATE_REFS_COMMAND,
  LOG_SAFETY_CONFIG,
  MAINTENANCE_OFF_CONFIG,
  DIFF_SAFETY_CONFIG,
  withGitNoPromptEnv,
  unknownSshCommandVariant,
  noPromptEnvDefaults,
  readSshCommandConfig,
  SAFE_UPLOAD_PACK_ARG,
  buildGitInvocation,
  resolveEnvRead,
  rejectSeparatorPath,
  registerEnvReader,
  mapped,
  envReaderHolder,
  hasEnvVar,
  NULL_HOOKS_PATH_PATTERN,
  nullDevicePath,
  formatGitErrorFrames,
};
