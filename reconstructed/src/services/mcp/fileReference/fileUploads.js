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
import {
  string,
  zodStrictObject,
  array,
  record,
  u,
  union,
  E,
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

//@ chunk-amf531m0.js:12593-13086 placement
/**
 * 文件上传接口的 schema：路径、哈希请求、上传请求（路径、sha256、URL、请求头）、单文件拒绝、哈希应答与上传应答。
 */
var uploadPathSchema = DoctorLazy(() => string().min(1).max(MAX_FILE_PATH_CHARS));
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
        sha256: string().regex(SHA256_HEX_RE),
        url: string().min(1).max(2048),
        headers: record(string(), string()),
      }),
    )
      .min(1)
      .max(MAX_FILES_PER_INPUT),
  }),
);
var fileRefusalSchema = DoctorLazy(() =>
  u({
    path: uploadPathSchema(),
    code: string().max(64),
  }),
);
var hashAnswerSchema = DoctorLazy(() =>
  u({
    files: array(
      union([
        u({
          path: uploadPathSchema(),
          name: string().refine(isSafeFileName),
          size: E().int().min(0).max(MAX_FILE_BYTES),
          sha256: string().regex(SHA256_HEX_RE),
        }),
        fileRefusalSchema(),
      ]),
    )
      .max(MAX_FILES_PER_INPUT)
      .refine((r) => r.reduce((acc, t) => acc + ("size" in t ? t.size : 0), 0) <= MAX_TOTAL_BYTES),
  }),
);
var putAnswerSchema = DoctorLazy(() =>
  u({
    files: array(
      union([
        u({
          path: uploadPathSchema(),
          ok: literal(true),
        }),
        fileRefusalSchema(),
      ]),
    ).max(MAX_FILES_PER_INPUT),
  }),
);
//@ chunk-amf531m0.js:13086-13220 placement
/**
 * 处理计算文件哈希的请求：校验路径列表后计算（或返回不可用原因），附带摘要。
 */
async function hashFiles(r, e, t) {
  let { paths } = hashRequestSchema().parse(r);
  let i = uploadsUnavailable(paths[0], t) ?? (await uploadScreenFor(t, "").hash(paths, e));
  return {
    summary: uploadSummary("hashed", i),
    output: {
      files: i,
    },
  };
}
//@ chunk-amf531m0.js:13220-13365 placement
/**
 * 处理上传文件的请求：校验文件列表后上传到给定地址（或返回不可用原因），附带摘要。
 */
async function putFiles(r, e, t) {
  let { files } = putRequestSchema().parse(r);
  let i =
    uploadsUnavailable(files[0].path, t) ??
    (await uploadScreenFor(t, uploadPathPrefixFor(files[0].url)).put(files, e));
  return {
    summary: uploadSummary("sent", i),
    output: {
      files: i,
    },
  };
}
//@ chunk-amf531m0.js:13365-13526 placement
function uploadsUnavailable(path, { launchRules }) {
  let t = isPolicyLimitsCacheMissing()
    ? "policy_pending"
    : launchRules === REPO_RULES_UNREAD
      ? launchRules
      : FIRST_PARTY_UPLOAD_SERVERS.every((n) => isPolicyAllowed(n.policy))
        ? filesApiUnavailableReason()
        : "policy_denied";
  return t === undefined
    ? undefined
    : [
        {
          path,
          code: t,
        },
      ];
}
//@ chunk-amf531m0.js:13526-13646 placement
function uploadPathPrefixFor(url) {
  return (
    FIRST_PARTY_UPLOAD_SERVERS.map((e) => e.uploadPathPrefix).find(
      (e) => URL.canParse(url) && new URL(url).pathname.startsWith(e),
    ) ?? ""
  );
}
//@ chunk-amf531m0.js:13646-13893 placement
function uploadScreenFor({ session, paths, launchRules, heldAtLaunch }, uploadPathPrefix) {
  let d = heldAtLaunch ? [PROJECT_FILES_LINK] : [];
  return createUploadScreen({
    screen: async (h) => {
      let a =
        launchRules === REPO_RULES_UNREAD
          ? undefined
          : await attachableFileAt(h, session, paths, launchRules, d);
      return a === undefined
        ? undefined
        : {
            realPath: a,
          };
    },
    maxFileBytes: MAX_FILE_BYTES,
    maxTotalBytes: MAX_TOTAL_BYTES,
    uploadPathPrefix,
  });
}
//@ chunk-amf531m0.js:13893-14003 placement
function uploadSummary(r, e) {
  let found = e.find((n) => n.code !== undefined);
  return found === undefined ? `${e.length} ${r}` : `not ${r}: ${found.code}`;
}
