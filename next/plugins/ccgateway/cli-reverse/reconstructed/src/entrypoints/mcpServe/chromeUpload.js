/**
 * entrypoints/mcpServe/chromeUpload.ts
 *
 * 2.1.316 新增：mcp serve 模式下 Chrome 文件上传
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d4n7mgs8.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  unknown,
  numberSchema,
  union,
  objectSchema,
  array,
  stringSchema,
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

//@ chunk-d4n7mgs8.js:13379-13722 placement
var CHROME_UPLOAD_SCHEMAS = 4000000;
var ChromeReadUploadRequestSchema = DoctorLazy(() =>
  zodStrictObject({
    paths: unknown(),
    offset: numberSchema().int().min(0),
    max_total_bytes: numberSchema().int().min(1).max(FILE_UPLOAD_MAX_TOTAL_BYTES),
    permission_context: safeSerializedPermissionContextSchema(),
  }),
);
var ChromeReadUploadResultSchema = DoctorLazy(() =>
  union([
    objectSchema({
      files: array(
        objectSchema({
          name: stringSchema().max(1024),
          mime_type: stringSchema().max(256),
          chars: numberSchema().int().min(0),
        }),
      ),
      sha256: stringSchema().regex(/^[0-9a-f]{64}$/),
      part: stringSchema().max(CHROME_UPLOAD_SCHEMAS),
    }),
    objectSchema({
      error: stringSchema(),
    }),
  ]),
);
var ChromeUploadFileListSchema = DoctorLazy(() =>
  array(
    objectSchema({
      data: stringSchema(),
      name: stringSchema(),
      mimeType: stringSchema(),
    }),
  ),
);
//@ chunk-d4n7mgs8.js:13722-14035 placement
async function vetChromeUploadFile(requestedPath, origin) {
  let validated = await validateUploadPath(requestedPath, origin);
  assertPathNotBlocked(requestedPath, validated, origin);
  if (
    (validated.requiredDigest === undefined && (await isCredentialPath(requestedPath, validated.realPath))) ||
    BIDI_CONTROL_PATTERN.test(await uploadDisplayName(validated.realPath))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the file is one of Claude's own files, or its name has text-direction characters",
      "mcpServeChromeUpload: Claude's own file or a text-direction name",
    );
  return validated;
}
//@ chunk-d4n7mgs8.js:14035-14812 placement
/**
 * mcp serve 下 Chrome 扩展 file_upload：校验路径（拒绝 Claude 自身文件与双向文本名）、按偏移/总字节上限读取多个文件返回 base64。
 */
async function serveChromeFileUpload(params, origin, context, screening = false) {
  if (isPlainObject(params) && exceedsSerializedContextLimit(params.permission_context))
    throw Error("permission_context is too large");
  let {
    paths,
    offset,
    max_total_bytes: maxTotalBytes,
    permission_context: permissionContext,
  } = ChromeReadUploadRequestSchema().parse(params);
  let remotePermissionContext =
    context.launchPermissionContext && remoteReadPermissionContext(context.launchPermissionContext);
  let prepared = remotePermissionContext
    ? await prepareChromeFileUploadInput(
        "file_upload",
        {
          paths,
        },
        {
          ...buildNativeDoctorDiagnostics(
            permissionContext,
            remotePermissionContext,
            getSessionProject(context.session).originalCwd,
          ),
          ...(remotePermissionContext.blockReadsOutsideWorkingDirectories && {
            blockReadsOutsideWorkingDirectories: true,
          }),
          isRemoteMode: true,
        },
        {
          maxTotalBytes,
          ...(screening && {
            screen: vetChromeUploadFile,
          }),
        },
      )
    : {
        error: FILE_UPLOAD_UNAVAILABLE,
      };
  if (prepared.error !== undefined)
    return {
      summary: "refused",
      output: {
        error: prepared.error,
      },
    };
  let files = ChromeUploadFileListSchema().parse(prepared.input?.files);
  let joined = files.map((file) => file.data).join("");
  return {
    summary: `${files.length} files, ${joined.length} characters`,
    output: {
      files: files.map((file) => ({
        name: file.name,
        mime_type: file.mimeType,
        chars: file.data.length,
      })),
      sha256: computeContentHash(joined),
      part: joined.slice(offset, offset + CHROME_UPLOAD_SCHEMAS),
    },
  };
}
export { serveChromeFileUpload };
