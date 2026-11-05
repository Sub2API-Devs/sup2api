/**
 * tools/SendUserFileTool/SendUserFileTool.ts
 *
 * 2.1.316 新增：SendUserFile 工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c3g53x04.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, extname } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  preprocess,
  array,
  stringSchema,
  _enum,
  objectSchema,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SEND_USER_FILE_TOOL_NAME, DESCRIPTION, SEND_USER_FILE_TOOL_PROMPT } from "./prompt.js";
import { env } from "../../utils/env.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";
import { isBriefEnabled } from "../BriefTool/BriefTool.js";
import { readUntrustedArray, UNREADABLE_ARRAY, UNREADABLE_LIST_TEXT } from "../../utils/untrustedArray.js";
import { escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { escapeForTag, encodeControlChars } from "../../utils/sanitization.js";
import {
  imageErrorCodeOrUndefined,
  isPositiveSafeInteger,
  describeUploadFailure,
  retryLaterHint,
} from "../../utils/imageErrors.js";
import {
  hasMismatchedImageType,
  scaledImagesNote,
  validateAttachments,
  getAttachmentUploadLane,
  resolveBriefAttachments,
  isRenderedLocallyLane,
} from "../BriefTool/attachments.js";
import { plural } from "../../utils/stringUtils.js";
import { isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { expandPath } from "../../utils/path.js";
import { walkPermissionCheckPaths, getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { getDenyRuleForTool, findAskRuleForTool } from "../../utils/permissions/permissions.js";
import {
  READ_PATH_PROBE,
  checkReadPermissionForTool,
  normalizeCaseForComparison_2,
} from "../../utils/permissions/filesystem.js";
import { lastExistingIdentity } from "../../utils/fsSafety/pathRevalidation.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { isTopLevelBridgeSession } from "../../utils/remoteEnvironment.js";
import { PERMISSION_STASH_EVICTED_SYMBOL } from "../../bootstrap/sessionSlices.js";

//@ chunk-c3g53x04.js:6180-7191 placement
/**
 * SendUserFile 工具输入 schema：files（单个字符串也转为数组）、可选 caption、status（normal/proactive）、可选 display（render 内联预览 / attach 只给下载卡片）。
 */
var sendUserFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    files: preprocess(
      (files) => (typeof files === "string" ? [files] : files),
      array(stringSchema()).min(1),
    ).describe(
      "File paths (absolute or relative to cwd) to send to the user. Always pass an array, even for a single file.",
    ),
    caption: stringSchema().optional().describe("Optional short caption for the file(s)."),
    status: _enum(["normal", "proactive"]).describe(
      "Use 'proactive' when you're surfacing a file the user hasn't asked for and needs to see now \u2014 a generated artifact, a completed report. Use 'normal' when replying to something the user just said.",
    ),
    display: _enum(["render", "attach"])
      .optional()
      .describe(
        "How the client should present the file. 'render' opens it inline in the side panel (for HTML, SVG, Mermaid, images, PDFs \u2014 anything the user wants to look at now). 'attach' shows a download card only, no inline preview (for deliverables the user will save and open elsewhere). Omit to let the client decide by file type \u2014 today that means renderable types render and everything else attaches, same as before this parameter existed.",
      ),
  }),
);
//@ chunk-c3g53x04.js:7191-7266 placement
/**
 * 判断是否 1 到 100 万之间的正整数（缩放尺寸）。
 */
function isPositiveIntegerUpTo1e6(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 1e6;
}
//@ chunk-c3g53x04.js:7266-7791 placement
/**
 * SendUserFile 工具输出 schema：caption、display、每个附件的路径、大小、是否图片、上传结果（uuid、媒体类型、错误与疑似限额）、缩放尺寸与项目路径，以及是否本地渲染。
 */
var sendUserFileOutputSchema = DoctorLazy(() =>
  objectSchema({
    caption: stringSchema().optional(),
    display: _enum(["render", "attach"]).optional(),
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
        project_path: stringSchema().optional(),
        partial_error: stringSchema().optional(),
      }),
    ).describe("Resolved file metadata"),
    rendered_locally: booleanSchema().optional(),
  }),
);
//@ chunk-c3g53x04.js:7791-7853 placement
/**
 * 返回图片副本的格式标签（JPEG 或 PNG）。
 */
