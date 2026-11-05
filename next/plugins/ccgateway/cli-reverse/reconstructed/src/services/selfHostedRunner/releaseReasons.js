/**
 * services/selfHostedRunner/releaseReasons.ts
 *
 * self-hosted runner 释放原因的文案与汇总：检查清单结果转成一句话，并拼出“持有未保存工作”的说明（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k6jh5e6v.js (10)
 * attribution: placement 10
 */
import { safeParseJSON } from "../../utils/json.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { TOKEN_FD_ENV_VARS } from "../../utils/managedEnvConstants.js";
import { withDeadline } from "../../utils/sleep.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-k6jh5e6v.js:442-2106 placement
/**
 * 各类 release 原因的完整中文式英文说明文本。
 */
var WORK_LOSS_REASONS = {
  uncommitted_changes: "uncommitted changes",
  unfinished_operation: "an unfinished merge, rebase or the like",
  unpushed_commits: "commits that are not pushed",
  moved_since_start:
    "new commits, or a different commit checked out, that the resumed session would not have",
  stash: "a stash",
  own_folder_entries: "files or folders beside what the runner put there; the debug log names the first",
  submodules: "it has submodules, which are not checked",
  hidden_files: "its index hides files from git status",
  pushed_unknown:
    "git cannot tell what is pushed: no 'origin', one that does not fetch every branch, or a history cut off from it",
  too_slow: "git took too long",
  unreadable: "git could not read it",
  own_folder_unknown: "the runner could not list it",
  own_folder_too_slow: "the runner could not list it in time",
  own_folder_not_linux:
    "the runner checks this folder only on Linux, so on this system it keeps every session at this limit",
  own_folder_start_named:
    "Anthropic's control plane started the session in a folder inside it, which the runner does not check",
  own_folder_no_look: "the runner has no way to look at it yet",
  own_folder_behind_script:
    "the runner cannot tell that it sees the folder in which --exec-path or a command hook started the session; the debug log names the cause",
  start_unknown: "the runner could not tell at which commit it started",
  started_by_script:
    "the runner does not check the checkouts of sessions that --exec-path or a command hook starts",
  look_timed_out: "the check of its checkouts did not finish in time",
  look_failed: "the check of its checkouts failed",
};
var CERTAIN_LOSS_REASONS = [
  "uncommitted_changes",
  "unfinished_operation",
  "unpushed_commits",
  "stash",
  "own_folder_entries",
];
//@ chunk-k6jh5e6v.js:2106-2167 placement
function isReasonCode(value) {
  return typeof value === "string" && Object.hasOwn(WORK_LOSS_REASONS, value);
}
//@ chunk-k6jh5e6v.js:2167-2226 placement
/**
 * work-look 子命令名与应答前缀、超时 90 s、输出上限 64 KB。
 */
var WORK_LOOK_COMMAND = "work-look";
var WORK_LOOK_ANSWER_PREFIX = "work-look-answer: ";
var WORK_LOOK_TIMEOUT_MS = 90000;
var WORK_LOOK_MAX_OUTPUT = 65536;
//@ chunk-k6jh5e6v.js:2226-2448 placement
function parseWorkLookAnswer(output, expectedCount) {
  let last = output
    .split(
      `
`,
    )
    .findLast((line) => line.startsWith(WORK_LOOK_ANSWER_PREFIX));
  let answers = safeParseJSON(last?.slice(WORK_LOOK_ANSWER_PREFIX.length) ?? "", false);
  if (!Array.isArray(answers) || answers.length !== expectedCount) return;
  let reasonCodes = [];
  for (let answer of answers) {
    if (answer !== null && !isReasonCode(answer)) return;
    reasonCodes.push(answer ?? undefined);
  }
  return reasonCodes;
}
//@ chunk-k6jh5e6v.js:2448-3710 placement
/**
 * 起一个 work-look 子进程检查多个 checkout，解析应答并在超时/失败时统一给出原因。
 */
