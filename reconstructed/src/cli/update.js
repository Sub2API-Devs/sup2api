/**
 * cli/update.ts
 *
 * claude update/upgrade：检测安装类型，按 native/npm/包管理器分别更新并打印结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/update.ts
 * pieces: chunk-rkjj4sjx.js (2)
 * attribution: fingerprint 1, sole-consumer 1
 */
import { dirname, basename } from "path";
import { env } from "../utils/env.js";
import { writeToStdout } from "../utils/process.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { logEvent } from "../services/analytics/index.js";
import { y9 } from "../utils/updateChannel.js";
import { Pbt, N6n, getDoctorDiagnostic, _2e } from "../utils/doctorDiagnostic.js";
import { logForDebugging } from "../utils/debug.js";
import { sequential } from "../utils/sequential.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import {
  Uun,
  getLatestVersion,
  getVersionSkipReason,
  resolveMaxVersionConfig,
  isForceDowngradeActive,
  installGlobalPackage,
  aet,
  updateApplyErrorKey,
} from "../utils/autoUpdater.js";
import { gte, lt_2, gt } from "../utils/semver.js";
import { getInitialSettings_2, getSettingsForSource } from "../utils/settings/settings.js";
import {
  getLatestVersion as getLatestVersion_2,
  ManifestSignatureError,
} from "../utils/nativeInstaller/download.js";
import { installLatest, removeInstalledSymlink } from "../utils/nativeInstaller/installer.js";
import { $_o } from "../utils/completionCache.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { localInstallationExists, installOrUpdateClaudePackage } from "../utils/localInstaller.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { recordUpdateResult } from "../utils/nativeInstaller/updateResult.js";
import { isServerVersionMismatch } from "../utils/daemon/daemonLock.js";
import { bgSupervisorNounCap } from "../utils/fleetGates.js";

/**
 * claude update：检查安装方式（native/npm-local/npm-global/package-manager/development），包管理器安装只提示命令（Homebrew/winget/apk…），原生安装走 installLatest，npm 安装走全局/本地 npm；处理多重安装与配置的 installMethod 不一致。
 */
