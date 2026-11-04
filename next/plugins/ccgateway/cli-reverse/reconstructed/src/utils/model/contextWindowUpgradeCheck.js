/**
 * utils/model/contextWindowUpgradeCheck.ts
 *
 * 当前模型可升级到 1M 上下文变体时给出提示（/model opus[1m] 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/contextWindowUpgradeCheck.ts
 * pieces: chunk-z21je308.js (2)
 * attribution: fingerprint 2
 */
import { getUserSpecifiedModelSetting } from "./smallFastModel.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "./thirdPartyModelDefaults.js";
import { modelHasNative1MContext } from "./contextWindow1m.js";
import { getDefaultOpusModel, getDefaultSonnetModel } from "./model.js";

//@ chunk-z21je308.js:242-457 fingerprint = getAvailableUpgrade (1)
/**
 * 当前设置为 opus/sonnet、1M 可用且未在用 1M 时返回 {alias:"opus[1m]" 或 "sonnet[1m]", name, multiplier:5}。
 */
function getAvailableUpgrade() {
  let currentModelSetting = getUserSpecifiedModelSetting();
  if (
    currentModelSetting === "opus" &&
    shouldProbeThirdPartyDefaults() &&
    !modelHasNative1MContext(getDefaultOpusModel())
  )
    return {
      alias: "opus[1m]",
      name: "Opus 1M",
      multiplier: 5,
    };
  else if (
    currentModelSetting === "sonnet" &&
    shouldProbeThirdPartyDefaultsAlt() &&
    !modelHasNative1MContext(getDefaultSonnetModel())
  )
    return {
      alias: "sonnet[1m]",
      name: "Sonnet 1M",
      multiplier: 5,
    };
  return null;
}
//@ chunk-z21je308.js:457-659 fingerprint = getUpgradeMessage (1)
/**
 * warning 场景返回 "/model <alias>"，tip 场景返回 "Tip: You have access to … with 5x more context"。
 */
function getUpgradeMessage(context) {
  let upgrade = getAvailableUpgrade();
  if (!upgrade) return null;
  switch (context) {
    case "warning":
      return `/model ${upgrade.alias}`;
    case "tip":
      return `Tip: You have access to ${upgrade.name} with ${upgrade.multiplier}x more context`;
    default:
      return null;
  }
}
export { getUpgradeMessage };
