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
import { join, join as join_2 } from "path";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";

//@ chunk-vr8smdd9.js:10174-10741 fingerprint = getSystemDirectories (1)
function getSystemDirectories(options) {
  let r = options?.platform ?? getPlatform(),
    n = options?.homedir ?? homedir(),
    s = options?.env ?? process.env,
    defaults = {
      HOME: n,
      DESKTOP: join_2(n, "Desktop"),
      DOCUMENTS: join_2(n, "Documents"),
      DOWNLOADS: join_2(n, "Downloads"),
    };
  switch (r) {
    case "windows": {
      let f = s.USERPROFILE || n;
      return {
        HOME: n,
        DESKTOP: join_2(f, "Desktop"),
        DOCUMENTS: join_2(f, "Documents"),
        DOWNLOADS: join_2(f, "Downloads"),
      };
    }
    case "linux":
    case "wsl":
      return {
        HOME: n,
        DESKTOP: s.XDG_DESKTOP_DIR || defaults.DESKTOP,
        DOCUMENTS: s.XDG_DOCUMENTS_DIR || defaults.DOCUMENTS,
        DOWNLOADS: s.XDG_DOWNLOAD_DIR || defaults.DOWNLOADS,
      };
    case "macos":
    default: {
      if (r === "unknown") logForDebugging("Unknown platform detected, using default paths");
      return defaults;
    }
  }
}

export { getSystemDirectories };