//@ chunk-rkjj4sjx.js:12375-42648 fingerprint = update (0.63)
async function update(l) {
  if (env.DISABLE_UPDATES)
    (writeToStdout(`Updates are disabled by your administrator. Contact your IT team to get the latest version.
`),
      await gracefulShutdown(0));
  (logEvent("tengu_update_check", {}),
    writeToStdout(`Current version: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}
`));
  let y = y9(),
    g = Pbt(),
    s = g ? (g === "claude-code@latest" ? "latest" : "stable") : N6n() ? "stable" : y,
    h = s === "rc" ? "slow" : s;
  (writeToStdout(`Checking for updates to ${h} version...
`),
    logForDebugging("update: Starting update check"),
    logForDebugging("update: Running diagnostic"));
  let o = await getDoctorDiagnostic({ storageV5: l });
  if (
    (logForDebugging(`update: Installation type: ${o.installationType}`),
    logForDebugging(`update: Config install method: ${o.configInstallMethod}`),
    o.multipleInstallations.length > 1)
  ) {
    (writeToStdout(`
`),
      writeToStdout(
        sequential.yellow("Warning: Multiple installations found") +
          `
`,
      ));
    for (let install of o.multipleInstallations) {
      let n = o.installationType === install.type ? " (currently running)" : "";
      writeToStdout(`- ${install.type} at ${install.path}${n}
`);
    }
  }
  if (o.warnings.length > 0) {
    writeToStdout(`
`);
    for (let warning of o.warnings)
      (logForDebugging(`update: Warning detected: ${warning.issue}`),
        logForDebugging(`update: Showing warning: ${warning.issue}`),
        writeToStdout(
          sequential.yellow(`Warning: ${warning.issue}
`),
        ),
        writeToStdout(
          sequential.bold(`Fix: ${warning.fix.replaceAll("`", "")}
`),
        ));
  }
  let config = getGlobalConfig();
  if (!config.installMethod && o.installationType !== "package-manager") {
    (writeToStdout(`
`),
      writeToStdout(`Updating configuration to track installation method...
`));
    let detectedMethod = "unknown";
    switch (o.installationType) {
      case "npm-local":
        detectedMethod = "local";
        break;
      case "native":
        detectedMethod = "native";
        break;
      case "npm-global":
        detectedMethod = "global";
        break;
      default:
        detectedMethod = "unknown";
    }
    (saveGlobalConfig((current) => ({ ...current, installMethod: detectedMethod }), l),
      writeToStdout(`Installation method set to: ${detectedMethod}
`));
  }
  if (o.installationType === "development")
    (writeToStdout(`
`),
      writeToStdout(
        sequential.yellow("Warning: Cannot update development build") +
          `
`,
      ),
      await gracefulShutdown(1));
  if (o.installationType === "package-manager") {
    let packageManager = await _2e();
    if (
      (writeToStdout(`
`),
      packageManager === "homebrew")
    ) {
      writeToStdout(`Claude is managed by Homebrew.
`);
      let n = `brew upgrade ${g ?? "claude-code"}`,
        R = await Uun(g ?? "claude-code", s);
      if (R === null)
        (writeToStdout(`Could not check for updates (network check skipped or unavailable).
`),
          writeToStdout(`To update manually, run:
`),
          writeToStdout(
            sequential.bold(`  ${n}`) +
              `
`,
          ));
      else if (
        !gte(
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
          R,
        )
      )
        (writeToStdout(`Update available: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} \u2192 ${R}
`),
          writeToStdout(`
`),
          writeToStdout(`To update, run:
`),
          writeToStdout(
            sequential.bold(`  ${n}`) +
              `
`,
          ));
      else
        writeToStdout(`Claude is up to date!
`);
      if (g !== "claude-code@latest")
        (writeToStdout(`
`),
          writeToStdout(
            sequential.dim(`Tip: For more frequent updates, use the claude-code@latest cask:
`),
          ),
          writeToStdout(
            sequential.dim(
              `  brew uninstall --cask ${g ?? "claude-code"} && brew install --cask claude-code@latest`,
            ) +
              `
`,
          ));
    } else if (packageManager === "winget") {
      writeToStdout(`Claude is managed by winget.
`);
      let latest = await getLatestVersion(s);
      if (latest === null)
        (writeToStdout(`Could not check for updates (npm lookup failed or returned an invalid response).
`),
          writeToStdout(`To update manually, run:
`),
          writeToStdout(
            sequential.bold("  winget upgrade Anthropic.ClaudeCode") +
              `
`,
          ));
      else if (
        !gte(
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
          latest,
        )
      )
        (writeToStdout(`Update available: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} \u2192 ${latest}
`),
          writeToStdout(`
`),
          writeToStdout(`To update, run:
`),
          writeToStdout(
            sequential.bold("  winget upgrade Anthropic.ClaudeCode") +
              `
`,
          ));
      else
        writeToStdout(`Claude is up to date!
`);
    } else if (packageManager === "apk") {
      writeToStdout(`Claude is managed by apk.
`);
      let latest = await getLatestVersion(s);
      if (latest === null)
        (writeToStdout(`Could not check for updates (npm lookup failed or returned an invalid response).
`),
          writeToStdout(`To update manually, run:
`),
          writeToStdout(
            sequential.bold("  apk upgrade claude-code") +
              `
`,
          ));
      else if (
        !gte(
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
          latest,
        )
      )
        (writeToStdout(`Update available: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} \u2192 ${latest}
`),
          writeToStdout(`
`),
          writeToStdout(`To update, run:
`),
          writeToStdout(
            sequential.bold("  apk upgrade claude-code") +
              `
`,
          ));
      else
        writeToStdout(`Claude is up to date!
`);
    } else
      (writeToStdout(`Claude is managed by a package manager.
`),
        writeToStdout(`Please use your package manager to update.
`));
    await gracefulShutdown(0);
  }
  if (
    config.installMethod &&
    o.configInstallMethod !== "not set" &&
    o.installationType !== "package-manager"
  ) {
    let { installationType: installationType, configInstallMethod: configInstallMethod } = o,
      k =
        {
          "npm-local": "local",
          "npm-global": "global",
          native: "native",
          development: "development",
          unknown: "unknown",
        }[installationType] || installationType;
    if (k !== configInstallMethod && configInstallMethod !== "unknown")
      (writeToStdout(`
`),
        writeToStdout(
          sequential.yellow("Warning: Configuration mismatch") +
            `
`,
        ),
        writeToStdout(`Config expects: ${configInstallMethod} installation
`),
        writeToStdout(`Currently running: ${installationType}
`),
        writeToStdout(
          sequential.yellow(`Updating the ${installationType} installation you are currently using`) +
            `
`,
        ),
        saveGlobalConfig((current) => ({ ...current, installMethod: k }), l),
        writeToStdout(`Config updated to reflect current installation method: ${k}
`));
  }
  if (o.installationType === "native") {
    if (
      (logForDebugging("update: Detected native installation, using native updater"),
      getInitialSettings_2()?.minimumVersion ||
        getSettingsForSource("policySettings")?.requiredMaximumVersion)
    ) {
      let e = await getLatestVersion_2(s).catch(() => null),
        n = e ? getVersionSkipReason(e) : null;
      if (e && n)
        (writeToStdout(
          sequential.yellow(
            `The ${h} channel is at ${e}, which is ${n}. Staying on ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}.`,
          ) +
            `
`,
        ),
          await gracefulShutdown(0));
    }
    getLatestVersion_2(s)
      .then((e) => {
        if (
          !e ||
          e ===
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
            }.VERSION
        )
          return;
        writeToStdout(
          lt_2(
            e,
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
          )
            ? `@${s} is at ${e} (older than ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION})...
