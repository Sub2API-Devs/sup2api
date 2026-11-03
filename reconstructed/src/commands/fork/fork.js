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
import { j, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { getPermissionModeCycle, evaluateAskingNoHost } from "../../utils/permissions/permissions.js";
import { jye } from "../../utils/proactivityLevel.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { gn } from "../../utils/shortHash.js";
import {
  normalizeStatusSegments,
  SESSION_RUNNING_LABEL,
  SESSION_WAITING_PROMPT_LABEL,
  YAr,
} from "../../components/rateLimit/usageCreditsOffer.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { Dr } from "../../utils/stringUtils.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { LISTAGENTS } from "../../tools/SendMessageTool/listAgents.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text } from "../../ink/components/Text.js";
import { spawnForkFromDirective } from "../../tools/AgentTool/forkDirective.js";
import { YO } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-d62reftv.js:15768-15772 placement
j();
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
/**
 * /fork 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-d62reftv.js:16018-16747 placement
var forkCommandCall = async (onDone, context, args) => {
  if (isCoordinatorMode_2()) return (onDone(COORDINATOR_FORK_REFUSAL, { display: "system" }), null);
  if (isTranscriptPersistenceDisabled())
    return (
      onDone(
        "Can't fork: session persistence is off, so the new session would have nothing to start from. Run the task here, or fork from a session that saves its transcript.",
      ),
      null
    );
  if (isSafeMode() || isBareMode() || getForkRestrictedLaunchConfig())
    return (
      onDone(
        `Can't fork: this session was started with launch flags (safe or bare mode, ${FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION}) that the copy wouldn't inherit, so it would run with fewer restrictions than this session. Run the task here, or start a session without those flags and fork from there.`,
      ),
      null
    );
  let trimmed = (args ?? "").trim(),
    i = deriveBackgroundSeed(context.messages, trimmed, "(forked)");
  if (i === null) return (onDone("Nothing to fork yet. Send a message first."), null);
  return e(ForkSessionFlow, { onDone: onDone, prompt: trimmed, seed: i, messages: context.messages });
};
//@ chunk-d62reftv.js:16747-18564 placement
function ForkSessionFlow(f) {
  let $ = w(14),
    { onDone: onDone, prompt: prompt, seed: seed, messages: messages } = f,
    y = useAppState(selectSessionEffort),
    k = useAppState(getPermissionModeCycle),
    _ = useAppState(jye),
    C = useAppState(selectToolPermissionContextAdditionalWorkingDirectories),
    D = useAppState(getAlwaysAllowRules),
    M = useAppState(selectToolPermissionContextAlwaysDenyRules),
    { storageV5: storageV5 } = Me(),
    U = R(!1),
    K,
    q;
  if (
    $[0] !== C ||
    $[1] !== D ||
    $[2] !== M ||
    $[3] !== messages ||
    $[4] !== onDone ||
    $[5] !== k ||
    $[6] !== _ ||
    $[7] !== prompt ||
    $[8] !== seed ||
    $[9] !== y ||
    $[10] !== storageV5
  )
    ((K = () => {
      if (U.current) {
        return;
      }
      ((U.current = !0),
        (async () => {
          let o = await spawnBackgroundFork(seed, prompt || null, y, k, C, D, M, "fork_session", messages, {
            proactivityLevel: _,
            keepParent: !0,
            taskFreeInFlight: { tasks: 0, queued: 0, kinds: [] },
            storageV5: storageV5,
          });
          if (!o.ok) {
            (logFeatureBad("repl_session_fork", o.reason ?? "spawn_failed"), onDone(o.error));
            return;
          }
          (logFeatureOk("repl_session_fork"),
            logEvent("tengu_session_fork", {
              had_prompt: prompt.length > 0,
              message_count: messages.length,
              had_worktree: o.hadWorktree,
              relocated: o.relocatedTo !== void 0,
              ...(o.relocatedFrom && { relocated_from: fromEnum(o.relocatedFrom) }),
              ...(o.sessionId && { child_session_hash: gn(o.sessionId) }),
            }));
          let fe = o.name ? normalizeStatusSegments(redactSecrets(Dr(o.name))) : void 0;
          let pe = prompt ? SESSION_RUNNING_LABEL : SESSION_WAITING_PROMPT_LABEL;
          let H = o.relocatedTo
            ? "runs in the origin tree"
            : o.editsIn === "this-tree"
              ? "edits this checkout"
              : void 0;
          let ue = YAr({ state: pe, name: fe, id: o.short, chips: H ? [H] : [] });
          let z = isCrossSessionMessagingEnabled()
            ? `The fork runs as its own separate session \u2014 nothing it does arrives in this conversation, and it does not see what happens here after the fork point. If you need to coordinate with it, it appears in the ${LISTAGENTS} listing as '${redactSecrets(Dr(o.rosterName))}' (it may be renamed later) and ${SENDMESSAGE} can message it there; it can message this session the same way.`
            : void 0;
          onDone(ue, { display: "system", ...(z !== void 0 && { metaMessages: [z] }) });
        })().catch((Q) => {
          (logError(Q),
            logFeatureBad("repl_session_fork", "unexpected_error"),
            onDone(`Couldn't fork: ${errorMessage(Q)}. This session is unaffected; try again.`));
        }));
    }),
      (q = [C, D, M, y, messages, onDone, k, _, prompt, seed, storageV5]),
      ($[0] = C),
      ($[1] = D),
      ($[2] = M),
      ($[3] = messages),
      ($[4] = onDone),
      ($[5] = k),
      ($[6] = _),
      ($[7] = prompt),
      ($[8] = seed),
      ($[9] = y),
      ($[10] = storageV5),
      ($[11] = K),
      ($[12] = q));
  else ((K = $[11]), (q = $[12]));
  P(K, q);
  let Y;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((Y = e(Text, { dimColor: !0, children: "Forking\u2026" })), ($[13] = Y));
  else Y = $[13];
  return Y;
}
/**
 * /fork <directive> 命令：按指令派生分叉子代理；无参数时提示用法，协调者模式或首轮之前不可用，成功后报告分叉名与 agentId 末四位。
 */
//@ chunk-cc2xzzcg.js:12628-13025 placement
var callFork = async (onDone, context, args) => {
  let trimmed = args.trim();
  if (!trimmed) return (onDone("Usage: /fork \\<directive\\>", { display: "system" }), null);
  let r = await spawnForkFromDirective(trimmed, context, context.canUseTool ?? evaluateAskingNoHost);
  if (!r)
    return (
      onDone(
        isCoordinatorMode_2()
          ? "Forking is not available in coordinator sessions. Use /branch instead."
          : "Cannot fork before the first conversation turn",
        { display: "system" },
      ),
      null
    );
  return (onDone(`${YO} forked ${r.name} (${r.agentId.slice(-4)})`, { display: "system" }), null);
};
