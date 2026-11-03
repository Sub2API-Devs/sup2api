/**
 * tools/BriefTool/BriefTool.ts
 *
 * SendUserMessage（别名 Brief）工具：给用户发送可见消息与附件，Brief 授权开关 isBriefEntitled
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/BriefTool.ts
 * pieces: chunk-kxyd0g16.js (3), chunk-tvzx5sxd.js (6)
 * attribution: fingerprint 2, layout 2, affinity 1, facade-exports 4
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
import { zodStrictObject, o, E, M, A, Ue, U, u } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-tvzx5sxd.js:381-394 affinity
var BRIEF_GATE_REFRESH_MS = 300000;
/**
 * Brief 授权：CLAUDE_CODE_BRIEF 环境变量或 GrowthBook tengu_kairos_brief（默认 false，5 分钟刷新）。
 */
//@ chunk-tvzx5sxd.js:394-467 facade-exports = isBriefEntitled (1)
function isBriefEntitled() {
  return (
    env.CLAUDE_CODE_BRIEF ||
    getFeatureValue_CACHED_WITH_REFRESH("tengu_kairos_brief", !1, BRIEF_GATE_REFRESH_MS)
  );
}
//@ chunk-tvzx5sxd.js:467-560 facade-exports
function shouldToolsListOptInToBrief(e) {
  if (!e.includes(BRIEF_TOOL_NAME) && !e.includes(LEGACY_BRIEF_TOOL_NAME)) return !1;
  if (isPewterOwlTool()) return !1;
  return isBriefEntitled();
}
//@ chunk-tvzx5sxd.js:560-600 facade-exports
function isBriefEnabled() {
  return (getUserMsgOptIn() && isBriefEntitled()) || isPewterOwlBrief();
}
/**
 * brief 模式提醒：普通助手文本对用户隐藏，只有 SendUserMessage 能送达，要求本回合用它发实质回复。
 */
//@ chunk-tvzx5sxd.js:600-982 layout
var BRIEF_MODE_REPLY_REMINDER = `In brief mode, plain assistant text is hidden from the user \u2014 only ${BRIEF_TOOL_NAME} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;
//@ chunk-tvzx5sxd.js:982-1088 facade-exports
function getBriefEnforceText() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief_stop_hook_text", "");
  return typeof e === "string" && e.length > 0 ? e : BRIEF_MODE_REPLY_REMINDER;
}
/**
 * Brief 输入 schema：已上传文件对象、带附件与 status 的完整版、只有 message 的精简版。
 */
//@ chunk-kxyd0g16.js:29472-30470 fingerprint = inputSchema (0.62)
var preUploadedFileSchema = DoctorLazy(() =>
    zodStrictObject({
      file_uuid: o(),
      file_name: o(),
      size: E(),
      is_image: M(),
      media_type: o().optional(),
    }).describe(
      "A file already uploaded to the filestore (e.g. by the device attach_file tool). Passed through without local stat or upload.",
    ),
  ),
  MESSAGE_FIELD_DESCRIPTION = "The message for the user. Supports markdown formatting.",
  briefInputSchemaWithAttachments = DoctorLazy(() =>
    zodStrictObject({
      message: o().describe(MESSAGE_FIELD_DESCRIPTION),
      attachments: A(Ue([o(), preUploadedFileSchema()]))
        .optional()
        .describe(
          "Optional attachments for the user to see alongside your message. Each entry is either a file path (absolute or relative to cwd) for a file you can read locally, or a pre-resolved {file_uuid, file_name, size, is_image} object you obtained from a device tool such as attach_file.",
        ),
      status: U(["normal", "proactive"]).describe(
        "Use 'proactive' when you're surfacing something the user hasn't asked for and needs to see now \u2014 task completion while they're away, a blocker you hit, an unsolicited status update. Use 'normal' when replying to something the user just said.",
      ),
    }),
  ),
  briefInputSchemaMessageOnly = DoctorLazy(() => u({ message: o().describe(MESSAGE_FIELD_DESCRIPTION) }));
//@ chunk-kxyd0g16.js:30470-30537 layout
function getAttachmentsIfEnabled(e) {
  return isBriefEnabled() && "attachments" in e ? e.attachments : void 0;
}
/**
 * SendUserMessage 工具（别名 Brief，briefStandalone，只读可并发）。isEnabled：fH()（Brief 可用：用户开通 tengu_kairos_brief/CLAUDE_CODE_BRIEF 等）或 Mqe()（CLAUDE_CODE_PEWTER_OWL_TOOL 或 pewter_owl_tool 开关）。fH() 为真时输入含 attachments（本地路径或已上传 file_uuid）与 status（normal/proactive），否则只有 message。call：记录 tengu_brief_send；有附件时先做路径校验（restricted、工作目录外读取限制），再按上传通道上传；结果文本说明附件是否送达（本地渲染时提示只在桌面可见，失败时 is_error）。 Brief 输出 schema：message、attachments（路径、大小、是否图片、file_uuid、上传错误、缩放信息）、sentAt、rendered_locally。
 */
//@ chunk-kxyd0g16.js:30537-33507 fingerprint = BriefTool (0.489)
var briefOutputSchema = DoctorLazy(() =>
    u({
      message: o().describe("The message"),
      attachments: A(
        u({
          path: o(),
          size: E(),
          isImage: M(),
          file_uuid: o().optional(),
          media_type: o().optional(),
          pathValidated: M().optional(),
          upload_error: o().optional(),
          upload_error_code: o().optional(),
          upload_suspected_limit_bytes: E().optional(),
          scaled: u({ width: E(), height: E(), original_width: E(), original_height: E() }).optional(),
        }),
      )
        .optional()
        .describe("Resolved attachment metadata"),
      sentAt: o()
        .optional()
        .describe(
          "ISO timestamp captured at tool execution on the emitting process. Optional \u2014 resumed sessions replay pre-sentAt outputs verbatim.",
        ),
      rendered_locally: M().optional(),
    }),
  ),
  BriefTool = buildTool({
    name: BRIEF_TOOL_NAME,
    aliases: [LEGACY_BRIEF_TOOL_NAME],
    searchHint: "send a message to the user \u2014 your primary visible output channel",
    briefStandalone: !0,
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
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return e.message;
    },
    async description() {
      return DESCRIPTION_3;
    },
    async prompt() {
      return isBriefEnabled() ? BRIEF_TOOL_PROMPT : PEWTER_OWL_TOOL_PROMPT;
    },
    mapToolResultToToolResultBlockParam(e, r) {
      let mapped = (e.attachments ?? []).map((w) => ({
          ...w,
          path: encodeControlChars(w.path),
          ...(w.upload_error !== void 0 && { upload_error: escapeForTag(w.upload_error) }),
        })),
        filtered = mapped.filter((w) => w.upload_error !== void 0),
        f = mapped.length - filtered.length,
        h = scaledImagesNote(mapped),
        y =
          (f === 0 ? "" : ` (${f} ${plural(f, "attachment")} included)`) +
          (h === void 0
            ? ""
            : `
