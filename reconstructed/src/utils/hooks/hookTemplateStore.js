/**
 * utils/hooks/hookTemplateStore.ts
 *
 * 2.1.316 新增：钩子模板存储
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vmp3d2t.js (1)
 * attribution: placement 1
 */
import { createHash } from "crypto";
import { getHookTemplate } from "./hookTemplates.js";
import { BASE64_BODY_RE } from "../../entrypoints/sdk/controlSchemas.js";

//@ chunk-6vmp3d2t.js:385-1294 placement
function createHookTemplateStore(
  d = {
    byId: getHookTemplate,
  },
) {
  let t = new Map();
  return {
    accept({ template, digest, contentBase64 }) {
      let o = d.byId(template);
      if (o === undefined)
        return {
          ok: false,
          kind: "refused",
          error: "template_refused: unknown_template",
        };
      if (!o.digests.some((digest_2) => digest_2.sha256 === digest))
        return {
          ok: false,
          kind: "refused",
          error: "template_refused: version_mismatch",
        };
      if (!BASE64_BODY_RE.test(contentBase64) || contentBase64.length % 4 === 1)
        return {
          ok: false,
          kind: "invalid",
          error: "invalid_upload: bad_base64",
        };
      let buffer = Buffer.from(contentBase64, "base64");
      if (buffer.length > o.maxBytes)
        return {
          ok: false,
          kind: "refused",
          error: "template_refused: too_large",
        };
      if (createHash("sha256").update(buffer).digest("hex") !== digest)
        return {
          ok: false,
          kind: "refused",
          error: "template_refused: digest_mismatch",
        };
      if (t.has(digest))
        return {
          ok: true,
          status: "already_stored",
          template: o,
          bytes: buffer.length,
        };
      t.set(digest, buffer);
      return {
        ok: true,
        status: "stored",
        template: o,
        bytes: buffer.length,
      };
    },
    bytesFor: (r) => {
      let e = t.get(r);
      return e === undefined ? undefined : Buffer.from(e);
    },
    template: (r) => d.byId(r),
    size: () => t.size,
    clear: () => t.clear(),
  };
}
