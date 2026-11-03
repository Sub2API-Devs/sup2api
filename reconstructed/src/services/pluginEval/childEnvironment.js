/**
 * services/pluginEval/childEnvironment.ts
 *
 * 2.1.316 新增：plugin eval 子会话的环境变量：剔除凭据/代理/宿主变量、只允许 EVAL_* 自定义、凭据存储排除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (19)
 * attribution: placement 19
 */
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  stat,
  stat as stat_2,
  stat as stat_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  symlink,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  readFile,
  readFile as readFile_2,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
} from "fs/promises";
import os_2, { default as os_2_2, default as os_3 } from "os";
import { dre } from "../../utils/git/gitSafeEnv.js";
import { GIT_NO_PROMPT_ENV } from "../../utils/plugins/marketplaceManager.js";
import {
  PROXY_ENV_VARS,
  ebr,
  isHelperEnvVar,
  getHostManagedProviderConflicts,
} from "../../utils/managedEnvConstants.js";
import { Gle, wve, collectManagedRestrictions } from "../../utils/settings/managedSettingsKeys.js";
import { wTe } from "../../utils/knownEnvVars.js";
import {
  BG_WORKER_IDENTITY_ENV_VARS,
  isArtifactDevBaseUrlVar,
  subprocessEnv,
  PROXY_INJECTED_MARKER,
  SSH_PLACEHOLDER,
  federationCacheDir,
} from "../../utils/subprocessEnv.js";
import {
  isSecretEnvName,
  isNonSecretClaudeCodeEnvName,
} from "../../utils/settings/policyHelper/helperEnv.js";
import { isPackageIndexEnv, LRi } from "../../utils/settings/policyHelper/helperExec.js";
import { isConnectionStringName } from "../../utils/sensitiveEnvVars.js";
import {
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { NULL_DEVICE, cleanupStaleEvalAuthDirs, upperCaseEnvKeys } from "./credentialExclusion.js";
import { getFileKind } from "../../utils/fileKind.js";
import { logForDebugging } from "../../utils/debug.js";
import { waitForRemoteManagedSettingsToLoad } from "../remoteManagedSettings/loader.js";
import { getRemoteManagedSettingsSyncFromCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { computeRemoteSettingsEligibility } from "../cloudSessions/eligibility.js";
import { expandMcpPolicyPredicates } from "../mcp/config.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { SETTINGS_FILENAME } from "../remoteManagedSettings/remoteSettingsState.js";
import { getPlatform } from "../../utils/platform.js";
import { Uf, stripBlockedEnvVars } from "./evalFence.js";
import { PLACEHOLDER_CREDENTIAL_KEYS } from "../../upstreamproxy/upstreamproxy.js";
import { getEvalGitConfigPairs } from "./runTrace.js";
import { getWIFPrecedenceSource } from "../../utils/wifProfile.js";
import { missingGitSafetyEnv } from "../../utils/git/gitSafeInvocation.js";
import { BG_CARRIED_ENV_KEYS, stripInternalEntrypoint } from "../../utils/background/envCarry.js";
import { Gr } from "./artifactStub.js";

//@ chunk-qchp9vrd.js:180856-183776 placement
var ISOLATED_GIT_ENV_VARS = [
    "GIT_AUTHOR_NAME",
    "GIT_AUTHOR_EMAIL",
    "GIT_AUTHOR_DATE",
    "GIT_COMMITTER_NAME",
    "GIT_COMMITTER_EMAIL",
    "GIT_COMMITTER_DATE",
    "EMAIL",
    "GIT_TEMPLATE_DIR",
    "GIT_LITERAL_PATHSPECS",
    "GIT_GLOB_PATHSPECS",
    "GIT_NOGLOB_PATHSPECS",
    "GIT_ICASE_PATHSPECS",
  ],
  Bf = new Set([...dre, ...ISOLATED_GIT_ENV_VARS, "GIT_CONFIG_NOSYSTEM"]),
  Kf = new Set(["HOMESHARE", "BASH_ENV", "ENV", "ZDOTDIR"]),
  Fi = new Set([
    "MAX_MCP_OUTPUT_TOKENS",
    "MCP_TOOL_TIMEOUT",
    "MCP_TIMEOUT",
    "CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT",
  ]),
  Vf = new Set([
    "PATH",
    "SHELL",
    "TERM",
    "COLORTERM",
    "LANG",
    "LANGUAGE",
    "TZ",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "TEMP",
    "TMP",
    "NO_COLOR",
    "FORCE_COLOR",
    "CI",
    "SYSTEMROOT",
    "SYSTEMDRIVE",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "USERNAME",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMW6432",
    "PROGRAMDATA",
    "COMMONPROGRAMFILES",
    "COMMONPROGRAMFILES(X86)",
    "COMMONPROGRAMW6432",
    "ALLUSERSPROFILE",
    "PUBLIC",
    "NUMBER_OF_PROCESSORS",
    "PROCESSOR_ARCHITECTURE",
    "OS",
    "PSMODULEPATH",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "ALL_PROXY",
    "NODE_TLS_REJECT_UNAUTHORIZED",
    "SSL_CERT_DIR",
    "GIT_SSL_CAPATH",
    "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL",
    ...Object.keys(GIT_NO_PROMPT_ENV),
    ...PROXY_ENV_VARS.map((e) => e.toUpperCase()),
    ...Gle,
    ...Object.keys(wve),
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_CLOUD_QUOTA_PROJECT",
    "GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES",
    "GCLOUD_PROJECT",
    "CLOUD_ML_REGION",
    ...ebr,
    "IDENTITY_ENDPOINT",
    "IDENTITY_HEADER",
    "IDENTITY_SERVER_THUMBPRINT",
    "IMDS_ENDPOINT",
    "MSI_ENDPOINT",
    "MSI_SECRET",
    "USER_TYPE",
    "IS_SANDBOX",
    "IS_DEMO",
    "NODE_ENV",
    "FORCE_HYPERLINK",
    "API_TIMEOUT_MS",
    "API_FORCE_IDLE_TIMEOUT",
    "BASH_DEFAULT_TIMEOUT_MS",
    "BASH_MAX_TIMEOUT_MS",
    "BASH_MAX_OUTPUT_LENGTH",
    "MAX_THINKING_TOKENS",
    "MAX_MCP_OUTPUT_TOKENS",
    "MAX_STRUCTURED_OUTPUT_RETRIES",
    "MCP_TIMEOUT",
    "MCP_TOOL_TIMEOUT",
    "MCP_CONNECT_TIMEOUT_MS",
    "MCP_CONNECTION_NONBLOCKING",
    "MCP_PROTOCOL_NEGOTIATION",
    "MCP_SDK_GENERATION",
    "MCP_SERVER_CONNECTION_BATCH_SIZE",
    "MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE",
    "MCP_DISCOVERY_CACHE",
    "MCP_DISCOVERY_CACHE_TTL_S",
    "MCP_DISCOVERY_CACHE_MAX_STALE_S",
    "MCP_DISCOVERY_CACHE_STRIKES",
    "MCP_OAUTH_CALLBACK_PORT",
    "MCP_OAUTH_CLIENT_METADATA_URL",
    "ENABLE_MCP_LARGE_OUTPUT_FILES",
    "SLASH_COMMAND_TOOL_CHAR_BUDGET",
    "USE_BUILTIN_RIPGREP",
    "DO_NOT_TRACK",
    "ENABLE_TOOL_SEARCH",
    "FALLBACK_FOR_ALL_PRIMARY_MODELS",
    "FORCE_PROMPT_CACHING_5M",
    "ENABLE_PROMPT_CACHING_1H",
    "ENABLE_PROMPT_CACHING_1H_BEDROCK",
    "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
    "CLAUDE_STREAM_IDLE_TIMEOUT_MS",
    "CLAUDE_ENABLE_STREAM_WATCHDOG",
    "CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS",
    "CLAUDE_ENABLE_BYTE_WATCHDOG",
    "CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK",
    "CLAUDE_EFFORT",
    "CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS",
    "CLAUDE_AUTO_BACKGROUND_TASKS",
    "CLAUDE_DISABLE_ADOPT",
    "CLAUDE_AFK_TIMEOUT_MS",
    "CLAUDE_AFK_COUNTDOWN_MS",
    "CLAUDE_AX_SCREEN_READER",
    "CLAUDE_AX_PREPARK_MS",
    "CLAUDE_AX_STARTUP_QUIET_MS",
    "CLAUDE_AX_ANNOUNCEMENT_HOLD_MS",
    "CLAUDE_AX_REWRITE_HELD_ANNOUNCEMENT",
    "CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS",
    "CLAUDE_AGENT_SDK_MCP_NO_PREFIX",
  ]);
//@ chunk-qchp9vrd.js:183776-184230 placement
var STRIPPED_ENV_PREFIXES = [
    "ANTHROPIC_",
    "CLAUDE_CODE_",
    "DISABLE_",
    "AWS_",
    "AZURE_",
    "CLOUDSDK_",
    "VERTEX_REGION_",
    "LC_",
    "EVAL_",
  ],
  Xf = /_(DIRS?|PATHS?|FILES?|ROOTS?|HOME|LOG|TRACE)$/,
  Jf = new Set(["CLAUDE_CODE_GIT_BASH_PATH"]),
  qf = new Set([
    ...wTe,
    "CLAUDE_CODE_TMPDIR",
    "CLAUDE_CODE_SUBSCRIPTION_TYPE",
    "CLAUDE_CODE_RATE_LIMIT_TIER",
    "CLAUDE_CODE_OTEL_DIAG_STDERR",
    ...BG_WORKER_IDENTITY_ENV_VARS,
  ]),
  Zf = [
    "CLAUDE_CODE_REMOTE",
    "CLAUDE_CODE_HOST_",
    "CLAUDE_CODE_SESSION_",
    "CLAUDE_CODE_SDK_",
    "CLAUDE_CODE_RELAUNCH_",
  ];
//@ chunk-qchp9vrd.js:184230-184364 placement
function isStrippedClaudeCodeVar(e) {
  if (isSecretEnvName(e)) return !isNonSecretClaudeCodeEnvName(e);
  if (Xf.test(e)) return !Jf.has(e);
  return qf.has(e) || Zf.some((n) => e.startsWith(n)) || isArtifactDevBaseUrlVar(e) || isHelperEnvVar(e);
}
//@ chunk-qchp9vrd.js:184364-184432 placement
var ep = new Set(["http_proxy", "https_proxy", "no_proxy", "all_proxy"]);
/**
 * 判断评测子会话是否应剔除某环境变量：显式名单、密钥类 CLAUDE_CODE_*、连接串保留，EVAL_* 与凭据/代理前缀剔除。
 */
//@ chunk-qchp9vrd.js:184432-184670 placement
function shouldStripEnvVar(e) {
  if (ep.has(e)) return !0;
  let upper = e.toUpperCase();
  if (Vf.has(upper)) return !0;
  if (upper.startsWith("CLAUDE_CODE_") && isStrippedClaudeCodeVar(upper)) return !1;
  if (upper.startsWith("EVAL_")) return !0;
  if (isPackageIndexEnv(e)) return !0;
  if (isConnectionStringName(e)) return !1;
  return STRIPPED_ENV_PREFIXES.some((r) => upper.startsWith(r));
}
//@ chunk-qchp9vrd.js:184670-184759 placement
var To = [
  path_15.join(".aws", "sso"),
  path_15.join(".aws", "cli", "cache"),
  path_15.join(".aws", "boto", "cache"),
];
//@ chunk-qchp9vrd.js:184759-184856 placement
async function Mr(e) {
  return path_15.join(
    await realpath_8(path_15.dirname(e)).catch(() => path_15.dirname(e)),
    path_15.basename(e),
  );
}
/**
 * 求路径的真实路径，不存在时尝试按链接目标解析。
 */
//@ chunk-qchp9vrd.js:184856-185059 placement
async function resolveLinkTarget(e) {
  try {
    return await realpath_8(e);
  } catch (error) {
    if (isENOENT(error)) {
      let a = await resolveMissingPath(e);
      if (a !== "unresolvable") return a;
    }
  }
  let n = await readlink_5(e).catch(() => null);
  return n === null ? null : path_15.resolve(path_15.dirname(await Mr(e)), n);
}
/**
 * 解析不存在的路径：向上找到第一个存在的祖先，经 realpath/readlink 拼回剩余部分；指向 /dev/null 返回原路径，无法解析返回 unresolvable。
 */
//@ chunk-qchp9vrd.js:185059-185483 placement
async function resolveMissingPath(e) {
  for (let n = e, dir = path_15.dirname(n); n !== dir; n = dir, dir = path_15.dirname(n)) {
    try {
      await lstat_11(n);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
      return "unresolvable";
    }
    let a = await realpath_8(n).catch(() => null);
    if (a === null) {
      let s = await readlink_5(n).catch(() => null);
      return s === null
        ? "unresolvable"
        : path_15.join(path_15.resolve(path_15.dirname(await Mr(n)), s), path_15.relative(n, e));
    }
    if (a === NULL_DEVICE) return Mr(e);
    return a === path_15.resolve(n) ? "absent" : path_15.join(a, path_15.relative(n, e));
  }
  return "absent";
}
//@ chunk-qchp9vrd.js:185483-185540 placement
async function op(e) {
  return (await resolveMissingPath(e)) !== "unresolvable";
}
/**
 * 评测沙箱凭据排除用的常量：各工具（kube、ssh、gnupg、docker、云 CLI 等）配置目录中允许或排除的条目名集合。
 */
//@ chunk-qchp9vrd.js:185540-186407 placement
var SANDBOX_PROBE_TIMEOUT_MS = 5000,
  KUBE_CACHE_ENTRIES = new Set(["discovery", "http", "http-cache"]),
  EMPTY_ENTRY_SET = new Set(),
  SSH_CONFIG_ENTRIES = new Set([
    "config",
    "known_hosts",
    "known_hosts.old",
    "authorized_keys",
    "allowed_signers",
    "environment",
    "rc",
  ]),
  GNUPG_CONFIG_ENTRIES = new Set([
    "gpg.conf",
    "gpg-agent.conf",
    "dirmngr.conf",
    "scdaemon.conf",
    "common.conf",
    "gpa.conf",
    "sshcontrol",
  ]),
  DOCKER_SAFE_ENTRIES = new Set([
    "cli-plugins",
    "buildx",
    "desktop",
    "mutagen",
    "scan",
    "run",
    "features.json",
    "daemon.json",
    "desktop-build",
  ]),
  TOOL_BIN_ENTRIES = new Set(["bin", "completions"]),
  CREDENTIAL_ENTRIES = new Set([
    "config.json",
    "ca.pem",
    "cert.pem",
    "key.pem",
    "contexts",
    "trust",
    "machine",
    "models",
    "model-runner",
    "mcp",
    "modules",
    "scout",
    "cloud",
    "certs.d",
    "sso",
    "cli",
    "credentials",
    "config",
    "login",
    "configurations",
    "legacy_credentials",
    "credentials.db",
    "access_tokens.db",
    "application_default_credentials.json",
    "cache",
  ]),
  CLOUD_CLI_SAFE_ENTRIES = new Set([
    "logs",
    "cache",
    ".install",
    "virtenv",
    "surface_data",
    "commands",
    "cliextensions",
    "telemetry",
    "bin",
  ]);
//@ chunk-qchp9vrd.js:186407-187803 placement
async function checkCredentialStoreLinks(e, n, r, a) {
  let s = (y) =>
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the ${n} credential store on this machine ${y}, so the Bash sandbox cannot reliably exclude it \u2014 a Bash-granting evaluation cannot run here; keep the store's contents in one plain directory (its root may be a link)`,
        "eval shell grant refused: credential store links elsewhere",
      ),
    h;
  try {
    h = await realpath_8(e);
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") {
      let R = await resolveMissingPath(e);
      if (R === "absent") return null;
      if (R !== "unresolvable") return R;
      throw s("is behind a link whose target is not there");
    }
    throw s(`could not be resolved (${getErrnoCode(error) ?? "unreadable"})`);
  }
  if (h === NULL_DEVICE) return Mr(e);
  let w = [h],
    b = 0;
  for (let y = w.shift(); y !== void 0; y = w.shift()) {
    let R;
    try {
      R = await readdir_10(y, { withFileTypes: !0 });
    } catch (error) {
      let T = getErrnoCode(error);
      if (T === "ENOTDIR" && y === h) break;
      if (T === "ENOENT") continue;
      throw s(`could not be read (${T ?? "unreadable"})`);
    }
    for (let S of R) {
      if (++b > SANDBOX_PROBE_TIMEOUT_MS) throw s("is too large to check for symbolic links");
      if (r.has(S.name) || (y === h && a.has(S.name))) continue;
      let joined = path_15.join(y, S.name),
        N = await getFileKind(S, joined, "unknown");
      if (N === "symlink") {
        let x = path_15.relative(h, joined).split(path_15.sep)[0] ?? "";
        throw s(
          `holds a symbolic link inside it (at or under ${CREDENTIAL_ENTRIES.has(x) ? `its "${x}" entry` : "an entry this check has no name for"})`,
        );
      }
      if (N === "unknown") {
        let x = await lstat_11(joined).then(
          () => {
            return;
          },
          (j) => getErrnoCode(j),
        );
        if (x === "ENOENT" || x === "ENOTDIR") continue;
        throw s("holds an entry that could not be examined");
      }
      if (N === "dir") w.push(joined);
    }
  }
  return h === path_15.resolve(e) ? null : h;
}
//@ chunk-qchp9vrd.js:187803-188365 placement
async function checkAwsCredentialPointers(e, n) {
  if (
    !Object.entries(n).some(
      ([a, s]) =>
        (a.toUpperCase() === "AWS_CONFIG_FILE" || a.toUpperCase() === "AWS_SHARED_CREDENTIALS_FILE") &&
        (s ?? "").trim() !== "" &&
        (s ?? "").trim() !== NULL_DEVICE,
    )
  )
    return;
  for (let a of To) {
    let joined = path_15.join(os_3.homedir(), a);
    if (
      !(await stat_3(joined).then(
        (w) => w.isDirectory(),
        () => !1,
      ))
    )
      continue;
    let joined_2 = path_15.join(e.home, a);
    await mkdir_4(path_15.dirname(joined_2), { recursive: !0 });
    try {
      await symlink(joined, joined_2, "junction");
    } catch (error) {
      logForDebugging(
        `[eval] could not link ${a} into the sandbox home (${getErrnoCode(error) ?? "unknown"}); an SSO-cached login will not reach the child`,
        { level: getErrnoCode(error) === "EEXIST" ? "debug" : "warn" },
      );
    }
  }
}
//@ chunk-qchp9vrd.js:188365-188408 placement
var dl = 3,
  CLAUDE_EVAL_AUTH = "claude-eval-auth-",
  gp = 7200000;
