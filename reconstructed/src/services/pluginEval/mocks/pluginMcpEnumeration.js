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
import path, { basename } from "path";
import { randomBytes } from "crypto";
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

//@ chunk-qchp9vrd.js:101446-102879 placement
/**
 * 加载被测插件并列出其 MCP 服务器（归档插件在录制模式下无法枚举）。
 */
async function enumeratePluginMcpServers(pluginPath) {
  let n = basename(pluginPath);
  if (isZipPathCaseInsensitive(pluginPath))
    throw new UnenumerablePluginError(
      {
        dirName: n,
        reason: "archive",
      },
      `mocks: plugin ${n} is an archive; record mode cannot enumerate (and so cannot mock or withhold) the MCP servers inside it \u2014 extract it and point the case at the directory, or pass --allow-real-servers to run whatever servers it contains for real`,
      "mocks: plugin is an archive",
    );
  let r;
  try {
    ({ plugin: r } = await createPluginFromPath(
      pluginPath,
      `${n}@${INLINE_PLUGIN_MARKETPLACE}`,
      true,
      n,
      true,
      undefined,
      undefined,
      {
        noTelemetry: true,
      },
    ));
  } catch (error) {
    logForDebugging(`eval mocks: ${n}: manifest does not load: ${errorMessage(error)}`, {
      level: "error",
    });
    throw new UnenumerablePluginError(
      {
        dirName: n,
        reason: "manifest",
      },
      `mocks: plugin ${n}'s manifest does not load, so the MCP servers it declares cannot be enumerated (record mode needs that list to mock or withhold them) \u2014 fix the manifest, or pass --allow-real-servers to run without enumerating`,
      "mocks: plugin manifest does not load",
    );
  }
  let a = mcpbSources(r.manifest.mcpServers);
  if (a.length > 0)
    throw new UnenumerablePluginError(
      {
        dirName: n,
        reason: "mcpb",
      },
      `mocks: plugin ${r.name} declares MCP servers through an MCPB bundle (${a.map(redactUrlQuery).join(", ")}); mocks can only shadow servers declared inline or in .mcp.json, and record mode cannot withhold a server it cannot enumerate \u2014 pass --allow-real-servers to run this plugin's real servers`,
      "mocks: plugin uses MCPB",
    );
  let servers = (await loadPluginMcpServersFromSources(r)) ?? {};
  let h = new Map();
  for (let key of Object.keys(addPluginScopeToServers_2(servers, r.name, r.source, pluginPath))) {
    let serverName = key.slice(`plugin:${r.name}:`.length);
    h.set(key, {
      pluginName: r.name,
      serverName,
    });
  }
  return h;
}
//@ chunk-qchp9vrd.js:102879-107299 placement
/**
 * 为被测插件的 MCP 服务器规划模拟替身，检查工具名冲突。
 */
