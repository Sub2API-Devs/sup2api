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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  string,
  discriminatedUnion,
  u,
  literal,
  E,
  M,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { printableStatusText } from "../../utils/teleport/cloudErrorMessage.js";
import { oauthHeaders, refusalCodes } from "../../bridge/codeSessionApi.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
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
import { isSelfHostedPoolEnv, findFirst } from "../../utils/teleport/environmentSelection.js";
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
  clearHandoffInProgress,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { createSystemMessage } from "../../utils/messages.js";
import { withRelaunchHint } from "../../utils/processRelaunch.js";
import { clearBridgeSession } from "../../utils/sessionStorage.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { useSession } from "../../context/session.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import {
  remoteSessionIfTrusted,
  noDisplaySessionStatus,
} from "../../utils/background/remote/remoteSession.js";
import { TeleportResumeWrapper } from "../../components/TeleportResumeWrapper.js";
import { resetConversation } from "../../utils/conversationReset.js";
import { Spinner } from "../../components/Spinner.js";

//@ chunk-kczn6qx7.js:18184-18188 placement
init_react_production();
//@ chunk-kczn6qx7.js:18188-18212 placement
function emptyObjectResult(i) {
  return {};
}
//@ chunk-kczn6qx7.js:18212-18236 placement
function emptyArrayResult(i) {
  return [];
}
//@ chunk-kczn6qx7.js:18236-18701 placement
/**
 * teleport 预检常量：未推送内容的说明、进行中的 git 操作列表（rebase/merge/cherry-pick/revert/bisect）与响应 schema。
 */
var TELEPORT_GIT_SCHEMAS = "Anything you haven\u2019t pushed stays on this computer.";
var GIT_MID_OPERATION_KINDS = ["rebase", "merge", "cherry-pick", "revert", "bisect"];
var teleportPreflightSchema = DoctorLazy(() => {
  let i = string().catch("");
  let _ = discriminatedUnion("type", [
    u({
      type: literal("source_revision_not_on_remote_error"),
      result: i,
      revision: i,
      default_branch: i,
    }),
    u({
      type: literal("source_revision_stale_on_remote_error"),
      revision: i,
      unpushed_commit_count: E().int().nonnegative().catch(0),
      is_dirty: M().catch(false),
      mid_operation: i,
    }),
  ]);
  return union([
    u({
      error: _,
    }).transform((h) => h.error),
    _,
  ]);
});
//@ chunk-kczn6qx7.js:18701-19179 placement
/**
 * 解析服务端"源修订不在远端/远端过旧"的错误体，返回 not_on_remote / inconclusive / stale（未推送提交数、是否有改动、进行中操作）。
 */
function parseSourceRevisionError(body) {
  let _ = teleportPreflightSchema().safeParse(body);
  if (!_.success) return;
  let h = _.data;
  let revision = normalizeBranchName(h.revision);
  switch (h.type) {
    case "source_revision_not_on_remote_error":
      return normalizePreflightResult(h.result) === "not_on_remote"
        ? {
            kind: "not_on_remote",
            revision,
            defaultBranch: normalizeBranchName(h.default_branch),
          }
        : {
            kind: "inconclusive",
            revision,
          };
    case "source_revision_stale_on_remote_error":
      return {
        kind: "stale",
        revision,
        unpushedCount: h.unpushed_commit_count,
        isDirty: h.is_dirty,
        midOperation:
          GIT_MID_OPERATION_KINDS.find((k) => k === normalizePreflightResult(h.mid_operation)) ?? null,
      };
  }
}
//@ chunk-kczn6qx7.js:19179-19936 placement
function notOnRemoteNotice(revisionConflict) {
  switch (revisionConflict.kind) {
    case "not_on_remote":
      return {
        notice: [
          `${revisionConflict.revision || "This branch"} isn\u2019t on the remote yet. The cloud session starts from the default branch${revisionConflict.defaultBranch && `, ${revisionConflict.defaultBranch},`} instead.`,
          `Staying on this computer: your work on ${revisionConflict.revision || "this branch"}.`,
        ],
        fallback: "default_branch",
      };
    case "stale":
      return {
        notice: buildStayingBehindNotice(
          cloudStartsFromBranchText(revisionConflict.revision || "this branch"),
          listUnpushedWork(
            revisionConflict.unpushedCount || null,
            revisionConflict.isDirty,
            revisionConflict.midOperation,
          ),
        ),
        fallback: "proceed_as_is",
      };
    case "inconclusive":
      return {
        notice: [
          `Couldn\u2019t confirm ${revisionConflict.revision || "this branch"} is on the remote. If it isn\u2019t, the cloud session may not start.`,
          "The cloud session starts from what the remote has. Anything you haven\u2019t pushed stays on this computer.",
        ],
        fallback: "proceed_as_is",
      };
  }
}
//@ chunk-kczn6qx7.js:19936-20390 placement
/**
 * 根据本地工作树状态生成 teleport 前的提示（哪些改动不会带到云端）及可选项；无需提示返回 undefined。
 */
