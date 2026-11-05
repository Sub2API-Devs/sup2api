/**
 * commands/setup-bedrock/setup-bedrock.tsx
 *
 * 2.1.316 新增。/setup-bedrock 命令注册。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h4jt6yrf.js (1)
 * attribution: placement 1
 */
import { logEvent } from "../../services/analytics/index.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ProviderSetupWizard } from "../../components/ProviderSetupRestart.js";
import { CreateAgentWizard } from "../../components/agents/new-agent-creation/CreateAgentWizard.js";

//@ chunk-h4jt6yrf.js:16435-16611 placement
/**
 * /setup-bedrock 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function setupBedrockCall(onDone, context) {
  logEvent("tengu_bedrock_setup_started", {});
  return jsxProd_default(ProviderSetupWizard, {
    Wizard: CreateAgentWizard,
    cancelledEvent: "tengu_bedrock_setup_cancelled",
    targetProvider: "bedrock",
    onDone,
    context,
  });
}
export { setupBedrockCall };
