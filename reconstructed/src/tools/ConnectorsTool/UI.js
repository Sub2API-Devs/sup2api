/**
 * tools/ConnectorsTool/UI.tsx
 *
 * 2.1.316 新增：Connectors 工具结果渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jrhqpnjr.js (1)
 * attribution: placement 1
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-jrhqpnjr.js:4532-4677 placement
function renderToolResultMessage(result) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: result.opt_in_required
        ? result.message
        : `${result.connectors.length} ${plural(result.connectors.length, "connector")}`,
    }),
  });
}
export { renderToolResultMessage };
