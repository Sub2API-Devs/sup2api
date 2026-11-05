/**
 * plugins/bundled/telemetry/environment.ts
 *
 * 2.1.316 新增：汇总遥测用的环境事实（平台、终端、shell、包管理器、CI 等）；通过 uname 等读取机器平台、架构、内核信息等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-08q4d92p.js (25)
 * attribution: placement 25
 */
import { DANGEROUS_SHELL_PREFIXES } from "../../../utils/shell/prefix.js";
import { JETBRAINS_IDES_2 } from "../../../utils/env.js";
import { isEnvTruthy, cloudEnvironmentName, githubActionVersion, isPlainObjectValue } from "./eventSchema.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-08q4d92p.js:12166-12316 placement
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
//@ chunk-08q4d92p.js:12490-13978 placement
function detectTerminalFromEnv(facts, platform, isInteractive) {
  let lower = (facts.vscodeGitAskpassMain ?? "").toLowerCase();
  let lower_2 = (facts.bundleIdentifier ?? "").toLowerCase();
  let term = facts.term ?? "";
  let termProgram = facts.termProgram ?? "";
  let isJetBrains = facts.terminalEmulator === "JetBrains-JediTerm";
  let found = JETBRAINS_IDES_2.find((ide) => lower_2.includes(ide));
  return (
    [
      [isJetBrains && platform !== "darwin", "pycharm"],
      [facts.hasCursorTraceId || lower.includes("cursor"), "cursor"],
      [lower.includes("windsurf"), "windsurf"],
      [lower.includes("antigravity"), "antigravity"],
      [lower_2.includes("vscodium"), "codium"],
      [lower_2.includes("windsurf") || lower_2.includes("devin"), "windsurf"],
      [lower_2.includes("com.google.android.studio"), "androidstudio"],
      [found !== undefined, found ?? ""],
      [facts.hasVisualStudioVersion, "visualstudio"],
      [isJetBrains, "pycharm"],
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
    ].find(([flag]) => flag)?.[1] ?? "unknown"
  );
}
//@ chunk-08q4d92p.js:13978-14203 placement
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
//@ chunk-08q4d92p.js:14203-14305 placement
/**
 * 逗号分隔字符串转为非空列表。
 */
function splitCommaList(tags) {
  let filtered = (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return filtered.length > 0 ? filtered : undefined;
}
//@ chunk-08q4d92p.js:14305-15422 placement
/**
 * 汇总遥测用的环境事实（平台、终端、shell、包管理器、CI 等）。
 */
function describeEnvironment(senderContext) {
  let { facts, machine, platform } = senderContext;
  let isGithubActions = isEnvTruthy(facts.githubActions);
  let isLinux = machine.platformRaw === "linux";
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
    isGithubAction: isGithubActions,
    isClaudeCodeAction: isEnvTruthy(facts.claudeCodeAction),
    isClaudeCodeRemote: isEnvTruthy(facts.claudeCodeRemote),
    isLocalAgentMode: facts.entrypoint === "local-agent",
    isConductor: facts.bundleIdentifier === "com.conductor.app",
    deploymentEnvironment: cloudEnvironmentName(senderContext.signals, platform),
    remoteEnvironmentType: facts.remoteEnvironmentType,
    claudeCodeContainerId: facts.containerId,
    claudeCodeRemoteSessionId: facts.remoteSessionId,
    tags: splitCommaList(facts.tags),
    githubEventName: isGithubActions ? facts.githubEventName : undefined,
    githubActionsRunnerEnvironment: isGithubActions ? facts.runnerEnvironment : undefined,
    githubActionsRunnerOs: isGithubActions ? facts.runnerOs : undefined,
    githubActionRef: isGithubActions ? githubActionVersion(facts.githubActionPath) : undefined,
    githubActionsMetadata: isGithubActions ? githubActionsIds(facts) : undefined,
    wslVersion: senderContext.wslVersion,
    linuxDistroId: senderContext.distro.id,
    linuxDistroVersion: senderContext.distro.version,
    linuxKernel: isLinux ? machine.kernel : undefined,
    vcs: senderContext.vcs,
    version: senderContext.engine?.version,
    versionBase: senderContext.engine?.base,
    buildTime: senderContext.engine?.builtAt,
  };
}
//@ chunk-08q4d92p.js:15422-15540 placement
/**
 * 从 os-release 内容中读 ID 或 VERSION_ID。
 */
