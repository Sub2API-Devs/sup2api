/**
 * tools/SendUserFileTool/SendUserFileTool.ts
 *
 * 2.1.316 新增：SendUserFile 工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gy7w3kfr.js (11)
 * attribution: placement 11
 */
import { basename, extname } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  preprocess,
  array,
  string,
  _enum,
  u,
  E,
  M,
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
import { getDenyRuleForTool, getAskRuleForTool } from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE, checkReadPermissionForTool } from "../../utils/permissions/filesystem.js";
import { lastExistingIdentity } from "../../utils/fsSafety/pathRevalidation.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { isTopLevelBridgeSession } from "../../utils/remoteEnvironment.js";
import { uniq } from "../../utils/collections.js";
import { PERMISSION_STASH_EVICTED_SYMBOL } from "../../bootstrap/sessionSlices.js";

//@ chunk-gy7w3kfr.js:5890-6901 placement
/**
 * SendUserFile 工具输入 schema：files（单个字符串也转为数组）、可选 caption、status（normal/proactive）、可选 display（render 内联预览 / attach 只给下载卡片）。
 */
var sendUserFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    files: preprocess(
      (files) => (typeof files === "string" ? [files] : files),
      array(string()).min(1),
    ).describe(
      "File paths (absolute or relative to cwd) to send to the user. Always pass an array, even for a single file.",
    ),
    caption: string().optional().describe("Optional short caption for the file(s)."),
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
//@ chunk-gy7w3kfr.js:6901-6976 placement
/**
 * 判断是否 1 到 100 万之间的正整数（缩放尺寸）。
 */
function isPositiveIntegerUpTo1e6(t) {
  return typeof t === "number" && Number.isInteger(t) && t > 0 && t <= 1e6;
}
//@ chunk-gy7w3kfr.js:6976-7501 placement
/**
 * SendUserFile 工具输出 schema：caption、display、每个附件的路径、大小、是否图片、上传结果（uuid、媒体类型、错误与疑似限额）、缩放尺寸与项目路径，以及是否本地渲染。
 */
var sendUserFileOutputSchema = DoctorLazy(() =>
  u({
    caption: string().optional(),
    display: _enum(["render", "attach"]).optional(),
    attachments: array(
      u({
        path: string(),
        size: E(),
        isImage: M(),
        file_uuid: string().optional(),
        media_type: string().optional(),
        pathValidated: M().optional(),
        upload_error: string().optional(),
        upload_error_code: string().optional(),
        upload_suspected_limit_bytes: E().optional(),
        scaled: u({
          width: E(),
          height: E(),
          original_width: E(),
          original_height: E(),
        }).optional(),
        project_path: string().optional(),
        partial_error: string().optional(),
      }),
    ).describe("Resolved file metadata"),
    rendered_locally: M().optional(),
  }),
);
//@ chunk-gy7w3kfr.js:7501-7563 placement
/**
 * 返回图片副本的格式标签（JPEG 或 PNG）。
 */
function imageCopyFormatLabel(t) {
  return t.media_type === "image/jpeg" ? "JPEG" : "PNG";
}
//@ chunk-gy7w3kfr.js:7563-7647 placement
/**
 * 附件走路径通道时，SendUserFile 是否推迟上传。
 */
