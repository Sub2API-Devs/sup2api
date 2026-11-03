/**
 * utils/suggestions/slackChannelSuggestions.ts
 *
 * Slack 频道补全：已知频道缓存、#channel 提及识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/slackChannelSuggestions.ts
 * pieces: chunk-18hwfzwa.js (13), chunk-82kqcve8.js (4)
 * attribution: fingerprint 5, layout 5, file-local 4, callgraph-fingerprint 1, affinity 1, sole-consumer 1
 */
import { suggestionCacheBySessionRoot } from "./suggestionCache.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { logForDebugging } from "../debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { jsonParse } from "../slowOperations.js";
import { truncateToLength } from "../stringUtils.js";

//@ chunk-18hwfzwa.js:608844-608876 fingerprint = SLACK_SEARCH_TOOL (1)
var SLACK_SEARCH_TOOL = "slack_search_channels";
//@ chunk-18hwfzwa.js:608876-608949 layout
function onKnownSlackChannelsChanged(session, x) {
  return suggestionCacheBySessionRoot.of(session).knownSlackChannelsChanged.subscribe(x);
}
//@ chunk-18hwfzwa.js:608949-609032 fingerprint = findSlackClient (1)
function findSlackClient(clients) {
  return clients.find((client) => client.type === "connected" && client.name.includes("slack"));
}
//@ chunk-18hwfzwa.js:609032-609424 fingerprint = fetchChannels (0.92)
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
    let rawText = content.filter((Re) => Re.type === "text").map((Re) => Re.text).join(`
`);
    return parseChannels(unwrapResultsEnvelope(rawText));
  } catch (error) {
    logForDebugging(`Failed to fetch Slack channels: ${error}`);
    return [];
  }
}
//@ chunk-18hwfzwa.js:609424-609458 file-local
var resultsEnvelopeSchema = DoctorLazy(() =>
  create({
    results: create_2(),
  }),
);
//@ chunk-18hwfzwa.js:609458-609604 layout
function unwrapResultsEnvelope(text) {
  let trimmed = text.trim();
  if (!trimmed.startsWith("{")) return text;
  try {
    let parsed = resultsEnvelopeSchema().safeParse(jsonParse(trimmed));
    if (parsed.success) return parsed.data.results;
  } catch {}
  return text;
}
//@ chunk-18hwfzwa.js:609604-609783 file-local
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
//@ chunk-18hwfzwa.js:609783-609821 layout
function hasSlackClient(clients) {
  return findSlackClient(clients) !== undefined;
}
//@ chunk-18hwfzwa.js:609821-609879 layout
function getKnownSlackChannelsVersion(session) {
  return suggestionCacheBySessionRoot.of(session).knownSlackChannelsVersion;
}
//@ chunk-18hwfzwa.js:609879-610123 layout
/**
 * 在输入中找已知 Slack 频道的 #channel 提及位置。
 */
