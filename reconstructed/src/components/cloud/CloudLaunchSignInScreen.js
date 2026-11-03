/**
 * components/cloud/CloudLaunchSignInScreen.tsx
 *
 * 2.1.316 新增：云会话启动遇到未登录时，在 stdin 终端里引导 /login 并在登录后重启或继续启动云会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v4jnmstc.js (4)
 * attribution: placement 4
 */
import { CloudSessionAccessError } from "../../utils/teleport/api.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import {
  hasStoredOAuthToken,
  isWIFDispatchAuth,
  getApiKeyFromConfigOrMacOSKeychain,
  isBareModeAuthRestricted,
  validateForceLoginMethod,
} from "../../utils/auth.js";
import { I1s } from "../../utils/anthropicProfile.js";
import { isWIFActive } from "../../utils/wifProfile.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { env } from "../../utils/env.js";
import { Z6s, e3s } from "../../utils/remoteSessionCommands.js";
import { setSessionPersistenceDisabled } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { KV } from "../../services/oauth/loginEvents.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-v4jnmstc.js:12260-12358 placement
var l = "Your sign-in is saved, but Claude Code couldn't restart: start claude again the same way.";
//@ chunk-v4jnmstc.js:12358-12415 placement
function I(n) {
  return (
    n instanceof CloudSessionAccessError &&
    isFirstPartyProvider() &&
    !hasStoredOAuthToken() &&
    !isWIFDispatchAuth()
  );
}
//@ chunk-v4jnmstc.js:12415-12537 placement
async function consoleLoginReplacedNotes() {
  return getApiKeyFromConfigOrMacOSKeychain() !== null || (await I1s())
    ? ["Signing in to claude.ai replaces this machine's Console login."]
    : [];
}
/**
 * 云会话启动遇到未登录时，在 stdin 终端里引导 /login 并在登录后重启或继续启动云会话。
 */
//@ chunk-v4jnmstc.js:12537-13878 placement
async function cloudLaunchSignInScreen({
  error: error,
  defaultedToCloud: defaultedToCloud,
  terminalInput: terminalInput,
  disableSlashCommands: disableSlashCommands,
  session: session,
  storageV5: storageV5,
}) {
  if (
    !I(error) ||
    isWIFActive() ||
    terminalInput.kind !== "stdin" ||
    isBgSession() ||
    getCurrentWorktreeSession() !== null ||
    disableSlashCommands ||
    env.DISABLE_LOGIN_COMMAND ||
    isBareModeAuthRestricted() ||
    !validateForceLoginMethod(!0).valid
  )
    return null;
  let h = await consoleLoginReplacedNotes(),
    a;
  ((a = [
    "No cloud session started: cloud sessions need a claude.ai sign-in, and this machine isn't signed in to claude.ai.",
    "Run /login to sign in, and the cloud session starts.",
    ...h,
  ].join(`
`)),
    Z6s(!0),
    setSessionPersistenceDisabled(!0),
    logFeatureSad("cloud_launch_sign_in", "opened", { defaulted: defaultedToCloud }));
  let of = KV.of(session),
    credentialsPersisted = of.getSnapshot().credentialsPersisted,
    subscribe = of.subscribe(() => {
      if (of.getSnapshot().credentialsPersisted === credentialsPersisted) return;
      if ((subscribe(), isTerminalShutdown())) return;
      let s = { defaulted: defaultedToCloud };
      relaunchClaudeCode(
        {
          args: process.argv.slice(2),
          failedLine: l,
          preSpawn: () =>
            process.stdout.write(
              defaultedToCloud
                ? `
Signed in. Restarting Claude Code.

`
                : `
Signed in. Starting your cloud session.

`,
            ),
          onShutdownClaimed: () => logFeatureOk("cloud_launch_sign_in", s),
        },
        storageV5,
      )
        .catch(
          (e) => (
            logForDebugging(`Couldn't restart after the sign-in: ${errorMessage(e)}`, { level: "error" }),
            logFeatureBad("cloud_launch_sign_in", "restart_refused", s),
            gracefulShutdown(0, "other", { finalMessage: l })
          ),
        )
        .catch((e) => {
          logForDebugging(`Couldn't end the launch after the sign-in: ${errorMessage(e)}`, {
            level: "error",
          });
        });
    });
  return {
    state: {
      initialMessage: null,
      replTab: "convo",
      diffPanelVisible: !1,
      replBridgeEnabled: !1,
      replBridgeOutboundOnly: !1,
      replBridgeExplicit: !1,
    },
    props: { initialMessages: [createSystemMessage(a, "warning")], disableQuery: !0, filterCommands: e3s },
  };
}
