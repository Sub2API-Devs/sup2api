/**
 * services/remoteTools/hostRefusals.ts
 *
 * 2.1.316 新增：远程工具宿主拒绝处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zmxrt63a.js (27)
 * attribution: placement 27
 */
import { formatDuration } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { formatUnsignedEventNotice } from "../../bridge/deviceAttestation.js";
import { LIST_COMPUTER_FOLDERS, REQUEST_COMPUTER_FOLDER } from "../../remote/tools/protocolConstants.js";

//@ chunk-zmxrt63a.js:340-583 placement
/**
 * 生成"某字段在目标机器上不可用"的说明（run_in_background 另有补充）。
 */
function unsupportedFieldMessage({ field, targetName }) {
  let t = `${field} is not available on ${targetName}.`;
  return field === "run_in_background"
    ? `${t} The calling session has no way to poll a background task there. Run it in the foreground, or in the session's own environment.`
    : t;
}
//@ chunk-zmxrt63a.js:583-748 placement
/**
 * 生成"该工具只能经云会话转发器调用"的说明。
 */
function mustUseForwarderMessage({ toolName, targetName }) {
  return `${toolName} on ${targetName} is served for Claude Code remote tool execution and must be called through a cloud session's forwarder.`;
}
//@ chunk-zmxrt63a.js:748-921 placement
/**
 * 生成远程工具执行协议版本不一致、需更新两端 Claude Code 的说明。
 */
function protocolMismatchMessage({ toolName, targetName }) {
  return `${toolName} on ${targetName} speaks a different remote tool execution protocol version than the caller. Update Claude Code on both machines.`;
}
//@ chunk-zmxrt63a.js:921-1324 placement
/**
 * 生成命令开始前被停止（截止时间、关闭、取消）的说明。
 */
function stoppedBeforeStartMessage({ stoppedBy, targetName }) {
  switch (stoppedBy) {
    case "deadline":
      return `The call was stopped on ${targetName} at its deadline before the command started \u2014 nothing ran.`;
    case "shutdown":
      return `The call was stopped because Claude Code on ${targetName} is shutting down, before the command started \u2014 nothing ran.`;
    case "cancel":
      return `The call was cancelled on ${targetName} before the command started \u2014 nothing ran.`;
  }
}
//@ chunk-zmxrt63a.js:1324-1568 placement
/**
 * 生成审批已失效（请求已不在或答复对应的不是当前请求）的说明。
 */
function staleApprovalMessage({ targetName, why }) {
  return `${why === "gone" ? `That permission request is no longer pending on ${targetName}` : `This approval answers a different request than the one pending on ${targetName}`}, so nothing ran. Run the tool again if it is still needed.`;
}
//@ chunk-zmxrt63a.js:1568-1832 placement
/**
 * 生成请求的超时超过目标机器上限、已被压到上限的说明。
 */
function timeoutClampedMessage({ requestedMs, appliedMs, targetName }) {
  let s = formatDuration(requestedMs, {
    hideTrailingZeros: true,
  });
  let o = formatDuration(appliedMs, {
    hideTrailingZeros: true,
  });
  if (s === o) {
    s = `${requestedMs}ms`;
    o = `${appliedMs}ms`;
  }
  return `The ${s} timeout this call asked for exceeds the ${o} ${targetName} allows a command \u2014 it was held to ${o}.`;
}
//@ chunk-zmxrt63a.js:1832-2040 placement
var MAX_DENIED_PATHS_SHOWN = 3;
var SANDBOX_SYMPTOM_TEXT = {
  operation_not_permitted: "Operation not permitted",
  read_only_file_system: "Read-only file system",
  launch_services: "a LaunchServices error (-10810)",
  sandbox_unavailable: "the sandbox could not start",
};
//@ chunk-zmxrt63a.js:2040-4441 placement
/**
 * 生成远程机器沙箱中运行命令后的说明：列出被设置拒绝的路径、沙箱违规或典型症状（权限、只读、LaunchServices、沙箱未启动），告诉模型不要绕过而应告知用户。
 */
