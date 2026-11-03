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

/**
 * 把项目说明文件分块展开为带 parent 的列表。
 */
//@ chunk-16jhn3ak.js:476-616 placement
var flattenProjectInstructionParts = (t) =>
  t.flatMap((o) =>
    o.parts.map((part, n) => ({
      path: part.path,
      kind: "project",
      content: part.content,
      ...(n > 0 && { parent: o.parts[0]?.path ?? part.path }),
    })),
  );
/**
 * 解析路径：~ 展开为家目录，绝对路径原样，其余拼到基目录下。
 */
//@ chunk-16jhn3ak.js:616-819 placement
function resolveIncludePath(t, o, e) {
  if ((t === "~" || t.startsWith("~/")) && e !== void 0) {
    let replaced = e.replace(/(?<=.)[\\/]+$/, "");
    return t === "~" ? replaced : `${replaced}${c(replaced)}${t.slice(2)}`;
  }
  return /^(?:[A-Za-z]:)?[\\/]/.test(t) ? t : `${o}${c(o)}${t}`;
}
//@ chunk-16jhn3ak.js:819-856 placement
var c = (t) => (t.includes("\\") ? "\\" : "/");
//@ chunk-16jhn3ak.js:856-917 placement
var VTe = (t) => t.replaceAll("\\", "/").replace(/(?<=.)\/+$/, "");
//@ chunk-16jhn3ak.js:917-964 placement
var iGn = (t, o) => VTe(t).startsWith(`${VTe(o)}/`);
//@ chunk-16jhn3ak.js:964-1000 placement
var mAo = (t, o) => VTe(t.path) === VTe(o);
//@ chunk-16jhn3ak.js:1000-1052 placement
var gAo = (t) => `Contents of ${t.path}:

${t.content}`;
/**
 * 过滤掉指定目录的条目。
 */
//@ chunk-16jhn3ak.js:1052-1139 placement
function excludeDirs(t, o) {
  let e = new Set(o.map((n) => n.dir));
  return t.filter((n) => !e.has(n.dir));
}
//@ chunk-16jhn3ak.js:1139-1179 placement
var hAo = (t, o) => [...(t ?? []), ...o.map(gAo)];
//@ chunk-16jhn3ak.js:1179-1229 placement = isMcpServerFromProjectOrLocalSettings (1)
var isMcpServerFromProjectOrLocalSettings_2 = (config) =>
  config.kind === "project" || config.kind === "local";
/**
 * 指令文件所属目录（.claude/ 下的文件取 .claude 的父目录）。
 */
//@ chunk-16jhn3ak.js:1229-1346 placement
function instructionFileDir(t) {
  let o = VTe(t),
    index = o.lastIndexOf("/.claude/"),
    n = index === -1 ? o.lastIndexOf("/") : index;
  return n <= 0 ? "/" : o.slice(0, n);
}
/**
 * 计算新条目在指令文件列表中的插入位置（同目录的 project/local 条目处，否则其后，否则 memory 之前）。
 */
//@ chunk-16jhn3ak.js:1346-1585 placement
function findInsertIndex(t, o) {
  let e = new Map(t.map((s) => [s.path, s])),
    index = t.findIndex(
      (s) =>
        isMcpServerFromProjectOrLocalSettings_2(s) && iGn(instructionFileDir(rootIncludeAncestor(s, e)), o),
    );
  if (index !== -1) return index;
  let lastIndex = t.findLastIndex(isMcpServerFromProjectOrLocalSettings_2);
  if (lastIndex !== -1) return lastIndex + 1;
  let index_2 = t.findIndex((s) => s.kind === "memory");
  return index_2 === -1 ? t.length : index_2;
}
/**
 * AGENTS.md 的候选路径。
 */
//@ chunk-16jhn3ak.js:1585-1627 placement
var AGENTS_MD_FILENAMES = ["AGENTS.md", ".claude/AGENTS.md"];
/**
 * CLAUDE.md 的候选路径。
 */
//@ chunk-16jhn3ak.js:1627-1687 placement
var CLAUDE_MD_FILENAMES = ["CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"];
/**
 * 主线程标识。
 */
