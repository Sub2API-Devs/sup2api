/**
 * utils/suggestions/slackChannelSuggestions.ts
 *
 * Slack 频道补全：已知频道缓存、#channel 提及识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/slackChannelSuggestions.ts
 * pieces: chunk-a2q0x549.js (4), chunk-czq1j3j2.js (13)
 * attribution: fingerprint 5, file-local 4, affinity 1, sole-consumer 1, layout 5, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../debug.js";
import { truncateToLength } from "../stringUtils.js";
import { suggestionCacheBySessionRoot } from "./suggestionCache.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { jsonParse } from "../slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:83803-83854 fingerprint (2.1.88 match: unwrapResults, 0.712)
function unwrapResults(text) {
  return findSlackChannelPositions(text, {
    results: MAX_SLACK_CHANNELS,
    bytes: MAX_SLACK_RESPONSE_BYTES,
  });
}
//@ chunk-a2q0x549.js:83854-84210 file-local
function findSlackChannelPositions(content, pattern) {
  if (Array.isArray(content)) return content.flatMap((part) => findSlackChannelPositions(part, pattern));
  if (typeof content !== "string") return [];
  let positions = [];
  let current = "";
  let depth = 0;
  for (let j = 0; j < content.length; j++) {
    let char = content[j];
    if (char === "{") {
      depth++;
      current += char;
    } else if (char === "}") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      let trimmed = current.trim();
      if (trimmed) positions.push(trimmed);
      current = "";
    } else current += char;
  }
  let trimmed = current.trim();
  if (trimmed) positions.push(trimmed);
  return positions
    .filter((position) => position.length > 0)
    .flatMap((position) => expandBracePattern(position, pattern));
}
//@ chunk-a2q0x549.js:84210-84233 affinity
var MAX_SLACK_CHANNELS = 1000;
var MAX_SLACK_RESPONSE_BYTES = 4194304;
//@ chunk-a2q0x549.js:84233-84788 sole-consumer
/**
 * 展开 {a,b} 花括号模式（受结果数与字节预算限制，超出时原样返回）。
 */
function expandBracePattern(position, budget) {
  if (!position.includes("{")) return [position];
  let results = [];
  let pending = [position];
  for (let candidate = pending.pop(); candidate !== undefined; candidate = pending.pop()) {
    let match = candidate.match(/^([^{]*)\{([^}]+)\}(.*)$/);
    if (!match) {
      results.push(candidate);
      continue;
    }
    let prefix = match[1] || "";
    let group = match[2] || "";
    let suffix = match[3] || "";
    let mapped = group.split(",").map((option) => option.trim());
    budget.bytes -= candidate.length;
    let projected = results.length + pending.length + mapped.length;
    if (budget.bytes < 0 || projected > budget.results || projected * position.length > budget.bytes) {
      logForDebugging(
        `Brace pattern expansion exceeds the budget; using it unexpanded: ${truncateToLength(position, 256)}`,
        {
          level: "warn",
        },
      );
      return [position];
    }
    for (let optionIndex = mapped.length - 1; optionIndex >= 0; optionIndex--)
      pending.push(prefix + (mapped[optionIndex] ?? "") + suffix);
  }
  budget.results -= results.length;
  budget.bytes -= results.length * position.length;
  return results;
}
//@ chunk-czq1j3j2.js:629525-629557 fingerprint (2.1.88 match: SLACK_SEARCH_TOOL, 1)
var SLACK_SEARCH_TOOL = "slack_search_channels";
//@ chunk-czq1j3j2.js:629557-629630 layout
function onKnownSlackChannelsChanged(session, listener) {
  return suggestionCacheBySessionRoot.of(session).knownSlackChannelsChanged.subscribe(listener);
}
//@ chunk-czq1j3j2.js:629630-629713 fingerprint (2.1.88 match: findSlackClient, 1)
function findSlackClient(clients) {
  return clients.find((client) => client.type === "connected" && client.name.includes("slack"));
}
//@ chunk-czq1j3j2.js:629713-630105 fingerprint (2.1.88 match: fetchChannels, 0.92)
async function fetchChannels(clients, query) {
  let slackClient = findSlackClient(clients);
  if (!slackClient || slackClient.type !== "connected") return [];
  try {
    let content = (
      await callMcpTool(
        slackClient,
        {
          name: SLACK_SEARCH_TOOL,
          arguments: {
            query,
            limit: 20,
            channel_types: "public_channel,private_channel",
          },
        },
        {
          timeout: 5000,
        },
      )
    ).content;
    if (!Array.isArray(content)) return [];
    let rawText = content.filter((block) => block.type === "text").map((block) => block.text).join(`
`);
    return parseChannels(unwrapResultsEnvelope(rawText));
  } catch (error) {
    logForDebugging(`Failed to fetch Slack channels: ${error}`);
    return [];
  }
}
//@ chunk-czq1j3j2.js:630105-630139 file-local
var resultsEnvelopeSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:630105", () => {
  resultsEnvelopeSchema = DoctorLazy(() =>
    create({
      results: create_2(),
    }),
  );
});
//@ chunk-czq1j3j2.js:630139-630285 layout
function unwrapResultsEnvelope(text) {
  let trimmed = text.trim();
  if (!trimmed.startsWith("{")) return text;
  try {
    let parsed = resultsEnvelopeSchema().safeParse(jsonParse(trimmed));
    if (parsed.success) return parsed.data.results;
  } catch {}
  return text;
}
//@ chunk-czq1j3j2.js:630285-630464 file-local
function parseChannels(text) {
  let channels = [];
  let seen = new Set();
  for (let line of text.split(`
`)) {
    let m = line.match(/^Name:\s*#?([a-z0-9][a-z0-9_-]{0,79})\s*$/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      channels.push(m[1]);
    }
  }
  return channels;
}
//@ chunk-czq1j3j2.js:630464-630502 layout
function hasSlackClient(clients) {
  return findSlackClient(clients) !== undefined;
}
//@ chunk-czq1j3j2.js:630502-630560 layout
function getKnownSlackChannelsVersion(session) {
  return suggestionCacheBySessionRoot.of(session).knownSlackChannelsVersion;
}
//@ chunk-czq1j3j2.js:630560-630804 layout
/**
 * 在输入中找已知 Slack 频道的 #channel 提及位置。
 */