function planMockStandIns(mockServers, servers, { allowRealServers, unenumerable = [] }) {
  let s = new Map();
  let h = new Map();
  for (let [j, { serverName: K }] of servers) {
    let X = normalizeNameForMCP(j);
    let W = s.get(X);
    if (W !== undefined) {
      if (mockServers.servers.size === 0) continue;
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
  for (let [j, K] of mockServers.servers) {
    if (normalizeNameForMCP(j) !== j)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${j}/: name the directory after the server segment of the tool name (letters, digits, "_" and "-" only), e.g. mocks/${normalizeNameForMCP(j)}/`,
        "mocks: directory name not a tool-name segment",
      );
    let X = s.get(j);
    if (X !== undefined) {
      w.push({
        kind: "shadow",
        registeredName: X,
        segment: j,
        loaded: K,
      });
      continue;
    }
    let W = h.get(j) ?? [];
    if (W.length > 1) {
      let mapped = W.map((J) => servers.get(J)?.pluginName ?? J);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `ambiguous mock server "${j}": declared by plugins ${mapped.join(" and ")} \u2014 rename mocks/${j}/ to ${W.map((J) => `mocks/${normalizeNameForMCP(J)}/`).join(" or ")}`,
        "mocks: ambiguous server name",
      );
    }
    if (W.length === 1) {
      let G = W[0];
      w.push({
        kind: "shadow",
        registeredName: G,
        segment: normalizeNameForMCP(G),
        loaded: K,
      });
      continue;
    }
    w.push({
      kind: "standalone",
      registeredName: j,
      segment: normalizeNameForMCP(j),
      loaded: K,
    });
  }
  let b = new Set(w.filter((j) => j.kind === "shadow").map((j) => j.registeredName));
  let filtered = w.filter((j) => j.kind === "standalone");
  let filtered_2 = [...servers.keys()].filter((key) => !b.has(key));
  let S = [...mockServers.notes];
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
        let W = normalizeNameForMCP(X);
        let G = W;
        for (let idx = 2; K.has(G); idx++) G = `${W}~${idx}`;
        K.add(G);
        w.push({
          kind: "shadow",
          withheld: true,
          registeredName: X,
          segment: W,
          loaded: {
            dirName: G,
            tools: new Map(),
            listings: new Map(),
            recordings: {},
          },
        });
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
    for (let key of j.loaded.tools.keys())
      if (key.includes("__"))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${j.loaded.dirName}/${key}.md: "__" is the tool-name separator and cannot appear in a mocked tool name`,
          "mocks: __ in tool name",
        );
  }
  if (unenumerable.length > 0) {
    let found = w.find((K) => K.kind === "standalone" && K.segment.startsWith("plugin_"));
    if (found !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${found.loaded.dirName}/ names a plugin-scoped server, but plugin ${unenumerable.map((K) => K.dirName).join(", ")} under test could not be enumerated (--allow-real-servers runs its real servers), so this directory cannot be told apart from one of ITS servers and its tool names would be granted against the real thing \u2014 extract/fix that plugin so it can be enumerated, or rename the directory`,
        "mocks: plugin-scoped standalone mock beside an unenumerable plugin",
      );
  }
  let T = new Set(w.filter((j) => j.kind === "shadow").map((j) => j.registeredName));
  let mapped = [...servers.keys()]
    .filter((key) => !T.has(key))
    .map((key) => `mcp__${normalizeNameForMCP(key)}__`);
  for (let j of w)
    for (let key of j.loaded.tools.keys()) {
      let mcpToolName = buildMcpToolName(j.registeredName, key);
      if (mapped.find((G) => mcpToolName.startsWith(G)) !== undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${j.loaded.dirName}/${key}.md would be served as ${mcpToolName}, a tool name that belongs to a REAL (unmocked) server the plugins declare \u2014 rename the directory to shadow that server, or the tool`,
          "mocks: minted name collides with a real server",
        );
    }
  let x = new Map();
  for (let j of w) {
    if (j.withheld) continue;
    let K = x.get(j.segment);
    if (K !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${K}/ and mocks/${j.loaded.dirName}/ both mock the server "${j.registeredName}" \u2014 keep one`,
        "mocks: two directories for one server",
      );
    x.set(j.segment, j.loaded.dirName);
  }
  return {
    servers: w,
    notes: S,
  };
}
//@ chunk-qchp9vrd.js:107299-107385 placement
/**
 * 从 manifest 里找出 MCP 服务器来源字符串。
 */
function mcpbSources(mcpServers) {
  return (Array.isArray(mcpServers) ? mcpServers : [mcpServers]).filter(
    (r) => typeof r === "string" && isMcpbSource(r),
  );
}
//@ chunk-qchp9vrd.js:107385-107467 placement
/**
 * 按 arm 过滤服务器（without 只保留独立服务器）。
 */
function filterForArm(e, n) {
  return n === "without" ? e.filter((r) => r.kind === "standalone") : [...e];
}
//@ chunk-qchp9vrd.js:107467-107575 placement
/**
 * 判断"无插件"一组是否没有可用的模拟服务器。
 */
function isWithoutArmEmpty(e, n) {
  let filtered = e.filter((a) => !a.withheld);
  return n !== undefined && filtered.length > 0 && filterForArm(filtered, "without").length === 0;
}
//@ chunk-qchp9vrd.js:107575-107643 placement
/**
 * 列出被扣留服务器的段名。
 */
function withheldSegments(e) {
  return e.filter((n) => n.withheld).map((n) => n.segment);
}
//@ chunk-qchp9vrd.js:107643-107757 placement
/**
 * 列出所有模拟 MCP 服务器提供的工具全名。
 */
function listMockedToolNames(e) {
  let n = [];
  for (let r of e) for (let key of r.loaded.tools.keys()) n.push(buildMcpToolName(r.registeredName, key));
  return n;
}
//@ chunk-qchp9vrd.js:107757-107798 placement
var MOCKS_JSON_FILE = "mocks.json";
var MOCK_RECORDINGS = "mock-recordings";
//@ chunk-qchp9vrd.js:107798-108700 placement
/**
 * 生成本次运行的 mocks.json、mock-calls.jsonl 等文件。
 */
function buildRunMockFiles(e) {
  let nonce = randomBytes(6).toString("hex");
  let callLogPath = path.join(e.outDir, "mock-calls.jsonl");
  let a = {};
  let s = [];
  let [h, ...w] = e.selfCommand;
  if (h === undefined) throw Error("buildRunMockFiles: empty selfCommand");
  for (let server of e.servers) {
    let y = server.withheld ? server.loaded.dirName : server.segment;
    let joined = path.join(e.outDir, "mocks", `${y}.json`);
    let S = {
      registeredName: server.registeredName,
      server: server.loaded.dirName,
      nonce,
      callLogPath,
      tools: [...server.loaded.tools.keys()].map((key) => getToolListing(key, server.loaded)),
      responders: Object.fromEntries(
        [...server.loaded.tools].map(([N, x]) => [
          N,
          toResponderSpec(x, server.loaded.dirName, server.loaded.recordings),
        ]),
      ),
      agent: e.agent,
    };
    let T = jsonStringify({
      ...S,
      responders: xr(S.responders, (N) => {
        if (N.kind !== "agent") return N;
        let { replay, ...j } = N;
        return j;
      }),
    });
    s.push({
      path: joined,
      json: T,
      spec: S,
    });
    a[server.registeredName] = {
      type: "stdio",
      command: h,
      args: [...w, "--eval-mock-server", joined, computeContentHash(T)],
      env: e.env,
    };
  }
  return {
    configPath: path.join(e.outDir, MOCKS_JSON_FILE),
    configJson: jsonStringify({
      mcpServers: a,
    }),
    stdioConfigs: a,
    specs: s,
    callLogPath,
    nonce,
  };
}
//@ chunk-qchp9vrd.js:108700-108819 placement
function getToolListing(e, loaded) {
  return (
    loaded.listings.get(e) ?? {
      name: e,
      description: "",
      inputSchema: {
        type: "object",
        additionalProperties: true,
      },
    }
  );
}
//@ chunk-qchp9vrd.js:108819-109127 placement
/**
 * 把 MCP 模拟响应定义转换为响应器配置：fixed 直接返回固定内容，agent 带提示词、终止条件与回放目录。
 */
function toResponderSpec(e, dirName, recordings) {
  switch (e.kind) {
    case "fixed":
      return {
        kind: "fixed",
        body: e.body,
        isError: e.isError,
        expect: e.expect,
        baseDir: e.baseDir,
      };
    case "agent":
      return {
        kind: "agent",
        prompt: e.prompt,
        abortWhen: e.abortWhen,
        expect: e.expect,
        baseDir: e.baseDir,
        replay: {
          mockHash: e.sourceHash,
          replayDir: replayDirFor(e, dirName),
          pinned: recordings[replayDirFor(e, dirName)] ?? {},
        },
      };
  }
}
//@ chunk-qchp9vrd.js:109127-109304 placement
/**
 * 列出各模拟服务器中定义了但未在 listings 中列出的工具。
 */
function listUnlistedTools(e) {
  let n = [];
  for (let r of e) {
    let filtered = [...r.loaded.tools.keys()].filter((key) => !r.loaded.listings.has(key));
    if (filtered.length > 0)
      n.push({
        server: r.loaded.dirName,
        tools: filtered,
      });
  }
  return n;
}
//@ chunk-qchp9vrd.js:109304-109396 placement
/**
 * 判断是否有 agent 类型的应答者。
 */
function usesAgentResponder(e) {
  return e.some((n) => [...n.loaded.tools.values()].some((tool) => tool.kind === "agent"));
}
//@ chunk-qchp9vrd.js:109396-109471 placement
/**
 * 计算某服务器的回放目录路径。
 */
function replayDirFor(e, n) {
  return path.join(path.dirname(path.dirname(e.sourceFile)), REPLAY_DIR_SUFFIX, n);
}
export {
  enumeratePluginMcpServers,
  planMockStandIns,
  listUnlistedTools,
  filterForArm,
  usesAgentResponder,
  buildRunMockFiles,
  listMockedToolNames,
  withheldSegments,
  isWithoutArmEmpty,
  MOCKS_JSON_FILE,
  MOCK_RECORDINGS,
};
