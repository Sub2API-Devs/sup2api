/**
 * tools/BriefTool/BriefTool.ts
 *
 * SendUserMessage（别名 Brief）工具：给用户发送可见消息与附件，Brief 授权开关 isBriefEntitled
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/BriefTool.ts
 * pieces: chunk-8erkng7v.js (6), chunk-fmnbrxwy.js (3)
 * attribution: affinity 1, facade-exports 4, layout 2, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import {
  getFeatureValue_CACHED_WITH_REFRESH,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import {
  BRIEF_TOOL_NAME,
  LEGACY_BRIEF_TOOL_NAME,
  DESCRIPTION as DESCRIPTION_3,
  BRIEF_TOOL_PROMPT,
  PEWTER_OWL_TOOL_PROMPT,
} from "./prompt.js";
import { isPewterOwlTool, isPewterOwlBrief } from "./pewterOwl.js";
import { getUserMsgOptIn } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  numberSchema,
  booleanSchema,
  array,
  union,
  _enum,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { encodeControlChars, escapeForTag } from "../../utils/sanitization.js";
import {
  scaledImagesNote,
  validateAttachments,
  getAttachmentUploadLane,
  validateAttachmentsForCall,
  resolveBriefAttachments,
  isRenderedLocallyLane,
} from "./attachments.js";
import { plural } from "../../utils/stringUtils.js";
import { describeUploadFailure, retryLaterHint } from "../../utils/imageErrors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8erkng7v.js:381-394 affinity
var BRIEF_GATE_REFRESH_MS = 300000;
//@ chunk-8erkng7v.js:394-467 facade-exports (2.1.88 match: isBriefEntitled, 1)
/**
 * Brief 授权：CLAUDE_CODE_BRIEF 环境变量或 GrowthBook tengu_kairos_brief（默认 false，5 分钟刷新）。
 */
function isBriefEntitled() {
  return (
    env.CLAUDE_CODE_BRIEF ||
    getFeatureValue_CACHED_WITH_REFRESH("tengu_kairos_brief", false, BRIEF_GATE_REFRESH_MS)
  );
}
//@ chunk-8erkng7v.js:467-560 facade-exports
function shouldToolsListOptInToBrief(toolNames) {
  if (!toolNames.includes(BRIEF_TOOL_NAME) && !toolNames.includes(LEGACY_BRIEF_TOOL_NAME)) return false;
  if (isPewterOwlTool()) return false;
  return isBriefEntitled();
}
//@ chunk-8erkng7v.js:560-600 facade-exports
function isBriefEnabled() {
  return (getUserMsgOptIn() && isBriefEntitled()) || isPewterOwlBrief();
}
//@ chunk-8erkng7v.js:600-982 layout
/**
 * brief 模式提醒：普通助手文本对用户隐藏，只有 SendUserMessage 能送达，要求本回合用它发实质回复。
 */
