/**
 * tools/BashTool/repeatMeter.ts
 *
 * 重复 Bash 命令计数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (17)
 * attribution: placement 12, layout 5
 */
import { resolve } from "path";
import { TODO_WRITE_TOOL_NAME } from "../TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../TaskUpdateTool/constants.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { EXITPLANMODE } from "../ExitPlanModeTool/constants.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { EDIT } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { isTelemetryDisabled } from "../../utils/privacyLevel.js";
import { isFeedbackSurveyOtelOn } from "../../utils/hostEnvironment.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { getTotalLinesAdded, getTotalLinesRemoved } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { countWhere } from "../../utils/collections.js";
import { SPLIT_MAX_LEN } from "../../utils/bash/commands.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { classifyBashCommand } from "./commandClassification.js";
import { TOOL_RESULT_CLEARED_MESSAGE, isPersistableContent } from "../../utils/toolResultStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:528083-529267 placement
/**
 * 重复命令统计的常量与辅助集合：保留的文本哈希数、语句数上限、遥测计数封顶、视为中性的工具、敏感工具、只读管道命令、写文件类命令与重定向集合等。
 */
var MAX_TRACKED_ENTRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_REPEAT_TEXT_HASHES;
var MAX_AGENTS_PER_WORK_KEY;
var TEXT_KEY_SEPARATOR;
var MAX_REPEAT_STATEMENTS;
var MAX_REPORTED_COUNTS;
var MAX_REPORTED_LINES;
var MAX_REPORTED_SECONDS;
var MAX_REPORTED_BYTES;
var LARGE_OUTPUT_COMMANDS;
var SENSITIVE_TOOLS;
var READ_PIPE_COMMANDS;
var AWK_FILTER_RE;
var WRITE_FLAG_PATTERNS;
var NOOP_COMMANDS;
var SHELL_STATE_COMMANDS;
var DECLARATION_NODE_TYPES;
var ACTIVATE_SCRIPT_RE;
var FORMAT_WRITE_FLAG_RE;
var DRY_RUN_FLAG_RE_2;
var CD_TEXT_RE;
var COMMAND_SUBSTITUTION_RE;
var OUTPUT_REDIRECT_NODE_TYPES;
var CHAIN_NODE_TYPES;
var SHELL_SAFE_ARG_RE;
deferInit("chunk-7jxyna5q.js:528083", () => {
  MAX_TRACKED_ENTRIES = 500;
  MAX_REPEAT_TEXT_HASHES = 8;
  MAX_AGENTS_PER_WORK_KEY = 4;
  TEXT_KEY_SEPARATOR = "\x00";
  MAX_REPEAT_STATEMENTS = 20;
  MAX_REPORTED_COUNTS = 1000;
  MAX_REPORTED_LINES = 1e5;
  MAX_REPORTED_SECONDS = 86400;
  MAX_REPORTED_BYTES = 1073741824;
  LARGE_OUTPUT_COMMANDS = new Set([
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TASKSTOP,
    EXITPLANMODE,
    SKILL,
  ]);
  SENSITIVE_TOOLS = new Set([EDIT, FILE_WRITE_TOOL_NAME]);
  READ_PIPE_COMMANDS = new Set([
    "tail",
    "head",
    "grep",
    "egrep",
    "fgrep",
    "rg",
    "sed",
    "awk",
    "gawk",
    "wc",
    "cut",
    "sort",
    "uniq",
    "tr",
    "column",
    "nl",
    "jq",
    "tee",
    "less",
    "more",
    "cat",
  ]);
  AWK_FILTER_RE = /^-[if]|system|getline|[>|]/;
  WRITE_FLAG_PATTERNS = {
    sed: /^(-[A-Za-z]*i|--in-place)/,
    sort: /^(-[A-Za-z]*o|--output)/,
    awk: AWK_FILTER_RE,
    gawk: AWK_FILTER_RE,
  };
  NOOP_COMMANDS = new Set(["echo", "true", "false"]);
  SHELL_STATE_COMMANDS = new Set([
    "cd",
    "pushd",
    "popd",
    "source",
    ".",
    "set",
    "shopt",
    "ulimit",
    "umask",
    "alias",
    "unalias",
    "exit",
    "return",
  ]);
  DECLARATION_NODE_TYPES = new Set([
    "declaration_command",
    "unset_command",
    "variable_assignment",
    "variable_assignments",
  ]);
  ACTIVATE_SCRIPT_RE = /(^|\/)activate(\.\w+)?$/;
  FORMAT_WRITE_FLAG_RE =
    /^(--fix.*|--write|-w|-i|--in-place|--apply.*|--unsafe-fixes|-a|-A|--autocorrect.*|-F|-u|-update|--update.*|--snapshot-update|--force-regen|--bless|--accept|[A-Z0-9_]*(UPDATE|ACCEPT|BLESS|REGEN|OVERWRITE|RECORD)[A-Z0-9_]*=.*|(.*[-_:/])?(fix|fmt|format|write)([-_:].*)?|(.*\/)?(black|isort|rustfmt|autopep8|yapf|pre-commit))$/;
  DRY_RUN_FLAG_RE_2 = /^(--check.*|--diff|--dry-run)$/;
  CD_TEXT_RE = /\b(cd|pushd|popd)\b/;
  COMMAND_SUBSTITUTION_RE = /[`]|[$<>]\(/;
  OUTPUT_REDIRECT_NODE_TYPES = new Set([">", ">>", ">&", "&>", "&>>", ">|"]);
  CHAIN_NODE_TYPES = new Set(["&&", "||", ";", "&"]);
  SHELL_SAFE_ARG_RE = /^[\w@%+=:,./][\w@%+=:,./ -]*$/;
});
//@ chunk-7jxyna5q.js:529267-529496 placement
/**
 * bash 重复命令检测的采样开关：按内容哈希与 tengu_vivid_peach 概率决定是否统计。
 */
function isBashRepeatMetered(id) {
  return safeRepeatMeter(() => {
    if (isTelemetryDisabled() || isFeedbackSurveyOtelOn()) return false;
    let defaultRate = 0.1;
    let featureValue = getFeatureValue_CACHED_MAY_BE_STALE("tengu_vivid_peach", undefined);
    let rate =
      featureValue === undefined
        ? defaultRate
        : typeof featureValue === "number" && featureValue >= 0 && featureValue <= 1
          ? featureValue
          : 0;
    return Number(BigInt(bunHashOf(`bash repeat meter\x00${id}`)) % 2n ** 32n) / 4294967296 < rate;
  }, false);
}
//@ chunk-7jxyna5q.js:529496-535389 placement
/**
 * 跟踪重复执行的只读 Bash 命令（tail/grep 等），用于提示改用后台或 Monitor
 */
class BashRepeatMeter {
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #i = 0;
  #a = 0;
  #s = 0;
  #c = 0;
  #l = 0;
  #o = 0;
  #r = 0;
  begin(call) {
    return safeRepeatMeter(
      () => this.#d(call),
      new BashRepeatMeter_2(this, undefined, {}, [0, 0, 0, 0], false),
    );
  }
  skip() {
    this.#o++;
    return new BashRepeatMeter_2(this, undefined, {}, this.#p(), true);
  }
  #d(call) {
    let lineDelta = getTotalLinesAdded() + getTotalLinesRemoved();
    this.#i += lineDelta < this.#a ? lineDelta : lineDelta - this.#a;
    this.#a = lineDelta;
    let { toolUseId: countsAtStart, messages: runsAtStart } = call;
    if (countsAtStart === undefined || runsAtStart.length === 0) return this.skip();
    let { command, description, timeout, run_in_background: runInBackground, ...restInput } = call.input;
    let shapes = commandShapeKey(command, call.cwd, call.isReadOnly);
    let anyHeavy = shapes.some((shape) => shape.heavy && !shape.onlyOnFailure);
    let scopeKeyParts = call.agentId ?? "";
    let inputJsonText = jsonStringify({
      ...restInput,
      dangerouslyDisableSandbox: restInput.dangerouslyDisableSandbox === true,
      ...false,
    });
    let counts = this.#p();
    let writesLeft = 0;
    let checksLeft = 0;
    let repeatedShapes = [];
    let wastedLeft = 0;
    let repeatHit;
    let otherAgent;
    let otherAgentHit;
    for (let shape of shapes.length > 0
      ? shapes
      : [
          {
            place: call.cwd,
            stem: command.trim(),
            text: command.trim(),
            heavy: false,
            testsOrLints: false,
            onlyOnFailure: false,
            ranOnlyIf: undefined,
            goesOnRunning: false,
          },
        ]) {
      let shouldCount = !shape.onlyOnFailure && (!anyHeavy || shape.heavy);
      let scopeKey = scopeKeyOf(scopeKeyParts, inputJsonText, shape);
      let workKey = scopeKeyOf(TEXT_KEY_SEPARATOR, inputJsonText, shape);
      let textHash = bunHashOf(shape.text);
      let stored = shouldCount ? this.#e.get(scopeKey) : undefined;
      if (stored !== undefined) {
        let hit = this.#f(stored, textHash, counts, writesLeft, checksLeft);
        if (hit.lines + hit.writes === 0) wastedLeft++;
        if (isBiggerHit(hit, repeatHit)) repeatHit = hit;
      }
      if (shouldCount) {
        otherAgent ??= this.#n.get(workKey)?.find((hit) => hit !== scopeKeyParts);
        for (let otherStored of this.#t.get(workKey)?.toReversed() ?? []) {
          let otherRow =
            otherStored === scopeKeyParts
              ? undefined
              : this.#e.get(scopeKeyOf(otherStored, inputJsonText, shape));
          if (otherRow === undefined) continue;
          let otherHit = this.#f(otherRow, textHash, counts, writesLeft, checksLeft);
          if (isBiggerHit(otherHit, otherAgentHit))
            otherAgentHit = {
              ...otherHit,
              agent: otherStored,
            };
        }
      }
      if (shape.testsOrLints) checksLeft++;
      else if (shapes.length > 0) writesLeft++;
      if (shouldCount)
        repeatedShapes.push({
          key: scopeKey,
          workKey,
          textHash,
          writes: writesLeft,
          checks: checksLeft,
          ranOnlyIf: shape.ranOnlyIf,
        });
    }
    let earlierMessageIdx = repeatHit === undefined ? -1 : earlierResultIndex(runsAtStart, repeatHit.earlier);
    let backgroundTaskCount = Object.values(call.taskRegistry.all()).filter(
      (task) => isLocalShellTask(task) && task.isBackgrounded && task.status === "running",
    );
    let otherAgentId = otherAgent ?? otherAgentHit?.agent;
    let view = new BashRepeatMeter_2(
      this,
      {
        pieces: repeatedShapes,
        agent: scopeKeyParts,
        writes: writesLeft,
        checks: checksLeft,
        goesOnRunning: shapes.some((view) => view.goesOnRunning),
        toolUseId: countsAtStart,
        startsInBackground: runInBackground === true,
        backgroundCommandsAtStart: backgroundTaskCount.length,
      },
      {
        repeat: repeatHit !== undefined,
        compared_statements: repeatedShapes.length,
        unchanged_repeats: wastedLeft,
        ...(scopeKeyParts !== "" && {
          subagent_in_agent_worktree: call.inAgentWorktree,
        }),
        other_agent_repeat: otherAgentId !== undefined,
        ...(otherAgentId !== undefined && {
          other_agent_direction: fromEnum(
            scopeKeyParts === ""
              ? "main_after_subagent"
              : otherAgentId === ""
                ? "subagent_after_main"
                : "subagent_after_subagent",
          ),
          other_agent_call_running_at_start:
            otherAgent !== undefined ||
            backgroundTaskCount.some((task) => task.toolUseId === otherAgentHit?.earlier.toolUseId),
        }),
        ...(otherAgent === undefined &&
          otherAgentHit !== undefined && {
            other_agent_same_text_as_earlier_call: otherAgentHit.sameText,
            other_agent_seconds_since_that_call: secondsSince(otherAgentHit.earlier),
            ...((otherAgentHit.lines > 0 || otherAgentHit.unseen === 0) && {
              other_agent_lines_changed_since_that_call: Math.min(otherAgentHit.lines, MAX_REPORTED_LINES),
            }),
            other_agent_possible_writes_since_that_call: Math.min(otherAgentHit.writes, MAX_REPORTED_COUNTS),
            other_agent_possible_writes_by_running_commands: Math.min(
              otherAgentHit.running,
              MAX_REPORTED_COUNTS,
            ),
            other_agent_tests_and_lints_since_that_call: Math.min(otherAgentHit.checks, MAX_REPORTED_COUNTS),
            other_agent_changed_since_that_call: fromEnum(changedKind(otherAgentHit)),
            other_agent_earlier_call_outcome: fromEnum(otherAgentHit.earlier.outcome),
            other_agent_earlier_result_in_context:
              earlierResultIndex(runsAtStart, otherAgentHit.earlier) >= 0,
          }),
        ...(repeatHit !== undefined && {
          same_text_as_earlier_call: repeatHit.sameText,
          seconds_since_that_call: secondsSince(repeatHit.earlier),
          changed_since_that_call: fromEnum(changedKind(repeatHit)),
          ...((repeatHit.lines > 0 || repeatHit.unseen === 0) && {
            lines_changed_since_that_call: Math.min(repeatHit.lines, MAX_REPORTED_LINES),
          }),
          possible_writes_since_that_call: Math.min(repeatHit.writes, MAX_REPORTED_COUNTS),
          tests_and_lints_since_that_call: Math.min(repeatHit.checks, MAX_REPORTED_COUNTS),
          ...(earlierMessageIdx >= 0 && {
            new_message_since_that_call: runsAtStart
              .slice(earlierMessageIdx + 1)
              .some((message) =>
                message.type === "attachment"
                  ? message.attachment.type === "queued_command"
                  : message.type === "user" &&
                    (!message.isMeta || message.origin !== undefined) &&
                    !message.isVirtual &&
                    !(
                      Array.isArray(message.message.content) &&
                      message.message.content.some((contentBlock) => contentBlock.type === "tool_result")
                    ),
              ),
          }),
          earlier_call_outcome: fromEnum(repeatHit.earlier.outcome),
          earlier_result_in_context: earlierMessageIdx >= 0,
          ...(repeatHit.earlier.longOutput !== undefined && {
            earlier_output_persisted: repeatHit.earlier.longOutput.persisted,
            earlier_output_end_shown: repeatHit.earlier.longOutput.endShown,
          }),
          earlier_tail_input_candidate: repeatHit.earlier.tailInputLine === "check",
          earlier_tail_input_candidate_other: repeatHit.earlier.tailInputLine === "other",
          ...(repeatHit.earlier.tailInputFlagOn !== undefined && {
            earlier_tail_input_flag_on: repeatHit.earlier.tailInputFlagOn,
          }),
          ...(repeatHit.earlier.tailInputKept !== undefined && {
            earlier_tail_input_kept: repeatHit.earlier.tailInputKept,
          }),
        }),
      },
      counts,
      writesLeft + checksLeft > 0,
    );
    if (view.countedAsRunning) this.#o++;
    for (let { workKey: copyArgs } of repeatedShapes)
      this.#n.set(copyArgs, [...(this.#n.get(copyArgs) ?? []), scopeKeyParts]);
    return view;
  }
  #f(hit, hash, [lines, writes, checks, unseen], extraWrites, extraChecks) {
    let runningTotal = hit.backgroundCommandsAtStart + this.#o + this.#r;
    return {
      earlier: hit,
      sameText: hit.textHashes.includes(hash),
      lines: lines - hit.linesChanged,
      writes: writes - hit.possibleWrites + runningTotal + extraWrites,
      running: runningTotal,
      checks: checks - hit.testsAndLints + extraChecks,
      unseen: unseen - hit.unseenWrites + runningTotal + extraWrites + extraChecks,
    };
  }
  #p() {
    return [this.#i, this.#s, this.#c, this.#l];
  }
  noteOtherToolCall(toolCall, countIt) {
    safeRepeatMeter(() => {
      if (
        !countIt ||
        toolCall.name === BASH_TOOL_NAME ||
        SENSITIVE_TOOLS.has(toolCall.underlyingV1ToolName ?? toolCall.name) ||
        LARGE_OUTPUT_COMMANDS.has(toolCall.name)
      )
        return;
      if (toolCall.name === NOTEBOOK_EDIT_TOOL_NAME) this.#i++;
      else {
        this.#s++;
        this.#l++;
      }
    }, undefined);
  }
  clear() {
    this.#e.clear();
    this.#t.clear();
    this.#r = 0;
  }
  settle(info) {
    safeRepeatMeter(() => this.#u(info), undefined);
  }
  #u(info) {
    let { call, outcome, mayHaveWritten, linesWritten } = info;
    if (info.countedAsRunning) this.#o--;
    for (let { workKey } of call?.pieces ?? []) {
      let holders = this.#n.get(workKey) ?? [];
      let index = holders.indexOf(call?.agent ?? "");
      let remaining = index === -1 ? holders : holders.toSpliced(index, 1);
      if (remaining.length > 0) this.#n.set(workKey, remaining);
      else this.#n.delete(workKey);
    }
    let didWork = outcome !== undefined || mayHaveWritten;
    let checks = didWork ? (call?.checks ?? 0) : 0;
    let writes = didWork ? (call?.writes ?? (mayHaveWritten ? 1 : 0)) : 0;
    let unseen = writes + checks > 0 && !info.diffTaken ? 1 : 0;
    this.#i += linesWritten;
    this.#s += writes;
    this.#c += checks;
    this.#l += unseen;
    if (didWork && call?.goesOnRunning) this.#r++;
    if (call === undefined || outcome === undefined) return;
    let [linesAtStart, writesAtStart, checksAtStart, unseenAtStart] = info.countsAtStart;
    let filtered = call.pieces.filter((piece) =>
      outcome === "succeeded" && info.exitedZero
        ? piece.ranOnlyIf !== "unknown"
        : piece.ranOnlyIf === undefined &&
          (outcome === "succeeded" || outcome === "failed" || piece.writes + piece.checks <= 1),
    );
    for (let piece of filtered) {
      let isPrimaryPiece = piece.writes === call.writes && piece.checks === call.checks;
      let otherTextHashes =
        this.#e.get(piece.key)?.textHashes.filter((textHash) => textHash !== piece.textHash) ?? [];
      this.#e.delete(piece.key);
      this.#e.set(piece.key, {
        textHashes: [...otherTextHashes, piece.textHash].slice(-MAX_REPEAT_TEXT_HASHES),
        toolUseId: call.toolUseId,
        returnedAt: Date.now(),
        linesChanged: linesAtStart + (isPrimaryPiece ? linesWritten : 0),
        possibleWrites: writesAtStart + piece.writes,
        testsAndLints: checksAtStart + piece.checks,
        unseenWrites: unseenAtStart + (isPrimaryPiece ? unseen : 0),
        backgroundCommandsAtStart: call.backgroundCommandsAtStart,
        outcome,
        longOutput: info.longOutput,
        tailInputLine: info.tailInputLine,
        tailInputFlagOn: info.tailInputFlagOn,
        tailInputKept: info.tailInputKept,
      });
      let otherAgents = this.#t.get(piece.workKey)?.filter((otherAgent) => otherAgent !== call.agent) ?? [];
      this.#t.delete(piece.workKey);
      this.#t.set(piece.workKey, [...otherAgents, call.agent].slice(-MAX_AGENTS_PER_WORK_KEY));
    }
    for (let map of [this.#e, this.#t])
      while (map.size > MAX_TRACKED_ENTRIES) map.delete(map.keys().next().value ?? "");
  }
}
//@ chunk-7jxyna5q.js:535389-537684 placement
let BashRepeatMeter_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:535389", () => {
  BashRepeatMeter_2 = class BashRepeatMeter_2 {
    meter;
    call;
    fields;
    countsAtStart;
    countedAsRunning;
    outcome;
    exitedZero = false;
    longOutput;
    tailInputLine;
    tailInputFlagOn;
    tailInputKept;
    mayHaveWritten = false;
    linesWritten = 0;
    diffTaken = false;
    constructor(meter, call, fields, countsAtStart, countedAsRunning) {
      this.meter = meter;
      this.call = call;
      this.fields = fields;
      this.countsAtStart = countsAtStart;
      this.countedAsRunning = countedAsRunning;
    }
    forSettleRow() {
      let {
        repeat,
        compared_statements: comparedStatements,
        unchanged_repeats: unchangedRepeats,
        changed_since_that_call: changedSinceThatCall,
        other_agent_repeat: otherAgentRepeat,
        other_agent_direction: otherAgentDirection,
        other_agent_call_running_at_start: otherAgentCallRunningAtStart,
        other_agent_same_text_as_earlier_call: otherAgentSameTextAsEarlierCall,
        other_agent_seconds_since_that_call: otherAgentSecondsSinceThatCall,
        other_agent_lines_changed_since_that_call: otherAgentLinesChangedSinceThatCall,
        other_agent_possible_writes_since_that_call: otherAgentPossibleWritesSinceThatCall,
        other_agent_possible_writes_by_running_commands: runningWrites,
        other_agent_tests_and_lints_since_that_call: otherAgentTestsAndLintsSinceThatCall,
        other_agent_changed_since_that_call: otherAgentChangedSinceThatCall,
        other_agent_earlier_call_outcome: otherAgentEarlierCallOutcome,
        other_agent_earlier_result_in_context: otherAgentEarlierResultInContext,
      } = this.fields;
      return {
        repeat,
        compared_statements: comparedStatements,
        unchanged_repeats: unchangedRepeats,
        changed_since_that_call: changedSinceThatCall,
        other_agent_repeat: otherAgentRepeat,
        other_agent_direction: otherAgentDirection,
        other_agent_call_running_at_start: otherAgentCallRunningAtStart,
        other_agent_same_text_as_earlier_call: otherAgentSameTextAsEarlierCall,
        other_agent_seconds_since_that_call: otherAgentSecondsSinceThatCall,
        other_agent_lines_changed_since_that_call: otherAgentLinesChangedSinceThatCall,
        other_agent_possible_writes_since_that_call: otherAgentPossibleWritesSinceThatCall,
        other_agent_possible_writes_by_running_commands: runningWrites,
        other_agent_tests_and_lints_since_that_call: otherAgentTestsAndLintsSinceThatCall,
        other_agent_changed_since_that_call: otherAgentChangedSinceThatCall,
        other_agent_earlier_call_outcome: otherAgentEarlierCallOutcome,
        other_agent_earlier_result_in_context: otherAgentEarlierResultInContext,
      };
    }
    ended(result, failed, seenAt, persisted) {
      this.longOutput = result.outputFileSize === undefined ? undefined : seenAt;
      this.tailInputLine = persisted.line;
      this.tailInputFlagOn = persisted.flagOn;
      this.tailInputKept = result.backgroundTaskId === undefined ? persisted.kept : undefined;
      this.exitedZero = result.code === 0;
      this.outcome =
        result.backgroundTaskId !== undefined
          ? this.call?.startsInBackground
            ? "started_in_background"
            : result.timedOutAfterMs !== undefined
              ? "moved_to_background_at_timeout"
              : "moved_to_background"
          : result.timedOut
            ? "killed_at_timeout"
            : result.interrupted
              ? "interrupted"
              : failed
                ? "failed"
                : "succeeded";
      return {
        ...this.fields,
        ...(result.outputFileSize !== undefined && {
          output_total_bytes: Math.min(result.outputFileSize, MAX_REPORTED_BYTES),
          output_persisted: seenAt.persisted,
        }),
      };
    }
    sawEditDiff(editDiff, hasDiff) {
      if (!hasDiff || editDiff?.unavailable || editDiff?.shared || editDiff?.skipped) return;
      this.diffTaken = true;
      this.linesWritten = safeRepeatMeter(
        () =>
          (editDiff?.files ?? []).reduce(
            (acc, file) =>
              acc +
              Math.max(
                1,
                countWhere(
                  file.hunks.flatMap((hunk) => hunk.lines),
                  (line) => line.startsWith("+") || line.startsWith("-"),
                ),
              ),
            editDiff?.moreFiles ?? 0,
          ),
        1,
      );
    }
    [Symbol.dispose]() {
      this.meter.settle(this);
    }
  };
});
//@ chunk-7jxyna5q.js:537684-540209 placement
/**
 * 从 Bash AST 计算命令形状键，用于重复命令计数
 */
function commandShapeKey(command, cwd, isReadOnly) {
  let astRoot = command.length <= SPLIT_MAX_LEN ? (getParserModule()?.parse(command) ?? null) : null;
  let statements = [];
  for (let node of astRoot?.type === "program" ? flattenStatements(astRoot) : [])
    if (CHAIN_NODE_TYPES.has(node.type)) {
      if (statements.length > 0) statements.at(-1).then = node.type;
    } else if (node.type.endsWith("_redirect")) statements.at(-1)?.redirects.push(node);
    else
      statements.push({
        node,
        redirects: [],
        then: ";",
      });
  if (statements.length === 0 || statements.length > MAX_REPEAT_STATEMENTS)
    return [
      {
        place: cwd,
        stem: command.trim(),
        text: command.trim(),
        heavy: false,
        testsOrLints: false,
        onlyOnFailure: false,
        ranOnlyIf: undefined,
        goesOnRunning: false,
      },
    ];
  let currentCwd = cwd;
  let sawCd = false;
  let cdTrail = [];
  let conditionalStart = statements.slice(0, -1).findLastIndex(({ then: thenType }) => thenType !== "&&") + 1;
  let lastIndex = statements.findLastIndex(
    ({ node, then: thenType }, idx) =>
      node.text === "wait" && thenType !== "&" && [";", "&"].includes(statements[idx - 1]?.then ?? ""),
  );
  let afterHeavy = false;
  let afterLightWork = false;
  let shapes = [];
  for (let [idx, { node, redirects, then: thenType }] of statements.entries()) {
    let joined = [node, ...redirects].map((part) => part.text).join(" ");
    let previousThen = statements[idx - 1]?.then;
    if (previousThen !== "&&") {
      afterHeavy = false;
      afterLightWork = false;
    }
    let [commandNode, ...otherChildren] = node.type === "redirected_statement" ? node.children : [node];
    let any = [...otherChildren, ...redirects].some(isFileOutputRedirect);
    let counted = false;
    if (
      commandNode !== undefined &&
      (DECLARATION_NODE_TYPES.has(commandNode.type) ||
        SHELL_STATE_COMMANDS.has(getCommandBaseName(commandNode)))
    ) {
      let [commandName, argNode, ...restNodes] = commandNode.children;
      let isQuotedArg =
        argNode?.type === "raw_string" ||
        (argNode?.type === "string" &&
          argNode.children.every((child) => child.type === '"' || child.type === "string_content"));
      let argText = isQuotedArg ? argNode?.text.slice(1, -1) : argNode?.text;
      let included = ["cd", "pushd", "popd"].includes(commandName?.text ?? "");
      if (
        commandName?.text === "cd" &&
        !sawCd &&
        !any &&
        thenType !== "||" &&
        thenType !== "&" &&
        previousThen !== "||" &&
        restNodes.length === 0 &&
        (isQuotedArg || argNode?.type === "word") &&
        argText !== undefined &&
        SHELL_SAFE_ARG_RE.test(argText)
      ) {
        currentCwd = resolve(currentCwd, argText);
        continue;
      }
      if (thenType !== "&") {
        cdTrail.push(joined);
        sawCd ||= included;
        counted = true;
      }
      if (
        thenType !== "&" &&
        !any &&
        !COMMAND_SUBSTITUTION_RE.test(joined) &&
        ((commandName?.text !== "source" && commandName?.text !== ".") ||
          ACTIVATE_SCRIPT_RE.test(argText ?? ""))
      )
        continue;
    }
    let kinds = new Set(String(classifyBashCommand(node.text).bash_command_kinds).split(","));
    let isHeavy = kinds.has("builds") || kinds.has("installs_packages");
    let isCheck = !isHeavy && (kinds.has("runs_tests") || kinds.has("lints"));
    let isHeavyOrCheck = isHeavy || isCheck;
    if (
      !isHeavyOrCheck &&
      !any &&
      ((NOOP_COMMANDS.has(getCommandBaseName(node)) && !COMMAND_SUBSTITUTION_RE.test(node.text)) ||
        isReadOnly(node.text))
    ) {
      if (CD_TEXT_RE.test(node.text)) {
        cdTrail.push(joined);
        sawCd = true;
      }
      afterLightWork = true;
      continue;
    }
    let [parts0, ...restParts] = statementParts(node, !isHeavyOrCheck);
    let pipelineParts = parts0?.type === "pipeline" ? parts0.children : parts0 ? [parts0] : [];
    let keepCount = pipelineParts.length;
    while (keepCount >= 3) {
      let lastPart = pipelineParts[keepCount - 1];
      let commandBaseName = getCommandBaseName(lastPart);
      let writeFlagPattern = Object.hasOwn(WRITE_FLAG_PATTERNS, commandBaseName)
        ? WRITE_FLAG_PATTERNS[commandBaseName]
        : undefined;
      if (
        !READ_PIPE_COMMANDS.has(commandBaseName) ||
        getCommandNode(lastPart)?.children.some((child) => writeFlagPattern?.test(child.text))
      )
        break;
      keepCount -= 2;
    }
    if (!isHeavyOrCheck && keepCount === 1 && pipelineParts.length > 1 && isReadOnly(pipelineParts[0].text))
      keepCount = pipelineParts.length;
    let joined_2 = [
      ...pipelineParts.slice(0, keepCount - 1),
      ...pipelineParts
        .slice(keepCount - 1, keepCount)
        .flatMap((part) => statementParts(part, !isHeavyOrCheck)),
      ...restParts,
      ...redirects.filter(
        (redirect) => !isOutputRedirect(redirect) || (!isHeavyOrCheck && isFileOutputRedirect(redirect)),
      ),
    ]
      .map((part) => part.text)
      .concat(thenType === "&" ? ["&"] : [])
      .join(" ");
    let parts = joined_2.split(/\s+/);
    shapes.push({
      place: [currentCwd, ...cdTrail].join("\x00"),
      stem: joined_2,
      text: joined,
      heavy: isHeavyOrCheck,
      testsOrLints:
        isCheck &&
        (!parts.some((part) => FORMAT_WRITE_FLAG_RE.test(part)) ||
          parts.some((part) => DRY_RUN_FLAG_RE_2.test(part))),
      onlyOnFailure: previousThen === "||",
      ranOnlyIf: afterHeavy
        ? idx >= conditionalStart
          ? "the line exited 0"
          : "unknown"
        : afterLightWork
          ? "light work succeeded"
          : undefined,
      goesOnRunning: thenType === "&" && idx > lastIndex,
    });
    afterHeavy ||= isHeavyOrCheck;
    afterLightWork = true;
    if (!counted && node.type !== "subshell" && CD_TEXT_RE.test(node.text)) {
      cdTrail.push(joined);
      sawCd = true;
    }
  }
  return shapes;
}
//@ chunk-7jxyna5q.js:540209-540273 layout
function scopeKeyOf(agent, shape, shape_2) {
  return bunHashOf([agent, shape, shape_2.place, shape_2.stem].join("\x00"));
}
//@ chunk-7jxyna5q.js:540273-540399 layout
function isBiggerHit(candidate, previous) {
  return (
    previous === undefined ||
    candidate.lines + candidate.writes < previous.lines + previous.writes ||
    (candidate.lines + candidate.writes === previous.lines + previous.writes &&
      candidate.checks < previous.checks)
  );
}
//@ chunk-7jxyna5q.js:540399-540649 layout
function earlierResultIndex(runsAtStart, earlier) {
  return runsAtStart.findLastIndex(
    (message) =>
      message.type === "user" &&
      !message.isVirtual &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (block) =>
          block.type === "tool_result" &&
          block.tool_use_id === earlier.toolUseId &&
          (earlier.longOutput?.persisted
            ? block.content !== TOOL_RESULT_CLEARED_MESSAGE
            : isPersistableContent(block.content)),
      ),
  );
}
//@ chunk-7jxyna5q.js:540649-540814 layout
function changedKind(hit) {
  return hit.lines > 0
    ? "lines_changed"
    : hit.writes > hit.running
      ? "possible_writes"
      : hit.running > 0
        ? "running_commands_only"
        : hit.checks > 0
          ? "tests_and_lints_only"
          : "nothing";
}
//@ chunk-7jxyna5q.js:540814-540904 layout
function secondsSince(earlier) {
  return Math.min(Math.max(0, Math.round((Date.now() - earlier.returnedAt) / 1000)), MAX_REPORTED_SECONDS);
}
//@ chunk-7jxyna5q.js:540904-541027 placement
function safeRepeatMeter(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    logForDebugging(`Bash repeat meter: ${errorMessage(error)}`);
    logError(Error("The Bash repeat meter threw"));
    return fallback;
  }
}
//@ chunk-7jxyna5q.js:541027-541244 placement
function flattenStatements(node) {
  switch (node.type) {
    case "program":
    case "list":
      return node.children.flatMap(flattenStatements);
    case "comment":
      return [];
    case "redirected_statement":
      return node.children[0]?.type === "list" ? node.children.flatMap(flattenStatements) : [node];
    default:
      return [node];
  }
}
//@ chunk-7jxyna5q.js:541244-541329 placement
/**
 * 判断重定向节点是否是输出到文件的重定向。
 */
function isOutputRedirect(node) {
  return (
    node.type === "file_redirect" && node.children.some((child) => OUTPUT_REDIRECT_NODE_TYPES.has(child.type))
  );
}
//@ chunk-7jxyna5q.js:541329-541469 placement
function isFileOutputRedirect(redirect) {
  let text = redirect.children.at(-1)?.text ?? "";
  return (
    isOutputRedirect(redirect) &&
    text !== "/dev/null" &&
    !(redirect.children.some((child) => child.type === ">&") && /^(\d+|-)$/.test(text))
  );
}
//@ chunk-7jxyna5q.js:541469-541570 placement
function statementParts(node, keepFileRedirects) {
  return node.type !== "redirected_statement"
    ? [node]
    : node.children.filter(
        (child) => !isOutputRedirect(child) || (keepFileRedirects && isFileOutputRedirect(child)),
      );
}
//@ chunk-7jxyna5q.js:541570-541675 placement
function getCommandNode(node) {
  let commandNode = node.type === "redirected_statement" ? node.children[0] : node;
  return commandNode?.type === "command" ? commandNode : undefined;
}
//@ chunk-7jxyna5q.js:541675-541795 placement
function getCommandBaseName(node) {
  let text = getCommandNode(node)?.children.find((child) => child.type === "command_name")?.text;
  return text?.slice(text.lastIndexOf("/") + 1) ?? "";
}
export { BashRepeatMeter, isBashRepeatMetered };
