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
  let o = Object.create(null);
  for (let r of tools) {
    if (!r.org_max_permission || r.org_max_permission === "allow") continue;
    let s = ToolPermissionValueSchema().safeParse(r.org_max_permission);
    o[r.name] = s.success ? s.data : "blocked";
  }
  return Object.keys(o).length > 0 ? o : undefined;
}
//@ chunk-zfhed5fp.js:533-724 placement
/**
 * 把 SDK 提供的服务器配置转换为动态作用域配置（http/sse 合并请求超时与工具权限），保留 CCR 标记。
 */
function toDynamicServerConfig(e) {
  let o;
  if (e.type === "http" || e.type === "sse") {
    let { tools, ...s } = e;
    let i = foldRequestTimeout(s);
    let n = orgToolPermissions(tools);
    o = {
      ...i,
      ...(n && {
        toolPermissions: n,
      }),
      scope: "dynamic",
    };
  } else
    o = {
      ...e,
      scope: "dynamic",
    };
  return copyCcrMarks(e, o);
}
export { toDynamicServerConfig };
