/**
 * services/pluginEval/evalReport.ts
 *
 * 2.1.316 新增：plugin eval 报告：with/without 对比表（CASE/RUNS/COST/SCORE/PASS%）、结果 JSON 字段与汇总行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qv1jytq6.js (19)
 * attribution: placement 19
 */
import { count } from "../../utils/collections.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { repeatString } from "../../utils/stringUtils.js";
import {
  create,
  create_3,
  create_6,
  create_2,
  create_15,
  create_26,
  create_25,
  create_20,
  create_12,
} from "../../../vendor/zod/lib/index.mjs";
import { normalizeKeyIndex } from "../../utils/objectUtils.js";

//@ chunk-qv1jytq6.js:431-539 placement
var PLUGIN_LOAD_PROBLEMS = [
  "manifest_invalid",
  "disabled_by_default",
  "identity_unverified",
  "archive_not_probed",
  "will_not_load",
];
//@ chunk-qv1jytq6.js:539-660 placement
/**
 * 计算加权得分：通过项权重之和除以总权重（跳过 with_only 项）。
 */
function computeWeightedScore(results) {
  let t = 0;
  let n = 0;
  for (let s of results) {
    if (s.with_only) continue;
    n += s.weight;
    if (s.passed) t += s.weight;
  }
  return n > 0 ? t / n : 0;
}
//@ chunk-qv1jytq6.js:660-822 placement
/**
 * 汇总多次运行的平均得分与通过率。
 */
function aggregateRunScores(e) {
  if (e.length === 0)
    return {
      score: 0,
      passRate: 0,
    };
  let score = e.reduce((acc, a) => acc + a.score, 0) / e.length;
  let passRate = count(e, (s) => s.score >= 1) / e.length;
  return {
    score,
    passRate,
  };
}
//@ chunk-qv1jytq6.js:822-2149 placement
/**
 * 生成 with/without 插件对比的用例结果表。
 */
function formatEvalReportTable(report) {
  let t = [];
  let mapped = report.cases.map((r) => ({
    ...r,
    name: replaceControlChars(r.name),
  }));
  let max = Math.max(4, ...mapped.map((r) => bunStringWidth(r.name)));
  let any = report.cases.some((r) => r.runs_without !== undefined);
  if (any)
    t.push(
      padColumn("CASE", max) +
        "  " +
        padColumn("WITH", 6) +
        padColumn("W/OUT", 6) +
        padColumn("\u0394", 7) +
        padColumn("RUNS", 5) +
        padColumn("COST", 8) +
        "NOTES",
    );
  else
    t.push(
      padColumn("CASE", max) +
        "  " +
        padColumn("SCORE", 6) +
        padColumn("PASS%", 6) +
        padColumn("RUNS", 5) +
        padColumn("COST", 8) +
        "NOTES",
    );
  for (let r of mapped) {
    let c = r.runs.length + (r.runs_without?.length ?? 0);
    let g =
      r.runs.reduce((acc, run) => acc + run.cost_usd, 0) +
      (r.runs_without?.reduce((acc, u) => acc + u.cost_usd, 0) ?? 0);
    let p = summarizeCaseFailure(r);
    if (any) {
      let { score_without: scoreWithout, delta } = r;
      t.push(
        padColumn(r.name, max) +
          "  " +
          padColumn(r.score.toFixed(2), 6) +
          padColumn(scoreWithout !== undefined ? scoreWithout.toFixed(2) : "\u2014", 6) +
          padColumn(delta !== undefined ? _(delta) : "\u2014", 7) +
          padColumn(String(c), 5) +
          padColumn(`$${g.toFixed(2)}`, 8) +
          (p ?? ""),
      );
    } else
      t.push(
        padColumn(r.name, max) +
          "  " +
          padColumn(r.score.toFixed(2), 6) +
          padColumn(`${Math.round(r.pass_rate * 100)}%`, 6) +
          padColumn(String(r.runs.length), 5) +
          padColumn(`$${g.toFixed(2)}`, 8) +
          (p ?? ""),
      );
  }
  t.push("");
  let l = report.partial
    ? ` \xB7 \u26A0 partial (${PARTIAL_REASON_LABELS[report.partial_reason ?? "interrupted"]})`
    : "";
  if (any) {
    let filtered = report.cases.filter((c) => c.delta !== undefined);
    if (filtered.length > 0) {
      let c = filtered.reduce((acc, p) => acc + (p.delta ?? 0), 0) / filtered.length;
      t.push(
        `${report.cases.length} case(s) \xB7 mean \u0394 ${_(c)} \xB7 ${report.duration_seconds}s \xB7 $${report.cost_usd.toFixed(2)}${l}`,
      );
      return t.join(`
`);
    }
  }
  t.push(
    `${report.cases.length} case(s) \xB7 ${report.duration_seconds}s \xB7 $${report.cost_usd.toFixed(2)}${l}`,
  );
  return t.join(`
`);
}
//@ chunk-qv1jytq6.js:2149-2200 placement
function _(e) {
  return `${e > 0 ? "+" : ""}${e.toFixed(2)}`;
}
//@ chunk-qv1jytq6.js:2200-2553 placement
/**
 * 给出用例失败的一行原因：运行出错取错误；否则取权重最高的未通过评分器（若所有运行都未通过且有提示则用提示）。
 */
