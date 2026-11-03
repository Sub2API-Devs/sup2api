/**
 * utils/claudeInChrome/setupPortable.ts
 *
 * 不依赖运行时上下文的扩展安装检测：扫描各浏览器配置文件目录下的扩展 ID。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/setupPortable.ts
 * pieces: chunk-s61vbvea.js (3)
 * attribution: fingerprint 3
 */
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
} from "fs/promises";
import { getExtensionIds } from "./setup.js";
import { isFsInaccessible } from "../errors.js";

/**
 * 扩展检测用的浏览器顺序与各平台用户数据目录。
 */
//@ chunk-s61vbvea.js:505358-506446 fingerprint = CHROMIUM_BROWSERS (0.937)
var BROWSER_DETECTION_ORDER = ["chrome", "brave", "arc", "edge", "chromium", "vivaldi", "opera"],
  CHROMIUM_BROWSERS = {
    chrome: {
      macos: ["Library", "Application Support", "Google", "Chrome"],
      linux: [".config", "google-chrome"],
      windows: { path: ["Google", "Chrome", "User Data"] },
    },
    brave: {
      macos: ["Library", "Application Support", "BraveSoftware", "Brave-Browser"],
      linux: [".config", "BraveSoftware", "Brave-Browser"],
      windows: { path: ["BraveSoftware", "Brave-Browser", "User Data"] },
    },
    arc: {
      macos: ["Library", "Application Support", "Arc", "User Data"],
      linux: [],
      windows: { path: ["Arc", "User Data"] },
    },
    chromium: {
      macos: ["Library", "Application Support", "Chromium"],
      linux: [".config", "chromium"],
      windows: { path: ["Chromium", "User Data"] },
    },
    edge: {
      macos: ["Library", "Application Support", "Microsoft Edge"],
      linux: [".config", "microsoft-edge"],
      windows: { path: ["Microsoft", "Edge", "User Data"] },
    },
    vivaldi: {
      macos: ["Library", "Application Support", "Vivaldi"],
      linux: [".config", "vivaldi"],
      windows: { path: ["Vivaldi", "User Data"] },
    },
    opera: {
      macos: ["Library", "Application Support", "com.operasoftware.Opera"],
      linux: [".config", "opera"],
      windows: { path: ["Opera Software", "Opera Stable"], useRoaming: !0 },
    },
  };
/**
 * 列出当前平台各浏览器的用户数据目录（linux 构建中平台常量折叠为 linux）。
 */
//@ chunk-s61vbvea.js:506446-506819 fingerprint = getAllBrowserDataPathsPortable (0.976)
function getAllBrowserDataPathsPortable() {
  let home = homedir_7(),
    paths = [];
  for (let browserId of BROWSER_DETECTION_ORDER) {
    let config = CHROMIUM_BROWSERS[browserId],
      dataPath;
    switch ("linux") {
      case "darwin":
        dataPath = config.macos;
        break;
      case "linux":
        dataPath = config.linux;
        break;
      case "win32": {
        if (config.windows.path.length > 0) {
          let appDataBase = config.windows.useRoaming
            ? join_18(home, "AppData", "Roaming")
            : join_18(home, "AppData", "Local");
          paths.push({ browser: browserId, path: join_18(appDataBase, ...config.windows.path) });
        }
        continue;
      }
    }
    if (dataPath && dataPath.length > 0) paths.push({ browser: browserId, path: join_18(home, ...dataPath) });
  }
  return paths;
}
/**
 * 在各浏览器的 Default/Profile N 目录下找扩展目录，返回 {isInstalled, browser}。
 */
//@ chunk-s61vbvea.js:506819-507541 fingerprint = detectExtensionInstallationPortable (1)
async function detectExtensionInstallationPortable(browserPaths, log) {
  if (browserPaths.length === 0)
    return (log?.("[Claude in Chrome] No browser paths to check"), { isInstalled: !1, browser: null });
  let extensionIds = getExtensionIds();
  for (let { browser: browser, path: browserBasePath } of browserPaths) {
    let browserProfileEntries = [];
    try {
      browserProfileEntries = await readdir_6(browserBasePath, { withFileTypes: !0 });
    } catch (error) {
      if (isFsInaccessible(error)) continue;
      throw error;
    }
    let profileDirs = browserProfileEntries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => entry.name === "Default" || entry.name.startsWith("Profile "))
      .map((entry) => entry.name);
    if (profileDirs.length > 0)
      log?.(`[Claude in Chrome] Found ${browser} profiles: ${profileDirs.join(", ")}`);
    for (let profile of profileDirs)
      for (let extensionId of extensionIds) {
        let extensionPath = join_18(browserBasePath, profile, "Extensions", extensionId);
        try {
          return (
            await readdir_6(extensionPath),
            log?.(`[Claude in Chrome] Extension ${extensionId} found in ${browser} ${profile}`),
            { isInstalled: !0, browser: browser }
          );
        } catch {}
      }
  }
  return (log?.("[Claude in Chrome] Extension not found in any browser"), { isInstalled: !1, browser: null });
}

export { detectExtensionInstallationPortable, getAllBrowserDataPathsPortable };
