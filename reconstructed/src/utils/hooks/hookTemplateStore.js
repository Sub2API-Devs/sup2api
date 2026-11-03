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
import { Ols } from "../../entrypoints/sdk/controlSchemas.js";

//@ chunk-6vmp3d2t.js:385-1294 placement
function createHookTemplateStore(d = { byId: getHookTemplate }) {
  let t = new Map();
  return {
    accept({ template: r, digest: e, contentBase64: s }) {
      let byId = d.byId(r);
      if (byId === void 0) return { ok: !1, kind: "refused", error: "template_refused: unknown_template" };
      if (!byId.digests.some((digest) => digest.sha256 === e))
        return { ok: !1, kind: "refused", error: "template_refused: version_mismatch" };
      if (!Ols.test(s) || s.length % 4 === 1)
        return { ok: !1, kind: "invalid", error: "invalid_upload: bad_base64" };
      let buffer = Buffer.from(s, "base64");
      if (buffer.length > byId.maxBytes)
        return { ok: !1, kind: "refused", error: "template_refused: too_large" };
      if (createHash("sha256").update(buffer).digest("hex") !== e)
        return { ok: !1, kind: "refused", error: "template_refused: digest_mismatch" };
      if (t.has(e)) return { ok: !0, status: "already_stored", template: byId, bytes: buffer.length };
      return (t.set(e, buffer), { ok: !0, status: "stored", template: byId, bytes: buffer.length });
    },
    bytesFor: (r) => {
      let e = t.get(r);
      return e === void 0 ? void 0 : Buffer.from(e);
    },
    template: (r) => d.byId(r),
    size: () => t.size,
    clear: () => t.clear(),
  };
}
