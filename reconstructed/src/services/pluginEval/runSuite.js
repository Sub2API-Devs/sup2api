/**
 * services/pluginEval/runSuite.ts
 *
 * 2.1.316 新增：plugin eval 运行用例与套件：准备运行目录、跑子会话、评分、汇总报告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (29)
 * attribution: placement 29
 */
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
} from "fs/promises";
import { spawn, spawn as spawn_2 } from "child_process";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
} from "../../utils/errors.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { discoverEvalCases, resolveCaseTargetPath, createEvalTempDir } from "./caseDiscovery.js";
import { buildRunToolRules, splitAllowedTools } from "./runToolRules.js";
import {
  plural,
  truncateWithCount,
  takeLastChars,
  firstLineOf,
  truncateToLength,
} from "../../utils/stringUtils.js";
import { UNTRUSTED_FOLDER_REASON } from "./ownershipChecks.js";
import { buildSuiteReport, aggregateRunScores, computeWeightedScore } from "./evalReport.js";
import { printableName } from "../../utils/printableName.js";
import { qIt } from "../../utils/confusables.js";
import { checkGitVersionForEval } from "./runTrace.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import {
  Ql,
  enumerateMockedServersForRun,
  describeMockMode,
  Xi,
  Do,
  createMockRelayPipe,
  writeRunMocks,
  MockPolicyBlockedError,
  MockWithholdPolicyError,
  MockEnterpriseExclusiveError,
  MockManagedEnvError,
  describeMissingToolsJsonEntry,
  Zi,
  qi,
} from "./mocks/mockRelay.js";
import { checkGradersSatisfiable, Wr, gradeCase } from "./graders.js";
import {
  listMockedToolNames,
  La,
  Vn,
  $n,
  isWithoutArmEmpty,
  MOCKS_JSON_FILE,
} from "./mocks/pluginMcpEnumeration.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { logError } from "../../utils/log.js";
import { count, uniq } from "../../utils/collections.js";
import { Io } from "./evalFence.js";
import { checkEvalAuthPreflight } from "./authPreflight.js";
import { Kt, Gr } from "./artifactStub.js";
import { readRunTraceHistory } from "./runChild.js";
import { withDeadline } from "../../utils/sleep.js";
import { iLe, Rm } from "../../cli/handlers/pluginEval/mockGuards.js";
import { Gi } from "./childEnvironment.js";
import { sealKeptSandbox, formatSealedKeptNotice } from "./keptSandbox.js";
import { Nd } from "../../utils/toolCgroup.js";
import { env, antEnv } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";

//@ chunk-qchp9vrd.js:254443-254456 placement
var lg = 60000;
/**
 * 运行期间定时刷新登录。
 */
//@ chunk-qchp9vrd.js:254456-255355 placement
class EvalLoginRefresher {
  retryBackoffMs;
  holders = 0;
  rotation = null;
  drainedWaiters = [];
  skip = null;
  constructor(e = lg) {
    this.retryBackoffMs = e;
  }
  async enter() {
    while (this.rotation !== null) await this.rotation.catch(() => {});
    this.holders++;
  }
  leave() {
    if ((this.holders--, this.holders === 0)) {
      let drainedWaiters = this.drainedWaiters;
      this.drainedWaiters = [];
      for (let n of drainedWaiters) n();
    }
  }
  async rotate(e, n, r) {
    if (this.skip !== null && this.skip.expiry === e && Date.now() < this.skip.until) return;
    this.leave();
    try {
      ((this.rotation ??= (async () => {
        if (this.holders > 0) await new Promise((s) => this.drainedWaiters.push(s));
        let a;
        try {
          a = await r();
        } catch (error) {
          (logForDebugging(`eval: login refresh failed: ${errorMessage(error)}`, { level: "error" }),
            (a = e));
        }
        if (a === null || a <= e) this.skip = { expiry: e, until: Date.now() + this.retryBackoffMs };
        else if (a < n) this.skip = { expiry: a, until: Number.POSITIVE_INFINITY };
        else this.skip = null;
      })().finally(() => {
        this.rotation = null;
      })),
        await this.rotation);
    } finally {
      this.holders++;
    }
  }
  get holding() {
    return this.holders;
  }
}
/**
 * 运行单个用例：准备目录与模拟、启动子会话、评分并产出结果（约 17 KB）。
 */
