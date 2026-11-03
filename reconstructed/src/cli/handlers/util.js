/**
 * cli/handlers/util.tsx
 *
 * 并入已有模块：惰性构建并可批量重置的单例注册表（lazy/builtCount/releaseBuiltSince）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/util.tsx
 * pieces: chunk-2f5p3gsj.js (8), chunk-g54kbxqw.js (2), chunk-kpa9nk58.js (3)
 * attribution: facade-exports 5, layout 3, fingerprint 2, sole-consumer 1, placement 2
 */
import { createInterface } from "readline";
import { stripVTControlCharacters } from "util";
import { cwd } from "process";
import { createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";
import {
  SETUP_TOKEN_DEFAULT_EXPIRY_DAYS,
  LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
} from "../../constants/oauth.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  logFeatureBadAsync,
  logFeatureOkAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import { exitAfterAnalyticsFlush } from "../exit.js";
import { validateForceLoginMethod, isAnthropicAuthEnabled } from "../../utils/auth.js";
import { providerBlockedMessage } from "../../utils/model/allowedProviders.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AppRoot } from "../../components/AppRoot.js";
import { onChangeAppState } from "../../state/onChangeAppState.js";
import { Box, Text } from "../../ink/components/Text.js";
import { WelcomeV2 } from "../../components/LogoV2/WelcomeV2.js";
import { getDoctorDiagnostic } from "../../utils/doctorDiagnostic.js";
import { autoUpdatesChannel } from "../../utils/updateChannel.js";
import {
  getRemoteSettingsLoadState,
  describeRemoteSettingsStatus,
  shouldWarnRemoteSettings,
} from "../../services/cloudSessions/eligibility.js";
import { sleep } from "../../utils/sleep.js";
import { splitStatusNotices } from "../../utils/settings/settingsErrorsHeadless.js";
import { formatInvalidSettingNotice } from "../../utils/settings/settingsNotices.js";
import { sequential } from "../../utils/sequential.js";
import { collectPermissionRuleWarningLines } from "../../utils/permissions/securityWarnings.js";
import { managedLinkWarningLines } from "../../utils/settings/settings.js";
import { DEFAULT_OUTPUT_LIMIT_CHARS, MAX_OUTPUT_LIMIT_CHARS } from "../../utils/shell/outputLimits.js";
import { getModelMaxOutputTokens } from "../../utils/context.js";
import { validateBoundedIntEnvVar } from "../../utils/envValidation.js";
import { getBridgeDoctorInfo } from "../../bridge/bridgeEntitlement.js";
import {
  formatPolicyFetchStatus,
  getPolicyFetchStatus,
} from "../../services/policyLimits/policyFetchStatus.js";
import { plural } from "../../utils/stringUtils.js";
import { writeToStdout } from "../../utils/process.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { env } from "../../utils/env.js";
import { displaySkillFields } from "../../skills/skillSources.js";
import { escapeXmlInline } from "../../utils/permissions/checkRegistry.js";

//@ chunk-2f5p3gsj.js:1375-1612 facade-exports
function confirmYesNo(c, input = process.stdin) {
  let t = () => {};
  let promise = new Promise((resolve) => {
    t = resolve;
  });
  let l = createInterface({
    input,
    output: process.stdout,
  });
  l.question(`${c} [y/N] `, (p) => {
    let lower = p.trim().toLowerCase();
    t(lower === "y" || lower === "yes");
    l.close();
  });
  l.once("close", () => t(false));
  return promise;
}
//@ chunk-2f5p3gsj.js:1612-1667 facade-exports
function createSubcommandRoot() {
  return createRoot({
    ...getBaseRenderOptions(false),
    patchConsole: false,
  });
}
//@ chunk-2f5p3gsj.js:1667-1716 layout
function setupTokenExpiryInfo(expiresInDays) {
  return {
    ok: true,
    days: SETUP_TOKEN_DEFAULT_EXPIRY_DAYS,
    seconds: LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
  };
}
//@ chunk-2f5p3gsj.js:1716-3537 facade-exports = setupTokenHandler (0.303)
/**
 * claude setup-token：登录并生成长期有效的订阅令牌。
 */
async function setupTokenHandler(c, u) {
  logEvent("tengu_setup_token_command", {});
  let t = setupTokenExpiryInfo(u?.expiresInDays);
  if (!t.ok) {
    c.unmount();
    process.stderr.write(`${t.message}
`);
    await logFeatureBadAsync("cli_setup_token", t.errorCode);
    await exitAfterAnalyticsFlush(1);
    return;
  }
  let f = validateForceLoginMethod(true);
  if (!f.valid) {
    c.unmount();
    process.stderr.write(`${f.message}
setup-token creates a long-lived Claude.ai subscription token, which this policy does not permit.
`);
    await logFeatureBadAsync("cli_setup_token", "force_login_method_refused");
    await exitAfterAnalyticsFlush(1);
  }
  let l = providerBlockedMessage("firstParty");
  if (l !== undefined) {
    c.unmount();
    process.stderr.write(`${l}
setup-token creates a long-lived Claude.ai subscription token, which this machine's allowedProviders policy does not permit.
`);
    await logFeatureBadAsync("cli_setup_token", "provider_not_allowed");
    await exitAfterAnalyticsFlush(1);
  }
  let showAuthWarning = !isAnthropicAuthEnabled();
  let { ConsoleOAuthFlow } = await import("./chunk-dwe6dgzp.js");
  let rootSession = getRootSession();
  let h = false;
  let S = false;
  await new Promise((resolve) => {
    c.render(
      jsxProd_default(AppRoot, {
        session: rootSession,
        onChangeAppState: (k) => onChangeAppState(k, rootSession),
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default(WelcomeV2, {}),
            showAuthWarning &&
              jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Text, {
                    color: "warning",
                    children:
                      "Warning: You already have authentication configured via environment variable or API key helper.",
                  }),
                  jsxProd_default(Text, {
                    color: "warning",
                    children:
                      "The setup-token command will create a new OAuth token which you can use instead.",
                  }),
                ],
              }),
            jsxProd_default_2(Box, {
              paddingLeft: 1,
              flexDirection: "column",
              gap: 1,
              children: [
                jsxProd_default_2(Text, {
                  bold: true,
                  children: [
                    "This will guide you through long-lived (",
                    t.days === 365 ? "1-year" : `${t.days}-day`,
                    ") auth token setup for your Claude account. Claude subscription required.",
                  ],
                }),
                jsxProd_default(ConsoleOAuthFlow, {
                  onDone: () => {
                    resolve();
                  },
                  onAccountOnHold: () => {
                    h = true;
                    resolve();
                  },
                  onOrgConfigRefused: () => {
                    S = true;
                    resolve();
                  },
                  mode: "setup-token",
                  expiresIn: t.seconds,
                  urlOutdent: 1,
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });
  c.unmount();
  if (h) {
    await logFeatureBadAsync("cli_setup_token", "account_on_hold");
    await exitAfterAnalyticsFlush(1);
    return;
  }
  if (S) {
    await logFeatureBadAsync("cli_setup_token", "org_config_refused");
    await exitAfterAnalyticsFlush(1);
    return;
  }
  await logFeatureOkAsync("cli_setup_token");
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-2f5p3gsj.js:3537-8026 facade-exports = Doctor (0.257)
async function doctorHandler(storageV5) {
  logEvent("tengu_doctor_command", {});
  let u;
  try {
    let doctorDiagnostic = await getDoctorDiagnostic({
      probeKeychain: true,
      storageV5,
    });
    let f = autoUpdatesChannel();
    let l = [
      "Claude Code doctor",
      "",
      `Running: ${doctorDiagnostic.installationType} (${doctorDiagnostic.version})`,
      ...({
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.GIT_SHA
        ? [
            `Commit: ${{
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.GIT_SHA.slice(0, 12)}`,
          ]
        : []),
      "Platform: linux-x64",
      ...(doctorDiagnostic.packageManager
        ? [`Package manager: ${sanitizeDisplayText(doctorDiagnostic.packageManager)}`]
        : []),
      `Path: ${sanitizeDisplayText(doctorDiagnostic.installationPath)}`,
      ...(doctorDiagnostic.invokedBinary !== doctorDiagnostic.installationPath
        ? [`Invoked: ${sanitizeDisplayText(doctorDiagnostic.invokedBinary)}`]
        : []),
      `Config install method: ${sanitizeDisplayText(doctorDiagnostic.configInstallMethod)}`,
      `Search: ${doctorDiagnostic.ripgrepStatus.working ? "OK" : "Not working"} (${doctorDiagnostic.ripgrepStatus.mode === "embedded" ? "bundled" : sanitizeDisplayText(doctorDiagnostic.ripgrepStatus.systemPath || "system")})`,
      `Auto-updates: ${doctorDiagnostic.packageManager ? "Managed by package manager" : sanitizeDisplayText(doctorDiagnostic.autoUpdates)}`,
      `Auto-update channel: ${f === "rc" ? "slow" : f}`,
      `Last update attempt: ${describeLastUpdateAttempt(doctorDiagnostic.lastUpdateResult)}`,
    ];
    let remoteSettingsLoadState = getRemoteSettingsLoadState();
    if (remoteSettingsLoadState)
      l.push(
        `Managed settings (remote): ${sanitizeDisplayText(describeRemoteSettingsStatus(remoteSettingsLoadState))}`,
      );
    else if (shouldWarnRemoteSettings())
      l.push("Managed settings (remote): checking\u2026 (fetch in progress; re-run in a moment)");
    {
      let { waitForPolicyLimitsToLoad, POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS } =
        await import("./chunk-qchbrsbw.js");
      let { getLastFetchOutcome } = await import("./chunk-sbc4zy7a.js");
      let v = false;
      let A = waitForPolicyLimitsToLoad().then(() => {
        v = true;
      });
      let T = Date.now() + POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS;
      while (!v && getLastFetchOutcome() === null && Date.now() < T) await Promise.race([A, sleep(200)]);
    }
    let _ = l.push("Organization policy: \u2026") - 1;
    let { statusNotices, invalidEntries } = splitStatusNotices(formatInvalidSettingNotice().errors);
    if (invalidEntries.length > 0) {
      l.push("", sequential.yellow("Invalid settings"));
      for (let invalidEntry of invalidEntries) {
        let joined = [invalidEntry.file, invalidEntry.path]
          .flatMap((y) => (y ? [sanitizeDisplayText(y)] : []))
          .join(" \u203A ");
        l.push(
          `- ${joined ? `${joined}: ` : ""}${sanitizeDisplayText(invalidEntry.message)}${
            invalidEntry.suggestion
              ? `
  Suggested fix: ${sanitizeDisplayText(invalidEntry.suggestion)}`
              : ""
          }`,
        );
      }
    }
    if (statusNotices.length > 0) {
      l.push("");
      for (let statusNotice of statusNotices) l.push(`- ${sanitizeDisplayText(statusNotice.message)}`);
    }
    let permissionRuleWarningLines = await collectPermissionRuleWarningLines();
    if (permissionRuleWarningLines.length > 0) {
      l.push("", sequential.yellow("Permission rules that may not work as written"));
      for (let permissionRuleWarningLine of permissionRuleWarningLines)
        l.push(`- ${sanitizeDisplayText(permissionRuleWarningLine)}`);
    }
    let validationErrors = managedLinkWarningLines();
    if (validationErrors.length > 0) {
      l.push("");
      for (let [o, m] of validationErrors)
        l.push(`- ${o}
  ${m}`);
    }
    let filtered = [
      {
        name: "BASH_MAX_OUTPUT_LENGTH",
        default: DEFAULT_OUTPUT_LIMIT_CHARS,
        upperLimit: MAX_OUTPUT_LIMIT_CHARS,
      },
      {
        name: "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
        ...getModelMaxOutputTokens("claude-opus-4-6"),
      },
    ]
      .map((o) => ({
        name: o.name,
        ...validateBoundedIntEnvVar(o.name, process.env[o.name], o.default, o.upperLimit),
      }))
      .filter((o) => o.status !== "valid");
    if (filtered.length > 0) {
      l.push("", sequential.yellow("Environment variables"));
      for (let o of filtered) l.push(`- ${o.name}: ${sanitizeDisplayText(o.message ?? o.status)}`);
    }
    if (doctorDiagnostic.multipleInstallations.length > 1) {
      l.push("", sequential.yellow("Multiple installations found"));
      for (let multipleInstallation of doctorDiagnostic.multipleInstallations)
        l.push(`- ${sanitizeDisplayText(`${multipleInstallation.type} at ${multipleInstallation.path}`)}`);
    }
    try {
      let bridgeDoctorInfo = await getBridgeDoctorInfo();
      l.push("", "Remote Control");
      if (bridgeDoctorInfo.inRemoteSession)
        l.push(
          "Inside a cloud session \u2014 Remote Control is unavailable here. Use it from the local session instead.",
        );
      else {
        l.push(
          sanitizeDisplayText(
            bridgeDoctorInfo.disabledReason ??
              "Control this session from claude.ai/code or the Claude mobile app",
          ),
        );
        for (let check of bridgeDoctorInfo.checks.filter((check) => !check.ok))
          l.push(sanitizeDisplayText(`- ${check.label}${check.detail ? ` (${check.detail})` : ""}`));
      }
    } catch {
      await logFeatureSadAsync("cli_doctor", "bridge_info_unavailable");
    }
    l[_] = `Organization policy: ${sanitizeDisplayText(formatPolicyFetchStatus(getPolicyFetchStatus()))}`;
    if (doctorDiagnostic.warnings.length > 0) {
      l.push(
        "",
        sequential.yellow(
          `${doctorDiagnostic.warnings.length} ${plural(doctorDiagnostic.warnings.length, "warning")} found`,
        ),
      );
      for (let warning of doctorDiagnostic.warnings)
        l.push(`- ${sanitizeDisplayText(warning.issue)}`, `  Fix: ${sanitizeDisplayText(warning.fix)}`);
    } else l.push("", "No installation issues found.");
    l.push("", "For a full setup checkup that can also fix issues, run /doctor in a Claude Code session.");
    writeToStdout(
      l.join(`
`) +
        `
`,
    );
    u = {
      warnings: doctorDiagnostic.warnings.length,
      settings_errors: invalidEntries.length,
      env_var_issues: filtered.length,
      multiple_installs: doctorDiagnostic.multipleInstallations.length > 1,
      ripgrep_working: doctorDiagnostic.ripgrepStatus.working,
    };
  } catch (error) {
    await logFeatureBadAsync("cli_doctor", "diagnostic_failed");
    throw error;
  }
  await logFeatureOkAsync("cli_doctor", u);
  await exitAfterAnalyticsFlush(0);
}
//@ chunk-2f5p3gsj.js:8026-8075 layout
function sanitizeDisplayText(c) {
  return replaceControlChars(stripVTControlCharacters(c)).replaceAll("`", "");
}
//@ chunk-2f5p3gsj.js:8075-8320 layout
function describeLastUpdateAttempt(lastUpdateResult) {
  if (!lastUpdateResult) return "none recorded";
  let u = sanitizeDisplayText(lastUpdateResult.timestamp.slice(0, 10));
  switch (lastUpdateResult.outcome) {
    case "success":
      return lastUpdateResult.version_to
        ? `success \u2192 ${sanitizeDisplayText(lastUpdateResult.version_to)} (${u})`
        : `success (${u})`;
    case "failed":
      return `failed (${sanitizeDisplayText(lastUpdateResult.status)}) \u2014 ${u}`;
  }
}
//@ chunk-2f5p3gsj.js:8320-8994 facade-exports = installHandler (0.39)
/**
 * claude install [target]：安装原生构建（stable/latest/版本号）；DISABLE_UPDATES 时直接退出。
 */
async function installHandler(target, options, t) {
  if (env.DISABLE_UPDATES) {
    process.stdout
      .write(`Updates are disabled by your administrator. Contact your IT team to get the latest version.
`);
    process.exit(0);
  }
  let { awaitPolicyLimitsColdStart } = await import("./chunk-qchbrsbw.js");
  await awaitPolicyLimitsColdStart();
  let { setup } = await import("./chunk-fhdzwff4.js");
  await setup(cwd(), "default", false, false, undefined, false, undefined, undefined, undefined, t);
  let { install } = await import("./chunk-na8jp6ng.js");
  await new Promise((resolve) => {
    let args = [];
    if (target) args.push(target);
    if (options.force) args.push("--force");
    install.call(
      async (result) => {
        if (result.includes("failed")) await logFeatureBadAsync("cli_install", "cli_install_failed");
        else await logFeatureOkAsync("cli_install");
        await exitAfterAnalyticsFlush(result.includes("failed") ? 1 : 0);
        resolve();
      },
      {
        storageV5: t,
      },
      args,
    );
  });
}
//@ chunk-kpa9nk58.js:191-494 placement
/**
 * 惰性构建并可批量重置的单例注册表（lazy/builtCount/releaseBuiltSince）。
 */
class LazyRegistry {
  resetters = [];
  built = [];
  lazy(e) {
    let t;
    let r = () => {
      t = undefined;
    };
    this.resetters.push(r);
    return () => {
      if (t === undefined) {
        t = e();
        this.built.push(r);
      }
      return t;
    };
  }
  builtCount() {
    return this.built.length;
  }
  releaseBuiltSince(e) {
    for (let t of this.built.splice(e)) t();
  }
  reset() {
    for (let resetter of this.resetters) resetter();
    this.built.length = 0;
  }
}
//@ chunk-kpa9nk58.js:494-508 placement
/**
 * DoctorLazy/React.lazy 用的单例 LazyRegistry，提供 .lazy() 包装。
 */
var LAZY_COMPONENT_REGISTRY = new LazyRegistry();
//@ chunk-kpa9nk58.js:508-541 fingerprint = DoctorLazy (1)
/**
 * React.lazy 包装（懒加载组件）。
 */
function DoctorLazy(logArtifactGatesFrozen) {
  return LAZY_COMPONENT_REGISTRY.lazy(logArtifactGatesFrozen);
}
//@ chunk-g54kbxqw.js:35039-35119 fingerprint = DoctorWithPlugins (0.498)
/**
 * Doctor 屏幕用的插件信息适配（显示名转换）。
 */
function DoctorWithPlugins(t0) {
  return {
    ...displaySkillFields(t0),
    displayName: escapeOptionalXmlInline(t0.displayName),
    fallback: undefined,
  };
}
//@ chunk-g54kbxqw.js:35119-35166 sole-consumer
function escapeOptionalXmlInline(displayName) {
  return displayName === undefined ? undefined : escapeXmlInline(displayName);
}
export { DoctorLazy, confirmYesNo, LAZY_COMPONENT_REGISTRY, DoctorWithPlugins };
