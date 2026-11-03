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
import { Ibr } from "../../utils/objectUtils.js";

//@ chunk-qv1jytq6.js:431-539 placement
var PLUGIN_LOAD_PROBLEMS = [
  "manifest_invalid",
  "disabled_by_default",
  "identity_unverified",
  "archive_not_probed",
  "will_not_load",
];
/**
 * 计算加权得分：通过项权重之和除以总权重（跳过 with_only 项）。
 */
//@ chunk-qv1jytq6.js:539-660 placement
function computeWeightedScore(e) {
  let t = 0,
    n = 0;
  for (let s of e) {
    if (s.with_only) continue;
    if (((n += s.weight), s.passed)) t += s.weight;
  }
  return n > 0 ? t / n : 0;
}
/**
 * 汇总多次运行的平均得分与通过率。
 */
//@ chunk-qv1jytq6.js:660-822 placement
function aggregateRunScores(e) {
  if (e.length === 0) return { score: 0, passRate: 0 };
  let t = e.reduce((s, a) => s + a.score, 0) / e.length,
    n = count(e, (s) => s.score >= 1) / e.length;
  return { score: t, passRate: n };
}
/**
 * 生成 with/without 插件对比的用例结果表。
 */
//@ chunk-qv1jytq6.js:822-2149 placement
function formatEvalReportTable(e) {
  let t = [],
    mapped = e.cases.map((r) => ({ ...r, name: replaceControlChars(r.name) })),
    max = Math.max(4, ...mapped.map((r) => bunStringWidth(r.name))),
    any = e.cases.some((r) => r.runs_without !== void 0);
  if (any)
    t.push(
      o("CASE", max) +
        "  " +
        o("WITH", 6) +
        o("W/OUT", 6) +
        o("\u0394", 7) +
        o("RUNS", 5) +
        o("COST", 8) +
        "NOTES",
    );
  else t.push(o("CASE", max) + "  " + o("SCORE", 6) + o("PASS%", 6) + o("RUNS", 5) + o("COST", 8) + "NOTES");
  for (let r of mapped) {
    let c = r.runs.length + (r.runs_without?.length ?? 0),
      g =
        r.runs.reduce((i, u) => i + u.cost_usd, 0) +
        (r.runs_without?.reduce((i, u) => i + u.cost_usd, 0) ?? 0),
      p = summarizeCaseFailure(r);
    if (any) {
      let { score_without: score_without, delta: delta } = r;
      t.push(
        o(r.name, max) +
          "  " +
          o(r.score.toFixed(2), 6) +
          o(score_without !== void 0 ? score_without.toFixed(2) : "\u2014", 6) +
          o(delta !== void 0 ? _(delta) : "\u2014", 7) +
          o(String(c), 5) +
          o(`$${g.toFixed(2)}`, 8) +
          (p ?? ""),
      );
    } else
      t.push(
        o(r.name, max) +
          "  " +
          o(r.score.toFixed(2), 6) +
          o(`${Math.round(r.pass_rate * 100)}%`, 6) +
          o(String(r.runs.length), 5) +
          o(`$${g.toFixed(2)}`, 8) +
          (p ?? ""),
      );
  }
  t.push("");
  let l = e.partial
    ? ` \xB7 \u26A0 partial (${PARTIAL_REASON_LABELS[e.partial_reason ?? "interrupted"]})`
    : "";
  if (any) {
    let filtered = e.cases.filter((c) => c.delta !== void 0);
    if (filtered.length > 0) {
      let c = filtered.reduce((g, p) => g + (p.delta ?? 0), 0) / filtered.length;
      return (
        t.push(
          `${e.cases.length} case(s) \xB7 mean \u0394 ${_(c)} \xB7 ${e.duration_seconds}s \xB7 $${e.cost_usd.toFixed(2)}${l}`,
        ),
        t.join(`
`)
      );
    }
  }
  return (
    t.push(`${e.cases.length} case(s) \xB7 ${e.duration_seconds}s \xB7 $${e.cost_usd.toFixed(2)}${l}`),
    t.join(`
`)
  );
}
//@ chunk-qv1jytq6.js:2149-2200 placement
function _(e) {
  return `${e > 0 ? "+" : ""}${e.toFixed(2)}`;
}
/**
 * 给出用例失败的一行原因：运行出错取错误；否则取权重最高的未通过评分器（若所有运行都未通过且有提示则用提示）。
 */
