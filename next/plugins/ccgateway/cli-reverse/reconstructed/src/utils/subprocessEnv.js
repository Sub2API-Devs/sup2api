/**
 * utils/subprocessEnv.ts
 *
 * 构造子进程环境变量（过滤 GitHub Actions INPUT_* 等敏感变量）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/subprocessEnv.ts
 * pieces: chunk-3emqeq9c.js (1), chunk-ex0jqs9a.js (58)
 * attribution: fingerprint 1, placement 58
 */
import { resolve, dirname, posix } from "path";
import { homedir } from "os";
import { env } from "./env.js";
import { isDiskless, getOriginalCwd, getRootSession } from "../bootstrap/state.js";
import { resolveConfigDir } from "./wifProfile.js";
import { getAllPolicyTierSettings } from "./settings/settings.js";
import { noProxyUnion } from "./proxy.js";
import { identity } from "./identity.js";
import {
  clearSanitizedEnvCache,
  initEnvScrubFlag,
  flattened_2,
  envVarToUpperSnake,
  scrubbedEnvNames,
  isPackageIndexEnv,
  sanitizeIndexUrlEnv,
  indexFallbackEnv,
  hasAnyIndexEnv,
  flattened,
} from "./settings/policyHelper/helperExec.js";
import { HostScoped } from "./hostScoped.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { storageRootFor, noUncachedRoot } from "./settings/settingsStorage.js";
import { findCanonicalGitRoot } from "./git.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { sandboxBinaryPath } from "../components/sandbox/SandboxDependenciesTab.js";
import { childProcessTmpDir } from "./tempDir.js";
import { jsonParse } from "./slowOperations.js";
import { pickByHelper } from "./git/gitSafeEnv.js";
import { getPlatform } from "./platform.js";
import {
  isGitConfigOrProxyEnvName,
  isSecretEnvName,
  CREDENTIAL_ENV_VARS,
  isNonSecretClaudeCodeEnvName,
  BUNDLE_CREDENTIAL_ENV_REGEX,
  isCredentialUserEnv,
  redactJvmOptionsEnvValue,
  containsCredential,
} from "./settings/policyHelper/helperEnv.js";
import {
  AUTH_TOKEN_ENV_VARS,
  isHelperEnvVar,
  getHostManagedProviderConflicts,
} from "./managedEnvConstants.js";
import { logForDebugging } from "./debug.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { ccrBridgeEnvVarNames } from "../services/mcp/ccrMcpUrls.js";
import { getSessionTokenEnvKeys } from "./sessionAccessToken.js";
import { isStoredLoginPinned } from "../cli/headlessCloud/attachServe.js";
import { toolServerEnvAccessor } from "./subprocessEnvLoader.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ex0jqs9a.js:944-970 placement
var SSH_PLACEHOLDER = "ssh-placeholder";
//@ chunk-ex0jqs9a.js:970-1152 placement
/**
 * 判断环境是否为 SSH 远程转发的占位认证：存在 ANTHROPIC_UNIX_SOCKET、没有 auth token，且 OAuth token 或 API key 之一为 ssh-placeholder 而另一个为空。
 */
function isSshPlaceholderAuth(env) {
  let { CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY } = env;
  return (
    !!env.ANTHROPIC_UNIX_SOCKET &&
    !env.ANTHROPIC_AUTH_TOKEN &&
    ((CLAUDE_CODE_OAUTH_TOKEN === "ssh-placeholder" && !ANTHROPIC_API_KEY) ||
      (ANTHROPIC_API_KEY === "ssh-placeholder" && !CLAUDE_CODE_OAUTH_TOKEN))
  );
}
//@ chunk-ex0jqs9a.js:1152-1242 placement
/**
 * 后台调度子进程的订阅类型与限速等级环境变量名。
 */
var BG_DISPATCHER_IDENTITY_ENV_VARS = [
  "CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE",
  "CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER",
];
//@ chunk-ex0jqs9a.js:1242-1424 placement
/**
 * 生成传给后台调度子进程的订阅类型与限速等级环境变量。
 */
function buildBgDispatcherEnv(options) {
  return {
    ...(options.subscriptionType && {
      CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE: options.subscriptionType,
    }),
    ...(options.rateLimitTier && {
      CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER: options.rateLimitTier,
    }),
  };
}
//@ chunk-ex0jqs9a.js:1424-1664 placement
/**
 * 后台会话中从环境变量读取调度方传入的订阅类型与限速等级。
 */
function getBgDispatcherPlanInfo() {
  if (env.CLAUDE_CODE_SESSION_KIND !== "bg")
    return {
      subscriptionType: undefined,
      rateLimitTier: undefined,
    };
  return {
    subscriptionType: env.CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE || undefined,
    rateLimitTier: env.CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER || undefined,
  };
}
//@ chunk-ex0jqs9a.js:1766-1922 placement
/**
 * 联合缓存目录。
 */
function federationCacheDir() {
  if (isDiskless()) return null;
  let CLAUDE_CODE_FEDERATION_CACHE_DIR = env.CLAUDE_CODE_FEDERATION_CACHE_DIR;
  if (CLAUDE_CODE_FEDERATION_CACHE_DIR) return resolve(CLAUDE_CODE_FEDERATION_CACHE_DIR);
  let configDir = resolveConfigDir();
  return configDir === null ? null : resolve(configDir, "credentials", "federation");
}
//@ chunk-ex0jqs9a.js:1922-1946 placement
/**
 * 代理注入标记。
 */
var PROXY_INJECTED_MARKER = "proxy-injected";
//@ chunk-ex0jqs9a.js:1946-2023 placement
/**
 * 取策略设置里第一个 bwrap 路径。
 */
function getSandboxBwrapPath() {
  return getAllPolicyTierSettings()
    .map((tier) => tier.sandbox?.bwrapPath)
    .find((path) => path != null);
}
//@ chunk-ex0jqs9a.js:2023-2100 placement
/**
 * 取策略设置里第一个 socat 路径。
 */
