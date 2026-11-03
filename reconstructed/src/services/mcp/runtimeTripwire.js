/**
 * services/mcp/runtimeTripwire.ts
 *
 * 2.1.316 新增：MCP 运行时绊线检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-asne9cp8.js (12)
 * attribution: placement 12
 */
import { claimOnce } from "../api/verificationRequired.js";
import { registerPreFlushTask } from "../analytics/flushSinks.js";
import { logEventAsync } from "../analytics/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";

/**
 * 上报 MCP 运行时模块不一致的绊线事件（只报一次）。
 */
//@ chunk-asne9cp8.js:3397-3561 placement
function emitTripwireEvent(t, e) {
  if (!claimOnce().claim("mcp_tree_id_tripwire")) return;
  registerPreFlushTask(
    logEventAsync("tengu_mcp_tripwire", {
      expected: fromEnum(t),
      loaded: e === "v1" || e === "v2" ? fromEnum(e) : lit("other"),
    }).catch(() => {}),
  );
}
/**
 * 按选定的 MCP SDK 代加载客户端模块，并校验模块的 MCP_TREE_ID 一致，否则上报并抛错。
 */
//@ chunk-asne9cp8.js:3561-4020 placement
function mcpClientModule() {
  if (mcpSdkGeneration() === "v2") {
    let i = require("./chunk-8t8n4kdh.js"),
      MCP_TREE_ID = i.MCP_TREE_ID;
    if (MCP_TREE_ID !== "v2")
      throw (
        emitTripwireEvent("v2", MCP_TREE_ID),
        Error(
          "MCP runtime accessor tripwire: resolved generation is v2 but the loaded client module does not carry MCP_TREE_ID v2",
        )
      );
    return i;
  }
  let t = require("./chunk-z1n5m6nf.js"),
    MCP_TREE_ID = t.MCP_TREE_ID;
  if (MCP_TREE_ID !== "v1")
    throw (
      emitTripwireEvent("v1", MCP_TREE_ID),
      Error(
        "MCP runtime accessor tripwire: resolved generation is v1 but the loaded client module does not carry MCP_TREE_ID v1",
      )
    );
  return t;
}
//@ chunk-asne9cp8.js:4020-4064 placement
function d() {
  require("./chunk-8t8n4kdh.js");
}
//@ chunk-asne9cp8.js:4064-4162 placement
function l() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-8t8n4kdh.js").createSep2663TaskBinding;
  return;
}
/**
 * 按 MCP SDK 代加载 auth 模块。
 */
//@ chunk-asne9cp8.js:4162-4266 placement
function mcpAuthModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-gd209zbg.js");
  return require("./chunk-55dg2z4b.js");
}
/**
 * 按 MCP SDK 代加载 elicitation 处理模块。
 */
//@ chunk-asne9cp8.js:4266-4370 placement
function mcpElicitationHandlerModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-968r0ad8.js");
  return require("./chunk-9eg5v1mn.js");
}
/**
 * 按 MCP SDK 代加载任务监视/持久化模块。
 */
//@ chunk-asne9cp8.js:4370-4474 placement
function mcpTaskWatcherModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-mzh22y2k.js");
  return require("./chunk-ta5f9qat.js");
}
/**
 * 按 MCP SDK 代加载 SDK 错误分类模块。
 */
//@ chunk-asne9cp8.js:4474-4578 placement
function mcpSdkErrorClassificationModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-72dd9akm.js");
  return require("./chunk-7mmyrw4c.js");
}
/**
 * 按 MCP SDK 代加载目录读取模块。
 */
//@ chunk-asne9cp8.js:4578-4682 placement
function mcpDirectoryReadModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-gnpzvx0v.js");
  return require("./chunk-fvsx0r1g.js");
}
/**
 * 按 MCP SDK 代加载列表认证错误判断模块。
 */
//@ chunk-asne9cp8.js:4682-4786 placement
function mcpIsListAuthErrorModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-897p95zd.js");
  return require("./chunk-vemwr29q.js");
}
/**
 * 按 MCP SDK 代加载 XAA IdP 登录模块。
 */
//@ chunk-asne9cp8.js:4786-4890 placement
function mcpXaaIdpLoginModule() {
  if (mcpSdkGeneration() === "v2") return require("./chunk-nrr98dmh.js");
  return require("./chunk-jtwmzy5e.js");
}
//@ chunk-asne9cp8.js:4890-4941 placement
function h() {
  return require("./chunk-4xrxmwxg.js");
}
