/**
 * utils/workflowSizeGuideline.ts
 *
 * 2.1.316 新增：工作流规模指引
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6rgkw5kr.js (6)
 * attribution: placement 6
 */
import { mergedCommandNames } from "./settings/commandSyncNames.js";
import { workflowSizeName, workflowSizeIntro } from "./workflows/workflowGates.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";

//@ chunk-6rgkw5kr.js:7642-7710 placement
function hasWorkflowSizeSetting() {
  return mergedCommandNames()?.settings.workflowSizeGuideline !== undefined;
}
//@ chunk-6rgkw5kr.js:7710-7783 placement
function workflowSizeSetting(fallbackSetting) {
  return (
    workflowSizeName(mergedCommandNames()?.settings.workflowSizeGuideline) ??
    workflowSizeName(fallbackSetting)
  );
}
//@ chunk-6rgkw5kr.js:7783-7876 placement
function resolveWorkflowSize(settings, size) {
  let resolved = workflowSizeSetting(settings);
  return resolved === undefined
    ? {
        size,
        isDefault: true,
      }
    : {
        size: resolved,
        isDefault: false,
      };
}
//@ chunk-6rgkw5kr.js:7876-7995 placement
function sessionWorkflowSize(value, configured) {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.sessionStartWorkflowSizeGuideline ??= resolveWorkflowSize(value, configured);
  return sessionFeatureValues.sessionStartWorkflowSizeGuideline;
}
//@ chunk-6rgkw5kr.js:7995-8099 placement
function workflowSizePromptLine(workflowSizeGuideline, guideline) {
  let { size, isDefault } = sessionWorkflowSize(workflowSizeGuideline, guideline);
  if (size === "unrestricted") return "";
  return `

${workflowSizeIntro(size, isDefault)}`;
}
//@ chunk-6rgkw5kr.js:8099-8387 placement
function latestWorkflowSize(a, settings, sessionId) {
  let size = resolveWorkflowSize(settings, sessionId).size;
  let attachmentSize;
  for (let j = a.length - 1; j >= 0; j--) {
    let message = a[j];
    if (message?.type === "attachment" && message.attachment.type === "workflow_size_guideline_change") {
      attachmentSize = message.attachment.size;
      break;
    }
  }
  let currentSize = attachmentSize ?? sessionWorkflowSize(settings, sessionId).size;
  if (size !== currentSize)
    return [
      {
        type: "workflow_size_guideline_change",
        size,
      },
    ];
  return [];
}
export {
  workflowSizeSetting,
  hasWorkflowSizeSetting,
  sessionWorkflowSize,
  latestWorkflowSize,
  resolveWorkflowSize,
  workflowSizePromptLine,
};
