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
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 发布 schema 中 provenance 字段的说明：用途与关键决定、构建来源仓库/分支/提交、使用的数据源等。
 */
//@ chunk-jv307fw4.js:21536-21790 placement
var PROVENANCE_FIELD_DESCRIPTION =
  "what the artifact is for and the key decisions; the repo, branch, and commit it was built from; data sources used (MCP servers, load-bearing files); whether embedded data is a snapshot and as of when; known limitations and suggested next steps";
//@ chunk-jv307fw4.js:21790-21803 placement
var $t = 16384;
//@ chunk-jv307fw4.js:21803-21855 placement
var sr = `
[prompt truncated: exceeded ${$t / 1024}KB]`;
/**
 * 发布出处元数据（prompt、context、model、client_version）的 schema；模型与版本须匹配简单标识格式。
 */
//@ chunk-jv307fw4.js:21855-22085 placement
var PROVENANCE_ID_RE = /^[\w.:@+-]{1,56}(?:\[[A-Za-z0-9]{1,6}\])?$/,
  PROVENANCE_SCHEMA = DoctorLazy(() => {
    let e = o()
        .refine((r) => r.trim() !== "")
        .optional()
        .catch(void 0),
      n = o()
        .trim()
        .regex(PROVENANCE_ID_RE)
        .optional()
        .catch(void 0);
    return u({ prompt: e, context: e, model: n, client_version: n });
  });
/**
 * 校验发布出处元数据，返回其中存在的 prompt/context/model/clientVersion 字段；全空或格式不对时返回 undefined。
 */
//@ chunk-jv307fw4.js:22085-22356 placement
function parseProvenance(e) {
  let safeParse = PROVENANCE_SCHEMA().safeParse(e);
  if (!safeParse.success) return;
  let { prompt: prompt, context: context, model: model, client_version: client_version } = safeParse.data,
    d = {
      ...(prompt !== void 0 && { prompt: prompt }),
      ...(context !== void 0 && { context: context }),
      ...(model !== void 0 && { model: model }),
      ...(client_version !== void 0 && { clientVersion: client_version }),
    };
  return Object.keys(d).length > 0 ? d : void 0;
}
//@ chunk-jv307fw4.js:22356-22376 placement
var Bt = 2000,
  Nt = 6000;
//@ chunk-jv307fw4.js:22376-22476 placement
function getProvenanceBudgets(e) {
  return { prompt: Math.min(Bt, Math.floor(e / 16)), context: Math.min(Nt, Math.floor((3 * e) / 16)) };
}

export { parseProvenance, PROVENANCE_FIELD_DESCRIPTION };
