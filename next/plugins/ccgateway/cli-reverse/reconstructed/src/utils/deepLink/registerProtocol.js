/**
 * utils/deepLink/registerProtocol.ts
 *
 * 并入已有模块：决定启动目标（当前二进制、版本目录、node 脚本）；查找已安装的最新版本二进制等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/registerProtocol.ts
 * pieces: chunk-f8a5a0kt.js (12), chunk-gvr4gxa7.js (1), chunk-nh327nc2.js (7)
 * attribution: callgraph-witnessed 2, fingerprint 9, callgraph-fingerprint 1, placement 7, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as pathModule from "path";
import { sep, join } from "path";
import { readdir, stat } from "fs/promises";
import * as osModule from "os";
import { promises } from "fs";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { isStandaloneExecutable } from "../slowOperations.js";
import { getNativeVersionsDir, getUserBinDir, getXDGDataHome } from "../xdg.js";
import { processWrapperArgv } from "../processWrapper.js";
import { paths } from "../cachePaths.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../errors.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { logForDebugging } from "../debug.js";
import { whichAsync } from "../which.js";
import { getInitialSettings } from "../settings/settings.js";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nh327nc2.js:375-392 placement
/**
 * semver 模块的包装导入（用于版本排序）。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nh327nc2.js:375", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-nh327nc2.js:477-562 placement
/**
 * 是否从安装的版本目录运行。
 */
function isRunningFromVersionsDir_2() {
  if (!isStandaloneExecutable()) return false;
  let versionsPrefix = getNativeVersionsDir() + sep;
  return process.execPath.startsWith(versionsPrefix);
}
//@ chunk-nh327nc2.js:562-598 placement
/**
 * 生成重新启动 Claude Code 的命令。
 */
function getLaunchCommand(options = {}) {
  return withProcessWrapper(resolveLaunchTarget(options));
}
//@ chunk-nh327nc2.js:598-922 placement
/**
 * 决定启动目标（当前二进制、版本目录、node 脚本）。
 */
function resolveLaunchTarget(options = {}) {
  if (!options.pinToCurrentBinary && isRunningFromVersionsDir_2()) {
    let binPath = claudeBinPath();
    return {
      cmd: binPath,
      prefixArgs: [],
      target: binPath,
    };
  }
  if (isStandaloneExecutable())
    return {
      cmd: process.execPath,
      prefixArgs: [],
      target: process.execPath,
    };
  let scriptPath = process.argv[1];
  if (!scriptPath)
    return {
      cmd: process.execPath,
      prefixArgs: [],
      target: process.execPath,
    };
  return {
    cmd: process.execPath,
    prefixArgs: [scriptPath],
    target: scriptPath,
  };
}
//@ chunk-nh327nc2.js:922-961 layout
/**
 * 本地安装的 claude 路径 <用户 bin 目录>/claude。
 */
function claudeBinPath() {
  return join(getUserBinDir(), "claude");
}
//@ chunk-nh327nc2.js:961-1108 placement
/**
 * 套上进程包装器前缀。
 */
function withProcessWrapper(target) {
  let wrapperArgv = processWrapperArgv();
  if (wrapperArgv.length === 0 || target.cmd === wrapperArgv[0]) return target;
  return {
    cmd: wrapperArgv[0],
    prefixArgs: [...wrapperArgv.slice(1), target.cmd, ...target.prefixArgs],
    target: target.target,
  };
}
//@ chunk-nh327nc2.js:1108-1367 placement
/**
 * 查找已安装的最新版本二进制。
 */
