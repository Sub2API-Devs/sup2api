/**
 * services/pluginEval/childEnvironment.ts
 *
 * 2.1.316 新增：plugin eval 子会话的环境变量：剔除凭据/代理/宿主变量、只允许 EVAL_* 自定义、凭据存储排除
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import os from "os";
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

//@ chunk-af1hzzme.js:182251-185171 placement
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
  ...PROXY_ENV_VARS_2.map((proxyVar) => proxyVar.toUpperCase()),
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
//@ chunk-af1hzzme.js:185171-185625 placement
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
//@ chunk-af1hzzme.js:185625-185759 placement
function isStrippedClaudeCodeVar(envName) {
  if (isSecretEnvName(envName)) return !isNonSecretClaudeCodeEnvName(envName);
  if (PATH_LIKE_ENV_RE.test(envName)) return !PATH_ENV_EXCEPTIONS.has(envName);
  return (
    EXPLICIT_STRIP_ENV.has(envName) ||
    STRIP_ENV_PREFIXES.some((prefix) => envName.startsWith(prefix)) ||
    isArtifactDevBaseUrlVar(envName) ||
    isHelperEnvVar(envName)
  );
}
//@ chunk-af1hzzme.js:185759-185827 placement
/**
 * 代理相关的环境变量。
 */
var PROXY_ENV_VARS = new Set(["http_proxy", "https_proxy", "no_proxy", "all_proxy"]);
//@ chunk-af1hzzme.js:185827-186065 placement
/**
 * 判断评测子会话是否应剔除某环境变量：显式名单、密钥类 CLAUDE_CODE_*、连接串保留，EVAL_* 与凭据/代理前缀剔除。
 */
function shouldStripEnvVar(envName) {
  if (PROXY_ENV_VARS.has(envName)) return true;
  let envName_2 = envName.toUpperCase();
  if (PRESERVED_BASE_ENV_VARS.has(envName_2)) return true;
  if (envName_2.startsWith("CLAUDE_CODE_") && isStrippedClaudeCodeVar(envName_2)) return false;
  if (envName_2.startsWith("EVAL_")) return true;
  if (isPackageIndexEnv(envName)) return true;
  if (isConnectionStringName(envName)) return false;
  return STRIPPED_ENV_PREFIXES.some((prefix) => envName_2.startsWith(prefix));
}
//@ chunk-af1hzzme.js:186065-186154 placement
/**
 * 需要检查的 AWS 缓存目录。
 */
var AWS_CACHE_DIRS = [
  path.join(".aws", "sso"),
  path.join(".aws", "cli", "cache"),
  path.join(".aws", "boto", "cache"),
];
//@ chunk-af1hzzme.js:186154-186251 placement
/**
 * 求路径的真实路径（父目录 realpath 加文件名）。
 */
async function realPathOf(filePath) {
  return path.join(
    await realpath(path.dirname(filePath)).catch(() => path.dirname(filePath)),
    path.basename(filePath),
  );
}
//@ chunk-af1hzzme.js:186251-186454 placement
/**
 * 求路径的真实路径，不存在时尝试按链接目标解析。
 */
async function resolveLinkTarget(linkPath) {
  try {
    return await realpath(linkPath);
  } catch (error) {
    if (isENOENT(error)) {
      let missingPath = await resolveMissingPath(linkPath);
      if (missingPath !== "unresolvable") return missingPath;
    }
  }
  let linkTarget = await readlink(linkPath).catch(() => null);
  return linkTarget === null ? null : path.resolve(path.dirname(await realPathOf(linkPath)), linkTarget);
}
//@ chunk-af1hzzme.js:186454-186878 placement
/**
 * 解析不存在的路径：向上找到第一个存在的祖先，经 realpath/readlink 拼回剩余部分；指向 /dev/null 返回原路径，无法解析返回 unresolvable。
 */
async function resolveMissingPath(filePath) {
  for (
    let current = filePath, dir = path.dirname(current);
    current !== dir;
    current = dir, dir = path.dirname(current)
  ) {
    try {
      await lstat(current);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
      return "unresolvable";
    }
    let realCurrent = await realpath(current).catch(() => null);
    if (realCurrent === null) {
      let linkTarget = await readlink(current).catch(() => null);
      return linkTarget === null
        ? "unresolvable"
        : path.join(
            path.resolve(path.dirname(await realPathOf(current)), linkTarget),
            path.relative(current, filePath),
          );
    }
    if (realCurrent === NULL_DEVICE) return realPathOf(filePath);
    return realCurrent === path.resolve(current)
      ? "absent"
      : path.join(realCurrent, path.relative(current, filePath));
  }
  return "absent";
}
//@ chunk-af1hzzme.js:186878-186935 placement
/**
 * 判断路径能否被解析出来。
 */
