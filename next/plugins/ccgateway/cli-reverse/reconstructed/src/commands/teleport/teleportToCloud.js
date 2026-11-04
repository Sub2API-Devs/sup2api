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
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  discriminatedUnion,
  objectSchema,
  literal,
  numberSchema,
  booleanSchema,
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
function emptyObjectResult(props) {
  return {};
}
//@ chunk-kczn6qx7.js:18212-18236 placement
function emptyArrayResult(props) {
  return [];
}
//@ chunk-kczn6qx7.js:18236-18701 placement
/**
 * teleport 预检常量：未推送内容的说明、进行中的 git 操作列表（rebase/merge/cherry-pick/revert/bisect）与响应 schema。
 */
var TELEPORT_GIT_SCHEMAS = "Anything you haven\u2019t pushed stays on this computer.";
var GIT_MID_OPERATION_KINDS = ["rebase", "merge", "cherry-pick", "revert", "bisect"];
var teleportPreflightSchema = DoctorLazy(() => {
  let teleportReadme = stringSchema().catch("");
  let sourceRevisionSchema = discriminatedUnion("type", [
    objectSchema({
      type: literal("source_revision_not_on_remote_error"),
      result: teleportReadme,
      revision: teleportReadme,
      default_branch: teleportReadme,
    }),
    objectSchema({
      type: literal("source_revision_stale_on_remote_error"),
      revision: teleportReadme,
      unpushed_commit_count: numberSchema().int().nonnegative().catch(0),
      is_dirty: booleanSchema().catch(false),
      mid_operation: teleportReadme,
    }),
  ]);
  return union([
    objectSchema({
      error: sourceRevisionSchema,
    }).transform((gitOperationKinds) => gitOperationKinds.error),
    sourceRevisionSchema,
  ]);
});
//@ chunk-kczn6qx7.js:18701-19179 placement
/**
 * 解析服务端"源修订不在远端/远端过旧"的错误体，返回 not_on_remote / inconclusive / stale（未推送提交数、是否有改动、进行中操作）。
 */