/**
 * 把缓存的组织策略交给子会话（无缓存时警告）。
 */
//@ chunk-qchp9vrd.js:188408-189126 placement
async function writeChildManagedPolicy(e) {
  await waitForRemoteManagedSettingsToLoad();
  let n = getRemoteManagedSettingsSyncFromCache();
  if (!n && computeRemoteSettingsEligibility())
    logForDebugging(
      "[eval] no cached organization policy to hand the child (the managed-settings fetch has not produced one); a child that cannot fetch runs without the remote-managed tier",
      { level: "warn" },
    );
  let r = (n && collectManagedRestrictions(n)) ?? {},
    a = { ...expandMcpPolicyPredicates(r), managedSourcesBehavior: "merge" },
    joined = path_15.join(e.configDir, Gi),
    h = jsonStringify(a);
  try {
    await writeFile_2(joined, h, { mode: 384, flag: "wx" });
  } catch (error) {
    let b = await lstat_11(joined).catch(() => null);
    if (
      getErrnoCode(error) !== "EEXIST" ||
      !b?.isFile() ||
      b.size !== Buffer.byteLength(h) ||
      (await readFile_2(joined, "utf8").catch(() => null)) !== h
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the organization policy snapshot could not be placed in the evaluation sandbox (a different file is already there or it could not be written)",
        "eval policy snapshot refused",
      );
  }
}
//@ chunk-qchp9vrd.js:189126-189137 placement
var Gi = SETTINGS_FILENAME;
/**
 * 把本会话 API key 传给评测运行（部分平台/网关下不可行时说明）。
 */
