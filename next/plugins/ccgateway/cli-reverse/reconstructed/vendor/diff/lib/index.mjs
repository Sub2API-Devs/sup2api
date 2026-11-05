/**
 * diff/lib/index.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../../src/cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  booleanSchema,
  objectSchema,
  numberSchema,
  array,
  _enum,
} from "../../zod/v4/classic/schemas.js";
import { booleanishSchema } from "../../../src/utils/spellcheck.js";
import { attachedMachineInputField } from "../../../src/bridge/deviceRegistration.js";
import { stagedWordingSchema } from "../../../src/tools/FileWriteTool/FileWriteTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1409519-1410799 esm-fingerprint
/**
 * Edit 的 zod schema：输入（file_path/old_string/new_string/replace_all + 可选 _host）、hunk、gitDiff、输出（filePath/oldString/newString/originalFile/structuredPatch/userModified/replaceAll/gitDiff/staged/stagedWording）。
 */
var fileEditInputSchema; // deferred: uses DoctorLazy (../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var hunkSchema;
var gitDiffSchema;
var fileEditOutputSchema;
deferInit("chunk-5xgkngpb.js:1409519", () => {
  fileEditInputSchema = DoctorLazy(() =>
    zodStrictObject({
      file_path: stringSchema().describe("The absolute path to the file to modify"),
      old_string: stringSchema().describe("The text to replace"),
      new_string: stringSchema().describe("The text to replace it with (must be different from old_string)"),
      replace_all: booleanishSchema(booleanSchema())
        .default(false)
        .optional()
        .describe("Replace all occurrences of old_string (default false)"),
      ...attachedMachineInputField(),
    }),
  );
  hunkSchema = DoctorLazy(() =>
    objectSchema({
      oldStart: numberSchema(),
      oldLines: numberSchema(),
      newStart: numberSchema(),
      newLines: numberSchema(),
      lines: array(stringSchema()),
    }),
  );
  gitDiffSchema = DoctorLazy(() =>
    objectSchema({
      filename: stringSchema(),
      status: _enum(["modified", "added"]),
      additions: numberSchema(),
      deletions: numberSchema(),
      changes: numberSchema(),
      patch: stringSchema(),
      repository: stringSchema().nullable().optional().describe("GitHub owner/repo when available"),
    }),
  );
  fileEditOutputSchema = DoctorLazy(() =>
    objectSchema({
      filePath: stringSchema().describe("The file path that was edited"),
      oldString: stringSchema().describe("The original string that was replaced"),
      newString: stringSchema().describe("The new string that replaced it"),
      originalFile: stringSchema().nullable().describe("The original file contents before editing"),
      structuredPatch: array(hunkSchema()).describe("Diff patch showing the changes"),
      userModified: booleanSchema().describe("Whether the user modified the proposed changes"),
      replaceAll: booleanSchema().describe("Whether all occurrences were replaced"),
      gitDiff: gitDiffSchema().optional(),
      staged: booleanSchema()
        .optional()
        .describe(
          "True when the edit was held for the machine owner to review instead of written; the file is unchanged",
        ),
      stagedWording: stagedWordingSchema(),
    }),
  );
});
export { fileEditOutputSchema, hunkSchema, gitDiffSchema, fileEditInputSchema };
