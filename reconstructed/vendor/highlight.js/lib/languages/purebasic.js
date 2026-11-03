/**
 * highlight.js/lib/languages/purebasic.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:378896-380493 cjs-fingerprint
var ss = x(function (Lg, is) {
  function Xp(e) {
    let t = { className: "string", begin: '(~)?"', end: '"', illegal: "\\n" },
      n = { className: "symbol", begin: "#[a-zA-Z_]\\w*\\$?" };
    return {
      name: "PureBASIC",
      aliases: ["pb", "pbi"],
      keywords:
        "Align And Array As Break CallDebugger Case CompilerCase CompilerDefault CompilerElse CompilerElseIf CompilerEndIf CompilerEndSelect CompilerError CompilerIf CompilerSelect CompilerWarning Continue Data DataSection Debug DebugLevel Declare DeclareC DeclareCDLL DeclareDLL DeclareModule Default Define Dim DisableASM DisableDebugger DisableExplicit Else ElseIf EnableASM EnableDebugger EnableExplicit End EndDataSection EndDeclareModule EndEnumeration EndIf EndImport EndInterface EndMacro EndModule EndProcedure EndSelect EndStructure EndStructureUnion EndWith Enumeration EnumerationBinary Extends FakeReturn For ForEach ForEver Global Gosub Goto If Import ImportC IncludeBinary IncludeFile IncludePath Interface List Macro MacroExpandedCount Map Module NewList NewMap Next Not Or Procedure ProcedureC ProcedureCDLL ProcedureDLL ProcedureReturn Protected Prototype PrototypeC ReDim Read Repeat Restore Return Runtime Select Shared Static Step Structure StructureUnion Swap Threaded To UndefineMacro Until Until  UnuseModule UseModule Wend While With XIncludeFile XOr",
      contains: [
        e.COMMENT(";", "$", { relevance: 0 }),
        {
          className: "function",
          begin: "\\b(Procedure|Declare)(C|CDLL|DLL)?\\b",
          end: "\\(",
          excludeEnd: !0,
          returnBegin: !0,
          contains: [
            { className: "keyword", begin: "(Procedure|Declare)(C|CDLL|DLL)?", excludeEnd: !0 },
            { className: "type", begin: "\\.\\w*" },
            e.UNDERSCORE_TITLE_MODE,
          ],
        },
        t,
        n,
      ],
    };
  }
  is.exports = Xp;
});

export { ss };
