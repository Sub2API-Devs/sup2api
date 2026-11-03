/**
 * tools/LSPTool/schemas.ts
 *
 * LSP 工具按 operation 判别的严格输入 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/schemas.ts
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  literal,
  string,
  E,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-kxyd0g16.js:100287-103223 fingerprint = lspToolInputSchema (0.895)
/**
 * LSP 工具严格输入 schema：按 operation 的判别联合，validateInput 用它校验。
 */
var lspToolInputSchema = DoctorLazy(() => {
  let goToDefinitionSchema = zodStrictObject({
    operation: literal("goToDefinition"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let findReferencesSchema = zodStrictObject({
    operation: literal("findReferences"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let hoverSchema = zodStrictObject({
    operation: literal("hover"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let documentSymbolSchema = zodStrictObject({
    operation: literal("documentSymbol"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let workspaceSymbolSchema = zodStrictObject({
    operation: literal("workspaceSymbol"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string()
      .optional()
      .describe(
        "The symbol name or partial name to search for. Most language servers return no results for an empty query.",
      ),
  });
  let goToImplementationSchema = zodStrictObject({
    operation: literal("goToImplementation"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let prepareCallHierarchySchema = zodStrictObject({
    operation: literal("prepareCallHierarchy"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let incomingCallsSchema = zodStrictObject({
    operation: literal("incomingCalls"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
  });
  let outgoingCallsSchema = zodStrictObject({
    operation: literal("outgoingCalls"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string().optional(),
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
export { lspToolInputSchema };
