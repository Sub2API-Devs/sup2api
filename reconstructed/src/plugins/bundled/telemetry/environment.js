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
import { isEnvTruthy, Xe, se, _ } from "./eventSchema.js";

/**
 * 取路径末段（去 .exe 小写）判断是否已知 shell 名，返回该名、"other" 或 "none"（遥测分类用）。
 */
//@ chunk-4m46mxx9.js:11914-12064 placement
function classifyShellName(e) {
  let t = (e ?? "")
    .split(/[/\\]/)
    .at(-1)
    ?.toLowerCase()
    .replace(/\.exe$/, "");
  if (!e) return "none";
  return t !== void 0 && DANGEROUS_SHELL_PREFIXES.includes(t) ? t : "other";
}
//@ chunk-4m46mxx9.js:12238-13726 placement
function detectTerminalFromEnv(e, t, r) {
  let lower = (e.vscodeGitAskpassMain ?? "").toLowerCase(),
    lower_2 = (e.bundleIdentifier ?? "").toLowerCase(),
    a = e.term ?? "",
    o = e.termProgram ?? "",
    c = e.terminalEmulator === "JetBrains-JediTerm",
    found = JETBRAINS_IDES_2.find((u) => lower_2.includes(u));
  return (
    [
      [c && t !== "darwin", "pycharm"],
      [e.hasCursorTraceId || lower.includes("cursor"), "cursor"],
      [lower.includes("windsurf"), "windsurf"],
      [lower.includes("antigravity"), "antigravity"],
      [lower_2.includes("vscodium"), "codium"],
      [lower_2.includes("windsurf") || lower_2.includes("devin"), "windsurf"],
      [lower_2.includes("com.google.android.studio"), "androidstudio"],
      [found !== void 0, found ?? ""],
      [e.hasVisualStudioVersion, "visualstudio"],
      [c, "pycharm"],
      [a === "xterm-ghostty", "ghostty"],
      [a.includes("kitty"), "kitty"],
      [/^devin([ -]desktop)?$/i.test(o), "windsurf"],
      [o !== "", o],
      [e.hasTmux, "tmux"],
      [e.hasSty, "screen"],
      [e.hasKonsoleVersion, "konsole"],
      [e.hasGnomeTerminalService, "gnome-terminal"],
      [e.hasXtermVersion, "xterm"],
      [e.hasVteVersion, "vte-based"],
      [e.hasTerminatorUuid, "terminator"],
      [e.hasKittyWindowId, "kitty"],
      [e.hasAlacrittyLog, "alacritty"],
      [e.hasTilixId, "tilix"],
      [e.hasWtSession, "windows-terminal"],
      [e.hasSessionName && a === "cygwin", "cygwin"],
      [e.msystem !== void 0, (e.msystem ?? "").toLowerCase()],
      [e.hasConEmuAnsi || e.hasConEmuPid || e.hasConEmuTask, "conemu"],
      [e.wslDistroName !== void 0, `wsl-${e.wslDistroName}`],
      [e.hasSshConnection || e.hasSshClient || e.hasSshTty, "ssh-session"],
      [a.includes("alacritty"), "alacritty"],
      [a.includes("rxvt"), "rxvt"],
      [a.includes("termite"), "termite"],
      [a !== "", a],
      [!r, "non-interactive"],
    ].find(([u]) => u)?.[1] ?? "unknown"
  );
}
/**
 * GitHub Actions 的 actor/仓库/所有者 id（都没有时 undefined）。
 */
//@ chunk-4m46mxx9.js:13726-13951 placement
function githubActionsIds(e) {
  return e.githubActorId !== void 0 || e.githubRepositoryId !== void 0 || e.githubRepositoryOwnerId !== void 0
    ? {
        actorId: e.githubActorId,
        repositoryId: e.githubRepositoryId,
        repositoryOwnerId: e.githubRepositoryOwnerId,
      }
    : void 0;
}
/**
 * 逗号分隔字符串转为非空列表。
 */