var BRIEF_MODE_REPLY_REMINDER = `In brief mode, plain assistant text is hidden from the user \u2014 only ${BRIEF_TOOL_NAME} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;
//@ chunk-8erkng7v.js:982-1088 facade-exports
function getBriefEnforceText() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_kairos_brief_stop_hook_text",
    "",
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "string" && featureValue_CACHED_MAY_BE_STALE.length > 0
    ? featureValue_CACHED_MAY_BE_STALE
    : BRIEF_MODE_REPLY_REMINDER;
}
//@ chunk-fmnbrxwy.js:43393-44391 fingerprint (2.1.88 match: inputSchema, 0.621)
/**
 * Brief 输入 schema：已上传文件对象、带附件与 status 的完整版、只有 message 的精简版。
 */
var preUploadedFileSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MESSAGE_FIELD_DESCRIPTION;
var briefInputSchemaWithAttachments;
var briefInputSchemaMessageOnly;
deferInit("chunk-fmnbrxwy.js:43393", () => {
  preUploadedFileSchema = DoctorLazy(() =>
    zodStrictObject({
      file_uuid: stringSchema(),
      file_name: stringSchema(),
      size: numberSchema(),
      is_image: booleanSchema(),
      media_type: stringSchema().optional(),
    }).describe(
      "A file already uploaded to the filestore (e.g. by the device attach_file tool). Passed through without local stat or upload.",
    ),
  );
  MESSAGE_FIELD_DESCRIPTION = "The message for the user. Supports markdown formatting.";
  briefInputSchemaWithAttachments = DoctorLazy(() =>
    zodStrictObject({
      message: stringSchema().describe(MESSAGE_FIELD_DESCRIPTION),
      attachments: array(union([stringSchema(), preUploadedFileSchema()]))
        .optional()
        .describe(
          "Optional attachments for the user to see alongside your message. Each entry is either a file path (absolute or relative to cwd) for a file you can read locally, or a pre-resolved {file_uuid, file_name, size, is_image} object you obtained from a device tool such as attach_file.",
        ),
      status: _enum(["normal", "proactive"]).describe(
        "Use 'proactive' when you're surfacing something the user hasn't asked for and needs to see now \u2014 task completion while they're away, a blocker you hit, an unsolicited status update. Use 'normal' when replying to something the user just said.",
      ),
    }),
  );
  briefInputSchemaMessageOnly = DoctorLazy(() =>
    objectSchema({
      message: stringSchema().describe(MESSAGE_FIELD_DESCRIPTION),
    }),
  );
});
//@ chunk-fmnbrxwy.js:44391-44458 layout
function getAttachmentsIfEnabled(input) {
  return isBriefEnabled() && "attachments" in input ? input.attachments : undefined;
}
//@ chunk-fmnbrxwy.js:44458-47428 fingerprint (2.1.88 match: BriefTool, 0.492)
/**
 * SendUserMessage 工具（别名 Brief，briefStandalone，只读可并发）。isEnabled：fH()（Brief 可用：用户开通 tengu_kairos_brief/CLAUDE_CODE_BRIEF 等）或 Mqe()（CLAUDE_CODE_PEWTER_OWL_TOOL 或 pewter_owl_tool 开关）。fH() 为真时输入含 attachments（本地路径或已上传 file_uuid）与 status（normal/proactive），否则只有 message。call：记录 tengu_brief_send；有附件时先做路径校验（restricted、工作目录外读取限制），再按上传通道上传；结果文本说明附件是否送达（本地渲染时提示只在桌面可见，失败时 is_error）。 Brief 输出 schema：message、attachments（路径、大小、是否图片、file_uuid、上传错误、缩放信息）、sentAt、rendered_locally。
 */
var briefOutputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BriefTool;
deferInit("chunk-fmnbrxwy.js:44458", () => {
  briefOutputSchema = DoctorLazy(() =>
    objectSchema({
      message: stringSchema().describe("The message"),
      attachments: array(
        objectSchema({
          path: stringSchema(),
          size: numberSchema(),
          isImage: booleanSchema(),
          file_uuid: stringSchema().optional(),
          media_type: stringSchema().optional(),
          pathValidated: booleanSchema().optional(),
          upload_error: stringSchema().optional(),
          upload_error_code: stringSchema().optional(),
          upload_suspected_limit_bytes: numberSchema().optional(),
          scaled: objectSchema({
            width: numberSchema(),
            height: numberSchema(),
            original_width: numberSchema(),
            original_height: numberSchema(),
          }).optional(),
        }),
      )
        .optional()
        .describe("Resolved attachment metadata"),
      sentAt: stringSchema()
        .optional()
        .describe(
          "ISO timestamp captured at tool execution on the emitting process. Optional \u2014 resumed sessions replay pre-sentAt outputs verbatim.",
        ),
      rendered_locally: booleanSchema().optional(),
    }),
  );
  BriefTool = buildTool({
    name: BRIEF_TOOL_NAME,
    aliases: [LEGACY_BRIEF_TOOL_NAME],
    searchHint: "send a message to the user \u2014 your primary visible output channel",
    briefStandalone: true,
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    userFacingName() {
      return "";
    },
    get inputSchema() {
      return isBriefEnabled() ? briefInputSchemaWithAttachments() : briefInputSchemaMessageOnly();
    },
    get outputSchema() {
      return briefOutputSchema();
    },
    isEnabled() {
      return isBriefEnabled() || isPewterOwlTool();
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      return input.message;
    },
    async description() {
      return DESCRIPTION_3;
    },
    async prompt() {
      return isBriefEnabled() ? BRIEF_TOOL_PROMPT : PEWTER_OWL_TOOL_PROMPT;
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      let attachments = (result.attachments ?? []).map((attachment) => ({
        ...attachment,
        path: encodeControlChars(attachment.path),
        ...(attachment.upload_error !== undefined && {
          upload_error: escapeForTag(attachment.upload_error),
        }),
      }));
      let filtered = attachments.filter((attachment) => attachment.upload_error !== undefined);
      let includedCount = attachments.length - filtered.length;
      let scaledNote = scaledImagesNote(attachments);
      let suffix =
        (includedCount === 0 ? "" : ` (${includedCount} ${plural(includedCount, "attachment")} included)`) +
        (scaledNote === undefined
          ? ""
          : `
