/**
 * services/mcp/fileReference/fileUploads.ts
 *
 * 2.1.316 新增。MCP 文件引用上传。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-amf531m0.js (7)
 * attribution: placement 7
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { o, zodStrictObject, A, pe, u, Ue, E, T } from "../../../../vendor/zod/v4/classic/schemas.js";
import { XHe } from "../inputSchemaCheck.js";
import { Sbt, O1t, _un } from "../../../utils/sizeLimits.js";
import { AS } from "../../../utils/commitAttribution.js";
import { isSafeFileName } from "../../fileInputs/screenPath.js";
import { isPolicyLimitsCacheMissing, isPolicyAllowed } from "../../policyLimits/policyVerdicts.js";
import { REPO_RULES_UNREAD } from "../../mcpServe/uploadRules.js";
import { FIRST_PARTY_UPLOAD_SERVERS } from "./wrapFileReferenceTool.js";
import { filesApiUnavailableReason } from "../../fileInputs/attachmentText.js";
import { PROJECT_FILES_LINK } from "../../../utils/stageFileRoots.js";
import { createUploadScreen } from "../../fileInputs/uploadPut.js";
import { attachableFileAt } from "../../taskFiles/taskFileUpload.js";

/**
 * 文件上传接口的 schema：路径、哈希请求、上传请求（路径、sha256、URL、请求头）、单文件拒绝、哈希应答与上传应答。
 */
//@ chunk-amf531m0.js:12593-13086 placement
var uploadPathSchema = DoctorLazy(() => o().min(1).max(XHe)),
  hashRequestSchema = DoctorLazy(() => zodStrictObject({ paths: A(uploadPathSchema()).min(1).max(Sbt) })),
  putRequestSchema = DoctorLazy(() =>
    zodStrictObject({
      files: A(
        zodStrictObject({
          path: uploadPathSchema(),
          sha256: o().regex(AS),
          url: o().min(1).max(2048),
          headers: pe(o(), o()),
        }),
      )
        .min(1)
        .max(Sbt),
    }),
  ),
  fileRefusalSchema = DoctorLazy(() => u({ path: uploadPathSchema(), code: o().max(64) })),
  hashAnswerSchema = DoctorLazy(() =>
    u({
      files: A(
        Ue([
          u({
            path: uploadPathSchema(),
            name: o().refine(isSafeFileName),
            size: E().int().min(0).max(O1t),
            sha256: o().regex(AS),
          }),
          fileRefusalSchema(),
        ]),
      )
        .max(Sbt)
        .refine((r) => r.reduce((e, t) => e + ("size" in t ? t.size : 0), 0) <= _un),
    }),
  ),
  putAnswerSchema = DoctorLazy(() =>
    u({ files: A(Ue([u({ path: uploadPathSchema(), ok: T(!0) }), fileRefusalSchema()])).max(Sbt) }),
  );
/**
 * 处理计算文件哈希的请求：校验路径列表后计算（或返回不可用原因），附带摘要。
 */
//@ chunk-amf531m0.js:13086-13220 placement
async function hashFiles(r, e, t) {
  let { paths: paths } = hashRequestSchema().parse(r),
    i = uploadsUnavailable(paths[0], t) ?? (await uploadScreenFor(t, "").hash(paths, e));
  return { summary: uploadSummary("hashed", i), output: { files: i } };
}
/**
 * 处理上传文件的请求：校验文件列表后上传到给定地址（或返回不可用原因），附带摘要。
 */
//@ chunk-amf531m0.js:13220-13365 placement
async function putFiles(r, e, t) {
  let { files: files } = putRequestSchema().parse(r),
    i =
      uploadsUnavailable(files[0].path, t) ??
      (await uploadScreenFor(t, uploadPathPrefixFor(files[0].url)).put(files, e));
  return { summary: uploadSummary("sent", i), output: { files: i } };
}
//@ chunk-amf531m0.js:13365-13526 placement
function uploadsUnavailable(r, { launchRules: launchRules }) {
  let t = isPolicyLimitsCacheMissing()
    ? "policy_pending"
    : launchRules === REPO_RULES_UNREAD
      ? launchRules
      : FIRST_PARTY_UPLOAD_SERVERS.every((n) => isPolicyAllowed(n.policy))
        ? filesApiUnavailableReason()
        : "policy_denied";
  return t === void 0 ? void 0 : [{ path: r, code: t }];
}
//@ chunk-amf531m0.js:13526-13646 placement
function uploadPathPrefixFor(r) {
  return (
    FIRST_PARTY_UPLOAD_SERVERS.map((e) => e.uploadPathPrefix).find(
      (e) => URL.canParse(r) && new URL(r).pathname.startsWith(e),
    ) ?? ""
  );
}
//@ chunk-amf531m0.js:13646-13893 placement
function uploadScreenFor(
  { session: session, paths: paths, launchRules: launchRules, heldAtLaunch: heldAtLaunch },
  i,
) {
  let d = heldAtLaunch ? [PROJECT_FILES_LINK] : [];
  return createUploadScreen({
    screen: async (h) => {
      let a =
        launchRules === REPO_RULES_UNREAD
          ? void 0
          : await attachableFileAt(h, session, paths, launchRules, d);
      return a === void 0 ? void 0 : { realPath: a };
    },
    maxFileBytes: O1t,
    maxTotalBytes: _un,
    uploadPathPrefix: i,
  });
}
//@ chunk-amf531m0.js:13893-14003 placement
function uploadSummary(r, e) {
  let found = e.find((n) => n.code !== void 0);
  return found === void 0 ? `${e.length} ${r}` : `not ${r}: ${found.code}`;
}
