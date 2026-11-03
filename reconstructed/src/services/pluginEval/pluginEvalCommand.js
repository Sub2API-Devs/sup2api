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
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
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
} from "fs/promises";
import { spawnSync } from "child_process";
import os_2, { default as os_2_2, default as os_3 } from "os";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { Agt, confirmPrompt } from "../../utils/confirmPrompt.js";
import { isPathTrusted } from "../../utils/config.js";
import { escapeNonAscii, replaceControlChars } from "../../utils/resultError.js";
import { TRUST_PLUGIN_FLAG, runEvalCase } from "./runSuite.js";
import { eA } from "../../utils/settings/settingsStorage.js";
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
import { checkTreeTrust, Un } from "./ownershipChecks.js";
import {
  resolveEvalTargetPlugin,
  ze,
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
  Cn,
  isFromEvalDirFlag,
  EVALS_DIR_NAME,
  checkDeclaredComponentPaths,
  describeWindowsUnsafeName,
} from "./evalDir.js";
import { ft, Ar, findNearestSkillFolder, resolvePluginDir } from "./caseDiscovery.js";
import { createAbortController } from "../../utils/abortController.js";
import { markStdoutDrainExternallyClocked } from "../../utils/process.js";
import { markPrintModeSignalHandlersRegistered, gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { logEventTo1P } from "./authPreflight.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { stripInvisibleChars } from "../../utils/confusables.js";
import { jsonStringify, isStandaloneExecutable } from "../../utils/slowOperations.js";
import { MOCK_RECORDINGS } from "./mocks/pluginMcpEnumeration.js";
import { formatEvalReportTable, formatEvalSummary, Jks } from "./evalReport.js";
import { count } from "../../utils/collections.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isOnClaudeCodeSessionSurface, isHeadlessToolCallOfClaudeCodeSession } from "../../utils/teammate.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { withTimeout } from "../../utils/sleep.js";
import { isNetworkMountRoot } from "../../utils/networkPaths.js";
import {
  buildEvalInitPrompt,
  buildEvalInitInterviewPrompt,
  EVAL_INIT_FIRST_MESSAGE,
} from "./evalInitInterview.js";
import { ws, ys } from "./caseSchema.js";
import { doesEnterpriseMcpConfigExist } from "../mcp/config.js";
import { withLaunchValuesOfHybridConnection } from "../../utils/managedEnvApply.js";

//@ chunk-qchp9vrd.js:287335-287429 placement
function kc({ json: json }) {
  return process.stdin.isTTY === !0 && process.stdout.isTTY === !0 && !json && !isEnvTruthy(!1);
}
/**
 * 确认是否信任被测插件（--trust-plugin、交互提示）。
 */
//@ chunk-qchp9vrd.js:287429-289079 placement
async function confirmPluginTrust({
  pluginDir: pluginDir,
  installedPluginId: installedPluginId,
  trustPluginFlag: trustPluginFlag,
  canPrompt: canPrompt,
  storageV5: storageV5,
  input: input = process.stdin,
  answerGraceMs: answerGraceMs = Agt,
}) {
  if (installedPluginId !== void 0) return { trusted: !0, source: "installed" };
  if (isPathTrusted(pluginDir)) return { trusted: !0, source: "folder" };
  if (trustPluginFlag) return { trusted: !0, source: "flag" };
  let b = escapeNonAscii(pluginDir);
  if (!canPrompt)
    return {
      trusted: !1,
      reason: "no_prompt",
      message: `Error: ${b} is not a trusted plugin directory, and this run cannot stop to ask you about it (no interactive terminal, or --json / CI). \`claude plugin eval\` loads the plugin and runs its eval suite on this machine as you - only evaluate plugins you trust. Run it once in a terminal to trust this directory, or pass ${TRUST_PLUGIN_FLAG} to assert that you trust this plugin's code and eval suite (e.g. in CI).`,
    };
  let y = eA(pluginDir),
    R = y !== null && y !== pluginDir;
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
  if (
    (process.stdout.write(S),
    !(await confirmPrompt("Trust this plugin directory?", input, {
      ignoreAnswersWithinMs: answerGraceMs,
      reaskPreamble: S,
    })))
  )
    return { trusted: !1, reason: "declined", message: `Not trusted - nothing from ${b} was loaded or run.` };
  return (
    await recordDirectoryTrust(pluginDir, storageV5).catch((N) => {
      logForDebugging(`plugin eval: persisting trust failed: ${N}`, { level: "error" });
    }),
    { trusted: !0, source: "gate" }
  );
}
//@ chunk-qchp9vrd.js:289079-289088 placement
var Rc = 8;
//@ chunk-qchp9vrd.js:289088-290224 placement
async function resolveEvalPluginTarget(e, n) {
  if (e.includes(path_2.sep) || e.includes("/")) return { kind: "path", root: e };
  let r = parsePluginAtMarketplace(e);
  if (!r && e.includes("@")) return { kind: "path", root: e };
  if (r && r.marketplace !== SKILLS_DIR) {
    let b = (isStorageV5Enabled() && n !== void 0 ? await getInstalledPluginsAsync(n) : getInstalledPlugins())
      .plugins[e];
    if (!b || b.length === 0) return { kind: "path", root: e };
    let y = await resolvePluginSourceLocation(e, n);
    if (y.kind === "folder")
      return {
        kind: "plugin",
        root: y.path,
        pluginId: e,
        vouchedRoots: getMarketplaceCandidatePaths(
          e,
          await loadKnownMarketplacesSafe(n),
          tryUnwrapTextPayload(),
        ),
      };
    if (y.kind === "unresolved") return { kind: "folder-unresolved", pluginId: e, reason: y.reason };
    let R = filterInstallationsForCurrentProject(b),
      S = R.length > 0 ? R : b,
      T = getMarketplaceCandidatePaths(e, await loadKnownMarketplacesSafe(n), tryUnwrapTextPayload());
    for (let N of S) {
      let { absolute: absolute, suspect: suspect } = classifyMarketplacePath(N.installPath, {
        trustedRoots: T,
      });
      if (!suspect) return { kind: "plugin", root: absolute, pluginId: e };
    }
    return { kind: "refused", pluginId: e };
  }
  let found = (await loadSkillsAsPlugins(isStorageV5Enabled() ? n : void 0)).plugins.find(
    (plugin) => plugin.name === (r ? r.name : e),
  );
  if (r)
    return found ? { kind: "plugin", root: found.path, pluginId: found.source } : { kind: "path", root: e };
  let w = [
    ...Object.keys(
      (isStorageV5Enabled() && n !== void 0 ? await getInstalledPluginsAsync(n) : getInstalledPlugins())
        .plugins,
    ).filter((b) => parsePluginAtMarketplace(b)?.name === e),
    ...(found ? [found.source] : []),
  ];
  if (w.length === 0) return { kind: "path", root: e };
  if (w.length > 1) return { kind: "ambiguous", matches: w };
  if (found) return { kind: "plugin", root: found.path, pluginId: found.source };
  return resolveEvalPluginTarget(w[0], n);
}
/**
 * claude plugin eval 入口：解析插件与评测目录、预检、运行套件并输出报告（约 11 KB）。
 */
//@ chunk-qchp9vrd.js:290224-300960 placement
async function pluginEvalHandler(e, n, r, a) {
  let s = e ?? getCwd(),
    h,
    w = [];
  if (e) {
    let ce = await resolveEvalPluginTarget(e, r);
    if (ce.kind === "ambiguous")
      (process.stderr
        .write(`${replaceControlChars(`Error: plugin name "${e}" is ambiguous \u2014 matches ${ce.matches.join(", ")}. Specify the full plugin@marketplace identifier.`)}
`),
        process.exit(1));
    if (ce.kind === "folder-unresolved")
      (process.stderr
        .write(`Error: ${replaceControlChars(ce.pluginId)} cannot be evaluated where sessions load it: no session could load it now. ${replaceControlChars(ce.reason)} Check the marketplace with \`claude plugin marketplace list\`, or pass ./<dir> to evaluate a directory.
`),
        process.exit(1));
    if (ce.kind === "refused")
      (process.stderr
        .write(`Error: ${replaceControlChars(ce.pluginId)} has a recorded install path that ${UNSAFE_PATH_EXPLANATION}; reinstall it, or pass ./<dir> to evaluate a directory.
`),
        process.exit(1));
    if (((s = ce.root), ce.kind === "plugin")) ((h = ce.pluginId), (w = ce.vouchedRoots ?? []));
  }
  if (n.runs !== void 0 && (!Number.isInteger(n.runs) || n.runs < 1))
    (process.stderr.write(`Error: --runs must be a positive integer
`),
      process.exit(1));
  if (n.threshold !== void 0 && (!Number.isFinite(n.threshold) || n.threshold < 0 || n.threshold > 1))
    (process.stderr.write(`Error: --threshold must be between 0 and 1
`),
      process.exit(1));
  if (n.mocks !== void 0 && n.mocks !== "record" && n.mocks !== "off")
    (process.stderr.write(`Error: --mocks must be record or off
`),
      process.exit(1));
  let b = n.mocks === "off" ? "off" : "record";
  if (typeof n.json === "string" && !n.json.endsWith(".json"))
    (process.stderr.write(
      n.json === ""
        ? `Error: --json requires a non-empty file path
`
        : `Error: --json output path must end in .json (got '${n.json}'). If that is your eval target, put it before --json.
`,
    ),
      process.exit(1));
  if (n.report === "")
    (process.stderr.write(`Error: --report requires a non-empty file path
`),
      process.exit(1));
  if (n.publish === !1 && n.publishReport)
    (process.stderr.write(`Error: --no-publish and --publish-report are contradictory \u2014 pass at most one.
`),
      process.exit(1));
  if (n.maxCostUsd !== void 0 && (!Number.isFinite(n.maxCostUsd) || n.maxCostUsd < 0))
    (process.stderr.write(`Error: --max-cost-usd must be a non-negative number
`),
      process.exit(1));
  let y = n.concurrency === void 0 ? 1 : Number(n.concurrency);
  if (!Number.isInteger(y) || y < 1 || y > Rc || !/^\d+$/.test(n.concurrency ?? "1"))
    (process.stderr.write(`Error: --concurrency must be a whole number from 1 to ${Rc}
`),
      process.exit(1));
  let R = checkTreeTrust(),
    S;
  try {
    S = await resolveEvalTargetPlugin(s, h, R, w);
  } catch (error) {
    return (
      ze(`Error: ${errorMessage(error)}`),
      await logFeatureBadAsync(
        "cli_plugin_eval",
        error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          ? "target_refused"
          : "exception",
      ),
      exitAfterAnalyticsFlush(1)
    );
  }
  let {
      targetDir: targetDir,
      pluginRoot: pluginRoot,
      untrustedManifestDir: untrustedManifestDir,
      targetResolved: targetResolved,
      enclosingVerdict: enclosingVerdict,
      targetIsCaseFile: targetIsCaseFile,
    } = S,
    W = !targetResolved && h === void 0,
    G = await confirmPluginTrust({
      pluginDir: pluginRoot ?? targetDir,
      installedPluginId: h,
      trustPluginFlag: n.trustPlugin === !0,
      canPrompt: !W && kc({ json: n.json }),
      storageV5: r,
    });
  if (!G.trusted) {
    if (W)
      return (
        ze(
          `Error: ${escapeNonAscii(targetDir)} could not be found or read - nothing to evaluate (nothing was loaded or run).`,
        ),
        await logFeatureBadAsync("cli_plugin_eval", "target_unresolved"),
        exitAfterAnalyticsFlush(1)
      );
    return (
      ze(G.message),
      await logFeatureBadAsync(
        "cli_plugin_eval",
        G.reason === "declined" ? "untrusted_declined" : "untrusted_no_prompt",
      ),
      exitAfterAnalyticsFlush(1)
    );
  }
  let J =
      targetResolved &&
      pluginRoot === null &&
      untrustedManifestDir === null &&
      !h &&
      enclosingVerdict !== null
        ? enclosingVerdict
        : { adopted: null, refused: null, namedOnly: null },
    Z = J.adopted ?? (targetIsCaseFile ? null : J.namedOnly),
    refused = J.refused,
    Q = targetIsCaseFile ? J.namedOnly : null,
    Se = pluginRoot === null ? (untrustedManifestDir ?? Z ?? refused ?? Q) : null,
    we = await readPluginManifestAdvisory({
      flag: n.evalDir,
      ...resolveOverlapRoots({
        scopeDir: targetDir,
        scopeIsNamedDirectory: !targetIsCaseFile,
        trustedRoot: pluginRoot,
        otherManifestDir: Se,
        adoptedAbove: J.adopted,
      }),
      writesToPlugin: !h && n.outputDir === void 0,
    });
  if (!we.ok)
    return (
      ze(`Error: ${we.error}`),
      await logFeatureBadAsync("cli_plugin_eval", "eval_dir_refused"),
      exitAfterAnalyticsFlush(1)
    );
  if (we.warning) ze(`Warning: ${we.warning}`);
  let segments = we.value.segments;
  try {
    we.value = await resolveEvalDirSource(pluginRoot ?? targetDir, we.value);
  } catch (error) {
    return (
      ze(`Error: ${errorMessage(error)}`),
      await logFeatureBadAsync("cli_plugin_eval", "eval_dir_unvettable"),
      exitAfterAnalyticsFlush(1)
    );
  }
  let Je = (ce) => Un(ce, R);
  if (untrustedManifestDir !== null && untrustedManifestDir === targetDir)
    ze(
      `Note: the plugin in ${escapeNonAscii(untrustedManifestDir)} is NOT loaded \u2014 ${Je(untrustedManifestDir)}; each case that would auto-detect it is reported as refused instead of running \u2014 fix that, or name that directory itself as the target to evaluate it (naming a directory is consent to load)`,
    );
  let Ee =
    untrustedManifestDir !== null && untrustedManifestDir !== targetDir ? untrustedManifestDir : refused;
  if (Ee !== null)
    ze(
      `Note: the plugin in ${escapeNonAscii(Ee)} is NOT loaded \u2014 ${Je(Ee)}; cases run against baseline Claude (unless they load a plugin beneath the target) \u2014 fix that, or name the plugin directory itself as the target to evaluate it (naming is consent to load)`,
    );
  if (Q !== null)
    ze(
      `Note: the plugin in ${escapeNonAscii(Q)} is NOT loaded \u2014 file ownership cannot be verified where it lives, so a plugin outside the consulted scope is not adopted; only ${targetDir} is scanned and cases run against baseline Claude (unless they load a plugin beneath the target) \u2014 run from within that plugin, or target the plugin directory`,
    );
  if (Z !== null) {
    let ce = ft(targetDir, await Ar(R)) ? "above the working directory" : "outside the consulted scope";
    ze(
      `Note: the plugin in ${escapeNonAscii(Z)} (${ce}) is NOT loaded \u2014 only ${targetDir} is scanned and cases run against baseline Claude (unless they load a plugin beneath the target); run from that plugin's directory or target it to evaluate it`,
    );
  }
  if (pluginRoot !== null && pluginRoot !== targetDir && !h)
    ze(`Evaluating plugin ${pluginRoot} (the target is inside it; the plugin is loaded for the run)`);
  if (we.value.source === "manifest" && !n.json)
    ze(`Using eval directory ${Cn(we.value)}/ from ${escapeNonAscii(we.value.manifestPath)}`);
  let Qe = createAbortController(),
    ye = null,
    je = () => {
      if (((ye ??= "SIGINT"), markStdoutDrainExternallyClocked(), !Qe.signal.aborted))
        (process.stderr.write(`
Interrupted \u2014 finishing up\u2026
`),
          Qe.abort());
    },
    pt = () => {
      if (((ye ??= "SIGTERM"), !Qe.signal.aborted))
        (process.stderr.write(`
Terminated \u2014 finishing up\u2026
`),
          Qe.abort());
    };
  (markPrintModeSignalHandlersRegistered(), process.on("SIGINT", je), process.on("SIGTERM", pt));
  let Pt = n.noScaffold ?? !0;
  if (n.noScaffold === !1)
    process.stderr
      .write(`Note: --scaffold runs each case's scaffold_script as you. Only use it on case files you (or your org) authored.
`);
  try {
    let {
        report: report,
        exitCode: exitCode,
        errors: errors,
        root: root,
        resolvedCases: resolvedCases,
        authPreflightFailed: authPreflightFailed,
        gitPreflightFailed: gitPreflightFailed,
        harnessFailures: harnessFailures,
        ablation: ablation,
        suite: suite,
      } = await runEvalCase({
        rootPath: s,
        evalDirSegments: we.value.segments,
        frameRoot: pluginRoot,
        adoptionDecided: h !== void 0 || targetResolved,
        trust: R,
        targetScreened: !0,
        consentDecided: h !== void 0 || targetResolved,
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
        noScaffold: Pt,
        keepTemp: n.keepTemp ?? !1,
        mocks: b,
        allowRealServers: n.allowRealServers === !0,
        keepFailedRuns: !n.json,
        verbose: n.verbose ?? !1,
        ablation: n.ablation ?? (h ? "with-without" : "auto"),
        onLine: (et) => {
          if (!n.json)
            process.stderr.write(`${replaceControlChars(et)}
`);
        },
        onNotice: (et) =>
          process.stderr.write(`${replaceControlChars(et)}
`),
        signal: Qe.signal,
        authPreflight: logEventTo1P,
        credentials: a,
      }),
      Ne = await checkResultSchemaDrift({
        aggregate: report,
        resolvedCases: resolvedCases,
        root: root,
        ablation: ablation,
        pluginId: h,
        modelOverride: n.model,
        judgeModel: n.judgeModel,
        caseFilter: n.case,
        tagFilters: n.tag,
        threshold: n.threshold ?? 1,
      });
    if (report.cases.length === 0 && errors.length === 0 && !report.partial && !Qe.signal.aborted) {
      let et = [
          ...(n.case ? [`--case "${n.case}"`] : []),
          ...(n.tag ? n.tag.map((Ht) => `--tag "${Ht}"`) : []),
        ],
        Et = et.length > 0 ? ` matching ${et.join(" ")}` : "";
      if ((ze(`No eval cases found${Et} under ${targetDir}.`), !n.json)) {
        let Ht = Z;
        process.stderr.write(
          et.length > 0
            ? `Run without ${et.length > 1 ? "the filters" : firstLineOf(et[0], " ")} to see all cases.
`
            : stripControlChars(
                `Cases are expected in a ${Cn(we.value)}/ directory under ${pluginRoot ?? targetDir} (${describeEvalDirSource(we.value)}), each case a directory containing case.yaml or prompt.md.
` +
                  (pluginRoot !== null && pluginRoot !== targetDir
                    ? describeEvalDirScanScope(targetDir, pluginRoot, we.value)
                    : "") +
                  (untrustedManifestDir !== null
                    ? `The plugin manifest in ${untrustedManifestDir} was not consulted (${Un(untrustedManifestDir, R)})${we.value.source === "flag" ? " (so its layout did not frame --eval-dir either)" : "; pass --eval-dir to name the directory"}.
`
                    : "") +
                  (Ht !== null
                    ? Ht === J.adopted
                      ? `A plugin manifest of yours outside the consulted scope, in ${Ht}, was not consulted; ${we.value.source === "flag" ? "target that plugin directly if it is the one you mean" : "pass --eval-dir here, or target that plugin directly if it is the one you mean"}.
`
                      : `A plugin manifest outside the consulted scope, in ${Ht}, was not consulted (whether it is yours cannot be verified here); ${we.value.source === "flag" ? "evaluate that plugin from your own copy if it is yours" : "pass --eval-dir here"}.
`
                    : ""),
              ) +
                (h
                  ? ""
                  : `Run \`claude plugin eval init${isFromEvalDirFlag(we.value)}\` for a guided interview, or \`claude plugin eval init --bare <name>${isFromEvalDirFlag(we.value)}\` to scaffold a blank case.
`),
        );
      } else if ((await writeJsonResult(n.json, Ne)) && typeof n.json === "string")
        await writeStdoutAndDrain(`Wrote ${n.json}
`);
      if (
        (await publishEvalResults({
          options: n,
          abortSignal: Qe.signal,
          credentials: a,
          result: Ne.result,
          defaultReportDir: null,
        }),
        Qe.signal.aborted)
      )
        return handleEvalInterrupt(ye);
      return (await logFeatureSadAsync("cli_plugin_eval", "no_cases"), exitAfterAnalyticsFlush(1));
    }
    let ot = h ? null : (suite ?? null),
      nt = h ? getCwd() : (ot ?? root),
      mt = !h && targetIsCaseFile && pluginRoot === null,
      Ye =
        h && we.value.source === "manifest"
          ? [EVALS_DIR_NAME]
          : h && we.value.source === "flag"
            ? segments
            : we.value.segments,
      joined = Ye.join(path_2.sep),
      Ge = [...(ot === null ? Ye : []), "results", report.started_at.replace(/[:.]/g, "-")],
      Lt = n.outputDir ?? path_2.join(nt, ...Ge);
    if (h && n.outputDir === void 0) {
      let et = await checkDeclaredComponentPaths(nt, Ge);
      if (et !== void 0)
        ze(
          `Warning: results are written under ${path_2.join(nt, joined)}: ${et} \u2014 files written there may be loaded as plugin components; pass --output-dir to write elsewhere`,
        );
    }
    let _t = stripInvisibleChars(jsonStringify(Ne.result, void 0, 2)),
      zt = !1,
      fn = report.cases.length > 0 || errors.length === 0,
      yn = !0;
    if (fn) {
      let et = [];
      try {
        if (n.outputDir === void 0) {
          if ((await ensureOutputBase(nt, Ge, et, { vetOwnership: mt ? R : null }), et.at(-1) !== Lt))
            throw new EscapesBaseError(
              `results directory ${Lt} already existed \u2014 a default results directory is always new; refusing to write into it`,
            );
        } else await mkdir(Lt, { recursive: !0 });
        await writeOutputFile(
          path_2.join(Lt, "aggregate-result.json"),
          `${_t}
`,
          n.outputDir === void 0,
        );
        try {
          await writeMockRecordings(Lt, report, n.outputDir === void 0);
        } catch (error) {
          ze(
            `warning: agent-mock recordings not written \u2014 adopt nothing from ${path_2.join(Lt, MOCK_RECORDINGS)}: ${errorMessage(error).replace(/[\r\n]+/g, " ")}`,
          );
        }
      } catch (error) {
        if ((await removeEmptyDirs(et), error instanceof EscapesBaseError || et.length > 0)) yn = !1;
        ze(`warning: could not write results: ${errorMessage(error)}`);
      }
    }
    if (n.json) {
      for (let Et of errors)
        process.stderr.write(`\u2717 ${replaceControlChars(`${Et.file}: ${Et.error}`)}
`);
      if (errors.length > 0 && !authPreflightFailed && !gitPreflightFailed)
        process.stderr.write(`${errors.length} case file(s) failed to load
`);
      let et = await writeJsonResult(n.json, Ne, _t);
      if (et && typeof n.json === "string")
        await writeStdoutAndDrain(`Wrote ${n.json}
`);
      else if (!et && exitCode === 0) zt = !0;
    } else if (authPreflightFailed || gitPreflightFailed);
    else {
      if (
        (await writeStdoutAndDrain(`
${stripControlChars(formatEvalReportTable(report))}
`),
        errors.length > 0)
      )
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
    if (
      (await publishEvalResults({
        options: n,
        abortSignal: Qe.signal,
        credentials: a,
        result: Ne.result,
        defaultReportDir: report.cases.length > 0 && yn ? Lt : null,
        verifyDefaultReportDir:
          n.outputDir === void 0
            ? () => ensureOutputBase(nt, Ge, [], { vetOwnership: mt ? R : null, create: !1 })
            : void 0,
      }),
      Qe.signal.aborted)
    )
      return handleEvalInterrupt(ye);
    if (zt) return exitAfterAnalyticsFlush(1);
    return (
      await logPluginEvalFailure(
        report,
        errors,
        exitCode,
        n.threshold ?? 1,
        G.source,
        authPreflightFailed === !0,
        harnessFailures,
        gitPreflightFailed === !0,
      ),
      exitAfterAnalyticsFlush(exitCode)
    );
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_plugin_eval", "exception"),
      ze(`Error: ${errorMessage(error)}`),
      exitAfterAnalyticsFlush(1)
    );
  } finally {
    (process.off("SIGINT", je), process.off("SIGTERM", pt));
  }
}
//@ chunk-qchp9vrd.js:300960-301754 placement
async function logPluginEvalFailure(e, n, r, a, s, h = !1, w = 0, b = !1) {
  if (h) {
    await logFeatureBadAsync("cli_plugin_eval", "auth_preflight_failed");
    return;
  }
  if (b) {
    await logFeatureBadAsync("cli_plugin_eval", "git_preflight_failed");
    return;
  }
  if (w > 0) {
    await logFeatureBadAsync("cli_plugin_eval", "harness_failure");
    return;
  }
  if (r === 2) {
    if (e.partial_reason === "auth_failed") {
      await logFeatureBadAsync("cli_plugin_eval", "auth_failed");
      return;
    }
    await logFeatureSadAsync("cli_plugin_eval", e.partial_reason ?? "cost_ceiling");
    return;
  }
  if (n.length > 0) {
    if (e.cases.length === 0) {
      await logFeatureBadAsync("cli_plugin_eval", "no_cases_loaded");
      return;
    }
    await logFeatureSadAsync("cli_plugin_eval", "case_load_errors");
    return;
  }
  let y = count(e.cases, (R) => R.score < a);
  await logFeatureOkAsync("cli_plugin_eval", {
    trust_source: fromEnum(s),
    all_passed: y === 0,
    num_cases: e.cases.length,
    num_failing_cases: y,
    num_cases_with_run_errors: count(
      e.cases,
      (R) => R.runs.some((run) => run.error) || (R.runs_without?.some((S) => S.error) ?? !1),
    ),
  });
}
/**
 * 把评测结果发布为 Artifact（中断时跳过）。
 */
//@ chunk-qchp9vrd.js:301754-305060 placement
async function publishEvalResults(e) {
  let n = "setup",
    r = !1,
    {
      options: options,
      abortSignal: abortSignal,
      credentials: credentials,
      result: w,
      defaultReportDir: defaultReportDir,
      verifyDefaultReportDir: verifyDefaultReportDir,
    } = e,
    R = options.report !== void 0,
    S = options.publishReport === !0,
    T = defaultReportDir !== null;
  if (!R && !S && !T) return;
  let N = isOnClaudeCodeSessionSurface(),
    x =
      options.publish !== !1 &&
      !S &&
      T &&
      !env.CLAUDE_CODE_EVAL_INTERVIEW_SESSION &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_quartz_thimble", !0),
    j = x && N,
    K = options.publish !== !1 && (S || (x && !N));
  try {
    let {
        evalReportTitle: evalReportTitle,
        renderEvalReportFragment: renderEvalReportFragment,
        wrapReportDocument: wrapReportDocument,
      } = await import("./chunk-5wjwnxna.js"),
      J = !1,
      Z = null,
      se = R || T;
    if (K)
      if (abortSignal.aborted) {
        if (S)
          (process.stderr.write(`Skipped publishing because the run was interrupted.
`),
            (Z = "publish_interrupted"));
      } else {
        let { waitForPolicyLimitsToLoad: waitForPolicyLimitsToLoad } = await import("./chunk-qchbrsbw.js");
        await withTimeout(waitForPolicyLimitsToLoad(), 3000, "policy limits load timed out").catch(() => {});
        let { isArtifactToolEnabled: isArtifactToolEnabled } = await import("./chunk-tbts81qj.js"),
          we = isArtifactToolEnabled(),
          { getArtifactCreateNotice: getArtifactCreateNotice } = await import("./chunk-sbc4zy7a.js"),
          Je = we ? getArtifactCreateNotice() : null;
        if (((J = we && Je === null), !J && S))
          (process.stderr
            .write(`Publishing is unavailable: ${Je === null ? "claude.ai artifacts are turned off for this account, provider, or privacy mode." : "your organization requires a person to approve each new artifact, and this command can't ask."} ${se ? "A local copy is written instead." : "Use --report <path> to write the report locally."}
`),
            (Z = "publish_unavailable"));
      }
    if (R || T || J) {
      n = "render";
      let Q = renderEvalReportFragment(w),
        Se =
          options.report !== void 0
            ? path_2.resolve(getCwd(), options.report)
            : T
              ? path_2.join(defaultReportDir, "report.html")
              : null,
        we = Se !== null ? wrapReportDocument(w, Q) : "";
      if (((n = "publish"), Se !== null))
        try {
          if (options.report === void 0 && verifyDefaultReportDir) await verifyDefaultReportDir();
          else await mkdir(path_2.dirname(Se), { recursive: !0 });
          (await writeOutputFile(Se, we, options.report === void 0 && options.outputDir === void 0),
            ze(
              `Report: ${Se}${j ? " (kept local: this run appears to have been started by a Claude Code session rather than a person \u2014 add --publish-report to publish it, where publishing is available)" : ""}`,
            ),
            (r = !0));
        } catch (error) {
          (ze(`Couldn't write the report to ${Se}: ${errorMessage(error)}`), (Z = "write_failed"));
        }
      if (J)
        if (abortSignal.aborted) {
          if (S)
            (process.stderr.write(`Skipped publishing because the run was interrupted.
`),
              (Z ??= "publish_interrupted"));
        } else {
          let { publishArtifact: publishArtifact } = await import("./chunk-gk4zy5tq.js"),
            { makeLocalOwnPublishesStore: makeLocalOwnPublishesStore } = await import("./chunk-wy5epz6a.js");
          process.stderr.write(`Publishing report to claude.ai (private to you)\u2026
`);
          let Ee = await publishArtifact(Q, {
            ownPublishes: makeLocalOwnPublishesStore(),
            title: `Eval report \u2014 ${evalReportTitle(w)}`,
            favicon: "",
            icon: "test",
            description: `claude plugin eval \u2014 ${w.cases.length} ${plural(w.cases.length, "case")}`,
            signal: abortSignal,
            credentials: credentials,
          });
          if (Ee.err === null)
            (process.stderr
              .write(`Published: ${Ee.url}${S ? "" : " \xB7 keep local next time with --no-publish"}
`),
              (r = !0));
          else
            (process.stderr.write(
              r
                ? `${replaceControlChars(`Couldn't publish the report (${Ee.err}); the local copy above is still available.`)}
`
                : `${replaceControlChars(`Couldn't publish the report (${Ee.err}). Use --report <path> to write it locally.`)}
`,
            ),
              (Z ??= "publish_failed"));
        }
    }
    if (Z === null) await logFeatureOkAsync("cli_plugin_eval_report");
    else if (r) await logFeatureSadAsync("cli_plugin_eval_report", Z);
    else if (Z === "publish_interrupted") await logFeatureSadAsync("cli_plugin_eval_report", Z);
    else await logFeatureBadAsync("cli_plugin_eval_report", Z);
  } catch (error) {
    ze(
      `${n === "render" ? "Couldn't build the HTML report" : n === "setup" ? "Couldn't prepare to publish the report" : "Couldn't finish publishing the report"}: ${errorMessage(error)}`,
    );
    let W = n === "render" ? "render_failed" : n === "setup" ? "publish_setup_failed" : "publish_failed";
    await (r
      ? logFeatureSadAsync("cli_plugin_eval_report", W)
      : logFeatureBadAsync("cli_plugin_eval_report", W));
  }
}
//@ chunk-qchp9vrd.js:305060-305098 placement
var Tc = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-qchp9vrd.js:305098-305454 placement
async function checkResultSchemaDrift(e) {
  let n = formatEvalSummary(e),
    safeParse = Jks().safeParse(n);
  if (!safeParse.success) {
    let a = safeParse.error.issues[0],
      s = a ? `${a.path.join(".") || "(root)"}: ${a.message}` : "schema drift";
    (process.stderr
      .write(`warning: eval result does not match resultSchema.ts (${s}) \u2014 please report this bug
`),
      await logFeatureSadAsync("cli_plugin_eval", "result_schema_drift"));
  }
  return { result: n, valid: safeParse.success };
}
//@ chunk-qchp9vrd.js:305454-306023 placement
async function writeJsonResult(e, { result: n, valid: valid }, a) {
  if (!valid)
    return (
      process.stderr.write(`warning: --json result withheld because it failed schema validation
`),
      await logFeatureSadAsync("cli_plugin_eval", "json_withheld_invalid"),
      !1
    );
  try {
    let s = `${a ?? stripInvisibleChars(jsonStringify(n, void 0, 2))}
`;
    if (e === !0)
      await new Promise((h, w) => {
        process.stdout.write(s, (b) => (b ? w(b) : h()));
      });
    else {
      let resolved = path_2.resolve(getCwd(), e);
      (await mkdir(path_2.dirname(resolved), { recursive: !0 }), await writeOutputFile(resolved, s, !1));
    }
    return !0;
  } catch (error) {
    return (
      process.stderr.write(`${replaceControlChars(`warning: could not write --json result: ${String(error)}`)}
`),
      await logFeatureSadAsync("cli_plugin_eval", "json_write_failed"),
      !1
    );
  }
}
/**
 * claude plugin eval init 入口：需要交互终端，启动访谈式用例编写会话。
 */
//@ chunk-qchp9vrd.js:306023-310504 placement
async function pluginEvalInitHandler(e, n = {}, r) {
  let a = process.stdin.isTTY && process.stdout.isTTY,
    s = !n.bare && (n.forceInteractive || a),
    h = !n.bare && isHeadlessToolCallOfClaudeCodeSession();
  if (s && !a && !h)
    return (
      process.stderr.write(
        e
          ? `The authoring interview requires an interactive terminal (TTY). Run \`claude plugin eval init\` in a terminal, or drop --interactive to write a blank template for \`${e}\` instead.
`
          : "The authoring interview requires an interactive terminal (TTY). Run `claude plugin eval init` in a terminal, or drop --interactive and pass a case name (e.g. `claude plugin eval init my-case`) to write a blank template instead.\n",
      ),
      await logFeatureBadAsync("cli_plugin_eval_init", "no_tty"),
      exitAfterAnalyticsFlush(1)
    );
  if (e !== void 0 && (!Tc.test(e) || describeWindowsUnsafeName(e) !== void 0)) {
    let G = !Tc.test(e)
      ? "use letters, digits, '.', '_', '-' only (no '/', no '..')"
      : `it ${describeWindowsUnsafeName(e)}`;
    return (
      ze(`Error: case name ${JSON.stringify(e)} is invalid \u2014 ${G}`),
      await logFeatureBadAsync("cli_plugin_eval_init", "bad_case_name"),
      exitAfterAnalyticsFlush(1)
    );
  }
  let w = h ? { kind: "delegate" } : s ? { kind: "interview" } : e ? { kind: "bare", caseName: e } : null;
  if (w === null)
    return (
      process.stderr.write(
        n.bare
          ? `A case name is required for --bare. Run without --bare for the interview, which writes one case per input.
`
          : env.CLAUDE_CODE_CHILD_SESSION
            ? "A case name is required here: this looks like a command run by a Claude Code session, but that could not be confirmed (its session marker may be inherited), so the interview was not handed to the session and there is no terminal to hold one. Pass a name to write a blank template, or run `claude plugin eval init` yourself in a terminal for the interview.\n"
            : `A case name is required when no TTY is available (the interview needs an interactive terminal). Pass a name to write a blank template.
`,
      ),
      await logFeatureBadAsync("cli_plugin_eval_init", "missing_case_name"),
      exitAfterAnalyticsFlush(1)
    );
  let b = checkTreeTrust(),
    y = await Ar(b);
  b.consentRoot = y;
  let R = await findNearestSkillFolder(y, y, b);
  if (
    R === null &&
    n.evalDir === void 0 &&
    !isNetworkMountRoot(y) &&
    (await lstat(path_2.join(y, EVALS_DIR_NAME)).catch(() => null))?.isDirectory() !== !0 &&
    !(await hasPluginComponents(y))
  )
    return (
      ze(
        `Error: ${escapeNonAscii(y)} is not a plugin or skill folder \u2014 run \`claude plugin eval init\` from the plugin's root folder, or pass --eval-dir to scaffold here on purpose.`,
      ),
      await logFeatureBadAsync("cli_plugin_eval_init", "cwd_not_a_plugin"),
      exitAfterAnalyticsFlush(1)
    );
  let S =
      R === null ? await resolvePluginDir(y, b, "core") : { adopted: null, refused: null, namedOnly: null },
    T = S.adopted ?? S.refused ?? S.namedOnly,
    N = await readPluginManifestAdvisory({
      flag: n.evalDir,
      ...resolveOverlapRoots({
        scopeDir: y,
        scopeIsNamedDirectory: !0,
        trustedRoot: R,
        otherManifestDir: R === null ? T : null,
        adoptedAbove: S.adopted,
      }),
      forInit: !0,
    });
  if (!N.ok)
    return (
      ze(`Error: ${N.error}`),
      await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_refused"),
      exitAfterAnalyticsFlush(1)
    );
  if (N.warning) ze(`Warning: ${N.warning}`);
  if (N.value.componentOverlap !== void 0)
    return (
      ze(
        `Error: not scaffolding \u2014 ${N.value.componentOverlap}; ${N.value.componentOverlapRecourse ?? "pass --eval-dir to use another directory"}`,
      ),
      await logFeatureBadAsync(
        "cli_plugin_eval_init",
        N.value.componentOverlapUnverifiable ? "manifest_unverifiable" : "component_overlap",
      ),
      exitAfterAnalyticsFlush(1)
    );
  try {
    N.value = await resolveEvalDirSource(y, N.value);
  } catch (error) {
    return (
      ze(`Error: ${errorMessage(error)}`),
      await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_unvettable"),
      exitAfterAnalyticsFlush(1)
    );
  }
  if (w.kind === "delegate") {
    try {
      await ensureOutputBase(y, N.value.segments, [], { create: !1, absentEndsChain: !0 });
    } catch (error) {
      return (
        ze(`Error: ${errorMessage(error)}`),
        await logFeatureBadAsync("cli_plugin_eval_init", "eval_dir_refused"),
        exitAfterAnalyticsFlush(1)
      );
    }
    return (
      process.stdout
        .write(`${buildEvalInitPrompt(y, e, { evalDir: N.value.dir, evalDirFlag: isFromEvalDirFlag(N.value), pluginDirTrusted: isPathTrusted(y) })}
`),
      await logFeatureSadAsync("cli_plugin_eval_init", "delegated_to_parent"),
      exitAfterAnalyticsFlush(0)
    );
  }
  if (w.kind === "interview") {
    let G = await confirmPluginTrust({
      pluginDir: y,
      installedPluginId: void 0,
      trustPluginFlag: !1,
      canPrompt: !0,
      storageV5: r,
    });
    if (!G.trusted)
      return (
        ze(G.message),
        await logFeatureBadAsync("cli_plugin_eval_init_interactive", "untrusted_declined"),
        exitAfterAnalyticsFlush(1)
      );
    let J = [];
    try {
      await ensureOutputBase(y, N.value.segments, J);
    } catch (error) {
      (await removeEmptyDirs(J),
        ze(`Error: ${errorMessage(error)}`),
        await logFeatureBadAsync("cli_plugin_eval_init_interactive", "write_failed"),
        await exitAfterAnalyticsFlush(1));
      return;
    }
    let Z = await launchEvalInitSession(y, e, N.value);
    (await removeEmptyDirs(J), await exitAfterAnalyticsFlush(Z));
    return;
  }
  if (!n.bare && !a)
    process.stderr
      .write(`No TTY available \u2014 writing a blank template. Re-run in a terminal for the authoring interview.
`);
  let joined = path_2.join(y, N.value.dir, w.caseName),
    joined_2 = path_2.join(joined, "prompt.md"),
    joined_3 = path_2.join(joined, "graders", "criteria.md"),
    X = !1,
    W = [];
  try {
    return (
      await ensureOutputBase(y, N.value.segments, W),
      await mkdir(joined, { mode: 493 }),
      (X = !0),
      await mkdir(path_2.join(joined, "graders"), { mode: 493 }),
      await writeOutputFile(joined_2, ws, !0),
      await writeOutputFile(joined_3, ys, !0),
      process.stdout.write(`Created ${path_2.relative(y, joined_2)} and ${path_2.relative(y, joined_3)}
`),
      await logFeatureOkAsync("cli_plugin_eval_init"),
      exitAfterAnalyticsFlush(0)
    );
  } catch (error) {
    if (X) await rm_2(joined, { recursive: !0, force: !0 }).catch(() => {});
    return (
      await removeEmptyDirs(W),
      await logFeatureBadAsync("cli_plugin_eval_init", "write_failed"),
      ze(`Error: ${errorMessage(error)}`),
      exitAfterAnalyticsFlush(1)
    );
  }
}
//@ chunk-qchp9vrd.js:310504-311529 placement
async function launchEvalInitSession(e, n, r) {
  let a = buildEvalInitInterviewPrompt(e, n, { evalDir: r.dir, evalDirFlag: isFromEvalDirFlag(r) }),
    execPath = process.execPath,
    w = [
      ...(isStandaloneExecutable() || !process.argv[1] ? [] : [process.argv[1]]),
      "--append-system-prompt",
      a,
      ...(doesEnterpriseMcpConfigExist() ? [] : ["--strict-mcp-config"]),
      "--",
      EVAL_INIT_FIRST_MESSAGE,
    ];
  if ((stopCapturingEarlyInput(), process.stdin.isTTY))
    try {
      process.stdin.setRawMode(!1);
    } catch {}
  for (let y of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"])
    (process.removeAllListeners(y), process.on(y, () => {}));
  env.set("CLAUDE_CODE_EVAL_INTERVIEW_SESSION", !0);
  let b = spawnSync(execPath, w, {
    cwd: e,
    stdio: "inherit",
    env: withLaunchValuesOfHybridConnection(process.env),
  });
  if (b.error)
    return (
      await logFeatureBadAsync("cli_plugin_eval_init_interactive", "spawn_failed"),
      process.stderr.write(`${replaceControlChars(`Failed to start interview session: ${b.error.message}`)}
`),
      1
    );
  if (b.status === 0) return (await logFeatureOkAsync("cli_plugin_eval_init_interactive"), 0);
  if (b.status === null && b.signal !== null)
    return (
      await (b.signal === "SIGINT"
        ? logFeatureSadAsync("cli_plugin_eval_init_interactive", "interrupted")
        : logFeatureBadAsync("cli_plugin_eval_init_interactive", "signal_killed")),
      128 + (os_2.constants.signals[b.signal] ?? 1)
    );
  return (await logFeatureBadAsync("cli_plugin_eval_init_interactive", "nonzero_exit"), b.status ?? 1);
}
//@ chunk-qchp9vrd.js:311529-311651 placement
async function handleEvalInterrupt(e) {
  (await logFeatureSadAsync("cli_plugin_eval", e === "SIGTERM" ? "terminated" : "interrupted"),
    await gracefulShutdown(e === "SIGTERM" ? 143 : 130));
}
