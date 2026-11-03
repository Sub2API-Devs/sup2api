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
import { zodStrictObject, Ka, A, o, U, u, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
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
import { readUntrustedArray, Uf, E3 } from "../../utils/untrustedArray.js";
import { escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { escapeForTag, encodeControlChars } from "../../utils/sanitization.js";
import { cst, q9o, describeUploadFailure, retryLaterHint } from "../../utils/imageErrors.js";
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
import { ao } from "../../bridge/bridgeHostState.js";
import { getDenyRuleForTool, getAskRuleForTool } from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE, checkReadPermissionForTool } from "../../utils/permissions/filesystem.js";
import { lastExistingIdentity } from "../../utils/fsSafety/pathRevalidation.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { Ehe } from "../../utils/remoteEnvironment.js";
import { uniq } from "../../utils/collections.js";
import { BMe } from "../../bootstrap/sessionSlices.js";

/**
 * SendUserFile 工具输入 schema：files（单个字符串也转为数组）、可选 caption、status（normal/proactive）、可选 display（render 内联预览 / attach 只给下载卡片）。
 */
//@ chunk-gy7w3kfr.js:5890-6901 placement
var sendUserFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    files: Ka((files) => (typeof files === "string" ? [files] : files), A(o()).min(1)).describe(
      "File paths (absolute or relative to cwd) to send to the user. Always pass an array, even for a single file.",
    ),
    caption: o().optional().describe("Optional short caption for the file(s)."),
    status: U(["normal", "proactive"]).describe(
      "Use 'proactive' when you're surfacing a file the user hasn't asked for and needs to see now \u2014 a generated artifact, a completed report. Use 'normal' when replying to something the user just said.",
    ),
    display: U(["render", "attach"])
      .optional()
      .describe(
        "How the client should present the file. 'render' opens it inline in the side panel (for HTML, SVG, Mermaid, images, PDFs \u2014 anything the user wants to look at now). 'attach' shows a download card only, no inline preview (for deliverables the user will save and open elsewhere). Omit to let the client decide by file type \u2014 today that means renderable types render and everything else attaches, same as before this parameter existed.",
      ),
  }),
);
//@ chunk-gy7w3kfr.js:6901-6976 placement
function I(t) {
  return typeof t === "number" && Number.isInteger(t) && t > 0 && t <= 1e6;
}
/**
 * SendUserFile 工具输出 schema：caption、display、每个附件的路径、大小、是否图片、上传结果（uuid、媒体类型、错误与疑似限额）、缩放尺寸与项目路径，以及是否本地渲染。
 */
