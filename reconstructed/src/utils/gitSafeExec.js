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
import {
  parse,
  sep,
  sep as sep_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  delimiter,
  delimiter as delimiter_2,
  resolve,
  basename,
  basename as basename_2,
  dirname,
} from "path";
import { homedir, homedir as homedir_2 } from "os";
import { mkdir } from "fs/promises";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { GIT_NO_PROMPT_ENV } from "./plugins/marketplaceManager.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { firstLineOf } from "./stringUtils.js";
import { freeze, freeze_3, Lut } from "./git/gitSafeEnv.js";
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
    return new GitStartFolderError(parse(process.execPath).root || sep_2);
  }
  static forTests(e) {
    if (!isAbsolute(e)) throw Error("a test start folder must be absolute");
    return new GitStartFolderError(e);
  }
}
//@ chunk-sycgf9xs.js:4612-4758 placement
function buildGitInvocation(e, n, r, o) {
  let s = { ...o };
  for (let u of Object.keys(o)) if (/^(?:OLD)?PWD$/i.test(u)) delete s[u];
  return { cwd: e.path, args: ["-C", n, ...r], env: s };
}
//@ chunk-sycgf9xs.js:4758-4801 placement
var CLAUDE_CODE_FOUND_REPOSITORY_GIT = "CLAUDE_CODE_FOUND_REPOSITORY_GIT";
//@ chunk-sycgf9xs.js:4838-4918 placement
function Oys(e, n) {
  return e.value === !n && e.source === "payload" && e.defaultHost ? !n : n;
}
//@ chunk-sycgf9xs.js:4918-5076 placement
class j {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
  read(e, n) {
    let reader = this.reader;
    if (!reader) return n;
    try {
      return Oys(reader(e, n), n);
    } catch {
      return n;
    }
  }
}
//@ chunk-sycgf9xs.js:5197-5276 placement
var HMt = `f() { git --git-dir="$1" for-each-ref --format='%(objectname)'; }; f`;
//@ chunk-sycgf9xs.js:5310-5355 placement
function Xlo(e) {
  return e.includes(delimiter_2) ? null : e;
}
//@ chunk-sycgf9xs.js:5355-5433 placement
function NMt() {
  return env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_PLUGIN_PREFER_HTTPS;
}
/**
 * 运行 git 时附加的安全 -c 参数（upload-pack、alternateRefsCommand、签名显示等）。
 */
//@ chunk-sycgf9xs.js:5433-5673 placement
var SAFE_UPLOAD_PACK_ARG = "--upload-pack=git-upload-pack",
  GOi = ["-c", `core.alternateRefsCommand=${HMt}`],
  Mys = [
    ["log.showSignature", "false"],
    ["format.pretty", "medium"],
  ],
  Dys = [
    ["gc.auto", "0"],
    ["maintenance.auto", "false"],
  ],
  Lys = [["diff.autoRefreshIndex", "false"]];
//@ chunk-sycgf9xs.js:5673-5736 placement
function rDn() {
  return getPlatform() === "windows" ? "\\\\.\\NUL" : "/dev/null";
}
//@ chunk-sycgf9xs.js:5736-6340 placement
var NULL_HOOKS_PATH_PATTERN = /^core\.hooksPath=(?:\/dev\/null|\\\\\.\\nul)$/i,
  xt = [
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
  ],
  mapped = xt.map((e) => [`hook.${e}.enabled`, "false"]),
  TENGU_COZY_PARASOL = "tengu_cozy_parasol",
  Ie = new j();
//@ chunk-sycgf9xs.js:6340-6378 placement
function zOi(e) {
  return Ie.register(e);
}
//@ chunk-sycgf9xs.js:6378-6414 placement
function Nt() {
  return Ie.read(TENGU_COZY_PARASOL, !0);
}
/**
 * （切分错误，git 安全）运行 git 时强制的 -c 配置：清空 core.fsmonitor、core.hooksPath 指向安全目录、清空 core.askPass、禁 ext 协议、submodule.recurse=false 等。
 */
