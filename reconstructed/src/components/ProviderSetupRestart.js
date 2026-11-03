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
import { j, y, R } from "../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getAwsRegionSync } from "../utils/awsRegion.js";
import { getDefaultVertexRegion } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { gn } from "../utils/shortHash.js";
import { logForDebugging } from "../utils/debug.js";
import { isBgSession, getBgTakeover } from "../utils/concurrentSessions.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import {
  ensureLauncherRunnable,
  saveResumePoint,
  confirmRelaunch,
  relaunchOrExplain,
} from "../utils/processRelaunch.js";
import { yN, XRe } from "../utils/promptSubmissionOrigin.js";
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
import { MGe } from "../tasks/backgroundTaskLabels.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-9c09fw6j.js:1061-1065 placement
j();
//@ chunk-9c09fw6j.js:1065-1325 placement
function currentProviderSnapshot() {
  return {
    provider: getAPIProvider(),
    awsRegion: getAwsRegionSync(),
    vertexRegion: getDefaultVertexRegion(),
    vertexProjectId: env.ANTHROPIC_VERTEX_PROJECT_ID ?? "",
    accountDigest: gn(
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
  let g = currentProviderSnapshot(),
    c =
      o.provider === p &&
      g.provider === o.provider &&
      g.awsRegion === o.awsRegion &&
      g.vertexRegion === o.vertexRegion &&
      g.vertexProjectId === o.vertexProjectId &&
      g.accountDigest === o.accountDigest;
  return (
    logForDebugging(
      `Provider-setup restart: ${c ? "carrying" : "dropping"} the model pick (launched on ${o.provider} ${o.awsRegion}/${o.vertexRegion}/${o.vertexProjectId || "no-project"}, now ${g.provider} ${g.awsRegion}/${g.vertexRegion}/${g.vertexProjectId || "no-project"}${g.accountDigest === o.accountDigest ? "" : ", credentials changed"}, target ${p})`,
    ),
    c
  );
}
//@ chunk-9c09fw6j.js:1866-1941 placement
var E = "Your settings were saved \u2014 restart Claude Code to apply them.";
/**
 * 切换 API 提供方后尝试重启会话：后台会话或受限启动时拒绝并给出原因。
 */
//@ chunk-9c09fw6j.js:1941-2619 placement
async function restartWithProvider(o, p, g) {
  try {
    if (isBgSession()) return `A background session can't restart itself. ${E}`;
    if (getBgTakeover() !== null) return `Claude can't restart itself from inside the agents view. ${E}`;
    let c = restrictedLaunchReason(o);
    if (c !== void 0) return c;
    if (isTerminalShutdown()) return;
    if ((await ensureLauncherRunnable(), await saveResumePoint(yN(o), o.storageV5), isTerminalShutdown()))
      return;
    let m = restrictedLaunchReason(o);
    if (m !== void 0) return m;
    let v = getToolPermissionContext(o),
      C = await confirmRelaunch(yN(o), "relaunch", { responseStreaming: XRe(o) }, o.storageV5);
    await relaunchOrExplain(
      C,
      {
        freshIfNoTranscript: !0,
        extraArgs: [
          ...buildRelaunchArgs(v, getSessionEffort(o), { carryModel: isProviderUnchanged(g, p) }),
          ...buildPermissionAndAgentArgs(v, getForkReplayLaunchConfig()),
        ],
        proactivity: { proactivityLevel: o.getProactivityLevel(), toolPermissionContext: v },
        env: getScreenReaderEnv(),
      },
      o.storageV5,
    );
    return;
  } catch (error) {
    return (logError(toError(error)), `Couldn't restart Claude Code (${errorMessage(error)}). ${E}`);
  }
}
//@ chunk-9c09fw6j.js:2619-2921 placement
function restrictedLaunchReason(o) {
  let p = listUncarriedLaunchSettings(getToolPermissionContext(o), getForkRestrictedLaunchConfig());
  if (p.length > 0) return `This session has restrictions a restart can't carry over (${p.join("; ")}). ${E}`;
  if (MGe(o.taskRegistry.all()))
    return `Work is running in the background, and restarting would orphan it (wait for it to finish, or stop it via /tasks). ${E}`;
  return;
}
//@ chunk-9c09fw6j.js:2921-4088 placement
function ProviderSetupWizard(o) {
  let u = w(21),
    {
      Wizard: Wizard,
      cancelledEvent: cancelledEvent,
      targetProvider: targetProvider,
      onDone: onDone,
      context: context,
    } = o,
    [C, Z] = y(null),
    [I] = y(currentProviderSnapshot),
    T = R(!1),
    [_, F] = y(!1),
    V;
  if (u[0] !== context || u[1] !== I || u[2] !== onDone || u[3] !== targetProvider)
    ((V = () => {
      if (T.current) {
        return;
      }
      ((T.current = !0),
        F(!0),
        restartWithProvider(context, targetProvider, I).then((z) => {
          if (z !== void 0) ((T.current = !1), F(!1), onDone(z, { display: "system" }));
        }));
    }),
      (u[0] = context),
      (u[1] = I),
      (u[2] = onDone),
      (u[3] = targetProvider),
      (u[4] = V));
  else V = u[4];
  const A = C !== null;
  let G;
  if (u[5] !== A) ((G = { context: "Confirmation", isActive: A }), (u[5] = A), (u[6] = G));
  else G = u[6];
  if ((useKeybinding("confirm:yes", V, G), C !== null)) {
    let P;
    if (u[7] !== C) ((P = e(Text, { color: "success", children: C })), (u[7] = C), (u[8] = P));
    else P = u[8];
    let f;
    if (u[9] !== _)
      ((f = _
        ? e(Text, { dimColor: !0, children: "Restarting Claude Code\u2026" })
        : r(Text, {
            dimColor: !0,
            children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to restart Claude Code."],
          })),
        (u[9] = _),
        (u[10] = f));
    else f = u[10];
    let k;
    if (u[11] !== P || u[12] !== f)
      ((k = r(Box, { flexDirection: "column", gap: 1, marginTop: 1, children: [P, f] })),
        (u[11] = P),
        (u[12] = f),
        (u[13] = k));
    else k = u[13];
    return k;
  }
  let P;
  if (u[14] === MEMO_CACHE_SENTINEL) ((P = (ee) => Z(ee)), (u[14] = P));
  else P = u[14];
  let f;
  if (u[15] !== cancelledEvent || u[16] !== onDone)
    ((f = () => {
      (logEvent(cancelledEvent, {}), onDone());
    }),
      (u[15] = cancelledEvent),
      (u[16] = onDone),
      (u[17] = f));
  else f = u[17];
  let k;
  if (u[18] !== Wizard || u[19] !== f)
    ((k = e(Wizard, { onComplete: P, onCancel: f })), (u[18] = Wizard), (u[19] = f), (u[20] = k));
  else k = u[20];
  return k;
}

export { ProviderSetupWizard };
