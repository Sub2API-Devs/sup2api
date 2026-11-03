/**
 * utils/subprocessEnv.ts
 *
 * 构造子进程环境变量（过滤 GitHub Actions INPUT_* 等敏感变量）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/subprocessEnv.ts
 * pieces: chunk-3zy56vtn.js (1), chunk-rtnapjwv.js (57)
 * attribution: fingerprint 1, placement 57
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

//@ chunk-rtnapjwv.js:944-970 placement
var SSH_PLACEHOLDER = "ssh-placeholder";
//@ chunk-rtnapjwv.js:970-1152 placement
/**
 * 判断环境是否为 SSH 远程转发的占位认证：存在 ANTHROPIC_UNIX_SOCKET、没有 auth token，且 OAuth token 或 API key 之一为 ssh-placeholder 而另一个为空。
 */
function isSshPlaceholderAuth(e) {
  let { CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY } = e;
  return (
    !!e.ANTHROPIC_UNIX_SOCKET &&
    !e.ANTHROPIC_AUTH_TOKEN &&
    ((CLAUDE_CODE_OAUTH_TOKEN === "ssh-placeholder" && !ANTHROPIC_API_KEY) ||
      (ANTHROPIC_API_KEY === "ssh-placeholder" && !CLAUDE_CODE_OAUTH_TOKEN))
  );
}
//@ chunk-rtnapjwv.js:1152-1242 placement
/**
 * 后台调度子进程的订阅类型与限速等级环境变量名。
 */
var BG_DISPATCHER_IDENTITY_ENV_VARS = [
  "CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE",
  "CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER",
];
//@ chunk-rtnapjwv.js:1242-1424 placement
/**
 * 生成传给后台调度子进程的订阅类型与限速等级环境变量。
 */
function buildBgDispatcherEnv(e) {
  return {
    ...(e.subscriptionType && {
      CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE: e.subscriptionType,
    }),
    ...(e.rateLimitTier && {
      CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER: e.rateLimitTier,
    }),
  };
}
//@ chunk-rtnapjwv.js:1424-1664 placement
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
//@ chunk-rtnapjwv.js:1766-1922 placement
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
//@ chunk-rtnapjwv.js:1922-1946 placement
/**
 * 代理注入标记。
 */
var PROXY_INJECTED_MARKER = "proxy-injected";
//@ chunk-rtnapjwv.js:1946-2023 placement
/**
 * 取策略设置里第一个 bwrap 路径。
 */
function getSandboxBwrapPath() {
  return getAllPolicyTierSettings()
    .map((e) => e.sandbox?.bwrapPath)
    .find((e) => e != null);
}
//@ chunk-rtnapjwv.js:2023-2100 placement
/**
 * 取策略设置里第一个 socat 路径。
 */