function getSandboxSocatPath() {
  return getAllPolicyTierSettings()
    .map((tier) => tier.sandbox?.socatPath)
    .find((path) => path != null);
}
//@ chunk-ex0jqs9a.js:2164-2189 placement
var PROXY_VALUE_UNSAFE_RE = /[ \t\n\v\f\r'"]/;
//@ chunk-ex0jqs9a.js:2189-3109 placement
/**
 * 为子进程生成代理环境变量（含 Java 参数）。
 */
function proxyEnvForSubprocess(env) {
  let httpProxy = env.HTTP_PROXY || env.http_proxy || env.CLAUDE_CODE_HTTP_PROXY;
  let httpsProxy = env.HTTPS_PROXY || env.https_proxy || env.CLAUDE_CODE_HTTPS_PROXY;
  let noProxy = noProxyUnion(env);
  if (!httpProxy && !httpsProxy) return {};
  let proxyUrl = parseProxyUrl(httpProxy);
  let proxyUrl_2 = parseProxyUrl(httpsProxy);
  if (!proxyUrl_2.host) proxyUrl_2 = proxyUrl;
  let out = {};
  let setIfUnset = (name, value) => {
    if (value && env[name] === undefined) out[name] = value;
  };
  setIfUnset("YARN_HTTP_PROXY", httpProxy);
  setIfUnset("YARN_HTTPS_PROXY", httpsProxy);
  setIfUnset("npm_config_proxy", httpProxy);
  setIfUnset("npm_config_https_proxy", httpsProxy);
  setIfUnset("npm_config_noproxy", noProxy);
  setIfUnset("GLOBAL_AGENT_HTTP_PROXY", httpProxy);
  setIfUnset("GLOBAL_AGENT_HTTPS_PROXY", httpsProxy);
  setIfUnset("GLOBAL_AGENT_NO_PROXY", noProxy);
  setIfUnset("ELECTRON_GET_USE_PROXY", "1");
  setIfUnset("DOCKER_HTTP_PROXY", httpProxy);
  setIfUnset("DOCKER_HTTPS_PROXY", httpsProxy);
  if (proxyUrl_2.host) {
    setIfUnset("CLOUDSDK_PROXY_TYPE", "http");
    setIfUnset("CLOUDSDK_PROXY_ADDRESS", proxyUrl_2.host);
    setIfUnset("CLOUDSDK_PROXY_PORT", proxyUrl_2.port);
    setIfUnset("CLOUDSDK_PROXY_USERNAME", proxyUrl_2.user);
    setIfUnset("CLOUDSDK_PROXY_PASSWORD", proxyUrl_2.pass);
  }
  setIfUnset("FSSPEC_GCS", '{"session_kwargs": {"trust_env": true}}');
  if (proxyUrl_2.host) {
    let JAVA_TOOL_OPTIONS = env.JAVA_TOOL_OPTIONS;
    if (!JAVA_TOOL_OPTIONS?.includes("-Dhttps.proxyHost=")) {
      let javaArgs = javaProxyArgs(proxyUrl, proxyUrl_2, noProxy);
      out.JAVA_TOOL_OPTIONS = JAVA_TOOL_OPTIONS ? `${JAVA_TOOL_OPTIONS} ${javaArgs}` : javaArgs;
    }
  }
  return out;
}
//@ chunk-ex0jqs9a.js:3109-3512 placement
/**
 * 解析代理 URL 为主机、端口、用户、密码。
 */
function parseProxyUrl(url) {
  if (!url)
    return {
      host: "",
      port: "",
      user: "",
      pass: "",
    };
  try {
    let parsed = new URL(url);
    if (!parsed.hostname)
      return {
        host: "",
        port: "",
        user: "",
        pass: "",
      };
    return {
      host:
        parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]")
          ? parsed.hostname.slice(1, -1)
          : parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
      user: decodeURIComponent(parsed.username),
      pass: decodeURIComponent(parsed.password),
    };
  } catch {
    return {
      host: "",
      port: "",
      user: "",
      pass: "",
    };
  }
}
//@ chunk-ex0jqs9a.js:3512-3978 placement
/**
 * 生成 Java 代理系统属性参数。
 */
function javaProxyArgs(proxyUrl, proxyUrl_2, noProxy) {
  let args = [];
  let addProp = (name, value) => {
    if (value && !PROXY_VALUE_UNSAFE_RE.test(value)) args.push(`-D${name}=${value}`);
  };
  addProp("http.proxyHost", proxyUrl.host);
  addProp("http.proxyPort", proxyUrl.port);
  addProp("https.proxyHost", proxyUrl_2.host);
  addProp("https.proxyPort", proxyUrl_2.port);
  addProp("http.proxyUser", proxyUrl.user);
  addProp("http.proxyPassword", proxyUrl.pass);
  addProp("https.proxyUser", proxyUrl_2.user);
  addProp("https.proxyPassword", proxyUrl_2.pass);
  if (noProxy) addProp("http.nonProxyHosts", toNoProxyPattern(noProxy));
  args.push("-Djdk.http.auth.tunneling.disabledSchemes=");
  args.push("-Djdk.http.auth.proxying.disabledSchemes=");
  return args.join(" ");
}
//@ chunk-ex0jqs9a.js:3978-4134 placement
function toNoProxyPattern(value) {
  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      if (entry.startsWith(".")) return [`*${entry}`];
      return parseIpv4Cidr(entry) ?? [entry];
    })
    .join("|");
}
//@ chunk-ex0jqs9a.js:4134-4560 placement
/**
 * 解析 IPv4 CIDR。
 */
function parseIpv4Cidr(cidr) {
  let match = cidr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return;
  let octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  let prefixBits = Number(match[5]);
  if (octets.some((octet) => octet > 255) || prefixBits < 8 || prefixBits > 24) return [cidr];
  let floored = Math.floor(prefixBits / 8);
  let hostBits = prefixBits % 8;
  if (hostBits === 0) return [`${octets.slice(0, floored).join(".")}.*`];
  let blockSize = 2 ** (8 - hostBits);
  if (blockSize > 16) return [cidr];
  let blockStart = octets[floored] - (octets[floored] % blockSize);
  let patterns = [];
  for (let lastOctet = blockStart; lastOctet < blockStart + blockSize; lastOctet++)
    patterns.push(`${[...octets.slice(0, floored), lastOctet].join(".")}.*`);
  return patterns;
}
//@ chunk-ex0jqs9a.js:4560-5242 placement
var BG_WORKER_IDENTITY_ENV_VARS; // deferred: uses BG_DISPATCHER_IDENTITY_ENV_VARS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ex0jqs9a.js:4560", () => {
  BG_WORKER_IDENTITY_ENV_VARS = [
    "CLAUDE_CODE_SESSION_KIND",
    "CLAUDE_BG_SOURCE",
    "CLAUDE_BG_ISOLATION",
    "CLAUDE_BG_BACKEND",
    "CLAUDE_CODE_SESSION_NAME",
    "CLAUDE_CODE_RESUME_INTERRUPTED_TURN",
    "CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS",
    "CLAUDE_CODE_RESUME_PROMPT",
    "CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS",
    "CLAUDE_CODE_RESUME_REASON",
    "CLAUDE_CODE_RESUME_SOURCE_ALIVE",
    "CLAUDE_CODE_SESSION_BEGAN_AS_COPY",
    "CLAUDE_BG_POST_CLEAR_RESPAWN",
    "CLAUDE_BG_SESSION_PERMISSION_RULES",
    "CLAUDE_BG_MEMORY_TOGGLED_OFF",
    "CLAUDE_BG_AUTO_MEMORY_OFF",
    "CLAUDE_BG_WORKSPACE_TRUSTED",
    "CLAUDE_BG_CARRIED_PROMPTS_SHA256",
    "CLAUDE_BG_GATEWAY_WITHHELD",
    "CLAUDE_CODE_RELAUNCH_HOME_TRUST",
    "CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS",
    ...BG_DISPATCHER_IDENTITY_ENV_VARS,
  ];
});
//@ chunk-ex0jqs9a.js:5242-5782 placement
/**
 * 子进程环境清洗状态（锁存值、脚本调用计数）。
 */