//@ chunk-qchp9vrd.js:189137-190346 placement
async function passApiKeyToChild(e) {
  if (e.kind === "apiKey") {
    if (getPlatform() === "windows")
      throw Error(
        "claude plugin eval can't pass this session's API key to its test runs on Windows; set ANTHROPIC_API_KEY and run it again",
      );
    return { env: { CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR: String(dl) }, viaFd: !0, cleanup: async () => {} };
  }
  let n =
    e.kind === "gateway"
      ? { CLAUDE_CODE_USE_GATEWAY: "1", ANTHROPIC_BASE_URL: e.url }
      : {
          CLAUDE_CODE_OAUTH_SCOPES: e.scopes.join(" "),
          ...(e.subscriptionType && { CLAUDE_CODE_SUBSCRIPTION_TYPE: e.subscriptionType }),
          ...(e.rateLimitTier && { CLAUDE_CODE_RATE_LIMIT_TIER: e.rateLimitTier }),
        };
  if (getPlatform() !== "windows")
    return {
      env: {
        [e.kind === "gateway"
          ? "CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR"
          : "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"]: String(dl),
        ...n,
      },
      viaFd: !0,
      cleanup: async () => {},
    };
  await cleanupStaleEvalAuthDirs();
  let r = await mkdtemp_3(path_15.join(os_3.tmpdir(), CLAUDE_EVAL_AUTH)),
    joined = path_15.join(r, "snapshot.json");
  try {
    await writeFile_2(
      joined,
      jsonStringify(
        e.kind === "gateway"
          ? { gatewayToken: e.jwt }
          : {
              accessToken: e.accessToken,
              scopes: e.scopes,
              subscriptionType: e.subscriptionType,
              rateLimitTier: e.rateLimitTier,
            },
      ),
      { mode: 384, flag: "wx" },
    );
  } catch (error) {
    throw (await rm_4(r, { recursive: !0, force: !0 }).catch(() => {}), error);
  }
  return {
    env: { CLAUDE_BG_AUTH_SNAPSHOT_PATH: joined, ...(e.kind === "gateway" && n) },
    viaFd: !1,
    cleanup: () => rm_4(r, { recursive: !0, force: !0 }).catch(() => {}),
  };
}
//@ chunk-qchp9vrd.js:190346-190571 placement
var CHILD_AUTH_ENV_VARS = new Set(["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"]),
  _p = new Set([
    "CLAUDE_INTERNAL_FC_OVERRIDES",
    "CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR",
    "CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH",
    "CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES",
  ]);
