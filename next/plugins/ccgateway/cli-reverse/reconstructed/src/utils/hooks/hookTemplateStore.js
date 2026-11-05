/**
 * utils/hooks/hookTemplateStore.ts
 *
 * 2.1.316 新增：钩子模板存储
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p8pkw07j.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { getHookTemplate } from "./hookTemplates.js";
import { BASE64_BODY_RE } from "../../entrypoints/sdk/controlSchemas.js";

//@ chunk-p8pkw07j.js:385-1294 placement
function createHookTemplateStore(
  deps = {
    byId: getHookTemplate,
  },
) {
  let store = new Map();
  return {
    accept({ template, digest, contentBase64 }) {
      let template_2 = deps.byId(template);
      if (template_2 === undefined)
        return {
          ok: false,
          kind: "refused",
          error: "template_refused: unknown_template",
        };
      if (!template_2.digests.some((digest_2) => digest_2.sha256 === digest))
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
      if (buffer.length > template_2.maxBytes)
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
      if (store.has(digest))
        return {
          ok: true,
          status: "already_stored",
          template: template_2,
          bytes: buffer.length,
        };
      store.set(digest, buffer);
      return {
        ok: true,
        status: "stored",
        template: template_2,
        bytes: buffer.length,
      };
    },
    bytesFor: (digest) => {
      let stored = store.get(digest);
      return stored === undefined ? undefined : Buffer.from(stored);
    },
    template: (templateId) => deps.byId(templateId),
    size: () => store.size,
    clear: () => store.clear(),
  };
}
export { createHookTemplateStore };