function sandboxRunNote({
  targetName,
  failed,
  violationRecorded,
  filesystemConfined,
  symptoms,
  deniedPathsNamed,
  firstWord,
}) {
  let joined = deniedPathsNamed.slice(0, MAX_DENIED_PATHS_SHOWN).join(", ");
  let extraCount = deniedPathsNamed.length - MAX_DENIED_PATHS_SHOWN;
  let pathsText = extraCount > 0 ? `${joined} and ${extraCount} more` : joined;
  let isSingle = deniedPathsNamed.length === 1;
  let deniedNote =
    deniedPathsNamed.length === 0
      ? ""
      : `${pathsText} (its settings deny ${isSingle ? "that path" : "those paths"}). In this command ${isSingle ? "that path looks" : "those paths look"} missing or empty even if ${isSingle ? "it exists" : "they exist"} on ${targetName}. Do not substitute another file for ${isSingle ? "it" : "them"}: tell the user ${isSingle ? "it is" : "they are"} blocked.`;
  let sandboxIntro = filesystemConfined
    ? `Commands this session runs on ${targetName} run inside Claude Code's sandbox there. A path its settings deny looks missing or empty to them, writes outside the working folders fail, and only allowed network hosts are reachable. If something you expect is absent, say it may be the sandbox rather than working around it.`
    : `Commands this session runs on ${targetName} run inside Claude Code's sandbox there, which lets them reach only allowed network hosts and does not restrict their file reads or writes.`;
  if (!failed && !violationRecorded) {
    if (deniedNote !== "") return `This ran inside ${targetName}'s sandbox, which hides ${deniedNote}`;
    return firstWord ? sandboxIntro : undefined;
  }
  let lead = firstWord ? sandboxIntro : `This ran inside ${targetName}'s sandbox.`;
  let tellUser =
    failed && !firstWord && deniedNote === "" ? " Tell the user rather than working around it." : "";
  let filtered = symptoms.filter((symptom) => symptom !== "sandbox_unavailable");
  let launchServicesNote = filtered.includes("launch_services")
    ? " (opening an app or system service is blocked there: run that step outside the sandbox or ask the user to open it)"
    : "";
  let symptomNote = symptoms.includes("sandbox_unavailable")
    ? ` Its output is only a bwrap or sandbox-exec error, which usually means the sandbox could not start and the command never ran. If so, running it again will not help: tell the user the sandbox on ${targetName} may not be starting.`
    : violationRecorded
      ? ` The sandbox_violations lines in its output name what it blocked${failed ? ", and if that is what failed it, running it again unchanged will fail the same way" : ", and that stays blocked on a rerun"}.${tellUser}`
      : filtered.length > 0
        ? ` Its output says ${filtered.map((c) => SANDBOX_SYMPTOM_TEXT[c]).join(" and ")}, which there usually means the sandbox refused it${launchServicesNote}, and if so running it again unchanged will fail the same way.${tellUser}`
        : "";
  if (deniedNote === "" && symptomNote === "" && !firstWord)
    return filesystemConfined
      ? `This ran inside ${targetName}'s sandbox: if it failed on a missing path, a refused write or an unreachable host, that may be the sandbox rather than the command.`
      : `This ran inside ${targetName}'s sandbox: if it failed reaching a network host, that may be the sandbox rather than the command.`;
  return `${lead}${deniedNote === "" ? "" : ` It hides ${deniedNote}`}${symptomNote}`;
}
//@ chunk-zmxrt63a.js:4441-5197 placement
/**
 * 生成远程后台命令已启动的说明：命令 id、输出位置、不会通知完成、如何判断是否仍在运行及时限。
 */
function backgroundCommandStartedNote({ targetName, shellId, outputPath, limitMs }) {
  let limitText = formatDuration(limitMs, {
    hideTrailingZeros: true,
  });
  return `Command running in the background on ${targetName} with ID: ${shellId}. Output is being written there to: ${outputPath}. This session is not notified when it finishes. Whether it is still running is told by ${targetName} itself: not by that file, which holds only what the command has printed (a program that buffers its output shows it there only when it flushes), and never by pgrep, ps, pkill or a network request from a later command, because where ${targetName} sandboxes commands each command sees only its own processes and its own network, so a command that is running looks absent from there. It is stopped after ${limitText} in the background, or earlier if ${targetName} stops serving this session.`;
}
//@ chunk-zmxrt63a.js:5197-5612 placement
/**
 * 远程后台命令停止原因的说明文字。
 */
