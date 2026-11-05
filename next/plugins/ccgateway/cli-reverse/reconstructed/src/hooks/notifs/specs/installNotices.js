/**
 * hooks/notifs/specs/installNotices.ts
 *
 * 2.1.316 新增。启动通知：安装类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 4
 */
import { logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { isEnvTruthy } from "../../../utils/envUtils.js";
import { readUpdateResult } from "../../../utils/nativeInstaller/updateResult.js";
import {
  oauthExpiryWarningNoticeSpec,
  reservedSkillNamesNoticeSpec,
  namesNotShownNoticeSpec,
} from "./configNotices.js";
import { subagentConfigWarningNoticeSpec } from "./subagentConfigWarning.js";
import { getMarketplacePluginTipToShow, recordShownTip } from "../../../services/tips/tipScheduler.js";
import { getIsRemoteMode } from "../../../bootstrap/state.js";
import { checkInstall } from "../../../utils/nativeInstaller/installer.js";
import { logForDebugging } from "../../../utils/debug.js";
import { logSetupIssues } from "../../../utils/notifications/setupIssues.js";
import { logError } from "../../../utils/log.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1796908-1797375 placement
var NO_PERMISSIONS = "no_permissions";
var sudoNpmInstallNoticeSpec = {
  id: "sudo-npm-install",
  maxImpressions: 1,
  onShown: () => logFeatureOk("sudo_npm_install_notice"),
  compute: async (ctx) => {
    if (isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) return null;
    let updateResult = await readUpdateResult(ctx?.storageV5);
    if (
      updateResult?.path !== "npm-global" ||
      updateResult.outcome !== "failed" ||
      updateResult.status !== NO_PERMISSIONS
    )
      return null;
    return {
      key: "sudo-npm-install",
      segments: [
        {
          text: "Claude Code can't auto-update",
          color: "warning",
        },
        {
          text: " \xB7 run `claude doctor`",
          dim: true,
        },
      ],
      priority: "high",
      timeoutMs: 15000,
    };
  },
};
//@ chunk-czq1j3j2.js:1797375-1798065 placement
/**
 * 安装相关启动通知规格的列表（本构建中多个规格为 null），含 OAuth 过期警告、署名提示、子代理配置警告与市场插件推荐等。
 */
var INSTALL_NOTICE_SPEC_A; // deferred: loads other modules while loading; runs once its import cycle is complete
var INSTALL_NOTICE_SPEC_B;
var INSTALL_NOTICE_SPEC_C;
var INSTALL_NOTICE_SPEC_D;
var INSTALL_NOTICE_SPEC_E;
var INSTALL_NOTICE_SPEC_F;
var INSTALL_NOTICE_SPEC_G;
var attributionProjectNoticeSpec;
var COMPUTED_NOTICE_SPECS;
deferInit("chunk-czq1j3j2.js:1797375", () => {
  INSTALL_NOTICE_SPEC_A = null;
  INSTALL_NOTICE_SPEC_B = null;
  INSTALL_NOTICE_SPEC_C = null;
  INSTALL_NOTICE_SPEC_D = null;
  INSTALL_NOTICE_SPEC_E = null;
  INSTALL_NOTICE_SPEC_F = null;
  INSTALL_NOTICE_SPEC_G = null;
  attributionProjectNoticeSpec =
    require("../../../utils/status/attributionProjectNoticeSpec.lazy.js").attributionProjectNoticeSpec;
  COMPUTED_NOTICE_SPECS = [
    ...(INSTALL_NOTICE_SPEC_A ? [INSTALL_NOTICE_SPEC_A] : []),
    ...(INSTALL_NOTICE_SPEC_B ? [INSTALL_NOTICE_SPEC_B] : []),
    ...(INSTALL_NOTICE_SPEC_C ? [INSTALL_NOTICE_SPEC_C] : []),
    ...(INSTALL_NOTICE_SPEC_D ? [INSTALL_NOTICE_SPEC_D] : []),
    ...(INSTALL_NOTICE_SPEC_F ? [INSTALL_NOTICE_SPEC_F] : []),
    ...(INSTALL_NOTICE_SPEC_G ? [INSTALL_NOTICE_SPEC_G] : []),
    ...(INSTALL_NOTICE_SPEC_E ? [INSTALL_NOTICE_SPEC_E] : []),
    oauthExpiryWarningNoticeSpec,
    ...(attributionProjectNoticeSpec ? [attributionProjectNoticeSpec] : []),
    sudoNpmInstallNoticeSpec,
    reservedSkillNamesNoticeSpec,
    namesNotShownNoticeSpec,
    subagentConfigWarningNoticeSpec,
    {
      id: "marketplace-plugin-suggestion",
      compute: async (ctx) => {
        if (!ctx) return null;
        let marketplacePluginTipToShow = await getMarketplacePluginTipToShow({
          session: ctx.session,
          theme: "dark",
          storageV5: ctx.storageV5,
          credentials: ctx.credentials,
        });
        let pluginId = marketplacePluginTipToShow?.pluginId;
        if (!marketplacePluginTipToShow || !pluginId) return null;
        recordShownTip(marketplacePluginTipToShow, "startup", ctx.storageV5);
        return {
          key: "marketplace-plugin-suggestion",
          kind: "upsell",
          segments: [
            {
              text: `plugin suggestion: ${pluginId}`,
              color: "suggestion",
            },
            {
              text: " \xB7 /plugin",
              dim: true,
            },
          ],
          priority: "low",
        };
      },
    },
  ];
});
//@ chunk-czq1j3j2.js:1809796-1809840 placement
var installIssuesNoticeSpec = {
  id: "install-issues",
  setup: () => runInstallCheck,
};
//@ chunk-czq1j3j2.js:1809840-1810038 placement
function runInstallCheck() {
  if (getIsRemoteMode()) return;
  checkInstall()
    .then((status) => {
      let missingCount = 0;
      for (let entry of status)
        if (entry.type === "path") missingCount++;
        else
          logForDebugging(`install check: ${entry.message}`, {
            level: entry.type === "error" ? "error" : "info",
          });
      logSetupIssues("install", missingCount);
    })
    .catch(logError);
}
export { COMPUTED_NOTICE_SPECS, installIssuesNoticeSpec };
