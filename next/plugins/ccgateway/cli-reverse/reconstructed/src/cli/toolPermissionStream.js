/**
 * cli/toolPermissionStream.ts
 *
 * 2.1.316 新增：stream-json 模式下工具权限请求的消息构造
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63641kq7.js (4)
 * attribution: placement 4
 */
import { join, dirname } from "path";
import { readFile } from "fs/promises";
import { LogSelectorOptionsSchema } from "../components/LogSelector.js";
import { sanitizeSessionTitle } from "../utils/stringUtils.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { pathToSessionSideKey } from "../utils/storage/storageKeys.js";
import { isDiskless } from "../bootstrap/state.js";

//@ chunk-63641kq7.js:5307-5362 placement
function getCustomTitlePath(title, sessionId) {
  return join(dirname(title), sessionId, "custom-title.json");
}
//@ chunk-63641kq7.js:5362-5556 placement
async function readCustomTitle(fullPath, sessionId, options) {
  let sideFileText = await readSideFileText(getCustomTitlePath(fullPath, sessionId), options);
  if (sideFileText === undefined) return;
  let raw;
  try {
    raw = JSON.parse(sideFileText);
  } catch {
    return;
  }
  let parsed = LogSelectorOptionsSchema().safeParse(raw);
  if (!parsed.success) return;
  return sanitizeSessionTitle(parsed.data.customTitle) || undefined;
}
//@ chunk-63641kq7.js:5556-5796 placement
async function readSideFileText(customTitlePath, options) {
  if (isStorageV5Enabled() && options !== undefined)
    try {
      let sideKey = pathToSessionSideKey(customTitlePath);
      if (sideKey !== undefined) {
        let text = await options.readText([sideKey]);
        if (!text.ok) return;
        let item = text.value.items[0];
        return item.found ? item.value : undefined;
      }
    } catch {
      return;
    }
  if (isDiskless()) return;
  try {
    return await readFile(customTitlePath, "utf8");
  } catch {
    return;
  }
}
//@ chunk-63641kq7.js:5796-5985 placement
/**
 * 权限流的失败文案："Tool permission request failed: AbortError: …" 的几种变体，用于识别流提前关闭。
 */
var TOOL_PERMISSION_REQUEST_FAILED = "Tool permission request failed";
var TOOL_PERMISSION_STREAM_CLOSED_TEXT = "Tool permission stream closed before response received";
var STREAM_CLOSED_TEXT = "Stream closed";
var STREAM_CLOSED_FAILURE_MESSAGES = [
  `${TOOL_PERMISSION_REQUEST_FAILED}: AbortError: ${TOOL_PERMISSION_STREAM_CLOSED_TEXT}`,
  `${TOOL_PERMISSION_REQUEST_FAILED}: AbortError: ${STREAM_CLOSED_TEXT}`,
  TOOL_PERMISSION_REQUEST_FAILED,
];
export {
  TOOL_PERMISSION_REQUEST_FAILED,
  readCustomTitle,
  TOOL_PERMISSION_STREAM_CLOSED_TEXT,
  STREAM_CLOSED_TEXT,
  getCustomTitlePath,
};