//@ chunk-gy7w3kfr.js:6976-7501 placement
var sendUserFileOutputSchema = DoctorLazy(() =>
  u({
    caption: o().optional(),
    display: U(["render", "attach"]).optional(),
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
        project_path: o().optional(),
        partial_error: o().optional(),
      }),
    ).describe("Resolved file metadata"),
    rendered_locally: M().optional(),
  }),
);
//@ chunk-gy7w3kfr.js:7501-7563 placement
function R(t) {
  return t.media_type === "image/jpeg" ? "JPEG" : "PNG";
}
//@ chunk-gy7w3kfr.js:7563-7647 placement
function L() {
  let t = Ao();
  return ((t.sendUserFileDeferred ??= !attachmentsByPathAvailable()), t.sendUserFileDeferred);
}
//@ chunk-gy7w3kfr.js:7647-14209 placement
var SendUserFileTool = buildTool({
  name: SEND_USER_FILE_TOOL_NAME,
  searchHint: "deliver files (screenshots, reports, artifacts) to the user",
  get shouldDefer() {
    return L();
  },
  briefStandalone: !0,
  get preserveToolUseResultInSubagents() {
    return (
      env.CLAUDE_CODE_ATTACHMENTS_BY_PATH || getFeatureValue_SESSION_PINNED("tengu_lucky_whisper", !1) === !0
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
    if (t && (getAPIProvider() !== "firstParty" || isEssentialTrafficOnly())) return !1;
    if (t && !isPolicyAllowed("allow_send_file")) return !1;
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_send_user_file", !0)) return !1;
    return (isReplBridgeActive() || attachmentsByPathAvailable()) && !isBriefEnabled();
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(t) {
    let files = t.files,
      m = typeof files === "string" ? files : readUntrustedArray(files),
      r =
        typeof m === "string" ? m : m === Uf ? E3 : (m ?? []).filter((h) => typeof h === "string").join(", "),
      s = typeof t.caption === "string" ? t.caption : "";
    return s ? `${s} [${r}]` : `[${r}]`;
  },
  async description() {
    return DESCRIPTION;
  },
  async prompt() {
    return SEND_USER_FILE_TOOL_PROMPT;
  },
  fromAnotherProcess(t, n) {
    let m = Array.isArray(n.files) ? n.files.map(String) : [],
      r = (T) => (T === void 0 ? void 0 : escapeXmlInline(clipText(T, 2000))),
      { rendered_locally: rendered_locally, caption: caption, display: display, ...l } = t;
    return {
      data: {
        ...l,
        ...(typeof n.caption === "string" && { caption: n.caption }),
        ...((n.display === "render" || n.display === "attach") && { display: n.display }),
        attachments: t.attachments.map(
          ({
            pathValidated: pathValidated,
            upload_error_code: upload_error_code,
            upload_suspected_limit_bytes: upload_suspected_limit_bytes,
            scaled: scaled,
            ...d
          }) => ({
            ...d,
            path: m.includes(d.path) ? d.path : escapeForTag(clipText(d.path, 2000)),
            ...(d.file_uuid !== void 0 && { file_uuid: r(d.file_uuid) }),
            ...(d.media_type !== void 0 && { media_type: r(d.media_type) }),
            ...(d.upload_error !== void 0 && { upload_error: r(d.upload_error) }),
            ...(d.upload_error !== void 0 &&
              cst(upload_error_code) !== void 0 && { upload_error_code: upload_error_code }),
            ...(d.upload_error !== void 0 &&
              q9o(upload_suspected_limit_bytes) && {
                upload_suspected_limit_bytes: upload_suspected_limit_bytes,
              }),
            ...(d.project_path !== void 0 && { project_path: r(d.project_path) }),
            ...(d.partial_error !== void 0 && { partial_error: r(d.partial_error) }),
            ...(d.file_uuid !== void 0 &&
              scaled !== void 0 &&
              Object.values(scaled).every(I) && { scaled: scaled }),
          }),
        ),
      },
    };
  },
  mapToolResultToToolResultBlockParam(t, n) {
    let mapped = t.attachments.map((attachment) => ({
        ...attachment,
        path: encodeControlChars(attachment.path),
        ...(attachment.file_uuid !== void 0 && { file_uuid: encodeControlChars(attachment.file_uuid) }),
        ...(attachment.project_path !== void 0 && {
          project_path: encodeControlChars(attachment.project_path),
        }),
        ...(attachment.upload_error !== void 0 && { upload_error: escapeForTag(attachment.upload_error) }),
        ...(attachment.partial_error !== void 0 && { partial_error: escapeForTag(attachment.partial_error) }),
      })),
      filtered = mapped.filter((e) => e.upload_error !== void 0),
      filtered_2 = mapped.filter((e) => e.upload_error === void 0),
      mapped_2 = filtered_2
        .filter((e) => e.project_path !== void 0)
        .map(
          (e) =>
            `  ${e.path} \u2192 ${e.project_path}` +
            (hasMismatchedImageType(e)
              ? ` (the folder has the original; the chat shows a ${R(e)} copy of it${e.isImage ? "" : " as a plain file, not a picture"})`
              : ""),
        ),
      filtered_3 = filtered_2.filter((e) => e.file_uuid !== void 0 && e.project_path === void 0),
      mapped_3 = filtered_3.filter(hasMismatchedImageType).map((e) => {
        let f = `${basename(e.path, extname(e.path))}.${e.media_type === "image/jpeg" ? "jpg" : "png"}`,
          _ = e.isImage ? "" : ", which the chat shows as a plain file, not a picture";
        return `The chat got a ${R(e)} copy of ${e.path}, named ${f}${_}; the file at that path is unchanged.`;
      }),
      T = [...filtered_3.map((e) => `  ${e.path} \u2192 file_uuid: ${e.file_uuid}`), ...mapped_3],
      mapped_4 = filtered_2
        .filter((e) => e.partial_error !== void 0)
        .map((e) => `  ${e.path}: ${e.partial_error}`),
      y = [];
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
      if (
        (y.push(
          [`${g} ${plural(g, "file")} delivered to user.`, ...T].join(`
`),
        ),
        isClaudeAiChatCowork())
      )
        y.push(
          "Each file shows as a card whose position relative to your text depends on the app the user is reading in, so refer to a file by its name, never as above or below.",
        );
    }
    let d = scaledImagesNote(filtered_2);
    if (d !== void 0) y.push(d);
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
      let e = (_) => `${(_ / 1048576).toFixed(1)} MiB`,
        joined = filtered.map((_) => `  ${_.path} (${e(_.size)}): ${describeUploadFailure(_)}`).join(`
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
      tool_use_id: n,
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
      async validateInput({ files: n }) {
        return validateAttachments(n, t.permissions());
      },
      async checkPermissions(n, m) {
        let permissions = t.permissions(),
          mapped = n.files.map((file) => {
            let _ = expandPath(file),
              C = walkPermissionCheckPaths(_);
            return { fullPath: _, walked: C, pathsToCheck: C.spellings };
          }),
          h = ao().projectFilesDoor?.() ?? null,
          b = getDenyRuleForTool(permissions, READ_PATH_PROBE),
          mapped_2 = mapped.map(({ fullPath: fullPath, walked: walked }) =>
            checkReadPermissionForTool(READ_PATH_PROBE, { file_path: fullPath }, permissions, walked),
          ),
          found = mapped_2.find((f) => f.behavior === "deny"),
          found_2 = mapped_2.find(
            (f) =>
              f.behavior !== "allow" &&
              f.decisionReason?.type === "rule" &&
              f.decisionReason.rule.ruleBehavior === "ask",
          ),
          y = getAskRuleForTool(permissions, READ_PATH_PROBE),
          g,
          d = h != null;
        if (b)
          g = {
            behavior: "deny",
            message: "SendUserFile reads file contents; that action is disabled.",
            decisionReason: { type: "rule", rule: b },
          };
        else if (found) g = found;
        else if (found_2) ((g = found_2), (d &&= permissions.mode !== "plan"));
        else if (y)
          ((g = {
            behavior: "ask",
            message: `Send ${n.files.length} ${plural(n.files.length, "file")} to the user? SendUserFile reads file contents.`,
            decisionReason: { type: "rule", rule: y },
          }),
            (d &&= permissions.mode !== "plan"));
        else if (permissions.mode === "plan" && h) {
          let found = mapped_2.find((_) => _.behavior !== "allow");
          g = {
            behavior: "ask",
            message: `${SEND_USER_FILE_TOOL_NAME} would place ${plural(n.files.length, "a file", "files")} in the project's shared folder${found?.behavior === "ask" ? ` (${found.message})` : ""} \u2014 approve the plan first.`,
            decisionReason: { type: "mode", mode: "plan" },
          };
        } else g = mapped_2.find((f) => f.behavior !== "allow") ?? { behavior: "allow", updatedInput: n };
        let writePermissionStash = t.session.writePermissionStash;
        writePermissionStash.stash(
          m.toolUseId,
          D(n.files),
          [...mapped.flatMap((f) => f.pathsToCheck), ...(d && h ? [`${w}${h.channelId}`] : [])],
          "read",
        );
        for (let { fullPath: fullPath, pathsToCheck: pathsToCheck } of mapped)
          writePermissionStash.stashIdentity(m.toolUseId, fullPath, await lastExistingIdentity(pathsToCheck));
        return g;
      },
      async call({ files: n, caption: m, status: r, display: s }, h) {
        let b = getAttachmentUploadLane({ replBridgeEnabled: t.replBridgeEnabled() });
        logEvent("tengu_send_user_file", {
          proactive: r === "proactive",
          file_count: n.length,
          display_set: s !== void 0,
          display_attach: s === "attach",
          upload_lane: fromEnum(b),
        });
        let l = consumeReadApproval(t.session, h.toolUseId, n),
          T =
            l.doorChannel ??
            (t.permissions().mode !== "plan" ? ao().projectFilesDoor?.()?.channelId : void 0),
          S = await resolveBriefAttachments(n, {
            lane: b,
            signal: h.signal,
            credentials: t.credentials,
            judged: l,
            projectFilesChannel: T,
            originalsOnly: s === "attach",
          });
        return {
          data: {
            caption: m,
            display: s,
            attachments: S,
            ...(isRenderedLocallyLane(b) && { rendered_locally: !0 }),
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
    F()
  );
}
//@ chunk-gy7w3kfr.js:14336-14402 placement
function F() {
  return Ehe() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_file_upload", !0);
}
//@ chunk-gy7w3kfr.js:14402-14445 placement
function D(t) {
  return uniq(t).sort().join(`
`);
}
//@ chunk-gy7w3kfr.js:14445-14477 placement
var w = "\x00project-files-door:";
/**
 * 取出本次调用在写权限暂存中登记的已批准读取路径与文件身份：拒绝标记时返回空；未登记时退回为每个路径的权限检查拼写；并分离出"门户通道"标记。
 */
//@ chunk-gy7w3kfr.js:14477-14933 placement
function consumeReadApproval(session, toolUseId, paths) {
  let writePermissionStash = session.writePermissionStash,
    s = new Map(
      uniq(paths.map((l) => expandPath(l))).map((l) => [l, writePermissionStash.takeIdentity(toolUseId, l)]),
    ),
    consume = writePermissionStash.consume(toolUseId, D(paths), "read");
  if (consume === BMe) return { paths: [], identities: s, doorChannel: void 0 };
  if (consume === void 0)
    return {
      paths: paths.flatMap((l) => getPathsForPermissionCheck(expandPath(l))),
      identities: s,
      doorChannel: void 0,
    };
  let found = consume.find((l) => l.startsWith(w));
  for (let [l, T] of s) if (T === void 0) s.set(l, null);
  return {
    paths: consume.filter((l) => !l.startsWith(w)),
    identities: s,
    doorChannel: found?.slice(w.length),
  };
}
