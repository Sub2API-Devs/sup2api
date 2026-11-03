/**
 * utils/deepLink/registerProtocol.ts
 *
 * 并入已有模块：决定启动目标（当前二进制、版本目录、node 脚本）；查找已安装的最新版本二进制等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/registerProtocol.ts
 * pieces: chunk-fb29jded.js (11), chunk-qrnm62fg.js (7), chunk-x4gcvpxy.js (1)
 * attribution: callgraph-witnessed 2, fingerprint 9, placement 7, callgraph-fingerprint 1
 */
import * as pathModule from "path";
import { sep, join } from "path";
import * as osModule from "os";
import { promises } from "fs";
import { readdir, stat } from "fs/promises";
import { getXDGDataHome, getNativeVersionsDir, getUserBinDir } from "../xdg.js";
import { paths } from "../cachePaths.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../errors.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { logForDebugging } from "../debug.js";
import { whichAsync } from "../which.js";
import { embeddedSearchToolsBinaryPath } from "../embeddedTools.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { isStandaloneExecutable } from "../slowOperations.js";
import { processWrapperArgv } from "../processWrapper.js";

/**
 * 协议处理器常量：macOS 包 ~/Applications/Claude Code URL Handler.app（bundle id com.anthropic.claude-code-url-handler）、Linux .desktop 文件名。
 */
//@ chunk-fb29jded.js:701-922 callgraph-witnessed = APP_NAME (0.232)
var MACOS_BUNDLE_ID = "com.anthropic.claude-code-url-handler",
  APP_DISPLAY_NAME = "Claude Code URL Handler",
  DESKTOP_FILE_NAME = "claude-code-url-handler.desktop",
  MACOS_APP_NAME = "Claude Code URL Handler.app",
  MACOS_APP_DIR = pathModule.join(osModule.homedir(), "Applications", MACOS_APP_NAME),
  MACOS_SYMLINK_PATH = pathModule.join(MACOS_APP_DIR, "Contents", "MacOS", "claude");
/**
 * Linux .desktop 文件路径 $XDG_DATA_HOME/applications/claude-code-url-handler.desktop。
 */
//@ chunk-fb29jded.js:922-973 fingerprint = linuxDesktopPath (1)
function linuxDesktopPath() {
  return pathModule.join(getXDGDataHome(), "applications", DESKTOP_FILE_NAME);
}
/**
 * Windows 注册表键 HKCU\Software\Classes\claude-cli 及 shell\open\command；注册失败后的退避 24h。
 */
//@ chunk-fb29jded.js:973-1068 fingerprint = WINDOWS_REG_KEY (0.667)
var WINDOWS_REG_KEY = `HKEY_CURRENT_USER\\Software\\Classes\\${paths}`,
  WINDOWS_COMMAND_KEY = `${WINDOWS_REG_KEY}\\shell\\open\\command`,
  FAILURE_BACKOFF_MS = 86400000;
/**
 * Linux .desktop 的 Exec 行："<claude>" --handle-uri %u。
 */
//@ chunk-fb29jded.js:1068-1118 fingerprint = linuxExecLine (1)
function linuxExecLine(claudePath) {
  return `Exec="${claudePath}" --handle-uri %u`;
}
/**
 * Windows 注册表命令值："<claude>" --handle-uri "%1"。
 */
//@ chunk-fb29jded.js:1118-1165 fingerprint = windowsCommandValue (1)
function windowsCommandValue(claudePath) {
  return `"${claudePath}" --handle-uri "%1"`;
}
/**
 * macOS：重建 URL Handler.app（Info.plist 声明 CFBundleURLSchemes claude-cli、LSBackgroundOnly），把 MacOS/claude 符号链接到 claude 可执行文件，并用 lsregister -R 注册。
 */