function summarizeCaseFailure(e) {
  let t = null;
  for (let run of e.runs) {
    for (let grader of run.graders) if (!grader.passed && (!t || grader.weight > t.weight)) t = grader;
    if (run.error) return replaceControlChars(run.error);
  }
  if (t !== null) {
    let n = t.name;
    let found = e.advisories?.find((advisory) => advisory.grader === n);
    let any = e.runs.some((run) => run.graders.some((grader) => grader.name === n && grader.passed));
    if (found !== undefined && !any) return replaceControlChars(found.text);
  }
  return t ? replaceControlChars(`${t.name}: ${t.explanation}`) : null;
}
//@ chunk-qv1jytq6.js:2553-2614 placement
/**
 * 把文本补齐到指定显示宽度（超出时加一个空格）。
 */
function padColumn(e, t) {
  let n = bunStringWidth(e);
  return n > t ? `${e} ` : e + repeatString(" ", t - n);
}
//@ chunk-qv1jytq6.js:2614-2994 placement
/**
 * 组装套件报告 JSON：schema 版本、Claude 版本、起始时间与时长、总花费（含 without 组）、是否部分完成、并发、插件与各用例报告。
 */
function buildSuiteReport(e, date, n, claudeVersion, plugins, concurrency) {
  let costUsd = e.reduce(
    (acc, { report }) =>
      acc +
      report.runs.reduce((acc, run) => acc + run.cost_usd, 0) +
      (report.runs_without?.reduce((acc, i) => acc + i.cost_usd, 0) ?? 0),
    0,
  );
  return {
    schema_version: "1.0",
    claude_version: claudeVersion,
    started_at: date.toISOString(),
    duration_seconds: Math.round((Date.now() - date.getTime()) / 1000),
    cost_usd: costUsd,
    partial: n !== undefined,
    partial_reason: n,
    concurrency,
    plugins,
    cases: e.map((c) => c.report),
  };
}
//@ chunk-qv1jytq6.js:2994-3105 placement
var PARTIAL_REASON_LABELS = {
  interrupted: "interrupted",
  cost_ceiling: "cost ceiling hit",
  auth_failed: "stopped: authentication failed",
};
//@ chunk-qv1jytq6.js:3105-3113 placement
/**
 * 套件报告 schema 版本（1）。
 */
var REPORT_SCHEMA_VERSION = 1;
//@ chunk-qv1jytq6.js:3113-3907 placement
function describeMockMode() {
  return create({
    score: create_3(),
    passed: create_6(),
    turns: create_3(),
    costUsd: create_3(),
    judgeCostUsd: create_3(),
    durationSeconds: create_3().optional(),
    startedAt: create_2().optional(),
    error: create_2().nullable(),
    tracePath: create_2(),
    skippedPaidGraders: create_6(),
    aborted: create({
      server: create_2(),
      tool: create_2(),
      reason: create_2(),
    }).optional(),
    mocks: create({
      servers: create_15(
        create({
          server: create_2(),
          kind: create_26(["shadow", "standalone"]),
          withheld: create_25(true).optional(),
          replayPinned: create_3().optional(),
          tools: create_15(
            create({
              tool: create_2(),
              responder: create_26(["fixed", "agent"]),
            }),
          ),
        }),
      ),
      warnings: create_15(create_2()),
      calls: create({
        total: create_3(),
        errors: create_3(),
        unmocked: create_15(
          create({
            tool: create_2(),
            count: create_3(),
          }),
        ),
        costUsd: create_3().optional(),
        replay: create({
          hits: create_3(),
          misses: create_3(),
        }).optional(),
      }),
    }).optional(),
    graders: create_15(
      create({
        name: create_2(),
        passed: create_6(),
        weight: create_3(),
        explanation: create_2(),
        withOnly: create_6(),
        scored: create_6().optional(),
        judgeVotes: create_15(create_6()).optional(),
        evidence: create_2().optional(),
      }),
    ),
  });
}
//@ chunk-qv1jytq6.js:3907-4366 placement
/**
 * 用例报告的 zod 结构：名称、目录、提示词、模型、次数/超时/轮次、评分器、with/without 组的模拟模式、提示与汇总分数。
 */
