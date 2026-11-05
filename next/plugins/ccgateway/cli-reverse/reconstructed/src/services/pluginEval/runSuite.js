/**
 * services/pluginEval/runSuite.ts
 *
 * 2.1.316 新增：plugin eval 运行用例与套件：准备运行目录、跑子会话、评分、汇总报告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { parseRuleString } from "../../utils/permissions/permissionRuleParser.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { logError } from "../../utils/log.js";
import { countWhere } from "../../utils/collections.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-af1hzzme.js:255859-255872 placement
/**
 * 运行期间刷新登录的间隔（60000 毫秒）。
 */
var LOGIN_REFRESH_INTERVAL_MS = 60000;
//@ chunk-af1hzzme.js:255872-256771 placement
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
  async rotate(expiry, requiredExpiry, refresh) {
    if (this.skip !== null && this.skip.expiry === expiry && Date.now() < this.skip.until) return;
    this.leave();
    try {
      this.rotation ??= (async () => {
        if (this.holders > 0) await new Promise((resolve) => this.drainedWaiters.push(resolve));
        let newExpiry;
        try {
          newExpiry = await refresh();
        } catch (error) {
          logForDebugging(`eval: login refresh failed: ${errorMessage(error)}`, {
            level: "error",
          });
          newExpiry = expiry;
        }
        if (newExpiry === null || newExpiry <= expiry)
          this.skip = {
            expiry,
            until: Date.now() + this.retryBackoffMs,
          };
        else if (newExpiry < requiredExpiry)
          this.skip = {
            expiry: newExpiry,
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
//@ chunk-af1hzzme.js:256771-273750 placement
/**
 * 运行单个用例：准备目录与模拟、启动子会话、评分并产出结果（约 17 KB）。
 */
async function runEvalCase(options) {
  let guardedSink = (onNotice) => (notice) => {
    try {
      onNotice(notice);
    } catch (error) {
      logForDebugging(`eval: progress sink failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  };
  let ctx = {
    ...options,
    onLine: guardedSink((line) => options.onLine(replaceControlChars(line))),
    onNotice: guardedSink(options.onNotice),
  };
  let concurrency = ctx.concurrency ?? 1;
  let date = new Date();
  let evalCases = await discoverEvalCases(
    ctx.rootPath,
    {
      caseGlob: ctx.caseGlob,
      tags: ctx.tags,
    },
    {
      evalDirSegments: ctx.evalDirSegments,
      frameRoot: ctx.frameRoot,
      adoptionDecided: ctx.adoptionDecided,
      trust: ctx.trust,
      targetScreened: ctx.targetScreened,
      consentDecided: ctx.consentDecided,
    },
  );
  let { errors, root, suite } = evalCases;
  let runToolRules = buildRunToolRules([], options.allowTools);
  if (runToolRules.denied.length > 0)
    errors.push({
      file: "--allow-tools",
      error: `refused ${plural(runToolRules.denied.length, "entry", "entries")}: malformed, a wildcard tool name the child does not support, or a tool never available in an evaluation (Monitor, EnterWorktree, ExitWorktree): ${runToolRules.denied.join(", ")}`,
    });
  ctx.allowTools = runToolRules.allowed;
  let disallowSplit = splitAllowedTools(options.disallowTools ?? []);
  if (disallowSplit.rejected.length > 0)
    errors.push({
      file: "--disallow-tools",
      error: `${describeUndisallowableTools(disallowSplit.rejected)} No case was run.`,
    });
  else if (disallowSplit.tools.length > 0)
    ctx.onNotice(
      `Removed from Claude's tools in every case (--disallow-tools): ${disallowSplit.tools.join(", ")}`,
    );
  ctx.disallowTools = disallowSplit.tools;
  let cases = disallowSplit.rejected.length > 0 ? [] : evalCases.cases;
  let runnableCases = [];
  for (let evalCase of cases) {
    let { rejected } = splitAllowedTools(evalCase.execution.disallowed_tools ?? []);
    if (rejected.length === 0) {
      runnableCases.push(evalCase);
      continue;
    }
    errors.push({
      file: evalCase.caseSource === "prose" ? evalCase.caseDir : evalCase.caseFile,
      error: `disallowed_tools: ${describeUndisallowableTools(rejected)}`,
    });
  }
  for (let error of errors) ctx.onLine(`\u2717 ${error.file}: ${error.error}`);
  let ablationMode =
    ctx.ablation === "auto"
      ? runnableCases.some((evalCase) => evalCase.pluginDirs.length > 0)
        ? "with-without"
        : "none"
      : ctx.ablation;
  if (ctx.ablation === "auto" && ablationMode === "with-without")
    ctx.onNotice(
      "Ablation: defaulting to with-without \u2014 a plugin resolved from this path, so each case also runs a no-plugin baseline arm (2\xD7 runs) and reports \u0394; " +
        "graders marked with-only (including `tool_used: Skill`) become a plugin-fired indicator rather than part of the score. Pass --ablation none for the previous single-arm run and scoring.",
    );
  let selectedCases = runnableCases;
  if (ctx.ablation === "auto" && ablationMode === "with-without") {
    let filtered = selectedCases.filter((evalCase) => getRunArms(evalCase, ablationMode, true).length === 1);
    if (filtered.length > 0)
      ctx.onNotice(
        `${filtered.length} ${plural(filtered.length, "case")} ${plural(filtered.length, "runs", "run")} single-arm (no \u0394) \u2014 no plugin to strip, or a replay case whose history carries the plugin into both arms: ${filtered.map((evalCase) => evalCase.name).join(", ")}`,
      );
  }
  if (ctx.ablation === "with-without") {
    let filtered = selectedCases.filter((evalCase) => evalCase.pluginDirs.length === 0);
    for (let evalCase of filtered) {
      let problem =
        "ablation requested but no plugin resolved for this case: auto-detection found no plugin.json, .claude-plugin/plugin.json, or SKILL.md " +
        "it may load between the case directory and the discovery root \u2014 " +
        `a manifest or skill folder that ${UNTRUSTED_FOLDER_REASON} is not loaded. The with and without arms would run identical ` +
        "configs, so \u0394 would measure nothing. Fix: target the plugin " +
        "directory itself (or run from within it), declare `plugins:` in the case pointing at a plugin or skill directory beneath the discovery root, or pass --ablation none for a single-arm eval.";
      errors.push({
        file: evalCase.caseSource === "prose" ? evalCase.caseDir : evalCase.caseFile,
        error: problem,
      });
      ctx.onLine(`\u2717 ${evalCase.name}: ${problem}`);
    }
    if (filtered.length > 0)
      selectedCases = selectedCases.filter((evalCase) => evalCase.pluginDirs.length > 0);
  }
  if (selectedCases.length === 0)
    return {
      report: buildSuiteReport(
        [],
        date,
        ctx.signal.aborted ? "interrupted" : undefined,
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        [],
        concurrency,
      ),
      exitCode: ctx.signal.aborted ? 2 : errors.length > 0 ? 1 : 0,
      errors,
      ablation: ablationMode,
      root,
      suite,
      resolvedCases: [],
      harnessFailures: 0,
    };
  checkDuplicateCaseNames(selectedCases, ctx.onLine);
  let caseTargetPath = await resolveCaseTargetPath(
    selectedCases.flatMap((evalCase) => evalCase.pluginDirs),
    root,
    ctx.frameRoot,
  );
  if (caseTargetPath.length === 0)
    ctx.onLine("Plugin under test: none resolved \u2014 cases run against baseline Claude Code");
  let isAblation = ablationMode === "with-without";
  let armLabel = isAblation ? "the with-arm" : "this eval";
  for (let target of caseTargetPath) {
    let versionText =
      target.version === undefined ? "(no version)" : `version ${quotedShort(target.version, 80)}`;
    (target.problem === undefined ? ctx.onLine : ctx.onNotice)(
      `Plugin under test: ${quotedShort(target.name, 160)} ${versionText} at ${quotedShort(target.path, 1000)}`,
    );
    let problem =
      target.problemDetail === undefined
        ? undefined
        : printableName(target.problemDetail.replace(invisiblePatternAccessor(), " "), 300);
    let problemSuffix = problem === undefined ? "" : ` (${problem})`;
    switch (target.problem) {
      case undefined:
        break;
      case "manifest_invalid":
        ctx.onNotice(
          ctx.mocks !== "off" && ctx.allowRealServers !== true
            ? `  \u26A0 its manifest is invalid${problemSuffix}: its cases are refused (record mode cannot enumerate the MCP servers it declares) \u2014 fix the manifest, or pass --mocks off / --allow-real-servers to run ${armLabel} WITHOUT this plugin`
            : `  \u26A0 its manifest is invalid${problemSuffix}, so ${armLabel} will run WITHOUT this plugin`,
        );
        break;
      case "identity_unverified":
        ctx.onNotice(
          `  \u26A0 identity not verified${problemSuffix}; the child decides at load time whether it loads${isAblation ? ' \u2014 read a zero \u0394 here as "may not have loaded"' : ""}`,
        );
        break;
      case "disabled_by_default":
        ctx.onNotice(
          `  \u26A0 its manifest sets defaultEnabled: false and nothing in the eval sandbox enables it, so ${armLabel} will run WITHOUT this plugin`,
        );
        break;
      case "archive_not_probed":
        ctx.onNotice(
          "  \u26A0 a plugin archive: its identity was not probed here \u2014 the child extracts and loads what is inside it",
        );
        break;
      case "will_not_load": {
        let problemText = problem ?? "nothing loadable at this path";
        ctx.onNotice(`  \u26A0 ${problemText}, so ${armLabel} will run WITHOUT this plugin`);
        break;
      }
    }
  }
  {
    let preflight = await ctx.authPreflight();
    if (ctx.signal.aborted)
      return {
        report: buildSuiteReport(
          [],
          date,
          "interrupted",
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
        ablation: ablationMode,
      };
    if (!preflight.ok) {
      let preflightFailure = `authentication check failed before running any case \u2014 every run would use this same credential: ${preflight.message}`;
      errors.push({
        file: root,
        error: preflightFailure,
      });
      ctx.onLine(`\u2717 ${preflightFailure}`);
      return {
        report: buildSuiteReport(
          [],
          date,
          "auth_failed",
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
        ablation: ablationMode,
        authPreflightFailed: true,
      };
    }
    if (preflight.warning !== undefined) ctx.onNotice(`Note: ${preflight.warning}`);
  }
  try {
    await checkGitVersionForEval(subprocessEnv());
  } catch (error) {
    let message = errorMessage(error);
    errors.push({
      file: root,
      error: message,
    });
    ctx.onLine(`\u2717 ${message}`);
    return {
      report: buildSuiteReport(
        [],
        date,
        undefined,
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
      ablation: ablationMode,
      gitPreflightFailed: true,
    };
  }
  if (ctx.maxCostUsd === undefined && selectedCases.some((evalCase) => allowsArtifactPublish(evalCase, ctx)))
    ctx.onNotice("Note: artifact publishing enabled with no --max-cost-usd; consider setting a cost ceiling");
  let advisories = new Map();
  let mocksByCase = new Map();
  let mockNotes = new Map();
  if (ctx.mocks !== "off") {
    let mockState = emptyMockState();
    for (let evalCase of selectedCases)
      try {
        let enumerated = await enumerateMockedServersForRun(evalCase, root, ctx.evalDirSegments, mockState, {
          allowRealServers: ctx.allowRealServers === true,
        });
        mocksByCase.set(evalCase, enumerated.servers);
        for (let note of enumerated.notes) ctx.onNotice(replaceControlChars(`  ${evalCase.name}: ${note}`));
        mockNotes.set(evalCase, enumerated.notes);
      } catch (error) {
        mocksByCase.set(
          evalCase,
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
  let mocksFor = (evalCase) => {
    let mocks = mocksByCase.get(evalCase);
    return mocks === undefined || mocks instanceof Error ? [] : mocks;
  };
  for (let evalCase of selectedCases) {
    if (evalCase.context.scaffold_script && ctx.noScaffold)
      ctx.onNotice(
        `\u26A0 case "${evalCase.name}": its scaffold_script is not run without --scaffold (author-supplied bash that runs as you - pass it only for suites you trust); the case runs against an unstaged workspace`,
      );
    let problems = checkGradersSatisfiable(evalCase, ctx.allowTools, {
      scaffolded: !!evalCase.context.scaffold_script && !ctx.noScaffold,
      artifactPublishGranted: allowsArtifactPublish(evalCase, ctx),
      disallowedTools: mergedDisallowedTools(evalCase, ctx),
      mockedTools: listMockedToolNames(mocksFor(evalCase)),
      withheldServers: withheldSegments(mocksFor(evalCase)),
    });
    if (problems.length > 0) {
      advisories.set(evalCase, problems);
      for (let advisory of problems) ctx.onNotice(`\u26A0 case "${evalCase.name}": ${advisory.text}`);
    }
  }
  if (ablationMode === "with-without") {
    let reduced = selectedCases.reduce(
      (acc, evalCase) =>
        acc +
        (ctx.runs ?? evalCase.runs) * getRunArms(evalCase, ablationMode, ctx.ablation === "auto").length,
      0,
    );
    ctx.onLine(
      `Ablation: 2 arms \xD7 ${selectedCases.length} ${plural(selectedCases.length, "case")} (${reduced} ${plural(reduced, "run")})`,
    );
  }
  let runState = {
    spent: 0,
    partialReason: undefined,
    authBackstopArmed: true,
    agentService: null,
    agentServiceStarting: null,
    costCeilingAnnounced: false,
    harnessFailures: 0,
    tokenGate: new EvalLoginRefresher(),
  };
  await using agentServiceGuard = {
    async [Symbol.asyncDispose]() {
      let agentService =
        runState.agentService ??
        (runState.agentServiceStarting !== null
          ? await runState.agentServiceStarting.catch(() => null)
          : null);
      runState.agentService = null;
      runState.agentServiceStarting = null;
      if (agentService !== null) await agentService.close();
    },
  };
  if (concurrency > 1)
    ctx.onLine(
      `Concurrency: up to ${concurrency} runs in flight (all children share your rate limit; progress lines interleave, results keep case order)`,
    );
  let resultsByCase = new Map();
  let plans = [];
  let failCase = (evalCase, error) => {
    resultsByCase.set(evalCase, {
      case_: evalCase,
      report: {
        name: evalCase.name,
        dir: relativeCaseDir(root, evalCase),
        source: evalCase.caseSource,
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
  let prepareCase = (evalCase) => {
    let runs = ctx.runs ?? evalCase.runs;
    let artifactPublish = allowsArtifactPublish(evalCase, ctx);
    let mocks = mocksByCase.get(evalCase);
    let mockList = mocksFor(evalCase);
    if (mocks instanceof Error) {
      logFeatureBad("cli_plugin_eval_mocks", "load_failed");
      let error = replaceControlChars(mocks.message);
      ctx.onLine(`  ${evalCase.name}: ${error}`);
      failCase(evalCase, error);
      return null;
    }
    if (mockList.length > 0) {
      ctx.onLine(replaceControlChars(`  ${evalCase.name}: mocked: ${describeMockMode(mockList)}`));
      if (usesAgentResponder(mockList))
        ctx.onLine(
          replaceControlChars(
            `  ${evalCase.name}: mock budget = ${CALLS_PER_TURN}\xD7max_turns = ${callBudgetForTurns(evalCase.execution.max_turns)} agent-answered calls per run, shared by all mocked servers (model: ${normalizeJudgeModel(ctx.judgeModel) ?? "default small model"}, shared with --judge-model)`,
          ),
        );
    }
    let disallowedTools = mergedDisallowedTools(evalCase, ctx);
    let runToolRules = buildRunToolRules(evalCase.execution.allowed_tools, ctx.allowTools, {
      artifactPublishGranted: artifactPublish,
      mockedTools: listMockedToolNames(mockList),
      disallowedTools,
    });
    let tools = splitAllowedTools(evalCase.execution.disallowed_tools ?? []).tools;
    if (tools.length > 0)
      ctx.onNotice(
        replaceControlChars(
          `  ${evalCase.name}: removed from Claude's tools by the case's disallowed_tools: ${tools.join(", ")}`,
        ),
      );
    if (runToolRules.denied.length > 0)
      ctx.onLine(
        replaceControlChars(
          `  ${evalCase.name}: not granted (missing --allow-tools grant, or a malformed entry): ${runToolRules.denied.join(", ")}`,
        ),
      );
    let grantsArtifact = (rules) =>
      splitRuleList([rules.join(",")]).some((rule) => parseRuleString(rule).toolName === ARTIFACT_TOOL_NAME);
    if ((grantsArtifact(runToolRules.denied) || grantsArtifact(ctx.allowTools)) && !artifactPublish)
      ctx.onLine(
        `  ${evalCase.name}: the ${ARTIFACT_TOOL_NAME} tool is not available inside eval runs; --allow-tools cannot enable it`,
      );
    if (evalCase.execution.artifact_publish === true && !artifactPublish)
      ctx.onLine(
        `  ${evalCase.name}: requests artifact publishing; not granted (operator opt-in required) \u2014 running without it`,
      );
    let flagOverrides = resolveFlagOverrides(evalCase, ctx);
    let grant = {
      granted: artifactPublish,
      seededFlags: flagOverrides.seeded,
    };
    if (Object.keys(flagOverrides.declared).length > 0)
      if (!artifactPublish)
        ctx.onLine(
          `  ${evalCase.name}: growthbook_overrides not applied \u2014 they seed only a run granted artifact publishing`,
        );
      else {
        if (Object.keys(flagOverrides.seeded).length > 0)
          ctx.onLine(
            `  ${evalCase.name}: seeding growthbook_overrides ${jsonStringify(flagOverrides.seeded)}`,
          );
        if (flagOverrides.dropped.length > 0)
          ctx.onLine(
            `  ${evalCase.name}: growthbook_overrides dropped (operator allowlist required \u2014 CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES): ${jsonStringify(flagOverrides.dropped)}`,
          );
      }
    let mapped = getRunArms(evalCase, ablationMode, ctx.ablation === "auto").map((arm) => ({
      arm,
      armCase:
        arm === "without"
          ? {
              ...evalCase,
              pluginDirs: [],
            }
          : evalCase,
      allowed:
        arm === "without" && mockList.length > 0
          ? buildRunToolRules(evalCase.execution.allowed_tools, ctx.allowTools, {
              artifactPublishGranted: artifactPublish,
              mockedTools: listMockedToolNames(filterForArm(mockList, arm)),
              disallowedTools,
            }).allowed
          : runToolRules.allowed,
    }));
    let plan = {
      case_: evalCase,
      runs,
      grant,
      mockServers: mockList,
      mockNotes: mockNotes.get(evalCase) ?? [],
      arms: mapped,
      results: new Map(mapped.map((arm) => [arm.arm, Array(runs)])),
      landed: 0,
      finalized: false,
    };
    plans.push(plan);
    return plan;
  };
  let finalizeCase = (plan) => {
    if (plan.finalized) return;
    plan.finalized = true;
    let case_ = plan.case_;
    let runsFor = (arm) => plan.results.get(arm)?.filter((run) => run !== undefined);
    let withRuns = runsFor("with") ?? [];
    let withoutRuns = runsFor("without");
    if (withRuns.length === 0 && runState.partialReason) return;
    let { score, passRate } = aggregateRunScores(withRuns);
    let withoutAggregate =
      withoutRuns && withoutRuns.length > 0 ? aggregateRunScores(withoutRuns) : undefined;
    let hasPaidSkips = (runs) => !!runs?.some((run) => run.skipped_paid_graders);
    let sawApiError =
      withRuns.some((run) => run.ended_on_api_error) || !!withoutRuns?.some((run) => run.ended_on_api_error);
    let complete = !hasPaidSkips(withRuns) && !hasPaidSkips(withoutRuns) && !sawApiError;
    resultsByCase.set(case_, {
      case_,
      report: {
        name: case_.name,
        dir: relativeCaseDir(root, case_),
        source: case_.caseSource,
        score,
        pass_rate: passRate,
        runs: withRuns,
        ...(advisories.has(case_) && {
          advisories: advisories.get(case_),
        }),
        ...(withoutAggregate &&
          withoutRuns && {
            pass_rate_without: withoutAggregate.passRate,
            runs_without: withoutRuns,
            ...(complete && {
              score_without: withoutAggregate.score,
              delta: score - withoutAggregate.score,
            }),
          }),
      },
    });
    let runCount = withRuns.length + (withoutRuns?.length ?? 0);
    let totalCost =
      withRuns.reduce((acc, run) => acc + run.cost_usd, 0) +
      (withoutRuns?.reduce((acc, run) => acc + run.cost_usd, 0) ?? 0);
    if (withoutAggregate && complete) {
      let delta = score - withoutAggregate.score;
      let deltaSign = delta > 0 ? "+" : "";
      ctx.onLine(
        `${score >= ctx.threshold ? "\u2713" : "\u2717"} ${case_.name}  with ${score.toFixed(2)}  without ${withoutAggregate.score.toFixed(2)}  \u0394 ${deltaSign}${delta.toFixed(2)}  (${runCount} ${plural(runCount, "run")})  $${totalCost.toFixed(2)}`,
      );
    } else if (withoutAggregate)
      ctx.onLine(
        `${score >= ctx.threshold ? "\u2713" : "\u2717"} ${case_.name}  with ${score.toFixed(2)}  \u0394 \u2014 (${sawApiError ? "a run ended on an API error and was not graded" : "cost ceiling: arms graded under different rules"})  (${runCount} ${plural(runCount, "run")})  $${totalCost.toFixed(2)}`,
      );
    else
      ctx.onLine(
        `${score >= ctx.threshold ? "\u2713" : "\u2717"} ${case_.name}  score ${score.toFixed(2)}  (${withRuns.length} ${plural(withRuns.length, "run")})  $${totalCost.toFixed(2)}`,
      );
  };
  function* runAllCases() {
    let finalizeAll = () => {
      if (runState.partialReason === undefined && ctx.signal.aborted) runState.partialReason = "interrupted";
      return runState.partialReason !== undefined;
    };
    for (let evalCase of selectedCases) {
      if (finalizeAll()) return;
      let plan;
      try {
        plan = prepareCase(evalCase);
      } catch (error) {
        logForDebugging(`eval case plan: ${errorMessage(error)}`, {
          level: "error",
        });
        let caseResult =
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            ? error.message
            : (getErrnoCode(error) ?? "unknown error");
        failCase(evalCase, `case could not be planned (${caseResult}) \u2014 see the debug log`);
        runState.harnessFailures++;
        continue;
      }
      if (plan === null) continue;
      for (let arm of plan.arms)
        for (let j = 0; j < plan.runs; j++) {
          if (finalizeAll()) return;
          yield {
            plan,
            arm,
            index: j,
          };
        }
    }
  }
  await pMap(
    runAllCases(),
    async ({ plan, arm, index }) => {
      let runCount = plan.arms.length * plan.runs;
      if (ctx.signal.aborted) runState.partialReason ??= "interrupted";
      else if (
        ctx.maxCostUsd !== undefined &&
        runState.spent >= ctx.maxCostUsd &&
        runState.partialReason === undefined
      )
        runState.partialReason = "cost_ceiling";
      if (runState.partialReason === "cost_ceiling" && !runState.costCeilingAnnounced) {
        runState.costCeilingAnnounced = true;
        ctx.onLine(`\u26A0 cost ceiling $${ctx.maxCostUsd} hit; skipping remaining cases`);
      }
      if (runState.partialReason) return;
      let line = await formatCaseResultLine(
        arm.armCase,
        index,
        plan.runs,
        arm.allowed,
        plan.grant,
        ctx,
        runState,
        plan.arms.length > 1 ? arm.arm : undefined,
        plan.mockServers,
        plan.mockNotes,
      ).catch((error) => {
        logForDebugging(`eval run setup: ${errorMessage(error)}`, {
          level: "error",
        });
        let error_2 = `run could not start (${error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.message : (getErrnoCode(error) ?? "unknown error")}) \u2014 see the debug log`;
        runState.harnessFailures++;
        ctx.onLine(
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
      plan.results.get(arm.arm)[index] = line;
      plan.landed++;
      if (plan.landed === runCount) finalizeCase(plan);
    },
    {
      concurrency,
      stopOnError: false,
    },
  ).catch((error) => {
    let errorsList = error instanceof AggregateError ? error.errors : [error];
    for (let error of errorsList) logError(error);
    runState.harnessFailures += errorsList.length;
  });
  for (let plan of plans) finalizeCase(plan);
  if (ctx.maxCostUsd !== undefined && runState.spent > ctx.maxCostUsd && !runState.costCeilingAnnounced) {
    runState.costCeilingAnnounced = true;
    ctx.onNotice(
      `\u26A0 cost ceiling $${ctx.maxCostUsd} exceeded: $${runState.spent.toFixed(2)} spent by runs already in flight when it was crossed; nothing was skipped`,
    );
  }
  let flattened = selectedCases.flatMap((evalCase) => {
    let result = resultsByCase.get(evalCase);
    return result === undefined ? [] : [result];
  });
  if (runState.partialReason === undefined && ctx.signal.aborted) runState.partialReason = "interrupted";
  let suiteReport = buildSuiteReport(
    flattened,
    date,
    runState.partialReason,
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    caseTargetPath,
    concurrency,
  );
  let all = suiteReport.cases.every((caseReport) => caseReport.score >= ctx.threshold);
  if (runState.harnessFailures > 0)
    ctx.onNotice(
      `\u26A0 ${runState.harnessFailures} ${plural(runState.harnessFailures, "run")} could not be started by the harness (see the errors above and the debug log); the suite exits non-zero regardless of scores`,
    );
  let apiErrorCount = countWhere(
    suiteReport.cases.flatMap((caseReport) => caseReport.runs.concat(caseReport.runs_without ?? [])),
    (run) => run.ended_on_api_error === true,
  );
  if (apiErrorCount > 0)
    ctx.onNotice(
      `\u26A0 ${apiErrorCount} ${plural(apiErrorCount, "run")} ended on an API error and scored 0 without grading (each run's error is on its progress line above, or in its \`error\` field under --json); fix the cause and re-run \u2014 the suite exits non-zero regardless of scores`,
    );
  let exitCode = runState.partialReason
    ? 2
    : all && errors.length === 0 && runState.harnessFailures === 0 && apiErrorCount === 0
      ? 0
      : 1;
  return {
    report: suiteReport,
    exitCode,
    errors,
    root,
    suite,
    resolvedCases: flattened,
    ablation: ablationMode,
    harnessFailures: runState.harnessFailures,
  };
}
//@ chunk-af1hzzme.js:273750-273759 placement
/**
 * 启动失败重试次数（2）。
 */
var MAX_START_RETRIES = 2;
//@ chunk-af1hzzme.js:273759-274730 placement
async function formatCaseResultLine(
  caseSpec,
  index,
  runs,
  allowedTools,
  grant,
  progress,
  budget,
  arm,
  mockServers = [],
  mockNotes = [],
) {
  let now = Date.now();
  let report = await runEvalSuite(
    caseSpec,
    allowedTools,
    grant,
    progress,
    mockServers,
    mockNotes,
    budget,
    arm,
  );
  report.started_at = new Date(now).toISOString();
  report.duration_seconds = Math.round((Date.now() - now) / 1000);
  budget.spent += report.cost_usd;
  let armSuffix = arm ? ` [${arm}]` : "";
  let detail = report.error
    ? `  error: ${oneLineMessage(report.error)}`
    : report.aborted
      ? `  aborted by mock ${report.aborted.server}/${report.aborted.tool}: ${oneLineMessage(replaceControlChars(report.aborted.reason))}`
      : "";
  progress.onLine(
    `  ${caseSpec.name} run ${index + 1}/${runs}${armSuffix}: score ${report.score.toFixed(2)}  $${report.cost_usd.toFixed(2)}${detail}`,
  );
  for (let grader of report.graders) {
    let weightNote = grader.with_only ? " [with-only, not scored]" : ` (weight ${grader.weight})`;
    progress.onLine(
      `    ${grader.passed ? "\u2713" : "\u2717"} ${replaceControlChars(grader.name)}${weightNote}: ${oneLineMessage(grader.explanation)}`,
    );
  }
  let authBackstopArmed = budget.authBackstopArmed;
  if (report.auth_rejected !== undefined) budget.authBackstopArmed = false;
  if (authBackstopArmed && report.auth_rejected === true && budget.partialReason === undefined) {
    budget.partialReason = "auth_failed";
    progress.onLine(
      "\u26A0 a run could not authenticate \u2014 every remaining run would fail the same way, so the suite stops here. Fix the credential above and re-run.",
    );
  }
  return report;
}
//@ chunk-af1hzzme.js:274730-274791 placement
/**
 * 把多行文本压成一行并截断到 200 字符。
 */
function oneLineMessage(text) {
  return truncateWithCount(replaceControlChars(text.replace(/\s*\n\s*/g, " ")), 200);
}
//@ chunk-af1hzzme.js:274791-275055 placement
function checkDuplicateCaseNames(cases, onLine) {
  let dirsByName = new Map();
  for (let caseSpec of cases) {
    let dirs = dirsByName.get(caseSpec.name) ?? [];
    dirs.push(caseSpec.caseDir);
    dirsByName.set(caseSpec.name, dirs);
  }
  for (let [caseName, dirs] of dirsByName)
    if (dirs.length > 1)
      onLine(
        replaceControlChars(
          `\u26A0 ${dirs.length} cases share the name "${caseName}" (${dirs.join(", ")}); the report and --case filter cannot distinguish them`,
        ),
      );
}
//@ chunk-af1hzzme.js:275055-275123 placement
/**
 * 计算用例目录相对于根目录的路径。
 */
function relativeCaseDir(root, evalCase) {
  let relativePath = path.relative(root, evalCase.caseDir);
  return relativePath === "" ? "." : relativePath;
}
//@ chunk-af1hzzme.js:275123-282455 placement
/**
 * 运行全部用例（with/without 插件对比）、脚手架与结果汇总（约 7 KB）。
 */
async function runEvalSuite(caseSpec, allowedTools, grant, options, mockServers, mockNotes, suiteState, arm) {
  let publishLogged = false;
  let logPublishOutcome = (outcome) => {
    if (publishLogged) return;
    publishLogged = true;
    logArtifactPublishOutcome(grant, arm, outcome);
  };
  let evalTempDir = await createEvalTempDir();
  let runFailed = false;
  let holdingToken = false;
  let mocks = null;
  let costUsd = 0;
  try {
    if (caseSpec.context.scaffold_script && !options.noScaffold) {
      let scaffoldPath = await checkCaseInsideRoot(caseSpec, caseSpec.context.scaffold_script);
      options.onLine(replaceControlChars(`  scaffold: ${scaffoldPath}`));
      let scaffoldResult = await runScaffoldCommand(scaffoldPath, evalTempDir, options.signal);
      if (scaffoldResult.code !== 0) {
        runFailed = true;
        logPublishOutcome({
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
          error: replaceControlChars(
            `scaffold failed (exit ${scaffoldResult.code}): ${takeLastChars(scaffoldResult.stderr, 500)}`,
          ),
        };
      }
    }
    await suiteState.tokenGate.enter();
    holdingToken = true;
    let auth = await checkEvalAuthPreflight(
      options.credentials,
      caseSpec.execution.timeout_seconds,
      (expiresAt, requiredAt, refresh) => suiteState.tokenGate.rotate(expiresAt, requiredAt, refresh),
    );
    if (auth?.warning) options.onLine(`  \u26A0 ${auth.warning}`);
    try {
      if (usesAgentResponder(filterForArm(mockServers, arm)))
        for (let j = 1; suiteState.agentService === null; j++) {
          suiteState.agentServiceStarting ??= createMockRelayPipe({
            credentials: options.credentials,
          }).catch((error) => {
            suiteState.agentServiceStarting = null;
            throw error;
          });
          try {
            suiteState.agentService = await suiteState.agentServiceStarting;
          } catch (error) {
            if (j >= MAX_START_RETRIES) throw error;
          }
        }
      mocks = await writeRunMocks(mockServers, arm, evalTempDir, {
        maxTurns: caseSpec.execution.max_turns,
        model: normalizeJudgeModel(options.judgeModel) ?? null,
        service: suiteState.agentService,
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
    let filesBefore = await listRunDirFiles(evalTempDir.cwd);
    if (await prepareRunDirectory(evalTempDir.cwd, filesBefore, "scaffold"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the case's scaffold created ${EVAL_ARTIFACTS_DIR}/ in the run's working directory \u2014 that name is reserved for the run's artifact publishes; have the scaffold use another name`,
        "eval scaffold created the reserved publish directory",
      );
    let runTraceHistory = await readRunTraceHistory({
      case_: caseSpec,
      sandbox: evalTempDir,
      allowedTools,
      disallowedTools: mergedDisallowedTools(caseSpec, options),
      operatorAllowedTools: options.allowTools,
      modelOverride: options.model,
      artifactPublishGranted: grant.granted,
      growthbookOverrides: grant.seededFlags,
      verbose: options.verbose,
      mocks: mocks ?? undefined,
      signal: options.signal,
      credential: auth,
    });
    holdingToken = false;
    suiteState.tokenGate.leave();
    costUsd = runTraceHistory.costUsd;
    logPublishOutcome({
      published: runTraceHistory.artifactPublishes.length > 0,
      errored: runTraceHistory.error !== null || runTraceHistory.timedOut,
    });
    let agentRun = mocks?.agentRun ?? null;
    let inputsRewrittenNote = null;
    let inFlightAnswerLost = false;
    let deniedByChildNote = null;
    if (agentRun !== null && mocks) {
      let inFlight = agentRun.state.inFlight;
      agentRun.dispose();
      await withDeadline(agentRun.settled(), DISPOSE_TIMEOUT_MS);
      if (runTraceHistory.aborted === null && agentRun.state.aborted !== null)
        runTraceHistory.aborted = agentRun.state.aborted;
      runTraceHistory.costUsd += agentRun.state.costUsd;
      costUsd = runTraceHistory.costUsd;
      let integrity = verifyTraceIntegrity(agentRun.state.answers, runTraceHistory, mocks);
      if (integrity.deniedByChild > 0)
        deniedByChildNote = `${integrity.deniedByChild} agent-mock ${plural(integrity.deniedByChild, "call")} ${plural(integrity.deniedByChild, "was", "were")} refused by the child itself (a permission rule or the plugin's own PreToolUse hook) \u2014 never relayed, so abort_when was not judged for ${plural(integrity.deniedByChild, "it", "them")} and the model read the refusal text, not a mock answer`;
      if (integrity.inputsRewritten > 0)
        inputsRewrittenNote = `${integrity.inputsRewritten} agent-mock ${plural(integrity.inputsRewritten, "call")} reached the mock with arguments different from the model's tool_use (rewritten before dispatch, e.g. by a plugin PreToolUse hook) \u2014 abort_when and the responder judged the rewritten arguments; the transcript shows the model's`;
      if (runTraceHistory.aborted === null && runTraceHistory.mockSetupFailure === null) {
        if (integrity.mismatch !== null) {
          runTraceHistory.mockSetupFailure = "integrity";
          runTraceHistory.error =
            runTraceHistory.error === null
              ? integrity.mismatch
              : `${runTraceHistory.error} \xB7 ${integrity.mismatch}`;
        } else if (integrity.absorbedInFlightAnswer || inFlight > 0) {
          runTraceHistory.mockSetupFailure = "integrity";
          inFlightAnswerLost = true;
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
    costUsd = runTraceHistory.costUsd;
    if (mocks)
      if (inFlightAnswerLost) logFeatureSad("cli_plugin_eval_mocks", "agent_call_in_flight");
      else logMockRegistration(runTraceHistory);
    let mocksSummary = mocks
      ? {
          servers: mocks.servers.map((server) => ({
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
            ...mockNotes,
            ...describeMissingToolsJsonEntry(filterForArm(mockServers, arm)),
            ...(inputsRewrittenNote === null ? [] : [inputsRewrittenNote]),
            ...(deniedByChildNote === null ? [] : [deniedByChildNote]),
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
      if (runTraceHistory.mockSetupFailure !== null) runFailed = true;
      if (runTraceHistory.aborted?.reason.startsWith(MOCK_RESPONDER_FAILED_TEXT)) runFailed = true;
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
        ...(mocksSummary && {
          mocks: mocksSummary,
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
      runFailed = true;
      return {
        score: 0,
        turns: runTraceHistory.numTurns,
        cost_usd: runTraceHistory.costUsd,
        judge_cost_usd: 0,
        graders: [],
        trace_path: runTraceHistory.tracePath,
        error: runTraceHistory.error === null ? null : replaceControlChars(runTraceHistory.error),
        ended_on_api_error: true,
        ...(mocksSummary && {
          mocks: mocksSummary,
        }),
        ...(runTraceHistory.authRejected !== null && {
          auth_rejected: runTraceHistory.authRejected,
        }),
      };
    }
    let filesAfter = await listRunDirFiles(evalTempDir.cwd);
    if (await prepareRunDirectory(evalTempDir.cwd, filesAfter, "run"))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the run created ${EVAL_ARTIFACTS_DIR}/ in its working directory \u2014 that name is reserved for the run's artifact publishes, so its file evidence cannot be trusted`,
        "eval run planted the reserved publish directory",
      );
    if (grant.granted) {
      let stubDir = stubPublishDir(evalTempDir);
      if (
        (await lstat(stubDir).catch((error) => {
          if (isENOENT(error)) return null;
          logForDebugging(`eval: cannot examine ${stubDir}: ${errorMessage(error)}`, {
            level: "warn",
          });
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `the run's artifact-publish staging directory could not be examined (${getErrnoCode(error) ?? "unknown error"}), so its file evidence cannot be trusted`,
            "eval stub publish staging dir unreadable",
          );
        })) !== null
      )
        for (let relativeFile of await listRunDirFiles(stubDir))
          filesAfter.add(`${EVAL_ARTIFACTS_DIR}/${relativeFile}`);
    }
    let cwdDiff = diffSortedLines(filesBefore, filesAfter);
    let skipPaidGraders =
      options.maxCostUsd !== undefined && runTraceHistory.costUsd >= options.maxCostUsd - suiteState.spent;
    let { results, judgeCostUsd, paidGradersSkipped } = await gradeCase({
      case_: caseSpec,
      run: runTraceHistory,
      cwdDiff,
      sandboxCwd: evalTempDir.cwd,
      stubPublishDir: grant.granted ? stubPublishDir(evalTempDir) : undefined,
      judgeModel: options.judgeModel,
      skipPaidGraders,
      arm,
      mockCallsWithOnly: isWithoutArmEmpty(mockServers, arm),
      signal: options.signal,
      credentials: options.credentials,
    });
    if (runTraceHistory.error !== null) runFailed = true;
    return {
      score: computeWeightedScore(results),
      turns: runTraceHistory.numTurns,
      cost_usd: runTraceHistory.costUsd + judgeCostUsd,
      judge_cost_usd: judgeCostUsd,
      graders: results,
      trace_path: runTraceHistory.tracePath,
      error: runTraceHistory.error === null ? null : replaceControlChars(runTraceHistory.error),
      ...(mocksSummary && {
        mocks: mocksSummary,
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
    runFailed = true;
    logPublishOutcome({
      published: false,
      errored: true,
    });
    return {
      score: 0,
      turns: 0,
      cost_usd: costUsd > 0 ? costUsd : (mocks?.agentRun?.state.costUsd ?? 0),
      judge_cost_usd: 0,
      graders: [],
      trace_path: "",
      error: replaceControlChars(errorMessage(error)),
    };
  } finally {
    if (holdingToken) suiteState.tokenGate.leave();
    mocks?.agentRun?.dispose();
    await rm_2(path.join(evalTempDir.outDir, MOCKS_JSON_FILE), {
      force: true,
    }).catch(() => {});
    await rm_2(path.join(evalTempDir.configDir, SETTINGS_FILENAME_ALIAS), {
      force: true,
    }).catch(() => {});
    let keepFailedRun = runFailed && options.keepFailedRuns && !options.signal.aborted;
    if (options.keepTemp || keepFailedRun) {
      let sealResult = await sealKeptSandbox(evalTempDir).then(
        (sealed) => ({
          sealed,
          error: null,
        }),
        (error) => ({
          sealed: null,
          error: errorMessage(error),
        }),
      );
      options.onLine(
        `  kept temp${keepFailedRun && !options.keepTemp ? " (run failed)" : ""}: ${evalTempDir.root}`,
      );
      options.onNotice(
        sealResult.sealed !== null
          ? `\u26A0 kept ${evalTempDir.root}: ${formatSealedKeptNotice(evalTempDir, sealResult.sealed)}`
          : `\u26A0 kept ${evalTempDir.root}: could NOT seal what the plugin under test wrote (${sealResult.error}) \u2014 everything in it except out/ and config/ may be agent-written, wherever it now sits (modes were closed as far as possible); read out/ if you need it, do not run git or anything that loads configuration from a working directory anywhere inside, and remove it (\`${formatRemoveRunDirCommand(evalTempDir.root)}\`)`,
      );
    } else
      await evalTempDir.cleanup().catch((error) => {
        options.onNotice(
          `\u26A0 could not remove ${evalTempDir.root} (${errorMessage(error)}); it holds what the plugin under test wrote \u2014 do not run git or anything that loads configuration from a working directory inside it, and remove it (\`${formatRemoveRunDirCommand(evalTempDir.root)}\`)`,
        );
      });
  }
}
//@ chunk-af1hzzme.js:282455-283191 placement
async function runScaffoldCommand(scriptPath, evalTempDir, signal) {
  return await new Promise((resolve) => {
    let stderrText = "";
    let child = spawn("bash", [scriptPath], {
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
    let timer = setTimeout((proc) => proc.kill("SIGKILL"), 120000, child);
    let killScaffold = () => child.kill("SIGKILL");
    if (signal.aborted) killScaffold();
    else
      signal.addEventListener("abort", killScaffold, {
        once: true,
      });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      if (stderrText.length < 16384) stderrText += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", killScaffold);
      resolve({
        code: 127,
        stderr: String(error),
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", killScaffold);
      resolve({
        code,
        stderr: stderrText,
      });
    });
  });
}
//@ chunk-af1hzzme.js:283191-283378 placement
async function listRunDirFiles(root) {
  let files = new Set();
  let cwdStats = await lstat(root).catch(() => null);
  if (
    cwdStats === null ||
    !cwdStats.isDirectory() ||
    cwdStats.isSymbolicLink() ||
    (await realpath(root).catch(() => null)) !== root
  )
    throw checkRunDirUnchanged();
  await walkRunDir(root, "", files, 0);
  return files;
}
//@ chunk-af1hzzme.js:283378-283683 placement
function checkRunDirUnchanged() {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "the run directory (or a directory inside it) is no longer the one the harness listed, or cannot be listed \u2014 moved, removed, replaced by a link, made unreadable, or too deep or too large to walk \u2014 so its file evidence cannot be trusted",
    "eval run directory replaced",
  );
}
//@ chunk-af1hzzme.js:283683-284270 placement
async function prepareRunDirectory(cwd, files, phase) {
  let lower = EVAL_ARTIFACTS_DIR.toLowerCase();
  let reservedState = await lstat(path.join(cwd, EVAL_ARTIFACTS_DIR)).then(
    (stats) => (phase === "run" && stats.isFile() && stats.size === 0 ? "placeholder" : "present"),
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
  if (reservedState === "placeholder") files.delete(EVAL_ARTIFACTS_DIR);
  for (let relativeFile of files)
    if (firstLineOf(relativeFile.toLowerCase().replaceAll("\\", "/"), "/") === lower) return true;
  return reservedState === "present";
}
//@ chunk-af1hzzme.js:284270-284428 placement
function formatRemoveRunDirCommand(root) {
  return getPlatform() === "windows"
    ? `Remove-Item -Recurse -Force -LiteralPath '${root.replaceAll("'", "''")}'`
    : `chmod -R u+rwX ${shellQuoteArgs([root])} && rm -rf ${shellQuoteArgs([root])}`;
}
//@ chunk-af1hzzme.js:284428-284448 placement
/**
 * 枚举运行目录时的最大条目数（200000）。
 */
var MAX_RUN_DIR_DEPTH = 32;
var MAX_RUN_DIR_ENTRIES = 200000;
//@ chunk-af1hzzme.js:284448-284967 placement
/**
 * 递归列出运行目录中的文件（深度与条目数有上限），每级检查目录不是链接、realpath 未变且 inode 前后一致，否则抛出。
 */
async function walkRunDir(
  root,
  relativeDir,
  files,
  depth,
  budget = {
    count: 0,
  },
) {
  if (depth > MAX_RUN_DIR_DEPTH) throw checkRunDirUnchanged();
  let joined = path.join(root, relativeDir);
  let dirStats = await lstat(joined, {
    bigint: true,
  }).catch(() => null);
  if (
    dirStats === null ||
    !dirStats.isDirectory() ||
    dirStats.isSymbolicLink() ||
    (await realpath(joined).catch(() => null)) !== joined
  )
    throw checkRunDirUnchanged();
  let entries;
  try {
    entries = await readdir(joined, {
      withFileTypes: true,
    });
  } catch {
    throw checkRunDirUnchanged();
  }
  let recheckedStats = await lstat(joined, {
    bigint: true,
  }).catch(() => null);
  if (recheckedStats === null || recheckedStats.ino !== dirStats.ino || recheckedStats.dev !== dirStats.dev)
    throw checkRunDirUnchanged();
  budget.count += entries.length;
  if (budget.count > MAX_RUN_DIR_ENTRIES) throw checkRunDirUnchanged();
  for (let entry of entries) {
    let relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walkRunDir(root, relativePath, files, depth + 1, budget);
    else files.add(relativePath);
  }
}
//@ chunk-af1hzzme.js:284967-285057 placement
/**
 * 返回在第二个集合里不存在的项（排序后拼接）。
 */
function diffSortedLines(before, after) {
  let added = [];
  for (let file of after) if (!before.has(file)) added.push(file);
  return added.sort().join(`
`);
}
//@ chunk-af1hzzme.js:285057-285146 placement
/**
 * 清洗控制字符并截断后转成 JSON 字符串。
 */
function quotedShort(text, maxChars) {
  let clean = replaceControlChars(text.replace(invisiblePatternAccessor(), " "));
  return jsonStringify(clean.length > maxChars ? `${truncateToLength(clean, maxChars)}\u2026` : clean);
}
//@ chunk-af1hzzme.js:285146-285380 placement
function logArtifactPublishOutcome(grant, arm, outcome) {
  if (!grant.granted || arm === "without") return;
  if (outcome.published) logFeatureOk("cli_plugin_eval_artifact_publish");
  else if (outcome.errored) logFeatureSad("cli_plugin_eval_artifact_publish", "run_errored");
  else logFeatureSad("cli_plugin_eval_artifact_publish", "no_publish");
}
//@ chunk-af1hzzme.js:285380-285478 placement
/**
 * 合并用例与命令行给出的禁用工具。
 */
function mergedDisallowedTools(caseSpec, options) {
  return normalizeCaseForComparison_2([
    ...splitAllowedTools(caseSpec.execution.disallowed_tools ?? []).tools,
    ...(options.disallowTools ?? []),
  ]);
}
//@ chunk-af1hzzme.js:285478-285768 placement
function describeUndisallowableTools(rejected) {
  return `${rejected.map(formatGuardValueJson).join(", ")} cannot be disallowed: ${rejected.length === 1 ? "it is not a built-in tool" : "they are not built-in tools"} that this version of Claude Code can remove. Use bare names such as Agent or TaskStop; patterns such as Bash(rm:*) and MCP tools are not accepted.`;
}
//@ chunk-af1hzzme.js:285768-285895 placement
function allowsArtifactPublish(caseSpec, options) {
  return (
    (options.artifactPublish ?? antEnv.CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH === true) &&
    caseSpec.execution.artifact_publish === true
  );
}
//@ chunk-af1hzzme.js:285895-286204 placement
/**
 * 解析评测套件声明的 GrowthBook 开关覆盖：只保留允许列表（参数或 CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES）中的开关，其余记为丢弃。
 */
function resolveFlagOverrides(caseSpec, options) {
  let growthbookOverrides = caseSpec.execution.growthbook_overrides ?? {};
  let flagAllowlist = new Set(
    options.allowFlagOverrides ??
      (antEnv.CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
  );
  let seeded = {};
  let dropped = [];
  for (let [key, value] of Object.entries(growthbookOverrides))
    if (flagAllowlist.has(key)) seeded[key] = value;
    else dropped.push(key);
  return {
    declared: growthbookOverrides,
    seeded,
    dropped,
  };
}
//@ chunk-af1hzzme.js:286204-286354 placement
function getRunArms(caseSpec, ablation, withheldMocks) {
  if (ablation !== "with-without" || caseSpec.pluginDirs.length === 0) return ["with"];
  if (withheldMocks && caseSpec.context.history_file) return ["with"];
  return ["with", "without"];
}
//@ chunk-af1hzzme.js:286354-286937 placement
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
//@ chunk-af1hzzme.js:286937-286949 placement
/**
 * 释放资源时的等待（5000 毫秒）。
 */
var DISPOSE_TIMEOUT_MS = 5000;
//@ chunk-af1hzzme.js:286949-286997 placement
/**
 * 安全计算内容哈希（失败返回空串）。
 */
function safeCanonicalHash(value) {
  try {
    return canonicalHash(value);
  } catch {
    return "";
  }
}
//@ chunk-af1hzzme.js:286997-288768 placement
/**
 * 校验 trace 中的结果都是 harness 给出的（未被事后篡改）。
 */
function verifyTraceIntegrity(answers, runTraceHistory, mocks) {
  let agentTools = new Map();
  for (let server of mocks.servers)
    for (let tool of server.tools)
      if (server.responderKinds[tool] === "agent")
        agentTools.set(server.toolFullNames[tool] ?? "", {
          server: server.dirName,
          tool,
        });
  let answersByServer = new Map();
  let answerKey = (answer) => jsonStringify([answer.tool, answer.verdict, answer.outputKey]);
  for (let answer of answers) {
    let perServer = answersByServer.get(answer.server) ?? new Map();
    let key = answerKey(answer);
    let entry = perServer.get(key) ?? {
      tool: answer.tool,
      inputKeys: [],
      rewritten: 0,
    };
    entry.inputKeys.push(answer.inputKey);
    perServer.set(key, entry);
    answersByServer.set(answer.server, perServer);
  }
  let noResultTools = new Map();
  let problems = [];
  let rewrittenCount = 0;
  let deniedCount = 0;
  for (let toolCall of runTraceHistory.toolCalls) {
    let mockedTool = agentTools.get(toolCall.name);
    if (mockedTool === undefined || toolCall.mock === undefined) continue;
    if (toolCall.deniedByChild) {
      deniedCount++;
      continue;
    }
    if (toolCall.mock.verdict === "no_result") {
      let tools = noResultTools.get(mockedTool.server) ?? new Set();
      tools.add(mockedTool.tool);
      noResultTools.set(mockedTool.server, tools);
      continue;
    }
    let perServer = answersByServer.get(mockedTool.server);
    let key = answerKey({
      tool: mockedTool.tool,
      verdict: toolCall.mock.verdict,
      outputKey: outputKey(toolCall.output ?? "", toolCall.mock.verdict),
    });
    let entry = perServer?.get(key);
    if (entry === undefined || entry.inputKeys.length - entry.rewritten <= 0) {
      problems.push(
        `${mockedTool.server}/${mockedTool.tool}: a result in the trace is not one the harness gave \u2014 altered after the stand-in returned it (a PostToolUse hook that rewrites this tool's output does that; a run cannot be graded on answers the harness did not give) or answered by something else`,
      );
      break;
    }
    let index = entry.inputKeys.indexOf(safeCanonicalHash(toolCall.input));
    if (index === -1) {
      entry.rewritten++;
      rewrittenCount++;
    } else entry.inputKeys.splice(index, 1);
  }
  for (let perServer of answersByServer.values())
    for (let entry of perServer.values()) entry.inputKeys.splice(0, entry.rewritten);
  let absorbedInFlightAnswer = false;
  if (problems.length === 0)
    for (let [server, perServer] of answersByServer) {
      let flattened = [...perServer.values()].flatMap(({ tool, inputKeys }) => inputKeys.map(() => tool));
      if (flattened.length === 0) continue;
      if (
        flattened.length === 1 &&
        runTraceHistory.killedInFlight &&
        noResultTools.get(server)?.has(flattened[0])
      ) {
        absorbedInFlightAnswer = true;
        continue;
      }
      problems.push(
        `${server}: the harness answered ${flattened.length} agent mock ${plural(flattened.length, "call")} the trace does not show (the responder was reached other than through the mocked tools)`,
      );
      break;
    }
  return {
    mismatch: problems.length === 0 ? null : `mocks: ${problems.join("; ")}`,
    absorbedInFlightAnswer,
    inputsRewritten: rewrittenCount,
    deniedByChild: deniedCount,
  };
}
//@ chunk-af1hzzme.js:288768-288792 placement
var TRUST_PLUGIN_FLAG = "--trust-plugin";
export { TRUST_PLUGIN_FLAG, runEvalCase };