function backgroundStopReasonText(e, n) {
  switch (e) {
    case "caller_stopped":
      return "by this session";
    case "stopped_by_person":
      return `by the person at ${n}`;
    case "time_limit":
      return "at its time limit";
    case "serving_ended":
      return `when ${n} quit serving`;
    case "serving_off":
      return "when serving shut off";
    case "serving_check_failed":
      return `when ${n} could not check whether it still serves this session`;
    case "call_stopped":
      return "when its call ended";
  }
}
//@ chunk-zmxrt63a.js:5612-6212 placement
/**
 * 远程后台命令被拒绝启动（已满、沙箱未运行、不可用）的说明。
 */
function backgroundRefusalMessage(e, { targetName, max }) {
  switch (e) {
    case "full":
      return `${targetName} already has ${max} background ${plural(max, "command")} running or waiting for approval for this session, the most it takes at a time. Nothing was started. Wait for one to finish, or run this one in the foreground.`;
    case "sandbox_down":
      return `${targetName} has Claude Code's sandbox switched on, but the sandbox is not running there, so it starts no command in the background. Nothing was started.`;
    case "unavailable":
      return `${targetName} cannot run a command in the background for this session right now. Nothing was left running. Run it in the foreground.`;
  }
}
//@ chunk-zmxrt63a.js:6212-6288 placement
/**
 * 拼出「该工具不在目标机器上提供服务」的说明。
 */
function toolNotServedMessage({ toolName, targetName }) {
  return `${toolName} is not served on ${targetName}.`;
}
//@ chunk-zmxrt63a.js:6288-7347 placement
/**
 * 目标机器拒绝云会话读取或修改凭证（连接凭证、钥匙串、凭据管理器、守护进程执行目录、个人凭证）的说明。
 */
function credentialRefusalMessage({ targetName, kind, subject }) {
  switch (kind) {
    case "read":
      return `${targetName} does not let a cloud session read the credential that authorizes this connection (${subject}). Nothing was read.`;
    case "write":
      return `${targetName} does not let a cloud session change the credential file that authorizes this connection (${subject}). Nothing was written.`;
    case "keychain":
      return `${targetName} does not let a cloud session query its credential store (\`${subject}\`). Nothing was run.`;
    case "keychain_files":
      return `${targetName} does not let a cloud session open this Mac's keychain files (${subject}). Nothing was read or written.`;
    case "credential_store_files":
      return `${targetName} does not let a cloud session open this computer's Credential Manager files (${subject}). Nothing was read or written.`;
    case "exec_ingest":
      return `${targetName} does not let a cloud session write to ${subject}, which its background daemon would execute. Nothing was written.`;
    case "personal_credential":
      return `${targetName} does not let a cloud session read or change its SSH keys, cloud-provider credentials or saved developer-tool logins (${subject}). Nothing was read or written.`;
  }
}
//@ chunk-zmxrt63a.js:7347-7571 placement
/**
 * 目标机器拒绝云会话修改其设置文件或所在目录的说明。
 */
function settingsDirRefusalMessage({ targetName }) {
  return `${targetName} does not let a cloud session change its Claude Code settings files, or the folder that holds them. Nothing was run. Tell the user: those settings can only be changed on ${targetName} itself.`;
}
//@ chunk-zmxrt63a.js:7571-7768 placement
/**
 * 目标机器拒绝云会话修改其设置文件的说明。
 */
function settingsFileRefusalMessage({ targetName }) {
  return `${targetName} does not let a cloud session change its Claude Code settings files. Nothing was changed. Tell the user: those settings can only be changed on ${targetName} itself.`;
}
//@ chunk-zmxrt63a.js:7768-8059 placement
/**
 * 目标机器未能完成权限规则检查、调用未执行的说明。
 */
function permissionCheckFailedMessage({ targetName, toolName }) {
  return `${targetName} could not finish checking its permission rules for this ${toolName} call, so the call was not run and nobody was asked. Sending the same call again is unlikely to help. Tell the user: this is an error on ${targetName}, not a refusal by one of its rules.`;
}
//@ chunk-zmxrt63a.js:8059-8329 placement
/**
 * 目标机器保存的云会话数已达上限、本会话未加入的说明。
 */
function tooManySessionsMessage({ targetName, limit }) {
  return `${targetName} already keeps state for ${limit} cloud ${plural(limit, "session")}, the most it holds at once \u2014 this session was not added and nothing ran. Tell the user: restarting Claude Code on ${targetName} frees those seats. Do not retry in a loop.`;
}
//@ chunk-zmxrt63a.js:8329-8677 placement
/**
 * 目标机器刚启动、尚未加载完钩子与设置、调用未执行的说明。
 */
