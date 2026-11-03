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
function workflowSizeSetting(workflowSizeGuideline) {
  return (
    workflowSizeName(mergedCommandNames()?.settings.workflowSizeGuideline) ??
    workflowSizeName(workflowSizeGuideline)
  );
}
//@ chunk-6rgkw5kr.js:7783-7876 placement
function resolveWorkflowSize(e, size) {
  let l = workflowSizeSetting(e);
  return l === undefined
    ? {
        size,
        isDefault: true,
      }
    : {
        size: l,
        isDefault: false,
      };
}
//@ chunk-6rgkw5kr.js:7876-7995 placement
function sessionWorkflowSize(e, i) {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.sessionStartWorkflowSizeGuideline ??= resolveWorkflowSize(e, i);
  return sessionFeatureValues.sessionStartWorkflowSizeGuideline;
}
//@ chunk-6rgkw5kr.js:7995-8099 placement
function workflowSizePromptLine(workflowSizeGuideline, i) {
  let { size, isDefault } = sessionWorkflowSize(workflowSizeGuideline, i);
  if (size === "unrestricted") return "";
  return `

${workflowSizeIntro(size, isDefault)}`;
}
//@ chunk-6rgkw5kr.js:8099-8387 placement
function latestWorkflowSize(e, workflowSizeGuideline, l) {
  let size = resolveWorkflowSize(workflowSizeGuideline, l).size;
  let s;
  for (let j = e.length - 1; j >= 0; j--) {
    let t = e[j];
    if (t?.type === "attachment" && t.attachment.type === "workflow_size_guideline_change") {
      s = t.attachment.size;
      break;
    }
  }
  let c = s ?? sessionWorkflowSize(workflowSizeGuideline, l).size;
  if (size !== c)
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