${h}`);
      if (filtered.length === 0)
        return { tool_use_id: r, type: "tool_result", content: `Message delivered to user.${y}` };
      let joined = filtered.map((w) => `  ${w.path}: ${describeUploadFailure(w)}`).join(`
`);
      if (e.rendered_locally)
        return {
          tool_use_id: r,
          type: "tool_result",
          content:
            `Message delivered to user.${y}
${filtered.length} ${plural(filtered.length, "attachment")} NOT delivered to Remote Control (phone/web) viewers \u2014 only visible in the desktop app on this machine:
` +
            joined +
            `
Tell the user the ${plural(filtered.length, "attachment is", "attachments are")} only visible in the desktop app, and why.${retryLaterHint(filtered)}`,
        };
      return {
        tool_use_id: r,
        type: "tool_result",
        is_error: !0,
        content:
          `Message delivered to user.${y}
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
    create(e) {
      return {
        async validateInput(r) {
          let n = getAttachmentsIfEnabled(r);
          if (!n?.length) return { result: !0 };
          return validateAttachments(n, e.permissions());
        },
        async call(r, n) {
          let { message: message } = r,
            f = getAttachmentsIfEnabled(r),
            iso = new Date().toISOString(),
            y = getAttachmentUploadLane({ replBridgeEnabled: e.replBridgeEnabled() });
          if (
            (logEvent("tengu_brief_send", {
              proactive: "status" in r && r.status === "proactive",
              attachment_count: f?.length ?? 0,
              ignored_attachments: f === void 0 && "attachments" in r,
              upload_lane: fromEnum(y),
            }),
            !f?.length)
          )
            return { data: { message: message, sentAt: iso } };
          let { verdict: verdict, judged: judged } = await validateAttachmentsForCall(f, e.permissions());
          if (!verdict.result)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              verdict.message,
              "attachment refused at the call",
            );
          let S = await resolveBriefAttachments(f, {
            lane: y,
            signal: n.signal,
            credentials: e.credentials,
            judged: judged,
          });
          return {
            data: {
              message: message,
              attachments: S,
              sentAt: iso,
              ...(isRenderedLocallyLane(y) && { rendered_locally: !0 }),
            },
          };
        },
      };
    },
  });

export { BriefTool, isBriefEnabled, isBriefEntitled };
