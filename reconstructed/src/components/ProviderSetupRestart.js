/**
 * components/ProviderSetupRestart.tsx
 *
 * 2.1.316 新增：切换 API 提供方后的设置向导与重启
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9c09fw6j.js (7)
 * attribution: placement 7
 */
import { init_react_production, y, R } from "../../vendor/react/cjs/react.production.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-9c09fw6j.js:1061-1065 placement
init_react_production();
//@ chunk-9c09fw6j.js:1065-1325 placement
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
      ].map((o) => o ?? "").join(`
`),
    ),
  };
}
//@ chunk-9c09fw6j.js:1325-1866 placement
function isProviderUnchanged(o, p) {
  let g = currentProviderSnapshot();
  let c =
    o.provider === p &&
    g.provider === o.provider &&
    g.awsRegion === o.awsRegion &&
    g.vertexRegion === o.vertexRegion &&
    g.vertexProjectId === o.vertexProjectId &&
    g.accountDigest === o.accountDigest;
  logForDebugging(
    `Provider-setup restart: ${c ? "carrying" : "dropping"} the model pick (launched on ${o.provider} ${o.awsRegion}/${o.vertexRegion}/${o.vertexProjectId || "no-project"}, now ${g.provider} ${g.awsRegion}/${g.vertexRegion}/${g.vertexProjectId || "no-project"}${g.accountDigest === o.accountDigest ? "" : ", credentials changed"}, target ${p})`,
  );
  return c;
}
//@ chunk-9c09fw6j.js:1866-1941 placement
var SETTINGS_SAVED_RESTART_TEXT = "Your settings were saved \u2014 restart Claude Code to apply them.";
//@ chunk-9c09fw6j.js:1941-2619 placement
/**
 * 切换 API 提供方后尝试重启会话：后台会话或受限启动时拒绝并给出原因。
 */
async function restartWithProvider(context, targetProvider, g) {
  try {
    if (isBgSession()) return `A background session can't restart itself. ${SETTINGS_SAVED_RESTART_TEXT}`;
    if (getBgTakeover() !== null)
      return `Claude can't restart itself from inside the agents view. ${SETTINGS_SAVED_RESTART_TEXT}`;
    let c = restrictedLaunchReason(context);
    if (c !== undefined) return c;
    if (isTerminalShutdown()) return;
    await ensureLauncherRunnable();
    await saveResumePoint(submittedMessages(context), context.storageV5);
    if (isTerminalShutdown()) return;
    let m = restrictedLaunchReason(context);
    if (m !== undefined) return m;
    let toolPermissionContext = getToolPermissionContext(context);
    let C = await confirmRelaunch(
      submittedMessages(context),
      "relaunch",
      {
        responseStreaming: isMidTurnStreaming(context),
      },
      context.storageV5,
    );
    await relaunchOrExplain(
      C,
      {
        freshIfNoTranscript: true,
        extraArgs: [
          ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(context), {
            carryModel: isProviderUnchanged(g, targetProvider),
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
//@ chunk-9c09fw6j.js:2619-2921 placement
function restrictedLaunchReason(o) {
  let p = listUncarriedLaunchSettings(getToolPermissionContext(o), getForkRestrictedLaunchConfig());
  if (p.length > 0)
    return `This session has restrictions a restart can't carry over (${p.join("; ")}). ${SETTINGS_SAVED_RESTART_TEXT}`;
  if (hasRunningBackgroundTask(o.taskRegistry.all()))
    return `Work is running in the background, and restarting would orphan it (wait for it to finish, or stop it via /tasks). ${SETTINGS_SAVED_RESTART_TEXT}`;
  return;
}
//@ chunk-9c09fw6j.js:2921-4088 placement
function ProviderSetupWizard(props) {
  let u = w(21);
  let { Wizard, cancelledEvent, targetProvider, onDone, context } = props;
  let [C, Z] = y(null);
  let [I] = y(currentProviderSnapshot);
  let T = R(false);
  let [_, F] = y(false);
  let V;
  if (u[0] !== context || u[1] !== I || u[2] !== onDone || u[3] !== targetProvider) {
    V = () => {
      if (T.current) {
        return;
      }
      T.current = true;
      F(true);
      restartWithProvider(context, targetProvider, I).then((z) => {
        if (z !== undefined) {
          T.current = false;
          F(false);
          onDone(z, {
            display: "system",
          });
        }
      });
    };
    u[0] = context;
    u[1] = I;
    u[2] = onDone;
    u[3] = targetProvider;
    u[4] = V;
  } else V = u[4];
  const isActive = C !== null;
  let G;
  if (u[5] !== isActive) {
    G = {
      context: "Confirmation",
      isActive,
    };
    u[5] = isActive;
    u[6] = G;
  } else G = u[6];
  useKeybinding("confirm:yes", V, G);
  if (C !== null) {
    let P;
    if (u[7] !== C) {
      P = jsxProd_default(Text, {
        color: "success",
        children: C,
      });
      u[7] = C;
      u[8] = P;
    } else P = u[8];
    let f;
    if (u[9] !== _) {
      f = _
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
      u[9] = _;
      u[10] = f;
    } else f = u[10];
    let k;
    if (u[11] !== P || u[12] !== f) {
      k = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        marginTop: 1,
        children: [P, f],
      });
      u[11] = P;
      u[12] = f;
      u[13] = k;
    } else k = u[13];
    return k;
  }
  let onComplete;
  if (u[14] === MEMO_CACHE_SENTINEL) {
    onComplete = (ee) => Z(ee);
    u[14] = onComplete;
  } else onComplete = u[14];
  let onCancel;
  if (u[15] !== cancelledEvent || u[16] !== onDone) {
    onCancel = () => {
      logEvent(cancelledEvent, {});
      onDone();
    };
    u[15] = cancelledEvent;
    u[16] = onDone;
    u[17] = onCancel;
  } else onCancel = u[17];
  let k;
  if (u[18] !== Wizard || u[19] !== onCancel) {
    k = jsxProd_default(Wizard, {
      onComplete,
      onCancel,
    });
    u[18] = Wizard;
    u[19] = onCancel;
    u[20] = k;
  } else k = u[20];
  return k;
}
export { ProviderSetupWizard };