var readOsReleaseField = (text, key) =>
  text
    .split(
      `
`,
    )
    .map((line) => /^(ID|VERSION_ID)=(.*)$/.exec(line))
    .find((match) => match?.[1] === key)?.[2]
    ?.replace(/^"|"$/g, "");
//@ chunk-08q4d92p.js:15540-15641 placement
/**
 * 读取发行版 id 与版本（读取失败为空）。
 */
async function readDistro(read) {
  let text;
  try {
    text = await read();
  } catch {
    text = "";
  }
  return {
    id: readOsReleaseField(text, "ID"),
    version: readOsReleaseField(text, "VERSION_ID"),
  };
}
//@ chunk-08q4d92p.js:15641-15789 placement
/**
 * 从内核版本字符串判断 WSL 版本。
 */
async function detectWslVersion(read) {
  let text;
  try {
    text = (await read()).toLowerCase();
  } catch {
    return;
  }
  let included = text.includes("microsoft");
  return /wsl(\d+)/.exec(text)?.[1] ?? (included ? "1" : undefined);
}
//@ chunk-08q4d92p.js:15789-16138 placement
/**
 * 读取 /etc/os-release、/proc/version 等判断发行版、WSL、EC2。
 */
async function readLinuxDistroFacts(fs, isLinux) {
  let [distro, wslVersion, isEc2, isDocker] = await Promise.all([
    isLinux
      ? readDistro(() => fs.read("/etc/os-release"))
      : {
          id: undefined,
          version: undefined,
        },
    isLinux ? detectWslVersion(() => fs.read("/proc/version")) : undefined,
    isLinux
      ? fs.read("/sys/hypervisor/uuid").then(
          (uuid) => uuid.startsWith("ec2"),
          () => false,
        )
      : false,
    isLinux ? fs.exists("/.dockerenv").catch(() => false) : false,
  ]);
  return {
    distro,
    wslVersion,
    fileSignals: [
      ["aws-ec2", isEc2],
      ["docker", isDocker],
    ],
  };
}
//@ chunk-08q4d92p.js:16138-16302 placement
function getClaudeJsonPath(env) {
  let baseDir = env.configDir || env.home || env.userProfile;
  let separator = baseDir?.includes("\\") && !baseDir.includes("/") ? "\\" : "/";
  return baseDir ? `${baseDir.replace(/[\\/]+$/, "")}${separator}.claude.json` : undefined;
}
//@ chunk-08q4d92p.js:16302-16311 placement
var MIN_ID_LENGTH = 8;
//@ chunk-08q4d92p.js:16311-16322 placement
var MAX_ID_LENGTH = 128;
//@ chunk-08q4d92p.js:16322-16400 placement
function pickValidId(value) {
  return typeof value === "string" && value.length >= MIN_ID_LENGTH && value.length <= MAX_ID_LENGTH
    ? value
    : undefined;
}
//@ chunk-08q4d92p.js:16400-16785 placement (2.1.88 match: companionUserId, 0.502)
/**
 * 从 ~/.claude.json 读取 userID（作为 deviceId）、oauthAccount 的 accountUuid/organizationUuid，按需包含邮箱。
 */
async function readClaudeJsonIdentity(readFile, env, includeEmail) {
  let claudeJsonPath = getClaudeJsonPath(env);
  let parsed;
  try {
    parsed = claudeJsonPath === undefined ? undefined : JSON.parse(await readFile(claudeJsonPath));
  } catch {
    parsed = undefined;
  }
  let config = isPlainObjectValue(parsed) ? parsed : {};
  let oauthAccount = isPlainObjectValue(config.oauthAccount) ? config.oauthAccount : {};
  let userID = config.userID;
  let emailAddress = oauthAccount.emailAddress;
  let hasUserId = typeof userID === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(userID);
  let includeEmailOk = includeEmail && typeof emailAddress === "string" && emailAddress !== "";
  return {
    deviceId: hasUserId ? userID : undefined,
    accountUuid: pickValidId(oauthAccount.accountUuid),
    organizationUuid: pickValidId(oauthAccount.organizationUuid),
    email: includeEmailOk ? emailAddress : undefined,
  };
}
//@ chunk-08q4d92p.js:16785-16984 placement
/**
 * 架构名规范化为 x64/arm64/ia32。
 */
