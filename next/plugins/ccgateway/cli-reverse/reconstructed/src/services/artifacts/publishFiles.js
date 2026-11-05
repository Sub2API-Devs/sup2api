/**
 * services/artifacts/publishFiles.ts
 *
 * 2.1.316 新增：发布附属文件校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (4)
 * attribution: placement 4
 */
import {
  MANIFEST_SERVABLE_TYPES,
  notServedFileExtra,
  MANIFEST_TEXT_TYPES,
  XML_CONTENT_TYPES,
  validateFileLists,
  copySourcesProblem,
} from "./publishInstanceFiles.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { baseMediaType, contentTypeMismatchMessage } from "./contentTypes.js";
import { publishError } from "./publishConflicts.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { MAX_ARTIFACT_BYTES } from "./frameFlags.js";
import { publishToStubDir } from "./stubPublishDir.js";
import { publishArtifactPage } from "./publishArtifact.js";
import { withPublishInFlight } from "./ownPublishes.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:74946-76676 placement
/**
 * 校验 artifact 支撑文件（可服务的 content-type、无 ESC/NUL 字节、XML 不含 DTD、非 UTF-16 等）。
 */
function validateSupportingFiles(files, kindLabel = "supporting file") {
  for (let file of files) {
    if (!MANIFEST_SERVABLE_TYPES.has(file.contentType)) {
      logFeatureBad("artifact_publish", "file_not_servable", notServedFileExtra(file.path, file.contentType));
      let mediaType = baseMediaType(file.contentType);
      let lowercaseType = MANIFEST_SERVABLE_TYPES.has(mediaType) ? mediaType : undefined;
      return publishError(contentTypeMismatchMessage(kindLabel, file.path, file.contentType, lowercaseType));
    }
    if (MANIFEST_TEXT_TYPES.has(file.contentType)) {
      if (typeof file.content === "string" ? file.content.includes("\x1B") : file.content.includes(27)) {
        logFeatureBad("artifact_publish", "file_esc_byte");
        return publishError(
          `${kindLabel} "${file.path}" carries an ESC byte \u2014 publish ` +
            "text content without escape sequences (nothing was published)",
        );
      }
      if (typeof file.content === "string" ? file.content.includes("\x00") : file.content.includes(0)) {
        logFeatureBad("artifact_publish", "file_nul_byte");
        return publishError(
          `${kindLabel} "${file.path}" carries NUL bytes \u2014 publish ` +
            "text content as UTF-8 without embedded NULs (nothing was published)",
        );
      }
    }
    if (XML_CONTENT_TYPES.has(file.contentType)) {
      let text = typeof file.content === "string" ? file.content : file.content.toString("utf8");
      if (/<!(?:DOCTYPE|ENTITY)/i.test(text)) {
        logFeatureBad("artifact_publish", "file_dtd");
        return publishError(
          `${kindLabel} "${file.path}" carries a DOCTYPE or ENTITY ` +
            "declaration \u2014 XML supporting files must not use DTD " +
            "machinery (nothing was published)",
        );
      }
      let withoutBom = text.startsWith("\uFEFF") ? text.slice(1) : text;
      let index = withoutBom.indexOf("<?");
      if (index !== -1) {
        if (!(index === 0 && /^<\?xml[\s?]/i.test(withoutBom)) || withoutBom.indexOf("<?", 2) !== -1) {
          logFeatureBad("artifact_publish", "file_pi");
          return publishError(
            `${kindLabel} "${file.path}" carries a processing ` +
              "instruction \u2014 XML supporting files may carry only a " +
              "leading XML declaration (nothing was published)",
          );
        }
      }
    }
    if (
      typeof file.content !== "string" &&
      MANIFEST_TEXT_TYPES.has(file.contentType) &&
      file.content.length >= 2 &&
      ((file.content[0] === 255 && file.content[1] === 254) ||
        (file.content[0] === 254 && file.content[1] === 255))
    ) {
      logFeatureBad("artifact_publish", "file_utf16_bom");
      return publishError(
        `${kindLabel} "${file.path}" is UTF-16 encoded \u2014 publish ` +
          "supporting text files as UTF-8 (nothing was published)",
      );
    }
  }
  return null;
}
//@ chunk-51jy8ztq.js:76676-77358 placement
async function publishArtifact(html, options) {
  let artifactPublishStubDir = getArtifactPublishStubDir();
  if (artifactPublishStubDir !== null) {
    let pageBytes = Buffer.byteLength(html, "utf8");
    if (pageBytes > MAX_ARTIFACT_BYTES)
      return publishError(
        `too large: page is ${Math.ceil(pageBytes / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)`,
      );
    let files = options.files ?? [];
    let removeFiles = options.removeFiles ?? [];
    if (files.length > 0 || removeFiles.length > 0) {
      let fileError = validateFileLists(html, files, removeFiles);
      if (fileError !== null) return publishError(fileError.msg);
    }
    let copyProblem = copySourcesProblem(html, files, options.copiedFiles ?? [], removeFiles);
    if (copyProblem !== null) return publishError(copyProblem);
    return publishToStubDir(artifactPublishStubDir, html, options);
  }
  let slug = options.slug;
  let relayCounter =
    options.relayOnly === true
      ? {
          count: 0,
        }
      : undefined;
  let result;
  try {
    result = !slug
      ? await publishArtifactPage(html, options, relayCounter)
      : await withPublishInFlight(options.ownPublishes, slug, () =>
          publishArtifactPage(html, options, relayCounter),
        );
  } catch (error) {
    if (relayCounter?.count === 0 && error instanceof Error)
      Object.defineProperty(error, REFUSED_BEFORE_SEND, {
        value: true,
      });
    throw error;
  }
  return relayCounter !== undefined &&
    result.err !== null &&
    result.notCarried !== true &&
    result.refusedShape !== true &&
    relayCounter.count === 0
    ? {
        ...result,
        refusedBeforeSend: true,
      }
    : result;
}
//@ chunk-51jy8ztq.js:77358-77393 placement
/**
 * 标记“发送前即被拒”错误的 Symbol。
 */
var REFUSED_BEFORE_SEND; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-51jy8ztq.js:77358", () => {
  REFUSED_BEFORE_SEND = Symbol("refusedBeforeSend");
});
//@ chunk-51jy8ztq.js:77393-77459 placement
function refusedBeforeSend(error) {
  return error instanceof Error && Reflect.get(error, REFUSED_BEFORE_SEND) === true;
}
export { publishArtifact, refusedBeforeSend, validateSupportingFiles };
