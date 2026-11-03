/**
 * tools/SuggestConnectorsTool/UI.tsx
 *
 * 2.1.316 新增：SuggestConnectors 工具结果界面。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xw402a7j.js (1)
 * attribution: placement 1
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-xw402a7j.js:4532-4677 placement
/**
 * 连接器建议结果。
 */
function renderSuggestConnectorsResult(o) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: o.opt_in_required
        ? o.message
        : `${o.connectors.length} ${plural(o.connectors.length, "connector")}`,
    }),
  });
}