//@ chunk-qchp9vrd.js:255355-272299 placement
async function runEvalCase(e) {
  let n = (B) => (ie) => {
      try {
        B(ie);
      } catch (error) {
        logForDebugging(`eval: progress sink failed: ${errorMessage(error)}`, { level: "error" });
      }
    },
    r = { ...e, onLine: n((B) => e.onLine(replaceControlChars(B))), onNotice: n(e.onNotice) },
    a = r.concurrency ?? 1,
    date = new Date(),
    h = await discoverEvalCases(
      r.rootPath,
      { caseGlob: r.caseGlob, tags: r.tags },
      {
        evalDirSegments: r.evalDirSegments,
        frameRoot: r.frameRoot,
        adoptionDecided: r.adoptionDecided,
        trust: r.trust,
        targetScreened: r.targetScreened,
        consentDecided: r.consentDecided,
      },
    ),
    { errors: errors, root: root, suite: suite } = h,
    R = buildRunToolRules([], e.allowTools);
  if (R.denied.length > 0)
    errors.push({
      file: "--allow-tools",
      error: `refused ${plural(R.denied.length, "entry", "entries")}: malformed, a wildcard tool name the child does not support, or a tool never available in an evaluation (Monitor, EnterWorktree, ExitWorktree): ${R.denied.join(", ")}`,
    });
  r.allowTools = R.allowed;
  let S = splitAllowedTools(e.disallowTools ?? []);
  if (S.rejected.length > 0)
    errors.push({
      file: "--disallow-tools",
      error: `${describeUndisallowableTools(S.rejected)} No case was run.`,
    });
  else if (S.tools.length > 0)
    r.onNotice(`Removed from Claude's tools in every case (--disallow-tools): ${S.tools.join(", ")}`);
  r.disallowTools = S.tools;
  let T = S.rejected.length > 0 ? [] : h.cases,
    N = [];
  for (let B of T) {
    let { rejected: rejected } = splitAllowedTools(B.execution.disallowed_tools ?? []);
    if (rejected.length === 0) {
      N.push(B);
      continue;
    }
    errors.push({
      file: B.caseSource === "prose" ? B.caseDir : B.caseFile,
      error: `disallowed_tools: ${describeUndisallowableTools(rejected)}`,
    });
  }
  for (let B of errors) r.onLine(`\u2717 ${B.file}: ${B.error}`);
  let x =
    r.ablation === "auto" ? (N.some((B) => B.pluginDirs.length > 0) ? "with-without" : "none") : r.ablation;
  if (r.ablation === "auto" && x === "with-without")
    r.onNotice(
      "Ablation: defaulting to with-without \u2014 a plugin resolved from this path, so each case also runs a no-plugin baseline arm (2\xD7 runs) and reports \u0394; " +
        "graders marked with-only (including `tool_used: Skill`) become a plugin-fired indicator rather than part of the score. Pass --ablation none for the previous single-arm run and scoring.",
    );
  let j = N;
  if (r.ablation === "auto" && x === "with-without") {
    let filtered = j.filter((ie) => getRunArms(ie, x, !0).length === 1);
    if (filtered.length > 0)
      r.onNotice(
        `${filtered.length} ${plural(filtered.length, "case")} ${plural(filtered.length, "runs", "run")} single-arm (no \u0394) \u2014 no plugin to strip, or a replay case whose history carries the plugin into both arms: ${filtered.map((ie) => ie.name).join(", ")}`,
      );
  }
  if (r.ablation === "with-without") {
    let filtered = j.filter((ie) => ie.pluginDirs.length === 0);
    for (let ie of filtered) {
      let _e =
        "ablation requested but no plugin resolved for this case: auto-detection found no plugin.json, .claude-plugin/plugin.json, or SKILL.md " +
        "it may load between the case directory and the discovery root \u2014 " +
        `a manifest or skill folder that ${UNTRUSTED_FOLDER_REASON} is not loaded. The with and without arms would run identical ` +
        "configs, so \u0394 would measure nothing. Fix: target the plugin " +
        "directory itself (or run from within it), declare `plugins:` in the case pointing at a plugin or skill directory beneath the discovery root, or pass --ablation none for a single-arm eval.";
      (errors.push({ file: ie.caseSource === "prose" ? ie.caseDir : ie.caseFile, error: _e }),
        r.onLine(`\u2717 ${ie.name}: ${_e}`));
    }
    if (filtered.length > 0) j = j.filter((ie) => ie.pluginDirs.length > 0);
  }
  if (j.length === 0)
    return {
      report: buildSuiteReport(
        [],
        date,
        r.signal.aborted ? "interrupted" : void 0,
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        [],
        a,
      ),
      exitCode: r.signal.aborted ? 2 : errors.length > 0 ? 1 : 0,
      errors: errors,
      ablation: x,
      root: root,
      suite: suite,
      resolvedCases: [],
      harnessFailures: 0,
    };
  checkDuplicateCaseNames(j, r.onLine);
  let K = await resolveCaseTargetPath(
    j.flatMap((B) => B.pluginDirs),
    root,
    r.frameRoot,
  );
  if (K.length === 0)
    r.onLine("Plugin under test: none resolved \u2014 cases run against baseline Claude Code");
  let X = x === "with-without",
    W = X ? "the with-arm" : "this eval";
  for (let B of K) {
    let ie = B.version === void 0 ? "(no version)" : `version ${ns(B.version, 80)}`;
    (B.problem === void 0 ? r.onLine : r.onNotice)(
      `Plugin under test: ${ns(B.name, 160)} ${ie} at ${ns(B.path, 1000)}`,
    );
    let Ae = B.problemDetail === void 0 ? void 0 : printableName(B.problemDetail.replace(qIt(), " "), 300),
      De = Ae === void 0 ? "" : ` (${Ae})`;
    switch (B.problem) {
      case void 0:
        break;
      case "manifest_invalid":
        r.onNotice(
          r.mocks !== "off" && r.allowRealServers !== !0
            ? `  \u26A0 its manifest is invalid${De}: its cases are refused (record mode cannot enumerate the MCP servers it declares) \u2014 fix the manifest, or pass --mocks off / --allow-real-servers to run ${W} WITHOUT this plugin`
            : `  \u26A0 its manifest is invalid${De}, so ${W} will run WITHOUT this plugin`,
        );
        break;
      case "identity_unverified":
        r.onNotice(
          `  \u26A0 identity not verified${De}; the child decides at load time whether it loads${X ? ' \u2014 read a zero \u0394 here as "may not have loaded"' : ""}`,
        );
        break;
      case "disabled_by_default":
        r.onNotice(
          `  \u26A0 its manifest sets defaultEnabled: false and nothing in the eval sandbox enables it, so ${W} will run WITHOUT this plugin`,
        );
        break;
      case "archive_not_probed":
        r.onNotice(
          "  \u26A0 a plugin archive: its identity was not probed here \u2014 the child extracts and loads what is inside it",
        );
        break;
      case "will_not_load": {
        let he = Ae ?? "nothing loadable at this path";
        r.onNotice(`  \u26A0 ${he}, so ${W} will run WITHOUT this plugin`);
        break;
      }
    }
  }
  {
    let authPreflight = await r.authPreflight();
    if (r.signal.aborted)
      return {
        report: buildSuiteReport(
          [],
          date,
          "interrupted",
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
          K,
          a,
        ),
        exitCode: 130,
        errors: errors,
        root: root,
        suite: suite,
        resolvedCases: [],
        harnessFailures: 0,
        ablation: x,
      };
    if (!authPreflight.ok) {
      let ie = `authentication check failed before running any case \u2014 every run would use this same credential: ${authPreflight.message}`;
      return (
        errors.push({ file: root, error: ie }),
        r.onLine(`\u2717 ${ie}`),
        {
          report: buildSuiteReport(
            [],
            date,
            "auth_failed",
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            K,
            a,
          ),
          exitCode: 2,
          errors: errors,
          root: root,
          suite: suite,
          resolvedCases: [],
          harnessFailures: 0,
          ablation: x,
          authPreflightFailed: !0,
        }
      );
    }
    if (authPreflight.warning !== void 0) r.onNotice(`Note: ${authPreflight.warning}`);
  }
  try {
    await checkGitVersionForEval(subprocessEnv());
  } catch (error) {
    let ie = errorMessage(error);
    return (
      errors.push({ file: root, error: ie }),
      r.onLine(`\u2717 ${ie}`),
      {
        report: buildSuiteReport(
          [],
          date,
          void 0,
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
          K,
          a,
        ),
        exitCode: 1,
        errors: errors,
        root: root,
        suite: suite,
        resolvedCases: [],
        harnessFailures: 0,
        ablation: x,
        gitPreflightFailed: !0,
      }
    );
  }
  if (r.maxCostUsd === void 0 && j.some((B) => allowsArtifactPublish(B, r)))
    r.onNotice("Note: artifact publishing enabled with no --max-cost-usd; consider setting a cost ceiling");
  let G = new Map(),
    J = new Map(),
    Z = new Map();
  if (r.mocks !== "off") {
    let B = Ql();
    for (let ie of j)
      try {
        let _e = await enumerateMockedServersForRun(ie, root, r.evalDirSegments, B, {
          allowRealServers: r.allowRealServers === !0,
        });
        J.set(ie, _e.servers);
        for (let note of _e.notes) r.onNotice(replaceControlChars(`  ${ie.name}: ${note}`));
        Z.set(ie, _e.notes);
      } catch (error) {
        (J.set(
          ie,
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            ? error
            : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `mocks: could not be prepared for this case (${getErrnoCode(error) ?? "see --verbose"})`,
                "mocks: preparation failed",
              ),
        ),
          logForDebugging(`eval mocks: ${errorMessage(error)}`, { level: "error" }));
      }
  }
  let se = (B) => {
    let ie = J.get(B);
    return ie === void 0 || ie instanceof Error ? [] : ie;
  };
  for (let B of j) {
    if (B.context.scaffold_script && r.noScaffold)
      r.onNotice(
        `\u26A0 case "${B.name}": its scaffold_script is not run without --scaffold (author-supplied bash that runs as you - pass it only for suites you trust); the case runs against an unstaged workspace`,
      );
    let ie = checkGradersSatisfiable(B, r.allowTools, {
      scaffolded: !!B.context.scaffold_script && !r.noScaffold,
      artifactPublishGranted: allowsArtifactPublish(B, r),
      disallowedTools: is(B, r),
      mockedTools: listMockedToolNames(se(B)),
      withheldServers: La(se(B)),
    });
    if (ie.length > 0) {
      G.set(B, ie);
      for (let _e of ie) r.onNotice(`\u26A0 case "${B.name}": ${_e.text}`);
    }
  }
  if (x === "with-without") {
    let reduced = j.reduce(
      (ie, _e) => ie + (r.runs ?? _e.runs) * getRunArms(_e, x, r.ablation === "auto").length,
      0,
    );
    r.onLine(
      `Ablation: 2 arms \xD7 ${j.length} ${plural(j.length, "case")} (${reduced} ${plural(reduced, "run")})`,
    );
  }
  let Q = {
    spent: 0,
    partialReason: void 0,
    authBackstopArmed: !0,
    agentService: null,
    agentServiceStarting: null,
    costCeilingAnnounced: !1,
    harnessFailures: 0,
    tokenGate: new EvalLoginRefresher(),
  };
  await using Se = {
    async [Symbol.asyncDispose]() {
      let B =
        Q.agentService ??
        (Q.agentServiceStarting !== null ? await Q.agentServiceStarting.catch(() => null) : null);
      if (((Q.agentService = null), (Q.agentServiceStarting = null), B !== null)) await B.close();
    },
  };
  if (a > 1)
    r.onLine(
      `Concurrency: up to ${a} runs in flight (all children share your rate limit; progress lines interleave, results keep case order)`,
    );
  let we = new Map(),
    Be = [],
    Je = (B, ie) => {
      we.set(B, {
        case_: B,
        report: {
          name: B.name,
          dir: hc(root, B),
          source: B.caseSource,
          score: 0,
          pass_rate: 0,
          runs: [
            { score: 0, turns: 0, cost_usd: 0, judge_cost_usd: 0, graders: [], trace_path: "", error: ie },
          ],
        },
      });
    },
    Ee = (B) => {
      let ie = r.runs ?? B.runs,
        _e = allowsArtifactPublish(B, r),
        Ae = J.get(B),
        De = se(B);
      if (Ae instanceof Error) {
        logFeatureBad("cli_plugin_eval_mocks", "load_failed");
        let Ge = replaceControlChars(Ae.message);
        return (r.onLine(`  ${B.name}: ${Ge}`), Je(B, Ge), null);
      }
      if (De.length > 0) {
        if ((r.onLine(replaceControlChars(`  ${B.name}: mocked: ${describeMockMode(De)}`)), Vn(De)))
          r.onLine(
            replaceControlChars(
              `  ${B.name}: mock budget = ${Xi}\xD7max_turns = ${Do(B.execution.max_turns)} agent-answered calls per run, shared by all mocked servers (model: ${Wr(r.judgeModel) ?? "default small model"}, shared with --judge-model)`,
            ),
          );
      }
      let he = is(B, r),
        xe = buildRunToolRules(B.execution.allowed_tools, r.allowTools, {
          artifactPublishGranted: _e,
          mockedTools: listMockedToolNames(De),
          disallowedTools: he,
        }),
        tools = splitAllowedTools(B.execution.disallowed_tools ?? []).tools;
      if (tools.length > 0)
        r.onNotice(
          replaceControlChars(
            `  ${B.name}: removed from Claude's tools by the case's disallowed_tools: ${tools.join(", ")}`,
          ),
        );
      if (xe.denied.length > 0)
        r.onLine(
          replaceControlChars(
            `  ${B.name}: not granted (missing --allow-tools grant, or a malformed entry): ${xe.denied.join(", ")}`,
          ),
        );
      let Ne = (Ge) =>
        splitRuleList([Ge.join(",")]).some(
          (Lt) => permissionRuleValueFromString(Lt).toolName === ARTIFACT_TOOL_NAME,
        );
      if ((Ne(xe.denied) || Ne(r.allowTools)) && !_e)
        r.onLine(
          `  ${B.name}: the ${ARTIFACT_TOOL_NAME} tool is not available inside eval runs; --allow-tools cannot enable it`,
        );
      if (B.execution.artifact_publish === !0 && !_e)
        r.onLine(
          `  ${B.name}: requests artifact publishing; not granted (operator opt-in required) \u2014 running without it`,
        );
      let nt = resolveFlagOverrides(B, r),
        mt = { granted: _e, seededFlags: nt.seeded };
      if (Object.keys(nt.declared).length > 0)
        if (!_e)
          r.onLine(
            `  ${B.name}: growthbook_overrides not applied \u2014 they seed only a run granted artifact publishing`,
          );
        else {
          if (Object.keys(nt.seeded).length > 0)
            r.onLine(`  ${B.name}: seeding growthbook_overrides ${jsonStringify(nt.seeded)}`);
          if (nt.dropped.length > 0)
            r.onLine(
              `  ${B.name}: growthbook_overrides dropped (operator allowlist required \u2014 CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES): ${jsonStringify(nt.dropped)}`,
            );
        }
      let mapped = getRunArms(B, x, r.ablation === "auto").map((Ge) => ({
          arm: Ge,
          armCase: Ge === "without" ? { ...B, pluginDirs: [] } : B,
          allowed:
            Ge === "without" && De.length > 0
              ? buildRunToolRules(B.execution.allowed_tools, r.allowTools, {
                  artifactPublishGranted: _e,
                  mockedTools: listMockedToolNames($n(De, Ge)),
                  disallowedTools: he,
                }).allowed
              : xe.allowed,
        })),
        lt = {
          case_: B,
          runs: ie,
          grant: mt,
          mockServers: De,
          mockNotes: Z.get(B) ?? [],
          arms: mapped,
          results: new Map(mapped.map((Ge) => [Ge.arm, Array(ie)])),
          landed: 0,
          finalized: !1,
        };
      return (Be.push(lt), lt);
    },
    Qe = (B) => {
      if (B.finalized) return;
      B.finalized = !0;
      let case_ = B.case_,
        _e = (lt) => B.results.get(lt)?.filter((Ge) => Ge !== void 0),
        Ae = _e("with") ?? [],
        De = _e("without");
      if (Ae.length === 0 && Q.partialReason) return;
      let { score: score, passRate: passRate } = aggregateRunScores(Ae),
        Me = De && De.length > 0 ? aggregateRunScores(De) : void 0,
        Ne = (lt) => !!lt?.some((Ge) => Ge.skipped_paid_graders),
        ot = Ae.some((lt) => lt.ended_on_api_error) || !!De?.some((lt) => lt.ended_on_api_error),
        nt = !Ne(Ae) && !Ne(De) && !ot;
      we.set(case_, {
        case_: case_,
        report: {
          name: case_.name,
          dir: hc(root, case_),
          source: case_.caseSource,
          score: score,
          pass_rate: passRate,
          runs: Ae,
          ...(G.has(case_) && { advisories: G.get(case_) }),
          ...(Me &&
            De && {
              pass_rate_without: Me.passRate,
              runs_without: De,
              ...(nt && { score_without: Me.score, delta: score - Me.score }),
            }),
        },
      });
      let mt = Ae.length + (De?.length ?? 0),
        Ye = Ae.reduce((lt, Ge) => lt + Ge.cost_usd, 0) + (De?.reduce((lt, Ge) => lt + Ge.cost_usd, 0) ?? 0);
      if (Me && nt) {
        let lt = score - Me.score,
          Ge = lt > 0 ? "+" : "";
        r.onLine(
          `${score >= r.threshold ? "\u2713" : "\u2717"} ${case_.name}  with ${score.toFixed(2)}  without ${Me.score.toFixed(2)}  \u0394 ${Ge}${lt.toFixed(2)}  (${mt} ${plural(mt, "run")})  $${Ye.toFixed(2)}`,
        );
      } else if (Me)
        r.onLine(
          `${score >= r.threshold ? "\u2713" : "\u2717"} ${case_.name}  with ${score.toFixed(2)}  \u0394 \u2014 (${ot ? "a run ended on an API error and was not graded" : "cost ceiling: arms graded under different rules"})  (${mt} ${plural(mt, "run")})  $${Ye.toFixed(2)}`,
        );
      else
        r.onLine(
          `${score >= r.threshold ? "\u2713" : "\u2717"} ${case_.name}  score ${score.toFixed(2)}  (${Ae.length} ${plural(Ae.length, "run")})  $${Ye.toFixed(2)}`,
        );
    };
  function* ye() {
    let B = () => {
      if (Q.partialReason === void 0 && r.signal.aborted) Q.partialReason = "interrupted";
      return Q.partialReason !== void 0;
    };
    for (let ie of j) {
      if (B()) return;
      let _e;
      try {
        _e = Ee(ie);
      } catch (error) {
        logForDebugging(`eval case plan: ${errorMessage(error)}`, { level: "error" });
        let De =
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            ? error.message
            : (getErrnoCode(error) ?? "unknown error");
        (Je(ie, `case could not be planned (${De}) \u2014 see the debug log`), Q.harnessFailures++);
        continue;
      }
      if (_e === null) continue;
      for (let arm of _e.arms)
        for (let De = 0; De < _e.runs; De++) {
          if (B()) return;
          yield { plan: _e, arm: arm, index: De };
        }
    }
  }
  await pMap(
    ye(),
    async ({ plan: plan, arm: arm, index: index }) => {
      let Ae = plan.arms.length * plan.runs;
      if (r.signal.aborted) Q.partialReason ??= "interrupted";
      else if (r.maxCostUsd !== void 0 && Q.spent >= r.maxCostUsd && Q.partialReason === void 0)
        Q.partialReason = "cost_ceiling";
      if (Q.partialReason === "cost_ceiling" && !Q.costCeilingAnnounced)
        ((Q.costCeilingAnnounced = !0),
          r.onLine(`\u26A0 cost ceiling $${r.maxCostUsd} hit; skipping remaining cases`));
      if (Q.partialReason) return;
      let De = await formatCaseResultLine(
        arm.armCase,
        index,
        plan.runs,
        arm.allowed,
        plan.grant,
        r,
        Q,
        plan.arms.length > 1 ? arm.arm : void 0,
        plan.mockServers,
        plan.mockNotes,
      ).catch((he) => {
        logForDebugging(`eval run setup: ${errorMessage(he)}`, { level: "error" });
        let Me = `run could not start (${he instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? he.message : (getErrnoCode(he) ?? "unknown error")}) \u2014 see the debug log`;
        return (
          Q.harnessFailures++,
          r.onLine(
            `  ${plan.case_.name} run ${index + 1}/${plan.runs}${plan.arms.length > 1 ? ` [${arm.arm}]` : ""}: score 0.00  $0.00  error: ${Uo(`run could not start: ${errorMessage(he)}`)}`,
          ),
          { score: 0, turns: 0, cost_usd: 0, judge_cost_usd: 0, graders: [], trace_path: "", error: Me }
        );
      });
      if (((plan.results.get(arm.arm)[index] = De), plan.landed++, plan.landed === Ae)) Qe(plan);
    },
    { concurrency: a, stopOnError: !1 },
  ).catch((B) => {
    let ie = B instanceof AggregateError ? B.errors : [B];
    for (let _e of ie) logError(_e);
    Q.harnessFailures += ie.length;
  });
  for (let B of Be) Qe(B);
  if (r.maxCostUsd !== void 0 && Q.spent > r.maxCostUsd && !Q.costCeilingAnnounced)
    ((Q.costCeilingAnnounced = !0),
      r.onNotice(
        `\u26A0 cost ceiling $${r.maxCostUsd} exceeded: $${Q.spent.toFixed(2)} spent by runs already in flight when it was crossed; nothing was skipped`,
      ));
  let flattened = j.flatMap((B) => {
    let ie = we.get(B);
    return ie === void 0 ? [] : [ie];
  });
  if (Q.partialReason === void 0 && r.signal.aborted) Q.partialReason = "interrupted";
  let pt = buildSuiteReport(
      flattened,
      date,
      Q.partialReason,
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      K,
      a,
    ),
    all = pt.cases.every((B) => B.score >= r.threshold);
  if (Q.harnessFailures > 0)
    r.onNotice(
      `\u26A0 ${Q.harnessFailures} ${plural(Q.harnessFailures, "run")} could not be started by the harness (see the errors above and the debug log); the suite exits non-zero regardless of scores`,
    );
  let ce = count(
    pt.cases.flatMap((B) => B.runs.concat(B.runs_without ?? [])),
    (B) => B.ended_on_api_error === !0,
  );
  if (ce > 0)
    r.onNotice(
      `\u26A0 ${ce} ${plural(ce, "run")} ended on an API error and scored 0 without grading (each run's error is on its progress line above, or in its \`error\` field under --json); fix the cause and re-run \u2014 the suite exits non-zero regardless of scores`,
    );
  let At = Q.partialReason ? 2 : all && errors.length === 0 && Q.harnessFailures === 0 && ce === 0 ? 0 : 1;
  return {
    report: pt,
    exitCode: At,
    errors: errors,
    root: root,
    suite: suite,
    resolvedCases: flattened,
    ablation: x,
    harnessFailures: Q.harnessFailures,
  };
}
//@ chunk-qchp9vrd.js:272299-272308 placement
var fg = 2;
//@ chunk-qchp9vrd.js:272308-273279 placement
async function formatCaseResultLine(e, n, r, a, s, h, w, b, y = [], R = []) {
  let now = Date.now(),
    T = await runEvalSuite(e, a, s, h, y, R, w, b);
  ((T.started_at = new Date(now).toISOString()),
    (T.duration_seconds = Math.round((Date.now() - now) / 1000)),
    (w.spent += T.cost_usd));
  let N = b ? ` [${b}]` : "",
    x = T.error
      ? `  error: ${Uo(T.error)}`
      : T.aborted
        ? `  aborted by mock ${T.aborted.server}/${T.aborted.tool}: ${Uo(replaceControlChars(T.aborted.reason))}`
        : "";
  h.onLine(`  ${e.name} run ${n + 1}/${r}${N}: score ${T.score.toFixed(2)}  $${T.cost_usd.toFixed(2)}${x}`);
  for (let grader of T.graders) {
    let X = grader.with_only ? " [with-only, not scored]" : ` (weight ${grader.weight})`;
    h.onLine(
      `    ${grader.passed ? "\u2713" : "\u2717"} ${replaceControlChars(grader.name)}${X}: ${Uo(grader.explanation)}`,
    );
  }
  let authBackstopArmed = w.authBackstopArmed;
  if (T.auth_rejected !== void 0) w.authBackstopArmed = !1;
  if (authBackstopArmed && T.auth_rejected === !0 && w.partialReason === void 0)
    ((w.partialReason = "auth_failed"),
      h.onLine(
        "\u26A0 a run could not authenticate \u2014 every remaining run would fail the same way, so the suite stops here. Fix the credential above and re-run.",
      ));
  return T;
}
//@ chunk-qchp9vrd.js:273279-273340 placement
function Uo(e) {
  return truncateWithCount(replaceControlChars(e.replace(/\s*\n\s*/g, " ")), 200);
}
//@ chunk-qchp9vrd.js:273340-273604 placement
function checkDuplicateCaseNames(e, n) {
  let r = new Map();
  for (let a of e) {
    let s = r.get(a.name) ?? [];
    (s.push(a.caseDir), r.set(a.name, s));
  }
  for (let [a, s] of r)
    if (s.length > 1)
      n(
        replaceControlChars(
          `\u26A0 ${s.length} cases share the name "${a}" (${s.join(", ")}); the report and --case filter cannot distinguish them`,
        ),
      );
}
//@ chunk-qchp9vrd.js:273604-273672 placement
function hc(e, n) {
  let relativePath = path_13.relative(e, n.caseDir);
  return relativePath === "" ? "." : relativePath;
}
/**
 * 运行全部用例（with/without 插件对比）、脚手架与结果汇总（约 7 KB）。
 */
