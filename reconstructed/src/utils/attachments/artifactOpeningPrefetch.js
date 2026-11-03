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
import { shouldPrefetchArtifactOpening } from "./environmentChange.js";
import { logForDebugging } from "../debug.js";
import { isOnlySystemReminders } from "../messages.js";
import { isDeferredTool as isDeferredTool_2 } from "../../tools/ToolSearchTool/prompt.js";
import { errorMessage } from "../errors.js";

//@ chunk-e6aww6q8.js:3329885-3330062 placement
/**
 * 判断是否预取工件打开相关附件（Appifact REPL 工具或快速开始开启时）。
 */
function shouldPrefetchArtifactOpening_2() {
  {
    let { isAppifactReplToolEnabled } = require("./chunk-7sdmvp2h.js");
    if (isAppifactReplToolEnabled()) return true;
    let { quickstartOnForSession } = require("./chunk-9c77ygzk.js");
    return quickstartOnForSession();
  }
  return false;
}
//@ chunk-e6aww6q8.js:3330062-3331158 placement
/**
 * 打开 Artifact 时预取设计系统等内容，受钩子影响时跳过。
 */
async function prefetchArtifactOpening(toolUseContext, messages, r = null, s = false) {
  {
    if (
      !shouldPrefetchArtifactOpening() ||
      messages === undefined ||
      toolUseContext.agentId !== undefined ||
      messages.some((Se) => Se.type === "assistant")
    )
      return [];
    let { preToolUseHookMayCoverArtifact } = require("./chunk-a2c19btq.js");
    if (preToolUseHookMayCoverArtifact(toolUseContext)) {
      logForDebugging("[artifactOpeningPrefetch] skipped: hooked");
      return [];
    }
    let flattened = messages.flatMap((Se) =>
      Se.type === "attachment" && Se.attachment.type === "artifact_opening_prefetch" ? [Se.attachment] : [],
    );
    let found = flattened.find((Se) => Se.kind === undefined);
    let any = flattened.some((Se) => Se.kind === "design_system");
    if (found !== undefined && (any || found.slug === undefined)) return [];
    let { artifactOpeningPrefetchContent } = await import("./chunk-kmq5scq7.js");
    let G =
      found === undefined
        ? await artifactOpeningPrefetchContent(toolUseContext, messages, s ? r : null, {
            isSystemReminderOnlyText: isOnlySystemReminders,
            isDeferredTool: isDeferredTool_2,
          })
        : null;
    let q =
      G === null
        ? []
        : [
            {
              type: "artifact_opening_prefetch",
              ...G,
            },
          ];
    let slug = G?.slug ?? found?.slug;
    if (slug === undefined || any) return q;
    try {
      let { artifactOpeningDesignSystemNote } = await import("./chunk-87yw66gx.js");
      let ke = await artifactOpeningDesignSystemNote(
        toolUseContext,
        messages,
        slug,
        G?.typeFiles ?? found?.typeFiles ?? null,
        s ? r : null,
        isOnlySystemReminders,
      );
      return ke === null
        ? q
        : q.concat({
            type: "artifact_opening_prefetch",
            content: ke,
            kind: "design_system",
          });
    } catch (error) {
      logForDebugging(`[artifactOpeningPrefetch] design-system entry failed: ${errorMessage(error)}`);
      return q;
    }
  }
  return [];
}
export { prefetchArtifactOpening, shouldPrefetchArtifactOpening_2 };