function caseReportSchema() {
  return create({
    name: create_2(),
    dir: create_2(),
    source: create_2(),
    promptMarkdown: create_2(),
    model: create_2().optional(),
    runsPerCase: create_3(),
    timeoutSeconds: create_3(),
    maxTurns: create_3(),
    graders: create_15(
      create({
        name: create_2(),
        type: create_2(),
        weight: create_3(),
        graderMarkdown: create_2().optional(),
        config: create_20(create_2(), create_12()),
      }),
    ),
    arms: create({
      with: create_15(describeMockMode()),
      without: create_15(describeMockMode()).optional(),
    }),
    advisories: create_15(create_2()).optional(),
    aggregates: create({
      score: create_3(),
      passRate: create_3(),
      scoreWithout: create_3().optional(),
      passRateWithout: create_3().optional(),
      delta: create_3().optional(),
    }),
  });
}
//@ chunk-qv1jytq6.js:4366-4408 placement
/**
 * 运行中止原因的可选 schema。
 */
function optionalRunStopSchema() {
  return describeRunStop(create_26(PLUGIN_LOAD_PROBLEMS).optional());
}
//@ chunk-qv1jytq6.js:4408-5070 placement
function describeRunStop(problem) {
  return create({
    schemaVersion: create_25(REPORT_SCHEMA_VERSION),
    claudeVersion: create_2(),
    startedAt: create_2(),
    durationSeconds: create_3(),
    costUsd: create_3(),
    partial: create_6(),
    partialReason: create_26(["cost_ceiling", "interrupted", "auth_failed"]).optional(),
    suite: create({
      root: create_2(),
      ablation: create_26(["none", "with-without"]),
      modelOverride: create_2().optional(),
      judgeModel: create_2().optional(),
      caseFilter: create_2().optional(),
      tagFilters: create_15(create_2()).optional(),
      threshold: create_3(),
      concurrency: create_3().int().positive().optional(),
      pluginId: create_2().optional(),
      plugins: create_15(
        create({
          name: create_2(),
          version: create_2().optional(),
          path: create_2(),
          problem,
        }),
      ),
    }),
    cases: create_15(caseReportSchema()),
    aggregates: create({
      casesTotal: create_3(),
      casesPassed: create_3(),
      overallScore: create_3(),
      overallPassRate: create_3(),
      meanDelta: create_3().optional(),
    }),
  });
}
//@ chunk-qv1jytq6.js:5070-6014 placement
/**
 * 上述键的集合。
 */
var EVAL_RESULT_KEYS = [
  "ablation",
  "aborted",
  "advisories",
  "aggregates",
  "arms",
  "calls",
  "caseFilter",
  "cases",
  "casesPassed",
  "casesTotal",
  "claudeVersion",
  "concurrency",
  "config",
  "costUsd",
  "count",
  "delta",
  "dir",
  "durationSeconds",
  "error",
  "errors",
  "evidence",
  "explanation",
  "graderMarkdown",
  "graders",
  "hits",
  "judgeCostUsd",
  "judgeModel",
  "judgeVotes",
  "kind",
  "maxTurns",
  "meanDelta",
  "misses",
  "mocks",
  "model",
  "modelOverride",
  "name",
  "overallPassRate",
  "overallScore",
  "partial",
  "partialReason",
  "passRate",
  "passRateWithout",
  "passed",
  "path",
  "pluginId",
  "plugins",
  "problem",
  "promptMarkdown",
  "reason",
  "replay",
  "replayPinned",
  "responder",
  "root",
  "runsPerCase",
  "schemaVersion",
  "score",
  "scoreWithout",
  "scored",
  "server",
  "servers",
  "skippedPaidGraders",
  "source",
  "startedAt",
  "suite",
  "tagFilters",
  "threshold",
  "timeoutSeconds",
  "tool",
  "tools",
  "total",
  "tracePath",
  "turns",
  "type",
  "unmocked",
  "version",
  "warnings",
  "weight",
  "with",
  "withOnly",
  "withheld",
  "without",
];
var runStopSchema = ["config"];
var CONFIG_ONLY_KEYS = normalizeKeyIndex(EVAL_RESULT_KEYS);
var CONFIG_ONLY_KEY_SET = new Set(runStopSchema);
//@ chunk-qv1jytq6.js:6014-6542 placement
/**
 * 把一次运行结果从 snake_case 转为报告结构：分数、轮次、费用、时长、错误、trace 路径、中止与模拟信息、各评分器结果。
 */
