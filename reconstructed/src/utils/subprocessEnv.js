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
import { ge } from "./identity.js";
import {
  HRi,
  initEnvScrubFlag,
  flattened_2,
  Ile,
  scrubbedEnvNames,
  isPackageIndexEnv,
  sanitizeIndexUrlEnv,
  indexFallbackEnv,
  vus,
  flattened,
} from "./settings/policyHelper/helperExec.js";
import { HostScoped } from "./hostScoped.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { GD, dY } from "./settings/settingsStorage.js";
import { findCanonicalGitRoot } from "./git.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { NPn } from "../components/sandbox/SandboxDependenciesTab.js";
import { childProcessTmpDir } from "./tempDir.js";
import { jsonParse } from "./slowOperations.js";
import { Do } from "./git/gitSafeEnv.js";
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
import { hOn, isHelperEnvVar, getHostManagedProviderConflicts } from "./managedEnvConstants.js";
import { logForDebugging } from "./debug.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { ccrBridgeEnvVarNames } from "../services/mcp/ccrMcpUrls.js";
import { getSessionTokenEnvKeys } from "./sessionAccessToken.js";
import { isStoredLoginPinned } from "../cli/headlessCloud/attachServe.js";
import { nk } from "./subprocessEnvLoader.js";

//@ chunk-rtnapjwv.js:944-970 placement
var SSH_PLACEHOLDER = "ssh-placeholder";
/**
 * 判断环境是否为 SSH 远程转发的占位认证：存在 ANTHROPIC_UNIX_SOCKET、没有 auth token，且 OAuth token 或 API key 之一为 ssh-placeholder 而另一个为空。
 */
//@ chunk-rtnapjwv.js:970-1152 placement
function isSshPlaceholderAuth(e) {
  let { CLAUDE_CODE_OAUTH_TOKEN: CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY: ANTHROPIC_API_KEY } = e;
  return (
    !!e.ANTHROPIC_UNIX_SOCKET &&
    !e.ANTHROPIC_AUTH_TOKEN &&
    ((CLAUDE_CODE_OAUTH_TOKEN === "ssh-placeholder" && !ANTHROPIC_API_KEY) ||
      (ANTHROPIC_API_KEY === "ssh-placeholder" && !CLAUDE_CODE_OAUTH_TOKEN))
  );
}
//@ chunk-rtnapjwv.js:1152-1242 placement
var HIt = ["CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE", "CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER"];
/**
 * 生成传给后台调度子进程的订阅类型与限速等级环境变量。
 */
//@ chunk-rtnapjwv.js:1242-1424 placement
function buildBgDispatcherEnv(e) {
  return {
    ...(e.subscriptionType && { CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE: e.subscriptionType }),
    ...(e.rateLimitTier && { CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER: e.rateLimitTier }),
  };
}
/**
 * 后台会话中从环境变量读取调度方传入的订阅类型与限速等级。
 */
//@ chunk-rtnapjwv.js:1424-1664 placement
function getBgDispatcherPlanInfo() {
  if (env.CLAUDE_CODE_SESSION_KIND !== "bg") return { subscriptionType: void 0, rateLimitTier: void 0 };
  return {
    subscriptionType: env.CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE || void 0,
    rateLimitTier: env.CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER || void 0,
  };
}
/**
 * 联合缓存目录。
 */
//@ chunk-rtnapjwv.js:1766-1922 placement
function federationCacheDir() {
  if (isDiskless()) return null;
  let CLAUDE_CODE_FEDERATION_CACHE_DIR = env.CLAUDE_CODE_FEDERATION_CACHE_DIR;
  if (CLAUDE_CODE_FEDERATION_CACHE_DIR) return resolve(CLAUDE_CODE_FEDERATION_CACHE_DIR);
  let n = resolveConfigDir();
  return n === null ? null : resolve(n, "credentials", "federation");
}
/**
 * 代理注入标记。
 */
