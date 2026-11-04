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
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { REPLAY_DIR_SUFFIX } from "./mockRecordings.js";

//@ chunk-qchp9vrd.js:101446-102879 placement
/**
 * 加载被测插件并列出其 MCP 服务器（归档插件在录制模式下无法枚举）。
 */
async function enumeratePluginMcpServers(pluginPath) {
  let dirName = basename(pluginPath);
  if (isZipPathCaseInsensitive(pluginPath))
    throw new UnenumerablePluginError(
      {
        dirName,
        reason: "archive",
      },
      `mocks: plugin ${dirName} is an archive; record mode cannot enumerate (and so cannot mock or withhold) the MCP servers inside it \u2014 extract it and point the case at the directory, or pass --allow-real-servers to run whatever servers it contains for real`,
      "mocks: plugin is an archive",
    );
  let plugin;
  try {
    ({ plugin } = await createPluginFromPath(
      pluginPath,
      `${dirName}@${INLINE_PLUGIN_MARKETPLACE}`,
      true,
      dirName,
      true,
      undefined,
      undefined,
      {
        noTelemetry: true,
      },
    ));
  } catch (error) {
    logForDebugging(`eval mocks: ${dirName}: manifest does not load: ${errorMessage(error)}`, {
      level: "error",
    });
    throw new UnenumerablePluginError(
      {
        dirName,
        reason: "manifest",
      },
      `mocks: plugin ${dirName}'s manifest does not load, so the MCP servers it declares cannot be enumerated (record mode needs that list to mock or withhold them) \u2014 fix the manifest, or pass --allow-real-servers to run without enumerating`,
      "mocks: plugin manifest does not load",
    );
  }
  let mcpbSourcesList = mcpbSources(plugin.manifest.mcpServers);
  if (mcpbSourcesList.length > 0)
    throw new UnenumerablePluginError(
      {
        dirName,
        reason: "mcpb",
      },
      `mocks: plugin ${plugin.name} declares MCP servers through an MCPB bundle (${mcpbSourcesList.map(redactUrlQuery).join(", ")}); mocks can only shadow servers declared inline or in .mcp.json, and record mode cannot withhold a server it cannot enumerate \u2014 pass --allow-real-servers to run this plugin's real servers`,
      "mocks: plugin uses MCPB",
    );
  let servers = (await loadPluginMcpServersFromSources(plugin)) ?? {};
  let serverMap = new Map();
  for (let key of Object.keys(addPluginScopeToServers_2(servers, plugin.name, plugin.source, pluginPath))) {
    let serverName = key.slice(`plugin:${plugin.name}:`.length);
    serverMap.set(key, {
      pluginName: plugin.name,
      serverName,
    });
  }
  return serverMap;
}
//@ chunk-qchp9vrd.js:102879-107299 placement
/**
 * 为被测插件的 MCP 服务器规划模拟替身，检查工具名冲突。
 */