async function findLatestInstalledVersion() {
  let nativeVersionsDir = getNativeVersionsDir();
  let entries;
  try {
    entries = await readdir(nativeVersionsDir);
  } catch {
    return null;
  }
  let sorted = entries
    .filter((fileName) => !/\.tmp\.\d+\.\d+(\.\d+)?$/.test(fileName) && semverModule.valid(fileName))
    .sort(semverModule.rcompare);
  for (let version of sorted) {
    let versionPath = join(nativeVersionsDir, version);
    try {
      let stats = await stat(versionPath);
      if (stats.isFile() && stats.size > 0) return versionPath;
    } catch {}
  }
  return null;
}
//@ chunk-gvr4gxa7.js:2104-2186 placement
/**
 * 判断当前进程是否从安装的版本目录运行。
 */
function isRunningFromVersionsDir() {
  return process.execPath.startsWith(join(getXDGDataHome(), "claude", "versions") + sep);
}
//@ chunk-f8a5a0kt.js:701-922 callgraph-witnessed (2.1.88 match: APP_NAME, 0.233)
/**
 * 协议处理器常量：macOS 包 ~/Applications/Claude Code URL Handler.app（bundle id com.anthropic.claude-code-url-handler）、Linux .desktop 文件名。
 */
var MACOS_BUNDLE_ID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var APP_DISPLAY_NAME;
var DESKTOP_FILE_NAME;
var MACOS_APP_NAME;
var MACOS_APP_DIR;
var MACOS_SYMLINK_PATH;
deferInit("chunk-f8a5a0kt.js:701", () => {
  MACOS_BUNDLE_ID = "com.anthropic.claude-code-url-handler";
  APP_DISPLAY_NAME = "Claude Code URL Handler";
  DESKTOP_FILE_NAME = "claude-code-url-handler.desktop";
  MACOS_APP_NAME = "Claude Code URL Handler.app";
  MACOS_APP_DIR = pathModule.join(osModule.homedir(), "Applications", MACOS_APP_NAME);
  MACOS_SYMLINK_PATH = pathModule.join(MACOS_APP_DIR, "Contents", "MacOS", "claude");
});
//@ chunk-f8a5a0kt.js:922-973 fingerprint (2.1.88 match: linuxDesktopPath, 1)
/**
 * Linux .desktop 文件路径 $XDG_DATA_HOME/applications/claude-code-url-handler.desktop。
 */
function linuxDesktopPath() {
  return pathModule.join(getXDGDataHome(), "applications", DESKTOP_FILE_NAME);
}
//@ chunk-f8a5a0kt.js:973-1068 fingerprint (2.1.88 match: WINDOWS_REG_KEY, 0.667)
/**
 * Windows 注册表键 HKCU\Software\Classes\claude-cli 及 shell\open\command；注册失败后的退避 24h。
 */
var WINDOWS_REG_KEY = `HKEY_CURRENT_USER\\Software\\Classes\\${paths}`;
var WINDOWS_COMMAND_KEY = `${WINDOWS_REG_KEY}\\shell\\open\\command`;
var FAILURE_BACKOFF_MS = 86400000;
//@ chunk-f8a5a0kt.js:1068-1118 fingerprint (2.1.88 match: linuxExecLine, 1)
/**
 * Linux .desktop 的 Exec 行："<claude>" --handle-uri %u。
 */
function linuxExecLine(claudePath) {
  return `Exec="${claudePath}" --handle-uri %u`;
}
//@ chunk-f8a5a0kt.js:1118-1165 fingerprint (2.1.88 match: windowsCommandValue, 1)
/**
 * Windows 注册表命令值："<claude>" --handle-uri "%1"。
 */
function windowsCommandValue(claudePath) {
  return `"${claudePath}" --handle-uri "%1"`;
}
//@ chunk-f8a5a0kt.js:1165-2336 fingerprint (2.1.88 match: registerMacos, 1)
/**
 * macOS：重建 URL Handler.app（Info.plist 声明 CFBundleURLSchemes claude-cli、LSBackgroundOnly），把 MacOS/claude 符号链接到 claude 可执行文件，并用 lsregister -R 注册。
 */
