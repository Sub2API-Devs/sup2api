/**
 * utils/env.ts
 *
 * 运行环境探测：全局配置文件位置（getGlobalClaudeFile）、终端类型、包管理器/运行时、WSL、Docker、部署环境、SSH 会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/env.ts
 * pieces: chunk-4m46mxx9.js (1), chunk-aepeg2w5.js (1), chunk-cdz6g143.js (1), chunk-cxdk9p3j.js (1), chunk-jhrww53q.js (38)
 * attribution: fingerprint 12, placement 4, facade-exports 8, layout 17, callgraph-witnessed 1
 */
import { join, join as join_2, resolve, delimiter, delimiter as delimiter_2 } from "path";
import { homedir } from "os";
import { readlink, readdir, readdir as readdir_2, access, readFile } from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { isDiskless, getRootSession } from "../bootstrap/state.js";
import {
  getFsImplementation,
  hasUntouchableRecordSpellingStrictAsync,
  safeResolvePath_2,
} from "./fsOperations.js";
import { getClaudeConfigDir, isEnvTruthy } from "./envUtils.js";
import { fileSuffixForOauthConfig, OAUTH_GLOBAL_FILE_SUFFIXES } from "../constants/oauth.js";
import { whichAsync, w0 } from "./which.js";
import { AV } from "./networkPaths.js";
import { Eh } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { uniq } from "./collections.js";
import { withTimeout } from "./sleep.js";
import { HostScoped } from "./hostScoped.js";
import { getIsDocker } from "./envDynamic.js";
import { alwaysTrue } from "./slowOperations.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { weakMap, createEnvAccessor, ALL_ENV_VARS } from "./env/envRegistry.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "./auth.js";

//@ chunk-jhrww53q.js:49649-49673 placement
function p() {
  return isDiskless();
}
//@ chunk-jhrww53q.js:49673-49764 fingerprint = isWslEnvironment (1)
function isWslEnvironment() {
  if (p()) return !1;
  return getFsImplementation().existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");
}
/**
 * 读取 /sys/hypervisor/uuid（判断云主机），误归到 utils/file。
 */
//@ chunk-jhrww53q.js:49764-49897 placement = readFileSafe (0.594)
function readFileSafe() {
  if (p()) return;
  try {
    return getFsImplementation()
      .readFileSync("/sys/hypervisor/uuid", { encoding: "utf8" })
      .trim()
      .toLowerCase();
  } catch {
    return;
  }
}
/**
 * 确定全局配置文件：若 <配置目录>/.config.json 存在且非空（或可写且默认文件不存在）用它；否则用 $CLAUDE_CONFIG_DIR 或 HOME 下的 .claude<后缀>.json（后缀随 OAuth 环境：''、-staging-oauth、-local-oauth、-custom-oauth）。
 */
//@ chunk-jhrww53q.js:49964-50152 placement
function resolveGlobalClaudeFile() {
  if (isDiskless()) return getDefaultGlobalClaudeFile();
  let o = join(getClaudeConfigDir(), ".config.json"),
    t = getDefaultGlobalClaudeFile();
  try {
    let stats = getFsImplementation().statSync(o);
    if (
      stats.isFile() &&
      (stats.size > 0 || ((stats.mode & 146) !== 0 && !getFsImplementation().existsSync(t)))
    )
      return o;
  } catch {}
  return t;
}
//@ chunk-jhrww53q.js:50152-50243 placement
function getDefaultGlobalClaudeFile() {
  let o = `.claude${fileSuffixForOauthConfig()}.json`;
  return join(process.env.CLAUDE_CONFIG_DIR || homedir(), o);
}
//@ chunk-jhrww53q.js:50243-50290 facade-exports
function getGlobalClaudeFile() {
  return getEnvProbe().getGlobalClaudeFile();
}
//@ chunk-jhrww53q.js:50290-50341 facade-exports
function describeGlobalConfigFile() {
  return isDiskless() ? "the global config" : getGlobalClaudeFile();
}
//@ chunk-jhrww53q.js:50341-50373 layout
async function V_() {
  return null;
}
//@ chunk-jhrww53q.js:50373-50433 callgraph-witnessed = isCommandAvailable (0)
async function isCommandAvailable(command) {
  try {
    return !!(await whichAsync(command));
  } catch {
    return !1;
  }
}
//@ chunk-jhrww53q.js:50433-50571 fingerprint = detectPackageManagers (1)
async function detectPackageManagers() {
  let packageManagers = [];
  if (await isCommandAvailable("npm")) packageManagers.push("npm");
  if (await isCommandAvailable("yarn")) packageManagers.push("yarn");
  if (await isCommandAvailable("pnpm")) packageManagers.push("pnpm");
  return packageManagers;
}
//@ chunk-jhrww53q.js:50571-50709 fingerprint = detectRuntimes (1)
async function detectRuntimes() {
  let runtimes = [];
  if (await isCommandAvailable("bun")) runtimes.push("bun");
  if (await isCommandAvailable("deno")) runtimes.push("deno");
  if (await isCommandAvailable("node")) runtimes.push("node");
  return runtimes;
}
/**
 * 构建工具名与 PATH 扫描超时。
 */
