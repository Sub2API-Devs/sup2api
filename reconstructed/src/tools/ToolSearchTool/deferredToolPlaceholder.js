/**
 * tools/ToolSearchTool/deferredToolPlaceholder.ts
 *
 * 2.1.316 新增：延迟加载工具的占位
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { isToolSearchDisabledByBetas } from "../../utils/toolSearchChrome.js";
import { getDeferredToolStubGateLatch, setDeferredToolStubGateLatch } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DEFERREDTOOLPLACEHOLDER, DEFERRED_PLACEHOLDER_NOTE } from "./prompt.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:2533388-2533632 placement
/**
 * DeferredToolPlaceholder 定义：工具搜索未被 beta 关闭、GrowthBook tengu_deferred_stub_tool（默认 true）时返回 {name, description:"Reserved placeholder…never call this tool.", input_schema:{}, defer_loading:true}，保证请求里至少有一个 defer_loading 工具。
 */
function getDeferredToolPlaceholderSchema() {
  try {
    if (isToolSearchDisabledByBetas()) return null;
    let deferredToolStubGateLatch = getDeferredToolStubGateLatch();
    if (deferredToolStubGateLatch === null) {
      deferredToolStubGateLatch = getFeatureValue_CACHED_MAY_BE_STALE("tengu_deferred_stub_tool", true);
      setDeferredToolStubGateLatch(deferredToolStubGateLatch);
    }
    if (!deferredToolStubGateLatch) return null;
    return {
      name: DEFERREDTOOLPLACEHOLDER,
      description: DEFERRED_PLACEHOLDER_NOTE,
      input_schema: {
        type: "object",
        properties: {},
      },
      defer_loading: true,
    };
  } catch (error) {
    logError(error);
    return null;
  }
}
export { getDeferredToolPlaceholderSchema };
