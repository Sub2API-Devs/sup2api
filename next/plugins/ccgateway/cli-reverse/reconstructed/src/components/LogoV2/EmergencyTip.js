/**
 * components/LogoV2/EmergencyTip.tsx
 *
 * 欢迎区"紧急提示"：读取 tengu-top-of-feed-tip 动态配置，按 taints/持久标记决定是否显示并记住已显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/EmergencyTip.tsx
 * pieces: chunk-hnxhr3bs.js (6)
 * attribution: fingerprint 3, layout 1, callgraph-witnessed 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useContext, useMemo, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";
import { useNoticeImpressionEnabled } from "./CondensedLogo.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { WARNING_GLYPH } from "../../constants/figures.js";
import { SlashIndentBox } from "./NoticeIndent.js";
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";

//@ chunk-hnxhr3bs.js:77395-77426 fingerprint (2.1.88 match: CONFIG_NAME, 1)
var CONFIG_NAME = "tengu-top-of-feed-tip";
//@ chunk-hnxhr3bs.js:77426-77903 fingerprint (2.1.88 match: EmergencyTip, 0.735)
function EmergencyTip() {
  let { storageV5 } = useTheme_2();
  let linkContexts = useContext(SlashLinkContexts);
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let tip = useMemo(getTipOfFeed, []);
  let lastShownTip = useMemo(
    () => shouldShowEmergencyTip(tip, noticeImpressionEnabled),
    [tip, noticeImpressionEnabled],
  );
  useEffect(() => {
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
  if (linkContexts)
    return jsxProd_default_2(Text, {
      color: tip.color === "error" ? "error" : "warning",
      children: [WARNING_GLYPH, " ", tip.tip],
    });
  return jsxProd_default(SlashIndentBox, {
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
//@ chunk-hnxhr3bs.js:77903-78006 layout
function shouldShowEmergencyTip(tip, noticeImpressionEnabled) {
  if (!isEmergencyTipShown(tip)) return false;
  if (tip.persistent) return true;
  return tip.tip !== getGlobalConfig().lastShownEmergencyTip;
}
//@ chunk-hnxhr3bs.js:78006-78034 fingerprint (2.1.88 match: DEFAULT_TIP, 1)
var DEFAULT_TIP = {
  tip: "",
  color: "dim",
};
//@ chunk-hnxhr3bs.js:78034-78065 callgraph-witnessed (2.1.88 match: getTipOfFeed, 0)
function getTipOfFeed() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(CONFIG_NAME, DEFAULT_TIP);
}
//@ chunk-hnxhr3bs.js:78065-78182 placement
function isEmergencyTipShown(tip) {
  if (!tip.tip) return false;
  if (!Array.isArray(tip.taints) || tip.taints.length === 0) return true;
  return tip.taints.some(hasComplianceTaint);
}
export { isEmergencyTipShown, getTipOfFeed, EmergencyTip };
