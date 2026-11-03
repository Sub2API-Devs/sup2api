/**
 * utils/plugins/claudeAiPluginInstall.ts
 *
 * 2.1.316 新增：claude.ai 插件安装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { join, dirname } from "path";
import { mkdir, rm as rm_2 } from "fs/promises";
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

//@ chunk-e6aww6q8.js:693320-693442 placement
class ClaudeAiPluginInstallError extends ClaudeAiMarketplaceError {
  constructor(e, n) {
    super(e, n, "claude.ai plugin install failed");
    this.name = "ClaudeAiPluginInstallError";
  }
}
//@ chunk-e6aww6q8.js:693442-693734 placement
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
//@ chunk-e6aww6q8.js:693734-694768 placement
/**
 * 从 claude.ai 下载插件压缩包，处理网络、超时、未登录与被拒。
 */
function downloadClaudeAiPluginArchive(e) {
  switch (e) {
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
//@ chunk-e6aww6q8.js:694768-696060 placement
/**
 * 安装 claude.ai 列出的插件，不可安装或没有作用域时跳过。
 */
async function installClaudeAiPlugin(source, n, tempPath, credentials) {
  return withFeatureTelemetry(
    "claudeai_plugin_install",
    async () => {
      if (!source.installable)
        throw new ClaudeAiPluginInstallError(
          "This plugin is listed on claude.ai but cannot be installed (no published version, or its content scan blocks it).",
          "not_installable",
        );
      let h = `${tempPath}${TEMP_CACHE_LINK_SUFFIX}`;
      let y = join(h, "archive.zip");
      let S = join(h, "tree");
      try {
        await mkdir(h, {
          recursive: true,
        });
        if ((await pluginsScopeGate(undefined, credentials)) === "skip_no_scope")
          throw new ClaudeAiPluginInstallError(
            "The plugin archive wasn't downloaded: this claude.ai login doesn't have plugin access yet. Access is usually added automatically within a few hours. Try again later.",
            "no_plugins_scope",
          );
        let L = await downloadWithRetry(source.pluginId, y, source.version, {
          isBackground: false,
          credentials,
        });
        if (!L.ok) {
          let Z = normalizeDownloadErrorCode(L.reason);
          throw new ClaudeAiPluginInstallError(downloadClaudeAiPluginArchive(Z), Z);
        }
        let G = await sha256File(y);
        let q;
        try {
          q = await unzipPluginCache(y, S);
        } catch {
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai was refused: it is not a safe, well-formed zip.",
            "extract_refused",
          );
        }
        if (!q.ok)
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai was refused: it carries a git repository layout.",
            "extract_refused",
          );
        if (!(await pluginRootHasMarker(q.root)))
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai has no plugin content at its root. It was not installed.",
            "no_plugin_content",
          );
        await getFsImplementation().mkdir(dirname(n));
        await retryFsOp(q.root, n);
        return G;
      } finally {
        await rm_2(h, {
          recursive: true,
          force: true,
        }).catch(() => {});
      }
    },
    (h) => (h instanceof ClaudeAiPluginInstallError ? h.code : "unexpected"),
  );
}
//@ chunk-e6aww6q8.js:696060-696163 placement
async function sha256File(e) {
  let hash = createHash("sha256");
  for await (let r of createReadStream(e)) hash.update(r);
  return hash.digest("hex");
}
export { installClaudeAiPlugin };