//@ chunk-rtnapjwv.js:1922-1946 placement
var PROXY_INJECTED_MARKER = "proxy-injected";
//@ chunk-rtnapjwv.js:1946-2023 placement
function dyr() {
  return getAllPolicyTierSettings()
    .map((e) => e.sandbox?.bwrapPath)
    .find((e) => e != null);
}
//@ chunk-rtnapjwv.js:2023-2100 placement
function xCi() {
  return getAllPolicyTierSettings()
    .map((e) => e.sandbox?.socatPath)
    .find((e) => e != null);
}
//@ chunk-rtnapjwv.js:2164-2189 placement
var xe = /[ \t\n\v\f\r'"]/;
/**
 * 为子进程生成代理环境变量（含 Java 参数）。
 */
//@ chunk-rtnapjwv.js:2189-3109 placement
function proxyEnvForSubprocess(e) {
  let n = e.HTTP_PROXY || e.http_proxy || e.CLAUDE_CODE_HTTP_PROXY,
    r = e.HTTPS_PROXY || e.https_proxy || e.CLAUDE_CODE_HTTPS_PROXY,
    s = noProxyUnion(e);
  if (!n && !r) return {};
  let C = parseProxyUrl(n),
    c = parseProxyUrl(r);
  if (!c.host) c = C;
  let _ = {},
    a = (O, E) => {
      if (E && e[O] === void 0) _[O] = E;
    };
  if (
    (a("YARN_HTTP_PROXY", n),
    a("YARN_HTTPS_PROXY", r),
    a("npm_config_proxy", n),
    a("npm_config_https_proxy", r),
    a("npm_config_noproxy", s),
    a("GLOBAL_AGENT_HTTP_PROXY", n),
    a("GLOBAL_AGENT_HTTPS_PROXY", r),
    a("GLOBAL_AGENT_NO_PROXY", s),
    a("ELECTRON_GET_USE_PROXY", "1"),
    a("DOCKER_HTTP_PROXY", n),
    a("DOCKER_HTTPS_PROXY", r),
    c.host)
  )
    (a("CLOUDSDK_PROXY_TYPE", "http"),
      a("CLOUDSDK_PROXY_ADDRESS", c.host),
      a("CLOUDSDK_PROXY_PORT", c.port),
      a("CLOUDSDK_PROXY_USERNAME", c.user),
      a("CLOUDSDK_PROXY_PASSWORD", c.pass));
  if ((a("FSSPEC_GCS", '{"session_kwargs": {"trust_env": true}}'), c.host)) {
    let JAVA_TOOL_OPTIONS = e.JAVA_TOOL_OPTIONS;
    if (!JAVA_TOOL_OPTIONS?.includes("-Dhttps.proxyHost=")) {
      let E = javaProxyArgs(C, c, s);
      _.JAVA_TOOL_OPTIONS = JAVA_TOOL_OPTIONS ? `${JAVA_TOOL_OPTIONS} ${E}` : E;
    }
  }
  return _;
}
/**
 * 解析代理 URL 为主机、端口、用户、密码。
 */
//@ chunk-rtnapjwv.js:3109-3512 placement
function parseProxyUrl(e) {
  if (!e) return { host: "", port: "", user: "", pass: "" };
  try {
    let n = new URL(e);
    if (!n.hostname) return { host: "", port: "", user: "", pass: "" };
    return {
      host: n.hostname.startsWith("[") && n.hostname.endsWith("]") ? n.hostname.slice(1, -1) : n.hostname,
      port: n.port || (n.protocol === "https:" ? "443" : "80"),
      user: decodeURIComponent(n.username),
      pass: decodeURIComponent(n.password),
    };
  } catch {
    return { host: "", port: "", user: "", pass: "" };
  }
}
/**
 * 生成 Java 代理系统属性参数。
 */
//@ chunk-rtnapjwv.js:3512-3978 placement
function javaProxyArgs(e, n, r) {
  let s = [],
    C = (c, _) => {
      if (_ && !xe.test(_)) s.push(`-D${c}=${_}`);
    };
  if (
    (C("http.proxyHost", e.host),
    C("http.proxyPort", e.port),
    C("https.proxyHost", n.host),
    C("https.proxyPort", n.port),
    C("http.proxyUser", e.user),
    C("http.proxyPassword", e.pass),
    C("https.proxyUser", n.user),
    C("https.proxyPassword", n.pass),
    r)
  )
    C("http.nonProxyHosts", toNoProxyPattern(r));
  return (
    s.push("-Djdk.http.auth.tunneling.disabledSchemes="),
    s.push("-Djdk.http.auth.proxying.disabledSchemes="),
    s.join(" ")
  );
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
/**
 * 解析 IPv4 CIDR。
 */
//@ chunk-rtnapjwv.js:4134-4560 placement
function parseIpv4Cidr(e) {
  let match = e.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return;
  let r = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])],
    s = Number(match[5]);
  if (r.some((E) => E > 255) || s < 8 || s > 24) return [e];
  let floored = Math.floor(s / 8),
    c = s % 8;
  if (c === 0) return [`${r.slice(0, floored).join(".")}.*`];
  let _ = 2 ** (8 - c);
  if (_ > 16) return [e];
  let a = r[floored] - (r[floored] % _),
    O = [];
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
  ...HIt,
];
/**
 * 子进程环境清洗状态（锁存值、脚本调用计数）。
 */
