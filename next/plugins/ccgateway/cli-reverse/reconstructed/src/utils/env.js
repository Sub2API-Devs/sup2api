/**
 * utils/env.ts
 *
 * 运行环境探测：全局配置文件位置（getGlobalClaudeFile）、终端类型、包管理器/运行时、WSL、Docker、部署环境、SSH 会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/env.ts
 * pieces: chunk-08q4d92p.js (1), chunk-c4qa5qn0.js (1), chunk-exfmq47h.js (1), chunk-xjnnz630.js (38)
 * attribution: fingerprint 12, placement 4, facade-exports 8, layout 16, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, resolve, delimiter } from "path";
import { homedir } from "os";
import { readlink, readdir, access, readFile } from "fs/promises";
import { constants } from "fs";
import { isDiskless, getRootSession } from "../bootstrap/state.js";
import {
  getFsImplementation,
  hasUntouchableRecordSpellingStrictAsync,
  safeResolvePath_2,
} from "./fsOperations.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { fileSuffixForOauthConfig, OAUTH_GLOBAL_FILE_SUFFIXES } from "../constants/oauth.js";
import { whichAsync, bunWhichSync } from "./which.js";
import { isNetworkishPath } from "./networkPaths.js";
import { hasDotDotSegment } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { withTimeout } from "./sleep.js";
import { HostScoped } from "./hostScoped.js";
import { getIsDocker } from "./envDynamic.js";
import { isEnvTruthy } from "./envUtils.js";
import { alwaysTrue } from "./slowOperations.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { weakMap, createEnvAccessor, ALL_ENV_VARS } from "./env/envRegistry.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "./auth.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xjnnz630.js:51332-51356 placement
/**
 * 无盘会话时直接返回真（跳过环境探测）。
 */
function isDisklessEnvProbe() {
  return isDiskless();
}
//@ chunk-xjnnz630.js:51356-51447 fingerprint (2.1.88 match: isWslEnvironment, 1)
function isWslEnvironment() {
  if (isDisklessEnvProbe()) return false;
  return getFsImplementation().existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");
}
//@ chunk-xjnnz630.js:51447-51580 placement
/**
 * 读取 /sys/hypervisor/uuid（判断云主机），误归到 utils/file。
 */
function readHypervisorUuid() {
  if (isDisklessEnvProbe()) return;
  try {
    return getFsImplementation()
      .readFileSync("/sys/hypervisor/uuid", {
        encoding: "utf8",
      })
      .trim()
      .toLowerCase();
  } catch {
    return;
  }
}
//@ chunk-xjnnz630.js:51647-51835 placement
/**
 * 确定全局配置文件：若 <配置目录>/.config.json 存在且非空（或可写且默认文件不存在）用它；否则用 $CLAUDE_CONFIG_DIR 或 HOME 下的 .claude<后缀>.json（后缀随 OAuth 环境：''、-staging-oauth、-local-oauth、-custom-oauth）。
 */
function resolveGlobalClaudeFile() {
  if (isDiskless()) return getDefaultGlobalClaudeFile();
  let legacyConfigPath = join(getClaudeConfigDir(), ".config.json");
  let defaultGlobalClaudeFile = getDefaultGlobalClaudeFile();
  try {
    let stats = getFsImplementation().statSync(legacyConfigPath);
    if (
      stats.isFile() &&
      (stats.size > 0 ||
        ((stats.mode & 146) !== 0 && !getFsImplementation().existsSync(defaultGlobalClaudeFile)))
    )
      return legacyConfigPath;
  } catch {}
  return defaultGlobalClaudeFile;
}
//@ chunk-xjnnz630.js:51835-51926 placement
function getDefaultGlobalClaudeFile() {
  let fileName = `.claude${fileSuffixForOauthConfig()}.json`;
  return join(process.env.CLAUDE_CONFIG_DIR || homedir(), fileName);
}
//@ chunk-xjnnz630.js:51926-51973 facade-exports
function getGlobalClaudeFile() {
  return getEnvProbe().getGlobalClaudeFile();
}
//@ chunk-xjnnz630.js:51973-52023 facade-exports
function describeGlobalConfigFile() {
  return isDiskless() ? "the global config" : getGlobalClaudeFile();
}
//@ chunk-xjnnz630.js:52023-52055 layout
/**
 * 探测内网可访问性（当前恒返回 null）。
 */