function describeLocalWorkNotice(worktreeState) {
  if (worktreeState === null || worktreeState.submodules_unverified)
    return {
      notice: [
        `Couldn\u2019t check your git state. ${startsFromPushedNotice("this branch")}`,
        TELEPORT_GIT_SCHEMAS,
      ],
      covers: ["proceed_as_is", "default_branch"],
    };
  let _ =
    worktreeState.branch === null
      ? "this commit"
      : normalizeBranchName(worktreeState.branch) || "this branch";
  let h = listUnpushedWork(worktreeState.unpushed_count, worktreeState.is_dirty, worktreeState.mid_operation);
  if (worktreeState.unpushed_count === null)
    return {
      notice: buildStayingBehindNotice(startsFromPushedNotice(_), h),
      covers: ["proceed_as_is", "default_branch"],
    };
  return h.length > 0
    ? {
        notice: buildStayingBehindNotice(cloudStartsFromBranchText(_), h),
        covers: ["proceed_as_is"],
      }
    : undefined;
}
//@ chunk-kczn6qx7.js:20390-20470 placement
function normalizePreflightResult(i) {
  return i.replace(/^REVISION_PREFLIGHT_RESULT_/, "").toLowerCase();
}
//@ chunk-kczn6qx7.js:20470-20555 placement
function normalizeBranchName(i) {
  let replaced = i.replace(/^refs\/heads\//, "");
  return /\s/u.test(replaced) ? "" : printableStatusText(replaced, "");
}
//@ chunk-kczn6qx7.js:20555-20636 placement
function cloudStartsFromBranchText(i) {
  return `The cloud session starts from ${i} as it was last pushed.`;
}
//@ chunk-kczn6qx7.js:20636-20776 placement
function startsFromPushedNotice(i) {
  return `The cloud session starts from ${i} as it was last pushed, or from the default branch if it isn\u2019t on the remote.`;
}
//@ chunk-kczn6qx7.js:20776-20997 placement
function listUnpushedWork(i, isDirty, midOperation) {
  let C = [
    ...(i ? [`${i} unpushed ${i === 1 ? "commit" : "commits"}`] : []),
    ...(isDirty ? ["uncommitted changes"] : []),
    ...(midOperation ? [`a ${midOperation} in progress`] : []),
  ];
  return i === null && C.length > 0 ? [...C, "anything else you haven\u2019t pushed"] : C;
}
//@ chunk-kczn6qx7.js:20997-21176 placement
function buildStayingBehindNotice(i, _) {
  return _.length > 0
    ? [
        `Some changes won\u2019t come with you. ${i}`,
        `Staying on this computer: ${new Intl.ListFormat("en", {
          type: "conjunction",
        }).format(_)}.`,
      ]
    : [i, TELEPORT_GIT_SCHEMAS];
}
//@ chunk-kczn6qx7.js:21176-21224 placement
var TENGU_TELEPORT_PERMISSION_MODE_REFUSED = "tengu_teleport_permission_mode_refused";
//@ chunk-kczn6qx7.js:21224-23933 placement
async function moveSessionToCloud(i) {
  let {
    sessionId,
    baseUrl,
    accessToken,
    environmentId,
    trustedDeviceToken,
    outcomeBranch,
    permissionMode,
    timeoutMs = 15000,
  } = i;
  let N = `${baseUrl}/v1/code/sessions/${sessionId}/move-to-cloud`;
  let D = oauthHeaders(accessToken);
  if (trustedDeviceToken) D["X-Trusted-Device-Token"] = trustedDeviceToken;
  let O;
  try {
    O = await axios_default.post(
      N,
      {
        environment_id: environmentId,
        ...(outcomeBranch && {
          outcome_branch: outcomeBranch,
        }),
        ...(permissionMode && {
          permission_mode: permissionMode,
        }),
        ...emptyObjectResult_2(i.sourceRevision),
        ...emptyObjectResult_3(i.memoryMode),
        ...(i.revisionFallback && {
          revision_fallback: i.revisionFallback,
        }),
      },
      {
        headers: D,
        timeout: timeoutMs,
        validateStatus: (F) => F < 600,
      },
    );
  } catch (error) {
    let I = error !== null && typeof error === "object" && "code" in error ? String(error.code) : "";
    let U = I === "ENOTFOUND" || I === "ECONNREFUSED";
    let Q = `Couldn't reach the server \u2014 ${errorMessage(error)}${U ? "" : ". The move may still have gone through \u2014 check the session in the web UI."}`;
    if (!U) i.onMayHaveMoved?.(Q);
    return {
      ok: false,
      message: Q,
      mayHaveCommitted: !U,
    };
  }
  if (O.status === 200 || O.status === 201) {
    i.onMoved?.();
    let sessionEnvironment = readSessionEnvironment(O.data);
    let environmentKind = sessionEnvironment?.environment_kind ?? "cloud";
    let environmentId_2 = sessionEnvironment?.environment_id ?? environmentId;
    logForDebugging(
      `[code-session] move-to-cloud ${sessionId} \u2192 ${environmentKind} (env ${environmentId_2})`,
    );
    return {
      ok: true,
      environmentKind,
      environmentId: environmentId_2,
      sessionId,
      ...emptyObjectResult_5(i.sourceRevision, O.data),
      ...emptyObjectResult_4(i.memoryMode, O.data),
      ...emptyObjectResult(O.data),
    };
  }
  if (O.status === 401 && i.onAuth401 !== undefined) {
    let onAuth401 = i.onAuth401;
    let I = lacksAuthorizationHeader(O.config);
    let U;
    try {
      U = await onAuth401(accessToken, I);
    } catch (error) {
      logForDebugging(
        `[code-session] move-to-cloud ${sessionId}: the 401 handler failed, not resending: ${errorMessage(error)}`,
      );
    }
    if (U !== undefined && (I || U !== accessToken))
      return moveSessionToCloud({
        ...i,
        accessToken: U,
        onAuth401: (Q, ne) => {
          onAuth401(Q, ne).catch(() => {});
          return Promise.resolve(undefined);
        },
      });
  }
  let z =
    O.status >= 500
      ? `The server responded with ${O.status}. The move may still have gone through \u2014 check the session in the web UI.`
      : undefined;
  if (z !== undefined) i.onMayHaveMoved?.(z);
  let X = extractErrorDetail(O.data) ?? "";
  let errorReason = getErrorReason(O.data);
  if (z === undefined && permissionMode && errorReason === "move_permission_mode_refused") {
    logForDebugging(
      `[code-session] move-to-cloud ${sessionId} refused for its permission mode (${O.status})${X ? `: ${X}` : ""}; moving without one`,
    );
    let F = await moveSessionToCloud({
      ...i,
      permissionMode: undefined,
    });
    try {
      logEvent(TENGU_TELEPORT_PERMISSION_MODE_REFUSED, {
        retry_without_mode: lit(F.ok ? "success" : F.mayHaveCommitted ? "maybe_committed" : "failed"),
      });
    } catch {}
    return F;
  }
  let Z =
    O.status === 400 && errorReason === "session_not_bridge"
      ? "This session is already on cloud \u2014 refresh the web UI to see it."
      : undefined;
  if (Z !== undefined) i.onMayHaveMoved?.(Z);
  logForDebugging(
    `[code-session] move-to-cloud ${sessionId} failed ${O.status}${errorReason ? ` [${errorReason}]` : ""}${X ? `: ${X}` : ""}`,
  );
  if (z !== undefined)
    return {
      ok: false,
      message: z,
      mayHaveCommitted: true,
    };
  if (Z !== undefined)
    return {
      ok: false,
      message: Z,
      mayHaveCommitted: true,
    };
  let plainErrorDetail = extractPlainErrorDetail(O.data);
  let oe = /^the request was invalid\.?$/i.test(plainErrorDetail ?? "") ? undefined : plainErrorDetail;
  i.onRefusal?.({
    status: O.status,
    codes: refusalCodes(O.data),
    message: oe,
  });
  return {
    ok: false,
    message:
      oe ??
      `The server couldn\u2019t move this session (HTTP ${O.status}). Run with --debug to see the raw response.`,
    mayHaveCommitted: false,
    reason: errorReason,
    revisionConflict: O.status === 409 ? parseSourceRevisionError(O.data) : undefined,
  };
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
    environment_kind: typeof session.environment_kind === "string" ? session.environment_kind : undefined,
    environment_id: typeof session.environment_id === "string" ? session.environment_id : undefined,
  };
}
//@ chunk-kczn6qx7.js:24231-24255 placement
function emptyObjectResult_2(sourceRevision) {
  return {};
}
//@ chunk-kczn6qx7.js:24255-24279 placement
function emptyObjectResult_3(memoryMode) {
  return {};
}
//@ chunk-kczn6qx7.js:24279-24305 placement
function emptyObjectResult_4(memoryMode, _) {
  return {};
}
//@ chunk-kczn6qx7.js:24305-24331 placement
function emptyObjectResult_5(sourceRevision, _) {
  return {};
}
//@ chunk-kczn6qx7.js:24331-24353 placement
function emptyResult(memoryModeAtNotice) {
  return;
}
//@ chunk-kczn6qx7.js:24353-25168 placement
function teleportPermissionMode() {
  let lastKnownBridgePermissionMode = getLastKnownBridgePermissionMode();
  if (lastKnownBridgePermissionMode !== "auto") {
    logForDebugging(
      `[code-session] move-to-cloud names no permission mode: ${lastKnownBridgePermissionMode === undefined ? "the terminal has reported no mode yet" : `the terminal's last reported mode is ${lastKnownBridgePermissionMode}`}`,
    );
    return;
  }
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_happy_ocean", false)) {
    logForDebugging(
      "[code-session] move-to-cloud names no permission mode: the kill switch tengu_happy_ocean is served on",
    );
    logAutoModeAsked({
      kill_switch: true,
    });
    return;
  }
  let _ = !canSeedAutoMode(getInitialSettings_2()) || isScrubEnabled();
  let h =
    getStoredDefaultModeBar() === "settings_unreadable" ||
    SETTING_SOURCES.filter(isSettingSourceEnabled).some(
      (C) =>
        C !== "policySettings" && getSettingsParseErrorsForSource(C).some((k) => k.severity !== "warning"),
    );
  if (_ || h) {
    let filtered = [_ && "auto_mode_off", h && "settings_unreadable"].filter(Boolean);
    logForDebugging(
      `[code-session] move-to-cloud names no permission mode: withheld for ${filtered.join("; ")}`,
    );
    logAutoModeAsked({
      kill_switch: false,
      auto_mode_off: _,
      settings_unreadable: h,
    });
    return;
  }
  logForDebugging("[code-session] move-to-cloud names auto mode");
  logAutoModeAsked();
  return "auto";
}
//@ chunk-kczn6qx7.js:25168-25304 placement
function logAutoModeAsked(i) {
  try {
    logEvent(
      "tengu_teleport_to_cloud",
      i === undefined
        ? {
            action: lit("auto_mode_asked"),
          }
        : {
            action: lit("auto_mode_not_asked"),
            ...i,
          },
    );
  } catch {}
}
//@ chunk-kczn6qx7.js:25304-25534 placement
async function collectTeleportCheckout(sessionId) {
  if (!findGitRoot(getCwd()))
    return {
      kind: "no-git",
    };
  let originalCwd = getOriginalCwd();
  let branch = await getBranch(originalCwd);
  let [C, worktreeState] = await Promise.all([
    branchOrHead(branch),
    collectWorktreeState(originalCwd, branch === "HEAD" ? null : branch),
  ]);
  return {
    kind: "ready",
    outcomeBranch: `claude/teleport-${sessionId.slice(-8)}`,
    checkout: C,
    localWork: worktreeState,
  };
}
//@ chunk-kczn6qx7.js:25534-25680 placement
var UNCONFIRMED_BEFORE_MOVE_MESSAGE =
  "Couldn\u2019t confirm this session\u2019s Remote Control connection and git branch are unchanged, so nothing moved. Run /teleport again.";