class SubprocessEnvState {
  scrubEnabledLatched = undefined;
  scrubSandboxAvailableLatched = undefined;
  scrubPathsLatched = undefined;
  scriptCallCounts = new Map();
  scriptCapsLatched = undefined;
  setScrubEnabledLatched(scrubEnabledLatched) {
    this.scrubEnabledLatched = scrubEnabledLatched;
  }
  setScrubSandboxAvailableLatched(scrubSandboxAvailableLatched) {
    this.scrubSandboxAvailableLatched = scrubSandboxAvailableLatched;
  }
  setScrubPathsLatched(scrubPathsLatched) {
    this.scrubPathsLatched = scrubPathsLatched;
  }
  setScriptCapsLatched(scriptCapsLatched) {
    this.scriptCapsLatched = scriptCapsLatched;
  }
  reset() {
    this.scrubEnabledLatched = undefined;
    this.scrubSandboxAvailableLatched = undefined;
    this.scrubPathsLatched = undefined;
    this.scriptCallCounts.clear();
    this.scriptCapsLatched = undefined;
  }
}
//@ chunk-ex0jqs9a.js:5782-5821 placement
var subprocessEnvState; // deferred: uses SubprocessEnvState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ex0jqs9a.js:5782", () => {
  subprocessEnvState = identity(new SubprocessEnvState(), (state) => {
    state.reset();
    clearSanitizedEnvCache();
  });
});
//@ chunk-ex0jqs9a.js:5821-5926 placement
class SubprocessEnvState_2 {
  getAgentProxyEnv = undefined;
  getGhStandinDir = undefined;
  settingsEnvForChildren = {};
  hipaaTierNoticeGiven = false;
}
//@ chunk-ex0jqs9a.js:5926-5949 placement
var subprocessEnvStateByHost; // deferred: uses SubprocessEnvState_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ex0jqs9a.js:5926", () => {
  subprocessEnvStateByHost = new HostScoped(() => new SubprocessEnvState_2());
});
//@ chunk-ex0jqs9a.js:5949-6106 placement
function isScrubEnabled() {
  let scrubEnabledLatched = subprocessEnvState.scrubEnabledLatched;
  if (scrubEnabledLatched !== undefined) return scrubEnabledLatched;
  let enabled = isEnvTruthy(process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB);
  subprocessEnvState.setScrubEnabledLatched(enabled);
  return enabled;
}
//@ chunk-ex0jqs9a.js:6106-6257 placement (2.1.88 match: isReplModeEnabled, 0.161)
/**
 * REPL 模式：If() 为真，或未显式关闭 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 且入口为 local-agent。外部构建 getReplTool 恒 null，REPL 工具实际不存在。
 */
function shouldScrubSubprocessEnv() {
  if (isScrubEnabled()) return true;
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)) return false;
  return process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent";
}
//@ chunk-ex0jqs9a.js:6257-6473 placement
var DOTENV_FILE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SYSTEM_TOP_DIRS;
var CURRENT_DIR;
deferInit("chunk-ex0jqs9a.js:6257", () => {
  DOTENV_FILE_NAMES = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.test",
    ".env.test.local",
    ".env.production",
    ".env.production.local",
  ];
  SYSTEM_TOP_DIRS = ["home", "root", "tmp", "var", "opt", "run", "mnt"].map((dir) => `/${dir}`);
  CURRENT_DIR = ".";
});
//@ chunk-ex0jqs9a.js:6473-6576 placement (2.1.88 match: isInClaudeFolder, 1)
function isInClaudeFolder(filePath) {
  let dirs = new Set();
  for (let rootResolver of [storageRootFor, findCanonicalGitRoot, noUncachedRoot])
    try {
      dirs.add(`${resolveLocalSettingsStoreRoot(filePath, rootResolver)}/.claude`);
    } catch {}
  return [...dirs];
}
//@ chunk-ex0jqs9a.js:6576-6691 placement
function isScrubSandboxAvailable() {
  if (subprocessEnvState.scrubSandboxAvailableLatched !== undefined)
    return subprocessEnvState.scrubSandboxAvailableLatched;
  return sandboxBinaryPath() !== null;
}
//@ chunk-ex0jqs9a.js:6691-9748 placement
async function assertScrubSandboxAvailable() {
  initEnvScrubFlag();
  if (!isScrubEnabled()) return;
  let homeDir = homedir();
  let filePath = getOriginalCwd();
  let githubEnvDir = process.env.GITHUB_ENV ? dirname(process.env.GITHUB_ENV) : undefined;
  let envGithubWorkspace = process.env.GITHUB_WORKSPACE;
  subprocessEnvState.setScrubSandboxAvailableLatched(sandboxBinaryPath() !== null);
  let filtered = (process.env.PATH ?? "")
    .split(":")
    .map((pathEntry) => (pathEntry ? posix.normalize(pathEntry).replace(/\/+$/, "") : pathEntry))
    .filter((pathEntry) => pathEntry && SYSTEM_TOP_DIRS.some((topDir) => pathEntry.startsWith(`${topDir}/`)));
  subprocessEnvState.setScrubPathsLatched({
    home: homeDir,
    originalCwd: filePath,
    claudeConfigDir: process.env.CLAUDE_CONFIG_DIR,
    federationCacheDir: federationCacheDir() ?? undefined,
    canonicalClaudeDirs: isInClaudeFolder(filePath),
    runnerFileCommandsDir: githubEnvDir,
    workspace: envGithubWorkspace,
    GITHUB_ACTION_PATH: process.env.GITHUB_ACTION_PATH,
    GITHUB_EVENT_PATH: process.env.GITHUB_EVENT_PATH,
    pathDirs: filtered,
  });
  latchScriptCaps();
  if (sandboxBinaryPath() === null) {
    let sandboxBwrapPath = getSandboxBwrapPath();
    throw Error(
      sandboxBwrapPath
        ? `sandbox.bwrapPath is set to ${sandboxBwrapPath} but it is not an executable file. Fix the path in managed settings, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to disable (loses subprocess isolation).`
        : "bubblewrap is required for subprocess env scrubbing and isolation. Install with: sudo apt-get install -y bubblewrap, set sandbox.bwrapPath in managed settings, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to disable (loses subprocess isolation).",
    );
  }
  if (isDiskless()) return;
  let { appendFile, mkdir, open } = await import("fs/promises");
  try {
    childProcessTmpDir();
  } catch {}
  for (let stubFilePath of [
    `${homeDir}/.gitconfig`,
    `${homeDir}/.bash_profile`,
    `${homeDir}/.bashrc`,
    `${homeDir}/.bash_aliases`,
    `${homeDir}/.profile`,
    `${homeDir}/.zshrc`,
    `${homeDir}/.bunfig.toml`,
    `${homeDir}/.netrc`,
    `${homeDir}/.npmrc`,
    `${homeDir}/.yarnrc`,
    `${homeDir}/.yarnrc.yml`,
    `${filePath}/.npmrc`,
    `${filePath}/.yarnrc`,
    `${filePath}/.yarnrc.yml`,
    `${filePath}/bunfig.toml`,
    `${filePath}/package.json`,
    `${filePath}/.gitmodules`,
    `${filePath}/package-lock.json`,
    `${filePath}/yarn.lock`,
    `${filePath}/pnpm-lock.yaml`,
    "/tmp/inline-comments-buffer.jsonl",
    ...DOTENV_FILE_NAMES.map((name) => `${filePath}/${name}`),
  ])
    try {
      await mkdir(dirname(stubFilePath), {
        recursive: true,
      });
      await (await open(stubFilePath, "a")).close();
    } catch {}
  for (let dirPath of [
    `${homeDir}/.config/gh`,
    `${homeDir}/.config/glab-cli`,
    `${homeDir}/.config/git`,
    `${homeDir}/.config/pip`,
    `${homeDir}/.pip`,
    `${filePath}/.claude/commands`,
    `${filePath}/.claude/agents`,
    `${filePath}/node_modules/.bin`,
    ...(githubEnvDir ? [githubEnvDir] : []),
    ...filtered,
  ])
    try {
      await mkdir(dirPath, {
        recursive: true,
      });
    } catch {}
  if (envGithubWorkspace && posix.resolve(envGithubWorkspace) !== posix.resolve(filePath)) {
    await mkdir(`${envGithubWorkspace}/.git/hooks`).catch(() => {});
    await mkdir(`${envGithubWorkspace}/.git/glab-cli`).catch(() => {});
    await mkdir(`${envGithubWorkspace}/.git/modules`).catch(() => {});
    await mkdir(`${envGithubWorkspace}/.git/worktrees`).catch(() => {});
    await mkdir(`${envGithubWorkspace}/.git/info`).catch(() => {});
    await mkdir(`${envGithubWorkspace}/.github`, {
      recursive: true,
    }).catch(() => {});
    for (let filePath of [
      `${envGithubWorkspace}/.git/config`,
      `${envGithubWorkspace}/.git/config.worktree`,
      `${envGithubWorkspace}/.git/info/exclude`,
      `${envGithubWorkspace}/.gitmodules`,
    ])
      try {
        await (await open(filePath, "a")).close();
      } catch {}
    try {
      let handle = await open(`${envGithubWorkspace}/.git/commondir`, "wx");
      await handle.writeFile(CURRENT_DIR);
      await handle.close();
    } catch {}
  }
  let stubFiles = [
    "bunfig.toml",
    "package.json",
    ".npmrc",
    ".yarnrc",
    ".yarnrc.yml",
    ".gitmodules",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ...DOTENV_FILE_NAMES,
  ];
  await mkdir(`${filePath}/.git/info`).catch(() => {});
  await mkdir(`${filePath}/.git/modules`).catch(() => {});
  await mkdir(`${filePath}/.git/worktrees`).catch(() => {});
  await mkdir(`${filePath}/.git/glab-cli`).catch(() => {});
  try {
    await (await open(`${filePath}/.git/config.worktree`, "a")).close();
  } catch {}
  try {
    let handle = await open(`${filePath}/.git/commondir`, "wx");
    await handle.writeFile(CURRENT_DIR);
    await handle.close();
  } catch {}
  try {
    await appendFile(
      `${filePath}/.git/info/exclude`,
      `
# claude-code scrub-mode stubs
${stubFiles.map((fileName) => `/${fileName}`).join(`
`)}
`,
    );
  } catch {}
}
//@ chunk-ex0jqs9a.js:9748-10150 placement
/**
 * 锁存 CLAUDE_CODE_SCRIPT_CAPS。
 */