async function probeInternalNetworkAccess() {
  return null;
}
//@ chunk-xjnnz630.js:52055-52115 callgraph-witnessed (2.1.88 match: isCommandAvailable, 0)
async function isCommandAvailable(command) {
  try {
    return !!(await whichAsync(command));
  } catch {
    return false;
  }
}
//@ chunk-xjnnz630.js:52115-52253 fingerprint (2.1.88 match: detectPackageManagers, 1)
async function detectPackageManagers() {
  let packageManagers = [];
  if (await isCommandAvailable("npm")) packageManagers.push("npm");
  if (await isCommandAvailable("yarn")) packageManagers.push("yarn");
  if (await isCommandAvailable("pnpm")) packageManagers.push("pnpm");
  return packageManagers;
}
//@ chunk-xjnnz630.js:52253-52391 fingerprint (2.1.88 match: detectRuntimes, 1)
async function detectRuntimes() {
  let runtimes = [];
  if (await isCommandAvailable("bun")) runtimes.push("bun");
  if (await isCommandAvailable("deno")) runtimes.push("deno");
  if (await isCommandAvailable("node")) runtimes.push("node");
  return runtimes;
}
//@ chunk-xjnnz630.js:52391-52683 layout
/**
 * 构建工具名与 PATH 扫描超时。
 */
var BUILD_TOOL_NAMES = [
  "git",
  "node",
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "bun",
  "deno",
  "tsc",
  "python",
  "python3",
  "py",
  "pip",
  "uv",
  "poetry",
  "ruby",
  "gem",
  "bundle",
  "rake",
  "dotnet",
  "msbuild",
  "nuget",
  "cl",
  "nmake",
  "cmake",
  "ninja",
  "make",
  "gcc",
  "g++",
  "clang",
  "cargo",
  "rustc",
  "go",
  "java",
  "javac",
  "mvn",
  "gradle",
  "docker",
];
var PATH_SCAN_TIMEOUT_MS = 1000;
//@ chunk-xjnnz630.js:52683-52764 layout
/**
 * 判断符号链接是否指向 App Installer（读不到视为否）。
 */
async function isAppInstallerLink(linkPath) {
  try {
    return /appinstaller/i.test(await readlink(linkPath));
  } catch {
    return false;
  }
}
//@ chunk-xjnnz630.js:52764-52842 layout
/**
 * 判断该路径是否值得扫进 PATH 候选（跳过不安全与已有拼写的路径）。
 */
async function isScanCandidate(dirPath) {
  if (dirPath === "" || isNetworkishPath(dirPath) || hasDotDotSegment(dirPath)) return false;
  return !(await hasUntouchableRecordSpellingStrictAsync(resolve(dirPath)));
}
//@ chunk-xjnnz630.js:52842-53625 layout
async function scanPathForExecutables(toolNames, found) {
  let isWindows = getPlatform() === "windows";
  let wanted = new Set(toolNames);
  let executableExtensions = isWindows
    ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").toLowerCase().split(";").filter(Boolean)
    : [];
  let directories = normalizeCaseForComparison_2(
    (process.env.PATH ?? "")
      .split(delimiter)
      .map((dir) => dir.replace(/^"|"$/g, ""))
      .filter(Boolean),
  );
  await Promise.all(
    directories.map(async (dir) => {
      if (!(await isScanCandidate(dir))) return;
      let entries;
      try {
        entries = await readdir(dir, {
          withFileTypes: true,
        });
      } catch {
        return;
      }
      let isWindowsApps = isWindows && /[\\/]microsoft[\\/]windowsapps[\\/]?$/i.test(dir);
      for (let entry of entries) {
        if (entry.isDirectory()) continue;
        let baseName = entry.name;
        if (isWindows) {
          let lower = baseName.toLowerCase();
          let index = lower.lastIndexOf(".");
          if (index <= 0 || !executableExtensions.includes(lower.slice(index))) continue;
          baseName = lower.slice(0, index);
        }
        if (!wanted.has(baseName) || found.has(baseName)) continue;
        if (isWindows) {
          if (isWindowsApps && (await isAppInstallerLink(join(dir, entry.name)))) continue;
        } else {
          let entryPath = join(dir, entry.name);
          if (
            (entry.isSymbolicLink() || safeResolvePath_2(entry)) &&
            (await hasUntouchableRecordSpellingStrictAsync(resolve(entryPath)))
          )
            continue;
          try {
            await access(entryPath, constants.X_OK);
          } catch {
            continue;
          }
        }
        found.add(baseName);
      }
    }),
  );
}
//@ chunk-xjnnz630.js:53625-53760 layout
async function detectBuildTools() {
  let found = new Set();
  try {
    await withTimeout(
      scanPathForExecutables(BUILD_TOOL_NAMES, found),
      PATH_SCAN_TIMEOUT_MS,
      "build tool PATH scan timed out",
    );
  } catch {}
  return BUILD_TOOL_NAMES.filter((toolName) => found.has(toolName));
}
//@ chunk-xjnnz630.js:53760-53810 layout
/**
 * 返回探测到的构建工具列表。
 */