function createWorkLookChecker(runner, signal, onNoAnswer, timeoutMs = WORK_LOOK_TIMEOUT_MS) {
  let runningChild;
  return async (checkoutPaths) => {
    let sameForAll = (reasonCode) => checkoutPaths.map(() => reasonCode);
    if (runningChild !== undefined) return sameForAll("look_timed_out");
    let child;
    try {
      child = safeSpawn(
        runner.execPath,
        [
          ...runner.execArgs,
          "self-hosted-runner",
          WORK_LOOK_COMMAND,
          jsonStringify(
            checkoutPaths.map((checkoutPath) => ({
              path: checkoutPath,
              ...runner.checkoutStarts.get(checkoutPath),
            })),
          ),
        ],
        {
          cwd: runner.cwd,
          env: {
            ...runner.env,
            ...Object.fromEntries(TOKEN_FD_ENV_VARS.map((tokenEnvVar) => [tokenEnvVar, undefined])),
            CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
            CLAUDE_CODE_OAUTH_TOKEN: undefined,
            CLAUDE_SESSION_INGRESS_TOKEN_FILE: undefined,
          },
          extendEnv: false,
          stdio: ["ignore", "pipe", "ignore"],
          windowsHide: true,
          detached: true,
          toolCgroupClass: "agent",
        },
      );
    } catch {
      return sameForAll("look_failed");
    }
    runningChild = child;
    child.once("exit", () => {
      runningChild = undefined;
    });
    let outputBuffer = "";
    let onAbort = () => {};
    let finishedNormally = await withDeadline(
      new Promise((resolve) => {
        child.stdout?.on("data", (chunk) => {
          outputBuffer += String(chunk);
          if (outputBuffer.length > WORK_LOOK_MAX_OUTPUT) resolve(false);
        });
        child.once("error", () => {
          runningChild = undefined;
          resolve(false);
        });
        child.once("close", () => void resolve(true));
        onAbort = () => void resolve(false);
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
        if (signal.aborted) onAbort();
      }),
      timeoutMs,
    );
    signal.removeEventListener("abort", onAbort);
    child.stdout?.removeAllListeners("data");
    child.stdout?.destroy();
    if (child.pid !== undefined && child.exitCode === null && child.signalCode === null)
      killProcessGroup(child.pid);
    let reasonCodes = finishedNormally ? parseWorkLookAnswer(outputBuffer, checkoutPaths.length) : undefined;
    if (reasonCodes === undefined)
      onNoAnswer(
        `the check of the checkouts gave no answer: ${finishedNormally === undefined ? `stopped after ${timeoutMs} ms` : `exit code ${child.exitCode}, signal ${child.signalCode}, ${outputBuffer.length} characters of output`}`,
      );
    return reasonCodes ?? sameForAll(finishedNormally === undefined ? "look_timed_out" : "look_failed");
  };
}
//@ chunk-k6jh5e6v.js:3710-3927 placement
/**
 * 脚本启动的 checkout 返回 started_by_script，检查失败时统一返回 look_failed。
 */
async function checkoutStates(checkoutPaths, looker) {
  if (checkoutPaths.length === 0) return [];
  if (looker === undefined) return checkoutPaths.map(() => "started_by_script");
  let lookedAt = await looker(checkoutPaths).catch(() => {
    return;
  });
  return lookedAt?.length === checkoutPaths.length
    ? lookedAt.filter((reasonCode) => reasonCode !== undefined)
    : checkoutPaths.map(() => "look_failed");
}
//@ chunk-k6jh5e6v.js:3927-4024 placement
/**
 * 自己的会话目录无法检查时给出 own_folder_no_look/own_folder_unknown。
 */
async function checkOwnFolder(looker) {
  return looker === undefined ? "own_folder_no_look" : looker().catch(() => "own_folder_unknown");
}
//@ chunk-k6jh5e6v.js:4024-4110 placement
/**
 * 从原因集合里按固定顺序去重已知项。
 */
function knownReasonCodesIn(reasonCodes) {
  let haystack = normalizeCaseForComparison_2(reasonCodes);
  return Object.keys(WORK_LOSS_REASONS)
    .filter(isReasonCode)
    .filter((key) => haystack.includes(key));
}
//@ chunk-k6jh5e6v.js:4110-4174 placement
/**
 * 把原因集合压成 kept_<原因> 形式。
 */
function keptReasonCode(reasonCodes, extraReasonCode) {
  return `kept_${knownReasonCodesIn(extraReasonCode === undefined ? reasonCodes : [...reasonCodes, extraReasonCode])[0]}`;
}
//@ chunk-k6jh5e6v.js:4174-4599 placement
/**
 * 拼出“checkout 与自有目录持有未保存工作”的说明。
 */
function describeWorkLoss(reasonCodes, checkoutCount, ownFolderReason) {
  let knownReasons = knownReasonCodesIn(reasonCodes);
  let subject =
    checkoutCount === 1 ? "its checkout" : `${reasonCodes.length} of its ${checkoutCount} checkouts`;
  let certaintyVerb = knownReasons.every((reasonCode) => CERTAIN_LOSS_REASONS.includes(reasonCode))
    ? checkoutCount === 1 || reasonCodes.length === 1
      ? "holds"
      : "hold"
    : "may hold";
  return [
    ...(reasonCodes.length > 0
      ? [
          `${subject} ${certaintyVerb} work that a release would lose (${knownReasons.map((reasonCode) => WORK_LOSS_REASONS[reasonCode]).join("; ")})`,
        ]
      : []),
    ...(ownFolderReason === undefined
      ? []
      : [
          `its own folder under --base-dir/_sessions ${CERTAIN_LOSS_REASONS.includes(ownFolderReason) ? "holds" : "may hold"} work that a release would lose (${WORK_LOSS_REASONS[ownFolderReason]})`,
        ]),
  ].join(" and ");
}
export {
  createWorkLookChecker,
  checkoutStates,
  checkOwnFolder,
  describeWorkLoss,
  keptReasonCode,
  knownReasonCodesIn,
  WORK_LOOK_ANSWER_PREFIX,
};
