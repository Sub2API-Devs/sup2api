/**
 * utils/workflowAuthoringAutoload.ts
 *
 * 2.1.316 新增：遇到 workflow 关键词或 ultracode 时自动加载 workflow 编写技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-70r0mv35.js (2)
 * attribution: placement 2
 */
import { RGe } from "../skills/skillVisibility.js";
import { renderWorkflowAuthoringSkillBody } from "../skills/bundled/workflowAuthoring.js";
import { WORKFLOW_AUTHORING } from "../skills/bundled/bundledSkillNames.js";
import { restoreSkillStateFromMessages } from "./conversationRecovery.js";
import { Us } from "../services/projects/threadRows.js";
import { getInvokedSkills, addInvokedSkill } from "../bootstrap/state.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { createUserMessage, Hwt } from "./messages.js";

/**
 * 本轮出现 workflow 关键词或 ultracode 完整提示时自动加载 workflow 编写技能：已在历史中则只更新登记，否则登记、上报并返回技能加载元消息与正文。
 */
//@ chunk-70r0mv35.js:11979-12698 placement
async function autoloadWorkflowAuthoringSkill(attachments, messages, context) {
  let trigger = attachments.some((e) =>
    isNullRenderingAttachment(e, messages, (i) => i.type === "workflow_keyword_request"),
  )
    ? "keyword"
    : attachments.some((e) =>
          isNullRenderingAttachment(
            e,
            messages,
            (i) => i.type === "ultra_effort_enter" && i.reminderType === "full",
          ),
        )
      ? "ultracode"
      : void 0;
  if (trigger === void 0 || !RGe(context)) return [];
  let skillBlocks = renderWorkflowAuthoringSkillBody(),
    joined = skillBlocks.filter((e) => e.type === "text").map((e) => e.text).join(`

`),
    skillKey = `:${WORKFLOW_AUTHORING}`;
  if (restoreSkillStateFromMessages(Us([...(messages ?? [])]), joined) !== null) {
    if (getInvokedSkills().get(skillKey)?.content !== joined)
      addInvokedSkill(WORKFLOW_AUTHORING, `bundled:${WORKFLOW_AUTHORING}`, joined, null);
    return [];
  }
  (addInvokedSkill(WORKFLOW_AUTHORING, `bundled:${WORKFLOW_AUTHORING}`, joined, null),
    logEvent("tengu_workflow_authoring_skill_autoload", { trigger: fromEnum(trigger) }),
    logFeatureOk("workflow_authoring_autoload"));
  let { formatSkillLoadingMetadata: formatSkillLoadingMetadata } = await import("./chunk-jghdfw5c.js");
  return [
    createUserMessage({
      content: formatSkillLoadingMetadata(WORKFLOW_AUTHORING),
      isMeta: !0,
      turnCompanion: !0,
    }),
    createUserMessage({ content: skillBlocks, isMeta: !0, turnCompanion: !0 }),
  ].map(Hwt);
}
//@ chunk-70r0mv35.js:12698-12794 placement = isNullRenderingAttachment (1)
function isNullRenderingAttachment(t, o, l) {
  return t.type === "attachment" && l(t.attachment) && !o?.some((r) => r.uuid === t.uuid);
}