function detectedBuildTools() {
  return getEnvProbe().getDetectedBuildTools();
}
//@ chunk-xjnnz630.js:53810-53950 fingerprint (2.1.88 match: isNpmFromWindowsPath, 0.798)
function isNpmFromWindowsPath(probe) {
  try {
    if (!probe.isWslEnvironment()) return false;
    let npmPath = bunWhichSync("npm");
    if (npmPath === null) return false;
    return npmPath.startsWith("/mnt/c/");
  } catch (_error) {
    return false;
  }
}
//@ chunk-xjnnz630.js:53950-54026 fingerprint (2.1.88 match: isConductor, 1)
function isConductor() {
  return process.env.__CFBundleIdentifier === "com.conductor.app";
}
//@ chunk-xjnnz630.js:54026-54201 facade-exports (2.1.88 match: JETBRAINS_IDES, 1)
var JETBRAINS_IDES = [
  "pycharm",
  "intellij",
  "webstorm",
  "phpstorm",
  "rubymine",
  "clion",
  "goland",
  "rider",
  "datagrip",
  "appcode",
  "dataspell",
  "aqua",
  "gateway",
  "fleet",
  "jetbrains",
  "androidstudio",
];
//@ chunk-xjnnz630.js:54201-54412 layout
/**
 * 应用路径是否 Windsurf/Devin。
 */
