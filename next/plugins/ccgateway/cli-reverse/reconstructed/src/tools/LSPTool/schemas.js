/**
 * tools/LSPTool/schemas.ts
 *
 * LSP 工具按 operation 判别的严格输入 schema
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/schemas.ts
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  literal,
  stringSchema,
  numberSchema,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:115001-117937 fingerprint (2.1.88 match: lspToolInputSchema, 0.895)
/**
 * LSP 工具严格输入 schema：按 operation 的判别联合，validateInput 用它校验。
 */
var lspToolInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:115001", () => {
  lspToolInputSchema = DoctorLazy(() => {
    let goToDefinitionSchema = zodStrictObject({
      operation: literal("goToDefinition"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let findReferencesSchema = zodStrictObject({
      operation: literal("findReferences"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let hoverSchema = zodStrictObject({
      operation: literal("hover"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let documentSymbolSchema = zodStrictObject({
      operation: literal("documentSymbol"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let workspaceSymbolSchema = zodStrictObject({
      operation: literal("workspaceSymbol"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema()
        .optional()
        .describe(
          "The symbol name or partial name to search for. Most language servers return no results for an empty query.",
        ),
    });
    let goToImplementationSchema = zodStrictObject({
      operation: literal("goToImplementation"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let prepareCallHierarchySchema = zodStrictObject({
      operation: literal("prepareCallHierarchy"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let incomingCallsSchema = zodStrictObject({
      operation: literal("incomingCalls"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    let outgoingCallsSchema = zodStrictObject({
      operation: literal("outgoingCalls"),
      filePath: stringSchema().describe("The absolute or relative path to the file"),
      line: numberSchema().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: numberSchema()
        .int()
        .positive()
        .describe("The character offset (1-based, as shown in editors)"),
      query: stringSchema().optional(),
    });
    return discriminatedUnion("operation", [
      goToDefinitionSchema,
      findReferencesSchema,
      hoverSchema,
      documentSymbolSchema,
      workspaceSymbolSchema,
      goToImplementationSchema,
      prepareCallHierarchySchema,
      incomingCallsSchema,
      outgoingCallsSchema,
    ]);
  });
});
export { lspToolInputSchema };
