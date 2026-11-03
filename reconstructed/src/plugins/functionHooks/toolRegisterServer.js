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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { JC } from "./commandHooks.js";
import { list, Iyt, Hto } from "./mcpServerHooks.js";
import { kWn, wWn, bWn, kre, Wjn } from "./devModsWatch.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logForDebugging } from "../../utils/debug.js";
import { Cre, readToolTypes, writePluginTypeRoot } from "./typeRoots.js";

//@ chunk-e6aww6q8.js:4157619-4157718 placement
function TWn(e) {
  return e.isDeferred === void 0 ? {} : { _meta: { "anthropic/alwaysLoad": e.isDeferred === !1 } };
}
/**
 * 为插件经 $.tool.register 注册的工具创建内部 MCP 服务器。
 */
//@ chunk-e6aww6q8.js:4157718-4158475 placement
async function createPluginToolsServer(e, n) {
  let [{ Server: r }, { CallToolRequestSchema: s, ListToolsRequestSchema: h }] = await Promise.all([
      import("./chunk-j8ekdm69.js"),
      import("./chunk-5yf1tzb2.js"),
    ]),
    y = pluginDisplayKey(e, JC(e)),
    S = new r(
      { name: e, version: `plugin-tools-${n}` },
      {
        capabilities: { tools: {} },
        instructions: `Tools registered by the ${e} plugin through $.tool.register.`,
      },
    );
  return (
    S.setRequestHandler(h, () => ({
      tools: list(e).map((w) => ({
        name: w.name,
        description: w.description,
        inputSchema: { ...w.inputSchema, type: "object" },
        ...TWn(w),
      })),
    })),
    S.setRequestHandler(s, (w) => ({
      isError: !0,
      content: [
        {
          type: "text",
          text: `${e} registered the tool ${w.params.name} but no tool.call hook answered this call: add on("tool.call", { tool: "mcp__${y}__${w.params.name}" }, ($, e) => ({ result: ... })) to the plugin.`,
        },
      ],
    })),
    S
  );
}
//@ chunk-e6aww6q8.js:4158475-4158517 placement
var Bps = () => import("./chunk-fnpxnq1a.js");
/**
 * 本地回环 MCP 服务器的请求处理：校验密钥与插件名，只接受 POST，为插件工具建立无状态 HTTP 传输。
 */
//@ chunk-e6aww6q8.js:4158517-4158991 placement
async function handlePluginToolsRequest(e, n, r) {
  let [, s = "", h = ""] = new URL(e.url).pathname.split("/"),
    y = kWn(h),
    S = y === void 0 ? void 0 : r.get(y);
  if (s !== n.secret || y === void 0 || S === void 0) return new Response("not found", { status: wWn });
  if (e.method !== "POST")
    return new Response("method not allowed", { status: bWn, headers: { Allow: "POST" } });
  let L = new (await Bps()).WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: void 0,
    enableJsonResponse: !0,
  });
  return (await (await createPluginToolsServer(y, S)).connect(L), L.handleRequest(e));
}
//@ chunk-e6aww6q8.js:4158991-4159179 placement
var pluginToolsServerConfig = (e) => ({
  key: pluginDisplayKey(e.pluginName, JC(e.pluginName)),
  config: {
    type: "http",
    url: `http://127.0.0.1:${e.port}/${e.secret}/${encodeURIComponent(e.pluginName)}?v=${e.version}`,
    scope: "dynamic",
  },
});
/**
 * 懒启动 127.0.0.1 上的回环 MCP 服务器（随机密钥），为每个插件生成带版本号的 http MCP 配置。
 */
//@ chunk-e6aww6q8.js:4159179-4159677 placement
function createPluginToolsServerHost() {
  let e = new Map(),
    n;
  function r() {
    if (!n) {
      let s = { port: 0, secret: randomUUID_49() },
        serve = Bun.serve({
          hostname: "127.0.0.1",
          port: 0,
          fetch: (y) => handlePluginToolsRequest(y, s, e),
        });
      (serve.unref(),
        registerCleanup(() => serve.stop(!0)),
        (s.port = serve.port ?? 0),
        (n = s),
        logForDebugging(`$.tool.register: loopback MCP server listening on 127.0.0.1:${n.port}`));
    }
    return n;
  }
  return (s, h) => {
    let y = (e.get(s) ?? 0) + 1;
    e.set(s, y);
    let { port: port, secret: secret } = r();
    return (
      logForDebugging(
        `$.tool.register (${s}): ${h.length} tool(s) served at 127.0.0.1:${port}/<secret>/${s} v${y}`,
      ),
      pluginToolsServerConfig({ pluginName: s, port: port, secret: secret, version: y })
    );
  };
}
//@ chunk-e6aww6q8.js:4159677-4159719 placement
function zps() {
  if (Iyt()) return;
  Hto(createPluginToolsServerHost());
}
/**
 * 为开发中的插件写出类型根目录（读取一次工具类型后并行写）。
 */
//@ chunk-e6aww6q8.js:4159719-4159877 placement
function writeAllTypeRoots(e, n) {
  kre.set(n);
  let r = Cre(e);
  return r.length === 0
    ? Promise.resolve()
    : Wjn(async () => {
        let h = await readToolTypes(!1);
        await Promise.all(r.map((y) => writePluginTypeRoot(y, n, h)));
      });
}

export { zps, writeAllTypeRoots };
