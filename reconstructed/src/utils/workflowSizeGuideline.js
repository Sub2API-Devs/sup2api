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
import { DU } from "./settings/commandSyncNames.js";
import { tTn, workflowSizeIntro } from "./workflows/workflowGates.js";
import { Ao } from "../bootstrap/sessionFeatureValues.js";

//@ chunk-6rgkw5kr.js:7642-7710 placement
function hasWorkflowSizeSetting() {
  return DU()?.settings.workflowSizeGuideline !== void 0;
}
//@ chunk-6rgkw5kr.js:7710-7783 placement
function workflowSizeSetting(e) {
  return tTn(DU()?.settings.workflowSizeGuideline) ?? tTn(e);
}
//@ chunk-6rgkw5kr.js:7783-7876 placement
function resolveWorkflowSize(e, i) {
  let l = workflowSizeSetting(e);
  return l === void 0 ? { size: i, isDefault: !0 } : { size: l, isDefault: !1 };
}
//@ chunk-6rgkw5kr.js:7876-7995 placement
function sessionWorkflowSize(e, i) {
  let l = Ao();
  return (
    (l.sessionStartWorkflowSizeGuideline ??= resolveWorkflowSize(e, i)),
    l.sessionStartWorkflowSizeGuideline
  );
}
//@ chunk-6rgkw5kr.js:7995-8099 placement
function workflowSizePromptLine(e, i) {
  let { size: size, isDefault: isDefault } = sessionWorkflowSize(e, i);
  if (size === "unrestricted") return "";
  return `

${workflowSizeIntro(size, isDefault)}`;
}
//@ chunk-6rgkw5kr.js:8099-8387 placement
function latestWorkflowSize(e, i, l) {
  let size = resolveWorkflowSize(i, l).size,
    s;
  for (let n = e.length - 1; n >= 0; n--) {
    let t = e[n];
    if (t?.type === "attachment" && t.attachment.type === "workflow_size_guideline_change") {
      s = t.attachment.size;
      break;
    }
  }
  let c = s ?? sessionWorkflowSize(i, l).size;
  if (size !== c) return [{ type: "workflow_size_guideline_change", size: size }];
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