//@ chunk-kczn6qx7.js:25680-29997 placement
/**
 * /teleport 移到云端：检查 Remote Control 连接、claude.ai 登录、git 仓库与未推送提交，确认后调用 move-to-cloud 接口，切换 Remote Control 会话并在本地记录 cloud_handoff。
 */
async function teleportToCloud(i) {
  if (isRestrictedSession()) {
    logFeatureBad("teleport_to_cloud", "restricted_session");
    return {
      kind: "precondition",
      message: RESTRICTED_SESSION_CLOUD_REFUSAL,
    };
  }
  let _ = inboundBridgeHandle(getReplBridgeHandle());
  let bridgeSessionId = _?.bridgeSessionId;
  if (!_ || !bridgeSessionId) {
    logFeatureBad("teleport_to_cloud", "no_bridge");
    return {
      kind: "precondition",
      message:
        "This session isn\u2019t connected to Remote Control. Run /remote-control first, then try again.",
    };
  }
  let C =
    isStorageV5Enabled() && i.credentials !== undefined
      ? await getBridgeSessionsAccessTokenAsync(i.credentials)
      : getBridgeSessionsAccessToken();
  if (!C) {
    logFeatureBad("teleport_to_cloud", "no_auth");
    return {
      kind: "precondition",
      message: "Not signed in to claude.ai. Run /login with your claude.ai account and try again.",
    };
  }
  let teleportCheckout = await collectTeleportCheckout(bridgeSessionId);
  switch (teleportCheckout.kind) {
    case "no-git":
      logFeatureBad("teleport_to_cloud", "no_git");
      return {
        kind: "precondition",
        message: `${getCwd()} isn\u2019t a git repository. The cloud session clones your repo from its remote, so there\u2019s nothing for it to check out here \u2014 try again from inside a git repo that has a remote.`,
      };
    case "ready":
      break;
    default:
      return teleportCheckout;
  }
  if (_.gitRepoUrl === null) {
    logFeatureBad("teleport_to_cloud", "no_git_remote");
    return {
      kind: "precondition",
      message:
        "This session has nothing for the cloud to clone, because moving needs a remote named origin in a repository not rooted at your home folder. A new session started from such a repository can move.",
    };
  }
  let { checkout, outcomeBranch } = teleportCheckout;
  let H = describeLocalWorkNotice(teleportCheckout.localWork);
  let V = H === undefined ? _.publishGitStateBeforeHandoff?.() : undefined;
  let N = isEssentialTrafficOnly() ? null : await resolveSourceRepository(_);
  let D =
    N &&
    isGithubDotCom(N.host) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_github_access_precheck", true)
      ? probeGithubRepoAccess(N.owner, N.name).catch(() => null)
      : null;
  let O;
  try {
    O = await fetchEnvironmentsAndPools(i.storageV5, i.credentials);
  } catch (error) {
    logFeatureBad("teleport_to_cloud", "env_lookup_failed");
    return {
      kind: "precondition",
      message: `Couldn\u2019t look up cloud environments \u2014 ${errorMessage(error)}`,
    };
  }
  let z = (selectedTarget) => selectedTarget.kind !== "bridge" && !isSelfHostedPoolEnv(selectedTarget);
  let X = O.selectedTarget && z(O.selectedTarget) ? O.selectedTarget : findFirst(O.availableTargets, z);
  if (!X || isSelfHostedPoolEnv(X)) {
    if (O.environmentsError) {
      logFeatureBad("teleport_to_cloud", "env_lookup_failed");
      return {
        kind: "precondition",
        message: `Couldn\u2019t look up cloud environments \u2014 ${O.environmentsError}`,
      };
    }
    logFeatureBad("teleport_to_cloud", "no_environment");
    return {
      kind: "precondition",
      message:
        "No cloud environment available. Create one from the web UI (or run /web-setup), then try again." +
        (isSelfHostedPoolEnv(O.selectedTarget)
          ? " Your default target is a self-hosted environment \u2014 continuing in the cloud needs a managed environment."
          : ""),
    };
  }
  let G = await D;
  if (N && (G?.verdict === "github_not_connected" || G?.verdict === "github_repo_not_found")) {
    logFeatureBad("teleport_to_cloud", G.verdict);
    return {
      kind: "precondition",
      message:
        G.verdict === "github_not_connected"
          ? noAccessText({
              subject: `Cloud sessions clone ${N.owner}/${N.name}`,
              ...teleportSetupHints(),
            })
          : installAppHint({
              owner: N.owner,
              name: N.name,
              ...teleportSetupHints(),
              apostrophe: "\u2019",
            }),
    };
  }
  await V;
  let memoryModeAtNotice;
  let ee = _;
  if (H !== undefined) {
    memoryModeAtNotice = emptyResult();
    let x = await confirmBeforeMove(i, H.notice, bridgeSessionId, checkout);
    if (x.kind !== "confirmed") return x;
    ee = x.handle;
    await ee.publishGitStateBeforeHandoff?.();
  }
  logEvent("tengu_teleport_to_cloud", {
    action: lit("start"),
  });
  let sessionUrl = getRemoteSessionUrl(bridgeSessionId, ee.sessionIngressUrl, {
    from: "cli",
  });
  let F = {
    sessionUrl,
    accessToken: C,
    environmentId: X.environment_id,
    outcomeBranch,
    checkout,
  };
  let { result: I, memoryMode } = await commitCloudMove(i, ee, {
    ...F,
    memoryModeAtNotice,
    isAfterYes: H !== undefined,
  });
  let Q = new Set(H?.covers);
  let ne;
  while (!I.ok && I.revisionConflict !== undefined && ne === undefined) {
    unmarkTeleportedSession(bridgeSessionId);
    let { notice, fallback } = notOnRemoteNotice(I.revisionConflict);
    let ae = !Q.has(fallback);
    let de = await confirmBeforeMove(i, ae ? notice : undefined, bridgeSessionId, checkout);
    if (de.kind !== "confirmed") return de;
    Q.add(fallback);
    if (ae && fallback === "default_branch") await de.handle.publishGitStateBeforeHandoff?.();
    else ne = fallback;
    ({ result: I, memoryMode } = await commitCloudMove(i, de.handle, {
      ...F,
      memoryModeAtNotice: memoryMode,
      isAfterYes: true,
      revisionFallback: ne,
    }));
  }
  let ce = false;
  if (!I.ok) {
    let x = !I.mayHaveCommitted && I.reason === "github_token_missing";
    if (I.mayHaveCommitted) logFeatureSad("teleport_to_cloud", "maybe_committed");
    else {
      logFeatureBad(
        "teleport_to_cloud",
        x
          ? "github_not_connected"
          : I.reason === "unconfirmed_before_move"
            ? "unconfirmed_before_move"
            : "request_failed",
      );
      unmarkTeleportedSession(bridgeSessionId);
    }
    logEvent("tengu_teleport_to_cloud", {
      action: lit(I.mayHaveCommitted ? "maybe_committed" : "failed"),
    });
    return {
      kind: "server-error",
      failure: x
        ? {
            ...I,
            message: `No GitHub account is connected to your Claude account (or the connection expired). ${connectAccountHint(teleportSetupHints())}`,
          }
        : I,
      sessionId: bridgeSessionId,
    };
  }
  let Se = false;
  if (ne !== undefined) logFeatureSad("teleport_to_cloud", `revision_${ne}`);
  else logFeatureOk("teleport_to_cloud");
  let { environmentKind } = I;
  logEvent("tengu_teleport_to_cloud", {
    action: lit("success"),
    environment_kind: isKnownWorkerState(environmentKind)
      ? fromEnum(environmentKind)
      : lit(environmentKind === "cloud" ? "cloud" : "other"),
  });
  let se = [...[], ...emptyArrayResult(I)];
  return {
    kind: "ok",
    success: I,
    sessionUrl,
    ...(se.length > 0 && {
      afterMove: se.join(`
`),
    }),
  };
}
//@ chunk-kczn6qx7.js:29997-30406 placement
/**
 * 移动到云端前：若有提示先让用户确认（拒绝记事件）；再确认 Remote Control 连接与分支未变，返回 confirmed 句柄或 precondition 失败。
 */