function isWindsurfOrDevin(text) {
  let lower = text.toLowerCase();
  return (
    lower.includes("windsurf") ||
    lower.includes("devin.app") ||
    lower.includes("devin desktop") ||
    lower.includes("devin-desktop") ||
    /appdata[\\/]local[\\/](programs[\\/])?devin[\\/]/.test(lower)
  );
}
//@ chunk-xjnnz630.js:54412-56365 fingerprint (2.1.88 match: detectTerminal, 0.976)
function detectTerminal() {
  if (process.env.CURSOR_TRACE_ID) return "cursor";
  let askpassPath = process.env.VSCODE_GIT_ASKPASS_MAIN?.toLowerCase() ?? "";
  if (askpassPath.includes("cursor")) return "cursor";
  if (isWindsurfOrDevin(askpassPath)) return "windsurf";
  if (askpassPath.includes("antigravity")) return "antigravity";
  let bundleId = process.env.__CFBundleIdentifier?.toLowerCase();
  if (bundleId?.includes("vscodium")) return "codium";
  if (bundleId?.includes("windsurf") || bundleId?.includes("devin")) return "windsurf";
  if (bundleId?.includes("com.google.android.studio")) return "androidstudio";
  if (bundleId) {
    for (let ide of JETBRAINS_IDES) if (bundleId.includes(ide)) return ide;
  }
  if (process.env.VisualStudioVersion) return "visualstudio";
  if (process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm") return "pycharm";
  if (process.env.TERM === "xterm-ghostty") return "ghostty";
  if (process.env.TERM?.includes("kitty")) return "kitty";
  if (process.env.TERM_PROGRAM) {
    if (/^devin([ -]desktop)?$/i.test(process.env.TERM_PROGRAM)) return "windsurf";
    return process.env.TERM_PROGRAM;
  }
  if (process.env.TMUX) return "tmux";
  if (process.env.STY) return "screen";
  if (process.env.KONSOLE_VERSION) return "konsole";
  if (process.env.GNOME_TERMINAL_SERVICE) return "gnome-terminal";
  if (process.env.XTERM_VERSION) return "xterm";
  if (process.env.VTE_VERSION) return "vte-based";
  if (process.env.TERMINATOR_UUID) return "terminator";
  if (process.env.KITTY_WINDOW_ID) return "kitty";
  if (process.env.ALACRITTY_LOG) return "alacritty";
  if (process.env.TILIX_ID) return "tilix";
  if (process.env.WT_SESSION) return "windows-terminal";
  if (process.env.SESSIONNAME && process.env.TERM === "cygwin") return "cygwin";
  if (process.env.MSYSTEM) return process.env.MSYSTEM.toLowerCase();
  if (process.env.ConEmuANSI || process.env.ConEmuPID || process.env.ConEmuTask) return "conemu";
  if (process.env.WSL_DISTRO_NAME) return `wsl-${process.env.WSL_DISTRO_NAME}`;
  if (isSSHSession()) return "ssh-session";
  if (process.env.TERM) {
    let term = process.env.TERM;
    if (term.includes("alacritty")) return "alacritty";
    if (term.includes("rxvt")) return "rxvt";
    if (term.includes("termite")) return "termite";
    return process.env.TERM;
  }
  if (!process.stdout.isTTY) return "non-interactive";
  return null;
}
//@ chunk-xjnnz630.js:56365-58046 layout
class EnvProbe {
  sources;
  globalClaudeFile;
  packageManagers;
  runtimes;
  detectedBuildTools;
  wslEnvironment;
  npmFromWindowsPath;
  deploymentEnvironment;
  primedWslInteropExists;
  primedHypervisorUuid;
  primedDockerenvExists;
  fallbackWslInteropExists;
  fallbackHypervisorUuid;
  fallbackDockerenvExists;
  constructor(sources) {
    this.sources = sources;
  }
  getGlobalClaudeFile() {
    return (this.globalClaudeFile ??= resolveGlobalClaudeFile());
  }
  seedGlobalClaudeFile(filePath) {
    if (this.globalClaudeFile === undefined) {
      this.globalClaudeFile = filePath;
      return "seeded";
    }
    return this.globalClaudeFile === filePath ? "unchanged" : "conflict";
  }
  getPackageManagers() {
    return (this.packageManagers ??= detectPackageManagers());
  }
  getRuntimes() {
    return (this.runtimes ??= detectRuntimes());
  }
  getDetectedBuildTools() {
    return (this.detectedBuildTools ??= detectBuildTools());
  }
  isWslEnvironment() {
    return (this.wslEnvironment ??=
      this.primedWslInteropExists ?? (this.fallbackWslInteropExists ??= this.sources.wslInteropExistsSync()));
  }
  isNpmFromWindowsPath() {
    return (this.npmFromWindowsPath ??= isNpmFromWindowsPath(this));
  }
  hypervisorUuid() {
    return (
      this.primedHypervisorUuid ??
      (this.fallbackHypervisorUuid ??= this.sources.readHypervisorUuidSync() ?? "")
    );
  }
  isDockerenvPresent() {
    return (
      this.primedDockerenvExists ?? (this.fallbackDockerenvExists ??= this.sources.dockerenvExistsSync())
    );
  }
  detectDeploymentEnvironment() {
    return (this.deploymentEnvironment ??= detectDeploymentEnvironment_2(this));
  }
  async prime() {
    if (this.primedWslInteropExists !== undefined || isDisklessEnvProbe()) return;
    let [wslInteropExists, hypervisorUuid, dockerenvExists] = await Promise.all([
      access("/proc/sys/fs/binfmt_misc/WSLInterop").then(
        () => true,
        () => false,
      ),
      readFile("/sys/hypervisor/uuid", {
        encoding: "utf8",
      }).then(
        (file) => file.trim().toLowerCase(),
        () => {
          return;
        },
      ),
      access("/.dockerenv").then(
        () => true,
        () => false,
      ),
    ]);
    this.primedWslInteropExists = wslInteropExists;
    this.primedHypervisorUuid = hypervisorUuid ?? "";
    this.primedDockerenvExists = dockerenvExists;
    this.wslEnvironment = undefined;
    this.npmFromWindowsPath = undefined;
    this.deploymentEnvironment = undefined;
  }
}
//@ chunk-xjnnz630.js:58046-58143 layout
/**
 * 按宿主隔离的环境探测器（WSL 互操作、hypervisor UUID、dockerenv）。
 */
var envProbeByHost; // deferred: uses EnvProbe of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xjnnz630.js:58046", () => {
  envProbeByHost = new HostScoped(
    () =>
      new EnvProbe({
        wslInteropExistsSync: isWslEnvironment,
        readHypervisorUuidSync: readHypervisorUuid,
        dockerenvExistsSync: getIsDocker,
      }),
  );
});
//@ chunk-xjnnz630.js:58143-58179 layout
function getEnvProbe() {
  return envProbeByHost.of(getRootSession().host);
}
//@ chunk-xjnnz630.js:58179-58213 layout
/**
 * 预热环境探测器。
 */
