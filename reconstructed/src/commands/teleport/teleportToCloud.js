/**
 * commands/teleport/teleportToCloud.tsx
 *
 * 2.1.316 新增。/teleport 把本地会话移到云端（move-to-cloud）与菜单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kczn6qx7.js (49)
 * attribution: placement 49
 */
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, Ir, u, T, E, M, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { Clt } from "../../utils/teleport/cloudErrorMessage.js";
import { oauthHeaders, refusalCodes } from "../../bridge/codeSessionApi.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { lacksAuthorizationHeader } from "../../services/oauth/sessionsBearerHooks.js";
import { extractErrorDetail, extractPlainErrorDetail } from "../../bridge/debugUtils.js";
import { getErrorReason } from "../../bridge/githubPrSubscription.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getLastKnownBridgePermissionMode, getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { canSeedAutoMode, getStoredDefaultModeBar } from "../../utils/permissions/permissionSetup.js";
import { getInitialSettings_2, getSettingsParseErrorsForSource } from "../../utils/settings/settings.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { SETTING_SOURCES, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { findGitRoot, getBranch } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { getOriginalCwd, isRestrictedSession } from "../../bootstrap/state.js";
import { collectWorktreeState, withCollectTimeout } from "../../bridge/worktreeState.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { RESTRICTED_SESSION_CLOUD_REFUSAL } from "../../utils/teleport.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  getBridgeSessionsAccessTokenAsync,
  getBridgeSessionsAccessToken,
  getBridgeBaseUrl,
  bridgeSessionsAccessTokenAfter401,
} from "../../bridge/bridgeConfig.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import {
  probeGithubRepoAccess,
  noAccessText,
  installAppHint,
  connectAccountHint,
} from "../../utils/github/githubAccessHints.js";
import { fetchEnvironmentsAndPools } from "../../utils/teleport/selfHostedPool.js";
import { isSelfHostedPoolEnv, tPe } from "../../utils/teleport/environmentSelection.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { unmarkTeleportedSession, markTeleportedSession } from "../../bridge/createSession.js";
import { isKnownWorkerState } from "../../utils/telemetry/memorySummary.js";
import { getHeadForDir } from "../../utils/git/gitFilesystem.js";
import { getTrustedDeviceToken } from "../../bridge/trustedDevice.js";
import { getRemoteControlAtStartup } from "../../bridge/bridgeGates.js";
import { detectCurrentRepositoryWithHost } from "../../utils/detectRepository.js";
import { parseGitSourceRepository } from "../../bridge/gitSessionContext.js";
import { isWebSetupOfferable } from "../../services/cloudSessions/webSetup.js";
import { sleep } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import {
  cancelForHandoff,
  AUTO_CONTINUE_CANCEL_MESSAGES,
  fze,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { createSystemMessage } from "../../utils/messages.js";
import { withRelaunchHint } from "../../utils/processRelaunch.js";
import { clearBridgeSession } from "../../utils/sessionStorage.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { useSession } from "../../context/session.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { eBo, p5s } from "../../utils/background/remote/remoteSession.js";
import { TeleportResumeWrapper } from "../../components/TeleportResumeWrapper.js";
import { resetConversation } from "../../utils/conversationReset.js";
import { Spinner } from "../../components/Spinner.js";

//@ chunk-kczn6qx7.js:18184-18188 placement
j();
//@ chunk-kczn6qx7.js:18188-18212 placement
function Re(i) {
  return {};
}
//@ chunk-kczn6qx7.js:18212-18236 placement
function Ae(i) {
  return [];
}
//@ chunk-kczn6qx7.js:18236-18701 placement
var TELEPORT_GIT_SCHEMAS = "Anything you haven\u2019t pushed stays on this computer.",
  so = ["rebase", "merge", "cherry-pick", "revert", "bisect"],
  ao = DoctorLazy(() => {
    let i = o().catch(""),
      _ = Ir("type", [
        u({ type: T("source_revision_not_on_remote_error"), result: i, revision: i, default_branch: i }),
        u({
          type: T("source_revision_stale_on_remote_error"),
          revision: i,
          unpushed_commit_count: E().int().nonnegative().catch(0),
          is_dirty: M().catch(!1),
          mid_operation: i,
        }),
      ]);
    return Ue([u({ error: _ }).transform((h) => h.error), _]);
  });
/**
 * 解析服务端"源修订不在远端/远端过旧"的错误体，返回 not_on_remote / inconclusive / stale（未推送提交数、是否有改动、进行中操作）。
 */
//@ chunk-kczn6qx7.js:18701-19179 placement
function parseSourceRevisionError(body) {
  let safeParse = ao().safeParse(body);
  if (!safeParse.success) return;
  let h = safeParse.data,
    C = pe(h.revision);
  switch (h.type) {
    case "source_revision_not_on_remote_error":
      return Oe(h.result) === "not_on_remote"
        ? { kind: "not_on_remote", revision: C, defaultBranch: pe(h.default_branch) }
        : { kind: "inconclusive", revision: C };
    case "source_revision_stale_on_remote_error":
      return {
        kind: "stale",
        revision: C,
        unpushedCount: h.unpushed_commit_count,
        isDirty: h.is_dirty,
        midOperation: so.find((k) => k === Oe(h.mid_operation)) ?? null,
      };
  }
}
//@ chunk-kczn6qx7.js:19179-19936 placement
function notOnRemoteNotice(i) {
  switch (i.kind) {
    case "not_on_remote":
      return {
        notice: [
          `${i.revision || "This branch"} isn\u2019t on the remote yet. The cloud session starts from the default branch${i.defaultBranch && `, ${i.defaultBranch},`} instead.`,
          `Staying on this computer: your work on ${i.revision || "this branch"}.`,
        ],
        fallback: "default_branch",
      };
    case "stale":
      return {
        notice: buildStayingBehindNotice(
          Be(i.revision || "this branch"),
          listUnpushedWork(i.unpushedCount || null, i.isDirty, i.midOperation),
        ),
        fallback: "proceed_as_is",
      };
    case "inconclusive":
      return {
        notice: [
          `Couldn\u2019t confirm ${i.revision || "this branch"} is on the remote. If it isn\u2019t, the cloud session may not start.`,
          "The cloud session starts from what the remote has. Anything you haven\u2019t pushed stays on this computer.",
        ],
        fallback: "proceed_as_is",
      };
  }
}
/**
 * 根据本地工作树状态生成 teleport 前的提示（哪些改动不会带到云端）及可选项；无需提示返回 undefined。
 */
//@ chunk-kczn6qx7.js:19936-20390 placement
function describeLocalWorkNotice(worktreeState) {
  if (worktreeState === null || worktreeState.submodules_unverified)
    return {
      notice: [
        `Couldn\u2019t check your git state. ${startsFromPushedNotice("this branch")}`,
        TELEPORT_GIT_SCHEMAS,
      ],
      covers: ["proceed_as_is", "default_branch"],
    };
  let _ = worktreeState.branch === null ? "this commit" : pe(worktreeState.branch) || "this branch",
    h = listUnpushedWork(worktreeState.unpushed_count, worktreeState.is_dirty, worktreeState.mid_operation);
  if (worktreeState.unpushed_count === null)
    return {
      notice: buildStayingBehindNotice(startsFromPushedNotice(_), h),
      covers: ["proceed_as_is", "default_branch"],
    };
  return h.length > 0 ? { notice: buildStayingBehindNotice(Be(_), h), covers: ["proceed_as_is"] } : void 0;
}
//@ chunk-kczn6qx7.js:20390-20470 placement
function Oe(i) {
  return i.replace(/^REVISION_PREFLIGHT_RESULT_/, "").toLowerCase();
}
//@ chunk-kczn6qx7.js:20470-20555 placement
function pe(i) {
  let replaced = i.replace(/^refs\/heads\//, "");
  return /\s/u.test(replaced) ? "" : Clt(replaced, "");
}
//@ chunk-kczn6qx7.js:20555-20636 placement
function Be(i) {
  return `The cloud session starts from ${i} as it was last pushed.`;
}
//@ chunk-kczn6qx7.js:20636-20776 placement
function startsFromPushedNotice(i) {
  return `The cloud session starts from ${i} as it was last pushed, or from the default branch if it isn\u2019t on the remote.`;
}
//@ chunk-kczn6qx7.js:20776-20997 placement
function listUnpushedWork(i, _, h) {
  let C = [
    ...(i ? [`${i} unpushed ${i === 1 ? "commit" : "commits"}`] : []),
    ...(_ ? ["uncommitted changes"] : []),
    ...(h ? [`a ${h} in progress`] : []),
  ];
  return i === null && C.length > 0 ? [...C, "anything else you haven\u2019t pushed"] : C;
}
//@ chunk-kczn6qx7.js:20997-21176 placement
function buildStayingBehindNotice(i, _) {
  return _.length > 0
    ? [
        `Some changes won\u2019t come with you. ${i}`,
        `Staying on this computer: ${new Intl.ListFormat("en", { type: "conjunction" }).format(_)}.`,
      ]
    : [i, TELEPORT_GIT_SCHEMAS];
}
//@ chunk-kczn6qx7.js:21176-21224 placement
var TENGU_TELEPORT_PERMISSION_MODE_REFUSED = "tengu_teleport_permission_mode_refused";
//@ chunk-kczn6qx7.js:21224-23933 placement
async function moveSessionToCloud(i) {
  let {
      sessionId: sessionId,
      baseUrl: baseUrl,
      accessToken: accessToken,
      environmentId: environmentId,
      trustedDeviceToken: trustedDeviceToken,
      outcomeBranch: outcomeBranch,
      permissionMode: permissionMode,
      timeoutMs: timeoutMs = 15000,
    } = i,
    N = `${baseUrl}/v1/code/sessions/${sessionId}/move-to-cloud`,
    D = oauthHeaders(accessToken);
  if (trustedDeviceToken) D["X-Trusted-Device-Token"] = trustedDeviceToken;
  let O;
  try {
    O = await Dt.post(
      N,
      {
        environment_id: environmentId,
        ...(outcomeBranch && { outcome_branch: outcomeBranch }),
        ...(permissionMode && { permission_mode: permissionMode }),
        ...co(i.sourceRevision),
        ...fo(i.memoryMode),
        ...(i.revisionFallback && { revision_fallback: i.revisionFallback }),
      },
      { headers: D, timeout: timeoutMs, validateStatus: (F) => F < 600 },
    );
  } catch (error) {
    let I = error !== null && typeof error === "object" && "code" in error ? String(error.code) : "",
      U = I === "ENOTFOUND" || I === "ECONNREFUSED",
      Q = `Couldn't reach the server \u2014 ${errorMessage(error)}${U ? "" : ". The move may still have gone through \u2014 check the session in the web UI."}`;
    if (!U) i.onMayHaveMoved?.(Q);
    return { ok: !1, message: Q, mayHaveCommitted: !U };
  }
  if (O.status === 200 || O.status === 201) {
    i.onMoved?.();
    let F = readSessionEnvironment(O.data),
      I = F?.environment_kind ?? "cloud",
      U = F?.environment_id ?? environmentId;
    return (
      logForDebugging(`[code-session] move-to-cloud ${sessionId} \u2192 ${I} (env ${U})`),
      {
        ok: !0,
        environmentKind: I,
        environmentId: U,
        sessionId: sessionId,
        ...go(i.sourceRevision, O.data),
        ...po(i.memoryMode, O.data),
        ...Re(O.data),
      }
    );
  }
  if (O.status === 401 && i.onAuth401 !== void 0) {
    let onAuth401 = i.onAuth401,
      I = lacksAuthorizationHeader(O.config),
      U;
    try {
      U = await onAuth401(accessToken, I);
    } catch (error) {
      logForDebugging(
        `[code-session] move-to-cloud ${sessionId}: the 401 handler failed, not resending: ${errorMessage(error)}`,
      );
    }
    if (U !== void 0 && (I || U !== accessToken))
      return moveSessionToCloud({
        ...i,
        accessToken: U,
        onAuth401: (Q, ne) => (onAuth401(Q, ne).catch(() => {}), Promise.resolve(void 0)),
      });
  }
  let z =
    O.status >= 500
      ? `The server responded with ${O.status}. The move may still have gone through \u2014 check the session in the web UI.`
      : void 0;
  if (z !== void 0) i.onMayHaveMoved?.(z);
  let X = extractErrorDetail(O.data) ?? "",
    G = getErrorReason(O.data);
  if (z === void 0 && permissionMode && G === "move_permission_mode_refused") {
    logForDebugging(
      `[code-session] move-to-cloud ${sessionId} refused for its permission mode (${O.status})${X ? `: ${X}` : ""}; moving without one`,
    );
    let F = await moveSessionToCloud({ ...i, permissionMode: void 0 });
    try {
      logEvent(TENGU_TELEPORT_PERMISSION_MODE_REFUSED, {
        retry_without_mode: lit(F.ok ? "success" : F.mayHaveCommitted ? "maybe_committed" : "failed"),
      });
    } catch {}
    return F;
  }
  let Z =
    O.status === 400 && G === "session_not_bridge"
      ? "This session is already on cloud \u2014 refresh the web UI to see it."
      : void 0;
  if (Z !== void 0) i.onMayHaveMoved?.(Z);
  if (
    (logForDebugging(
      `[code-session] move-to-cloud ${sessionId} failed ${O.status}${G ? ` [${G}]` : ""}${X ? `: ${X}` : ""}`,
    ),
    z !== void 0)
  )
    return { ok: !1, message: z, mayHaveCommitted: !0 };
  if (Z !== void 0) return { ok: !1, message: Z, mayHaveCommitted: !0 };
  let ee = extractPlainErrorDetail(O.data),
    oe = /^the request was invalid\.?$/i.test(ee ?? "") ? void 0 : ee;
  return (
    i.onRefusal?.({ status: O.status, codes: refusalCodes(O.data), message: oe }),
    {
      ok: !1,
      message:
        oe ??
        `The server couldn\u2019t move this session (HTTP ${O.status}). Run with --debug to see the raw response.`,
      mayHaveCommitted: !1,
      reason: G,
      revisionConflict: O.status === 409 ? parseSourceRevisionError(O.data) : void 0,
    }
  );
}
//@ chunk-kczn6qx7.js:23933-24231 placement
function readSessionEnvironment(i) {
  if (
    i === null ||
    typeof i !== "object" ||
    !("session" in i) ||
    i.session === null ||
    typeof i.session !== "object"
  )
    return;
  let session = i.session;
  return {
    environment_kind: typeof session.environment_kind === "string" ? session.environment_kind : void 0,
    environment_id: typeof session.environment_id === "string" ? session.environment_id : void 0,
  };
}
//@ chunk-kczn6qx7.js:24231-24255 placement
function co(i) {
  return {};
}
//@ chunk-kczn6qx7.js:24255-24279 placement
function fo(i) {
  return {};
}
//@ chunk-kczn6qx7.js:24279-24305 placement
function po(i, _) {
  return {};
}
//@ chunk-kczn6qx7.js:24305-24331 placement
function go(i, _) {
  return {};
}
//@ chunk-kczn6qx7.js:24331-24353 placement
function he(i) {
  return;
}
//@ chunk-kczn6qx7.js:24353-25168 placement
function teleportPermissionMode() {
  let i = getLastKnownBridgePermissionMode();
  if (i !== "auto") {
    logForDebugging(
      `[code-session] move-to-cloud names no permission mode: ${i === void 0 ? "the terminal has reported no mode yet" : `the terminal's last reported mode is ${i}`}`,
    );
    return;
  }
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_happy_ocean", !1)) {
    (logForDebugging(
      "[code-session] move-to-cloud names no permission mode: the kill switch tengu_happy_ocean is served on",
    ),
      logAutoModeAsked({ kill_switch: !0 }));
    return;
  }
  let _ = !canSeedAutoMode(getInitialSettings_2()) || isScrubEnabled(),
    h =
      getStoredDefaultModeBar() === "settings_unreadable" ||
      SETTING_SOURCES.filter(isSettingSourceEnabled).some(
        (C) =>
          C !== "policySettings" && getSettingsParseErrorsForSource(C).some((k) => k.severity !== "warning"),
      );
  if (_ || h) {
    let filtered = [_ && "auto_mode_off", h && "settings_unreadable"].filter(Boolean);
    (logForDebugging(
      `[code-session] move-to-cloud names no permission mode: withheld for ${filtered.join("; ")}`,
    ),
      logAutoModeAsked({ kill_switch: !1, auto_mode_off: _, settings_unreadable: h }));
    return;
  }
  return (logForDebugging("[code-session] move-to-cloud names auto mode"), logAutoModeAsked(), "auto");
}
//@ chunk-kczn6qx7.js:25168-25304 placement
function logAutoModeAsked(i) {
  try {
    logEvent(
      "tengu_teleport_to_cloud",
      i === void 0 ? { action: lit("auto_mode_asked") } : { action: lit("auto_mode_not_asked"), ...i },
    );
  } catch {}
}
//@ chunk-kczn6qx7.js:25304-25534 placement
async function collectTeleportCheckout(sessionId) {
  if (!findGitRoot(getCwd())) return { kind: "no-git" };
  let _ = getOriginalCwd(),
    h = await getBranch(_),
    [C, k] = await Promise.all([Ge(h), collectWorktreeState(_, h === "HEAD" ? null : h)]);
  return {
    kind: "ready",
    outcomeBranch: `claude/teleport-${sessionId.slice(-8)}`,
    checkout: C,
    localWork: k,
  };
}
//@ chunk-kczn6qx7.js:25534-25680 placement
var UNCONFIRMED_BEFORE_MOVE_MESSAGE =
  "Couldn\u2019t confirm this session\u2019s Remote Control connection and git branch are unchanged, so nothing moved. Run /teleport again.";
/**
 * /teleport 移到云端：检查 Remote Control 连接、claude.ai 登录、git 仓库与未推送提交，确认后调用 move-to-cloud 接口，切换 Remote Control 会话并在本地记录 cloud_handoff。
 */
//@ chunk-kczn6qx7.js:25680-29997 placement
async function teleportToCloud(i) {
  if (isRestrictedSession())
    return (
      logFeatureBad("teleport_to_cloud", "restricted_session"),
      { kind: "precondition", message: RESTRICTED_SESSION_CLOUD_REFUSAL }
    );
  let _ = qe(getReplBridgeHandle()),
    h = _?.bridgeSessionId;
  if (!_ || !h)
    return (
      logFeatureBad("teleport_to_cloud", "no_bridge"),
      {
        kind: "precondition",
        message:
          "This session isn\u2019t connected to Remote Control. Run /remote-control first, then try again.",
      }
    );
  let C =
    isStorageV5Enabled() && i.credentials !== void 0
      ? await getBridgeSessionsAccessTokenAsync(i.credentials)
      : getBridgeSessionsAccessToken();
  if (!C)
    return (
      logFeatureBad("teleport_to_cloud", "no_auth"),
      {
        kind: "precondition",
        message: "Not signed in to claude.ai. Run /login with your claude.ai account and try again.",
      }
    );
  let k = await collectTeleportCheckout(h);
  switch (k.kind) {
    case "no-git":
      return (
        logFeatureBad("teleport_to_cloud", "no_git"),
        {
          kind: "precondition",
          message: `${getCwd()} isn\u2019t a git repository. The cloud session clones your repo from its remote, so there\u2019s nothing for it to check out here \u2014 try again from inside a git repo that has a remote.`,
        }
      );
    case "ready":
      break;
    default:
      return k;
  }
  if (_.gitRepoUrl === null)
    return (
      logFeatureBad("teleport_to_cloud", "no_git_remote"),
      {
        kind: "precondition",
        message:
          "This session has nothing for the cloud to clone, because moving needs a remote named origin in a repository not rooted at your home folder. A new session started from such a repository can move.",
      }
    );
  let { checkout: checkout, outcomeBranch: outcomeBranch } = k,
    H = describeLocalWorkNotice(k.localWork),
    V = H === void 0 ? _.publishGitStateBeforeHandoff?.() : void 0,
    N = isEssentialTrafficOnly() ? null : await resolveSourceRepository(_),
    D =
      N &&
      isGithubDotCom(N.host) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_github_access_precheck", !0)
        ? probeGithubRepoAccess(N.owner, N.name).catch(() => null)
        : null,
    O;
  try {
    O = await fetchEnvironmentsAndPools(i.storageV5, i.credentials);
  } catch (error) {
    return (
      logFeatureBad("teleport_to_cloud", "env_lookup_failed"),
      {
        kind: "precondition",
        message: `Couldn\u2019t look up cloud environments \u2014 ${errorMessage(error)}`,
      }
    );
  }
  let z = (x) => x.kind !== "bridge" && !isSelfHostedPoolEnv(x),
    X = O.selectedTarget && z(O.selectedTarget) ? O.selectedTarget : tPe(O.availableTargets, z);
  if (!X || isSelfHostedPoolEnv(X)) {
    if (O.environmentsError)
      return (
        logFeatureBad("teleport_to_cloud", "env_lookup_failed"),
        {
          kind: "precondition",
          message: `Couldn\u2019t look up cloud environments \u2014 ${O.environmentsError}`,
        }
      );
    return (
      logFeatureBad("teleport_to_cloud", "no_environment"),
      {
        kind: "precondition",
        message:
          "No cloud environment available. Create one from the web UI (or run /web-setup), then try again." +
          (isSelfHostedPoolEnv(O.selectedTarget)
            ? " Your default target is a self-hosted environment \u2014 continuing in the cloud needs a managed environment."
            : ""),
      }
    );
  }
  let G = await D;
  if (N && (G?.verdict === "github_not_connected" || G?.verdict === "github_repo_not_found"))
    return (
      logFeatureBad("teleport_to_cloud", G.verdict),
      {
        kind: "precondition",
        message:
          G.verdict === "github_not_connected"
            ? noAccessText({ subject: `Cloud sessions clone ${N.owner}/${N.name}`, ...teleportSetupHints() })
            : installAppHint({ owner: N.owner, name: N.name, ...teleportSetupHints(), apostrophe: "\u2019" }),
      }
    );
  await V;
  let Z,
    ee = _;
  if (H !== void 0) {
    Z = he();
    let x = await confirmBeforeMove(i, H.notice, h, checkout);
    if (x.kind !== "confirmed") return x;
    ((ee = x.handle), await ee.publishGitStateBeforeHandoff?.());
  }
  logEvent("tengu_teleport_to_cloud", { action: lit("start") });
  let oe = getRemoteSessionUrl(h, ee.sessionIngressUrl, { from: "cli" }),
    F = {
      sessionUrl: oe,
      accessToken: C,
      environmentId: X.environment_id,
      outcomeBranch: outcomeBranch,
      checkout: checkout,
    },
    { result: I, memoryMode: memoryMode } = await commitCloudMove(i, ee, {
      ...F,
      memoryModeAtNotice: Z,
      isAfterYes: H !== void 0,
    }),
    Q = new Set(H?.covers),
    ne;
  while (!I.ok && I.revisionConflict !== void 0 && ne === void 0) {
    unmarkTeleportedSession(h);
    let { notice: notice, fallback: fallback } = notOnRemoteNotice(I.revisionConflict),
      ae = !Q.has(fallback),
      de = await confirmBeforeMove(i, ae ? notice : void 0, h, checkout);
    if (de.kind !== "confirmed") return de;
    if ((Q.add(fallback), ae && fallback === "default_branch"))
      await de.handle.publishGitStateBeforeHandoff?.();
    else ne = fallback;
    ({ result: I, memoryMode: memoryMode } = await commitCloudMove(i, de.handle, {
      ...F,
      memoryModeAtNotice: memoryMode,
      isAfterYes: !0,
      revisionFallback: ne,
    }));
  }
  let ce = !1;
  if (!I.ok) {
    let x = !I.mayHaveCommitted && I.reason === "github_token_missing";
    if (I.mayHaveCommitted) logFeatureSad("teleport_to_cloud", "maybe_committed");
    else
      (logFeatureBad(
        "teleport_to_cloud",
        x
          ? "github_not_connected"
          : I.reason === "unconfirmed_before_move"
            ? "unconfirmed_before_move"
            : "request_failed",
      ),
        unmarkTeleportedSession(h));
    return (
      logEvent("tengu_teleport_to_cloud", { action: lit(I.mayHaveCommitted ? "maybe_committed" : "failed") }),
      {
        kind: "server-error",
        failure: x
          ? {
              ...I,
              message: `No GitHub account is connected to your Claude account (or the connection expired). ${connectAccountHint(teleportSetupHints())}`,
            }
          : I,
        sessionId: h,
      }
    );
  }
  let Se = !1;
  if (ne !== void 0) logFeatureSad("teleport_to_cloud", `revision_${ne}`);
  else logFeatureOk("teleport_to_cloud");
  let { environmentKind: environmentKind } = I;
  logEvent("tengu_teleport_to_cloud", {
    action: lit("success"),
    environment_kind: isKnownWorkerState(environmentKind)
      ? fromEnum(environmentKind)
      : lit(environmentKind === "cloud" ? "cloud" : "other"),
  });
  let se = [...[], ...Ae(I)];
  return {
    kind: "ok",
    success: I,
    sessionUrl: oe,
    ...(se.length > 0 && {
      afterMove: se.join(`
`),
    }),
  };
}
/**
 * 移动到云端前：若有提示先让用户确认（拒绝记事件）；再确认 Remote Control 连接与分支未变，返回 confirmed 句柄或 precondition 失败。
 */
//@ chunk-kczn6qx7.js:29997-30406 placement
async function confirmBeforeMove(ui, prompt, bridgeSessionId, checkout) {
  if (prompt !== void 0) {
    let A = await ui.confirmMove?.(prompt);
    if (A !== !0) {
      if (A === !1) logEvent("tengu_teleport_to_cloud", { action: lit("declined") });
      return { kind: "precondition", message: "Teleport cancelled" };
    }
  }
  let k = await recheckBridgeAndCheckout(bridgeSessionId, checkout);
  if (k === null)
    return (
      logFeatureBad("teleport_to_cloud", "unconfirmed_before_move"),
      logEvent("tengu_teleport_to_cloud", { action: lit("failed") }),
      { kind: "precondition", message: UNCONFIRMED_BEFORE_MOVE_MESSAGE }
    );
  return { kind: "confirmed", handle: k };
}
//@ chunk-kczn6qx7.js:30406-30602 placement
async function recheckBridgeAndCheckout(i, _) {
  let h = await withCollectTimeout(getBranch(getOriginalCwd()).then(Ge)).catch((k) => {
      logForDebugging(`[teleport] the checkout could not be read again: ${errorMessage(k)}`);
      return;
    }),
    C = qe(getReplBridgeHandle());
  return C?.bridgeSessionId === i && h === _ ? C : null;
}
//@ chunk-kczn6qx7.js:30602-30653 placement
async function Ge(i) {
  return i === "HEAD" ? getHeadForDir(getOriginalCwd()) : i;
}
//@ chunk-kczn6qx7.js:30653-31486 placement
async function commitCloudMove(i, _, h) {
  markTeleportedSession(_.bridgeSessionId);
  let C = !1;
  try {
    (_.stopLocalPreview?.(), await _.settleUploadsBeforeHandoff?.());
    let k = (await getBridgeSessionsAccessTokenAsync(i.credentials)) ?? h.accessToken,
      A = await getTrustedDeviceToken();
    if (h.isAfterYes && (await recheckBridgeAndCheckout(_.bridgeSessionId, h.checkout)) === null)
      return {
        result: {
          ok: !1,
          message: UNCONFIRMED_BEFORE_MOVE_MESSAGE,
          mayHaveCommitted: !1,
          reason: "unconfirmed_before_move",
        },
        memoryMode: h.memoryModeAtNotice,
      };
    let K = teleportPermissionMode(),
      H = he(h.memoryModeAtNotice);
    return (
      (C = !0),
      {
        result: await moveSessionToCloud({
          onMoved: () => {
            (i.onMoved?.(h.sessionUrl), runBeforeMoveStep(i));
          },
          onMayHaveMoved: (N) => {
            (i.onMayHaveMoved?.(N), runBeforeMoveStep(i));
          },
          sessionId: _.bridgeSessionId,
          baseUrl: getBridgeBaseUrl(),
          accessToken: k,
          onAuth401: (N, D) => bridgeSessionsAccessTokenAfter401(N, i.credentials, D),
          environmentId: h.environmentId,
          trustedDeviceToken: A,
          outcomeBranch: h.outcomeBranch,
          permissionMode: K,
          memoryMode: H,
          revisionFallback: h.revisionFallback,
        }),
        memoryMode: H,
      }
    );
  } catch (error) {
    if (!C) unmarkTeleportedSession(_.bridgeSessionId);
    throw error;
  }
}
//@ chunk-kczn6qx7.js:31486-31616 placement
function runBeforeMoveStep(i) {
  try {
    i.beforeMove?.();
  } catch (error) {
    logForDebugging(`[teleport] the step at the move's commit point failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-kczn6qx7.js:31616-31698 placement
function Ke(i) {
  return getRemoteControlAtStartup() ? { kind: "reconnect", oldSessionId: i } : { kind: "disconnect" };
}
//@ chunk-kczn6qx7.js:31698-31788 placement
var ke = "/remote-control is no longer active. Run /remote-control to start a new session.";
/**
 * 生成会话已移到云端的提示（远程控制断开、已重连或正在重连）。
 */
//@ chunk-kczn6qx7.js:31788-32135 placement
function movedToCloudMessage(i, _) {
  let h = `Session now in the cloud: ${i}`;
  switch (_.kind) {
    case "disconnected":
      return `${h}
${ke}`;
    case "reconnected":
      return `${h}
New /remote-control session is active \xB7 Continue here, on your phone, or at ${_.newUrl}`;
    case "reconnect-pending":
      return `${h}
Starting a new /remote-control session \u2014 it\u2019ll show as /rc shortly.`;
  }
}
//@ chunk-kczn6qx7.js:32135-32183 placement
function qe(i) {
  return i && !i.outboundOnly ? i : null;
}
//@ chunk-kczn6qx7.js:32183-32295 placement
function resolveSourceRepository(i) {
  if (i.gitRepoUrl === void 0) return detectCurrentRepositoryWithHost();
  return i.gitRepoUrl ? parseGitSourceRepository(i.gitRepoUrl) : Promise.resolve(null);
}
//@ chunk-kczn6qx7.js:32295-32420 placement
function teleportSetupHints() {
  return {
    webSetupHint: isWebSetupOfferable() ? "run /web-setup to reuse your GitHub CLI login" : "",
    rerun: "then run /teleport again",
  };
}
//@ chunk-kczn6qx7.js:32420-32445 placement
var vo = 1e4,
  _o = 100,
  Ve = 250;
//@ chunk-kczn6qx7.js:32445-32674 placement
function disableReplBridgeForMove(i, _ = !1) {
  i.setAppState((h) => {
    if (!h.replBridgeEnabled) return h;
    return {
      ...h,
      replBridgeSkipNextArchive: !0,
      replBridgeEnabled: !1,
      replBridgeExplicit: !1,
      replBridgeOutboundOnly: !1,
      ...(_ && { replBridgeSessionGroupingId: void 0 }),
    };
  });
}
//@ chunk-kczn6qx7.js:32674-32777 placement
function enableReplBridge(i) {
  i.setAppState((_) => {
    if (_.replBridgeEnabled) return _;
    return { ..._, replBridgeEnabled: !0 };
  });
}
//@ chunk-kczn6qx7.js:32777-32944 placement
async function waitForNewBridgeSession(oldSessionId, signal, timeoutMs = vo) {
  let C = Date.now() + timeoutMs;
  while (Date.now() < C) {
    if (signal.aborted) return null;
    let k = getReplBridgeHandle()?.bridgeSessionId;
    if (k && k !== oldSessionId) return k;
    await sleep(_o, signal);
  }
  return null;
}
/**
 * 执行 /teleport 移动；出错时若已移动或可能已移动，返回包含云端会话与错误说明的文本，否则继续抛出。
 */
//@ chunk-kczn6qx7.js:32944-33387 placement
async function runTeleportWithRecovery(context, options) {
  let h, C, k;
  try {
    return await runTeleportFromRepl(context, options, {
      onMoved: (A) => {
        h = A;
      },
      onAfterMove: (A) => {
        C = A;
      },
      onMayHaveMoved: (A) => {
        k = A;
      },
    });
  } catch (error) {
    if (h !== void 0)
      return (
        logError(error),
        `Session now in the cloud: ${h}
Claude Code didn\u2019t finish updating Remote Control in this terminal after the move (${errorMessage(error)}).${
          C === void 0
            ? ""
            : `
${C}`
        }`
      );
    if (k !== void 0)
      return (
        logError(error),
        `${k}
Claude Code didn\u2019t finish updating Remote Control in this terminal (${errorMessage(error)}).`
      );
    throw error;
  }
}
//@ chunk-kczn6qx7.js:33387-34564 placement
async function runTeleportFromRepl(i, _, h) {
  let C = !1,
    k;
  try {
    k = await teleportToCloud({
      beforeMove: () => {
        if (((C = cancelForHandoff("cloud_handoff")), C))
          i.applyMessageOp({
            type: "append",
            messages: [createSystemMessage(AUTO_CONTINUE_CANCEL_MESSAGES.cloud_handoff, "warning")],
          });
      },
      onMoved: h.onMoved,
      onMayHaveMoved: (A) => h.onMayHaveMoved(`Couldn\u2019t teleport: ${A}`),
      credentials: i.credentials,
      storageV5: i.storageV5,
      confirmMove: _,
    });
  } finally {
    fze();
  }
  switch (k.kind) {
    case "precondition":
      return k.message;
    case "server-error": {
      if (k.failure.mayHaveCommitted)
        return (
          h.onMayHaveMoved(withRelaunchHint(`Couldn\u2019t teleport: ${k.failure.message}`, C)),
          markTeleportedSession(k.sessionId),
          clearBridgeSession(void 0, void 0, void 0, i.storageV5),
          setTimeout(disableReplBridgeForMove, Ve, i, !0),
          withRelaunchHint(
            `Couldn\u2019t teleport: ${k.failure.message}
${ke}`,
            C,
          )
        );
      return withRelaunchHint(`Couldn\u2019t teleport: ${k.failure.message}`, C);
    }
    case "ok": {
      (h.onAfterMove(k.afterMove),
        markTeleportedSession(k.success.sessionId),
        clearBridgeSession(void 0, void 0, void 0, i.storageV5));
      let sessionUrl = k.sessionUrl,
        { afterMove: afterMove } = k,
        H = (D) =>
          afterMove === void 0
            ? D
            : `${D}
${afterMove}`,
        V = Ke(k.success.sessionId);
      if (V.kind === "disconnect")
        return (
          setTimeout(disableReplBridgeForMove, Ve, i, !0),
          H(movedToCloudMessage(sessionUrl, { kind: "disconnected" }))
        );
      (disableReplBridgeForMove(i), await sleep(0), enableReplBridge(i));
      let N = await waitForNewBridgeSession(V.oldSessionId, i.abortController.signal);
      return H(
        movedToCloudMessage(
          sessionUrl,
          N
            ? { kind: "reconnected", newUrl: getRemoteSessionUrl(N, void 0, { from: "cli" }) }
            : { kind: "reconnect-pending" },
        ),
      );
    }
  }
}
//@ chunk-kczn6qx7.js:34564-34609 placement
function Ro(oe) {
  return e(Text, { children: oe }, oe);
}
//@ chunk-kczn6qx7.js:34609-35726 placement
function TeleportConfirm(i) {
  let $ = w(21),
    { title: title, moveLabel: moveLabel, lines: lines, onAnswer: onAnswer } = i,
    K;
  if ($[0] !== title) ((K = e(Text, { bold: !0, children: title })), ($[0] = title), ($[1] = K));
  else K = $[1];
  let H;
  if ($[2] !== lines) ((H = lines.map(Ro)), ($[2] = lines), ($[3] = H));
  else H = $[3];
  let V;
  if ($[4] !== H)
    ((V = e(Box, { flexDirection: "column", marginTop: 1, gap: 1, children: H })), ($[4] = H), ($[5] = V));
  else V = $[5];
  let N;
  if ($[6] === MEMO_CACHE_SENTINEL) ((N = { label: "Cancel", value: "cancel" }), ($[6] = N));
  else N = $[6];
  let D;
  if ($[7] !== moveLabel) ((D = [N, { label: moveLabel, value: "move" }]), ($[7] = moveLabel), ($[8] = D));
  else D = $[8];
  let O, z;
  if ($[9] !== onAnswer)
    ((O = () => onAnswer(!1)),
      (z = (X) => onAnswer(X === "move")),
      ($[9] = onAnswer),
      ($[10] = O),
      ($[11] = z));
  else ((O = $[10]), (z = $[11]));
  let G;
  if ($[12] !== D || $[13] !== O || $[14] !== z)
    ((G = e(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: e(ModelSelector, { options: D, onCancel: O, onChange: z }),
    })),
      ($[12] = D),
      ($[13] = O),
      ($[14] = z),
      ($[15] = G));
  else G = $[15];
  let Z;
  if ($[16] === MEMO_CACHE_SENTINEL)
    ((Z = e(Box, {
      marginTop: 1,
      children: e(Text, {
        dimColor: !0,
        children: r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
            e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
          ],
        }),
      }),
    })),
      ($[16] = Z));
  else Z = $[16];
  let ee;
  if ($[17] !== K || $[18] !== V || $[19] !== G)
    ((ee = r(Box, { flexDirection: "column", padding: 1, children: [K, V, G, Z] })),
      ($[17] = K),
      ($[18] = V),
      ($[19] = G),
      ($[20] = ee));
  else ee = $[20];
  return ee;
}
//@ chunk-kczn6qx7.js:35726-35772 placement
function eo({ lines: lines, onAnswer: onAnswer }) {
  return null;
}
//@ chunk-kczn6qx7.js:35772-35798 placement
function oo() {
  return null;
}
//@ chunk-kczn6qx7.js:35798-35852 placement
function to(i) {
  logEvent("tengu_teleport_menu", { action: fromEnum(i) });
}
/**
 * /teleport 菜单：选择移到云端或其他 teleport 操作。
 */
//@ chunk-kczn6qx7.js:35852-39156 placement
function TeleportMenu({
  onExit: onExit,
  context: context,
  exposure: exposure,
  retireOnSurface: retireOnSurface,
  canSend: canSend,
}) {
  let [A, K] = y("menu"),
    [H, V] = y(),
    N = R(null),
    D = R(!1),
    O = R(!1),
    [z, X] = y(),
    [G, Z] = y(!1),
    [ee, oe] = y(),
    [F, I] = y(),
    U = R(void 0);
  function Q(B) {}
  function ne() {
    let B = U.current;
    if (((U.current = void 0), B !== void 0)) Q(B);
  }
  let ce = R(exposure.pendingOffer ?? null);
  P(() => {}, [canSend, context.session, context.credentials, context.storageV5]);
  let Se = useSession();
  (P(
    () => (
      (D.current = !1),
      () => {
        if (((D.current = !0), N.current)) ((O.current = !0), N.current(void 0), (N.current = null));
      }
    ),
    [],
  ),
    P(() => {
      if (!exposure.logged) ((exposure.logged = !0), to(canSend ? "shown" : "shown_no_bridge"));
    }, [exposure, canSend]));
  let ie = R(!1),
    se = (B) => {
      if (ie.current) return !1;
      return ((ie.current = !0), to(B), !0);
    },
    x = () => {
      (ce.current?.abandon(),
        exposure.importHold?.close("unused"),
        me("not_moved"),
        (exposure.isOfferAnswered = !0),
        (exposure.pendingOffer = null),
        (ce.current = null));
    },
    te = () => {
      if (se("cancel")) (x(), onExit("Teleport cancelled", { display: "system" }));
    },
    ae = useGlobalExitKeybindings(te, void 0, A === "menu");
  function de(B, W) {}
  function me(B) {
    exposure.moveEnded ??= B;
    let heldCopy = exposure.heldCopy;
    if (((exposure.heldCopy = void 0), heldCopy === void 0)) return;
    if (exposure.moveEnded === "moved") {
      let take = heldCopy.held.take();
      if (take !== void 0)
        try {
          if ((de(take, !1), heldCopy.line !== void 0)) Q(heldCopy.line);
        } catch (error) {
          logError(error);
        }
      return;
    }
    heldCopy.held.letGo();
  }
  function Eo(B, W = !1) {}
  function ro(B = !1) {
    (X(eBo() ? p5s() : void 0), K("sending"));
    let W = !1;
    runTeleportWithRecovery(
      context,
      (L) =>
        new Promise((re) => {
          if (D.current) {
            ((O.current = !0), re(void 0));
            return;
          }
          N.current = re;
          let le = U.current;
          V(le === void 0 ? L : [le, ...L]);
        }),
    )
      .then((L) => {
        if (!O.current)
          (me(L.startsWith("Session now in the cloud") ? "moved" : "not_moved"),
            exposure.importHold?.close("unused"),
            (W = !0),
            ne(),
            onExit(L, { display: "system" }));
      })
      .catch((L) => {
        if ((logError(L), !O.current && !W))
          (me("not_moved"),
            exposure.importHold?.close("unused"),
            ne(),
            onExit(`Couldn\u2019t teleport: ${errorMessage(L)}`, { display: "system" }));
      });
  }
  if (A === "resume")
    return e(TeleportResumeWrapper, {
      onComplete: (B) => {
        (resetConversation(context, B.log, retireOnSurface, Se),
          onExit("Session resumed successfully", { display: "system" }));
      },
      onCancel: () => onExit("Teleport cancelled", { display: "system" }),
      onError: (B) => onExit(B, { display: "system" }),
      isEmbedded: !0,
      source: "localCommand",
    });
  if (A === "sending" && H !== void 0) {
    let B = (W) => {
      let L = N.current;
      if (!L) return;
      if (W && exposure.importHold?.isEndTold === !1) {
        (oe(H), V(void 0));
        return;
      }
      if (((N.current = null), V(void 0), oe(void 0), Z(W), W)) U.current = void 0;
      L(W);
    };
    return z === void 0
      ? e(TeleportConfirm, {
          title: "Continue this session in the cloud?",
          moveLabel: "Continue in the cloud",
          lines: H,
          onAnswer: B,
        })
      : e(eo, { lines: H, onAnswer: B });
  }
  if (A === "sending" && z !== void 0 && !G) return e(oo, {});
  if (A === "sending")
    return r(Box, {
      flexDirection: "column",
      padding: 1,
      children: [
        r(Box, {
          flexDirection: "row",
          children: [
            e(Spinner, {}),
            e(Text, { bold: !0, children: "Moving this session to the cloud\u2026" }),
          ],
        }),
        (z !== void 0 || !G) &&
          e(Box, {
            marginLeft: 2,
            children: e(Text, {
              dimColor: !0,
              children: z ?? "It continues from your branch\u2019s last push.",
            }),
          }),
      ],
    });
  return r(Box, {
    flexDirection: "column",
    padding: 1,
    children: [
      e(Text, { bold: !0, children: "Teleport" }),
      !1,
      e(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: e(ModelSelector, {
          options: [
            {
              label: "Continue this session in the cloud",
              value: "send",
              disabled: !canSend,
              description: canSend ? void 0 : "Not connected \xB7 /remote-control",
            },
            { label: "Resume a session from cloud", value: "resume" },
          ],
          defaultFocusValue: canSend ? void 0 : "resume",
          onCancel: te,
          onChange: (B) => {
            if (B === "resume") {
              if (se("resume")) (x(), K("resume"));
              return;
            }
            if (!se("send")) return;
            ro();
          },
        }),
      }),
      e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          children: ae.pending
            ? `Press ${ae.keyName} again to cancel`
            : r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
                  e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
                  e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
                ],
              }),
        }),
      }),
    ],
  });
}