function findSlackChannelMentions(session, displayedValue) {
  let { knownSlackChannels } = suggestionCacheBySessionRoot.of(session);
  let positions = [];
  let channelPattern = /(^|\s)#([a-z0-9][a-z0-9_-]{0,79})(?=\s|$)/g;
  let m;
  while ((m = channelPattern.exec(displayedValue)) !== null) {
    if (!knownSlackChannels.has(m[2])) continue;
    let start = m.index + m[1].length;
    positions.push({
      start,
      end: start + 1 + m[2].length,
    });
  }
  return positions;
}
//@ chunk-czq1j3j2.js:630804-630900 callgraph-fingerprint (2.1.88 match: mcpQueryFor, 1)
function mcpQueryFor(searchToken) {
  let lastSep = Math.max(searchToken.lastIndexOf("-"), searchToken.lastIndexOf("_"));
  return lastSep > 0 ? searchToken.slice(0, lastSep) : searchToken;
}
//@ chunk-czq1j3j2.js:630900-631044 file-local
function findReusableCacheEntry(slackChannelsByQuery, mcpQuery, lower) {
  let best;
  let bestLen = 0;
  for (let [key, channels] of slackChannelsByQuery)
    if (
      mcpQuery.startsWith(key) &&
      key.length > bestLen &&
      channels.some((channel) => channel.startsWith(lower))
    ) {
      best = channels;
      bestLen = key.length;
    }
  return best;
}
//@ chunk-czq1j3j2.js:631044-631922 fingerprint (2.1.88 match: getSlackChannelSuggestions, 0.556)
async function getSlackChannelSuggestions(session, clients, searchToken) {
  if (!searchToken) return [];
  let mcpQuery = mcpQueryFor(searchToken);
  let lower = searchToken.toLowerCase();
  let cache = suggestionCacheBySessionRoot.of(session);
  let channels =
    cache.slackChannelsByQuery.get(mcpQuery) ??
    findReusableCacheEntry(cache.slackChannelsByQuery, mcpQuery, lower);
  if (!channels)
    if (cache.inflightSlackQuery === mcpQuery && cache.inflightSlackPromise)
      channels = await cache.inflightSlackPromise;
    else {
      cache.inflightSlackQuery = mcpQuery;
      cache.inflightSlackPromise = fetchChannels(clients, mcpQuery);
      channels = await cache.inflightSlackPromise;
      cache.slackChannelsByQuery.set(mcpQuery, channels);
      let before = cache.knownSlackChannels.size;
      for (let channel of channels) cache.knownSlackChannels.add(channel);
      if (cache.knownSlackChannels.size !== before) {
        cache.knownSlackChannelsVersion++;
        cache.knownSlackChannelsChanged.emit();
      }
      if (cache.slackChannelsByQuery.size > 50)
        cache.slackChannelsByQuery.delete(cache.slackChannelsByQuery.keys().next().value);
      if (cache.inflightSlackQuery === mcpQuery) {
        cache.inflightSlackQuery = null;
        cache.inflightSlackPromise = null;
      }
    }
  return channels
    .filter((channel) => channel.startsWith(lower))
    .sort()
    .slice(0, 10)
    .map((channel) => ({
      id: `slack-channel-${channel}`,
      displayText: `#${channel}`,
    }));
}
export {
  unwrapResults,
  onKnownSlackChannelsChanged,
  getKnownSlackChannelsVersion,
  hasSlackClient,
  findSlackChannelMentions,
  getSlackChannelSuggestions,
};
