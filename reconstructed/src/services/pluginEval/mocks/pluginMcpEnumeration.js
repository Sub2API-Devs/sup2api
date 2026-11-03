/**
 * services/pluginEval/mocks/pluginMcpEnumeration.ts
 *
 * 2.1.316 新增：plugin eval 枚举被测插件声明的 MCP 服务器与工具，用于生成模拟替身
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (14)
 * attribution: placement 14
 */
import path, {
  basename,
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import { randomBytes, randomBytes as randomBytes_2 } from "crypto";
import { isZipPathCaseInsensitive, createPluginFromPath } from "../../../utils/plugins/pluginLoader.js";
import { UnenumerablePluginError } from "../caseDiscovery.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../../utils/telemetry/pluginTelemetry.js";
import { logForDebugging } from "../../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../../utils/errors.js";
import { redactUrlQuery } from "../../../utils/redaction/urlRedaction.js";
import {
  loadPluginMcpServersFromSources,
  addPluginScopeToServers_2,
} from "../../../utils/plugins/mcpPluginIntegration.js";
import { normalizeNameForMCP } from "../../mcp/normalization.js";
import { buildMcpToolName } from "../../mcp/mcpStringUtils.js";
import { isMcpbSource } from "../../../utils/plugins/mcpbHandler.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { REPLAY_DIR_SUFFIX } from "./mockRecordings.js";

/**
 * 加载被测插件并列出其 MCP 服务器（归档插件在录制模式下无法枚举）。
 */
//@ chunk-qchp9vrd.js:101446-102879 placement
async function enumeratePluginMcpServers(e) {
  let n = basename(e);
  if (isZipPathCaseInsensitive(e))
    throw new UnenumerablePluginError(
      { dirName: n, reason: "archive" },
      `mocks: plugin ${n} is an archive; record mode cannot enumerate (and so cannot mock or withhold) the MCP servers inside it \u2014 extract it and point the case at the directory, or pass --allow-real-servers to run whatever servers it contains for real`,
      "mocks: plugin is an archive",
    );
  let r;
  try {
    ({ plugin: r } = await createPluginFromPath(
      e,
      `${n}@${INLINE_PLUGIN_MARKETPLACE}`,
      !0,
      n,
      !0,
      void 0,
      void 0,
      { noTelemetry: !0 },
    ));
  } catch (error) {
    throw (
      logForDebugging(`eval mocks: ${n}: manifest does not load: ${errorMessage(error)}`, { level: "error" }),
      new UnenumerablePluginError(
        { dirName: n, reason: "manifest" },
        `mocks: plugin ${n}'s manifest does not load, so the MCP servers it declares cannot be enumerated (record mode needs that list to mock or withhold them) \u2014 fix the manifest, or pass --allow-real-servers to run without enumerating`,
        "mocks: plugin manifest does not load",
      )
    );
  }
  let a = xd(r.manifest.mcpServers);
  if (a.length > 0)
    throw new UnenumerablePluginError(
      { dirName: n, reason: "mcpb" },
      `mocks: plugin ${r.name} declares MCP servers through an MCPB bundle (${a.map(redactUrlQuery).join(", ")}); mocks can only shadow servers declared inline or in .mcp.json, and record mode cannot withhold a server it cannot enumerate \u2014 pass --allow-real-servers to run this plugin's real servers`,
      "mocks: plugin uses MCPB",
    );
  let s = (await loadPluginMcpServersFromSources(r)) ?? {},
    h = new Map();
  for (let w of Object.keys(addPluginScopeToServers_2(s, r.name, r.source, e))) {
    let sliced = w.slice(`plugin:${r.name}:`.length);
    h.set(w, { pluginName: r.name, serverName: sliced });
  }
  return h;
}
/**
 * 为被测插件的 MCP 服务器规划模拟替身，检查工具名冲突。
 */
//@ chunk-qchp9vrd.js:102879-107299 placement
function planMockStandIns(e, n, { allowRealServers: allowRealServers, unenumerable: unenumerable = [] }) {
  let s = new Map(),
    h = new Map();
  for (let [j, { serverName: K }] of n) {
    let X = normalizeNameForMCP(j),
      W = s.get(X);
    if (W !== void 0) {
      if (e.servers.size === 0) continue;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks: the plugins under test declare MCP servers "${W}" and "${j}", whose tool names collide (${X}) \u2014 mocks cannot tell them apart; rename one`,
        "mocks: declared servers collide after normalization",
      );
    }
    s.set(X, j);
    let G = normalizeNameForMCP(K);
    h.set(G, [...(h.get(G) ?? []), j]);
  }
  let w = [];
  for (let [j, K] of e.servers) {
    if (normalizeNameForMCP(j) !== j)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${j}/: name the directory after the server segment of the tool name (letters, digits, "_" and "-" only), e.g. mocks/${normalizeNameForMCP(j)}/`,
        "mocks: directory name not a tool-name segment",
      );
    let X = s.get(j);
    if (X !== void 0) {
      w.push({ kind: "shadow", registeredName: X, segment: j, loaded: K });
      continue;
    }
    let W = h.get(j) ?? [];
    if (W.length > 1) {
      let mapped = W.map((J) => n.get(J)?.pluginName ?? J);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `ambiguous mock server "${j}": declared by plugins ${mapped.join(" and ")} \u2014 rename mocks/${j}/ to ${W.map((J) => `mocks/${normalizeNameForMCP(J)}/`).join(" or ")}`,
        "mocks: ambiguous server name",
      );
    }
    if (W.length === 1) {
      let G = W[0];
      w.push({ kind: "shadow", registeredName: G, segment: normalizeNameForMCP(G), loaded: K });
      continue;
    }
    w.push({ kind: "standalone", registeredName: j, segment: normalizeNameForMCP(j), loaded: K });
  }
  let b = new Set(w.filter((j) => j.kind === "shadow").map((j) => j.registeredName)),
    filtered = w.filter((j) => j.kind === "standalone"),
    filtered_2 = [...n.keys()].filter((j) => !b.has(j)),
    S = [...e.notes];
  if (filtered.length > 0 && filtered_2.length > 0)
    S.push(
      `mocks: ${filtered.map((j) => `mocks/${j.loaded.dirName}/`).join(", ")} ${filtered.length === 1 ? "matches" : "match"} no server the plugins declare, so ${filtered.length === 1 ? "it is" : "they are"} served as standalone \u2014 rename the directory if that was meant to shadow ${filtered_2.map((j) => `"${j}"`).join(" or ")}`,
    );
  if (filtered_2.length > 0) {
    let joined = filtered_2.map((K) => `"${K}"`).join(", ");
    if (allowRealServers)
      S.push(
        `mocks: ${joined} ${filtered_2.length === 1 ? "has" : "have"} no mock \u2014 the plugin's REAL server ${filtered_2.length === 1 ? "process starts" : "processes start"} (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
      );
    else {
      S.push(
        `mocks: ${joined} ${filtered_2.length === 1 ? "has" : "have"} no mock and ${filtered_2.length === 1 ? "is" : "are"} NOT started \u2014 ${filtered_2.length === 1 ? "its" : "their"} tools are unavailable this run; add mocks/<server>/ to mock ${filtered_2.length === 1 ? "it" : "them"}, or pass --allow-real-servers to run the plugin's real ${filtered_2.length === 1 ? "server" : "servers"} (as you, outside the sandbox)`,
      );
      let K = new Set(w.map((X) => X.loaded.dirName));
      for (let X of filtered_2) {
        let W = normalizeNameForMCP(X),
          G = W;
        for (let J = 2; K.has(G); J++) G = `${W}~${J}`;
        (K.add(G),
          w.push({
            kind: "shadow",
            withheld: !0,
            registeredName: X,
            segment: W,
            loaded: { dirName: G, tools: new Map(), listings: new Map(), recordings: {} },
          }));
      }
    }
  }
  for (let j of w) {
    if (j.withheld) continue;
    if (j.loaded.dirName.includes("__"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${j.loaded.dirName}/: "__" is the tool-name separator and cannot appear in a mock directory name`,
        "mocks: __ in directory name",
      );
    for (let K of j.loaded.tools.keys())
      if (K.includes("__"))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${j.loaded.dirName}/${K}.md: "__" is the tool-name separator and cannot appear in a mocked tool name`,
          "mocks: __ in tool name",
        );
  }
  if (unenumerable.length > 0) {
    let found = w.find((K) => K.kind === "standalone" && K.segment.startsWith("plugin_"));
    if (found !== void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${found.loaded.dirName}/ names a plugin-scoped server, but plugin ${unenumerable.map((K) => K.dirName).join(", ")} under test could not be enumerated (--allow-real-servers runs its real servers), so this directory cannot be told apart from one of ITS servers and its tool names would be granted against the real thing \u2014 extract/fix that plugin so it can be enumerated, or rename the directory`,
        "mocks: plugin-scoped standalone mock beside an unenumerable plugin",
      );
  }
  let T = new Set(w.filter((j) => j.kind === "shadow").map((j) => j.registeredName)),
    mapped = [...n.keys()].filter((j) => !T.has(j)).map((j) => `mcp__${normalizeNameForMCP(j)}__`);
  for (let j of w)
    for (let K of j.loaded.tools.keys()) {
      let X = buildMcpToolName(j.registeredName, K);
      if (mapped.find((G) => X.startsWith(G)) !== void 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${j.loaded.dirName}/${K}.md would be served as ${X}, a tool name that belongs to a REAL (unmocked) server the plugins declare \u2014 rename the directory to shadow that server, or the tool`,
          "mocks: minted name collides with a real server",
        );
    }
  let x = new Map();
  for (let j of w) {
    if (j.withheld) continue;
    let K = x.get(j.segment);
    if (K !== void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${K}/ and mocks/${j.loaded.dirName}/ both mock the server "${j.registeredName}" \u2014 keep one`,
        "mocks: two directories for one server",
      );
    x.set(j.segment, j.loaded.dirName);
  }
  return { servers: w, notes: S };
}
//@ chunk-qchp9vrd.js:107299-107385 placement
function xd(e) {
  return (Array.isArray(e) ? e : [e]).filter((r) => typeof r === "string" && isMcpbSource(r));
}
//@ chunk-qchp9vrd.js:107385-107467 placement
function $n(e, n) {
  return n === "without" ? e.filter((r) => r.kind === "standalone") : [...e];
}
/**
 * 判断"无插件"一组是否没有可用的模拟服务器。
 */
//@ chunk-qchp9vrd.js:107467-107575 placement
function isWithoutArmEmpty(e, n) {
  let filtered = e.filter((a) => !a.withheld);
  return n !== void 0 && filtered.length > 0 && $n(filtered, "without").length === 0;
}
//@ chunk-qchp9vrd.js:107575-107643 placement
function La(e) {
  return e.filter((n) => n.withheld).map((n) => n.segment);
}
/**
 * 列出所有模拟 MCP 服务器提供的工具全名。
 */
//@ chunk-qchp9vrd.js:107643-107757 placement
function listMockedToolNames(e) {
  let n = [];
  for (let r of e) for (let a of r.loaded.tools.keys()) n.push(buildMcpToolName(r.registeredName, a));
  return n;
}
//@ chunk-qchp9vrd.js:107757-107798 placement
var MOCKS_JSON_FILE = "mocks.json",
  MOCK_RECORDINGS = "mock-recordings";
/**
 * 生成本次运行的 mocks.json、mock-calls.jsonl 等文件。
 */
//@ chunk-qchp9vrd.js:107798-108700 placement
function buildRunMockFiles(e) {
  let str = randomBytes(6).toString("hex"),
    joined = path_10.join(e.outDir, "mock-calls.jsonl"),
    a = {},
    s = [],
    [h, ...w] = e.selfCommand;
  if (h === void 0) throw Error("buildRunMockFiles: empty selfCommand");
  for (let server of e.servers) {
    let y = server.withheld ? server.loaded.dirName : server.segment,
      joined_2 = path_10.join(e.outDir, "mocks", `${y}.json`),
      S = {
        registeredName: server.registeredName,
        server: server.loaded.dirName,
        nonce: str,
        callLogPath: joined,
        tools: [...server.loaded.tools.keys()].map((N) => getToolListing(N, server.loaded)),
        responders: Object.fromEntries(
          [...server.loaded.tools].map(([N, x]) => [
            N,
            toResponderSpec(x, server.loaded.dirName, server.loaded.recordings),
          ]),
        ),
        agent: e.agent,
      },
      T = jsonStringify({
        ...S,
        responders: xr(S.responders, (N) => {
          if (N.kind !== "agent") return N;
          let { replay: replay, ...j } = N;
          return j;
        }),
      });
    (s.push({ path: joined_2, json: T, spec: S }),
      (a[server.registeredName] = {
        type: "stdio",
        command: h,
        args: [...w, "--eval-mock-server", joined_2, computeContentHash(T)],
        env: e.env,
      }));
  }
  return {
    configPath: path_10.join(e.outDir, MOCKS_JSON_FILE),
    configJson: jsonStringify({ mcpServers: a }),
    stdioConfigs: a,
    specs: s,
    callLogPath: joined,
    nonce: str,
  };
}
//@ chunk-qchp9vrd.js:108700-108819 placement
function getToolListing(e, n) {
  return (
    n.listings.get(e) ?? {
      name: e,
      description: "",
      inputSchema: { type: "object", additionalProperties: !0 },
    }
  );
}
/**
 * 把 MCP 模拟响应定义转换为响应器配置：fixed 直接返回固定内容，agent 带提示词、终止条件与回放目录。
 */
//@ chunk-qchp9vrd.js:108819-109127 placement
function toResponderSpec(e, n, r) {
  switch (e.kind) {
    case "fixed":
      return { kind: "fixed", body: e.body, isError: e.isError, expect: e.expect, baseDir: e.baseDir };
    case "agent":
      return {
        kind: "agent",
        prompt: e.prompt,
        abortWhen: e.abortWhen,
        expect: e.expect,
        baseDir: e.baseDir,
        replay: { mockHash: e.sourceHash, replayDir: $a(e, n), pinned: r[$a(e, n)] ?? {} },
      };
  }
}
/**
 * 列出各模拟服务器中定义了但未在 listings 中列出的工具。
 */
//@ chunk-qchp9vrd.js:109127-109304 placement
function listUnlistedTools(e) {
  let n = [];
  for (let r of e) {
    let filtered = [...r.loaded.tools.keys()].filter((s) => !r.loaded.listings.has(s));
    if (filtered.length > 0) n.push({ server: r.loaded.dirName, tools: filtered });
  }
  return n;
}
//@ chunk-qchp9vrd.js:109304-109396 placement
function Vn(e) {
  return e.some((n) => [...n.loaded.tools.values()].some((r) => r.kind === "agent"));
}
//@ chunk-qchp9vrd.js:109396-109471 placement
function $a(e, n) {
  return path_10.join(path_10.dirname(path_10.dirname(e.sourceFile)), REPLAY_DIR_SUFFIX, n);
}

export {
  enumeratePluginMcpServers,
  planMockStandIns,
  listUnlistedTools,
  $n,
  Vn,
  buildRunMockFiles,
  listMockedToolNames,
  La,
  isWithoutArmEmpty,
  MOCKS_JSON_FILE,
  MOCK_RECORDINGS,
};