function latchScriptCaps() {
  if (subprocessEnvState.scriptCapsLatched !== undefined) return;
  let envClaudeCodeScriptCaps = process.env.CLAUDE_CODE_SCRIPT_CAPS;
  if (!envClaudeCodeScriptCaps) {
    subprocessEnvState.setScriptCapsLatched(null);
    return;
  }
  try {
    let parsed = jsonParse(envClaudeCodeScriptCaps);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      let caps = pickByHelper(
        parsed,
        (value, key) => typeof value === "number" && Number.isFinite(value) && key.trim().length > 0,
      );
      subprocessEnvState.setScriptCapsLatched(Object.keys(caps).length > 0 ? caps : null);
    } else subprocessEnvState.setScriptCapsLatched(null);
  } catch {
    subprocessEnvState.setScriptCapsLatched(null);
  }
}
//@ chunk-ex0jqs9a.js:10150-10559 placement
function enforceScriptCaps(text) {
  if (!isScrubEnabled()) return;
  latchScriptCaps();
  if (!subprocessEnvState.scriptCapsLatched) return;
  let { scriptCapsLatched, scriptCallCounts } = subprocessEnvState;
  for (let [key, value] of Object.entries(scriptCapsLatched)) {
    let occurrences = text.split(key).length - 1;
    if (occurrences > 0) {
      let totalCalls = (scriptCallCounts.get(key) ?? 0) + occurrences;
      scriptCallCounts.set(key, totalCalls);
      if (totalCalls > value)
        throw Error(
          `Script call limit exceeded: ${key} has been called ${totalCalls} times (cap: ${value}). This limit prevents data exfiltration via repeated write operations in untrusted-input workflows.`,
        );
    }
  }
}
//@ chunk-ex0jqs9a.js:10559-10609 placement
function registerAgentProxyEnvFn(getAgentProxyEnv) {
  subprocessEnvStateByHost.of(getRootSession().host).getAgentProxyEnv = getAgentProxyEnv;
}
//@ chunk-ex0jqs9a.js:10609-10658 placement
function registerGhStandinDirFn(getGhStandinDir) {
  subprocessEnvStateByHost.of(getRootSession().host).getGhStandinDir = getGhStandinDir;
}
//@ chunk-ex0jqs9a.js:10658-10720 placement
function agentProxyEnv() {
  return subprocessEnvStateByHost.of(getRootSession().host).getAgentProxyEnv?.() ?? {};
}
//@ chunk-ex0jqs9a.js:10720-10777 placement
function ghStandinDir() {
  return subprocessEnvStateByHost.of(getRootSession().host).getGhStandinDir?.();
}
//@ chunk-ex0jqs9a.js:10777-10833 placement
function setSettingsEnvForChildren(settingsEnvForChildren) {
  subprocessEnvStateByHost.of(getRootSession().host).settingsEnvForChildren = settingsEnvForChildren;
}
//@ chunk-ex0jqs9a.js:10833-10912 placement
function settingsEnvKeptForChildren(name) {
  let { settingsEnvForChildren } = subprocessEnvStateByHost.of(getRootSession().host);
  return settingsEnvForChildren[spellingIn(settingsEnvForChildren, name)];
}
//@ chunk-ex0jqs9a.js:10912-10946 placement
function settingsPathForChildren() {
  return settingsEnvKeptForChildren("PATH");
}
//@ chunk-ex0jqs9a.js:10946-11041 placement
function inheritedByChildren(name) {
  let { settingsEnvForChildren } = subprocessEnvStateByHost.of(getRootSession().host);
  return settingsEnvForChildren[spellingIn(settingsEnvForChildren, name)] ?? process.env[name];
}
//@ chunk-ex0jqs9a.js:11041-11052 placement
var DAEMON_FORCE_COLOR_VALUE = "3";
//@ chunk-ex0jqs9a.js:11052-11125 placement
function holdsDaemonForceColor() {
  return env.CLAUDE_BG_BACKEND === "daemon" && env.FORCE_COLOR === DAEMON_FORCE_COLOR_VALUE;
}
//@ chunk-ex0jqs9a.js:11125-11248 placement
function withholdsDaemonForceColor() {
  if (!holdsDaemonForceColor()) return false;
  let { settingsEnvForChildren } = subprocessEnvStateByHost.of(getRootSession().host);
  return !Object.hasOwn(settingsEnvForChildren, spellingIn(settingsEnvForChildren, "FORCE_COLOR"));
}
//@ chunk-ex0jqs9a.js:11248-11391 placement
function spellingIn(env, name) {
  if (getPlatform() !== "windows" || Object.hasOwn(env, name)) return name;
  let upper = name.toUpperCase();
  return Object.keys(env).find((key) => key.toUpperCase() === upper) ?? name;
}
//@ chunk-ex0jqs9a.js:11391-11476 placement
function isArtifactDevBaseUrlVar(name) {
  return name.startsWith("CLAUDE_CODE_ARTIFACT") && name.endsWith("_BASE_URL");
}
//@ chunk-ex0jqs9a.js:11476-11558 placement
function armedRunnerShedsName(name) {
  let name_2 = name.toUpperCase();
  return (
    !isGitConfigOrProxyEnvName(name) &&
    isSecretEnvName(name) &&
    !CREDENTIAL_ENV_VARS.has(name_2) &&
    !isNonSecretClaudeCodeEnvName(name_2)
  );
}
//@ chunk-ex0jqs9a.js:11558-11603 placement
var HIPAA_CREDENTIAL_KEY_SET; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ex0jqs9a.js:11558", () => {
  HIPAA_CREDENTIAL_KEY_SET = new Set(AUTH_TOKEN_ENV_VARS.map((name) => name.toUpperCase()));
});
//@ chunk-ex0jqs9a.js:11603-11828 placement
function hipaaCredentialScrubKeys() {
  if (!hipaaWithholdsChildCredentials()) return [];
  let state = subprocessEnvStateByHost.of(getRootSession().host);
  if (!state.hipaaTierNoticeGiven) {
    state.hipaaTierNoticeGiven = true;
    logForDebugging(
      "HIPAA: withholding this CLI's Anthropic credentials from child processes and config ${VAR} expansion",
    );
  }
  return flattened_2;
}
//@ chunk-ex0jqs9a.js:11828-11862 placement
function hipaaWithholdsChildCredentials() {
  return hasComplianceTaint("hipaa");
}
//@ chunk-ex0jqs9a.js:11862-11907 placement
var CHILD_SCRUBBED_CREDENTIAL_KEY_SET; // deferred: uses flattened (./settings/policyHelper/helperExec.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ex0jqs9a.js:11862", () => {
  CHILD_SCRUBBED_CREDENTIAL_KEY_SET = new Set(flattened_2.map((name) => name.toUpperCase()));
});
//@ chunk-ex0jqs9a.js:11907-12034 placement
function isChildScrubbedCredentialFamily(upperCase) {
  let name = upperCase.replace(/^INPUT_/, "");
  return (
    isArtifactDevBaseUrlVar(name) ||
    isHelperEnvVar(name) ||
    name.startsWith("OTEL_") ||
    name === "CLAUDE_CODE_OTEL_DIAG_STDERR"
  );
}
//@ chunk-ex0jqs9a.js:12034-12159 placement
function isSshPlaceholderCredential(name, env) {
  return (
    (name === "CLAUDE_CODE_OAUTH_TOKEN" || name === "ANTHROPIC_API_KEY") &&
    env[name] === SSH_PLACEHOLDER &&
    env.ANTHROPIC_UNIX_SOCKET !== undefined
  );
}
//@ chunk-ex0jqs9a.js:12159-12964 placement
function childScrubbedCredentialKeys() {
  let env = process.env;
  let isKeptPlaceholder = (name) =>
    isSshPlaceholderCredential(name, env) &&
    !Object.keys(env).some((key) => key !== name && key.toUpperCase() === name);
  return [
    ...AUTH_TOKEN_ENV_VARS.filter((name) => !isKeptPlaceholder(name)),
    ...Object.keys(env).filter((key) => isChildScrubbedCredentialFamily(key.toUpperCase())),
    ...getHostManagedProviderConflicts(env),
    ...ccrBridgeEnvVarNames(),
    ...getSessionTokenEnvKeys(),
    ...hipaaCredentialScrubKeys().filter((key) => !isKeptPlaceholder(key)),
    "CLAUDE_CODE_SUBSCRIPTION_TYPE",
    "CLAUDE_CODE_RATE_LIMIT_TIER",
    "CLAUDE_CODE_PLUGIN_ATTRIBUTION",
    "CLAUDE_CODE_SKILL_ATTRIBUTION",
    "CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT",
    "CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT",
    "CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS",
    "CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT",
    "CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT",
    "CLAUDE_CODE_CONFIG_PROBE",
    "CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD",
    "CLAUDE_CODE_MCP_SERVE_SETTINGS",
    "CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS",
    "CLAUDE_CODE_REMOTE_TOOLS_FORWARD",
    "CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT",
    ...BG_WORKER_IDENTITY_ENV_VARS,
  ];
}
//@ chunk-ex0jqs9a.js:12964-13187 placement
var BUN_GC_ENV_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MIMALLOC_ENV_KEYS;
deferInit("chunk-ex0jqs9a.js:12964", () => {
  BUN_GC_ENV_KEYS = new Set([
    "BUN_GC_TIMER_INTERVAL",
    "BUN_GC_TIMER_DISABLE",
    "BUN_GC_RUNS_UNTIL_SKIP_RELEASE_ACCESS",
    "BUN_IDLE_GC_SECONDS",
  ]);
  MIMALLOC_ENV_KEYS = new Set([
    "MIMALLOC_PURGE_HOLES_MIN_INTERVAL",
    "MIMALLOC_PURGE_DELAY",
    "MIMALLOC_PURGE_HOLES",
  ]);
});
//@ chunk-ex0jqs9a.js:13187-13923 placement
function isRuntimeTuningEnvKey(name) {
  let upper = name.toUpperCase();
  return (
    upper.startsWith("BUN_JSC_") ||
    upper.startsWith("BUN_AOT_") ||
    BUN_GC_ENV_KEYS.has(upper) ||
    MIMALLOC_ENV_KEYS.has(upper) ||
    upper === "CLAUDE_CODE_COUNT_GARBAGE_COLLECTIONS" ||
    upper === "CLAUDE_CODE_STREAM_EVENT_HOLD_MS" ||
    upper === "CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES" ||
    upper === "CLAUDE_CODE_INCREMENTAL_REQUEST_BODY" ||
    upper === "CLAUDE_CODE_PLAIN_DELTA_FAST_PATH" ||
    upper === "CLAUDE_CODE_PLAIN_DELTA_DIRECT_WRITE" ||
    upper === "CLAUDE_CODE_PLAIN_DELTA_TAKE_AT_SOURCE" ||
    upper === "CLAUDE_CODE_STREAM_TIMER_SLACK_MS" ||
    upper === "CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS" ||
    upper === "CLAUDE_CODE_MAIN_REPLY_HOLD_MS" ||
    upper === "CLAUDE_CODE_REMOTE_STALL_CHECK_INTERVAL_MS" ||
    upper === "CLAUDE_CODE_CCR_ONE_PLUGIN_LOAD_PER_RELOAD" ||
    upper === "CLAUDE_CODE_CCR_SLOW_SKILLS_WATCH" ||
    upper === "CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES"
  );
}
//@ chunk-ex0jqs9a.js:13923-19667 placement
function subprocessEnv(baseEnv) {
  let hostState = subprocessEnvStateByHost.of(getRootSession().host);
  let agentProxyEnv = hostState.getAgentProxyEnv?.() ?? {};
  let hasAgentProxy = Object.keys(agentProxyEnv).length > 0;
  let { settingsEnvForChildren } = hostState;
  let hasSettingsEnv = Object.keys(settingsEnvForChildren).length > 0;
  let env_2 = process.env;
  if (hasSettingsEnv || baseEnv !== undefined) {
    env_2 = {
      ...baseEnv,
      ...process.env,
    };
    for (let [key, value] of Object.entries(settingsEnvForChildren)) env_2[spellingIn(env_2, key)] = value;
  }
  let isRemote = env.CLAUDE_CODE_REMOTE === true;
  let proxyEnv = isRemote
    ? proxyEnvForSubprocess(
        hasAgentProxy
          ? {
              ...env_2,
              ...agentProxyEnv,
            }
          : env_2,
      )
    : {};
  let hasProxyEnv = Object.keys(proxyEnv).length > 0;
  let scrubbing = shouldScrubSubprocessEnv();
  let hipaaCredentialsPresent =
    Object.keys(process.env).some((key) => HIPAA_CREDENTIAL_KEY_SET.has(key.toUpperCase())) ||
    Object.keys(process.env).some((key) => isChildScrubbedCredentialFamily(key.toUpperCase())) ||
    process.env.CLAUDE_CODE_SUBSCRIPTION_TYPE !== undefined ||
    process.env.CLAUDE_CODE_RATE_LIMIT_TIER !== undefined;
  let hostManagedProviderConflicts = getHostManagedProviderConflicts(process.env);
  let bridgeEnvNames = ccrBridgeEnvVarNames();
  let sessionTokenEnvKeys = getSessionTokenEnvKeys();
  let hipaaSheds =
    hipaaWithholdsChildCredentials() &&
    Object.keys(process.env).some((key) => CHILD_SCRUBBED_CREDENTIAL_KEY_SET.has(envVarToUpperSnake(key)));
  let workerIdentityPresent = false;
  workerIdentityPresent = BG_WORKER_IDENTITY_ENV_VARS.some((name) => process.env[name] !== undefined);
  let any = Object.keys(process.env).some((key) =>
    /^(INPUT_)?(OTEL_|CLAUDE_CODE_OTEL_DIAG_STDERR$)/i.test(key),
  );
  let hasAttribution =
    env.CLAUDE_CODE_PLUGIN_ATTRIBUTION !== undefined || env.CLAUDE_CODE_SKILL_ATTRIBUTION !== undefined;
  let hasQuestionFlags = env.CLAUDE_CODE_QUESTION_EXTENDED || env.CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS;
  let CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES = env.CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES;
  let hasSdkOAuthRefresh =
    env.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH || env.CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH;
  let CLAUDE_CODE_SDK_READS_SESSION_STATE = env.CLAUDE_CODE_SDK_READS_SESSION_STATE;
  let CLAUDE_CODE_SDK_READS_STARTUP_MARKS = env.CLAUDE_CODE_SDK_READS_STARTUP_MARKS;
  let pinnedLogin = isStoredLoginPinned();
  let remoteToolsUnattended = env.CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED;
  let any_2 = Object.keys(env_2).some(
    (key) => key.toUpperCase() === "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
  );
  let any_3 = Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_REMOTE_TOOLS_FORWARD");
  let hasBridgeChildFlags =
    env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT ||
    env.CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT ||
    env.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS ||
    env.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT ||
    env.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT;
  let CLAUDE_CODE_CONFIG_PROBE = env.CLAUDE_CODE_CONFIG_PROBE;
  let hasMcpStartupWait = env.CLAUDE_CODE_MCP_STARTUP_WAIT_MS !== undefined;
  let CLAUDE_CODE_REMOTE_MCP_CONFIG = env.CLAUDE_CODE_REMOTE_MCP_CONFIG;
  let CLAUDE_CODE_MCP_APPS_HOST = env.CLAUDE_CODE_MCP_APPS_HOST;
  let hasUpfrontTools = env.CLAUDE_CODE_UPFRONT_TOOLS !== undefined;
  let CLAUDE_CODE_ATTACHMENTS_BY_PATH = env.CLAUDE_CODE_ATTACHMENTS_BY_PATH;
  let hasSleepCompact = env.CLAUDE_CODE_PROGRAM_USE_CASE_ID !== undefined;
  let hasSleepCompactFlag =
    env.CLAUDE_CODE_SLEEP_COMPACT || env.CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS !== undefined;
  let hasResumeHookWait = env.CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS !== undefined;
  let hasArtifactShare = env.CLAUDE_CODE_ARTIFACT_SHARE !== undefined;
  let CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST = env.CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST;
  let any_4 = Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_ARTIFACT_VERSIONS");
  let any_5 = Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP");
  let hasResourceWarn =
    env.CLAUDE_CODE_WARN_DISK_FREE_GIB !== undefined ||
    env.CLAUDE_CODE_WARN_MEMORY_FREE_GIB !== undefined ||
    env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY;
  let hasChromeTabGroupKey = env.CLAUDE_CHROME_TAB_GROUP_KEY !== undefined;
  let any_6 = Object.keys(env_2).some(
    (key) => key.toUpperCase() === "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
  );
  let hasPromptSupersedesRecord = env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD;
  let hasMcpServeFlags =
    toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_SETTINGS !== undefined ||
    toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS !== undefined ||
    toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT !== undefined;
  let hasReplyGatePolicy = env.CLAUDE_CODE_REPLY_GATE_POLICY !== undefined;
  let hasProactivityVar = false;
  hasProactivityVar = Object.keys(env_2).some(isRelaunchProactivityVar);
  let hasRuntimeTuningKey = isRemote && Object.keys(env_2).some(isRuntimeTuningEnvKey);
  let forceScrub = false;
  if (
    baseEnv === undefined &&
    !hasAgentProxy &&
    !hasProxyEnv &&
    !scrubbing &&
    !workerIdentityPresent &&
    !hipaaCredentialsPresent &&
    !hostManagedProviderConflicts.length &&
    !bridgeEnvNames.length &&
    !sessionTokenEnvKeys.length &&
    !hipaaSheds &&
    !any &&
    !hasSettingsEnv &&
    !hasAttribution &&
    !hasQuestionFlags &&
    !CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES &&
    !hasSdkOAuthRefresh &&
    !CLAUDE_CODE_SDK_READS_SESSION_STATE &&
    !CLAUDE_CODE_SDK_READS_STARTUP_MARKS &&
    !pinnedLogin &&
    !remoteToolsUnattended &&
    !any_2 &&
    !any_3 &&
    !hasBridgeChildFlags &&
    !CLAUDE_CODE_CONFIG_PROBE &&
    !hasMcpStartupWait &&
    !CLAUDE_CODE_REMOTE_MCP_CONFIG &&
    !CLAUDE_CODE_MCP_APPS_HOST &&
    !hasUpfrontTools &&
    !CLAUDE_CODE_ATTACHMENTS_BY_PATH &&
    !hasSleepCompact &&
    !hasSleepCompactFlag &&
    !hasResumeHookWait &&
    !hasArtifactShare &&
    !CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST &&
    !hasResourceWarn &&
    !any_4 &&
    !any_5 &&
    !hasChromeTabGroupKey &&
    !any_6 &&
    !hasPromptSupersedesRecord &&
    !hasMcpServeFlags &&
    !hasReplyGatePolicy &&
    !hasProactivityVar &&
    !hasRuntimeTuningKey &&
    !forceScrub
  )
    return process.env;
  let mergedProxyEnv = {
    ...agentProxyEnv,
    ...proxyEnv,
  };
  let envOut = {
    ...env_2,
  };
  for (let key of Object.keys(mergedProxyEnv)) {
    let existingKey = spellingIn(envOut, key);
    if (existingKey !== key) delete envOut[existingKey];
  }
  Object.assign(envOut, mergedProxyEnv);
  let scrubKeySet = new Set(
    [
      ...childScrubbedCredentialKeys(),
      "CLAUDE_CODE_SUBSCRIPTION_TYPE",
      "CLAUDE_CODE_RATE_LIMIT_TIER",
      "CLAUDE_CODE_QUESTION_EXTENDED",
      "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS",
      "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES",
      "CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH",
      "CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH",
      "CLAUDE_CODE_SDK_READS_SESSION_STATE",
      "CLAUDE_CODE_SDK_READS_STARTUP_MARKS",
      "CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN",
      "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED",
      "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
      "CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT",
      "CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT",
      "CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS",
      "CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT",
      "CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT",
      "CLAUDE_CODE_CONFIG_PROBE",
      "CLAUDE_CODE_MCP_STARTUP_WAIT_MS",
      "CLAUDE_CODE_REMOTE_MCP_CONFIG",
      "CLAUDE_CODE_REPLY_GATE_POLICY",
      "CLAUDE_CODE_MCP_APPS_HOST",
      "CLAUDE_CODE_UPFRONT_TOOLS",
      "CLAUDE_CODE_ATTACHMENTS_BY_PATH",
      "CLAUDE_CODE_PROGRAM_USE_CASE_ID",
      "CLAUDE_CODE_SLEEP_COMPACT",
      "CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS",
      "CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS",
      "CLAUDE_CODE_ARTIFACT_SHARE",
      "CLAUDE_CODE_ARTIFACT_VERSIONS",
      "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP",
      "CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST",
      "CLAUDE_CODE_WARN_DISK_FREE_GIB",
      "CLAUDE_CODE_WARN_MEMORY_FREE_GIB",
      "CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY",
      "CLAUDE_CHROME_TAB_GROUP_KEY",
      "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
    ].map((name) => name.toUpperCase()),
  );
  for (let key of Object.keys(envOut))
    if (
      scrubKeySet.has(key.toUpperCase()) ||
      isChildScrubbedCredentialFamily(key.toUpperCase()) ||
      (HIPAA_CREDENTIAL_KEY_SET.has(key.toUpperCase()) && !isSshPlaceholderCredential(key, envOut)) ||
      (hipaaSheds &&
        CHILD_SCRUBBED_CREDENTIAL_KEY_SET.has(envVarToUpperSnake(key)) &&
        (key.includes("-") || !isSshPlaceholderCredential(key, envOut)))
    )
      delete envOut[key];
  for (let name of BG_WORKER_IDENTITY_ENV_VARS) delete envOut[name];
  if (withholdsDaemonForceColor()) delete envOut[spellingIn(envOut, "FORCE_COLOR")];
  for (let key of Object.keys(envOut)) if (key.startsWith("OTEL_")) delete envOut[key];
  delete envOut.CLAUDE_CODE_OTEL_DIAG_STDERR;
  delete envOut.CLAUDE_CODE_PLUGIN_ATTRIBUTION;
  delete envOut.CLAUDE_CODE_SKILL_ATTRIBUTION;
  if (hasProactivityVar) {
    for (let key of Object.keys(envOut)) if (isRelaunchProactivityVar(key)) delete envOut[key];
  }
  if (hasRuntimeTuningKey) {
    for (let key of Object.keys(envOut)) if (isRuntimeTuningEnvKey(key)) delete envOut[key];
  }
  if (!scrubbing) return envOut;
  let scrubbedEnvNames_2 = getScrubbedEnvNames();
  let hasScrubbedNames = scrubbedEnvNames().length > 0;
  for (let [key, value] of Object.entries(envOut)) {
    if (value === PROXY_INJECTED_MARKER && Object.hasOwn(agentProxyEnv, key)) continue;
    if (isSshPlaceholderCredential(key, envOut)) continue;
    if (
      scrubbedEnvNames_2.has(envVarToUpperSnake(key)) ||
      BUNDLE_CREDENTIAL_ENV_REGEX.test(key) ||
      isCredentialUserEnv(key) ||
      (hasScrubbedNames && armedRunnerShedsName(key))
    ) {
      delete envOut[key];
      continue;
    }
    if (value === undefined || isGitConfigOrProxyEnvName(key)) continue;
    let text = typeof value === "string" ? value : String(value);
    if (isPackageIndexEnv(key)) {
      let sanitized = sanitizeIndexUrlEnv(key, text);
      if (sanitized.value !== text) envOut[key] = sanitized.value;
      if (sanitized.cut) {
        let fallback = indexFallbackEnv(key, sanitized.value);
        if (fallback !== undefined && !hasAnyIndexEnv(envOut, fallback.name))
          envOut[fallback.name] = fallback.value;
      }
      continue;
    }
    let redacted = redactJvmOptionsEnvValue(key, text);
    if (redacted === undefined) {
      if (containsCredential(text)) delete envOut[key];
    } else if (redacted !== text)
      if (redacted === "") delete envOut[key];
      else envOut[key] = redacted;
  }
  return envOut;
}
//@ chunk-ex0jqs9a.js:19667-19824 placement
function shouldUseMcpAllowlistEnv() {
  let envClaudeCodeMcpAllowlistEnv = process.env.CLAUDE_CODE_MCP_ALLOWLIST_ENV;
  if (isEnvTruthy(envClaudeCodeMcpAllowlistEnv)) return true;
  if (isEnvDefinedFalsy(envClaudeCodeMcpAllowlistEnv)) return false;
  return process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent";
}
//@ chunk-ex0jqs9a.js:19824-20025 placement
/**
 * 从子进程环境里删掉值为空的 AWS_BEARER_TOKEN_BEDROCK（Windows 忽略大小写）。
 */
