/**
 * services/artifacts/publishFiles.ts
 *
 * 2.1.316 新增：发布附属文件校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (4)
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

//@ chunk-06y4szbn.js:72694-74424 placement
/**
 * 校验 artifact 支撑文件（可服务的 content-type、无 ESC/NUL 字节、XML 不含 DTD、非 UTF-16 等）。
 */
function validateSupportingFiles(e, n = "supporting file") {
  for (let r of e) {
    if (!MANIFEST_SERVABLE_TYPES.has(r.contentType)) {
      logFeatureBad("artifact_publish", "file_not_servable", notServedFileExtra(r.path, r.contentType));
      let s = baseMediaType(r.contentType);
      let h = MANIFEST_SERVABLE_TYPES.has(s) ? s : undefined;
      return publishError(contentTypeMismatchMessage(n, r.path, r.contentType, h));
    }
    if (MANIFEST_TEXT_TYPES.has(r.contentType)) {
      if (typeof r.content === "string" ? r.content.includes("\x1B") : r.content.includes(27)) {
        logFeatureBad("artifact_publish", "file_esc_byte");
        return publishError(
          `${n} "${r.path}" carries an ESC byte \u2014 publish ` +
            "text content without escape sequences (nothing was published)",
        );
      }
      if (typeof r.content === "string" ? r.content.includes("\x00") : r.content.includes(0)) {
        logFeatureBad("artifact_publish", "file_nul_byte");
        return publishError(
          `${n} "${r.path}" carries NUL bytes \u2014 publish ` +
            "text content as UTF-8 without embedded NULs (nothing was published)",
        );
      }
    }
    if (XML_CONTENT_TYPES.has(r.contentType)) {
      let s = typeof r.content === "string" ? r.content : r.content.toString("utf8");
      if (/<!(?:DOCTYPE|ENTITY)/i.test(s)) {
        logFeatureBad("artifact_publish", "file_dtd");
        return publishError(
          `${n} "${r.path}" carries a DOCTYPE or ENTITY ` +
            "declaration \u2014 XML supporting files must not use DTD " +
            "machinery (nothing was published)",
        );
      }
      let h = s.startsWith("\uFEFF") ? s.slice(1) : s;
      let index = h.indexOf("<?");
      if (index !== -1) {
        if (!(index === 0 && /^<\?xml[\s?]/i.test(h)) || h.indexOf("<?", 2) !== -1) {
          logFeatureBad("artifact_publish", "file_pi");
          return publishError(
            `${n} "${r.path}" carries a processing ` +
              "instruction \u2014 XML supporting files may carry only a " +
              "leading XML declaration (nothing was published)",
          );
        }
      }
    }
    if (
      typeof r.content !== "string" &&
      MANIFEST_TEXT_TYPES.has(r.contentType) &&
      r.content.length >= 2 &&
      ((r.content[0] === 255 && r.content[1] === 254) || (r.content[0] === 254 && r.content[1] === 255))
    ) {
      logFeatureBad("artifact_publish", "file_utf16_bom");
      return publishError(
        `${n} "${r.path}" is UTF-16 encoded \u2014 publish ` +
          "supporting text files as UTF-8 (nothing was published)",
      );
    }
  }
  return null;
}
//@ chunk-06y4szbn.js:74424-75106 placement
async function publishArtifact(e, n) {
  let artifactPublishStubDir = getArtifactPublishStubDir();
  if (artifactPublishStubDir !== null) {
    let y = Buffer.byteLength(e, "utf8");
    if (y > MAX_ARTIFACT_BYTES)
      return publishError(
        `too large: page is ${Math.ceil(y / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)`,
      );
    let files = n.files ?? [];
    let removeFiles = n.removeFiles ?? [];
    if (files.length > 0 || removeFiles.length > 0) {
      let C = validateFileLists(e, files, removeFiles);
      if (C !== null) return publishError(C.msg);
    }
    let R = copySourcesProblem(e, files, n.copiedFiles ?? [], removeFiles);
    if (R !== null) return publishError(R);
    return publishToStubDir(artifactPublishStubDir, e, n);
  }
  let slug = n.slug;
  let h =
    n.relayOnly === true
      ? {
          count: 0,
        }
      : undefined;
  let b;
  try {
    b = !slug
      ? await publishArtifactPage(e, n, h)
      : await withPublishInFlight(n.ownPublishes, slug, () => publishArtifactPage(e, n, h));
  } catch (error) {
    if (h?.count === 0 && error instanceof Error)
      Object.defineProperty(error, REFUSED_BEFORE_SEND, {
        value: true,
      });
    throw error;
  }
  return h !== undefined &&
    b.err !== null &&
    b.notCarried !== true &&
    b.refusedShape !== true &&
    h.count === 0
    ? {
        ...b,
        refusedBeforeSend: true,
      }
    : b;
}
//@ chunk-06y4szbn.js:75106-75141 placement
/**
 * 标记“发送前即被拒”错误的 Symbol。
 */
var REFUSED_BEFORE_SEND = Symbol("refusedBeforeSend");
//@ chunk-06y4szbn.js:75141-75207 placement
function refusedBeforeSend(error) {
  return error instanceof Error && Reflect.get(error, REFUSED_BEFORE_SEND) === true;
}
export { validateSupportingFiles, publishArtifact, refusedBeforeSend };
