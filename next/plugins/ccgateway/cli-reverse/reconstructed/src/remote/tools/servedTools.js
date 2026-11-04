/**
 * remote/tools/servedTools.ts
 *
 * 会话工具服务：图片重编码、结果大小、关闭原因（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-012rhzq5.js (29)
 * attribution: placement 29
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { parseSettingsFileUncached, getSettingsForSource } from "../../utils/settings/settings.js";
import { byteLengthOf, buildRemoteToolCallResult } from "./callResults.js";
import { compressImageBuffer } from "../../utils/imageResizer.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, withTelemetryMessage, toError } from "../../utils/errors.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import { logError } from "../../utils/log.js";
import { attestationFor, isBelowFloorEnforced } from "../../services/remoteTools/toolHostAttestation.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";
import {
  remoteToolServingOffReason as remoteToolServingOffReason_2,
  isPersonFixableOffReason,
  SERVING_MUTED_NOTICE_KEY,
  remoteToolVmRequired,
  SERVING_UNMUTED_NOTICE_KEY,
  onServingMuteRecheck,
  isSessionChannelDisabled,
} from "../../services/remoteTools/servingGates.js";
import { launchLocationFacts } from "../../services/remoteTools/launchLocation.js";
import {
  SERVED_BASH_LAUNCHED_FROM_HOME,
  SERVED_BASH_FROM_HOME_NOTICE,
} from "../../utils/hooks/servedHooks/notices.js";
import {
  PROFILE_DIRS_UNREADABLE_NOTICE_KEY,
  onWindowsProfileDirsSettled,
  primeWindowsProfileDirs,
  pendingWindowsProfileDirsRead,
} from "../../services/remoteTools/windowsProfileDirs.js";
import { SERVED_MOUNT_TABLE_UNREADABLE } from "../../utils/wslMounts.js";
import { createServingKit, announcedToolFor } from "./serve/createServingKit.js";
import {
  createConcurrencyLimiter,
  DEFAULT_MAX_IN_FLIGHT,
} from "../../services/remoteTools/remoteToolAdmission.js";
import { servableTools } from "./serve/serveCall.js";
import { createSignal } from "../../utils/signal.js";
import { withDeadline } from "../../utils/sleep.js";
import { isRepositoryTrustUnresolved } from "./repositoryTrust.js";
import { SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO, SERVED_CALLS_UNATTESTED } from "./toolHostsNotice.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { callerKey } from "./serve/servedShellSettings.js";
import { withdrawAskedCall } from "./serve/pendingAsks.js";
import { withdrawnRequestMessage, unattestedSenderMessage } from "../../services/remoteTools/hostRefusals.js";
import { serveRemoteToolCall } from "./serve/callAdmission.js";
import { NOT_HELD_LEASE } from "../../services/remoteTools/lease.js";
import { servedAnswerLimitBytes, replayedFields } from "../../services/remoteTools/servedAnswerSize.js";
import { readCallResult } from "./toolDescriptors.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "./protocolConstants.js";
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import {
  isViolinWillowEnabledCached,
  VIOLIN_WILLOW_FLAG,
  isCloudClientToolServingAnsweredOn,
  getToolServingFlagAnsweredOff,
} from "../../services/analytics/violinWillowGate.js";
import { primeWindowsPlatform, isWindowsOrPowerShellHost } from "../../utils/platformWindows.js";
import { getDeviceBindingRefusal } from "../../bridge/deviceBindingPolicy.js";
import { onComplianceTaintsChanged } from "../../services/policyLimits/complianceTaints.js";

//@ chunk-012rhzq5.js:15691-15767 placement
function isViolinFinetunerEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_finetuner", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-012rhzq5.js:15767-15840 placement (2.1.88 match: _temp7, 1)
function backgroundSwitchedOffStub(
  readSettings = (path, options) => parseSettingsFileUncached(path, undefined, options),
  readPolicy = () => getSettingsForSource("policySettings"),
) {
  return false;
}
//@ chunk-012rhzq5.js:15840-15865 placement
/**
 * 服务结果图片重编码的参数：最多 4 轮、每轮目标压缩到 9 成、小于 16 KB 的图片不再处理。
 */
