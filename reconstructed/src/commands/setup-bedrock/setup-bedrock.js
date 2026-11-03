/**
 * commands/setup-bedrock/setup-bedrock.tsx
 *
 * 2.1.316 新增。/setup-bedrock 命令注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vt5kkj4e.js (1)
 * attribution: placement 1
 */
import { logEvent } from "../../services/analytics/index.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ProviderSetupWizard } from "../../components/ProviderSetupRestart.js";
import { CreateAgentWizard } from "../../components/agents/new-agent-creation/CreateAgentWizard.js";

/**
 * /setup-bedrock 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-vt5kkj4e.js:15259-15435 placement
async function setupBedrockCall(onDone, context) {
  return (
    logEvent("tengu_bedrock_setup_started", {}),
    e(ProviderSetupWizard, {
      Wizard: CreateAgentWizard,
      cancelledEvent: "tengu_bedrock_setup_cancelled",
      targetProvider: "bedrock",
      onDone: onDone,
      context: context,
    })
  );
}
