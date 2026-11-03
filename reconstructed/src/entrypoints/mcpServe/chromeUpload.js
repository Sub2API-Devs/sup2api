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
import { zodStrictObject, oe, E, Ue, u, A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  FILE_UPLOAD_MAX_TOTAL_BYTES,
  validateUploadPath,
  uploadDisplayName,
  prepareChromeFileUploadInput,
} from "../../utils/claudeInChrome/fileUpload.js";
import {
  safeSerializedPermissionContextSchema,
  PV,
} from "../../utils/permissions/permissionContextSerialization.js";
import { assertPathNotBlocked, BIDI_CONTROL_PATTERN } from "../../services/fileInputs/screenPath.js";
import { Ope } from "../../utils/permissions/sensitivePaths.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { remoteReadPermissionContext } from "../../services/remoteTools/readFileForRemote.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { FILE_UPLOAD_UNAVAILABLE } from "../../utils/claudeInChrome/common.js";
import { computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-d2swv9w7.js:12231-12574 placement
var CHROME_UPLOAD_SCHEMAS = 4000000,
  x = DoctorLazy(() =>
    zodStrictObject({
      paths: oe(),
      offset: E().int().min(0),
      max_total_bytes: E().int().min(1).max(FILE_UPLOAD_MAX_TOTAL_BYTES),
      permission_context: safeSerializedPermissionContextSchema(),
    }),
  ),
  j = DoctorLazy(() =>
    Ue([
      u({
        files: A(u({ name: o().max(1024), mime_type: o().max(256), chars: E().int().min(0) })),
        sha256: o().regex(/^[0-9a-f]{64}$/),
        part: o().max(CHROME_UPLOAD_SCHEMAS),
      }),
      u({ error: o() }),
    ]),
  ),
  R = DoctorLazy(() => A(u({ data: o(), name: o(), mimeType: o() })));
//@ chunk-d2swv9w7.js:12574-12887 placement
async function vetChromeUploadFile(t, i) {
  let e = await validateUploadPath(t, i);
  if (
    (assertPathNotBlocked(t, e, i),
    (e.requiredDigest === void 0 && (await Ope(t, e.realPath))) ||
      BIDI_CONTROL_PATTERN.test(await uploadDisplayName(e.realPath)))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the file is one of Claude's own files, or its name has text-direction characters",
      "mcpServeChromeUpload: Claude's own file or a text-direction name",
    );
  return e;
}
/**
 * mcp serve 下 Chrome 扩展 file_upload：校验路径（拒绝 Claude 自身文件与双向文本名）、按偏移/总字节上限读取多个文件返回 base64。
 */
//@ chunk-d2swv9w7.js:12887-13664 placement
async function serveChromeFileUpload(t, i, e, d = !1) {
  if (isPlainObject(t) && PV(t.permission_context)) throw Error("permission_context is too large");
  let {
      paths: paths,
      offset: offset,
      max_total_bytes: max_total_bytes,
      permission_context: permission_context,
    } = x().parse(t),
    a = e.launchPermissionContext && remoteReadPermissionContext(e.launchPermissionContext),
    n = a
      ? await prepareChromeFileUploadInput(
          "file_upload",
          { paths: paths },
          {
            ...buildNativeDoctorDiagnostics(permission_context, a, xo(e.session).originalCwd),
            ...(a.blockReadsOutsideWorkingDirectories && { blockReadsOutsideWorkingDirectories: !0 }),
            isRemoteMode: !0,
          },
          { maxTotalBytes: max_total_bytes, ...(d && { screen: vetChromeUploadFile }) },
        )
      : { error: FILE_UPLOAD_UNAVAILABLE };
  if (n.error !== void 0) return { summary: "refused", output: { error: n.error } };
  let parse = R().parse(n.input?.files),
    joined = parse.map((r) => r.data).join("");
  return {
    summary: `${parse.length} files, ${joined.length} characters`,
    output: {
      files: parse.map((r) => ({ name: r.name, mime_type: r.mimeType, chars: r.data.length })),
      sha256: computeContentHash(joined),
      part: joined.slice(offset, offset + CHROME_UPLOAD_SCHEMAS),
    },
  };
}
