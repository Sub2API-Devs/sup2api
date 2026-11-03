/**
 * services/artifacts/artifactsMcpServer.ts
 *
 * 评测用 Artifacts MCP 服务（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hvmwwjxr.js (6)
 * attribution: placement 6
 */
import path from "path";
import { isStandaloneExecutable } from "../../utils/slowOperations.js";
import { buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { getPlatform } from "../../utils/platform.js";
import { B8 } from "../../utils/path.js";

/**
 * 再启动自身的 argv 前缀：[execPath, argv[1]?]。
 */
//@ chunk-hvmwwjxr.js:462-551 placement = getTeammateCommand (1)
function getSelfExecArgv() {
  let r = [process.execPath],
    o = process.argv[1];
  if (!isStandaloneExecutable() && o) r.push(o);
  return r;
}
//@ chunk-hvmwwjxr.js:551-757 placement
var EVAL_ARTIFACTS_SERVER_FLAG = "--eval-artifacts-server",
  Eun = ["publish_version", "edit_version", "publish_files", "create_from_type"],
  dKs = ["guide", "get_artifact", "read_artifact", "list_artifacts", "list_files", "read_file", "list_types"];
//@ chunk-hvmwwjxr.js:757-801 placement
function vun(r) {
  return r.map((o) => buildMcpToolName(CLAUDE_ARTIFACTS, o));
}
//@ chunk-hvmwwjxr.js:801-816 placement
var p = /[*?[{]/;
/**
 * 求评测用 Artifacts MCP 服务可读的根目录：基础目录加上命令行 --allowedTools 里 Read(//绝对路径/**) 规则的路径（规范化、去尾斜杠，Windows 下转换）。
 */
//@ chunk-hvmwwjxr.js:816-1154 placement
function getEvalReadRoots(r, o) {
  let flattened = (o.alwaysAllowRules.cliArg ?? []).flatMap((t) => {
    let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(t);
    return toolName === FILE_READ_TOOL_NAME && ruleContent?.startsWith("//") === !0
      ? [ruleContent.slice(1).replace(/\/\*\*$/, "")]
      : [];
  });
  return [
    r,
    ...flattened
      .filter((t) => !p.test(t))
      .map((t) => path.posix.normalize(t).replace(/\/+$/, ""))
      .filter((t) => t !== "" && t !== ".")
      .map((t) => (getPlatform() === "windows" ? B8(t) : t)),
  ];
}
//@ chunk-hvmwwjxr.js:1154-1266 placement = getServerCommandArray (0.769)
function buildSelfStdioServerConfig(r, o) {
  let [e = process.execPath, ...t] = getSelfExecArgv();
  return { type: "stdio", command: e, args: [...t, EVAL_ARTIFACTS_SERVER_FLAG, r, ...o], env: {} };
}

export { buildSelfStdioServerConfig, getEvalReadRoots, vun, Eun, dKs, getSelfExecArgv };
