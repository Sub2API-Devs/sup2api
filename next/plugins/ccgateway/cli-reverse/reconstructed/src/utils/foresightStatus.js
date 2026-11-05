/**
 * utils/foresightStatus.ts
 *
 * foresight/Remote Control 状态诊断文案：为何不可用、被拒后怎么办、登录重启提示（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-npgp1xzs.js (19)
 * attribution: placement 19
 */
import { getPlatform } from "./platform.js";
import {
  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE,
  CODE_MODE_LABEL,
  CODE_MODE_EXPERIMENTAL_LABEL,
} from "../constants/codeMode.js";
import { foresightState } from "./foresightState.js";
import { setAccepted } from "./codeMode/accepted.js";

//@ chunk-npgp1xzs.js:341-379 placement
function isNotWindows() {
  return getPlatform() !== "windows";
}
//@ chunk-npgp1xzs.js:379-572 placement
/**
 * 给出在什么步骤下设置环境变量并重跑的命令。
 */
function codeModeEnvHint(value, args, kind = "command") {
  {
    let command = args === undefined ? "claude" : `claude ${args}`;
    return isNotWindows()
      ? `${kind === "step" ? "run " : ""}${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE}=${value} ${command}`
      : `set the environment variable ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} to ${value}, then run ${command}`;
  }
  return "";
}
//@ chunk-npgp1xzs.js:673-725 placement
function getForesightState() {
  return (
    foresightState.settled ?? {
      state: "not_asked",
    }
  );
}
//@ chunk-npgp1xzs.js:725-818 placement
function settleForesight(settled) {
  if (foresightState.settled !== undefined) return;
  foresightState.settled = settled;
  foresightState.open = false;
  if (settled.state === "on") setAccepted(true);
}
//@ chunk-npgp1xzs.js:818-859 placement
function reopenIfUnsettled() {
  foresightState.open = foresightState.settled === undefined;
}
//@ chunk-npgp1xzs.js:859-888 placement
function isForesightOpen() {
  return foresightState.open;
}
//@ chunk-npgp1xzs.js:888-953 placement
function isCodeModeAllowed() {
  return foresightState.settled === undefined || foresightState.settled.state === "on";
}
//@ chunk-npgp1xzs.js:953-981 placement
function setForesee(foresee) {
  foresightState.foresee = foresee;
}
//@ chunk-npgp1xzs.js:981-1106 placement
function getForeseenWhy() {
  try {
    return foresightState.foresee === undefined || foresightState.settled === undefined
      ? "unknown"
      : foresightState.foresee();
  } catch {
    return "unknown";
  }
  return "unknown";
}
//@ chunk-npgp1xzs.js:1106-3609 placement
/**
 * foresight/Remote Control 不可用的原因诊断：值不是 1、被管理设置或 ~/.claude.json 覆盖、管理员不允许、政策读不到等。
 */
function refusalReasonText(why) {
  switch (why) {
    case "bad_value":
      return `${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} must be 1 to turn it on`;
    case "own_settings":
      return "it has to be turned on in ~/.claude/settings.json, because managed settings or ~/.claude.json also set the variable";
    case "admin":
      return "your organization's settings don't allow it";
    case "admin_unread":
      return "Claude Code couldn't read your organization's settings or policy (starting Claude Code again may help)";
    case "credential_changed":
      return "Claude Code checked your organization's policy with a different credential than the one it now uses (starting Claude Code again will check it with this one)";
    case "compliance":
      return "it isn't offered yet to organizations under HIPAA or zero data retention";
    case "otel":
      return `OpenTelemetry is on (CLAUDE_CODE_ENABLE_TELEMETRY or ENABLE_BETA_TRACING_DETAILED), and ${CODE_MODE_LABEL} doesn't yet send it an event for each tool call`;
    case "runtime":
      return "it needs Claude Code's native build (see code.claude.com/docs/en/setup)";
    case "engine":
      return `this version of Claude Code didn't pass a check that only ${CODE_MODE_LABEL} needs (updating Claude Code may help)`;
    case "no_bash":
      return "for now it needs Git for Windows (Bash) on Windows";
    case "entrypoint":
      return "for now it only works in the interactive terminal";
    case "unattended":
      return "for now it doesn't work in background jobs, in teammates' panes or with Remote Control";
    case "no_setup":
      return "Claude Code skipped the start-up steps that check for it (it skips them while CI or IS_DEMO is set)";
    case "tools":
      return "this launch's tool options (--restricted, --tools, --disallowedTools or a deny rule) leave it out";
    case "agent_teams":
      return "it can't be used together with agent teams yet";
    case "credentials":
      return "for now it doesn't work with an API key helper, ANTHROPIC_AUTH_TOKEN or custom auth headers";
    case "provider":
      return "for now it only works with the Anthropic API";
    case "model":
      return "for now it only works with Opus 5.5 and Sonnet 5.5";
    case "no_flags":
      return "it needs settings that Claude Code downloads from Anthropic, and this session doesn't download them (DISABLE_TELEMETRY, DO_NOT_TRACK, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC or DISABLE_GROWTHBOOK turns that off)";
    case "gate":
      return "it isn't open to your account yet, or Claude Code couldn't check whether it is";
    case "mods":
      return "it doesn't yet work with an installed mod (a plugin with JavaScript hooks) that checks tool calls";
    case "declined":
      return "you chose not to turn it on";
    case "unsaved":
      return "Claude Code couldn't save your answer in ~/.claude.json";
  }
  return "";
}
//@ chunk-npgp1xzs.js:3609-3840 placement
/**
 * foresight 被拒后的说明：本次改用普通工具，并提示如何不再被询问。
 */
