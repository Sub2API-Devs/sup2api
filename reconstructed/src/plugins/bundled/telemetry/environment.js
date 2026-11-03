/**
 * plugins/bundled/telemetry/environment.ts
 *
 * 2.1.316 新增：汇总遥测用的环境事实（平台、终端、shell、包管理器、CI 等）；通过 uname 等读取机器平台、架构、内核信息等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4m46mxx9.js (25)
 * attribution: placement 25
 */
import { DANGEROUS_SHELL_PREFIXES } from "../../../utils/shell/prefix.js";
import { JETBRAINS_IDES_2 } from "../../../utils/env.js";
import { isEnvTruthy, cloudEnvironmentName, githubActionVersion, _ } from "./eventSchema.js";

//@ chunk-4m46mxx9.js:11914-12064 placement
/**
 * 取路径末段（去 .exe 小写）判断是否已知 shell 名，返回该名、"other" 或 "none"（遥测分类用）。
 */
function classifyShellName(shellPath) {
  let replaced = (shellPath ?? "")
    .split(/[/\\]/)
    .at(-1)
    ?.toLowerCase()
    .replace(/\.exe$/, "");
  if (!shellPath) return "none";
  return replaced !== undefined && DANGEROUS_SHELL_PREFIXES.includes(replaced) ? replaced : "other";
}
//@ chunk-4m46mxx9.js:12238-13726 placement
function detectTerminalFromEnv(facts, platform, isInteractive) {
  let lower = (facts.vscodeGitAskpassMain ?? "").toLowerCase();
  let lower_2 = (facts.bundleIdentifier ?? "").toLowerCase();
  let term = facts.term ?? "";
  let termProgram = facts.termProgram ?? "";
  let c = facts.terminalEmulator === "JetBrains-JediTerm";
  let found = JETBRAINS_IDES_2.find((u) => lower_2.includes(u));
  return (
    [
      [c && platform !== "darwin", "pycharm"],
      [facts.hasCursorTraceId || lower.includes("cursor"), "cursor"],
      [lower.includes("windsurf"), "windsurf"],
      [lower.includes("antigravity"), "antigravity"],
      [lower_2.includes("vscodium"), "codium"],
      [lower_2.includes("windsurf") || lower_2.includes("devin"), "windsurf"],
      [lower_2.includes("com.google.android.studio"), "androidstudio"],
      [found !== undefined, found ?? ""],
      [facts.hasVisualStudioVersion, "visualstudio"],
      [c, "pycharm"],
      [term === "xterm-ghostty", "ghostty"],
      [term.includes("kitty"), "kitty"],
      [/^devin([ -]desktop)?$/i.test(termProgram), "windsurf"],
      [termProgram !== "", termProgram],
      [facts.hasTmux, "tmux"],
      [facts.hasSty, "screen"],
      [facts.hasKonsoleVersion, "konsole"],
      [facts.hasGnomeTerminalService, "gnome-terminal"],
      [facts.hasXtermVersion, "xterm"],
      [facts.hasVteVersion, "vte-based"],
      [facts.hasTerminatorUuid, "terminator"],
      [facts.hasKittyWindowId, "kitty"],
      [facts.hasAlacrittyLog, "alacritty"],
      [facts.hasTilixId, "tilix"],
      [facts.hasWtSession, "windows-terminal"],
      [facts.hasSessionName && term === "cygwin", "cygwin"],
      [facts.msystem !== undefined, (facts.msystem ?? "").toLowerCase()],
      [facts.hasConEmuAnsi || facts.hasConEmuPid || facts.hasConEmuTask, "conemu"],
      [facts.wslDistroName !== undefined, `wsl-${facts.wslDistroName}`],
      [facts.hasSshConnection || facts.hasSshClient || facts.hasSshTty, "ssh-session"],
      [term.includes("alacritty"), "alacritty"],
      [term.includes("rxvt"), "rxvt"],
      [term.includes("termite"), "termite"],
      [term !== "", term],
      [!isInteractive, "non-interactive"],
    ].find(([u]) => u)?.[1] ?? "unknown"
  );
}
//@ chunk-4m46mxx9.js:13726-13951 placement
/**
 * GitHub Actions 的 actor/仓库/所有者 id（都没有时 undefined）。
 */
