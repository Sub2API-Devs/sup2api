/**
 * components/ProviderSetupRestart.tsx
 *
 * 2.1.316 新增：切换 API 提供方后的设置向导与重启
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q7tnebyw.js (7)
 * attribution: placement 7
 */
import { init_react_production, useState, useRef } from "../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getAwsRegionSync } from "../utils/awsRegion.js";
import { getDefaultVertexRegion } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { shortHash } from "../utils/shortHash.js";
import { logForDebugging } from "../utils/debug.js";
import { isBgSession, getBgTakeover } from "../utils/concurrentSessions.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import {
  ensureLauncherRunnable,
  saveResumePoint,
  confirmRelaunch,
  relaunchOrExplain,
} from "../utils/processRelaunch.js";
import { submittedMessages, isMidTurnStreaming } from "../utils/promptSubmissionOrigin.js";
import { getToolPermissionContext, getSessionEffort } from "../utils/permissions/toolPermissionContext.js";
import {
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  listUncarriedLaunchSettings,
} from "../services/daemon/relaunchArgs.js";
import { getForkReplayLaunchConfig, getForkRestrictedLaunchConfig } from "../bootstrap/state.js";
import { getScreenReaderEnv } from "../utils/accessibility/screenReader.js";
import { logError } from "../utils/log.js";
import { toError, errorMessage } from "../utils/errors.js";
import { hasRunningBackgroundTask } from "../tasks/backgroundTaskLabels.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-q7tnebyw.js:1059-1063 placement
init_react_production();
//@ chunk-q7tnebyw.js:1063-1323 placement
function currentProviderSnapshot() {
  return {
    provider: getAPIProvider(),
    awsRegion: getAwsRegionSync(),
    vertexRegion: getDefaultVertexRegion(),
    vertexProjectId: env.ANTHROPIC_VERTEX_PROJECT_ID ?? "",
    accountDigest: shortHash(
      [
        env.AWS_PROFILE,
        env.AWS_BEARER_TOKEN_BEDROCK,
        env.AWS_ACCESS_KEY_ID,
        env.GOOGLE_APPLICATION_CREDENTIALS,
      ].map((digestKeys) => digestKeys ?? "").join(`
`),
    ),
  };
}
//@ chunk-q7tnebyw.js:1323-1864 placement
function isProviderUnchanged(before, after) {
  let current = currentProviderSnapshot();
  let isSame =
    before.provider === after &&
    current.provider === before.provider &&
    current.awsRegion === before.awsRegion &&
    current.vertexRegion === before.vertexRegion &&
    current.vertexProjectId === before.vertexProjectId &&
    current.accountDigest === before.accountDigest;
  logForDebugging(
    `Provider-setup restart: ${isSame ? "carrying" : "dropping"} the model pick (launched on ${before.provider} ${before.awsRegion}/${before.vertexRegion}/${before.vertexProjectId || "no-project"}, now ${current.provider} ${current.awsRegion}/${current.vertexRegion}/${current.vertexProjectId || "no-project"}${current.accountDigest === before.accountDigest ? "" : ", credentials changed"}, target ${after})`,
  );
  return isSame;
}
//@ chunk-q7tnebyw.js:1864-1939 placement
var SETTINGS_SAVED_RESTART_TEXT = "Your settings were saved \u2014 restart Claude Code to apply them.";
//@ chunk-q7tnebyw.js:1939-2616 placement
/**
 * 切换 API 提供方后尝试重启会话：后台会话或受限启动时拒绝并给出原因。
 */
