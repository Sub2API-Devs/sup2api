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
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
} from "fs/promises";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import { createReadStream, createReadStream as createReadStream_2 } from "fs";
import { ClaudeAiMarketplaceError } from "./claudeAiMarketplaces.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { Kqe, $kt } from "./commandSource.js";
import { pluginsScopeGate } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { B5r } from "../../services/plugins/accountSync/listPlugins.js";
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
function normalizeDownloadErrorCode(e) {
  if (/^http_\d{3}$/.test(e)) return `http_${e.charAt(5)}xx`;
  switch (e) {
    case "network":
    case "timeout":
    case "too_large":
    case "empty_body":
    case "no-auth":
    case "data-residency":
    case "essential-traffic-only":
      return e.replaceAll("-", "_");
    case "auth":
      return "http_4xx";
    default:
      return "not_served";
  }
}
/**
 * 从 claude.ai 下载插件压缩包，处理网络、超时、未登录与被拒。
 */
//@ chunk-e6aww6q8.js:693734-694768 placement
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
/**
 * 安装 claude.ai 列出的插件，不可安装或没有作用域时跳过。
 */
//@ chunk-e6aww6q8.js:694768-696060 placement
async function installClaudeAiPlugin(e, n, r, s) {
  return withFeatureTelemetry(
    "claudeai_plugin_install",
    async () => {
      if (!e.installable)
        throw new ClaudeAiPluginInstallError(
          "This plugin is listed on claude.ai but cannot be installed (no published version, or its content scan blocks it).",
          "not_installable",
        );
      let h = `${r}${Kqe}`,
        y = join_10(h, "archive.zip"),
        S = join_10(h, "tree");
      try {
        if ((await mkdir_5(h, { recursive: !0 }), (await pluginsScopeGate(void 0, s)) === "skip_no_scope"))
          throw new ClaudeAiPluginInstallError(
            "The plugin archive wasn't downloaded: this claude.ai login doesn't have plugin access yet. Access is usually added automatically within a few hours. Try again later.",
            "no_plugins_scope",
          );
        let L = await B5r(e.pluginId, y, e.version, { isBackground: !1, credentials: s });
        if (!L.ok) {
          let Z = normalizeDownloadErrorCode(L.reason);
          throw new ClaudeAiPluginInstallError(downloadClaudeAiPluginArchive(Z), Z);
        }
        let G = await sha256File(y),
          q;
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
        if (!(await $kt(q.root)))
          throw new ClaudeAiPluginInstallError(
            "The plugin archive from claude.ai has no plugin content at its root. It was not installed.",
            "no_plugin_content",
          );
        return (await getFsImplementation().mkdir(dirname_6(n)), await retryFsOp(q.root, n), G);
      } finally {
        await rm_4(h, { recursive: !0, force: !0 }).catch(() => {});
      }
    },
    (h) => (h instanceof ClaudeAiPluginInstallError ? h.code : "unexpected"),
  );
}
//@ chunk-e6aww6q8.js:696060-696163 placement
async function sha256File(e) {
  let n = createHash_5("sha256");
  for await (let r of createReadStream_2(e)) n.update(r);
  return n.digest("hex");
}

export { installClaudeAiPlugin };
