/**
 * utils/doctorDiagnostic.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/doctorDiagnostic.ts
 * pieces: chunk-tfmhpnyx.js (30)
 * attribution: placement 11, fingerprint 7, layout 12
 */
import { win32, posix, join, delimiter } from "path";
import { realpath, lstat } from "fs/promises";
import { homedir } from "os";
import { osReleaseClientPerHost } from "./nativeInstaller/packageManagers.js";
import { getRootSession } from "../bootstrap/state.js";
import { getPlatform } from "./platform.js";
import { isStandaloneExecutable } from "./slowOperations.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { isRunningFromLocalInstallation, localInstallationExists, getShellType } from "./localInstaller.js";
import { safeExecShell } from "./safeSpawn.js";
import { HostScoped } from "./hostScoped.js";
import { whichAsync } from "./which.js";
import { getFsImplementation } from "./fsOperations.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { preferRemoteValue } from "../remote/remoteMode.js";
import { getCwd } from "./cwd.js";
import { getGlobalConfig, getAutoUpdaterDisabledReason, formatAutoUpdaterDisabledReason } from "./config.js";
import { getOtelHeadersHelperLastFailure } from "./auth.js";
import { clippedMessage, MAX_CLIP_CHARS } from "./stringUtils.js";
import { env } from "./env.js";
import { getUserBinDir } from "./xdg.js";
import { isInstallLinkOrMissing, isNpmSymlink } from "./nativeInstaller/installer.js";
import { getShellConfigPaths, findClaudeAlias, findValidClaudeAlias } from "./shellConfig.js";
import { isEnvTruthy } from "./envUtils.js";
import { SandboxManager, isScrubOnlySandboxMode } from "./sandbox/sandbox-adapter.js";
import { summarizeList, describeDeniesOnAnotherHost } from "./sandbox/deniesOnAnotherHost.js";
import { isWindowsSandboxEnabled } from "./sandbox/windowsSandbox.js";
import { getWindowsSandboxUserStatus } from "./sandbox/windowsSandboxStatus.js";
import { getBuildRefSuffix } from "../cli/earlyArgs.js";
import { checkGlobalInstallPermissions } from "./autoUpdater.js";
import { getRipgrepStatus } from "./ripgrep.js";
import { readUpdateResult } from "./nativeInstaller/updateResult.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tfmhpnyx.js:5026-5062 placement
/**
 * 取当前宿主的发行版探测对象。
 */
function osReleaseProbe() {
  return osReleaseClientPerHost.of(getRootSession().host);
}
//@ chunk-tfmhpnyx.js:5062-5101 placement
/**
 * 判断是否由 pacman 安装。
 */
function detectPacman() {
  return osReleaseProbe().detectPacman();
}
//@ chunk-tfmhpnyx.js:5101-5137 placement
/**
 * 判断是否由 deb 包安装。
 */
function detectDeb() {
  return osReleaseProbe().detectDeb();
}
//@ chunk-tfmhpnyx.js:5137-5173 placement
/**
 * 判断是否由 rpm 包安装。
 */
function detectRpm() {
  return osReleaseProbe().detectRpm();
}
//@ chunk-tfmhpnyx.js:5173-5209 placement
/**
 * 判断是否由 apk 包安装。
 */
function detectApk() {
  return osReleaseProbe().detectApk();
}
//@ chunk-tfmhpnyx.js:5209-5252 placement
/**
 * 判断是否由 Homebrew 安装。
 */
function detectHomebrew() {
  return osReleaseProbe().detectHomebrew();
}
//@ chunk-tfmhpnyx.js:5252-5300 placement
/**
 * 取 Homebrew cask 的名称。
 */
function getHomebrewCaskName() {
  return osReleaseProbe().getHomebrewCaskName();
}
//@ chunk-tfmhpnyx.js:5300-5339 placement
/**
 * 判断是否由 winget 安装。
 */
