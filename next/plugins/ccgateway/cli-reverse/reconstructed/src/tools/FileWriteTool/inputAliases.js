/**
 * tools/FileWriteTool/inputAliases.ts
 *
 * 2.1.316 新增：Write 工具输入参数别名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { FILE_WRITE_TOOL_NAME } from "./prompt.js";

//@ chunk-5xgkngpb.js:1410799-1410921 placement
/**
 * Write 输入字段的别名表：把 path/file 映射为 file_path，其余文本类别名映射为 content。
 */
var CONTENT_ALIASES = ["file_text", "file_content"];
var WRITE_INPUT_ALIASES = {
  file_path: ["path", "file"],
  content: [...CONTENT_ALIASES, "new_text", "body", "text", "contents"],
};
//@ chunk-5xgkngpb.js:1410921-1411896 placement
/**
 * 把 Write 工具输入中的 path 等别名映射为 file_path/content。
 */
function normalizeWriteInputAliases(rawInput) {
  if (!isPlainObject_6(rawInput)) return null;
  let normalizedInput = {
    ...rawInput,
  };
  let appliedAliases = [];
  let notes = [];
  if (!Object.hasOwn(normalizedInput, "file_path") && typeof normalizedInput.path === "string") {
    normalizedInput.file_path = normalizedInput.path;
    delete normalizedInput.path;
    appliedAliases.push("path");
    notes.push("`path` was read as `file_path`.");
  }
  let filtered = CONTENT_ALIASES.filter((aliasName) => Object.hasOwn(normalizedInput, aliasName));
  let [aliasName] = filtered;
  if (
    aliasName !== undefined &&
    filtered.length === 1 &&
    !Object.hasOwn(normalizedInput, "content") &&
    typeof normalizedInput[aliasName] === "string"
  ) {
    normalizedInput.content = normalizedInput[aliasName];
    delete normalizedInput[aliasName];
    appliedAliases.push(aliasName);
    notes.push(`\`${aliasName}\` was read as \`content\`.`);
  }
  if (Object.hasOwn(normalizedInput, "description")) {
    delete normalizedInput.description;
    appliedAliases.push("drop_description");
    notes.push("`description` was ignored.");
  }
  if (normalizedInput.command === "create") {
    delete normalizedInput.command;
    appliedAliases.push("drop_command_create");
    notes.push("`command` was ignored.");
  }
  for (let canonicalName of ["file_path", "content"])
    for (let aliasName of WRITE_INPUT_ALIASES[canonicalName])
      if (
        typeof normalizedInput[canonicalName] === "string" &&
        normalizedInput[aliasName] === normalizedInput[canonicalName]
      ) {
        delete normalizedInput[aliasName];
        appliedAliases.push(`repeated_${aliasName}`);
        notes.push(`\`${aliasName}\` repeated \`${canonicalName}\` and was ignored.`);
      }
  return appliedAliases.length
    ? {
        input: normalizedInput,
        shapeClass: appliedAliases.join(","),
        resultNote: `Note: ${FILE_WRITE_TOOL_NAME}'s parameters are named \`file_path\` and \`content\`. ${notes.join(" ")}`,
      }
    : null;
}
export { normalizeWriteInputAliases };
