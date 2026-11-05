/**
 * plugins/functionHooks/toolRegisterServer.ts
 *
 * 2.1.316 新增：插件注册工具的内部 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 */
import { timingSafeEqual, randomUUID } from "crypto";
import { pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { pluginStorageIdOf } from "./commandHooks.js";
import { list, currentToolCall, setCurrentToolCall } from "./mcpServerHooks.js";
import {
  decodeUriOrUndefined,
  HTTP_NOT_FOUND,
  HTTP_METHOD_NOT_ALLOWED,
  watchedPluginRecords,
  pluginDirQueue,
} from "./devModsWatch.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logForDebugging } from "../../utils/debug.js";
import { filterWatchedTypeRoots, readToolTypes, writePluginTypeRoot } from "./typeRoots.js";

//@ chunk-5xgkngpb.js:4263731-4263830 placement
/**
 * 附 alwaysLoad 元信息
 */
function alwaysLoadMeta(tool) {
  return tool.isDeferred === undefined
    ? {}
    : {
        _meta: {
          "anthropic/alwaysLoad": tool.isDeferred === false,
        },
      };
}
//@ chunk-5xgkngpb.js:4263830-4264587 placement
/**
 * 为插件经 $.tool.register 注册的工具创建内部 MCP 服务器。
 */
async function createPluginToolsServer(pluginName, generation) {
  let [{ Server }, { CallToolRequestSchema, ListToolsRequestSchema }] = await Promise.all([
    import("../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js"),
    import("../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js"),
  ]);
  let displayKey = pluginDisplayKey(pluginName, pluginStorageIdOf(pluginName));
  let server = new Server(
    {
      name: pluginName,
      version: `plugin-tools-${generation}`,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: `Tools registered by the ${pluginName} plugin through $.tool.register.`,
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: list(pluginName).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        ...tool.inputSchema,
        type: "object",
      },
      ...alwaysLoadMeta(tool),
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, (request) => ({
    isError: true,
    content: [
      {
        type: "text",
        text: `${pluginName} registered the tool ${request.params.name} but no tool.call hook answered this call: add on("tool.call", { tool: "mcp__${displayKey}__${request.params.name}" }, ($, e) => ({ result: ... })) to the plugin.`,
      },
    ],
  }));
  return server;
}
//@ chunk-5xgkngpb.js:4264587-4264629 placement
/**
 * 惰性 MCP SDK
 */
var lazyMcpSdkModule = () =>
  import("../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.js");
//@ chunk-5xgkngpb.js:4264629-4265210 placement
/**
 * 本地回环 MCP 服务器的请求处理：校验密钥与插件名，只接受 POST，为插件工具建立无状态 HTTP 传输。
 */
async function handlePluginToolsRequest(request, config, registrations) {
  let [, pluginPart = ""] = new URL(request.url).pathname.split("/");
  let pluginName = decodeUriOrUndefined(pluginPart);
  let generation = pluginName === undefined ? undefined : registrations.get(pluginName);
  let buffer = Buffer.from(request.headers.get("authorization") ?? "");
  let buffer_2 = Buffer.from(`Bearer ${config.secret}`);
  if (
    buffer.byteLength !== buffer_2.byteLength ||
    !timingSafeEqual(buffer, buffer_2) ||
    pluginName === undefined ||
    generation === undefined
  )
    return new Response("not found", {
      status: HTTP_NOT_FOUND,
    });
  if (request.method !== "POST")
    return new Response("method not allowed", {
      status: HTTP_METHOD_NOT_ALLOWED,
      headers: {
        Allow: "POST",
      },
    });
  let transport = new (await lazyMcpSdkModule()).WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await (await createPluginToolsServer(pluginName, generation)).connect(transport);
  return transport.handleRequest(request);
}
//@ chunk-5xgkngpb.js:4265210-4265431 placement
var pluginToolsServerConfig = (args) => ({
  key: pluginDisplayKey(args.pluginName, pluginStorageIdOf(args.pluginName)),
  config: {
    type: "http",
    url: `http://127.0.0.1:${args.port}/${encodeURIComponent(args.pluginName)}?v=${args.version}`,
    headers: {
      Authorization: `Bearer ${args.secret}`,
    },
    scope: "dynamic",
  },
});
//@ chunk-5xgkngpb.js:4265431-4266014 placement
/**
 * 懒启动 127.0.0.1 上的回环 MCP 服务器（随机密钥），为每个插件生成带版本号的 http MCP 配置。
 */
function createPluginToolsServerHost() {
  let versionsByPlugin = new Map();
  let server;
  function ensureServer() {
    if (!server) {
      let config = {
        port: 0,
        secret: randomUUID(),
      };
      let started = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch: (request) => handlePluginToolsRequest(request, config, versionsByPlugin),
      });
      started.unref();
      registerCleanup(() => started.stop(true));
      config.port = started.port ?? 0;
      server = config;
      logForDebugging(`$.tool.register: loopback MCP server listening on 127.0.0.1:${server.port}`);
    }
    return server;
  }
  return Object.assign(
    (pluginName, tools) => {
      let version = (versionsByPlugin.get(pluginName) ?? 0) + 1;
      versionsByPlugin.set(pluginName, version);
      let { port, secret } = ensureServer();
      logForDebugging(
        `$.tool.register (${pluginName}): ${tools.length} tool(s) served at 127.0.0.1:${port}/${pluginName} v${version}`,
      );
      return pluginToolsServerConfig({
        pluginName,
        port,
        secret,
        version,
      });
    },
    {
      serves: (originName) =>
        server !== undefined && URL.parse(originName)?.origin === `http://127.0.0.1:${server.port}`,
    },
  );
}
//@ chunk-5xgkngpb.js:4266014-4266056 placement
/**
 * 安装插件工具服务器
 */
function installPluginToolsServer() {
  if (currentToolCall()) return;
  setCurrentToolCall(createPluginToolsServerHost());
}
//@ chunk-5xgkngpb.js:4266056-4266214 placement
/**
 * 为开发中的插件写出类型根目录（读取一次工具类型后并行写）。
 */
function writeAllTypeRoots(plugins, version) {
  watchedPluginRecords.set(version);
  let targets = filterWatchedTypeRoots(plugins);
  return targets.length === 0
    ? Promise.resolve()
    : pluginDirQueue(async () => {
        let tools = await readToolTypes(false);
        await Promise.all(targets.map((plugin) => writePluginTypeRoot(plugin, version, tools)));
      });
}
export { installPluginToolsServer, writeAllTypeRoots };
