/**
 * cli/handlers/desktop.ts
 *
 * 2.1.316 新增：claude --desktop：把当前或指定会话交给 Claude Desktop 打开
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-91mk8c4s.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isDesktopCommandEnabled } from "../../commands/desktop/index.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { findLatestResumableLog } from "../../utils/conversationRecovery.js";
import { backgroundSessionMovedNotice } from "../../utils/backgroundSessionResume.js";
import { getSessionIdFromLog, getTranscriptStorageContext } from "../../utils/sessionStorage.js";
import { validateUuid, resolveSessionFilePath } from "../../utils/sessionStoragePortable.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  listLiveSessionHolders,
  findBackgroundSessionHolder,
  formatSessionRunningInBackground,
} from "../../utils/sessionAttach.js";
import { getCwd } from "../../utils/cwd.js";
import { openCurrentSessionInDesktop } from "../../utils/desktopDeepLink.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { logFeatureOkAsync, logFeatureBadAsync } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { printCliError } from "../exit.js";

//@ chunk-91mk8c4s.js:13222-13385 placement
var DESKTOP_NO_SESSION_HINT = "Run `claude --resume` to pick a session, then /desktop inside it.";
var DESKTOP_IGNORED_OPTIONS = new Set([
  "desktop",
  "continue",
  "resume",
  "debug",
  "debugToStderr",
  "debugFile",
  "verbose",
]);
//@ chunk-91mk8c4s.js:13385-16729 placement
/**
 * `claude --desktop`：校验参数（不支持非交互/管道输入/prompt），把当前或指定会话交给 Claude Desktop 打开。
 */
