/**
 * hooks/unifiedSuggestions.ts
 *
 * 统一 @ 建议：合并文件、MCP 资源/模板、agent 建议并排序截断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/unifiedSuggestions.ts
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: fingerprint 3, layout 1, file-last-pair 1
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
} from "path";
import { pue } from "../utils/suggestions/mcpTemplateCompletion.js";
import { truncateToWidth } from "../utils/format.js";
import { getAgentColor } from "../tools/AgentTool/agentColorManager.js";
import { logError } from "../utils/log.js";
import { generateFileSuggestions } from "./fileSuggestions.js";
import { isMcpAppResource } from "../services/mcp/toolNameLimits.js";
import { qce } from "../utils/suggestions/uriTemplate.js";
import { gve } from "../../vendor/fuse.js/dist/fuse.mjs";

//@ chunk-18hwfzwa.js:611275-611822 fingerprint = createSuggestionFromSource (0.772)
function createSuggestionFromSource(source) {
  switch (source.type) {
    case "file":
      return { id: `file-${source.path}`, displayText: source.displayText, description: source.description };
    case "mcp_resource":
      return {
        id: `mcp-resource-${source.server}__${source.uri}`,
        displayText: source.displayText,
        description: source.description,
      };
    case "mcp_resource_template":
      return {
        id: `mcp-template::${source.server}__${source.uriTemplate}`,
        displayText: source.displayText,
        description: source.description,
        metadata: { replacement: pue(source.displayText, !0), partial: !0 },
      };
    case "agent":
      return {
        id: `agent-${source.agentType}`,
        displayText: source.displayText,
        description: source.description,
        color: source.color,
      };
  }
}
//@ chunk-18hwfzwa.js:611822-611839 layout
var uW = 15,
  LQt = 60;
//@ chunk-18hwfzwa.js:611839-611871 file-last-pair
function truncateDescription(description) {
  return truncateToWidth(description, LQt);
}
//@ chunk-18hwfzwa.js:611871-612236 fingerprint = generateAgentSuggestions (1)
function generateAgentSuggestions(agents, query, showOnEmpty = !1) {
  if (!query && !showOnEmpty) return [];
  try {
    let agentSources = agents.map((agent) => ({
      type: "agent",
      displayText: `${agent.agentType} (agent)`,
      description: truncateDescription(agent.whenToUse),
      agentType: agent.agentType,
      color: getAgentColor(agent.agentType),
    }));
    if (!query) return agentSources;
    let queryLower = query.toLowerCase();
    return agentSources.filter(
      (agent) =>
        agent.agentType.toLowerCase().includes(queryLower) ||
        agent.displayText.toLowerCase().includes(queryLower),
    );
  } catch (error) {
    return (logError(error), []);
  }
}
/**
 * 统一 @ 建议：并行收集文件、MCP 资源/资源模板、agent 建议，转换成统一建议项并截断描述。
 */
//@ chunk-18hwfzwa.js:612236-613736 fingerprint = generateUnifiedSuggestions (0.807)
async function generateUnifiedSuggestions(
  query,
  mcpResources,
  {
    mcpResources: mcpResources_2,
    agents: agents,
    showOnEmpty: showOnEmpty = !1,
    mcpResourceTemplates: mcpResourceTemplates = {},
  },
  showOnEmpty_2,
) {
  if (!mcpResources && !showOnEmpty) return [];
  let [Be, He] = await Promise.all([
      generateFileSuggestions(query, mcpResources, showOnEmpty, showOnEmpty_2),
      Promise.resolve(generateAgentSuggestions(agents, mcpResources, showOnEmpty)),
    ]),
    fileSources = Be.map((suggestion) => ({
      type: "file",
      displayText: suggestion.displayText,
      description: suggestion.description,
      path: suggestion.displayText,
      filename: basename_3(suggestion.displayText),
      score: suggestion.metadata?.score,
    })),
    mcpSources = Object.values(mcpResources_2)
      .flat()
      .filter((resource) => !isMcpAppResource(resource))
      .map((At) => ({
        type: "mcp_resource",
        displayText: `${At.server}:${At.uri}`,
        description: truncateDescription(At.description || At.name || At.uri),
        server: At.server,
        uri: At.uri,
        name: At.name || At.uri,
      })),
    mapped = Object.values(mcpResourceTemplates)
      .flat()
      .filter((At) => !isMcpAppResource({ uri: At.uriTemplate, mimeType: At.mimeType }))
      .map((At) => ({
        type: "mcp_resource_template",
        displayText: `${At.server}:${qce(At.uriTemplate)}`,
        description: truncateDescription(At.description || At.name || At.uriTemplate),
        server: At.server,
        uriTemplate: At.uriTemplate,
        name: At.name || At.uriTemplate,
      }));
  if (!mcpResources)
    return [...fileSources, ...mcpSources, ...mapped, ...He].slice(0, uW).map(createSuggestionFromSource);
  let allSources = [...mcpSources, ...mapped, ...He],
    scoredResults = [];
  for (let fileSource of fileSources)
    scoredResults.push({ source: fileSource, score: fileSource.score ?? 0.5 });
  if (allSources.length > 0) {
    let fuseResults = new gve(allSources, {
      includeScore: !0,
      threshold: 0.6,
      keys: [
        { name: "displayText", weight: 2 },
        { name: "name", weight: 3 },
        { name: "server", weight: 1 },
        { name: "description", weight: 1 },
        { name: "agentType", weight: 3 },
        { name: "uriTemplate", weight: 2 },
      ],
    }).search(mcpResources, { limit: uW });
    for (let result of fuseResults) {
      let Et = result.item.type === "mcp_resource" ? 0.15 : 0;
      scoredResults.push({ source: result.item, score: (result.score ?? 0.5) + Et });
    }
  }
  return (
    scoredResults.sort((At, It) => At.score - It.score),
    scoredResults
      .slice(0, uW)
      .map((At) => At.source)
      .map(createSuggestionFromSource)
  );
}

export { generateUnifiedSuggestions, uW, truncateDescription };