`
            : `Updating to ${e}...
`,
        );
      })
      .catch(() => {});
    try {
      let e = await installLatest(s, !1, l);
      if (e.lockFailed) {
        let n = e.lockHolderPid ? ` (PID ${e.lockHolderPid})` : "";
        (writeToStdout(
          sequential.yellow(
            `Another Claude process${n} is currently running. Please try again in a moment.`,
          ) +
            `
`,
        ),
          await gracefulShutdown(0));
      }
      if (!e.latestVersion)
        (process.stderr.write(`Failed to check for updates
`),
          await gracefulShutdown(1));
      if (
        e.wasUpdated &&
        e.latestVersion !==
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
          }.VERSION
      )
        (writeToStdout(
          sequential.green(
            `Successfully updated from ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} to version ${e.latestVersion}`,
          ) +
            `
`,
        ),
          await $_o(),
          await noteSupervisorRestart(e.latestVersion, l));
      else if (e.skippedUnverifiedRelease)
        writeToStdout(
          sequential.yellow(
            `Update target ${e.latestVersion} (from @${s} or a server-side override) predates release-signature enforcement; staying on ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}. Run \`claude install ${e.latestVersion}\` to switch to it explicitly.`,
          ) +
            `
`,
        );
      else
        writeToStdout(
          sequential.green(
            `Claude Code is up to date (${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION})`,
          ) +
            `
`,
        );
      await gracefulShutdown(0);
    } catch (error) {
      (process.stderr.write(`Error: Failed to install native update
`),
        process.stderr.write(
          (error instanceof ManifestSignatureError ? error.message : String(error)) +
            `
`,
        ),
        process.stderr.write(`Try running "claude doctor" for diagnostics
`),
        await gracefulShutdown(1));
    }
  }
  if (config.installMethod !== "native") await removeInstalledSymlink();
  (logForDebugging("update: Checking npm registry for latest version"),
    logForDebugging(
      `update: Package URL: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}`,
    ));
  let S = s === "stable" ? "stable" : "latest",
    npmCommand = `npm view ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}@${S} version`;
  logForDebugging(`update: Running: ${npmCommand}`);
  let latestVersion = await getLatestVersion(s);
  if ((logForDebugging(`update: Latest version from npm: ${latestVersion || "FAILED"}`), !latestVersion)) {
    if (
      (logForDebugging("update: Failed to get latest version from npm registry"),
      process.stderr.write(
        sequential.red("Failed to check for updates") +
          `
`,
      ),
      process.stderr.write(`Unable to fetch latest version from npm registry
`),
      process.stderr.write(`
`),
      process.stderr.write(`Possible causes:
`),
      process.stderr.write(`  \u2022 Network connectivity issues
`),
      process.stderr.write(`  \u2022 npm registry is unreachable
`),
      process.stderr.write(`  \u2022 Corporate proxy/firewall blocking npm
`),
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
      }.PACKAGE_URL &&
        !{
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.PACKAGE_URL.startsWith("@anthropic"))
    )
      process.stderr.write(`  \u2022 Internal/development build not published to npm
`);
    (process.stderr.write(`
`),
      process.stderr.write(`Try:
`),
      process.stderr.write(`  \u2022 Check your internet connection
`),
      process.stderr.write(`  \u2022 Run with --debug flag for more details
`));
    let e =
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
      }.PACKAGE_URL || "@anthropic-ai/claude-code";
    (process.stderr.write(`  \u2022 Manually check: npm view ${e} version
`),
      process.stderr.write(`  \u2022 Check if you need to login: npm whoami
`),
      await gracefulShutdown(1));
  }
  let { maxVersion: maxVersion, forceDowngradeEnabled: forceDowngradeEnabled } =
      await resolveMaxVersionConfig(),
    r = latestVersion,
    C = !1;
  if (
    forceDowngradeEnabled &&
    maxVersion &&
    isForceDowngradeActive(
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
      maxVersion,
      "auto_updater",
    )
  )
    ((r = maxVersion), (C = !0));
  else if (maxVersion && latestVersion && gt(latestVersion, maxVersion))
    (logForDebugging(
      `update: maxVersion ${maxVersion} is set, capping update from ${latestVersion} to ${maxVersion}`,
    ),
      (r = gt(
        maxVersion,
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
      )
        ? maxVersion
        : {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION));
  let v = r ? getVersionSkipReason(r) : null;
  if (r && v) {
    let e =
      r === latestVersion
        ? `The ${h} channel is at ${r}`
        : `The update target is capped at ${r} by a server-side version policy`;
    (writeToStdout(
      sequential.yellow(
        `${e}, which is ${v}. Staying on ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}.`,
      ) +
        `
`,
    ),
      await gracefulShutdown(0));
  }
  if (
    r ===
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
    }.VERSION
  )
    (writeToStdout(
      sequential.green(
        `Claude Code is up to date (${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION})`,
      ) +
        `
`,
    ),
      await gracefulShutdown(0));
  if (
    !C &&
    r &&
    lt_2(
      r,
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
    )
  )
    (writeToStdout(
      sequential.yellow(
        `You're running ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}, which is newer than the ${h} channel's ${r}. Skipping update. To switch back to the channel version, run claude install ${r}.`,
      ) +
        `
`,
    ),
      await gracefulShutdown(0));
  if (C)
    (logEvent("tengu_auto_updater_forced_downgrade", {
      from_version: sanitizeVersion(
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
      ),
      to_version: sanitizeVersion(r),
    }),
      writeToStdout(
        sequential.yellow(
          `Downgrading to ${r} (current: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}) \u2014 required by a server-side version policy.`,
        ) +
          `
`,
      ));
  else
    writeToStdout(`New version available: ${r} (current: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION})
`);
  writeToStdout(`Installing update...
`);
  let c = !1,
    updateMethodName = "";
  switch (o.installationType) {
    case "npm-local":
      ((c = !0), (updateMethodName = "local"));
      break;
    case "npm-global":
      ((c = !1), (updateMethodName = "global"));
      break;
    case "unknown": {
      let isLocal = await localInstallationExists();
      ((c = isLocal),
        (updateMethodName = isLocal ? "local" : "global"),
        writeToStdout(
          sequential.yellow("Warning: Could not determine installation type") +
            `
`,
        ),
        writeToStdout(`Attempting ${updateMethodName} update based on file detection...
`));
      break;
    }
    default:
      (logFeatureBad("update_apply", "update_apply_unsupported_install_type"),
        process.stderr.write(`Error: Cannot update ${o.installationType} installation
`),
        await gracefulShutdown(1));
  }
  (writeToStdout(`Using ${updateMethodName} installation update method...
`),
    logForDebugging(`update: Update method determined: ${updateMethodName}`),
    logForDebugging(`update: useLocalUpdate: ${c}`));
  let p, w;
  if (c)
    (logForDebugging("update: Calling installOrUpdateClaudePackage() for local update"),
      (p = await installOrUpdateClaudePackage(s, r, l)));
  else
    (logForDebugging("update: Calling installGlobalPackage() for global update"),
      (w = await installGlobalPackage(r, l)),
      (p = w.status));
  if ((logForDebugging(`update: Installation status: ${p}`), p !== "in_progress"))
    await recordUpdateResult(
      {
        timestamp: new Date().toISOString(),
        path: c ? "npm-local" : "npm-global",
        outcome: p === "success" ? "success" : "failed",
        status: p,
        version_from: {
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
        version_to: r,
        error_code:
          p === "install_failed" && aet()
            ? "update_apply_restore_failed"
            : updateApplyErrorKey(w?.failureHint),
      },
      l,
    );
  switch (p) {
    case "success":
      (writeToStdout(
        sequential.green(
          C
            ? `Successfully downgraded from ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} to version ${r}`
            : `Successfully updated from ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} to version ${r}`,
        ) +
          `
`,
      ),
        await $_o(),
        await noteSupervisorRestart(r, l));
      break;
    case "no_permissions":
      if (
        (process.stderr.write(`Error: Insufficient permissions to install update
`),
        c)
      )
        (process.stderr.write(`Try manually updating with:
`),
          process.stderr
            .write(`  cd ~/.claude/local && npm update ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}
`));
      else
        (process.stderr.write(`Try running with sudo or fix npm permissions
`),
          process.stderr.write(`Or consider using native installation with: claude install
`));
      await gracefulShutdown(1);
      break;
    case "install_failed": {
      let e = aet();
      if (!e && w?.failureHint) {
        switch (w.failureHint) {
          case "windows_running_exe_lock":
            process.stderr
              .write(`Error: Update failed because claude.exe is in use. Close other Claude Code sessions (including VS Code), then run claude update again, or run claude doctor.
`);
            break;
          case "native_binary_missing":
            process.stderr
              .write(`Error: Update failed because the native binary for this platform was not downloaded. Run claude update again, or reinstall with: npm i -g ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}
`);
            break;
          case "registry_session_refused":
            process.stderr.write(`Error: Failed to install update
`);
            break;
        }
        await gracefulShutdown(1);
        break;
      }
      if (
        (process.stderr.write(`Error: Failed to install update
`),
        e)
      )
        if (e.preservedPath)
          if (
            (process.stderr
              .write(`Your Claude Code executable could not be restored after the failed update. It was preserved at ${e.preservedPath}
`),
            dirname(e.preservedPath) === dirname(e.originalPath))
          )
            process.stderr
              .write(`Rename it back to ${basename(e.originalPath)}, or reinstall with: npm i -g ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}
`);
          else
            process.stderr
              .write(`Copy it back to ${e.originalPath}, or reinstall with: npm i -g ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}
`);
        else
          process.stderr
            .write(`Your Claude Code executable could not be restored after the failed update and no preserved copy was found. Reinstall with: npm i -g ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}
`);
      else if (c)
        (process.stderr.write(`Try manually updating with:
`),
          process.stderr
            .write(`  cd ~/.claude/local && npm update ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.PACKAGE_URL}
`));
      else
        process.stderr.write(`Or consider using native installation with: claude install
`);
      await gracefulShutdown(1);
      break;
    }
    case "in_progress":
      (process.stderr.write(`Error: Another instance is currently performing an update
`),
        process.stderr.write(`Please wait and try again later
`),
        await gracefulShutdown(1));
      break;
  }
  await gracefulShutdown(0);
}
//@ chunk-rkjj4sjx.js:42648-42795 sole-consumer
async function noteSupervisorRestart(l, y) {
  if (await isServerVersionMismatch(l, y))
    writeToStdout(
      sequential.dim(
        `${bgSupervisorNounCap()} will restart on the new version shortly; background jobs continue uninterrupted`,
      ) +
        `
`,
    );
}
