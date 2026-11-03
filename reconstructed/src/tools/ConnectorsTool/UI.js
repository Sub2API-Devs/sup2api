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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-jrhqpnjr.js:4532-4677 placement
function renderToolResultMessage(o) {
  return e(MessageResponse, {
    children: e(Text, {
      children: o.opt_in_required
        ? o.message
        : `${o.connectors.length} ${plural(o.connectors.length, "connector")}`,
    }),
  });
}
