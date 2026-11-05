/**
 * commands/setup-vertex/index.ts
 *
 * /setup-vertex 命令的 local-jsx 注册对象，Vertex 设置未完成时才可用（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { checkAllowedProvider } from "../../utils/model/allowedProviders.js";
import { env } from "../../utils/env.js";

//@ chunk-5xgkngpb.js:1810092-1810314 placement
var setupVertexCommand = {
  type: "local-jsx",
  name: "setup-vertex",
  description: "Reconfigure Google Vertex AI authentication, project, region, or model pins",
  isEnabled: () => checkAllowedProvider("vertex") === undefined,
  get isHidden() {
    return !env.CLAUDE_CODE_USE_VERTEX;
  },
};
export { setupVertexCommand };
