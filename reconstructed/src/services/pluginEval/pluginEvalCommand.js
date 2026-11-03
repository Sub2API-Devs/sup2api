/**
 * services/pluginEval/pluginEvalCommand.ts
 *
 * 2.1.316 新增：claude plugin eval / plugin eval init 子命令入口、结果发布与 --json 输出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (13)
 * attribution: placement 13
 */
import path from "path";
import { mkdir, lstat, rm as rm_2 } from "fs/promises";
import { spawnSync } from "child_process";
import os_2 from "os";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { MIN_CONFIRM_ANSWER_DELAY_MS, confirmPrompt } from "../../utils/confirmPrompt.js";
import { isPathTrusted } from "../../utils/config.js";
import { escapeNonAscii, replaceControlChars } from "../../utils/resultError.js";
import { TRUST_PLUGIN_FLAG, runEvalCase } from "./runSuite.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { recordDirectoryTrust } from "../../utils/sessionRelocation.js";
import { logForDebugging } from "../../utils/debug.js";
import { parsePluginAtMarketplace } from "../../utils/plugins/crossMarketplaceInstall.js";
import { SKILLS_DIR } from "../../utils/telemetry/pluginTelemetry.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  getInstalledPluginsAsync,
  getInstalledPlugins,
  filterInstallationsForCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import { resolvePluginSourceLocation } from "../../utils/plugins/pluginSourceResolution.js";
