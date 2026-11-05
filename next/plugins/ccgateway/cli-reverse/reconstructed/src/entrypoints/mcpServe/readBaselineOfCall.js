/**
 * entrypoints/mcpServe/readBaselineOfCall.ts
 *
 * anthropic/readBaselineOfCall 的 sha256/bytes 形状与解析（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fb9qe48t.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { isPlainObject } from "../../utils/objectUtils.js";

//@ chunk-fb9qe48t.js:16435-16555 placement
var ANTHROPIC_READBASELINEOFCALL = "anthropic/readBaselineOfCall";
var readBaselineOfCallSchema = DoctorLazy(() =>
  objectSchema({
    sha256: stringSchema().regex(SHA256_HEX_RE),
    bytes: numberSchema().int().nonnegative().max(1073741824),
  }),
);
//@ chunk-fb9qe48t.js:16555-16617 placement
function readBaselineOfCall(meta) {
  return isPlainObject(meta)
    ? readBaselineOfCallSchema().safeParse(meta[ANTHROPIC_READBASELINEOFCALL]).data
    : undefined;
}
export { readBaselineOfCall };
