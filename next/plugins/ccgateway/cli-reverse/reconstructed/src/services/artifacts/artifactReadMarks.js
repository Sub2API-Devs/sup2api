/**
 * services/artifacts/artifactReadMarks.ts
 *
 * Artifact 被读过的记录（readsMarked）：按 action 白名单与 markReads 判定，把 read_file 等调用与输出配对记录并限量，用于给结果加“已引用”前缀（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1dbza2qv.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parseArtifactUrlInput } from "../../tools/ArtifactTool/constants.js";
import { getShareEntry } from "./shareEntries.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG, SAVED_ARTIFACT_AUTHOR_WARNING } from "../../constants/xml.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1dbza2qv.js:3650-3809 placement
/**
 * 计入“已读”的 artifact 动作白名单与记录上限 256。
 */
var READ_ONLY_ARTIFACT_ACTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_MARKED_OUTPUTS;
deferInit("chunk-1dbza2qv.js:3650", () => {
  READ_ONLY_ARTIFACT_ACTIONS = new Set([
    "read",
    "list_files",
    "read_file",
    "list_assets",
    "read_asset",
    "read_db",
    "comments",
    "verify",
    "get_endpoints",
    "call_endpoint",
    "run_script",
  ]);
  MAX_MARKED_OUTPUTS = 256;
});
//@ chunk-1dbza2qv.js:3809-4280 placement
/**
 * 在工具输入与输出上记录 artifact 读取：校验 action 与 markReads，配对 toolUse 并限量。
 */
function markReadIfOurs(input, output, toolUseId) {
  if (input === null || typeof input !== "object" || output === null || typeof output !== "object") return;
  let action = Reflect.get(input, "action");
  let verify = Reflect.get(output, "verify");
  let url = parseArtifactUrlInput(
    Reflect.get(input, "url") ??
      (verify !== null && typeof verify === "object" ? Reflect.get(verify, "url") : undefined),
  )?.slug;
  if (
    typeof action !== "string" ||
    !READ_ONLY_ARTIFACT_ACTIONS.has(action) ||
    url === undefined ||
    getShareEntry(url)?.markReads !== true
  )
    return;
  let { toolUses: outputs, outputs: toolUses } = getLiveState().readsMarked;
  toolUses.add(output);
  if (toolUseId === undefined) return;
  outputs.add(toolUseId);
  if (outputs.size > MAX_MARKED_OUTPUTS) {
    let oldest = outputs.values().next().value;
    if (oldest !== undefined) outputs.delete(oldest);
  }
}
//@ chunk-1dbza2qv.js:4280-4397 placement
/**
 * 判定某次工具调用或输出是否已被记为读过；tools/ArtifactTool/actions/database 也用它。
 */
function isMarkedRead(output, toolUseId) {
  let { toolUses, outputs } = getLiveState().readsMarked;
  return toolUses.has(toolUseId) || (output !== null && typeof output === "object" && outputs.has(output));
}
//@ chunk-1dbza2qv.js:4397-4670 placement
/**
 * 给读过的 artifact 结果加上“已引用”前缀，未读过则原样返回。
 */
function stripMarkOnResult(output, toolUseId, result) {
  let { content } = result;
  let first = typeof content === "string" ? content : content?.[0];
  let text = typeof first === "string" ? first : first?.type === "text" ? first.text : "";
  if (!isMarkedRead(output, toolUseId) || text.startsWith(ARTIFACT_CONTENT_AUTHORED_TAG)) return result;
  return typeof content === "string" || content === undefined
    ? {
        ...result,
        content: `${SAVED_ARTIFACT_AUTHOR_WARNING}${content ?? ""}`,
      }
    : {
        ...result,
        content: [
          {
            type: "text",
            text: ARTIFACT_CONTENT_AUTHORED_TAG,
          },
          ...content,
        ],
      };
}
//@ chunk-1dbza2qv.js:4670-4812 placement
/**
 * 若输出对象已记为读过，则把它的派生对象也记为读过。
 */
function isMarkedOutput(output, toolUseId) {
  let { outputs } = getLiveState().readsMarked;
  if (
    output !== null &&
    typeof output === "object" &&
    toolUseId !== null &&
    typeof toolUseId === "object" &&
    outputs.has(output)
  )
    outputs.add(toolUseId);
  return toolUseId;
}
export { isMarkedRead, isMarkedOutput, markReadIfOurs, stripMarkOnResult };
