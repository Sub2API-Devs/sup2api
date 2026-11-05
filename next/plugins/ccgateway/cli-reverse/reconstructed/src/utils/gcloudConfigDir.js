/**
 * utils/gcloudConfigDir.ts
 *
 * 2.1.316 新增：gcloud 配置目录定位（Windows/类 Unix）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jhww4y1p.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { homedir } from "os";
import { getPlatform } from "./platform.js";
import { env } from "./env.js";

//@ chunk-jhww4y1p.js:318-425 placement
/**
 * 返回 gcloud 配置目录：Windows 为 %APPDATA%\gcloud，其他为 ~/.config/gcloud。
 */
function getGcloudConfigDir() {
  if (getPlatform() === "windows" && env.APPDATA) return join(env.APPDATA, "gcloud");
  return join(homedir(), ".config", "gcloud");
}
//@ chunk-jhww4y1p.js:425-472 placement
/**
 * 解析 gcloud 配置目录：CLOUDSDK_CONFIG 优先，否则按平台默认。
 */
function resolveGcloudConfigDir() {
  return env.CLOUDSDK_CONFIG || getGcloudConfigDir();
}
export { resolveGcloudConfigDir, getGcloudConfigDir };