function isSendUserFileDeferred() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.sendUserFileDeferred ??= !attachmentsByPathAvailable();
  return sessionFeatureValues.sendUserFileDeferred;
}
//@ chunk-gy7w3kfr.js:7647-14209 placement
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
    let t = !env.CLAUDE_CODE_ATTACHMENTS_BY_PATH;
    if (t && (getAPIProvider() !== "firstParty" || isEssentialTrafficOnly())) return false;
    if (t && !isPolicyAllowed("allow_send_file")) return false;
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_send_user_file", true)) return false;
    return (isReplBridgeActive() || attachmentsByPathAvailable()) && !isBriefEnabled();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(t) {
    let files = t.files;
    let m = typeof files === "string" ? files : readUntrustedArray(files);
    let r =
      typeof m === "string"
        ? m
        : m === UNREADABLE_ARRAY
          ? UNREADABLE_LIST_TEXT
          : (m ?? []).filter((h) => typeof h === "string").join(", ");
    let caption = typeof t.caption === "string" ? t.caption : "";
    return caption ? `${caption} [${r}]` : `[${r}]`;
  },
  async description() {
    return DESCRIPTION;
  },
  async prompt() {
    return SEND_USER_FILE_TOOL_PROMPT;
  },
  fromAnotherProcess(t, n) {
    let m = Array.isArray(n.files) ? n.files.map(String) : [];
    let r = (T) => (T === undefined ? undefined : escapeXmlInline(clipText(T, 2000)));
    let { rendered_locally: renderedLocally, caption, display, ...l } = t;
    return {
      data: {
        ...l,
        ...(typeof n.caption === "string" && {
          caption: n.caption,
        }),
        ...((n.display === "render" || n.display === "attach") && {
          display: n.display,
        }),
        attachments: t.attachments.map(
          ({
            pathValidated,
            upload_error_code: uploadErrorCode,
            upload_suspected_limit_bytes: uploadSuspectedLimitBytes,
            scaled,
            ...d
          }) => ({
            ...d,
            path: m.includes(d.path) ? d.path : escapeForTag(clipText(d.path, 2000)),
            ...(d.file_uuid !== undefined && {
              file_uuid: r(d.file_uuid),
            }),
            ...(d.media_type !== undefined && {
              media_type: r(d.media_type),
            }),
            ...(d.upload_error !== undefined && {
              upload_error: r(d.upload_error),
            }),
            ...(d.upload_error !== undefined &&
              imageErrorCodeOrUndefined(uploadErrorCode) !== undefined && {
                upload_error_code: uploadErrorCode,
              }),
            ...(d.upload_error !== undefined &&
              isPositiveSafeInteger(uploadSuspectedLimitBytes) && {
                upload_suspected_limit_bytes: uploadSuspectedLimitBytes,
              }),
            ...(d.project_path !== undefined && {
              project_path: r(d.project_path),
            }),
            ...(d.partial_error !== undefined && {
              partial_error: r(d.partial_error),
            }),
            ...(d.file_uuid !== undefined &&
              scaled !== undefined &&
              Object.values(scaled).every(isPositiveIntegerUpTo1e6) && {
                scaled,
              }),
          }),
        ),
      },
    };
  },
  mapToolResultToToolResultBlockParam(t, toolUseId) {
    let mapped = t.attachments.map((attachment) => ({
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
    let filtered = mapped.filter((e) => e.upload_error !== undefined);
    let filtered_2 = mapped.filter((e) => e.upload_error === undefined);
    let mapped_2 = filtered_2
      .filter((e) => e.project_path !== undefined)
      .map(
        (e) =>
          `  ${e.path} \u2192 ${e.project_path}` +
          (hasMismatchedImageType(e)
            ? ` (the folder has the original; the chat shows a ${imageCopyFormatLabel(e)} copy of it${e.isImage ? "" : " as a plain file, not a picture"})`
            : ""),
      );
    let filtered_3 = filtered_2.filter((e) => e.file_uuid !== undefined && e.project_path === undefined);
    let mapped_3 = filtered_3.filter(hasMismatchedImageType).map((e) => {
      let f = `${basename(e.path, extname(e.path))}.${e.media_type === "image/jpeg" ? "jpg" : "png"}`;
      let _ = e.isImage ? "" : ", which the chat shows as a plain file, not a picture";
      return `The chat got a ${imageCopyFormatLabel(e)} copy of ${e.path}, named ${f}${_}; the file at that path is unchanged.`;
    });
    let T = [...filtered_3.map((e) => `  ${e.path} \u2192 file_uuid: ${e.file_uuid}`), ...mapped_3];
    let mapped_4 = filtered_2
      .filter((e) => e.partial_error !== undefined)
      .map((e) => `  ${e.path}: ${e.partial_error}`);
    let y = [];
    if (mapped_2.length > 0)
      y.push(
        `${mapped_2.length} ${plural(mapped_2.length, "file")} placed in the project's shared folder (visible in its Library):
` +
          mapped_2.join(`
`) +
          `
To show ${plural(mapped_2.length, "it", "them")} on the thread, declare each path on your reply: attached_outputs: [{ "kind": "file", "ref": "<path above>" }].`,
      );
    let g = filtered_2.length - mapped_2.length;
    if (g > 0) {
      y.push(
        [`${g} ${plural(g, "file")} delivered to user.`, ...T].join(`
`),
      );
      if (isClaudeAiChatCowork())
        y.push(
          "Each file shows as a card whose position relative to your text depends on the app the user is reading in, so refer to a file by its name, never as above or below.",
        );
    }
    let d = scaledImagesNote(filtered_2);
    if (d !== undefined) y.push(d);
    if (mapped_4.length > 0)
      y.push(
        `${mapped_4.length} ${plural(mapped_4.length, "file")} reached only one of its viewers:
` +
          mapped_4.join(`
`) +
          `
Tell the user which viewers missed it.`,
      );
    if (filtered.length > 0) {
      let e = (_) => `${(_ / 1048576).toFixed(1)} MiB`;
      let joined = filtered.map((_) => `  ${_.path} (${e(_.size)}): ${describeUploadFailure(_)}`).join(`
`);
      if (t.rendered_locally)
        y.push(
          `${filtered.length} ${plural(filtered.length, "file")} NOT delivered to Remote Control (phone/web) viewers \u2014 only visible in the desktop app on this machine:
` +
            joined +
            `
Tell the user the ${plural(filtered.length, "file is", "files are")} only visible in the desktop app, and why.${retryLaterHint(filtered)}`,
        );
      else
        y.push(
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
      content: y.join(`
`),
    };
  },
  renderToolUseMessage() {
    return "";
  },
  create(t) {
    return {
      async validateInput({ files }) {
        return validateAttachments(files, t.permissions());
      },
      async checkPermissions(n, m) {
        let r = t.permissions();
        let mapped = n.files.map((file) => {
          let _ = expandPath(file);
          let C = walkPermissionCheckPaths(_);
          return {
            fullPath: _,
            walked: C,
            pathsToCheck: C.spellings,
          };
        });
        let h = bridgeHostState().projectFilesDoor?.() ?? null;
        let denyRuleForTool = getDenyRuleForTool(r, READ_PATH_PROBE);
        let mapped_2 = mapped.map(({ fullPath, walked }) =>
          checkReadPermissionForTool(
            READ_PATH_PROBE,
            {
              file_path: fullPath,
            },
            r,
            walked,
          ),
        );
        let found = mapped_2.find((f) => f.behavior === "deny");
        let found_2 = mapped_2.find(
          (f) =>
            f.behavior !== "allow" &&
            f.decisionReason?.type === "rule" &&
            f.decisionReason.rule.ruleBehavior === "ask",
        );
        let askRuleForTool = getAskRuleForTool(r, READ_PATH_PROBE);
        let g;
        let d = h != null;
        if (denyRuleForTool)
          g = {
            behavior: "deny",
            message: "SendUserFile reads file contents; that action is disabled.",
            decisionReason: {
              type: "rule",
              rule: denyRuleForTool,
            },
          };
        else if (found) g = found;
        else if (found_2) {
          g = found_2;
          d &&= r.mode !== "plan";
        } else if (askRuleForTool) {
          g = {
            behavior: "ask",
            message: `Send ${n.files.length} ${plural(n.files.length, "file")} to the user? SendUserFile reads file contents.`,
            decisionReason: {
              type: "rule",
              rule: askRuleForTool,
            },
          };
          d &&= r.mode !== "plan";
        } else if (r.mode === "plan" && h) {
          let found = mapped_2.find((_) => _.behavior !== "allow");
          g = {
            behavior: "ask",
            message: `${SEND_USER_FILE_TOOL_NAME} would place ${plural(n.files.length, "a file", "files")} in the project's shared folder${found?.behavior === "ask" ? ` (${found.message})` : ""} \u2014 approve the plan first.`,
            decisionReason: {
              type: "mode",
              mode: "plan",
            },
          };
        } else
          g = mapped_2.find((f) => f.behavior !== "allow") ?? {
            behavior: "allow",
            updatedInput: n,
          };
        let writePermissionStash = t.session.writePermissionStash;
        writePermissionStash.stash(
          m.toolUseId,
          sortedUniqueKey(n.files),
          [
            ...mapped.flatMap((f) => f.pathsToCheck),
            ...(d && h ? [`${PROJECT_FILES_DOOR_PREFIX}${h.channelId}`] : []),
          ],
          "read",
        );
        for (let { fullPath, pathsToCheck } of mapped)
          writePermissionStash.stashIdentity(m.toolUseId, fullPath, await lastExistingIdentity(pathsToCheck));
        return g;
      },
      async call({ files, caption, status, display }, h) {
        let attachmentUploadLane = getAttachmentUploadLane({
          replBridgeEnabled: t.replBridgeEnabled(),
        });
        logEvent("tengu_send_user_file", {
          proactive: status === "proactive",
          file_count: files.length,
          display_set: display !== undefined,
          display_attach: display === "attach",
          upload_lane: fromEnum(attachmentUploadLane),
        });
        let l = consumeReadApproval(t.session, h.toolUseId, files);
        let projectFilesChannel =
          l.doorChannel ??
          (t.permissions().mode !== "plan" ? bridgeHostState().projectFilesDoor?.()?.channelId : undefined);
        let attachments = await resolveBriefAttachments(files, {
          lane: attachmentUploadLane,
          signal: h.signal,
          credentials: t.credentials,
          judged: l,
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
//@ chunk-gy7w3kfr.js:14209-14336 placement
function attachmentsByPathAvailable() {
  return (
    !!env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE ||
    env.CLAUDE_CODE_REMOTE ||
    env.CLAUDE_CODE_ATTACHMENTS_BY_PATH ||
    isTopHostSession() ||
    isBridgeChildFileUploadEnabled()
  );
}
//@ chunk-gy7w3kfr.js:14336-14402 placement
/**
 * 桥接子会话是否允许上传文件（开关控制）。
 */
function isBridgeChildFileUploadEnabled() {
  return (
    isTopLevelBridgeSession() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_file_upload", true)
  );
}
//@ chunk-gy7w3kfr.js:14402-14445 placement
/**
 * 去重排序后拼成一行的键（暂存权限的匹配键）。
 */
function sortedUniqueKey(t) {
  return uniq(t).sort().join(`
`);
}
//@ chunk-gy7w3kfr.js:14445-14477 placement
/**
 * 写权限暂存里“项目文件门户通道”的标记前缀。
 */
var PROJECT_FILES_DOOR_PREFIX = "\x00project-files-door:";
//@ chunk-gy7w3kfr.js:14477-14933 placement
/**
 * 取出本次调用在写权限暂存中登记的已批准读取路径与文件身份：拒绝标记时返回空；未登记时退回为每个路径的权限检查拼写；并分离出"门户通道"标记。
 */
function consumeReadApproval(session, toolUseId, paths) {
  let writePermissionStash = session.writePermissionStash;
  let s = new Map(
    uniq(paths.map((path) => expandPath(path))).map((l) => [
      l,
      writePermissionStash.takeIdentity(toolUseId, l),
    ]),
  );
  let h = writePermissionStash.consume(toolUseId, sortedUniqueKey(paths), "read");
  if (h === PERMISSION_STASH_EVICTED_SYMBOL)
    return {
      paths: [],
      identities: s,
      doorChannel: undefined,
    };
  if (h === undefined)
    return {
      paths: paths.flatMap((path) => getPathsForPermissionCheck(expandPath(path))),
      identities: s,
      doorChannel: undefined,
    };
  let found = h.find((l) => l.startsWith(PROJECT_FILES_DOOR_PREFIX));
  for (let [l, T] of s) if (T === undefined) s.set(l, null);
  return {
    paths: h.filter((l) => !l.startsWith(PROJECT_FILES_DOOR_PREFIX)),
    identities: s,
    doorChannel: found?.slice(PROJECT_FILES_DOOR_PREFIX.length),
  };
}
