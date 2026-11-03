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
import { zodStrictObject, T, o, E, Ir } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * LSP 工具严格输入 schema：按 operation 的判别联合，validateInput 用它校验。
 */
//@ chunk-kxyd0g16.js:100287-103223 fingerprint = lspToolInputSchema (0.895)
var lspToolInputSchema = DoctorLazy(() => {
  let e = zodStrictObject({
      operation: T("goToDefinition"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    r = zodStrictObject({
      operation: T("findReferences"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    n = zodStrictObject({
      operation: T("hover"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    s = zodStrictObject({
      operation: T("documentSymbol"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    f = zodStrictObject({
      operation: T("workspaceSymbol"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o()
        .optional()
        .describe(
          "The symbol name or partial name to search for. Most language servers return no results for an empty query.",
        ),
    }),
    h = zodStrictObject({
      operation: T("goToImplementation"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    y = zodStrictObject({
      operation: T("prepareCallHierarchy"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    k = zodStrictObject({
      operation: T("incomingCalls"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    }),
    w = zodStrictObject({
      operation: T("outgoingCalls"),
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o().optional(),
    });
  return Ir("operation", [e, r, n, s, f, h, y, k, w]);
});

export { lspToolInputSchema };
