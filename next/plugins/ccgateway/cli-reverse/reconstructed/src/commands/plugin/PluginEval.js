/**
 * commands/plugin/PluginEval.tsx
 *
 * 2.1.316 新增。/plugin eval：读取技能 evals/ 中的查询，跑触发测试并输出报告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wb51jffc.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdir, readFile } from "fs/promises";
import * as pathModule from "path";
import { homedir } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { stripBom as stripBom_2 } from "../../utils/remoteFileState.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";
import { parseYaml } from "../../utils/yaml.js";
import { logForDebugging } from "../../utils/debug.js";
import { countWhere } from "../../utils/collections.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useRef, useEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:97132-97209 placement (2.1.88 match: getToolUseSummary, 0.537)
/**
 * 触发判定 schema（{query, should_trigger}）与上限常量；与 WebSearch UI 关系不明。
 */
var MIN_EVAL_QUERIES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var evalQuerySchema;
var noEvalRunner;
deferInit("chunk-wb51jffc.js:97132", () => {
  MIN_EVAL_QUERIES = 5;
  evalQuerySchema = DoctorLazy(() =>
    objectSchema({
      query: stringSchema().min(1),
      should_trigger: booleanSchema(),
    }),
  );
  noEvalRunner = async () => null;
});
//@ chunk-wb51jffc.js:97209-98286 placement
/**
 * 读取 evals/*.md 的 query/should_trigger
 */
async function loadEvalQueries(dir) {
  let queries = [];
  let warnings = [];
  let files;
  try {
    files = await readdir(dir);
  } catch (error) {
    if (isENOENT(error))
      return {
        queries: [],
        warnings: [
          `No evals/ folder found at ${dir}. Create one with at least ${MIN_EVAL_QUERIES} <name>.md files (frontmatter: query, should_trigger).`,
        ],
      };
    throw error;
  }
  for (let file of files.filter((name) => name.endsWith(".md")).sort()) {
    let joined = pathModule.join(dir, file);
    let source;
    try {
      source = await readFile(joined, "utf8");
    } catch (error) {
      warnings.push(`Could not read ${file}: ${errorMessage(error)}`);
      continue;
    }
    source = stripBom_2(source);
    let match = source.match(FRONTMATTER_REGEX);
    if (!match) {
      warnings.push(
        `${file}: missing YAML frontmatter (expected ---\\nquery: \u2026\\nshould_trigger: \u2026\\n---).`,
      );
      continue;
    }
    let frontmatter;
    try {
      frontmatter = parseYaml(match[1] ?? "");
    } catch (error) {
      warnings.push(`${file}: invalid YAML \u2014 ${errorMessage(error)}`);
      continue;
    }
    let parsed = evalQuerySchema().safeParse(frontmatter);
    if (!parsed.success) {
      let joined = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      warnings.push(`${file}: ${joined}`);
      continue;
    }
    let trimmed = source.slice(match[0].length).trim();
    queries.push({
      file,
      query: parsed.data.query,
      shouldTrigger: parsed.data.should_trigger,
      ...(trimmed && {
        notes: trimmed,
      }),
    });
  }
  if (queries.length > 0 && queries.length < MIN_EVAL_QUERIES)
    warnings.push(
      `Only ${queries.length} eval ${queries.length === 1 ? "query" : "queries"} found; the spec recommends at least ${MIN_EVAL_QUERIES} for meaningful coverage.`,
    );
  return {
    queries,
    warnings,
  };
}
//@ chunk-wb51jffc.js:98286-98523 placement
/**
 * 读 SKILL.md frontmatter 的 description
 */
async function readSkillDescription(skill) {
  try {
    let file = await readFile(pathModule.join(skill, "SKILL.md"), "utf8");
    let match = stripBom_2(file).match(FRONTMATTER_REGEX);
    if (!match) return "";
    let yaml = parseYaml(match[1] ?? "");
    if (yaml && typeof yaml === "object" && "description" in yaml && typeof yaml.description === "string")
      return yaml.description;
  } catch {}
  return "";
}
//@ chunk-wb51jffc.js:98523-99470 placement
/**
 * 对 evals/ 中每条查询跑触发测试
 */