async function isResolvablePath(path) {
  return (await resolveMissingPath(path)) !== "unresolvable";
}
//@ chunk-af1hzzme.js:186935-187802 placement
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
//@ chunk-af1hzzme.js:187802-189198 placement
async function checkCredentialStoreLinks(storePath, storeName, ignoredNames, ignoredRootNames) {
  let storeError = (problem) =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the ${storeName} credential store on this machine ${problem}, so the Bash sandbox cannot reliably exclude it \u2014 a Bash-granting evaluation cannot run here; keep the store's contents in one plain directory (its root may be a link)`,
      "eval shell grant refused: credential store links elsewhere",
    );
  let storeReal;
  try {
    storeReal = await realpath(storePath);
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") {
      let missingPath = await resolveMissingPath(storePath);
      if (missingPath === "absent") return null;
      if (missingPath !== "unresolvable") return missingPath;
      throw storeError("is behind a link whose target is not there");
    }
    throw storeError(`could not be resolved (${getErrnoCode(error) ?? "unreadable"})`);
  }
  if (storeReal === NULL_DEVICE) return realPathOf(storePath);
  let pending = [storeReal];
  let entryCount = 0;
  for (let dir = pending.shift(); dir !== undefined; dir = pending.shift()) {
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTDIR" && dir === storeReal) break;
      if (errnoCode === "ENOENT") continue;
      throw storeError(`could not be read (${errnoCode ?? "unreadable"})`);
    }
    for (let entry of entries) {
      if (++entryCount > SANDBOX_PROBE_TIMEOUT_MS)
        throw storeError("is too large to check for symbolic links");
      if (ignoredNames.has(entry.name) || (dir === storeReal && ignoredRootNames.has(entry.name))) continue;
      let joined = path.join(dir, entry.name);
      let fileKind = await getFileKind(entry, joined, "unknown");
      if (fileKind === "symlink") {
        let topEntry = path.relative(storeReal, joined).split(path.sep)[0] ?? "";
        throw storeError(
          `holds a symbolic link inside it (at or under ${CREDENTIAL_ENTRIES.has(topEntry) ? `its "${topEntry}" entry` : "an entry this check has no name for"})`,
        );
      }
      if (fileKind === "unknown") {
        let statError = await lstat(joined).then(
          () => {
            return;
          },
          (error) => getErrnoCode(error),
        );
        if (statError === "ENOENT" || statError === "ENOTDIR") continue;
        throw storeError("holds an entry that could not be examined");
      }
      if (fileKind === "dir") pending.push(joined);
    }
  }
  return storeReal === path.resolve(storePath) ? null : storeReal;
}
//@ chunk-af1hzzme.js:189198-189760 placement
async function checkAwsCredentialPointers(sandbox, envVars) {
  if (
    !Object.entries(envVars).some(
      ([key, value]) =>
        (key.toUpperCase() === "AWS_CONFIG_FILE" || key.toUpperCase() === "AWS_SHARED_CREDENTIALS_FILE") &&
        (value ?? "").trim() !== "" &&
        (value ?? "").trim() !== NULL_DEVICE,
    )
  )
    return;
  for (let cacheDir of AWS_CACHE_DIRS) {
    let joined = path.join(os.homedir(), cacheDir);
    if (
      !(await stat(joined).then(
        (stats) => stats.isDirectory(),
        () => false,
      ))
    )
      continue;
    let joined_2 = path.join(sandbox.home, cacheDir);
    await mkdir(path.dirname(joined_2), {
      recursive: true,
    });
    try {
      await symlink(joined, joined_2, "junction");
    } catch (error) {
      logForDebugging(
        `[eval] could not link ${cacheDir} into the sandbox home (${getErrnoCode(error) ?? "unknown"}); an SSO-cached login will not reach the child`,
        {
          level: getErrnoCode(error) === "EEXIST" ? "debug" : "warn",
        },
      );
    }
  }
}
//@ chunk-af1hzzme.js:189760-189803 placement
/**
 * 评测认证目录的有效期（2 小时）。
 */