//@ chunk-rtnapjwv.js:5201-5741 placement
class SubprocessEnvState {
  scrubEnabledLatched = void 0;
  scrubSandboxAvailableLatched = void 0;
  scrubPathsLatched = void 0;
  scriptCallCounts = new Map();
  scriptCapsLatched = void 0;
  setScrubEnabledLatched(e) {
    this.scrubEnabledLatched = e;
  }
  setScrubSandboxAvailableLatched(e) {
    this.scrubSandboxAvailableLatched = e;
  }
  setScrubPathsLatched(e) {
    this.scrubPathsLatched = e;
  }
  setScriptCapsLatched(e) {
    this.scriptCapsLatched = e;
  }
  reset() {
    ((this.scrubEnabledLatched = void 0),
      (this.scrubSandboxAvailableLatched = void 0),
      (this.scrubPathsLatched = void 0),
      this.scriptCallCounts.clear(),
      (this.scriptCapsLatched = void 0));
  }
}
//@ chunk-rtnapjwv.js:5741-5780 placement
var l = ge(new SubprocessEnvState(), (e) => {
  (e.reset(), HRi());
});
//@ chunk-rtnapjwv.js:5780-5885 placement
class SubprocessEnvState_2 {
  getAgentProxyEnv = void 0;
  getGhStandinDir = void 0;
  settingsEnvForChildren = {};
  hipaaTierNoticeGiven = !1;
}
//@ chunk-rtnapjwv.js:5885-5908 placement
var u = new HostScoped(() => new SubprocessEnvState_2());
//@ chunk-rtnapjwv.js:5908-6065 placement
function isScrubEnabled() {
  let scrubEnabledLatched = l.scrubEnabledLatched;
  if (scrubEnabledLatched !== void 0) return scrubEnabledLatched;
  let n = isEnvTruthy(process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB);
  return (l.setScrubEnabledLatched(n), n);
}
/**
 * REPL 模式：If() 为真，或未显式关闭 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 且入口为 local-agent。外部构建 getReplTool 恒 null，REPL 工具实际不存在。
 */
//@ chunk-rtnapjwv.js:6065-6216 placement = isReplModeEnabled (0.161)
function shouldScrubSubprocessEnv() {
  if (isScrubEnabled()) return !0;
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)) return !1;
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
  ],
  SYSTEM_TOP_DIRS = ["home", "root", "tmp", "var", "opt", "run", "mnt"].map((e) => `/${e}`),
  CURRENT_DIR = ".";
