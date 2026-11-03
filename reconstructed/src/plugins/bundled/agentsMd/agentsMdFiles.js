/**
 * plugins/bundled/agentsMd/agentsMdFiles.ts
 *
 * 2.1.316 新增：按路径和内容去重说明文件；把 AGENTS.md 文件按目录插入说明文件列表等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-16jhn3ak.js (25)
 * attribution: placement 25
 */
import { rootIncludeAncestor } from "./index.js";
import { isMcpServerFromProjectOrLocalSettings } from "../../../services/mcp/headersHelper.js";

//@ chunk-16jhn3ak.js:476-616 placement
/**
 * 把项目说明文件分块展开为带 parent 的列表。
 */
var flattenProjectInstructionParts = (t) =>
  t.flatMap((o) =>
    o.parts.map((part, n) => ({
      path: part.path,
      kind: "project",
      content: part.content,
      ...(n > 0 && {
        parent: o.parts[0]?.path ?? part.path,
      }),
    })),
  );
//@ chunk-16jhn3ak.js:616-819 placement
/**
 * 解析路径：~ 展开为家目录，绝对路径原样，其余拼到基目录下。
 */
function resolveIncludePath(path, o, home) {
  if ((path === "~" || path.startsWith("~/")) && home !== undefined) {
    let replaced = home.replace(/(?<=.)[\\/]+$/, "");
    return path === "~" ? replaced : `${replaced}${pathSeparatorOf(replaced)}${path.slice(2)}`;
  }
  return /^(?:[A-Za-z]:)?[\\/]/.test(path) ? path : `${o}${pathSeparatorOf(o)}${path}`;
}
//@ chunk-16jhn3ak.js:819-856 placement
/**
 * 反斜杠或斜杠
 */
var pathSeparatorOf = (t) => (t.includes("\\") ? "\\" : "/");
//@ chunk-16jhn3ak.js:856-917 placement
/**
 * 把路径统一成 posix 形式并去掉多余的尾部斜杠。
 */
var toPosixPathTrimmed = (t) => t.replaceAll("\\", "/").replace(/(?<=.)\/+$/, "");
//@ chunk-16jhn3ak.js:917-964 placement
/**
 * 判断第一个路径是否位于第二个目录之下（都先归一化成 posix）。
 */
var isPathUnder = (t, o) => toPosixPathTrimmed(t).startsWith(`${toPosixPathTrimmed(o)}/`);
//@ chunk-16jhn3ak.js:964-1000 placement
/**
 * 归一化后比较两个路径是否相同。
 */
var isSamePathEntry = (t, includePath) => toPosixPathTrimmed(t.path) === toPosixPathTrimmed(includePath);
//@ chunk-16jhn3ak.js:1000-1052 placement
/**
 * 生成 “Contents of <path>:” 加正文的指令文件文本。
 */
var formatInstructionFile = (t) => `Contents of ${t.path}:

${t.content}`;
//@ chunk-16jhn3ak.js:1052-1139 placement
/**
 * 过滤掉指定目录的条目。
 */
function excludeDirs(t, o) {
  let e = new Set(o.map((n) => n.dir));
  return t.filter((n) => !e.has(n.dir));
}
//@ chunk-16jhn3ak.js:1139-1179 placement
/**
 * 把若干指令文件按格式追加到已有段落之后。
 */
var appendInstructionParts = (context, o) => [...(context ?? []), ...o.map(formatInstructionFile)];
//@ chunk-16jhn3ak.js:1179-1229 placement = isMcpServerFromProjectOrLocalSettings (1)
var isMcpServerFromProjectOrLocalSettings_2 = (config) =>
  config.kind === "project" || config.kind === "local";
//@ chunk-16jhn3ak.js:1229-1346 placement
/**
 * 指令文件所属目录（.claude/ 下的文件取 .claude 的父目录）。
 */
function instructionFileDir(t) {
  let posixPathTrimmed = toPosixPathTrimmed(t);
  let index = posixPathTrimmed.lastIndexOf("/.claude/");
  let n = index === -1 ? posixPathTrimmed.lastIndexOf("/") : index;
  return n <= 0 ? "/" : posixPathTrimmed.slice(0, n);
}
//@ chunk-16jhn3ak.js:1346-1585 placement
/**
 * 计算新条目在指令文件列表中的插入位置（同目录的 project/local 条目处，否则其后，否则 memory 之前）。
 */