var MAX_IMAGE_REENCODE_ROUNDS = 4;
var IMAGE_SHRINK_RATIO = 0.9;
var MIN_IMAGE_BYTES_FOR_REENCODE = 16384;
//@ chunk-012rhzq5.js:15865-16667 placement
async function reencodeServedImage(result, limitBytes) {
  let size = byteLengthOf(result);
  if (size <= limitBytes) return result;
  let images = new Map();
  countImageCopies(result, images);
  let current = result;
  for (let i = 0; i < MAX_IMAGE_REENCODE_ROUNDS && size > limitBytes; i++) {
    let filtered = [...images].filter(
      ([, entry]) => base64ByteLength(entry.now.data) > MIN_IMAGE_BYTES_FOR_REENCODE,
    );
    let reduced = filtered.reduce((acc, [, entry]) => acc + entry.copies * entry.now.data.length, 0);
    if (reduced === 0) break;
    let ratio = Math.max(0, 1 - (size - limitBytes) / reduced) * IMAGE_SHRINK_RATIO;
    for (let [base64, entry] of filtered) {
      let max = Math.max(MIN_IMAGE_BYTES_FOR_REENCODE, Math.floor(base64ByteLength(entry.now.data) * ratio));
      try {
        let compressed = await compressImageBuffer(Buffer.from(base64, "base64"), max, entry.now.mediaType);
        if (
          base64ByteLength(compressed.base64) >= MIN_IMAGE_BYTES_FOR_REENCODE &&
          compressed.base64.length < entry.now.data.length
        )
          images.set(base64, {
            copies: entry.copies,
            now: {
              data: compressed.base64,
              mediaType: compressed.mediaType,
            },
          });
      } catch (error) {
        logForDebugging(
          `session serving: re-encoding a served image to fit the channel failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    }
    let mcpResultImages = resolveMcpResultImages(
      result,
      new Map([...images].map(([base64, entry]) => [base64, entry.now])),
    );
    let nextSize = byteLengthOf(mcpResultImages);
    if (nextSize >= size) break;
    current = mcpResultImages;
    size = nextSize;
  }
  if (current !== result)
    logForDebugging(
      `session serving: served image(s) re-encoded, answer now ${size} bytes (limit ${limitBytes})`,
    );
  return current;
}
//@ chunk-012rhzq5.js:16667-16714 placement
function base64ByteLength(base64) {
  return Math.floor((base64.length * 3) / 4);
}
//@ chunk-012rhzq5.js:16714-17006 placement (2.1.88 match: buildImageToolResult, 0.905)
/**
 * （切分错误）从 image 块（MCP 的 data/mimeType 或 Anthropic 的 base64 source）取 {data, mediaType}。
 */
function extractImageData(block) {
  if (block.type !== "image") return;
  if (typeof block.data === "string" && typeof block.mimeType === "string")
    return {
      data: block.data,
      mediaType: block.mimeType,
    };
  let source = block.source;
  if (
    isObjectLike(source) &&
    source.type === "base64" &&
    typeof source.data === "string" &&
    typeof source.media_type === "string"
  )
    return {
      data: source.data,
      mediaType: source.media_type,
    };
  return;
}
//@ chunk-012rhzq5.js:17006-17223 placement
/**
 * （切分错误）递归统计对象中每张图片 data 出现的次数。
 */
function countImageCopies(value, images) {
  if (Array.isArray(value)) {
    value.forEach((child) => countImageCopies(child, images));
    return;
  }
  if (!isObjectLike(value)) return;
  let imageData = extractImageData(value);
  if (imageData !== undefined) {
    images.set(imageData.data, {
      copies: (images.get(imageData.data)?.copies ?? 0) + 1,
      now: imageData,
    });
    return;
  }
  Object.values(value).forEach((child) => countImageCopies(child, images));
}
//@ chunk-012rhzq5.js:17223-17535 placement
/**
 * 把 MCP 工具结果中引用的图片数据按映射表替换为真实数据与 mimeType（含 structuredContent/_meta 深层）。
 */
function resolveMcpResultImages(result, imagesByRef) {
  let content = result.content.map((block) => {
    let replacement = block.type === "image" ? imagesByRef.get(block.data) : undefined;
    return block.type === "image" && replacement !== undefined
      ? {
          ...block,
          data: replacement.data,
          mimeType: replacement.mediaType,
        }
      : block;
  });
  return {
    ...result,
    content,
    ...(result.structuredContent !== undefined && {
      structuredContent: resolveImagesDeep(result.structuredContent, imagesByRef),
    }),
    ...(result._meta !== undefined && {
      _meta: resolveImagesDeep(result._meta, imagesByRef),
    }),
  };
}
//@ chunk-012rhzq5.js:17535-17578 placement
function resolveImagesDeep(value, imagesByRef) {
  return import_mapValues(value, (item) => resolveImageBlockDeep(item, imagesByRef));
}
//@ chunk-012rhzq5.js:17578-17873 placement (2.1.88 match: normalizeImageBlocks, 0.869)
function resolveImageBlockDeep(value, imagesByRef) {
  if (Array.isArray(value)) return value.map((block) => resolveImageBlockDeep(block, imagesByRef));
  if (!isObjectLike(value)) return value;
  let imageData = extractImageData(value);
  let mediaType = imageData === undefined ? undefined : imagesByRef.get(imageData.data);
  if (mediaType !== undefined)
    return typeof value.data === "string"
      ? {
          ...value,
          data: mediaType.data,
          mimeType: mediaType.mediaType,
        }
      : {
          ...value,
          source: {
            type: "base64",
            media_type: mediaType.mediaType,
            data: mediaType.data,
          },
        };
  return resolveImagesDeep(value, imagesByRef);
}
//@ chunk-012rhzq5.js:17873-17925 placement
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-012rhzq5.js:17925-18000 placement
var DEFAULT_CALL_AGE_WINDOW_MS = 30000;
var BACKGROUND_WATCH_INTERVAL_MS = 5000;
var BACKGROUND_BOUND_RECHECK_MS = 20000;
var OUTCOME_QUERY_AGE_WINDOW_MS = 5000;
var NOT_SERVED_HERE_TEXT = "not served here";
var REPOSITORY_TRUST_WAIT_MS = 3000;
var PLUMBING_CALL_AGE_WINDOW_MS = 5000;
//@ chunk-012rhzq5.js:18000-18392 placement
/**
 * 上报远程 plumbing 调用遥测：结果、名称哈希、请求 id 哈希等。
 */
function logPlumbingCallTelemetry(outcome, tool, requestId, attestation) {
  try {
    logEvent("tengu_remote_plumbing_call", {
      transport: lit("session"),
      outcome: fromEnum(outcome.outcome),
      ...(outcome.outcome === "stale" && {
        dated: outcome.dated,
      }),
      name_hash: shortHash(tool.name),
      ...(typeof requestId === "string" && {
        request_id_hash: shortHash(requestId),
      }),
      ...(attestation !== undefined && {
        attestation_mode: fromEnum(attestation.mode),
        request_attestation: fromEnum(attestation.status),
        attestation_verdict: fromEnum(attestation.verdict),
      }),
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "session serving: logging a plumbing call threw"));
  }
}
//@ chunk-012rhzq5.js:18392-18517 placement
function safeJudgeSender(attestationStatus) {
  try {
    return attestationFor(attestationStatus);
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "session serving: judging the sender of a plumbing call threw"),
    );
    return;
  }
}
//@ chunk-012rhzq5.js:18517-18812 placement
function unattestedConsentText(reason) {
  switch (reason) {
    case "nothing_to_mark":
    case "not_marked":
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested_untrusted_repo.not_marked"];
    case "declined":
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested_untrusted_repo"];
    case undefined:
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested"];
  }
}
//@ chunk-012rhzq5.js:18812-26945 placement
/**
 * 会话工具服务：在 tengu_remote_tool_serving 开启时为云会话提供本机工具
 */
var createSessionToolServing = (options) => {
  let readOffReason = () =>
    "offReason" in options
      ? typeof options.offReason === "function"
        ? options.offReason()
        : options.offReason
      : remoteToolServingOffReason_2(options.cwd);
  let offReason = readOffReason();
  let currentOffReason = offReason;
  let closed = false;
  let isOff = () => closed || currentOffReason !== undefined;
  let launchedFromHome = offReason === "launched_from_home";
  if (offReason !== undefined)
    logEvent("tengu_remote_tool_serving", {
      event: lit("gate_off"),
      served_tool_count: 0,
      reason: fromEnum(offReason),
      ...launchLocationFacts(offReason, options.cwd),
      transport: lit("session"),
    });
  let currentOwner = () => {
    try {
      return options.owner();
    } catch (error) {
      logForDebugging("session serving: the owner test threw; this client serves as a viewer", {
        level: "error",
      });
      logError(toError(error));
      return {
        owner: false,
      };
    }
  };
  let emitNotice = (key, text) => {
    try {
      options.onNotice?.(key, text);
    } catch (error) {
      logError(toError(error));
    }
  };
  let noticeShown = false;
  let showOffNotice = (reason) => {
    if (noticeShown || !currentOwner().owner) return;
    noticeShown = true;
    if (isPersonFixableOffReason(reason))
      emitNotice(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
    if (reason === "muted")
      emitNotice(SERVING_MUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.muted"]);
  };
  showOffNotice(offReason);
  let profileNoticeShown = false;
  let showProfileNotice = (reason) => {
    if (!profileNoticeShown && reason === "profile_dirs_unreadable" && currentOwner().owner) {
      profileNoticeShown = true;
      emitNotice(
        PROFILE_DIRS_UNREADABLE_NOTICE_KEY,
        REMOTE_TOOLS_CONSENT_TEXT["serving_off.profile_dirs_unreadable"],
      );
    }
  };
  showProfileNotice(offReason);
  let mountNoticeShown = false;
  let showMountNotice = (reason) => {
    if (!mountNoticeShown && reason === "mount_table_unreadable" && currentOwner().owner) {
      mountNoticeShown = true;
      emitNotice(
        SERVED_MOUNT_TABLE_UNREADABLE,
        REMOTE_TOOLS_CONSENT_TEXT["serving_off.mount_table_unreadable"],
      );
    }
  };
  showMountNotice(offReason);
  let createFreshKit = () => {
    let servingKit = createServingKit({
      sessionId: options.sessionId,
      limiter: createConcurrencyLimiter(DEFAULT_MAX_IN_FLIGHT),
      getDeviceId: () => {
        let ownerInfo = currentOwner();
        return ownerInfo.owner ? ownerInfo.deviceId : undefined;
      },
      onNotice: emitNotice,
      ...(options.cwd !== undefined && {
        launchDir: options.cwd,
      }),
      ...(options.tools !== undefined && {
        tools: options.tools,
      }),
      ...(options.policy !== undefined && {
        policy: options.policy,
      }),
      sandboxRequiredNow: remoteToolVmRequired,
    });
    let unsubscribeRedescribed = servingKit.onRedescribed(onRedescribed);
    return {
      kit: servingKit,
      source: undefined,
      nativeTools: servableTools(servingKit.deps).map((tool) =>
        announcedToolFor(tool, servingKit.deps, servingKit.description),
      ),
      release: () => {
        unsubscribeRedescribed();
        servingKit.dispose();
      },
    };
  };
  let adoptKit = (adopted) => {
    let unsubscribeSource = adopted.source.subscribe((change) => {
      if (snapshotServedTools() !== lastServedSnapshot) emitServedToolsChanged(change);
    });
    let unsubscribeRedescribed = adopted.kit.onRedescribed(onRedescribed);
    return {
      kit: adopted.kit,
      source: adopted.source,
      nativeTools: [],
      release: () => {
        unsubscribeRedescribed();
        unsubscribeSource();
      },
    };
  };
  let onRedescribed = () => {
    if (!disposed && kitSettled && snapshotServedTools() !== lastServedSnapshot)
      emitServedToolsChanged("redescribed");
  };
  let kitSettled = options.serving === undefined;
  let kit = options.serving === undefined ? createFreshKit() : undefined;
  let adoptedFromHost = false;
  let answerDeduper = createAnswerDeduper();
  let disposed = false;
  let signal = createSignal();
  let isOurRequest = (request) =>
    !disposed &&
    kit !== undefined &&
    !isOff() &&
    request.instance_id === options.instanceId &&
    currentOwner().owner;
  let shownUntrustedNotices = new Set();
  let resolveRepositoryTrust = async () => {
    let repositoryTrust = options.repositoryTrust;
    if (repositoryTrust === undefined) return;
    let trustResult = await withDeadline(
      Promise.resolve()
        .then(repositoryTrust)
        .catch(() => {
          return;
        }),
      REPOSITORY_TRUST_WAIT_MS,
    );
    let unresolvedTrust = isRepositoryTrustUnresolved(trustResult) ? trustResult : undefined;
    let noticeKey =
      unresolvedTrust !== undefined ? SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO : SERVED_CALLS_UNATTESTED;
    if (!shownUntrustedNotices.has(noticeKey)) {
      shownUntrustedNotices.add(noticeKey);
      emitNotice(noticeKey, unattestedConsentText(unresolvedTrust));
    }
    return unresolvedTrust;
  };
  let isWithinAgeWindow = (request, ageMs, extraWindowMs) =>
    ageMs !== undefined && ageMs <= request.deadline_ms + extraWindowMs;
  let isCallQuery = (request) =>
    request.request.ok && request.request.kind === "call" && request.request.value.approval === undefined;
  function describeServedTools() {
    if (disposed || kit === undefined || !currentOwner().owner) return;
    return !isOff()
      ? {
          host: kit.kit.description,
          tools: kit.source?.native() ?? kit.nativeTools,
          passthrough: kit.source?.passthrough() ?? [],
          plumbing: options.plumbing?.names() ?? [],
        }
      : {
          host: kit.kit.description,
          tools: [],
          passthrough: [],
          plumbing: [],
        };
  }
  let snapshotServedTools = () => jsonStringify(describeServedTools() ?? null);
  function emitServedToolsChanged(eventName) {
    lastServedSnapshot = snapshotServedTools();
    try {
      signal.emit(eventName);
    } catch (error) {
      logForDebugging("session serving: a served-tools listener threw", {
        level: "error",
      });
      logError(toError(error));
    }
  }
  let lastServedSnapshot = snapshotServedTools();
  let onAdoptFailed = (error) => {
    logForDebugging(
      "session serving: the device registration handed over nothing usable; serving without it",
      {
        level: "warn",
      },
    );
    logError(toError(error));
    if (!disposed) {
      kit = createFreshKit();
      adoptedFromHost = false;
    }
  };
  options.serving
    ?.then((hostServing) => {
      if (disposed) return;
      kit = hostServing === undefined ? createFreshKit() : adoptKit(hostServing);
      adoptedFromHost = hostServing !== undefined;
    })
    .catch(onAdoptFailed)
    .then(() => {
      if (!disposed) {
        kitSettled = true;
        emitServedToolsChanged("adopted");
      }
    })
    .catch((error) => logError(toError(error)));
  let withdrawSessionAsks = () => {
    let callerSession = kit?.kit.deps.sessions.peek(
      callerKey({
        sessionId: options.sessionId,
      }),
    );
    if (kit === undefined || callerSession === undefined) return;
    for (let ask of callerSession.pendingAsks.list())
      if (ask.raisedOver === "session")
        withdrawAskedCall(callerSession, ask.askId, {
          reason: "host_unbound",
          message: withdrawnRequestMessage({
            targetName: kit.kit.description.name,
            reason: "host_unbound",
          }),
        });
  };
  let callerSession = () =>
    kit?.kit.deps.sessions.peek(
      callerKey({
        sessionId: options.sessionId,
      }),
    );
  let backgroundShells = () => callerSession()?.backgroundShells;
  let stopBackground = (reason) => {
    backgroundShells()?.stopAll(reason);
  };
  let safely = (fn) => {
    try {
      fn();
    } catch (error) {
      logError(toError(error));
    }
  };
  let logServingChange = (reason, previousReason) =>
    safely(() =>
      logEvent("tengu_remote_tool_serving", {
        ...(reason === undefined
          ? {
              event: lit("gate_on_reread"),
            }
          : {
              event: lit("gate_off_reread"),
              served_tool_count: 0,
              reason: fromEnum(reason),
              ...launchLocationFacts(reason, options.cwd),
            }),
        previous_reason: fromEnum(previousReason),
        owner: currentOwner().owner,
        transport: lit("session"),
      }),
    );
  let onCheckFailed = (wasClosed) => {
    closed = true;
    [
      () => {
        if (!wasClosed)
          logEvent("tengu_remote_tool_serving", {
            event: lit("serving_check_failed"),
          });
      },
      () => stopBackground("serving_check_failed"),
      withdrawSessionAsks,
      () => {
        if (snapshotServedTools() !== lastServedSnapshot) emitServedToolsChanged();
      },
    ].forEach(safely);
  };
  let hasRunningBackground = () => !disposed && (backgroundShells()?.running ?? 0) > 0;
  let activeCallControllers = new Set();
  let needsBackgroundWatch = () =>
    hasRunningBackground() || (!disposed && activeCallControllers.size > 0 && isViolinFinetunerEnabled());
  let recheckWorkerBound = () => {
    if (options.stillBound === undefined || !needsBackgroundWatch()) return;
    options
      .stillBound()
      .then((stillBound) => {
        if (stillBound !== false) return;
        let running = backgroundShells()?.running ?? 0;
        stopBackground("serving_ended");
        if (!isViolinFinetunerEnabled()) return;
        let controllers = [...activeCallControllers];
        activeCallControllers.clear();
        for (let controller of controllers) controller.abort();
        withdrawSessionAsks();
        if (controllers.length + running > 0)
          logEvent("tengu_remote_tool_serving", {
            event: lit("session_no_longer_served"),
            running_calls: controllers.length,
            background_commands: running,
          });
      })
      .catch((error) => logError(toError(error)));
  };
  let watchTimer;
  let lastBoundCheckMs = 0;
  let backgroundSwitchedOff = options.backgroundSwitchedOff ?? backgroundSwitchedOffStub;
  let startBackgroundWatch = () => {
    if (watchTimer !== undefined || !needsBackgroundWatch()) return;
    lastBoundCheckMs = Date.now();
    watchTimer = setInterval(() => {
      if (!needsBackgroundWatch()) {
        clearInterval(watchTimer);
        watchTimer = undefined;
        return;
      }
      if (hasRunningBackground()) {
        if (backgroundSwitchedOff()) stopBackground("serving_off");
        serving.reevaluate();
      }
      if (
        Date.now() - lastBoundCheckMs >=
        (options.backgroundBoundRecheckMs ?? BACKGROUND_BOUND_RECHECK_MS)
      ) {
        lastBoundCheckMs = Date.now();
        recheckWorkerBound();
      }
    }, options.backgroundWatchMs ?? BACKGROUND_WATCH_INTERVAL_MS);
    watchTimer.unref();
  };
  let withBackgroundShellPolicy = (deps) => {
    let backgroundShells = deps.policy.backgroundShells;
    return backgroundShells === undefined
      ? deps
      : {
          ...deps,
          policy: {
            ...deps.policy,
            backgroundShells: {
              ...backgroundShells,
              enabled: () =>
                options.stillBound !== undefined && backgroundShells.enabled() && !backgroundSwitchedOff(),
            },
          },
        };
  };
  let serving = {
    sessionId: options.sessionId,
    instanceId: options.instanceId,
    serveSessionToolCall: async (
      request,
      { signal, requestId, ageMs, workerEpoch, attestationStatus, modeStamp },
    ) => {
      let kitRef = kit;
      if (kitRef === undefined || !isOurRequest(request)) return;
      let { kit: kit_2 } = kitRef;
      let attestation = attestationFor(attestationStatus);
      let knownCall =
        request.request.ok && request.request.kind === "call"
          ? kit_2.deps.sessions
              .peek(
                callerKey({
                  sessionId: options.sessionId,
                }),
              )
              ?.calls.lookup(request.request.value.call_id)
          : undefined;
      let answeredBefore =
        request.request.ok &&
        (request.request.kind === "outcome_query" ||
          (isCallQuery(request)
            ? knownCall !== undefined
            : knownCall !== undefined && knownCall.summary.state !== "asked"));
      let ageWindowMs = isCallQuery(request) ? OUTCOME_QUERY_AGE_WINDOW_MS : DEFAULT_CALL_AGE_WINDOW_MS;
      let stale =
        answeredBefore || isWithinAgeWindow(request, ageMs, ageWindowMs)
          ? undefined
          : {
              ageMs,
              windowMs: request.deadline_ms + ageWindowMs,
            };
      let unattested = isBelowFloorEnforced(attestation);
      let untrustedRepositories = unattested ? await resolveRepositoryTrust() : undefined;
      let localName = kitRef.source?.localNameFor(request.name);
      let [toolName, serveDeps] =
        localName !== undefined ? [localName, kit_2.deps] : [request.name, stripServingDeps(kit_2.deps)];
      let serveCall = (signal) =>
        serveRemoteToolCall(
          toolName,
          {
            ...request.input,
          },
          request.request,
          {
            sessionId: options.sessionId,
            signal,
            workerEpoch,
          },
          withBackgroundShellPolicy(serveDeps),
          "session",
          {
            stale,
            attestation,
            unattested,
            untrustedRepositories,
            modeStamp,
          },
        )
          .then((result) => {
            startBackgroundWatch();
            return checkReencodedResultSize(kit_2.description, request.tool_use_id, result);
          })
          .catch((error) => internalErrorCallResult(kit_2.description, request.tool_use_id, error));
      return answerDeduper.answer(requestId, async () => {
        if (!isViolinFinetunerEnabled())
          return {
            result: await serveCall(signal),
          };
        let abortController = new AbortController();
        activeCallControllers.add(abortController);
        startBackgroundWatch();
        try {
          return {
            result: await serveCall(AbortSignal.any([signal, abortController.signal])),
          };
        } finally {
          activeCallControllers.delete(abortController);
        }
      });
    },
    servePlumbingCall: async (request, { signal, requestId, ageMs, attestationStatus }) => {
      let plumbing = options.plumbing;
      let isPlumbingCall = plumbing !== undefined && plumbing.names().includes(request.name);
      if (!isOurRequest(request)) return;
      let logPlumbing = (fields, attestation) =>
        logPlumbingCallTelemetry(fields, request, requestId, attestation);
      if (!isPlumbingCall || plumbing === undefined)
        return answerDeduper.answer(requestId, async () => {
          logPlumbing(
            {
              outcome: "not_served",
            },
            safeJudgeSender(attestationStatus),
          );
          return {
            result: errorTextResult(`${request.name}: ${NOT_SERVED_HERE_TEXT}`),
          };
        });
      if (!isWithinAgeWindow(request, ageMs, PLUMBING_CALL_AGE_WINDOW_MS)) {
        logForDebugging(
          ageMs === undefined
            ? `[remote-tools] a ${request.name} plumbing call could not be dated against the service clock (no Date header on this stream) and was not served`
            : `[remote-tools] a ${request.name} plumbing call delivered ${ageMs} ms after it was stored, past its ${request.deadline_ms} ms window, was not served`,
        );
        logPlumbing(
          {
            outcome: "stale",
            dated: ageMs !== undefined,
          },
          safeJudgeSender(attestationStatus),
        );
        return;
      }
      let attestation = attestationFor(attestationStatus);
      if (attestation !== undefined && isBelowFloorEnforced(attestation))
        return answerDeduper.answer(requestId, async () => {
          logPlumbing(
            {
              outcome: "held_back",
            },
            attestation,
          );
          let text = `${request.name}: ${unattestedSenderMessage({
            targetName: kit?.kit.description.name ?? request.host,
            status: attestation.status,
            subtype: "remote_plumbing_call",
          })}`;
          return {
            result: plumbing.heldBack(request.name, text) ?? errorTextResult(text),
          };
        });
      return answerDeduper.answer(requestId, () =>
        Promise.resolve()
          .then(() => {
            kit?.kit.ensureSettingsHeld();
            return plumbing.serve(request, signal);
          })
          .then((result) => {
            logPlumbing(
              {
                outcome: "served",
              },
              attestation,
            );
            return result;
          })
          .catch((error) => {
            logError(
              withTelemetryMessage(toError(error), `session serving: plumbing call ${request.name} threw`),
            );
            logPlumbing(
              {
                outcome: "threw",
              },
              attestation,
            );
            return {
              result: errorTextResult(`${request.name}: could not be served (internal error)`),
            };
          }),
      );
    },
    answerProbe: () =>
      kit === undefined
        ? undefined
        : {
            result: {
              epoch: kit.kit.deps.sessions.epoch,
            },
          },
    servedTools: describeServedTools,
    onServedToolsChanged: (listener) => signal.subscribe(listener),
    reevaluate: () => {
      if (disposed) return;
      let wasClosed = closed;
      try {
        let nextOffReason = readOffReason();
        closed = false;
        let previousOffReason = currentOffReason;
        launchedFromHome ||= nextOffReason === "launched_from_home";
        currentOffReason =
          launchedFromHome && nextOffReason === undefined ? "launched_from_home" : nextOffReason;
        if (currentOffReason !== previousOffReason)
          logServingChange(
            currentOffReason,
            wasClosed ? "serving_check_failed" : (previousOffReason ?? "none"),
          );
        showProfileNotice(nextOffReason);
        showMountNotice(nextOffReason);
        if (!noticeShown) showOffNotice(currentOffReason);
        else if (currentOwner().owner) {
          if (currentOffReason === "muted" && previousOffReason !== "muted")
            emitNotice(SERVING_MUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.muted"]);
          else if (previousOffReason === "muted" && currentOffReason === undefined)
            emitNotice(SERVING_UNMUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_on.unmuted"]);
          else if (
            (previousOffReason === "muted" ||
              previousOffReason === "profile_dirs_unread" ||
              previousOffReason === "profile_dirs_unreadable" ||
              previousOffReason === "mount_table_unreadable") &&
            isPersonFixableOffReason(currentOffReason)
          )
            emitNotice(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
        }
        if (currentOffReason !== undefined || !currentOwner().owner) {
          stopBackground(currentOffReason !== undefined ? "serving_off" : "serving_ended");
          withdrawSessionAsks();
        }
        if (snapshotServedTools() !== lastServedSnapshot) emitServedToolsChanged();
        if (wasClosed)
          safely(() =>
            logEvent("tengu_remote_tool_serving", {
              event: lit("serving_check_recovered"),
            }),
          );
      } catch (error) {
        logError(toError(error));
        onCheckFailed(wasClosed);
      }
    },
    heldServedCall: (callId) =>
      disposed || kit === undefined || isOff() || !currentOwner().owner
        ? NOT_HELD_LEASE
        : kit.kit.heldServedCall(callId),
    noteUnlistedKind: (kindInfo) => {
      if (disposed || kit === undefined || !currentOwner().owner) return;
      kit.kit.deps.callLog?.note({
        t: "refused_request",
        caller: callerKey({
          sessionId: options.sessionId,
        }),
        what: "kind",
        length: kindInfo.length,
        name_hash: kindInfo.hash,
        variant_of_listed: kindInfo.variantOfListed,
      });
    },
    announcesPassthrough: () => adoptedFromHost,
    dispose: () => {
      if (disposed) return;
      stopBackground("serving_ended");
      disposed = true;
      clearInterval(watchTimer);
      kit?.release();
      emitServedToolsChanged();
      signal.clear();
    },
    workerGone: recheckWorkerBound,
    hasBackgroundWork: hasRunningBackground,
  };
  return serving;
};
var buildAnnouncePayload = (servedTools, instanceId, workerEpoch) => ({
  instance_id: instanceId,
  ...(workerEpoch !== undefined && {
    worker_epoch: workerEpoch,
  }),
  host: servedTools.host,
  tools: servedTools.tools,
  passthrough: servedTools.passthrough ?? [],
  plumbing: servedTools.plumbing,
});
//@ chunk-012rhzq5.js:26945-27016 placement
function stripServingDeps({ servedMcpTools, servedMcpWireArguments, ...rest }) {
  return rest;
}
//@ chunk-012rhzq5.js:27016-27186 placement
function createAnswerDeduper() {
  let inFlight = new Map();
  return {
    answer: (key, run) => {
      if (key === undefined) return run();
      let existing = inFlight.get(key);
      if (existing !== undefined) return existing;
      let promise = run().finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
      return promise;
    },
  };
}
//@ chunk-012rhzq5.js:27186-27250 placement
async function checkReencodedResultSize(target, callId, result) {
  return checkServedResultSize(
    target,
    callId,
    await reencodeServedImage(withCallIdInEnvelope(callId, result), servedAnswerLimitBytes()),
  );
}
//@ chunk-012rhzq5.js:27250-27434 placement
function withCallIdInEnvelope(callId, result) {
  let callResult = readCallResult(result);
  if (callResult.envelope.status !== "present" || callResult.envelope.envelope.call_id !== undefined)
    return result;
  return buildRemoteToolCallResult({
    envelope: {
      ...callResult.envelope.envelope,
      call_id: callId,
    },
    content: callResult.content,
  });
}
//@ chunk-012rhzq5.js:27434-28148 placement
function checkServedResultSize(target, callId, result) {
  let size = byteLengthOf(result);
  let limit = servedAnswerLimitBytes();
  if (size <= limit) return result;
  let callResult = readCallResult(result);
  let envelope = callResult.envelope.status === "present" ? callResult.envelope.envelope : undefined;
  let sizeText = `(${formatMegabytes(size)}) is larger than this session can carry back (limit ${formatMegabytes(limit)}), so it was not returned.`;
  let message =
    envelope?.outcome === "completed"
      ? `The command ran to completion on ${target.name}, but its result ${sizeText} Its effects stand \u2014 do not re-run it to see the output; run a narrower command instead (head or tail, a filter, or write to a file and read part of it).`
      : `${target.name} answered this call, but the answer ${sizeText}`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      call_id: callId,
      target: {
        name: target.name,
        working_dir: target.working_dir,
      },
      code: "tool_error",
      message,
      ...(envelope !== undefined && replayedFields(envelope)),
    },
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  });
}
//@ chunk-012rhzq5.js:28148-28213 placement
function errorTextResult(text) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    isError: true,
  };
}
//@ chunk-012rhzq5.js:28213-28265 placement
function formatMegabytes(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
//@ chunk-012rhzq5.js:28265-28611 placement
/**
 * 服务调用抛异常时构造内部错误结果，并记录调试日志与错误。
 */
function internalErrorCallResult(description, toolUseId, error) {
  logForDebugging(`session serving: served call ${toolUseId} threw`, {
    level: "error",
  });
  logError(toError(error));
  let message = `${description.name} could not serve this call (internal error); nothing is known to have run.`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      call_id: toolUseId,
      target: {
        name: description.name,
        working_dir: description.working_dir,
      },
      code: "internal_error",
      message,
    },
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  });
}
//@ chunk-012rhzq5.js:28611-30566 placement
function remoteToolServingOffReason({
  owner,
  cloudClient,
  deviceBridge,
  onNotice,
  repositoryTrust,
  plumbing,
  signals,
  stillBound,
}) {
  let bindingOff = deviceBindingOffReason() ?? (isViolinWoodEnabledCached() ? undefined : "flag_off");
  let cloudOff = bindingOff === undefined && cloudClient && !isViolinWillowEnabledCached();
  if (cloudOff)
    logEvent("tengu_remote_tool_serving", {
      event: lit("gate_off"),
      served_tool_count: 0,
      reason: lit("flag_off"),
      flag: fromEnum(VIOLIN_WILLOW_FLAG),
      own_flags_loaded: hasFreshGrowthBookFeatures(),
      transport: lit("session"),
    });
  if (bindingOff !== undefined || cloudOff) {
    logForDebugging(
      `[servedTools] not served over the session channel: ${bindingOff ?? `flag_off (${VIOLIN_WILLOW_FLAG})`}`,
    );
    return;
  }
  let watchRevocation = watchServingRevocation(cloudClient, signals);
  let answered = !cloudClient;
  let heldSinceMs;
  let markAnswered = () => {
    if (!answered && isCloudClientToolServingAnsweredOn()) {
      answered = true;
      if (heldSinceMs !== undefined)
        logEvent("tengu_remote_tool_serving", {
          event: lit("own_flag_answered_on"),
          held_ms: Math.round(performance.now() - heldSinceMs),
          transport: lit("session"),
        });
    }
    return answered;
  };
  let serving;
  let buildSessionToolServing = (options, owner) => {
    let sessionToolServing = createSessionToolServing({
      ...options,
      owner: ownerUnlessServingOff(owner, cloudClient, markAnswered),
      ...(deviceBridge && {
        serving: deviceBridge.serving,
      }),
      ...(plumbing && {
        plumbing,
      }),
      ...(repositoryTrust && {
        repositoryTrust: () => repositoryTrust.refresh(),
      }),
      ...(stillBound && {
        stillBound,
      }),
    });
    serving = sessionToolServing;
    if (
      !markAnswered() &&
      heldSinceMs === undefined &&
      servingOffReasonNow(cloudClient) === undefined &&
      owner().owner
    ) {
      heldSinceMs = performance.now();
      logForDebugging(
        "[servedTools] held: tool serving's flag is saved on, and the flag service has not answered this process yet",
      );
      logEvent("tengu_remote_tool_serving", {
        event: lit("own_flag_unanswered"),
        served_tool_count: 0,
        transport: lit("session"),
      });
    }
    let stopWatching = watchRevocation((revocation) => {
      let flag = fromEnumOpt(
        getToolServingFlagAnsweredOff({
          cloudClient,
        }),
      );
      if (heldSinceMs !== undefined && !answered && revocation === "flag_off")
        logEvent("tengu_remote_tool_serving", {
          event: lit("own_flag_answered_off"),
          flag,
          held_ms: Math.round(performance.now() - heldSinceMs),
          transport: lit("session"),
        });
      else if (cloudClient && answered && revocation === "flag_off" && owner().owner)
        logEvent("tengu_remote_tool_serving", {
          event: lit("own_flag_turned_off"),
          flag,
          transport: lit("session"),
        });
      sessionToolServing.reevaluate();
    });
    let stopMuteRecheck = (signals?.onMuteRecheck ?? onServingMuteRecheck)(() =>
      sessionToolServing.reevaluate(),
    );
    let stopProfileDirsWait = onWindowsProfileDirsSettled(() => sessionToolServing.reevaluate());
    return {
      ...sessionToolServing,
      dispose: () => {
        stopProfileDirsWait();
        stopMuteRecheck();
        stopWatching();
        sessionToolServing.dispose();
      },
    };
  };
  return {
    createServingContext:
      owner instanceof Promise
        ? async (resolvedOptions) => {
            await primeWindowsProfileDirs();
            await primeWindowsPlatform();
            return buildSessionToolServing(resolvedOptions, await owner);
          }
        : (options) => {
            let pendingOwner =
              pendingWindowsProfileDirsRead() ??
              (isWindowsOrPowerShellHost() ? undefined : primeWindowsPlatform());
            return pendingOwner === undefined
              ? buildSessionToolServing(options, owner)
              : pendingOwner
                  .then(() => primeWindowsPlatform())
                  .then(() => buildSessionToolServing(options, owner));
          },
    buildAnnounce: buildAnnouncePayload,
    ...(deviceBridge && {
      onAnnounceOutcome: (outcome) =>
        deviceBridge.announceSettled(
          outcome.kind === "announced" && serving?.announcesPassthrough?.() !== true
            ? {
                kind: outcome.kind,
                status: outcome.status,
              }
            : outcome,
        ),
    }),
    ...(onNotice && {
      onNotice,
    }),
    onRevoked: watchRevocation,
  };
}
//@ chunk-012rhzq5.js:30566-30622 placement
/**
 * 导出函数 `deviceBindingOffReason`：返回 getDeviceBindingRefusal() ?? (isSessionChannelDisabled() ? "channel_off" : void 0)。
 */
function deviceBindingOffReason() {
  return getDeviceBindingRefusal() ?? (isSessionChannelDisabled() ? "channel_off" : undefined);
}
//@ chunk-012rhzq5.js:30622-30701 placement
function servingOffReasonNow(cloudClient) {
  return (
    getDeviceBindingRefusal() ??
    (getToolServingFlagAnsweredOff({
      cloudClient,
    }) === undefined
      ? undefined
      : "flag_off")
  );
}
//@ chunk-012rhzq5.js:30701-31007 placement
/**
 * 监听合规与开关变化，必要时撤销会话服务。
 */
function watchServingRevocation(
  cloudClient,
  { onEgressChange = onComplianceTaintsChanged, onGateChange = onGrowthBookRefresh } = {},
) {
  return (onRevoked) => {
    let revoked = false;
    let listeners = [];
    let fire = () => {
      revoked = true;
      listeners.splice(0).forEach((listener) => listener());
    };
    let check = () => {
      let reason = servingOffReasonNow(cloudClient);
      if (revoked || reason === undefined) return;
      fire();
      try {
        onRevoked(reason);
      } catch (error) {
        logForDebugging(`[servedTools] a revocation listener threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    };
    listeners.push(onEgressChange(check));
    listeners.push(onGateChange(check));
    check();
    return fire;
  };
}
//@ chunk-012rhzq5.js:31007-31071 placement
function ownerUnlessServingOff(owner, cloudClient, stillBound) {
  return () =>
    servingOffReasonNow(cloudClient) === undefined && stillBound()
      ? owner()
      : {
          owner: false,
        };
}
export { remoteToolServingOffReason, deviceBindingOffReason };
