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
import { join, join as join_2, dirname, dirname as dirname_2 } from "path";
import { readFile } from "fs/promises";
import { W } from "../components/LogSelector.js";
import { sanitizeSessionTitle } from "../utils/stringUtils.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { pathToSessionSideKey } from "../utils/storage/storageKeys.js";
import { isDiskless } from "../bootstrap/state.js";

//@ chunk-63641kq7.js:5307-5362 placement
function getCustomTitlePath(e, n) {
  return join_2(dirname_2(e), n, "custom-title.json");
}
//@ chunk-63641kq7.js:5362-5556 placement
async function readCustomTitle(e, n, r) {
  let t = await readSideFileText(getCustomTitlePath(e, n), r);
  if (t === void 0) return;
  let i;
  try {
    i = JSON.parse(t);
  } catch {
    return;
  }
  let safeParse = W().safeParse(i);
  if (!safeParse.success) return;
  return sanitizeSessionTitle(safeParse.data.customTitle) || void 0;
}
//@ chunk-63641kq7.js:5556-5796 placement
async function readSideFileText(e, n) {
  if (isStorageV5Enabled() && n !== void 0)
    try {
      let r = pathToSessionSideKey(e);
      if (r !== void 0) {
        let text = await n.readText([r]);
        if (!text.ok) return;
        let i = text.value.items[0];
        return i.found ? i.value : void 0;
      }
    } catch {
      return;
    }
  if (isDiskless()) return;
  try {
    return await readFile(e, "utf8");
  } catch {
    return;
  }
}
//@ chunk-63641kq7.js:5796-5985 placement
var TOOL_PERMISSION_REQUEST_FAILED = "Tool permission request failed",
  oKo = "Tool permission stream closed before response received",
  WVr = "Stream closed",
  Ce = [
    `${TOOL_PERMISSION_REQUEST_FAILED}: AbortError: ${oKo}`,
    `${TOOL_PERMISSION_REQUEST_FAILED}: AbortError: ${WVr}`,
    TOOL_PERMISSION_REQUEST_FAILED,
  ];

export { TOOL_PERMISSION_REQUEST_FAILED, readCustomTitle, oKo, WVr, getCustomTitlePath };