function planMockStandIns(mockServers, servers, { allowRealServers, unenumerable = [] }) {
  let serverNameByToolPrefix = new Map();
  let keysBySegment = new Map();
  for (let [serverKey, { serverName }] of servers) {
    let toolPrefix = normalizeNameForMCP(serverKey);
    let existingKey = serverNameByToolPrefix.get(toolPrefix);
    if (existingKey !== undefined) {
      if (mockServers.servers.size === 0) continue;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks: the plugins under test declare MCP servers "${existingKey}" and "${serverKey}", whose tool names collide (${toolPrefix}) \u2014 mocks cannot tell them apart; rename one`,
        "mocks: declared servers collide after normalization",
      );
    }
    serverNameByToolPrefix.set(toolPrefix, serverKey);
    let segment = normalizeNameForMCP(serverName);
    keysBySegment.set(segment, [...(keysBySegment.get(segment) ?? []), serverKey]);
  }
  let standIns = [];
  for (let [dirName, loaded] of mockServers.servers) {
    if (normalizeNameForMCP(dirName) !== dirName)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${dirName}/: name the directory after the server segment of the tool name (letters, digits, "_" and "-" only), e.g. mocks/${normalizeNameForMCP(dirName)}/`,
        "mocks: directory name not a tool-name segment",
      );
    let declaredKey = serverNameByToolPrefix.get(dirName);
    if (declaredKey !== undefined) {
      standIns.push({
        kind: "shadow",
        registeredName: declaredKey,
        segment: dirName,
        loaded,
      });
      continue;
    }
    let matchingKeys = keysBySegment.get(dirName) ?? [];
    if (matchingKeys.length > 1) {
      let mapped = matchingKeys.map((serverKey) => servers.get(serverKey)?.pluginName ?? serverKey);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `ambiguous mock server "${dirName}": declared by plugins ${mapped.join(" and ")} \u2014 rename mocks/${dirName}/ to ${matchingKeys.map((serverKey) => `mocks/${normalizeNameForMCP(serverKey)}/`).join(" or ")}`,
        "mocks: ambiguous server name",
      );
    }
    if (matchingKeys.length === 1) {
      let serverKey = matchingKeys[0];
      standIns.push({
        kind: "shadow",
        registeredName: serverKey,
        segment: normalizeNameForMCP(serverKey),
        loaded,
      });
      continue;
    }
    standIns.push({
      kind: "standalone",
      registeredName: dirName,
      segment: normalizeNameForMCP(dirName),
      loaded,
    });
  }
  let shadowedNames = new Set(
    standIns.filter((standIn) => standIn.kind === "shadow").map((standIn) => standIn.registeredName),
  );
  let filtered = standIns.filter((standIn) => standIn.kind === "standalone");
  let filtered_2 = [...servers.keys()].filter((key) => !shadowedNames.has(key));
  let notes = [...mockServers.notes];
  if (filtered.length > 0 && filtered_2.length > 0)
    notes.push(
      `mocks: ${filtered.map((standIn) => `mocks/${standIn.loaded.dirName}/`).join(", ")} ${filtered.length === 1 ? "matches" : "match"} no server the plugins declare, so ${filtered.length === 1 ? "it is" : "they are"} served as standalone \u2014 rename the directory if that was meant to shadow ${filtered_2.map((serverKey) => `"${serverKey}"`).join(" or ")}`,
    );
  if (filtered_2.length > 0) {
    let joined = filtered_2.map((serverKey) => `"${serverKey}"`).join(", ");
    if (allowRealServers)
      notes.push(
        `mocks: ${joined} ${filtered_2.length === 1 ? "has" : "have"} no mock \u2014 the plugin's REAL server ${filtered_2.length === 1 ? "process starts" : "processes start"} (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
      );
    else {
      notes.push(
        `mocks: ${joined} ${filtered_2.length === 1 ? "has" : "have"} no mock and ${filtered_2.length === 1 ? "is" : "are"} NOT started \u2014 ${filtered_2.length === 1 ? "its" : "their"} tools are unavailable this run; add mocks/<server>/ to mock ${filtered_2.length === 1 ? "it" : "them"}, or pass --allow-real-servers to run the plugin's real ${filtered_2.length === 1 ? "server" : "servers"} (as you, outside the sandbox)`,
      );
      let usedDirNames = new Set(standIns.map((standIn) => standIn.loaded.dirName));
      for (let serverKey of filtered_2) {
        let segment = normalizeNameForMCP(serverKey);
        let withheldDirName = segment;
        for (let idx = 2; usedDirNames.has(withheldDirName); idx++) withheldDirName = `${segment}~${idx}`;
        usedDirNames.add(withheldDirName);
        standIns.push({
          kind: "shadow",
          withheld: true,
          registeredName: serverKey,
          segment,
          loaded: {
            dirName: withheldDirName,
            tools: new Map(),
            listings: new Map(),
            recordings: {},
          },
        });
      }
    }
  }
  for (let standIn of standIns) {
    if (standIn.withheld) continue;
    if (standIn.loaded.dirName.includes("__"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${standIn.loaded.dirName}/: "__" is the tool-name separator and cannot appear in a mock directory name`,
        "mocks: __ in directory name",
      );
    for (let key of standIn.loaded.tools.keys())
      if (key.includes("__"))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${standIn.loaded.dirName}/${key}.md: "__" is the tool-name separator and cannot appear in a mocked tool name`,
          "mocks: __ in tool name",
        );
  }
  if (unenumerable.length > 0) {
    let found = standIns.find(
      (pluginScopedStandIn) =>
        pluginScopedStandIn.kind === "standalone" && pluginScopedStandIn.segment.startsWith("plugin_"),
    );
    if (found !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${found.loaded.dirName}/ names a plugin-scoped server, but plugin ${unenumerable.map((plugin) => plugin.dirName).join(", ")} under test could not be enumerated (--allow-real-servers runs its real servers), so this directory cannot be told apart from one of ITS servers and its tool names would be granted against the real thing \u2014 extract/fix that plugin so it can be enumerated, or rename the directory`,
        "mocks: plugin-scoped standalone mock beside an unenumerable plugin",
      );
  }
  let shadowedKeys = new Set(
    standIns.filter((standIn) => standIn.kind === "shadow").map((standIn) => standIn.registeredName),
  );
  let mapped = [...servers.keys()]
    .filter((key) => !shadowedKeys.has(key))
    .map((key) => `mcp__${normalizeNameForMCP(key)}__`);
  for (let standIn of standIns)
    for (let key of standIn.loaded.tools.keys()) {
      let mcpToolName = buildMcpToolName(standIn.registeredName, key);
      if (mapped.find((realPrefix) => mcpToolName.startsWith(realPrefix)) !== undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${standIn.loaded.dirName}/${key}.md would be served as ${mcpToolName}, a tool name that belongs to a REAL (unmocked) server the plugins declare \u2014 rename the directory to shadow that server, or the tool`,
          "mocks: minted name collides with a real server",
        );
    }
  let dirBySegment = new Map();
  for (let standIn of standIns) {
    if (standIn.withheld) continue;
    let existingDir = dirBySegment.get(standIn.segment);
    if (existingDir !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${existingDir}/ and mocks/${standIn.loaded.dirName}/ both mock the server "${standIn.registeredName}" \u2014 keep one`,
        "mocks: two directories for one server",
      );
    dirBySegment.set(standIn.segment, standIn.loaded.dirName);
  }
  return {
    servers: standIns,
    notes,
  };
}
//@ chunk-qchp9vrd.js:107299-107385 placement
/**
 * 从 manifest 里找出 MCP 服务器来源字符串。
 */
function mcpbSources(mcpServers) {
  return (Array.isArray(mcpServers) ? mcpServers : [mcpServers]).filter(
    (source) => typeof source === "string" && isMcpbSource(source),
  );
}
//@ chunk-qchp9vrd.js:107385-107467 placement
/**
 * 按 arm 过滤服务器（without 只保留独立服务器）。
 */
function filterForArm(servers, arm) {
  return arm === "without" ? servers.filter((server) => server.kind === "standalone") : [...servers];
}
//@ chunk-qchp9vrd.js:107467-107575 placement
/**
 * 判断"无插件"一组是否没有可用的模拟服务器。
 */
function isWithoutArmEmpty(servers, arm) {
  let filtered = servers.filter((server) => !server.withheld);
  return arm !== undefined && filtered.length > 0 && filterForArm(filtered, "without").length === 0;
}
//@ chunk-qchp9vrd.js:107575-107643 placement
/**
 * 列出被扣留服务器的段名。
 */
function withheldSegments(servers) {
  return servers.filter((server) => server.withheld).map((server) => server.segment);
}
//@ chunk-qchp9vrd.js:107643-107757 placement
/**
 * 列出所有模拟 MCP 服务器提供的工具全名。
 */
function listMockedToolNames(servers) {
  let names = [];
  for (let server of servers)
    for (let key of server.loaded.tools.keys()) names.push(buildMcpToolName(server.registeredName, key));
  return names;
}
//@ chunk-qchp9vrd.js:107757-107798 placement
var MOCKS_JSON_FILE = "mocks.json";
var MOCK_RECORDINGS = "mock-recordings";
//@ chunk-qchp9vrd.js:107798-108700 placement
/**
 * 生成本次运行的 mocks.json、mock-calls.jsonl 等文件。
 */
function buildRunMockFiles(options) {
  let nonce = randomBytes(6).toString("hex");
  let callLogPath = path.join(options.outDir, "mock-calls.jsonl");
  let stdioConfigs = {};
  let specs = [];
  let [command, ...commandArgs] = options.selfCommand;
  if (command === undefined) throw Error("buildRunMockFiles: empty selfCommand");
  for (let server of options.servers) {
    let fileBaseName = server.withheld ? server.loaded.dirName : server.segment;
    let joined = path.join(options.outDir, "mocks", `${fileBaseName}.json`);
    let spec = {
      registeredName: server.registeredName,
      server: server.loaded.dirName,
      nonce,
      callLogPath,
      tools: [...server.loaded.tools.keys()].map((key) => getToolListing(key, server.loaded)),
      responders: Object.fromEntries(
        [...server.loaded.tools].map(([toolName, responder]) => [
          toolName,
          toResponderSpec(responder, server.loaded.dirName, server.loaded.recordings),
        ]),
      ),
      agent: options.agent,
    };
    let specJson = jsonStringify({
      ...spec,
      responders: import_mapValues(spec.responders, (responderSpec) => {
        if (responderSpec.kind !== "agent") return responderSpec;
        let { replay, ...withoutReplay } = responderSpec;
        return withoutReplay;
      }),
    });
    specs.push({
      path: joined,
      json: specJson,
      spec,
    });
    stdioConfigs[server.registeredName] = {
      type: "stdio",
      command,
      args: [...commandArgs, "--eval-mock-server", joined, computeContentHash(specJson)],
      env: options.env,
    };
  }
  return {
    configPath: path.join(options.outDir, MOCKS_JSON_FILE),
    configJson: jsonStringify({
      mcpServers: stdioConfigs,
    }),
    stdioConfigs,
    specs,
    callLogPath,
    nonce,
  };
}
//@ chunk-qchp9vrd.js:108700-108819 placement
function getToolListing(serverName, loaded) {
  return (
    loaded.listings.get(serverName) ?? {
      name: serverName,
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
function toResponderSpec(responder, serverDirName, recordings) {
  switch (responder.kind) {
    case "fixed":
      return {
        kind: "fixed",
        body: responder.body,
        isError: responder.isError,
        expect: responder.expect,
        baseDir: responder.baseDir,
      };
    case "agent":
      return {
        kind: "agent",
        prompt: responder.prompt,
        abortWhen: responder.abortWhen,
        expect: responder.expect,
        baseDir: responder.baseDir,
        replay: {
          mockHash: responder.sourceHash,
          replayDir: replayDirFor(responder, serverDirName),
          pinned: recordings[replayDirFor(responder, serverDirName)] ?? {},
        },
      };
  }
}
//@ chunk-qchp9vrd.js:109127-109304 placement
/**
 * 列出各模拟服务器中定义了但未在 listings 中列出的工具。
 */
function listUnlistedTools(servers) {
  let unlisted = [];
  for (let server of servers) {
    let filtered = [...server.loaded.tools.keys()].filter((key) => !server.loaded.listings.has(key));
    if (filtered.length > 0)
      unlisted.push({
        server: server.loaded.dirName,
        tools: filtered,
      });
  }
  return unlisted;
}
//@ chunk-qchp9vrd.js:109304-109396 placement
/**
 * 判断是否有 agent 类型的应答者。
 */
function usesAgentResponder(servers) {
  return servers.some((server) => [...server.loaded.tools.values()].some((tool) => tool.kind === "agent"));
}
//@ chunk-qchp9vrd.js:109396-109471 placement
/**
 * 计算某服务器的回放目录路径。
 */
function replayDirFor(responder, serverDirName) {
  return path.join(path.dirname(path.dirname(responder.sourceFile)), REPLAY_DIR_SUFFIX, serverDirName);
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
