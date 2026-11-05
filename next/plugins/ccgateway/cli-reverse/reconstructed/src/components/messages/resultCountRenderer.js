/**
 * components/messages/resultCountRenderer.tsx
 *
 * 2.1.316 新增。工具结果计数渲染。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gbtbc9st.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-gbtbc9st.js:4870-4982 placement
function createResultCountRenderer(noun) {
  return function (result) {
    let count = result.results.length;
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        children: [count, " ", plural(count, noun)],
      }),
    });
  };
}
export { createResultCountRenderer };
