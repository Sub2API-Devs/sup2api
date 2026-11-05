/**
 * hooks/useUpdateNotification.ts
 *
 * 新版本可用通知与 semver 片段比较。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useUpdateNotification.ts
 * pieces: chunk-ndr12bqk.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  record,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-ndr12bqk.js:53471-53667 fingerprint (2.1.88 match: getSemverPart, 0.622)
var getSemverPart = DoctorLazy(() =>
  objectSchema({
    httpUrl: stringSchema().optional(),
    url: stringSchema().optional(),
    command: stringSchema().optional(),
    args: array(stringSchema()).optional(),
    env: record(stringSchema(), stringSchema()).optional(),
    headers: record(stringSchema(), stringSchema()).optional(),
    timeout: numberSchema().optional(),
  }).loose(),
);
export { getSemverPart };
