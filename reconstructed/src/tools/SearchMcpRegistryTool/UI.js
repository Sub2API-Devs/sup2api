/**
 * tools/SearchMcpRegistryTool/UI.tsx
 *
 * 2.1.316 新增：SearchMcpRegistry 工具结果界面（连接器列表）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-24trdjma.js (1)
 * attribution: placement 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";

/**
 * 连接器搜索结果摘要（需要开启时显示消息）。
 */
//@ chunk-24trdjma.js:4532-4671 placement
function renderRegistryResult(r) {
  return e(MessageResponse, {
    children: e(Text, {
      children: r.opt_in_required
        ? r.message
        : `${r.results.length} ${plural(r.results.length, "connector")}`,
    }),
  });
}
