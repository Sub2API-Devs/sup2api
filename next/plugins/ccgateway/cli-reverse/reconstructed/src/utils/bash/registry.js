/**
 * utils/bash/registry.ts
 *
 * 按命令名动态加载 @withfig/autocomplete 的命令 spec。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/registry.ts
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { pyrightSpec } from "./specs/pyright.js";
import { timeoutSpec_2 } from "./specs/timeout.js";
import { sleepSpec_2 } from "./specs/sleep.js";
import { aliasSpec_2 } from "./specs/alias.js";
import { nohupSpec_2 } from "./specs/nohup.js";
import { timeSpec_2 } from "./specs/time.js";
import { srunSpec_2 } from "./specs/srun.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  isRunningFromTsSource,
  alwaysTrue as alwaysTrue_2,
  isStandaloneExecutable,
} from "../slowOperations.js";
import { memoizeWithLRU } from "../memoize.js";

//@ chunk-5xgkngpb.js:3124569-3124607 placement
/**
 * 内置 fig 补全 spec 列表（alias/nohup/sleep/srun/time/timeout/pyright）。
 */
var FIG_SPEC_REGISTRY = [
  pyrightSpec,
  timeoutSpec_2,
  sleepSpec_2,
  aliasSpec_2,
  nohupSpec_2,
  timeSpec_2,
  srunSpec_2,
];
//@ chunk-5xgkngpb.js:3124607-3124940 fingerprint (2.1.88 match: loadFigSpec, 0.773)
/**
 * 按命令名动态导入 @withfig/autocomplete/build/<cmd>.js 作为 spec；拒绝含路径分隔符、..、以 - 开头的名字；GrowthBook tengu_keen_anchor 决定使用哪个可用性判断。
 */
async function loadFigSpec(command) {
  if (!command || command.includes("/") || command.includes("\\")) return null;
  if (command.includes("..")) return null;
  if (command.startsWith("-") && command !== "-") return null;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_anchor", true)) {
    if (!isRunningFromTsSource()) return null;
  } else if (alwaysTrue_2() && isStandaloneExecutable()) return null;
  try {
    let figSpecModule = await import(`@withfig/autocomplete/build/${command}.js`);
    return figSpecModule.default || figSpecModule;
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:3124940-3125070 placement
/**
 * 按命令名获取 Fig 自动补全 spec（内置优先，否则按需加载，LRU 缓存）。
 */
class FigSpecRegistry {
  specForCommand = memoizeWithLRU(
    async (command) =>
      FIG_SPEC_REGISTRY.find((entry) => entry.name === command) || (await loadFigSpec(command)) || null,
    (command) => command,
  );
  get(command) {
    return this.specForCommand(command);
  }
}
export { FigSpecRegistry };
