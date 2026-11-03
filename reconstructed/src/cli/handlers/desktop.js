/**
 * cli/handlers/desktop.ts
 *
 * 2.1.316 新增：claude --desktop：把当前或指定会话交给 Claude Desktop 打开
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wgcp7px2.js (3)
 * attribution: placement 3
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
import { hr } from "../../utils/invisibleChars.js";
import { logFeatureOkAsync, logFeatureBadAsync } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { printCliError } from "../exit.js";

//@ chunk-wgcp7px2.js:12075-12238 placement
var DESKTOP_NO_SESSION_HINT = "Run `claude --resume` to pick a session, then /desktop inside it.",
  DESKTOP_IGNORED_OPTIONS = new Set([
    "desktop",
    "continue",
    "resume",
    "debug",
    "debugToStderr",
    "debugFile",
    "verbose",
  ]);
/**
 * `claude --desktop`：校验参数（不支持非交互/管道输入/prompt），把当前或指定会话交给 Claude Desktop 打开。
 */
//@ chunk-wgcp7px2.js:12238-15583 placement
async function launchDesktopHandoff({
  continue: d,
  resume: resume,
  nonInteractive: nonInteractive,
  suppliedOptions: suppliedOptions,
  prompt: prompt,
  pipedStdin: pipedStdin,
  pendingConnect: pendingConnect,
  pendingSsh: pendingSsh,
  storageV5: storageV5,
}) {
  if (nonInteractive)
    return n(
      "non_interactive",
      "--desktop opens the Claude Desktop app and can't run non-interactively (`--print`, `--sdk-url`, `--init-only`, or redirected output).",
    );
  let mapped = suppliedOptions
    .filter(({ key: key }) => !DESKTOP_IGNORED_OPTIONS.has(key))
    .map(({ flag: flag }) => `\`${flag}\``);
  if (pendingConnect) mapped.push("a `cc://` connect URL");
  if (pendingSsh) mapped.push("`claude ssh`");
  let p = mapped.pop();
  if (p !== void 0) {
    let e = mapped.length > 0 ? `${mapped.join(", ")} or ${p}` : p;
    return n("flag_conflict", `--desktop only opens the Claude Desktop app; it can't be combined with ${e}.`);
  }
  let a = getPreSettingsEnvSnapshot(),
    m = isEnvTruthy(a.CLAUDE_CODE_RESTRICTED)
      ? "a restricted session: CLAUDE_CODE_RESTRICTED"
      : isEnvTruthy(a.CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)
        ? "a session that restricts your own Claude Code files: CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG"
        : isEnvTruthy(a.CLAUDE_CODE_SAFE_MODE)
          ? "safe mode: CLAUDE_CODE_SAFE_MODE"
          : isEnvTruthy(a.CLAUDE_CODE_SIMPLE)
            ? "bare mode: CLAUDE_CODE_SIMPLE"
            : void 0;
  if (m !== void 0)
    return n(
      "restricted",
      `--desktop can't open the Claude Desktop app from ${m} wouldn't apply to the session the app starts.`,
    );
  if (prompt !== void 0 && prompt !== "")
    return n(
      "prompt_unsupported",
      "--desktop doesn't take a prompt yet. Run `claude --desktop`, then type it in the app.",
    );
  if (pipedStdin)
    return n(
      "stdin_not_tty",
      "--desktop doesn't take piped or redirected input yet. Run `claude --desktop` on its own, then type in the app.",
    );
  if (!isDesktopCommandEnabled())
    return n(
      "unsupported_platform",
      "--desktop isn't available on this platform. It works on macOS and Windows (x64).",
    );
  if (!isClaudeAISubscriber())
    return n(
      "not_subscriber",
      "--desktop requires signing in with a Claude account. Run `claude auth login` to sign in.",
    );
  let k = d ? "continue" : resume !== void 0 ? "resume" : "new",
    t;
  switch (k) {
    case "continue": {
      let e,
        o = await findLatestResumableLog({
          storageV5: storageV5,
          forkSession: !1,
          onNewestRunningInBackground: (_) => {
            e = _;
          },
        });
      if (e) return n("session_live", backgroundSessionMovedNotice(e, { canFork: !1 }));
      let s = o ? getSessionIdFromLog(o) : void 0;
      if (!o || !s)
        return n(
          "session_not_found",
          "No session in this directory to continue. Run `claude --desktop` to start a new one in Claude Desktop.",
        );
      t = { kind: "resume", sessionId: s };
      break;
    }
    case "resume": {
      if (resume === !0)
        return n(
          "resume_without_id",
          "`--desktop --resume` needs a session ID. Pass one, or use `--desktop --continue` for the most recent session in this directory.",
        );
      let e = validateUuid(resume);
      if (!e)
        return n(
          "resume_not_uuid",
          `\`--desktop --resume\` takes a session ID, not a name or path. ${DESKTOP_NO_SESSION_HINT}`,
        );
      let o = getTranscriptStorageContext(storageV5),
        s = isStorageV5Enabled();
      if (
        !(
          (await resolveSessionFilePath(e, getOriginalCwd(), o, s)) ??
          (await resolveSessionFilePath(e, void 0, o, s))
        ) &&
        (await listLiveSessionHolders(e, { rejectUnreadable: !0 }).catch(() => [])).length === 0
      )
        return n("session_not_found", `No session found with ID ${e}. ${DESKTOP_NO_SESSION_HINT}`);
      t = { kind: "resume", sessionId: e };
      break;
    }
    case "new":
      t = { kind: "new-session", folder: getCwd() };
      break;
  }
  if (t.kind === "resume") {
    let e;
    try {
      e = await listLiveSessionHolders(t.sessionId, { rejectUnreadable: !0 });
    } catch {
      return n("registry_unreadable", "Couldn't check whether that session is in use. Try again.");
    }
    if (e.some((s) => s.kind === "interactive"))
      return n(
        "session_live",
        `Session ${t.sessionId} is open in another terminal. Run /desktop there instead.`,
      );
    let [o] = e;
    if (o) {
      let s = (await findBackgroundSessionHolder(t.sessionId, storageV5)) ?? { kind: o.kind, jobId: void 0 };
      return n("session_live", formatSessionRunningInBackground({ holder: s, canFork: !1 }));
    }
  }
  let l = await openCurrentSessionInDesktop(t);
  if (!l.success) return n(l.reason, l.error);
  return (
    process.stdout.write(
      t.kind === "resume"
        ? `Opening session ${t.sessionId} in Claude Desktop
`
        : `Opening ${hr(t.folder)} in Claude Desktop
`,
    ),
    await logFeatureOkAsync("desktop_cli_launch", { mode: fromEnum(k) }),
    0
  );
}
//@ chunk-wgcp7px2.js:15583-15653 placement
async function n(d, i) {
  return (printCliError(i), await logFeatureBadAsync("desktop_cli_launch", d), 1);
}
