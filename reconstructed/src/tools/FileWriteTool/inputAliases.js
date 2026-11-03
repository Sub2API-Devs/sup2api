/**
 * tools/FileWriteTool/inputAliases.ts
 *
 * 2.1.316 新增：Write 工具输入参数别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { FILE_WRITE_TOOL_NAME } from "./prompt.js";

//@ chunk-e6aww6q8.js:1411318-1411440 placement
var CONTENT_ALIASES = ["file_text", "file_content"],
  LKo = {
    file_path: ["path", "file"],
    content: [...CONTENT_ALIASES, "new_text", "body", "text", "contents"],
  };
/**
 * 把 Write 工具输入中的 path 等别名映射为 file_path/content。
 */
//@ chunk-e6aww6q8.js:1411440-1412415 placement
function normalizeWriteInputAliases(e) {
  if (!isPlainObject_4(e)) return null;
  let n = { ...e },
    r = [],
    s = [];
  if (!Object.hasOwn(n, "file_path") && typeof n.path === "string")
    ((n.file_path = n.path), delete n.path, r.push("path"), s.push("`path` was read as `file_path`."));
  let filtered = CONTENT_ALIASES.filter((S) => Object.hasOwn(n, S)),
    [y] = filtered;
  if (y !== void 0 && filtered.length === 1 && !Object.hasOwn(n, "content") && typeof n[y] === "string")
    ((n.content = n[y]), delete n[y], r.push(y), s.push(`\`${y}\` was read as \`content\`.`));
  if (Object.hasOwn(n, "description"))
    (delete n.description, r.push("drop_description"), s.push("`description` was ignored."));
  if (n.command === "create")
    (delete n.command, r.push("drop_command_create"), s.push("`command` was ignored."));
  for (let S of ["file_path", "content"])
    for (let w of LKo[S])
      if (typeof n[S] === "string" && n[w] === n[S])
        (delete n[w], r.push(`repeated_${w}`), s.push(`\`${w}\` repeated \`${S}\` and was ignored.`));
  return r.length
    ? {
        input: n,
        shapeClass: r.join(","),
        resultNote: `Note: ${FILE_WRITE_TOOL_NAME}'s parameters are named \`file_path\` and \`content\`. ${s.join(" ")}`,
      }
    : null;
}

export { normalizeWriteInputAliases };
