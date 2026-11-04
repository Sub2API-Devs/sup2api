/**
 * utils/systemDirectories.ts
 *
 * 用户系统目录（Desktop/Documents/Downloads 等）按平台的路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/systemDirectories.ts
 * pieces: chunk-vr8smdd9.js (1)
 * attribution: fingerprint 1
 */
import { homedir } from "os";
import { join } from "path";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";

//@ chunk-vr8smdd9.js:10174-10741 fingerprint (2.1.88 match: getSystemDirectories, 1)
function getSystemDirectories(options) {
  let platform = options?.platform ?? getPlatform();
  let homeDir = options?.homedir ?? homedir();
  let env = options?.env ?? process.env;
  let defaults = {
    HOME: homeDir,
    DESKTOP: join(homeDir, "Desktop"),
    DOCUMENTS: join(homeDir, "Documents"),
    DOWNLOADS: join(homeDir, "Downloads"),
  };
  switch (platform) {
    case "windows": {
      let userProfile = env.USERPROFILE || homeDir;
      return {
        HOME: homeDir,
        DESKTOP: join(userProfile, "Desktop"),
        DOCUMENTS: join(userProfile, "Documents"),
        DOWNLOADS: join(userProfile, "Downloads"),
      };
    }
    case "linux":
    case "wsl":
      return {
        HOME: homeDir,
        DESKTOP: env.XDG_DESKTOP_DIR || defaults.DESKTOP,
        DOCUMENTS: env.XDG_DOCUMENTS_DIR || defaults.DOCUMENTS,
        DOWNLOADS: env.XDG_DOWNLOAD_DIR || defaults.DOWNLOADS,
      };
    case "macos":
    default: {
      if (platform === "unknown") logForDebugging("Unknown platform detected, using default paths");
      return defaults;
    }
  }
}
export { getSystemDirectories };
