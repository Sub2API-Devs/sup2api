/**
 * tools/SearchMcpRegistryTool/UI.tsx
 *
 * 2.1.316 新增：SearchMcpRegistry 工具结果界面（连接器列表）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-47w2t6yr.js (1)
 * attribution: placement 1
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-47w2t6yr.js:4868-5007 placement
/**
 * 连接器搜索结果摘要（需要开启时显示消息）。
 */
function renderRegistryResult(result) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: result.opt_in_required
        ? result.message
        : `${result.results.length} ${plural(result.results.length, "connector")}`,
    }),
  });
}
export { renderRegistryResult };