var CHILD_FD_NUMBER = 3;
var CLAUDE_EVAL_AUTH = "claude-eval-auth-";
var EVAL_AUTH_DIR_TTL_MS = 7200000;
//@ chunk-af1hzzme.js:189803-190521 placement
/**
 * 把缓存的组织策略交给子会话（无缓存时警告）。
 */
async function writeChildManagedPolicy(sandbox) {
  await waitForRemoteManagedSettingsToLoad();
  let doc = getRemoteManagedSettingsSyncFromCache();
  if (!doc && computeRemoteSettingsEligibility())
    logForDebugging(
      "[eval] no cached organization policy to hand the child (the managed-settings fetch has not produced one); a child that cannot fetch runs without the remote-managed tier",
      {
        level: "warn",
      },
    );
  let remoteSettings = (doc && collectManagedRestrictions(doc)) ?? {};
  let policy = {
    ...expandMcpPolicyPredicates(remoteSettings),
    managedSourcesBehavior: "merge",
  };
  let joined = path.join(sandbox.configDir, SETTINGS_FILENAME_ALIAS);
  let policyJson = jsonStringify(policy);
  try {
    await writeFile(joined, policyJson, {
      mode: 384,
      flag: "wx",
    });
  } catch (error) {
    let stats = await lstat(joined).catch(() => null);
    if (
      getErrnoCode(error) !== "EEXIST" ||
      !stats?.isFile() ||
      stats.size !== Buffer.byteLength(policyJson) ||
      (await readFile(joined, "utf8").catch(() => null)) !== policyJson
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the organization policy snapshot could not be placed in the evaluation sandbox (a different file is already there or it could not be written)",
        "eval policy snapshot refused",
      );
  }
}
//@ chunk-af1hzzme.js:190521-190532 placement
/**
 * 设置文件名（别名）。
 */
var SETTINGS_FILENAME_ALIAS = SETTINGS_FILENAME;
//@ chunk-af1hzzme.js:190532-191741 placement
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
  let authEnv =
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
        ...authEnv,
      },
      viaFd: true,
      cleanup: async () => {},
    };
  await cleanupStaleEvalAuthDirs();
  let authDir = await mkdtemp(path.join(os.tmpdir(), CLAUDE_EVAL_AUTH));
  let joined = path.join(authDir, "snapshot.json");
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
    await rm_2(authDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
    throw error;
  }
  return {
    env: {
      CLAUDE_BG_AUTH_SNAPSHOT_PATH: joined,
      ...(credential.kind === "gateway" && authEnv),
    },
    viaFd: false,
    cleanup: () =>
      rm_2(authDir, {
        recursive: true,
        force: true,
      }).catch(() => {}),
  };
}
//@ chunk-af1hzzme.js:191741-191966 placement
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
//@ chunk-af1hzzme.js:191966-194851 placement
/**
 * 组装子会话环境：case.yaml 只能设 EVAL_* 键，移除宿主认证/代理/凭据指针。
 */
