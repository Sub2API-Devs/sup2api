/**
 * services/artifacts/publishSchema.ts
 *
 * 2.1.316 新增：发布参数 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (7)
 * attribution: placement 7
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-jv307fw4.js:21536-21790 placement
/**
 * 发布 schema 中 provenance 字段的说明：用途与关键决定、构建来源仓库/分支/提交、使用的数据源等。
 */
var PROVENANCE_FIELD_DESCRIPTION =
  "what the artifact is for and the key decisions; the repo, branch, and commit it was built from; data sources used (MCP servers, load-bearing files); whether embedded data is a snapshot and as of when; known limitations and suggested next steps";
//@ chunk-jv307fw4.js:21790-21803 placement
var MAX_PROVENANCE_PROMPT_BYTES = 16384;
//@ chunk-jv307fw4.js:21803-21855 placement
var TRUNCATED_PROMPT_NOTE = `
[prompt truncated: exceeded ${MAX_PROVENANCE_PROMPT_BYTES / 1024}KB]`;
//@ chunk-jv307fw4.js:21855-22085 placement
/**
 * 发布出处元数据（prompt、context、model、client_version）的 schema；模型与版本须匹配简单标识格式。
 */
var PROVENANCE_ID_RE = /^[\w.:@+-]{1,56}(?:\[[A-Za-z0-9]{1,6}\])?$/;
var PROVENANCE_SCHEMA = DoctorLazy(() => {
  let e = string()
    .refine((r) => r.trim() !== "")
    .optional()
    .catch(undefined);
  let n = string().trim().regex(PROVENANCE_ID_RE).optional().catch(undefined);
  return u({
    prompt: e,
    context: e,
    model: n,
    client_version: n,
  });
});
//@ chunk-jv307fw4.js:22085-22356 placement
/**
 * 校验发布出处元数据，返回其中存在的 prompt/context/model/clientVersion 字段；全空或格式不对时返回 undefined。
 */
function parseProvenance(originMetadata) {
  let n = PROVENANCE_SCHEMA().safeParse(originMetadata);
  if (!n.success) return;
  let { prompt, context, model, client_version: clientVersion } = n.data;
  let d = {
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
  return Object.keys(d).length > 0 ? d : undefined;
}
//@ chunk-jv307fw4.js:22356-22376 placement
var MAX_PROVENANCE_PROMPT_CHARS = 2000;
var MAX_PROVENANCE_CONTEXT_CHARS = 6000;
//@ chunk-jv307fw4.js:22376-22476 placement
function getProvenanceBudgets(e) {
  return {
    prompt: Math.min(MAX_PROVENANCE_PROMPT_CHARS, Math.floor(e / 16)),
    context: Math.min(MAX_PROVENANCE_CONTEXT_CHARS, Math.floor((3 * e) / 16)),
  };
}
export { parseProvenance, PROVENANCE_FIELD_DESCRIPTION };
