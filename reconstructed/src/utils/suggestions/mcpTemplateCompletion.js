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
async function mcpTemplateCompletions(h, x, clients, L) {
  let index = h.indexOf(":");
  if (index === -1) return null;
  let sliced = h.slice(0, index);
  let sliced_2 = h.slice(index + 1);
  let Be = Object.hasOwn(x, sliced)
    ? x[sliced]?.filter(
        (Et) =>
          !isMcpAppResource({
            uri: Et.uriTemplate,
            mimeType: Et.mimeType,
          }),
      )
    : undefined;
  if (!Be || Be.length === 0) return null;
  let He = bestTemplateMatch(sliced_2, Be);
  if (!He) {
    if (!sliced_2) return null;
    let filtered = Be.filter(
      (Dt) => Dt.uriTemplate.startsWith(sliced_2) && Dt.uriTemplate.length > sliced_2.length,
    );
    if (filtered.length === 0) return null;
    return filtered.slice(0, MAX_UNIFIED_SUGGESTIONS).map((Dt) => {
      let Lt = literalPrefixBeforeBrace(Dt.uriTemplate);
      return {
        id: `mcp-template::${sliced}__${Dt.uriTemplate}`,
        displayText: `${sliced}:${Lt}`,
        description: truncateDescription(Dt.description || Dt.name || Dt.uriTemplate),
        metadata: {
          replacement: atMentionReplacement(`${sliced}:${Lt}`, true),
          partial: true,
        },
      };
    });
  }
  let found = clients.find((Et) => Et.name === sliced && isConnectedOrCached(Et));
  if (!found) return [];
  let { completeResourceTemplate, ensureConnectedClient } = require("./chunk-asne9cp8.js").mcpClientModule();
  let rt = found.name;
  if (found.type === "cached" && L?.shouldSkip(rt)) return [];
  let kt;
  try {
    kt = await ensureConnectedClient(found, {
      context: "MCP template completion",
    });
    L?.recordSuccess(rt);
  } catch (error) {
    L?.recordFailure(rt);
    logForDebugging(`Template completion skipped for ${sliced}: ${errorMessage(error)}`);
    return [];
  }
  let At = await completeResourceTemplate(
    kt,
    He.template.uriTemplate,
    He.argName,
    He.argValue,
    He.resolvedArgs,
  );
  if (At.length === 0) return [];
  let description = truncateDescription(He.template.description || He.template.name || "");
  let Ot = isBetweenTemplateVars(He);
  return At.slice(0, MAX_UNIFIED_SUGGESTIONS).map((Et) => {
    let Dt = applyTemplateCompletion(sliced_2, He, Et);
    return {
      id: `mcp-template-value::${sliced}__${Dt}`,
      displayText: Dt.slice(He.valueStartIndex),
      description,
      metadata: {
        replacement: atMentionReplacement(`${sliced}:${Dt}`, Ot),
        partial: Ot,
      },
    };
  });
}
//@ chunk-18hwfzwa.js:615188-615267 placement
function atMentionReplacement(h, x) {
  if (h.includes(" ")) return x ? `@"${h}` : `@"${h}"`;
  return `@${h}`;
}
export { mcpTemplateCompletions, atMentionReplacement };
