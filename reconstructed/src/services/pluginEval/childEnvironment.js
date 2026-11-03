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
import path from "path";
import {
  realpath,
  readlink,
  lstat,
  readdir,
  stat,
  mkdir,
  symlink,
  writeFile,
  readFile,
  mkdtemp,
  rm as rm_2,
} from "fs/promises";
import os_2 from "os";
import { GIT_ENV_VARS_TO_CLEAR } from "../../utils/git/gitSafeEnv.js";
import { GIT_NO_PROMPT_ENV } from "../../utils/plugins/marketplaceManager.js";
import {
  PROXY_ENV_VARS as PROXY_ENV_VARS_2,
  GCE_METADATA_ENV_VARS,
  isHelperEnvVar,
  getHostManagedProviderConflicts,
} from "../../utils/managedEnvConstants.js";
import {
  caCertEnvVars,
  caCertEnvVarList,
  collectManagedRestrictions,
} from "../../utils/settings/managedSettingsKeys.js";
import { KNOWN_HOST_ENV_VARS } from "../../utils/knownEnvVars.js";
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
import { isPackageIndexEnv, sanitizedIndexEnvs } from "../../utils/settings/policyHelper/helperExec.js";
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
import { EVAL_ENV_KEY_RE, stripBlockedEnvVars } from "./evalFence.js";
import { PLACEHOLDER_CREDENTIAL_KEYS } from "../../upstreamproxy/upstreamproxy.js";
import { getEvalGitConfigPairs } from "./runTrace.js";
import { getWIFPrecedenceSource } from "../../utils/wifProfile.js";
import { missingGitSafetyEnv } from "../../utils/git/gitSafeInvocation.js";
import { BG_CARRIED_ENV_KEYS_2, stripInternalEntrypoint } from "../../utils/background/envCarry.js";
import { stubPublishDir } from "./artifactStub.js";

