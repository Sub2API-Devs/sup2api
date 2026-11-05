/**
 * utils/teleport/branchOffer.ts
 *
 * 2.1.316 新增：teleport 分支提议。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9q27mnca.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  objectSchema,
  literal,
  array,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { GIT_SHA_RE, hasNonZeroHash } from "../../remote/tools/servedOwnerSettings.js";
import { MAX_GIT_REF_CHARS, isValidGitRefName } from "../git/refNames.js";

//@ chunk-9q27mnca.js:352-518 placement
var BRANCH_OFFER_VERSION = 1;
var MAX_OFFER_ANCESTORS = 64;
var OFFER = "offer";
var commitShaSchema = DoctorLazy(() => stringSchema().regex(GIT_SHA_RE).refine(hasNonZeroHash));
var branchOfferSchema = DoctorLazy(() =>
  objectSchema({
    v: literal(BRANCH_OFFER_VERSION),
    head: commitShaSchema(),
    branch: stringSchema().min(1).max(MAX_GIT_REF_CHARS).refine(isValidGitRefName),
    ancestors: array(unknown()).max(MAX_OFFER_ANCESTORS).pipe(array(commitShaSchema())),
  }),
);
//@ chunk-9q27mnca.js:518-589 placement
/**
 * 解析分支提议负载，非法返回 null。
 */
function branchOfferPayload(payload) {
  let parsed = branchOfferSchema().safeParse(payload[OFFER]);
  return parsed.success ? parsed.data : null;
}
export { branchOfferPayload };