//@ chunk-qchp9vrd.js:273672-280997 placement
async function runEvalSuite(e, n, r, a, s, h, w, b) {
  let y = !1,
    R = (K) => {
      if (y) return;
      ((y = !0), logArtifactPublishOutcome(r, b, K));
    },
    S = await createEvalTempDir(),
    T = !1,
    N = !1,
    x = null,
    j = 0;
  try {
    if (e.context.scaffold_script && !a.noScaffold) {
      let ye = await Io(e, e.context.scaffold_script);
      a.onLine(replaceControlChars(`  scaffold: ${ye}`));
      let je = await runScaffoldCommand(ye, S, a.signal);
      if (je.code !== 0)
        return (
          (T = !0),
          R({ published: !1, errored: !0 }),
          {
            score: 0,
            turns: 0,
            cost_usd: 0,
            judge_cost_usd: 0,
            graders: [],
            trace_path: "",
            error: replaceControlChars(`scaffold failed (exit ${je.code}): ${takeLastChars(je.stderr, 500)}`),
          }
        );
    }
    (await w.tokenGate.enter(), (N = !0));
    let K = await checkEvalAuthPreflight(a.credentials, e.execution.timeout_seconds, (ye, je, pt) =>
      w.tokenGate.rotate(ye, je, pt),
    );
    if (K?.warning) a.onLine(`  \u26A0 ${K.warning}`);
    try {
      if (Vn($n(s, b)))
        for (let ye = 1; w.agentService === null; ye++) {
          w.agentServiceStarting ??= createMockRelayPipe({ credentials: a.credentials }).catch((je) => {
            throw ((w.agentServiceStarting = null), je);
          });
          try {
            w.agentService = await w.agentServiceStarting;
          } catch (error) {
            if (ye >= fg) throw error;
          }
        }
      x = await writeRunMocks(s, b, S, {
        maxTurns: e.execution.max_turns,
        model: Wr(a.judgeModel) ?? null,
        service: w.agentService,
      });
    } catch (error) {
      if (
        error instanceof MockPolicyBlockedError ||
        error instanceof MockWithholdPolicyError ||
        error instanceof MockEnterpriseExclusiveError ||
        error instanceof MockManagedEnvError
      )
        throw error;
      throw (
        logForDebugging(`eval mocks: ${errorMessage(error)}`, { level: "error" }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks: could not set up this run's stand-ins (${getErrnoCode(error) ?? "unknown error"}) \u2014 see the debug log`,
          "mocks: run setup failed",
        )
      );
    }
    let X = await listRunDirFiles(S.cwd);
    if (await prepareRunDirectory(S.cwd, X, "scaffold"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the case's scaffold created ${Kt}/ in the run's working directory \u2014 that name is reserved for the run's artifact publishes; have the scaffold use another name`,
        "eval scaffold created the reserved publish directory",
      );
    let W = await readRunTraceHistory({
      case_: e,
      sandbox: S,
      allowedTools: n,
      disallowedTools: is(e, a),
      operatorAllowedTools: a.allowTools,
      modelOverride: a.model,
      artifactPublishGranted: r.granted,
      growthbookOverrides: r.seededFlags,
      verbose: a.verbose,
      mocks: x ?? void 0,
      signal: a.signal,
      credential: K,
    });
    ((N = !1),
      w.tokenGate.leave(),
      (j = W.costUsd),
      R({ published: W.artifactPublishes.length > 0, errored: W.error !== null || W.timedOut }));
    let G = x?.agentRun ?? null,
      J = null,
      Z = !1,
      se = null;
    if (G !== null && x) {
      let inFlight = G.state.inFlight;
      if ((G.dispose(), await withDeadline(G.settled(), kg), W.aborted === null && G.state.aborted !== null))
        W.aborted = G.state.aborted;
      ((W.costUsd += G.state.costUsd), (j = W.costUsd));
      let je = verifyTraceIntegrity(G.state.answers, W, x);
      if (je.deniedByChild > 0)
        se = `${je.deniedByChild} agent-mock ${plural(je.deniedByChild, "call")} ${plural(je.deniedByChild, "was", "were")} refused by the child itself (a permission rule or the plugin's own PreToolUse hook) \u2014 never relayed, so abort_when was not judged for ${plural(je.deniedByChild, "it", "them")} and the model read the refusal text, not a mock answer`;
      if (je.inputsRewritten > 0)
        J = `${je.inputsRewritten} agent-mock ${plural(je.inputsRewritten, "call")} reached the mock with arguments different from the model's tool_use (rewritten before dispatch, e.g. by a plugin PreToolUse hook) \u2014 abort_when and the responder judged the rewritten arguments; the transcript shows the model's`;
      if (W.aborted === null && W.mockSetupFailure === null) {
        if (je.mismatch !== null)
          ((W.mockSetupFailure = "integrity"),
            (W.error = W.error === null ? je.mismatch : `${W.error} \xB7 ${je.mismatch}`));
        else if (je.absorbedInFlightAnswer || inFlight > 0)
          ((W.mockSetupFailure = "integrity"),
            (Z = !0),
            (W.error = `${W.error ?? "ended"} \xB7 mocks: an agent mock call was in flight when the child was killed (its answer or abort_when verdict never reached the run) \u2014 the run is not graded`));
      }
      if (W.aborted === null && W.mockSetupFailure === null && W.error === null)
        W.mockRecordings = [...G.state.recordings];
    }
    if (((j = W.costUsd), x))
      if (Z) logFeatureSad("cli_plugin_eval_mocks", "agent_call_in_flight");
      else logMockRegistration(W);
    let Q = x
      ? {
          servers: x.servers.map((server) => ({
            server: server.dirName,
            kind: server.kind,
            ...(server.withheld && { withheld: !0 }),
            ...(server.replayPinned > 0 && { replayPinned: server.replayPinned }),
            tools: server.tools.map((tool) => ({
              tool: tool,
              responder: server.responderKinds[tool] ?? "fixed",
            })),
          })),
          warnings: [
            ...h,
            ...describeMissingToolsJsonEntry($n(s, b)),
            ...(J === null ? [] : [J]),
            ...(se === null ? [] : [se]),
          ].map(replaceControlChars),
          calls: {
            ...(W.mockTally ?? { total: 0, errors: 0, unmocked: [] }),
            costUsd: G?.state.costUsd ?? 0,
            replay: G?.state.replay ?? { hits: 0, misses: 0 },
          },
        }
      : void 0;
    if (W.aborted !== null || W.mockSetupFailure !== null) {
      if (W.mockSetupFailure !== null) T = !0;
      if (W.aborted?.reason.startsWith(iLe)) T = !0;
      return {
        score: 0,
        turns: W.numTurns,
        cost_usd: W.costUsd,
        judge_cost_usd: 0,
        graders: [],
        trace_path: W.tracePath,
        error: W.mockSetupFailure !== null && W.error !== null ? replaceControlChars(W.error) : null,
        ...(W.aborted !== null && {
          aborted: {
            server: replaceControlChars(W.aborted.server),
            tool: replaceControlChars(W.aborted.tool),
            reason: replaceControlChars(W.aborted.reason),
          },
        }),
        ...(Q && { mocks: Q }),
        ...(W.authRejected !== null && { auth_rejected: W.authRejected }),
        ...(W.endedOnApiError && { ended_on_api_error: !0 }),
      };
    }
    if (W.endedOnApiError)
      return (
        (T = !0),
        {
          score: 0,
          turns: W.numTurns,
          cost_usd: W.costUsd,
          judge_cost_usd: 0,
          graders: [],
          trace_path: W.tracePath,
          error: W.error === null ? null : replaceControlChars(W.error),
          ended_on_api_error: !0,
          ...(Q && { mocks: Q }),
          ...(W.authRejected !== null && { auth_rejected: W.authRejected }),
        }
      );
    let Se = await listRunDirFiles(S.cwd);
    if (await prepareRunDirectory(S.cwd, Se, "run"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the run created ${Kt}/ in its working directory \u2014 that name is reserved for the run's artifact publishes, so its file evidence cannot be trusted`,
        "eval run planted the reserved publish directory",
      );
    if (r.granted) {
      let ye = Gr(S);
      if (
        (await lstat_9(ye).catch((pt) => {
          if (isENOENT(pt)) return null;
          throw (
            logForDebugging(`eval: cannot examine ${ye}: ${errorMessage(pt)}`, { level: "warn" }),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `the run's artifact-publish staging directory could not be examined (${getErrnoCode(pt) ?? "unknown error"}), so its file evidence cannot be trusted`,
              "eval stub publish staging dir unreadable",
            )
          );
        })) !== null
      )
        for (let pt of await listRunDirFiles(ye)) Se.add(`${Kt}/${pt}`);
    }
    let we = _g(X, Se),
      Be = a.maxCostUsd !== void 0 && W.costUsd >= a.maxCostUsd - w.spent,
      {
        results: results,
        judgeCostUsd: judgeCostUsd,
        paidGradersSkipped: paidGradersSkipped,
      } = await gradeCase({
        case_: e,
        run: W,
        cwdDiff: we,
        sandboxCwd: S.cwd,
        stubPublishDir: r.granted ? Gr(S) : void 0,
        judgeModel: a.judgeModel,
        skipPaidGraders: Be,
        arm: b,
        mockCallsWithOnly: isWithoutArmEmpty(s, b),
        signal: a.signal,
        credentials: a.credentials,
      });
    if (W.error !== null) T = !0;
    return {
      score: computeWeightedScore(results),
      turns: W.numTurns,
      cost_usd: W.costUsd + judgeCostUsd,
      judge_cost_usd: judgeCostUsd,
      graders: results,
      trace_path: W.tracePath,
      error: W.error === null ? null : replaceControlChars(W.error),
      ...(Q && { mocks: Q }),
      ...(W.mockRecordings.length > 0 && { mockRecordings: W.mockRecordings }),
      ...(paidGradersSkipped && { skipped_paid_graders: !0 }),
      ...(W.authRejected !== null && { auth_rejected: W.authRejected }),
    };
  } catch (error) {
    return (
      (T = !0),
      R({ published: !1, errored: !0 }),
      {
        score: 0,
        turns: 0,
        cost_usd: j > 0 ? j : (x?.agentRun?.state.costUsd ?? 0),
        judge_cost_usd: 0,
        graders: [],
        trace_path: "",
        error: replaceControlChars(errorMessage(error)),
      }
    );
  } finally {
    if (N) w.tokenGate.leave();
    (x?.agentRun?.dispose(),
      await rm_3(path_13.join(S.outDir, MOCKS_JSON_FILE), { force: !0 }).catch(() => {}),
      await rm_3(path_13.join(S.configDir, Gi), { force: !0 }).catch(() => {}));
    let K = T && a.keepFailedRuns && !a.signal.aborted;
    if (a.keepTemp || K) {
      let X = await sealKeptSandbox(S).then(
        (W) => ({ sealed: W, error: null }),
        (W) => ({ sealed: null, error: errorMessage(W) }),
      );
      (a.onLine(`  kept temp${K && !a.keepTemp ? " (run failed)" : ""}: ${S.root}`),
        a.onNotice(
          X.sealed !== null
            ? `\u26A0 kept ${S.root}: ${formatSealedKeptNotice(S, X.sealed)}`
            : `\u26A0 kept ${S.root}: could NOT seal what the plugin under test wrote (${X.error}) \u2014 everything in it except out/ and config/ may be agent-written, wherever it now sits (modes were closed as far as possible); read out/ if you need it, do not run git or anything that loads configuration from a working directory anywhere inside, and remove it (\`${formatRemoveRunDirCommand(S.root)}\`)`,
        ));
    } else
      await S.cleanup().catch((X) => {
        a.onNotice(
          `\u26A0 could not remove ${S.root} (${errorMessage(X)}); it holds what the plugin under test wrote \u2014 do not run git or anything that loads configuration from a working directory inside it, and remove it (\`${formatRemoveRunDirCommand(S.root)}\`)`,
        );
      });
  }
}
//@ chunk-qchp9vrd.js:280997-281733 placement
async function runScaffoldCommand(e, n, r) {
  return await new Promise((a) => {
    let s = "",
      h = spawn("bash", [e], {
        cwd: n.cwd,
        windowsHide: !0,
        ...Nd("plugin"),
        stdio: ["ignore", "ignore", "pipe"],
        env: {
          PATH: env.PATH,
          HOME: n.home,
          USERPROFILE: n.home,
          TMPDIR: n.tmpDir,
          TMP: n.tmpDir,
          TEMP: n.tmpDir,
          TERM: "dumb",
          GIT_CONFIG_NOSYSTEM: "1",
          USER_TYPE: "external",
          NODE_ENV: "production",
        },
      }),
      w = setTimeout((y) => y.kill("SIGKILL"), 120000, h),
      b = () => h.kill("SIGKILL");
    if (r.aborted) b();
    else r.addEventListener("abort", b, { once: !0 });
    (h.stderr?.setEncoding("utf8"),
      h.stderr?.on("data", (y) => {
        if (s.length < 16384) s += y;
      }),
      h.on("error", (y) => {
        (clearTimeout(w), r.removeEventListener("abort", b), a({ code: 127, stderr: String(y) }));
      }),
      h.on("close", (y) => {
        (clearTimeout(w), r.removeEventListener("abort", b), a({ code: y, stderr: s }));
      }));
  });
}
//@ chunk-qchp9vrd.js:281733-281920 placement
async function listRunDirFiles(e) {
  let n = new Set(),
    r = await lstat_9(e).catch(() => null);
  if (r === null || !r.isDirectory() || r.isSymbolicLink() || (await realpath_6(e).catch(() => null)) !== e)
    throw checkRunDirUnchanged();
  return (await walkRunDir(e, "", n, 0), n);
}
//@ chunk-qchp9vrd.js:281920-282225 placement
function checkRunDirUnchanged() {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "the run directory (or a directory inside it) is no longer the one the harness listed, or cannot be listed \u2014 moved, removed, replaced by a link, made unreadable, or too deep or too large to walk \u2014 so its file evidence cannot be trusted",
    "eval run directory replaced",
  );
}
//@ chunk-qchp9vrd.js:282225-282812 placement
async function prepareRunDirectory(e, n, r) {
  let lower = Kt.toLowerCase(),
    s = await lstat_9(path_13.join(e, Kt)).then(
      (h) => (r === "run" && h.isFile() && h.size === 0 ? "placeholder" : "present"),
      (h) => {
        if (isENOENT(h)) return "absent";
        throw (
          logForDebugging(`eval: cannot examine the reserved publish name in ${e}: ${errorMessage(h)}`, {
            level: "warn",
          }),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `the reserved ${Kt} name in the run's working directory could not be examined (${getErrnoCode(h) ?? "unknown error"}), so its file evidence cannot be trusted`,
            "eval reserved publish name unreadable",
          )
        );
      },
    );
  if (s === "placeholder") n.delete(Kt);
  for (let h of n) if (firstLineOf(h.toLowerCase().replaceAll("\\", "/"), "/") === lower) return !0;
  return s === "present";
}
//@ chunk-qchp9vrd.js:282812-282970 placement
function formatRemoveRunDirCommand(e) {
  return getPlatform() === "windows"
    ? `Remove-Item -Recurse -Force -LiteralPath '${e.replaceAll("'", "''")}'`
    : `chmod -R u+rwX ${shellQuoteArgs([e])} && rm -rf ${shellQuoteArgs([e])}`;
}
//@ chunk-qchp9vrd.js:282970-282990 placement
var wg = 32,
  yg = 200000;
