/**
 * utils/systemPrompt.ts
 *
 * 生效系统提示词的优先级选择（override > coordinator > 代理 > 自定义 > 默认，append 追加）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/systemPrompt.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { setSharedMemoryServedViaTools } from "../memdir/memoryStoresPrompt.js";
import { isCoordinatorMode_2 } from "../coordinator/coordinatorMode.js";
import { noPersonalScopeBlock } from "./managedEnvSafety.js";
import { chromeSectionForWire } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { asSystemPrompt } from "./systemPromptType.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isBuiltInAgent } from "../tools/AgentTool/loadAgentsDir.js";
import { baseSystemPromptOf } from "./systemPromptBoundary.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { withCliSections } from "../constants/promptSections.js";

//@ chunk-5xgkngpb.js:2426345-2426437 placement
/**
 * 取生效的系统提示词文本，并标记是否使用了默认提示词。
 */
function effectiveSystemPromptText(options) {
  let { prompt, servesDefault } = buildEffectiveSystemPrompt(options);
  if (!servesDefault && !options.analysisOnly) setSharedMemoryServedViaTools(false);
  return prompt;
}
//@ chunk-5xgkngpb.js:2426437-2427293 fingerprint (2.1.88 match: buildEffectiveSystemPrompt, 0.558)
/**
 * 选择生效系统提示词：overrideSystemPrompt 最优先；coordinator 模式且无主线程代理用 coordinator 提示词（+输出风格、+append）；主线程代理提示词替换默认（代理设置 appendSystemPrompt 时追加在默认后）；否则 --system-prompt（customSystemPrompt）或默认；最后追加 --append-system-prompt。返回 {prompt, servesDefault}。
 */
function buildEffectiveSystemPrompt({
  mainThreadAgentDefinition,
  toolUseContext,
  customSystemPrompt,
  defaultSystemPrompt,
  appendSystemPrompt,
  analysisOnly,
}) {
  if (isCoordinatorMode_2() && !mainThreadAgentDefinition) {
    let prompt = noPersonalScopeBlock()?.prompt;
    let chromeSection = chromeSectionForWire();
    let { getCoordinatorSystemPrompt } = require("../coordinator/coordinatorMode.js");
    let { hasCommsRoledServer } = require("../coordinator/coordinatorMcpServers.js");
    let prompt_2 = asSystemPrompt([
      getCoordinatorSystemPrompt(
        hasCommsRoledServer(toolUseContext.options.mcpClients),
        toolUseContext.options.tools,
      ),
      ...(prompt ? [prompt] : []),
      ...(chromeSection ? [chromeSection] : []),
      ...(appendSystemPrompt ? [appendSystemPrompt] : []),
    ]);
    if (!analysisOnly) logFeatureOk("coordinator_mode_start");
    return {
      prompt: prompt_2,
      servesDefault: false,
    };
  }
  let agentSystemPrompt = mainThreadAgentDefinition
    ? isBuiltInAgent(mainThreadAgentDefinition)
      ? mainThreadAgentDefinition.getSystemPrompt({
          toolUseContext: {
            options: toolUseContext.options,
          },
        })
      : mainThreadAgentDefinition.getSystemPrompt()
    : undefined;
  let basePrompt = baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt);
  let servesDefault = basePrompt === defaultSystemPrompt;
  let cliSectionsOptions = {
    tools: toolUseContext.options.tools,
    appendSystemPrompt,
  };
  if (mainThreadAgentDefinition?.memory && !analysisOnly)
    logEvent("tengu_agent_memory_loaded", {
      ...false,
      scope: fromEnum(mainThreadAgentDefinition.memory),
      source: lit_2("main-thread"),
    });
  if (agentSystemPrompt && mainThreadAgentDefinition?.appendSystemPrompt)
    return {
      prompt: asSystemPrompt(withCliSections([...basePrompt, agentSystemPrompt], cliSectionsOptions)),
      servesDefault,
    };
  return {
    prompt: asSystemPrompt(
      withCliSections(agentSystemPrompt ? [agentSystemPrompt] : basePrompt, cliSectionsOptions),
    ),
    servesDefault: !agentSystemPrompt && servesDefault,
  };
}
export { effectiveSystemPromptText };