function primeEnvProbe() {
  return getEnvProbe().prime();
}
//@ chunk-xjnnz630.js:58213-58260 layout
/**
 * 判断 /.dockerenv 是否存在。
 */
function isDockerenvPresent() {
  return getEnvProbe().isDockerenvPresent();
}
//@ chunk-xjnnz630.js:58260-58315 layout
/**
 * 探测部署环境。
 */
function detectDeploymentEnvironment() {
  return getEnvProbe().detectDeploymentEnvironment();
}
//@ chunk-xjnnz630.js:58315-60410 fingerprint (2.1.88 match: detectDeploymentEnvironment, 0.881)
function detectDeploymentEnvironment_2(probe) {
  if (isEnvTruthy(process.env.CODESPACES)) return "codespaces";
  if (process.env.GITPOD_WORKSPACE_ID) return "gitpod";
  if (isEnvTruthy(process.env.CODER) || process.env.CODER_WORKSPACE_NAME) return "coder";
  if (isEnvTruthy(process.env.DEVPOD) || process.env.DEVPOD_WORKSPACE_UID) return "devpod";
  if (process.env.DAYTONA_WS_ID) return "daytona";
  if (isEnvTruthy(process.env.GOOGLE_CLOUD_WORKSTATIONS)) return "gcp-cloud-workstations";
  if (process.env.C9_PID || process.env.C9_USER) return "aws-cloud9";
  if (process.env.REPL_ID || process.env.REPL_SLUG) return "replit";
  if (process.env.PROJECT_DOMAIN) return "glitch";
  if (isEnvTruthy(process.env.VERCEL)) return "vercel";
  if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_SERVICE_NAME) return "railway";
  if (isEnvTruthy(process.env.RENDER)) return "render";
  if (isEnvTruthy(process.env.NETLIFY)) return "netlify";
  if (process.env.DYNO) return "heroku";
  if (process.env.FLY_APP_NAME || process.env.FLY_MACHINE_ID) return "fly.io";
  if (isEnvTruthy(process.env.CF_PAGES)) return "cloudflare-pages";
  if (process.env.DENO_DEPLOYMENT_ID) return "deno-deploy";
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return "aws-lambda";
  if (process.env.AWS_EXECUTION_ENV === "AWS_ECS_FARGATE") return "aws-fargate";
  if (process.env.AWS_EXECUTION_ENV === "AWS_ECS_EC2") return "aws-ecs";
  if (probe.hypervisorUuid().startsWith("ec2")) return "aws-ec2";
  if (process.env.K_SERVICE) return "gcp-cloud-run";
  if (process.env.GOOGLE_CLOUD_PROJECT) return "gcp";
  if (process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_SKU) return "azure-app-service";
  if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) return "azure-functions";
  if (process.env.APP_URL?.includes("ondigitalocean.app")) return "digitalocean-app-platform";
  if (process.env.SPACE_CREATOR_USER_ID) return "huggingface-spaces";
  if (isEnvTruthy(process.env.GITHUB_ACTIONS)) return "github-actions";
  if (isEnvTruthy(process.env.GITLAB_CI)) return "gitlab-ci";
  if (process.env.CIRCLECI) return "circleci";
  if (process.env.BUILDKITE) return "buildkite";
  if (isEnvTruthy(false)) return "ci";
  if (process.env.KUBERNETES_SERVICE_HOST) return "kubernetes";
  if (probe.isDockerenvPresent()) return "docker";
  if (env_2.platform === "darwin") return "unknown-darwin";
  if (env_2.platform === "linux") return "unknown-linux";
  if (env_2.platform === "win32") return "unknown-win32";
  return "unknown";
}
//@ chunk-xjnnz630.js:60410-60505 fingerprint (2.1.88 match: isSSHSession, 1)
function isSSHSession() {
  return !!(process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY);
}
//@ chunk-xjnnz630.js:60505-60665 layout
/**
 * 由服务端或 SSH 守护进程启动。
 */
