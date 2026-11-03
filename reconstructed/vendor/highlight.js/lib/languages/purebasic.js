/**
 * highlight.js/lib/languages/purebasic.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:378896-380493 cjs-fingerprint
var require_purebasic = x(function (cjsExports, cjsModule) {
  function purebasic(hljs) {
    let STRINGS = {
      className: "string",
      begin: '(~)?"',
      end: '"',
      illegal: "\\n",
    };
    let CONSTANTS = {
      className: "symbol",
      begin: "#[a-zA-Z_]\\w*\\$?",
    };
    return {
      name: "PureBASIC",
      aliases: ["pb", "pbi"],
      keywords:
        "Align And Array As Break CallDebugger Case CompilerCase CompilerDefault CompilerElse CompilerElseIf CompilerEndIf CompilerEndSelect CompilerError CompilerIf CompilerSelect CompilerWarning Continue Data DataSection Debug DebugLevel Declare DeclareC DeclareCDLL DeclareDLL DeclareModule Default Define Dim DisableASM DisableDebugger DisableExplicit Else ElseIf EnableASM EnableDebugger EnableExplicit End EndDataSection EndDeclareModule EndEnumeration EndIf EndImport EndInterface EndMacro EndModule EndProcedure EndSelect EndStructure EndStructureUnion EndWith Enumeration EnumerationBinary Extends FakeReturn For ForEach ForEver Global Gosub Goto If Import ImportC IncludeBinary IncludeFile IncludePath Interface List Macro MacroExpandedCount Map Module NewList NewMap Next Not Or Procedure ProcedureC ProcedureCDLL ProcedureDLL ProcedureReturn Protected Prototype PrototypeC ReDim Read Repeat Restore Return Runtime Select Shared Static Step Structure StructureUnion Swap Threaded To UndefineMacro Until Until  UnuseModule UseModule Wend While With XIncludeFile XOr",
      contains: [
        hljs.COMMENT(";", "$", {
          relevance: 0,
        }),
        {
          className: "function",
          begin: "\\b(Procedure|Declare)(C|CDLL|DLL)?\\b",
          end: "\\(",
          excludeEnd: true,
          returnBegin: true,
          contains: [
            {
              className: "keyword",
              begin: "(Procedure|Declare)(C|CDLL|DLL)?",
              excludeEnd: true,
            },
            {
              className: "type",
              begin: "\\.\\w*",
            },
            hljs.UNDERSCORE_TITLE_MODE,
          ],
        },
        STRINGS,
        CONSTANTS,
      ],
    };
  }
  cjsModule.exports = purebasic;
});
export { require_purebasic };