//@ chunk-rtnapjwv.js:6432-6535 placement = isInClaudeFolder (1)
function isInClaudeFolder(filePath) {
  let n = new Set();
  for (let r of [GD, findCanonicalGitRoot, dY])
    try {
      n.add(`${resolveLocalSettingsStoreRoot(filePath, r)}/.claude`);
    } catch {}
  return [...n];
}
//@ chunk-rtnapjwv.js:6535-6650 placement
function isScrubSandboxAvailable() {
  if (l.scrubSandboxAvailableLatched !== void 0) return l.scrubSandboxAvailableLatched;
  return NPn() !== null;
}
//@ chunk-rtnapjwv.js:6650-9707 placement
async function assertScrubSandboxAvailable() {
  if ((initEnvScrubFlag(), !isScrubEnabled())) return;
  let e = homedir(),
    n = getOriginalCwd(),
    r = process.env.GITHUB_ENV ? dirname(process.env.GITHUB_ENV) : void 0,
    envGithubWorkspace = process.env.GITHUB_WORKSPACE;
  l.setScrubSandboxAvailableLatched(NPn() !== null);
  let filtered = (process.env.PATH ?? "")
    .split(":")
    .map((E) => (E ? posix.normalize(E).replace(/\/+$/, "") : E))
    .filter((E) => E && SYSTEM_TOP_DIRS.some((D) => E.startsWith(`${D}/`)));
  if (
    (l.setScrubPathsLatched({
      home: e,
      originalCwd: n,
      claudeConfigDir: process.env.CLAUDE_CONFIG_DIR,
      federationCacheDir: federationCacheDir() ?? void 0,
      canonicalClaudeDirs: isInClaudeFolder(n),
      runnerFileCommandsDir: r,
      workspace: envGithubWorkspace,
      GITHUB_ACTION_PATH: process.env.GITHUB_ACTION_PATH,
      GITHUB_EVENT_PATH: process.env.GITHUB_EVENT_PATH,
      pathDirs: filtered,
    }),
    latchScriptCaps(),
    NPn() === null)
  ) {
    let E = dyr();
    throw Error(
      E
        ? `sandbox.bwrapPath is set to ${E} but it is not an executable file. Fix the path in managed settings, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to disable (loses subprocess isolation).`
        : "bubblewrap is required for subprocess env scrubbing and isolation. Install with: sudo apt-get install -y bubblewrap, set sandbox.bwrapPath in managed settings, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to disable (loses subprocess isolation).",
    );
  }
  if (isDiskless()) return;
  let { appendFile: appendFile, mkdir: mkdir, open: open } = await import("fs/promises");
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
    `${n}/.npmrc`,
    `${n}/.yarnrc`,
    `${n}/.yarnrc.yml`,
    `${n}/bunfig.toml`,
    `${n}/package.json`,
    `${n}/.gitmodules`,
    `${n}/package-lock.json`,
    `${n}/yarn.lock`,
    `${n}/pnpm-lock.yaml`,
    "/tmp/inline-comments-buffer.jsonl",
    ...DOTENV_FILE_NAMES.map((D) => `${n}/${D}`),
  ])
    try {
      (await mkdir(dirname(E), { recursive: !0 }), await (await open(E, "a")).close());
    } catch {}
  for (let E of [
    `${e}/.config/gh`,
    `${e}/.config/glab-cli`,
    `${e}/.config/git`,
    `${e}/.config/pip`,
    `${e}/.pip`,
    `${n}/.claude/commands`,
    `${n}/.claude/agents`,
    `${n}/node_modules/.bin`,
    ...(r ? [r] : []),
    ...filtered,
  ])
    try {
      await mkdir(E, { recursive: !0 });
    } catch {}
  if (envGithubWorkspace && posix.resolve(envGithubWorkspace) !== posix.resolve(n)) {
    (await mkdir(`${envGithubWorkspace}/.git/hooks`).catch(() => {}),
      await mkdir(`${envGithubWorkspace}/.git/glab-cli`).catch(() => {}),
      await mkdir(`${envGithubWorkspace}/.git/modules`).catch(() => {}),
      await mkdir(`${envGithubWorkspace}/.git/worktrees`).catch(() => {}),
      await mkdir(`${envGithubWorkspace}/.git/info`).catch(() => {}),
      await mkdir(`${envGithubWorkspace}/.github`, { recursive: !0 }).catch(() => {}));
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
      (await E.writeFile(CURRENT_DIR), await E.close());
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
  (await mkdir(`${n}/.git/info`).catch(() => {}),
    await mkdir(`${n}/.git/modules`).catch(() => {}),
    await mkdir(`${n}/.git/worktrees`).catch(() => {}),
    await mkdir(`${n}/.git/glab-cli`).catch(() => {}));
  try {
    await (await open(`${n}/.git/config.worktree`, "a")).close();
  } catch {}
  try {
    let E = await open(`${n}/.git/commondir`, "wx");
    (await E.writeFile(CURRENT_DIR), await E.close());
  } catch {}
  try {
    await appendFile(
      `${n}/.git/info/exclude`,
      `
# claude-code scrub-mode stubs
${O.map((E) => `/${E}`).join(`
`)}
`,
    );
  } catch {}
}
/**
 * 锁存 CLAUDE_CODE_SCRIPT_CAPS。
 */