//@ chunk-jhrww53q.js:50709-51001 layout
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
  ],
  PATH_SCAN_TIMEOUT_MS = 1000;
//@ chunk-jhrww53q.js:51001-51082 layout
async function k_(o) {
  try {
    return /appinstaller/i.test(await readlink(o));
  } catch {
    return !1;
  }
}
//@ chunk-jhrww53q.js:51082-51160 layout
async function w_s(o) {
  if (o === "" || AV(o) || Eh(o)) return !1;
  return !(await hasUntouchableRecordSpellingStrictAsync(resolve(o)));
}
//@ chunk-jhrww53q.js:51160-51943 layout
async function scanPathForExecutables(o, t) {
  let _ = getPlatform() === "windows",
    E = new Set(o),
    r = _ ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").toLowerCase().split(";").filter(Boolean) : [],
    n = uniq(
      (process.env.PATH ?? "")
        .split(delimiter)
        .map((s) => s.replace(/^"|"$/g, ""))
        .filter(Boolean),
    );
  await Promise.all(
    n.map(async (s) => {
      if (!(await w_s(s))) return;
      let e;
      try {
        e = await readdir(s, { withFileTypes: !0 });
      } catch {
        return;
      }
      let D = _ && /[\\/]microsoft[\\/]windowsapps[\\/]?$/i.test(s);
      for (let C of e) {
        if (C.isDirectory()) continue;
        let S = C.name;
        if (_) {
          let lower = S.toLowerCase(),
            index = lower.lastIndexOf(".");
          if (index <= 0 || !r.includes(lower.slice(index))) continue;
          S = lower.slice(0, index);
        }
        if (!E.has(S) || t.has(S)) continue;
        if (_) {
          if (D && (await k_(join(s, C.name)))) continue;
        } else {
          let O = join(s, C.name);
          if (
            (C.isSymbolicLink() || safeResolvePath_2(C)) &&
            (await hasUntouchableRecordSpellingStrictAsync(resolve(O)))
          )
            continue;
          try {
            await access(O, constants.X_OK);
          } catch {
            continue;
          }
        }
        t.add(S);
      }
    }),
  );
}
//@ chunk-jhrww53q.js:51943-52078 layout
async function detectBuildTools() {
  let o = new Set();
  try {
    await withTimeout(
      scanPathForExecutables(BUILD_TOOL_NAMES, o),
      PATH_SCAN_TIMEOUT_MS,
      "build tool PATH scan timed out",
    );
  } catch {}
  return BUILD_TOOL_NAMES.filter((t) => o.has(t));
}
//@ chunk-jhrww53q.js:52078-52128 layout
function qMi() {
  return getEnvProbe().getDetectedBuildTools();
}
//@ chunk-jhrww53q.js:52128-52268 fingerprint = isNpmFromWindowsPath (0.798)
function isNpmFromWindowsPath(o) {
  try {
    if (!o.isWslEnvironment()) return !1;
    let t = w0("npm");
    if (t === null) return !1;
    return t.startsWith("/mnt/c/");
  } catch (error) {
    return !1;
  }
}
//@ chunk-jhrww53q.js:52268-52344 fingerprint = isConductor (1)
function isConductor() {
  return process.env.__CFBundleIdentifier === "com.conductor.app";
}
//@ chunk-jhrww53q.js:52344-52519 facade-exports = JETBRAINS_IDES (1)
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
/**
 * 应用路径是否 Windsurf/Devin。
 */
