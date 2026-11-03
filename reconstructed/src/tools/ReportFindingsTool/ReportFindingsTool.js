/**
 * tools/ReportFindingsTool/ReportFindingsTool.ts
 *
 * 2.1.316 新增：报告代码审查发现的工具 schema；报告发现工具的输出 schema。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, U, zodStrictObject, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { REPORTFINDINGS, R5o } from "./constants.js";
import { plural } from "../../utils/stringUtils.js";

/**
 * 报告代码审查发现的工具 schema。
 */
//@ chunk-kxyd0g16.js:49449-50547 placement
var ReportFindingsSchema = DoctorLazy(() =>
    u({
      file: o().describe("Repo-relative path of the file the finding is in"),
      line: E().int().optional().describe("1-indexed line the finding anchors to"),
      summary: o().describe("One-sentence statement of the defect"),
      short_summary: o()
        .max(60)
        .optional()
        .describe(
          "Compressed label for compact UI (\u226460 chars): the claim alone, no rationale or consequence clause",
        ),
      failure_scenario: o().describe("Concrete inputs/state \u2192 wrong output/crash"),
      category: o()
        .max(40)
        .optional()
        .describe(
          'Short kebab-case slug of the finding type, e.g. "correctness", "simplification", "efficiency", "test-coverage"',
        ),
      verdict: U(["CONFIRMED", "PLAUSIBLE"])
        .optional()
        .describe("Set when a verify pass ran; absent on inline-only reviews"),
      outcome: U(["fixed", "skipped", "no_change_needed"])
        .optional()
        .describe("Set ONLY when re-reporting after applying fixes: what happened to this finding"),
    }),
  ),
  _o = DoctorLazy(() =>
    zodStrictObject({
      level: U(["low", "medium", "high", "xhigh", "max"])
        .optional()
        .describe("Effort level the review ran at"),
      findings: A(ReportFindingsSchema())
        .max(32)
        .describe("Verified findings, most-severe first; empty if none survived"),
    }),
  );
/**
 * 报告发现工具的输出 schema。
 */
//@ chunk-kxyd0g16.js:50547-51559 placement
var ReportFindingsOutputSchema = DoctorLazy(() =>
    u({
      count: E().describe("Number of findings reported"),
      level: U(["low", "medium", "high", "xhigh", "max"])
        .optional()
        .describe("Effort level the review ran at"),
      findings: A(ReportFindingsSchema()).describe("Echoed for the result body"),
    }),
  ),
  vo = buildTool({
    name: REPORTFINDINGS,
    searchHint: "report code-review findings as a structured list",
    backgrounding: "never",
    maxResultSizeChars: 256,
    strict: !0,
    async description() {
      return R5o;
    },
    async prompt() {
      return R5o;
    },
    get inputSchema() {
      return _o();
    },
    get outputSchema() {
      return ReportFindingsOutputSchema();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return `${e.findings.length} findings`;
    },
    userFacingName() {
      return "Code review";
    },
    renderToolUseMessage(e) {
      let r = e.findings?.length ?? 0;
      return `${e.level ?? "review"} \xB7 ${r} ${plural(r, "finding")}`;
    },
    create() {
      return {
        async call({ findings: e, level: r }) {
          return { data: { count: e.length, level: r, findings: e } };
        },
      };
    },
    mapToolResultToToolResultBlockParam({ count: e }, r) {
      return {
        tool_use_id: r,
        type: "tool_result",
        content: e === 0 ? "No findings reported." : `${e} ${plural(e, "finding")} reported.`,
      };
    },
  });

export { vo };
