/**
 * utils/gcloudConfigDir.ts
 *
 * 2.1.316 新增：gcloud 配置目录定位（Windows/类 Unix）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pmkwtd1h.js (2)
 * attribution: placement 2
 */
import { join } from "path";
import { homedir } from "os";
import { getPlatform } from "./platform.js";
import { env } from "./env.js";

/**
 * 返回 gcloud 配置目录：Windows 为 %APPDATA%\gcloud，其他为 ~/.config/gcloud。
 */
//@ chunk-pmkwtd1h.js:318-425 placement
function getGcloudConfigDir() {
  if (getPlatform() === "windows" && env.APPDATA) return join(env.APPDATA, "gcloud");
  return join(homedir(), ".config", "gcloud");
}
//@ chunk-pmkwtd1h.js:425-472 placement
function PVn() {
  return env.CLOUDSDK_CONFIG || getGcloudConfigDir();
}

export { PVn, getGcloudConfigDir };
