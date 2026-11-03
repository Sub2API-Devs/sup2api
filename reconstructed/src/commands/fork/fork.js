/**
 * commands/fork/fork.tsx
 *
 * 2.1.316 新增。/fork 命令：从当前会话分叉新会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cc2xzzcg.js (1), chunk-d62reftv.js (7)
 * attribution: placement 8
 */
import { init_react_production, R, P } from "../../../vendor/react/cjs/react.production.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import {
  COORDINATOR_FORK_REFUSAL,
  deriveBackgroundSeed,
  spawnBackgroundFork,
} from "../../utils/background/spawnBackgroundFork.js";
import { isTranscriptPersistenceDisabled } from "../../utils/sessionStorage.js";
import { isSafeMode, isBareMode } from "../../utils/envUtils.js";
import { getForkRestrictedLaunchConfig } from "../../bootstrap/state.js";
import { FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION } from "../../utils/sessionConfigFlags.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { getPermissionModeCycle, evaluateAskingNoHost } from "../../utils/permissions/permissions.js";
import { promptProactivityLevel } from "../../utils/proactivityLevel.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import {
  normalizeStatusSegments,
  SESSION_RUNNING_LABEL,
  SESSION_WAITING_PROMPT_LABEL,
  offerDedupeKey,
} from "../../components/rateLimit/usageCreditsOffer.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { LISTAGENTS } from "../../tools/SendMessageTool/listAgents.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text } from "../../ink/components/Text.js";
import { spawnForkFromDirective } from "../../tools/AgentTool/forkDirective.js";
import { CIRCLE_MARK_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-d62reftv.js:15768-15772 placement
init_react_production();
//@ chunk-d62reftv.js:15772-15812 placement
function selectSessionEffort(ce) {
  return ce.sessionEffort;
}
//@ chunk-d62reftv.js:15812-15889 placement
function selectToolPermissionContextAdditionalWorkingDirectories(he) {
  return he.toolPermissionContext.additionalWorkingDirectories;
}
//@ chunk-d62reftv.js:15889-15954 placement = createGetAppStateWithAllowedTools (1)
function getAlwaysAllowRules(appState) {
  return appState.toolPermissionContext.alwaysAllowRules;
}
//@ chunk-d62reftv.js:15954-16018 placement
function selectToolPermissionContextAlwaysDenyRules(ye) {
  return ye.toolPermissionContext.alwaysDenyRules;
}
//@ chunk-d62reftv.js:16018-16747 placement
/**
 * /fork 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var forkCommandCall = async (onDone, context, args) => {
  if (isCoordinatorMode_2()) {
    onDone(COORDINATOR_FORK_REFUSAL, {
      display: "system",
    });
    return null;
  }
  if (isTranscriptPersistenceDisabled()) {
    onDone(
      "Can't fork: session persistence is off, so the new session would have nothing to start from. Run the task here, or fork from a session that saves its transcript.",
    );
    return null;
  }
  if (isSafeMode() || isBareMode() || getForkRestrictedLaunchConfig()) {
    onDone(
      `Can't fork: this session was started with launch flags (safe or bare mode, ${FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION}) that the copy wouldn't inherit, so it would run with fewer restrictions than this session. Run the task here, or start a session without those flags and fork from there.`,
    );
    return null;
  }
  let trimmed = (args ?? "").trim();
  let backgroundSeed = deriveBackgroundSeed(context.messages, trimmed, "(forked)");
  if (backgroundSeed === null) {
    onDone("Nothing to fork yet. Send a message first.");
    return null;
  }
  return jsxProd_default(ForkSessionFlow, {
    onDone,
    prompt: trimmed,
    seed: backgroundSeed,
    messages: context.messages,
  });
};
//@ chunk-d62reftv.js:16747-18564 placement
function ForkSessionFlow(props) {
  let $ = w(14);
  let { onDone, prompt, seed, messages } = props;
  let appState = useAppState(selectSessionEffort);
  let appState_2 = useAppState(getPermissionModeCycle);
  let appState_3 = useAppState(promptProactivityLevel);
  let appState_4 = useAppState(selectToolPermissionContextAdditionalWorkingDirectories);
  let appState_5 = useAppState(getAlwaysAllowRules);
  let appState_6 = useAppState(selectToolPermissionContextAlwaysDenyRules);
  let { storageV5 } = useTheme_2();
  let U = R(false);
  let K;
  let q;
  if (
    $[0] !== appState_4 ||
    $[1] !== appState_5 ||
    $[2] !== appState_6 ||
    $[3] !== messages ||
    $[4] !== onDone ||
    $[5] !== appState_2 ||
    $[6] !== appState_3 ||
    $[7] !== prompt ||
    $[8] !== seed ||
    $[9] !== appState ||
    $[10] !== storageV5
  ) {
    K = () => {
      if (U.current) {
        return;
      }
      U.current = true;
      (async () => {
        let backgroundFork = await spawnBackgroundFork(
          seed,
          prompt || null,
          appState,
          appState_2,
          appState_4,
          appState_5,
          appState_6,
          "fork_session",
          messages,
          {
            proactivityLevel: appState_3,
            keepParent: true,
            taskFreeInFlight: {
              tasks: 0,
              queued: 0,
              kinds: [],
            },
            storageV5,
          },
        );
        if (!backgroundFork.ok) {
          logFeatureBad("repl_session_fork", backgroundFork.reason ?? "spawn_failed");
          onDone(backgroundFork.error);
          return;
        }
        logFeatureOk("repl_session_fork");
        logEvent("tengu_session_fork", {
          had_prompt: prompt.length > 0,
          message_count: messages.length,
          had_worktree: backgroundFork.hadWorktree,
          relocated: backgroundFork.relocatedTo !== undefined,
          ...(backgroundFork.relocatedFrom && {
            relocated_from: fromEnum(backgroundFork.relocatedFrom),
          }),
          ...(backgroundFork.sessionId && {
            child_session_hash: shortHash(backgroundFork.sessionId),
          }),
        });
        let name = backgroundFork.name
          ? normalizeStatusSegments(redactSecrets(collapseWhitespace(backgroundFork.name)))
          : undefined;
        let state = prompt ? SESSION_RUNNING_LABEL : SESSION_WAITING_PROMPT_LABEL;
        let H = backgroundFork.relocatedTo
          ? "runs in the origin tree"
          : backgroundFork.editsIn === "this-tree"
            ? "edits this checkout"
            : undefined;
        let ue = offerDedupeKey({
          state,
          name,
          id: backgroundFork.short,
          chips: H ? [H] : [],
        });
        let z = isCrossSessionMessagingEnabled()
          ? `The fork runs as its own separate session \u2014 nothing it does arrives in this conversation, and it does not see what happens here after the fork point. If you need to coordinate with it, it appears in the ${LISTAGENTS} listing as '${redactSecrets(collapseWhitespace(backgroundFork.rosterName))}' (it may be renamed later) and ${SENDMESSAGE} can message it there; it can message this session the same way.`
          : undefined;
        onDone(ue, {
          display: "system",
          ...(z !== undefined && {
            metaMessages: [z],
          }),
        });
      })().catch((error) => {
        logError(error);
        logFeatureBad("repl_session_fork", "unexpected_error");
        onDone(`Couldn't fork: ${errorMessage(error)}. This session is unaffected; try again.`);
      });
    };
    q = [
      appState_4,
      appState_5,
      appState_6,
      appState,
      messages,
      onDone,
      appState_2,
      appState_3,
      prompt,
      seed,
      storageV5,
    ];
    $[0] = appState_4;
    $[1] = appState_5;
    $[2] = appState_6;
    $[3] = messages;
    $[4] = onDone;
    $[5] = appState_2;
    $[6] = appState_3;
    $[7] = prompt;
    $[8] = seed;
    $[9] = appState;
    $[10] = storageV5;
    $[11] = K;
    $[12] = q;
  } else {
    K = $[11];
    q = $[12];
  }
  P(K, q);
  let Y;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    Y = jsxProd_default(Text, {
      dimColor: true,
      children: "Forking\u2026",
    });
    $[13] = Y;
  } else Y = $[13];
  return Y;
}
//@ chunk-cc2xzzcg.js:12628-13025 placement
/**
 * /fork <directive> 命令：按指令派生分叉子代理；无参数时提示用法，协调者模式或首轮之前不可用，成功后报告分叉名与 agentId 末四位。
 */
var callFork = async (onDone, context, args) => {
  let directive = args.trim();
  if (!directive) {
    onDone("Usage: /fork \\<directive\\>", {
      display: "system",
    });
    return null;
  }
  let forkFromDirective = await spawnForkFromDirective(
    directive,
    context,
    context.canUseTool ?? evaluateAskingNoHost,
  );
  if (!forkFromDirective) {
    onDone(
      isCoordinatorMode_2()
        ? "Forking is not available in coordinator sessions. Use /branch instead."
        : "Cannot fork before the first conversation turn",
      {
        display: "system",
      },
    );
    return null;
  }
  onDone(`${CIRCLE_MARK_GLYPH} forked ${forkFromDirective.name} (${forkFromDirective.agentId.slice(-4)})`, {
    display: "system",
  });
  return null;
};
