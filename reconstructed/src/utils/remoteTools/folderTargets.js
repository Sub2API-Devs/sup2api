/**
 * utils/remoteTools/folderTargets.ts
 *
 * 2.1.316 新增：远程工具文件夹目标
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { m2 } from "../../remote/tools/protocolConstants.js";
import { isAttachAnnounceWaitOn } from "../../services/remoteTools/servingGates.js";
import { RemoteBackgroundCommands } from "../../services/remoteTools/backgroundCommands.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { r4o } from "../../remote/tools/toolHostsNotice.js";
import { safeParseJSON } from "../json.js";

/**
 * 等待下一次宿主通告、中止或超时。
 */
//@ chunk-e6aww6q8.js:3753706-3753982 placement
function waitForAnnounce(e, n, r) {
  return new Promise((s) => {
    let h = (L) => {
        (clearTimeout(w), onNextAnnounce(), n.removeEventListener("abort", y), s(L));
      },
      y = () => h("aborted"),
      onNextAnnounce = e.onNextAnnounce(() => h("announced")),
      w = setTimeout((L) => L("slice"), r, h);
    if ((n.addEventListener("abort", y, { once: !0 }), n.aborted)) h("aborted");
  });
}
//@ chunk-e6aww6q8.js:3753982-3753995 placement
var gUr = 5000;
//@ chunk-e6aww6q8.js:3753995-3754675 placement
async function waitForFolderAttached({
  toolState: toolState,
  fullToolName: fullToolName,
  content: content,
  signal: signal,
}) {
  try {
    if (
      !m2(fullToolName) ||
      signal.aborted ||
      !isAttachAnnounceWaitOn() ||
      !hasAttachedState(content) ||
      hUr(toolState)
    )
      return;
    let now = Date.now(),
      y = await waitForAnnounce(toolState.get(RemoteBackgroundCommands), signal, gUr),
      S = Date.now() - now;
    (logForDebugging(
      `[remote-tools] held the folder request's "attached" result ${S} ms for the computer's announcement: ${y === "announced" ? "it arrived" : y === "aborted" ? "the call was aborted first" : "none arrived in time"}`,
    ),
      logEvent("tengu_remote_tool_targets", {
        event: lit_2("attach_result_announce_wait"),
        source: lit_2("session"),
        announce_arrived: y === "announced",
        waited_ms: S,
      }));
  } catch (error) {
    logForDebugging(
      `[remote-tools] the wait for the computer's announcement after "attached" failed: ${error instanceof Error ? error.message : String(error)}`,
      { level: "error" },
    );
  }
}
//@ chunk-e6aww6q8.js:3754675-3754773 placement
function hUr(e) {
  try {
    let entries = e.get(RemoteBackgroundCommands).entries();
    return Array.isArray(entries) && entries.length > 0;
  } catch {
    return !1;
  }
}
/**
 * 工具结果中是否有 state 为 attached 的 JSON。
 */
//@ chunk-e6aww6q8.js:3754773-3755059 placement
function hasAttachedState(e) {
  return (
    typeof e === "string"
      ? [e]
      : Array.isArray(e)
        ? e.flatMap((r) =>
            typeof r === "object" &&
            r !== null &&
            "type" in r &&
            r.type === "text" &&
            "text" in r &&
            typeof r.text === "string"
              ? [r.text]
              : [],
          )
        : []
  ).some((r) => {
    let safeParse = r4o().safeParse(safeParseJSON(r, !1));
    return safeParse.success && safeParse.data.state === "attached";
  });
}

export { waitForAnnounce, waitForFolderAttached };