${scaledNote}`);
      if (filtered.length === 0)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: `Message delivered to user.${suffix}`,
        };
      let joined = filtered.map((attachment) => `  ${attachment.path}: ${describeUploadFailure(attachment)}`)
        .join(`
`);
      if (result.rendered_locally)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            `Message delivered to user.${suffix}
${filtered.length} ${plural(filtered.length, "attachment")} NOT delivered to Remote Control (phone/web) viewers \u2014 only visible in the desktop app on this machine:
` +
            joined +
            `
Tell the user the ${plural(filtered.length, "attachment is", "attachments are")} only visible in the desktop app, and why.${retryLaterHint(filtered)}`,
        };
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        is_error: true,
        content:
          `Message delivered to user.${suffix}
${filtered.length} ${plural(filtered.length, "attachment")} could NOT be delivered:
` +
          joined +
          `
Tell the user the ${plural(filtered.length, "attachment was", "attachments were")} not delivered and why.${retryLaterHint(filtered)}`,
      };
    },
    renderToolUseMessage() {
      return "";
    },
    create(sessionCtx) {
      return {
        async validateInput(input) {
          let attachments = getAttachmentsIfEnabled(input);
          if (!attachments?.length)
            return {
              result: true,
            };
          return validateAttachments(attachments, sessionCtx.permissions());
        },
        async call(input, callCtx) {
          let { message } = input;
          let attachments = getAttachmentsIfEnabled(input);
          let sentAt = new Date().toISOString();
          let attachmentUploadLane = getAttachmentUploadLane({
            replBridgeEnabled: sessionCtx.replBridgeEnabled(),
          });
          logEvent("tengu_brief_send", {
            proactive: "status" in input && input.status === "proactive",
            attachment_count: attachments?.length ?? 0,
            ignored_attachments: attachments === undefined && "attachments" in input,
            upload_lane: fromEnum(attachmentUploadLane),
          });
          if (!attachments?.length)
            return {
              data: {
                message,
                sentAt,
              },
            };
          let { verdict, judged } = await validateAttachmentsForCall(attachments, sessionCtx.permissions());
          if (!verdict.result)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              verdict.message,
              "attachment refused at the call",
            );
          let resolved = await resolveBriefAttachments(attachments, {
            lane: attachmentUploadLane,
            signal: callCtx.signal,
            credentials: sessionCtx.credentials,
            judged,
          });
          return {
            data: {
              message,
              attachments: resolved,
              sentAt,
              ...(isRenderedLocallyLane(attachmentUploadLane) && {
                rendered_locally: true,
              }),
            },
          };
        },
      };
    },
  });
});
export { isBriefEnabled, BriefTool, isBriefEntitled, getBriefEnforceText, shouldToolsListOptInToBrief };