function toRunReport(e) {
  return {
    score: e.score,
    passed: e.score >= 1,
    turns: e.turns,
    costUsd: e.cost_usd,
    judgeCostUsd: e.judge_cost_usd,
    durationSeconds: e.duration_seconds,
    startedAt: e.started_at,
    error: e.error,
    tracePath: e.trace_path,
    skippedPaidGraders: e.skipped_paid_graders ?? false,
    ...(e.aborted && {
      aborted: e.aborted,
    }),
    ...(e.mocks && {
      mocks: e.mocks,
    }),
    graders: e.graders.map((grader) => ({
      name: grader.name,
      passed: grader.passed,
      weight: grader.weight,
      explanation: grader.explanation,
      withOnly: grader.with_only ?? false,
      scored: grader.scored ?? !(grader.with_only ?? false),
      judgeVotes: grader.judge_votes,
      evidence: grader.evidence,
    })),
  };
}
//@ chunk-qv1jytq6.js:6542-7177 placement
function formatBaselineLine(case_, report) {
  return {
    name: report.name,
    dir: report.dir,
    source: report.source,
    promptMarkdown: case_.execution.prompt ?? "",
    model: case_.execution.model,
    runsPerCase: case_.runs,
    timeoutSeconds: case_.execution.timeout_seconds,
    maxTurns: case_.execution.max_turns,
    graders: case_.graders.map((grader) => {
      let { name: s, type: a, weight, ...r } = grader;
      return {
        name: s,
        type: a,
        weight,
        graderMarkdown: grader.type === "llm" || grader.type === "baseline" ? grader.criteria : undefined,
        config: r,
      };
    }),
    arms: {
      with: report.runs.map(toRunReport),
      without: report.runs_without?.map(toRunReport),
    },
    ...(report.advisories && {
      advisories: report.advisories.map((advisory) => advisory.text),
    }),
    aggregates: {
      score: report.score,
      passRate: report.pass_rate,
      scoreWithout: report.score_without,
      passRateWithout: report.pass_rate_without,
      delta: report.delta,
    },
  };
}
//@ chunk-qv1jytq6.js:7177-8088 placement
function formatEvalSummary(e) {
  let {
    aggregate,
    resolvedCases,
    root,
    ablation,
    pluginId,
    modelOverride,
    judgeModel,
    caseFilter,
    tagFilters,
    threshold,
  } = e;
  let mapped = resolvedCases.map(({ case_, report }) => formatBaselineLine(case_, report));
  let filtered = mapped.map((d) => d.aggregates.delta).filter((d) => d !== undefined);
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    claudeVersion: aggregate.claude_version,
    startedAt: aggregate.started_at,
    durationSeconds: aggregate.duration_seconds,
    costUsd: aggregate.cost_usd,
    partial: aggregate.partial,
    partialReason: aggregate.partial_reason,
    suite: {
      root,
      ablation,
      pluginId,
      modelOverride,
      judgeModel,
      caseFilter,
      tagFilters,
      threshold,
      concurrency: aggregate.concurrency,
      plugins: aggregate.plugins.map(({ name: d, version, path, problem }) => ({
        name: d,
        ...(version !== undefined && {
          version,
        }),
        path,
        ...(problem !== undefined && {
          problem,
        }),
      })),
    },
    cases: mapped,
    aggregates: {
      casesTotal: mapped.length,
      casesPassed: count(mapped, (d) => d.aggregates.score >= threshold),
      overallScore: mean(mapped.map((d) => d.aggregates.score)),
      overallPassRate: mean(mapped.map((d) => d.aggregates.passRate)),
      meanDelta: filtered.length > 0 ? mean(filtered) : undefined,
    },
  };
}
//@ chunk-qv1jytq6.js:8088-8158 placement
/**
 * 求平均值（空数组为 0）。
 */
function mean(e) {
  return e.length === 0 ? 0 : e.reduce((acc, n) => acc + n, 0) / e.length;
}
export {
  mean,
  buildSuiteReport,
  aggregateRunScores,
  computeWeightedScore,
  formatEvalReportTable,
  formatEvalSummary,
  optionalRunStopSchema,
};