async function confirmBeforeMove(ui, prompt, bridgeSessionId, checkout) {
  if (prompt !== undefined) {
    let A = await ui.confirmMove?.(prompt);
    if (A !== true) {
      if (A === false)
        logEvent("tengu_teleport_to_cloud", {
          action: lit("declined"),
        });
      return {
        kind: "precondition",
        message: "Teleport cancelled",
      };
    }
  }
  let k = await recheckBridgeAndCheckout(bridgeSessionId, checkout);
  if (k === null) {
    logFeatureBad("teleport_to_cloud", "unconfirmed_before_move");
    logEvent("tengu_teleport_to_cloud", {
      action: lit("failed"),
    });
    return {
      kind: "precondition",
      message: UNCONFIRMED_BEFORE_MOVE_MESSAGE,
    };
  }
  return {
    kind: "confirmed",
    handle: k,
  };
}
//@ chunk-kczn6qx7.js:30406-30602 placement
async function recheckBridgeAndCheckout(bridgeSessionId, checkout) {
  let h = await withCollectTimeout(getBranch(getOriginalCwd()).then(branchOrHead)).catch((error) => {
    logForDebugging(`[teleport] the checkout could not be read again: ${errorMessage(error)}`);
    return;
  });
  let C = inboundBridgeHandle(getReplBridgeHandle());
  return C?.bridgeSessionId === bridgeSessionId && h === checkout ? C : null;
}
//@ chunk-kczn6qx7.js:30602-30653 placement
async function branchOrHead(branch) {
  return branch === "HEAD" ? getHeadForDir(getOriginalCwd()) : branch;
}
//@ chunk-kczn6qx7.js:30653-31486 placement
async function commitCloudMove(i, _, h) {
  markTeleportedSession(_.bridgeSessionId);
  let C = false;
  try {
    _.stopLocalPreview?.();
    await _.settleUploadsBeforeHandoff?.();
    let accessToken = (await getBridgeSessionsAccessTokenAsync(i.credentials)) ?? h.accessToken;
    let trustedDeviceToken = await getTrustedDeviceToken();
    if (h.isAfterYes && (await recheckBridgeAndCheckout(_.bridgeSessionId, h.checkout)) === null)
      return {
        result: {
          ok: false,
          message: UNCONFIRMED_BEFORE_MOVE_MESSAGE,
          mayHaveCommitted: false,
          reason: "unconfirmed_before_move",
        },
        memoryMode: h.memoryModeAtNotice,
      };
    let permissionMode = teleportPermissionMode();
    let memoryMode = emptyResult(h.memoryModeAtNotice);
    C = true;
    return {
      result: await moveSessionToCloud({
        onMoved: () => {
          i.onMoved?.(h.sessionUrl);
          runBeforeMoveStep(i);
        },
        onMayHaveMoved: (N) => {
          i.onMayHaveMoved?.(N);
          runBeforeMoveStep(i);
        },
        sessionId: _.bridgeSessionId,
        baseUrl: getBridgeBaseUrl(),
        accessToken,
        onAuth401: (N, D) => bridgeSessionsAccessTokenAfter401(N, i.credentials, D),
        environmentId: h.environmentId,
        trustedDeviceToken,
        outcomeBranch: h.outcomeBranch,
        permissionMode,
        memoryMode,
        revisionFallback: h.revisionFallback,
      }),
      memoryMode,
    };
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
function bridgeMoveAction(oldSessionId) {
  return getRemoteControlAtStartup()
    ? {
        kind: "reconnect",
        oldSessionId,
      }
    : {
        kind: "disconnect",
      };
}
//@ chunk-kczn6qx7.js:31698-31788 placement
var REMOTE_CONTROL_INACTIVE_TEXT =
  "/remote-control is no longer active. Run /remote-control to start a new session.";
//@ chunk-kczn6qx7.js:31788-32135 placement
/**
 * 生成会话已移到云端的提示（远程控制断开、已重连或正在重连）。
 */
function movedToCloudMessage(sessionUrl, _) {
  let h = `Session now in the cloud: ${sessionUrl}`;
  switch (_.kind) {
    case "disconnected":
      return `${h}
${REMOTE_CONTROL_INACTIVE_TEXT}`;
    case "reconnected":
      return `${h}
New /remote-control session is active \xB7 Continue here, on your phone, or at ${_.newUrl}`;
    case "reconnect-pending":
      return `${h}
Starting a new /remote-control session \u2014 it\u2019ll show as /rc shortly.`;
  }
}
//@ chunk-kczn6qx7.js:32135-32183 placement
function inboundBridgeHandle(replBridgeHandle) {
  return replBridgeHandle && !replBridgeHandle.outboundOnly ? replBridgeHandle : null;
}
//@ chunk-kczn6qx7.js:32183-32295 placement
function resolveSourceRepository(i) {
  if (i.gitRepoUrl === undefined) return detectCurrentRepositoryWithHost();
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
var NEW_BRIDGE_WAIT_TIMEOUT_MS = 1e4;
var NEW_BRIDGE_POLL_MS = 100;
var DISABLE_BRIDGE_DELAY_MS = 250;
//@ chunk-kczn6qx7.js:32445-32674 placement
function disableReplBridgeForMove(i, _ = false) {
  i.setAppState((h) => {
    if (!h.replBridgeEnabled) return h;
    return {
      ...h,
      replBridgeSkipNextArchive: true,
      replBridgeEnabled: false,
      replBridgeExplicit: false,
      replBridgeOutboundOnly: false,
      ...(_ && {
        replBridgeSessionGroupingId: undefined,
      }),
    };
  });
}
//@ chunk-kczn6qx7.js:32674-32777 placement
function enableReplBridge(i) {
  i.setAppState((_) => {
    if (_.replBridgeEnabled) return _;
    return {
      ..._,
      replBridgeEnabled: true,
    };
  });
}
//@ chunk-kczn6qx7.js:32777-32944 placement
async function waitForNewBridgeSession(oldSessionId, signal, timeoutMs = NEW_BRIDGE_WAIT_TIMEOUT_MS) {
  let C = Date.now() + timeoutMs;
  while (Date.now() < C) {
    if (signal.aborted) return null;
    let bridgeSessionId = getReplBridgeHandle()?.bridgeSessionId;
    if (bridgeSessionId && bridgeSessionId !== oldSessionId) return bridgeSessionId;
    await sleep(NEW_BRIDGE_POLL_MS, signal);
  }
  return null;
}
//@ chunk-kczn6qx7.js:32944-33387 placement
/**
 * 执行 /teleport 移动；出错时若已移动或可能已移动，返回包含云端会话与错误说明的文本，否则继续抛出。
 */
async function runTeleportWithRecovery(context, options) {
  let h;
  let C;
  let k;
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
    if (h !== undefined) {
      logError(error);
      return `Session now in the cloud: ${h}
Claude Code didn\u2019t finish updating Remote Control in this terminal after the move (${errorMessage(error)}).${
        C === undefined
          ? ""
          : `
${C}`
      }`;
    }
    if (k !== undefined) {
      logError(error);
      return `${k}
Claude Code didn\u2019t finish updating Remote Control in this terminal (${errorMessage(error)}).`;
    }
    throw error;
  }
}
//@ chunk-kczn6qx7.js:33387-34564 placement
async function runTeleportFromRepl(context, confirmMove, h) {
  let C = false;
  let k;
  try {
    k = await teleportToCloud({
      beforeMove: () => {
        C = cancelForHandoff("cloud_handoff");
        if (C)
          context.applyMessageOp({
            type: "append",
            messages: [createSystemMessage(AUTO_CONTINUE_CANCEL_MESSAGES.cloud_handoff, "warning")],
          });
      },
      onMoved: h.onMoved,
      onMayHaveMoved: (A) => h.onMayHaveMoved(`Couldn\u2019t teleport: ${A}`),
      credentials: context.credentials,
      storageV5: context.storageV5,
      confirmMove,
    });
  } finally {
    clearHandoffInProgress();
  }
  switch (k.kind) {
    case "precondition":
      return k.message;
    case "server-error": {
      if (k.failure.mayHaveCommitted) {
        h.onMayHaveMoved(withRelaunchHint(`Couldn\u2019t teleport: ${k.failure.message}`, C));
        markTeleportedSession(k.sessionId);
        clearBridgeSession(undefined, undefined, undefined, context.storageV5);
        setTimeout(disableReplBridgeForMove, DISABLE_BRIDGE_DELAY_MS, context, true);
        return withRelaunchHint(
          `Couldn\u2019t teleport: ${k.failure.message}
${REMOTE_CONTROL_INACTIVE_TEXT}`,
          C,
        );
      }
      return withRelaunchHint(`Couldn\u2019t teleport: ${k.failure.message}`, C);
    }
    case "ok": {
      h.onAfterMove(k.afterMove);
      markTeleportedSession(k.success.sessionId);
      clearBridgeSession(undefined, undefined, undefined, context.storageV5);
      let sessionUrl = k.sessionUrl;
      let { afterMove } = k;
      let H = (D) =>
        afterMove === undefined
          ? D
          : `${D}
${afterMove}`;
      let V = bridgeMoveAction(k.success.sessionId);
      if (V.kind === "disconnect") {
        setTimeout(disableReplBridgeForMove, DISABLE_BRIDGE_DELAY_MS, context, true);
        return H(
          movedToCloudMessage(sessionUrl, {
            kind: "disconnected",
          }),
        );
      }
      disableReplBridgeForMove(context);
      await sleep(0);
      enableReplBridge(context);
      let N = await waitForNewBridgeSession(V.oldSessionId, context.abortController.signal);
      return H(
        movedToCloudMessage(
          sessionUrl,
          N
            ? {
                kind: "reconnected",
                newUrl: getRemoteSessionUrl(N, undefined, {
                  from: "cli",
                }),
              }
            : {
                kind: "reconnect-pending",
              },
        ),
      );
    }
  }
}
//@ chunk-kczn6qx7.js:34564-34609 placement
function renderTextLine_3(oe) {
  return jsxProd_default(
    Text,
    {
      children: oe,
    },
    oe,
  );
}
//@ chunk-kczn6qx7.js:34609-35726 placement
function TeleportConfirm(props) {
  let $ = w(21);
  let { title, moveLabel, lines, onAnswer } = props;
  let K;
  if ($[0] !== title) {
    K = jsxProd_default(Text, {
      bold: true,
      children: title,
    });
    $[0] = title;
    $[1] = K;
  } else K = $[1];
  let children;
  if ($[2] !== lines) {
    children = lines.map(renderTextLine_3);
    $[2] = lines;
    $[3] = children;
  } else children = $[3];
  let V;
  if ($[4] !== children) {
    V = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      gap: 1,
      children,
    });
    $[4] = children;
    $[5] = V;
  } else V = $[5];
  let N;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    N = {
      label: "Cancel",
      value: "cancel",
    };
    $[6] = N;
  } else N = $[6];
  let options;
  if ($[7] !== moveLabel) {
    options = [
      N,
      {
        label: moveLabel,
        value: "move",
      },
    ];
    $[7] = moveLabel;
    $[8] = options;
  } else options = $[8];
  let onCancel;
  let onChange;
  if ($[9] !== onAnswer) {
    onCancel = () => onAnswer(false);
    onChange = (X) => onAnswer(X === "move");
    $[9] = onAnswer;
    $[10] = onCancel;
    $[11] = onChange;
  } else {
    onCancel = $[10];
    onChange = $[11];
  }
  let G;
  if ($[12] !== options || $[13] !== onCancel || $[14] !== onChange) {
    G = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: jsxProd_default(ModelSelector, {
        options,
        onCancel,
        onChange,
      }),
    });
    $[12] = options;
    $[13] = onCancel;
    $[14] = onChange;
    $[15] = G;
  } else G = $[15];
  let Z;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    Z = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: ["up", "down"],
              action: "navigate",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "select",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
            }),
          ],
        }),
      }),
    });
    $[16] = Z;
  } else Z = $[16];
  let ee;
  if ($[17] !== K || $[18] !== V || $[19] !== G) {
    ee = jsxProd_default_2(Box, {
      flexDirection: "column",
      padding: 1,
      children: [K, V, G, Z],
    });
    $[17] = K;
    $[18] = V;
    $[19] = G;
    $[20] = ee;
  } else ee = $[20];
  return ee;
}
//@ chunk-kczn6qx7.js:35726-35772 placement
function nullLinesView({ lines, onAnswer }) {
  return null;
}
//@ chunk-kczn6qx7.js:35772-35798 placement
function nullSendingView() {
  return null;
}
//@ chunk-kczn6qx7.js:35798-35852 placement
function logTeleportMenu(i) {
  logEvent("tengu_teleport_menu", {
    action: fromEnum(i),
  });
}
//@ chunk-kczn6qx7.js:35852-39156 placement
/**
 * /teleport 菜单：选择移到云端或其他 teleport 操作。
 */