async function restartWithProvider(context, after, nextProvider) {
  try {
    if (isBgSession()) return `A background session can't restart itself. ${SETTINGS_SAVED_RESTART_TEXT}`;
    if (getBgTakeover() !== null)
      return `Claude can't restart itself from inside the agents view. ${SETTINGS_SAVED_RESTART_TEXT}`;
    let restriction = restrictedLaunchReason(context);
    if (restriction !== undefined) return restriction;
    if (isTerminalShutdown()) return;
    await ensureLauncherRunnable();
    await saveResumePoint(submittedMessages(context), context.storageV5);
    if (isTerminalShutdown()) return;
    let blockedReason = restrictedLaunchReason(context);
    if (blockedReason !== undefined) return blockedReason;
    let toolPermissionContext = getToolPermissionContext(context);
    let confirmed = await confirmRelaunch(
      submittedMessages(context),
      "relaunch",
      {
        responseStreaming: isMidTurnStreaming(context),
      },
      context.storageV5,
    );
    await relaunchOrExplain(
      confirmed,
      {
        freshIfNoTranscript: true,
        extraArgs: [
          ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(context), {
            carryModel: isProviderUnchanged(nextProvider, after),
          }),
          ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
        ],
        proactivity: {
          proactivityLevel: context.getProactivityLevel(),
          toolPermissionContext,
        },
        env: getScreenReaderEnv(),
      },
      context.storageV5,
    );
    return;
  } catch (error) {
    logError(toError(error));
    return `Couldn't restart Claude Code (${errorMessage(error)}). ${SETTINGS_SAVED_RESTART_TEXT}`;
  }
}
//@ chunk-q7tnebyw.js:2616-2917 placement
function restrictedLaunchReason(context) {
  let reasons = listUncarriedLaunchSettings(
    getToolPermissionContext(context),
    getForkRestrictedLaunchConfig(),
  );
  if (reasons.length > 0)
    return `This session has restrictions a restart can't carry over (${reasons.join("; ")}). ${SETTINGS_SAVED_RESTART_TEXT}`;
  if (hasRunningBackgroundTask(context.taskRegistry.all()))
    return `Work is running in the background, and restarting would orphan it (wait for it to finish, or stop it via /tasks). ${SETTINGS_SAVED_RESTART_TEXT}`;
  return;
}
//@ chunk-q7tnebyw.js:2917-4084 placement
function ProviderSetupWizard(props) {
  let $ = useMemoCache(21);
  let { Wizard, cancelledEvent, targetProvider, onDone, context } = props;
  let [provider, setProvider] = useState(null);
  let [initialSnapshot] = useState(currentProviderSnapshot);
  let didSubmitRef = useRef(false);
  let [isCancelled, setIsCancelled] = useState(false);
  let submit;
  if ($[0] !== context || $[1] !== initialSnapshot || $[2] !== onDone || $[3] !== targetProvider) {
    submit = () => {
      if (didSubmitRef.current) {
        return;
      }
      didSubmitRef.current = true;
      setIsCancelled(true);
      restartWithProvider(context, targetProvider, initialSnapshot).then((result) => {
        if (result !== undefined) {
          didSubmitRef.current = false;
          setIsCancelled(false);
          onDone(result, {
            display: "system",
          });
        }
      });
    };
    $[0] = context;
    $[1] = initialSnapshot;
    $[2] = onDone;
    $[3] = targetProvider;
    $[4] = submit;
  } else submit = $[4];
  const isActive = provider !== null;
  let error;
  if ($[5] !== isActive) {
    error = {
      context: "Confirmation",
      isActive,
    };
    $[5] = isActive;
    $[6] = error;
  } else error = $[6];
  useKeybinding("confirm:yes", submit, error);
  if (provider !== null) {
    let textElement;
    if ($[7] !== provider) {
      textElement = jsxProd_default(Text, {
        color: "success",
        children: provider,
      });
      $[7] = provider;
      $[8] = textElement;
    } else textElement = $[8];
    let restartTextElement;
    if ($[9] !== isCancelled) {
      restartTextElement = isCancelled
        ? jsxProd_default(Text, {
            dimColor: true,
            children: "Restarting Claude Code\u2026",
          })
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Press ",
              jsxProd_default(Text, {
                bold: true,
                children: "Enter",
              }),
              " to restart Claude Code.",
            ],
          });
      $[9] = isCancelled;
      $[10] = restartTextElement;
    } else restartTextElement = $[10];
    let boxElement;
    if ($[11] !== textElement || $[12] !== restartTextElement) {
      boxElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        marginTop: 1,
        children: [textElement, restartTextElement],
      });
      $[11] = textElement;
      $[12] = restartTextElement;
      $[13] = boxElement;
    } else boxElement = $[13];
    return boxElement;
  }
  let onComplete;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    onComplete = (nextProvider) => setProvider(nextProvider);
    $[14] = onComplete;
  } else onComplete = $[14];
  let onCancel;
  if ($[15] !== cancelledEvent || $[16] !== onDone) {
    onCancel = () => {
      logEvent(cancelledEvent, {});
      onDone();
    };
    $[15] = cancelledEvent;
    $[16] = onDone;
    $[17] = onCancel;
  } else onCancel = $[17];
  let wizardElement;
  if ($[18] !== Wizard || $[19] !== onCancel) {
    wizardElement = jsxProd_default(Wizard, {
      onComplete,
      onCancel,
    });
    $[18] = Wizard;
    $[19] = onCancel;
    $[20] = wizardElement;
  } else wizardElement = $[20];
  return wizardElement;
}
export { ProviderSetupWizard };