function normalizeArch(arch) {
  let lower = arch.trim().toLowerCase();
  return (
    [
      [lower === "x86_64" || lower === "amd64", "x64"],
      [lower === "aarch64" || lower === "arm64", "arm64"],
      [lower === "x86" || /^i[3-6]86$/.test(lower), "ia32"],
    ].find(([condition]) => condition)?.[1] ??
    (lower || "unknown")
  );
}
//@ chunk-08q4d92p.js:16984-17224 placement
var joined; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-08q4d92p.js:16984", () => {
  joined = [
    "uname -s",
    "uname -r",
    "uname -m",
    'for c in npm yarn pnpm; do command -v "$c" >/dev/null 2>&1 && printf "%s," "$c"; done; echo',
    'for c in bun deno node; do command -v "$c" >/dev/null 2>&1 && printf "%s," "$c"; done; echo',
  ].join(`
`);
});
//@ chunk-08q4d92p.js:17224-17657 placement
/**
 * 通过 uname 等读取机器平台、架构、内核信息。
 */
async function readMachineFacts(run, env) {
  if (env.os === "Windows_NT")
    return {
      platformRaw: "win32",
      arch: normalizeArch(env.processorArchitecture ?? ""),
      kernel: undefined,
      packageManagers: "",
      runtimes: "",
    };
  let result;
  try {
    result = await run(["sh", "-c", joined]);
  } catch {
    result = undefined;
  }
  let [platform = "", kernel = "", arch = "", packageManagers = "", runtimes = ""] = (
    result?.exitCode === 0
      ? result.stdout.split(`
`)
      : []
  ).map((line) => line.trim());
  return {
    platformRaw: platform.toLowerCase() || "unknown",
    arch: normalizeArch(arch),
    kernel: kernel || undefined,
    packageManagers: packageManagers.replace(/,$/, ""),
    runtimes: runtimes.replace(/,$/, ""),
  };
}
//@ chunk-08q4d92p.js:17657-17763 placement (2.1.88 match: detectTerminal, 0.92)
function detectTerminal(hostPlatform, platformRaw) {
  return (
    ["win32", "darwin", "linux"].find((name) => name === hostPlatform) ??
    (platformRaw === "win32" || platformRaw === "darwin" ? platformRaw : "linux")
  );
}
//@ chunk-08q4d92p.js:17763-17775 placement
/**
 * 5000
 */
var GIT_COMMAND_TIMEOUT_MS = 5000;
//@ chunk-08q4d92p.js:17775-17785 placement
/**
 * 16
 */
var HEX_RADIX = 16;
//@ chunk-08q4d92p.js:17785-17870 placement
/**
 * 字节数组转十六进制
 */
var hexOf = (bytes) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(HEX_RADIX).padStart(2, "0")).join("");
//@ chunk-08q4d92p.js:17870-18090 placement
/**
 * git 远程地址规范化为 host/path（小写）。
 */
function normalizeGitRemote(remote) {
  let trimmed = remote.trim();
  let [, host, path] =
    /^git@([^:/@]+):(.+?)(?:\.git)?$/.exec(trimmed) ??
    /^(?:https?|ssh):\/\/(?:[^@/?#]*@)?([^/?#@]+)\/(.+?)(?:\.git)?$/.exec(trimmed) ??
    [];
  return host !== undefined && path !== undefined ? `${host}/${path}`.toLowerCase() : undefined;
}
//@ chunk-08q4d92p.js:18090-18100 placement
/**
 * 16
 */
var HEX_RADIX_BYTES = 16;
//@ chunk-08q4d92p.js:18100-18252 placement
/**
 * 规范化后的远程地址取 SHA-256 前缀。
 */
async function hashGitRemote(remote) {
  let normalized = remote ? normalizeGitRemote(remote) : undefined;
  if (normalized === undefined) return;
  return hexOf(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized))).slice(
    0,
    HEX_RADIX_BYTES,
  );
}
//@ chunk-08q4d92p.js:18252-18339 placement
function uniqueArray(values) {
  let seen = new Set();
  return values.filter((value) => {
    let isDuplicate = seen.has(value);
    seen.add(value);
    return !isDuplicate;
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