/**
 * 递归列出运行目录中的文件（深度与条目数有上限），每级检查目录不是链接、realpath 未变且 inode 前后一致，否则抛出。
 */
//@ chunk-qchp9vrd.js:282990-283509 placement
async function walkRunDir(e, n, r, a, s = { count: 0 }) {
  if (a > wg) throw checkRunDirUnchanged();
  let joined = path_13.join(e, n),
    w = await lstat_9(joined, { bigint: !0 }).catch(() => null);
  if (
    w === null ||
    !w.isDirectory() ||
    w.isSymbolicLink() ||
    (await realpath_6(joined).catch(() => null)) !== joined
  )
    throw checkRunDirUnchanged();
  let b;
  try {
    b = await readdir_8(joined, { withFileTypes: !0 });
  } catch {
    throw checkRunDirUnchanged();
  }
  let y = await lstat_9(joined, { bigint: !0 }).catch(() => null);
  if (y === null || y.ino !== w.ino || y.dev !== w.dev) throw checkRunDirUnchanged();
  if (((s.count += b.length), s.count > yg)) throw checkRunDirUnchanged();
  for (let R of b) {
    let S = n ? `${n}/${R.name}` : R.name;
    if (R.isDirectory()) await walkRunDir(e, S, r, a + 1, s);
    else r.add(S);
  }
}
//@ chunk-qchp9vrd.js:283509-283599 placement
function _g(e, n) {
  let r = [];
  for (let a of n) if (!e.has(a)) r.push(a);
  return r.sort().join(`
`);
}
//@ chunk-qchp9vrd.js:283599-283689 placement
function ns(e, n) {
  let r = replaceControlChars(e.replace(qIt(), " "));
  return jsonStringify(r.length > n ? `${truncateToLength(r, n)}\u2026` : r);
}
//@ chunk-qchp9vrd.js:283689-283923 placement
function logArtifactPublishOutcome(e, n, r) {
  if (!e.granted || n === "without") return;
  if (r.published) logFeatureOk("cli_plugin_eval_artifact_publish");
  else if (r.errored) logFeatureSad("cli_plugin_eval_artifact_publish", "run_errored");
  else logFeatureSad("cli_plugin_eval_artifact_publish", "no_publish");
}
//@ chunk-qchp9vrd.js:283923-284021 placement
function is(e, n) {
  return uniq([...splitAllowedTools(e.execution.disallowed_tools ?? []).tools, ...(n.disallowTools ?? [])]);
}
//@ chunk-qchp9vrd.js:284021-284311 placement
function describeUndisallowableTools(e) {
  return `${e.map(Rm).join(", ")} cannot be disallowed: ${e.length === 1 ? "it is not a built-in tool" : "they are not built-in tools"} that this version of Claude Code can remove. Use bare names such as Agent or TaskStop; patterns such as Bash(rm:*) and MCP tools are not accepted.`;
}
//@ chunk-qchp9vrd.js:284311-284438 placement
function allowsArtifactPublish(e, n) {
  return (
    (n.artifactPublish ?? antEnv.CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH === !0) &&
    e.execution.artifact_publish === !0
  );
}
/**
 * 解析评测套件声明的 GrowthBook 开关覆盖：只保留允许列表（参数或 CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES）中的开关，其余记为丢弃。
 */
