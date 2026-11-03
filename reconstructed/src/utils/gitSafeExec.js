/**
 * utils/gitSafeExec.ts
 *
 * 2.1.316 新增：安全运行 git：清除危险环境与 config（hooksPath、fsmonitor、askPass）、禁用交互凭据与 ssh 主机确认、发现上限
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sycgf9xs.js (48)
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
import { GIT_SAFE_GLOBAL_ARGS, FSr, GIT_LOCATION_ENV_VARS } from "./git/gitSafeEnv.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";

//@ chunk-sycgf9xs.js:4108-4321 placement
function formatGitErrorFrames(e, n) {
  return [
    `${e.name}: ${e.message}`,
    ...n.map((r) => {
      let o = `${r.file}${r.line ? `:${r.line}` : ""}${r.column ? `:${r.column}` : ""}`;
      return r.function ? `    at ${r.function} (${o})` : `    at ${o}`;
    }),
  ].join(`
`);
}
//@ chunk-sycgf9xs.js:4378-4612 placement
class GitStartFolderError {
  #e;
  constructor(e) {
    this.#e = e;
  }
  get path() {
    return this.#e;
  }
  static filesystemRoot() {
    return new GitStartFolderError(parse(process.execPath).root || sep);
  }
  static forTests(e) {
    if (!isAbsolute(e)) throw Error("a test start folder must be absolute");
    return new GitStartFolderError(e);
  }
}
//@ chunk-sycgf9xs.js:4612-4758 placement
function buildGitInvocation(gitStartsIn, cwd, r, env) {
  let s = {
    ...env,
  };
  for (let key of Object.keys(env)) if (/^(?:OLD)?PWD$/i.test(key)) delete s[key];
  return {
    cwd: gitStartsIn.path,
    args: ["-C", cwd, ...r],
    env: s,
  };
}
//@ chunk-sycgf9xs.js:4758-4801 placement
var CLAUDE_CODE_FOUND_REPOSITORY_GIT = "CLAUDE_CODE_FOUND_REPOSITORY_GIT";
//@ chunk-sycgf9xs.js:4838-4918 placement
/**
 * 归一化一次环境读取结果（payload 显式给出默认主机时取反）。
 */
function resolveEnvRead(e, n) {
  return e.value === !n && e.source === "payload" && e.defaultHost ? !n : n;
}
//@ chunk-sycgf9xs.js:4918-5076 placement
class envReaderHolder {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  read(e, n) {
    let reader = this.reader;
    if (!reader) return n;
    try {
      return resolveEnvRead(reader(e, n), n);
    } catch {
      return n;
    }
  }
}
//@ chunk-sycgf9xs.js:5197-5276 placement
/**
 * 替代 core.alternateRefsCommand 的安全脚本（用 git-dir 列 ref 名）。
 */
var ALTERNATE_REFS_COMMAND = `f() { git --git-dir="$1" for-each-ref --format='%(objectname)'; }; f`;
//@ chunk-sycgf9xs.js:5310-5355 placement
/**
 * 路径含路径分隔列表符时返回 null（拒绝）。
 */
function rejectSeparatorPath(e) {
  return e.includes(delimiter) ? null : e;
}
//@ chunk-sycgf9xs.js:5355-5433 placement
/**
 * 判断是否应优先用 HTTPS 传输（远程或插件偏好）。
 */
function preferHttpsGitTransport() {
  return env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_PLUGIN_PREFER_HTTPS;
}
//@ chunk-sycgf9xs.js:5433-5673 placement
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
//@ chunk-sycgf9xs.js:5673-5736 placement
/**
 * 返回平台的空设备路径（Windows 用 \\.\NUL）。
 */
function nullDevicePath() {
  return getPlatform() === "windows" ? "\\\\.\\NUL" : "/dev/null";
}
//@ chunk-sycgf9xs.js:5736-6340 placement
/**
 * 空 hooksPath 配置匹配正则、git 钩子名清单与对应的 hook.<name>.enabled=false 覆盖，以及环境读取器单例。
 */