//@ chunk-jhrww53q.js:52519-52730 layout
function isWindsurfOrDevin(o) {
  let lower = o.toLowerCase();
  return (
    lower.includes("windsurf") ||
    lower.includes("devin.app") ||
    lower.includes("devin desktop") ||
    lower.includes("devin-desktop") ||
    /appdata[\\/]local[\\/](programs[\\/])?devin[\\/]/.test(lower)
  );
}
//@ chunk-jhrww53q.js:52730-54683 fingerprint = detectTerminal (0.976)
function detectTerminal() {
  if (process.env.CURSOR_TRACE_ID) return "cursor";
  let o = process.env.VSCODE_GIT_ASKPASS_MAIN?.toLowerCase() ?? "";
  if (o.includes("cursor")) return "cursor";
  if (isWindsurfOrDevin(o)) return "windsurf";
  if (o.includes("antigravity")) return "antigravity";
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
  if (isSSHSession_2()) return "ssh-session";
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
//@ chunk-jhrww53q.js:54683-56364 layout
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
  constructor(o) {
    this.sources = o;
  }
  getGlobalClaudeFile() {
    return (this.globalClaudeFile ??= resolveGlobalClaudeFile());
  }
  seedGlobalClaudeFile(o) {
    if (this.globalClaudeFile === void 0) return ((this.globalClaudeFile = o), "seeded");
    return this.globalClaudeFile === o ? "unchanged" : "conflict";
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
    return (this.deploymentEnvironment ??= detectDeploymentEnvironment(this));
  }
  async prime() {
    if (this.primedWslInteropExists !== void 0 || p()) return;
    let [o, t, _] = await Promise.all([
      access("/proc/sys/fs/binfmt_misc/WSLInterop").then(
        () => !0,
        () => !1,
      ),
      readFile("/sys/hypervisor/uuid", { encoding: "utf8" }).then(
        (E) => E.trim().toLowerCase(),
        () => {
          return;
        },
      ),
      access("/.dockerenv").then(
        () => !0,
        () => !1,
      ),
    ]);
    ((this.primedWslInteropExists = o),
      (this.primedHypervisorUuid = t ?? ""),
      (this.primedDockerenvExists = _),
      (this.wslEnvironment = void 0),
      (this.npmFromWindowsPath = void 0),
      (this.deploymentEnvironment = void 0));
  }
}
//@ chunk-jhrww53q.js:56364-56461 layout
var z_ = new HostScoped(
  () =>
    new EnvProbe({
      wslInteropExistsSync: isWslEnvironment,
      readHypervisorUuidSync: readFileSafe,
      dockerenvExistsSync: getIsDocker,
    }),
);
//@ chunk-jhrww53q.js:56461-56497 layout
function getEnvProbe() {
  return z_.of(getRootSession().host);
}
//@ chunk-jhrww53q.js:56497-56531 layout
function YMi() {
  return getEnvProbe().prime();
}
//@ chunk-jhrww53q.js:56531-56578 layout
function Rwr() {
  return getEnvProbe().isDockerenvPresent();
}
//@ chunk-jhrww53q.js:56578-56632 layout
function J() {
  return getEnvProbe().detectDeploymentEnvironment();
}
//@ chunk-jhrww53q.js:56632-58727 fingerprint = detectDeploymentEnvironment (0.881)
function detectDeploymentEnvironment(o) {
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
  if (o.hypervisorUuid().startsWith("ec2")) return "aws-ec2";
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
  if (isEnvTruthy(!1)) return "ci";
  if (process.env.KUBERNETES_SERVICE_HOST) return "kubernetes";
  if (o.isDockerenvPresent()) return "docker";
  if (env_2.platform === "darwin") return "unknown-darwin";
  if (env_2.platform === "linux") return "unknown-linux";
  if (env_2.platform === "win32") return "unknown-win32";
  return "unknown";
}
//@ chunk-jhrww53q.js:58727-58822 layout = isSSHSession (1)
function isSSHSession_2() {
  return !!(process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY);
}
/**
 * 由服务端或 SSH 守护进程启动。
 */
