/**
 * utils/suggestions/mcpTemplateCompletion.ts
 *
 * 2.1.316 新增。MCP 资源模板补全。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { isMcpAppResource } from "../../services/mcp/toolNameLimits.js";
import {
  bestTemplateMatch,
  literalPrefixBeforeBrace,
  isBetweenTemplateVars,
  applyTemplateCompletion,
} from "./uriTemplate.js";
import { MAX_UNIFIED_SUGGESTIONS, truncateDescription } from "../../hooks/unifiedSuggestions.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-18hwfzwa.js:613736-615188 placement
async function mcpTemplateCompletions(input, templatesByServer, clients, healthTracker) {
  let index = input.indexOf(":");
  if (index === -1) return null;
  let sliced = input.slice(0, index);
  let sliced_2 = input.slice(index + 1);
  let templates = Object.hasOwn(templatesByServer, sliced)
    ? templatesByServer[sliced]?.filter(
        (resource) =>
          !isMcpAppResource({
            uri: resource.uriTemplate,
            mimeType: resource.mimeType,
          }),
      )
    : undefined;
  if (!templates || templates.length === 0) return null;
  let match = bestTemplateMatch(sliced_2, templates);
  if (!match) {
    if (!sliced_2) return null;
    let filtered = templates.filter(
      (template) =>
        template.uriTemplate.startsWith(sliced_2) && template.uriTemplate.length > sliced_2.length,
    );
    if (filtered.length === 0) return null;
    return filtered.slice(0, MAX_UNIFIED_SUGGESTIONS).map((template) => {
      let literalPrefix = literalPrefixBeforeBrace(template.uriTemplate);
      return {
        id: `mcp-template::${sliced}__${template.uriTemplate}`,
        displayText: `${sliced}:${literalPrefix}`,
        description: truncateDescription(template.description || template.name || template.uriTemplate),
        metadata: {
          replacement: atMentionReplacement(`${sliced}:${literalPrefix}`, true),
          partial: true,
        },
      };
    });
  }
  let found = clients.find((client) => client.name === sliced && isConnectedOrCached(client));
  if (!found) return [];
  let { completeResourceTemplate, ensureConnectedClient } =
    require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
  let serverName = found.name;
  if (found.type === "cached" && healthTracker?.shouldSkip(serverName)) return [];
  let connected;
  try {
    connected = await ensureConnectedClient(found, {
      context: "MCP template completion",
    });
    healthTracker?.recordSuccess(serverName);
  } catch (error) {
    healthTracker?.recordFailure(serverName);
    logForDebugging(`Template completion skipped for ${sliced}: ${errorMessage(error)}`);
    return [];
  }
  let completions = await completeResourceTemplate(
    connected,
    match.template.uriTemplate,
    match.argName,
    match.argValue,
    match.resolvedArgs,
  );
  if (completions.length === 0) return [];
  let description = truncateDescription(match.template.description || match.template.name || "");
  let partial = isBetweenTemplateVars(match);
  return completions.slice(0, MAX_UNIFIED_SUGGESTIONS).map((value) => {
    let replacement = applyTemplateCompletion(sliced_2, match, value);
    return {
      id: `mcp-template-value::${sliced}__${replacement}`,
      displayText: replacement.slice(match.valueStartIndex),
      description,
      metadata: {
        replacement: atMentionReplacement(`${sliced}:${replacement}`, partial),
        partial,
      },
    };
  });
}
//@ chunk-18hwfzwa.js:615188-615267 placement
function atMentionReplacement(text, partial) {
  if (text.includes(" ")) return partial ? `@"${text}` : `@"${text}"`;
  return `@${text}`;
}
export { mcpTemplateCompletions, atMentionReplacement };
