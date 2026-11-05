/**
 * utils/plugins/claudeAiPluginInstall.ts
 *
 * 2.1.316 新增：claude.ai 插件安装
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 */
import { join, dirname } from "path";
import { mkdir, rm } from "fs/promises";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { ClaudeAiMarketplaceError } from "./claudeAiMarketplaces.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { TEMP_CACHE_LINK_SUFFIX, pluginRootHasMarker } from "./commandSource.js";
import { pluginsScopeGate } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { downloadWithRetry } from "../../services/plugins/accountSync/listPlugins.js";
import { unzipPluginCache } from "./zipCache.js";
import { getFsImplementation } from "../fsOperations.js";
import { retryFsOp } from "../atomicPublishWrite.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:703792-703914 placement
let ClaudeAiPluginInstallError; // deferred: uses ClaudeAiMarketplaceError (./claudeAiMarketplaces.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:703792", () => {
  ClaudeAiPluginInstallError = class ClaudeAiPluginInstallError extends ClaudeAiMarketplaceError {
    constructor(message, code) {
      super(message, code, "claude.ai plugin install failed");
      this.name = "ClaudeAiPluginInstallError";
    }
  };
});
//@ chunk-5xgkngpb.js:703914-704206 placement
function normalizeDownloadErrorCode(reason) {
  if (/^http_\d{3}$/.test(reason)) return `http_${reason.charAt(5)}xx`;
  switch (reason) {
    case "network":
    case "timeout":
    case "too_large":
    case "empty_body":
    case "no-auth":
    case "data-residency":
    case "essential-traffic-only":
      return reason.replaceAll("-", "_");
    case "auth":
      return "http_4xx";
    default:
      return "not_served";
  }
}
//@ chunk-5xgkngpb.js:704206-705240 placement
/**
 * 从 claude.ai 下载插件压缩包，处理网络、超时、未登录与被拒。
 */
function downloadClaudeAiPluginArchive(reason) {
  switch (reason) {
    case "network":
    case "timeout":
    case "empty_body":
      return "The plugin archive could not be downloaded from claude.ai. Check your connection, then try again.";
    case "no_auth":
    case "http_4xx":
      return "claude.ai refused the plugin archive download. Sign in again (/login), then try again; if it keeps failing, the plugin may no longer be available to your account.";
    case "http_5xx":
      return "claude.ai could not serve the plugin archive right now (server error). Try again later.";
    case "too_large":
      return "The plugin archive on claude.ai is larger than the download limit. It was not installed.";
    case "essential_traffic_only":
      return "The plugin archive was not downloaded: non-essential network traffic is disabled in this environment (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).";
    case "data_residency":
      return "The plugin archive was not downloaded: claude.ai downloads are not available with the current API provider.";
    default:
      return "claude.ai did not serve an archive for this plugin. It may not be downloadable for your account.";
  }
}
//@ chunk-5xgkngpb.js:705240-706535 placement
/**
 * 安装 claude.ai 列出的插件，不可安装或没有作用域时跳过。
 */
async function installClaudeAiPlugin(source, cachePath, tempPath, credentials) {
  return withFeatureTelemetry(
    "claudeai_plugin_install",
    async () => {
      if (!source.installable)
        throw new ClaudeAiPluginInstallError(
          "This plugin is listed on claude.ai but cannot be installed (no published version, or its content scan blocks it).",
          "not_installable",
        );
      let tempDir = `${tempPath}${TEMP_CACHE_LINK_SUFFIX}`;
      let archivePath = join(tempDir, "archive.zip");
      let treePath = join(tempDir, "tree");
      try {
        await mkdir(tempDir, {
          recursive: true,
        });
        if ((await pluginsScopeGate(undefined, credentials)) === "skip_no_scope")
          throw new ClaudeAiPluginInstallError(
            "The plugin archive wasn't downloaded: this claude.ai login doesn't have plugin access yet. Access is usually added automatically within a few hours. Try again later.",
            "no_plugins_scope",
          );
        let downloadResult = await downloadWithRetry(source.pluginId, archivePath, source.version, {
          isBackground: false,
          credentials,
        });
        if (!downloadResult.ok) {
          let reason = normalizeDownloadErrorCode(downloadResult.reason);
          throw new ClaudeAiPluginInstallError(downloadClaudeAiPluginArchive(reason), reason);
        }
        let sha256 = await sha256File(archivePath);
        let extracted;
        try {
          extracted = await unzipPluginCache(archivePath, treePath);
        } catch {
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai was refused: it is not a safe, well-formed zip.",
            "extract_refused",
          );
        }
        if (!extracted.ok)
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai was refused: it carries a git repository layout.",
            "extract_refused",
          );
        if (!(await pluginRootHasMarker(extracted.root)))
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai has no plugin content at its root. It was not installed.",
            "no_plugin_content",
          );
        await getFsImplementation().mkdir(dirname(cachePath));
        await retryFsOp(extracted.root, cachePath);
        return sha256;
      } finally {
        await rm(tempDir, {
          recursive: true,
          force: true,
        }).catch(() => {});
      }
    },
    (failure) => (failure instanceof ClaudeAiPluginInstallError ? failure.code : "unexpected"),
  );
}
//@ chunk-5xgkngpb.js:706535-706638 placement
async function sha256File(filePath) {
  let hash = createHash("sha256");
  for await (let chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}
export { installClaudeAiPlugin };