import {
  getMarketplaceCandidatePaths,
  classifyMarketplacePath,
  UNSAFE_PATH_EXPLANATION,
} from "../../utils/plugins/localMarketplacePaths.js";
import { loadKnownMarketplacesSafe, tryUnwrapTextPayload } from "../../utils/plugins/marketplaceManager.js";
import { loadSkillsAsPlugins } from "../../utils/plugins/pluginLoader.js";
import { getCwd } from "../../utils/cwd.js";
import { checkTreeTrust, reasonFor } from "./ownershipChecks.js";
import {
  resolveEvalTargetPlugin,
  writeStderrLine,
  resolveOverlapRoots,
  resolveEvalDirSource,
  describeEvalDirSource,
  describeEvalDirScanScope,
  ensureOutputBase,
  EscapesBaseError,
  writeOutputFile,
  writeMockRecordings,
  removeEmptyDirs,
  hasPluginComponents,
} from "./evalOutput.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logFeatureBadAsync, logFeatureSadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";
import { exitAfterAnalyticsFlush, writeStdoutAndDrain } from "../../cli/exit.js";
import {
  readPluginManifestAdvisory,
  displayDir,
  isFromEvalDirFlag,
  EVALS_DIR_NAME,
  checkDeclaredComponentPaths,
  describeWindowsUnsafeName,
} from "./evalDir.js";
import { isSameOrInside, realCwd, findNearestSkillFolder, resolvePluginDir } from "./caseDiscovery.js";
import { createAbortController } from "../../utils/abortController.js";
import { markStdoutDrainExternallyClocked } from "../../utils/process.js";
import { markPrintModeSignalHandlersRegistered, gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { logEventTo1P } from "./authPreflight.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { stripInvisibleChars } from "../../utils/confusables.js";
import { jsonStringify, isStandaloneExecutable } from "../../utils/slowOperations.js";
import { MOCK_RECORDINGS } from "./mocks/pluginMcpEnumeration.js";
import { formatEvalReportTable, formatEvalSummary, optionalRunStopSchema } from "./evalReport.js";
import { count } from "../../utils/collections.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isOnClaudeCodeSessionSurface, isHeadlessToolCallOfClaudeCodeSession } from "../../utils/teammate.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { withTimeout } from "../../utils/sleep.js";
import { isNetworkMountRoot_2 } from "../../utils/networkPaths.js";
import {
  buildEvalInitPrompt,
  buildEvalInitInterviewPrompt,
  EVAL_INIT_FIRST_MESSAGE,
} from "./evalInitInterview.js";
import { AGENT_PROMPT_TEMPLATE, GRADER_TEMPLATE } from "./caseSchema.js";
import { doesEnterpriseMcpConfigExist } from "../mcp/config.js";
import { withLaunchValuesOfHybridConnection } from "../../utils/managedEnvApply.js";

//@ chunk-qchp9vrd.js:287335-287429 placement
/**
 * 是否可以在终端里交互询问。
 */
function canPromptInteractively({ json }) {
  return process.stdin.isTTY === true && process.stdout.isTTY === true && !json && !isEnvTruthy(false);
}
//@ chunk-qchp9vrd.js:287429-289079 placement
/**
 * 确认是否信任被测插件（--trust-plugin、交互提示）。
 */
async function confirmPluginTrust({
  pluginDir,
  installedPluginId,
  trustPluginFlag,
  canPrompt,
  storageV5,
  input = process.stdin,
  answerGraceMs = MIN_CONFIRM_ANSWER_DELAY_MS,
}) {
  if (installedPluginId !== undefined)
    return {
      trusted: true,
      source: "installed",
    };
  if (isPathTrusted(pluginDir))
    return {
      trusted: true,
      source: "folder",
    };
  if (trustPluginFlag)
    return {
      trusted: true,
      source: "flag",
    };
  let b = escapeNonAscii(pluginDir);
  if (!canPrompt)
    return {
      trusted: false,
      reason: "no_prompt",
      message: `Error: ${b} is not a trusted plugin directory, and this run cannot stop to ask you about it (no interactive terminal, or --json / CI). \`claude plugin eval\` loads the plugin and runs its eval suite on this machine as you - only evaluate plugins you trust. Run it once in a terminal to trust this directory, or pass ${TRUST_PLUGIN_FLAG} to assert that you trust this plugin's code and eval suite (e.g. in CI).`,
    };
  let y = uncachedStorageRootFor(pluginDir);
  let R = y !== null && y !== pluginDir;
  stopCapturingEarlyInput();
  let S =
    `
\`claude plugin eval\` loads this plugin (its skills, hooks and MCP servers) and runs its eval suite - prompts and graders; scaffold scripts only with --scaffold - on this machine, as you. The run is sandboxed where the platform supports it, which limits what a malicious plugin can reach but is not a guarantee against one. A plugin's own suite passing says nothing about whether the plugin is safe.
  Plugin directory: ${b}
` +
    (R
      ? `  Trusting it marks the whole repository as trusted: ${escapeNonAscii(y)}
`
      : "") +
    `Only evaluate plugins you trust.
`;
  process.stdout.write(S);
  if (
    !(await confirmPrompt("Trust this plugin directory?", input, {
      ignoreAnswersWithinMs: answerGraceMs,
      reaskPreamble: S,
    }))
  )
    return {
      trusted: false,
      reason: "declined",
      message: `Not trusted - nothing from ${b} was loaded or run.`,
    };
  await recordDirectoryTrust(pluginDir, storageV5).catch((error) => {
    logForDebugging(`plugin eval: persisting trust failed: ${error}`, {
      level: "error",
    });
  });
  return {
    trusted: true,
    source: "gate",
  };
}
//@ chunk-qchp9vrd.js:289079-289088 placement
/**
 * 并发上限（8）。
 */
var MAX_CONCURRENCY = 8;
//@ chunk-qchp9vrd.js:289088-290224 placement
async function resolveEvalPluginTarget(e, n) {
  if (e.includes(path.sep) || e.includes("/"))
    return {
      kind: "path",
      root: e,
    };
  let pluginAtMarketplace = parsePluginAtMarketplace(e);
  if (!pluginAtMarketplace && e.includes("@"))
    return {
      kind: "path",
      root: e,
    };
  if (pluginAtMarketplace && pluginAtMarketplace.marketplace !== SKILLS_DIR) {
    let b = (
      isStorageV5Enabled() && n !== undefined ? await getInstalledPluginsAsync(n) : getInstalledPlugins()
    ).plugins[e];
    if (!b || b.length === 0)
      return {
        kind: "path",
        root: e,
      };
    let pluginSourceLocation = await resolvePluginSourceLocation(e, n);
    if (pluginSourceLocation.kind === "folder")
      return {
        kind: "plugin",
        root: pluginSourceLocation.path,
        pluginId: e,
        vouchedRoots: getMarketplaceCandidatePaths(
          e,
          await loadKnownMarketplacesSafe(n),
          tryUnwrapTextPayload(),
        ),
      };
    if (pluginSourceLocation.kind === "unresolved")
      return {
        kind: "folder-unresolved",
        pluginId: e,
        reason: pluginSourceLocation.reason,
      };
    let R = filterInstallationsForCurrentProject(b);
    let S = R.length > 0 ? R : b;
    let trustedRoots = getMarketplaceCandidatePaths(
      e,
      await loadKnownMarketplacesSafe(n),
      tryUnwrapTextPayload(),
    );
    for (let N of S) {
      let { absolute, suspect } = classifyMarketplacePath(N.installPath, {
        trustedRoots,
      });
      if (!suspect)
        return {
          kind: "plugin",
          root: absolute,
          pluginId: e,
        };
    }
    return {
      kind: "refused",
      pluginId: e,
    };
  }
  let found = (await loadSkillsAsPlugins(isStorageV5Enabled() ? n : undefined)).plugins.find(
    (plugin) => plugin.name === (pluginAtMarketplace ? pluginAtMarketplace.name : e),
  );
  if (pluginAtMarketplace)
    return found
      ? {
          kind: "plugin",
          root: found.path,
          pluginId: found.source,
        }
      : {
          kind: "path",
          root: e,
        };
  let w = [
    ...Object.keys(
      (isStorageV5Enabled() && n !== undefined ? await getInstalledPluginsAsync(n) : getInstalledPlugins())
        .plugins,
    ).filter((key) => parsePluginAtMarketplace(key)?.name === e),
    ...(found ? [found.source] : []),
  ];
  if (w.length === 0)
    return {
      kind: "path",
      root: e,
    };
  if (w.length > 1)
    return {
      kind: "ambiguous",
      matches: w,
    };
  if (found)
    return {
      kind: "plugin",
      root: found.path,
      pluginId: found.source,
    };
  return resolveEvalPluginTarget(w[0], n);
}
//@ chunk-qchp9vrd.js:290224-300960 placement
/**
 * claude plugin eval 入口：解析插件与评测目录、预检、运行套件并输出报告（约 11 KB）。
 */
async function pluginEvalHandler(e, n, r, credentials) {
  let s = e ?? getCwd();
  let h;
  let w = [];
  if (e) {
    let evalPluginTarget = await resolveEvalPluginTarget(e, r);
    if (evalPluginTarget.kind === "ambiguous") {
      process.stderr
        .write(`${replaceControlChars(`Error: plugin name "${e}" is ambiguous \u2014 matches ${evalPluginTarget.matches.join(", ")}. Specify the full plugin@marketplace identifier.`)}
`);
      process.exit(1);
    }
    if (evalPluginTarget.kind === "folder-unresolved") {
      process.stderr
        .write(`Error: ${replaceControlChars(evalPluginTarget.pluginId)} cannot be evaluated where sessions load it: no session could load it now. ${replaceControlChars(evalPluginTarget.reason)} Check the marketplace with \`claude plugin marketplace list\`, or pass ./<dir> to evaluate a directory.
`);
      process.exit(1);
    }
    if (evalPluginTarget.kind === "refused") {
      process.stderr
        .write(`Error: ${replaceControlChars(evalPluginTarget.pluginId)} has a recorded install path that ${UNSAFE_PATH_EXPLANATION}; reinstall it, or pass ./<dir> to evaluate a directory.
`);
      process.exit(1);
    }
    s = evalPluginTarget.root;
    if (evalPluginTarget.kind === "plugin") {
      h = evalPluginTarget.pluginId;
      w = evalPluginTarget.vouchedRoots ?? [];
    }
  }
  if (n.runs !== undefined && (!Number.isInteger(n.runs) || n.runs < 1)) {
    process.stderr.write(`Error: --runs must be a positive integer
`);
    process.exit(1);
  }
  if (n.threshold !== undefined && (!Number.isFinite(n.threshold) || n.threshold < 0 || n.threshold > 1)) {
    process.stderr.write(`Error: --threshold must be between 0 and 1
`);
    process.exit(1);
  }
  if (n.mocks !== undefined && n.mocks !== "record" && n.mocks !== "off") {
    process.stderr.write(`Error: --mocks must be record or off
`);
    process.exit(1);
  }
  let mocks = n.mocks === "off" ? "off" : "record";
  if (typeof n.json === "string" && !n.json.endsWith(".json")) {
    process.stderr.write(
      n.json === ""
        ? `Error: --json requires a non-empty file path
`
        : `Error: --json output path must end in .json (got '${n.json}'). If that is your eval target, put it before --json.
`,
    );
    process.exit(1);
  }
  if (n.report === "") {
    process.stderr.write(`Error: --report requires a non-empty file path
`);
    process.exit(1);
  }
  if (n.publish === false && n.publishReport) {
    process.stderr.write(`Error: --no-publish and --publish-report are contradictory \u2014 pass at most one.
`);
    process.exit(1);
  }
  if (n.maxCostUsd !== undefined && (!Number.isFinite(n.maxCostUsd) || n.maxCostUsd < 0)) {
    process.stderr.write(`Error: --max-cost-usd must be a non-negative number
`);
    process.exit(1);
  }
  let y = n.concurrency === undefined ? 1 : Number(n.concurrency);
  if (!Number.isInteger(y) || y < 1 || y > MAX_CONCURRENCY || !/^\d+$/.test(n.concurrency ?? "1")) {
    process.stderr.write(`Error: --concurrency must be a whole number from 1 to ${MAX_CONCURRENCY}
`);
    process.exit(1);
  }
  let R = checkTreeTrust();
  let S;
  try {
    S = await resolveEvalTargetPlugin(s, h, R, w);
  } catch (error) {
    writeStderrLine(`Error: ${errorMessage(error)}`);
    await logFeatureBadAsync(
      "cli_plugin_eval",
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        ? "target_refused"
        : "exception",
    );
    return exitAfterAnalyticsFlush(1);
  }
  let { targetDir, pluginRoot, untrustedManifestDir, targetResolved, enclosingVerdict, targetIsCaseFile } = S;
  let W = !targetResolved && h === undefined;
  let G = await confirmPluginTrust({
    pluginDir: pluginRoot ?? targetDir,
    installedPluginId: h,
    trustPluginFlag: n.trustPlugin === true,
    canPrompt:
      !W &&
      canPromptInteractively({
        json: n.json,
      }),
    storageV5: r,
  });
  if (!G.trusted) {
    if (W) {
      writeStderrLine(
        `Error: ${escapeNonAscii(targetDir)} could not be found or read - nothing to evaluate (nothing was loaded or run).`,
      );
      await logFeatureBadAsync("cli_plugin_eval", "target_unresolved");
      return exitAfterAnalyticsFlush(1);
    }
    writeStderrLine(G.message);
    await logFeatureBadAsync(
      "cli_plugin_eval",
      G.reason === "declined" ? "untrusted_declined" : "untrusted_no_prompt",
    );
    return exitAfterAnalyticsFlush(1);
  }
  let J =
    targetResolved && pluginRoot === null && untrustedManifestDir === null && !h && enclosingVerdict !== null
      ? enclosingVerdict
      : {
          adopted: null,
          refused: null,
          namedOnly: null,
        };
  let Z = J.adopted ?? (targetIsCaseFile ? null : J.namedOnly);
  let refused = J.refused;
  let namedOnly = targetIsCaseFile ? J.namedOnly : null;
  let otherManifestDir = pluginRoot === null ? (untrustedManifestDir ?? Z ?? refused ?? namedOnly) : null;
  let pluginManifestAdvisory = await readPluginManifestAdvisory({
    flag: n.evalDir,
    ...resolveOverlapRoots({
      scopeDir: targetDir,
      scopeIsNamedDirectory: !targetIsCaseFile,
      trustedRoot: pluginRoot,
      otherManifestDir,
      adoptedAbove: J.adopted,
    }),
    writesToPlugin: !h && n.outputDir === undefined,
  });
  if (!pluginManifestAdvisory.ok) {
    writeStderrLine(`Error: ${pluginManifestAdvisory.error}`);
    await logFeatureBadAsync("cli_plugin_eval", "eval_dir_refused");
    return exitAfterAnalyticsFlush(1);
  }
  if (pluginManifestAdvisory.warning) writeStderrLine(`Warning: ${pluginManifestAdvisory.warning}`);
  let segments = pluginManifestAdvisory.value.segments;
  try {
    pluginManifestAdvisory.value = await resolveEvalDirSource(
      pluginRoot ?? targetDir,
      pluginManifestAdvisory.value,
    );
  } catch (error) {
    writeStderrLine(`Error: ${errorMessage(error)}`);
    await logFeatureBadAsync("cli_plugin_eval", "eval_dir_unvettable");
    return exitAfterAnalyticsFlush(1);
  }
  let Je = (ce) => reasonFor(ce, R);
  if (untrustedManifestDir !== null && untrustedManifestDir === targetDir)
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(untrustedManifestDir)} is NOT loaded \u2014 ${Je(untrustedManifestDir)}; each case that would auto-detect it is reported as refused instead of running \u2014 fix that, or name that directory itself as the target to evaluate it (naming a directory is consent to load)`,
    );
  let Ee =
    untrustedManifestDir !== null && untrustedManifestDir !== targetDir ? untrustedManifestDir : refused;
  if (Ee !== null)
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(Ee)} is NOT loaded \u2014 ${Je(Ee)}; cases run against baseline Claude (unless they load a plugin beneath the target) \u2014 fix that, or name the plugin directory itself as the target to evaluate it (naming is consent to load)`,
    );
  if (namedOnly !== null)
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(namedOnly)} is NOT loaded \u2014 file ownership cannot be verified where it lives, so a plugin outside the consulted scope is not adopted; only ${targetDir} is scanned and cases run against baseline Claude (unless they load a plugin beneath the target) \u2014 run from within that plugin, or target the plugin directory`,
    );
  if (Z !== null) {
    let ce = isSameOrInside(targetDir, await realCwd(R))
      ? "above the working directory"
      : "outside the consulted scope";
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(Z)} (${ce}) is NOT loaded \u2014 only ${targetDir} is scanned and cases run against baseline Claude (unless they load a plugin beneath the target); run from that plugin's directory or target it to evaluate it`,
    );
  }
  if (pluginRoot !== null && pluginRoot !== targetDir && !h)
    writeStderrLine(
      `Evaluating plugin ${pluginRoot} (the target is inside it; the plugin is loaded for the run)`,
    );
  if (pluginManifestAdvisory.value.source === "manifest" && !n.json)
    writeStderrLine(
      `Using eval directory ${displayDir(pluginManifestAdvisory.value)}/ from ${escapeNonAscii(pluginManifestAdvisory.value.manifestPath)}`,
    );
  let abortController = createAbortController();
  let ye = null;
  let je = () => {
    ye ??= "SIGINT";
    markStdoutDrainExternallyClocked();
    if (!abortController.signal.aborted) {
      process.stderr.write(`
Interrupted \u2014 finishing up\u2026
`);
      abortController.abort();
    }
  };
  let pt = () => {
    ye ??= "SIGTERM";
    if (!abortController.signal.aborted) {
      process.stderr.write(`
Terminated \u2014 finishing up\u2026
`);
      abortController.abort();
    }
  };
  markPrintModeSignalHandlersRegistered();
  process.on("SIGINT", je);
  process.on("SIGTERM", pt);
  let noScaffold = n.noScaffold ?? true;
  if (n.noScaffold === false)
    process.stderr
      .write(`Note: --scaffold runs each case's scaffold_script as you. Only use it on case files you (or your org) authored.
`);
  try {
    let {
      report,
      exitCode,
      errors,
      root,
      resolvedCases,
      authPreflightFailed,
      gitPreflightFailed,
      harnessFailures,
      ablation,
      suite,
    } = await runEvalCase({
      rootPath: s,
      evalDirSegments: pluginManifestAdvisory.value.segments,
      frameRoot: pluginRoot,
      adoptionDecided: h !== undefined || targetResolved,
      trust: R,
      targetScreened: true,
      consentDecided: h !== undefined || targetResolved,
      caseGlob: n.case,
      tags: n.tag,
      runs: n.runs,
      concurrency: y,
      model: n.model,
      judgeModel: n.judgeModel,
      maxCostUsd: n.maxCostUsd,
      threshold: n.threshold ?? 1,
      allowTools: n.allowTools ?? [],
      disallowTools: n.disallowTools ?? [],
      noScaffold,
      keepTemp: n.keepTemp ?? false,
      mocks,
      allowRealServers: n.allowRealServers === true,
      keepFailedRuns: !n.json,
      verbose: n.verbose ?? false,
      ablation: n.ablation ?? (h ? "with-without" : "auto"),
      onLine: (et) => {
        if (!n.json)
          process.stderr.write(`${replaceControlChars(et)}
`);
      },
      onNotice: (et) =>
        process.stderr.write(`${replaceControlChars(et)}
`),
      signal: abortController.signal,
      authPreflight: logEventTo1P,
      credentials,
    });
    let Ne = await checkResultSchemaDrift({
      aggregate: report,
      resolvedCases,
      root,
      ablation,
      pluginId: h,
      modelOverride: n.model,
      judgeModel: n.judgeModel,
      caseFilter: n.case,
      tagFilters: n.tag,
      threshold: n.threshold ?? 1,
    });
    if (
      report.cases.length === 0 &&
      errors.length === 0 &&
      !report.partial &&
      !abortController.signal.aborted
    ) {
      let et = [
        ...(n.case ? [`--case "${n.case}"`] : []),
        ...(n.tag ? n.tag.map((Ht) => `--tag "${Ht}"`) : []),
      ];
      let Et = et.length > 0 ? ` matching ${et.join(" ")}` : "";
      writeStderrLine(`No eval cases found${Et} under ${targetDir}.`);
      if (!n.json) {
        let Ht = Z;
        process.stderr.write(
          et.length > 0
            ? `Run without ${et.length > 1 ? "the filters" : firstLineOf(et[0], " ")} to see all cases.
`
            : stripControlChars(
                `Cases are expected in a ${displayDir(pluginManifestAdvisory.value)}/ directory under ${pluginRoot ?? targetDir} (${describeEvalDirSource(pluginManifestAdvisory.value)}), each case a directory containing case.yaml or prompt.md.
` +
                  (pluginRoot !== null && pluginRoot !== targetDir
                    ? describeEvalDirScanScope(targetDir, pluginRoot, pluginManifestAdvisory.value)
                    : "") +
                  (untrustedManifestDir !== null
                    ? `The plugin manifest in ${untrustedManifestDir} was not consulted (${reasonFor(untrustedManifestDir, R)})${pluginManifestAdvisory.value.source === "flag" ? " (so its layout did not frame --eval-dir either)" : "; pass --eval-dir to name the directory"}.
`
                    : "") +
                  (Ht !== null
                    ? Ht === J.adopted
                      ? `A plugin manifest of yours outside the consulted scope, in ${Ht}, was not consulted; ${pluginManifestAdvisory.value.source === "flag" ? "target that plugin directly if it is the one you mean" : "pass --eval-dir here, or target that plugin directly if it is the one you mean"}.
`
                      : `A plugin manifest outside the consulted scope, in ${Ht}, was not consulted (whether it is yours cannot be verified here); ${pluginManifestAdvisory.value.source === "flag" ? "evaluate that plugin from your own copy if it is yours" : "pass --eval-dir here"}.
`
                    : ""),
              ) +
                (h
                  ? ""
                  : `Run \`claude plugin eval init${isFromEvalDirFlag(pluginManifestAdvisory.value)}\` for a guided interview, or \`claude plugin eval init --bare <name>${isFromEvalDirFlag(pluginManifestAdvisory.value)}\` to scaffold a blank case.
`),
        );
      } else if ((await writeJsonResult(n.json, Ne)) && typeof n.json === "string")
        await writeStdoutAndDrain(`Wrote ${n.json}
`);
      await publishEvalResults({
        options: n,
        abortSignal: abortController.signal,
        credentials,
        result: Ne.result,
        defaultReportDir: null,
      });
      if (abortController.signal.aborted) return handleEvalInterrupt(ye);
      await logFeatureSadAsync("cli_plugin_eval", "no_cases");
      return exitAfterAnalyticsFlush(1);
    }
    let ot = h ? null : (suite ?? null);
    let nt = h ? getCwd() : (ot ?? root);
    let mt = !h && targetIsCaseFile && pluginRoot === null;
    let Ye =
      h && pluginManifestAdvisory.value.source === "manifest"
        ? [EVALS_DIR_NAME]
        : h && pluginManifestAdvisory.value.source === "flag"
          ? segments
          : pluginManifestAdvisory.value.segments;
    let joined = Ye.join(path.sep);
    let Ge = [...(ot === null ? Ye : []), "results", report.started_at.replace(/[:.]/g, "-")];
    let Lt = n.outputDir ?? path.join(nt, ...Ge);
    if (h && n.outputDir === undefined) {
      let et = await checkDeclaredComponentPaths(nt, Ge);
      if (et !== undefined)
        writeStderrLine(
          `Warning: results are written under ${path.join(nt, joined)}: ${et} \u2014 files written there may be loaded as plugin components; pass --output-dir to write elsewhere`,
        );
    }
    let _t = stripInvisibleChars(jsonStringify(Ne.result, undefined, 2));
    let zt = false;
    let fn = report.cases.length > 0 || errors.length === 0;
    let yn = true;
    if (fn) {
      let et = [];
      try {
        if (n.outputDir === undefined) {
          await ensureOutputBase(nt, Ge, et, {
            vetOwnership: mt ? R : null,
          });
          if (et.at(-1) !== Lt)
            throw new EscapesBaseError(
              `results directory ${Lt} already existed \u2014 a default results directory is always new; refusing to write into it`,
            );
        } else
          await mkdir(Lt, {
            recursive: true,
          });
        await writeOutputFile(
          path.join(Lt, "aggregate-result.json"),
          `${_t}
`,
          n.outputDir === undefined,
        );
        try {
          await writeMockRecordings(Lt, report, n.outputDir === undefined);
        } catch (error) {
          writeStderrLine(
            `warning: agent-mock recordings not written \u2014 adopt nothing from ${path.join(Lt, MOCK_RECORDINGS)}: ${errorMessage(error).replace(/[\r\n]+/g, " ")}`,
          );
        }
      } catch (error) {
        await removeEmptyDirs(et);
        if (error instanceof EscapesBaseError || et.length > 0) yn = false;
        writeStderrLine(`warning: could not write results: ${errorMessage(error)}`);
      }
    }
    if (n.json) {
      for (let error of errors)
        process.stderr.write(`\u2717 ${replaceControlChars(`${error.file}: ${error.error}`)}
`);
      if (errors.length > 0 && !authPreflightFailed && !gitPreflightFailed)
        process.stderr.write(`${errors.length} case file(s) failed to load
`);
      let et = await writeJsonResult(n.json, Ne, _t);
      if (et && typeof n.json === "string")
        await writeStdoutAndDrain(`Wrote ${n.json}
`);
      else if (!et && exitCode === 0) zt = true;
    } else if (authPreflightFailed || gitPreflightFailed);
    else {
      await writeStdoutAndDrain(`
${stripControlChars(formatEvalReportTable(report))}
`);
      if (errors.length > 0)
        process.stdout.write(`
${errors.length} case file(s) failed to load \u2014 see above.
`);
      if (
        report.cases.some((Et) => Et.score < (n.threshold ?? 1) || Et.runs.some((run) => run.error)) &&
        !n.keepTemp
      )
        process.stdout.write(`
Re-run with --keep-temp to preserve each run's sandbox (workspace + trace.jsonl) for debugging.
`);
    }
    await publishEvalResults({
      options: n,
      abortSignal: abortController.signal,
      credentials,
      result: Ne.result,
      defaultReportDir: report.cases.length > 0 && yn ? Lt : null,
      verifyDefaultReportDir:
        n.outputDir === undefined
          ? () =>
              ensureOutputBase(nt, Ge, [], {
                vetOwnership: mt ? R : null,
                create: false,
              })
          : undefined,
    });
    if (abortController.signal.aborted) return handleEvalInterrupt(ye);
    if (zt) return exitAfterAnalyticsFlush(1);
    await logPluginEvalFailure(
      report,
      errors,
      exitCode,
      n.threshold ?? 1,
      G.source,
      authPreflightFailed === true,
      harnessFailures,
      gitPreflightFailed === true,
    );
    return exitAfterAnalyticsFlush(exitCode);
  } catch (error) {
    await logFeatureBadAsync("cli_plugin_eval", "exception");
    writeStderrLine(`Error: ${errorMessage(error)}`);
    return exitAfterAnalyticsFlush(1);
  } finally {
    process.off("SIGINT", je);
    process.off("SIGTERM", pt);
  }
}
//@ chunk-qchp9vrd.js:300960-301754 placement
async function logPluginEvalFailure(
  report,
  errors,
  exitCode,
  a,
  source,
  h = false,
  harnessFailures = 0,
  b = false,
) {
  if (h) {
    await logFeatureBadAsync("cli_plugin_eval", "auth_preflight_failed");
    return;
  }
  if (b) {
    await logFeatureBadAsync("cli_plugin_eval", "git_preflight_failed");
    return;
  }
  if (harnessFailures > 0) {
    await logFeatureBadAsync("cli_plugin_eval", "harness_failure");
    return;
  }
  if (exitCode === 2) {
    if (report.partial_reason === "auth_failed") {
      await logFeatureBadAsync("cli_plugin_eval", "auth_failed");
      return;
    }
    await logFeatureSadAsync("cli_plugin_eval", report.partial_reason ?? "cost_ceiling");
    return;
  }
  if (errors.length > 0) {
    if (report.cases.length === 0) {
      await logFeatureBadAsync("cli_plugin_eval", "no_cases_loaded");
      return;
    }
    await logFeatureSadAsync("cli_plugin_eval", "case_load_errors");
    return;
  }
  let y = count(report.cases, (R) => R.score < a);
  await logFeatureOkAsync("cli_plugin_eval", {
    trust_source: fromEnum(source),
    all_passed: y === 0,
    num_cases: report.cases.length,
    num_failing_cases: y,
    num_cases_with_run_errors: count(
      report.cases,
      (R) => R.runs.some((run) => run.error) || (R.runs_without?.some((S) => S.error) ?? false),
    ),
  });
}
//@ chunk-qchp9vrd.js:301754-305060 placement
/**
 * 把评测结果发布为 Artifact（中断时跳过）。
 */
