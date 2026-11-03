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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AppRoot } from "../../components/AppRoot.js";
import { onChangeAppState } from "../../state/onChangeAppState.js";
import { Box, Text } from "../../ink/components/Text.js";
import { WelcomeV2 } from "../../components/LogoV2/WelcomeV2.js";
import { getDoctorDiagnostic } from "../../utils/doctorDiagnostic.js";
import { y9 } from "../../utils/updateChannel.js";
import {
  getRemoteSettingsLoadState,
  describeRemoteSettingsStatus,
  o_i,
} from "../../services/cloudSessions/eligibility.js";
import { sleep } from "../../utils/sleep.js";
import { splitStatusNotices } from "../../utils/settings/settingsErrorsHeadless.js";
import { formatInvalidSettingNotice } from "../../utils/settings/settingsNotices.js";
import { sequential } from "../../utils/sequential.js";
import { collectPermissionRuleWarningLines } from "../../utils/permissions/securityWarnings.js";
import { managedLinkWarningLines } from "../../utils/settings/settings.js";
import { ZYr, $Yo } from "../../utils/shell/outputLimits.js";
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
function confirmYesNo(c, u = process.stdin) {
  let t = () => {},
    promise = new Promise((p) => {
      t = p;
    }),
    l = createInterface({ input: u, output: process.stdout });
  return (
    l.question(`${c} [y/N] `, (p) => {
      let lower = p.trim().toLowerCase();
      (t(lower === "y" || lower === "yes"), l.close());
    }),
    l.once("close", () => t(!1)),
    promise
  );
}
//@ chunk-2f5p3gsj.js:1612-1667 facade-exports
function createSubcommandRoot() {
  return createRoot({ ...getBaseRenderOptions(!1), patchConsole: !1 });
}
//@ chunk-2f5p3gsj.js:1667-1716 layout
function R(c) {
  return { ok: !0, days: SETUP_TOKEN_DEFAULT_EXPIRY_DAYS, seconds: LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS };
}
/**
 * claude setup-token：登录并生成长期有效的订阅令牌。
 */
