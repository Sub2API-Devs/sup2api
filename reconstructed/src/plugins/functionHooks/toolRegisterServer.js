/**
 * plugins/functionHooks/toolRegisterServer.ts
 *
 * 2.1.316 新增：插件注册工具的内部 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
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

//@ chunk-e6aww6q8.js:4157619-4157718 placement
/**
 * 附 alwaysLoad 元信息
 */
function alwaysLoadMeta(e) {
  return e.isDeferred === undefined
    ? {}
    : {
        _meta: {
          "anthropic/alwaysLoad": e.isDeferred === false,
        },
      };
}
//@ chunk-e6aww6q8.js:4157718-4158475 placement
/**
 * 为插件经 $.tool.register 注册的工具创建内部 MCP 服务器。
 */
async function createPluginToolsServer(e, n) {
  let [{ Server: r }, { CallToolRequestSchema: s, ListToolsRequestSchema: h }] = await Promise.all([
    import("./chunk-j8ekdm69.js"),
    import("./chunk-5yf1tzb2.js"),
  ]);
  let y = pluginDisplayKey(e, pluginStorageIdOf(e));
  let S = new r(
    {
      name: e,
      version: `plugin-tools-${n}`,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: `Tools registered by the ${e} plugin through $.tool.register.`,
    },
  );
  S.setRequestHandler(h, () => ({
    tools: list(e).map((w) => ({
      name: w.name,
      description: w.description,
      inputSchema: {
        ...w.inputSchema,
        type: "object",
      },
      ...alwaysLoadMeta(w),
    })),
  }));
  S.setRequestHandler(s, (w) => ({
    isError: true,
    content: [
      {
        type: "text",
        text: `${e} registered the tool ${w.params.name} but no tool.call hook answered this call: add on("tool.call", { tool: "mcp__${y}__${w.params.name}" }, ($, e) => ({ result: ... })) to the plugin.`,
      },
    ],
  }));
  return S;
}
//@ chunk-e6aww6q8.js:4158475-4158517 placement
/**
 * 惰性 MCP SDK
 */
var lazyMcpSdkModule = () => import("./chunk-fnpxnq1a.js");
//@ chunk-e6aww6q8.js:4158517-4158991 placement
/**
 * 本地回环 MCP 服务器的请求处理：校验密钥与插件名，只接受 POST，为插件工具建立无状态 HTTP 传输。
 */
async function handlePluginToolsRequest(e, n, r) {
  let [, s = "", h = ""] = new URL(e.url).pathname.split("/");
  let y = decodeUriOrUndefined(h);
  let S = y === undefined ? undefined : r.get(y);
  if (s !== n.secret || y === undefined || S === undefined)
    return new Response("not found", {
      status: HTTP_NOT_FOUND,
    });
  if (e.method !== "POST")
    return new Response("method not allowed", {
      status: HTTP_METHOD_NOT_ALLOWED,
      headers: {
        Allow: "POST",
      },
    });
  let L = new (await lazyMcpSdkModule()).WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await (await createPluginToolsServer(y, S)).connect(L);
  return L.handleRequest(e);
}
//@ chunk-e6aww6q8.js:4158991-4159179 placement
var pluginToolsServerConfig = (e) => ({
  key: pluginDisplayKey(e.pluginName, pluginStorageIdOf(e.pluginName)),
  config: {
    type: "http",
    url: `http://127.0.0.1:${e.port}/${e.secret}/${encodeURIComponent(e.pluginName)}?v=${e.version}`,
    scope: "dynamic",
  },
});
//@ chunk-e6aww6q8.js:4159179-4159677 placement
/**
 * 懒启动 127.0.0.1 上的回环 MCP 服务器（随机密钥），为每个插件生成带版本号的 http MCP 配置。
 */
function createPluginToolsServerHost() {
  let e = new Map();
  let n;
  function r() {
    if (!n) {
      let s = {
        port: 0,
        secret: randomUUID(),
      };
      let h = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch: (y) => handlePluginToolsRequest(y, s, e),
      });
      h.unref();
      registerCleanup(() => h.stop(true));
      s.port = h.port ?? 0;
      n = s;
      logForDebugging(`$.tool.register: loopback MCP server listening on 127.0.0.1:${n.port}`);
    }
    return n;
  }
  return (s, h) => {
    let y = (e.get(s) ?? 0) + 1;
    e.set(s, y);
    let { port, secret } = r();
    logForDebugging(
      `$.tool.register (${s}): ${h.length} tool(s) served at 127.0.0.1:${port}/<secret>/${s} v${y}`,
    );
    return pluginToolsServerConfig({
      pluginName: s,
      port,
      secret,
      version: y,
    });
  };
}
//@ chunk-e6aww6q8.js:4159677-4159719 placement
/**
 * 安装插件工具服务器
 */
function installPluginToolsServer() {
  if (currentToolCall()) return;
  setCurrentToolCall(createPluginToolsServerHost());
}
//@ chunk-e6aww6q8.js:4159719-4159877 placement
/**
 * 为开发中的插件写出类型根目录（读取一次工具类型后并行写）。
 */
function writeAllTypeRoots(e, n) {
  watchedPluginRecords.set(n);
  let r = filterWatchedTypeRoots(e);
  return r.length === 0
    ? Promise.resolve()
    : pluginDirQueue(async () => {
        let tools = await readToolTypes(false);
        await Promise.all(r.map((y) => writePluginTypeRoot(y, n, tools)));
      });
}
export { installPluginToolsServer, writeAllTypeRoots };
