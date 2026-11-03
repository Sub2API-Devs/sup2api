/**
 * utils/doctorDiagnostic.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/doctorDiagnostic.ts
 * pieces: chunk-hntsfzas.js (29)
 * attribution: placement 11, fingerprint 7, layout 11
 */
import { win32, posix, join, join as join_2, delimiter } from "path";
import { realpath, lstat } from "fs/promises";
import { homedir } from "os";
import { getOsRelease } from "./nativeInstaller/packageManagers.js";
import { getRootSession } from "../bootstrap/state.js";
import { getPlatform } from "./platform.js";
import { isStandaloneExecutable } from "./slowOperations.js";
import { getClaudeConfigDir, isEnvTruthy } from "./envUtils.js";
import { isRunningFromLocalInstallation, localInstallationExists, getShellType } from "./localInstaller.js";
import { safeExecShell } from "./safeSpawn.js";
import { HostScoped } from "./hostScoped.js";
import { whichAsync } from "./which.js";
import { getFsImplementation } from "./fsOperations.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { IMe } from "../remote/remoteMode.js";
import { getCwd } from "./cwd.js";
import { getGlobalConfig, getAutoUpdaterDisabledReason, formatAutoUpdaterDisabledReason } from "./config.js";
import { getOtelHeadersHelperLastFailure } from "./auth.js";
import { bV, oEr } from "./stringUtils.js";
import { env } from "./env.js";
import { getUserBinDir } from "./xdg.js";
import { isInstallLinkOrMissing, isNpmSymlink } from "./nativeInstaller/installer.js";
import { getShellConfigPaths, findClaudeAlias, findValidClaudeAlias } from "./shellConfig.js";
import { SandboxManager, isScrubOnlySandboxMode } from "./sandbox/sandbox-adapter.js";
import { summarizeList, describeDeniesOnAnotherHost } from "./sandbox/deniesOnAnotherHost.js";
import { isWindowsSandboxEnabled } from "./sandbox/windowsSandbox.js";
import { getWindowsSandboxUserStatus } from "./sandbox/windowsSandboxStatus.js";
import { getBuildRefSuffix } from "../cli/earlyArgs.js";
import { getTeammateCommand } from "../tools/shared/spawnMultiAgent.js";
import { checkGlobalInstallPermissions } from "./autoUpdater.js";
import { getRipgrepStatus_2 } from "./ripgrep.js";
import { readUpdateResult } from "./nativeInstaller/updateResult.js";

//@ chunk-hntsfzas.js:4993-5029 placement
function y() {
  return getOsRelease.of(getRootSession().host);
}
//@ chunk-hntsfzas.js:5029-5068 placement
function D() {
  return y().detectPacman();
}
//@ chunk-hntsfzas.js:5068-5104 placement
function E() {
  return y().detectDeb();
}
//@ chunk-hntsfzas.js:5104-5140 placement
function O() {
  return y().detectRpm();
}
//@ chunk-hntsfzas.js:5140-5176 placement
function T() {
  return y().detectApk();
}
//@ chunk-hntsfzas.js:5176-5219 placement
function N6n() {
  return y().detectHomebrew();
}
//@ chunk-hntsfzas.js:5219-5267 placement
function Pbt() {
  return y().getHomebrewCaskName();
}
//@ chunk-hntsfzas.js:5267-5306 placement
function H() {
  return y().detectWinget();
}
//@ chunk-hntsfzas.js:5306-5343 placement
function U() {
  return y().detectMise();
}
//@ chunk-hntsfzas.js:5343-5380 placement
function j() {
  return y().detectAsdf();
}
//@ chunk-hntsfzas.js:5380-5426 placement
function _2e() {
  return y().getPackageManager();
}
//@ chunk-hntsfzas.js:5426-5595 fingerprint = getNormalizedPaths (1)
function getNormalizedPaths() {
  let e = process.argv[1] || "",
    n = process.execPath || process.argv[0] || "";
  if (getPlatform() === "windows")
    ((e = e.split(win32.sep).join(posix.sep)), (n = n.split(win32.sep).join(posix.sep)));
  return [e, n];
}
/**
 * 判断当前安装类型：npm-local/npm-global/native/package-manager/development/unknown。
 */
