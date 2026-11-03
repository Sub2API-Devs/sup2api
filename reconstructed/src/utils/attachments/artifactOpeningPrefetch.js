/**
 * utils/attachments/artifactOpeningPrefetch.ts
 *
 * 2.1.316 新增：打开 Artifact 时预取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { VCn } from "./environmentChange.js";
import { logForDebugging } from "../debug.js";
import { isOnlySystemReminders } from "../messages.js";
import { isDeferredTool } from "../../tools/ToolSearchTool/prompt.js";
import { errorMessage } from "../errors.js";

/**
 * 判断是否预取工件打开相关附件（Appifact REPL 工具或快速开始开启时）。
 */
//@ chunk-e6aww6q8.js:3329885-3330062 placement
function shouldPrefetchArtifactOpening() {
  {
    let { isAppifactReplToolEnabled: isAppifactReplToolEnabled } = require("./chunk-7sdmvp2h.js");
    if (isAppifactReplToolEnabled()) return !0;
    let { quickstartOnForSession: quickstartOnForSession } = require("./chunk-9c77ygzk.js");
    return quickstartOnForSession();
  }
  return !1;
}
/**
 * 打开 Artifact 时预取设计系统等内容，受钩子影响时跳过。
 */
//@ chunk-e6aww6q8.js:3330062-3331158 placement
async function prefetchArtifactOpening(e, n, r = null, s = !1) {
  {
    if (!VCn() || n === void 0 || e.agentId !== void 0 || n.some((Se) => Se.type === "assistant")) return [];
    let { preToolUseHookMayCoverArtifact: preToolUseHookMayCoverArtifact } = require("./chunk-a2c19btq.js");
    if (preToolUseHookMayCoverArtifact(e))
      return (logForDebugging("[artifactOpeningPrefetch] skipped: hooked"), []);
    let flattened = n.flatMap((Se) =>
        Se.type === "attachment" && Se.attachment.type === "artifact_opening_prefetch" ? [Se.attachment] : [],
      ),
      found = flattened.find((Se) => Se.kind === void 0),
      any = flattened.some((Se) => Se.kind === "design_system");
    if (found !== void 0 && (any || found.slug === void 0)) return [];
    let { artifactOpeningPrefetchContent: artifactOpeningPrefetchContent } =
        await import("./chunk-kmq5scq7.js"),
      G =
        found === void 0
          ? await artifactOpeningPrefetchContent(e, n, s ? r : null, {
              isSystemReminderOnlyText: isOnlySystemReminders,
              isDeferredTool: isDeferredTool,
            })
          : null,
      q = G === null ? [] : [{ type: "artifact_opening_prefetch", ...G }],
      Z = G?.slug ?? found?.slug;
    if (Z === void 0 || any) return q;
    try {
      let { artifactOpeningDesignSystemNote: artifactOpeningDesignSystemNote } =
          await import("./chunk-87yw66gx.js"),
        ke = await artifactOpeningDesignSystemNote(
          e,
          n,
          Z,
          G?.typeFiles ?? found?.typeFiles ?? null,
          s ? r : null,
          isOnlySystemReminders,
        );
      return ke === null
        ? q
        : q.concat({ type: "artifact_opening_prefetch", content: ke, kind: "design_system" });
    } catch (error) {
      return (
        logForDebugging(`[artifactOpeningPrefetch] design-system entry failed: ${errorMessage(error)}`),
        q
      );
    }
  }
  return [];
}

export { prefetchArtifactOpening, shouldPrefetchArtifactOpening };
