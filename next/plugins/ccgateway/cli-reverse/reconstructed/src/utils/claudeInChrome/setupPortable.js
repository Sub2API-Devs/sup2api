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
import { homedir } from "os";
import { join } from "path";
import { readdir } from "fs/promises";
import { getExtensionIds } from "./setup.js";
import { isFsInaccessible } from "../errors.js";

//@ chunk-s61vbvea.js:505358-506446 fingerprint = CHROMIUM_BROWSERS (0.937)
/**
 * 扩展检测用的浏览器顺序与各平台用户数据目录。
 */
var BROWSER_DETECTION_ORDER = ["chrome", "brave", "arc", "edge", "chromium", "vivaldi", "opera"];
var CHROMIUM_BROWSERS = {
  chrome: {
    macos: ["Library", "Application Support", "Google", "Chrome"],
    linux: [".config", "google-chrome"],
    windows: {
      path: ["Google", "Chrome", "User Data"],
    },
  },
  brave: {
    macos: ["Library", "Application Support", "BraveSoftware", "Brave-Browser"],
    linux: [".config", "BraveSoftware", "Brave-Browser"],
    windows: {
      path: ["BraveSoftware", "Brave-Browser", "User Data"],
    },
  },
  arc: {
    macos: ["Library", "Application Support", "Arc", "User Data"],
    linux: [],
    windows: {
      path: ["Arc", "User Data"],
    },
  },
  chromium: {
    macos: ["Library", "Application Support", "Chromium"],
    linux: [".config", "chromium"],
    windows: {
      path: ["Chromium", "User Data"],
    },
  },
  edge: {
    macos: ["Library", "Application Support", "Microsoft Edge"],
    linux: [".config", "microsoft-edge"],
    windows: {
      path: ["Microsoft", "Edge", "User Data"],
    },
  },
  vivaldi: {
    macos: ["Library", "Application Support", "Vivaldi"],
    linux: [".config", "vivaldi"],
    windows: {
      path: ["Vivaldi", "User Data"],
    },
  },
  opera: {
    macos: ["Library", "Application Support", "com.operasoftware.Opera"],
    linux: [".config", "opera"],
    windows: {
      path: ["Opera Software", "Opera Stable"],
      useRoaming: true,
    },
  },
};
//@ chunk-s61vbvea.js:506446-506819 fingerprint = getAllBrowserDataPathsPortable (0.976)
/**
 * 列出当前平台各浏览器的用户数据目录（linux 构建中平台常量折叠为 linux）。
 */
function getAllBrowserDataPathsPortable() {
  let home = homedir();
  let paths = [];
  for (let browserId of BROWSER_DETECTION_ORDER) {
    let config = CHROMIUM_BROWSERS[browserId];
    let dataPath;
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
            ? join(home, "AppData", "Roaming")
            : join(home, "AppData", "Local");
          paths.push({
            browser: browserId,
            path: join(appDataBase, ...config.windows.path),
          });
        }
        continue;
      }
    }
    if (dataPath && dataPath.length > 0)
      paths.push({
        browser: browserId,
        path: join(home, ...dataPath),
      });
  }
  return paths;
}
//@ chunk-s61vbvea.js:506819-507541 fingerprint = detectExtensionInstallationPortable (1)
/**
 * 在各浏览器的 Default/Profile N 目录下找扩展目录，返回 {isInstalled, browser}。
 */
async function detectExtensionInstallationPortable(browserPaths, log) {
  if (browserPaths.length === 0) {
    log?.("[Claude in Chrome] No browser paths to check");
    return {
      isInstalled: false,
      browser: null,
    };
  }
  let extensionIds = getExtensionIds();
  for (let { browser, path: browserBasePath } of browserPaths) {
    let browserProfileEntries = [];
    try {
      browserProfileEntries = await readdir(browserBasePath, {
        withFileTypes: true,
      });
    } catch (e) {
      if (isFsInaccessible(e)) continue;
      throw e;
    }
    let profileDirs = browserProfileEntries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => entry.name === "Default" || entry.name.startsWith("Profile "))
      .map((entry) => entry.name);
    if (profileDirs.length > 0)
      log?.(`[Claude in Chrome] Found ${browser} profiles: ${profileDirs.join(", ")}`);
    for (let profile of profileDirs)
      for (let extensionId of extensionIds) {
        let extensionPath = join(browserBasePath, profile, "Extensions", extensionId);
        try {
          await readdir(extensionPath);
          log?.(`[Claude in Chrome] Extension ${extensionId} found in ${browser} ${profile}`);
          return {
            isInstalled: true,
            browser,
          };
        } catch {}
      }
  }
  log?.("[Claude in Chrome] Extension not found in any browser");
  return {
    isInstalled: false,
    browser: null,
  };
}
export { detectExtensionInstallationPortable, getAllBrowserDataPathsPortable };
