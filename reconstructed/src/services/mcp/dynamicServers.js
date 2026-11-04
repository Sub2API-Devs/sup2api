/**
 * services/mcp/dynamicServers.ts
 *
 * 动态 MCP 服务器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zfhed5fp.js (2)
 * attribution: placement 2
 */
import { ToolPermissionValueSchema, foldRequestTimeout } from "./types.js";
import { copyCcrMarks } from "../analytics/metadata.js";

//@ chunk-zfhed5fp.js:269-533 placement
function orgToolPermissions(tools) {
  if (!tools?.length) return;
  let permissions = Object.create(null);
  for (let tool of tools) {
    if (!tool.org_max_permission || tool.org_max_permission === "allow") continue;
    let parsed = ToolPermissionValueSchema().safeParse(tool.org_max_permission);
    permissions[tool.name] = parsed.success ? parsed.data : "blocked";
  }
  return Object.keys(permissions).length > 0 ? permissions : undefined;
}
//@ chunk-zfhed5fp.js:533-724 placement
/**
 * 把 SDK 提供的服务器配置转换为动态作用域配置（http/sse 合并请求超时与工具权限），保留 CCR 标记。
 */
function toDynamicServerConfig(config) {
  let dynamicConfig;
  if (config.type === "http" || config.type === "sse") {
    let { tools, ...rest } = config;
    let folded = foldRequestTimeout(rest);
    let toolPermissions = orgToolPermissions(tools);
    dynamicConfig = {
      ...folded,
      ...(toolPermissions && {
        toolPermissions,
      }),
      scope: "dynamic",
    };
  } else
    dynamicConfig = {
      ...config,
      scope: "dynamic",
    };
  return copyCcrMarks(config, dynamicConfig);
}
export { toDynamicServerConfig };
