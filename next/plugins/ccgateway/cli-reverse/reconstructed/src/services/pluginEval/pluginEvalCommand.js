/**
 * services/pluginEval/pluginEvalCommand.ts
 *
 * 2.1.316 新增：claude plugin eval / plugin eval init 子命令入口、结果发布与 --json 输出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import path from "path";
import { mkdir, lstat, rm as rm_2 } from "fs/promises";
import { spawnSync } from "child_process";
import os from "os";
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
import { countWhere } from "../../utils/collections.js";
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

//@ chunk-af1hzzme.js:288792-288886 placement
/**
 * 是否可以在终端里交互询问。
 */
function canPromptInteractively({ json }) {
  return process.stdin.isTTY === true && process.stdout.isTTY === true && !json && !isEnvTruthy(false);
}
//@ chunk-af1hzzme.js:288886-290536 placement
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
  let displayDir = escapeNonAscii(pluginDir);
  if (!canPrompt)
    return {
      trusted: false,
      reason: "no_prompt",
      message: `Error: ${displayDir} is not a trusted plugin directory, and this run cannot stop to ask you about it (no interactive terminal, or --json / CI). \`claude plugin eval\` loads the plugin and runs its eval suite on this machine as you - only evaluate plugins you trust. Run it once in a terminal to trust this directory, or pass ${TRUST_PLUGIN_FLAG} to assert that you trust this plugin's code and eval suite (e.g. in CI).`,
    };
  let storageRoot = uncachedStorageRootFor(pluginDir);
  let trustsRepo = storageRoot !== null && storageRoot !== pluginDir;
  stopCapturingEarlyInput();
  let notice =
    `
\`claude plugin eval\` loads this plugin (its skills, hooks and MCP servers) and runs its eval suite - prompts and graders; scaffold scripts only with --scaffold - on this machine, as you. The run is sandboxed where the platform supports it, which limits what a malicious plugin can reach but is not a guarantee against one. A plugin's own suite passing says nothing about whether the plugin is safe.
  Plugin directory: ${displayDir}
` +
    (trustsRepo
      ? `  Trusting it marks the whole repository as trusted: ${escapeNonAscii(storageRoot)}
`
      : "") +
    `Only evaluate plugins you trust.
`;
  process.stdout.write(notice);
  if (
    !(await confirmPrompt("Trust this plugin directory?", input, {
      ignoreAnswersWithinMs: answerGraceMs,
      reaskPreamble: notice,
    }))
  )
    return {
      trusted: false,
      reason: "declined",
      message: `Not trusted - nothing from ${displayDir} was loaded or run.`,
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
//@ chunk-af1hzzme.js:290536-290545 placement
/**
 * 并发上限（8）。
 */
var MAX_CONCURRENCY = 8;
//@ chunk-af1hzzme.js:290545-291681 placement
async function resolveEvalPluginTarget(target, storageV5) {
  if (target.includes(path.sep) || target.includes("/"))
    return {
      kind: "path",
      root: target,
    };
  let pluginAtMarketplace = parsePluginAtMarketplace(target);
  if (!pluginAtMarketplace && target.includes("@"))
    return {
      kind: "path",
      root: target,
    };
  if (pluginAtMarketplace && pluginAtMarketplace.marketplace !== SKILLS_DIR) {
    let installations = (
      isStorageV5Enabled() && storageV5 !== undefined
        ? await getInstalledPluginsAsync(storageV5)
        : getInstalledPlugins()
    ).plugins[target];
    if (!installations || installations.length === 0)
      return {
        kind: "path",
        root: target,
      };
    let pluginSourceLocation = await resolvePluginSourceLocation(target, storageV5);
    if (pluginSourceLocation.kind === "folder")
      return {
        kind: "plugin",
        root: pluginSourceLocation.path,
        pluginId: target,
        vouchedRoots: getMarketplaceCandidatePaths(
          target,
          await loadKnownMarketplacesSafe(storageV5),
          tryUnwrapTextPayload(),
        ),
      };
    if (pluginSourceLocation.kind === "unresolved")
      return {
        kind: "folder-unresolved",
        pluginId: target,
        reason: pluginSourceLocation.reason,
      };
    let projectInstallations = filterInstallationsForCurrentProject(installations);
    let candidateInstallations = projectInstallations.length > 0 ? projectInstallations : installations;
    let trustedRoots = getMarketplaceCandidatePaths(
      target,
      await loadKnownMarketplacesSafe(storageV5),
      tryUnwrapTextPayload(),
    );
    for (let installation of candidateInstallations) {
      let { absolute, suspect } = classifyMarketplacePath(installation.installPath, {
        trustedRoots,
      });
      if (!suspect)
        return {
          kind: "plugin",
          root: absolute,
          pluginId: target,
        };
    }
    return {
      kind: "refused",
      pluginId: target,
    };
  }
  let found = (await loadSkillsAsPlugins(isStorageV5Enabled() ? storageV5 : undefined)).plugins.find(
    (plugin) => plugin.name === (pluginAtMarketplace ? pluginAtMarketplace.name : target),
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
          root: target,
        };
  let matches = [
    ...Object.keys(
      (isStorageV5Enabled() && storageV5 !== undefined
        ? await getInstalledPluginsAsync(storageV5)
        : getInstalledPlugins()
      ).plugins,
    ).filter((key) => parsePluginAtMarketplace(key)?.name === target),
    ...(found ? [found.source] : []),
  ];
  if (matches.length === 0)
    return {
      kind: "path",
      root: target,
    };
  if (matches.length > 1)
    return {
      kind: "ambiguous",
      matches,
    };
  if (found)
    return {
      kind: "plugin",
      root: found.path,
      pluginId: found.source,
    };
  return resolveEvalPluginTarget(matches[0], storageV5);
}
//@ chunk-af1hzzme.js:291681-302420 placement
/**
 * claude plugin eval 入口：解析插件与评测目录、预检、运行套件并输出报告（约 11 KB）。
 */
async function pluginEvalHandler(targetArg, options, storageV5, credentials) {
  let rootPath = targetArg ?? getCwd();
  let pluginId;
  let vouchedRoots = [];
  if (targetArg) {
    let evalPluginTarget = await resolveEvalPluginTarget(targetArg, storageV5);
    if (evalPluginTarget.kind === "ambiguous") {
      process.stderr
        .write(`${replaceControlChars(`Error: plugin name "${targetArg}" is ambiguous \u2014 matches ${evalPluginTarget.matches.join(", ")}. Specify the full plugin@marketplace identifier.`)}
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
    rootPath = evalPluginTarget.root;
    if (evalPluginTarget.kind === "plugin") {
      pluginId = evalPluginTarget.pluginId;
      vouchedRoots = evalPluginTarget.vouchedRoots ?? [];
    }
  }
  if (options.runs !== undefined && (!Number.isInteger(options.runs) || options.runs < 1)) {
    process.stderr.write(`Error: --runs must be a positive integer
`);
    process.exit(1);
  }
  if (
    options.threshold !== undefined &&
    (!Number.isFinite(options.threshold) || options.threshold < 0 || options.threshold > 1)
  ) {
    process.stderr.write(`Error: --threshold must be between 0 and 1
`);
    process.exit(1);
  }
  if (options.mocks !== undefined && options.mocks !== "record" && options.mocks !== "off") {
    process.stderr.write(`Error: --mocks must be record or off
`);
    process.exit(1);
  }
  let mocks = options.mocks === "off" ? "off" : "record";
  if (typeof options.json === "string" && !options.json.endsWith(".json")) {
    process.stderr.write(
      options.json === ""
        ? `Error: --json requires a non-empty file path
`
        : `Error: --json output path must end in .json (got '${options.json}'). If that is your eval target, put it before --json.
`,
    );
    process.exit(1);
  }
  if (options.report === "") {
    process.stderr.write(`Error: --report requires a non-empty file path
`);
    process.exit(1);
  }
  if (options.publish === false && options.publishReport) {
    process.stderr.write(`Error: --no-publish and --publish-report are contradictory \u2014 pass at most one.
`);
    process.exit(1);
  }
  if (options.maxCostUsd !== undefined && (!Number.isFinite(options.maxCostUsd) || options.maxCostUsd < 0)) {
    process.stderr.write(`Error: --max-cost-usd must be a non-negative number
`);
    process.exit(1);
  }
  let concurrency = options.concurrency === undefined ? 1 : Number(options.concurrency);
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > MAX_CONCURRENCY ||
    !/^\d+$/.test(options.concurrency ?? "1")
  ) {
    process.stderr.write(`Error: --concurrency must be a whole number from 1 to ${MAX_CONCURRENCY}
`);
    process.exit(1);
  }
  let trust = checkTreeTrust();
  let targetInfo;
  try {
    targetInfo = await resolveEvalTargetPlugin(rootPath, pluginId, trust, vouchedRoots);
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
  let { targetDir, pluginRoot, untrustedManifestDir, targetResolved, enclosingVerdict, targetIsCaseFile } =
    targetInfo;
  let targetUnresolved = !targetResolved && pluginId === undefined;
  let trustResult = await confirmPluginTrust({
    pluginDir: pluginRoot ?? targetDir,
    installedPluginId: pluginId,
    trustPluginFlag: options.trustPlugin === true,
    canPrompt:
      !targetUnresolved &&
      canPromptInteractively({
        json: options.json,
      }),
    storageV5,
  });
  if (!trustResult.trusted) {
    if (targetUnresolved) {
      writeStderrLine(
        `Error: ${escapeNonAscii(targetDir)} could not be found or read - nothing to evaluate (nothing was loaded or run).`,
      );
      await logFeatureBadAsync("cli_plugin_eval", "target_unresolved");
      return exitAfterAnalyticsFlush(1);
    }
    writeStderrLine(trustResult.message);
    await logFeatureBadAsync(
      "cli_plugin_eval",
      trustResult.reason === "declined" ? "untrusted_declined" : "untrusted_no_prompt",
    );
    return exitAfterAnalyticsFlush(1);
  }
  let enclosing =
    targetResolved &&
    pluginRoot === null &&
    untrustedManifestDir === null &&
    !pluginId &&
    enclosingVerdict !== null
      ? enclosingVerdict
      : {
          adopted: null,
          refused: null,
          namedOnly: null,
        };
  let adoptedAbove = enclosing.adopted ?? (targetIsCaseFile ? null : enclosing.namedOnly);
  let refused = enclosing.refused;
  let namedOnly = targetIsCaseFile ? enclosing.namedOnly : null;
  let otherManifestDir =
    pluginRoot === null ? (untrustedManifestDir ?? adoptedAbove ?? refused ?? namedOnly) : null;
  let pluginManifestAdvisory = await readPluginManifestAdvisory({
    flag: options.evalDir,
    ...resolveOverlapRoots({
      scopeDir: targetDir,
      scopeIsNamedDirectory: !targetIsCaseFile,
      trustedRoot: pluginRoot,
      otherManifestDir,
      adoptedAbove: enclosing.adopted,
    }),
    writesToPlugin: !pluginId && options.outputDir === undefined,
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
  let reasonOf = (folderPath) => reasonFor(folderPath, trust);
  if (untrustedManifestDir !== null && untrustedManifestDir === targetDir)
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(untrustedManifestDir)} is NOT loaded \u2014 ${reasonOf(untrustedManifestDir)}; each case that would auto-detect it is reported as refused instead of running \u2014 fix that, or name that directory itself as the target to evaluate it (naming a directory is consent to load)`,
    );
  let refusedDir =
    untrustedManifestDir !== null && untrustedManifestDir !== targetDir ? untrustedManifestDir : refused;
  if (refusedDir !== null)
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(refusedDir)} is NOT loaded \u2014 ${reasonOf(refusedDir)}; cases run against baseline Claude (unless they load a plugin beneath the target) \u2014 fix that, or name the plugin directory itself as the target to evaluate it (naming is consent to load)`,
    );
  if (namedOnly !== null)
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(namedOnly)} is NOT loaded \u2014 file ownership cannot be verified where it lives, so a plugin outside the consulted scope is not adopted; only ${targetDir} is scanned and cases run against baseline Claude (unless they load a plugin beneath the target) \u2014 run from within that plugin, or target the plugin directory`,
    );
  if (adoptedAbove !== null) {
    let scopePhrase = isSameOrInside(targetDir, await realCwd(trust))
      ? "above the working directory"
      : "outside the consulted scope";
    writeStderrLine(
      `Note: the plugin in ${escapeNonAscii(adoptedAbove)} (${scopePhrase}) is NOT loaded \u2014 only ${targetDir} is scanned and cases run against baseline Claude (unless they load a plugin beneath the target); run from that plugin's directory or target it to evaluate it`,
    );
  }
  if (pluginRoot !== null && pluginRoot !== targetDir && !pluginId)
    writeStderrLine(
      `Evaluating plugin ${pluginRoot} (the target is inside it; the plugin is loaded for the run)`,
    );
  if (pluginManifestAdvisory.value.source === "manifest" && !options.json)
    writeStderrLine(
      `Using eval directory ${displayDir(pluginManifestAdvisory.value)}/ from ${escapeNonAscii(pluginManifestAdvisory.value.manifestPath)}`,
    );
  let abortController = createAbortController();
  let interruptSignal = null;
  let onSigint = () => {
    interruptSignal ??= "SIGINT";
    markStdoutDrainExternallyClocked();
    if (!abortController.signal.aborted) {
      process.stderr.write(`
Interrupted \u2014 finishing up\u2026
`);
      abortController.abort();
    }
  };
  let onSigterm = () => {
    interruptSignal ??= "SIGTERM";
    if (!abortController.signal.aborted) {
      process.stderr.write(`
Terminated \u2014 finishing up\u2026
`);
      abortController.abort();
    }
  };
  markPrintModeSignalHandlersRegistered();
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  let noScaffold = options.noScaffold ?? true;
  if (options.noScaffold === false)
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
      rootPath,
      evalDirSegments: pluginManifestAdvisory.value.segments,
      frameRoot: pluginRoot,
      adoptionDecided: pluginId !== undefined || targetResolved,
      trust,
      targetScreened: true,
      consentDecided: pluginId !== undefined || targetResolved,
      caseGlob: options.case,
      tags: options.tag,
      runs: options.runs,
      concurrency,
      model: options.model,
      judgeModel: options.judgeModel,
      maxCostUsd: options.maxCostUsd,
      threshold: options.threshold ?? 1,
      allowTools: options.allowTools ?? [],
      disallowTools: options.disallowTools ?? [],
      noScaffold,
      keepTemp: options.keepTemp ?? false,
      mocks,
      allowRealServers: options.allowRealServers === true,
      keepFailedRuns: !options.json,
      verbose: options.verbose ?? false,
      ablation: options.ablation ?? (pluginId ? "with-without" : "auto"),
      onLine: (line) => {
        if (!options.json)
          process.stderr.write(`${replaceControlChars(line)}
`);
      },
      onNotice: (notice) =>
        process.stderr.write(`${replaceControlChars(notice)}
`),
      signal: abortController.signal,
      authPreflight: logEventTo1P,
      credentials,
    });
    let schemaCheck = await checkResultSchemaDrift({
      aggregate: report,
      resolvedCases,
      root,
      ablation,
      pluginId,
      modelOverride: options.model,
      judgeModel: options.judgeModel,
      caseFilter: options.case,
      tagFilters: options.tag,
      threshold: options.threshold ?? 1,
    });
    if (
      report.cases.length === 0 &&
      errors.length === 0 &&
      !report.partial &&
      !abortController.signal.aborted
    ) {
      let filterFlags = [
        ...(options.case ? [`--case "${options.case}"`] : []),
        ...(options.tag ? options.tag.map((tag) => `--tag "${tag}"`) : []),
      ];
      let filterSuffix = filterFlags.length > 0 ? ` matching ${filterFlags.join(" ")}` : "";
      writeStderrLine(`No eval cases found${filterSuffix} under ${targetDir}.`);
      if (!options.json) {
        let otherManifestDir = adoptedAbove;
        process.stderr.write(
          filterFlags.length > 0
            ? `Run without ${filterFlags.length > 1 ? "the filters" : firstLineOf(filterFlags[0], " ")} to see all cases.
`
            : stripControlChars(
                `Cases are expected in a ${displayDir(pluginManifestAdvisory.value)}/ directory under ${pluginRoot ?? targetDir} (${describeEvalDirSource(pluginManifestAdvisory.value)}), each case a directory containing case.yaml or prompt.md.
` +
                  (pluginRoot !== null && pluginRoot !== targetDir
                    ? describeEvalDirScanScope(targetDir, pluginRoot, pluginManifestAdvisory.value)
                    : "") +
                  (untrustedManifestDir !== null
                    ? `The plugin manifest in ${untrustedManifestDir} was not consulted (${reasonFor(untrustedManifestDir, trust)})${pluginManifestAdvisory.value.source === "flag" ? " (so its layout did not frame --eval-dir either)" : "; pass --eval-dir to name the directory"}.
`
                    : "") +
                  (otherManifestDir !== null
                    ? otherManifestDir === enclosing.adopted
                      ? `A plugin manifest of yours outside the consulted scope, in ${otherManifestDir}, was not consulted; ${pluginManifestAdvisory.value.source === "flag" ? "target that plugin directly if it is the one you mean" : "pass --eval-dir here, or target that plugin directly if it is the one you mean"}.
`
                      : `A plugin manifest outside the consulted scope, in ${otherManifestDir}, was not consulted (whether it is yours cannot be verified here); ${pluginManifestAdvisory.value.source === "flag" ? "evaluate that plugin from your own copy if it is yours" : "pass --eval-dir here"}.
`
                    : ""),
              ) +
                (pluginId
                  ? ""
                  : `Run \`claude plugin eval init${isFromEvalDirFlag(pluginManifestAdvisory.value)}\` for a guided interview, or \`claude plugin eval init --bare <name>${isFromEvalDirFlag(pluginManifestAdvisory.value)}\` to scaffold a blank case.
`),
        );
      } else if ((await writeJsonResult(options.json, schemaCheck)) && typeof options.json === "string")
        await writeStdoutAndDrain(`Wrote ${options.json}
`);
      await publishEvalResults({
        options,
        abortSignal: abortController.signal,
        credentials,
        result: schemaCheck.result,
        defaultReportDir: null,
      });
      if (abortController.signal.aborted) return handleEvalInterrupt(interruptSignal);
      await logFeatureSadAsync("cli_plugin_eval", "no_cases");
      return exitAfterAnalyticsFlush(1);
    }
    let suiteDir = pluginId ? null : (suite ?? null);
    let resultsBase = pluginId ? getCwd() : (suiteDir ?? root);
    let vetResultsOwnership = !pluginId && targetIsCaseFile && pluginRoot === null;
    let resultSegments =
      pluginId && pluginManifestAdvisory.value.source === "manifest"
        ? [EVALS_DIR_NAME]
        : pluginId && pluginManifestAdvisory.value.source === "flag"
          ? segments
          : pluginManifestAdvisory.value.segments;
    let joined = resultSegments.join(path.sep);
    let resultDirSegments = [
      ...(suiteDir === null ? resultSegments : []),
      "results",
      report.started_at.replace(/[:.]/g, "-"),
    ];
    let resultsDir = options.outputDir ?? path.join(resultsBase, ...resultDirSegments);
    if (pluginId && options.outputDir === undefined) {
      let componentOverlap = await checkDeclaredComponentPaths(resultsBase, resultDirSegments);
      if (componentOverlap !== undefined)
        writeStderrLine(
          `Warning: results are written under ${path.join(resultsBase, joined)}: ${componentOverlap} \u2014 files written there may be loaded as plugin components; pass --output-dir to write elsewhere`,
        );
    }
    let resultJson = stripInvisibleChars(jsonStringify(schemaCheck.result, undefined, 2));
    let jsonWithheld = false;
    let shouldWriteResults = report.cases.length > 0 || errors.length === 0;
    let resultsWritable = true;
    if (shouldWriteResults) {
      let createdDirs = [];
      try {
        if (options.outputDir === undefined) {
          await ensureOutputBase(resultsBase, resultDirSegments, createdDirs, {
            vetOwnership: vetResultsOwnership ? trust : null,
          });
          if (createdDirs.at(-1) !== resultsDir)
            throw new EscapesBaseError(
              `results directory ${resultsDir} already existed \u2014 a default results directory is always new; refusing to write into it`,
            );
        } else
          await mkdir(resultsDir, {
            recursive: true,
          });
        await writeOutputFile(
          path.join(resultsDir, "aggregate-result.json"),
          `${resultJson}
`,
          options.outputDir === undefined,
        );
        try {
          await writeMockRecordings(resultsDir, report, options.outputDir === undefined);
        } catch (error) {
          writeStderrLine(
            `warning: agent-mock recordings not written \u2014 adopt nothing from ${path.join(resultsDir, MOCK_RECORDINGS)}: ${errorMessage(error).replace(/[\r\n]+/g, " ")}`,
          );
        }
      } catch (error) {
        await removeEmptyDirs(createdDirs);
        if (error instanceof EscapesBaseError || createdDirs.length > 0) resultsWritable = false;
        writeStderrLine(`warning: could not write results: ${errorMessage(error)}`);
      }
    }
    if (options.json) {
      for (let error of errors)
        process.stderr.write(`\u2717 ${replaceControlChars(`${error.file}: ${error.error}`)}
`);
      if (errors.length > 0 && !authPreflightFailed && !gitPreflightFailed)
        process.stderr.write(`${errors.length} case file(s) failed to load
`);
      let jsonWritten = await writeJsonResult(options.json, schemaCheck, resultJson);
      if (jsonWritten && typeof options.json === "string")
        await writeStdoutAndDrain(`Wrote ${options.json}
`);
      else if (!jsonWritten && exitCode === 0) jsonWithheld = true;
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
        report.cases.some(
          (caseReport) =>
            caseReport.score < (options.threshold ?? 1) || caseReport.runs.some((run) => run.error),
        ) &&
        !options.keepTemp
      )
        process.stdout.write(`
Re-run with --keep-temp to preserve each run's sandbox (workspace + trace.jsonl) for debugging.
`);
    }
    await publishEvalResults({
      options,
      abortSignal: abortController.signal,
      credentials,
      result: schemaCheck.result,
      defaultReportDir: report.cases.length > 0 && resultsWritable ? resultsDir : null,
      verifyDefaultReportDir:
        options.outputDir === undefined
          ? () =>
              ensureOutputBase(resultsBase, resultDirSegments, [], {
                vetOwnership: vetResultsOwnership ? trust : null,
                create: false,
              })
          : undefined,
    });
    if (abortController.signal.aborted) return handleEvalInterrupt(interruptSignal);
    if (jsonWithheld) return exitAfterAnalyticsFlush(1);
    await logPluginEvalFailure(
      report,
      errors,
      exitCode,
      options.threshold ?? 1,
      trustResult.source,
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
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }
}
//@ chunk-af1hzzme.js:302420-303214 placement
async function logPluginEvalFailure(
  report,
  errors,
  exitCode,
  threshold,
  source,
  authPreflightFailed = false,
  harnessFailures = 0,
  gitPreflightFailed = false,
) {
  if (authPreflightFailed) {
    await logFeatureBadAsync("cli_plugin_eval", "auth_preflight_failed");
    return;
  }
  if (gitPreflightFailed) {
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
  let failingCount = countWhere(report.cases, (caseReport) => caseReport.score < threshold);
  await logFeatureOkAsync("cli_plugin_eval", {
    trust_source: fromEnum(source),
    all_passed: failingCount === 0,
    num_cases: report.cases.length,
    num_failing_cases: failingCount,
    num_cases_with_run_errors: countWhere(
      report.cases,
      (caseReport) =>
        caseReport.runs.some((run) => run.error) ||
        (caseReport.runs_without?.some((run) => run.error) ?? false),
    ),
  });
}
//@ chunk-af1hzzme.js:303214-306524 placement
/**
 * 把评测结果发布为 Artifact（中断时跳过）。
 */
async function publishEvalResults(input) {
  let stage = "setup";
  let reportWritten = false;
  let { options, abortSignal, credentials, result, defaultReportDir, verifyDefaultReportDir } = input;
  let wantsReport = options.report !== undefined;
  let forcePublish = options.publishReport === true;
  let hasDefaultDir = defaultReportDir !== null;
  if (!wantsReport && !forcePublish && !hasDefaultDir) return;
  let inClaudeSession = isOnClaudeCodeSessionSurface();
  let publishAllowed =
    options.publish !== false &&
    !forcePublish &&
    hasDefaultDir &&
    !env.CLAUDE_CODE_EVAL_INTERVIEW_SESSION &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_quartz_thimble", true);
  let keepLocalForSession = publishAllowed && inClaudeSession;
  let shouldPublish = options.publish !== false && (forcePublish || (publishAllowed && !inClaudeSession));
  try {
    let { evalReportTitle, renderEvalReportFragment, wrapReportDocument } =
      await import("../../cli/handlers/pluginEval/evalReportTitle.lazy.js");
    let artifactAvailable = false;
    let failureReason = null;
    let hasLocalFallback = wantsReport || hasDefaultDir;
    if (shouldPublish)
      if (abortSignal.aborted) {
        if (forcePublish) {
          process.stderr.write(`Skipped publishing because the run was interrupted.
`);
          failureReason = "publish_interrupted";
        }
      } else {
        let { waitForPolicyLimitsToLoad } =
          await import("../policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
        await withTimeout(waitForPolicyLimitsToLoad(), 3000, "policy limits load timed out").catch(() => {});
        let { isArtifactToolEnabled } = await import("../artifacts/artifactToolGates.js");
        let artifactToolEnabled = isArtifactToolEnabled();
        let { getArtifactCreateNotice } = await import("../policyLimits/CLIENT_POLICY_KEYS.lazy.js");
        let createNotice = artifactToolEnabled ? getArtifactCreateNotice() : null;
        artifactAvailable = artifactToolEnabled && createNotice === null;
        if (!artifactAvailable && forcePublish) {
          process.stderr
            .write(`Publishing is unavailable: ${createNotice === null ? "claude.ai artifacts are turned off for this account, provider, or privacy mode." : "your organization requires a person to approve each new artifact, and this command can't ask."} ${hasLocalFallback ? "A local copy is written instead." : "Use --report <path> to write the report locally."}
`);
          failureReason = "publish_unavailable";
        }
      }
    if (wantsReport || hasDefaultDir || artifactAvailable) {
      stage = "render";
      let fragment = renderEvalReportFragment(result);
      let reportPath =
        options.report !== undefined
          ? path.resolve(getCwd(), options.report)
          : hasDefaultDir
            ? path.join(defaultReportDir, "report.html")
            : null;
      let reportHtml = reportPath !== null ? wrapReportDocument(result, fragment) : "";
      stage = "publish";
      if (reportPath !== null)
        try {
          if (options.report === undefined && verifyDefaultReportDir) await verifyDefaultReportDir();
          else
            await mkdir(path.dirname(reportPath), {
              recursive: true,
            });
          await writeOutputFile(
            reportPath,
            reportHtml,
            options.report === undefined && options.outputDir === undefined,
          );
          writeStderrLine(
            `Report: ${reportPath}${keepLocalForSession ? " (kept local: this run appears to have been started by a Claude Code session rather than a person \u2014 add --publish-report to publish it, where publishing is available)" : ""}`,
          );
          reportWritten = true;
        } catch (error) {
          writeStderrLine(`Couldn't write the report to ${reportPath}: ${errorMessage(error)}`);
          failureReason = "write_failed";
        }
      if (artifactAvailable)
        if (abortSignal.aborted) {
          if (forcePublish) {
            process.stderr.write(`Skipped publishing because the run was interrupted.
`);
            failureReason ??= "publish_interrupted";
          }
        } else {
          let { publishArtifact } = await import("../artifacts/ARTIFACT_LIST_RELS.lazy.js");
          let { makeLocalOwnPublishesStore } = await import("../artifacts/ownPublishes.js");
          process.stderr.write(`Publishing report to claude.ai (private to you)\u2026
`);
          let publishResult = await publishArtifact(fragment, {
            ownPublishes: makeLocalOwnPublishesStore(),
            title: `Eval report \u2014 ${evalReportTitle(result)}`,
            favicon: "",
            icon: "test",
            description: `claude plugin eval \u2014 ${result.cases.length} ${plural(result.cases.length, "case")}`,
            signal: abortSignal,
            credentials,
          });
          if (publishResult.err === null) {
            process.stderr
              .write(`Published: ${publishResult.url}${forcePublish ? "" : " \xB7 keep local next time with --no-publish"}
`);
            reportWritten = true;
          } else {
            process.stderr.write(
              reportWritten
                ? `${replaceControlChars(`Couldn't publish the report (${publishResult.err}); the local copy above is still available.`)}
`
                : `${replaceControlChars(`Couldn't publish the report (${publishResult.err}). Use --report <path> to write it locally.`)}
`,
            );
            failureReason ??= "publish_failed";
          }
        }
    }
    if (failureReason === null) await logFeatureOkAsync("cli_plugin_eval_report");
    else if (reportWritten) await logFeatureSadAsync("cli_plugin_eval_report", failureReason);
    else if (failureReason === "publish_interrupted")
      await logFeatureSadAsync("cli_plugin_eval_report", failureReason);
    else await logFeatureBadAsync("cli_plugin_eval_report", failureReason);
  } catch (error) {
    writeStderrLine(
      `${stage === "render" ? "Couldn't build the HTML report" : stage === "setup" ? "Couldn't prepare to publish the report" : "Couldn't finish publishing the report"}: ${errorMessage(error)}`,
    );
    let reasonCode =
      stage === "render" ? "render_failed" : stage === "setup" ? "publish_setup_failed" : "publish_failed";
    await (reportWritten
      ? logFeatureSadAsync("cli_plugin_eval_report", reasonCode)
      : logFeatureBadAsync("cli_plugin_eval_report", reasonCode));
  }
}
//@ chunk-af1hzzme.js:306524-306562 placement
/**
 * 输出名允许的字符正则。
 */
var OUTPUT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-af1hzzme.js:306562-306918 placement
async function checkResultSchemaDrift(input) {
  let summary = formatEvalSummary(input);
  let parsed = optionalRunStopSchema().safeParse(summary);
  if (!parsed.success) {
    let issue = parsed.error.issues[0];
    let issueText = issue ? `${issue.path.join(".") || "(root)"}: ${issue.message}` : "schema drift";
    process.stderr
      .write(`warning: eval result does not match resultSchema.ts (${issueText}) \u2014 please report this bug
`);
    await logFeatureSadAsync("cli_plugin_eval", "result_schema_drift");
  }
  return {
    result: summary,
    valid: parsed.success,
  };
}
//@ chunk-af1hzzme.js:306918-307487 placement
async function writeJsonResult(json, { result, valid }, preRendered) {
  if (!valid) {
    process.stderr.write(`warning: --json result withheld because it failed schema validation
`);
    await logFeatureSadAsync("cli_plugin_eval", "json_withheld_invalid");
    return false;
  }
  try {
    let jsonText = `${preRendered ?? stripInvisibleChars(jsonStringify(result, undefined, 2))}
`;
    if (json === true)
      await new Promise((resolve, reject) => {
        process.stdout.write(jsonText, (writeError) => (writeError ? reject(writeError) : resolve()));
      });
    else {
      let resolved = path.resolve(getCwd(), json);
      await mkdir(path.dirname(resolved), {
        recursive: true,
      });
      await writeOutputFile(resolved, jsonText, false);
    }
    return true;
  } catch (error) {
    process.stderr.write(`${replaceControlChars(`warning: could not write --json result: ${String(error)}`)}
`);
    await logFeatureSadAsync("cli_plugin_eval", "json_write_failed");
    return false;
  }
}
//@ chunk-af1hzzme.js:307487-311968 placement
/**
 * claude plugin eval init 入口：需要交互终端，启动访谈式用例编写会话。
 */
async function pluginEvalInitHandler(caseNameArg, options = {}, storageV5) {
  let isTTY = process.stdin.isTTY && process.stdout.isTTY;
  let wantsInterview = !options.bare && (options.forceInteractive || isTTY);
  let inHeadlessSession = !options.bare && isHeadlessToolCallOfClaudeCodeSession();
  if (wantsInterview && !isTTY && !inHeadlessSession) {
    process.stderr.write(
      caseNameArg
        ? `The authoring interview requires an interactive terminal (TTY). Run \`claude plugin eval init\` in a terminal, or drop --interactive to write a blank template for \`${caseNameArg}\` instead.
`
        : "The authoring interview requires an interactive terminal (TTY). Run `claude plugin eval init` in a terminal, or drop --interactive and pass a case name (e.g. `claude plugin eval init my-case`) to write a blank template instead.\n",
    );
    await logFeatureBadAsync("cli_plugin_eval_init", "no_tty");
    return exitAfterAnalyticsFlush(1);
  }
  if (
    caseNameArg !== undefined &&
    (!OUTPUT_NAME_RE.test(caseNameArg) || describeWindowsUnsafeName(caseNameArg) !== undefined)
  ) {
    let nameProblem = !OUTPUT_NAME_RE.test(caseNameArg)
      ? "use letters, digits, '.', '_', '-' only (no '/', no '..')"
      : `it ${describeWindowsUnsafeName(caseNameArg)}`;
    writeStderrLine(`Error: case name ${JSON.stringify(caseNameArg)} is invalid \u2014 ${nameProblem}`);
    await logFeatureBadAsync("cli_plugin_eval_init", "bad_case_name");
    return exitAfterAnalyticsFlush(1);
  }
  let mode = inHeadlessSession
    ? {
        kind: "delegate",
      }
    : wantsInterview
      ? {
          kind: "interview",
        }
      : caseNameArg
        ? {
            kind: "bare",
            caseName: caseNameArg,
          }
        : null;
  if (mode === null) {
    process.stderr.write(
      options.bare
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
  let trust = checkTreeTrust();
  let cwd = await realCwd(trust);
  trust.consentRoot = cwd;
  let nearestSkillFolder = await findNearestSkillFolder(cwd, cwd, trust);
  if (
    nearestSkillFolder === null &&
    options.evalDir === undefined &&
    !isNetworkMountRoot_2(cwd) &&
    (await lstat(path.join(cwd, EVALS_DIR_NAME)).catch(() => null))?.isDirectory() !== true &&
    !(await hasPluginComponents(cwd))
  ) {
    writeStderrLine(
      `Error: ${escapeNonAscii(cwd)} is not a plugin or skill folder \u2014 run \`claude plugin eval init\` from the plugin's root folder, or pass --eval-dir to scaffold here on purpose.`,
    );
    await logFeatureBadAsync("cli_plugin_eval_init", "cwd_not_a_plugin");
    return exitAfterAnalyticsFlush(1);
  }
  let pluginDirVerdict =
    nearestSkillFolder === null
      ? await resolvePluginDir(cwd, trust, "core")
      : {
          adopted: null,
          refused: null,
          namedOnly: null,
        };
  let otherManifestDir = pluginDirVerdict.adopted ?? pluginDirVerdict.refused ?? pluginDirVerdict.namedOnly;
  let pluginManifestAdvisory = await readPluginManifestAdvisory({
    flag: options.evalDir,
    ...resolveOverlapRoots({
      scopeDir: cwd,
      scopeIsNamedDirectory: true,
      trustedRoot: nearestSkillFolder,
      otherManifestDir: nearestSkillFolder === null ? otherManifestDir : null,
      adoptedAbove: pluginDirVerdict.adopted,
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
    pluginManifestAdvisory.value = await resolveEvalDirSource(cwd, pluginManifestAdvisory.value);
  } catch (error) {
    writeStderrLine(`Error: ${errorMessage(error)}`);
    await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_unvettable");
    return exitAfterAnalyticsFlush(1);
  }
  if (mode.kind === "delegate") {
    try {
      await ensureOutputBase(cwd, pluginManifestAdvisory.value.segments, [], {
        create: false,
        absentEndsChain: true,
      });
    } catch (error) {
      writeStderrLine(`Error: ${errorMessage(error)}`);
      await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_refused");
      return exitAfterAnalyticsFlush(1);
    }
    process.stdout.write(`${buildEvalInitPrompt(cwd, caseNameArg, {
      evalDir: pluginManifestAdvisory.value.dir,
      evalDirFlag: isFromEvalDirFlag(pluginManifestAdvisory.value),
      pluginDirTrusted: isPathTrusted(cwd),
    })}
`);
    await logFeatureSadAsync("cli_plugin_eval_init", "delegated_to_parent");
    return exitAfterAnalyticsFlush(0);
  }
  if (mode.kind === "interview") {
    let trustResult = await confirmPluginTrust({
      pluginDir: cwd,
      installedPluginId: undefined,
      trustPluginFlag: false,
      canPrompt: true,
      storageV5,
    });
    if (!trustResult.trusted) {
      writeStderrLine(trustResult.message);
      await logFeatureBadAsync("cli_plugin_eval_init_interactive", "untrusted_declined");
      return exitAfterAnalyticsFlush(1);
    }
    let createdDirs = [];
    try {
      await ensureOutputBase(cwd, pluginManifestAdvisory.value.segments, createdDirs);
    } catch (error) {
      await removeEmptyDirs(createdDirs);
      writeStderrLine(`Error: ${errorMessage(error)}`);
      await logFeatureBadAsync("cli_plugin_eval_init_interactive", "write_failed");
      await exitAfterAnalyticsFlush(1);
      return;
    }
    let exitCode = await launchEvalInitSession(cwd, caseNameArg, pluginManifestAdvisory.value);
    await removeEmptyDirs(createdDirs);
    await exitAfterAnalyticsFlush(exitCode);
    return;
  }
  if (!options.bare && !isTTY)
    process.stderr
      .write(`No TTY available \u2014 writing a blank template. Re-run in a terminal for the authoring interview.
`);
  let joined = path.join(cwd, pluginManifestAdvisory.value.dir, mode.caseName);
  let joined_2 = path.join(joined, "prompt.md");
  let joined_3 = path.join(joined, "graders", "criteria.md");
  let caseDirCreated = false;
  let createdDirs = [];
  try {
    await ensureOutputBase(cwd, pluginManifestAdvisory.value.segments, createdDirs);
    await mkdir(joined, {
      mode: 493,
    });
    caseDirCreated = true;
    await mkdir(path.join(joined, "graders"), {
      mode: 493,
    });
    await writeOutputFile(joined_2, AGENT_PROMPT_TEMPLATE, true);
    await writeOutputFile(joined_3, GRADER_TEMPLATE, true);
    process.stdout.write(`Created ${path.relative(cwd, joined_2)} and ${path.relative(cwd, joined_3)}
`);
    await logFeatureOkAsync("cli_plugin_eval_init");
    return exitAfterAnalyticsFlush(0);
  } catch (error) {
    if (caseDirCreated)
      await rm_2(joined, {
        recursive: true,
        force: true,
      }).catch(() => {});
    await removeEmptyDirs(createdDirs);
    await logFeatureBadAsync("cli_plugin_eval_init", "write_failed");
    writeStderrLine(`Error: ${errorMessage(error)}`);
    return exitAfterAnalyticsFlush(1);
  }
}
//@ chunk-af1hzzme.js:311968-312993 placement
async function launchEvalInitSession(pluginDir, caseName, evalDirSource) {
  let evalInitInterviewPrompt = buildEvalInitInterviewPrompt(pluginDir, caseName, {
    evalDir: evalDirSource.dir,
    evalDirFlag: isFromEvalDirFlag(evalDirSource),
  });
  let execPath = process.execPath;
  let args = [
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
  for (let signalName of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
    process.removeAllListeners(signalName);
    process.on(signalName, () => {});
  }
  env.set("CLAUDE_CODE_EVAL_INTERVIEW_SESSION", true);
  let child = spawnSync(execPath, args, {
    cwd: pluginDir,
    stdio: "inherit",
    env: withLaunchValuesOfHybridConnection(process.env),
  });
  if (child.error) {
    await logFeatureBadAsync("cli_plugin_eval_init_interactive", "spawn_failed");
    process.stderr.write(`${replaceControlChars(`Failed to start interview session: ${child.error.message}`)}
`);
    return 1;
  }
  if (child.status === 0) {
    await logFeatureOkAsync("cli_plugin_eval_init_interactive");
    return 0;
  }
  if (child.status === null && child.signal !== null) {
    await (child.signal === "SIGINT"
      ? logFeatureSadAsync("cli_plugin_eval_init_interactive", "interrupted")
      : logFeatureBadAsync("cli_plugin_eval_init_interactive", "signal_killed"));
    return 128 + (os.constants.signals[child.signal] ?? 1);
  }
  await logFeatureBadAsync("cli_plugin_eval_init_interactive", "nonzero_exit");
  return child.status ?? 1;
}
//@ chunk-af1hzzme.js:312993-313115 placement
async function handleEvalInterrupt(signalName) {
  await logFeatureSadAsync("cli_plugin_eval", signalName === "SIGTERM" ? "terminated" : "interrupted");
  await gracefulShutdown(signalName === "SIGTERM" ? 143 : 130);
}
export { pluginEvalHandler, pluginEvalInitHandler };