function githubActionsIds(facts) {
  return facts.githubActorId !== undefined ||
    facts.githubRepositoryId !== undefined ||
    facts.githubRepositoryOwnerId !== undefined
    ? {
        actorId: facts.githubActorId,
        repositoryId: facts.githubRepositoryId,
        repositoryOwnerId: facts.githubRepositoryOwnerId,
      }
    : undefined;
}
//@ chunk-4m46mxx9.js:13951-14053 placement
/**
 * 逗号分隔字符串转为非空列表。
 */
function splitCommaList(tags) {
  let filtered = (tags ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return filtered.length > 0 ? filtered : undefined;
}
//@ chunk-4m46mxx9.js:14053-15170 placement
/**
 * 汇总遥测用的环境事实（平台、终端、shell、包管理器、CI 等）。
 */
function describeEnvironment(senderContext) {
  let { facts, machine, platform } = senderContext;
  let n = isEnvTruthy(facts.githubActions);
  let a = machine.platformRaw === "linux";
  return {
    platform,
    platformRaw: machine.platformRaw,
    arch: machine.arch,
    terminal: detectTerminalFromEnv(facts, platform, senderContext.isInteractive),
    shell: classifyShellName(facts.shellPath),
    packageManagers: machine.packageManagers,
    runtimes: machine.runtimes,
    isCi: isEnvTruthy(facts.ci),
    isClaubbit: isEnvTruthy(facts.claubbit),
    isGithubAction: n,
    isClaudeCodeAction: isEnvTruthy(facts.claudeCodeAction),
    isClaudeCodeRemote: isEnvTruthy(facts.claudeCodeRemote),
    isLocalAgentMode: facts.entrypoint === "local-agent",
    isConductor: facts.bundleIdentifier === "com.conductor.app",
    deploymentEnvironment: cloudEnvironmentName(senderContext.signals, platform),
    remoteEnvironmentType: facts.remoteEnvironmentType,
    claudeCodeContainerId: facts.containerId,
    claudeCodeRemoteSessionId: facts.remoteSessionId,
    tags: splitCommaList(facts.tags),
    githubEventName: n ? facts.githubEventName : undefined,
    githubActionsRunnerEnvironment: n ? facts.runnerEnvironment : undefined,
    githubActionsRunnerOs: n ? facts.runnerOs : undefined,
    githubActionRef: n ? githubActionVersion(facts.githubActionPath) : undefined,
    githubActionsMetadata: n ? githubActionsIds(facts) : undefined,
    wslVersion: senderContext.wslVersion,
    linuxDistroId: senderContext.distro.id,
    linuxDistroVersion: senderContext.distro.version,
    linuxKernel: a ? machine.kernel : undefined,
    vcs: senderContext.vcs,
    version: senderContext.engine?.version,
    versionBase: senderContext.engine?.base,
    buildTime: senderContext.engine?.builtAt,
  };
}
//@ chunk-4m46mxx9.js:15170-15288 placement
/**
 * 从 os-release 内容中读 ID 或 VERSION_ID。
 */
var readOsReleaseField = (e, t) =>
  e
    .split(
      `
`,
    )
    .map((line) => /^(ID|VERSION_ID)=(.*)$/.exec(line))
    .find((r) => r?.[1] === t)?.[2]
    ?.replace(/^"|"$/g, "");
//@ chunk-4m46mxx9.js:15288-15389 placement
/**
 * 读取发行版 id 与版本（读取失败为空）。
 */
async function readDistro(e) {
  let t;
  try {
    t = await e();
  } catch {
    t = "";
  }
  return {
    id: readOsReleaseField(t, "ID"),
    version: readOsReleaseField(t, "VERSION_ID"),
  };
}
//@ chunk-4m46mxx9.js:15389-15537 placement
/**
 * 从内核版本字符串判断 WSL 版本。
 */
async function detectWslVersion(e) {
  let t;
  try {
    t = (await e()).toLowerCase();
  } catch {
    return;
  }
  let included = t.includes("microsoft");
  return /wsl(\d+)/.exec(t)?.[1] ?? (included ? "1" : undefined);
}
//@ chunk-4m46mxx9.js:15537-15886 placement
/**
 * 读取 /etc/os-release、/proc/version 等判断发行版、WSL、EC2。
 */
async function readLinuxDistroFacts(e, t) {
  let [r, i, n, a] = await Promise.all([
    t
      ? readDistro(() => e.read("/etc/os-release"))
      : {
          id: undefined,
          version: undefined,
        },
    t ? detectWslVersion(() => e.read("/proc/version")) : undefined,
    t
      ? e.read("/sys/hypervisor/uuid").then(
          (o) => o.startsWith("ec2"),
          () => false,
        )
      : false,
    t ? e.exists("/.dockerenv").catch(() => false) : false,
  ]);
  return {
    distro: r,
    wslVersion: i,
    fileSignals: [
      ["aws-ec2", n],
      ["docker", a],
    ],
  };
}
//@ chunk-4m46mxx9.js:15886-16050 placement
function getClaudeJsonPath(env) {
  let t = env.configDir || env.home || env.userProfile;
  let r = t?.includes("\\") && !t.includes("/") ? "\\" : "/";
  return t ? `${t.replace(/[\\/]+$/, "")}${r}.claude.json` : undefined;
}
//@ chunk-4m46mxx9.js:16050-16059 placement
var MIN_ID_LENGTH = 8;
//@ chunk-4m46mxx9.js:16059-16070 placement
var MAX_ID_LENGTH = 128;
//@ chunk-4m46mxx9.js:16070-16148 placement
function pickValidId(value) {
  return typeof value === "string" && value.length >= MIN_ID_LENGTH && value.length <= MAX_ID_LENGTH
    ? value
    : undefined;
}
//@ chunk-4m46mxx9.js:16148-16533 placement = companionUserId (0.502)
/**
 * 从 ~/.claude.json 读取 userID（作为 deviceId）、oauthAccount 的 accountUuid/organizationUuid，按需包含邮箱。
 */
async function readClaudeJsonIdentity(readFile, env, includeEmail) {
  let claudeJsonPath = getClaudeJsonPath(env);
  let n;
  try {
    n = claudeJsonPath === undefined ? undefined : JSON.parse(await readFile(claudeJsonPath));
  } catch {
    n = undefined;
  }
  let a = _(n) ? n : {};
  let oauthAccount = _(a.oauthAccount) ? a.oauthAccount : {};
  let userID = a.userID;
  let emailAddress = oauthAccount.emailAddress;
  let p = typeof userID === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(userID);
  let u = includeEmail && typeof emailAddress === "string" && emailAddress !== "";
  return {
    deviceId: p ? userID : undefined,
    accountUuid: pickValidId(oauthAccount.accountUuid),
    organizationUuid: pickValidId(oauthAccount.organizationUuid),
    email: u ? emailAddress : undefined,
  };
}
//@ chunk-4m46mxx9.js:16533-16732 placement
/**
 * 架构名规范化为 x64/arm64/ia32。
 */
function normalizeArch(e) {
  let lower = e.trim().toLowerCase();
  return (
    [
      [lower === "x86_64" || lower === "amd64", "x64"],
      [lower === "aarch64" || lower === "arm64", "arm64"],
      [lower === "x86" || /^i[3-6]86$/.test(lower), "ia32"],
    ].find(([i]) => i)?.[1] ??
    (lower || "unknown")
  );
}
//@ chunk-4m46mxx9.js:16732-16972 placement
var joined = [
  "uname -s",
  "uname -r",
  "uname -m",
  'for c in npm yarn pnpm; do command -v "$c" >/dev/null 2>&1 && printf "%s," "$c"; done; echo',
  'for c in bun deno node; do command -v "$c" >/dev/null 2>&1 && printf "%s," "$c"; done; echo',
].join(`
`);
//@ chunk-4m46mxx9.js:16972-17405 placement
/**
 * 通过 uname 等读取机器平台、架构、内核信息。
 */
async function readMachineFacts(run, t) {
  if (t.os === "Windows_NT")
    return {
      platformRaw: "win32",
      arch: normalizeArch(t.processorArchitecture ?? ""),
      kernel: undefined,
      packageManagers: "",
      runtimes: "",
    };
  let r;
  try {
    r = await run(["sh", "-c", joined]);
  } catch {
    r = undefined;
  }
  let [i = "", n = "", a = "", o = "", c = ""] = (
    r?.exitCode === 0
      ? r.stdout.split(`
`)
      : []
  ).map((E) => E.trim());
  return {
    platformRaw: i.toLowerCase() || "unknown",
    arch: normalizeArch(a),
    kernel: n || undefined,
    packageManagers: o.replace(/,$/, ""),
    runtimes: c.replace(/,$/, ""),
  };
}
//@ chunk-4m46mxx9.js:17405-17511 placement = detectTerminal (0.92)
function detectTerminal(hostPlatform, platformRaw) {
  return (
    ["win32", "darwin", "linux"].find((n) => n === hostPlatform) ??
    (platformRaw === "win32" || platformRaw === "darwin" ? platformRaw : "linux")
  );
}
//@ chunk-4m46mxx9.js:17511-17523 placement
/**
 * 5000
 */
var GIT_COMMAND_TIMEOUT_MS = 5000;
//@ chunk-4m46mxx9.js:17523-17533 placement
/**
 * 16
 */
var HEX_RADIX = 16;
//@ chunk-4m46mxx9.js:17533-17618 placement
/**
 * 字节数组转十六进制
 */
var hexOf = (e) => [...new Uint8Array(e)].map((t) => t.toString(HEX_RADIX).padStart(2, "0")).join("");
//@ chunk-4m46mxx9.js:17618-17838 placement
/**
 * git 远程地址规范化为 host/path（小写）。
 */
function normalizeGitRemote(e) {
  let trimmed = e.trim();
  let [, r, i] =
    /^git@([^:/@]+):(.+?)(?:\.git)?$/.exec(trimmed) ??
    /^(?:https?|ssh):\/\/(?:[^@/?#]*@)?([^/?#@]+)\/(.+?)(?:\.git)?$/.exec(trimmed) ??
    [];
  return r !== undefined && i !== undefined ? `${r}/${i}`.toLowerCase() : undefined;
}
//@ chunk-4m46mxx9.js:17838-17848 placement
/**
 * 16
 */
var HEX_RADIX_BYTES = 16;
//@ chunk-4m46mxx9.js:17848-18000 placement
/**
 * 规范化后的远程地址取 SHA-256 前缀。
 */
async function hashGitRemote(remote) {
  let t = remote ? normalizeGitRemote(remote) : undefined;
  if (t === undefined) return;
  return hexOf(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))).slice(0, HEX_RADIX_BYTES);
}
//@ chunk-4m46mxx9.js:18000-18087 placement
function uniqueArray(e) {
  let t = new Set();
  return e.filter((r) => {
    let i = t.has(r);
    t.add(r);
    return !i;
  });
}
export {
  HEX_RADIX,
  joined,
  GIT_COMMAND_TIMEOUT_MS,
  HEX_RADIX_BYTES,
  MIN_ID_LENGTH,
  MAX_ID_LENGTH,
  normalizeArch,
  uniqueArray,
  describeEnvironment,
  githubActionsIds,
  getClaudeJsonPath,
  hexOf,
  readClaudeJsonIdentity,
  readDistro,
  readLinuxDistroFacts,
  readMachineFacts,
  normalizeGitRemote,
  readOsReleaseField,
  detectTerminal,
  pickValidId,
  hashGitRemote,
  classifyShellName,
  splitCommaList,
  detectTerminalFromEnv,
  detectWslVersion,
};