async function registerMacos(claudePath) {
  let contentsDir = pathModule.join(MACOS_APP_DIR, "Contents");
  try {
    await promises.rm(MACOS_APP_DIR, {
      recursive: true,
    });
  } catch (e) {
    if (getErrnoCode(e) !== "ENOENT") throw e;
  }
  await promises.mkdir(pathModule.dirname(MACOS_SYMLINK_PATH), {
    recursive: true,
  });
  let infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${MACOS_BUNDLE_ID}</string>
  <key>CFBundleName</key>
  <string>${APP_DISPLAY_NAME}</string>
  <key>CFBundleExecutable</key>
  <string>claude</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSBackgroundOnly</key>
  <true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>Claude Code Deep Link</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${paths}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;
  await promises.writeFile(pathModule.join(contentsDir, "Info.plist"), infoPlist);
  await promises.symlink(claudePath, MACOS_SYMLINK_PATH);
  await execFileNoThrow(
    "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",
    ["-R", MACOS_APP_DIR],
    {
      useCwd: false,
    },
  );
  logForDebugging(`Registered ${paths}:// protocol handler at ${MACOS_APP_DIR}`);
}
//@ chunk-f8a5a0kt.js:2336-2844 fingerprint (2.1.88 match: registerLinux, 1)
/**
 * Linux：写 .desktop（MimeType x-scheme-handler/claude-cli），有 xdg-mime 时设为默认处理器。
 */
async function registerLinux(claudePath) {
  await promises.mkdir(pathModule.dirname(linuxDesktopPath()), {
    recursive: true,
  });
  let desktopEntry = `[Desktop Entry]
Name=${APP_DISPLAY_NAME}
Comment=Handle ${paths}:// deep links for Claude Code
${linuxExecLine(claudePath)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${paths};
`;
  await promises.writeFile(linuxDesktopPath(), desktopEntry);
  let xdgMime = await whichAsync("xdg-mime");
  if (xdgMime) {
    let { code } = await execFileNoThrow(
      xdgMime,
      ["default", DESKTOP_FILE_NAME, `x-scheme-handler/${paths}`],
      {
        useCwd: false,
      },
    );
    if (code !== 0)
      throw Object.assign(Error(`xdg-mime exited with code ${code}`), {
        code: "XDG_MIME_FAILED",
      });
  }
  logForDebugging(`Registered ${paths}:// protocol handler at ${linuxDesktopPath()}`);
}
//@ chunk-f8a5a0kt.js:2844-3184 fingerprint (2.1.88 match: registerWindows, 1)
/**
 * Windows：reg add 写 URL 协议键与 open 命令。
 */
async function registerWindows(claudePath) {
  for (let args of [
    ["add", WINDOWS_REG_KEY, "/ve", "/d", `URL:${APP_DISPLAY_NAME}`, "/f"],
    ["add", WINDOWS_REG_KEY, "/v", "URL Protocol", "/d", "", "/f"],
    ["add", WINDOWS_COMMAND_KEY, "/ve", "/d", windowsCommandValue(claudePath), "/f"],
  ]) {
    let { code } = await execFileNoThrow("reg", args, {
      useCwd: false,
    });
    if (code !== 0)
      throw Object.assign(Error(`reg add exited with code ${code}`), {
        code: "REG_FAILED",
      });
  }
  logForDebugging(`Registered ${paths}:// protocol handler in Windows registry`);
}
//@ chunk-f8a5a0kt.js:3184-3379 callgraph-witnessed (2.1.88 match: registerProtocolHandler, 0.599)
/**
 * 按平台注册 claude-cli:// 协议处理器（linux 构建常量折叠为 registerLinux）。
 */