//@ chunk-sycgf9xs.js:6414-6640 placement
function getGitSafetyConfigPairs() {
  return [
    ["core.fsmonitor", ""],
    ["core.hooksPath", rDn()],
    ["core.askPass", ""],
    ["protocol.ext.allow", "never"],
    ...(Nt() ? [["core.alternateRefsCommand", HMt]] : []),
    ["submodule.recurse", "false"],
    ...Mys,
    ...Dys,
    ...Lys,
    ...mapped,
  ];
}
//@ chunk-sycgf9xs.js:7888-7984 placement
function KOi(e) {
  let n = {};
  for (let [r, o] of Object.entries(GIT_NO_PROMPT_ENV))
    if (getEnvVarCaseInsensitiveOnWindows(e, r) === void 0) n[r] = o;
  return n;
}
//@ chunk-sycgf9xs.js:7984-8146 placement
function withGitNoPromptEnv(e = process.env) {
  return {
    ...e,
    ...S(e, (n, r) => Object.hasOwn(GIT_NO_PROMPT_ENV, n) && r !== n),
    ...GIT_NO_PROMPT_ENV,
    ...buildGitConfigEnv(
      getEnvVarCaseInsensitiveOnWindows(e, "GIT_CONFIG_COUNT"),
      [["credential.interactive", "false"]],
      e,
    ),
  };
}
//@ chunk-sycgf9xs.js:8146-8244 placement
function S(e, n) {
  let r = {};
  for (let o of Object.keys(e)) if (n(o.toUpperCase(), o)) r[o] = void 0;
  return r;
}
//@ chunk-sycgf9xs.js:8244-8391 placement
function getEnvVarCaseInsensitiveOnWindows(e, n) {
  if (e[n] !== void 0 || getPlatform() !== "windows") return e[n];
  for (let [r, o] of Object.entries(e)) if (r.toUpperCase() === n && o !== void 0) return o;
  return;
}
//@ chunk-sycgf9xs.js:8391-8509 placement
function hasEnvVar(e, n) {
  if (Object.hasOwn(e, n)) return !0;
  return getPlatform() === "windows" && Object.keys(e).some((r) => r.toUpperCase() === n);
}
//@ chunk-sycgf9xs.js:8509-8780 placement
function buildGitConfigEnv(e, n, r = {}) {
  let o = Number(e),
    s = Number.isInteger(o) && o > 0 ? o : 0,
    u = { GIT_CONFIG_COUNT: String(s + n.length) };
  n.forEach(([d, g], f) => {
    ((u[`GIT_CONFIG_KEY_${s + f}`] = d), (u[`GIT_CONFIG_VALUE_${s + f}`] = g));
  });
  let c = new Set(Object.keys(u));
  return { ...S(r, (d, g) => c.has(d) && !c.has(g)), ...u };
}
//@ chunk-sycgf9xs.js:8780-8948 placement
var SSH_BATCH_CONFIG_ARGS = ["-c", "core.sshCommand=ssh -o BatchMode=yes -o StrictHostKeyChecking=yes"],
  SSH_BATCH_STRICT_OPTIONS = "-o BatchMode=yes -o StrictHostKeyChecking=yes",
  SSH_BATCH_OPTIONS = "-o BatchMode=yes",
  PLINK_BATCH_OPTION = "-batch";
//@ chunk-sycgf9xs.js:8948-9042 placement
function vt(e, n) {
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
function wrapWithCdCommand(e, n) {
  let r = getPlatform() === "windows" ? e.replace(/\\/g, "/") : e;
  return `CDPATH= cd -- ${shellQuoteArgs([r])} 2>/dev/null || cd / || exit 1; ${n}`;
}
//@ chunk-sycgf9xs.js:9174-9238 placement
function xut() {
  let e = "";
  try {
    e = homedir_2();
  } catch {}
  return isAbsolute_2(e) ? e : resolve("/");
}
//@ chunk-sycgf9xs.js:9238-9397 placement
function resolveSshVariant(e, n) {
  if (e !== void 0 && e !== "auto") return e;
  let replaced = quoteForShell(n)
    .toLowerCase()
    .replace(/\.exe$/, "");
  return ["ssh", "plink", "tortoiseplink"].includes(replaced) ? replaced : "auto";
}
//@ chunk-sycgf9xs.js:9397-9775 placement
function quoteForShell(e) {
  let n = "",
    r,
    o = !0;
  for (let u = 0; u < e.length; u++) {
    let c = e[u],
      d;
    if (r === void 0 && /[ \t\n\r]/.test(c)) o = !1;
    else if (r === void 0 && (c === "'" || c === '"')) r = c;
    else if (c === r) r = void 0;
    else if (c === "\\" && r !== "'") {
      if ((u++, u >= e.length)) return "";
      d = e[u];
    } else d = c;
    if (o && d !== void 0) n += d;
  }
  if (r !== void 0) return "";
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
    ...S(e, (r) => r === "GIT_SSH_COMMAND" || r === "GIT_SSH"),
    GIT_SSH: void 0,
    GIT_SSH_COMMAND: n,
  };
}
/**
 * 构造非交互的 git ssh 命令：从 GIT_SSH_COMMAND/GIT_SSH 或给定命令选出 ssh 程序，按变体（ssh/plink）追加 BatchMode（可选 StrictHostKeyChecking）或 -batch；已有 -batch 时不重复，返回命令与更新后的环境。
 */