function buildChildEnv(
  case_,
  sandbox,
  artifactPublishGranted,
  growthbookOverrides,
  mcpTimingCarried = false,
) {
  for (let key of Object.keys(case_.execution.env))
    if (!EVAL_ENV_KEY_RE.test(key))
      throw Error(
        `case "${case_.name}" execution.env key "${key}" is not allowed \u2014 only EVAL_* keys can be set from case.yaml. Anything else must come from the operator's shell.`,
      );
  let overrides = {
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
    let homeDrive = /^[A-Za-z]:/.test(sandbox.home) ? sandbox.home.slice(0, 2) : "";
    overrides.HOMEDRIVE = homeDrive;
    overrides.HOMEPATH = sandbox.home.slice(homeDrive.length);
    overrides.APPDATA = path.join(sandbox.home, "AppData", "Roaming");
    overrides.LOCALAPPDATA = path.join(sandbox.home, "AppData", "Local");
  }
  let overrideKeys = new Set(Object.keys(overrides).map((key) => key.toUpperCase()));
  let env = {
    ...subprocessEnv(),
  };
  Object.assign(env, sanitizedIndexEnvs(env));
  for (let [key, value] of Object.entries(process.env))
    if (/^EVAL_/i.test(key) && value !== undefined) env[key] = value;
  let blockedKeys = new Set(
    getHostManagedProviderConflicts(upperCaseEnvKeys(process.env)).map((key) => key.toUpperCase()),
  );
  let hasProviderConflict = blockedKeys.size > 0;
  for (let key of Object.keys(env)) {
    let upper = key.toUpperCase();
    if (PLACEHOLDER_CREDENTIAL_KEYS.includes(key) && env[key] === PROXY_INJECTED_MARKER) continue;
    if (
      !shouldStripEnvVar(key) ||
      blockedKeys.has(upper) ||
      (hasProviderConflict && (upper === "ANTHROPIC_CONFIG_DIR" || upper === "ANTHROPIC_PROFILE")) ||
      ALLOWED_EVAL_ENV_KEYS.has(upper) ||
      overrideKeys.has(upper) ||
      SHELL_STARTUP_ENV_VARS.has(upper) ||
      (mcpTimingCarried && MCP_TIMING_ENV_VARS.has(upper))
    )
      delete env[key];
  }
  for (let credentialKey of ["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY"])
    if (env.ANTHROPIC_UNIX_SOCKET && process.env[credentialKey] === SSH_PLACEHOLDER)
      env[credentialKey] = SSH_PLACEHOLDER;
  let finalEnv = {
    ...env,
    ...case_.execution.env,
    ...overrides,
  };
  stripBlockedEnvVars(finalEnv);
  finalEnv.GIT_CONFIG_NOSYSTEM = "1";
  finalEnv.GIT_PROXY_COMMAND = "";
  let evalGitConfigPairs = getEvalGitConfigPairs();
  finalEnv.GIT_CONFIG_COUNT = String(evalGitConfigPairs.length);
  evalGitConfigPairs.forEach(([gitConfigKey, gitConfigValue], gitConfigIndex) => {
    finalEnv[`GIT_CONFIG_KEY_${gitConfigIndex}`] = gitConfigKey;
    finalEnv[`GIT_CONFIG_VALUE_${gitConfigIndex}`] = gitConfigValue;
  });
  let homeDir = os.homedir();
  let finalKeys = new Set(Object.keys(finalEnv).map((key) => key.toUpperCase()));
  let credentialPaths = {
    ...(!hasProviderConflict && {
      AWS_SHARED_CREDENTIALS_FILE: path.join(homeDir, ".aws", "credentials"),
      AWS_CONFIG_FILE: path.join(homeDir, ".aws", "config"),
      CLOUDSDK_CONFIG:
        getPlatform() === "windows"
          ? path.join(process.env.APPDATA ?? path.join(homeDir, "AppData", "Roaming"), "gcloud")
          : path.join(homeDir, ".config", "gcloud"),
      AZURE_CONFIG_DIR: path.join(homeDir, ".azure"),
    }),
  };
  for (let [key, value] of Object.entries(credentialPaths)) if (!finalKeys.has(key)) finalEnv[key] = value;
  if (getWIFPrecedenceSource() === "env-quad") {
    let cacheDir = federationCacheDir();
    if (cacheDir !== null) finalEnv.CLAUDE_CODE_FEDERATION_CACHE_DIR = cacheDir;
  }
  for (let key of Object.keys(finalEnv)) {
    let expectedValue = GIT_NO_PROMPT_ENV[key.toUpperCase()];
    if (expectedValue !== undefined && finalEnv[key] !== expectedValue) delete finalEnv[key];
  }
  let { GIT_NO_LAZY_FETCH, ...missingSafetyEnv } = missingGitSafetyEnv(finalEnv);
  Object.assign(finalEnv, missingSafetyEnv);
  let carriedKeys = new Set(
    BG_CARRIED_ENV_KEYS_2.filter(
      (carriedKey) =>
        carriedKey !== "ANTHROPIC_MODEL" &&
        carriedKey !== "CLAUDE_AX_SCREEN_READER" &&
        !(carriedKey in GIT_NO_PROMPT_ENV),
    ).map((carriedKey) => carriedKey.toUpperCase()),
  );
  carriedKeys.delete("CLAUDE_CODE_RESTRICTED");
  carriedKeys.delete("CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG");
  for (let key of Object.keys(finalEnv)) if (carriedKeys.has(key.toUpperCase())) delete finalEnv[key];
  stripInternalEntrypoint(finalEnv);
  finalEnv.CLAUDE_CODE_EVAL_CONFINED = "1";
  if (artifactPublishGranted) {
    finalEnv.CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR = stubPublishDir(sandbox);
    finalEnv.MCP_CONNECTION_NONBLOCKING = "0";
    if (growthbookOverrides && Object.keys(growthbookOverrides).length > 0)
      finalEnv.CLAUDE_INTERNAL_FC_OVERRIDES = jsonStringify(growthbookOverrides);
  }
  return finalEnv;
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
