/**
 * tools/SuggestConnectorsTool/UI.tsx
 *
 * SuggestConnectors 工具的结果渲染：与 ListConnectors 同形的连接器数量/opt-in 文案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-srde02wt.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-srde02wt.js:4868-5013 placement
/**
 * SuggestConnectors 工具的结果渲染：与 ListConnectors 同形。
 */
function connectorsNotice(props) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: props.opt_in_required
        ? props.message
        : `${props.connectors.length} ${plural(props.connectors.length, "connector")}`,
    }),
  });
}
export { connectorsNotice };