function refusalNotice(why) {
  if (why === "declined")
    return `${CODE_MODE_EXPERIMENTAL_LABEL} is off for this session, as you chose. To stop being asked, remove ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} from your shell or settings.json.`;
  return `${CODE_MODE_EXPERIMENTAL_LABEL} isn't available: ${refusalReasonText(why)}. Starting with the ordinary tools.`;
}
//@ chunk-npgp1xzs.js:3840-3927 placement
/**
 * 显示“已开启 · 本会话只能用某方式恢复”。
 */
function codeModeResumeNotice() {
  return `${CODE_MODE_EXPERIMENTAL_LABEL} is on \xB7 this session can be resumed only with ${CODE_MODE_LABEL} on`;
}
//@ chunk-npgp1xzs.js:3927-4067 placement
/**
 * 说明当前会话所在环境不支持后台会话，无法移入或复制到后台。
 */
function codeModeBackgroundNotice() {
  return `This session is in ${CODE_MODE_EXPERIMENTAL_LABEL}, which background sessions can't use yet, so it can't be moved or copied to the background.`;
}
//@ chunk-npgp1xzs.js:4067-4170 placement
/**
 * 提示要使用 Remote Control 需退出并把对应变量设为 0 再启动。
 */
function remoteControlRestartHint() {
  return `To use Remote Control, quit Claude Code and start it again with ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} set to 0.`;
}
//@ chunk-npgp1xzs.js:4170-4280 placement
/**
 * 说明 Remote Control 在当前环境尚不可用，会话未连接。
 */
function remoteControlUnavailableNotice() {
  return `Remote Control isn't available in ${CODE_MODE_EXPERIMENTAL_LABEL} yet, so this session isn't connected. ${remoteControlRestartHint()}`;
}
//@ chunk-npgp1xzs.js:4280-4375 placement
/**
 * 登录成功后提示将重启以校验该账号。
 */
function signedInRestartNotice() {
  return `Signed in. Restarting Claude Code to check ${CODE_MODE_EXPERIMENTAL_LABEL} for this account\u2026`;
}
//@ chunk-npgp1xzs.js:4375-4613 placement
/**
 * 登录后需要重启校验时提示先 --resume 保住会话，然后退出。
 */
function signedInEndingNotice(reason) {
  return `Signed in. Claude Code has to restart to check ${CODE_MODE_EXPERIMENTAL_LABEL} for this account, and ${reason}, so this session is ending instead. Your sign-in is saved. To go on with this conversation, ${codeModeEnvHint(1, "--resume", "step")} and choose it.`;
}
//@ chunk-npgp1xzs.js:4613-4767 placement
function sourceText(source) {
  switch (source) {
    case "shell":
      return "the shell environment";
    case "userSettings":
      return "user settings";
    case "flagSettings":
      return "--settings";
  }
  return "";
}
//@ chunk-npgp1xzs.js:4767-5020 placement
/**
 * 把 foresight 状态翻译成给人看的一行：开启（实验）、被拒、未询问等。
 */
function codeModeStatusText(enabled) {
  {
    let state = getForesightState();
    switch (state.state) {
      case "on":
        return `${enabled ? "on (experimental)" : "on (experimental), but this session uses the ordinary tools"} \xB7 ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} in ${sourceText(state.source)}`;
      case "refused":
        return `off \xB7 ${refusalReasonText(state.why)}`;
      case "not_asked":
        return;
    }
  }
  return;
}
export {
  isCodeModeAllowed,
  refusalReasonText,
  getForesightState,
  codeModeEnvHint,
  isNotWindows,
  getForeseenWhy,
  codeModeStatusText,
  codeModeBackgroundNotice,
  setForesee,
  settleForesight,
  refusalNotice,
  remoteControlUnavailableNotice,
  codeModeResumeNotice,
  reopenIfUnsettled,
  isForesightOpen,
  remoteControlRestartHint,
  signedInRestartNotice,
  signedInEndingNotice,
};
