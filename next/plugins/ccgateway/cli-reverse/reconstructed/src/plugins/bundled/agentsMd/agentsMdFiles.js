/**
 * plugins/bundled/agentsMd/agentsMdFiles.ts
 *
 * 2.1.316 新增：按路径和内容去重说明文件；把 AGENTS.md 文件按目录插入说明文件列表等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b60e6mnx.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { rootIncludeAncestor } from "./index.js";
import { MCP_SETTINGS_SCOPE_KINDS } from "../../../services/mcp/headersHelper.js";
import { runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-b60e6mnx.js:476-616 placement
/**
 * 把项目说明文件分块展开为带 parent 的列表。
 */
var flattenProjectInstructionParts = (sources) =>
  sources.flatMap((source) =>
    source.parts.map((part, partIndex) => ({
      path: part.path,
      kind: "project",
      content: part.content,
      ...(partIndex > 0 && {
        parent: source.parts[0]?.path ?? part.path,
      }),
    })),
  );
//@ chunk-b60e6mnx.js:616-819 placement
/**
 * 解析路径：~ 展开为家目录，绝对路径原样，其余拼到基目录下。
 */
function resolveIncludePath(path, cwd, home) {
  if ((path === "~" || path.startsWith("~/")) && home !== undefined) {
    let path_2 = home.replace(/(?<=.)[\\/]+$/, "");
    return path === "~" ? path_2 : `${path_2}${pathSeparatorOf(path_2)}${path.slice(2)}`;
  }
  return /^(?:[A-Za-z]:)?[\\/]/.test(path) ? path : `${cwd}${pathSeparatorOf(cwd)}${path}`;
}
//@ chunk-b60e6mnx.js:819-856 placement
/**
 * 反斜杠或斜杠
 */
var pathSeparatorOf = (path) => (path.includes("\\") ? "\\" : "/");
//@ chunk-b60e6mnx.js:856-917 placement
/**
 * 把路径统一成 posix 形式并去掉多余的尾部斜杠。
 */
var toPosixPathTrimmed = (path) => path.replaceAll("\\", "/").replace(/(?<=.)\/+$/, "");
//@ chunk-b60e6mnx.js:917-964 placement
/**
 * 判断第一个路径是否位于第二个目录之下（都先归一化成 posix）。
 */
var isPathUnder = (path, ancestor) => toPosixPathTrimmed(path).startsWith(`${toPosixPathTrimmed(ancestor)}/`);
//@ chunk-b60e6mnx.js:964-1000 placement
/**
 * 归一化后比较两个路径是否相同。
 */
var isSamePathEntry = (entry, includePath) =>
  toPosixPathTrimmed(entry.path) === toPosixPathTrimmed(includePath);
//@ chunk-b60e6mnx.js:1000-1052 placement
/**
 * 生成 “Contents of <path>:” 加正文的指令文件文本。
 */
var formatInstructionFile = (file) => `Contents of ${file.path}:

${file.content}`;
//@ chunk-b60e6mnx.js:1052-1139 placement
/**
 * 过滤掉指定目录的条目。
 */
function excludeDirs(files, excluded) {
  let dirs = new Set(excluded.map((entry) => entry.dir));
  return files.filter((file) => !dirs.has(file.dir));
}
//@ chunk-b60e6mnx.js:1139-1179 placement
/**
 * 把若干指令文件按格式追加到已有段落之后。
 */
var appendInstructionParts = (context, files) => [...(context ?? []), ...files.map(formatInstructionFile)];
//@ chunk-b60e6mnx.js:1179-1229 placement (2.1.88 match: isMcpServerFromProjectOrLocalSettings, 1)
var isMcpServerFromProjectOrLocalSettings = (config) => config.kind === "project" || config.kind === "local";
//@ chunk-b60e6mnx.js:1229-1346 placement
/**
 * 指令文件所属目录（.claude/ 下的文件取 .claude 的父目录）。
 */
function instructionFileDir(filePath) {
  let posixPathTrimmed = toPosixPathTrimmed(filePath);
  let index = posixPathTrimmed.lastIndexOf("/.claude/");
  let cutIndex = index === -1 ? posixPathTrimmed.lastIndexOf("/") : index;
  return cutIndex <= 0 ? "/" : posixPathTrimmed.slice(0, cutIndex);
}
//@ chunk-b60e6mnx.js:1346-1585 placement
/**
 * 计算新条目在指令文件列表中的插入位置（同目录的 project/local 条目处，否则其后，否则 memory 之前）。
 */
function findInsertIndex(files, dir) {
  let fileByPath = new Map(files.map((file) => [file.path, file]));
  let index = files.findIndex(
    (file) =>
      isMcpServerFromProjectOrLocalSettings(file) &&
      isPathUnder(instructionFileDir(rootIncludeAncestor(file, fileByPath)), dir),
  );
  if (index !== -1) return index;
  let lastIndex = files.findLastIndex(isMcpServerFromProjectOrLocalSettings);
  if (lastIndex !== -1) return lastIndex + 1;
  let index_2 = files.findIndex((file) => file.kind === "memory");
  return index_2 === -1 ? files.length : index_2;
}
//@ chunk-b60e6mnx.js:1585-1627 placement
/**
 * AGENTS.md 的候选路径。
 */
var AGENTS_MD_FILENAMES = ["AGENTS.md", ".claude/AGENTS.md"];
//@ chunk-b60e6mnx.js:1627-1687 placement
/**
 * CLAUDE.md 的候选路径。
 */
