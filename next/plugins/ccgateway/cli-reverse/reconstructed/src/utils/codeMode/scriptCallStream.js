/**
 * utils/codeMode/scriptCallStream.ts
 *
 * 脚本内层调用的流式收集：先扣住，收到结果后放行或结束（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xgksxb70.js (3)
 * attribution: placement 3
 */
import { identity } from "../identity.js";
import { isReplSpliceWaitEnabled } from "./waitForNews.js";
import { isVSCodeExtensionStream } from "./vscodeExtensionStream.js";
import { scriptCallFrame } from "../../tools/REPLTool/scriptCallFrame.js";
import { createExplanationPromise } from "../../components/permissions/PermissionExplanation.js";
import { enqueueTaskNotification } from "../task/taskNotifications.js";
import { logError } from "../log.js";
import { SDKToolProgressMessageSchema_2 } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-xgksxb70.js:880-913 placement
var streamsByToolUseId = identity(new Map(), (map) => map.clear());
//@ chunk-xgksxb70.js:913-1513 placement
/**
 * 为一次脚本调用开流：先扣住进度帧，放行后补发；结束时清表并送结束帧。
 */
function openScriptCallStream(toolUseId) {
  if (toolUseId === undefined || !isReplSpliceWaitEnabled() || !isVSCodeExtensionStream()) return;
  let stream = {
    state: "holding",
    held: new Map(),
  };
  return {
    awaitReceipt() {
      streamsByToolUseId.set(toolUseId, stream);
    },
    tick(progress) {
      if (progress.type !== "progress" || stream.state === "ended") return;
      try {
        let frame = scriptCallFrame({
          toolUseID: progress.toolUseID,
          parentToolUseID: progress.parentToolUseID ?? toolUseId,
          data: progress.data,
          withheldInput: createExplanationPromise(progress.data),
        });
        if (frame === undefined) return;
        if (stream.state === "released") enqueueTaskNotification(frame);
        else stream.held.set(frame.tool_use_id, frame);
      } catch (error) {
        logError(error);
      }
    },
    ended(result, meta) {
      if (stream.state === "ended") return;
      let wasReleased = stream.state === "released";
      stream.state = "ended";
      stream.held.clear();
      if (!wasReleased) return;
      streamsByToolUseId.delete(toolUseId);
      stream.sentEnd = true;
      SDKToolProgressMessageSchema_2(toolUseId, result, meta);
    },
    lost() {
      if (stream.sentEnd === true) {
        stream.sentEnd = undefined;
        SDKToolProgressMessageSchema_2(toolUseId, undefined, [], true);
      }
    },
  };
}
//@ chunk-xgksxb70.js:1513-1901 placement
/**
 * 收到 tool_result 时放行对应脚本调用扣住的进度帧。
 */
function releaseScriptCallProgress(message) {
  if (streamsByToolUseId.size === 0 || message.type !== "user" || !Array.isArray(message.message.content))
    return;
  try {
    for (let block of message.message.content) {
      if (block.type !== "tool_result") continue;
      let stream = streamsByToolUseId.get(block.tool_use_id);
      if (stream?.state === "ended") {
        streamsByToolUseId.delete(block.tool_use_id);
        SDKToolProgressMessageSchema_2(block.tool_use_id, undefined, []);
        continue;
      }
      if (stream?.state !== "holding") continue;
      stream.state = "released";
      for (let frame of stream.held.values()) enqueueTaskNotification(frame);
      stream.held.clear();
    }
  } catch (error) {
    logError(error);
  }
}
export { openScriptCallStream, releaseScriptCallProgress };