function isSpawnedByServer() {
  return (
    process.env.CLAUDE_CODE_SPAWNED_BY_SERVER !== undefined ||
    process.env.CLAUDE_SSH_DAEMON_CHILD !== undefined ||
    process.env.CLAUDE_SSH_RUN_DIR !== undefined
  );
}
//@ chunk-xjnnz630.js:60665-61106 fingerprint (2.1.88 match: env, 0.871)
var env_2; // deferred: uses isEnvTruthy (./envUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xjnnz630.js:60665", () => {
  env_2 = {
    probeInternalNetworkAccess,
    isCI: isEnvTruthy(false),
    platform: ["win32", "darwin"].includes("linux") ? "linux" : "linux",
    arch: "x64",
    nodeVersion: process.version,
    terminal: detectTerminal(),
    isSSH: isSSHSession,
    getPackageManagers() {
      return getEnvProbe().getPackageManagers();
    },
    getRuntimes() {
      return getEnvProbe().getRuntimes();
    },
    isRunningWithBun: alwaysTrue,
    isWslEnvironment() {
      return getEnvProbe().isWslEnvironment();
    },
    isNpmFromWindowsPath() {
      return getEnvProbe().isNpmFromWindowsPath();
    },
    isConductor,
    detectDeploymentEnvironment,
  };
});
//@ chunk-xjnnz630.js:61106-61234 facade-exports (2.1.88 match: getHostPlatformForAnalytics, 1)
function getHostPlatformForAnalytics() {
  let override = process.env.CLAUDE_CODE_HOST_PLATFORM;
  if (override === "win32" || override === "darwin" || override === "linux") return override;
  return env_2.platform;
}
//@ chunk-xjnnz630.js:61234-61373 layout
var SHELL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xjnnz630.js:61234", () => {
  SHELL_NAMES = new Set([
    "zsh",
    "bash",
    "fish",
    "sh",
    "dash",
    "ash",
    "ksh",
    "tcsh",
    "csh",
    "nu",
    "nushell",
    "pwsh",
    "powershell",
    "cmd",
    "elvish",
    "xonsh",
    "ion",
  ]);
});
//@ chunk-xjnnz630.js:61373-61508 facade-exports
function normalizeShellNameForAnalytics(shellPath) {
  if (!shellPath) return fromSanitizer_SANITIZER_OUTPUT_ONLY("none");
  let replaced = shellPath
    .split(/[/\\]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, "");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(SHELL_NAMES.has(replaced) ? replaced : "other");
}
//@ chunk-xjnnz630.js:61508-61578 facade-exports
function getShellForAnalytics() {
  return normalizeShellNameForAnalytics(process.env.SHELL || process.env.COMSPEC || "");
}
//@ chunk-xjnnz630.js:77755-77822 facade-exports
function declaredEnvVarNames(env) {
  let declared = weakMap.get(env);
  return declared === undefined ? [] : Object.keys(declared);
}
//@ chunk-xjnnz630.js:77822-77921 facade-exports
/**
 * antEnv 使用的空环境表（不声明任何变量）。
 */
