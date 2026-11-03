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
import path from "path";
import { lstat, rm as rm_2, realpath, readdir } from "fs/promises";
import { spawn } from "child_process";
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
import { invisiblePatternAccessor } from "../../utils/confusables.js";
import { checkGitVersionForEval } from "./runTrace.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import {
  emptyMockState,
  enumerateMockedServersForRun,
  describeMockMode,
  CALLS_PER_TURN,
  callBudgetForTurns,
  createMockRelayPipe,
  writeRunMocks,
  MockPolicyBlockedError,
  MockWithholdPolicyError,
  MockEnterpriseExclusiveError,
  MockManagedEnvError,
  describeMissingToolsJsonEntry,
  canonicalHash,
  outputKey,
} from "./mocks/mockRelay.js";
import { checkGradersSatisfiable, normalizeJudgeModel, gradeCase } from "./graders.js";
import {
  listMockedToolNames,
  withheldSegments,
  usesAgentResponder,
  filterForArm,
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
import { checkCaseInsideRoot } from "./evalFence.js";
import { checkEvalAuthPreflight } from "./authPreflight.js";
import { EVAL_ARTIFACTS_DIR, stubPublishDir } from "./artifactStub.js";
import { readRunTraceHistory } from "./runChild.js";
import { withDeadline } from "../../utils/sleep.js";
import {
  MOCK_RESPONDER_FAILED_TEXT,
  formatGuardValueJson,
} from "../../cli/handlers/pluginEval/mockGuards.js";
import { SETTINGS_FILENAME_ALIAS } from "./childEnvironment.js";
import { sealKeptSandbox, formatSealedKeptNotice } from "./keptSandbox.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { env, antEnv } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";

//@ chunk-qchp9vrd.js:254443-254456 placement
/**
 * 运行期间刷新登录的间隔（60000 毫秒）。
 */
var LOGIN_REFRESH_INTERVAL_MS = 60000;
//@ chunk-qchp9vrd.js:254456-255355 placement
/**
 * 运行期间定时刷新登录。
 */
class EvalLoginRefresher {
  retryBackoffMs;
  holders = 0;
  rotation = null;
  drainedWaiters = [];
  skip = null;
  constructor(retryBackoffMs = LOGIN_REFRESH_INTERVAL_MS) {
    this.retryBackoffMs = retryBackoffMs;
  }
  async enter() {
    while (this.rotation !== null) await this.rotation.catch(() => {});
    this.holders++;
  }
  leave() {
    this.holders--;
    if (this.holders === 0) {
      let drainedWaiters = this.drainedWaiters;
      this.drainedWaiters = [];
      for (let drainedWaiter of drainedWaiters) drainedWaiter();
    }
  }
  async rotate(e, n, r) {
    if (this.skip !== null && this.skip.expiry === e && Date.now() < this.skip.until) return;
    this.leave();
    try {
      this.rotation ??= (async () => {
        if (this.holders > 0) await new Promise((resolve) => this.drainedWaiters.push(resolve));
        let a;
        try {
          a = await r();
        } catch (error) {
          logForDebugging(`eval: login refresh failed: ${errorMessage(error)}`, {
            level: "error",
          });
          a = e;
        }
        if (a === null || a <= e)
          this.skip = {
            expiry: e,
            until: Date.now() + this.retryBackoffMs,
          };
        else if (a < n)
          this.skip = {
            expiry: a,
            until: Number.POSITIVE_INFINITY,
          };
        else this.skip = null;
      })().finally(() => {
        this.rotation = null;
      });
      await this.rotation;
    } finally {
      this.holders++;
    }
  }
  get holding() {
    return this.holders;
  }
}
//@ chunk-qchp9vrd.js:255355-272299 placement
/**
 * 运行单个用例：准备目录与模拟、启动子会话、评分并产出结果（约 17 KB）。
 */
async function runEvalCase(e) {
  let n = (onNotice) => (ie) => {
    try {
      onNotice(ie);
    } catch (error) {
      logForDebugging(`eval: progress sink failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  };
  let r = {
    ...e,
    onLine: n((B) => e.onLine(replaceControlChars(B))),
    onNotice: n(e.onNotice),
  };
  let concurrency = r.concurrency ?? 1;
  let date = new Date();
  let evalCases = await discoverEvalCases(
    r.rootPath,
    {
      caseGlob: r.caseGlob,
      tags: r.tags,
    },
    {
      evalDirSegments: r.evalDirSegments,
      frameRoot: r.frameRoot,
      adoptionDecided: r.adoptionDecided,
      trust: r.trust,
      targetScreened: r.targetScreened,
      consentDecided: r.consentDecided,
    },
  );
  let { errors, root, suite } = evalCases;
  let runToolRules = buildRunToolRules([], e.allowTools);
  if (runToolRules.denied.length > 0)
    errors.push({
      file: "--allow-tools",
      error: `refused ${plural(runToolRules.denied.length, "entry", "entries")}: malformed, a wildcard tool name the child does not support, or a tool never available in an evaluation (Monitor, EnterWorktree, ExitWorktree): ${runToolRules.denied.join(", ")}`,
    });
  r.allowTools = runToolRules.allowed;
  let S = splitAllowedTools(e.disallowTools ?? []);
  if (S.rejected.length > 0)
    errors.push({
      file: "--disallow-tools",
      error: `${describeUndisallowableTools(S.rejected)} No case was run.`,
    });
  else if (S.tools.length > 0)
    r.onNotice(`Removed from Claude's tools in every case (--disallow-tools): ${S.tools.join(", ")}`);
  r.disallowTools = S.tools;
  let cases = S.rejected.length > 0 ? [] : evalCases.cases;
  let N = [];
  for (let B of cases) {
    let { rejected } = splitAllowedTools(B.execution.disallowed_tools ?? []);
    if (rejected.length === 0) {
      N.push(B);
      continue;
    }
    errors.push({
      file: B.caseSource === "prose" ? B.caseDir : B.caseFile,
      error: `disallowed_tools: ${describeUndisallowableTools(rejected)}`,
    });
  }
  for (let error of errors) r.onLine(`\u2717 ${error.file}: ${error.error}`);
  let x =
    r.ablation === "auto" ? (N.some((B) => B.pluginDirs.length > 0) ? "with-without" : "none") : r.ablation;
  if (r.ablation === "auto" && x === "with-without")
    r.onNotice(
      "Ablation: defaulting to with-without \u2014 a plugin resolved from this path, so each case also runs a no-plugin baseline arm (2\xD7 runs) and reports \u0394; " +
        "graders marked with-only (including `tool_used: Skill`) become a plugin-fired indicator rather than part of the score. Pass --ablation none for the previous single-arm run and scoring.",
    );
  let j = N;
  if (r.ablation === "auto" && x === "with-without") {
    let filtered = j.filter((ie) => getRunArms(ie, x, true).length === 1);
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
      errors.push({
        file: ie.caseSource === "prose" ? ie.caseDir : ie.caseFile,
        error: _e,
      });
      r.onLine(`\u2717 ${ie.name}: ${_e}`);
    }
    if (filtered.length > 0) j = j.filter((ie) => ie.pluginDirs.length > 0);
  }
  if (j.length === 0)
    return {
      report: buildSuiteReport(
        [],
        date,
        r.signal.aborted ? "interrupted" : undefined,
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
        concurrency,
      ),
      exitCode: r.signal.aborted ? 2 : errors.length > 0 ? 1 : 0,
      errors,
      ablation: x,
      root,
      suite,
      resolvedCases: [],
      harnessFailures: 0,
    };
  checkDuplicateCaseNames(j, r.onLine);
  let caseTargetPath = await resolveCaseTargetPath(
    j.flatMap((B) => B.pluginDirs),
    root,
    r.frameRoot,
  );
  if (caseTargetPath.length === 0)
    r.onLine("Plugin under test: none resolved \u2014 cases run against baseline Claude Code");
  let X = x === "with-without";
  let W = X ? "the with-arm" : "this eval";
  for (let B of caseTargetPath) {
    let ie = B.version === undefined ? "(no version)" : `version ${quotedShort(B.version, 80)}`;
    (B.problem === undefined ? r.onLine : r.onNotice)(
      `Plugin under test: ${quotedShort(B.name, 160)} ${ie} at ${quotedShort(B.path, 1000)}`,
    );
    let Ae =
      B.problemDetail === undefined
        ? undefined
        : printableName(B.problemDetail.replace(invisiblePatternAccessor(), " "), 300);
    let De = Ae === undefined ? "" : ` (${Ae})`;
    switch (B.problem) {
      case undefined:
        break;
      case "manifest_invalid":
        r.onNotice(
          r.mocks !== "off" && r.allowRealServers !== true
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
    let B = await r.authPreflight();
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
          caseTargetPath,
          concurrency,
        ),
        exitCode: 130,
        errors,
        root,
        suite,
        resolvedCases: [],
        harnessFailures: 0,
        ablation: x,
      };
    if (!B.ok) {
      let ie = `authentication check failed before running any case \u2014 every run would use this same credential: ${B.message}`;
      errors.push({
        file: root,
        error: ie,
      });
      r.onLine(`\u2717 ${ie}`);
      return {
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
          caseTargetPath,
          concurrency,
        ),
        exitCode: 2,
        errors,
        root,
        suite,
        resolvedCases: [],
        harnessFailures: 0,
        ablation: x,
        authPreflightFailed: true,
      };
    }
    if (B.warning !== undefined) r.onNotice(`Note: ${B.warning}`);
  }
  try {
    await checkGitVersionForEval(subprocessEnv());
  } catch (error) {
    let ie = errorMessage(error);
    errors.push({
      file: root,
      error: ie,
    });
    r.onLine(`\u2717 ${ie}`);
    return {
      report: buildSuiteReport(
        [],
        date,
        undefined,
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
        caseTargetPath,
        concurrency,
      ),
      exitCode: 1,
      errors,
      root,
      suite,
      resolvedCases: [],
      harnessFailures: 0,
      ablation: x,
      gitPreflightFailed: true,
    };
  }
  if (r.maxCostUsd === undefined && j.some((B) => allowsArtifactPublish(B, r)))
    r.onNotice("Note: artifact publishing enabled with no --max-cost-usd; consider setting a cost ceiling");
  let G = new Map();
  let J = new Map();
  let Z = new Map();
  if (r.mocks !== "off") {
    let B = emptyMockState();
    for (let ie of j)
      try {
        let _e = await enumerateMockedServersForRun(ie, root, r.evalDirSegments, B, {
          allowRealServers: r.allowRealServers === true,
        });
        J.set(ie, _e.servers);
        for (let note of _e.notes) r.onNotice(replaceControlChars(`  ${ie.name}: ${note}`));
        Z.set(ie, _e.notes);
      } catch (error) {
        J.set(
          ie,
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            ? error
            : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `mocks: could not be prepared for this case (${getErrnoCode(error) ?? "see --verbose"})`,
                "mocks: preparation failed",
              ),
        );
        logForDebugging(`eval mocks: ${errorMessage(error)}`, {
          level: "error",
        });
      }
  }
  let se = (B) => {
    let ie = J.get(B);
    return ie === undefined || ie instanceof Error ? [] : ie;
  };
  for (let B of j) {
    if (B.context.scaffold_script && r.noScaffold)
      r.onNotice(
        `\u26A0 case "${B.name}": its scaffold_script is not run without --scaffold (author-supplied bash that runs as you - pass it only for suites you trust); the case runs against an unstaged workspace`,
      );
    let ie = checkGradersSatisfiable(B, r.allowTools, {
      scaffolded: !!B.context.scaffold_script && !r.noScaffold,
      artifactPublishGranted: allowsArtifactPublish(B, r),
      disallowedTools: mergedDisallowedTools(B, r),
      mockedTools: listMockedToolNames(se(B)),
      withheldServers: withheldSegments(se(B)),
    });
    if (ie.length > 0) {
      G.set(B, ie);
      for (let _e of ie) r.onNotice(`\u26A0 case "${B.name}": ${_e.text}`);
    }
  }
  if (x === "with-without") {
    let reduced = j.reduce(
      (acc, _e) => acc + (r.runs ?? _e.runs) * getRunArms(_e, x, r.ablation === "auto").length,
      0,
    );
    r.onLine(
      `Ablation: 2 arms \xD7 ${j.length} ${plural(j.length, "case")} (${reduced} ${plural(reduced, "run")})`,
    );
  }
  let Q = {
    spent: 0,
    partialReason: undefined,
    authBackstopArmed: true,
    agentService: null,
    agentServiceStarting: null,
    costCeilingAnnounced: false,
    harnessFailures: 0,
    tokenGate: new EvalLoginRefresher(),
  };
  await using Se = {
    async [Symbol.asyncDispose]() {
      let B =
        Q.agentService ??
        (Q.agentServiceStarting !== null ? await Q.agentServiceStarting.catch(() => null) : null);
      Q.agentService = null;
      Q.agentServiceStarting = null;
      if (B !== null) await B.close();
    },
  };
  if (concurrency > 1)
    r.onLine(
      `Concurrency: up to ${concurrency} runs in flight (all children share your rate limit; progress lines interleave, results keep case order)`,
    );
  let we = new Map();
  let Be = [];
  let Je = (B, error) => {
    we.set(B, {
      case_: B,
      report: {
        name: B.name,
        dir: relativeCaseDir(root, B),
        source: B.caseSource,
        score: 0,
        pass_rate: 0,
        runs: [
          {
            score: 0,
            turns: 0,
            cost_usd: 0,
            judge_cost_usd: 0,
            graders: [],
            trace_path: "",
            error,
          },
        ],
      },
    });
  };
  let Ee = (B) => {
    let runs = r.runs ?? B.runs;
    let _e = allowsArtifactPublish(B, r);
    let Ae = J.get(B);
    let De = se(B);
    if (Ae instanceof Error) {
      logFeatureBad("cli_plugin_eval_mocks", "load_failed");
      let error = replaceControlChars(Ae.message);
      r.onLine(`  ${B.name}: ${error}`);
      Je(B, error);
      return null;
    }
    if (De.length > 0) {
      r.onLine(replaceControlChars(`  ${B.name}: mocked: ${describeMockMode(De)}`));
      if (usesAgentResponder(De))
        r.onLine(
          replaceControlChars(
            `  ${B.name}: mock budget = ${CALLS_PER_TURN}\xD7max_turns = ${callBudgetForTurns(B.execution.max_turns)} agent-answered calls per run, shared by all mocked servers (model: ${normalizeJudgeModel(r.judgeModel) ?? "default small model"}, shared with --judge-model)`,
          ),
        );
    }
    let disallowedTools = mergedDisallowedTools(B, r);
    let runToolRules = buildRunToolRules(B.execution.allowed_tools, r.allowTools, {
      artifactPublishGranted: _e,
      mockedTools: listMockedToolNames(De),
      disallowedTools,
    });
    let tools = splitAllowedTools(B.execution.disallowed_tools ?? []).tools;
    if (tools.length > 0)
      r.onNotice(
        replaceControlChars(
          `  ${B.name}: removed from Claude's tools by the case's disallowed_tools: ${tools.join(", ")}`,
        ),
      );
    if (runToolRules.denied.length > 0)
      r.onLine(
        replaceControlChars(
          `  ${B.name}: not granted (missing --allow-tools grant, or a malformed entry): ${runToolRules.denied.join(", ")}`,
        ),
      );
    let Ne = (Ge) =>
      splitRuleList([Ge.join(",")]).some(
        (Lt) => permissionRuleValueFromString(Lt).toolName === ARTIFACT_TOOL_NAME,
      );
    if ((Ne(runToolRules.denied) || Ne(r.allowTools)) && !_e)
      r.onLine(
        `  ${B.name}: the ${ARTIFACT_TOOL_NAME} tool is not available inside eval runs; --allow-tools cannot enable it`,
      );
    if (B.execution.artifact_publish === true && !_e)
      r.onLine(
        `  ${B.name}: requests artifact publishing; not granted (operator opt-in required) \u2014 running without it`,
      );
    let flagOverrides = resolveFlagOverrides(B, r);
    let grant = {
      granted: _e,
      seededFlags: flagOverrides.seeded,
    };
    if (Object.keys(flagOverrides.declared).length > 0)
      if (!_e)
        r.onLine(
          `  ${B.name}: growthbook_overrides not applied \u2014 they seed only a run granted artifact publishing`,
        );
      else {
        if (Object.keys(flagOverrides.seeded).length > 0)
          r.onLine(`  ${B.name}: seeding growthbook_overrides ${jsonStringify(flagOverrides.seeded)}`);
        if (flagOverrides.dropped.length > 0)
          r.onLine(
            `  ${B.name}: growthbook_overrides dropped (operator allowlist required \u2014 CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES): ${jsonStringify(flagOverrides.dropped)}`,
          );
      }
    let mapped = getRunArms(B, x, r.ablation === "auto").map((Ge) => ({
      arm: Ge,
      armCase:
        Ge === "without"
          ? {
              ...B,
              pluginDirs: [],
            }
          : B,
      allowed:
        Ge === "without" && De.length > 0
          ? buildRunToolRules(B.execution.allowed_tools, r.allowTools, {
              artifactPublishGranted: _e,
              mockedTools: listMockedToolNames(filterForArm(De, Ge)),
              disallowedTools,
            }).allowed
          : runToolRules.allowed,
    }));
    let lt = {
      case_: B,
      runs,
      grant,
      mockServers: De,
      mockNotes: Z.get(B) ?? [],
      arms: mapped,
      results: new Map(mapped.map((Ge) => [Ge.arm, Array(runs)])),
      landed: 0,
      finalized: false,
    };
    Be.push(lt);
    return lt;
  };
  let Qe = (B) => {
    if (B.finalized) return;
    B.finalized = true;
    let case_ = B.case_;
    let _e = (lt) => B.results.get(lt)?.filter((Ge) => Ge !== undefined);
    let Ae = _e("with") ?? [];
    let De = _e("without");
    if (Ae.length === 0 && Q.partialReason) return;
    let { score, passRate } = aggregateRunScores(Ae);
    let Me = De && De.length > 0 ? aggregateRunScores(De) : undefined;
    let Ne = (lt) => !!lt?.some((Ge) => Ge.skipped_paid_graders);
    let ot = Ae.some((lt) => lt.ended_on_api_error) || !!De?.some((lt) => lt.ended_on_api_error);
    let nt = !Ne(Ae) && !Ne(De) && !ot;
    we.set(case_, {
      case_,
      report: {
        name: case_.name,
        dir: relativeCaseDir(root, case_),
        source: case_.caseSource,
        score,
        pass_rate: passRate,
        runs: Ae,
        ...(G.has(case_) && {
          advisories: G.get(case_),
        }),
        ...(Me &&
          De && {
            pass_rate_without: Me.passRate,
            runs_without: De,
            ...(nt && {
              score_without: Me.score,
              delta: score - Me.score,
            }),
          }),
      },
    });
    let mt = Ae.length + (De?.length ?? 0);
    let Ye =
      Ae.reduce((acc, Ge) => acc + Ge.cost_usd, 0) + (De?.reduce((acc, Ge) => acc + Ge.cost_usd, 0) ?? 0);
    if (Me && nt) {
      let lt = score - Me.score;
      let Ge = lt > 0 ? "+" : "";
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
      if (Q.partialReason === undefined && r.signal.aborted) Q.partialReason = "interrupted";
      return Q.partialReason !== undefined;
    };
    for (let ie of j) {
      if (B()) return;
      let _e;
      try {
        _e = Ee(ie);
      } catch (error) {
        logForDebugging(`eval case plan: ${errorMessage(error)}`, {
          level: "error",
        });
        let De =
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            ? error.message
            : (getErrnoCode(error) ?? "unknown error");
        Je(ie, `case could not be planned (${De}) \u2014 see the debug log`);
        Q.harnessFailures++;
        continue;
      }
      if (_e === null) continue;
      for (let arm of _e.arms)
        for (let idx = 0; idx < _e.runs; idx++) {
          if (B()) return;
          yield {
            plan: _e,
            arm,
            index: idx,
          };
        }
    }
  }
  await pMap(
    ye(),
    async ({ plan, arm, index }) => {
      let Ae = plan.arms.length * plan.runs;
      if (r.signal.aborted) Q.partialReason ??= "interrupted";
      else if (r.maxCostUsd !== undefined && Q.spent >= r.maxCostUsd && Q.partialReason === undefined)
        Q.partialReason = "cost_ceiling";
      if (Q.partialReason === "cost_ceiling" && !Q.costCeilingAnnounced) {
        Q.costCeilingAnnounced = true;
        r.onLine(`\u26A0 cost ceiling $${r.maxCostUsd} hit; skipping remaining cases`);
      }
      if (Q.partialReason) return;
      let De = await formatCaseResultLine(
        arm.armCase,
        index,
        plan.runs,
        arm.allowed,
        plan.grant,
        r,
        Q,
        plan.arms.length > 1 ? arm.arm : undefined,
        plan.mockServers,
        plan.mockNotes,
      ).catch((error) => {
        logForDebugging(`eval run setup: ${errorMessage(error)}`, {
          level: "error",
        });
        let error_2 = `run could not start (${error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.message : (getErrnoCode(error) ?? "unknown error")}) \u2014 see the debug log`;
        Q.harnessFailures++;
        r.onLine(
          `  ${plan.case_.name} run ${index + 1}/${plan.runs}${plan.arms.length > 1 ? ` [${arm.arm}]` : ""}: score 0.00  $0.00  error: ${oneLineMessage(`run could not start: ${errorMessage(error)}`)}`,
        );
        return {
          score: 0,
          turns: 0,
          cost_usd: 0,
          judge_cost_usd: 0,
          graders: [],
          trace_path: "",
          error: error_2,
        };
      });
      plan.results.get(arm.arm)[index] = De;
      plan.landed++;
      if (plan.landed === Ae) Qe(plan);
    },
    {
      concurrency,
      stopOnError: false,
    },
  ).catch((error) => {
    let ie = error instanceof AggregateError ? error.errors : [error];
    for (let _e of ie) logError(_e);
    Q.harnessFailures += ie.length;
  });
  for (let B of Be) Qe(B);
  if (r.maxCostUsd !== undefined && Q.spent > r.maxCostUsd && !Q.costCeilingAnnounced) {
    Q.costCeilingAnnounced = true;
    r.onNotice(
      `\u26A0 cost ceiling $${r.maxCostUsd} exceeded: $${Q.spent.toFixed(2)} spent by runs already in flight when it was crossed; nothing was skipped`,
    );
  }
  let flattened = j.flatMap((B) => {
    let ie = we.get(B);
    return ie === undefined ? [] : [ie];
  });
  if (Q.partialReason === undefined && r.signal.aborted) Q.partialReason = "interrupted";
  let suiteReport = buildSuiteReport(
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
    caseTargetPath,
    concurrency,
  );
  let all = suiteReport.cases.every((B) => B.score >= r.threshold);
  if (Q.harnessFailures > 0)
    r.onNotice(
      `\u26A0 ${Q.harnessFailures} ${plural(Q.harnessFailures, "run")} could not be started by the harness (see the errors above and the debug log); the suite exits non-zero regardless of scores`,
    );
  let ce = count(
    suiteReport.cases.flatMap((B) => B.runs.concat(B.runs_without ?? [])),
    (B) => B.ended_on_api_error === true,
  );
  if (ce > 0)
    r.onNotice(
      `\u26A0 ${ce} ${plural(ce, "run")} ended on an API error and scored 0 without grading (each run's error is on its progress line above, or in its \`error\` field under --json); fix the cause and re-run \u2014 the suite exits non-zero regardless of scores`,
    );
  let exitCode = Q.partialReason
    ? 2
    : all && errors.length === 0 && Q.harnessFailures === 0 && ce === 0
      ? 0
      : 1;
  return {
    report: suiteReport,
    exitCode,
    errors,
    root,
    suite,
    resolvedCases: flattened,
    ablation: x,
    harnessFailures: Q.harnessFailures,
  };
}
//@ chunk-qchp9vrd.js:272299-272308 placement
/**
 * 启动失败重试次数（2）。
 */
var MAX_START_RETRIES = 2;
//@ chunk-qchp9vrd.js:272308-273279 placement
async function formatCaseResultLine(
  armCase,
  index,
  runs,
  allowedTools,
  grant,
  h,
  w,
  b,
  mockServers = [],
  mockNotes = [],
) {
  let now = Date.now();
  let T = await runEvalSuite(armCase, allowedTools, grant, h, mockServers, mockNotes, w, b);
  T.started_at = new Date(now).toISOString();
  T.duration_seconds = Math.round((Date.now() - now) / 1000);
  w.spent += T.cost_usd;
  let N = b ? ` [${b}]` : "";
  let x = T.error
    ? `  error: ${oneLineMessage(T.error)}`
    : T.aborted
      ? `  aborted by mock ${T.aborted.server}/${T.aborted.tool}: ${oneLineMessage(replaceControlChars(T.aborted.reason))}`
      : "";
  h.onLine(
    `  ${armCase.name} run ${index + 1}/${runs}${N}: score ${T.score.toFixed(2)}  $${T.cost_usd.toFixed(2)}${x}`,
  );
  for (let grader of T.graders) {
    let X = grader.with_only ? " [with-only, not scored]" : ` (weight ${grader.weight})`;
    h.onLine(
      `    ${grader.passed ? "\u2713" : "\u2717"} ${replaceControlChars(grader.name)}${X}: ${oneLineMessage(grader.explanation)}`,
    );
  }
  let authBackstopArmed = w.authBackstopArmed;
  if (T.auth_rejected !== undefined) w.authBackstopArmed = false;
  if (authBackstopArmed && T.auth_rejected === true && w.partialReason === undefined) {
    w.partialReason = "auth_failed";
    h.onLine(
      "\u26A0 a run could not authenticate \u2014 every remaining run would fail the same way, so the suite stops here. Fix the credential above and re-run.",
    );
  }
  return T;
}
//@ chunk-qchp9vrd.js:273279-273340 placement
/**
 * 把多行文本压成一行并截断到 200 字符。
 */
function oneLineMessage(e) {
  return truncateWithCount(replaceControlChars(e.replace(/\s*\n\s*/g, " ")), 200);
}
//@ chunk-qchp9vrd.js:273340-273604 placement
function checkDuplicateCaseNames(e, onLine) {
  let r = new Map();
  for (let a of e) {
    let s = r.get(a.name) ?? [];
    s.push(a.caseDir);
    r.set(a.name, s);
  }
  for (let [a, s] of r)
    if (s.length > 1)
      onLine(
        replaceControlChars(
          `\u26A0 ${s.length} cases share the name "${a}" (${s.join(", ")}); the report and --case filter cannot distinguish them`,
        ),
      );
}
//@ chunk-qchp9vrd.js:273604-273672 placement
/**
 * 计算用例目录相对于根目录的路径。
 */
function relativeCaseDir(root, n) {
  let relativePath = path.relative(root, n.caseDir);
  return relativePath === "" ? "." : relativePath;
}
//@ chunk-qchp9vrd.js:273672-280997 placement
/**
 * 运行全部用例（with/without 插件对比）、脚手架与结果汇总（约 7 KB）。
 */
async function runEvalSuite(e, allowedTools, r, a, s, h, w, b) {
  let y = false;
  let R = (K) => {
    if (y) return;
    y = true;
    logArtifactPublishOutcome(r, b, K);
  };
  let evalTempDir = await createEvalTempDir();
  let T = false;
  let N = false;
  let x = null;
  let j = 0;
  try {
    if (e.context.scaffold_script && !a.noScaffold) {
      let ye = await checkCaseInsideRoot(e, e.context.scaffold_script);
      a.onLine(replaceControlChars(`  scaffold: ${ye}`));
      let je = await runScaffoldCommand(ye, evalTempDir, a.signal);
      if (je.code !== 0) {
        T = true;
        R({
          published: false,
          errored: true,
        });
        return {
          score: 0,
          turns: 0,
          cost_usd: 0,
          judge_cost_usd: 0,
          graders: [],
          trace_path: "",
          error: replaceControlChars(`scaffold failed (exit ${je.code}): ${takeLastChars(je.stderr, 500)}`),
        };
      }
    }
    await w.tokenGate.enter();
    N = true;
    let K = await checkEvalAuthPreflight(a.credentials, e.execution.timeout_seconds, (ye, je, pt) =>
      w.tokenGate.rotate(ye, je, pt),
    );
    if (K?.warning) a.onLine(`  \u26A0 ${K.warning}`);
    try {
      if (usesAgentResponder(filterForArm(s, b)))
        for (let idx = 1; w.agentService === null; idx++) {
          w.agentServiceStarting ??= createMockRelayPipe({
            credentials: a.credentials,
          }).catch((error) => {
            w.agentServiceStarting = null;
            throw error;
          });
          try {
            w.agentService = await w.agentServiceStarting;
          } catch (error) {
            if (idx >= MAX_START_RETRIES) throw error;
          }
        }
      x = await writeRunMocks(s, b, evalTempDir, {
        maxTurns: e.execution.max_turns,
        model: normalizeJudgeModel(a.judgeModel) ?? null,
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
      logForDebugging(`eval mocks: ${errorMessage(error)}`, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks: could not set up this run's stand-ins (${getErrnoCode(error) ?? "unknown error"}) \u2014 see the debug log`,
        "mocks: run setup failed",
      );
    }
    let X = await listRunDirFiles(evalTempDir.cwd);
    if (await prepareRunDirectory(evalTempDir.cwd, X, "scaffold"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the case's scaffold created ${EVAL_ARTIFACTS_DIR}/ in the run's working directory \u2014 that name is reserved for the run's artifact publishes; have the scaffold use another name`,
        "eval scaffold created the reserved publish directory",
      );
    let runTraceHistory = await readRunTraceHistory({
      case_: e,
      sandbox: evalTempDir,
      allowedTools,
      disallowedTools: mergedDisallowedTools(e, a),
      operatorAllowedTools: a.allowTools,
      modelOverride: a.model,
      artifactPublishGranted: r.granted,
      growthbookOverrides: r.seededFlags,
      verbose: a.verbose,
      mocks: x ?? undefined,
      signal: a.signal,
      credential: K,
    });
    N = false;
    w.tokenGate.leave();
    j = runTraceHistory.costUsd;
    R({
      published: runTraceHistory.artifactPublishes.length > 0,
      errored: runTraceHistory.error !== null || runTraceHistory.timedOut,
    });
    let agentRun = x?.agentRun ?? null;
    let J = null;
    let Z = false;
    let se = null;
    if (agentRun !== null && x) {
      let inFlight = agentRun.state.inFlight;
      agentRun.dispose();
      await withDeadline(agentRun.settled(), DISPOSE_TIMEOUT_MS);
      if (runTraceHistory.aborted === null && agentRun.state.aborted !== null)
        runTraceHistory.aborted = agentRun.state.aborted;
      runTraceHistory.costUsd += agentRun.state.costUsd;
      j = runTraceHistory.costUsd;
      let je = verifyTraceIntegrity(agentRun.state.answers, runTraceHistory, x);
      if (je.deniedByChild > 0)
        se = `${je.deniedByChild} agent-mock ${plural(je.deniedByChild, "call")} ${plural(je.deniedByChild, "was", "were")} refused by the child itself (a permission rule or the plugin's own PreToolUse hook) \u2014 never relayed, so abort_when was not judged for ${plural(je.deniedByChild, "it", "them")} and the model read the refusal text, not a mock answer`;
      if (je.inputsRewritten > 0)
        J = `${je.inputsRewritten} agent-mock ${plural(je.inputsRewritten, "call")} reached the mock with arguments different from the model's tool_use (rewritten before dispatch, e.g. by a plugin PreToolUse hook) \u2014 abort_when and the responder judged the rewritten arguments; the transcript shows the model's`;
      if (runTraceHistory.aborted === null && runTraceHistory.mockSetupFailure === null) {
        if (je.mismatch !== null) {
          runTraceHistory.mockSetupFailure = "integrity";
          runTraceHistory.error =
            runTraceHistory.error === null ? je.mismatch : `${runTraceHistory.error} \xB7 ${je.mismatch}`;
        } else if (je.absorbedInFlightAnswer || inFlight > 0) {
          runTraceHistory.mockSetupFailure = "integrity";
          Z = true;
          runTraceHistory.error = `${runTraceHistory.error ?? "ended"} \xB7 mocks: an agent mock call was in flight when the child was killed (its answer or abort_when verdict never reached the run) \u2014 the run is not graded`;
        }
      }
      if (
        runTraceHistory.aborted === null &&
        runTraceHistory.mockSetupFailure === null &&
        runTraceHistory.error === null
      )
        runTraceHistory.mockRecordings = [...agentRun.state.recordings];
    }
    j = runTraceHistory.costUsd;
    if (x)
      if (Z) logFeatureSad("cli_plugin_eval_mocks", "agent_call_in_flight");
      else logMockRegistration(runTraceHistory);
    let Q = x
      ? {
          servers: x.servers.map((server) => ({
            server: server.dirName,
            kind: server.kind,
            ...(server.withheld && {
              withheld: true,
            }),
            ...(server.replayPinned > 0 && {
              replayPinned: server.replayPinned,
            }),
            tools: server.tools.map((tool) => ({
              tool,
              responder: server.responderKinds[tool] ?? "fixed",
            })),
          })),
          warnings: [
            ...h,
            ...describeMissingToolsJsonEntry(filterForArm(s, b)),
            ...(J === null ? [] : [J]),
            ...(se === null ? [] : [se]),
          ].map(replaceControlChars),
          calls: {
            ...(runTraceHistory.mockTally ?? {
              total: 0,
              errors: 0,
              unmocked: [],
            }),
            costUsd: agentRun?.state.costUsd ?? 0,
            replay: agentRun?.state.replay ?? {
              hits: 0,
              misses: 0,
            },
          },
        }
      : undefined;
    if (runTraceHistory.aborted !== null || runTraceHistory.mockSetupFailure !== null) {
      if (runTraceHistory.mockSetupFailure !== null) T = true;
      if (runTraceHistory.aborted?.reason.startsWith(MOCK_RESPONDER_FAILED_TEXT)) T = true;
      return {
        score: 0,
        turns: runTraceHistory.numTurns,
        cost_usd: runTraceHistory.costUsd,
        judge_cost_usd: 0,
        graders: [],
        trace_path: runTraceHistory.tracePath,
        error:
          runTraceHistory.mockSetupFailure !== null && runTraceHistory.error !== null
            ? replaceControlChars(runTraceHistory.error)
            : null,
        ...(runTraceHistory.aborted !== null && {
          aborted: {
            server: replaceControlChars(runTraceHistory.aborted.server),
            tool: replaceControlChars(runTraceHistory.aborted.tool),
            reason: replaceControlChars(runTraceHistory.aborted.reason),
          },
        }),
        ...(Q && {
          mocks: Q,
        }),
        ...(runTraceHistory.authRejected !== null && {
          auth_rejected: runTraceHistory.authRejected,
        }),
        ...(runTraceHistory.endedOnApiError && {
          ended_on_api_error: true,
        }),
      };
    }
    if (runTraceHistory.endedOnApiError) {
      T = true;
      return {
        score: 0,
        turns: runTraceHistory.numTurns,
        cost_usd: runTraceHistory.costUsd,
        judge_cost_usd: 0,
        graders: [],
        trace_path: runTraceHistory.tracePath,
        error: runTraceHistory.error === null ? null : replaceControlChars(runTraceHistory.error),
        ended_on_api_error: true,
        ...(Q && {
          mocks: Q,
        }),
        ...(runTraceHistory.authRejected !== null && {
          auth_rejected: runTraceHistory.authRejected,
        }),
      };
    }
    let Se = await listRunDirFiles(evalTempDir.cwd);
    if (await prepareRunDirectory(evalTempDir.cwd, Se, "run"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the run created ${EVAL_ARTIFACTS_DIR}/ in its working directory \u2014 that name is reserved for the run's artifact publishes, so its file evidence cannot be trusted`,
        "eval run planted the reserved publish directory",
      );
    if (r.granted) {
      let ye = stubPublishDir(evalTempDir);
      if (
        (await lstat(ye).catch((error) => {
          if (isENOENT(error)) return null;
          logForDebugging(`eval: cannot examine ${ye}: ${errorMessage(error)}`, {
            level: "warn",
          });
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `the run's artifact-publish staging directory could not be examined (${getErrnoCode(error) ?? "unknown error"}), so its file evidence cannot be trusted`,
            "eval stub publish staging dir unreadable",
          );
        })) !== null
      )
        for (let pt of await listRunDirFiles(ye)) Se.add(`${EVAL_ARTIFACTS_DIR}/${pt}`);
    }
    let cwdDiff = diffSortedLines(X, Se);
    let skipPaidGraders = a.maxCostUsd !== undefined && runTraceHistory.costUsd >= a.maxCostUsd - w.spent;
    let { results, judgeCostUsd, paidGradersSkipped } = await gradeCase({
      case_: e,
      run: runTraceHistory,
      cwdDiff,
      sandboxCwd: evalTempDir.cwd,
      stubPublishDir: r.granted ? stubPublishDir(evalTempDir) : undefined,
      judgeModel: a.judgeModel,
      skipPaidGraders,
      arm: b,
      mockCallsWithOnly: isWithoutArmEmpty(s, b),
      signal: a.signal,
      credentials: a.credentials,
    });
    if (runTraceHistory.error !== null) T = true;
    return {
      score: computeWeightedScore(results),
      turns: runTraceHistory.numTurns,
      cost_usd: runTraceHistory.costUsd + judgeCostUsd,
      judge_cost_usd: judgeCostUsd,
      graders: results,
      trace_path: runTraceHistory.tracePath,
      error: runTraceHistory.error === null ? null : replaceControlChars(runTraceHistory.error),
      ...(Q && {
        mocks: Q,
      }),
      ...(runTraceHistory.mockRecordings.length > 0 && {
        mockRecordings: runTraceHistory.mockRecordings,
      }),
      ...(paidGradersSkipped && {
        skipped_paid_graders: true,
      }),
      ...(runTraceHistory.authRejected !== null && {
        auth_rejected: runTraceHistory.authRejected,
      }),
    };
  } catch (error) {
    T = true;
    R({
      published: false,
      errored: true,
    });
    return {
      score: 0,
      turns: 0,
      cost_usd: j > 0 ? j : (x?.agentRun?.state.costUsd ?? 0),
      judge_cost_usd: 0,
      graders: [],
      trace_path: "",
      error: replaceControlChars(errorMessage(error)),
    };
  } finally {
    if (N) w.tokenGate.leave();
    x?.agentRun?.dispose();
    await rm_2(path.join(evalTempDir.outDir, MOCKS_JSON_FILE), {
      force: true,
    }).catch(() => {});
    await rm_2(path.join(evalTempDir.configDir, SETTINGS_FILENAME_ALIAS), {
      force: true,
    }).catch(() => {});
    let K = T && a.keepFailedRuns && !a.signal.aborted;
    if (a.keepTemp || K) {
      let X = await sealKeptSandbox(evalTempDir).then(
        (sealed) => ({
          sealed,
          error: null,
        }),
        (error) => ({
          sealed: null,
          error: errorMessage(error),
        }),
      );
      a.onLine(`  kept temp${K && !a.keepTemp ? " (run failed)" : ""}: ${evalTempDir.root}`);
      a.onNotice(
        X.sealed !== null
          ? `\u26A0 kept ${evalTempDir.root}: ${formatSealedKeptNotice(evalTempDir, X.sealed)}`
          : `\u26A0 kept ${evalTempDir.root}: could NOT seal what the plugin under test wrote (${X.error}) \u2014 everything in it except out/ and config/ may be agent-written, wherever it now sits (modes were closed as far as possible); read out/ if you need it, do not run git or anything that loads configuration from a working directory anywhere inside, and remove it (\`${formatRemoveRunDirCommand(evalTempDir.root)}\`)`,
      );
    } else
      await evalTempDir.cleanup().catch((error) => {
        a.onNotice(
          `\u26A0 could not remove ${evalTempDir.root} (${errorMessage(error)}); it holds what the plugin under test wrote \u2014 do not run git or anything that loads configuration from a working directory inside it, and remove it (\`${formatRemoveRunDirCommand(evalTempDir.root)}\`)`,
        );
      });
  }
}
//@ chunk-qchp9vrd.js:280997-281733 placement
async function runScaffoldCommand(e, evalTempDir, signal) {
  return await new Promise((resolve) => {
    let s = "";
    let h = spawn("bash", [e], {
      cwd: evalTempDir.cwd,
      windowsHide: true,
      ...cgroupSpawnOptions("plugin"),
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        PATH: env.PATH,
        HOME: evalTempDir.home,
        USERPROFILE: evalTempDir.home,
        TMPDIR: evalTempDir.tmpDir,
        TMP: evalTempDir.tmpDir,
        TEMP: evalTempDir.tmpDir,
        TERM: "dumb",
        GIT_CONFIG_NOSYSTEM: "1",
        USER_TYPE: "external",
        NODE_ENV: "production",
      },
    });
    let timer = setTimeout((y) => y.kill("SIGKILL"), 120000, h);
    let b = () => h.kill("SIGKILL");
    if (signal.aborted) b();
    else
      signal.addEventListener("abort", b, {
        once: true,
      });
    h.stderr?.setEncoding("utf8");
    h.stderr?.on("data", (y) => {
      if (s.length < 16384) s += y;
    });
    h.on("error", (y) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", b);
      resolve({
        code: 127,
        stderr: String(y),
      });
    });
    h.on("close", (code) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", b);
      resolve({
        code,
        stderr: s,
      });
    });
  });
}
//@ chunk-qchp9vrd.js:281733-281920 placement
async function listRunDirFiles(cwd) {
  let n = new Set();
  let r = await lstat(cwd).catch(() => null);
  if (r === null || !r.isDirectory() || r.isSymbolicLink() || (await realpath(cwd).catch(() => null)) !== cwd)
    throw checkRunDirUnchanged();
  await walkRunDir(cwd, "", n, 0);
  return n;
}
//@ chunk-qchp9vrd.js:281920-282225 placement
function checkRunDirUnchanged() {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "the run directory (or a directory inside it) is no longer the one the harness listed, or cannot be listed \u2014 moved, removed, replaced by a link, made unreadable, or too deep or too large to walk \u2014 so its file evidence cannot be trusted",
    "eval run directory replaced",
  );
}
//@ chunk-qchp9vrd.js:282225-282812 placement
async function prepareRunDirectory(cwd, n, r) {
  let lower = EVAL_ARTIFACTS_DIR.toLowerCase();
  let s = await lstat(path.join(cwd, EVAL_ARTIFACTS_DIR)).then(
    (h) => (r === "run" && h.isFile() && h.size === 0 ? "placeholder" : "present"),
    (error) => {
      if (isENOENT(error)) return "absent";
      logForDebugging(`eval: cannot examine the reserved publish name in ${cwd}: ${errorMessage(error)}`, {
        level: "warn",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the reserved ${EVAL_ARTIFACTS_DIR} name in the run's working directory could not be examined (${getErrnoCode(error) ?? "unknown error"}), so its file evidence cannot be trusted`,
        "eval reserved publish name unreadable",
      );
    },
  );
  if (s === "placeholder") n.delete(EVAL_ARTIFACTS_DIR);
  for (let h of n) if (firstLineOf(h.toLowerCase().replaceAll("\\", "/"), "/") === lower) return true;
  return s === "present";
}
//@ chunk-qchp9vrd.js:282812-282970 placement
function formatRemoveRunDirCommand(root) {
  return getPlatform() === "windows"
    ? `Remove-Item -Recurse -Force -LiteralPath '${root.replaceAll("'", "''")}'`
    : `chmod -R u+rwX ${shellQuoteArgs([root])} && rm -rf ${shellQuoteArgs([root])}`;
}
//@ chunk-qchp9vrd.js:282970-282990 placement
/**
 * 枚举运行目录时的最大条目数（200000）。
 */
var MAX_RUN_DIR_DEPTH = 32;
var MAX_RUN_DIR_ENTRIES = 200000;
//@ chunk-qchp9vrd.js:282990-283509 placement
/**
 * 递归列出运行目录中的文件（深度与条目数有上限），每级检查目录不是链接、realpath 未变且 inode 前后一致，否则抛出。
 */
async function walkRunDir(
  e,
  n,
  r,
  a,
  s = {
    count: 0,
  },
) {
  if (a > MAX_RUN_DIR_DEPTH) throw checkRunDirUnchanged();
  let joined = path.join(e, n);
  let w = await lstat(joined, {
    bigint: true,
  }).catch(() => null);
  if (
    w === null ||
    !w.isDirectory() ||
    w.isSymbolicLink() ||
    (await realpath(joined).catch(() => null)) !== joined
  )
    throw checkRunDirUnchanged();
  let b;
  try {
    b = await readdir(joined, {
      withFileTypes: true,
    });
  } catch {
    throw checkRunDirUnchanged();
  }
  let y = await lstat(joined, {
    bigint: true,
  }).catch(() => null);
  if (y === null || y.ino !== w.ino || y.dev !== w.dev) throw checkRunDirUnchanged();
  s.count += b.length;
  if (s.count > MAX_RUN_DIR_ENTRIES) throw checkRunDirUnchanged();
  for (let R of b) {
    let S = n ? `${n}/${R.name}` : R.name;
    if (R.isDirectory()) await walkRunDir(e, S, r, a + 1, s);
    else r.add(S);
  }
}
//@ chunk-qchp9vrd.js:283509-283599 placement
/**
 * 返回在第二个集合里不存在的项（排序后拼接）。
 */
function diffSortedLines(e, n) {
  let r = [];
  for (let a of n) if (!e.has(a)) r.push(a);
  return r.sort().join(`
`);
}
//@ chunk-qchp9vrd.js:283599-283689 placement
/**
 * 清洗控制字符并截断后转成 JSON 字符串。
 */
function quotedShort(e, n) {
  let r = replaceControlChars(e.replace(invisiblePatternAccessor(), " "));
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
/**
 * 合并用例与命令行给出的禁用工具。
 */
function mergedDisallowedTools(e, n) {
  return uniq([...splitAllowedTools(e.execution.disallowed_tools ?? []).tools, ...(n.disallowTools ?? [])]);
}
//@ chunk-qchp9vrd.js:284021-284311 placement
function describeUndisallowableTools(rejected) {
  return `${rejected.map(formatGuardValueJson).join(", ")} cannot be disallowed: ${rejected.length === 1 ? "it is not a built-in tool" : "they are not built-in tools"} that this version of Claude Code can remove. Use bare names such as Agent or TaskStop; patterns such as Bash(rm:*) and MCP tools are not accepted.`;
}
//@ chunk-qchp9vrd.js:284311-284438 placement
function allowsArtifactPublish(e, n) {
  return (
    (n.artifactPublish ?? antEnv.CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH === true) &&
    e.execution.artifact_publish === true
  );
}
//@ chunk-qchp9vrd.js:284438-284747 placement
/**
 * 解析评测套件声明的 GrowthBook 开关覆盖：只保留允许列表（参数或 CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES）中的开关，其余记为丢弃。
 */
function resolveFlagOverrides(e, n) {
  let growthbookOverrides = e.execution.growthbook_overrides ?? {};
  let a = new Set(
    n.allowFlagOverrides ??
      (antEnv.CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES ?? "")
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w.length > 0),
  );
  let s = {};
  let h = [];
  for (let [key, value] of Object.entries(growthbookOverrides))
    if (a.has(key)) s[key] = value;
    else h.push(key);
  return {
    declared: growthbookOverrides,
    seeded: s,
    dropped: h,
  };
}
//@ chunk-qchp9vrd.js:284747-284897 placement
function getRunArms(e, n, r) {
  if (n !== "with-without" || e.pluginDirs.length === 0) return ["with"];
  if (r && e.context.history_file) return ["with"];
  return ["with", "without"];
}
//@ chunk-qchp9vrd.js:284897-285480 placement
function logMockRegistration(runTraceHistory) {
  if (runTraceHistory.mockSetupFailure === "registration")
    logFeatureBad("cli_plugin_eval_mocks", "standin_registration");
  else if (runTraceHistory.mockSetupFailure === "identity")
    logFeatureBad("cli_plugin_eval_mocks", "standin_identity");
  else if (runTraceHistory.mockSetupFailure === "tools_missing")
    logFeatureBad("cli_plugin_eval_mocks", "standin_tools_missing");
  else if (runTraceHistory.mockSetupFailure === "integrity")
    logFeatureBad("cli_plugin_eval_mocks", "standin_integrity");
  else if (
    runTraceHistory.aborted !== null &&
    runTraceHistory.aborted.reason.startsWith(MOCK_RESPONDER_FAILED_TEXT)
  )
    logFeatureSad("cli_plugin_eval_mocks", "agent_relay_failed");
  else if (runTraceHistory.aborted !== null) logFeatureSad("cli_plugin_eval_mocks", "aborted_by_mock");
  else logFeatureOk("cli_plugin_eval_mocks");
}
//@ chunk-qchp9vrd.js:285480-285492 placement
/**
 * 释放资源时的等待（5000 毫秒）。
 */
var DISPOSE_TIMEOUT_MS = 5000;
//@ chunk-qchp9vrd.js:285492-285540 placement
/**
 * 安全计算内容哈希（失败返回空串）。
 */
function safeCanonicalHash(e) {
  try {
    return canonicalHash(e);
  } catch {
    return "";
  }
}
//@ chunk-qchp9vrd.js:285540-287311 placement
/**
 * 校验 trace 中的结果都是 harness 给出的（未被事后篡改）。
 */
function verifyTraceIntegrity(answers, runTraceHistory, r) {
  let a = new Map();
  for (let server of r.servers)
    for (let tool of server.tools)
      if (server.responderKinds[tool] === "agent")
        a.set(server.toolFullNames[tool] ?? "", {
          server: server.dirName,
          tool,
        });
  let s = new Map();
  let h = (T) => jsonStringify([T.tool, T.verdict, T.outputKey]);
  for (let T of answers) {
    let N = s.get(T.server) ?? new Map();
    let x = h(T);
    let j = N.get(x) ?? {
      tool: T.tool,
      inputKeys: [],
      rewritten: 0,
    };
    j.inputKeys.push(T.inputKey);
    N.set(x, j);
    s.set(T.server, N);
  }
  let w = new Map();
  let b = [];
  let y = 0;
  let R = 0;
  for (let toolCall of runTraceHistory.toolCalls) {
    let N = a.get(toolCall.name);
    if (N === undefined || toolCall.mock === undefined) continue;
    if (toolCall.deniedByChild) {
      R++;
      continue;
    }
    if (toolCall.mock.verdict === "no_result") {
      let W = w.get(N.server) ?? new Set();
      W.add(N.tool);
      w.set(N.server, W);
      continue;
    }
    let x = s.get(N.server);
    let j = h({
      tool: N.tool,
      verdict: toolCall.mock.verdict,
      outputKey: outputKey(toolCall.output ?? "", toolCall.mock.verdict),
    });
    let K = x?.get(j);
    if (K === undefined || K.inputKeys.length - K.rewritten <= 0) {
      b.push(
        `${N.server}/${N.tool}: a result in the trace is not one the harness gave \u2014 altered after the stand-in returned it (a PostToolUse hook that rewrites this tool's output does that; a run cannot be graded on answers the harness did not give) or answered by something else`,
      );
      break;
    }
    let index = K.inputKeys.indexOf(safeCanonicalHash(toolCall.input));
    if (index === -1) {
      K.rewritten++;
      y++;
    } else K.inputKeys.splice(index, 1);
  }
  for (let T of s.values()) for (let N of T.values()) N.inputKeys.splice(0, N.rewritten);
  let absorbedInFlightAnswer = false;
  if (b.length === 0)
    for (let [T, N] of s) {
      let flattened = [...N.values()].flatMap(({ tool, inputKeys }) => inputKeys.map(() => tool));
      if (flattened.length === 0) continue;
      if (flattened.length === 1 && runTraceHistory.killedInFlight && w.get(T)?.has(flattened[0])) {
        absorbedInFlightAnswer = true;
        continue;
      }
      b.push(
        `${T}: the harness answered ${flattened.length} agent mock ${plural(flattened.length, "call")} the trace does not show (the responder was reached other than through the mocked tools)`,
      );
      break;
    }
  return {
    mismatch: b.length === 0 ? null : `mocks: ${b.join("; ")}`,
    absorbedInFlightAnswer,
    inputsRewritten: y,
    deniedByChild: R,
  };
}
//@ chunk-qchp9vrd.js:287311-287335 placement
var TRUST_PLUGIN_FLAG = "--trust-plugin";
export { TRUST_PLUGIN_FLAG, runEvalCase };
