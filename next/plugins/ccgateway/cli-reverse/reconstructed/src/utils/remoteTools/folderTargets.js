/**
 * utils/remoteTools/folderTargets.ts
 *
 * 2.1.316 新增：远程工具文件夹目标
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRequestComputerFolderTool } from "../../remote/tools/protocolConstants.js";
import { isAttachAnnounceWaitOn } from "../../services/remoteTools/servingGates.js";
import { RemoteBackgroundCommands } from "../../services/remoteTools/backgroundCommands.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { attachStateSchema } from "../../remote/tools/toolHostsNotice.js";
import { safeParseJSON } from "../json.js";

//@ chunk-5xgkngpb.js:3849461-3849737 placement
/**
 * 等待下一次宿主通告、中止或超时。
 */
function waitForAnnounce(announcer, signal, timeoutMs) {
  return new Promise((resolve) => {
    let settle = (outcome) => {
      clearTimeout(timer);
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    };
    let onAbort = () => settle("aborted");
    let unsubscribe = announcer.onNextAnnounce(() => settle("announced"));
    let timer = setTimeout((fireTimeout) => fireTimeout("slice"), timeoutMs, settle);
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    if (signal.aborted) settle("aborted");
  });
}
//@ chunk-5xgkngpb.js:3849737-3849750 placement
var MAX_REMOTE_COMMAND_LISTING_MS = 5000;
//@ chunk-5xgkngpb.js:3849750-3850430 placement
async function waitForFolderAttached({ toolState, fullToolName, content, signal }) {
  try {
    if (
      !isRequestComputerFolderTool(fullToolName) ||
      signal.aborted ||
      !isAttachAnnounceWaitOn() ||
      !hasAttachedState(content) ||
      hasAttachedRemoteCommands(toolState)
    )
      return;
    let now = Date.now();
    let outcome = await waitForAnnounce(
      toolState.get(RemoteBackgroundCommands),
      signal,
      MAX_REMOTE_COMMAND_LISTING_MS,
    );
    let waitedMs = Date.now() - now;
    logForDebugging(
      `[remote-tools] held the folder request's "attached" result ${waitedMs} ms for the computer's announcement: ${outcome === "announced" ? "it arrived" : outcome === "aborted" ? "the call was aborted first" : "none arrived in time"}`,
    );
    logEvent("tengu_remote_tool_targets", {
      event: lit_2("attach_result_announce_wait"),
      source: lit_2("session"),
      announce_arrived: outcome === "announced",
      waited_ms: waitedMs,
    });
  } catch (error) {
    logForDebugging(
      `[remote-tools] the wait for the computer's announcement after "attached" failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
  }
}
//@ chunk-5xgkngpb.js:3850430-3850528 placement
function hasAttachedRemoteCommands(toolState) {
  try {
    let entries = toolState.get(RemoteBackgroundCommands).entries();
    return Array.isArray(entries) && entries.length > 0;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:3850528-3850814 placement
/**
 * 工具结果中是否有 state 为 attached 的 JSON。
 */
function hasAttachedState(content) {
  return (
    typeof content === "string"
      ? [content]
      : Array.isArray(content)
        ? content.flatMap((block) =>
            typeof block === "object" &&
            block !== null &&
            "type" in block &&
            block.type === "text" &&
            "text" in block &&
            typeof block.text === "string"
              ? [block.text]
              : [],
          )
        : []
  ).some((text) => {
    let parsed = attachStateSchema().safeParse(safeParseJSON(text, false));
    return parsed.success && parsed.data.state === "attached";
  });
}
export { waitForAnnounce, waitForFolderAttached };
