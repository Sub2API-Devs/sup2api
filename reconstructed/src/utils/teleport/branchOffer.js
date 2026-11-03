/**
 * utils/teleport/branchOffer.ts
 *
 * 2.1.316 新增：teleport 分支提议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cynvvj0d.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, u, T, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { vSe, _ti } from "../../remote/tools/servedOwnerSettings.js";
import { MAX_GIT_REF_CHARS, isValidGitRefName } from "../git/refNames.js";

//@ chunk-cynvvj0d.js:352-518 placement
var BRANCH_OFFER_VERSION = 1,
  MAX_OFFER_ANCESTORS = 64,
  OFFER = "offer",
  commitShaSchema = DoctorLazy(() => o().regex(vSe).refine(_ti)),
  branchOfferSchema = DoctorLazy(() =>
    u({
      v: T(BRANCH_OFFER_VERSION),
      head: commitShaSchema(),
      branch: o().min(1).max(MAX_GIT_REF_CHARS).refine(isValidGitRefName),
      ancestors: A(oe()).max(MAX_OFFER_ANCESTORS).pipe(A(commitShaSchema())),
    }),
  );
//@ chunk-cynvvj0d.js:518-589 placement
function yRs(e) {
  let safeParse = branchOfferSchema().safeParse(e[OFFER]);
  return safeParse.success ? safeParse.data : null;
}

export { yRs };