function notStartedUpMessage({ targetName }) {
  return `Claude Code on ${targetName} has only just started and had not finished loading the hooks and settings it checks every call against before this call's time ran out \u2014 nothing ran. Send the call again in a moment. If it is refused this way again, tell the user that Claude Code on ${targetName} is not finishing its start-up.`;
}
//@ chunk-zmxrt63a.js:8677-8836 placement
/**
 * 检查期间目标机器改变了准入方式、调用未执行的说明。
 */
function admissionChangedMessage({ targetName }) {
  return `${targetName} changed how it allows this session's calls while this one was being checked \u2014 nothing ran. Send the call again.`;
}
//@ chunk-zmxrt63a.js:8836-9158 placement
/**
 * 目标机器要求在 VM 中运行但 VM 不可用的说明。
 */
function vmUnavailableMessage({ targetName, remedy }) {
  return `${targetName} is set to run this session's calls only inside a VM, and the VM is not available \u2014 nothing ran. Sending the call again will not change that. Tell the user that the VM on ${targetName} is not available${remedy === undefined ? ", and that its owner can check Claude Code there." : `. ${remedy}`}`;
}
//@ chunk-zmxrt63a.js:9158-9608 placement
/**
 * 目标机器无法读取全部设置、无法判断运行位置的说明。
 */
function settingsUnreadableMessage({ targetName }) {
  return `${targetName} could not read all of its settings when this call arrived, so it could not tell whether this session's calls may run there or only inside a VM \u2014 nothing ran. The call can be sent again in a moment. If it is refused this way again, tell the user that Claude Code on ${targetName} cannot read its settings, and that its owner can check the settings files there and whether the organization's settings have loaded.`;
}
//@ chunk-zmxrt63a.js:9608-10238 placement
/**
 * 调用或审批答复迟到（机器休眠、离线或重连）的说明。
 */
function lateCallMessage({ targetName, leg, endedAsk, ageMs }) {
  let subject = leg === "call" ? "This call" : "This answer to a permission request";
  let outcome = endedAsk
    ? "the request it answered was withdrawn and nothing ran. Send the call again if it is still wanted."
    : leg === "call"
      ? "nothing ran. Send it again if it is still wanted."
      : "nothing ran for it.";
  return ageMs === undefined
    ? `${subject} reached ${targetName} over a connection that could not be dated against the service's clock, so whether it is still current is unknown \u2014 ${outcome}`
    : `${subject} reached ${targetName} ${formatDuration(ageMs)} after it was sent (the machine was asleep, offline, or reconnecting), after this session had stopped waiting for it \u2014 ${outcome}`;
}
//@ chunk-zmxrt63a.js:10238-10818 placement
/**
 * 目标机器无法确认本会话是发送方（未签名事件）的说明。
 */
function unattestedSenderMessage({ targetName, status, subtype }) {
  let notice = `${formatUnsignedEventNotice({
    status,
    payloadType: "control_request",
    subtype,
  })} Nothing was done for it on ${targetName}. Sending it again will not change that: tell the user instead of retrying.`;
  return status === "UNSPECIFIED" && subtype === "remote_tool_call"
    ? `${notice} Retrying, reconnecting ${targetName} or changing a setting on it is unlikely to fix this, and a new session is unlikely to help: ${targetName} got no confirmation it could read from Anthropic's service that this session is the sender. Tell the user that, ask them to report it to Anthropic, and continue without ${targetName}.`
    : notice;
}
//@ chunk-zmxrt63a.js:10818-11865 placement
/**
 * 会话附加的仓库未被标记为可信、调用不被接受的说明，并指引如何让用户确认信任。
 */
function untrustedRepositoriesMessage({ targetName, state }) {
  switch (state) {
    case "declined":
      return `This session's attached repositories were not marked trusted, so its calls to ${targetName} are not accepted \u2014 nothing was done for this one. Sending it again will not change that: ask the person to answer the trust question, and tell them what stays blocked until they do.`;
    case "nothing_to_mark":
    case "not_marked":
      return `This session has repositories or files attached that its owner has not said they trust, so its calls to ${targetName} are not accepted. Nothing was done for this one. Sending the same call again will not change that. Call ${LIST_COMPUTER_FOLDERS} once. If it refuses with a trust question, put the question to the person: their yes clears this. If it lists folders, call ${REQUEST_COMPUTER_FOLDER} for the folder this session was using: the person's Allow clears this. If you have neither tool, if neither asks the person anything, or if ${targetName} still refuses after their answer, tell them plainly what stays blocked, and that a new session with no repository and none of their files can run a quick command.`;
  }
}
//@ chunk-zmxrt63a.js:11865-12373 placement
/**
 * 审批答复到达时已超过有效期、请求已撤回的说明。
 */