var NULL_HOOKS_PATH_PATTERN = /^core\.hooksPath=(?:\/dev\/null|\\\\\.\\nul)$/i;
var GIT_HOOK_NAMES = [
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
var mapped = GIT_HOOK_NAMES.map((e) => [`hook.${e}.enabled`, "false"]);
var TENGU_COZY_PARASOL = "tengu_cozy_parasol";
var envReaderSingleton = new envReaderHolder();
//@ chunk-sycgf9xs.js:6340-6378 placement
/**
 * 注册环境读取器（返回旧值）。
 */
function registerEnvReader(e) {
  return envReaderSingleton.register(e);
}
//@ chunk-sycgf9xs.js:6378-6414 placement
function isAlternateRefsCommandEnabled() {
  return envReaderSingleton.read(TENGU_COZY_PARASOL, true);
}
//@ chunk-sycgf9xs.js:6414-6640 placement
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
//@ chunk-sycgf9xs.js:7888-7984 placement
/**
 * 补齐禁止交互提示的 git 环境变量默认值（不覆盖已有值）。
 */
function noPromptEnvDefaults(env) {
  let n = {};
  for (let [key, value] of Object.entries(GIT_NO_PROMPT_ENV))
    if (getEnvVarCaseInsensitiveOnWindows(env, key) === undefined) n[key] = value;
  return n;
}
//@ chunk-sycgf9xs.js:7984-8146 placement
function withGitNoPromptEnv(e = process.env) {
  return {
    ...e,
    ...blankEnvKeys(e, (n, r) => Object.hasOwn(GIT_NO_PROMPT_ENV, n) && r !== n),
    ...GIT_NO_PROMPT_ENV,
    ...buildGitConfigEnv(
      getEnvVarCaseInsensitiveOnWindows(e, "GIT_CONFIG_COUNT"),
      [["credential.interactive", "false"]],
      e,
    ),
  };
}
//@ chunk-sycgf9xs.js:8146-8244 placement
function blankEnvKeys(e, n) {
  let r = {};
  for (let key of Object.keys(e)) if (n(key.toUpperCase(), key)) r[key] = undefined;
  return r;
}
//@ chunk-sycgf9xs.js:8244-8391 placement
function getEnvVarCaseInsensitiveOnWindows(e, n) {
  if (e[n] !== undefined || getPlatform() !== "windows") return e[n];
  for (let [key, value] of Object.entries(e))
    if (key.toUpperCase() === n && value !== undefined) return value;
  return;
}
//@ chunk-sycgf9xs.js:8391-8509 placement
function hasEnvVar(e, n) {
  if (Object.hasOwn(e, n)) return true;
  return getPlatform() === "windows" && Object.keys(e).some((key) => key.toUpperCase() === n);
}
//@ chunk-sycgf9xs.js:8509-8780 placement
function buildGitConfigEnv(e, n, r = {}) {
  let o = Number(e);
  let s = Number.isInteger(o) && o > 0 ? o : 0;
  let u = {
    GIT_CONFIG_COUNT: String(s + n.length),
  };
  n.forEach(([d, g], f) => {
    u[`GIT_CONFIG_KEY_${s + f}`] = d;
    u[`GIT_CONFIG_VALUE_${s + f}`] = g;
  });
  let c = new Set(Object.keys(u));
  return {
    ...blankEnvKeys(r, (d, g) => c.has(d) && !c.has(g)),
    ...u,
  };
}
//@ chunk-sycgf9xs.js:8780-8948 placement
var SSH_BATCH_CONFIG_ARGS = ["-c", "core.sshCommand=ssh -o BatchMode=yes -o StrictHostKeyChecking=yes"];
var SSH_BATCH_STRICT_OPTIONS = "-o BatchMode=yes -o StrictHostKeyChecking=yes";
var SSH_BATCH_OPTIONS = "-o BatchMode=yes";
var PLINK_BATCH_OPTION = "-batch";
//@ chunk-sycgf9xs.js:8948-9042 placement
function sshBatchOptionsFor(e, n) {
  switch (e) {
    case "ssh":
      return n ? SSH_BATCH_STRICT_OPTIONS : SSH_BATCH_OPTIONS;
    case "plink":
      return PLINK_BATCH_OPTION;
    case "other":
      return;
  }
}
//@ chunk-sycgf9xs.js:9042-9174 placement
function wrapWithCdCommand(e, command) {
  let r = getPlatform() === "windows" ? e.replace(/\\/g, "/") : e;
  return `CDPATH= cd -- ${shellQuoteArgs([r])} 2>/dev/null || cd / || exit 1; ${command}`;
}
//@ chunk-sycgf9xs.js:9174-9238 placement
/**
 * 取主目录，取不到时返回 "/"。
 */
function homeDirOrDefault() {
  let e = "";
  try {
    e = homedir();
  } catch {}
  return isAbsolute(e) ? e : resolve("/");
}
//@ chunk-sycgf9xs.js:9238-9397 placement
function resolveSshVariant(e, n) {
  if (e !== undefined && e !== "auto") return e;
  let replaced = quoteForShell(n)
    .toLowerCase()
    .replace(/\.exe$/, "");
  return ["ssh", "plink", "tortoiseplink"].includes(replaced) ? replaced : "auto";
}
//@ chunk-sycgf9xs.js:9397-9775 placement
function quoteForShell(e) {
  let n = "";
  let r;
  let o = true;
  for (let idx = 0; idx < e.length; idx++) {
    let c = e[idx];
    let d;
    if (r === undefined && /[ \t\n\r]/.test(c)) o = false;
    else if (r === undefined && (c === "'" || c === '"')) r = c;
    else if (c === r) r = undefined;
    else if (c === "\\" && r !== "'") {
      idx++;
      if (idx >= e.length) return "";
      d = e[idx];
    } else d = c;
    if (o && d !== undefined) n += d;
  }
  if (r !== undefined) return "";
  let s = getPlatform() === "windows" ? /[\\/]/ : /\//;
  return (
    n
      .split(s)
      .filter((u) => u !== "")
      .at(-1) ?? ""
  );
}
//@ chunk-sycgf9xs.js:9775-9888 placement
function withGitSshCommand(e, n) {
  return {
    ...e,
    ...blankEnvKeys(e, (r) => r === "GIT_SSH_COMMAND" || r === "GIT_SSH"),
    GIT_SSH: undefined,
    GIT_SSH_COMMAND: n,
  };
}
//@ chunk-sycgf9xs.js:9888-10094 placement
/**
 * 构造非交互的 git ssh 命令：从 GIT_SSH_COMMAND/GIT_SSH 或给定命令选出 ssh 程序，按变体（ssh/plink）追加 BatchMode（可选 StrictHostKeyChecking）或 -batch；已有 -batch 时不重复，返回命令与更新后的环境。
 */
function buildBatchSshCommand(e, n, { strictHostKeys: r = true } = {}) {
  let { chosen, named } = chooseSshCommand(e, n);
  let u = sshBatchOptionsFor(named === undefined ? "ssh" : detectSshVariant(e, named), r);
  if (u === undefined || (u === PLINK_BATCH_OPTION && hasPlinkBatchFlag(chosen)))
    return {
      command: chosen,
      env: e,
    };
  let c = `${chosen} ${u}`;
  return {
    command: c,
    env: withGitSshCommand(e, c),
  };
}
//@ chunk-sycgf9xs.js:10094-10228 placement
function chooseSshCommand(e, n) {
  let r = safeSshVariant(getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_COMMAND")) ?? safeSshVariant(n);
  let o = safeSshVariant(getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH"));
  return {
    chosen: r ?? shellQuoteArgs([o ?? "ssh"]),
    named: r !== undefined ? firstShellWord(r) : o,
  };
}
//@ chunk-sycgf9xs.js:10228-10404 placement
function unknownSshCommandVariant(env, n) {
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT");
  let { chosen, named } = chooseSshCommand(env, n);
  return (envVarCaseInsensitiveOnWindows === undefined || envVarCaseInsensitiveOnWindows === "auto") &&
    named !== undefined &&
    !["ssh", "plink", "tortoiseplink"].includes(normalizeSshProgramName(named))
    ? chosen
    : undefined;
}
//@ chunk-sycgf9xs.js:10404-10760 placement
async function readSshCommandConfig(e, n) {
  if (getPlatform() !== "windows") return e;
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_COMMAND");
  if (envVarCaseInsensitiveOnWindows !== undefined)
    return envVarCaseInsensitiveOnWindows.trim() === ""
      ? e
      : buildBatchSshCommand(e, undefined, {
          strictHostKeys: false,
        }).env;
  let o = await n(["config", "--null", "--get", "core.sshCommand"]);
  let s = o.exitCode === 0 && o.stdout.includes("\x00") ? firstLineOf(o.stdout, "\x00") : undefined;
  if (s?.trim() === "") return e;
  return buildBatchSshCommand(e, s, {
    strictHostKeys: false,
  }).env;
}
//@ chunk-sycgf9xs.js:10760-10816 placement
function safeSshVariant(envVarCaseInsensitiveOnWindows) {
  return envVarCaseInsensitiveOnWindows !== undefined && envVarCaseInsensitiveOnWindows.trim() !== ""
    ? envVarCaseInsensitiveOnWindows
    : undefined;
}
//@ chunk-sycgf9xs.js:10816-11029 placement
function detectSshVariant(e, named) {
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_VARIANT");
  if (envVarCaseInsensitiveOnWindows !== undefined && envVarCaseInsensitiveOnWindows !== "auto")
    return envVarCaseInsensitiveOnWindows === "plink"
      ? "plink"
      : ["putty", "tortoiseplink", "simple"].includes(envVarCaseInsensitiveOnWindows)
        ? "other"
        : "ssh";
  let o = normalizeSshProgramName(named);
  return o === "ssh" || o === "plink" ? o : "other";
}
//@ chunk-sycgf9xs.js:11029-11118 placement
function normalizeSshProgramName(e) {
  return basename(e.trim().replace(/\\/g, "/"))
    .toLowerCase()
    .replace(/\.exe$/, "");
}
//@ chunk-sycgf9xs.js:11118-11253 placement
function hasPlinkBatchFlag(chosen) {
  let n = chosen.trim().match(/^(?:"[^"]*"|'[^']*'|\S+)/)?.[0] ?? "";
  return /(?:^|\s)-batch(?:\s|$)/.test(chosen.trim().slice(n.length));
}
//@ chunk-sycgf9xs.js:11253-11357 placement
function firstShellWord(e) {
  let match = e.trim().match(/^(?:"([^"]*)"|'([^']*)'|(\S+))/);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}
//@ chunk-sycgf9xs.js:11357-11526 placement
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
//@ chunk-sycgf9xs.js:11526-11618 placement
function withoutAllowProtocolEnv(e) {
  return {
    ...e,
    ...blankEnvKeys(e, (n) => n === "GIT_ALLOW_PROTOCOL"),
    GIT_ALLOW_PROTOCOL: undefined,
  };
}
//@ chunk-sycgf9xs.js:11618-11825 placement
function restrictGitProtocols(e) {
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, "GIT_ALLOW_PROTOCOL");
  if (envVarCaseInsensitiveOnWindows === undefined) return [];
  let r = new Set(envVarCaseInsensitiveOnWindows.split(":"));
  return ["https", "http", "ssh", "file"]
    .filter((o) => !r.has(o))
    .flatMap((o) => ["-c", `protocol.${o}.allow=never`]);
}
//@ chunk-sycgf9xs.js:11825-11863 placement
function FILE_REF_BACKEND_ARGS(e) {
  return [...DISABLED_GIT_PROTOCOL_ARGS, ...restrictGitProtocols(e)];
}
//@ chunk-sycgf9xs.js:11863-11943 placement
var sameAsFileRefBackendArgs = ["-c", "init.defaultRefFormat=files"];
var FILE_REF_BACKEND_ENV = {
  GIT_DEFAULT_REF_FORMAT: "files",
};
//@ chunk-sycgf9xs.js:11943-12347 placement
function buildSshCommand(e = withGitNoPromptEnv(scrubbedGitEnv()), n) {
  let r = [...FILE_REF_BACKEND_ARGS(e), ...sameAsFileRefBackendArgs];
  let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_VARIANT");
  let s =
    envVarCaseInsensitiveOnWindows === undefined || envVarCaseInsensitiveOnWindows === "auto"
      ? {
          ...e,
          ...blankEnvKeys(e, (u) => u === "GIT_SSH_VARIANT"),
          GIT_SSH_VARIANT: resolveSshVariant(n.variant, chooseSshCommand(e, n.command).chosen),
        }
      : e;
  return {
    pinArgs: r,
    inCheckoutArgs: [...GIT_SAFE_GLOBAL_ARGS, ...SSH_BATCH_CONFIG_ARGS, ...r],
    env: {
      ...withGitSshCommand(
        withoutAllowProtocolEnv(s),
        wrapWithCdCommand(homeDirOrDefault(), buildBatchSshCommand(s, n.command).command),
      ),
      ...blankEnvKeys(e, (u, c) => Object.hasOwn(FSr, u) && c !== u),
      ...FSr,
      ...blankEnvKeys(e, (u, c) => Object.hasOwn(FILE_REF_BACKEND_ENV, u) && c !== u),
      ...FILE_REF_BACKEND_ENV,
    },
  };
}
//@ chunk-sycgf9xs.js:12347-12480 placement
function scrubbedGitEnv() {
  let e = new Set(GIT_LOCATION_ENV_VARS);
  let env = process.env;
  return {
    ...env,
    ...blankEnvKeys(env, (r) => e.has(r)),
    ...Object.fromEntries([...e].map((r) => [r, undefined])),
  };
}
//@ chunk-sycgf9xs.js:12480-12578 placement
/**
 * 运行 git 时附加 GIT_CEILING_DIRECTORIES 的版本。
 */
function runGitWithCeilingDirs(e, gitSshConfig) {
  let sshCommand = buildSshCommand(undefined, gitSshConfig);
  return {
    ...sshCommand,
    env: {
      ...sshCommand.env,
      GIT_CEILING_DIRECTORIES: checkGitCeilingPath(dirname(e)),
    },
  };
}
//@ chunk-sycgf9xs.js:12578-12705 placement
function pickGitNoPromptEnv(env) {
  let n = {};
  for (let r of [...Object.keys(GIT_NO_PROMPT_ENV), "GIT_CEILING_DIRECTORIES"]) {
    let o = env[r];
    if (o !== undefined) n[r] = o;
  }
  return n;
}
//@ chunk-sycgf9xs.js:12705-13184 placement
function checkGitCeilingPath(e) {
  let n = rejectSeparatorPath(resolve(e));
  if (n === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot run git under ${resolve(e)}: its path contains "${delimiter}", which git's discovery ceiling (a "${delimiter}"-separated list) cannot express. Use a location without "${delimiter}" for this directory (the plugins cache \u2014 CLAUDE_CODE_PLUGIN_CACHE_DIR \u2014 or the temporary directory \u2014 TMPDIR \u2014 whichever this path is under).`,
      "git working directory path contains the PATH delimiter; git discovery ceiling inexpressible",
    );
  return n;
}
//@ chunk-sycgf9xs.js:13184-13305 placement
async function prepareGitWorkDir(e, n) {
  let r = dirname(e);
  await mkdir(r, {
    recursive: true,
  });
  return {
    cwd: r,
    env: {
      ...n,
      GIT_CEILING_DIRECTORIES: checkGitCeilingPath(dirname(r)),
    },
  };
}
export {
  withGitNoPromptEnv,
  readSshCommandConfig,
  runGitWithCeilingDirs,
  SAFE_UPLOAD_PACK_ARG_2,
  buildGitConfigEnv,
  ALTERNATE_REFS_COMMAND,
  preferHttpsGitTransport,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  pickGitNoPromptEnv,
  getEnvVarCaseInsensitiveOnWindows,
  buildBatchSshCommand,
  wrapWithCdCommand,
  homeDirOrDefault,
  resolveSshVariant,
  getGitSafetyConfigPairs,
  CLAUDE_CODE_FOUND_REPOSITORY_GIT,
  GitStartFolderError,
  registerEnvReader,
  formatGitErrorFrames,
  resolveEnvRead,
  unknownSshCommandVariant,
  noPromptEnvDefaults,
  SAFE_UPLOAD_PACK_ARG,
  LOG_SAFETY_CONFIG,
  MAINTENANCE_OFF_CONFIG,
  DIFF_SAFETY_CONFIG,
  rejectSeparatorPath,
  mapped,
  buildGitInvocation,
  hasEnvVar,
  NULL_HOOKS_PATH_PATTERN,
  nullDevicePath,
};