function parseSourceRevisionError(body) {
  let parsed = teleportPreflightSchema().safeParse(body);
  if (!parsed.success) return;
  let data = parsed.data;
  let revision = normalizeBranchName(data.revision);
  switch (data.type) {
    case "source_revision_not_on_remote_error":
      return normalizePreflightResult(data.result) === "not_on_remote"
        ? {
            kind: "not_on_remote",
            revision,
            defaultBranch: normalizeBranchName(data.default_branch),
          }
        : {
            kind: "inconclusive",
            revision,
          };
    case "source_revision_stale_on_remote_error":
      return {
        kind: "stale",
        revision,
        unpushedCount: data.unpushed_commit_count,
        isDirty: data.is_dirty,
        midOperation:
          GIT_MID_OPERATION_KINDS.find((kind) => kind === normalizePreflightResult(data.mid_operation)) ??
          null,
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
  let refName =
    worktreeState.branch === null
      ? "this commit"
      : normalizeBranchName(worktreeState.branch) || "this branch";
  let unpushed = listUnpushedWork(
    worktreeState.unpushed_count,
    worktreeState.is_dirty,
    worktreeState.mid_operation,
  );
  if (worktreeState.unpushed_count === null)
    return {
      notice: buildStayingBehindNotice(startsFromPushedNotice(refName), unpushed),
      covers: ["proceed_as_is", "default_branch"],
    };
  return unpushed.length > 0
    ? {
        notice: buildStayingBehindNotice(cloudStartsFromBranchText(refName), unpushed),
        covers: ["proceed_as_is"],
      }
    : undefined;
}
//@ chunk-kczn6qx7.js:20390-20470 placement
function normalizePreflightResult(rawResult) {
  return rawResult.replace(/^REVISION_PREFLIGHT_RESULT_/, "").toLowerCase();
}
//@ chunk-kczn6qx7.js:20470-20555 placement
function normalizeBranchName(rawName) {
  let replaced = rawName.replace(/^refs\/heads\//, "");
  return /\s/u.test(replaced) ? "" : printableStatusText(replaced, "");
}
//@ chunk-kczn6qx7.js:20555-20636 placement
function cloudStartsFromBranchText(refName) {
  return `The cloud session starts from ${refName} as it was last pushed.`;
}
//@ chunk-kczn6qx7.js:20636-20776 placement
function startsFromPushedNotice(refName) {
  return `The cloud session starts from ${refName} as it was last pushed, or from the default branch if it isn\u2019t on the remote.`;
}
//@ chunk-kczn6qx7.js:20776-20997 placement
function listUnpushedWork(unpushedCount, isDirty, midOperation) {
  let items = [
    ...(unpushedCount ? [`${unpushedCount} unpushed ${unpushedCount === 1 ? "commit" : "commits"}`] : []),
    ...(isDirty ? ["uncommitted changes"] : []),
    ...(midOperation ? [`a ${midOperation} in progress`] : []),
  ];
  return unpushedCount === null && items.length > 0
    ? [...items, "anything else you haven\u2019t pushed"]
    : items;
}
//@ chunk-kczn6qx7.js:20997-21176 placement
function buildStayingBehindNotice(leadLine, unpushed) {
  return unpushed.length > 0
    ? [
        `Some changes won\u2019t come with you. ${leadLine}`,
        `Staying on this computer: ${new Intl.ListFormat("en", {
          type: "conjunction",
        }).format(unpushed)}.`,
      ]
    : [leadLine, TELEPORT_GIT_SCHEMAS];
}
//@ chunk-kczn6qx7.js:21176-21224 placement
var TENGU_TELEPORT_PERMISSION_MODE_REFUSED = "tengu_teleport_permission_mode_refused";
//@ chunk-kczn6qx7.js:21224-23933 placement
async function moveSessionToCloud(options) {
  let {
    sessionId,
    baseUrl,
    accessToken,
    environmentId,
    trustedDeviceToken,
    outcomeBranch,
    permissionMode,
    timeoutMs = 15000,
  } = options;
  let url = `${baseUrl}/v1/code/sessions/${sessionId}/move-to-cloud`;
  let headers = oauthHeaders(accessToken);
  if (trustedDeviceToken) headers["X-Trusted-Device-Token"] = trustedDeviceToken;
  let response;
  try {
    response = await axios_default.post(
      url,
      {
        environment_id: environmentId,
        ...(outcomeBranch && {
          outcome_branch: outcomeBranch,
        }),
        ...(permissionMode && {
          permission_mode: permissionMode,
        }),
        ...emptyObjectResult_2(options.sourceRevision),
        ...emptyObjectResult_3(options.memoryMode),
        ...(options.revisionFallback && {
          revision_fallback: options.revisionFallback,
        }),
      },
      {
        headers,
        timeout: timeoutMs,
        validateStatus: (status) => status < 600,
      },
    );
  } catch (error) {
    let code = error !== null && typeof error === "object" && "code" in error ? String(error.code) : "";
    let isUnreachable = code === "ENOTFOUND" || code === "ECONNREFUSED";
    let message = `Couldn't reach the server \u2014 ${errorMessage(error)}${isUnreachable ? "" : ". The move may still have gone through \u2014 check the session in the web UI."}`;
    if (!isUnreachable) options.onMayHaveMoved?.(message);
    return {
      ok: false,
      message,
      mayHaveCommitted: !isUnreachable,
    };
  }
  if (response.status === 200 || response.status === 201) {
    options.onMoved?.();
    let sessionEnvironment = readSessionEnvironment(response.data);
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
      ...emptyObjectResult_5(options.sourceRevision, response.data),
      ...emptyObjectResult_4(options.memoryMode, response.data),
      ...emptyObjectResult(response.data),
    };
  }
  if (response.status === 401 && options.onAuth401 !== undefined) {
    let onAuth401 = options.onAuth401;
    let headerless = lacksAuthorizationHeader(response.config);
    let newToken;
    try {
      newToken = await onAuth401(accessToken, headerless);
    } catch (error) {
      logForDebugging(
        `[code-session] move-to-cloud ${sessionId}: the 401 handler failed, not resending: ${errorMessage(error)}`,
      );
    }
    if (newToken !== undefined && (headerless || newToken !== accessToken))
      return moveSessionToCloud({
        ...options,
        accessToken: newToken,
        onAuth401: (token, headerless) => {
          onAuth401(token, headerless).catch(() => {});
          return Promise.resolve(undefined);
        },
      });
  }
  let maybeMovedMessage =
    response.status >= 500
      ? `The server responded with ${response.status}. The move may still have gone through \u2014 check the session in the web UI.`
      : undefined;
  if (maybeMovedMessage !== undefined) options.onMayHaveMoved?.(maybeMovedMessage);
  let errorDetail = extractErrorDetail(response.data) ?? "";
  let errorReason = getErrorReason(response.data);
  if (maybeMovedMessage === undefined && permissionMode && errorReason === "move_permission_mode_refused") {
    logForDebugging(
      `[code-session] move-to-cloud ${sessionId} refused for its permission mode (${response.status})${errorDetail ? `: ${errorDetail}` : ""}; moving without one`,
    );
    let retryResult = await moveSessionToCloud({
      ...options,
      permissionMode: undefined,
    });
    try {
      logEvent(TENGU_TELEPORT_PERMISSION_MODE_REFUSED, {
        retry_without_mode: lit(
          retryResult.ok ? "success" : retryResult.mayHaveCommitted ? "maybe_committed" : "failed",
        ),
      });
    } catch {}
    return retryResult;
  }
  let alreadyMovedMessage =
    response.status === 400 && errorReason === "session_not_bridge"
      ? "This session is already on cloud \u2014 refresh the web UI to see it."
      : undefined;
  if (alreadyMovedMessage !== undefined) options.onMayHaveMoved?.(alreadyMovedMessage);
  logForDebugging(
    `[code-session] move-to-cloud ${sessionId} failed ${response.status}${errorReason ? ` [${errorReason}]` : ""}${errorDetail ? `: ${errorDetail}` : ""}`,
  );
  if (maybeMovedMessage !== undefined)
    return {
      ok: false,
      message: maybeMovedMessage,
      mayHaveCommitted: true,
    };
  if (alreadyMovedMessage !== undefined)
    return {
      ok: false,
      message: alreadyMovedMessage,
      mayHaveCommitted: true,
    };
  let plainErrorDetail = extractPlainErrorDetail(response.data);
  let plainDetail = /^the request was invalid\.?$/i.test(plainErrorDetail ?? "")
    ? undefined
    : plainErrorDetail;
  options.onRefusal?.({
    status: response.status,
    codes: refusalCodes(response.data),
    message: plainDetail,
  });
  return {
    ok: false,
    message:
      plainDetail ??
      `The server couldn\u2019t move this session (HTTP ${response.status}). Run with --debug to see the raw response.`,
    mayHaveCommitted: false,
    reason: errorReason,
    revisionConflict: response.status === 409 ? parseSourceRevisionError(response.data) : undefined,
  };
}
//@ chunk-kczn6qx7.js:23933-24231 placement
function readSessionEnvironment(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    !("session" in body) ||
    body.session === null ||
    typeof body.session !== "object"
  )
    return;
  let session = body.session;
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
  let settingsUnreadable =
    getStoredDefaultModeBar() === "settings_unreadable" ||
    SETTING_SOURCES.filter(isSettingSourceEnabled).some(
      (source) =>
        source !== "policySettings" &&
        getSettingsParseErrorsForSource(source).some((parseError) => parseError.severity !== "warning"),
    );
  if (_ || settingsUnreadable) {
    let filtered = [_ && "auto_mode_off", settingsUnreadable && "settings_unreadable"].filter(Boolean);
    logForDebugging(
      `[code-session] move-to-cloud names no permission mode: withheld for ${filtered.join("; ")}`,
    );
    logAutoModeAsked({
      kill_switch: false,
      auto_mode_off: _,
      settings_unreadable: settingsUnreadable,
    });
    return;
  }
  logForDebugging("[code-session] move-to-cloud names auto mode");
  logAutoModeAsked();
  return "auto";
}
//@ chunk-kczn6qx7.js:25168-25304 placement
function logAutoModeAsked(detail) {
  try {
    logEvent(
      "tengu_teleport_to_cloud",
      detail === undefined
        ? {
            action: lit("auto_mode_asked"),
          }
        : {
            action: lit("auto_mode_not_asked"),
            ...detail,
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
  let [checkout, worktreeState] = await Promise.all([
    branchOrHead(branch),
    collectWorktreeState(originalCwd, branch === "HEAD" ? null : branch),
  ]);
  return {
    kind: "ready",
    outcomeBranch: `claude/teleport-${sessionId.slice(-8)}`,
    checkout,
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
async function teleportToCloud(ui) {
  if (isRestrictedSession()) {
    logFeatureBad("teleport_to_cloud", "restricted_session");
    return {
      kind: "precondition",
      message: RESTRICTED_SESSION_CLOUD_REFUSAL,
    };
  }
  let handle = inboundBridgeHandle(getReplBridgeHandle());
  let bridgeSessionId = handle?.bridgeSessionId;
  if (!handle || !bridgeSessionId) {
    logFeatureBad("teleport_to_cloud", "no_bridge");
    return {
      kind: "precondition",
      message:
        "This session isn\u2019t connected to Remote Control. Run /remote-control first, then try again.",
    };
  }
  let accessToken =
    isStorageV5Enabled() && ui.credentials !== undefined
      ? await getBridgeSessionsAccessTokenAsync(ui.credentials)
      : getBridgeSessionsAccessToken();
  if (!accessToken) {
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
  if (handle.gitRepoUrl === null) {
    logFeatureBad("teleport_to_cloud", "no_git_remote");
    return {
      kind: "precondition",
      message:
        "This session has nothing for the cloud to clone, because moving needs a remote named origin in a repository not rooted at your home folder. A new session started from such a repository can move.",
    };
  }
  let { checkout, outcomeBranch } = teleportCheckout;
  let localWorkNotice = describeLocalWorkNotice(teleportCheckout.localWork);
  let publishPromise = localWorkNotice === undefined ? handle.publishGitStateBeforeHandoff?.() : undefined;
  let sourceRepo = isEssentialTrafficOnly() ? null : await resolveSourceRepository(handle);
  let accessProbe =
    sourceRepo &&
    isGithubDotCom(sourceRepo.host) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_teleport_github_access_precheck", true)
      ? probeGithubRepoAccess(sourceRepo.owner, sourceRepo.name).catch(() => null)
      : null;
  let targets;
  try {
    targets = await fetchEnvironmentsAndPools(ui.storageV5, ui.credentials);
  } catch (error) {
    logFeatureBad("teleport_to_cloud", "env_lookup_failed");
    return {
      kind: "precondition",
      message: `Couldn\u2019t look up cloud environments \u2014 ${errorMessage(error)}`,
    };
  }
  let isManagedTarget = (selectedTarget) =>
    selectedTarget.kind !== "bridge" && !isSelfHostedPoolEnv(selectedTarget);
  let environment =
    targets.selectedTarget && isManagedTarget(targets.selectedTarget)
      ? targets.selectedTarget
      : findFirst(targets.availableTargets, isManagedTarget);
  if (!environment || isSelfHostedPoolEnv(environment)) {
    if (targets.environmentsError) {
      logFeatureBad("teleport_to_cloud", "env_lookup_failed");
      return {
        kind: "precondition",
        message: `Couldn\u2019t look up cloud environments \u2014 ${targets.environmentsError}`,
      };
    }
    logFeatureBad("teleport_to_cloud", "no_environment");
    return {
      kind: "precondition",
      message:
        "No cloud environment available. Create one from the web UI (or run /web-setup), then try again." +
        (isSelfHostedPoolEnv(targets.selectedTarget)
          ? " Your default target is a self-hosted environment \u2014 continuing in the cloud needs a managed environment."
          : ""),
    };
  }
  let probeResult = await accessProbe;
  if (
    sourceRepo &&
    (probeResult?.verdict === "github_not_connected" || probeResult?.verdict === "github_repo_not_found")
  ) {
    logFeatureBad("teleport_to_cloud", probeResult.verdict);
    return {
      kind: "precondition",
      message:
        probeResult.verdict === "github_not_connected"
          ? noAccessText({
              subject: `Cloud sessions clone ${sourceRepo.owner}/${sourceRepo.name}`,
              ...teleportSetupHints(),
            })
          : installAppHint({
              owner: sourceRepo.owner,
              name: sourceRepo.name,
              ...teleportSetupHints(),
              apostrophe: "\u2019",
            }),
    };
  }
  await publishPromise;
  let memoryModeAtNotice;
  let currentHandle = handle;
  if (localWorkNotice !== undefined) {
    memoryModeAtNotice = emptyResult();
    let confirmResult = await confirmBeforeMove(ui, localWorkNotice.notice, bridgeSessionId, checkout);
    if (confirmResult.kind !== "confirmed") return confirmResult;
    currentHandle = confirmResult.handle;
    await currentHandle.publishGitStateBeforeHandoff?.();
  }
  logEvent("tengu_teleport_to_cloud", {
    action: lit("start"),
  });
  let sessionUrl = getRemoteSessionUrl(bridgeSessionId, currentHandle.sessionIngressUrl, {
    from: "cli",
  });
  let moveOptions = {
    sessionUrl,
    accessToken,
    environmentId: environment.environment_id,
    outcomeBranch,
    checkout,
  };
  let { result: moveResult, memoryMode } = await commitCloudMove(ui, currentHandle, {
    ...moveOptions,
    memoryModeAtNotice,
    isAfterYes: localWorkNotice !== undefined,
  });
  let coveredFallbacks = new Set(localWorkNotice?.covers);
  let fallbackChoice;
  while (!moveResult.ok && moveResult.revisionConflict !== undefined && fallbackChoice === undefined) {
    unmarkTeleportedSession(bridgeSessionId);
    let { notice, fallback } = notOnRemoteNotice(moveResult.revisionConflict);
    let needsNotice = !coveredFallbacks.has(fallback);
    let nextConfirm = await confirmBeforeMove(
      ui,
      needsNotice ? notice : undefined,
      bridgeSessionId,
      checkout,
    );
    if (nextConfirm.kind !== "confirmed") return nextConfirm;
    coveredFallbacks.add(fallback);
    if (needsNotice && fallback === "default_branch")
      await nextConfirm.handle.publishGitStateBeforeHandoff?.();
    else fallbackChoice = fallback;
    ({ result: moveResult, memoryMode } = await commitCloudMove(ui, nextConfirm.handle, {
      ...moveOptions,
      memoryModeAtNotice: memoryMode,
      isAfterYes: true,
      revisionFallback: fallbackChoice,
    }));
  }
  let tokenMissing = false;
  if (!moveResult.ok) {
    let isTokenMissing = !moveResult.mayHaveCommitted && moveResult.reason === "github_token_missing";
    if (moveResult.mayHaveCommitted) logFeatureSad("teleport_to_cloud", "maybe_committed");
    else {
      logFeatureBad(
        "teleport_to_cloud",
        isTokenMissing
          ? "github_not_connected"
          : moveResult.reason === "unconfirmed_before_move"
            ? "unconfirmed_before_move"
            : "request_failed",
      );
      unmarkTeleportedSession(bridgeSessionId);
    }
    logEvent("tengu_teleport_to_cloud", {
      action: lit(moveResult.mayHaveCommitted ? "maybe_committed" : "failed"),
    });
    return {
      kind: "server-error",
      failure: isTokenMissing
        ? {
            ...moveResult,
            message: `No GitHub account is connected to your Claude account (or the connection expired). ${connectAccountHint(teleportSetupHints())}`,
          }
        : moveResult,
      sessionId: bridgeSessionId,
    };
  }
  let revisionFallbackUsed = false;
  if (fallbackChoice !== undefined) logFeatureSad("teleport_to_cloud", `revision_${fallbackChoice}`);
  else logFeatureOk("teleport_to_cloud");
  let { environmentKind } = moveResult;
  logEvent("tengu_teleport_to_cloud", {
    action: lit("success"),
    environment_kind: isKnownWorkerState(environmentKind)
      ? fromEnum(environmentKind)
      : lit(environmentKind === "cloud" ? "cloud" : "other"),
  });
  let afterMoveParts = [...[], ...emptyArrayResult(moveResult)];
  return {
    kind: "ok",
    success: moveResult,
    sessionUrl,
    ...(afterMoveParts.length > 0 && {
      afterMove: afterMoveParts.join(`
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
    let answer = await ui.confirmMove?.(prompt);
    if (answer !== true) {
      if (answer === false)
        logEvent("tengu_teleport_to_cloud", {
          action: lit("declined"),
        });
      return {
        kind: "precondition",
        message: "Teleport cancelled",
      };
    }
  }
  let handle = await recheckBridgeAndCheckout(bridgeSessionId, checkout);
  if (handle === null) {
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
    handle,
  };
}
//@ chunk-kczn6qx7.js:30406-30602 placement
async function recheckBridgeAndCheckout(bridgeSessionId, checkout) {
  let recheckedCheckout = await withCollectTimeout(getBranch(getOriginalCwd()).then(branchOrHead)).catch(
    (error) => {
      logForDebugging(`[teleport] the checkout could not be read again: ${errorMessage(error)}`);
      return;
    },
  );
  let handle = inboundBridgeHandle(getReplBridgeHandle());
  return handle?.bridgeSessionId === bridgeSessionId && recheckedCheckout === checkout ? handle : null;
}
//@ chunk-kczn6qx7.js:30602-30653 placement
async function branchOrHead(branch) {
  return branch === "HEAD" ? getHeadForDir(getOriginalCwd()) : branch;
}
//@ chunk-kczn6qx7.js:30653-31486 placement
async function commitCloudMove(ui, _, forcedOptions) {
  markTeleportedSession(_.bridgeSessionId);
  let committed = false;
  try {
    _.stopLocalPreview?.();
    await _.settleUploadsBeforeHandoff?.();
    let accessToken = (await getBridgeSessionsAccessTokenAsync(ui.credentials)) ?? forcedOptions.accessToken;
    let trustedDeviceToken = await getTrustedDeviceToken();
    if (
      forcedOptions.isAfterYes &&
      (await recheckBridgeAndCheckout(_.bridgeSessionId, forcedOptions.checkout)) === null
    )
      return {
        result: {
          ok: false,
          message: UNCONFIRMED_BEFORE_MOVE_MESSAGE,
          mayHaveCommitted: false,
          reason: "unconfirmed_before_move",
        },
        memoryMode: forcedOptions.memoryModeAtNotice,
      };
    let permissionMode = teleportPermissionMode();
    let memoryMode = emptyResult(forcedOptions.memoryModeAtNotice);
    committed = true;
    return {
      result: await moveSessionToCloud({
        onMoved: () => {
          ui.onMoved?.(forcedOptions.sessionUrl);
          runBeforeMoveStep(ui);
        },
        onMayHaveMoved: (message) => {
          ui.onMayHaveMoved?.(message);
          runBeforeMoveStep(ui);
        },
        sessionId: _.bridgeSessionId,
        baseUrl: getBridgeBaseUrl(),
        accessToken,
        onAuth401: (token, headerless) =>
          bridgeSessionsAccessTokenAfter401(token, ui.credentials, headerless),
        environmentId: forcedOptions.environmentId,
        trustedDeviceToken,
        outcomeBranch: forcedOptions.outcomeBranch,
        permissionMode,
        memoryMode,
        revisionFallback: forcedOptions.revisionFallback,
      }),
      memoryMode,
    };
  } catch (error) {
    if (!committed) unmarkTeleportedSession(_.bridgeSessionId);
    throw error;
  }
}
//@ chunk-kczn6qx7.js:31486-31616 placement
function runBeforeMoveStep(step) {
  try {
    step.beforeMove?.();
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
  let headline = `Session now in the cloud: ${sessionUrl}`;
  switch (_.kind) {
    case "disconnected":
      return `${headline}
${REMOTE_CONTROL_INACTIVE_TEXT}`;
    case "reconnected":
      return `${headline}
New /remote-control session is active \xB7 Continue here, on your phone, or at ${_.newUrl}`;
    case "reconnect-pending":
      return `${headline}
Starting a new /remote-control session \u2014 it\u2019ll show as /rc shortly.`;
  }
}
//@ chunk-kczn6qx7.js:32135-32183 placement
function inboundBridgeHandle(replBridgeHandle) {
  return replBridgeHandle && !replBridgeHandle.outboundOnly ? replBridgeHandle : null;
}
//@ chunk-kczn6qx7.js:32183-32295 placement
function resolveSourceRepository(handle) {
  if (handle.gitRepoUrl === undefined) return detectCurrentRepositoryWithHost();
  return handle.gitRepoUrl ? parseGitSourceRepository(handle.gitRepoUrl) : Promise.resolve(null);
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
function disableReplBridgeForMove(ui, _ = false) {
  ui.setAppState((state) => {
    if (!state.replBridgeEnabled) return state;
    return {
      ...state,
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
function enableReplBridge(ui) {
  ui.setAppState((_) => {
    if (_.replBridgeEnabled) return _;
    return {
      ..._,
      replBridgeEnabled: true,
    };
  });
}
//@ chunk-kczn6qx7.js:32777-32944 placement
async function waitForNewBridgeSession(oldSessionId, signal, timeoutMs = NEW_BRIDGE_WAIT_TIMEOUT_MS) {
  let deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
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
  let movedUrl;
  let afterMove;
  let maybeMovedMessage;
  try {
    return await runTeleportFromRepl(context, options, {
      onMoved: (url) => {
        movedUrl = url;
      },
      onAfterMove: (text) => {
        afterMove = text;
      },
      onMayHaveMoved: (message) => {
        maybeMovedMessage = message;
      },
    });
  } catch (error) {
    if (movedUrl !== undefined) {
      logError(error);
      return `Session now in the cloud: ${movedUrl}
Claude Code didn\u2019t finish updating Remote Control in this terminal after the move (${errorMessage(error)}).${
        afterMove === undefined
          ? ""
          : `
${afterMove}`
      }`;
    }
    if (maybeMovedMessage !== undefined) {
      logError(error);
      return `${maybeMovedMessage}
Claude Code didn\u2019t finish updating Remote Control in this terminal (${errorMessage(error)}).`;
    }
    throw error;
  }
}
//@ chunk-kczn6qx7.js:33387-34564 placement
async function runTeleportFromRepl(context, confirmMove, confirmPrompt) {
  let cancelledAutoContinue = false;
  let outcome;
  try {
    outcome = await teleportToCloud({
      beforeMove: () => {
        cancelledAutoContinue = cancelForHandoff("cloud_handoff");
        if (cancelledAutoContinue)
          context.applyMessageOp({
            type: "append",
            messages: [createSystemMessage(AUTO_CONTINUE_CANCEL_MESSAGES.cloud_handoff, "warning")],
          });
      },
      onMoved: confirmPrompt.onMoved,
      onMayHaveMoved: (message) => confirmPrompt.onMayHaveMoved(`Couldn\u2019t teleport: ${message}`),
      credentials: context.credentials,
      storageV5: context.storageV5,
      confirmMove,
    });
  } finally {
    clearHandoffInProgress();
  }
  switch (outcome.kind) {
    case "precondition":
      return outcome.message;
    case "server-error": {
      if (outcome.failure.mayHaveCommitted) {
        confirmPrompt.onMayHaveMoved(
          withRelaunchHint(`Couldn\u2019t teleport: ${outcome.failure.message}`, cancelledAutoContinue),
        );
        markTeleportedSession(outcome.sessionId);
        clearBridgeSession(undefined, undefined, undefined, context.storageV5);
        setTimeout(disableReplBridgeForMove, DISABLE_BRIDGE_DELAY_MS, context, true);
        return withRelaunchHint(
          `Couldn\u2019t teleport: ${outcome.failure.message}
${REMOTE_CONTROL_INACTIVE_TEXT}`,
          cancelledAutoContinue,
        );
      }
      return withRelaunchHint(`Couldn\u2019t teleport: ${outcome.failure.message}`, cancelledAutoContinue);
    }
    case "ok": {
      confirmPrompt.onAfterMove(outcome.afterMove);
      markTeleportedSession(outcome.success.sessionId);
      clearBridgeSession(undefined, undefined, undefined, context.storageV5);
      let sessionUrl = outcome.sessionUrl;
      let { afterMove } = outcome;
      let withAfterMove = (text) =>
        afterMove === undefined
          ? text
          : `${text}
${afterMove}`;
      let bridgeAction = bridgeMoveAction(outcome.success.sessionId);
      if (bridgeAction.kind === "disconnect") {
        setTimeout(disableReplBridgeForMove, DISABLE_BRIDGE_DELAY_MS, context, true);
        return withAfterMove(
          movedToCloudMessage(sessionUrl, {
            kind: "disconnected",
          }),
        );
      }
      disableReplBridgeForMove(context);
      await sleep(0);
      enableReplBridge(context);
      let newSessionId = await waitForNewBridgeSession(
        bridgeAction.oldSessionId,
        context.abortController.signal,
      );
      return withAfterMove(
        movedToCloudMessage(
          sessionUrl,
          newSessionId
            ? {
                kind: "reconnected",
                newUrl: getRemoteSessionUrl(newSessionId, undefined, {
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
function renderTextLine_3(line) {
  return jsxProd_default(
    Text,
    {
      children: line,
    },
    line,
  );
}
//@ chunk-kczn6qx7.js:34609-35726 placement
function TeleportConfirm(props) {
  let $ = useMemoCache(21);
  let { title, moveLabel, lines, onAnswer } = props;
  let titleText;
  if ($[0] !== title) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: title,
    });
    $[0] = title;
    $[1] = titleText;
  } else titleText = $[1];
  let children;
  if ($[2] !== lines) {
    children = lines.map(renderTextLine_3);
    $[2] = lines;
    $[3] = children;
  } else children = $[3];
  let linesBox;
  if ($[4] !== children) {
    linesBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      gap: 1,
      children,
    });
    $[4] = children;
    $[5] = linesBox;
  } else linesBox = $[5];
  let cancelOption;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    cancelOption = {
      label: "Cancel",
      value: "cancel",
    };
    $[6] = cancelOption;
  } else cancelOption = $[6];
  let options;
  if ($[7] !== moveLabel) {
    options = [
      cancelOption,
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
    onChange = (value) => onAnswer(value === "move");
    $[9] = onAnswer;
    $[10] = onCancel;
    $[11] = onChange;
  } else {
    onCancel = $[10];
    onChange = $[11];
  }
  let selectorBox;
  if ($[12] !== options || $[13] !== onCancel || $[14] !== onChange) {
    selectorBox = jsxProd_default(Box, {
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
    $[15] = selectorBox;
  } else selectorBox = $[15];
  let bylineBox;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    bylineBox = jsxProd_default(Box, {
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
    $[16] = bylineBox;
  } else bylineBox = $[16];
  let dialogBox;
  if ($[17] !== titleText || $[18] !== linesBox || $[19] !== selectorBox) {
    dialogBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      padding: 1,
      children: [titleText, linesBox, selectorBox, bylineBox],
    });
    $[17] = titleText;
    $[18] = linesBox;
    $[19] = selectorBox;
    $[20] = dialogBox;
  } else dialogBox = $[20];
  return dialogBox;
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
function logTeleportMenu(choice) {
  logEvent("tengu_teleport_menu", {
    action: fromEnum(choice),
  });
}
//@ chunk-kczn6qx7.js:35852-39156 placement
/**
 * /teleport 菜单：选择移到云端或其他 teleport 操作。
 */
function TeleportMenu({ onExit, context, exposure, retireOnSurface, canSend }) {
  let [phase, setPhase] = useState("menu");
  let [confirmLines, setConfirmLines] = useState();
  let resolveRef = useRef(null);
  let unmountedRef = useRef(false);
  let resolvedRef = useRef(false);
  let [sendingDetail, setSendingDetail] = useState();
  let [answeredMove, setAnsweredMove] = useState(false);
  let [heldCopyAtMove, setHeldCopyAtMove] = useState();
  let [finalLines, setFinalLines] = useState();
  let queuedLineRef = useRef(undefined);
  function deliverLine(line) {}
  function flushQueuedLine() {
    let line = queuedLineRef.current;
    queuedLineRef.current = undefined;
    if (line !== undefined) deliverLine(line);
  }
  let pendingOfferRef = useRef(exposure.pendingOffer ?? null);
  useEffect(() => {}, [canSend, context.session, context.credentials, context.storageV5]);
  let options = useSession();
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (resolveRef.current) {
        resolvedRef.current = true;
        resolveRef.current(undefined);
        resolveRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!exposure.logged) {
      exposure.logged = true;
      logTeleportMenu(canSend ? "shown" : "shown_no_bridge");
    }
  }, [exposure, canSend]);
  let finishedRef = useRef(false);
  let finishOnce = (action) => {
    if (finishedRef.current) return false;
    finishedRef.current = true;
    logTeleportMenu(action);
    return true;
  };
  let abandonOffer = () => {
    pendingOfferRef.current?.abandon();
    exposure.importHold?.close("unused");
    endMove("not_moved");
    exposure.isOfferAnswered = true;
    exposure.pendingOffer = null;
    pendingOfferRef.current = null;
  };
  let handleCancel = () => {
    if (finishOnce("cancel")) {
      abandonOffer();
      onExit("Teleport cancelled", {
        display: "system",
      });
    }
  };
  let globalExitKeybindings = useGlobalExitKeybindings(handleCancel, undefined, phase === "menu");
  function deliverHeld(line, isQueued) {}
  function endMove(status) {
    exposure.moveEnded ??= status;
    let heldCopy = exposure.heldCopy;
    exposure.heldCopy = undefined;
    if (heldCopy === undefined) return;
    if (exposure.moveEnded === "moved") {
      let heldLine = heldCopy.held.take();
      if (heldLine !== undefined)
        try {
          deliverHeld(heldLine, false);
          if (heldCopy.line !== undefined) deliverLine(heldCopy.line);
        } catch (error) {
          logError(error);
        }
      return;
    }
    heldCopy.held.letGo();
  }
  function deliverHeldImpl(line, isQueued = false) {}
  function startMove(quiet = false) {
    setSendingDetail(remoteSessionIfTrusted() ? noDisplaySessionStatus() : undefined);
    setPhase("sending");
    let handledRef = false;
    runTeleportWithRecovery(
      context,
      (lines) =>
        new Promise((resolve) => {
          if (unmountedRef.current) {
            resolvedRef.current = true;
            resolve(undefined);
            return;
          }
          resolveRef.current = resolve;
          let queuedLine = queuedLineRef.current;
          setConfirmLines(queuedLine === undefined ? lines : [queuedLine, ...lines]);
        }),
    )
      .then((resultText) => {
        if (!resolvedRef.current) {
          endMove(resultText.startsWith("Session now in the cloud") ? "moved" : "not_moved");
          exposure.importHold?.close("unused");
          handledRef = true;
          flushQueuedLine();
          onExit(resultText, {
            display: "system",
          });
        }
      })
      .catch((error) => {
        logError(error);
        if (!resolvedRef.current && !handledRef) {
          endMove("not_moved");
          exposure.importHold?.close("unused");
          flushQueuedLine();
          onExit(`Couldn\u2019t teleport: ${errorMessage(error)}`, {
            display: "system",
          });
        }
      });
  }
  if (phase === "resume")
    return jsxProd_default(TeleportResumeWrapper, {
      onComplete: (result) => {
        resetConversation(context, result.log, retireOnSurface, options);
        onExit("Session resumed successfully", {
          display: "system",
        });
      },
      onCancel: () =>
        onExit("Teleport cancelled", {
          display: "system",
        }),
      onError: (message) =>
        onExit(message, {
          display: "system",
        }),
      isEmbedded: true,
      source: "localCommand",
    });
  if (phase === "sending" && confirmLines !== undefined) {
    let onAnswer = (proceed) => {
      let resolve = resolveRef.current;
      if (!resolve) return;
      if (proceed && exposure.importHold?.isEndTold === false) {
        setHeldCopyAtMove(confirmLines);
        setConfirmLines(undefined);
        return;
      }
      resolveRef.current = null;
      setConfirmLines(undefined);
      setHeldCopyAtMove(undefined);
      setAnsweredMove(proceed);
      if (proceed) queuedLineRef.current = undefined;
      resolve(proceed);
    };
    return sendingDetail === undefined
      ? jsxProd_default(TeleportConfirm, {
          title: "Continue this session in the cloud?",
          moveLabel: "Continue in the cloud",
          lines: confirmLines,
          onAnswer,
        })
      : jsxProd_default(nullLinesView, {
          lines: confirmLines,
          onAnswer,
        });
  }
  if (phase === "sending" && sendingDetail !== undefined && !answeredMove)
    return jsxProd_default(nullSendingView, {});
  if (phase === "sending")
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
        (sendingDetail !== undefined || !answeredMove) &&
          jsxProd_default(Box, {
            marginLeft: 2,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: sendingDetail ?? "It continues from your branch\u2019s last push.",
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
          onCancel: handleCancel,
          onChange: (value) => {
            if (value === "resume") {
              if (finishOnce("resume")) {
                abandonOffer();
                setPhase("resume");
              }
              return;
            }
            if (!finishOnce("send")) return;
            startMove();
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
export { TeleportMenu };