//@ chunk-qv1jytq6.js:2200-2553 placement
function summarizeCaseFailure(e) {
  let t = null;
  for (let run of e.runs) {
    for (let grader of run.graders) if (!grader.passed && (!t || grader.weight > t.weight)) t = grader;
    if (run.error) return replaceControlChars(run.error);
  }
  if (t !== null) {
    let n = t.name,
      s = e.advisories?.find((l) => l.grader === n),
      any = e.runs.some((run) => run.graders.some((grader) => grader.name === n && grader.passed));
    if (s !== void 0 && !any) return replaceControlChars(s.text);
  }
  return t ? replaceControlChars(`${t.name}: ${t.explanation}`) : null;
}
//@ chunk-qv1jytq6.js:2553-2614 placement
function o(e, t) {
  let n = bunStringWidth(e);
  return n > t ? `${e} ` : e + repeatString(" ", t - n);
}
/**
 * 组装套件报告 JSON：schema 版本、Claude 版本、起始时间与时长、总花费（含 without 组）、是否部分完成、并发、插件与各用例报告。
 */
//@ chunk-qv1jytq6.js:2614-2994 placement
function buildSuiteReport(e, t, n, s, a, l) {
  let reduced = e.reduce(
    (c, { report: report }) =>
      c +
      report.runs.reduce((p, i) => p + i.cost_usd, 0) +
      (report.runs_without?.reduce((p, i) => p + i.cost_usd, 0) ?? 0),
    0,
  );
  return {
    schema_version: "1.0",
    claude_version: s,
    started_at: t.toISOString(),
    duration_seconds: Math.round((Date.now() - t.getTime()) / 1000),
    cost_usd: reduced,
    partial: n !== void 0,
    partial_reason: n,
    concurrency: l,
    plugins: a,
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
var y = 1;
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
    aborted: create({ server: create_2(), tool: create_2(), reason: create_2() }).optional(),
    mocks: create({
      servers: create_15(
        create({
          server: create_2(),
          kind: create_26(["shadow", "standalone"]),
          withheld: create_25(!0).optional(),
          replayPinned: create_3().optional(),
          tools: create_15(create({ tool: create_2(), responder: create_26(["fixed", "agent"]) })),
        }),
      ),
      warnings: create_15(create_2()),
      calls: create({
        total: create_3(),
        errors: create_3(),
        unmocked: create_15(create({ tool: create_2(), count: create_3() })),
        costUsd: create_3().optional(),
        replay: create({ hits: create_3(), misses: create_3() }).optional(),
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
/**
 * 用例报告的 zod 结构：名称、目录、提示词、模型、次数/超时/轮次、评分器、with/without 组的模拟模式、提示与汇总分数。
 */
//@ chunk-qv1jytq6.js:3907-4366 placement
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
    arms: create({ with: create_15(describeMockMode()), without: create_15(describeMockMode()).optional() }),
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
function Jks() {
  return describeRunStop(create_26(PLUGIN_LOAD_PROBLEMS).optional());
}
//@ chunk-qv1jytq6.js:4408-5070 placement
function describeRunStop(e) {
  return create({
    schemaVersion: create_25(y),
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
        create({ name: create_2(), version: create_2().optional(), path: create_2(), problem: e }),
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
  ],
  j = ["config"],
  W = Ibr(EVAL_RESULT_KEYS),
  K = new Set(j);
/**
 * 把一次运行结果从 snake_case 转为报告结构：分数、轮次、费用、时长、错误、trace 路径、中止与模拟信息、各评分器结果。
 */
//@ chunk-qv1jytq6.js:6014-6542 placement
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
    skippedPaidGraders: e.skipped_paid_graders ?? !1,
    ...(e.aborted && { aborted: e.aborted }),
    ...(e.mocks && { mocks: e.mocks }),
    graders: e.graders.map((grader) => ({
      name: grader.name,
      passed: grader.passed,
      weight: grader.weight,
      explanation: grader.explanation,
      withOnly: grader.with_only ?? !1,
      scored: grader.scored ?? !(grader.with_only ?? !1),
      judgeVotes: grader.judge_votes,
      evidence: grader.evidence,
    })),
  };
}
//@ chunk-qv1jytq6.js:6542-7177 placement
function formatBaselineLine(e, t) {
  return {
    name: t.name,
    dir: t.dir,
    source: t.source,
    promptMarkdown: e.execution.prompt ?? "",
    model: e.execution.model,
    runsPerCase: e.runs,
    timeoutSeconds: e.execution.timeout_seconds,
    maxTurns: e.execution.max_turns,
    graders: e.graders.map((grader) => {
      let { name: s, type: a, weight: weight, ...r } = grader;
      return {
        name: s,
        type: a,
        weight: weight,
        graderMarkdown: grader.type === "llm" || grader.type === "baseline" ? grader.criteria : void 0,
        config: r,
      };
    }),
    arms: { with: t.runs.map(toRunReport), without: t.runs_without?.map(toRunReport) },
    ...(t.advisories && { advisories: t.advisories.map((advisory) => advisory.text) }),
    aggregates: {
      score: t.score,
      passRate: t.pass_rate,
      scoreWithout: t.score_without,
      passRateWithout: t.pass_rate_without,
      delta: t.delta,
    },
  };
}
//@ chunk-qv1jytq6.js:7177-8088 placement
function formatEvalSummary(e) {
  let {
      aggregate: aggregate,
      resolvedCases: resolvedCases,
      root: root,
      ablation: ablation,
      pluginId: pluginId,
      modelOverride: modelOverride,
      judgeModel: judgeModel,
      caseFilter: caseFilter,
      tagFilters: tagFilters,
      threshold: threshold,
    } = e,
    mapped = resolvedCases.map(({ case_: case_, report: report }) => formatBaselineLine(case_, report)),
    filtered = mapped.map((d) => d.aggregates.delta).filter((d) => d !== void 0);
  return {
    schemaVersion: y,
    claudeVersion: aggregate.claude_version,
    startedAt: aggregate.started_at,
    durationSeconds: aggregate.duration_seconds,
    costUsd: aggregate.cost_usd,
    partial: aggregate.partial,
    partialReason: aggregate.partial_reason,
    suite: {
      root: root,
      ablation: ablation,
      pluginId: pluginId,
      modelOverride: modelOverride,
      judgeModel: judgeModel,
      caseFilter: caseFilter,
      tagFilters: tagFilters,
      threshold: threshold,
      concurrency: aggregate.concurrency,
      plugins: aggregate.plugins.map(({ name: d, version: version, path: path, problem: problem }) => ({
        name: d,
        ...(version !== void 0 && { version: version }),
        path: path,
        ...(problem !== void 0 && { problem: problem }),
      })),
    },
    cases: mapped,
    aggregates: {
      casesTotal: mapped.length,
      casesPassed: count(mapped, (d) => d.aggregates.score >= threshold),
      overallScore: lLt(mapped.map((d) => d.aggregates.score)),
      overallPassRate: lLt(mapped.map((d) => d.aggregates.passRate)),
      meanDelta: filtered.length > 0 ? lLt(filtered) : void 0,
    },
  };
}
//@ chunk-qv1jytq6.js:8088-8158 placement
function lLt(e) {
  return e.length === 0 ? 0 : e.reduce((t, n) => t + n, 0) / e.length;
}

export {
  lLt,
  buildSuiteReport,
  aggregateRunScores,
  computeWeightedScore,
  formatEvalReportTable,
  formatEvalSummary,
  Jks,
};
