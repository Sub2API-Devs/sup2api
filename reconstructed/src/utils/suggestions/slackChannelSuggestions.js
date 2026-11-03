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
import { yX } from "./suggestionCache.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { logForDebugging } from "../debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { jsonParse } from "../slowOperations.js";
import { truncateToLength } from "../stringUtils.js";

//@ chunk-18hwfzwa.js:608844-608876 fingerprint = SLACK_SEARCH_TOOL (1)
var SLACK_SEARCH_TOOL = "slack_search_channels";
//@ chunk-18hwfzwa.js:608876-608949 layout
function onKnownSlackChannelsChanged(h, x) {
  return yX.of(h).knownSlackChannelsChanged.subscribe(x);
}
//@ chunk-18hwfzwa.js:608949-609032 fingerprint = findSlackClient (1)
function findSlackClient(clients) {
  return clients.find((x) => x.type === "connected" && x.name.includes("slack"));
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
          arguments: { query: query, limit: 20, channel_types: "public_channel,private_channel" },
        },
        { timeout: 5000 },
      )
    ).content;
    if (!Array.isArray(content)) return [];
    let joined = content.filter((Re) => Re.type === "text").map((Re) => Re.text).join(`
`);
    return parseChannels(unwrapResultsEnvelope(joined));
  } catch (error) {
    return (logForDebugging(`Failed to fetch Slack channels: ${error}`), []);
  }
}
//@ chunk-18hwfzwa.js:609424-609458 file-local
var resultsEnvelopeSchema = DoctorLazy(() => create({ results: create_2() }));
//@ chunk-18hwfzwa.js:609458-609604 layout
function unwrapResultsEnvelope(h) {
  let trimmed = h.trim();
  if (!trimmed.startsWith("{")) return h;
  try {
    let safeParse = resultsEnvelopeSchema().safeParse(jsonParse(trimmed));
    if (safeParse.success) return safeParse.data.results;
  } catch {}
  return h;
}
//@ chunk-18hwfzwa.js:609604-609783 file-local
function parseChannels(text) {
  let channels = [],
    seen = new Set();
  for (let line of text.split(`
`)) {
    let match = line.match(/^Name:\s*#?([a-z0-9][a-z0-9_-]{0,79})\s*$/);
    if (match && !seen.has(match[1])) (seen.add(match[1]), channels.push(match[1]));
  }
  return channels;
}
//@ chunk-18hwfzwa.js:609783-609821 layout
function hasSlackClient(h) {
  return findSlackClient(h) !== void 0;
}
//@ chunk-18hwfzwa.js:609821-609879 layout
function getKnownSlackChannelsVersion(h) {
  return yX.of(h).knownSlackChannelsVersion;
}
/**
 * 在输入中找已知 Slack 频道的 #channel 提及位置。
 */
//@ chunk-18hwfzwa.js:609879-610123 layout
function findSlackChannelMentions(h, x) {
  let { knownSlackChannels: knownSlackChannels } = yX.of(h),
    L = [],
    ee = /(^|\s)#([a-z0-9][a-z0-9_-]{0,79})(?=\s|$)/g,
    ke;
  while ((ke = ee.exec(x)) !== null) {
    if (!knownSlackChannels.has(ke[2])) continue;
    let Re = ke.index + ke[1].length;
    L.push({ start: Re, end: Re + 1 + ke[2].length });
  }
  return L;
}
//@ chunk-18hwfzwa.js:610123-610219 callgraph-fingerprint = mcpQueryFor (1)
function mcpQueryFor(searchToken) {
  let lastSep = Math.max(searchToken.lastIndexOf("-"), searchToken.lastIndexOf("_"));
  return lastSep > 0 ? searchToken.slice(0, lastSep) : searchToken;
}
//@ chunk-18hwfzwa.js:610219-610363 file-local
function findReusableCacheEntry(h, x, D) {
  let best,
    bestLen = 0;
  for (let [ke, Re] of h)
    if (x.startsWith(ke) && ke.length > bestLen && Re.some((Be) => Be.startsWith(D)))
      ((best = Re), (bestLen = ke.length));
  return best;
}
//@ chunk-18hwfzwa.js:610363-611241 fingerprint = getSlackChannelSuggestions (0.557)
async function getSlackChannelSuggestions(h, x, D) {
  if (!D) return [];
  let mcpQuery = mcpQueryFor(D),
    lower = D.toLowerCase(),
    of = yX.of(h),
    channels =
      of.slackChannelsByQuery.get(mcpQuery) ??
      findReusableCacheEntry(of.slackChannelsByQuery, mcpQuery, lower);
  if (!channels)
    if (of.inflightSlackQuery === mcpQuery && of.inflightSlackPromise)
      channels = await of.inflightSlackPromise;
    else {
      ((of.inflightSlackQuery = mcpQuery),
        (of.inflightSlackPromise = fetchChannels(x, mcpQuery)),
        (channels = await of.inflightSlackPromise),
        of.slackChannelsByQuery.set(mcpQuery, channels));
      let before = of.knownSlackChannels.size;
      for (let He of channels) of.knownSlackChannels.add(He);
      if (of.knownSlackChannels.size !== before)
        (of.knownSlackChannelsVersion++, of.knownSlackChannelsChanged.emit());
      if (of.slackChannelsByQuery.size > 50)
        of.slackChannelsByQuery.delete(of.slackChannelsByQuery.keys().next().value);
      if (of.inflightSlackQuery === mcpQuery)
        ((of.inflightSlackQuery = null), (of.inflightSlackPromise = null));
    }
  return channels
    .filter((Be) => Be.startsWith(lower))
    .sort()
    .slice(0, 10)
    .map((Be) => ({ id: `slack-channel-${Be}`, displayText: `#${Be}` }));
}
//@ chunk-82kqcve8.js:86360-86411 fingerprint = unwrapResults (0.71)
function unwrapResults(text) {
  return findSlackChannelPositions(text, { results: jm, bytes: Um });
}
//@ chunk-82kqcve8.js:86411-86767 file-local
function findSlackChannelPositions(e, n) {
  if (Array.isArray(e)) return e.flatMap((w) => findSlackChannelPositions(w, n));
  if (typeof e !== "string") return [];
  let positions = [],
    s = "",
    h = 0;
  for (let w = 0; w < e.length; w++) {
    let S = e[w];
    if (S === "{") (h++, (s += S));
    else if (S === "}") (h--, (s += S));
    else if (S === "," && h === 0) {
      let trimmed = s.trim();
      if (trimmed) positions.push(trimmed);
      s = "";
    } else s += S;
  }
  let trimmed = s.trim();
  if (trimmed) positions.push(trimmed);
  return positions.filter((w) => w.length > 0).flatMap((w) => expandBracePattern(w, n));
}
//@ chunk-82kqcve8.js:86767-86790 affinity
var jm = 1000,
  Um = 4194304;
/**
 * 展开 {a,b} 花括号模式（受结果数与字节预算限制，超出时原样返回）。
 */
//@ chunk-82kqcve8.js:86790-87346 sole-consumer
function expandBracePattern(e, n) {
  if (!e.includes("{")) return [e];
  let r = [],
    s = [e];
  for (let h = s.pop(); h !== void 0; h = s.pop()) {
    let match = h.match(/^([^{]*)\{([^}]+)\}(.*)$/);
    if (!match) {
      r.push(h);
      continue;
    }
    let w = match[1] || "",
      S = match[2] || "",
      R = match[3] || "",
      mapped = S.split(",").map((L) => L.trim());
    n.bytes -= h.length;
    let P = r.length + s.length + mapped.length;
    if (n.bytes < 0 || P > n.results || P * e.length > n.bytes)
      return (
        logForDebugging(
          `Brace pattern expansion exceeds the budget; using it unexpanded: ${truncateToLength(e, 256)}`,
          { level: "warn" },
        ),
        [e]
      );
    for (let L = mapped.length - 1; L >= 0; L--) s.push(w + (mapped[L] ?? "") + R);
  }
  return ((n.results -= r.length), (n.bytes -= r.length * e.length), r);
}

export {
  onKnownSlackChannelsChanged,
  getKnownSlackChannelsVersion,
  hasSlackClient,
  findSlackChannelMentions,
  getSlackChannelSuggestions,
  unwrapResults,
};