//@ chunk-rtnapjwv.js:9707-10109 placement
function latchScriptCaps() {
  if (l.scriptCapsLatched !== void 0) return;
  let envClaudeCodeScriptCaps = process.env.CLAUDE_CODE_SCRIPT_CAPS;
  if (!envClaudeCodeScriptCaps) {
    l.setScriptCapsLatched(null);
    return;
  }
  try {
    let n = jsonParse(envClaudeCodeScriptCaps);
    if (n && typeof n === "object" && !Array.isArray(n)) {
      let r = Do(n, (s, C) => typeof s === "number" && Number.isFinite(s) && C.trim().length > 0);
      l.setScriptCapsLatched(Object.keys(r).length > 0 ? r : null);
    } else l.setScriptCapsLatched(null);
  } catch {
    l.setScriptCapsLatched(null);
  }
}
//@ chunk-rtnapjwv.js:10109-10518 placement
function enforceScriptCaps(e) {
  if (!isScrubEnabled()) return;
  if ((latchScriptCaps(), !l.scriptCapsLatched)) return;
  let { scriptCapsLatched: scriptCapsLatched, scriptCallCounts: scriptCallCounts } = l;
  for (let [s, C] of Object.entries(scriptCapsLatched)) {
    let c = e.split(s).length - 1;
    if (c > 0) {
      let _ = (scriptCallCounts.get(s) ?? 0) + c;
      if ((scriptCallCounts.set(s, _), _ > C))
        throw Error(
          `Script call limit exceeded: ${s} has been called ${_} times (cap: ${C}). This limit prevents data exfiltration via repeated write operations in untrusted-input workflows.`,
        );
    }
  }
}
//@ chunk-rtnapjwv.js:10518-10568 placement
function registerAgentProxyEnvFn(e) {
  u.of(getRootSession().host).getAgentProxyEnv = e;
}
//@ chunk-rtnapjwv.js:10568-10617 placement
function registerGhStandinDirFn(e) {
  u.of(getRootSession().host).getGhStandinDir = e;
}
//@ chunk-rtnapjwv.js:10617-10679 placement
function agentProxyEnv() {
  return u.of(getRootSession().host).getAgentProxyEnv?.() ?? {};
}
//@ chunk-rtnapjwv.js:10679-10736 placement
function ghStandinDir() {
  return u.of(getRootSession().host).getGhStandinDir?.();
}
//@ chunk-rtnapjwv.js:10736-10792 placement
function setSettingsEnvForChildren(e) {
  u.of(getRootSession().host).settingsEnvForChildren = e;
}
//@ chunk-rtnapjwv.js:10792-10871 placement
function settingsEnvKeptForChildren(e) {
  let { settingsEnvForChildren: settingsEnvForChildren } = u.of(getRootSession().host);
  return settingsEnvForChildren[spellingIn(settingsEnvForChildren, e)];
}
//@ chunk-rtnapjwv.js:10871-10905 placement
function settingsPathForChildren() {
  return settingsEnvKeptForChildren("PATH");
}
//@ chunk-rtnapjwv.js:10905-11000 placement
function inheritedByChildren(e) {
  let { settingsEnvForChildren: settingsEnvForChildren } = u.of(getRootSession().host);
  return settingsEnvForChildren[spellingIn(settingsEnvForChildren, e)] ?? process.env[e];
}
//@ chunk-rtnapjwv.js:11000-11011 placement
var Fe = "3";
//@ chunk-rtnapjwv.js:11011-11084 placement
function holdsDaemonForceColor() {
  return env.CLAUDE_BG_BACKEND === "daemon" && env.FORCE_COLOR === Fe;
}
//@ chunk-rtnapjwv.js:11084-11207 placement
function withholdsDaemonForceColor() {
  if (!holdsDaemonForceColor()) return !1;
  let { settingsEnvForChildren: settingsEnvForChildren } = u.of(getRootSession().host);
  return !Object.hasOwn(settingsEnvForChildren, spellingIn(settingsEnvForChildren, "FORCE_COLOR"));
}
//@ chunk-rtnapjwv.js:11207-11350 placement
function spellingIn(e, n) {
  if (getPlatform() !== "windows" || Object.hasOwn(e, n)) return n;
  let upper = n.toUpperCase();
  return Object.keys(e).find((s) => s.toUpperCase() === upper) ?? n;
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
var M = new Set(hOn.map((e) => e.toUpperCase()));
//@ chunk-rtnapjwv.js:11562-11787 placement
function hipaaCredentialScrubKeys() {
  if (!hipaaWithholdsChildCredentials()) return [];
  let of = u.of(getRootSession().host);
  if (!of.hipaaTierNoticeGiven)
    ((of.hipaaTierNoticeGiven = !0),
      logForDebugging(
        "HIPAA: withholding this CLI's Anthropic credentials from child processes and config ${VAR} expansion",
      ));
  return flattened_2;
}
//@ chunk-rtnapjwv.js:11787-11821 placement
function hipaaWithholdsChildCredentials() {
  return hasComplianceTaint("hipaa");
}
//@ chunk-rtnapjwv.js:11821-11866 placement
var w = new Set(flattened_2.map((e) => e.toUpperCase()));
//@ chunk-rtnapjwv.js:11866-11993 placement
function isChildScrubbedCredentialFamily(e) {
  let replaced = e.replace(/^INPUT_/, "");
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
    n.ANTHROPIC_UNIX_SOCKET !== void 0
  );
}
//@ chunk-rtnapjwv.js:12118-12923 placement
function childScrubbedCredentialKeys() {
  let env = process.env,
    n = (r) =>
      isSshPlaceholderCredential(r, env) && !Object.keys(env).some((s) => s !== r && s.toUpperCase() === r);
  return [
    ...hOn.filter((r) => !n(r)),
    ...Object.keys(env).filter((r) => isChildScrubbedCredentialFamily(r.toUpperCase())),
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
  ]),
  MIMALLOC_ENV_KEYS = new Set([
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
  let of = u.of(getRootSession().host),
    r = of.getAgentProxyEnv?.() ?? {},
    s = Object.keys(r).length > 0,
    { settingsEnvForChildren: settingsEnvForChildren } = of,
    c = Object.keys(settingsEnvForChildren).length > 0,
    env_2 = process.env;
  if (c || e !== void 0) {
    env_2 = { ...e, ...process.env };
    for (let [o, p] of Object.entries(settingsEnvForChildren)) env_2[spellingIn(env_2, o)] = p;
  }
  let a = env.CLAUDE_CODE_REMOTE === !0,
    O = a ? proxyEnvForSubprocess(s ? { ...env_2, ...r } : env_2) : {},
    E = Object.keys(O).length > 0,
    D = shouldScrubSubprocessEnv(),
    Q =
      Object.keys(process.env).some((o) => M.has(o.toUpperCase())) ||
      Object.keys(process.env).some((o) => isChildScrubbedCredentialFamily(o.toUpperCase())) ||
      process.env.CLAUDE_CODE_SUBSCRIPTION_TYPE !== void 0 ||
      process.env.CLAUDE_CODE_RATE_LIMIT_TIER !== void 0,
    q = getHostManagedProviderConflicts(process.env),
    Z = ccrBridgeEnvVarNames(),
    ee = getSessionTokenEnvKeys(),
    b = hipaaWithholdsChildCredentials() && Object.keys(process.env).some((o) => w.has(Ile(o))),
    N = !1;
  N = BG_WORKER_IDENTITY_ENV_VARS.some((o) => process.env[o] !== void 0);
  let any = Object.keys(process.env).some((o) => /^(INPUT_)?(OTEL_|CLAUDE_CODE_OTEL_DIAG_STDERR$)/i.test(o)),
    re = env.CLAUDE_CODE_PLUGIN_ATTRIBUTION !== void 0 || env.CLAUDE_CODE_SKILL_ATTRIBUTION !== void 0,
    oe = env.CLAUDE_CODE_QUESTION_EXTENDED || env.CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS,
    CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES = env.CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES,
    ie = env.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH || env.CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH,
    CLAUDE_CODE_SDK_READS_SESSION_STATE = env.CLAUDE_CODE_SDK_READS_SESSION_STATE,
    CLAUDE_CODE_SDK_READS_STARTUP_MARKS = env.CLAUDE_CODE_SDK_READS_STARTUP_MARKS,
    ce = isStoredLoginPinned(),
    ae = env.CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED,
    any_2 = Object.keys(env_2).some(
      (o) => o.toUpperCase() === "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
    ),
    any_3 = Object.keys(env_2).some((o) => o.toUpperCase() === "CLAUDE_CODE_REMOTE_TOOLS_FORWARD"),
    le =
      env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT ||
      env.CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT ||
      env.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS ||
      env.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT ||
      env.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT,
    CLAUDE_CODE_CONFIG_PROBE = env.CLAUDE_CODE_CONFIG_PROBE,
    ue = env.CLAUDE_CODE_MCP_STARTUP_WAIT_MS !== void 0,
    CLAUDE_CODE_REMOTE_MCP_CONFIG = env.CLAUDE_CODE_REMOTE_MCP_CONFIG,
    CLAUDE_CODE_MCP_APPS_HOST = env.CLAUDE_CODE_MCP_APPS_HOST,
    Se = env.CLAUDE_CODE_UPFRONT_TOOLS !== void 0,
    CLAUDE_CODE_ATTACHMENTS_BY_PATH = env.CLAUDE_CODE_ATTACHMENTS_BY_PATH,
    fe = env.CLAUDE_CODE_SLEEP_COMPACT || env.CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS !== void 0,
    Re = env.CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS !== void 0,
    Le = env.CLAUDE_CODE_ARTIFACT_SHARE !== void 0,
    CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST = env.CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST,
    any_4 = Object.keys(env_2).some((o) => o.toUpperCase() === "CLAUDE_CODE_ARTIFACT_VERSIONS"),
    any_5 = Object.keys(env_2).some((o) => o.toUpperCase() === "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP"),
    Pe =
      env.CLAUDE_CODE_WARN_DISK_FREE_GIB !== void 0 ||
      env.CLAUDE_CODE_WARN_MEMORY_FREE_GIB !== void 0 ||
      env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY,
    me = env.CLAUDE_CHROME_TAB_GROUP_KEY !== void 0,
    any_6 = Object.keys(env_2).some(
      (o) => o.toUpperCase() === "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
    ),
    Ne = env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD,
    He =
      nk.CLAUDE_CODE_MCP_SERVE_SETTINGS !== void 0 ||
      nk.CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS !== void 0 ||
      nk.CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT !== void 0,
    U = !1;
  U = Object.keys(env_2).some(F);
  let v = a && Object.keys(env_2).some(isRuntimeTuningEnvKey),
    ye = !1;
  if (
    e === void 0 &&
    !s &&
    !E &&
    !D &&
    !N &&
    !Q &&
    !q.length &&
    !Z.length &&
    !ee.length &&
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
  let H = { ...r, ...O },
    d = { ...env_2 };
  for (let o of Object.keys(H)) {
    let p = spellingIn(d, o);
    if (p !== o) delete d[p];
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
  for (let o of Object.keys(d))
    if (
      $e.has(o.toUpperCase()) ||
      isChildScrubbedCredentialFamily(o.toUpperCase()) ||
      (M.has(o.toUpperCase()) && !isSshPlaceholderCredential(o, d)) ||
      (b && w.has(Ile(o)) && (o.includes("-") || !isSshPlaceholderCredential(o, d)))
    )
      delete d[o];
  for (let o of BG_WORKER_IDENTITY_ENV_VARS) delete d[o];
  if (withholdsDaemonForceColor()) delete d[spellingIn(d, "FORCE_COLOR")];
  for (let o of Object.keys(d)) if (o.startsWith("OTEL_")) delete d[o];
  if (
    (delete d.CLAUDE_CODE_OTEL_DIAG_STDERR,
    delete d.CLAUDE_CODE_PLUGIN_ATTRIBUTION,
    delete d.CLAUDE_CODE_SKILL_ATTRIBUTION,
    U)
  ) {
    for (let o of Object.keys(d)) if (F(o)) delete d[o];
  }
  if (v) {
    for (let o of Object.keys(d)) if (isRuntimeTuningEnvKey(o)) delete d[o];
  }
  if (!D) return d;
  let Be = getScrubbedEnvNames(),
    Ge = scrubbedEnvNames().length > 0;
  for (let [o, p] of Object.entries(d)) {
    if (p === PROXY_INJECTED_MARKER && Object.hasOwn(r, o)) continue;
    if (isSshPlaceholderCredential(o, d)) continue;
    if (
      Be.has(Ile(o)) ||
      BUNDLE_CREDENTIAL_ENV_REGEX.test(o) ||
      isCredentialUserEnv(o) ||
      (Ge && armedRunnerShedsName(o))
    ) {
      delete d[o];
      continue;
    }
    if (p === void 0 || isGitConfigOrProxyEnvName(o)) continue;
    let A = typeof p === "string" ? p : String(p);
    if (isPackageIndexEnv(o)) {
      let f = sanitizeIndexUrlEnv(o, A);
      if (f.value !== A) d[o] = f.value;
      if (f.cut) {
        let R = indexFallbackEnv(o, f.value);
        if (R !== void 0 && !vus(d, R.name)) d[R.name] = R.value;
      }
      continue;
    }
    let T = redactJvmOptionsEnvValue(o, A);
    if (T === void 0) {
      if (containsCredential(A)) delete d[o];
    } else if (T !== A)
      if (T === "") delete d[o];
      else d[o] = T;
  }
  return d;
}
//@ chunk-rtnapjwv.js:18946-19103 placement
function shouldUseMcpAllowlistEnv() {
  let envClaudeCodeMcpAllowlistEnv = process.env.CLAUDE_CODE_MCP_ALLOWLIST_ENV;
  if (isEnvTruthy(envClaudeCodeMcpAllowlistEnv)) return !0;
  if (isEnvDefinedFalsy(envClaudeCodeMcpAllowlistEnv)) return !1;
  return process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent";
}
//@ chunk-rtnapjwv.js:19103-21194 placement
function scrubSandboxConfig() {
  let scrubPathsLatched = l.scrubPathsLatched,
    n = scrubPathsLatched?.home ?? homedir(),
    r = scrubPathsLatched?.originalCwd ?? getOriginalCwd(),
    s = scrubPathsLatched?.GITHUB_ACTION_PATH ?? process.env.GITHUB_ACTION_PATH,
    C =
      scrubPathsLatched?.runnerFileCommandsDir ??
      (process.env.GITHUB_ENV ? dirname(process.env.GITHUB_ENV) : void 0),
    c = scrubPathsLatched?.workspace ?? process.env.GITHUB_WORKSPACE,
    _ =
      c && posix.resolve(c) !== posix.resolve(r)
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
        `${r}/bunfig.toml`,
        `${r}/package.json`,
        ...DOTENV_FILE_NAMES.map((a) => `${r}/${a}`),
        `${n}/.npmrc`,
        `${r}/.npmrc`,
        `${n}/.yarnrc`,
        `${n}/.yarnrc.yml`,
        `${r}/.yarnrc`,
        `${r}/.yarnrc.yml`,
        `${n}/.config/pip`,
        `${n}/.pip`,
        `${r}/package-lock.json`,
        `${r}/yarn.lock`,
        `${r}/pnpm-lock.yaml`,
        `${r}/node_modules/.bin`,
        `${r}/.git/modules`,
        `${r}/scripts`,
        `${r}/.claude`,
        ...(scrubPathsLatched?.canonicalClaudeDirs ?? isInClaudeFolder(r)),
        `${r}/.github`,
        `${n}/.local/bin`,
        `${n}/runners`,
        `${n}/actions-runner`,
        "/tmp/inline-comments-buffer.jsonl",
        ...(scrubPathsLatched?.pathDirs ?? []),
        C,
        s,
        s && s.includes("/_actions/") ? s.slice(0, s.indexOf("/_actions/") + 9) : void 0,
        scrubPathsLatched?.GITHUB_EVENT_PATH ?? process.env.GITHUB_EVENT_PATH,
        `${n}/.config/gh`,
        `${n}/.config/glab-cli`,
        `${n}/.netrc`,
        `${n}/.ssh`,
        `${r}/.git/hooks`,
        `${r}/.git/config`,
        `${r}/.git/config.lock`,
        `${r}/.git/config.worktree`,
        `${r}/.git/config.worktree.lock`,
        `${r}/.git/commondir`,
        `${r}/.git/worktrees`,
        `${r}/.gitmodules`,
        `${r}/.git/info/exclude`,
        `${r}/.git/glab-cli`,
        ..._,
      ].filter((a) => !!a),
    },
  };
}
//@ chunk-rtnapjwv.js:21194-21265 placement
function F(e) {
  return e.startsWith("CLAUDE_CODE_RELAUNCH_PROACTIVITY_");
}
//@ chunk-rtnapjwv.js:21265-21271 placement
var g;
//@ chunk-rtnapjwv.js:21271-21408 placement
function getScrubbedEnvNames() {
  let e = scrubbedEnvNames(),
    n = e.length > 0;
  if (g?.armed !== n) g = { armed: n, names: new Set([...flattened, ...e].map((r) => r.toUpperCase())) };
  return g.names;
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
  isSshPlaceholderAuth,
  federationCacheDir,
  subprocessEnv_2,
  hipaaWithholdsChildCredentials,
  dyr,
  SSH_PLACEHOLDER,
  spellingIn,
  settingsEnvKeptForChildren,
  proxyEnvForSubprocess,
  assertScrubSandboxAvailable,
  inheritedByChildren,
  buildBgDispatcherEnv,
  isChildScrubbedCredentialFamily,
  shouldScrubSubprocessEnv,
  armedRunnerShedsName,
  childScrubbedCredentialKeys,
  ghStandinDir,
  hipaaCredentialScrubKeys,
  withholdsDaemonForceColor,
  isScrubSandboxAvailable,
  xCi,
  enforceScriptCaps,
  scrubSandboxConfig,
  settingsPathForChildren,
  HIt,
  setSettingsEnvForChildren,
  holdsDaemonForceColor,
  BG_WORKER_IDENTITY_ENV_VARS,
  isArtifactDevBaseUrlVar,
};