//@ chunk-hntsfzas.js:5595-6352 fingerprint = getCurrentInstallationType (0.877)
async function getCurrentInstallationType() {
  let [e, n] = getNormalizedPaths();
  if (isStandaloneExecutable()) {
    let l = getClaudeConfigDir().replace(/\\/g, "/").replace(/\/+$/, "") + "/local/node_modules/";
    if (n.startsWith(l)) return "npm-local";
    if (n.includes("/node_modules/@anthropic-ai/")) return "npm-global";
    if (N6n() || H() || U() || j() || (await D()) || (await E()) || (await O()) || (await T()))
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
    ].some((path) => e.includes(path))
  )
    return "npm-global";
  if (e.includes("/npm/") || e.includes("/nvm/")) return "npm-global";
  let npmConfigResult = await safeExecShell("npm config get prefix", { reject: !1 }),
    globalPrefix = npmConfigResult.exitCode === 0 ? npmConfigResult.stdout.trim() : null;
  if (globalPrefix && e.startsWith(globalPrefix)) return "npm-global";
  return "unknown";
}
//@ chunk-hntsfzas.js:6352-6373 layout
class InstallTypeProbeState {
  attempted = !1;
}
//@ chunk-hntsfzas.js:6373-6396 layout
var installTypeProbeSlot = new HostScoped(() => new InstallTypeProbeState());
/**
 * 本进程是否已探测过安装类型。
 */
//@ chunk-hntsfzas.js:6396-6443 layout
function wasInstallTypeProbed() {
  return installTypeProbeSlot.of(getRootSession().host).attempted;
}
/**
 * 探测并记住安装类型（getCurrentInstallationType 的记录版）。
 */