//@ chunk-qchp9vrd.js:284438-284747 placement
function resolveFlagOverrides(e, n) {
  let r = e.execution.growthbook_overrides ?? {},
    a = new Set(
      n.allowFlagOverrides ??
        (antEnv.CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES ?? "")
          .split(",")
          .map((w) => w.trim())
          .filter((w) => w.length > 0),
    ),
    s = {},
    h = [];
  for (let [w, b] of Object.entries(r))
    if (a.has(w)) s[w] = b;
    else h.push(w);
  return { declared: r, seeded: s, dropped: h };
}
//@ chunk-qchp9vrd.js:284747-284897 placement
function getRunArms(e, n, r) {
  if (n !== "with-without" || e.pluginDirs.length === 0) return ["with"];
  if (r && e.context.history_file) return ["with"];
  return ["with", "without"];
}
//@ chunk-qchp9vrd.js:284897-285480 placement
function logMockRegistration(e) {
  if (e.mockSetupFailure === "registration") logFeatureBad("cli_plugin_eval_mocks", "standin_registration");
  else if (e.mockSetupFailure === "identity") logFeatureBad("cli_plugin_eval_mocks", "standin_identity");
  else if (e.mockSetupFailure === "tools_missing")
    logFeatureBad("cli_plugin_eval_mocks", "standin_tools_missing");
  else if (e.mockSetupFailure === "integrity") logFeatureBad("cli_plugin_eval_mocks", "standin_integrity");
  else if (e.aborted !== null && e.aborted.reason.startsWith(iLe))
    logFeatureSad("cli_plugin_eval_mocks", "agent_relay_failed");
  else if (e.aborted !== null) logFeatureSad("cli_plugin_eval_mocks", "aborted_by_mock");
  else logFeatureOk("cli_plugin_eval_mocks");
}
//@ chunk-qchp9vrd.js:285480-285492 placement
var kg = 5000;
//@ chunk-qchp9vrd.js:285492-285540 placement
function Rg(e) {
  try {
    return Zi(e);
  } catch {
    return "";
  }
}
/**
 * 校验 trace 中的结果都是 harness 给出的（未被事后篡改）。
 */