var env; // deferred: loads other modules while loading; runs once its import cycle is complete
var EMPTY_ANT_ENV;
var antEnv;
var udsInboxShape;
var udsEnv;
deferInit("chunk-xjnnz630.js:77822", () => {
  env = createEnvAccessor(ALL_ENV_VARS, env_2);
  EMPTY_ANT_ENV = {};
  antEnv = createEnvAccessor(EMPTY_ANT_ENV, null);
  udsInboxShape = require("./udsMessaging/udsInboxShape.lazy.js").udsInboxShape;
  udsEnv = createEnvAccessor(udsInboxShape, null);
});
//@ chunk-exfmq47h.js:767335-767598 fingerprint (2.1.88 match: hasInternetAccess, 0.426)
async function hasInternetAccess_2() {
  try {
    let { externalHttp } = await import("../services/http/externalHttp.lazy.js");
    await externalHttp.head("http://1.1.1.1", {
      signal: AbortSignal.timeout(1000),
    });
    return true;
  } catch (error) {
    logForDebugging(
      `internet access probe failed (${errorMessage(error)}); treating outbound internet as unreachable`,
    );
    return false;
  }
}
//@ chunk-c4qa5qn0.js:519-632 fingerprint (2.1.88 match: getGlobalClaudeFile, 0.833)
/**
 * 带第一个 OAUTH 后缀的全局配置文件默认名（.claude<后缀>.json）。
 */
var LEGACY_CONFIG_JSON; // deferred: uses OAUTH_GLOBAL_FILE_SUFFIXES (../constants/oauth.js) of its import cycle while loading; runs once the cycle is complete
var OAUTH_SUFFIXED_CONFIG_FILE_NAME;
var mapped;
var GLOBAL_CLAUDE_FILE_NAMES;
deferInit("chunk-c4qa5qn0.js:519", () => {
  LEGACY_CONFIG_JSON = ".config.json";
  OAUTH_SUFFIXED_CONFIG_FILE_NAME = `.claude${OAUTH_GLOBAL_FILE_SUFFIXES[0]}.json`;
  mapped = OAUTH_GLOBAL_FILE_SUFFIXES.map((suffix) => `.claude${suffix}.json`);
  GLOBAL_CLAUDE_FILE_NAMES = [...mapped, LEGACY_CONFIG_JSON, CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME];
});
//@ chunk-08q4d92p.js:12316-12490 fingerprint (2.1.88 match: JETBRAINS_IDES, 1)
var JETBRAINS_IDES_2 = [
  "pycharm",
  "intellij",
  "webstorm",
  "phpstorm",
  "rubymine",
  "clion",
  "goland",
  "rider",
  "datagrip",
  "appcode",
  "dataspell",
  "aqua",
  "gateway",
  "fleet",
  "jetbrains",
  "androidstudio",
];
export {
  env,
  antEnv,
  getHostPlatformForAnalytics,
  getShellForAnalytics,
  JETBRAINS_IDES_2,
  describeGlobalConfigFile,
  isSpawnedByServer,
  declaredEnvVarNames,
  udsEnv,
  getGlobalClaudeFile,
  normalizeShellNameForAnalytics,
  JETBRAINS_IDES,
  isWindsurfOrDevin,
  mapped,
  LEGACY_CONFIG_JSON,
  getDefaultGlobalClaudeFile,
  scanPathForExecutables,
  isDockerenvPresent,
  detectedBuildTools,
  OAUTH_SUFFIXED_CONFIG_FILE_NAME,
  GLOBAL_CLAUDE_FILE_NAMES,
  primeEnvProbe,
  isDisklessEnvProbe,
  hasInternetAccess_2,
  BUILD_TOOL_NAMES,
  isScanCandidate,
};