/**
 * 组装子会话环境：case.yaml 只能设 EVAL_* 键，移除宿主认证/代理/凭据指针。
 */
//@ chunk-qchp9vrd.js:190571-193455 placement
function buildChildEnv(e, n, r, a, s = !1) {
  for (let G of Object.keys(e.execution.env))
    if (!Uf.test(G))
      throw Error(
        `case "${e.name}" execution.env key "${G}" is not allowed \u2014 only EVAL_* keys can be set from case.yaml. Anything else must come from the operator's shell.`,
      );
  let h = {
    CLAUDE_CONFIG_DIR: n.configDir,
    HOME: n.home,
    USERPROFILE: n.home,
    XDG_CONFIG_HOME: path_15.join(n.home, ".config"),
    XDG_DATA_HOME: path_15.join(n.home, ".local", "share"),
    XDG_CACHE_HOME: path_15.join(n.home, ".cache"),
    XDG_STATE_HOME: path_15.join(n.home, ".local", "state"),
    TMPDIR: n.tmpDir,
    TMP: n.tmpDir,
    TEMP: n.tmpDir,
    CLAUDE_CODE_TMPDIR: n.tmpDir,
    CLAUDE_CODE_MANAGED_SETTINGS_PATH: n.configDir,
    CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    ENABLE_CLAUDEAI_MCP_SERVERS: "false",
    DISABLE_AUTOUPDATER: "1",
  };
  if (getPlatform() === "windows") {
    let G = /^[A-Za-z]:/.test(n.home) ? n.home.slice(0, 2) : "";
    ((h.HOMEDRIVE = G),
      (h.HOMEPATH = n.home.slice(G.length)),
      (h.APPDATA = path_15.join(n.home, "AppData", "Roaming")),
      (h.LOCALAPPDATA = path_15.join(n.home, "AppData", "Local")));
  }
  let w = new Set(Object.keys(h).map((G) => G.toUpperCase())),
    b = { ...subprocessEnv() };
  Object.assign(b, LRi(b));
  for (let [G, J] of Object.entries(process.env)) if (/^EVAL_/i.test(G) && J !== void 0) b[G] = J;
  let y = new Set(getHostManagedProviderConflicts(upperCaseEnvKeys(process.env)).map((G) => G.toUpperCase())),
    R = y.size > 0;
  for (let G of Object.keys(b)) {
    let upper = G.toUpperCase();
    if (PLACEHOLDER_CREDENTIAL_KEYS.includes(G) && b[G] === PROXY_INJECTED_MARKER) continue;
    if (
      !shouldStripEnvVar(G) ||
      y.has(upper) ||
      (R && (upper === "ANTHROPIC_CONFIG_DIR" || upper === "ANTHROPIC_PROFILE")) ||
      _p.has(upper) ||
      w.has(upper) ||
      Kf.has(upper) ||
      (s && Fi.has(upper))
    )
      delete b[G];
  }
  for (let G of ["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY"])
    if (b.ANTHROPIC_UNIX_SOCKET && process.env[G] === SSH_PLACEHOLDER) b[G] = SSH_PLACEHOLDER;
  let S = { ...b, ...e.execution.env, ...h };
  (stripBlockedEnvVars(S), (S.GIT_CONFIG_NOSYSTEM = "1"), (S.GIT_PROXY_COMMAND = ""));
  let T = getEvalGitConfigPairs();
  ((S.GIT_CONFIG_COUNT = String(T.length)),
    T.forEach(([G, J], Z) => {
      ((S[`GIT_CONFIG_KEY_${Z}`] = G), (S[`GIT_CONFIG_VALUE_${Z}`] = J));
    }));
  let homedir = os_3.homedir(),
    x = new Set(Object.keys(S).map((G) => G.toUpperCase())),
    j = {
      ...(!R && {
        AWS_SHARED_CREDENTIALS_FILE: path_15.join(homedir, ".aws", "credentials"),
        AWS_CONFIG_FILE: path_15.join(homedir, ".aws", "config"),
        CLOUDSDK_CONFIG:
          getPlatform() === "windows"
            ? path_15.join(process.env.APPDATA ?? path_15.join(homedir, "AppData", "Roaming"), "gcloud")
            : path_15.join(homedir, ".config", "gcloud"),
        AZURE_CONFIG_DIR: path_15.join(homedir, ".azure"),
      }),
    };
  for (let [G, J] of Object.entries(j)) if (!x.has(G)) S[G] = J;
  if (getWIFPrecedenceSource() === "env-quad") {
    let G = federationCacheDir();
    if (G !== null) S.CLAUDE_CODE_FEDERATION_CACHE_DIR = G;
  }
  for (let G of Object.keys(S)) {
    let J = GIT_NO_PROMPT_ENV[G.toUpperCase()];
    if (J !== void 0 && S[G] !== J) delete S[G];
  }
  let { GIT_NO_LAZY_FETCH: GIT_NO_LAZY_FETCH, ...X } = missingGitSafetyEnv(S);
  Object.assign(S, X);
  let W = new Set(
    BG_CARRIED_ENV_KEYS.filter(
      (G) => G !== "ANTHROPIC_MODEL" && G !== "CLAUDE_AX_SCREEN_READER" && !(G in GIT_NO_PROMPT_ENV),
    ).map((G) => G.toUpperCase()),
  );
  (W.delete("CLAUDE_CODE_RESTRICTED"), W.delete("CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG"));
  for (let G of Object.keys(S)) if (W.has(G.toUpperCase())) delete S[G];
  if ((stripInternalEntrypoint(S), (S.CLAUDE_CODE_EVAL_CONFINED = "1"), r)) {
    if (
      ((S.CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR = Gr(n)),
      (S.MCP_CONNECTION_NONBLOCKING = "0"),
      a && Object.keys(a).length > 0)
    )
      S.CLAUDE_INTERNAL_FC_OVERRIDES = jsonStringify(a);
  }
  return S;
}

export {
  buildChildEnv,
  writeChildManagedPolicy,
  passApiKeyToChild,
  CHILD_AUTH_ENV_VARS,
  checkAwsCredentialPointers,
  To,
  EMPTY_ENTRY_SET,
  CLOUD_CLI_SAFE_ENTRIES,
  SSH_CONFIG_ENTRIES,
  GNUPG_CONFIG_ENTRIES,
  DOCKER_SAFE_ENTRIES,
  TOOL_BIN_ENTRIES,
  KUBE_CACHE_ENTRIES,
  checkCredentialStoreLinks,
  resolveLinkTarget,
  Mr,
  Bf,
  op,
  gp,
  CLAUDE_EVAL_AUTH,
  Fi,
  Gi,
};