//@ chunk-hntsfzas.js:6443-6510 layout
async function getCurrentInstallationTypeProbed() {
  return (
    (installTypeProbeSlot.of(getRootSession().host).attempted = !0),
    await getCurrentInstallationType()
  );
}
//@ chunk-hntsfzas.js:6510-6798 fingerprint = getInstallationPath (0.831)
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
      return (
        await getFsImplementation().stat(join(homedir(), ".local/bin/claude")),
        join(homedir(), ".local/bin/claude")
      );
    } catch {}
    return "native";
  }
  try {
    return process.argv[0] || "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-hntsfzas.js:6916-9456 fingerprint = detectMultipleInstallations (0.812)
async function detectMultipleInstallations() {
  let fs = getFsImplementation(),
    installations = [],
    localPath = join(homedir(), ".claude", "local");
  if (await localInstallationExists()) installations.push({ type: "npm-local", path: localPath });
  let packagesToCheck = ["@anthropic-ai/claude-code"];
  if (
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL &&
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.PACKAGE_URL !== "@anthropic-ai/claude-code"
  )
    packagesToCheck.push(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL,
    );
  let r = await execFileNoThrow("npm", ["-g", "config", "get", "prefix"], { cwd: IMe(getCwd(), homedir()) });
  if (r.code === 0 && r.stdout) {
    let npmPrefix = r.stdout.trim(),
      isWindows = getPlatform() === "windows",
      m = isWindows ? join(npmPrefix, "claude") : join(npmPrefix, "bin", "claude"),
      A = !1;
    try {
      (await fs.stat(m), (A = !0));
    } catch {}
    if (A) {
      let f = !1;
      try {
        if ((await realpath(m)).includes("/Caskroom/")) f = N6n();
      } catch {}
      if (!f) {
        let g = !1;
        for (let w of packagesToCheck) {
          let P = isWindows ? join(npmPrefix, "node_modules", w) : join(npmPrefix, "lib", "node_modules", w);
          try {
            (await fs.stat(P), (g = !0));
            break;
          } catch {}
        }
        if (g) installations.push({ type: "npm-global", path: m });
      }
    } else
      for (let packageName of packagesToCheck) {
        let g = isWindows
          ? join(npmPrefix, "node_modules", packageName)
          : join(npmPrefix, "lib", "node_modules", packageName);
        try {
          (await fs.stat(g), installations.push({ type: "npm-global-orphan", path: g }));
        } catch {}
      }
  }
  let nativeBinPath = join(homedir(), ".local", "bin", "claude");
  try {
    (await fs.stat(nativeBinPath), installations.push({ type: "native", path: nativeBinPath }));
  } catch {}
  if (getGlobalConfig().installMethod === "native") {
    let nativeDataPath = join(homedir(), ".local", "share", "claude");
    try {
      if ((await fs.stat(nativeDataPath), !installations.some((b) => b.type === "native")))
        installations.push({ type: "native", path: nativeDataPath });
    } catch {}
  }
  return installations;
}
//@ chunk-hntsfzas.js:9456-9735 layout
function isPathInList(e, n) {
  let a = getPlatform() === "windows",
    o = n;
  if (a) o = n.split(win32.sep).join(posix.sep).toLowerCase();
  return e.some((r) => {
    let l = r;
    if (a) l = r.split(win32.sep).join(posix.sep).toLowerCase();
    let replaced = l.replace(/\/+$/, ""),
      replaced_2 = r.replace(/[/\\]+$/, "");
    return replaced === o || replaced_2 === "~/.local/bin" || replaced_2 === "$HOME/.local/bin";
  });
}
/**
 * 检测配置问题：otelHeadersHelper 失败、PATH 缺 ~/.local/bin、沙箱设置等，返回 {issue,fix}。
 */
//@ chunk-hntsfzas.js:9735-12337 fingerprint = detectConfigurationIssues (0.792)
async function detectConfigurationIssues(type) {
  let warnings = [],
    a = getOtelHeadersHelperLastFailure();
  if (a)
    warnings.push({
      issue: `otelHeadersHelper is configured but its last invocation failed: ${bV(a, oEr)}`,
      fix: "Run the configured helper manually and confirm it prints a JSON object of string header values. If the value is a file path, confirm the file exists and is executable.",
    });
  let config = getGlobalConfig();
  if (type === "development") return warnings;
  if (type === "native") {
    let pathDirectories = (env.PATH || "").split(delimiter),
      homeDir = homedir(),
      localBinPath = join(homeDir, ".local", "bin"),
      m = join(getUserBinDir(), "claude");
    if (!(await isInstallLinkOrMissing(m)) && !(await isNpmSymlink(m).catch(() => !1)))
      warnings.push({
        issue: `${m} was not created by the native installer (it is not a symlink into the versions/ directory), so auto-update leaves it untouched.`,
        fix: `If you put a launcher wrapper there on purpose, this is expected \u2014 new versions still install under $XDG_DATA_HOME/claude/versions, your launcher decides what runs, and automatic version cleanup is disabled on this machine (the installer cannot tell which version your launcher needs, so it keeps them all). To let Claude Code manage the launcher again, remove ${m} and run \`claude update\`.`,
      });
    if (!isPathInList(pathDirectories, localBinPath))
      if (getPlatform() === "windows") {
        let windowsLocalBinPath = localBinPath.split(posix.sep).join(win32.sep);
        warnings.push({
          issue: `Native installation exists but ${windowsLocalBinPath} is not in your PATH`,
          fix: "Add it by opening: System Properties \u2192 Environment Variables \u2192 Edit User PATH \u2192 New \u2192 Add the path above. Then restart your terminal.",
        });
      } else {
        let shellType = getShellType(),
          configFile = getShellConfigPaths()[shellType],
          P = configFile ? configFile.replace(homedir(), "~") : "your shell config file";
        warnings.push({
          issue: "Native installation exists but ~/.local/bin is not in your PATH",
          fix: `Run: echo 'export PATH="$HOME/.local/bin:$PATH"' >> ${P} then open a new terminal or run: source ${P}`,
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
  let existingAlias = await findClaudeAlias(),
    validAlias = await findValidClaudeAlias();
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
//@ chunk-hntsfzas.js:12337-12369 layout
async function noopNull() {
  return null;
}
//@ chunk-hntsfzas.js:12369-13789 layout
function getMaskCredentialWarnings() {
  if (!SandboxManager.isSandboxingEnabled()) return [];
  if (SandboxManager.canMaskCredentialWarningFire()) SandboxManager.checkDependencies();
  let maskCredentialWarning = SandboxManager.getMaskCredentialWarning();
  if (!maskCredentialWarning) return [];
  return maskCredentialWarning.split(" \xB7 ").map((n) => {
    if (n.includes("have an empty injectHosts"))
      return {
        issue: n.replace(/\.\s*If the adapter forced this.*$/, ""),
        fix: "If the adapter forced this (a filesystem.allowRead entry re-opened a denied credential path), remove the conflicting allowRead entry or the deny; if a parent/managed settings tier supplied this mask, sentinel-only is its intended posture (that channel cannot grant injection, so an injectHosts set there is stripped on load) and the entry can only be removed in the parent settings; otherwise set injectHosts or remove the entry",
      };
    if (n.includes("degrade to deny on macOS"))
      return {
        issue: n.replace(/\.\s*Note that switching them.*$/, ""),
        fix: "Set sandbox.filesystem.disabled: false in user or managed settings (overrides the GrowthBook policy; ignored if managed settings pin the filesystem layer), or remove the mask entries \u2014 a deny provides no protection while the relaxed filesystem policy is active",
      };
    return {
      issue: n.replace(/\s*Enable sandbox\.network\.tlsTerminate.*$/, ""),
      fix: isScrubOnlySandboxMode()
        ? "Set sandbox.enabled: true plus sandbox.network.tlsTerminate, or remove the mask entries \u2014 TLS termination is never enabled in scrub-only mode"
        : "Enable sandbox.network.tlsTerminate (or remove the mask entries)",
    };
  });
}
//@ chunk-hntsfzas.js:13789-14105 fingerprint = detectLinuxGlobPatternWarnings (0.937)
function detectLinuxGlobPatternWarnings() {
  if (getPlatform() !== "linux") return [];
  let warnings = [],
    globPatterns = SandboxManager.getLinuxGlobPatternWarnings();
  if (globPatterns.length > 0) {
    let a = summarizeList(globPatterns);
    warnings.push({
      issue: "Glob patterns in sandbox permission rules are not fully supported on Linux",
      fix: `Found ${globPatterns.length} pattern(s): ${a}. On Linux, glob patterns in Edit/Read rules will be ignored.`,
    });
  }
  return warnings;
}
//@ chunk-hntsfzas.js:14105-14968 layout
async function findLeftoverSandboxMasks() {
  let e = getPlatform();
  if (e !== "linux" && e !== "wsl") return [];
  if (!SandboxManager.isSandboxingEnabled()) return [];
  let config = SandboxManager.getConfig();
  if (config === void 0 || config.filesystem.disabled) return [];
  let { denyWithinAllow: denyWithinAllow } = SandboxManager.getFsWriteConfig(),
    results = await Promise.all(
      denyWithinAllow.map(async (l) => {
        try {
          let c = await lstat(l);
          return c.isFile() && c.size === 0 && (c.mode & 146) === 0 && c.nlink === 1;
        } catch {
          return !1;
        }
      }),
    ),
    r = new Set(denyWithinAllow.filter((l, c) => results[c]));
  if (r.size === 0) return [];
  return [
    {
      issue: `Sandbox mask files left behind at write-deny paths: ${summarizeList([...r])}`,
      fix: 'A session leaves one where it was killed, or where it exited while a sandboxed command was still running. Remove each with `rm <path>` while no other Claude Code session is running in that project \u2014 a 0-byte read-only file where a settings file belongs makes "Yes, and don\'t ask again" fail to save, and the sandbox binds it read-only again on every start',
    },
  ];
}
//@ chunk-hntsfzas.js:14968-15751 layout
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
//@ chunk-hntsfzas.js:15751-16242 layout
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
//@ chunk-hntsfzas.js:16242-16491 layout
async function getWindowsSandboxStartupIssue() {
  if (
    !isWindowsSandboxEnabled() ||
    !SandboxManager.isPlatformInEnabledList() ||
    !SandboxManager.isSandboxEnabledInSettings()
  )
    return [];
  let e = await getWindowsSandboxUserStatus();
  return e === void 0
    ? []
    : [
        {
          issue: "The sandbox is turned on but can't start, because of the Windows Secondary Logon service",
          fix: e,
        },
      ];
}
/**
 * getDoctorDiagnostic：安装类型、版本、路径、多重安装、自动更新状态、包管理器、ripgrep 状态与各类配置警告（claude doctor 的数据源）。
 */
//@ chunk-hntsfzas.js:16491-21476 fingerprint = getDoctorDiagnostic (0.78)
async function getDoctorDiagnostic({ probeKeychain: probeKeychain = !1, storageV5: storageV5 } = {}) {
  let installationType = await getCurrentInstallationTypeProbed(),
    o =
      typeof {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      } < "u" &&
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
        ? `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}${getBuildRefSuffix()}`
        : "unknown",
    installationPath = await getInstallationPath(),
    invokedBinary = getTeammateCommand(),
    multipleInstallations = await detectMultipleInstallations(),
    warnings = await detectConfigurationIssues(installationType),
    { checkInstall: checkInstall } = await import("./chunk-vgwfkbv7.js");
  for (let h of await checkInstall())
    if (h.type === "error")
      warnings.push({ issue: h.message, fix: "Run claude install to repair the installation." });
  if (
    (warnings.push(...detectLinuxGlobPatternWarnings()),
    warnings.push(...getUnbracketedIpv6DomainIssues()),
    SandboxManager.isSandboxingEnabled())
  )
    await SandboxManager.checkDependenciesAsync();
  let m = describeDeniesOnAnotherHost();
  if (m) warnings.push(m);
  if (
    (warnings.push(...getUnbracketedIpv6InjectHostIssues()),
    warnings.push(...getMaskCredentialWarnings()),
    warnings.push(...(await findLeftoverSandboxMasks())),
    warnings.push(...(await getWindowsSandboxStartupIssue())),
    probeKeychain)
  ) {
    let h = await noopNull();
    if (h) warnings.push(h);
  }
  if (installationType === "native") {
    let npmInstalls = multipleInstallations.filter(
        (u) => u.type === "npm-global" || u.type === "npm-global-orphan" || u.type === "npm-local",
      ),
      isWindows = getPlatform() === "windows";
    for (let install of npmInstalls)
      if (install.type === "npm-global") {
        let uninstallCmd = "npm -g uninstall @anthropic-ai/claude-code";
        if (
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.PACKAGE_URL &&
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.PACKAGE_URL !== "@anthropic-ai/claude-code"
        )
          uninstallCmd += ` && npm -g uninstall ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}`;
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
  let configInstallMethod = getGlobalConfig().installMethod || "not set",
    hasUpdatePermissions = null;
  if (installationType === "npm-global") {
    if (
      ((hasUpdatePermissions = (await checkGlobalInstallPermissions()).hasPermissions),
      !hasUpdatePermissions && !getAutoUpdaterDisabledReason())
    )
      warnings.push({
        issue: "Can't auto-update: npm global folder isn't writable",
        fix: "Run `claude install` to switch to the native installer (no sudo)\nOr reinstall with a sudo-free npm (e.g. via nvm)\nOr `npm config set prefix ~/.npm-global`, add ~/.npm-global/bin to PATH, then reinstall",
      });
  }
  let ripgrepStatusRaw = getRipgrepStatus_2(),
    ripgrepStatus = {
      working: ripgrepStatusRaw.working ?? !0,
      mode: ripgrepStatusRaw.mode,
      systemPath: ripgrepStatusRaw.mode === "system" ? ripgrepStatusRaw.path : null,
    },
    K = installationType === "package-manager" ? await _2e() : void 0,
    V = await readUpdateResult(storageV5);
  return {
    installationType: installationType,
    version: o,
    installationPath: installationPath,
    invokedBinary: invokedBinary,
    configInstallMethod: configInstallMethod,
    autoUpdates: (() => {
      let reason = getAutoUpdaterDisabledReason();
      return reason ? `disabled (${formatAutoUpdaterDisabledReason(reason)})` : "enabled";
    })(),
    hasUpdatePermissions: hasUpdatePermissions,
    lastUpdateResult: V,
    multipleInstallations: multipleInstallations,
    warnings: warnings,
    packageManager: K,
    ripgrepStatus: ripgrepStatus,
  };
}

export { getDoctorDiagnostic, getCurrentInstallationTypeProbed, Pbt, N6n, _2e, wasInstallTypeProbed };
