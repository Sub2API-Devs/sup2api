/**
 * utils/attachments/artifactOpeningPrefetch.ts
 *
 * 2.1.316 新增：打开 Artifact 时预取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { shouldPrefetchArtifactOpening } from "./environmentChange.js";
import { logForDebugging } from "../debug.js";
import { isOnlySystemReminders } from "../messages.js";
import { isDeferredTool as isDeferredTool_2 } from "../../tools/ToolSearchTool/prompt.js";
import { errorMessage } from "../errors.js";

//@ chunk-5xgkngpb.js:3415642-3415819 placement
/**
 * 判断是否预取工件打开相关附件（Appifact REPL 工具或快速开始开启时）。
 */
function shouldPrefetchArtifactOpening_2() {
  {
    let { isAppifactReplToolEnabled } = require("../../tools/AppifactReplTool/isEnabled.js");
    if (isAppifactReplToolEnabled()) return true;
    let { quickstartOnForSession } = require("../../services/artifacts/artifactTypes.js");
    return quickstartOnForSession();
  }
  return false;
}
//@ chunk-5xgkngpb.js:3415819-3416918 placement
/**
 * 打开 Artifact 时预取设计系统等内容，受钩子影响时跳过。
 */
async function prefetchArtifactOpening(toolUseContext, messages, promptInput = null, heldAppend = false) {
  {
    if (
      !shouldPrefetchArtifactOpening() ||
      messages === undefined ||
      toolUseContext.agentId !== undefined ||
      messages.some((message) => message.type === "assistant")
    )
      return [];
    let { preToolUseHookMayCoverArtifact } = require("../../services/artifacts/hookCoverage.js");
    if (preToolUseHookMayCoverArtifact(toolUseContext)) {
      logForDebugging("[artifactOpeningPrefetch] skipped: hooked");
      return [];
    }
    let flattened = messages.flatMap((message) =>
      message.type === "attachment" && message.attachment.type === "artifact_opening_prefetch"
        ? [message.attachment]
        : [],
    );
    let found = flattened.find((entry) => entry.kind === undefined);
    let any = flattened.some((entry) => entry.kind === "design_system");
    if (found !== undefined && (any || found.slug === undefined)) return [];
    let { artifactOpeningPrefetchContent } =
      await import("../../services/artifacts/artifactOpeningPrefetchContent.js");
    let prefetchContent =
      found === undefined
        ? await artifactOpeningPrefetchContent(toolUseContext, messages, heldAppend ? promptInput : null, {
            isSystemReminderOnlyText: isOnlySystemReminders,
            isDeferredTool: isDeferredTool_2,
          })
        : null;
    let attachments =
      prefetchContent === null
        ? []
        : [
            {
              type: "artifact_opening_prefetch",
              ...prefetchContent,
            },
          ];
    let slug = prefetchContent?.slug ?? found?.slug;
    if (slug === undefined || any) return attachments;
    try {
      let { artifactOpeningDesignSystemNote } =
        await import("../../services/artifacts/artifactOpeningDesignSystemNote.lazy.js");
      let designSystemNote = await artifactOpeningDesignSystemNote(
        toolUseContext,
        messages,
        slug,
        prefetchContent?.typeFiles ?? found?.typeFiles ?? null,
        heldAppend ? promptInput : null,
        isOnlySystemReminders,
      );
      return designSystemNote === null
        ? attachments
        : attachments.concat({
            type: "artifact_opening_prefetch",
            content: designSystemNote,
            kind: "design_system",
          });
    } catch (error) {
      logForDebugging(`[artifactOpeningPrefetch] design-system entry failed: ${errorMessage(error)}`);
      return attachments;
    }
  }
  return [];
}
export { prefetchArtifactOpening, shouldPrefetchArtifactOpening_2 };
