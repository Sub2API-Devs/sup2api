/**
 * services/artifacts/artifactInputNormalize.ts
 *
 * 2.1.316 新增：Artifact 输入规范化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n5x6bf26.js (2)
 * attribution: placement 2
 */
import { VERSION_LABEL_MAX } from "../../tools/ArtifactTool/artifactUrls.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { countCodePoints, truncateCodePoints } from "../../utils/stringUtils.js";
import { stripProtoKeys } from "../../utils/objectSafety.js";
import { safeParseJSON } from "../../utils/json.js";

//@ chunk-n5x6bf26.js:374-579 placement
var LEGACY_INPUT_FIELDS = ["note", "lang"],
  LABEL_CUT_NOTE = `Note: \`label\` was longer than ${VERSION_LABEL_MAX} characters and was cut to that length; only its start was kept. A label is a few words naming the version, not a description of the changes.`;
/**
 * 规范化 Artifact 工具输入的旧形状：删除旧字段 note/lang，call_endpoint 的 body 与 write_db 的 data 从 JSON 字符串解析为对象/数组，files 字符串列表转 {path}，空 edits 删掉，过长 label 截断；返回新输入、形状类别标签（+ 连接）与可选的截断提示；无需改动时返回 null。
 */
//@ chunk-n5x6bf26.js:579-1829 placement
function normalizeArtifactInput(input) {
  if (!isPlainObject(input)) return null;
  let legacyFields = LEGACY_INPUT_FIELDS.filter((e) => e in input),
    labelFix;
  if (typeof input.label === "string" && countCodePoints(input.label) > VERSION_LABEL_MAX) {
    let trimmed = input.label
        .replaceAll(
          `\r
`,
          `
`,
        )
        .trim(),
      p = countCodePoints(trimmed) > VERSION_LABEL_MAX;
    labelFix = { value: p ? truncateCodePoints(trimmed, VERSION_LABEL_MAX).trimEnd() : trimmed, cut: p };
  }
  let bodyShape, parsedBody;
  if (input.action === "call_endpoint" && typeof input.body === "string") {
    let stripped = stripProtoKeys(safeParseJSON(input.body, !1)).stripped;
    if (Array.isArray(stripped)) bodyShape = "array";
    else if (stripped !== null && typeof stripped === "object") bodyShape = "object";
    parsedBody = stripped;
  }
  let parsedData;
  if (input.action === "write_db" && typeof input.data === "string") {
    let stripped = stripProtoKeys(safeParseJSON(input.data, !1)).stripped;
    if (isPlainObject(stripped)) parsedData = stripped;
  }
  let filesFix =
      (input.action === void 0 || input.action === "publish") &&
      Array.isArray(input.files) &&
      input.files.some((file) => typeof file === "string")
        ? input.files.map((file) => (typeof file === "string" ? { path: file } : file))
        : void 0,
    dropEmptyEdits =
      (input.action === void 0 || input.action === "publish") &&
      Array.isArray(input.edits) &&
      input.edits.length === 0;
  if (
    legacyFields.length === 0 &&
    bodyShape === void 0 &&
    parsedData === void 0 &&
    filesFix === void 0 &&
    !dropEmptyEdits &&
    labelFix === void 0
  )
    return null;
  let normalized = { ...input },
    shapeTags = [];
  for (let e of legacyFields) (delete normalized[e], shapeTags.push(`legacy_${e}`));
  if (bodyShape !== void 0)
    ((normalized.body = parsedBody), shapeTags.push(`body_json_string_to_${bodyShape}`));
  if (parsedData !== void 0) ((normalized.data = parsedData), shapeTags.push("data_json_string_to_object"));
  if (filesFix !== void 0) ((normalized.files = filesFix), shapeTags.push("files_string_list"));
  if (dropEmptyEdits) (delete normalized.edits, shapeTags.push("edits_empty"));
  if (labelFix !== void 0)
    ((normalized.label = labelFix.value), shapeTags.push(labelFix.cut ? "label_clamped" : "label_trimmed"));
  return {
    input: normalized,
    shapeClass: shapeTags.join("+"),
    ...(labelFix?.cut && { resultNote: LABEL_CUT_NOTE }),
  };
}

export { normalizeArtifactInput };