//@ chunk-sycgf9xs.js:9888-10094 placement
function buildBatchSshCommand(e, n, { strictHostKeys: r = !0 } = {}) {
  let { chosen: chosen, named: named } = chooseSshCommand(e, n),
    u = vt(named === void 0 ? "ssh" : detectSshVariant(e, named), r);
  if (u === void 0 || (u === PLINK_BATCH_OPTION && hasPlinkBatchFlag(chosen)))
    return { command: chosen, env: e };
  let c = `${chosen} ${u}`;
  return { command: c, env: withGitSshCommand(e, c) };
}
//@ chunk-sycgf9xs.js:10094-10228 placement
function chooseSshCommand(e, n) {
  let r = K(getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_COMMAND")) ?? K(n),
    o = K(getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH"));
  return { chosen: r ?? shellQuoteArgs([o ?? "ssh"]), named: r !== void 0 ? firstShellWord(r) : o };
}
//@ chunk-sycgf9xs.js:10228-10404 placement
function unknownSshCommandVariant(e, n) {
  let r = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_VARIANT"),
    { chosen: chosen, named: named } = chooseSshCommand(e, n);
  return (r === void 0 || r === "auto") &&
    named !== void 0 &&
    !["ssh", "plink", "tortoiseplink"].includes(Fe(named))
    ? chosen
    : void 0;
}
//@ chunk-sycgf9xs.js:10404-10760 placement
async function readSshCommandConfig(e, n) {
  if (getPlatform() !== "windows") return e;
  let r = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_COMMAND");
  if (r !== void 0) return r.trim() === "" ? e : buildBatchSshCommand(e, void 0, { strictHostKeys: !1 }).env;
  let o = await n(["config", "--null", "--get", "core.sshCommand"]),
    s = o.exitCode === 0 && o.stdout.includes("\x00") ? firstLineOf(o.stdout, "\x00") : void 0;
  if (s?.trim() === "") return e;
  return buildBatchSshCommand(e, s, { strictHostKeys: !1 }).env;
}
//@ chunk-sycgf9xs.js:10760-10816 placement
function K(e) {
  return e !== void 0 && e.trim() !== "" ? e : void 0;
}
//@ chunk-sycgf9xs.js:10816-11029 placement
function detectSshVariant(e, n) {
  let r = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_VARIANT");
  if (r !== void 0 && r !== "auto")
    return r === "plink" ? "plink" : ["putty", "tortoiseplink", "simple"].includes(r) ? "other" : "ssh";
  let o = Fe(n);
  return o === "ssh" || o === "plink" ? o : "other";
}
//@ chunk-sycgf9xs.js:11029-11118 placement
function Fe(e) {
  return basename_2(e.trim().replace(/\\/g, "/"))
    .toLowerCase()
    .replace(/\.exe$/, "");
}
//@ chunk-sycgf9xs.js:11118-11253 placement
function hasPlinkBatchFlag(e) {
  let n = e.trim().match(/^(?:"[^"]*"|'[^']*'|\S+)/)?.[0] ?? "";
  return /(?:^|\s)-batch(?:\s|$)/.test(e.trim().slice(n.length));
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
function Dt(e) {
  return { ...e, ...S(e, (n) => n === "GIT_ALLOW_PROTOCOL"), GIT_ALLOW_PROTOCOL: void 0 };
}
//@ chunk-sycgf9xs.js:11618-11825 placement
function restrictGitProtocols(e) {
  let n = getEnvVarCaseInsensitiveOnWindows(e, "GIT_ALLOW_PROTOCOL");
  if (n === void 0) return [];
  let r = new Set(n.split(":"));
  return ["https", "http", "ssh", "file"]
    .filter((o) => !r.has(o))
    .flatMap((o) => ["-c", `protocol.${o}.allow=never`]);
}
//@ chunk-sycgf9xs.js:11825-11863 placement
function Bt(e) {
  return [...DISABLED_GIT_PROTOCOL_ARGS, ...restrictGitProtocols(e)];
}
//@ chunk-sycgf9xs.js:11863-11943 placement
var Ut = ["-c", "init.defaultRefFormat=files"],
  Re = { GIT_DEFAULT_REF_FORMAT: "files" };
//@ chunk-sycgf9xs.js:11943-12347 placement
function buildSshCommand(e = withGitNoPromptEnv(scrubbedGitEnv()), n) {
  let r = [...Bt(e), ...Ut],
    o = getEnvVarCaseInsensitiveOnWindows(e, "GIT_SSH_VARIANT"),
    s =
      o === void 0 || o === "auto"
        ? {
            ...e,
            ...S(e, (u) => u === "GIT_SSH_VARIANT"),
            GIT_SSH_VARIANT: resolveSshVariant(n.variant, chooseSshCommand(e, n.command).chosen),
          }
        : e;
  return {
    pinArgs: r,
    inCheckoutArgs: [...freeze, ...SSH_BATCH_CONFIG_ARGS, ...r],
    env: {
      ...withGitSshCommand(Dt(s), wrapWithCdCommand(xut(), buildBatchSshCommand(s, n.command).command)),
      ...S(e, (u, c) => Object.hasOwn(freeze_3, u) && c !== u),
      ...freeze_3,
      ...S(e, (u, c) => Object.hasOwn(Re, u) && c !== u),
      ...Re,
    },
  };
}
//@ chunk-sycgf9xs.js:12347-12480 placement
function scrubbedGitEnv() {
  let e = new Set(Lut),
    env = process.env;
  return { ...env, ...S(env, (r) => e.has(r)), ...Object.fromEntries([...e].map((r) => [r, void 0])) };
}
//@ chunk-sycgf9xs.js:12480-12578 placement
function SMe(e, n) {
  let r = buildSshCommand(void 0, n);
  return { ...r, env: { ...r.env, GIT_CEILING_DIRECTORIES: checkGitCeilingPath(dirname(e)) } };
}
//@ chunk-sycgf9xs.js:12578-12705 placement
function pickGitNoPromptEnv(e) {
  let n = {};
  for (let r of [...Object.keys(GIT_NO_PROMPT_ENV), "GIT_CEILING_DIRECTORIES"]) {
    let o = e[r];
    if (o !== void 0) n[r] = o;
  }
  return n;
}
//@ chunk-sycgf9xs.js:12705-13184 placement
function checkGitCeilingPath(e) {
  let n = Xlo(resolve(e));
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
  return (
    await mkdir(r, { recursive: !0 }),
    { cwd: r, env: { ...n, GIT_CEILING_DIRECTORIES: checkGitCeilingPath(dirname(r)) } }
  );
}

export {
  withGitNoPromptEnv,
  readSshCommandConfig,
  SMe,
  SAFE_UPLOAD_PACK_ARG,
  HMt,
  NMt,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  pickGitNoPromptEnv,
  getEnvVarCaseInsensitiveOnWindows,
  buildGitConfigEnv,
  buildBatchSshCommand,
  wrapWithCdCommand,
  xut,
  resolveSshVariant,
  getGitSafetyConfigPairs,
  CLAUDE_CODE_FOUND_REPOSITORY_GIT,
  GitStartFolderError,
  zOi,
  formatGitErrorFrames,
  Oys,
  unknownSshCommandVariant,
  KOi,
  GOi,
  Mys,
  Dys,
  Lys,
  Xlo,
  mapped,
  buildGitInvocation,
  hasEnvVar,
  NULL_HOOKS_PATH_PATTERN,
  rDn,
};