function getSandboxSocatPath() {
  return getAllPolicyTierSettings()
    .map((e) => e.sandbox?.socatPath)
    .find((e) => e != null);
}
//@ chunk-rtnapjwv.js:2164-2189 placement
var PROXY_VALUE_UNSAFE_RE = /[ \t\n\v\f\r'"]/;
//@ chunk-rtnapjwv.js:2189-3109 placement
/**
 * 为子进程生成代理环境变量（含 Java 参数）。
 */
function proxyEnvForSubprocess(env) {
  let n = env.HTTP_PROXY || env.http_proxy || env.CLAUDE_CODE_HTTP_PROXY;
  let r = env.HTTPS_PROXY || env.https_proxy || env.CLAUDE_CODE_HTTPS_PROXY;
  let s = noProxyUnion(env);
  if (!n && !r) return {};
  let proxyUrl = parseProxyUrl(n);
  let proxyUrl_2 = parseProxyUrl(r);
  if (!proxyUrl_2.host) proxyUrl_2 = proxyUrl;
  let _ = {};
  let a = (O, E) => {
    if (E && env[O] === undefined) _[O] = E;
  };
  a("YARN_HTTP_PROXY", n);
  a("YARN_HTTPS_PROXY", r);
  a("npm_config_proxy", n);
  a("npm_config_https_proxy", r);
  a("npm_config_noproxy", s);
  a("GLOBAL_AGENT_HTTP_PROXY", n);
  a("GLOBAL_AGENT_HTTPS_PROXY", r);
  a("GLOBAL_AGENT_NO_PROXY", s);
  a("ELECTRON_GET_USE_PROXY", "1");
  a("DOCKER_HTTP_PROXY", n);
  a("DOCKER_HTTPS_PROXY", r);
  if (proxyUrl_2.host) {
    a("CLOUDSDK_PROXY_TYPE", "http");
    a("CLOUDSDK_PROXY_ADDRESS", proxyUrl_2.host);
    a("CLOUDSDK_PROXY_PORT", proxyUrl_2.port);
    a("CLOUDSDK_PROXY_USERNAME", proxyUrl_2.user);
    a("CLOUDSDK_PROXY_PASSWORD", proxyUrl_2.pass);
  }
  a("FSSPEC_GCS", '{"session_kwargs": {"trust_env": true}}');
  if (proxyUrl_2.host) {
    let JAVA_TOOL_OPTIONS = env.JAVA_TOOL_OPTIONS;
    if (!JAVA_TOOL_OPTIONS?.includes("-Dhttps.proxyHost=")) {
      let E = javaProxyArgs(proxyUrl, proxyUrl_2, s);
      _.JAVA_TOOL_OPTIONS = JAVA_TOOL_OPTIONS ? `${JAVA_TOOL_OPTIONS} ${E}` : E;
    }
  }
  return _;
}
//@ chunk-rtnapjwv.js:3109-3512 placement
/**
 * 解析代理 URL 为主机、端口、用户、密码。
 */
function parseProxyUrl(e) {
  if (!e)
    return {
      host: "",
      port: "",
      user: "",
      pass: "",
    };
  try {
    let n = new URL(e);
    if (!n.hostname)
      return {
        host: "",
        port: "",
        user: "",
        pass: "",
      };
    return {
      host: n.hostname.startsWith("[") && n.hostname.endsWith("]") ? n.hostname.slice(1, -1) : n.hostname,
      port: n.port || (n.protocol === "https:" ? "443" : "80"),
      user: decodeURIComponent(n.username),
      pass: decodeURIComponent(n.password),
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
//@ chunk-rtnapjwv.js:3512-3978 placement
/**
 * 生成 Java 代理系统属性参数。
 */
function javaProxyArgs(proxyUrl, proxyUrl_2, r) {
  let s = [];
  let C = (c, _) => {
    if (_ && !PROXY_VALUE_UNSAFE_RE.test(_)) s.push(`-D${c}=${_}`);
  };
  C("http.proxyHost", proxyUrl.host);
  C("http.proxyPort", proxyUrl.port);
  C("https.proxyHost", proxyUrl_2.host);
  C("https.proxyPort", proxyUrl_2.port);
  C("http.proxyUser", proxyUrl.user);
  C("http.proxyPassword", proxyUrl.pass);
  C("https.proxyUser", proxyUrl_2.user);
  C("https.proxyPassword", proxyUrl_2.pass);
  if (r) C("http.nonProxyHosts", toNoProxyPattern(r));
  s.push("-Djdk.http.auth.tunneling.disabledSchemes=");
  s.push("-Djdk.http.auth.proxying.disabledSchemes=");
  return s.join(" ");
}
//@ chunk-rtnapjwv.js:3978-4134 placement
function toNoProxyPattern(e) {
  return e
    .split(/[,\s]+/)
    .map((n) => n.trim())
    .filter(Boolean)
    .flatMap((n) => {
      if (n.startsWith(".")) return [`*${n}`];
      return parseIpv4Cidr(n) ?? [n];
    })
    .join("|");
}
//@ chunk-rtnapjwv.js:4134-4560 placement
/**
 * 解析 IPv4 CIDR。
 */
function parseIpv4Cidr(e) {
  let match = e.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return;
  let r = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  let s = Number(match[5]);
  if (r.some((E) => E > 255) || s < 8 || s > 24) return [e];
  let floored = Math.floor(s / 8);
  let c = s % 8;
  if (c === 0) return [`${r.slice(0, floored).join(".")}.*`];
  let _ = 2 ** (8 - c);
  if (_ > 16) return [e];
  let a = r[floored] - (r[floored] % _);
  let O = [];
  for (let E = a; E < a + _; E++) O.push(`${[...r.slice(0, floored), E].join(".")}.*`);
  return O;
}
//@ chunk-rtnapjwv.js:4560-5201 placement
var BG_WORKER_IDENTITY_ENV_VARS = [
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
  ...BG_DISPATCHER_IDENTITY_ENV_VARS,
];
//@ chunk-rtnapjwv.js:5201-5741 placement
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
//@ chunk-rtnapjwv.js:5741-5780 placement
var subprocessEnvState = identity(new SubprocessEnvState(), (e) => {
  e.reset();
  clearSanitizedEnvCache();
});
//@ chunk-rtnapjwv.js:5780-5885 placement
class SubprocessEnvState_2 {
  getAgentProxyEnv = undefined;
  getGhStandinDir = undefined;
  settingsEnvForChildren = {};
  hipaaTierNoticeGiven = false;
}
//@ chunk-rtnapjwv.js:5885-5908 placement
var subprocessEnvStateByHost = new HostScoped(() => new SubprocessEnvState_2());
//@ chunk-rtnapjwv.js:5908-6065 placement
function isScrubEnabled() {
  let scrubEnabledLatched = subprocessEnvState.scrubEnabledLatched;
  if (scrubEnabledLatched !== undefined) return scrubEnabledLatched;
  let n = isEnvTruthy(process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB);
  subprocessEnvState.setScrubEnabledLatched(n);
  return n;
}
//@ chunk-rtnapjwv.js:6065-6216 placement = isReplModeEnabled (0.161)
/**
 * REPL 模式：If() 为真，或未显式关闭 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 且入口为 local-agent。外部构建 getReplTool 恒 null，REPL 工具实际不存在。
 */
function shouldScrubSubprocessEnv() {
  if (isScrubEnabled()) return true;
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)) return false;
  return process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent";
}
//@ chunk-rtnapjwv.js:6216-6432 placement
var DOTENV_FILE_NAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.test",
  ".env.test.local",
  ".env.production",
  ".env.production.local",
];
var SYSTEM_TOP_DIRS = ["home", "root", "tmp", "var", "opt", "run", "mnt"].map((e) => `/${e}`);
var CURRENT_DIR = ".";
//@ chunk-rtnapjwv.js:6432-6535 placement = isInClaudeFolder (1)
function isInClaudeFolder(filePath) {
  let n = new Set();
  for (let r of [storageRootFor, findCanonicalGitRoot, noUncachedRoot])
    try {
      n.add(`${resolveLocalSettingsStoreRoot(filePath, r)}/.claude`);
    } catch {}
  return [...n];
}
//@ chunk-rtnapjwv.js:6535-6650 placement
function isScrubSandboxAvailable() {
  if (subprocessEnvState.scrubSandboxAvailableLatched !== undefined)
    return subprocessEnvState.scrubSandboxAvailableLatched;
  return sandboxBinaryPath() !== null;
}
//@ chunk-rtnapjwv.js:6650-9707 placement
async function assertScrubSandboxAvailable() {
  initEnvScrubFlag();
  if (!isScrubEnabled()) return;
  let e = homedir();
  let filePath = getOriginalCwd();
  let r = process.env.GITHUB_ENV ? dirname(process.env.GITHUB_ENV) : undefined;
  let envGithubWorkspace = process.env.GITHUB_WORKSPACE;
  subprocessEnvState.setScrubSandboxAvailableLatched(sandboxBinaryPath() !== null);
  let filtered = (process.env.PATH ?? "")
    .split(":")
    .map((E) => (E ? posix.normalize(E).replace(/\/+$/, "") : E))
    .filter((E) => E && SYSTEM_TOP_DIRS.some((D) => E.startsWith(`${D}/`)));
  subprocessEnvState.setScrubPathsLatched({
    home: e,
    originalCwd: filePath,
    claudeConfigDir: process.env.CLAUDE_CONFIG_DIR,
    federationCacheDir: federationCacheDir() ?? undefined,
    canonicalClaudeDirs: isInClaudeFolder(filePath),
    runnerFileCommandsDir: r,
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
  for (let E of [
    `${e}/.gitconfig`,
    `${e}/.bash_profile`,
    `${e}/.bashrc`,
    `${e}/.bash_aliases`,
    `${e}/.profile`,
    `${e}/.zshrc`,
    `${e}/.bunfig.toml`,
    `${e}/.netrc`,
    `${e}/.npmrc`,
    `${e}/.yarnrc`,
    `${e}/.yarnrc.yml`,
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
    ...DOTENV_FILE_NAMES.map((D) => `${filePath}/${D}`),
  ])
    try {
      await mkdir(dirname(E), {
        recursive: true,
      });
      await (await open(E, "a")).close();
    } catch {}
  for (let E of [
    `${e}/.config/gh`,
    `${e}/.config/glab-cli`,
    `${e}/.config/git`,
    `${e}/.config/pip`,
    `${e}/.pip`,
    `${filePath}/.claude/commands`,
    `${filePath}/.claude/agents`,
    `${filePath}/node_modules/.bin`,
    ...(r ? [r] : []),
    ...filtered,
  ])
    try {
      await mkdir(E, {
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
    for (let E of [
      `${envGithubWorkspace}/.git/config`,
      `${envGithubWorkspace}/.git/config.worktree`,
      `${envGithubWorkspace}/.git/info/exclude`,
      `${envGithubWorkspace}/.gitmodules`,
    ])
      try {
        await (await open(E, "a")).close();
      } catch {}
    try {
      let E = await open(`${envGithubWorkspace}/.git/commondir`, "wx");
      await E.writeFile(CURRENT_DIR);
      await E.close();
    } catch {}
  }
  let O = [
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
    let E = await open(`${filePath}/.git/commondir`, "wx");
    await E.writeFile(CURRENT_DIR);
    await E.close();
  } catch {}
  try {
    await appendFile(
      `${filePath}/.git/info/exclude`,
      `
# claude-code scrub-mode stubs
${O.map((E) => `/${E}`).join(`
`)}
`,
    );
  } catch {}
}
//@ chunk-rtnapjwv.js:9707-10109 placement
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
    let n = jsonParse(envClaudeCodeScriptCaps);
    if (n && typeof n === "object" && !Array.isArray(n)) {
      let r = pickByHelper(n, (s, C) => typeof s === "number" && Number.isFinite(s) && C.trim().length > 0);
      subprocessEnvState.setScriptCapsLatched(Object.keys(r).length > 0 ? r : null);
    } else subprocessEnvState.setScriptCapsLatched(null);
  } catch {
    subprocessEnvState.setScriptCapsLatched(null);
  }
}
//@ chunk-rtnapjwv.js:10109-10518 placement
function enforceScriptCaps(e) {
  if (!isScrubEnabled()) return;
  latchScriptCaps();
  if (!subprocessEnvState.scriptCapsLatched) return;
  let { scriptCapsLatched, scriptCallCounts } = subprocessEnvState;
  for (let [key, value] of Object.entries(scriptCapsLatched)) {
    let c = e.split(key).length - 1;
    if (c > 0) {
      let _ = (scriptCallCounts.get(key) ?? 0) + c;
      scriptCallCounts.set(key, _);
      if (_ > value)
        throw Error(
          `Script call limit exceeded: ${key} has been called ${_} times (cap: ${value}). This limit prevents data exfiltration via repeated write operations in untrusted-input workflows.`,
        );
    }
  }
}
//@ chunk-rtnapjwv.js:10518-10568 placement
function registerAgentProxyEnvFn(getAgentProxyEnv) {
  subprocessEnvStateByHost.of(getRootSession().host).getAgentProxyEnv = getAgentProxyEnv;
}
//@ chunk-rtnapjwv.js:10568-10617 placement
function registerGhStandinDirFn(getGhStandinDir) {
  subprocessEnvStateByHost.of(getRootSession().host).getGhStandinDir = getGhStandinDir;
}
//@ chunk-rtnapjwv.js:10617-10679 placement
function agentProxyEnv() {
  return subprocessEnvStateByHost.of(getRootSession().host).getAgentProxyEnv?.() ?? {};
}
//@ chunk-rtnapjwv.js:10679-10736 placement
function ghStandinDir() {
  return subprocessEnvStateByHost.of(getRootSession().host).getGhStandinDir?.();
}
//@ chunk-rtnapjwv.js:10736-10792 placement
function setSettingsEnvForChildren(settingsEnvForChildren) {
  subprocessEnvStateByHost.of(getRootSession().host).settingsEnvForChildren = settingsEnvForChildren;
}
//@ chunk-rtnapjwv.js:10792-10871 placement
function settingsEnvKeptForChildren(e) {
  let { settingsEnvForChildren } = subprocessEnvStateByHost.of(getRootSession().host);
  return settingsEnvForChildren[spellingIn(settingsEnvForChildren, e)];
}
//@ chunk-rtnapjwv.js:10871-10905 placement
function settingsPathForChildren() {
  return settingsEnvKeptForChildren("PATH");
}
//@ chunk-rtnapjwv.js:10905-11000 placement
function inheritedByChildren(e) {
  let { settingsEnvForChildren } = subprocessEnvStateByHost.of(getRootSession().host);
  return settingsEnvForChildren[spellingIn(settingsEnvForChildren, e)] ?? process.env[e];
}
//@ chunk-rtnapjwv.js:11000-11011 placement
var DAEMON_FORCE_COLOR_VALUE = "3";
//@ chunk-rtnapjwv.js:11011-11084 placement
function holdsDaemonForceColor() {
  return env.CLAUDE_BG_BACKEND === "daemon" && env.FORCE_COLOR === DAEMON_FORCE_COLOR_VALUE;
}
//@ chunk-rtnapjwv.js:11084-11207 placement
function withholdsDaemonForceColor() {
  if (!holdsDaemonForceColor()) return false;
  let { settingsEnvForChildren } = subprocessEnvStateByHost.of(getRootSession().host);
  return !Object.hasOwn(settingsEnvForChildren, spellingIn(settingsEnvForChildren, "FORCE_COLOR"));
}
//@ chunk-rtnapjwv.js:11207-11350 placement
function spellingIn(e, n) {
  if (getPlatform() !== "windows" || Object.hasOwn(e, n)) return n;
  let upper = n.toUpperCase();
  return Object.keys(e).find((key) => key.toUpperCase() === upper) ?? n;
}
//@ chunk-rtnapjwv.js:11350-11435 placement
function isArtifactDevBaseUrlVar(e) {
  return e.startsWith("CLAUDE_CODE_ARTIFACT") && e.endsWith("_BASE_URL");
}
//@ chunk-rtnapjwv.js:11435-11517 placement
function armedRunnerShedsName(e) {
  let upper = e.toUpperCase();
  return (
    !isGitConfigOrProxyEnvName(e) &&
    isSecretEnvName(e) &&
    !CREDENTIAL_ENV_VARS.has(upper) &&
    !isNonSecretClaudeCodeEnvName(upper)
  );
}
//@ chunk-rtnapjwv.js:11517-11562 placement
var HIPAA_CREDENTIAL_KEY_SET = new Set(AUTH_TOKEN_ENV_VARS.map((e) => e.toUpperCase()));
//@ chunk-rtnapjwv.js:11562-11787 placement
function hipaaCredentialScrubKeys() {
  if (!hipaaWithholdsChildCredentials()) return [];
  let e = subprocessEnvStateByHost.of(getRootSession().host);
  if (!e.hipaaTierNoticeGiven) {
    e.hipaaTierNoticeGiven = true;
    logForDebugging(
      "HIPAA: withholding this CLI's Anthropic credentials from child processes and config ${VAR} expansion",
    );
  }
  return flattened_2;
}
//@ chunk-rtnapjwv.js:11787-11821 placement
function hipaaWithholdsChildCredentials() {
  return hasComplianceTaint("hipaa");
}
//@ chunk-rtnapjwv.js:11821-11866 placement
var CHILD_SCRUBBED_CREDENTIAL_KEY_SET = new Set(flattened_2.map((e) => e.toUpperCase()));
//@ chunk-rtnapjwv.js:11866-11993 placement
function isChildScrubbedCredentialFamily(upperCase) {
  let replaced = upperCase.replace(/^INPUT_/, "");
  return (
    isArtifactDevBaseUrlVar(replaced) ||
    isHelperEnvVar(replaced) ||
    replaced.startsWith("OTEL_") ||
    replaced === "CLAUDE_CODE_OTEL_DIAG_STDERR"
  );
}
//@ chunk-rtnapjwv.js:11993-12118 placement
function isSshPlaceholderCredential(e, n) {
  return (
    (e === "CLAUDE_CODE_OAUTH_TOKEN" || e === "ANTHROPIC_API_KEY") &&
    n[e] === SSH_PLACEHOLDER &&
    n.ANTHROPIC_UNIX_SOCKET !== undefined
  );
}
//@ chunk-rtnapjwv.js:12118-12923 placement
function childScrubbedCredentialKeys() {
  let env = process.env;
  let n = (r) =>
    isSshPlaceholderCredential(r, env) &&
    !Object.keys(env).some((key) => key !== r && key.toUpperCase() === r);
  return [
    ...AUTH_TOKEN_ENV_VARS.filter((r) => !n(r)),
    ...Object.keys(env).filter((key) => isChildScrubbedCredentialFamily(key.toUpperCase())),
    ...getHostManagedProviderConflicts(env),
    ...ccrBridgeEnvVarNames(),
    ...getSessionTokenEnvKeys(),
    ...hipaaCredentialScrubKeys().filter((r) => !n(r)),
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
//@ chunk-rtnapjwv.js:12923-13146 placement
var BUN_GC_ENV_KEYS = new Set([
  "BUN_GC_TIMER_INTERVAL",
  "BUN_GC_TIMER_DISABLE",
  "BUN_GC_RUNS_UNTIL_SKIP_RELEASE_ACCESS",
  "BUN_IDLE_GC_SECONDS",
]);
var MIMALLOC_ENV_KEYS = new Set([
  "MIMALLOC_PURGE_HOLES_MIN_INTERVAL",
  "MIMALLOC_PURGE_DELAY",
  "MIMALLOC_PURGE_HOLES",
]);
//@ chunk-rtnapjwv.js:13146-13368 placement
function isRuntimeTuningEnvKey(e) {
  let upper = e.toUpperCase();
  return (
    upper.startsWith("BUN_JSC_") ||
    BUN_GC_ENV_KEYS.has(upper) ||
    MIMALLOC_ENV_KEYS.has(upper) ||
    upper === "CLAUDE_CODE_COUNT_GARBAGE_COLLECTIONS" ||
    upper === "CLAUDE_CODE_STREAM_EVENT_HOLD_MS" ||
    upper === "CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES"
  );
}
//@ chunk-rtnapjwv.js:13368-18946 placement
function subprocessEnv(e) {
  let n = subprocessEnvStateByHost.of(getRootSession().host);
  let r = n.getAgentProxyEnv?.() ?? {};
  let s = Object.keys(r).length > 0;
  let { settingsEnvForChildren } = n;
  let c = Object.keys(settingsEnvForChildren).length > 0;
  let env_2 = process.env;
  if (c || e !== undefined) {
    env_2 = {
      ...e,
      ...process.env,
    };
    for (let [key, value] of Object.entries(settingsEnvForChildren)) env_2[spellingIn(env_2, key)] = value;
  }
  let a = env.CLAUDE_CODE_REMOTE === true;
  let O = a
    ? proxyEnvForSubprocess(
        s
          ? {
              ...env_2,
              ...r,
            }
          : env_2,
      )
    : {};
  let E = Object.keys(O).length > 0;
  let D = shouldScrubSubprocessEnv();
  let Q =
    Object.keys(process.env).some((key) => HIPAA_CREDENTIAL_KEY_SET.has(key.toUpperCase())) ||
    Object.keys(process.env).some((key) => isChildScrubbedCredentialFamily(key.toUpperCase())) ||
    process.env.CLAUDE_CODE_SUBSCRIPTION_TYPE !== undefined ||
    process.env.CLAUDE_CODE_RATE_LIMIT_TIER !== undefined;
  let hostManagedProviderConflicts = getHostManagedProviderConflicts(process.env);
  let Z = ccrBridgeEnvVarNames();
  let sessionTokenEnvKeys = getSessionTokenEnvKeys();
  let b =
    hipaaWithholdsChildCredentials() &&
    Object.keys(process.env).some((key) => CHILD_SCRUBBED_CREDENTIAL_KEY_SET.has(envVarToUpperSnake(key)));
  let N = false;
  N = BG_WORKER_IDENTITY_ENV_VARS.some((o) => process.env[o] !== undefined);
  let any = Object.keys(process.env).some((key) =>
    /^(INPUT_)?(OTEL_|CLAUDE_CODE_OTEL_DIAG_STDERR$)/i.test(key),
  );
  let re =
    env.CLAUDE_CODE_PLUGIN_ATTRIBUTION !== undefined || env.CLAUDE_CODE_SKILL_ATTRIBUTION !== undefined;
  let oe = env.CLAUDE_CODE_QUESTION_EXTENDED || env.CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS;
  let CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES = env.CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES;
  let ie = env.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH || env.CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH;
  let CLAUDE_CODE_SDK_READS_SESSION_STATE = env.CLAUDE_CODE_SDK_READS_SESSION_STATE;
  let CLAUDE_CODE_SDK_READS_STARTUP_MARKS = env.CLAUDE_CODE_SDK_READS_STARTUP_MARKS;
  let ce = isStoredLoginPinned();
  let ae = env.CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED;
  let any_2 = Object.keys(env_2).some(
    (key) => key.toUpperCase() === "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
  );
  let any_3 = Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_REMOTE_TOOLS_FORWARD");
  let le =
    env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT ||
    env.CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT ||
    env.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS ||
    env.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT ||
    env.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT;
  let CLAUDE_CODE_CONFIG_PROBE = env.CLAUDE_CODE_CONFIG_PROBE;
  let ue = env.CLAUDE_CODE_MCP_STARTUP_WAIT_MS !== undefined;
  let CLAUDE_CODE_REMOTE_MCP_CONFIG = env.CLAUDE_CODE_REMOTE_MCP_CONFIG;
  let CLAUDE_CODE_MCP_APPS_HOST = env.CLAUDE_CODE_MCP_APPS_HOST;
  let Se = env.CLAUDE_CODE_UPFRONT_TOOLS !== undefined;
  let CLAUDE_CODE_ATTACHMENTS_BY_PATH = env.CLAUDE_CODE_ATTACHMENTS_BY_PATH;
  let fe = env.CLAUDE_CODE_SLEEP_COMPACT || env.CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS !== undefined;
  let Re = env.CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS !== undefined;
  let Le = env.CLAUDE_CODE_ARTIFACT_SHARE !== undefined;
  let CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST = env.CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST;
  let any_4 = Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_ARTIFACT_VERSIONS");
  let any_5 = Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP");
  let Pe =
    env.CLAUDE_CODE_WARN_DISK_FREE_GIB !== undefined ||
    env.CLAUDE_CODE_WARN_MEMORY_FREE_GIB !== undefined ||
    env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY;
  let me = env.CLAUDE_CHROME_TAB_GROUP_KEY !== undefined;
  let any_6 = Object.keys(env_2).some(
    (key) => key.toUpperCase() === "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
  );
  let Ne = env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD;
  let He =
    toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_SETTINGS !== undefined ||
    toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS !== undefined ||
    toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT !== undefined;
  let U = false;
  U = Object.keys(env_2).some(isRelaunchProactivityVar);
  let v = a && Object.keys(env_2).some(isRuntimeTuningEnvKey);
  let ye = false;
  if (
    e === undefined &&
    !s &&
    !E &&
    !D &&
    !N &&
    !Q &&
    !hostManagedProviderConflicts.length &&
    !Z.length &&
    !sessionTokenEnvKeys.length &&
    !b &&
    !any &&
    !c &&
    !re &&
    !oe &&
    !CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES &&
    !ie &&
    !CLAUDE_CODE_SDK_READS_SESSION_STATE &&
    !CLAUDE_CODE_SDK_READS_STARTUP_MARKS &&
    !ce &&
    !ae &&
    !any_2 &&
    !any_3 &&
    !le &&
    !CLAUDE_CODE_CONFIG_PROBE &&
    !ue &&
    !CLAUDE_CODE_REMOTE_MCP_CONFIG &&
    !CLAUDE_CODE_MCP_APPS_HOST &&
    !Se &&
    !CLAUDE_CODE_ATTACHMENTS_BY_PATH &&
    !fe &&
    !Re &&
    !Le &&
    !CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST &&
    !Pe &&
    !any_4 &&
    !any_5 &&
    !me &&
    !any_6 &&
    !Ne &&
    !He &&
    !U &&
    !v &&
    !ye
  )
    return process.env;
  let H = {
    ...r,
    ...O,
  };
  let d = {
    ...env_2,
  };
  for (let key of Object.keys(H)) {
    let p = spellingIn(d, key);
    if (p !== key) delete d[p];
  }
  Object.assign(d, H);
  let $e = new Set(
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
      "CLAUDE_CODE_MCP_APPS_HOST",
      "CLAUDE_CODE_UPFRONT_TOOLS",
      "CLAUDE_CODE_ATTACHMENTS_BY_PATH",
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
    ].map((o) => o.toUpperCase()),
  );
  for (let key of Object.keys(d))
    if (
      $e.has(key.toUpperCase()) ||
      isChildScrubbedCredentialFamily(key.toUpperCase()) ||
      (HIPAA_CREDENTIAL_KEY_SET.has(key.toUpperCase()) && !isSshPlaceholderCredential(key, d)) ||
      (b &&
        CHILD_SCRUBBED_CREDENTIAL_KEY_SET.has(envVarToUpperSnake(key)) &&
        (key.includes("-") || !isSshPlaceholderCredential(key, d)))
    )
      delete d[key];
  for (let o of BG_WORKER_IDENTITY_ENV_VARS) delete d[o];
  if (withholdsDaemonForceColor()) delete d[spellingIn(d, "FORCE_COLOR")];
  for (let key of Object.keys(d)) if (key.startsWith("OTEL_")) delete d[key];
  delete d.CLAUDE_CODE_OTEL_DIAG_STDERR;
  delete d.CLAUDE_CODE_PLUGIN_ATTRIBUTION;
  delete d.CLAUDE_CODE_SKILL_ATTRIBUTION;
  if (U) {
    for (let key of Object.keys(d)) if (isRelaunchProactivityVar(key)) delete d[key];
  }
  if (v) {
    for (let key of Object.keys(d)) if (isRuntimeTuningEnvKey(key)) delete d[key];
  }
  if (!D) return d;
  let scrubbedEnvNames_2 = getScrubbedEnvNames();
  let Ge = scrubbedEnvNames().length > 0;
  for (let [key, value] of Object.entries(d)) {
    if (value === PROXY_INJECTED_MARKER && Object.hasOwn(r, key)) continue;
    if (isSshPlaceholderCredential(key, d)) continue;
    if (
      scrubbedEnvNames_2.has(envVarToUpperSnake(key)) ||
      BUNDLE_CREDENTIAL_ENV_REGEX.test(key) ||
      isCredentialUserEnv(key) ||
      (Ge && armedRunnerShedsName(key))
    ) {
      delete d[key];
      continue;
    }
    if (value === undefined || isGitConfigOrProxyEnvName(key)) continue;
    let A = typeof value === "string" ? value : String(value);
    if (isPackageIndexEnv(key)) {
      let f = sanitizeIndexUrlEnv(key, A);
      if (f.value !== A) d[key] = f.value;
      if (f.cut) {
        let R = indexFallbackEnv(key, f.value);
        if (R !== undefined && !hasAnyIndexEnv(d, R.name)) d[R.name] = R.value;
      }
      continue;
    }
    let T = redactJvmOptionsEnvValue(key, A);
    if (T === undefined) {
      if (containsCredential(A)) delete d[key];
    } else if (T !== A)
      if (T === "") delete d[key];
      else d[key] = T;
  }
  return d;
}
//@ chunk-rtnapjwv.js:18946-19103 placement
function shouldUseMcpAllowlistEnv() {
  let envClaudeCodeMcpAllowlistEnv = process.env.CLAUDE_CODE_MCP_ALLOWLIST_ENV;
  if (isEnvTruthy(envClaudeCodeMcpAllowlistEnv)) return true;
  if (isEnvDefinedFalsy(envClaudeCodeMcpAllowlistEnv)) return false;
  return process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent";
}
//@ chunk-rtnapjwv.js:19103-21194 placement
function scrubSandboxConfig() {
  let scrubPathsLatched = subprocessEnvState.scrubPathsLatched;
  let n = scrubPathsLatched?.home ?? homedir();
  let filePath = scrubPathsLatched?.originalCwd ?? getOriginalCwd();
  let GITHUB_ACTION_PATH = scrubPathsLatched?.GITHUB_ACTION_PATH ?? process.env.GITHUB_ACTION_PATH;
  let C =
    scrubPathsLatched?.runnerFileCommandsDir ??
    (process.env.GITHUB_ENV ? dirname(process.env.GITHUB_ENV) : undefined);
  let c = scrubPathsLatched?.workspace ?? process.env.GITHUB_WORKSPACE;
  let _ =
    c && posix.resolve(c) !== posix.resolve(filePath)
      ? [
          `${c}/.git/hooks`,
          `${c}/.git/config`,
          `${c}/.git/config.lock`,
          `${c}/.git/config.worktree`,
          `${c}/.git/config.worktree.lock`,
          `${c}/.git/commondir`,
          `${c}/.git/worktrees`,
          `${c}/.git/modules`,
          `${c}/.git/info/exclude`,
          `${c}/.git/glab-cli`,
          `${c}/.gitmodules`,
          `${c}/.github`,
          `${c}/.claude`,
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
      ].filter((a) => !!a),
      denyWrite: [
        `${n}/.bash_profile`,
        `${n}/.bashrc`,
        `${n}/.bash_aliases`,
        `${n}/.bash_login`,
        `${n}/.bash_logout`,
        `${n}/.profile`,
        `${n}/.zshrc`,
        `${n}/.zprofile`,
        `${n}/.zshenv`,
        `${n}/.zlogin`,
        `${n}/.zlogout`,
        `${n}/.claude`,
        `${n}/.claude.json`,
        scrubPathsLatched?.claudeConfigDir ?? process.env.CLAUDE_CONFIG_DIR,
        `${n}/.gitconfig`,
        `${n}/.config/git`,
        `${n}/.bunfig.toml`,
        `${filePath}/bunfig.toml`,
        `${filePath}/package.json`,
        ...DOTENV_FILE_NAMES.map((a) => `${filePath}/${a}`),
        `${n}/.npmrc`,
        `${filePath}/.npmrc`,
        `${n}/.yarnrc`,
        `${n}/.yarnrc.yml`,
        `${filePath}/.yarnrc`,
        `${filePath}/.yarnrc.yml`,
        `${n}/.config/pip`,
        `${n}/.pip`,
        `${filePath}/package-lock.json`,
        `${filePath}/yarn.lock`,
        `${filePath}/pnpm-lock.yaml`,
        `${filePath}/node_modules/.bin`,
        `${filePath}/.git/modules`,
        `${filePath}/scripts`,
        `${filePath}/.claude`,
        ...(scrubPathsLatched?.canonicalClaudeDirs ?? isInClaudeFolder(filePath)),
        `${filePath}/.github`,
        `${n}/.local/bin`,
        `${n}/runners`,
        `${n}/actions-runner`,
        "/tmp/inline-comments-buffer.jsonl",
        ...(scrubPathsLatched?.pathDirs ?? []),
        C,
        GITHUB_ACTION_PATH,
        GITHUB_ACTION_PATH && GITHUB_ACTION_PATH.includes("/_actions/")
          ? GITHUB_ACTION_PATH.slice(0, GITHUB_ACTION_PATH.indexOf("/_actions/") + 9)
          : undefined,
        scrubPathsLatched?.GITHUB_EVENT_PATH ?? process.env.GITHUB_EVENT_PATH,
        `${n}/.config/gh`,
        `${n}/.config/glab-cli`,
        `${n}/.netrc`,
        `${n}/.ssh`,
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
        ..._,
      ].filter((a) => !!a),
    },
  };
}
//@ chunk-rtnapjwv.js:21194-21265 placement
function isRelaunchProactivityVar(e) {
  return e.startsWith("CLAUDE_CODE_RELAUNCH_PROACTIVITY_");
}
//@ chunk-rtnapjwv.js:21265-21271 placement
var scrubbedEnvNamesCache;
//@ chunk-rtnapjwv.js:21271-21408 placement
function getScrubbedEnvNames() {
  let e = scrubbedEnvNames();
  let n = e.length > 0;
  if (scrubbedEnvNamesCache?.armed !== n)
    scrubbedEnvNamesCache = {
      armed: n,
      names: new Set([...flattened, ...e].map((r) => r.toUpperCase())),
    };
  return scrubbedEnvNamesCache.names;
}
//@ chunk-3zy56vtn.js:8263-8318 fingerprint = subprocessEnv (0.782)
function subprocessEnv_2(e) {
  return e.flatMap((n) => [n, `INPUT_${n}`]);
}
export {
  subprocessEnv,
  isScrubEnabled,
  getBgDispatcherPlanInfo,
  shouldUseMcpAllowlistEnv,
  agentProxyEnv,
  PROXY_INJECTED_MARKER,
  inheritedByChildren,
  isSshPlaceholderAuth,
  federationCacheDir,
  subprocessEnv_2,
  hipaaWithholdsChildCredentials,
  getSandboxBwrapPath,
  SSH_PLACEHOLDER,
  spellingIn,
  settingsEnvKeptForChildren,
  proxyEnvForSubprocess,
  assertScrubSandboxAvailable,
  buildBgDispatcherEnv,
  isScrubSandboxAvailable,
  getSandboxSocatPath,
  isChildScrubbedCredentialFamily,
  shouldScrubSubprocessEnv,
  armedRunnerShedsName,
  childScrubbedCredentialKeys,
  ghStandinDir,
  hipaaCredentialScrubKeys,
  withholdsDaemonForceColor,
  enforceScriptCaps,
  scrubSandboxConfig,
  settingsPathForChildren,
  BG_DISPATCHER_IDENTITY_ENV_VARS,
  setSettingsEnvForChildren,
  holdsDaemonForceColor,
  BG_WORKER_IDENTITY_ENV_VARS,
  isArtifactDevBaseUrlVar,
};