async function registerProtocolHandler(claudePath) {
  let resolved = claudePath ?? (await resolveClaudePath());
  switch ("linux") {
    case "darwin":
      await registerMacos(resolved);
      break;
    case "linux":
      await registerLinux(resolved);
      break;
    case "win32":
      await registerWindows(resolved);
      break;
    default:
      throw Error("Unsupported platform: linux");
  }
}
//@ chunk-f8a5a0kt.js:3379-3474 callgraph-fingerprint (2.1.88 match: resolveClaudePath, 0.372)
async function resolveClaudePath() {
  let binPath = claudeBinPath();
  try {
    await promises.realpath(binPath);
    return binPath;
  } catch {
    return process.execPath;
  }
}
//@ chunk-f8a5a0kt.js:3474-3767 fingerprint (2.1.88 match: isProtocolHandlerCurrent, 0.972)
/**
 * 检查已注册的处理器是否指向当前 claude 路径（macOS 读符号链接、Linux 读 .desktop、Windows 查注册表）。
 */
async function isProtocolHandlerCurrent(claudePath) {
  try {
    switch ("linux") {
      case "darwin":
        return (await promises.readlink(MACOS_SYMLINK_PATH)) === claudePath;
      case "linux":
        return (await promises.readFile(linuxDesktopPath(), "utf8")).includes(linuxExecLine(claudePath));
      case "win32": {
        let { stdout, code } = await execFileNoThrow("reg", ["query", WINDOWS_COMMAND_KEY, "/ve"], {
          useCwd: false,
        });
        return code === 0 && stdout.includes(windowsCommandValue(claudePath));
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}
//@ chunk-f8a5a0kt.js:3767-4756 fingerprint (2.1.88 match: ensureDeepLinkProtocolRegistered, 0.698)
/**
 * 后台自动注册深链接协议：设置 disableDeepLinkRegistration="disable" 时跳过；已是最新则跳过；24h 内失败过（失败标记文件 .deep-link-register-failed 或 storageV5 state）则跳过；EACCES/ENOSPC 失败时写失败标记。
 */
async function ensureDeepLinkProtocolRegistered(storage) {
  if (getInitialSettings().disableDeepLinkRegistration === "disable") return;
  if (!["darwin", "linux", "win32"].includes("linux")) return;
  let claudePath = await resolveClaudePath();
  if (await isProtocolHandlerCurrent(claudePath)) return;
  let failureMarkerPath = pathModule.join(getClaudeConfigDir(), ".deep-link-register-failed");
  if (isStorageV5Enabled() && storage !== undefined) {
    let stat = await storage.stat(STORAGE_SPACES.state("deep-link-register-failed"));
    if (stat.ok && Date.now() - stat.value.mtimeMs < FAILURE_BACKOFF_MS) return;
  } else
    try {
      let stat = await promises.stat(failureMarkerPath);
      if (Date.now() - stat.mtimeMs < FAILURE_BACKOFF_MS) return;
    } catch {}
  try {
    await registerProtocolHandler(claudePath);
    logFeatureOk("deep_link_register");
    logForDebugging("Auto-registered claude-cli:// deep link protocol handler");
    if (isStorageV5Enabled() && storage !== undefined)
      await storage.delete(STORAGE_SPACES.state("deep-link-register-failed"));
    else
      await promises
        .rm(failureMarkerPath, {
          force: true,
        })
        .catch(() => {});
  } catch (error) {
    let code = sanitizeErrnoForTelemetry(error);
    logFeatureBad("deep_link_register", code ?? "register_failed");
    logForDebugging(
      `Failed to auto-register deep link protocol handler: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    if (code === "EACCES" || code === "ENOSPC")
      if (isStorageV5Enabled() && storage !== undefined)
        await storage.write(STORAGE_SPACES.state("deep-link-register-failed"), "", {
          publishDiscipline: "inPlace",
        });
      else await promises.writeFile(failureMarkerPath, "").catch(() => {});
  }
}
export {
  claudeBinPath,
  withProcessWrapper,
  resolveLaunchTarget,
  getLaunchCommand,
  isRunningFromVersionsDir_2,
  findLatestInstalledVersion,
  ensureDeepLinkProtocolRegistered,
  isRunningFromVersionsDir,
};
