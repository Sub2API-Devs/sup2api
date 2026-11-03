/**
 * diff/lib/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: esm-fingerprint 1
 */
import { DoctorLazy } from "../../../src/cli/handlers/util.js";
import { zodStrictObject, string, M, u, E, array, _enum } from "../../zod/v4/classic/schemas.js";
import { booleanishSchema } from "../../../src/utils/spellcheck.js";
import { attachedMachineInputField } from "../../../src/bridge/deviceRegistration.js";
import { stagedWordingSchema } from "../../../src/tools/FileWriteTool/FileWriteTool.js";

//@ chunk-e6aww6q8.js:1410040-1411318 esm-fingerprint
/**
 * Edit 的 zod schema：输入（file_path/old_string/new_string/replace_all + 可选 _host）、hunk、gitDiff、输出（filePath/oldString/newString/originalFile/structuredPatch/userModified/replaceAll/gitDiff/staged/stagedWording）。
 */
var fileEditInputSchema = DoctorLazy(() =>
  zodStrictObject({
    file_path: string().describe("The absolute path to the file to modify"),
    old_string: string().describe("The text to replace"),
    new_string: string().describe("The text to replace it with (must be different from old_string)"),
    replace_all: booleanishSchema(M())
      .default(false)
      .optional()
      .describe("Replace all occurrences of old_string (default false)"),
    ...attachedMachineInputField(),
  }),
);
var hunkSchema = DoctorLazy(() =>
  u({
    oldStart: E(),
    oldLines: E(),
    newStart: E(),
    newLines: E(),
    lines: array(string()),
  }),
);
var gitDiffSchema = DoctorLazy(() =>
  u({
    filename: string(),
    status: _enum(["modified", "added"]),
    additions: E(),
    deletions: E(),
    changes: E(),
    patch: string(),
    repository: string().nullable().optional().describe("GitHub owner/repo when available"),
  }),
);
var fileEditOutputSchema = DoctorLazy(() =>
  u({
    filePath: string().describe("The file path that was edited"),
    oldString: string().describe("The original string that was replaced"),
    newString: string().describe("The new string that replaced it"),
    originalFile: string().nullable().describe("The original file contents before editing"),
    structuredPatch: array(hunkSchema()).describe("Diff patch showing the changes"),
    userModified: M().describe("Whether the user modified the proposed changes"),
    replaceAll: M().describe("Whether all occurrences were replaced"),
    gitDiff: gitDiffSchema().optional(),
    staged: M()
      .optional()
      .describe(
        "True when the edit was held for the machine owner to review instead of written; the file is unchanged",
      ),
    stagedWording: stagedWordingSchema(),
  }),
);
export { fileEditOutputSchema, hunkSchema, gitDiffSchema, fileEditInputSchema };
