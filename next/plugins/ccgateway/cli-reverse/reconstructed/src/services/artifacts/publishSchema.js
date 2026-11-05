/**
 * services/artifacts/publishSchema.ts
 *
 * 2.1.316 新增：发布参数 schema
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m0ks5273.js:21553-21807 placement
/**
 * 发布 schema 中 provenance 字段的说明：用途与关键决定、构建来源仓库/分支/提交、使用的数据源等。
 */
var PROVENANCE_FIELD_DESCRIPTION =
  "what the artifact is for and the key decisions; the repo, branch, and commit it was built from; data sources used (MCP servers, load-bearing files); whether embedded data is a snapshot and as of when; known limitations and suggested next steps";
//@ chunk-m0ks5273.js:21807-21820 placement
var MAX_PROVENANCE_PROMPT_BYTES = 16384;
//@ chunk-m0ks5273.js:21820-21872 placement
var TRUNCATED_PROMPT_NOTE = `
[prompt truncated: exceeded ${MAX_PROVENANCE_PROMPT_BYTES / 1024}KB]`;
//@ chunk-m0ks5273.js:21872-22102 placement
/**
 * 发布出处元数据（prompt、context、model、client_version）的 schema；模型与版本须匹配简单标识格式。
 */
var PROVENANCE_ID_RE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PROVENANCE_SCHEMA;
deferInit("chunk-m0ks5273.js:21872", () => {
  PROVENANCE_ID_RE = /^[\w.:@+-]{1,56}(?:\[[A-Za-z0-9]{1,6}\])?$/;
  PROVENANCE_SCHEMA = DoctorLazy(() => {
    let textField = stringSchema()
      .refine((value) => value.trim() !== "")
      .optional()
      .catch(undefined);
    let idField = stringSchema().trim().regex(PROVENANCE_ID_RE).optional().catch(undefined);
    return objectSchema({
      prompt: textField,
      context: textField,
      model: idField,
      client_version: idField,
    });
  });
});
//@ chunk-m0ks5273.js:22102-22373 placement
/**
 * 校验发布出处元数据，返回其中存在的 prompt/context/model/clientVersion 字段；全空或格式不对时返回 undefined。
 */
function parseProvenance(originMetadata) {
  let parsed = PROVENANCE_SCHEMA().safeParse(originMetadata);
  if (!parsed.success) return;
  let { prompt, context, model, client_version: clientVersion } = parsed.data;
  let fields = {
    ...(prompt !== undefined && {
      prompt,
    }),
    ...(context !== undefined && {
      context,
    }),
    ...(model !== undefined && {
      model,
    }),
    ...(clientVersion !== undefined && {
      clientVersion,
    }),
  };
  return Object.keys(fields).length > 0 ? fields : undefined;
}
//@ chunk-m0ks5273.js:22373-22393 placement
var MAX_PROVENANCE_PROMPT_CHARS = 2000;
var MAX_PROVENANCE_CONTEXT_CHARS = 6000;
//@ chunk-m0ks5273.js:22393-22493 placement
function getProvenanceBudgets(record) {
  return {
    prompt: Math.min(MAX_PROVENANCE_PROMPT_CHARS, Math.floor(record / 16)),
    context: Math.min(MAX_PROVENANCE_CONTEXT_CHARS, Math.floor((3 * record) / 16)),
  };
}
export { parseProvenance, PROVENANCE_FIELD_DESCRIPTION };
