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
import { basename } from "path";
import { atMentionReplacement } from "../utils/suggestions/mcpTemplateCompletion.js";
import { truncateToWidth } from "../utils/format.js";
import { getAgentColor } from "../tools/AgentTool/agentColorManager.js";
import { logError } from "../utils/log.js";
import { generateFileSuggestions } from "./fileSuggestions.js";
import { isMcpAppResource } from "../services/mcp/toolNameLimits.js";
import { literalPrefixBeforeBrace } from "../utils/suggestions/uriTemplate.js";
import { Fuse } from "../../vendor/fuse.js/dist/fuse.mjs";

//@ chunk-18hwfzwa.js:611275-611822 fingerprint (2.1.88 match: createSuggestionFromSource, 0.772)
function createSuggestionFromSource(source) {
  switch (source.type) {
    case "file":
      return {
        id: `file-${source.path}`,
        displayText: source.displayText,
        description: source.description,
      };
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
        metadata: {
          replacement: atMentionReplacement(source.displayText, true),
          partial: true,
        },
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
var MAX_UNIFIED_SUGGESTIONS = 15;
var MAX_DESCRIPTION_WIDTH = 60;
//@ chunk-18hwfzwa.js:611839-611871 file-last-pair
function truncateDescription(description) {
  return truncateToWidth(description, MAX_DESCRIPTION_WIDTH);
}
//@ chunk-18hwfzwa.js:611871-612236 fingerprint (2.1.88 match: generateAgentSuggestions, 1)
function generateAgentSuggestions(agents, query, showOnEmpty = false) {
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
    logError(error);
    return [];
  }
}
//@ chunk-18hwfzwa.js:612236-613736 fingerprint (2.1.88 match: generateUnifiedSuggestions, 0.807)
/**
 * 统一 @ 建议：并行收集文件、MCP 资源/资源模板、agent 建议，转换成统一建议项并截断描述。
 */
async function generateUnifiedSuggestions(
  query,
  mcpResources,
  { mcpResources: mcpResources_2, agents, showOnEmpty = false, mcpResourceTemplates = {} },
  showOnEmpty_2,
) {
  if (!mcpResources && !showOnEmpty) return [];
  let [fileSuggestions, agentSuggestions] = await Promise.all([
    generateFileSuggestions(query, mcpResources, showOnEmpty, showOnEmpty_2),
    Promise.resolve(generateAgentSuggestions(agents, mcpResources, showOnEmpty)),
  ]);
  let fileSources = fileSuggestions.map((suggestion) => ({
    type: "file",
    displayText: suggestion.displayText,
    description: suggestion.description,
    path: suggestion.displayText,
    filename: basename(suggestion.displayText),
    score: suggestion.metadata?.score,
  }));
  let mcpSources = Object.values(mcpResources_2)
    .flat()
    .filter((resource) => !isMcpAppResource(resource))
    .map((resource) => ({
      type: "mcp_resource",
      displayText: `${resource.server}:${resource.uri}`,
      description: truncateDescription(resource.description || resource.name || resource.uri),
      server: resource.server,
      uri: resource.uri,
      name: resource.name || resource.uri,
    }));
  let mapped = Object.values(mcpResourceTemplates)
    .flat()
    .filter(
      (template) =>
        !isMcpAppResource({
          uri: template.uriTemplate,
          mimeType: template.mimeType,
        }),
    )
    .map((resource) => ({
      type: "mcp_resource_template",
      displayText: `${resource.server}:${literalPrefixBeforeBrace(resource.uriTemplate)}`,
      description: truncateDescription(resource.description || resource.name || resource.uriTemplate),
      server: resource.server,
      uriTemplate: resource.uriTemplate,
      name: resource.name || resource.uriTemplate,
    }));
  if (!mcpResources)
    return [...fileSources, ...mcpSources, ...mapped, ...agentSuggestions]
      .slice(0, MAX_UNIFIED_SUGGESTIONS)
      .map(createSuggestionFromSource);
  let nonFileSources = [...mcpSources, ...mapped, ...agentSuggestions];
  let scoredResults = [];
  for (let fileSource of fileSources)
    scoredResults.push({
      source: fileSource,
      score: fileSource.score ?? 0.5,
    });
  if (nonFileSources.length > 0) {
    let fuseResults = new Fuse(nonFileSources, {
      includeScore: true,
      threshold: 0.6,
      keys: [
        {
          name: "displayText",
          weight: 2,
        },
        {
          name: "name",
          weight: 3,
        },
        {
          name: "server",
          weight: 1,
        },
        {
          name: "description",
          weight: 1,
        },
        {
          name: "agentType",
          weight: 3,
        },
        {
          name: "uriTemplate",
          weight: 2,
        },
      ],
    }).search(mcpResources, {
      limit: MAX_UNIFIED_SUGGESTIONS,
    });
    for (let result of fuseResults) {
      let typeBoost = result.item.type === "mcp_resource" ? 0.15 : 0;
      scoredResults.push({
        source: result.item,
        score: (result.score ?? 0.5) + typeBoost,
      });
    }
  }
  scoredResults.sort((a, b) => a.score - b.score);
  return scoredResults
    .slice(0, MAX_UNIFIED_SUGGESTIONS)
    .map((scoredResult) => scoredResult.source)
    .map(createSuggestionFromSource);
}
export { generateUnifiedSuggestions, MAX_UNIFIED_SUGGESTIONS, truncateDescription };