async function runSkillTriggerEvals(target, signal, noEvalRunner) {
  let resolvedTarget =
    target === "~" || target.startsWith("~/") ? pathModule.join(homedir(), target.slice(1)) : target;
  let skill = pathModule.resolve(resolvedTarget);
  let base = pathModule.basename(skill);
  let description = await readSkillDescription(skill);
  let dir = pathModule.join(skill, "evals");
  let { queries, warnings } = await loadEvalQueries(dir);
  let results = [];
  for (let query of queries) {
    if (signal.aborted) break;
    try {
      let run = await noEvalRunner({
        skillName: base,
        description,
        query,
        signal,
      });
      if (run === null) {
        results.push({
          query,
          modelWouldTrigger: null,
          reason: "Model evaluation not yet wired up \u2014 tracks the plugin evaluation framework.",
          verdict: "skipped",
        });
        continue;
      }
      results.push({
        query,
        modelWouldTrigger: run.wouldTrigger,
        reason: run.reason,
        verdict: run.wouldTrigger === query.shouldTrigger ? "pass" : "fail",
      });
    } catch (error) {
      logForDebugging(`plugin eval: trigger test for ${query.file} threw: ${errorMessage(error)}`, {
        level: "error",
      });
      results.push({
        query,
        modelWouldTrigger: null,
        reason: errorMessage(error),
        verdict: "fail",
      });
    }
  }
  return {
    pluginName: base,
    pluginPath: skill,
    evalsPath: dir,
    queries,
    warnings,
    triggerResults: results,
    passCount: countWhere(results, (result) => result.verdict === "pass"),
    failCount: countWhere(results, (result) => result.verdict === "fail"),
    skippedCount: countWhere(results, (result) => result.verdict === "skipped"),
  };
}
//@ chunk-wb51jffc.js:99470-100513 placement
/**
 * 格式化插件评测报告
 */
function formatEvalReport(report) {
  let lines = [];
  lines.push(`Evaluating ${report.pluginName} (${report.evalsPath})`);
  lines.push("");
  for (let warning of report.warnings) lines.push(`! ${warning}`);
  if (report.warnings.length > 0) lines.push("");
  if (report.queries.length === 0) {
    lines.push("No eval queries to run.");
    return lines.join(`
`);
  }
  lines.push("Level 1 \u2014 trigger tests:");
  for (let triggerResult of report.triggerResults) {
    let padded = triggerResult.verdict.toUpperCase().padEnd(7);
    let actualVerdict = triggerResult.query.shouldTrigger ? "trigger" : "skip";
    if (triggerResult.verdict === "skipped")
      lines.push(`  [${padded}] ${triggerResult.query.file} \u2014 expected ${actualVerdict}`);
    else {
      let expectedVerdict = triggerResult.modelWouldTrigger ? "trigger" : "skip";
      lines.push(
        `  [${padded}] ${triggerResult.query.file} \u2014 expected ${actualVerdict}, got ${expectedVerdict}`,
      );
      if (triggerResult.verdict === "fail") lines.push(`            ${triggerResult.reason}`);
    }
  }
  lines.push("");
  if (report.skippedCount === report.triggerResults.length)
    lines.push("All trigger tests skipped \u2014 model evaluation not yet wired up.");
  else
    lines.push(
      `${report.passCount}/${report.passCount + report.failCount} trigger tests passed${report.skippedCount > 0 ? ` (${report.skippedCount} skipped)` : ""}.`,
    );
  lines.push("");
  lines.push("Level 2 \u2014 interplay tests: not yet implemented. Tracks the plugin evaluation framework.");
  return lines.join(`
`);
}
//@ chunk-wb51jffc.js:100513-101741 placement
/**
 * /plugin eval 的运行组件
 */
function PluginEvalRunner(props) {
  let $ = useMemoCache(6);
  let { onComplete, target } = props;
  let signal;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    signal = new AbortController();
    $[0] = signal;
  } else signal = $[0];
  let signalRef = useRef(signal);
  let state;
  let setState;
  if ($[1] !== onComplete || $[2] !== target) {
    state = () => {
      let current = signalRef.current;
      let runEvals = async function runEvals() {
        if (!target) {
          onComplete(`Usage: /plugin eval [path]

Run trigger evaluations for a skill against the queries in its evals/ folder.

Examples:
  /plugin eval ./my-skill
  /plugin eval ~/.claude/skills/pdf-tools

Each evals/*.md file needs frontmatter with \`query\` (string)
and \`should_trigger\` (boolean). The spec recommends at least five.

Or from the command line:
  claude plugin eval [path]`);
          return;
        }
        try {
          let results = await runSkillTriggerEvals(target, current.signal, noEvalRunner);
          process.exitCode = results.failCount > 0 ? 1 : 0;
          let summary =
            results.queries.length === 0
              ? ""
              : results.failCount > 0
                ? `

${figures_default.cross} Evaluation failed`
                : results.skippedCount === results.queries.length
                  ? `

${figures_default.info} Eval queries validated; trigger tests pending model integration`
                  : `

${figures_default.tick} Evaluation passed`;
          onComplete(formatEvalReport(results) + summary);
        } catch (error) {
          let caught = error;
          process.exitCode = 2;
          logForDebugging(`Plugin eval failed for ${target}: ${errorMessage(caught)}`, {
            level: "error",
          });
          onComplete(`${figures_default.cross} ${errorMessage(caught)}`);
        }
      };
      runEvals();
      return () => current.abort();
    };
    setState = [onComplete, target];
    $[1] = onComplete;
    $[2] = target;
    $[3] = state;
    $[4] = setState;
  } else {
    state = $[3];
    setState = $[4];
  }
  useEffect(state, setState);
  let footer;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children: "Running evaluation\u2026",
      }),
    });
    $[5] = footer;
  } else footer = $[5];
  return footer;
}
//@ chunk-wb51jffc.js:101741-101745 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:101741", () => {
  init_react_production();
});
export { PluginEvalRunner };