var CLAUDE_MD_FILENAMES = ["CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"];
//@ chunk-b60e6mnx.js:1687-1702 placement
/**
 * 主线程标识。
 */
var MAIN_THREAD = "main";
//@ chunk-b60e6mnx.js:1702-1739 placement
/**
 * 会让 CLAUDE.md 重新加载的三个事件名。
 */
var CLAUDE_MD_RESET_EVENTS = ["clear", "compact", "resume"];
//@ chunk-b60e6mnx.js:1739-1894 placement
/**
 * 判断条目是否是某目录下的顶层 CLAUDE.md。
 */
function isClaudeMdAtDir(config, dir) {
  if (!(
    isMcpServerFromProjectOrLocalSettings(config) &&
    config.parent === undefined &&
    CLAUDE_MD_FILENAMES.some((name) => toPosixPathTrimmed(config.path).endsWith(`/${name}`))
  ))
    return false;
  let fileDir = instructionFileDir(config.path);
  let posixPathTrimmed = toPosixPathTrimmed(dir);
  return fileDir === posixPathTrimmed || isPathUnder(posixPathTrimmed, fileDir);
}
//@ chunk-b60e6mnx.js:1894-1929 placement
/**
 * 判断 MCP 服务器来源是否不属于项目/本地设置。
 */
var isProjectLocalMcpSource = (file) => !MCP_SETTINGS_SCOPE_KINDS.includes(file.kind);
//@ chunk-b60e6mnx.js:1929-2157 placement
/**
 * 按路径和内容去重说明文件。
 */
function dedupeInstructionFiles(candidates, existing) {
  let seenPaths = new Set(existing.map((file) => toPosixPathTrimmed(file.path)));
  let seenContents = new Set(
    existing.filter(isMcpServerFromProjectOrLocalSettings).map((file) => file.content.trim()),
  );
  let added = [];
  for (let file of candidates) {
    let posixPathTrimmed = toPosixPathTrimmed(file.path);
    let trimmed = file.content.trim();
    if (!(seenPaths.has(posixPathTrimmed) || (trimmed !== "" && seenContents.has(trimmed)))) {
      seenPaths.add(posixPathTrimmed);
      added.push(file);
    }
  }
  return added;
}
//@ chunk-b60e6mnx.js:2157-2374 placement
/**
 * 把 AGENTS.md 文件按目录插入说明文件列表。
 */
function insertAgentsMdFiles(files, inserted) {
  if (inserted.length === 0) return files;
  let result = [...files];
  let fileByPath = new Map(inserted.map((file) => [file.path, file]));
  let byDir = new Map();
  for (let file of inserted) {
    let dir = instructionFileDir(rootIncludeAncestor(file, fileByPath));
    byDir.set(dir, [...(byDir.get(dir) ?? []), file]);
  }
  for (let [dir, dirFiles] of byDir) result.splice(findInsertIndex(result, dir), 0, ...dirFiles);
  return result;
}
//@ chunk-b60e6mnx.js:2374-2407 placement
/**
 * AGENTS.md 读取模式（默认 claude-md-or-agents-md）与模式映射。
 */
var DEFAULT_AGENTS_MD_MODE = "claude-md-or-agents-md";
//@ chunk-b60e6mnx.js:2407-2528 placement
/**
 * 指令来源模式到遥测值的映射（managed-only / claude-md / ...）。
 */
var INSTRUCTION_MODE_LABELS = {
  none: "managed-only",
  claude: "claude-md",
  "agents-fallback": "claude-md-or-agents-md",
  both: "claude-md-and-agents-md",
};
//@ chunk-b60e6mnx.js:2528-2618 placement
/**
 * 把 AGENTS.md 读取模式映射成显示标签，未知默认 claude-md。
 */
function instructionModeLabel(projectInstructions) {
  if (projectInstructions === undefined) return;
  return (
    (typeof projectInstructions === "string" ? INSTRUCTION_MODE_LABELS[projectInstructions] : undefined) ??
    "claude-md"
  );
}
//@ chunk-b60e6mnx.js:2618-2706 placement
/**
 * 全部 AGENTS.md 读取模式。
 */
var AGENTS_MD_MODES = ["claude-md", "claude-md-or-agents-md", "claude-md-and-agents-md", "managed-only"];
//@ chunk-b60e6mnx.js:2706-2745 placement
/**
 * 返回合法的 AGENTS.md 读取模式，非法时用默认值。
 */
var resolveAgentsMdMode = (instructionFiles) =>
  AGENTS_MD_MODES.find((mode) => mode === instructionFiles) ?? DEFAULT_AGENTS_MD_MODE;

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/plugins/bundled/agentsMd/agentsMdFiles.js");
export {
  AGENTS_MD_FILENAMES,
  CLAUDE_MD_FILENAMES,
  DEFAULT_AGENTS_MD_MODE,
  MAIN_THREAD,
  AGENTS_MD_MODES,
  CLAUDE_MD_RESET_EVENTS,
  resolveIncludePath,
  flattenProjectInstructionParts,
  findInsertIndex,
  isPathUnder,
  isClaudeMdAtDir,
  isSamePathEntry,
  isProjectLocalMcpSource,
  isMcpServerFromProjectOrLocalSettings,
  instructionModeLabel,
  resolveAgentsMdMode,
  formatInstructionFile,
  toPosixPathTrimmed,
  excludeDirs,
  instructionFileDir,
  dedupeInstructionFiles,
  appendInstructionParts,
  insertAgentsMdFiles,
};
