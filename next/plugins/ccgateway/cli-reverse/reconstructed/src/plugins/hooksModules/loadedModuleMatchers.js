/**
 * plugins/hooksModules/loadedModuleMatchers.ts
 *
 * 按已加载模块的 matcher 取 hook 判定（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cjaaaha5.js (1)
 * attribution: placement 1
 */
import {
  matchesAllFields,
  matchesRegExpMatcher,
  matchesLiteralMatcher,
} from "../../utils/hooks/functionHookMatchers.js";
import { hasLink } from "../../utils/hasLink.js";

//@ chunk-cjaaaha5.js:381-449 placement
/**
 * 用已加载模块的 matcher 判定某个 hook 事件是否命中该模块。
 */
function matchWithPathTable(matcher, input, pathTable, pathTable_2) {
  return matchesAllFields(
    matcher.matcherFor(input),
    pathTable,
    pathTable_2,
    hasLink(matcher) ? matchesRegExpMatcher : matchesLiteralMatcher,
  );
}
export { matchWithPathTable };