function findSlackChannelMentions(session, displayedValue) {
  let { knownSlackChannels } = suggestionCacheBySessionRoot.of(session);
  let positions = [];
  let ee = /(^|\s)#([a-z0-9][a-z0-9_-]{0,79})(?=\s|$)/g;
  let m;
  while ((m = ee.exec(displayedValue)) !== null) {
    if (!knownSlackChannels.has(m[2])) continue;
    let start = m.index + m[1].length;
    positions.push({
      start,
      end: start + 1 + m[2].length,
    });
  }
  return positions;
}
//@ chunk-18hwfzwa.js:610123-610219 callgraph-fingerprint = mcpQueryFor (1)
function mcpQueryFor(searchToken) {
  let lastSep = Math.max(searchToken.lastIndexOf("-"), searchToken.lastIndexOf("_"));
  return lastSep > 0 ? searchToken.slice(0, lastSep) : searchToken;
}
//@ chunk-18hwfzwa.js:610219-610363 file-local
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
//@ chunk-18hwfzwa.js:610363-611241 fingerprint = getSlackChannelSuggestions (0.557)
async function getSlackChannelSuggestions(session, clients, searchToken) {
  if (!searchToken) return [];
  let mcpQuery = mcpQueryFor(searchToken);
  let lower = searchToken.toLowerCase();
  let ke = suggestionCacheBySessionRoot.of(session);
  let channels =
    ke.slackChannelsByQuery.get(mcpQuery) ?? findReusableCacheEntry(ke.slackChannelsByQuery, mcpQuery, lower);
  if (!channels)
    if (ke.inflightSlackQuery === mcpQuery && ke.inflightSlackPromise)
      channels = await ke.inflightSlackPromise;
    else {
      ke.inflightSlackQuery = mcpQuery;
      ke.inflightSlackPromise = fetchChannels(clients, mcpQuery);
      channels = await ke.inflightSlackPromise;
      ke.slackChannelsByQuery.set(mcpQuery, channels);
      let before = ke.knownSlackChannels.size;
      for (let channel of channels) ke.knownSlackChannels.add(channel);
      if (ke.knownSlackChannels.size !== before) {
        ke.knownSlackChannelsVersion++;
        ke.knownSlackChannelsChanged.emit();
      }
      if (ke.slackChannelsByQuery.size > 50)
        ke.slackChannelsByQuery.delete(ke.slackChannelsByQuery.keys().next().value);
      if (ke.inflightSlackQuery === mcpQuery) {
        ke.inflightSlackQuery = null;
        ke.inflightSlackPromise = null;
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
//@ chunk-82kqcve8.js:86360-86411 fingerprint = unwrapResults (0.71)
function unwrapResults(text) {
  return findSlackChannelPositions(text, {
    results: MAX_SLACK_CHANNELS,
    bytes: MAX_SLACK_RESPONSE_BYTES,
  });
}
//@ chunk-82kqcve8.js:86411-86767 file-local
function findSlackChannelPositions(e, n) {
  if (Array.isArray(e)) return e.flatMap((w) => findSlackChannelPositions(w, n));
  if (typeof e !== "string") return [];
  let positions = [];
  let s = "";
  let h = 0;
  for (let j = 0; j < e.length; j++) {
    let S = e[j];
    if (S === "{") {
      h++;
      s += S;
    } else if (S === "}") {
      h--;
      s += S;
    } else if (S === "," && h === 0) {
      let trimmed = s.trim();
      if (trimmed) positions.push(trimmed);
      s = "";
    } else s += S;
  }
  let trimmed = s.trim();
  if (trimmed) positions.push(trimmed);
  return positions
    .filter((position) => position.length > 0)
    .flatMap((position) => expandBracePattern(position, n));
}
//@ chunk-82kqcve8.js:86767-86790 affinity
var MAX_SLACK_CHANNELS = 1000;
var MAX_SLACK_RESPONSE_BYTES = 4194304;
//@ chunk-82kqcve8.js:86790-87346 sole-consumer
/**
 * 展开 {a,b} 花括号模式（受结果数与字节预算限制，超出时原样返回）。
 */
function expandBracePattern(position, n) {
  if (!position.includes("{")) return [position];
  let r = [];
  let s = [position];
  for (let h = s.pop(); h !== undefined; h = s.pop()) {
    let match = h.match(/^([^{]*)\{([^}]+)\}(.*)$/);
    if (!match) {
      r.push(h);
      continue;
    }
    let w = match[1] || "";
    let S = match[2] || "";
    let R = match[3] || "";
    let mapped = S.split(",").map((L) => L.trim());
    n.bytes -= h.length;
    let P = r.length + s.length + mapped.length;
    if (n.bytes < 0 || P > n.results || P * position.length > n.bytes) {
      logForDebugging(
        `Brace pattern expansion exceeds the budget; using it unexpanded: ${truncateToLength(position, 256)}`,
        {
          level: "warn",
        },
      );
      return [position];
    }
    for (let j = mapped.length - 1; j >= 0; j--) s.push(w + (mapped[j] ?? "") + R);
  }
  n.results -= r.length;
  n.bytes -= r.length * position.length;
  return r;
}
export {
  onKnownSlackChannelsChanged,
  getKnownSlackChannelsVersion,
  hasSlackClient,
  findSlackChannelMentions,
  getSlackChannelSuggestions,
  unwrapResults,
};
