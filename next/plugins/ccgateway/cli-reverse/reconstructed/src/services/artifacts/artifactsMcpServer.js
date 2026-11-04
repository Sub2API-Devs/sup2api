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
import { posixPathToWindowsPath } from "../../utils/path.js";

//@ chunk-hvmwwjxr.js:462-551 placement = getTeammateCommand (1)
/**
 * 再启动自身的 argv 前缀：[execPath, argv[1]?]。
 */
function getSelfExecArgv() {
  let headerMap = [process.execPath];
  let script = process.argv[1];
  if (!isStandaloneExecutable() && script) headerMap.push(script);
  return headerMap;
}
//@ chunk-hvmwwjxr.js:551-757 placement
/**
 * 评测用 Artifacts MCP 服务的参数：发布类与读取类工具名清单、路径通配符正则。
 */
var EVAL_ARTIFACTS_SERVER_FLAG = "--eval-artifacts-server";
var PUBLISH_TOOL_NAMES = ["publish_version", "edit_version", "publish_files", "create_from_type"];
var READ_TOOL_NAMES = [
  "guide",
  "get_artifact",
  "read_artifact",
  "list_artifacts",
  "list_files",
  "read_file",
  "list_types",
];
//@ chunk-hvmwwjxr.js:757-801 placement
/**
 * 导出函数 `mcpToolNames`：参数 r，返回 r.map((o) => buildMcpToolName(CLAUDE_ARTIFACTS, o))。
 */
function mcpToolNames(names) {
  return names.map((name) => buildMcpToolName(CLAUDE_ARTIFACTS, name));
}
//@ chunk-hvmwwjxr.js:801-816 placement
var GLOB_CHARS_RE = /[*?[{]/;
//@ chunk-hvmwwjxr.js:816-1154 placement
/**
 * 求评测用 Artifacts MCP 服务可读的根目录：基础目录加上命令行 --allowedTools 里 Read(//绝对路径/**) 规则的路径（规范化、去尾斜杠，Windows 下转换）。
 */
function getEvalReadRoots(originalCwd, toolPermissionContext) {
  let flattened = (toolPermissionContext.alwaysAllowRules.cliArg ?? []).flatMap((dirs) => {
    let { toolName, ruleContent } = permissionRuleValueFromString(dirs);
    return toolName === FILE_READ_TOOL_NAME && ruleContent?.startsWith("//") === true
      ? [ruleContent.slice(1).replace(/\/\*\*$/, "")]
      : [];
  });
  return [
    originalCwd,
    ...flattened
      .filter((dir) => !GLOB_CHARS_RE.test(dir))
      .map((dir) => path.posix.normalize(dir).replace(/\/+$/, ""))
      .filter((dir) => dir !== "" && dir !== ".")
      .map((dir) => (getPlatform() === "windows" ? posixPathToWindowsPath(dir) : dir)),
  ];
}
//@ chunk-hvmwwjxr.js:1154-1266 placement = getServerCommandArray (0.769)
function buildSelfStdioServerConfig(stubDir, evalReadRoots) {
  let [execPath = process.execPath, ...rest] = getSelfExecArgv();
  return {
    type: "stdio",
    command: execPath,
    args: [...rest, EVAL_ARTIFACTS_SERVER_FLAG, stubDir, ...evalReadRoots],
    env: {},
  };
}
export {
  buildSelfStdioServerConfig,
  getEvalReadRoots,
  mcpToolNames,
  PUBLISH_TOOL_NAMES,
  READ_TOOL_NAMES,
  getSelfExecArgv,
};
