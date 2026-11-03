/**
 * tools/FileEditTool/_new/normalizeEditInputAliases.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { isPlainObject as isPlainObject_4 } from "../../../utils/isPlainObject.js";

/**
 * 把 replace_name/path/old_str 等别名改为标准字段。
 */
//@ chunk-e6aww6q8.js:4645172-4645791 sole-consumer-new
function normalizeEditInputAliases(e) {
  if (!isPlainObject_4(e)) return null;
  let n = { ...e },
    r = [];
  if ("replace_name" in n) {
    let replace_name = n.replace_name;
    if (!("replace_all" in n)) n.replace_all = replace_name === !0 || replace_name === "true";
    (delete n.replace_name, r.push("alias_replace_name"));
  }
  if ("path" in n && !("file_path" in n) && typeof n.path === "string")
    ((n.file_path = n.path), delete n.path, r.push("path"));
  if ("old_str" in n && !("old_string" in n) && typeof n.old_str === "string")
    ((n.old_string = n.old_str), delete n.old_str, r.push("old_str"));
  if ("new_str" in n && !("new_string" in n) && typeof n.new_str === "string")
    ((n.new_string = n.new_str), delete n.new_str, r.push("new_str"));
  return r.length ? { input: n, shapeClass: r.join(",") } : null;
}

export { normalizeEditInputAliases };
