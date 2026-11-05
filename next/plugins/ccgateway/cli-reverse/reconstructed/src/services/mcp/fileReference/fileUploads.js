/**
 * services/mcp/fileReference/fileUploads.ts
 *
 * 2.1.316 新增。MCP 文件引用上传。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aaprp84e.js (7)
 * attribution: placement 7
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  stringSchema,
  zodStrictObject,
  array,
  record,
  objectSchema,
  union,
  numberSchema,
  literal,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { MAX_FILE_PATH_CHARS } from "../inputSchemaCheck.js";
import { MAX_FILES_PER_INPUT, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "../../../utils/sizeLimits.js";
import { SHA256_HEX_RE } from "../../../utils/commitAttribution.js";
import { isSafeFileName } from "../../fileInputs/screenPath.js";
import { isPolicyLimitsCacheMissing, isPolicyAllowed } from "../../policyLimits/policyVerdicts.js";
import { REPO_RULES_UNREAD } from "../../mcpServe/uploadRules.js";
import { FIRST_PARTY_UPLOAD_SERVERS } from "./wrapFileReferenceTool.js";
import { filesApiUnavailableReason } from "../../fileInputs/attachmentText.js";
import { PROJECT_FILES_LINK } from "../../../utils/stageFileRoots.js";
import { createUploadScreen } from "../../fileInputs/uploadPut.js";
import { attachableFileAt } from "../../taskFiles/taskFileUpload.js";

//@ chunk-aaprp84e.js:13770-14263 placement
/**
 * 文件上传接口的 schema：路径、哈希请求、上传请求（路径、sha256、URL、请求头）、单文件拒绝、哈希应答与上传应答。
 */
var uploadPathSchema = DoctorLazy(() => stringSchema().min(1).max(MAX_FILE_PATH_CHARS));
var hashRequestSchema = DoctorLazy(() =>
  zodStrictObject({
    paths: array(uploadPathSchema()).min(1).max(MAX_FILES_PER_INPUT),
  }),
);
var putRequestSchema = DoctorLazy(() =>
  zodStrictObject({
    files: array(
      zodStrictObject({
        path: uploadPathSchema(),
        sha256: stringSchema().regex(SHA256_HEX_RE),
        url: stringSchema().min(1).max(2048),
        headers: record(stringSchema(), stringSchema()),
      }),
    )
      .min(1)
      .max(MAX_FILES_PER_INPUT),
  }),
);
var fileRefusalSchema = DoctorLazy(() =>
  objectSchema({
    path: uploadPathSchema(),
    code: stringSchema().max(64),
  }),
);
var hashAnswerSchema = DoctorLazy(() =>
  objectSchema({
    files: array(
      union([
        objectSchema({
          path: uploadPathSchema(),
          name: stringSchema().refine(isSafeFileName),
          size: numberSchema().int().min(0).max(MAX_FILE_BYTES),
          sha256: stringSchema().regex(SHA256_HEX_RE),
        }),
        fileRefusalSchema(),
      ]),
    )
      .max(MAX_FILES_PER_INPUT)
      .refine(
        (files) =>
          files.reduce((acc, fileEntry) => acc + ("size" in fileEntry ? fileEntry.size : 0), 0) <=
          MAX_TOTAL_BYTES,
      ),
  }),
);
var putAnswerSchema = DoctorLazy(() =>
  objectSchema({
    files: array(
      union([
        objectSchema({
          path: uploadPathSchema(),
          ok: literal(true),
        }),
        fileRefusalSchema(),
      ]),
    ).max(MAX_FILES_PER_INPUT),
  }),
);
//@ chunk-aaprp84e.js:14263-14397 placement
/**
 * 处理计算文件哈希的请求：校验路径列表后计算（或返回不可用原因），附带摘要。
 */
async function hashFiles(request, signal, uploadContext) {
  let { paths } = hashRequestSchema().parse(request);
  let results =
    uploadsUnavailable(paths[0], uploadContext) ??
    (await uploadScreenFor(uploadContext, "").hash(paths, signal));
  return {
    summary: uploadSummary("hashed", results),
    output: {
      files: results,
    },
  };
}
//@ chunk-aaprp84e.js:14397-14542 placement
/**
 * 处理上传文件的请求：校验文件列表后上传到给定地址（或返回不可用原因），附带摘要。
 */
async function putFiles(request, signal, uploadContext) {
  let { files } = putRequestSchema().parse(request);
  let results =
    uploadsUnavailable(files[0].path, uploadContext) ??
    (await uploadScreenFor(uploadContext, uploadPathPrefixFor(files[0].url)).put(files, signal));
  return {
    summary: uploadSummary("sent", results),
    output: {
      files: results,
    },
  };
}
//@ chunk-aaprp84e.js:14542-14704 placement
function uploadsUnavailable(path, { launchRules }) {
  let reason = isPolicyLimitsCacheMissing()
    ? "policy_pending"
    : launchRules === REPO_RULES_UNREAD
      ? launchRules
      : FIRST_PARTY_UPLOAD_SERVERS.every((server) => isPolicyAllowed(server.policy))
        ? filesApiUnavailableReason()
        : "policy_denied";
  return reason === undefined
    ? undefined
    : [
        {
          path,
          code: reason,
        },
      ];
}
//@ chunk-aaprp84e.js:14704-14824 placement
function uploadPathPrefixFor(url) {
  return (
    FIRST_PARTY_UPLOAD_SERVERS.map((server) => server.uploadPathPrefix).find(
      (prefix) => URL.canParse(url) && new URL(url).pathname.startsWith(prefix),
    ) ?? ""
  );
}
//@ chunk-aaprp84e.js:14824-15071 placement
function uploadScreenFor({ session, paths, launchRules, heldAtLaunch }, uploadPathPrefix) {
  let refusalHints = heldAtLaunch ? [PROJECT_FILES_LINK] : [];
  return createUploadScreen({
    screen: async (path) => {
      let attachable =
        launchRules === REPO_RULES_UNREAD
          ? undefined
          : await attachableFileAt(path, session, paths, launchRules, refusalHints);
      return attachable === undefined
        ? undefined
        : {
            realPath: attachable,
          };
    },
    maxFileBytes: MAX_FILE_BYTES,
    maxTotalBytes: MAX_TOTAL_BYTES,
    uploadPathPrefix,
  });
}
//@ chunk-aaprp84e.js:15071-15181 placement
function uploadSummary(verb, results) {
  let found = results.find((result) => result.code !== undefined);
  return found === undefined ? `${results.length} ${verb}` : `not ${verb}: ${found.code}`;
}
export { hashFiles, putFiles };