//@ chunk-4m46mxx9.js:13951-14053 placement
function splitCommaList(e) {
  let filtered = (e ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return filtered.length > 0 ? filtered : void 0;
}
/**
 * 汇总遥测用的环境事实（平台、终端、shell、包管理器、CI 等）。
 */
//@ chunk-4m46mxx9.js:14053-15170 placement
function describeEnvironment(e) {
  let { facts: facts, machine: machine, platform: platform } = e,
    n = isEnvTruthy(facts.githubActions),
    a = machine.platformRaw === "linux";
  return {
    platform: platform,
    platformRaw: machine.platformRaw,
    arch: machine.arch,
    terminal: detectTerminalFromEnv(facts, platform, e.isInteractive),
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
    deploymentEnvironment: Xe(e.signals, platform),
    remoteEnvironmentType: facts.remoteEnvironmentType,
    claudeCodeContainerId: facts.containerId,
    claudeCodeRemoteSessionId: facts.remoteSessionId,
    tags: splitCommaList(facts.tags),
    githubEventName: n ? facts.githubEventName : void 0,
    githubActionsRunnerEnvironment: n ? facts.runnerEnvironment : void 0,
    githubActionsRunnerOs: n ? facts.runnerOs : void 0,
    githubActionRef: n ? se(facts.githubActionPath) : void 0,
    githubActionsMetadata: n ? githubActionsIds(facts) : void 0,
    wslVersion: e.wslVersion,
    linuxDistroId: e.distro.id,
    linuxDistroVersion: e.distro.version,
    linuxKernel: a ? machine.kernel : void 0,
    vcs: e.vcs,
    version: e.engine?.version,
    versionBase: e.engine?.base,
    buildTime: e.engine?.builtAt,
  };
}
/**
 * 从 os-release 内容中读 ID 或 VERSION_ID。
 */
//@ chunk-4m46mxx9.js:15170-15288 placement
var readOsReleaseField = (e, t) =>
  e
    .split(
      `
`,
    )
    .map((r) => /^(ID|VERSION_ID)=(.*)$/.exec(r))
    .find((r) => r?.[1] === t)?.[2]
    ?.replace(/^"|"$/g, "");
/**
 * 读取发行版 id 与版本（读取失败为空）。
 */
//@ chunk-4m46mxx9.js:15288-15389 placement
async function readDistro(e) {
  let t;
  try {
    t = await e();
  } catch {
    t = "";
  }
  return { id: readOsReleaseField(t, "ID"), version: readOsReleaseField(t, "VERSION_ID") };
}
/**
 * 从内核版本字符串判断 WSL 版本。
 */
//@ chunk-4m46mxx9.js:15389-15537 placement
async function detectWslVersion(e) {
  let t;
  try {
    t = (await e()).toLowerCase();
  } catch {
    return;
  }
  let included = t.includes("microsoft");
  return /wsl(\d+)/.exec(t)?.[1] ?? (included ? "1" : void 0);
}
/**
 * 读取 /etc/os-release、/proc/version 等判断发行版、WSL、EC2。
 */
//@ chunk-4m46mxx9.js:15537-15886 placement
async function readLinuxDistroFacts(e, t) {
  let [r, i, n, a] = await Promise.all([
    t ? readDistro(() => e.read("/etc/os-release")) : { id: void 0, version: void 0 },
    t ? detectWslVersion(() => e.read("/proc/version")) : void 0,
    t
      ? e.read("/sys/hypervisor/uuid").then(
          (o) => o.startsWith("ec2"),
          () => !1,
        )
      : !1,
    t ? e.exists("/.dockerenv").catch(() => !1) : !1,
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
  let t = env.configDir || env.home || env.userProfile,
    r = t?.includes("\\") && !t.includes("/") ? "\\" : "/";
  return t ? `${t.replace(/[\\/]+$/, "")}${r}.claude.json` : void 0;
}
//@ chunk-4m46mxx9.js:16050-16059 placement
var MIN_ID_LENGTH = 8;
//@ chunk-4m46mxx9.js:16059-16070 placement
var MAX_ID_LENGTH = 128;
//@ chunk-4m46mxx9.js:16070-16148 placement
function pickValidId(value) {
  return typeof value === "string" && value.length >= MIN_ID_LENGTH && value.length <= MAX_ID_LENGTH
    ? value
    : void 0;
}
/**
 * 从 ~/.claude.json 读取 userID（作为 deviceId）、oauthAccount 的 accountUuid/organizationUuid，按需包含邮箱。
 */
//@ chunk-4m46mxx9.js:16148-16533 placement = companionUserId (0.502)
async function readClaudeJsonIdentity(readFile, env, includeEmail) {
  let i = getClaudeJsonPath(env),
    n;
  try {
    n = i === void 0 ? void 0 : JSON.parse(await readFile(i));
  } catch {
    n = void 0;
  }
  let a = _(n) ? n : {},
    o = _(a.oauthAccount) ? a.oauthAccount : {},
    userID = a.userID,
    emailAddress = o.emailAddress,
    p = typeof userID === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(userID),
    u = includeEmail && typeof emailAddress === "string" && emailAddress !== "";
  return {
    deviceId: p ? userID : void 0,
    accountUuid: pickValidId(o.accountUuid),
    organizationUuid: pickValidId(o.organizationUuid),
    email: u ? emailAddress : void 0,
  };
}
/**
 * 架构名规范化为 x64/arm64/ia32。
 */
//@ chunk-4m46mxx9.js:16533-16732 placement
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
/**
 * 通过 uname 等读取机器平台、架构、内核信息。
 */
//@ chunk-4m46mxx9.js:16972-17405 placement
async function readMachineFacts(e, t) {
  if (t.os === "Windows_NT")
    return {
      platformRaw: "win32",
      arch: normalizeArch(t.processorArchitecture ?? ""),
      kernel: void 0,
      packageManagers: "",
      runtimes: "",
    };
  let r;
  try {
    r = await e(["sh", "-c", joined]);
  } catch {
    r = void 0;
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
    kernel: n || void 0,
    packageManagers: o.replace(/,$/, ""),
    runtimes: c.replace(/,$/, ""),
  };
}
//@ chunk-4m46mxx9.js:17405-17511 placement = detectTerminal (0.92)
function detectTerminal(e, t) {
  return ["win32", "darwin", "linux"].find((n) => n === e) ?? (t === "win32" || t === "darwin" ? t : "linux");
}
//@ chunk-4m46mxx9.js:17511-17523 placement
var tt = 5000;
//@ chunk-4m46mxx9.js:17523-17533 placement
var Te = 16;
//@ chunk-4m46mxx9.js:17533-17618 placement
var he = (e) => [...new Uint8Array(e)].map((t) => t.toString(Te).padStart(2, "0")).join("");
/**
 * git 远程地址规范化为 host/path（小写）。
 */
//@ chunk-4m46mxx9.js:17618-17838 placement
function normalizeGitRemote(e) {
  let trimmed = e.trim(),
    [, r, i] =
      /^git@([^:/@]+):(.+?)(?:\.git)?$/.exec(trimmed) ??
      /^(?:https?|ssh):\/\/(?:[^@/?#]*@)?([^/?#@]+)\/(.+?)(?:\.git)?$/.exec(trimmed) ??
      [];
  return r !== void 0 && i !== void 0 ? `${r}/${i}`.toLowerCase() : void 0;
}
//@ chunk-4m46mxx9.js:17838-17848 placement
var Re = 16;
/**
 * 规范化后的远程地址取 SHA-256 前缀。
 */
//@ chunk-4m46mxx9.js:17848-18000 placement
async function hashGitRemote(e) {
  let t = e ? normalizeGitRemote(e) : void 0;
  if (t === void 0) return;
  return he(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))).slice(0, Re);
}
//@ chunk-4m46mxx9.js:18000-18087 placement
function uniqueArray(e) {
  let t = new Set();
  return e.filter((r) => {
    let i = t.has(r);
    return (t.add(r), !i);
  });
}

export {
  Te,
  joined,
  tt,
  Re,
  MIN_ID_LENGTH,
  MAX_ID_LENGTH,
  normalizeArch,
  uniqueArray,
  describeEnvironment,
  githubActionsIds,
  getClaudeJsonPath,
  he,
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