function detectWinget() {
  return osReleaseProbe().detectWinget();
}
//@ chunk-tfmhpnyx.js:5339-5376 placement
/**
 * 判断是否由 mise 管理。
 */
function detectMise() {
  return osReleaseProbe().detectMise();
}
//@ chunk-tfmhpnyx.js:5376-5413 placement
/**
 * 判断是否由 asdf 管理。
 */
function detectAsdf() {
  return osReleaseProbe().detectAsdf();
}
//@ chunk-tfmhpnyx.js:5413-5459 placement
/**
 * 返回探测到的包管理器名称。
 */
function getPackageManager() {
  return osReleaseProbe().getPackageManager();
}
//@ chunk-tfmhpnyx.js:5459-5628 fingerprint (2.1.88 match: getNormalizedPaths, 1)
function getNormalizedPaths() {
  let invokedPath = process.argv[1] || "";
  let execPath = process.execPath || process.argv[0] || "";
  if (getPlatform() === "windows") {
    invokedPath = invokedPath.split(win32.sep).join(posix.sep);
    execPath = execPath.split(win32.sep).join(posix.sep);
  }
  return [invokedPath, execPath];
}
//@ chunk-tfmhpnyx.js:5628-6385 fingerprint (2.1.88 match: getCurrentInstallationType, 0.877)
/**
 * 判断当前安装类型：npm-local/npm-global/native/package-manager/development/unknown。
 */
async function getCurrentInstallationType() {
  let [invokedPath, normalizedPath] = getNormalizedPaths();
  if (isStandaloneExecutable()) {
    let localNodeModules =
      getClaudeConfigDir().replace(/\\/g, "/").replace(/\/+$/, "") + "/local/node_modules/";
    if (normalizedPath.startsWith(localNodeModules)) return "npm-local";
    if (normalizedPath.includes("/node_modules/@anthropic-ai/")) return "npm-global";
    if (
      detectHomebrew() ||
      detectWinget() ||
      detectMise() ||
      detectAsdf() ||
      (await detectPacman()) ||
      (await detectDeb()) ||
      (await detectRpm()) ||
      (await detectApk())
    )
      return "package-manager";
    return "native";
  }
  if (isRunningFromLocalInstallation()) return "npm-local";
  if (
    [
      "/usr/local/lib/node_modules",
      "/usr/lib/node_modules",
      "/opt/homebrew/lib/node_modules",
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/.nvm/versions/node/",
    ].some((path) => invokedPath.includes(path))
  )
    return "npm-global";
  if (invokedPath.includes("/npm/") || invokedPath.includes("/nvm/")) return "npm-global";
  let npmConfigResult = await safeExecShell("npm config get prefix", {
    reject: false,
  });
  let globalPrefix = npmConfigResult.exitCode === 0 ? npmConfigResult.stdout.trim() : null;
  if (globalPrefix && invokedPath.startsWith(globalPrefix)) return "npm-global";
  return "unknown";
}
//@ chunk-tfmhpnyx.js:6385-6406 layout
class InstallTypeProbeState {
  attempted = false;
}
//@ chunk-tfmhpnyx.js:6406-6429 layout
var installTypeProbeSlot; // deferred: uses InstallTypeProbeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tfmhpnyx.js:6406", () => {
  installTypeProbeSlot = new HostScoped(() => new InstallTypeProbeState());
});
//@ chunk-tfmhpnyx.js:6429-6476 layout
/**
 * 本进程是否已探测过安装类型。
 */
function wasInstallTypeProbed() {
  return installTypeProbeSlot.of(getRootSession().host).attempted;
}
//@ chunk-tfmhpnyx.js:6476-6543 layout
/**
 * 探测并记住安装类型（getCurrentInstallationType 的记录版）。
 */
