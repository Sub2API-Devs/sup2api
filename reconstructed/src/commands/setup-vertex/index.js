/**
 * commands/setup-vertex/index.ts
 *
 * 2.1.316 新增：/setup-vertex 命令对象：配置 Vertex AI
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { checkAllowedProvider } from "../../utils/model/allowedProviders.js";
import { env } from "../../utils/env.js";

/**
 * /setup-bedrock 命令对象（local-jsx）；描述：Reconfigure Amazon Bedrock authentication, region, or model pins；isEnabled: ()=>jae("bedrock")===void 0；isHidden: {return!i.CLAUDE_CODE_USE_BEDROCK}；实现 chunk-vt5kkj4e.js 的 d。
 */
//@ chunk-e6aww6q8.js:1734426-1734640 placement
var setupBedrockCommand = {
  type: "local-jsx",
  name: "setup-bedrock",
  description: "Reconfigure Amazon Bedrock authentication, region, or model pins",
  isEnabled: () => checkAllowedProvider("bedrock") === void 0,
  get isHidden() {
    return !env.CLAUDE_CODE_USE_BEDROCK;
  },
};
/**
 * /setup-vertex 命令对象（local-jsx）；描述：Reconfigure Google Vertex AI authentication, project, region, or model pins；isEnabled: ()=>jae("vertex")===void 0；isHidden: {return!i.CLAUDE_CODE_USE_VERTEX}；实现 chunk-8nayjra0.js 的 p。
 */
//@ chunk-e6aww6q8.js:1734640-1734862 placement
var setupVertexCommand = {
  type: "local-jsx",
  name: "setup-vertex",
  description: "Reconfigure Google Vertex AI authentication, project, region, or model pins",
  isEnabled: () => checkAllowedProvider("vertex") === void 0,
  get isHidden() {
    return !env.CLAUDE_CODE_USE_VERTEX;
  },
};

export { setupBedrockCommand, setupVertexCommand };