function TeleportMenu({ onExit, context, exposure, retireOnSurface, canSend }) {
  let [A, K] = y("menu");
  let [H, V] = y();
  let resolveRef = R(null);
  let D = R(false);
  let O = R(false);
  let [z, X] = y();
  let [G, Z] = y(false);
  let [ee, oe] = y();
  let [F, I] = y();
  let U = R(undefined);
  function Q(B) {}
  function ne() {
    let B = U.current;
    U.current = undefined;
    if (B !== undefined) Q(B);
  }
  let pendingOfferRef = R(exposure.pendingOffer ?? null);
  P(() => {}, [canSend, context.session, context.credentials, context.storageV5]);
  let session = useSession();
  P(() => {
    D.current = false;
    return () => {
      D.current = true;
      if (resolveRef.current) {
        O.current = true;
        resolveRef.current(undefined);
        resolveRef.current = null;
      }
    };
  }, []);
  P(() => {
    if (!exposure.logged) {
      exposure.logged = true;
      logTeleportMenu(canSend ? "shown" : "shown_no_bridge");
    }
  }, [exposure, canSend]);
  let ie = R(false);
  let se = (B) => {
    if (ie.current) return false;
    ie.current = true;
    logTeleportMenu(B);
    return true;
  };
  let x = () => {
    pendingOfferRef.current?.abandon();
    exposure.importHold?.close("unused");
    me("not_moved");
    exposure.isOfferAnswered = true;
    exposure.pendingOffer = null;
    pendingOfferRef.current = null;
  };
  let te = () => {
    if (se("cancel")) {
      x();
      onExit("Teleport cancelled", {
        display: "system",
      });
    }
  };
  let globalExitKeybindings = useGlobalExitKeybindings(te, undefined, A === "menu");
  function de(B, W) {}
  function me(B) {
    exposure.moveEnded ??= B;
    let heldCopy = exposure.heldCopy;
    exposure.heldCopy = undefined;
    if (heldCopy === undefined) return;
    if (exposure.moveEnded === "moved") {
      let L = heldCopy.held.take();
      if (L !== undefined)
        try {
          de(L, false);
          if (heldCopy.line !== undefined) Q(heldCopy.line);
        } catch (error) {
          logError(error);
        }
      return;
    }
    heldCopy.held.letGo();
  }
  function Eo(B, W = false) {}
  function ro(B = false) {
    X(remoteSessionIfTrusted() ? noDisplaySessionStatus() : undefined);
    K("sending");
    let W = false;
    runTeleportWithRecovery(
      context,
      (L) =>
        new Promise((resolve) => {
          if (D.current) {
            O.current = true;
            resolve(undefined);
            return;
          }
          resolveRef.current = resolve;
          let le = U.current;
          V(le === undefined ? L : [le, ...L]);
        }),
    )
      .then((L) => {
        if (!O.current) {
          me(L.startsWith("Session now in the cloud") ? "moved" : "not_moved");
          exposure.importHold?.close("unused");
          W = true;
          ne();
          onExit(L, {
            display: "system",
          });
        }
      })
      .catch((error) => {
        logError(error);
        if (!O.current && !W) {
          me("not_moved");
          exposure.importHold?.close("unused");
          ne();
          onExit(`Couldn\u2019t teleport: ${errorMessage(error)}`, {
            display: "system",
          });
        }
      });
  }
  if (A === "resume")
    return jsxProd_default(TeleportResumeWrapper, {
      onComplete: (B) => {
        resetConversation(context, B.log, retireOnSurface, session);
        onExit("Session resumed successfully", {
          display: "system",
        });
      },
      onCancel: () =>
        onExit("Teleport cancelled", {
          display: "system",
        }),
      onError: (B) =>
        onExit(B, {
          display: "system",
        }),
      isEmbedded: true,
      source: "localCommand",
    });
  if (A === "sending" && H !== undefined) {
    let onAnswer = (W) => {
      let L = resolveRef.current;
      if (!L) return;
      if (W && exposure.importHold?.isEndTold === false) {
        oe(H);
        V(undefined);
        return;
      }
      resolveRef.current = null;
      V(undefined);
      oe(undefined);
      Z(W);
      if (W) U.current = undefined;
      L(W);
    };
    return z === undefined
      ? jsxProd_default(TeleportConfirm, {
          title: "Continue this session in the cloud?",
          moveLabel: "Continue in the cloud",
          lines: H,
          onAnswer,
        })
      : jsxProd_default(nullLinesView, {
          lines: H,
          onAnswer,
        });
  }
  if (A === "sending" && z !== undefined && !G) return jsxProd_default(nullSendingView, {});
  if (A === "sending")
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      padding: 1,
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              bold: true,
              children: "Moving this session to the cloud\u2026",
            }),
          ],
        }),
        (z !== undefined || !G) &&
          jsxProd_default(Box, {
            marginLeft: 2,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: z ?? "It continues from your branch\u2019s last push.",
            }),
          }),
      ],
    });
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    padding: 1,
    children: [
      jsxProd_default(Text, {
        bold: true,
        children: "Teleport",
      }),
      false,
      jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(ModelSelector, {
          options: [
            {
              label: "Continue this session in the cloud",
              value: "send",
              disabled: !canSend,
              description: canSend ? undefined : "Not connected \xB7 /remote-control",
            },
            {
              label: "Resume a session from cloud",
              value: "resume",
            },
          ],
          defaultFocusValue: canSend ? undefined : "resume",
          onCancel: te,
          onChange: (B) => {
            if (B === "resume") {
              if (se("resume")) {
                x();
                K("resume");
              }
              return;
            }
            if (!se("send")) return;
            ro();
          },
        }),
      }),
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: globalExitKeybindings.pending
            ? `Press ${globalExitKeybindings.keyName} again to cancel`
            : jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: ["up", "down"],
                    action: "navigate",
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "select",
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                  }),
                ],
              }),
        }),
      }),
    ],
  });
}