async function launchDesktopHandoff({
  continue: isContinue,
  resume,
  nonInteractive,
  suppliedOptions,
  prompt,
  pipedStdin,
  pendingConnect,
  pendingSsh,
  storageV5,
}) {
  if (nonInteractive)
    return failDesktopLaunch(
      "non_interactive",
      "--desktop opens the Claude Desktop app and can't run non-interactively (`--print`, `--sdk-url`, `--init-only`, or redirected output).",
    );
  let mapped = suppliedOptions
    .filter(({ key }) => !DESKTOP_IGNORED_OPTIONS.has(key))
    .map(({ flag }) => `\`${flag}\``);
  if (pendingConnect) mapped.push("a `cc://` connect URL");
  if (pendingSsh) mapped.push("`claude ssh`");
  let lastConflict = mapped.pop();
  if (lastConflict !== undefined) {
    let conflictList = mapped.length > 0 ? `${mapped.join(", ")} or ${lastConflict}` : lastConflict;
    return failDesktopLaunch(
      "flag_conflict",
      `--desktop only opens the Claude Desktop app; it can't be combined with ${conflictList}.`,
    );
  }
  let preSettingsEnvSnapshot = getPreSettingsEnvSnapshot();
  let restriction = isEnvTruthy(preSettingsEnvSnapshot.CLAUDE_CODE_RESTRICTED)
    ? "a restricted session: CLAUDE_CODE_RESTRICTED"
    : isEnvTruthy(preSettingsEnvSnapshot.CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)
      ? "a session that restricts your own Claude Code files: CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG"
      : isEnvTruthy(preSettingsEnvSnapshot.CLAUDE_CODE_SAFE_MODE)
        ? "safe mode: CLAUDE_CODE_SAFE_MODE"
        : isEnvTruthy(preSettingsEnvSnapshot.CLAUDE_CODE_SIMPLE)
          ? "bare mode: CLAUDE_CODE_SIMPLE"
          : undefined;
  if (restriction !== undefined)
    return failDesktopLaunch(
      "restricted",
      `--desktop can't open the Claude Desktop app from ${restriction} wouldn't apply to the session the app starts.`,
    );
  if (prompt !== undefined && prompt !== "")
    return failDesktopLaunch(
      "prompt_unsupported",
      "--desktop doesn't take a prompt yet. Run `claude --desktop`, then type it in the app.",
    );
  if (pipedStdin)
    return failDesktopLaunch(
      "stdin_not_tty",
      "--desktop doesn't take piped or redirected input yet. Run `claude --desktop` on its own, then type in the app.",
    );
  if (!isDesktopCommandEnabled())
    return failDesktopLaunch(
      "unsupported_platform",
      "--desktop isn't available on this platform. It works on macOS and Windows (x64).",
    );
  if (!isClaudeAISubscriber())
    return failDesktopLaunch(
      "not_subscriber",
      "--desktop requires signing in with a Claude account. Run `claude auth login` to sign in.",
    );
  let mode = isContinue ? "continue" : resume !== undefined ? "resume" : "new";
  let sessionId;
  switch (mode) {
    case "continue": {
      let state;
      let latestResumableLog = await findLatestResumableLog({
        storageV5,
        forkSession: false,
        onNewestRunningInBackground: (liveState) => {
          state = liveState;
        },
      });
      if (state)
        return failDesktopLaunch(
          "session_live",
          backgroundSessionMovedNotice(state, {
            canFork: false,
          }),
        );
      let logSessionId = latestResumableLog ? getSessionIdFromLog(latestResumableLog) : undefined;
      if (!latestResumableLog || !logSessionId)
        return failDesktopLaunch(
          "session_not_found",
          "No session in this directory to continue. Run `claude --desktop` to start a new one in Claude Desktop.",
        );
      sessionId = {
        kind: "resume",
        sessionId: logSessionId,
      };
      break;
    }
    case "resume": {
      if (resume === true)
        return failDesktopLaunch(
          "resume_without_id",
          "`--desktop --resume` needs a session ID. Pass one, or use `--desktop --continue` for the most recent session in this directory.",
        );
      let resumeId = validateUuid(resume);
      if (!resumeId)
        return failDesktopLaunch(
          "resume_not_uuid",
          `\`--desktop --resume\` takes a session ID, not a name or path. ${DESKTOP_NO_SESSION_HINT}`,
        );
      let transcriptStorageContext = getTranscriptStorageContext(storageV5);
      let useStorageV5 = isStorageV5Enabled();
      if (
        !(
          (await resolveSessionFilePath(
            resumeId,
            getOriginalCwd(),
            transcriptStorageContext,
            useStorageV5,
          )) ?? (await resolveSessionFilePath(resumeId, undefined, transcriptStorageContext, useStorageV5))
        ) &&
        (
          await listLiveSessionHolders(resumeId, {
            rejectUnreadable: true,
          }).catch(() => [])
        ).length === 0
      )
        return failDesktopLaunch(
          "session_not_found",
          `No session found with ID ${resumeId}. ${DESKTOP_NO_SESSION_HINT}`,
        );
      sessionId = {
        kind: "resume",
        sessionId: resumeId,
      };
      break;
    }
    case "new":
      sessionId = {
        kind: "new-session",
        folder: getCwd(),
      };
      break;
  }
  if (sessionId.kind === "resume") {
    let holders;
    try {
      holders = await listLiveSessionHolders(sessionId.sessionId, {
        rejectUnreadable: true,
      });
    } catch {
      return failDesktopLaunch(
        "registry_unreadable",
        "Couldn't check whether that session is in use. Try again.",
      );
    }
    if (holders.some((holder) => holder.kind === "interactive"))
      return failDesktopLaunch(
        "session_live",
        `Session ${sessionId.sessionId} is open in another terminal. Run /desktop there instead.`,
      );
    let [otherHolder] = holders;
    if (otherHolder) {
      let holder = (await findBackgroundSessionHolder(sessionId.sessionId, storageV5)) ?? {
        kind: otherHolder.kind,
        jobId: undefined,
      };
      return failDesktopLaunch(
        "session_live",
        formatSessionRunningInBackground({
          holder,
          canFork: false,
        }),
      );
    }
  }
  let currentSessionInDesktop = await openCurrentSessionInDesktop(sessionId);
  if (!currentSessionInDesktop.success)
    return failDesktopLaunch(currentSessionInDesktop.reason, currentSessionInDesktop.error);
  process.stdout.write(
    sessionId.kind === "resume"
      ? `Opening session ${sessionId.sessionId} in Claude Desktop
`
      : `Opening ${stripInvisibleChars(sessionId.folder)} in Claude Desktop
`,
  );
  await logFeatureOkAsync("desktop_cli_launch", {
    mode: fromEnum(mode),
  });
  return 0;
}
//@ chunk-91mk8c4s.js:16729-16799 placement
async function failDesktopLaunch(event, message) {
  printCliError(message);
  await logFeatureBadAsync("desktop_cli_launch", event);
  return 1;
}
export { launchDesktopHandoff };
