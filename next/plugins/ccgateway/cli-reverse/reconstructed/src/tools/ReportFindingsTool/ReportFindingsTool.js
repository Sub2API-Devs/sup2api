/**
 * tools/ReportFindingsTool/ReportFindingsTool.ts
 *
 * 2.1.316 新增：报告代码审查发现的工具 schema；报告发现工具的输出 schema。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  _enum,
  zodStrictObject,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { REPORTFINDINGS, REPORTFINDINGS_DESCRIPTION } from "./constants.js";
import { plural } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:64163-65261 placement
/**
 * ReportFindings 的输入 schema（文件、行号、摘要、类别等）。
 */
var ReportFindingsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var reportFindingsInputSchema;
deferInit("chunk-fmnbrxwy.js:64163", () => {
  ReportFindingsSchema = DoctorLazy(() =>
    objectSchema({
      file: stringSchema().describe("Repo-relative path of the file the finding is in"),
      line: numberSchema().int().optional().describe("1-indexed line the finding anchors to"),
      summary: stringSchema().describe("One-sentence statement of the defect"),
      short_summary: stringSchema()
        .max(60)
        .optional()
        .describe(
          "Compressed label for compact UI (\u226460 chars): the claim alone, no rationale or consequence clause",
        ),
      failure_scenario: stringSchema().describe("Concrete inputs/state \u2192 wrong output/crash"),
      category: stringSchema()
        .max(40)
        .optional()
        .describe(
          'Short kebab-case slug of the finding type, e.g. "correctness", "simplification", "efficiency", "test-coverage"',
        ),
      verdict: _enum(["CONFIRMED", "PLAUSIBLE"])
        .optional()
        .describe("Set when a verify pass ran; absent on inline-only reviews"),
      outcome: _enum(["fixed", "skipped", "no_change_needed"])
        .optional()
        .describe("Set ONLY when re-reporting after applying fixes: what happened to this finding"),
    }),
  );
  reportFindingsInputSchema = DoctorLazy(() =>
    zodStrictObject({
      level: _enum(["low", "medium", "high", "xhigh", "max"])
        .optional()
        .describe("Effort level the review ran at"),
      findings: array(ReportFindingsSchema())
        .max(32)
        .describe("Verified findings, most-severe first; empty if none survived"),
    }),
  );
});
//@ chunk-fmnbrxwy.js:65261-66273 placement
/**
 * ReportFindings 工具配置对象。
 */
var ReportFindingsOutputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ReportFindingsTool;
deferInit("chunk-fmnbrxwy.js:65261", () => {
  ReportFindingsOutputSchema = DoctorLazy(() =>
    objectSchema({
      count: numberSchema().describe("Number of findings reported"),
      level: _enum(["low", "medium", "high", "xhigh", "max"])
        .optional()
        .describe("Effort level the review ran at"),
      findings: array(ReportFindingsSchema()).describe("Echoed for the result body"),
    }),
  );
  ReportFindingsTool = buildTool({
    name: REPORTFINDINGS,
    searchHint: "report code-review findings as a structured list",
    backgrounding: "never",
    maxResultSizeChars: 256,
    strict: true,
    async description() {
      return REPORTFINDINGS_DESCRIPTION;
    },
    async prompt() {
      return REPORTFINDINGS_DESCRIPTION;
    },
    get inputSchema() {
      return reportFindingsInputSchema();
    },
    get outputSchema() {
      return ReportFindingsOutputSchema();
    },
    isReadOnly() {
      return true;
    },
    isConcurrencySafe() {
      return true;
    },
    toAutoClassifierInput(input) {
      return `${input.findings.length} findings`;
    },
    userFacingName() {
      return "Code review";
    },
    renderToolUseMessage(input) {
      let findingCount = input.findings?.length ?? 0;
      return `${input.level ?? "review"} \xB7 ${findingCount} ${plural(findingCount, "finding")}`;
    },
    create() {
      return {
        async call({ findings, level }) {
          return {
            data: {
              count: findings.length,
              level,
              findings,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam({ count }, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: count === 0 ? "No findings reported." : `${count} ${plural(count, "finding")} reported.`,
      };
    },
  });
});
export { ReportFindingsTool };