//@ chunk-2f5p3gsj.js:1716-3537 facade-exports = setupTokenHandler (0.303)
async function setupTokenHandler(c, u) {
  logEvent("tengu_setup_token_command", {});
  let t = R(u?.expiresInDays);
  if (!t.ok) {
    (c.unmount(),
      process.stderr.write(`${t.message}
`),
      await logFeatureBadAsync("cli_setup_token", t.errorCode),
      await exitAfterAnalyticsFlush(1));
    return;
  }
  let f = validateForceLoginMethod(!0);
  if (!f.valid)
    (c.unmount(),
      process.stderr.write(`${f.message}
setup-token creates a long-lived Claude.ai subscription token, which this policy does not permit.
`),
      await logFeatureBadAsync("cli_setup_token", "force_login_method_refused"),
      await exitAfterAnalyticsFlush(1));
  let l = providerBlockedMessage("firstParty");
  if (l !== void 0)
    (c.unmount(),
      process.stderr.write(`${l}
setup-token creates a long-lived Claude.ai subscription token, which this machine's allowedProviders policy does not permit.
`),
      await logFeatureBadAsync("cli_setup_token", "provider_not_allowed"),
      await exitAfterAnalyticsFlush(1));
  let showAuthWarning = !isAnthropicAuthEnabled(),
    { ConsoleOAuthFlow: ConsoleOAuthFlow } = await import("./chunk-dwe6dgzp.js"),
    g = getRootSession(),
    h = !1,
    S = !1;
  if (
    (await new Promise((resolve) => {
      c.render(
        e(AppRoot, {
          session: g,
          onChangeAppState: (k) => onChangeAppState(k, g),
          children: r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(WelcomeV2, {}),
              showAuthWarning &&
                r(Box, {
                  flexDirection: "column",
                  children: [
                    e(Text, {
                      color: "warning",
                      children:
                        "Warning: You already have authentication configured via environment variable or API key helper.",
                    }),
                    e(Text, {
                      color: "warning",
                      children:
                        "The setup-token command will create a new OAuth token which you can use instead.",
                    }),
                  ],
                }),
              r(Box, {
                paddingLeft: 1,
                flexDirection: "column",
                gap: 1,
                children: [
                  r(Text, {
                    bold: !0,
                    children: [
                      "This will guide you through long-lived (",
                      t.days === 365 ? "1-year" : `${t.days}-day`,
                      ") auth token setup for your Claude account. Claude subscription required.",
                    ],
                  }),
                  e(ConsoleOAuthFlow, {
                    onDone: () => {
                      resolve();
                    },
                    onAccountOnHold: () => {
                      ((h = !0), resolve());
                    },
                    onOrgConfigRefused: () => {
                      ((S = !0), resolve());
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
    }),
    c.unmount(),
    h)
  ) {
    (await logFeatureBadAsync("cli_setup_token", "account_on_hold"), await exitAfterAnalyticsFlush(1));
    return;
  }
  if (S) {
    (await logFeatureBadAsync("cli_setup_token", "org_config_refused"), await exitAfterAnalyticsFlush(1));
    return;
  }
  (await logFeatureOkAsync("cli_setup_token"), await exitAfterAnalyticsFlush(0));
}
//@ chunk-2f5p3gsj.js:3537-8026 facade-exports = Doctor (0.257)
async function doctorHandler(t0) {
  logEvent("tengu_doctor_command", {});
  let u;
  try {
    let t = await getDoctorDiagnostic({ probeKeychain: !0, storageV5: t0 }),
      f = y9(),
      l = [
        "Claude Code doctor",
        "",
        `Running: ${t.installationType} (${t.version})`,
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
              `Commit: ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.GIT_SHA.slice(0, 12)}`,
            ]
          : []),
        "Platform: linux-x64",
        ...(t.packageManager ? [`Package manager: ${d(t.packageManager)}`] : []),
        `Path: ${d(t.installationPath)}`,
        ...(t.invokedBinary !== t.installationPath ? [`Invoked: ${d(t.invokedBinary)}`] : []),
        `Config install method: ${d(t.configInstallMethod)}`,
        `Search: ${t.ripgrepStatus.working ? "OK" : "Not working"} (${t.ripgrepStatus.mode === "embedded" ? "bundled" : d(t.ripgrepStatus.systemPath || "system")})`,
        `Auto-updates: ${t.packageManager ? "Managed by package manager" : d(t.autoUpdates)}`,
        `Auto-update channel: ${f === "rc" ? "slow" : f}`,
        `Last update attempt: ${describeLastUpdateAttempt(t.lastUpdateResult)}`,
      ],
      p = getRemoteSettingsLoadState();
    if (p) l.push(`Managed settings (remote): ${d(describeRemoteSettingsStatus(p))}`);
    else if (o_i())
      l.push("Managed settings (remote): checking\u2026 (fetch in progress; re-run in a moment)");
    {
      let {
          waitForPolicyLimitsToLoad: waitForPolicyLimitsToLoad,
          POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS: POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS,
        } = await import("./chunk-qchbrsbw.js"),
        { getLastFetchOutcome: getLastFetchOutcome } = await import("./chunk-sbc4zy7a.js"),
        v = !1,
        A = waitForPolicyLimitsToLoad().then(() => {
          v = !0;
        }),
        T = Date.now() + POLICY_LIMITS_FIRST_ATTEMPT_WAIT_MS;
      while (!v && getLastFetchOutcome() === null && Date.now() < T) await Promise.race([A, sleep(200)]);
    }
    let _ = l.push("Organization policy: \u2026") - 1,
      { statusNotices: statusNotices, invalidEntries: invalidEntries } = splitStatusNotices(
        formatInvalidSettingNotice().errors,
      );
    if (invalidEntries.length > 0) {
      l.push("", sequential.yellow("Invalid settings"));
      for (let o of invalidEntries) {
        let joined = [o.file, o.path].flatMap((y) => (y ? [d(y)] : [])).join(" \u203A ");
        l.push(
          `- ${joined ? `${joined}: ` : ""}${d(o.message)}${
            o.suggestion
              ? `
  Suggested fix: ${d(o.suggestion)}`
              : ""
          }`,
        );
      }
    }
    if (statusNotices.length > 0) {
      l.push("");
      for (let o of statusNotices) l.push(`- ${d(o.message)}`);
    }
    let S = await collectPermissionRuleWarningLines();
    if (S.length > 0) {
      l.push("", sequential.yellow("Permission rules that may not work as written"));
      for (let o of S) l.push(`- ${d(o)}`);
    }
    let validationErrors = managedLinkWarningLines();
    if (validationErrors.length > 0) {
      l.push("");
      for (let [o, m] of validationErrors)
        l.push(`- ${o}
  ${m}`);
    }
    let filtered = [
      { name: "BASH_MAX_OUTPUT_LENGTH", default: ZYr, upperLimit: $Yo },
      { name: "CLAUDE_CODE_MAX_OUTPUT_TOKENS", ...getModelMaxOutputTokens("claude-opus-4-6") },
    ]
      .map((o) => ({
        name: o.name,
        ...validateBoundedIntEnvVar(o.name, process.env[o.name], o.default, o.upperLimit),
      }))
      .filter((o) => o.status !== "valid");
    if (filtered.length > 0) {
      l.push("", sequential.yellow("Environment variables"));
      for (let o of filtered) l.push(`- ${o.name}: ${d(o.message ?? o.status)}`);
    }
    if (t.multipleInstallations.length > 1) {
      l.push("", sequential.yellow("Multiple installations found"));
      for (let multipleInstallation of t.multipleInstallations)
        l.push(`- ${d(`${multipleInstallation.type} at ${multipleInstallation.path}`)}`);
    }
    try {
      let o = await getBridgeDoctorInfo();
      if ((l.push("", "Remote Control"), o.inRemoteSession))
        l.push(
          "Inside a cloud session \u2014 Remote Control is unavailable here. Use it from the local session instead.",
        );
      else {
        l.push(d(o.disabledReason ?? "Control this session from claude.ai/code or the Claude mobile app"));
        for (let m of o.checks.filter((check) => !check.ok))
          l.push(d(`- ${m.label}${m.detail ? ` (${m.detail})` : ""}`));
      }
    } catch {
      await logFeatureSadAsync("cli_doctor", "bridge_info_unavailable");
    }
    if (
      ((l[_] = `Organization policy: ${d(formatPolicyFetchStatus(getPolicyFetchStatus()))}`),
      t.warnings.length > 0)
    ) {
      l.push("", sequential.yellow(`${t.warnings.length} ${plural(t.warnings.length, "warning")} found`));
      for (let warning of t.warnings) l.push(`- ${d(warning.issue)}`, `  Fix: ${d(warning.fix)}`);
    } else l.push("", "No installation issues found.");
    (l.push("", "For a full setup checkup that can also fix issues, run /doctor in a Claude Code session."),
      writeToStdout(
        l.join(`
`) +
          `
`,
      ),
      (u = {
        warnings: t.warnings.length,
        settings_errors: invalidEntries.length,
        env_var_issues: filtered.length,
        multiple_installs: t.multipleInstallations.length > 1,
        ripgrep_working: t.ripgrepStatus.working,
      }));
  } catch (error) {
    throw (await logFeatureBadAsync("cli_doctor", "diagnostic_failed"), error);
  }
  (await logFeatureOkAsync("cli_doctor", u), await exitAfterAnalyticsFlush(0));
}
//@ chunk-2f5p3gsj.js:8026-8075 layout
function d(c) {
  return replaceControlChars(stripVTControlCharacters(c)).replaceAll("`", "");
}
//@ chunk-2f5p3gsj.js:8075-8320 layout
function describeLastUpdateAttempt(c) {
  if (!c) return "none recorded";
  let u = d(c.timestamp.slice(0, 10));
  switch (c.outcome) {
    case "success":
      return c.version_to ? `success \u2192 ${d(c.version_to)} (${u})` : `success (${u})`;
    case "failed":
      return `failed (${d(c.status)}) \u2014 ${u}`;
  }
}
/**
 * claude install [target]：安装原生构建（stable/latest/版本号）；DISABLE_UPDATES 时直接退出。
 */
//@ chunk-2f5p3gsj.js:8320-8994 facade-exports = installHandler (0.39)
async function installHandler(c, u, t) {
  if (env.DISABLE_UPDATES)
    (process.stdout
      .write(`Updates are disabled by your administrator. Contact your IT team to get the latest version.
`),
      process.exit(0));
  let { awaitPolicyLimitsColdStart: awaitPolicyLimitsColdStart } = await import("./chunk-qchbrsbw.js");
  await awaitPolicyLimitsColdStart();
  let { setup: setup } = await import("./chunk-fhdzwff4.js");
  await setup(cwd(), "default", !1, !1, void 0, !1, void 0, void 0, void 0, t);
  let { install: install } = await import("./chunk-na8jp6ng.js");
  await new Promise((resolve) => {
    let args = [];
    if (c) args.push(c);
    if (u.force) args.push("--force");
    install.call(
      async (result) => {
        if (result.includes("failed")) await logFeatureBadAsync("cli_install", "cli_install_failed");
        else await logFeatureOkAsync("cli_install");
        (await exitAfterAnalyticsFlush(result.includes("failed") ? 1 : 0), resolve());
      },
      { storageV5: t },
      args,
    );
  });
}
/**
 * 惰性构建并可批量重置的单例注册表（lazy/builtCount/releaseBuiltSince）。
 */
//@ chunk-kpa9nk58.js:191-494 placement
class LazyRegistry {
  resetters = [];
  built = [];
  lazy(e) {
    let t,
      r = () => {
        t = void 0;
      };
    return (
      this.resetters.push(r),
      () => {
        if (t === void 0) ((t = e()), this.built.push(r));
        return t;
      }
    );
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
var tlo = new LazyRegistry();
/**
 * React.lazy 包装（懒加载组件）。
 */
//@ chunk-kpa9nk58.js:508-541 fingerprint = DoctorLazy (1)
function DoctorLazy(e) {
  return tlo.lazy(e);
}
/**
 * Doctor 屏幕用的插件信息适配（显示名转换）。
 */
//@ chunk-g54kbxqw.js:35039-35119 fingerprint = DoctorWithPlugins (0.498)
function DoctorWithPlugins(t0) {
  return { ...displaySkillFields(t0), displayName: Ui(t0.displayName), fallback: void 0 };
}
//@ chunk-g54kbxqw.js:35119-35166 sole-consumer
function Ui(e) {
  return e === void 0 ? void 0 : escapeXmlInline(e);
}

export { DoctorLazy, confirmYesNo, tlo, DoctorWithPlugins };
