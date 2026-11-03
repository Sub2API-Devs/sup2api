/**
 * services/tips/tipHistory.ts
 *
 * 提示显示历史：根据全局配置 tipsHistory 与 numStartups 计算某提示距上次显示经过的启动次数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tips/tipHistory.ts
 * pieces: chunk-jv3bzw2x.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig } from "../../utils/config.js";

//@ chunk-jv3bzw2x.js:1564-1651 fingerprint = recordTipShown (1)
/**
 * 某提示距上次显示经过了多少次启动（numStartups 差值）；从未显示返回 Infinity。用于冷却判断。
 */
function getSessionsSinceTipShown(tipId) {
  let config = getGlobalConfig();
  let lastShown = config.tipsHistory?.[tipId];
  if (!lastShown) return 1 / 0;
  return config.numStartups - lastShown;
}
export { getSessionsSinceTipShown };
