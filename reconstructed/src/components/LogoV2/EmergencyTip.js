/**
 * components/LogoV2/EmergencyTip.tsx
 *
 * 欢迎区"紧急提示"：读取 tengu-top-of-feed-tip 动态配置，按 taints/持久标记决定是否显示并记住已显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/EmergencyTip.tsx
 * pieces: chunk-ag5x7vhf.js (6)
 * attribution: fingerprint 3, layout 1, callgraph-witnessed 1, placement 1
 */
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { Se, Q, P } from "../../../vendor/react/cjs/react.production.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";
import { useNoticeImpressionEnabled } from "./CondensedLogo.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { WARNING_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";

//@ chunk-ag5x7vhf.js:77875-77906 fingerprint = CONFIG_NAME (1)
var CONFIG_NAME = "tengu-top-of-feed-tip";
//@ chunk-ag5x7vhf.js:77906-78419 fingerprint = EmergencyTip (0.872)
function EmergencyTip() {
  let { storageV5 } = useTheme_2();
  let h = Se(SlashLinkContexts);
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let tip = Q(getTipOfFeed, []);
  let lastShownTip = Q(
    () => shouldShowEmergencyTip(tip, noticeImpressionEnabled),
    [tip, noticeImpressionEnabled],
  );
  P(() => {
    if (lastShownTip && !tip.persistent)
      saveGlobalConfig((current) => {
        if (current.lastShownEmergencyTip === tip.tip) return current;
        return {
          ...current,
          lastShownEmergencyTip: tip.tip,
        };
      }, storageV5);
  }, [lastShownTip, tip.tip, tip.persistent, storageV5]);
  if (!lastShownTip) return null;
  if (h)
    return jsxProd_default_2(Text, {
      color: tip.color === "error" ? "error" : "warning",
      children: [WARNING_GLYPH, " ", tip.tip],
    });
  return jsxProd_default(Box, {
    paddingLeft: 2,
    flexDirection: "column",
    children: jsxProd_default(Text, {
      ...(tip.color === "warning"
        ? {
            color: "warning",
          }
        : tip.color === "error"
          ? {
              color: "error",
            }
          : {
              dimColor: true,
            }),
      children: tip.tip,
    }),
  });
}
//@ chunk-ag5x7vhf.js:78419-78522 layout
function shouldShowEmergencyTip(m, noticeImpressionEnabled) {
  if (!isEmergencyTipShown(m)) return false;
  if (m.persistent) return true;
  return m.tip !== getGlobalConfig().lastShownEmergencyTip;
}
//@ chunk-ag5x7vhf.js:78522-78550 fingerprint = DEFAULT_TIP (1)
var DEFAULT_TIP = {
  tip: "",
  color: "dim",
};
//@ chunk-ag5x7vhf.js:78550-78581 callgraph-witnessed = getTipOfFeed (0)
function getTipOfFeed() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(CONFIG_NAME, DEFAULT_TIP);
}
//@ chunk-ag5x7vhf.js:78581-78698 placement
function isEmergencyTipShown(m) {
  if (!m.tip) return false;
  if (!Array.isArray(m.taints) || m.taints.length === 0) return true;
  return m.taints.some(hasComplianceTaint);
}
export { isEmergencyTipShown, getTipOfFeed, EmergencyTip };