async function getCurrentInstallationTypeProbed() {
  installTypeProbeSlot.of(getRootSession().host).attempted = true;
  return await getCurrentInstallationType();
}
//@ chunk-tfmhpnyx.js:6543-6831 fingerprint (2.1.88 match: getInstallationPath, 0.831)
async function getInstallationPath() {
  if (isStandaloneExecutable()) {
    try {
      return await realpath(process.execPath);
    } catch {}
    try {
      let path = await whichAsync("claude");
      if (path) return path;
    } catch {}
    try {
      await getFsImplementation().stat(join(homedir(), ".local/bin/claude"));
      return join(homedir(), ".local/bin/claude");
    } catch {}
    return "native";
  }
  try {
    return process.argv[0] || "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-tfmhpnyx.js:6831-6949 layout (2.1.88 match: getTeammateCommand, 1)
/**
 * 队友启动命令：编译版用 execPath，否则 argv[1]。
 */
function getTeammateCommand() {
  try {
    if (isStandaloneExecutable()) return process.execPath || "unknown";
    return process.argv[1] || "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-tfmhpnyx.js:6949-9489 fingerprint (2.1.88 match: detectMultipleInstallations, 0.812)
async function detectMultipleInstallations() {
  let fs = getFsImplementation();
  let installations = [];
  let localPath = join(homedir(), ".claude", "local");
  if (await localInstallationExists())
    installations.push({
      type: "npm-local",
      path: localPath,
    });
  let packagesToCheck = ["@anthropic-ai/claude-code"];
  if (
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL &&
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL !== "@anthropic-ai/claude-code"
  )
    packagesToCheck.push(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL,
    );
  let npmResult = await execFileNoThrow("npm", ["-g", "config", "get", "prefix"], {
    cwd: preferRemoteValue(getCwd(), homedir()),
  });
  if (npmResult.code === 0 && npmResult.stdout) {
    let npmPrefix = npmResult.stdout.trim();
    let isWindows = getPlatform() === "windows";
    let globalBinPath = isWindows ? join(npmPrefix, "claude") : join(npmPrefix, "bin", "claude");
    let globalBinExists = false;
    try {
      await fs.stat(globalBinPath);
      globalBinExists = true;
    } catch {}
    if (globalBinExists) {
      let isCurrentHomebrewInstallation = false;
      try {
        if ((await realpath(globalBinPath)).includes("/Caskroom/"))
          isCurrentHomebrewInstallation = detectHomebrew();
      } catch {}
      if (!isCurrentHomebrewInstallation) {
        let found = false;
        for (let packageName of packagesToCheck) {
          let packagePath = isWindows
            ? join(npmPrefix, "node_modules", packageName)
            : join(npmPrefix, "lib", "node_modules", packageName);
          try {
            await fs.stat(packagePath);
            found = true;
            break;
          } catch {}
        }
        if (found)
          installations.push({
            type: "npm-global",
            path: globalBinPath,
          });
      }
    } else
      for (let packageName of packagesToCheck) {
        let globalPackagePath = isWindows
          ? join(npmPrefix, "node_modules", packageName)
          : join(npmPrefix, "lib", "node_modules", packageName);
        try {
          await fs.stat(globalPackagePath);
          installations.push({
            type: "npm-global-orphan",
            path: globalPackagePath,
          });
        } catch {}
      }
  }
  let nativeBinPath = join(homedir(), ".local", "bin", "claude");
  try {
    await fs.stat(nativeBinPath);
    installations.push({
      type: "native",
      path: nativeBinPath,
    });
  } catch {}
  if (getGlobalConfig().installMethod === "native") {
    let nativeDataPath = join(homedir(), ".local", "share", "claude");
    try {
      await fs.stat(nativeDataPath);
      if (!installations.some((i) => i.type === "native"))
        installations.push({
          type: "native",
          path: nativeDataPath,
        });
    } catch {}
  }
  return installations;
}
//@ chunk-tfmhpnyx.js:9489-9768 layout
function isPathInList(pathDirectories, localBinPath) {
  let isWindows = getPlatform() === "windows";
  let normalizedBin = localBinPath;
  if (isWindows) normalizedBin = localBinPath.split(win32.sep).join(posix.sep).toLowerCase();
  return pathDirectories.some((dir) => {
    let normalizedDir = dir;
    if (isWindows) normalizedDir = dir.split(win32.sep).join(posix.sep).toLowerCase();
    let trimmedDir = normalizedDir.replace(/\/+$/, "");
    let trimmedRawDir = dir.replace(/[/\\]+$/, "");
    return (
      trimmedDir === normalizedBin || trimmedRawDir === "~/.local/bin" || trimmedRawDir === "$HOME/.local/bin"
    );
  });
}
//@ chunk-tfmhpnyx.js:9768-12370 fingerprint (2.1.88 match: detectConfigurationIssues, 0.792)
/**
 * 检测配置问题：otelHeadersHelper 失败、PATH 缺 ~/.local/bin、沙箱设置等，返回 {issue,fix}。
 */
async function detectConfigurationIssues(type) {
  let warnings = [];
  let otelHeadersHelperLastFailure = getOtelHeadersHelperLastFailure();
  if (otelHeadersHelperLastFailure)
    warnings.push({
      issue: `otelHeadersHelper is configured but its last invocation failed: ${clippedMessage(otelHeadersHelperLastFailure, MAX_CLIP_CHARS)}`,
      fix: "Run the configured helper manually and confirm it prints a JSON object of string header values. If the value is a file path, confirm the file exists and is executable.",
    });
  let config = getGlobalConfig();
  if (type === "development") return warnings;
  if (type === "native") {
    let path = (env.PATH || "").split(delimiter);
    let homeDir = homedir();
    let localBinPath = join(homeDir, ".local", "bin");
    let launcherPath = join(getUserBinDir(), "claude");
    if (
      !(await isInstallLinkOrMissing(launcherPath)) &&
      !(await isNpmSymlink(launcherPath).catch(() => false))
    )
      warnings.push({
        issue: `${launcherPath} was not created by the native installer (it is not a symlink into the versions/ directory), so auto-update leaves it untouched.`,
        fix: `If you put a launcher wrapper there on purpose, this is expected \u2014 new versions still install under $XDG_DATA_HOME/claude/versions, your launcher decides what runs, and automatic version cleanup is disabled on this machine (the installer cannot tell which version your launcher needs, so it keeps them all). To let Claude Code manage the launcher again, remove ${launcherPath} and run \`claude update\`.`,
      });
    if (!isPathInList(path, localBinPath))
      if (getPlatform() === "windows") {
        let windowsLocalBinPath = localBinPath.split(posix.sep).join(win32.sep);
        warnings.push({
          issue: `Native installation exists but ${windowsLocalBinPath} is not in your PATH`,
          fix: "Add it by opening: System Properties \u2192 Environment Variables \u2192 Edit User PATH \u2192 New \u2192 Add the path above. Then restart your terminal.",
        });
      } else {
        let shellType = getShellType();
        let configFile = getShellConfigPaths()[shellType];
        let displayPath = configFile ? configFile.replace(homedir(), "~") : "your shell config file";
        warnings.push({
          issue: "Native installation exists but ~/.local/bin is not in your PATH",
          fix: `Run: echo 'export PATH="$HOME/.local/bin:$PATH"' >> ${displayPath} then open a new terminal or run: source ${displayPath}`,
        });
      }
  }
  if (!isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) {
    if (type === "npm-local" && config.installMethod !== "local")
      warnings.push({
        issue: `Running from local installation but config install method is '${config.installMethod ?? "not set"}'`,
        fix: "Consider using native installation: `claude install`",
      });
    if (type === "native" && config.installMethod !== "native")
      warnings.push({
        issue: `Running native installation but config install method is '${config.installMethod ?? "not set"}'`,
        fix: "Run `claude install` to update configuration",
      });
  }
  if (type === "npm-global" && (await localInstallationExists()))
    warnings.push({
      issue: "Local installation exists but not being used",
      fix: "Consider using native installation: `claude install`",
    });
  let existingAlias = await findClaudeAlias();
  let validAlias = await findValidClaudeAlias();
  if (type === "npm-local") {
    if (!(await whichAsync("claude")) && !validAlias)
      if (existingAlias)
        warnings.push({
          issue: "Local installation not accessible",
          fix: `Alias exists but points to invalid target: ${existingAlias}. Update alias: alias claude="~/.claude/local/claude"`,
        });
      else
        warnings.push({
          issue: "Local installation not accessible",
          fix: 'Create alias: alias claude="~/.claude/local/claude"',
        });
  }
  return warnings;
}
//@ chunk-tfmhpnyx.js:12370-12402 layout
async function noopNull() {
  return null;
}
//@ chunk-tfmhpnyx.js:12402-13822 layout
function getMaskCredentialWarnings() {
  if (!SandboxManager.isSandboxingEnabled()) return [];
  if (SandboxManager.canMaskCredentialWarningFire()) SandboxManager.checkDependencies();
  let maskCredentialWarning = SandboxManager.getMaskCredentialWarning();
  if (!maskCredentialWarning) return [];
  return maskCredentialWarning.split(" \xB7 ").map((warningText) => {
    if (warningText.includes("have an empty injectHosts"))
      return {
        issue: warningText.replace(/\.\s*If the adapter forced this.*$/, ""),
        fix: "If the adapter forced this (a filesystem.allowRead entry re-opened a denied credential path), remove the conflicting allowRead entry or the deny; if a parent/managed settings tier supplied this mask, sentinel-only is its intended posture (that channel cannot grant injection, so an injectHosts set there is stripped on load) and the entry can only be removed in the parent settings; otherwise set injectHosts or remove the entry",
      };
    if (warningText.includes("degrade to deny on macOS"))
      return {
        issue: warningText.replace(/\.\s*Note that switching them.*$/, ""),
        fix: "Set sandbox.filesystem.disabled: false in user or managed settings (overrides the GrowthBook policy; ignored if managed settings pin the filesystem layer), or remove the mask entries \u2014 a deny provides no protection while the relaxed filesystem policy is active",
      };
    return {
      issue: warningText.replace(/\s*Enable sandbox\.network\.tlsTerminate.*$/, ""),
      fix: isScrubOnlySandboxMode()
        ? "Set sandbox.enabled: true plus sandbox.network.tlsTerminate, or remove the mask entries \u2014 TLS termination is never enabled in scrub-only mode"
        : "Enable sandbox.network.tlsTerminate (or remove the mask entries)",
    };
  });
}
//@ chunk-tfmhpnyx.js:13822-14138 fingerprint (2.1.88 match: detectLinuxGlobPatternWarnings, 0.937)
function detectLinuxGlobPatternWarnings() {
  if (getPlatform() !== "linux") return [];
  let warnings = [];
  let globPatterns = SandboxManager.getLinuxGlobPatternWarnings();
  if (globPatterns.length > 0) {
    let summary = summarizeList(globPatterns);
    warnings.push({
      issue: "Glob patterns in sandbox permission rules are not fully supported on Linux",
      fix: `Found ${globPatterns.length} pattern(s): ${summary}. On Linux, glob patterns in Edit/Read rules will be ignored.`,
    });
  }
  return warnings;
}
//@ chunk-tfmhpnyx.js:14138-15001 layout
async function findLeftoverSandboxMasks() {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return [];
  if (!SandboxManager.isSandboxingEnabled()) return [];
  let config = SandboxManager.getConfig();
  if (config === undefined || config.filesystem.disabled) return [];
  let { denyWithinAllow } = SandboxManager.getFsWriteConfig();
  let results = await Promise.all(
    denyWithinAllow.map(async (maskPath) => {
      try {
        let stats = await lstat(maskPath);
        return stats.isFile() && stats.size === 0 && (stats.mode & 146) === 0 && stats.nlink === 1;
      } catch {
        return false;
      }
    }),
  );
  let leftovers = new Set(denyWithinAllow.filter((maskPath, index) => results[index]));
  if (leftovers.size === 0) return [];
  return [
    {
      issue: `Sandbox mask files left behind at write-deny paths: ${summarizeList([...leftovers])}`,
      fix: 'A session leaves one where it was killed, or where it exited while a sandboxed command was still running. Remove each with `rm <path>` while no other Claude Code session is running in that project \u2014 a 0-byte read-only file where a settings file belongs makes "Yes, and don\'t ask again" fail to save, and the sandbox binds it read-only again on every start',
    },
  ];
}
//@ chunk-tfmhpnyx.js:15001-15784 layout
function getUnbracketedIpv6DomainIssues() {
  let unbracketedIpv6DomainWarnings = SandboxManager.getUnbracketedIpv6DomainWarnings();
  if (unbracketedIpv6DomainWarnings.length === 0) return [];
  return [
    {
      issue: "Sandbox network domain entries have unreliable spellings",
      fix: `Found: ${summarizeList(unbracketedIpv6DomainWarnings)}. IPv6 literals must be bracketed, with any port 1-65535 and no leading zeros ("[::1]", "[::1]:443"); non-IPv6 entries must not contain wildcards in brackets, extra colons, "@", or path/query characters, and must use their canonical spelling (lowercase, no trailing dot, punycode). Until fixed, enforcement is conservative: a denied entry denies at least what any parseable reading denies (an entry with no parseable reading denies nothing); an allowed entry never allows more than written and may be removed entirely; bracketed IPv6-glob entries apply to in-process checks only, not the sandbox proxy.`,
    },
  ];
}
//@ chunk-tfmhpnyx.js:15784-16275 layout
function getUnbracketedIpv6InjectHostIssues() {
  let unbracketedIpv6InjectHostWarnings = SandboxManager.getUnbracketedIpv6InjectHostWarnings();
  if (unbracketedIpv6InjectHostWarnings.length === 0) return [];
  return [
    {
      issue: "Sandbox credential injectHosts entries can never match their destination",
      fix: `Found: ${summarizeList(unbracketedIpv6InjectHostWarnings)}. Credential injection matches the bare, canonically-compressed destination address exactly and ignores ports \u2014 rewrite each entry as that bare form (e.g. "::1", "2001:db8::1"). Bracketed, zone-id, or non-canonical IPv6 spellings never match, so the credential is never injected there.`,
    },
  ];
}
//@ chunk-tfmhpnyx.js:16275-16524 layout
async function getWindowsSandboxStartupIssue() {
  if (
    !isWindowsSandboxEnabled() ||
    !SandboxManager.isPlatformInEnabledList() ||
    !SandboxManager.isSandboxEnabledInSettings()
  )
    return [];
  let windowsSandboxUserStatus = await getWindowsSandboxUserStatus();
  return windowsSandboxUserStatus === undefined
    ? []
    : [
        {
          issue: "The sandbox is turned on but can't start, because of the Windows Secondary Logon service",
          fix: windowsSandboxUserStatus,
        },
      ];
}
//@ chunk-tfmhpnyx.js:16524-21509 fingerprint (2.1.88 match: getDoctorDiagnostic, 0.78)
/**
 * getDoctorDiagnostic：安装类型、版本、路径、多重安装、自动更新状态、包管理器、ripgrep 状态与各类配置警告（claude doctor 的数据源）。
 */
async function getDoctorDiagnostic({ probeKeychain = false, storageV5 } = {}) {
  let installationType = await getCurrentInstallationTypeProbed();
  let version =
    typeof {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    } !== "undefined" &&
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
      ? `${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        }${getBuildRefSuffix()}`
      : "unknown";
  let installationPath = await getInstallationPath();
  let invokedBinary = getTeammateCommand();
  let multipleInstallations = await detectMultipleInstallations();
  let warnings = await detectConfigurationIssues(installationType);
  let { checkInstall } = await import("./nativeInstaller/installer.js");
  for (let warning of await checkInstall())
    if (warning.type === "error")
      warnings.push({
        issue: warning.message,
        fix: "Run claude install to repair the installation.",
      });
  warnings.push(...detectLinuxGlobPatternWarnings());
  warnings.push(...getUnbracketedIpv6DomainIssues());
  if (SandboxManager.isSandboxingEnabled()) await SandboxManager.checkDependenciesAsync();
  let foreignHostWarning = describeDeniesOnAnotherHost();
  if (foreignHostWarning) warnings.push(foreignHostWarning);
  warnings.push(...getUnbracketedIpv6InjectHostIssues());
  warnings.push(...getMaskCredentialWarnings());
  warnings.push(...(await findLeftoverSandboxMasks()));
  warnings.push(...(await getWindowsSandboxStartupIssue()));
  if (probeKeychain) {
    let extraWarning = await noopNull();
    if (extraWarning) warnings.push(extraWarning);
  }
  if (installationType === "native") {
    let npmInstalls = multipleInstallations.filter(
      (i) => i.type === "npm-global" || i.type === "npm-global-orphan" || i.type === "npm-local",
    );
    let isWindows = getPlatform() === "windows";
    for (let install of npmInstalls)
      if (install.type === "npm-global") {
        let uninstallCmd = "npm -g uninstall @anthropic-ai/claude-code";
        if (
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.PACKAGE_URL &&
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.PACKAGE_URL !== "@anthropic-ai/claude-code"
        )
          uninstallCmd += ` && npm -g uninstall ${
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.PACKAGE_URL
          }`;
        warnings.push({
          issue: `Leftover npm global installation at ${install.path}`,
          fix: `Run: ${uninstallCmd}`,
        });
      } else if (install.type === "npm-global-orphan")
        warnings.push({
          issue: `Orphaned npm global package at ${install.path}`,
          fix: isWindows ? `Run: rmdir /s /q "${install.path}"` : `Run: rm -rf ${install.path}`,
        });
      else if (install.type === "npm-local")
        warnings.push({
          issue: `Leftover npm local installation at ${install.path}`,
          fix: isWindows ? `Run: rmdir /s /q "${install.path}"` : `Run: rm -rf ${install.path}`,
        });
  }
  let configInstallMethod = getGlobalConfig().installMethod || "not set";
  let hasUpdatePermissions = null;
  if (installationType === "npm-global") {
    hasUpdatePermissions = (await checkGlobalInstallPermissions()).hasPermissions;
    if (!hasUpdatePermissions && !getAutoUpdaterDisabledReason())
      warnings.push({
        issue: "Can't auto-update: npm global folder isn't writable",
        fix: "Run `claude install` to switch to the native installer (no sudo)\nOr reinstall with a sudo-free npm (e.g. via nvm)\nOr `npm config set prefix ~/.npm-global`, add ~/.npm-global/bin to PATH, then reinstall",
      });
  }
  let ripgrepStatusRaw = getRipgrepStatus();
  let ripgrepStatus = {
    working: ripgrepStatusRaw.working ?? true,
    mode: ripgrepStatusRaw.mode,
    systemPath: ripgrepStatusRaw.mode === "system" ? ripgrepStatusRaw.path : null,
  };
  let packageManager = installationType === "package-manager" ? await getPackageManager() : undefined;
  let lastUpdateResult = await readUpdateResult(storageV5);
  return {
    installationType,
    version,
    installationPath,
    invokedBinary,
    configInstallMethod,
    autoUpdates: (() => {
      let reason = getAutoUpdaterDisabledReason();
      return reason ? `disabled (${formatAutoUpdaterDisabledReason(reason)})` : "enabled";
    })(),
    hasUpdatePermissions,
    lastUpdateResult,
    multipleInstallations,
    warnings,
    packageManager,
    ripgrepStatus,
  };
}
export {
  getCurrentInstallationTypeProbed,
  getPackageManager,
  getHomebrewCaskName,
  wasInstallTypeProbed,
  getDoctorDiagnostic,
  detectHomebrew,
};