function findInsertIndex(t, o) {
  let e = new Map(t.map((s) => [s.path, s]));
  let index = t.findIndex(
    (s) =>
      isMcpServerFromProjectOrLocalSettings_2(s) &&
      isPathUnder(instructionFileDir(rootIncludeAncestor(s, e)), o),
  );
  if (index !== -1) return index;
  let lastIndex = t.findLastIndex(isMcpServerFromProjectOrLocalSettings_2);
  if (lastIndex !== -1) return lastIndex + 1;
  let index_2 = t.findIndex((s) => s.kind === "memory");
  return index_2 === -1 ? t.length : index_2;
}
//@ chunk-16jhn3ak.js:1585-1627 placement
/**
 * AGENTS.md 的候选路径。
 */
var AGENTS_MD_FILENAMES = ["AGENTS.md", ".claude/AGENTS.md"];
//@ chunk-16jhn3ak.js:1627-1687 placement
/**
 * CLAUDE.md 的候选路径。
 */
var CLAUDE_MD_FILENAMES = ["CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"];
//@ chunk-16jhn3ak.js:1687-1702 placement
/**
 * 主线程标识。
 */
var MAIN_THREAD = "main";
//@ chunk-16jhn3ak.js:1702-1739 placement
/**
 * 会让 CLAUDE.md 重新加载的三个事件名。
 */
var CLAUDE_MD_RESET_EVENTS = ["clear", "compact", "resume"];
//@ chunk-16jhn3ak.js:1739-1894 placement
/**
 * 判断条目是否是某目录下的顶层 CLAUDE.md。
 */
function isClaudeMdAtDir(config, o) {
  if (!(
    isMcpServerFromProjectOrLocalSettings_2(config) &&
    config.parent === undefined &&
    CLAUDE_MD_FILENAMES.some((i) => toPosixPathTrimmed(config.path).endsWith(`/${i}`))
  ))
    return false;
  let n = instructionFileDir(config.path);
  let posixPathTrimmed = toPosixPathTrimmed(o);
  return n === posixPathTrimmed || isPathUnder(posixPathTrimmed, n);
}
//@ chunk-16jhn3ak.js:1894-1929 placement
/**
 * 判断 MCP 服务器来源是否不属于项目/本地设置。
 */
var isProjectLocalMcpSource = (t) => !isMcpServerFromProjectOrLocalSettings.includes(t.kind);
//@ chunk-16jhn3ak.js:1929-2157 placement
/**
 * 按路径和内容去重说明文件。
 */
function dedupeInstructionFiles(t, o) {
  let e = new Set(o.map((i) => toPosixPathTrimmed(i.path)));
  let n = new Set(o.filter(isMcpServerFromProjectOrLocalSettings_2).map((i) => i.content.trim()));
  let r = [];
  for (let i of t) {
    let posixPathTrimmed = toPosixPathTrimmed(i.path);
    let trimmed = i.content.trim();
    if (!(e.has(posixPathTrimmed) || (trimmed !== "" && n.has(trimmed)))) {
      e.add(posixPathTrimmed);
      r.push(i);
    }
  }
  return r;
}
//@ chunk-16jhn3ak.js:2157-2374 placement
/**
 * 把 AGENTS.md 文件按目录插入说明文件列表。
 */
function insertAgentsMdFiles(t, o) {
  if (o.length === 0) return t;
  let e = [...t];
  let n = new Map(o.map((i) => [i.path, i]));
  let r = new Map();
  for (let i of o) {
    let s = instructionFileDir(rootIncludeAncestor(i, n));
    r.set(s, [...(r.get(s) ?? []), i]);
  }
  for (let [i, s] of r) e.splice(findInsertIndex(e, i), 0, ...s);
  return e;
}
//@ chunk-16jhn3ak.js:2374-2407 placement
/**
 * AGENTS.md 读取模式（默认 claude-md-or-agents-md）与模式映射。
 */
var DEFAULT_AGENTS_MD_MODE = "claude-md-or-agents-md";
//@ chunk-16jhn3ak.js:2407-2528 placement
/**
 * 指令来源模式到遥测值的映射（managed-only / claude-md / ...）。
 */
var INSTRUCTION_MODE_LABELS = {
  none: "managed-only",
  claude: "claude-md",
  "agents-fallback": "claude-md-or-agents-md",
  both: "claude-md-and-agents-md",
};
//@ chunk-16jhn3ak.js:2528-2618 placement
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
//@ chunk-16jhn3ak.js:2618-2706 placement
/**
 * 全部 AGENTS.md 读取模式。
 */
var AGENTS_MD_MODES = ["claude-md", "claude-md-or-agents-md", "claude-md-and-agents-md", "managed-only"];
//@ chunk-16jhn3ak.js:2706-2745 placement
/**
 * 返回合法的 AGENTS.md 读取模式，非法时用默认值。
 */
var resolveAgentsMdMode = (instructionFiles) =>
  AGENTS_MD_MODES.find((o) => o === instructionFiles) ?? DEFAULT_AGENTS_MD_MODE;
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
  isMcpServerFromProjectOrLocalSettings_2,
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
