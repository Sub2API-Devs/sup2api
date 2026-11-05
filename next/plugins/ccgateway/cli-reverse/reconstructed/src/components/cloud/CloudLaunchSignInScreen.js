/**
 * components/cloud/CloudLaunchSignInScreen.tsx
 *
 * 2.1.316 新增：云会话启动遇到未登录时，在 stdin 终端里引导 /login 并在登录后重启或继续启动云会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4m2b8exh.js (4)
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
import { alwaysFalseProfileCheck } from "../../utils/anthropicProfile.js";
import { isWIFActive } from "../../utils/wifProfile.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { env } from "../../utils/env.js";
import { setRemoteSessionAwaits, isLocalRemoteCommand } from "../../utils/remoteSessionCommands.js";
import { setSessionPersistenceDisabled } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { loginEventCounter } from "../../services/oauth/loginEvents.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-4m2b8exh.js:13408-13506 placement
var SIGN_IN_SAVED_RESTART_TEXT =
  "Your sign-in is saved, but Claude Code couldn't restart: start claude again the same way.";
//@ chunk-4m2b8exh.js:13506-13563 placement
function isCloudSessionAccessError(error) {
  return (
    error instanceof CloudSessionAccessError &&
    isFirstPartyProvider() &&
    !hasStoredOAuthToken() &&
    !isWIFDispatchAuth()
  );
}
//@ chunk-4m2b8exh.js:13563-13685 placement
async function consoleLoginReplacedNotes() {
  return getApiKeyFromConfigOrMacOSKeychain() !== null || (await alwaysFalseProfileCheck())
    ? ["Signing in to claude.ai replaces this machine's Console login."]
    : [];
}
//@ chunk-4m2b8exh.js:13685-15026 placement
/**
 * 云会话启动遇到未登录时，在 stdin 终端里引导 /login 并在登录后重启或继续启动云会话。
 */
async function cloudLaunchSignInScreen({
  error,
  defaultedToCloud,
  terminalInput,
  disableSlashCommands,
  session,
  storageV5,
}) {
  if (
    !isCloudSessionAccessError(error) ||
    isWIFActive() ||
    terminalInput.kind !== "stdin" ||
    isBgSession() ||
    getCurrentWorktreeSession() !== null ||
    disableSlashCommands ||
    env.DISABLE_LOGIN_COMMAND ||
    isBareModeAuthRestricted() ||
    !validateForceLoginMethod(true).valid
  )
    return null;
  let replacedNotes = await consoleLoginReplacedNotes();
  let bodyText;
  bodyText = [
    "No cloud session started: cloud sessions need a claude.ai sign-in, and this machine isn't signed in to claude.ai.",
    "Run /login to sign in, and the cloud session starts.",
    ...replacedNotes,
  ].join(`
`);
  setRemoteSessionAwaits(true);
  setSessionPersistenceDisabled(true);
  logFeatureSad("cloud_launch_sign_in", "opened", {
    defaulted: defaultedToCloud,
  });
  let counter = loginEventCounter.of(session);
  let credentialsPersisted = counter.getSnapshot().credentialsPersisted;
  let unsubscribe = counter.subscribe(() => {
    if (counter.getSnapshot().credentialsPersisted === credentialsPersisted) return;
    unsubscribe();
    if (isTerminalShutdown()) return;
    let dims = {
      defaulted: defaultedToCloud,
    };
    relaunchClaudeCode(
      {
        args: process.argv.slice(2),
        failedLine: SIGN_IN_SAVED_RESTART_TEXT,
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
        onShutdownClaimed: () => logFeatureOk("cloud_launch_sign_in", dims),
      },
      storageV5,
    )
      .catch((error) => {
        logForDebugging(`Couldn't restart after the sign-in: ${errorMessage(error)}`, {
          level: "error",
        });
        logFeatureBad("cloud_launch_sign_in", "restart_refused", dims);
        return gracefulShutdown(0, "other", {
          finalMessage: SIGN_IN_SAVED_RESTART_TEXT,
        });
      })
      .catch((error) => {
        logForDebugging(`Couldn't end the launch after the sign-in: ${errorMessage(error)}`, {
          level: "error",
        });
      });
  });
  return {
    state: {
      initialMessage: null,
      replTab: "convo",
      diffPanelVisible: false,
      replBridgeEnabled: false,
      replBridgeOutboundOnly: false,
      replBridgeExplicit: false,
    },
    props: {
      initialMessages: [createSystemMessage(bodyText, "warning")],
      disableQuery: true,
      filterCommands: isLocalRemoteCommand,
    },
  };
}
export { cloudLaunchSignInScreen };
