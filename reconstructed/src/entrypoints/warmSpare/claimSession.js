/**
 * entrypoints/warmSpare/claimSession.ts
 *
 * 2.1.316 新增。预热备用进程被认领为会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7n18p51h.js (4)
 * attribution: placement 4
 */
import { isAbsolute, resolve, join } from "path";
import { stat, realpath } from "fs/promises";
import { profileCheckpoint, addStartupContext } from "../../utils/startupProfiler.js";
import { headlessProfilerCheckpoint } from "../../utils/headlessProfiler.js";
import {
  isParkedSpare,
  markSpareClaiming,
  resetStartTime,
  setAdditionalDirectoriesForClaudeMd,
  getAdditionalDirectoriesForClaudeMd,
  setNeedsPlanModeExitAttachment,
  setHasExitedPlanMode,
  setNeedsAutoModeExitAttachment,
  setSessionBypassPermissionsMode,
  markSpareClaimed,
  getSessionId,
  getProjectConfigRoot,
} from "../../bootstrap/state.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { SDKClaimSessionClaimSessionMessageSchema } from "../sdk/controlSchemas.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isLauncherStartedProcess } from "../../utils/auth/launcherHostLogin.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import { reservedServerNameMessage } from "../../services/mcp/config.js";
import { expandPath } from "../../utils/path.js";
import { vetPathSpellingsOrChain, pathVettingReason } from "../../utils/permissions/pathVetting.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { resetEnvDerivedAuthCaches } from "../../utils/auth.js";
import { emitCredentialChange } from "../../utils/auth/credentialEpoch.js";
import { markWarmSpareClaimed } from "../../utils/startupTiming.js";
import { applyValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { relocateSession } from "../../utils/sessionRelocation.js";
import { registerSession } from "../../utils/concurrentSessions.js";
import { logEvent } from "../../services/analytics/index.js";
import { hasUnsafePathGlyphs } from "../../utils/unsafePathGlyphs.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { resolveLocalSettingsStoreRoot } from "../../utils/settings/settingsFileParsing.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { parseSettingsFileUncached } from "../../utils/settings/settings.js";

//@ chunk-7n18p51h.js:12190-12372 placement
var CLAIM_ENV_KEYS = new Set([
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
  "CLAUDE_CODE_HOST_SESSION_ID",
]);
var TOKEN_ENV_KEYS = new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_SESSION_ACCESS_TOKEN"]);
//@ chunk-7n18p51h.js:12372-12417 placement
function errorResult(message) {
  return {
    kind: "error",
    message,
  };
}
//@ chunk-7n18p51h.js:12417-18455 placement
/**
 * 预热备用进程（warm spare）被认领：校验进程是以备用模式启动的，接收会话凭证与设置（CLAUDE_CODE_OAUTH_TOKEN/SESSION_ACCESS_TOKEN 等），应用设置并记录启动耗时。
 */
async function claimWarmSpareSession(m, e) {
  let startTime = performance.now();
  profileCheckpoint("claim_received");
  headlessProfilerCheckpoint("claim_received");
  if (!isParkedSpare())
    return errorResult(
      "not_a_spare: claim_session is only accepted by a process started with --await-claim that has not been claimed yet",
    );
  let u = e.parkedSettingsRefusal();
  if (u !== undefined)
    return errorResult(
      `settings_not_applied: ${u} \u2014 nothing was claimed; start the session with query()`,
    );
  if (e.isBusy()) return errorResult("busy: a turn is in progress");
  if (!e.isFreshSession())
    return errorResult("turn_started: the spare already ran a turn and cannot be claimed");
  if (isScrubEnabled())
    return errorResult(
      "scrub_mode: a spare cannot be claimed while CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is on \u2014 its sandbox paths are pinned to the launch directory",
    );
  let p = SDKClaimSessionClaimSessionMessageSchema().safeParse(m);
  if (!p.success) {
    let s = p.error.issues[0];
    return errorResult(
      `invalid_request: ${s ? `${sanitizeTelemetryString(s.path.join(".") || "(root)")} \u2014 ${sanitizeTelemetryString(s.message)}` : "malformed claim_session request"}`,
    );
  }
  let i = p.data;
  let env = i.env ?? {};
  for (let key of Object.keys(env))
    if (!CLAIM_ENV_KEYS.has(key))
      return errorResult(
        `env_key_not_claimable: ${sanitizeTelemetryString(key)} is read during start-up; pass it in the spare's spawn env instead`,
      );
  if (env.CLAUDE_CODE_OAUTH_TOKEN !== undefined && isLauncherStartedProcess())
    return errorResult(
      "env_key_not_claimable: CLAUDE_CODE_OAUTH_TOKEN in a process an organization's launcher started; such a process takes the sign-in only by asking its host at start-up (oauth_token_refresh)",
    );
  let found = i.sdk_mcp_servers?.find(isPrototypeKey);
  if (found !== undefined)
    return errorResult("invalid_request: sdk_mcp_servers \u2014 " + reservedServerNameMessage(found));
  if (i.cwd.trim() === "") return errorResult("invalid_request: cwd \u2014 must be a non-empty string");
  let n;
  try {
    n = expandPath(i.cwd);
    if (
      !vetPathSpellingsOrChain(i.cwd, n, e.getToolPermissionContext().trustedNetworkDirectories, {
        allowLinkTextClimbs: true,
      }).ok
    )
      return errorResult("unsafe_path: the claim cwd is a network path or an obfuscated spelling");
  } catch {
    return errorResult("unsafe_path: the claim cwd could not be screened");
  }
  if (!isAbsolute(n))
    return errorResult("invalid_request: cwd \u2014 must be an absolute path (or ~/\u2026)");
  try {
    if (!(await stat(n)).isDirectory())
      return errorResult("cwd_not_a_directory: the claim cwd is not a directory");
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(`claim_session: unexpected stat errno for the claim cwd: ${String(error)}`, {
        level: "error",
      });
    return errorResult("cwd_not_found: the claim cwd does not exist or is not accessible");
  }
  let d = n;
  try {
    d = await realpath(n);
  } catch {
    d = n;
  }
  if (pathVettingReason(d, e.getToolPermissionContext().trustedNetworkDirectories) !== undefined)
    return errorResult("unsafe_path: the claim cwd resolved to a network path or an obfuscated spelling");
  let _ = [];
  for (let s of i.additional_directories ?? []) {
    let c;
    try {
      c = resolve(d, expandPath(s, d));
      if (
        !vetPathSpellingsOrChain(s, c, e.getToolPermissionContext().trustedNetworkDirectories, {
          allowLinkTextClimbs: true,
        }).ok
      )
        return errorResult(
          "unsafe_path: an additional directory is a network path or an obfuscated spelling",
        );
    } catch {
      return errorResult("unsafe_path: an additional directory could not be screened");
    }
    try {
      if ((await stat(c)).isDirectory()) _.push(c);
      else
        logForDebugging(`claim_session: additional directory ${c} is not a directory \u2014 skipped`, {
          level: "warn",
        });
    } catch {}
  }
  let E = i.permission_mode ?? e.currentPermissionMode();
  let toolPermissionContext = e.getToolPermissionContext();
  let modesInPlay = new Set(
    [E, toolPermissionContext.mode, toolPermissionContext.prePlanMode].filter((s) => s !== undefined),
  );
  let message = await projectSettingsFilesToApply(d, {
    permissionModeSupplied: e.permissionModeSuppliedOnInvocation || i.permission_mode !== undefined,
    modesInPlay,
  });
  if (message !== undefined) return errorResult(message);
  if (i.permission_mode !== undefined) {
    let s = e.checkPermissionMode(i.permission_mode);
    if (s !== undefined) return errorResult(`permission_mode_not_claimable: ${s}`);
  }
  profileCheckpoint("claim_validated");
  headlessProfilerCheckpoint("claim_validated");
  let g = markSpareClaiming();
  let sdkMcpSettled = e.sdkMcpSettled();
  let C = false;
  for (let [key, value] of Object.entries(env)) {
    process.env[key] = value;
    if (TOKEN_ENV_KEYS.has(key)) C = true;
  }
  if (C) resetEnvDerivedAuthCaches();
  if (Object.keys(env).length > 0) emitCredentialChange();
  resetStartTime();
  markWarmSpareClaimed();
  if (_.length > 0) {
    e.setToolPermissionContext(
      applyValidatedPermissionUpdate(e.getToolPermissionContext(), {
        type: "addDirectories",
        directories: _,
        destination: "cliArg",
      }),
    );
    setAdditionalDirectoriesForClaudeMd([...getAdditionalDirectoriesForClaudeMd(), ..._]);
  }
  let { departedAdditionalDirectories } = await relocateSession(e.session, d, "claim_session", {
    storageV5: e.storageV5,
    credentials: e.credentials,
    freshSession: true,
    confirmFresh: () => !e.isBusy() && e.isFreshSession(),
    requestBuilt: () => false,
  });
  headlessProfilerCheckpoint("claim_relocated");
  e.setToolPermissionContext(e.settlePlanAutoMode(e.getToolPermissionContext()));
  try {
    e.retireDepartedAdditionalDirectories(departedAdditionalDirectories);
  } catch (error) {
    logForDebugging(
      `claim_session: retiring the spare directory's additional directories failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  try {
    await e.startDeferredMcpServers();
  } catch (error) {
    logForDebugging(
      `claim_session: starting the held-back MCP servers failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  headlessProfilerCheckpoint("claim_deferred_mcp");
  try {
    await e.rehomePluginsAndMcp();
  } catch (error) {
    logForDebugging(
      `claim_session: re-homing plugins/MCP for the claimed directory failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  headlessProfilerCheckpoint("claim_plugins_mcp");
  if (i.permission_mode !== undefined) {
    let s = e.applyPermissionMode(i.permission_mode);
    if (s !== undefined) throw Error(`permission mode not applied after relocation: ${s}`);
    setNeedsPlanModeExitAttachment(false);
    setHasExitedPlanMode(false);
    setNeedsAutoModeExitAttachment(false);
    setSessionBypassPermissionsMode(i.permission_mode === "bypassPermissions");
  }
  e.recheckAutoModeGate();
  let h;
  try {
    h = await e.applyWorkspaceTrust(i.workspace_trust);
  } catch (error) {
    logForDebugging(
      `claim_session: recording the host's workspace trust failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  registerSession(e.storageV5).catch(() => {});
  e.applyPromptOptions({
    systemPrompt: i.system_prompt,
    appendSystemPrompt: i.append_system_prompt,
    title: i.title,
    agents: i.agents,
  });
  if (i.sdk_mcp_servers !== undefined) e.setSdkMcpServers(i.sdk_mcp_servers);
  e.startSessionStartHooks();
  e.announceStartingChange();
  markSpareClaimed();
  profileCheckpoint("spare_claimed");
  headlessProfilerCheckpoint("spare_claimed");
  let S;
  let y;
  if (i.include_initialize) {
    let startTime = performance.now();
    try {
      S = await e.buildInitializePayload(h);
    } catch (error) {
      logForDebugging(
        `claim_session: building the initialize payload failed (continuing without it): ${String(error)}`,
        {
          level: "error",
        },
      );
    }
    y = Math.round(performance.now() - startTime);
    headlessProfilerCheckpoint("spare_claim_initialize");
  }
  let rounded = Math.round(performance.now() - startTime);
  addStartupContext({
    spare_claimed: 1,
    ...(g !== undefined && {
      spare_parked_ms: g,
    }),
    spare_claim_ms: rounded,
    ...(y !== undefined && {
      spare_claim_initialize_ms: y,
    }),
  });
  logEvent("tengu_spare_claimed", {
    parked_ms: g,
    claim_ms: rounded,
    initialize_ms: y,
    sdk_mcp_settled: sdkMcpSettled,
    env_keys: Object.keys(env).length,
    additional_directories: _.length,
    sdk_mcp_servers: i.sdk_mcp_servers?.length,
  });
  return {
    kind: "ok",
    response: {
      status: "ok",
      ...(!hasUnsafePathGlyphs(d) && {
        cwd: d,
      }),
      session_id: getSessionId(),
      ...(g !== undefined && {
        parked_ms: g,
      }),
      sdk_mcp_settled: sdkMcpSettled,
      ...(S !== undefined && {
        initialize: S,
      }),
      ...(h !== undefined && {
        workspace_trust_recorded: h,
      }),
    },
  };
}
//@ chunk-7n18p51h.js:18455-19981 placement
async function projectSettingsFilesToApply(m, e) {
  if (getProjectConfigRoot() !== null) return;
  let f = [];
  if (isSettingSourceEnabled("projectSettings"))
    f.push({
      label: "settings.json",
      path: join(m, ".claude", "settings.json"),
    });
  if (isSettingSourceEnabled("localSettings")) {
    let localSettingsStoreRoot = resolveLocalSettingsStoreRoot(m, uncachedStorageRootFor);
    for (let p of new Set([m, localSettingsStoreRoot]))
      f.push({
        label: "settings.local.json",
        path: join(p, ".claude", "settings.local.json"),
      });
  }
  for (let { label, path } of f) {
    let settings = parseSettingsFileUncached(path).settings;
    if (!settings || typeof settings !== "object") continue;
    let r = settings;
    let l = (d) =>
      `project_settings_not_claimable: ${label} in the claimed directory sets ${d}, which a cold start applies during start-up and a claim cannot; start this session cold`;
    if (r.env && typeof r.env === "object" && Object.keys(r.env).length > 0) return l("env");
    if (typeof r.agent === "string" && r.agent !== "") return l("agent");
    if (typeof r.model === "string" && r.model !== "") return l("model");
    if (Array.isArray(r.fallbackModel) && r.fallbackModel.length > 0) return l("fallbackModel");
    let permissions = r.permissions && typeof r.permissions === "object" ? r.permissions : undefined;
    if (!e.permissionModeSupplied && typeof permissions?.defaultMode === "string")
      return l(
        "permissions.defaultMode (no permission mode was given: neither --permission-mode on the spare nor permission_mode in the claim)",
      );
    if (permissions?.disableBypassPermissionsMode === "disable" && e.modesInPlay.has("bypassPermissions"))
      return l(
        "permissions.disableBypassPermissionsMode while the session would run in, or could return to, bypassPermissions mode",
      );
    if (
      (permissions?.disableAutoMode === "disable" || r.disableAutoMode === "disable") &&
      e.modesInPlay.has("auto")
    )
      return l("disableAutoMode while the session would run in, or could return to, auto mode");
  }
  return;
}