//@ chunk-jhrww53q.js:58822-58982 layout
function isSpawnedByServer() {
  return (
    process.env.CLAUDE_CODE_SPAWNED_BY_SERVER !== void 0 ||
    process.env.CLAUDE_SSH_DAEMON_CHILD !== void 0 ||
    process.env.CLAUDE_SSH_RUN_DIR !== void 0
  );
}
//@ chunk-jhrww53q.js:58982-59422 fingerprint = env (0.871)
var env_2 = {
  probeInternalNetworkAccess: V_,
  isCI: isEnvTruthy(!1),
  platform: ["win32", "darwin"].includes("linux") ? "linux" : "linux",
  arch: "x64",
  nodeVersion: process.version,
  terminal: detectTerminal(),
  isSSH: isSSHSession_2,
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
  isConductor: isConductor,
  detectDeploymentEnvironment: J,
};
//@ chunk-jhrww53q.js:59422-59550 facade-exports = getHostPlatformForAnalytics (1)
function getHostPlatformForAnalytics() {
  let override = process.env.CLAUDE_CODE_HOST_PLATFORM;
  if (override === "win32" || override === "darwin" || override === "linux") return override;
  return env_2.platform;
}
//@ chunk-jhrww53q.js:59550-59689 layout
var SHELL_NAMES = new Set([
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
//@ chunk-jhrww53q.js:59689-59824 facade-exports
function normalizeShellNameForAnalytics(o) {
  if (!o) return fromSanitizer_SANITIZER_OUTPUT_ONLY("none");
  let replaced = o
    .split(/[/\\]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, "");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(SHELL_NAMES.has(replaced) ? replaced : "other");
}
//@ chunk-jhrww53q.js:59824-59894 facade-exports
function getShellForAnalytics() {
  return normalizeShellNameForAnalytics(process.env.SHELL || process.env.COMSPEC || "");
}
//@ chunk-jhrww53q.js:75963-76138 facade-exports
function declaredEnvVarNames(o) {
  let t = weakMap.get(o);
  if (t === void 0) return [];
  if (t !== null) return Object.keys(t);
  let prototypeOf = Object.getPrototypeOf(o);
  return Object.keys(o).filter((E) => prototypeOf === null || !(E in prototypeOf));
}
//@ chunk-jhrww53q.js:76138-76237 facade-exports
var env = createEnvAccessor(ALL_ENV_VARS, env_2),
  jl = {},
  antEnv = createEnvAccessor(jl, null),
  udsInboxShape = require("./chunk-zya51bzb.js").udsInboxShape,
  udsEnv = createEnvAccessor(udsInboxShape, null);
//@ chunk-4m46mxx9.js:12064-12238 fingerprint = JETBRAINS_IDES (1)
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
//@ chunk-aepeg2w5.js:751986-752249 fingerprint = hasInternetAccess (0.427)
async function hasInternetAccess() {
  try {
    let { externalHttp: externalHttp } = await import("./chunk-tkdf9y00.js");
    return (await externalHttp.head("http://1.1.1.1", { signal: AbortSignal.timeout(1000) }), !0);
  } catch (error) {
    return (
      logForDebugging(
        `internet access probe failed (${errorMessage(error)}); treating outbound internet as unreachable`,
      ),
      !1
    );
  }
}
//@ chunk-cdz6g143.js:519-632 fingerprint = getGlobalClaudeFile (0.833)
var LEGACY_CONFIG_JSON = ".config.json",
  Z8o = `.claude${OAUTH_GLOBAL_FILE_SUFFIXES[0]}.json`,
  mapped = OAUTH_GLOBAL_FILE_SUFFIXES.map((o) => `.claude${o}.json`),
  xli = [...mapped, LEGACY_CONFIG_JSON, CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME];
//@ chunk-cxdk9p3j.js:1606-1705 fingerprint = isSSHSession (1)
function isSSHSession() {
  if (getPlatform() !== "windows") return !1;
  return Boolean(env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY);
}

export {
  env,
  antEnv,
  getGlobalClaudeFile,
  udsEnv,
  declaredEnvVarNames,
  isSpawnedByServer,
  describeGlobalConfigFile,
  getHostPlatformForAnalytics,
  getShellForAnalytics,
  JETBRAINS_IDES,
  BUILD_TOOL_NAMES,
  scanPathForExecutables,
  w_s,
  JETBRAINS_IDES_2,
  hasInternetAccess,
  Rwr,
  p,
  getDefaultGlobalClaudeFile,
  mapped,
  LEGACY_CONFIG_JSON,
  YMi,
  isSSHSession,
  normalizeShellNameForAnalytics,
  qMi,
  isWindsurfOrDevin,
  Z8o,
  xli,
};
