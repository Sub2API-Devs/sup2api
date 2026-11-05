/**
 * entrypoints/warmSpare/claimSession.ts
 *
 * 2.1.316 新增。预热备用进程被认领为会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ea3gc4y9.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-ea3gc4y9.js:13376-13558 placement
var CLAIM_ENV_KEYS = new Set([
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
  "CLAUDE_CODE_HOST_SESSION_ID",
]);
var TOKEN_ENV_KEYS = new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_SESSION_ACCESS_TOKEN"]);
//@ chunk-ea3gc4y9.js:13558-13603 placement
function errorResult(message) {
  return {
    kind: "error",
    message,
  };
}
//@ chunk-ea3gc4y9.js:13603-19641 placement
/**
 * 预热备用进程（warm spare）被认领：校验进程是以备用模式启动的，接收会话凭证与设置（CLAUDE_CODE_OAUTH_TOKEN/SESSION_ACCESS_TOKEN 等），应用设置并记录启动耗时。
 */
async function claimWarmSpareSession(claim, spare) {
  let startTime = performance.now();
  profileCheckpoint("claim_received");
  headlessProfilerCheckpoint("claim_received");
  if (!isParkedSpare())
    return errorResult(
      "not_a_spare: claim_session is only accepted by a process started with --await-claim that has not been claimed yet",
    );
  let settingsRefusal = spare.parkedSettingsRefusal();
  if (settingsRefusal !== undefined)
    return errorResult(
      `settings_not_applied: ${settingsRefusal} \u2014 nothing was claimed; start the session with query()`,
    );
  if (spare.isBusy()) return errorResult("busy: a turn is in progress");
  if (!spare.isFreshSession())
    return errorResult("turn_started: the spare already ran a turn and cannot be claimed");
  if (isScrubEnabled())
    return errorResult(
      "scrub_mode: a spare cannot be claimed while CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is on \u2014 its sandbox paths are pinned to the launch directory",
    );
  let parsed = SDKClaimSessionClaimSessionMessageSchema().safeParse(claim);
  if (!parsed.success) {
    let firstIssue = parsed.error.issues[0];
    return errorResult(
      `invalid_request: ${firstIssue ? `${sanitizeTelemetryString(firstIssue.path.join(".") || "(root)")} \u2014 ${sanitizeTelemetryString(firstIssue.message)}` : "malformed claim_session request"}`,
    );
  }
  let claimData = parsed.data;
  let env = claimData.env ?? {};
  for (let key of Object.keys(env))
    if (!CLAIM_ENV_KEYS.has(key))
      return errorResult(
        `env_key_not_claimable: ${sanitizeTelemetryString(key)} is read during start-up; pass it in the spare's spawn env instead`,
      );
  if (env.CLAUDE_CODE_OAUTH_TOKEN !== undefined && isLauncherStartedProcess())
    return errorResult(
      "env_key_not_claimable: CLAUDE_CODE_OAUTH_TOKEN in a process an organization's launcher started; such a process takes the sign-in only by asking its host at start-up (oauth_token_refresh)",
    );
  let found = claimData.sdk_mcp_servers?.find(isPrototypeKey);
  if (found !== undefined)
    return errorResult("invalid_request: sdk_mcp_servers \u2014 " + reservedServerNameMessage(found));
  if (claimData.cwd.trim() === "")
    return errorResult("invalid_request: cwd \u2014 must be a non-empty string");
  let settingsError;
  try {
    settingsError = expandPath(claimData.cwd);
    if (
      !vetPathSpellingsOrChain(
        claimData.cwd,
        settingsError,
        spare.getToolPermissionContext().trustedNetworkDirectories,
        {
          allowLinkTextClimbs: true,
        },
      ).ok
    )
      return errorResult("unsafe_path: the claim cwd is a network path or an obfuscated spelling");
  } catch {
    return errorResult("unsafe_path: the claim cwd could not be screened");
  }
  if (!isAbsolute(settingsError))
    return errorResult("invalid_request: cwd \u2014 must be an absolute path (or ~/\u2026)");
  try {
    if (!(await stat(settingsError)).isDirectory())
      return errorResult("cwd_not_a_directory: the claim cwd is not a directory");
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(`claim_session: unexpected stat errno for the claim cwd: ${String(error)}`, {
        level: "error",
      });
    return errorResult("cwd_not_found: the claim cwd does not exist or is not accessible");
  }
  let blockingError = settingsError;
  try {
    blockingError = await realpath(settingsError);
  } catch {
    blockingError = settingsError;
  }
  if (
    pathVettingReason(blockingError, spare.getToolPermissionContext().trustedNetworkDirectories) !== undefined
  )
    return errorResult("unsafe_path: the claim cwd resolved to a network path or an obfuscated spelling");
  let extraDirs = [];
  for (let dir of claimData.additional_directories ?? []) {
    let resolvedDir;
    try {
      resolvedDir = resolve(blockingError, expandPath(dir, blockingError));
      if (
        !vetPathSpellingsOrChain(
          dir,
          resolvedDir,
          spare.getToolPermissionContext().trustedNetworkDirectories,
          {
            allowLinkTextClimbs: true,
          },
        ).ok
      )
        return errorResult(
          "unsafe_path: an additional directory is a network path or an obfuscated spelling",
        );
    } catch {
      return errorResult("unsafe_path: an additional directory could not be screened");
    }
    try {
      if ((await stat(resolvedDir)).isDirectory()) extraDirs.push(resolvedDir);
      else
        logForDebugging(
          `claim_session: additional directory ${resolvedDir} is not a directory \u2014 skipped`,
          {
            level: "warn",
          },
        );
    } catch {}
  }
  let permissionMode = claimData.permission_mode ?? spare.currentPermissionMode();
  let toolPermissionContext = spare.getToolPermissionContext();
  let modesInPlay = new Set(
    [permissionMode, toolPermissionContext.mode, toolPermissionContext.prePlanMode].filter(
      (value) => value !== undefined,
    ),
  );
  let message = await projectSettingsFilesToApply(blockingError, {
    permissionModeSupplied:
      spare.permissionModeSuppliedOnInvocation || claimData.permission_mode !== undefined,
    modesInPlay,
  });
  if (message !== undefined) return errorResult(message);
  if (claimData.permission_mode !== undefined) {
    let modeCheck = spare.checkPermissionMode(claimData.permission_mode);
    if (modeCheck !== undefined) return errorResult(`permission_mode_not_claimable: ${modeCheck}`);
  }
  profileCheckpoint("claim_validated");
  headlessProfilerCheckpoint("claim_validated");
  let claimingMarker = markSpareClaiming();
  let sdkMcpSettled = spare.sdkMcpSettled();
  let hasApplied = false;
  for (let [key, value] of Object.entries(env)) {
    process.env[key] = value;
    if (TOKEN_ENV_KEYS.has(key)) hasApplied = true;
  }
  if (hasApplied) resetEnvDerivedAuthCaches();
  if (Object.keys(env).length > 0) emitCredentialChange();
  resetStartTime();
  markWarmSpareClaimed();
  if (extraDirs.length > 0) {
    spare.setToolPermissionContext(
      applyValidatedPermissionUpdate(spare.getToolPermissionContext(), {
        type: "addDirectories",
        directories: extraDirs,
        destination: "cliArg",
      }),
    );
    setAdditionalDirectoriesForClaudeMd([...getAdditionalDirectoriesForClaudeMd(), ...extraDirs]);
  }
  let { departedAdditionalDirectories } = await relocateSession(
    spare.session,
    blockingError,
    "claim_session",
    {
      storageV5: spare.storageV5,
      credentials: spare.credentials,
      freshSession: true,
      confirmFresh: () => !spare.isBusy() && spare.isFreshSession(),
      requestBuilt: () => false,
    },
  );
  headlessProfilerCheckpoint("claim_relocated");
  spare.setToolPermissionContext(spare.settlePlanAutoMode(spare.getToolPermissionContext()));
  try {
    spare.retireDepartedAdditionalDirectories(departedAdditionalDirectories);
  } catch (error) {
    logForDebugging(
      `claim_session: retiring the spare directory's additional directories failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  try {
    await spare.startDeferredMcpServers();
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
    await spare.rehomePluginsAndMcp();
  } catch (error) {
    logForDebugging(
      `claim_session: re-homing plugins/MCP for the claimed directory failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  headlessProfilerCheckpoint("claim_plugins_mcp");
  if (claimData.permission_mode !== undefined) {
    let applyResult = spare.applyPermissionMode(claimData.permission_mode);
    if (applyResult !== undefined)
      throw Error(`permission mode not applied after relocation: ${applyResult}`);
    setNeedsPlanModeExitAttachment(false);
    setHasExitedPlanMode(false);
    setNeedsAutoModeExitAttachment(false);
    setSessionBypassPermissionsMode(claimData.permission_mode === "bypassPermissions");
  }
  spare.recheckAutoModeGate();
  let claimResult;
  try {
    claimResult = await spare.applyWorkspaceTrust(claimData.workspace_trust);
  } catch (error) {
    logForDebugging(
      `claim_session: recording the host's workspace trust failed (continuing): ${String(error)}`,
      {
        level: "error",
      },
    );
  }
  registerSession(spare.storageV5).catch(() => {});
  spare.applyPromptOptions({
    systemPrompt: claimData.system_prompt,
    appendSystemPrompt: claimData.append_system_prompt,
    title: claimData.title,
    agents: claimData.agents,
  });
  if (claimData.sdk_mcp_servers !== undefined) spare.setSdkMcpServers(claimData.sdk_mcp_servers);
  spare.startSessionStartHooks();
  spare.announceStartingChange();
  markSpareClaimed();
  profileCheckpoint("spare_claimed");
  headlessProfilerCheckpoint("spare_claimed");
  let a;
  let b;
  if (claimData.include_initialize) {
    let startTime = performance.now();
    try {
      a = await spare.buildInitializePayload(claimResult);
    } catch (error) {
      logForDebugging(
        `claim_session: building the initialize payload failed (continuing without it): ${String(error)}`,
        {
          level: "error",
        },
      );
    }
    b = Math.round(performance.now() - startTime);
    headlessProfilerCheckpoint("spare_claim_initialize");
  }
  let rounded = Math.round(performance.now() - startTime);
  addStartupContext({
    spare_claimed: 1,
    ...(claimingMarker !== undefined && {
      spare_parked_ms: claimingMarker,
    }),
    spare_claim_ms: rounded,
    ...(b !== undefined && {
      spare_claim_initialize_ms: b,
    }),
  });
  logEvent("tengu_spare_claimed", {
    parked_ms: claimingMarker,
    claim_ms: rounded,
    initialize_ms: b,
    sdk_mcp_settled: sdkMcpSettled,
    env_keys: Object.keys(env).length,
    additional_directories: extraDirs.length,
    sdk_mcp_servers: claimData.sdk_mcp_servers?.length,
  });
  return {
    kind: "ok",
    response: {
      status: "ok",
      ...(!hasUnsafePathGlyphs(blockingError) && {
        cwd: blockingError,
      }),
      session_id: getSessionId(),
      ...(claimingMarker !== undefined && {
        parked_ms: claimingMarker,
      }),
      sdk_mcp_settled: sdkMcpSettled,
      ...(a !== undefined && {
        initialize: a,
      }),
      ...(claimResult !== undefined && {
        workspace_trust_recorded: claimResult,
      }),
    },
  };
}
//@ chunk-ea3gc4y9.js:19641-21167 placement
async function projectSettingsFilesToApply(dir, options) {
  if (getProjectConfigRoot() !== null) return;
  let files = [];
  if (isSettingSourceEnabled("projectSettings"))
    files.push({
      label: "settings.json",
      path: join(dir, ".claude", "settings.json"),
    });
  if (isSettingSourceEnabled("localSettings")) {
    let localSettingsStoreRoot = resolveLocalSettingsStoreRoot(dir, uncachedStorageRootFor);
    for (let root of new Set([dir, localSettingsStoreRoot]))
      files.push({
        label: "settings.local.json",
        path: join(root, ".claude", "settings.local.json"),
      });
  }
  for (let { label, path } of files) {
    let settings = parseSettingsFileUncached(path).settings;
    if (!settings || typeof settings !== "object") continue;
    let settings_2 = settings;
    let refuse = (key) =>
      `project_settings_not_claimable: ${label} in the claimed directory sets ${key}, which a cold start applies during start-up and a claim cannot; start this session cold`;
    if (settings_2.env && typeof settings_2.env === "object" && Object.keys(settings_2.env).length > 0)
      return refuse("env");
    if (typeof settings_2.agent === "string" && settings_2.agent !== "") return refuse("agent");
    if (typeof settings_2.model === "string" && settings_2.model !== "") return refuse("model");
    if (Array.isArray(settings_2.fallbackModel) && settings_2.fallbackModel.length > 0)
      return refuse("fallbackModel");
    let permissions =
      settings_2.permissions && typeof settings_2.permissions === "object"
        ? settings_2.permissions
        : undefined;
    if (!options.permissionModeSupplied && typeof permissions?.defaultMode === "string")
      return refuse(
        "permissions.defaultMode (no permission mode was given: neither --permission-mode on the spare nor permission_mode in the claim)",
      );
    if (
      permissions?.disableBypassPermissionsMode === "disable" &&
      options.modesInPlay.has("bypassPermissions")
    )
      return refuse(
        "permissions.disableBypassPermissionsMode while the session would run in, or could return to, bypassPermissions mode",
      );
    if (
      (permissions?.disableAutoMode === "disable" || settings_2.disableAutoMode === "disable") &&
      options.modesInPlay.has("auto")
    )
      return refuse("disableAutoMode while the session would run in, or could return to, auto mode");
  }
  return;
}
export { claimWarmSpareSession };
