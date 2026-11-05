/**
 * utils/workflowAuthoringAutoload.ts
 *
 * 2.1.316 新增：遇到 workflow 关键词或 ultracode 时自动加载 workflow 编写技能
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y4mkcswm.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isWorkflowAuthoringSkillVisible } from "../skills/skillVisibility.js";
import { renderWorkflowAuthoringSkillBody } from "../skills/bundled/workflowAuthoring.js";
import { WORKFLOW_AUTHORING } from "../skills/bundled/bundledSkillNames.js";
import { restoreSkillStateFromMessages } from "./conversationRecovery.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { getInvokedSkills, addInvokedSkill } from "../bootstrap/state.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { createUserMessage, markToolSummaryMessage } from "./messages.js";

//@ chunk-y4mkcswm.js:13127-13846 placement
/**
 * 本轮出现 workflow 关键词或 ultracode 完整提示时自动加载 workflow 编写技能：已在历史中则只更新登记，否则登记、上报并返回技能加载元消息与正文。
 */
async function autoloadWorkflowAuthoringSkill(attachments, messages, context) {
  let trigger = attachments.some((attachment) =>
    isNullRenderingAttachment(
      attachment,
      messages,
      (attachment) => attachment.type === "workflow_keyword_request",
    ),
  )
    ? "keyword"
    : attachments.some((attachment) =>
          isNullRenderingAttachment(
            attachment,
            messages,
            (attachment) => attachment.type === "ultra_effort_enter" && attachment.reminderType === "full",
          ),
        )
      ? "ultracode"
      : undefined;
  if (trigger === undefined || !isWorkflowAuthoringSkillVisible(context)) return [];
  let skillBlocks = renderWorkflowAuthoringSkillBody();
  let target = skillBlocks
    .filter((skillBlock) => skillBlock.type === "text")
    .map((skillBlock) => skillBlock.text).join(`

`);
  let skillKey = `:${WORKFLOW_AUTHORING}`;
  if (restoreSkillStateFromMessages(messagesSinceCompactBoundary([...(messages ?? [])]), target) !== null) {
    if (getInvokedSkills().get(skillKey)?.content !== target)
      addInvokedSkill(WORKFLOW_AUTHORING, `bundled:${WORKFLOW_AUTHORING}`, target, null);
    return [];
  }
  addInvokedSkill(WORKFLOW_AUTHORING, `bundled:${WORKFLOW_AUTHORING}`, target, null);
  logEvent("tengu_workflow_authoring_skill_autoload", {
    trigger: fromEnum(trigger),
  });
  logFeatureOk("workflow_authoring_autoload");
  let { formatSkillLoadingMetadata } = await import("./processUserInput/processSlashCommand.js");
  return [
    createUserMessage({
      content: formatSkillLoadingMetadata(WORKFLOW_AUTHORING),
      isMeta: true,
      turnCompanion: true,
    }),
    createUserMessage({
      content: skillBlocks,
      isMeta: true,
      turnCompanion: true,
    }),
  ].map(markToolSummaryMessage);
}
//@ chunk-y4mkcswm.js:13846-13942 placement (2.1.88 match: isNullRenderingAttachment, 1)
function isNullRenderingAttachment(msg, messages, matchesTrigger) {
  return (
    msg.type === "attachment" &&
    matchesTrigger(msg.attachment) &&
    !messages?.some((existingMessage) => existingMessage.uuid === msg.uuid)
  );
}
export { autoloadWorkflowAuthoringSkill };
