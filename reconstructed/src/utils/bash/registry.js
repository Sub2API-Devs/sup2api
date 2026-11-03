/**
 * utils/bash/registry.ts
 *
 * 按命令名动态加载 @withfig/autocomplete 的命令 spec。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/registry.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { pyrightSpec } from "./specs/pyright.js";
import { qbn } from "./specs/timeout.js";
import { Ubn } from "./specs/sleep.js";
import { Fbn } from "./specs/alias.js";
import { Hbn } from "./specs/nohup.js";
import { zbn } from "./specs/time.js";
import { jbn } from "./specs/srun.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  isRunningFromTsSource,
  alwaysTrue as alwaysTrue_2,
  isStandaloneExecutable,
} from "../slowOperations.js";
import { memoizeWithLRU } from "../memoize.js";

//@ chunk-e6aww6q8.js:3040478-3040516 placement
var Qbn = [pyrightSpec, qbn, Ubn, Fbn, Hbn, zbn, jbn];
/**
 * 按命令名动态导入 @withfig/autocomplete/build/<cmd>.js 作为 spec；拒绝含路径分隔符、..、以 - 开头的名字；GrowthBook tengu_keen_anchor 决定使用哪个可用性判断。
 */
//@ chunk-e6aww6q8.js:3040516-3040849 fingerprint = loadFigSpec (0.774)
async function loadFigSpec(command) {
  if (!command || command.includes("/") || command.includes("\\")) return null;
  if (command.includes("..")) return null;
  if (command.startsWith("-") && command !== "-") return null;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_anchor", !0)) {
    if (!isRunningFromTsSource()) return null;
  } else if (alwaysTrue_2() && isStandaloneExecutable()) return null;
  try {
    let r = await import(`@withfig/autocomplete/build/${command}.js`);
    return r.default || r;
  } catch {
    return null;
  }
}
/**
 * 按命令名获取 Fig 自动补全 spec（内置优先，否则按需加载，LRU 缓存）。
 */
//@ chunk-e6aww6q8.js:3040849-3040979 placement
class FigSpecRegistry {
  specForCommand = memoizeWithLRU(
    async (e) => Qbn.find((r) => r.name === e) || (await loadFigSpec(e)) || null,
    (e) => e,
  );
  get(e) {
    return this.specForCommand(e);
  }
}

export { FigSpecRegistry };