//@ chunk-fb29jded.js:1165-2336 fingerprint = registerMacos (1)
async function registerMacos(claudePath) {
  let contentsDir = pathModule.join(MACOS_APP_DIR, "Contents");
  try {
    await promises.rm(MACOS_APP_DIR, { recursive: !0 });
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  await promises.mkdir(pathModule.dirname(MACOS_SYMLINK_PATH), { recursive: !0 });
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
  (await promises.writeFile(pathModule.join(contentsDir, "Info.plist"), infoPlist),
    await promises.symlink(claudePath, MACOS_SYMLINK_PATH),
    await execFileNoThrow(
      "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",
      ["-R", MACOS_APP_DIR],
      { useCwd: !1 },
    ),
    logForDebugging(`Registered ${paths}:// protocol handler at ${MACOS_APP_DIR}`));
}
/**
 * Linux：写 .desktop（MimeType x-scheme-handler/claude-cli），有 xdg-mime 时设为默认处理器。
 */
//@ chunk-fb29jded.js:2336-2844 fingerprint = registerLinux (1)
async function registerLinux(claudePath) {
  await promises.mkdir(pathModule.dirname(linuxDesktopPath()), { recursive: !0 });
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
    let { code: code } = await execFileNoThrow(
      xdgMime,
      ["default", DESKTOP_FILE_NAME, `x-scheme-handler/${paths}`],
      { useCwd: !1 },
    );
    if (code !== 0)
      throw Object.assign(Error(`xdg-mime exited with code ${code}`), { code: "XDG_MIME_FAILED" });
  }
  logForDebugging(`Registered ${paths}:// protocol handler at ${linuxDesktopPath()}`);
}
/**
 * Windows：reg add 写 URL 协议键与 open 命令。
 */
//@ chunk-fb29jded.js:2844-3184 fingerprint = registerWindows (1)
async function registerWindows(claudePath) {
  for (let args of [
    ["add", WINDOWS_REG_KEY, "/ve", "/d", `URL:${APP_DISPLAY_NAME}`, "/f"],
    ["add", WINDOWS_REG_KEY, "/v", "URL Protocol", "/d", "", "/f"],
    ["add", WINDOWS_COMMAND_KEY, "/ve", "/d", windowsCommandValue(claudePath), "/f"],
  ]) {
    let { code: code } = await execFileNoThrow("reg", args, { useCwd: !1 });
    if (code !== 0) throw Object.assign(Error(`reg add exited with code ${code}`), { code: "REG_FAILED" });
  }
  logForDebugging(`Registered ${paths}:// protocol handler in Windows registry`);
}
/**
 * 按平台注册 claude-cli:// 协议处理器（linux 构建常量折叠为 registerLinux）。
 */