function dropEmptyBedrockBearer(stdioEnv) {
  let isWindows = getPlatform() === "windows";
  let filtered = Object.keys(stdioEnv).filter(
    (key) =>
      key === "AWS_BEARER_TOKEN_BEDROCK" || (isWindows && key.toUpperCase() === "AWS_BEARER_TOKEN_BEDROCK"),
  );
  if (filtered.some((key) => stdioEnv[key] === "")) for (let key of filtered) delete stdioEnv[key];
}
//@ chunk-ex0jqs9a.js:20025-22116 placement
function scrubSandboxConfig() {
  let scrubPathsLatched = subprocessEnvState.scrubPathsLatched;
  let homeDir = scrubPathsLatched?.home ?? homedir();
  let filePath = scrubPathsLatched?.originalCwd ?? getOriginalCwd();
  let GITHUB_ACTION_PATH = scrubPathsLatched?.GITHUB_ACTION_PATH ?? process.env.GITHUB_ACTION_PATH;
  let runnerCommandsDir =
    scrubPathsLatched?.runnerFileCommandsDir ??
    (process.env.GITHUB_ENV ? dirname(process.env.GITHUB_ENV) : undefined);
  let workspace = scrubPathsLatched?.workspace ?? process.env.GITHUB_WORKSPACE;
  let workspacePaths =
    workspace && posix.resolve(workspace) !== posix.resolve(filePath)
      ? [
          `${workspace}/.git/hooks`,
          `${workspace}/.git/config`,
          `${workspace}/.git/config.lock`,
          `${workspace}/.git/config.worktree`,
          `${workspace}/.git/config.worktree.lock`,
          `${workspace}/.git/commondir`,
          `${workspace}/.git/worktrees`,
          `${workspace}/.git/modules`,
          `${workspace}/.git/info/exclude`,
          `${workspace}/.git/glab-cli`,
          `${workspace}/.gitmodules`,
          `${workspace}/.github`,
          `${workspace}/.claude`,
        ]
      : [];
  return {
    filesystem: {
      allowWrite: SYSTEM_TOP_DIRS,
      denyRead: [
        "/run/docker.sock",
        "/run/containerd/containerd.sock",
        "/run/podman/podman.sock",
        "/run/buildkit/buildkitd.sock",
        "/run/dbus",
        "/run/user",
        scrubPathsLatched?.federationCacheDir ?? federationCacheDir(),
      ].filter((path) => !!path),
      denyWrite: [
        `${homeDir}/.bash_profile`,
        `${homeDir}/.bashrc`,
        `${homeDir}/.bash_aliases`,
        `${homeDir}/.bash_login`,
        `${homeDir}/.bash_logout`,
        `${homeDir}/.profile`,
        `${homeDir}/.zshrc`,
        `${homeDir}/.zprofile`,
        `${homeDir}/.zshenv`,
        `${homeDir}/.zlogin`,
        `${homeDir}/.zlogout`,
        `${homeDir}/.claude`,
        `${homeDir}/.claude.json`,
        scrubPathsLatched?.claudeConfigDir ?? process.env.CLAUDE_CONFIG_DIR,
        `${homeDir}/.gitconfig`,
        `${homeDir}/.config/git`,
        `${homeDir}/.bunfig.toml`,
        `${filePath}/bunfig.toml`,
        `${filePath}/package.json`,
        ...DOTENV_FILE_NAMES.map((name) => `${filePath}/${name}`),
        `${homeDir}/.npmrc`,
        `${filePath}/.npmrc`,
        `${homeDir}/.yarnrc`,
        `${homeDir}/.yarnrc.yml`,
        `${filePath}/.yarnrc`,
        `${filePath}/.yarnrc.yml`,
        `${homeDir}/.config/pip`,
        `${homeDir}/.pip`,
        `${filePath}/package-lock.json`,
        `${filePath}/yarn.lock`,
        `${filePath}/pnpm-lock.yaml`,
        `${filePath}/node_modules/.bin`,
        `${filePath}/.git/modules`,
        `${filePath}/scripts`,
        `${filePath}/.claude`,
        ...(scrubPathsLatched?.canonicalClaudeDirs ?? isInClaudeFolder(filePath)),
        `${filePath}/.github`,
        `${homeDir}/.local/bin`,
        `${homeDir}/runners`,
        `${homeDir}/actions-runner`,
        "/tmp/inline-comments-buffer.jsonl",
        ...(scrubPathsLatched?.pathDirs ?? []),
        runnerCommandsDir,
        GITHUB_ACTION_PATH,
        GITHUB_ACTION_PATH && GITHUB_ACTION_PATH.includes("/_actions/")
          ? GITHUB_ACTION_PATH.slice(0, GITHUB_ACTION_PATH.indexOf("/_actions/") + 9)
          : undefined,
        scrubPathsLatched?.GITHUB_EVENT_PATH ?? process.env.GITHUB_EVENT_PATH,
        `${homeDir}/.config/gh`,
        `${homeDir}/.config/glab-cli`,
        `${homeDir}/.netrc`,
        `${homeDir}/.ssh`,
        `${filePath}/.git/hooks`,
        `${filePath}/.git/config`,
        `${filePath}/.git/config.lock`,
        `${filePath}/.git/config.worktree`,
        `${filePath}/.git/config.worktree.lock`,
        `${filePath}/.git/commondir`,
        `${filePath}/.git/worktrees`,
        `${filePath}/.gitmodules`,
        `${filePath}/.git/info/exclude`,
        `${filePath}/.git/glab-cli`,
        ...workspacePaths,
      ].filter((path) => !!path),
    },
  };
}
//@ chunk-ex0jqs9a.js:22116-22187 placement
function isRelaunchProactivityVar(name) {
  return name.startsWith("CLAUDE_CODE_RELAUNCH_PROACTIVITY_");
}
//@ chunk-ex0jqs9a.js:22187-22193 placement
var scrubbedEnvNamesCache;
//@ chunk-ex0jqs9a.js:22193-22330 placement
function getScrubbedEnvNames() {
  let armedNames = scrubbedEnvNames();
  let armed = armedNames.length > 0;
  if (scrubbedEnvNamesCache?.armed !== armed)
    scrubbedEnvNamesCache = {
      armed,
      names: new Set([...flattened, ...armedNames].map((name) => name.toUpperCase())),
    };
  return scrubbedEnvNamesCache.names;
}
//@ chunk-3emqeq9c.js:8340-8395 fingerprint (2.1.88 match: subprocessEnv, 0.782)
function subprocessEnv_2(names) {
  return names.flatMap((name) => [name, `INPUT_${name}`]);
}
export {
  subprocessEnv,
  shouldUseMcpAllowlistEnv,
  agentProxyEnv,
  dropEmptyBedrockBearer,
  isScrubEnabled,
  subprocessEnv_2,
  isScrubSandboxAvailable,
  SSH_PLACEHOLDER,
  inheritedByChildren,
  enforceScriptCaps,
  scrubSandboxConfig,
  getBgDispatcherPlanInfo,
  BG_WORKER_IDENTITY_ENV_VARS,
  isChildScrubbedCredentialFamily,
  shouldScrubSubprocessEnv,
  armedRunnerShedsName,
  childScrubbedCredentialKeys,
  hipaaWithholdsChildCredentials,
  ghStandinDir,
  hipaaCredentialScrubKeys,
  withholdsDaemonForceColor,
  getSandboxBwrapPath,
  getSandboxSocatPath,
  spellingIn,
  settingsPathForChildren,
  BG_DISPATCHER_IDENTITY_ENV_VARS,
  setSettingsEnvForChildren,
  holdsDaemonForceColor,
  isSshPlaceholderAuth,
  proxyEnvForSubprocess,
  settingsEnvKeptForChildren,
  PROXY_INJECTED_MARKER,
  isArtifactDevBaseUrlVar,
  federationCacheDir,
  assertScrubSandboxAvailable,
  buildBgDispatcherEnv,
  registerAgentProxyEnvFn,
  registerGhStandinDirFn,
};
