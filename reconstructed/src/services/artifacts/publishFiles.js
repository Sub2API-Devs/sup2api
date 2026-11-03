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
  jn,
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

/**
 * 校验 artifact 支撑文件（可服务的 content-type、无 ESC/NUL 字节、XML 不含 DTD、非 UTF-16 等）。
 */
//@ chunk-06y4szbn.js:72694-74424 placement
function validateSupportingFiles(e, n = "supporting file") {
  for (let r of e) {
    if (!jn.has(r.contentType)) {
      logFeatureBad("artifact_publish", "file_not_servable", notServedFileExtra(r.path, r.contentType));
      let s = baseMediaType(r.contentType),
        h = jn.has(s) ? s : void 0;
      return publishError(contentTypeMismatchMessage(n, r.path, r.contentType, h));
    }
    if (MANIFEST_TEXT_TYPES.has(r.contentType)) {
      if (typeof r.content === "string" ? r.content.includes("\x1B") : r.content.includes(27))
        return (
          logFeatureBad("artifact_publish", "file_esc_byte"),
          publishError(
            `${n} "${r.path}" carries an ESC byte \u2014 publish ` +
              "text content without escape sequences (nothing was published)",
          )
        );
      if (typeof r.content === "string" ? r.content.includes("\x00") : r.content.includes(0))
        return (
          logFeatureBad("artifact_publish", "file_nul_byte"),
          publishError(
            `${n} "${r.path}" carries NUL bytes \u2014 publish ` +
              "text content as UTF-8 without embedded NULs (nothing was published)",
          )
        );
    }
    if (XML_CONTENT_TYPES.has(r.contentType)) {
      let s = typeof r.content === "string" ? r.content : r.content.toString("utf8");
      if (/<!(?:DOCTYPE|ENTITY)/i.test(s))
        return (
          logFeatureBad("artifact_publish", "file_dtd"),
          publishError(
            `${n} "${r.path}" carries a DOCTYPE or ENTITY ` +
              "declaration \u2014 XML supporting files must not use DTD " +
              "machinery (nothing was published)",
          )
        );
      let h = s.startsWith("\uFEFF") ? s.slice(1) : s,
        index = h.indexOf("<?");
      if (index !== -1) {
        if (!(index === 0 && /^<\?xml[\s?]/i.test(h)) || h.indexOf("<?", 2) !== -1)
          return (
            logFeatureBad("artifact_publish", "file_pi"),
            publishError(
              `${n} "${r.path}" carries a processing ` +
                "instruction \u2014 XML supporting files may carry only a " +
                "leading XML declaration (nothing was published)",
            )
          );
      }
    }
    if (
      typeof r.content !== "string" &&
      MANIFEST_TEXT_TYPES.has(r.contentType) &&
      r.content.length >= 2 &&
      ((r.content[0] === 255 && r.content[1] === 254) || (r.content[0] === 254 && r.content[1] === 255))
    )
      return (
        logFeatureBad("artifact_publish", "file_utf16_bom"),
        publishError(
          `${n} "${r.path}" is UTF-16 encoded \u2014 publish ` +
            "supporting text files as UTF-8 (nothing was published)",
        )
      );
  }
  return null;
}
//@ chunk-06y4szbn.js:74424-75106 placement
async function publishArtifact(e, n) {
  let r = getArtifactPublishStubDir();
  if (r !== null) {
    let byteLength = Buffer.byteLength(e, "utf8");
    if (byteLength > MAX_ARTIFACT_BYTES)
      return publishError(
        `too large: page is ${Math.ceil(byteLength / 1024 / 1024)}MB (max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)`,
      );
    let x = n.files ?? [],
      w = n.removeFiles ?? [];
    if (x.length > 0 || w.length > 0) {
      let C = validateFileLists(e, x, w);
      if (C !== null) return publishError(C.msg);
    }
    let R = copySourcesProblem(e, x, n.copiedFiles ?? [], w);
    if (R !== null) return publishError(R);
    return publishToStubDir(r, e, n);
  }
  let slug = n.slug,
    h = n.relayOnly === !0 ? { count: 0 } : void 0,
    b;
  try {
    b = !slug
      ? await publishArtifactPage(e, n, h)
      : await withPublishInFlight(n.ownPublishes, slug, () => publishArtifactPage(e, n, h));
  } catch (error) {
    if (h?.count === 0 && error instanceof Error) Object.defineProperty(error, pa, { value: !0 });
    throw error;
  }
  return h !== void 0 && b.err !== null && b.notCarried !== !0 && b.refusedShape !== !0 && h.count === 0
    ? { ...b, refusedBeforeSend: !0 }
    : b;
}
//@ chunk-06y4szbn.js:75106-75141 placement
var pa = Symbol("refusedBeforeSend");
//@ chunk-06y4szbn.js:75141-75207 placement
function refusedBeforeSend(e) {
  return e instanceof Error && Reflect.get(e, pa) === !0;
}

export { validateSupportingFiles, publishArtifact, refusedBeforeSend };