async function publishEvalResults(e) {
  let n = "setup";
  let r = false;
  let { options, abortSignal, credentials, result: w, defaultReportDir, verifyDefaultReportDir } = e;
  let R = options.report !== undefined;
  let S = options.publishReport === true;
  let T = defaultReportDir !== null;
  if (!R && !S && !T) return;
  let N = isOnClaudeCodeSessionSurface();
  let x =
    options.publish !== false &&
    !S &&
    T &&
    !env.CLAUDE_CODE_EVAL_INTERVIEW_SESSION &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_quartz_thimble", true);
  let j = x && N;
  let K = options.publish !== false && (S || (x && !N));
  try {
    let { evalReportTitle, renderEvalReportFragment, wrapReportDocument } =
      await import("./chunk-5wjwnxna.js");
    let J = false;
    let Z = null;
    let se = R || T;
    if (K)
      if (abortSignal.aborted) {
        if (S) {
          process.stderr.write(`Skipped publishing because the run was interrupted.
`);
          Z = "publish_interrupted";
        }
      } else {
        let { waitForPolicyLimitsToLoad } = await import("./chunk-qchbrsbw.js");
        await withTimeout(waitForPolicyLimitsToLoad(), 3000, "policy limits load timed out").catch(() => {});
        let { isArtifactToolEnabled } = await import("./chunk-tbts81qj.js");
        let we = isArtifactToolEnabled();
        let { getArtifactCreateNotice } = await import("./chunk-sbc4zy7a.js");
        let Je = we ? getArtifactCreateNotice() : null;
        J = we && Je === null;
        if (!J && S) {
          process.stderr
            .write(`Publishing is unavailable: ${Je === null ? "claude.ai artifacts are turned off for this account, provider, or privacy mode." : "your organization requires a person to approve each new artifact, and this command can't ask."} ${se ? "A local copy is written instead." : "Use --report <path> to write the report locally."}
`);
          Z = "publish_unavailable";
        }
      }
    if (R || T || J) {
      n = "render";
      let Q = renderEvalReportFragment(w);
      let Se =
        options.report !== undefined
          ? path.resolve(getCwd(), options.report)
          : T
            ? path.join(defaultReportDir, "report.html")
            : null;
      let we = Se !== null ? wrapReportDocument(w, Q) : "";
      n = "publish";
      if (Se !== null)
        try {
          if (options.report === undefined && verifyDefaultReportDir) await verifyDefaultReportDir();
          else
            await mkdir(path.dirname(Se), {
              recursive: true,
            });
          await writeOutputFile(Se, we, options.report === undefined && options.outputDir === undefined);
          writeStderrLine(
            `Report: ${Se}${j ? " (kept local: this run appears to have been started by a Claude Code session rather than a person \u2014 add --publish-report to publish it, where publishing is available)" : ""}`,
          );
          r = true;
        } catch (error) {
          writeStderrLine(`Couldn't write the report to ${Se}: ${errorMessage(error)}`);
          Z = "write_failed";
        }
      if (J)
        if (abortSignal.aborted) {
          if (S) {
            process.stderr.write(`Skipped publishing because the run was interrupted.
`);
            Z ??= "publish_interrupted";
          }
        } else {
          let { publishArtifact } = await import("./chunk-gk4zy5tq.js");
          let { makeLocalOwnPublishesStore } = await import("./chunk-wy5epz6a.js");
          process.stderr.write(`Publishing report to claude.ai (private to you)\u2026
`);
          let Ee = await publishArtifact(Q, {
            ownPublishes: makeLocalOwnPublishesStore(),
            title: `Eval report \u2014 ${evalReportTitle(w)}`,
            favicon: "",
            icon: "test",
            description: `claude plugin eval \u2014 ${w.cases.length} ${plural(w.cases.length, "case")}`,
            signal: abortSignal,
            credentials,
          });
          if (Ee.err === null) {
            process.stderr
              .write(`Published: ${Ee.url}${S ? "" : " \xB7 keep local next time with --no-publish"}
`);
            r = true;
          } else {
            process.stderr.write(
              r
                ? `${replaceControlChars(`Couldn't publish the report (${Ee.err}); the local copy above is still available.`)}
`
                : `${replaceControlChars(`Couldn't publish the report (${Ee.err}). Use --report <path> to write it locally.`)}
`,
            );
            Z ??= "publish_failed";
          }
        }
    }
    if (Z === null) await logFeatureOkAsync("cli_plugin_eval_report");
    else if (r) await logFeatureSadAsync("cli_plugin_eval_report", Z);
    else if (Z === "publish_interrupted") await logFeatureSadAsync("cli_plugin_eval_report", Z);
    else await logFeatureBadAsync("cli_plugin_eval_report", Z);
  } catch (error) {
    writeStderrLine(
      `${n === "render" ? "Couldn't build the HTML report" : n === "setup" ? "Couldn't prepare to publish the report" : "Couldn't finish publishing the report"}: ${errorMessage(error)}`,
    );
    let W = n === "render" ? "render_failed" : n === "setup" ? "publish_setup_failed" : "publish_failed";
    await (r
      ? logFeatureSadAsync("cli_plugin_eval_report", W)
      : logFeatureBadAsync("cli_plugin_eval_report", W));
  }
}
//@ chunk-qchp9vrd.js:305060-305098 placement
/**
 * 输出名允许的字符正则。
 */
var OUTPUT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-qchp9vrd.js:305098-305454 placement
async function checkResultSchemaDrift(e) {
  let n = formatEvalSummary(e);
  let r = optionalRunStopSchema().safeParse(n);
  if (!r.success) {
    let a = r.error.issues[0];
    let s = a ? `${a.path.join(".") || "(root)"}: ${a.message}` : "schema drift";
    process.stderr
      .write(`warning: eval result does not match resultSchema.ts (${s}) \u2014 please report this bug
`);
    await logFeatureSadAsync("cli_plugin_eval", "result_schema_drift");
  }
  return {
    result: n,
    valid: r.success,
  };
}
//@ chunk-qchp9vrd.js:305454-306023 placement
async function writeJsonResult(json, { result: n, valid }, a) {
  if (!valid) {
    process.stderr.write(`warning: --json result withheld because it failed schema validation
`);
    await logFeatureSadAsync("cli_plugin_eval", "json_withheld_invalid");
    return false;
  }
  try {
    let s = `${a ?? stripInvisibleChars(jsonStringify(n, undefined, 2))}
`;
    if (json === true)
      await new Promise((resolve, reject) => {
        process.stdout.write(s, (b) => (b ? reject(b) : resolve()));
      });
    else {
      let resolved = path.resolve(getCwd(), json);
      await mkdir(path.dirname(resolved), {
        recursive: true,
      });
      await writeOutputFile(resolved, s, false);
    }
    return true;
  } catch (error) {
    process.stderr.write(`${replaceControlChars(`warning: could not write --json result: ${String(error)}`)}
`);
    await logFeatureSadAsync("cli_plugin_eval", "json_write_failed");
    return false;
  }
}
//@ chunk-qchp9vrd.js:306023-310504 placement
/**
 * claude plugin eval init 入口：需要交互终端，启动访谈式用例编写会话。
 */
async function pluginEvalInitHandler(e, n = {}, storageV5) {
  let isTTY = process.stdin.isTTY && process.stdout.isTTY;
  let s = !n.bare && (n.forceInteractive || isTTY);
  let h = !n.bare && isHeadlessToolCallOfClaudeCodeSession();
  if (s && !isTTY && !h) {
    process.stderr.write(
      e
        ? `The authoring interview requires an interactive terminal (TTY). Run \`claude plugin eval init\` in a terminal, or drop --interactive to write a blank template for \`${e}\` instead.
`
        : "The authoring interview requires an interactive terminal (TTY). Run `claude plugin eval init` in a terminal, or drop --interactive and pass a case name (e.g. `claude plugin eval init my-case`) to write a blank template instead.\n",
    );
    await logFeatureBadAsync("cli_plugin_eval_init", "no_tty");
    return exitAfterAnalyticsFlush(1);
  }
  if (e !== undefined && (!OUTPUT_NAME_RE.test(e) || describeWindowsUnsafeName(e) !== undefined)) {
    let G = !OUTPUT_NAME_RE.test(e)
      ? "use letters, digits, '.', '_', '-' only (no '/', no '..')"
      : `it ${describeWindowsUnsafeName(e)}`;
    writeStderrLine(`Error: case name ${JSON.stringify(e)} is invalid \u2014 ${G}`);
    await logFeatureBadAsync("cli_plugin_eval_init", "bad_case_name");
    return exitAfterAnalyticsFlush(1);
  }
  let w = h
    ? {
        kind: "delegate",
      }
    : s
      ? {
          kind: "interview",
        }
      : e
        ? {
            kind: "bare",
            caseName: e,
          }
        : null;
  if (w === null) {
    process.stderr.write(
      n.bare
        ? `A case name is required for --bare. Run without --bare for the interview, which writes one case per input.
`
        : env.CLAUDE_CODE_CHILD_SESSION
          ? "A case name is required here: this looks like a command run by a Claude Code session, but that could not be confirmed (its session marker may be inherited), so the interview was not handed to the session and there is no terminal to hold one. Pass a name to write a blank template, or run `claude plugin eval init` yourself in a terminal for the interview.\n"
          : `A case name is required when no TTY is available (the interview needs an interactive terminal). Pass a name to write a blank template.
`,
    );
    await logFeatureBadAsync("cli_plugin_eval_init", "missing_case_name");
    return exitAfterAnalyticsFlush(1);
  }
  let b = checkTreeTrust();
  let y = await realCwd(b);
  b.consentRoot = y;
  let nearestSkillFolder = await findNearestSkillFolder(y, y, b);
  if (
    nearestSkillFolder === null &&
    n.evalDir === undefined &&
    !isNetworkMountRoot_2(y) &&
    (await lstat(path.join(y, EVALS_DIR_NAME)).catch(() => null))?.isDirectory() !== true &&
    !(await hasPluginComponents(y))
  ) {
    writeStderrLine(
      `Error: ${escapeNonAscii(y)} is not a plugin or skill folder \u2014 run \`claude plugin eval init\` from the plugin's root folder, or pass --eval-dir to scaffold here on purpose.`,
    );
    await logFeatureBadAsync("cli_plugin_eval_init", "cwd_not_a_plugin");
    return exitAfterAnalyticsFlush(1);
  }
  let S =
    nearestSkillFolder === null
      ? await resolvePluginDir(y, b, "core")
      : {
          adopted: null,
          refused: null,
          namedOnly: null,
        };
  let T = S.adopted ?? S.refused ?? S.namedOnly;
  let pluginManifestAdvisory = await readPluginManifestAdvisory({
    flag: n.evalDir,
    ...resolveOverlapRoots({
      scopeDir: y,
      scopeIsNamedDirectory: true,
      trustedRoot: nearestSkillFolder,
      otherManifestDir: nearestSkillFolder === null ? T : null,
      adoptedAbove: S.adopted,
    }),
    forInit: true,
  });
  if (!pluginManifestAdvisory.ok) {
    writeStderrLine(`Error: ${pluginManifestAdvisory.error}`);
    await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_refused");
    return exitAfterAnalyticsFlush(1);
  }
  if (pluginManifestAdvisory.warning) writeStderrLine(`Warning: ${pluginManifestAdvisory.warning}`);
  if (pluginManifestAdvisory.value.componentOverlap !== undefined) {
    writeStderrLine(
      `Error: not scaffolding \u2014 ${pluginManifestAdvisory.value.componentOverlap}; ${pluginManifestAdvisory.value.componentOverlapRecourse ?? "pass --eval-dir to use another directory"}`,
    );
    await logFeatureBadAsync(
      "cli_plugin_eval_init",
      pluginManifestAdvisory.value.componentOverlapUnverifiable
        ? "manifest_unverifiable"
        : "component_overlap",
    );
    return exitAfterAnalyticsFlush(1);
  }
  try {
    pluginManifestAdvisory.value = await resolveEvalDirSource(y, pluginManifestAdvisory.value);
  } catch (error) {
    writeStderrLine(`Error: ${errorMessage(error)}`);
    await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_unvettable");
    return exitAfterAnalyticsFlush(1);
  }
  if (w.kind === "delegate") {
    try {
      await ensureOutputBase(y, pluginManifestAdvisory.value.segments, [], {
        create: false,
        absentEndsChain: true,
      });
    } catch (error) {
      writeStderrLine(`Error: ${errorMessage(error)}`);
      await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_refused");
      return exitAfterAnalyticsFlush(1);
    }
    process.stdout.write(`${buildEvalInitPrompt(y, e, {
      evalDir: pluginManifestAdvisory.value.dir,
      evalDirFlag: isFromEvalDirFlag(pluginManifestAdvisory.value),
      pluginDirTrusted: isPathTrusted(y),
    })}
`);
    await logFeatureSadAsync("cli_plugin_eval_init", "delegated_to_parent");
    return exitAfterAnalyticsFlush(0);
  }
  if (w.kind === "interview") {
    let G = await confirmPluginTrust({
      pluginDir: y,
      installedPluginId: undefined,
      trustPluginFlag: false,
      canPrompt: true,
      storageV5,
    });
    if (!G.trusted) {
      writeStderrLine(G.message);
      await logFeatureBadAsync("cli_plugin_eval_init_interactive", "untrusted_declined");
      return exitAfterAnalyticsFlush(1);
    }
    let J = [];
    try {
      await ensureOutputBase(y, pluginManifestAdvisory.value.segments, J);
    } catch (error) {
      await removeEmptyDirs(J);
      writeStderrLine(`Error: ${errorMessage(error)}`);
      await logFeatureBadAsync("cli_plugin_eval_init_interactive", "write_failed");
      await exitAfterAnalyticsFlush(1);
      return;
    }
    let Z = await launchEvalInitSession(y, e, pluginManifestAdvisory.value);
    await removeEmptyDirs(J);
    await exitAfterAnalyticsFlush(Z);
    return;
  }
  if (!n.bare && !isTTY)
    process.stderr
      .write(`No TTY available \u2014 writing a blank template. Re-run in a terminal for the authoring interview.
`);
  let joined = path.join(y, pluginManifestAdvisory.value.dir, w.caseName);
  let joined_2 = path.join(joined, "prompt.md");
  let joined_3 = path.join(joined, "graders", "criteria.md");
  let X = false;
  let W = [];
  try {
    await ensureOutputBase(y, pluginManifestAdvisory.value.segments, W);
    await mkdir(joined, {
      mode: 493,
    });
    X = true;
    await mkdir(path.join(joined, "graders"), {
      mode: 493,
    });
    await writeOutputFile(joined_2, AGENT_PROMPT_TEMPLATE, true);
    await writeOutputFile(joined_3, GRADER_TEMPLATE, true);
    process.stdout.write(`Created ${path.relative(y, joined_2)} and ${path.relative(y, joined_3)}
`);
    await logFeatureOkAsync("cli_plugin_eval_init");
    return exitAfterAnalyticsFlush(0);
  } catch (error) {
    if (X)
      await rm_2(joined, {
        recursive: true,
        force: true,
      }).catch(() => {});
    await removeEmptyDirs(W);
    await logFeatureBadAsync("cli_plugin_eval_init", "write_failed");
    writeStderrLine(`Error: ${errorMessage(error)}`);
    return exitAfterAnalyticsFlush(1);
  }
}
//@ chunk-qchp9vrd.js:310504-311529 placement
async function launchEvalInitSession(e, n, r) {
  let evalInitInterviewPrompt = buildEvalInitInterviewPrompt(e, n, {
    evalDir: r.dir,
    evalDirFlag: isFromEvalDirFlag(r),
  });
  let execPath = process.execPath;
  let w = [
    ...(isStandaloneExecutable() || !process.argv[1] ? [] : [process.argv[1]]),
    "--append-system-prompt",
    evalInitInterviewPrompt,
    ...(doesEnterpriseMcpConfigExist() ? [] : ["--strict-mcp-config"]),
    "--",
    EVAL_INIT_FIRST_MESSAGE,
  ];
  stopCapturingEarlyInput();
  if (process.stdin.isTTY)
    try {
      process.stdin.setRawMode(false);
    } catch {}
  for (let y of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
    process.removeAllListeners(y);
    process.on(y, () => {});
  }
  env.set("CLAUDE_CODE_EVAL_INTERVIEW_SESSION", true);
  let b = spawnSync(execPath, w, {
    cwd: e,
    stdio: "inherit",
    env: withLaunchValuesOfHybridConnection(process.env),
  });
  if (b.error) {
    await logFeatureBadAsync("cli_plugin_eval_init_interactive", "spawn_failed");
    process.stderr.write(`${replaceControlChars(`Failed to start interview session: ${b.error.message}`)}
`);
    return 1;
  }
  if (b.status === 0) {
    await logFeatureOkAsync("cli_plugin_eval_init_interactive");
    return 0;
  }
  if (b.status === null && b.signal !== null) {
    await (b.signal === "SIGINT"
      ? logFeatureSadAsync("cli_plugin_eval_init_interactive", "interrupted")
      : logFeatureBadAsync("cli_plugin_eval_init_interactive", "signal_killed"));
    return 128 + (os_2.constants.signals[b.signal] ?? 1);
  }
  await logFeatureBadAsync("cli_plugin_eval_init_interactive", "nonzero_exit");
  return b.status ?? 1;
}
//@ chunk-qchp9vrd.js:311529-311651 placement
async function handleEvalInterrupt(e) {
  await logFeatureSadAsync("cli_plugin_eval", e === "SIGTERM" ? "terminated" : "interrupted");
  await gracefulShutdown(e === "SIGTERM" ? 143 : 130);
}