//@ chunk-16jhn3ak.js:1687-1702 placement
var MAIN_THREAD = "main";
//@ chunk-16jhn3ak.js:1702-1739 placement
var E$s = ["clear", "compact", "resume"];
/**
 * 判断条目是否是某目录下的顶层 CLAUDE.md。
 */
//@ chunk-16jhn3ak.js:1739-1894 placement
function isClaudeMdAtDir(t, o) {
  if (!(
    isMcpServerFromProjectOrLocalSettings_2(t) &&
    t.parent === void 0 &&
    CLAUDE_MD_FILENAMES.some((i) => VTe(t.path).endsWith(`/${i}`))
  ))
    return !1;
  let n = instructionFileDir(t.path),
    r = VTe(o);
  return n === r || iGn(r, n);
}
//@ chunk-16jhn3ak.js:1894-1929 placement
var v$s = (t) => !isMcpServerFromProjectOrLocalSettings.includes(t.kind);
/**
 * 按路径和内容去重说明文件。
 */
//@ chunk-16jhn3ak.js:1929-2157 placement
function dedupeInstructionFiles(t, o) {
  let e = new Set(o.map((i) => VTe(i.path))),
    n = new Set(o.filter(isMcpServerFromProjectOrLocalSettings_2).map((i) => i.content.trim())),
    r = [];
  for (let i of t) {
    let s = VTe(i.path),
      trimmed = i.content.trim();
    if (!(e.has(s) || (trimmed !== "" && n.has(trimmed)))) (e.add(s), r.push(i));
  }
  return r;
}
/**
 * 把 AGENTS.md 文件按目录插入说明文件列表。
 */
//@ chunk-16jhn3ak.js:2157-2374 placement
function insertAgentsMdFiles(t, o) {
  if (o.length === 0) return t;
  let e = [...t],
    n = new Map(o.map((i) => [i.path, i])),
    r = new Map();
  for (let i of o) {
    let s = instructionFileDir(rootIncludeAncestor(i, n));
    r.set(s, [...(r.get(s) ?? []), i]);
  }
  for (let [i, s] of r) e.splice(findInsertIndex(e, i), 0, ...s);
  return e;
}
/**
 * AGENTS.md 读取模式（默认 claude-md-or-agents-md）与模式映射。
 */
//@ chunk-16jhn3ak.js:2374-2407 placement
var DEFAULT_AGENTS_MD_MODE = "claude-md-or-agents-md";
/**
 * 指令来源模式到遥测值的映射（managed-only / claude-md / ...）。
 */
//@ chunk-16jhn3ak.js:2407-2528 placement
var INSTRUCTION_MODE_LABELS = {
  none: "managed-only",
  claude: "claude-md",
  "agents-fallback": "claude-md-or-agents-md",
  both: "claude-md-and-agents-md",
};
//@ chunk-16jhn3ak.js:2528-2618 placement
function k$s(t) {
  if (t === void 0) return;
  return (typeof t === "string" ? INSTRUCTION_MODE_LABELS[t] : void 0) ?? "claude-md";
}
/**
 * 全部 AGENTS.md 读取模式。
 */
//@ chunk-16jhn3ak.js:2618-2706 placement
var AGENTS_MD_MODES = ["claude-md", "claude-md-or-agents-md", "claude-md-and-agents-md", "managed-only"];
//@ chunk-16jhn3ak.js:2706-2745 placement
var T$s = (t) => AGENTS_MD_MODES.find((o) => o === t) ?? DEFAULT_AGENTS_MD_MODE;

export {
  AGENTS_MD_FILENAMES,
  CLAUDE_MD_FILENAMES,
  DEFAULT_AGENTS_MD_MODE,
  MAIN_THREAD,
  AGENTS_MD_MODES,
  E$s,
  resolveIncludePath,
  flattenProjectInstructionParts,
  findInsertIndex,
  iGn,
  isClaudeMdAtDir,
  mAo,
  v$s,
  isMcpServerFromProjectOrLocalSettings_2,
  k$s,
  T$s,
  gAo,
  VTe,
  excludeDirs,
  instructionFileDir,
  dedupeInstructionFiles,
  hAo,
  insertAgentsMdFiles,
};