function expiredApprovalMessage({ targetName, askAgeMs, windowMs, dated }) {
  let hours = Math.round(windowMs / 3600000);
  let days = Math.floor(askAgeMs / 86400000);
  let ageText = days >= 2 ? `${days} days` : "more than a day";
  let reachedText = dated
    ? `${ageText} after the request was raised \u2014 longer than an answer`
    : `over a channel that carries no delivery time, ${ageText} after the request was raised \u2014 longer than such an answer`;
  return `This approval reached ${targetName} ${reachedText} is honoured for (${hours} ${plural(hours, "hour")}) \u2014 so the request was withdrawn and nothing ran. Send the call again if it is still wanted.`;
}
//@ chunk-zmxrt63a.js:12373-12634 placement
/**
 * 目标机器上待答复的审批请求已达上限的说明。
 */
function tooManyPendingApprovalsMessage({ targetName, limit }) {
  return `${targetName} already has ${limit} approval ${plural(limit, "request")} from this session waiting, the most it holds at once, so it did not ask about this call and this call was not run. Send it again once some of them have been answered.`;
}
//@ chunk-zmxrt63a.js:12634-14126 placement
/**
 * 按原因（被挤出、工具撤下、宿主停止服务、迟到答复、被重试取代、记录丢失、无人答复、被新版本接管等）生成"权限请求已撤回、未执行"的说明文字。
 */
function withdrawnRequestMessage({ targetName, reason }) {
  switch (reason) {
    case "evicted":
      return `An older pending approval on ${targetName} was withdrawn because too many were waiting \u2014 it did not run.`;
    case "tool_withdrawn":
      return `The tool is no longer offered on ${targetName} \u2014 nothing ran.`;
    case "host_unbound":
      return `${targetName} stopped serving this session while the permission request was open \u2014 nothing ran.`;
    case "host_stopped":
      return `Claude Code on ${targetName} stopped while the permission request was open \u2014 nothing ran.`;
    case "stale_answer":
      return `The answer to this permission request reached ${targetName} after the session had stopped waiting for it \u2014 the request was withdrawn and nothing ran.`;
    case "replaced_by_retry":
      return `A newer copy of this call now carries the permission request on ${targetName}; this one was withdrawn and nothing ran under it.`;
    case "record_evicted":
      return `${targetName} no longer holds a record of this permission request \u2014 nothing ran under it.`;
    case "no_answer":
      return `Nobody answered the permission request for this call on ${targetName} in the time the session waits \u2014 it was withdrawn and nothing ran.`;
    case "host_withdrawn":
      return `Claude Code on ${targetName} left the session while the permission request was open \u2014 nothing ran.`;
    case "superseded":
      return `A newer Claude Code on ${targetName} took over while the permission request was open \u2014 nothing ran.`;
    case "unrecognized":
      return `The permission request on ${targetName} ended for a reason this version of Claude Code does not recognise \u2014 nothing is known to have run.`;
  }
}
export {
  withdrawnRequestMessage,
  unattestedSenderMessage,
  tooManySessionsMessage,
  staleApprovalMessage,
  unsupportedFieldMessage,
  expiredApprovalMessage,
  admissionChangedMessage,
  credentialRefusalMessage,
  tooManyPendingApprovalsMessage,
  vmUnavailableMessage,
  settingsUnreadableMessage,
  backgroundStopReasonText,
  stoppedBeforeStartMessage,
  timeoutClampedMessage,
  sandboxRunNote,
  backgroundCommandStartedNote,
  lateCallMessage,
  protocolMismatchMessage,
  untrustedRepositoriesMessage,
  toolNotServedMessage,
  mustUseForwarderMessage,
  notStartedUpMessage,
  backgroundRefusalMessage,
  permissionCheckFailedMessage,
  settingsDirRefusalMessage,
  settingsFileRefusalMessage,
};