//@ chunk-fb29jded.js:3184-3379 callgraph-witnessed = registerProtocolHandler (0.599)
async function registerProtocolHandler(claudePath) {
  let resolved = claudePath ?? (await embeddedSearchToolsBinaryPath());
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
/**
 * 检查已注册的处理器是否指向当前 claude 路径（macOS 读符号链接、Linux 读 .desktop、Windows 查注册表）。
 */
//@ chunk-fb29jded.js:3474-3767 fingerprint = isProtocolHandlerCurrent (0.972)
async function isProtocolHandlerCurrent(claudePath) {
  try {
    switch ("linux") {
      case "darwin":
        return (await promises.readlink(MACOS_SYMLINK_PATH)) === claudePath;
      case "linux":
        return (await promises.readFile(linuxDesktopPath(), "utf8")).includes(linuxExecLine(claudePath));
      case "win32": {
        let { stdout: stdout, code: code } = await execFileNoThrow(
          "reg",
          ["query", WINDOWS_COMMAND_KEY, "/ve"],
          { useCwd: !1 },
        );
        return code === 0 && stdout.includes(windowsCommandValue(claudePath));
      }
      default:
        return !1;
    }
  } catch {
    return !1;
  }
}
/**
 * 后台自动注册深链接协议：设置 disableDeepLinkRegistration="disable" 时跳过；已是最新则跳过；24h 内失败过（失败标记文件 .deep-link-register-failed 或 storageV5 state）则跳过；EACCES/ENOSPC 失败时写失败标记。
 */
//@ chunk-fb29jded.js:3767-4756 fingerprint = ensureDeepLinkProtocolRegistered (0.698)
async function ensureDeepLinkProtocolRegistered(storage) {
  if (getInitialSettings_2().disableDeepLinkRegistration === "disable") return;
  if (!["darwin", "linux", "win32"].includes("linux")) return;
  let claudePath = await embeddedSearchToolsBinaryPath();
  if (await isProtocolHandlerCurrent(claudePath)) return;
  let failureMarkerPath = pathModule.join(getClaudeConfigDir(), ".deep-link-register-failed");
  if (isStorageV5Enabled() && storage !== void 0) {
    let stat = await storage.stat(STORAGE_SPACES.state("deep-link-register-failed"));
    if (stat.ok && Date.now() - stat.value.mtimeMs < FAILURE_BACKOFF_MS) return;
  } else
    try {
      let stats = await promises.stat(failureMarkerPath);
      if (Date.now() - stats.mtimeMs < FAILURE_BACKOFF_MS) return;
    } catch {}
  try {
    if (
      (await registerProtocolHandler(claudePath),
      logFeatureOk("deep_link_register"),
      logForDebugging("Auto-registered claude-cli:// deep link protocol handler"),
      isStorageV5Enabled() && storage !== void 0)
    )
      await storage.delete(STORAGE_SPACES.state("deep-link-register-failed"));
    else await promises.rm(failureMarkerPath, { force: !0 }).catch(() => {});
  } catch (error) {
    let code = sanitizeErrnoForTelemetry(error);
    if (
      (logFeatureBad("deep_link_register", code ?? "register_failed"),
      logForDebugging(
        `Failed to auto-register deep link protocol handler: ${error instanceof Error ? error.message : String(error)}`,
        { level: "warn" },
      ),
      code === "EACCES" || code === "ENOSPC")
    )
      if (isStorageV5Enabled() && storage !== void 0)
        await storage.write(STORAGE_SPACES.state("deep-link-register-failed"), "", {
          publishDiscipline: "inPlace",
        });
      else await promises.writeFile(failureMarkerPath, "").catch(() => {});
  }
}
//@ chunk-qrnm62fg.js:375-392 placement
var o = Re(Vy(), 1);
/**
 * 是否从安装的版本目录运行。
 */
//@ chunk-qrnm62fg.js:477-562 placement
function isRunningFromVersionsDir() {
  if (!isStandaloneExecutable()) return !1;
  let r = getNativeVersionsDir() + sep;
  return process.execPath.startsWith(r);
}
/**
 * 生成重新启动 Claude Code 的命令。
 */
//@ chunk-qrnm62fg.js:562-598 placement
function getLaunchCommand(r = {}) {
  return withProcessWrapper(resolveLaunchTarget(r));
}
/**
 * 决定启动目标（当前二进制、版本目录、node 脚本）。
 */
//@ chunk-qrnm62fg.js:598-922 placement
function resolveLaunchTarget(r = {}) {
  if (!r.pinToCurrentBinary && isRunningFromVersionsDir()) {
    let t = resolveClaudePath();
    return { cmd: t, prefixArgs: [], target: t };
  }
  if (isStandaloneExecutable()) return { cmd: process.execPath, prefixArgs: [], target: process.execPath };
  let e = process.argv[1];
  if (!e) return { cmd: process.execPath, prefixArgs: [], target: process.execPath };
  return { cmd: process.execPath, prefixArgs: [e], target: e };
}
/**
 * 本地安装的 claude 路径 <用户 bin 目录>/claude。
 */
//@ chunk-qrnm62fg.js:922-961 callgraph-fingerprint = resolveClaudePath (0.328)
function resolveClaudePath() {
  return join(getUserBinDir(), "claude");
}
/**
 * 套上进程包装器前缀。
 */
//@ chunk-qrnm62fg.js:961-1108 placement
function withProcessWrapper(r) {
  let e = processWrapperArgv();
  if (e.length === 0 || r.cmd === e[0]) return r;
  return { cmd: e[0], prefixArgs: [...e.slice(1), r.cmd, ...r.prefixArgs], target: r.target };
}
/**
 * 查找已安装的最新版本二进制。
 */
//@ chunk-qrnm62fg.js:1108-1367 placement
async function findLatestInstalledVersion() {
  let r = getNativeVersionsDir(),
    e;
  try {
    e = await readdir(r);
  } catch {
    return null;
  }
  let sorted = e.filter((n) => !/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n) && o.valid(n)).sort(o.rcompare);
  for (let n of sorted) {
    let i = join(r, n);
    try {
      let s = await stat(i);
      if (s.isFile() && s.size > 0) return i;
    } catch {}
  }
  return null;
}
//@ chunk-x4gcvpxy.js:2021-2103 placement
function jbo() {
  return process.execPath.startsWith(join(getXDGDataHome(), "claude", "versions") + sep);
}

export {
  getLaunchCommand,
  ensureDeepLinkProtocolRegistered,
  resolveClaudePath,
  jbo,
  withProcessWrapper,
  isRunningFromVersionsDir,
  findLatestInstalledVersion,
  resolveLaunchTarget,
};
