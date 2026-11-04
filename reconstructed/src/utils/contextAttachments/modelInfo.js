/**
 * utils/contextAttachments/modelInfo.ts
 *
 * 2.1.316 新增：模型信息上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getCatalogEntry as getCatalogEntry_2 } from "../model/modelCatalog.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { getMarketingNameForModel } from "../model/model.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:105191-105341 placement
/**
 * 环境信息里的模型 schema（id、展示名、训练截止）。
 */
var ENV_INFO_MODEL; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var modelInfoSchema;
var modelInfoNullableSchema;
deferInit("chunk-e6aww6q8.js:105191", () => {
  ENV_INFO_MODEL = "env_info_model";
  modelInfoSchema = DoctorLazy(() =>
    objectSchema({
      modelId: stringSchema(),
      marketingName: stringSchema().nullable(),
      knowledgeCutoff: stringSchema().nullable(),
    }),
  );
  modelInfoNullableSchema = DoctorLazy(() => stringSchema().nullable().optional());
});
//@ chunk-e6aww6q8.js:105341-105398 placement
/**
 * 从模型目录取训练截止时间。
 */
function knowledgeCutoffForModel(model) {
  return getCatalogEntry_2(getCanonicalName(model))?.knowledge_cutoff ?? null;
}
//@ chunk-e6aww6q8.js:105398-105481 placement
/**
 * 构造模型信息（id、展示名与训练截止时间）。
 */
function modelInfoForModel(model) {
  return {
    modelId: model,
    marketingName: getMarketingNameForModel(model) ?? null,
    knowledgeCutoff: knowledgeCutoffForModel(model),
  };
}
export { ENV_INFO_MODEL, modelInfoNullableSchema, modelInfoSchema, modelInfoForModel };
