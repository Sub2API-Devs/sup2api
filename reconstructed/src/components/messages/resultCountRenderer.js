/**
 * components/messages/resultCountRenderer.tsx
 *
 * 2.1.316 新增。工具结果计数渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-scv4whf4.js (1)
 * attribution: placement 1
 */
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-scv4whf4.js:4534-4646 placement
function createResultCountRenderer(o) {
  return function (s) {
    let t = s.results.length;
    return e(MessageResponse, { children: r(Text, { children: [t, " ", plural(t, o)] }) });
  };
}