//@ chunk-qchp9vrd.js:180856-183776 placement
/**
 * 子会话保留的基础环境变量白名单。
 */
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
];
var STRIPPED_GIT_ENV_SET = new Set([
  ...GIT_ENV_VARS_TO_CLEAR,
  ...ISOLATED_GIT_ENV_VARS,
  "GIT_CONFIG_NOSYSTEM",
]);
var SHELL_STARTUP_ENV_VARS = new Set(["HOMESHARE", "BASH_ENV", "ENV", "ZDOTDIR"]);
var MCP_TIMING_ENV_VARS = new Set([
  "MAX_MCP_OUTPUT_TOKENS",
  "MCP_TOOL_TIMEOUT",
  "MCP_TIMEOUT",
  "CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT",
]);
var PRESERVED_BASE_ENV_VARS = new Set([
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
  ...PROXY_ENV_VARS_2.map((e) => e.toUpperCase()),
  ...caCertEnvVars,
  ...Object.keys(caCertEnvVarList),
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_QUOTA_PROJECT",
  "GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES",
  "GCLOUD_PROJECT",
  "CLOUD_ML_REGION",
  ...GCE_METADATA_ENV_VARS,
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
/**
 * 额外剔除的环境变量前缀。
 */
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
];
var PATH_LIKE_ENV_RE = /_(DIRS?|PATHS?|FILES?|ROOTS?|HOME|LOG|TRACE)$/;
var PATH_ENV_EXCEPTIONS = new Set(["CLAUDE_CODE_GIT_BASH_PATH"]);
var EXPLICIT_STRIP_ENV = new Set([
  ...KNOWN_HOST_ENV_VARS,
  "CLAUDE_CODE_TMPDIR",
  "CLAUDE_CODE_SUBSCRIPTION_TYPE",
  "CLAUDE_CODE_RATE_LIMIT_TIER",
  "CLAUDE_CODE_OTEL_DIAG_STDERR",
  ...BG_WORKER_IDENTITY_ENV_VARS,
]);
var STRIP_ENV_PREFIXES = [
  "CLAUDE_CODE_REMOTE",
  "CLAUDE_CODE_HOST_",
  "CLAUDE_CODE_SESSION_",
  "CLAUDE_CODE_SDK_",
  "CLAUDE_CODE_RELAUNCH_",
];
//@ chunk-qchp9vrd.js:184230-184364 placement
function isStrippedClaudeCodeVar(e) {
  if (isSecretEnvName(e)) return !isNonSecretClaudeCodeEnvName(e);
  if (PATH_LIKE_ENV_RE.test(e)) return !PATH_ENV_EXCEPTIONS.has(e);
  return (
    EXPLICIT_STRIP_ENV.has(e) ||
    STRIP_ENV_PREFIXES.some((n) => e.startsWith(n)) ||
    isArtifactDevBaseUrlVar(e) ||
    isHelperEnvVar(e)
  );
}
//@ chunk-qchp9vrd.js:184364-184432 placement
/**
 * 代理相关的环境变量。
 */
var PROXY_ENV_VARS = new Set(["http_proxy", "https_proxy", "no_proxy", "all_proxy"]);
//@ chunk-qchp9vrd.js:184432-184670 placement
/**
 * 判断评测子会话是否应剔除某环境变量：显式名单、密钥类 CLAUDE_CODE_*、连接串保留，EVAL_* 与凭据/代理前缀剔除。
 */
function shouldStripEnvVar(e) {
  if (PROXY_ENV_VARS.has(e)) return true;
  let upper = e.toUpperCase();
  if (PRESERVED_BASE_ENV_VARS.has(upper)) return true;
  if (upper.startsWith("CLAUDE_CODE_") && isStrippedClaudeCodeVar(upper)) return false;
  if (upper.startsWith("EVAL_")) return true;
  if (isPackageIndexEnv(e)) return true;
  if (isConnectionStringName(e)) return false;
  return STRIPPED_ENV_PREFIXES.some((r) => upper.startsWith(r));
}
//@ chunk-qchp9vrd.js:184670-184759 placement
/**
 * 需要检查的 AWS 缓存目录。
 */
var AWS_CACHE_DIRS = [
  path.join(".aws", "sso"),
  path.join(".aws", "cli", "cache"),
  path.join(".aws", "boto", "cache"),
];
//@ chunk-qchp9vrd.js:184759-184856 placement
/**
 * 求路径的真实路径（父目录 realpath 加文件名）。
 */
async function realPathOf(e) {
  return path.join(await realpath(path.dirname(e)).catch(() => path.dirname(e)), path.basename(e));
}
//@ chunk-qchp9vrd.js:184856-185059 placement
/**
 * 求路径的真实路径，不存在时尝试按链接目标解析。
 */
async function resolveLinkTarget(e) {
  try {
    return await realpath(e);
  } catch (error) {
    if (isENOENT(error)) {
      let missingPath = await resolveMissingPath(e);
      if (missingPath !== "unresolvable") return missingPath;
    }
  }
  let n = await readlink(e).catch(() => null);
  return n === null ? null : path.resolve(path.dirname(await realPathOf(e)), n);
}
//@ chunk-qchp9vrd.js:185059-185483 placement
/**
 * 解析不存在的路径：向上找到第一个存在的祖先，经 realpath/readlink 拼回剩余部分；指向 /dev/null 返回原路径，无法解析返回 unresolvable。
 */
async function resolveMissingPath(e) {
  for (let n = e, dir = path.dirname(n); n !== dir; n = dir, dir = path.dirname(n)) {
    try {
      await lstat(n);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
      return "unresolvable";
    }
    let a = await realpath(n).catch(() => null);
    if (a === null) {
      let s = await readlink(n).catch(() => null);
      return s === null
        ? "unresolvable"
        : path.join(path.resolve(path.dirname(await realPathOf(n)), s), path.relative(n, e));
    }
    if (a === NULL_DEVICE) return realPathOf(e);
    return a === path.resolve(n) ? "absent" : path.join(a, path.relative(n, e));
  }
  return "absent";
}
//@ chunk-qchp9vrd.js:185483-185540 placement
/**
 * 判断路径能否被解析出来。
 */
async function isResolvablePath(e) {
  return (await resolveMissingPath(e)) !== "unresolvable";
}
//@ chunk-qchp9vrd.js:185540-186407 placement
/**
 * 评测沙箱凭据排除用的常量：各工具（kube、ssh、gnupg、docker、云 CLI 等）配置目录中允许或排除的条目名集合。
 */
var SANDBOX_PROBE_TIMEOUT_MS = 5000;
var KUBE_CACHE_ENTRIES = new Set(["discovery", "http", "http-cache"]);
var EMPTY_ENTRY_SET = new Set();
var SSH_CONFIG_ENTRIES = new Set([
  "config",
  "known_hosts",
  "known_hosts.old",
  "authorized_keys",
  "allowed_signers",
  "environment",
  "rc",
]);
var GNUPG_CONFIG_ENTRIES = new Set([
  "gpg.conf",
  "gpg-agent.conf",
  "dirmngr.conf",
  "scdaemon.conf",
  "common.conf",
  "gpa.conf",
  "sshcontrol",
]);
var DOCKER_SAFE_ENTRIES = new Set([
  "cli-plugins",
  "buildx",
  "desktop",
  "mutagen",
  "scan",
  "run",
  "features.json",
  "daemon.json",
  "desktop-build",
]);
var TOOL_BIN_ENTRIES = new Set(["bin", "completions"]);
var CREDENTIAL_ENTRIES = new Set([
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
]);
var CLOUD_CLI_SAFE_ENTRIES = new Set([
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
    );
  let h;
  try {
    h = await realpath(e);
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") {
      let missingPath = await resolveMissingPath(e);
      if (missingPath === "absent") return null;
      if (missingPath !== "unresolvable") return missingPath;
      throw s("is behind a link whose target is not there");
    }
    throw s(`could not be resolved (${getErrnoCode(error) ?? "unreadable"})`);
  }
  if (h === NULL_DEVICE) return realPathOf(e);
  let w = [h];
  let b = 0;
  for (let y = w.shift(); y !== undefined; y = w.shift()) {
    let R;
    try {
      R = await readdir(y, {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTDIR" && y === h) break;
      if (errnoCode === "ENOENT") continue;
      throw s(`could not be read (${errnoCode ?? "unreadable"})`);
    }
    for (let S of R) {
      if (++b > SANDBOX_PROBE_TIMEOUT_MS) throw s("is too large to check for symbolic links");
      if (r.has(S.name) || (y === h && a.has(S.name))) continue;
      let joined = path.join(y, S.name);
      let fileKind = await getFileKind(S, joined, "unknown");
      if (fileKind === "symlink") {
        let x = path.relative(h, joined).split(path.sep)[0] ?? "";
        throw s(
          `holds a symbolic link inside it (at or under ${CREDENTIAL_ENTRIES.has(x) ? `its "${x}" entry` : "an entry this check has no name for"})`,
        );
      }
      if (fileKind === "unknown") {
        let x = await lstat(joined).then(
          () => {
            return;
          },
          (error) => getErrnoCode(error),
        );
        if (x === "ENOENT" || x === "ENOTDIR") continue;
        throw s("holds an entry that could not be examined");
      }
      if (fileKind === "dir") w.push(joined);
    }
  }
  return h === path.resolve(e) ? null : h;
}
//@ chunk-qchp9vrd.js:187803-188365 placement
async function checkAwsCredentialPointers(sandbox, n) {
  if (
    !Object.entries(n).some(
      ([key, value]) =>
        (key.toUpperCase() === "AWS_CONFIG_FILE" || key.toUpperCase() === "AWS_SHARED_CREDENTIALS_FILE") &&
        (value ?? "").trim() !== "" &&
        (value ?? "").trim() !== NULL_DEVICE,
    )
  )
    return;
  for (let a of AWS_CACHE_DIRS) {
    let joined = path.join(os_2.homedir(), a);
    if (
      !(await stat(joined).then(
        (w) => w.isDirectory(),
        () => false,
      ))
    )
      continue;
    let joined_2 = path.join(sandbox.home, a);
    await mkdir(path.dirname(joined_2), {
      recursive: true,
    });
    try {
      await symlink(joined, joined_2, "junction");
    } catch (error) {
      logForDebugging(
        `[eval] could not link ${a} into the sandbox home (${getErrnoCode(error) ?? "unknown"}); an SSO-cached login will not reach the child`,
        {
          level: getErrnoCode(error) === "EEXIST" ? "debug" : "warn",
        },
      );
    }
  }
}
//@ chunk-qchp9vrd.js:188365-188408 placement
/**
 * 评测认证目录的有效期（2 小时）。
 */
var CHILD_FD_NUMBER = 3;
var CLAUDE_EVAL_AUTH = "claude-eval-auth-";
var EVAL_AUTH_DIR_TTL_MS = 7200000;
//@ chunk-qchp9vrd.js:188408-189126 placement
/**
 * 把缓存的组织策略交给子会话（无缓存时警告）。
 */
async function writeChildManagedPolicy(sandbox) {
  await waitForRemoteManagedSettingsToLoad();
  let remoteManagedSettingsSyncFromCache = getRemoteManagedSettingsSyncFromCache();
  if (!remoteManagedSettingsSyncFromCache && computeRemoteSettingsEligibility())
    logForDebugging(
      "[eval] no cached organization policy to hand the child (the managed-settings fetch has not produced one); a child that cannot fetch runs without the remote-managed tier",
      {
        level: "warn",
      },
    );
  let r =
    (remoteManagedSettingsSyncFromCache && collectManagedRestrictions(remoteManagedSettingsSyncFromCache)) ??
    {};
  let a = {
    ...expandMcpPolicyPredicates(r),
    managedSourcesBehavior: "merge",
  };
  let joined = path.join(sandbox.configDir, SETTINGS_FILENAME_ALIAS);
  let h = jsonStringify(a);
  try {
    await writeFile(joined, h, {
      mode: 384,
      flag: "wx",
    });
  } catch (error) {
    let b = await lstat(joined).catch(() => null);
    if (
      getErrnoCode(error) !== "EEXIST" ||
      !b?.isFile() ||
      b.size !== Buffer.byteLength(h) ||
      (await readFile(joined, "utf8").catch(() => null)) !== h
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the organization policy snapshot could not be placed in the evaluation sandbox (a different file is already there or it could not be written)",
        "eval policy snapshot refused",
      );
  }
}
//@ chunk-qchp9vrd.js:189126-189137 placement
/**
 * 设置文件名（别名）。
 */
var SETTINGS_FILENAME_ALIAS = SETTINGS_FILENAME;
//@ chunk-qchp9vrd.js:189137-190346 placement
/**
 * 把本会话 API key 传给评测运行（部分平台/网关下不可行时说明）。
 */
async function passApiKeyToChild(credential) {
  if (credential.kind === "apiKey") {
    if (getPlatform() === "windows")
      throw Error(
        "claude plugin eval can't pass this session's API key to its test runs on Windows; set ANTHROPIC_API_KEY and run it again",
      );
    return {
      env: {
        CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR: String(CHILD_FD_NUMBER),
      },
      viaFd: true,
      cleanup: async () => {},
    };
  }
  let n =
    credential.kind === "gateway"
      ? {
          CLAUDE_CODE_USE_GATEWAY: "1",
          ANTHROPIC_BASE_URL: credential.url,
        }
      : {
          CLAUDE_CODE_OAUTH_SCOPES: credential.scopes.join(" "),
          ...(credential.subscriptionType && {
            CLAUDE_CODE_SUBSCRIPTION_TYPE: credential.subscriptionType,
          }),
          ...(credential.rateLimitTier && {
            CLAUDE_CODE_RATE_LIMIT_TIER: credential.rateLimitTier,
          }),
        };
  if (getPlatform() !== "windows")
    return {
      env: {
        [credential.kind === "gateway"
          ? "CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR"
          : "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"]: String(CHILD_FD_NUMBER),
        ...n,
      },
      viaFd: true,
      cleanup: async () => {},
    };
  await cleanupStaleEvalAuthDirs();
  let r = await mkdtemp(path.join(os_2.tmpdir(), CLAUDE_EVAL_AUTH));
  let joined = path.join(r, "snapshot.json");
  try {
    await writeFile(
      joined,
      jsonStringify(
        credential.kind === "gateway"
          ? {
              gatewayToken: credential.jwt,
            }
          : {
              accessToken: credential.accessToken,
              scopes: credential.scopes,
              subscriptionType: credential.subscriptionType,
              rateLimitTier: credential.rateLimitTier,
            },
      ),
      {
        mode: 384,
        flag: "wx",
      },
    );
  } catch (error) {
    await rm_2(r, {
      recursive: true,
      force: true,
    }).catch(() => {});
    throw error;
  }
  return {
    env: {
      CLAUDE_BG_AUTH_SNAPSHOT_PATH: joined,
      ...(credential.kind === "gateway" && n),
    },
    viaFd: false,
    cleanup: () =>
      rm_2(r, {
        recursive: true,
        force: true,
      }).catch(() => {}),
  };
}
//@ chunk-qchp9vrd.js:190346-190571 placement
/**
 * 评测相关但允许的额外环境变量。
 */
var CHILD_AUTH_ENV_VARS = new Set(["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"]);
var ALLOWED_EVAL_ENV_KEYS = new Set([
  "CLAUDE_INTERNAL_FC_OVERRIDES",
  "CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR",
  "CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH",
  "CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES",
]);
//@ chunk-qchp9vrd.js:190571-193455 placement
/**
 * 组装子会话环境：case.yaml 只能设 EVAL_* 键，移除宿主认证/代理/凭据指针。
 */
function buildChildEnv(case_, sandbox, artifactPublishGranted, growthbookOverrides, s = false) {
  for (let key of Object.keys(case_.execution.env))
    if (!EVAL_ENV_KEY_RE.test(key))
      throw Error(
        `case "${case_.name}" execution.env key "${key}" is not allowed \u2014 only EVAL_* keys can be set from case.yaml. Anything else must come from the operator's shell.`,
      );
  let h = {
    CLAUDE_CONFIG_DIR: sandbox.configDir,
    HOME: sandbox.home,
    USERPROFILE: sandbox.home,
    XDG_CONFIG_HOME: path.join(sandbox.home, ".config"),
    XDG_DATA_HOME: path.join(sandbox.home, ".local", "share"),
    XDG_CACHE_HOME: path.join(sandbox.home, ".cache"),
    XDG_STATE_HOME: path.join(sandbox.home, ".local", "state"),
    TMPDIR: sandbox.tmpDir,
    TMP: sandbox.tmpDir,
    TEMP: sandbox.tmpDir,
    CLAUDE_CODE_TMPDIR: sandbox.tmpDir,
    CLAUDE_CODE_MANAGED_SETTINGS_PATH: sandbox.configDir,
    CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    ENABLE_CLAUDEAI_MCP_SERVERS: "false",
    DISABLE_AUTOUPDATER: "1",
  };
  if (getPlatform() === "windows") {
    let G = /^[A-Za-z]:/.test(sandbox.home) ? sandbox.home.slice(0, 2) : "";
    h.HOMEDRIVE = G;
    h.HOMEPATH = sandbox.home.slice(G.length);
    h.APPDATA = path.join(sandbox.home, "AppData", "Roaming");
    h.LOCALAPPDATA = path.join(sandbox.home, "AppData", "Local");
  }
  let w = new Set(Object.keys(h).map((key) => key.toUpperCase()));
  let b = {
    ...subprocessEnv(),
  };
  Object.assign(b, sanitizedIndexEnvs(b));
  for (let [key, value] of Object.entries(process.env))
    if (/^EVAL_/i.test(key) && value !== undefined) b[key] = value;
  let y = new Set(getHostManagedProviderConflicts(upperCaseEnvKeys(process.env)).map((G) => G.toUpperCase()));
  let R = y.size > 0;
  for (let key of Object.keys(b)) {
    let upper = key.toUpperCase();
    if (PLACEHOLDER_CREDENTIAL_KEYS.includes(key) && b[key] === PROXY_INJECTED_MARKER) continue;
    if (
      !shouldStripEnvVar(key) ||
      y.has(upper) ||
      (R && (upper === "ANTHROPIC_CONFIG_DIR" || upper === "ANTHROPIC_PROFILE")) ||
      ALLOWED_EVAL_ENV_KEYS.has(upper) ||
      w.has(upper) ||
      SHELL_STARTUP_ENV_VARS.has(upper) ||
      (s && MCP_TIMING_ENV_VARS.has(upper))
    )
      delete b[key];
  }
  for (let G of ["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY"])
    if (b.ANTHROPIC_UNIX_SOCKET && process.env[G] === SSH_PLACEHOLDER) b[G] = SSH_PLACEHOLDER;
  let S = {
    ...b,
    ...case_.execution.env,
    ...h,
  };
  stripBlockedEnvVars(S);
  S.GIT_CONFIG_NOSYSTEM = "1";
  S.GIT_PROXY_COMMAND = "";
  let evalGitConfigPairs = getEvalGitConfigPairs();
  S.GIT_CONFIG_COUNT = String(evalGitConfigPairs.length);
  evalGitConfigPairs.forEach(([G, J], Z) => {
    S[`GIT_CONFIG_KEY_${Z}`] = G;
    S[`GIT_CONFIG_VALUE_${Z}`] = J;
  });
  let N = os_2.homedir();
  let x = new Set(Object.keys(S).map((key) => key.toUpperCase()));
  let j = {
    ...(!R && {
      AWS_SHARED_CREDENTIALS_FILE: path.join(N, ".aws", "credentials"),
      AWS_CONFIG_FILE: path.join(N, ".aws", "config"),
      CLOUDSDK_CONFIG:
        getPlatform() === "windows"
          ? path.join(process.env.APPDATA ?? path.join(N, "AppData", "Roaming"), "gcloud")
          : path.join(N, ".config", "gcloud"),
      AZURE_CONFIG_DIR: path.join(N, ".azure"),
    }),
  };
  for (let [key, value] of Object.entries(j)) if (!x.has(key)) S[key] = value;
  if (getWIFPrecedenceSource() === "env-quad") {
    let G = federationCacheDir();
    if (G !== null) S.CLAUDE_CODE_FEDERATION_CACHE_DIR = G;
  }
  for (let key of Object.keys(S)) {
    let J = GIT_NO_PROMPT_ENV[key.toUpperCase()];
    if (J !== undefined && S[key] !== J) delete S[key];
  }
  let { GIT_NO_LAZY_FETCH, ...X } = missingGitSafetyEnv(S);
  Object.assign(S, X);
  let W = new Set(
    BG_CARRIED_ENV_KEYS_2.filter(
      (G) => G !== "ANTHROPIC_MODEL" && G !== "CLAUDE_AX_SCREEN_READER" && !(G in GIT_NO_PROMPT_ENV),
    ).map((G) => G.toUpperCase()),
  );
  W.delete("CLAUDE_CODE_RESTRICTED");
  W.delete("CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG");
  for (let key of Object.keys(S)) if (W.has(key.toUpperCase())) delete S[key];
  stripInternalEntrypoint(S);
  S.CLAUDE_CODE_EVAL_CONFINED = "1";
  if (artifactPublishGranted) {
    S.CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR = stubPublishDir(sandbox);
    S.MCP_CONNECTION_NONBLOCKING = "0";
    if (growthbookOverrides && Object.keys(growthbookOverrides).length > 0)
      S.CLAUDE_INTERNAL_FC_OVERRIDES = jsonStringify(growthbookOverrides);
  }
  return S;
}
export {
  buildChildEnv,
  writeChildManagedPolicy,
  passApiKeyToChild,
  CHILD_AUTH_ENV_VARS,
  checkAwsCredentialPointers,
  AWS_CACHE_DIRS,
  EMPTY_ENTRY_SET,
  CLOUD_CLI_SAFE_ENTRIES,
  SSH_CONFIG_ENTRIES,
  GNUPG_CONFIG_ENTRIES,
  DOCKER_SAFE_ENTRIES,
  TOOL_BIN_ENTRIES,
  KUBE_CACHE_ENTRIES,
  checkCredentialStoreLinks,
  resolveLinkTarget,
  realPathOf,
  STRIPPED_GIT_ENV_SET,
  isResolvablePath,
  EVAL_AUTH_DIR_TTL_MS,
  CLAUDE_EVAL_AUTH,
  MCP_TIMING_ENV_VARS,
  SETTINGS_FILENAME_ALIAS,
};
