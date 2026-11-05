/**
 * tools/ListConnectorsTool/UI.tsx
 *
 * ListConnectors 工具的结果渲染：按连接器数量或 opt-in 文案输出（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c3ck1mmp.js (1)
 * attribution: placement 1
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-c3ck1mmp.js:4868-5013 placement
/**
 * ListConnectors 工具的结果渲染：opt-in 必填时显示说明，否则显示连接器数量。
 */
function renderConnectorCount(notice) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: notice.opt_in_required
        ? notice.message
        : `${notice.connectors.length} ${plural(notice.connectors.length, "connector")}`,
    }),
  });
}
export { renderConnectorCount };