function imageCopyFormatLabel(image) {
  return image.media_type === "image/jpeg" ? "JPEG" : "PNG";
}
//@ chunk-c3g53x04.js:7853-7937 placement
/**
 * 附件走路径通道时，SendUserFile 是否推迟上传。
 */
function isSendUserFileDeferred() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.sendUserFileDeferred ??= !attachmentsByPathAvailable();
  return sessionFeatureValues.sendUserFileDeferred;
}
//@ chunk-c3g53x04.js:7937-14499 placement
var SendUserFileTool = buildTool({
  name: SEND_USER_FILE_TOOL_NAME,
  searchHint: "deliver files (screenshots, reports, artifacts) to the user",
  get shouldDefer() {
    return isSendUserFileDeferred();
  },
  briefStandalone: true,
  get preserveToolUseResultInSubagents() {
    return (
      env.CLAUDE_CODE_ATTACHMENTS_BY_PATH ||
      getFeatureValue_SESSION_PINNED("tengu_lucky_whisper", false) === true
    );
  },
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  userFacingName() {
    return "";
  },
  get inputSchema() {
    return sendUserFileInputSchema();
  },
  get outputSchema() {
    return sendUserFileOutputSchema();
  },
  isEnabled() {
    let byPathOnly = !env.CLAUDE_CODE_ATTACHMENTS_BY_PATH;
    if (byPathOnly && (getAPIProvider() !== "firstParty" || isEssentialTrafficOnly())) return false;
    if (byPathOnly && !isPolicyAllowed("allow_send_file")) return false;
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_send_user_file", true)) return false;
    return (isReplBridgeActive() || attachmentsByPathAvailable()) && !isBriefEnabled();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(input) {
    let files = input.files;
    let filesValue = typeof files === "string" ? files : readUntrustedArray(files);
    let filesText =
      typeof filesValue === "string"
        ? filesValue
        : filesValue === UNREADABLE_ARRAY
          ? UNREADABLE_LIST_TEXT
          : (filesValue ?? []).filter((filePath) => typeof filePath === "string").join(", ");
    let caption = typeof input.caption === "string" ? input.caption : "";
    return caption ? `${caption} [${filesText}]` : `[${filesText}]`;
  },
  async description() {
    return DESCRIPTION;
  },
  async prompt() {
    return SEND_USER_FILE_TOOL_PROMPT;
  },
  fromAnotherProcess(result, input) {
    let files = Array.isArray(input.files) ? input.files.map(String) : [];
    let sanitizeOptional = (value) =>
      value === undefined ? undefined : escapeXmlInline(clipText(value, 2000));
    let { rendered_locally: renderedLocally, caption, display, ...rest } = result;
    return {
      data: {
        ...rest,
        ...(typeof input.caption === "string" && {
          caption: input.caption,
        }),
        ...((input.display === "render" || input.display === "attach") && {
          display: input.display,
        }),
        attachments: result.attachments.map(
          ({
            pathValidated,
            upload_error_code: uploadErrorCode,
            upload_suspected_limit_bytes: uploadSuspectedLimitBytes,
            scaled,
            ...attachment
          }) => ({
            ...attachment,
            path: files.includes(attachment.path)
              ? attachment.path
              : escapeForTag(clipText(attachment.path, 2000)),
            ...(attachment.file_uuid !== undefined && {
              file_uuid: sanitizeOptional(attachment.file_uuid),
            }),
            ...(attachment.media_type !== undefined && {
              media_type: sanitizeOptional(attachment.media_type),
            }),
            ...(attachment.upload_error !== undefined && {
              upload_error: sanitizeOptional(attachment.upload_error),
            }),
            ...(attachment.upload_error !== undefined &&
              imageErrorCodeOrUndefined(uploadErrorCode) !== undefined && {
                upload_error_code: uploadErrorCode,
              }),
            ...(attachment.upload_error !== undefined &&
              isPositiveSafeInteger(uploadSuspectedLimitBytes) && {
                upload_suspected_limit_bytes: uploadSuspectedLimitBytes,
              }),
            ...(attachment.project_path !== undefined && {
              project_path: sanitizeOptional(attachment.project_path),
            }),
            ...(attachment.partial_error !== undefined && {
              partial_error: sanitizeOptional(attachment.partial_error),
            }),
            ...(attachment.file_uuid !== undefined &&
              scaled !== undefined &&
              Object.values(scaled).every(isPositiveIntegerUpTo1e6) && {
                scaled,
              }),
          }),
        ),
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    let mapped = result.attachments.map((attachment) => ({
      ...attachment,
      path: encodeControlChars(attachment.path),
      ...(attachment.file_uuid !== undefined && {
        file_uuid: encodeControlChars(attachment.file_uuid),
      }),
      ...(attachment.project_path !== undefined && {
        project_path: encodeControlChars(attachment.project_path),
      }),
      ...(attachment.upload_error !== undefined && {
        upload_error: escapeForTag(attachment.upload_error),
      }),
      ...(attachment.partial_error !== undefined && {
        partial_error: escapeForTag(attachment.partial_error),
      }),
    }));
    let filtered = mapped.filter((attachment) => attachment.upload_error !== undefined);
    let attachments = mapped.filter((attachment) => attachment.upload_error === undefined);
    let mapped_2 = attachments
      .filter((attachment) => attachment.project_path !== undefined)
      .map(
        (attachment) =>
          `  ${attachment.path} \u2192 ${attachment.project_path}` +
          (hasMismatchedImageType(attachment)
            ? ` (the folder has the original; the chat shows a ${imageCopyFormatLabel(attachment)} copy of it${attachment.isImage ? "" : " as a plain file, not a picture"})`
            : ""),
      );
    let filtered_2 = attachments.filter(
      (attachment) => attachment.file_uuid !== undefined && attachment.project_path === undefined,
    );
    let mapped_3 = filtered_2.filter(hasMismatchedImageType).map((attachment) => {
      let copyName = `${basename(attachment.path, extname(attachment.path))}.${attachment.media_type === "image/jpeg" ? "jpg" : "png"}`;
      let plainFileNote = attachment.isImage ? "" : ", which the chat shows as a plain file, not a picture";
      return `The chat got a ${imageCopyFormatLabel(attachment)} copy of ${attachment.path}, named ${copyName}${plainFileNote}; the file at that path is unchanged.`;
    });
    let deliveredLines = [
      ...filtered_2.map((attachment) => `  ${attachment.path} \u2192 file_uuid: ${attachment.file_uuid}`),
      ...mapped_3,
    ];
    let mapped_4 = attachments
      .filter((attachment) => attachment.partial_error !== undefined)
      .map((attachment) => `  ${attachment.path}: ${attachment.partial_error}`);
    let lines = [];
    if (mapped_2.length > 0)
      lines.push(
        `${mapped_2.length} ${plural(mapped_2.length, "file")} placed in the project's shared folder (visible in its Library):
` +
          mapped_2.join(`
`) +
          `
To show ${plural(mapped_2.length, "it", "them")} on the thread, declare each path on your reply: attached_outputs: [{ "kind": "file", "ref": "<path above>" }].`,
      );
    let failedCount = attachments.length - mapped_2.length;
    if (failedCount > 0) {
      lines.push(
        [`${failedCount} ${plural(failedCount, "file")} delivered to user.`, ...deliveredLines].join(`
`),
      );
      if (isClaudeAiChatCowork())
        lines.push(
          "Each file shows as a card whose position relative to your text depends on the app the user is reading in, so refer to a file by its name, never as above or below.",
        );
    }
    let scaledNote = scaledImagesNote(attachments);
    if (scaledNote !== undefined) lines.push(scaledNote);
    if (mapped_4.length > 0)
      lines.push(
        `${mapped_4.length} ${plural(mapped_4.length, "file")} reached only one of its viewers:
` +
          mapped_4.join(`
`) +
          `
Tell the user which viewers missed it.`,
      );
    if (filtered.length > 0) {
      let formatMiB = (bytes) => `${(bytes / 1048576).toFixed(1)} MiB`;
      let joined = filtered.map(
        (attachment) =>
          `  ${attachment.path} (${formatMiB(attachment.size)}): ${describeUploadFailure(attachment)}`,
      ).join(`
`);
      if (result.rendered_locally)
        lines.push(
          `${filtered.length} ${plural(filtered.length, "file")} NOT delivered to Remote Control (phone/web) viewers \u2014 only visible in the desktop app on this machine:
` +
            joined +
            `
Tell the user the ${plural(filtered.length, "file is", "files are")} only visible in the desktop app, and why.${retryLaterHint(filtered)}`,
        );
      else
        lines.push(
          `${filtered.length} ${plural(filtered.length, "file")} could NOT be delivered to the user:
` +
            joined +
            `
Tell the user the ${plural(filtered.length, "file was", "files were")} not delivered and why.${retryLaterHint(filtered)}`,
        );
    }
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: lines.join(`
`),
    };
  },
  renderToolUseMessage() {
    return "";
  },
  create(toolContext) {
    return {
      async validateInput({ files }) {
        return validateAttachments(files, toolContext.permissions());
      },
      async checkPermissions(input, callOptions) {
        let permissionState = toolContext.permissions();
        let mapped = input.files.map((file) => {
          let fullPath = expandPath(file);
          let walked = walkPermissionCheckPaths(fullPath);
          return {
            fullPath,
            walked,
            pathsToCheck: walked.spellings,
          };
        });
        let projectFilesDoor = bridgeHostState().projectFilesDoor?.() ?? null;
        let denyRuleForTool = getDenyRuleForTool(permissionState, READ_PATH_PROBE);
        let mapped_2 = mapped.map(({ fullPath, walked }) =>
          checkReadPermissionForTool(
            READ_PATH_PROBE,
            {
              file_path: fullPath,
            },
            permissionState,
            walked,
          ),
        );
        let found = mapped_2.find((result) => result.behavior === "deny");
        let found_2 = mapped_2.find(
          (result) =>
            result.behavior !== "allow" &&
            result.decisionReason?.type === "rule" &&
            result.decisionReason.rule.ruleBehavior === "ask",
        );
        let fileAllowRule = findAskRuleForTool(permissionState, READ_PATH_PROBE);
        let decision;
        let hasDoor = projectFilesDoor != null;
        if (denyRuleForTool)
          decision = {
            behavior: "deny",
            message: "SendUserFile reads file contents; that action is disabled.",
            decisionReason: {
              type: "rule",
              rule: denyRuleForTool,
            },
          };
        else if (found) decision = found;
        else if (found_2) {
          decision = found_2;
          hasDoor &&= permissionState.mode !== "plan";
        } else if (fileAllowRule) {
          decision = {
            behavior: "ask",
            message: `Send ${input.files.length} ${plural(input.files.length, "file")} to the user? SendUserFile reads file contents.`,
            decisionReason: {
              type: "rule",
              rule: fileAllowRule,
            },
          };
          hasDoor &&= permissionState.mode !== "plan";
        } else if (permissionState.mode === "plan" && projectFilesDoor) {
          let found = mapped_2.find((result) => result.behavior !== "allow");
          decision = {
            behavior: "ask",
            message: `${SEND_USER_FILE_TOOL_NAME} would place ${plural(input.files.length, "a file", "files")} in the project's shared folder${found?.behavior === "ask" ? ` (${found.message})` : ""} \u2014 approve the plan first.`,
            decisionReason: {
              type: "mode",
              mode: "plan",
            },
          };
        } else
          decision = mapped_2.find((result) => result.behavior !== "allow") ?? {
            behavior: "allow",
            updatedInput: input,
          };
        let writePermissionStash = toolContext.session.writePermissionStash;
        writePermissionStash.stash(
          callOptions.toolUseId,
          sortedUniqueKey(input.files),
          [
            ...mapped.flatMap((entry) => entry.pathsToCheck),
            ...(hasDoor && projectFilesDoor
              ? [`${PROJECT_FILES_DOOR_PREFIX}${projectFilesDoor.channelId}`]
              : []),
          ],
          "read",
        );
        for (let { fullPath, pathsToCheck } of mapped)
          writePermissionStash.stashIdentity(
            callOptions.toolUseId,
            fullPath,
            await lastExistingIdentity(pathsToCheck),
          );
        return decision;
      },
      async call({ files, caption, status, display }, callOptions) {
        let attachmentUploadLane = getAttachmentUploadLane({
          replBridgeEnabled: toolContext.replBridgeEnabled(),
        });
        logEvent("tengu_send_user_file", {
          proactive: status === "proactive",
          file_count: files.length,
          display_set: display !== undefined,
          display_attach: display === "attach",
          upload_lane: fromEnum(attachmentUploadLane),
        });
        let readApproval = consumeReadApproval(toolContext.session, callOptions.toolUseId, files);
        let projectFilesChannel =
          readApproval.doorChannel ??
          (toolContext.permissions().mode !== "plan"
            ? bridgeHostState().projectFilesDoor?.()?.channelId
            : undefined);
        let attachments = await resolveBriefAttachments(files, {
          lane: attachmentUploadLane,
          signal: callOptions.signal,
          credentials: toolContext.credentials,
          judged: readApproval,
          projectFilesChannel,
          originalsOnly: display === "attach",
        });
        return {
          data: {
            caption,
            display,
            attachments,
            ...(isRenderedLocallyLane(attachmentUploadLane) && {
              rendered_locally: true,
            }),
          },
        };
      },
    };
  },
});
//@ chunk-c3g53x04.js:14499-14626 placement
function attachmentsByPathAvailable() {
  return (
    !!env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE ||
    env.CLAUDE_CODE_REMOTE ||
    env.CLAUDE_CODE_ATTACHMENTS_BY_PATH ||
    isTopHostSession() ||
    isBridgeChildFileUploadEnabled()
  );
}
//@ chunk-c3g53x04.js:14626-14692 placement
/**
 * 桥接子会话是否允许上传文件（开关控制）。
 */
function isBridgeChildFileUploadEnabled() {
  return (
    isTopLevelBridgeSession() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_file_upload", true)
  );
}
//@ chunk-c3g53x04.js:14692-14735 placement
/**
 * 去重排序后拼成一行的键（暂存权限的匹配键）。
 */
function sortedUniqueKey(paths) {
  return normalizeCaseForComparison_2(paths).sort().join(`
`);
}
//@ chunk-c3g53x04.js:14735-14767 placement
/**
 * 写权限暂存里“项目文件门户通道”的标记前缀。
 */
var PROJECT_FILES_DOOR_PREFIX = "\x00project-files-door:";
//@ chunk-c3g53x04.js:14767-15223 placement
/**
 * 取出本次调用在写权限暂存中登记的已批准读取路径与文件身份：拒绝标记时返回空；未登记时退回为每个路径的权限检查拼写；并分离出"门户通道"标记。
 */
function consumeReadApproval(session, toolUseId, paths) {
  let writePermissionStash = session.writePermissionStash;
  let identitiesByPath = new Map(
    normalizeCaseForComparison_2(paths.map((path) => expandPath(path))).map((fullPath) => [
      fullPath,
      writePermissionStash.takeIdentity(toolUseId, fullPath),
    ]),
  );
  let stashedSpellings = writePermissionStash.consume(toolUseId, sortedUniqueKey(paths), "read");
  if (stashedSpellings === PERMISSION_STASH_EVICTED_SYMBOL)
    return {
      paths: [],
      identities: identitiesByPath,
      doorChannel: undefined,
    };
  if (stashedSpellings === undefined)
    return {
      paths: paths.flatMap((path) => getPathsForPermissionCheck(expandPath(path))),
      identities: identitiesByPath,
      doorChannel: undefined,
    };
  let found = stashedSpellings.find((spelling) => spelling.startsWith(PROJECT_FILES_DOOR_PREFIX));
  for (let [path, identity] of identitiesByPath) if (identity === undefined) identitiesByPath.set(path, null);
  return {
    paths: stashedSpellings.filter((spelling) => !spelling.startsWith(PROJECT_FILES_DOOR_PREFIX)),
    identities: identitiesByPath,
    doorChannel: found?.slice(PROJECT_FILES_DOOR_PREFIX.length),
  };
}
export { SendUserFileTool };
