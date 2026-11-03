/**
 * tools/ListMcpResourcesTool/UI.tsx
 *
 * 按键查固定摘要的一行结果渲染器生成函数（computerUse 复用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ListMcpResourcesTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (2)
 * attribution: placement 2
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { HintText } from "../../components/design-system/HintText.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { OutputLine } from "../../components/shell/OutputLine.js";

//@ chunk-ah34pb7m.js:31204-31379 placement
/**
 * 渲染 MCP 资源列表结果：为空时显示"(No resources found)"，否则输出 JSON。（误归 MonitorTool/UI）
 */
function renderMcpResourceListResult(m, d, { verbose }) {
  if (!m || m.length === 0)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(HintText, {
        children: "(No resources found)",
      }),
    });
  let content = jsonStringify(m, null, 2);
  return jsxProd_default(OutputLine, {
    content,
    verbose,
  });
}
//@ chunk-ah34pb7m.js:32406-32641 placement
function renderMcpResourceDirResult(m, d, { verbose }) {
  if (m?.error)
    return jsxProd_default(OutputLine, {
      content: m.error,
      verbose,
    });
  if (!m || m.resources.length === 0)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(HintText, {
        children: "(Empty directory)",
      }),
    });
  let content = jsonStringify(m, null, 2);
  return jsxProd_default(OutputLine, {
    content,
    verbose,
  });
}
export { renderMcpResourceListResult, renderMcpResourceDirResult };
