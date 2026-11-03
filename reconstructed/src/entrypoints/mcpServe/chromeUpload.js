/**
 * entrypoints/mcpServe/chromeUpload.ts
 *
 * 2.1.316 新增：mcp serve 模式下 Chrome 文件上传
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d2swv9w7.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  unknown,
  E,
  union,
  u,
  array,
  string,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  FILE_UPLOAD_MAX_TOTAL_BYTES,
  validateUploadPath,
  uploadDisplayName,
  prepareChromeFileUploadInput,
} from "../../utils/claudeInChrome/fileUpload.js";
import {
  safeSerializedPermissionContextSchema,
  exceedsSerializedContextLimit,
} from "../../utils/permissions/permissionContextSerialization.js";
import { assertPathNotBlocked, BIDI_CONTROL_PATTERN } from "../../services/fileInputs/screenPath.js";
import { isCredentialPath } from "../../utils/permissions/sensitivePaths.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { remoteReadPermissionContext } from "../../services/remoteTools/readFileForRemote.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { FILE_UPLOAD_UNAVAILABLE } from "../../utils/claudeInChrome/common.js";
import { computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-d2swv9w7.js:12231-12574 placement
var CHROME_UPLOAD_SCHEMAS = 4000000;
var ChromeReadUploadRequestSchema = DoctorLazy(() =>
  zodStrictObject({
    paths: unknown(),
    offset: E().int().min(0),
    max_total_bytes: E().int().min(1).max(FILE_UPLOAD_MAX_TOTAL_BYTES),
    permission_context: safeSerializedPermissionContextSchema(),
  }),
);
var ChromeReadUploadResultSchema = DoctorLazy(() =>
  union([
    u({
      files: array(
        u({
          name: string().max(1024),
          mime_type: string().max(256),
          chars: E().int().min(0),
        }),
      ),
      sha256: string().regex(/^[0-9a-f]{64}$/),
      part: string().max(CHROME_UPLOAD_SCHEMAS),
    }),
    u({
      error: string(),
    }),
  ]),
);
var ChromeUploadFileListSchema = DoctorLazy(() =>
  array(
    u({
      data: string(),
      name: string(),
      mimeType: string(),
    }),
  ),
);
//@ chunk-d2swv9w7.js:12574-12887 placement
async function vetChromeUploadFile(t, i) {
  let e = await validateUploadPath(t, i);
  assertPathNotBlocked(t, e, i);
  if (
    (e.requiredDigest === undefined && (await isCredentialPath(t, e.realPath))) ||
    BIDI_CONTROL_PATTERN.test(await uploadDisplayName(e.realPath))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the file is one of Claude's own files, or its name has text-direction characters",
      "mcpServeChromeUpload: Claude's own file or a text-direction name",
    );
  return e;
}
//@ chunk-d2swv9w7.js:12887-13664 placement
/**
 * mcp serve 下 Chrome 扩展 file_upload：校验路径（拒绝 Claude 自身文件与双向文本名）、按偏移/总字节上限读取多个文件返回 base64。
 */
async function serveChromeFileUpload(t, i, e, d = false) {
  if (isPlainObject(t) && exceedsSerializedContextLimit(t.permission_context))
    throw Error("permission_context is too large");
  let {
    paths,
    offset,
    max_total_bytes: maxTotalBytes,
    permission_context: permissionContext,
  } = ChromeReadUploadRequestSchema().parse(t);
  let a = e.launchPermissionContext && remoteReadPermissionContext(e.launchPermissionContext);
  let n = a
    ? await prepareChromeFileUploadInput(
        "file_upload",
        {
          paths,
        },
        {
          ...buildNativeDoctorDiagnostics(permissionContext, a, getSessionProject(e.session).originalCwd),
          ...(a.blockReadsOutsideWorkingDirectories && {
            blockReadsOutsideWorkingDirectories: true,
          }),
          isRemoteMode: true,
        },
        {
          maxTotalBytes,
          ...(d && {
            screen: vetChromeUploadFile,
          }),
        },
      )
    : {
        error: FILE_UPLOAD_UNAVAILABLE,
      };
  if (n.error !== undefined)
    return {
      summary: "refused",
      output: {
        error: n.error,
      },
    };
  let s = ChromeUploadFileListSchema().parse(n.input?.files);
  let joined = s.map((r) => r.data).join("");
  return {
    summary: `${s.length} files, ${joined.length} characters`,
    output: {
      files: s.map((r) => ({
        name: r.name,
        mime_type: r.mimeType,
        chars: r.data.length,
      })),
      sha256: computeContentHash(joined),
      part: joined.slice(offset, offset + CHROME_UPLOAD_SCHEMAS),
    },
  };
}
