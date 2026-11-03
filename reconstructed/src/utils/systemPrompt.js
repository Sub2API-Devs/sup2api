/**
 * utils/systemPrompt.ts
 *
 * 生效系统提示词的优先级选择（override > coordinator > 代理 > 自定义 > 默认，append 追加）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/systemPrompt.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { mwe } from "../memdir/memoryStoresPrompt.js";
import { asSystemPrompt } from "./systemPromptType.js";
import { isCoordinatorMode_2 } from "../coordinator/coordinatorMode.js";
import { eur } from "./managedEnvSafety.js";
import { Jar } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isBuiltInAgent } from "../tools/AgentTool/loadAgentsDir.js";
import { baseSystemPromptOf } from "./systemPromptBoundary.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { withCliSections } from "../constants/promptSections.js";

//@ chunk-e6aww6q8.js:2370917-2371009 placement
function u6(e) {
  let { prompt: prompt, servesDefault: servesDefault } = buildEffectiveSystemPrompt(e);
  if (!servesDefault && !e.analysisOnly) mwe(!1);
  return prompt;
}
/**
 * 选择生效系统提示词：overrideSystemPrompt 最优先；coordinator 模式且无主线程代理用 coordinator 提示词（+输出风格、+append）；主线程代理提示词替换默认（代理设置 appendSystemPrompt 时追加在默认后）；否则 --system-prompt（customSystemPrompt）或默认；最后追加 --append-system-prompt。返回 {prompt, servesDefault}。
 */
//@ chunk-e6aww6q8.js:2371009-2371933 fingerprint = buildEffectiveSystemPrompt (0.583)
function buildEffectiveSystemPrompt({
  mainThreadAgentDefinition: mainThreadAgentDefinition,
  toolUseContext: toolUseContext,
  customSystemPrompt: customSystemPrompt,
  defaultSystemPrompt: defaultSystemPrompt,
  appendSystemPrompt: appendSystemPrompt,
  overrideSystemPrompt: overrideSystemPrompt,
  analysisOnly: analysisOnly,
}) {
  if (overrideSystemPrompt) return { prompt: asSystemPrompt([overrideSystemPrompt]), servesDefault: !1 };
  if (isCoordinatorMode_2() && !mainThreadAgentDefinition) {
    let Z = eur()?.prompt,
      Se = Jar(),
      { getCoordinatorSystemPrompt: getCoordinatorSystemPrompt } = require("./chunk-yxywkh50.js"),
      { hasCommsRoledServer: hasCommsRoledServer } = require("./chunk-xrrd0gp5.js"),
      Ee = asSystemPrompt([
        getCoordinatorSystemPrompt(
          hasCommsRoledServer(toolUseContext.options.mcpClients),
          toolUseContext.options.tools,
        ),
        ...(Z ? [Z] : []),
        ...(Se ? [Se] : []),
        ...(appendSystemPrompt ? [appendSystemPrompt] : []),
      ]);
    if (!analysisOnly) logFeatureOk("coordinator_mode_start");
    return { prompt: Ee, servesDefault: !1 };
  }
  let agentSystemPrompt = mainThreadAgentDefinition
      ? isBuiltInAgent(mainThreadAgentDefinition)
        ? mainThreadAgentDefinition.getSystemPrompt({ toolUseContext: { options: toolUseContext.options } })
        : mainThreadAgentDefinition.getSystemPrompt()
      : void 0,
    L = baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt),
    G = L === defaultSystemPrompt,
    q = { tools: toolUseContext.options.tools, appendSystemPrompt: appendSystemPrompt };
  if (mainThreadAgentDefinition?.memory && !analysisOnly)
    logEvent("tengu_agent_memory_loaded", {
      ...!1,
      scope: fromEnum(mainThreadAgentDefinition.memory),
      source: lit_2("main-thread"),
    });
  if (agentSystemPrompt && mainThreadAgentDefinition?.appendSystemPrompt)
    return { prompt: asSystemPrompt(withCliSections([...L, agentSystemPrompt], q)), servesDefault: G };
  return {
    prompt: asSystemPrompt(withCliSections(agentSystemPrompt ? [agentSystemPrompt] : L, q)),
    servesDefault: !agentSystemPrompt && G,
  };
}

export { u6 };
