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
import { NF, cH } from "../../utils/permissions/pathVetting.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { resetEnvDerivedAuthCaches } from "../../utils/auth.js";
import { emitCredentialChange } from "../../utils/auth/credentialEpoch.js";
import { Tcr } from "../../utils/startupTiming.js";
import { applyValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { relocateSession } from "../../utils/sessionRelocation.js";
import { registerSession } from "../../utils/concurrentSessions.js";
import { logEvent } from "../../services/analytics/index.js";
import { hasUnsafePathGlyphs } from "../../utils/unsafePathGlyphs.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { resolveLocalSettingsStoreRoot } from "../../utils/settings/settingsFileParsing.js";
import { eA } from "../../utils/settings/settingsStorage.js";
import { parseSettingsFileUncached } from "../../utils/settings/settings.js";

//@ chunk-7n18p51h.js:12190-12372 placement
var CLAIM_ENV_KEYS = new Set([
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
    "CLAUDE_CODE_HOST_SESSION_ID",
  ]),
  TOKEN_ENV_KEYS = new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_SESSION_ACCESS_TOKEN"]);
//@ chunk-7n18p51h.js:12372-12417 placement
function o(m) {
  return { kind: "error", message: m };
}
/**
 * 预热备用进程（warm spare）被认领：校验进程是以备用模式启动的，接收会话凭证与设置（CLAUDE_CODE_OAUTH_TOKEN/SESSION_ACCESS_TOKEN 等），应用设置并记录启动耗时。
 */
//@ chunk-7n18p51h.js:12417-18455 placement
async function claimWarmSpareSession(m, e) {
  let startTime = performance.now();
  if ((profileCheckpoint("claim_received"), headlessProfilerCheckpoint("claim_received"), !isParkedSpare()))
    return o(
      "not_a_spare: claim_session is only accepted by a process started with --await-claim that has not been claimed yet",
    );
  let parkedSettingsRefusal = e.parkedSettingsRefusal();
  if (parkedSettingsRefusal !== void 0)
    return o(
      `settings_not_applied: ${parkedSettingsRefusal} \u2014 nothing was claimed; start the session with query()`,
    );
  if (e.isBusy()) return o("busy: a turn is in progress");
  if (!e.isFreshSession()) return o("turn_started: the spare already ran a turn and cannot be claimed");
  if (isScrubEnabled())
    return o(
      "scrub_mode: a spare cannot be claimed while CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is on \u2014 its sandbox paths are pinned to the launch directory",
    );
  let safeParse = SDKClaimSessionClaimSessionMessageSchema().safeParse(m);
  if (!safeParse.success) {
    let s = safeParse.error.issues[0];
    return o(
      `invalid_request: ${s ? `${sanitizeTelemetryString(s.path.join(".") || "(root)")} \u2014 ${sanitizeTelemetryString(s.message)}` : "malformed claim_session request"}`,
    );
  }
  let i = safeParse.data,
    r = i.env ?? {};
  for (let s of Object.keys(r))
    if (!CLAIM_ENV_KEYS.has(s))
      return o(
        `env_key_not_claimable: ${sanitizeTelemetryString(s)} is read during start-up; pass it in the spare's spawn env instead`,
      );
  if (r.CLAUDE_CODE_OAUTH_TOKEN !== void 0 && isLauncherStartedProcess())
    return o(
      "env_key_not_claimable: CLAUDE_CODE_OAUTH_TOKEN in a process an organization's launcher started; such a process takes the sign-in only by asking its host at start-up (oauth_token_refresh)",
    );
  let l = i.sdk_mcp_servers?.find(isPrototypeKey);
  if (l !== void 0) return o("invalid_request: sdk_mcp_servers \u2014 " + reservedServerNameMessage(l));
  if (i.cwd.trim() === "") return o("invalid_request: cwd \u2014 must be a non-empty string");
  let n;
  try {
    if (
      ((n = expandPath(i.cwd)),
      !NF(i.cwd, n, e.getToolPermissionContext().trustedNetworkDirectories, { allowLinkTextClimbs: !0 }).ok)
    )
      return o("unsafe_path: the claim cwd is a network path or an obfuscated spelling");
  } catch {
    return o("unsafe_path: the claim cwd could not be screened");
  }
  if (!isAbsolute(n)) return o("invalid_request: cwd \u2014 must be an absolute path (or ~/\u2026)");
  try {
    if (!(await stat(n)).isDirectory()) return o("cwd_not_a_directory: the claim cwd is not a directory");
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(`claim_session: unexpected stat errno for the claim cwd: ${String(error)}`, {
        level: "error",
      });
    return o("cwd_not_found: the claim cwd does not exist or is not accessible");
  }
  let d = n;
  try {
    d = await realpath(n);
  } catch {
    d = n;
  }
  if (cH(d, e.getToolPermissionContext().trustedNetworkDirectories) !== void 0)
    return o("unsafe_path: the claim cwd resolved to a network path or an obfuscated spelling");
  let _ = [];
  for (let s of i.additional_directories ?? []) {
    let c;
    try {
      if (
        ((c = resolve(d, expandPath(s, d))),
        !NF(s, c, e.getToolPermissionContext().trustedNetworkDirectories, { allowLinkTextClimbs: !0 }).ok)
      )
        return o("unsafe_path: an additional directory is a network path or an obfuscated spelling");
    } catch {
      return o("unsafe_path: an additional directory could not be screened");
    }
    try {
      if ((await stat(c)).isDirectory()) _.push(c);
      else
        logForDebugging(`claim_session: additional directory ${c} is not a directory \u2014 skipped`, {
          level: "warn",
        });
    } catch {}
  }
  let E = i.permission_mode ?? e.currentPermissionMode(),
    toolPermissionContext = e.getToolPermissionContext(),
    A = new Set(
      [E, toolPermissionContext.mode, toolPermissionContext.prePlanMode].filter((s) => s !== void 0),
    ),
    b = await projectSettingsFilesToApply(d, {
      permissionModeSupplied: e.permissionModeSuppliedOnInvocation || i.permission_mode !== void 0,
      modesInPlay: A,
    });
  if (b !== void 0) return o(b);
  if (i.permission_mode !== void 0) {
    let checkPermissionMode = e.checkPermissionMode(i.permission_mode);
    if (checkPermissionMode !== void 0) return o(`permission_mode_not_claimable: ${checkPermissionMode}`);
  }
  (profileCheckpoint("claim_validated"), headlessProfilerCheckpoint("claim_validated"));
  let g = markSpareClaiming(),
    sdkMcpSettled = e.sdkMcpSettled(),
    C = !1;
  for (let [s, c] of Object.entries(r)) if (((process.env[s] = c), TOKEN_ENV_KEYS.has(s))) C = !0;
  if (C) resetEnvDerivedAuthCaches();
  if (Object.keys(r).length > 0) emitCredentialChange();
  if ((resetStartTime(), Tcr(), _.length > 0))
    (e.setToolPermissionContext(
      applyValidatedPermissionUpdate(e.getToolPermissionContext(), {
        type: "addDirectories",
        directories: _,
        destination: "cliArg",
      }),
    ),
      setAdditionalDirectoriesForClaudeMd([...getAdditionalDirectoriesForClaudeMd(), ..._]));
  let { departedAdditionalDirectories: departedAdditionalDirectories } = await relocateSession(
    e.session,
    d,
    "claim_session",
    {
      storageV5: e.storageV5,
      credentials: e.credentials,
      freshSession: !0,
      confirmFresh: () => !e.isBusy() && e.isFreshSession(),
      requestBuilt: () => !1,
    },
  );
  (headlessProfilerCheckpoint("claim_relocated"),
    e.setToolPermissionContext(e.settlePlanAutoMode(e.getToolPermissionContext())));
  try {
    e.retireDepartedAdditionalDirectories(departedAdditionalDirectories);
  } catch (error) {
    logForDebugging(
      `claim_session: retiring the spare directory's additional directories failed (continuing): ${String(error)}`,
      { level: "error" },
    );
  }
  try {
    await e.startDeferredMcpServers();
  } catch (error) {
    logForDebugging(
      `claim_session: starting the held-back MCP servers failed (continuing): ${String(error)}`,
      { level: "error" },
    );
  }
  headlessProfilerCheckpoint("claim_deferred_mcp");
  try {
    await e.rehomePluginsAndMcp();
  } catch (error) {
    logForDebugging(
      `claim_session: re-homing plugins/MCP for the claimed directory failed (continuing): ${String(error)}`,
      { level: "error" },
    );
  }
  if ((headlessProfilerCheckpoint("claim_plugins_mcp"), i.permission_mode !== void 0)) {
    let applyPermissionMode = e.applyPermissionMode(i.permission_mode);
    if (applyPermissionMode !== void 0)
      throw Error(`permission mode not applied after relocation: ${applyPermissionMode}`);
    (setNeedsPlanModeExitAttachment(!1),
      setHasExitedPlanMode(!1),
      setNeedsAutoModeExitAttachment(!1),
      setSessionBypassPermissionsMode(i.permission_mode === "bypassPermissions"));
  }
  e.recheckAutoModeGate();
  let h;
  try {
    h = await e.applyWorkspaceTrust(i.workspace_trust);
  } catch (error) {
    logForDebugging(
      `claim_session: recording the host's workspace trust failed (continuing): ${String(error)}`,
      { level: "error" },
    );
  }
  if (
    (registerSession(e.storageV5).catch(() => {}),
    e.applyPromptOptions({
      systemPrompt: i.system_prompt,
      appendSystemPrompt: i.append_system_prompt,
      title: i.title,
      agents: i.agents,
    }),
    i.sdk_mcp_servers !== void 0)
  )
    e.setSdkMcpServers(i.sdk_mcp_servers);
  (e.startSessionStartHooks(),
    e.announceStartingChange(),
    markSpareClaimed(),
    profileCheckpoint("spare_claimed"),
    headlessProfilerCheckpoint("spare_claimed"));
  let S, y;
  if (i.include_initialize) {
    let startTime = performance.now();
    try {
      S = await e.buildInitializePayload(h);
    } catch (error) {
      logForDebugging(
        `claim_session: building the initialize payload failed (continuing without it): ${String(error)}`,
        { level: "error" },
      );
    }
    ((y = Math.round(performance.now() - startTime)), headlessProfilerCheckpoint("spare_claim_initialize"));
  }
  let rounded = Math.round(performance.now() - startTime);
  return (
    addStartupContext({
      spare_claimed: 1,
      ...(g !== void 0 && { spare_parked_ms: g }),
      spare_claim_ms: rounded,
      ...(y !== void 0 && { spare_claim_initialize_ms: y }),
    }),
    logEvent("tengu_spare_claimed", {
      parked_ms: g,
      claim_ms: rounded,
      initialize_ms: y,
      sdk_mcp_settled: sdkMcpSettled,
      env_keys: Object.keys(r).length,
      additional_directories: _.length,
      sdk_mcp_servers: i.sdk_mcp_servers?.length,
    }),
    {
      kind: "ok",
      response: {
        status: "ok",
        ...(!hasUnsafePathGlyphs(d) && { cwd: d }),
        session_id: getSessionId(),
        ...(g !== void 0 && { parked_ms: g }),
        sdk_mcp_settled: sdkMcpSettled,
        ...(S !== void 0 && { initialize: S }),
        ...(h !== void 0 && { workspace_trust_recorded: h }),
      },
    }
  );
}
//@ chunk-7n18p51h.js:18455-19981 placement
async function projectSettingsFilesToApply(m, e) {
  if (getProjectConfigRoot() !== null) return;
  let f = [];
  if (isSettingSourceEnabled("projectSettings"))
    f.push({ label: "settings.json", path: join(m, ".claude", "settings.json") });
  if (isSettingSourceEnabled("localSettings")) {
    let u = resolveLocalSettingsStoreRoot(m, eA);
    for (let p of new Set([m, u]))
      f.push({ label: "settings.local.json", path: join(p, ".claude", "settings.local.json") });
  }
  for (let { label: label, path: path } of f) {
    let settings = parseSettingsFileUncached(path).settings;
    if (!settings || typeof settings !== "object") continue;
    let r = settings,
      l = (d) =>
        `project_settings_not_claimable: ${label} in the claimed directory sets ${d}, which a cold start applies during start-up and a claim cannot; start this session cold`;
    if (r.env && typeof r.env === "object" && Object.keys(r.env).length > 0) return l("env");
    if (typeof r.agent === "string" && r.agent !== "") return l("agent");
    if (typeof r.model === "string" && r.model !== "") return l("model");
    if (Array.isArray(r.fallbackModel) && r.fallbackModel.length > 0) return l("fallbackModel");
    let n = r.permissions && typeof r.permissions === "object" ? r.permissions : void 0;
    if (!e.permissionModeSupplied && typeof n?.defaultMode === "string")
      return l(
        "permissions.defaultMode (no permission mode was given: neither --permission-mode on the spare nor permission_mode in the claim)",
      );
    if (n?.disableBypassPermissionsMode === "disable" && e.modesInPlay.has("bypassPermissions"))
      return l(
        "permissions.disableBypassPermissionsMode while the session would run in, or could return to, bypassPermissions mode",
      );
    if ((n?.disableAutoMode === "disable" || r.disableAutoMode === "disable") && e.modesInPlay.has("auto"))
      return l("disableAutoMode while the session would run in, or could return to, auto mode");
  }
  return;
}