//@ chunk-qchp9vrd.js:285540-287311 placement
function verifyTraceIntegrity(e, n, r) {
  let a = new Map();
  for (let server of r.servers)
    for (let tool of server.tools)
      if (server.responderKinds[tool] === "agent")
        a.set(server.toolFullNames[tool] ?? "", { server: server.dirName, tool: tool });
  let s = new Map(),
    h = (T) => jsonStringify([T.tool, T.verdict, T.outputKey]);
  for (let T of e) {
    let N = s.get(T.server) ?? new Map(),
      x = h(T),
      j = N.get(x) ?? { tool: T.tool, inputKeys: [], rewritten: 0 };
    (j.inputKeys.push(T.inputKey), N.set(x, j), s.set(T.server, N));
  }
  let w = new Map(),
    b = [],
    y = 0,
    R = 0;
  for (let toolCall of n.toolCalls) {
    let N = a.get(toolCall.name);
    if (N === void 0 || toolCall.mock === void 0) continue;
    if (toolCall.deniedByChild) {
      R++;
      continue;
    }
    if (toolCall.mock.verdict === "no_result") {
      let W = w.get(N.server) ?? new Set();
      (W.add(N.tool), w.set(N.server, W));
      continue;
    }
    let x = s.get(N.server),
      j = h({
        tool: N.tool,
        verdict: toolCall.mock.verdict,
        outputKey: qi(toolCall.output ?? "", toolCall.mock.verdict),
      }),
      K = x?.get(j);
    if (K === void 0 || K.inputKeys.length - K.rewritten <= 0) {
      b.push(
        `${N.server}/${N.tool}: a result in the trace is not one the harness gave \u2014 altered after the stand-in returned it (a PostToolUse hook that rewrites this tool's output does that; a run cannot be graded on answers the harness did not give) or answered by something else`,
      );
      break;
    }
    let index = K.inputKeys.indexOf(Rg(toolCall.input));
    if (index === -1) (K.rewritten++, y++);
    else K.inputKeys.splice(index, 1);
  }
  for (let T of s.values()) for (let N of T.values()) N.inputKeys.splice(0, N.rewritten);
  let S = !1;
  if (b.length === 0)
    for (let [T, N] of s) {
      let flattened = [...N.values()].flatMap(({ tool: tool, inputKeys: inputKeys }) =>
        inputKeys.map(() => tool),
      );
      if (flattened.length === 0) continue;
      if (flattened.length === 1 && n.killedInFlight && w.get(T)?.has(flattened[0])) {
        S = !0;
        continue;
      }
      b.push(
        `${T}: the harness answered ${flattened.length} agent mock ${plural(flattened.length, "call")} the trace does not show (the responder was reached other than through the mocked tools)`,
      );
      break;
    }
  return {
    mismatch: b.length === 0 ? null : `mocks: ${b.join("; ")}`,
    absorbedInFlightAnswer: S,
    inputsRewritten: y,
    deniedByChild: R,
  };
}
//@ chunk-qchp9vrd.js:287311-287335 placement
var TRUST_PLUGIN_FLAG = "--trust-plugin";

export { TRUST_PLUGIN_FLAG, runEvalCase };
