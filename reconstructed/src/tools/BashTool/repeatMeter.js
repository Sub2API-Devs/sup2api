/**
 * tools/BashTool/repeatMeter.ts
 *
 * 重复 Bash 命令计数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (11)
 * attribution: placement 11
 */
import { resolve } from "path";
import { TODO_WRITE_TOOL_NAME } from "../TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../TaskUpdateTool/constants.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { EXITPLANMODE } from "../ExitPlanModeTool/constants.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getTotalLinesAdded, getTotalLinesRemoved } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { TOOL_RESULT_CLEARED_MESSAGE, isContentAlreadyCompacted } from "../../utils/toolResultStorage.js";
import { count } from "../../utils/collections.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { SPLIT_MAX_LEN } from "../../utils/bash/commands.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { classifyBashCommand } from "./commandClassification.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:610670-611839 placement
/**
 * 重复命令统计的常量与辅助集合：保留的文本哈希数、语句数上限、遥测计数封顶、视为中性的工具、敏感工具、只读管道命令、写文件类命令与重定向集合等。
 */
var REPEATABLE_READ_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_REPEAT_TEXT_HASHES;
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
deferInit("chunk-s61vbvea.js:610670", () => {
  REPEATABLE_READ_COMMANDS = 500;
  MAX_REPEAT_TEXT_HASHES = 8;
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
  SENSITIVE_TOOLS = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]);
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
//@ chunk-s61vbvea.js:611839-615870 placement
/**
 * 跟踪重复执行的只读 Bash 命令（tail/grep 等），用于提示改用后台或 Monitor
 */
class BashRepeatMeter {
  #e = new Map();
  #t = 0;
  #n = 0;
  #i = 0;
  #l = 0;
  #o = 0;
  #a = 0;
  #c = 0;
  begin(call) {
    return safeRepeatMeter(
      () => this.#r(call),
      new BashRepeatMeter_2(this, undefined, {}, [0, 0, 0, 0], false),
    );
  }
  #r(call) {
    let lineDelta = getTotalLinesAdded() + getTotalLinesRemoved();
    this.#t += lineDelta < this.#n ? lineDelta : lineDelta - this.#n;
    this.#n = lineDelta;
    let { toolUseId, messages } = call;
    if (toolUseId === undefined || messages.length === 0) {
      this.#a++;
      return new BashRepeatMeter_2(this, undefined, {}, this.#s(), true);
    }
    let { command, description, timeout, run_in_background: runInBackground, ...restInput } = call.input;
    let shapes = commandShapeKey(command, call.cwd, call.isReadOnly);
    let any = shapes.some((shape) => shape.heavy && !shape.onlyOnFailure);
    let scopeKeyParts = [
      call.agentId ?? "",
      jsonStringify({
        ...restInput,
        dangerouslyDisableSandbox: restInput.dangerouslyDisableSandbox === true,
        ...false,
      }),
    ];
    let countsAtStart = this.#s();
    let [runsAtStart, failuresAtStart, heavyRunsAtStart, wastedAtStart] = countsAtStart;
    let runsLeft = 0;
    let failuresLeft = 0;
    let repeatedShapes = [];
    let wastedLeft = 0;
    let earliestRecord;
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
      let shouldCount = !shape.onlyOnFailure && (!any || shape.heavy);
      let scopeKey = bunHashOf([...scopeKeyParts, shape.place, shape.stem].join("\x00"));
      let textKey = bunHashOf(shape.text);
      let earlier = shouldCount ? this.#e.get(scopeKey) : undefined;
      if (earlier !== undefined) {
        let backgroundAtStart = earlier.backgroundCommandsAtStart + this.#a + this.#c;
        let record = {
          earlier,
          sameText: earlier.textHashes.includes(textKey),
          lines: runsAtStart - earlier.linesChanged,
          writes: failuresAtStart - earlier.possibleWrites + backgroundAtStart + runsLeft,
          checks: heavyRunsAtStart - earlier.testsAndLints + failuresLeft,
          unseen: wastedAtStart - earlier.unseenWrites + backgroundAtStart + runsLeft + failuresLeft,
        };
        if (record.lines + record.writes === 0) wastedLeft++;
        if (
          earliestRecord === undefined ||
          record.lines + record.writes < earliestRecord.lines + earliestRecord.writes ||
          (record.lines + record.writes === earliestRecord.lines + earliestRecord.writes &&
            record.checks < earliestRecord.checks)
        )
          earliestRecord = record;
      }
      if (shape.testsOrLints) failuresLeft++;
      else if (shapes.length > 0) runsLeft++;
      if (shouldCount)
        repeatedShapes.push({
          key: scopeKey,
          textHash: textKey,
          writes: runsLeft,
          checks: failuresLeft,
          ranOnlyIf: shape.ranOnlyIf,
        });
    }
    let earlier = earliestRecord?.earlier;
    let earlierMessageIdx =
      earlier === undefined
        ? -1
        : messages.findLastIndex(
            (message) =>
              message.type === "user" &&
              !message.isVirtual &&
              Array.isArray(message.message.content) &&
              message.message.content.some(
                (contentBlock) =>
                  contentBlock.type === "tool_result" &&
                  contentBlock.tool_use_id === earlier.toolUseId &&
                  (earlier.outputPersisted
                    ? contentBlock.content !== TOOL_RESULT_CLEARED_MESSAGE
                    : isContentAlreadyCompacted(contentBlock.content)),
              ),
          );
    let meter = new BashRepeatMeter_2(
      this,
      {
        pieces: repeatedShapes,
        writes: runsLeft,
        checks: failuresLeft,
        goesOnRunning: shapes.some((shape) => shape.goesOnRunning),
        toolUseId,
        startsInBackground: runInBackground === true,
        backgroundCommandsAtStart: count(
          Object.values(call.taskRegistry.all()),
          (task) => isLocalShellTask(task) && task.isBackgrounded && task.status === "running",
        ),
      },
      {
        repeat: earliestRecord !== undefined,
        compared_statements: repeatedShapes.length,
        unchanged_repeats: wastedLeft,
        ...(earliestRecord !== undefined && {
          same_text_as_earlier_call: earliestRecord.sameText,
          seconds_since_that_call: Math.min(
            Math.max(0, Math.round((Date.now() - earliestRecord.earlier.returnedAt) / 1000)),
            MAX_REPORTED_SECONDS,
          ),
          ...((earliestRecord.lines > 0 || earliestRecord.unseen === 0) && {
            lines_changed_since_that_call: Math.min(earliestRecord.lines, MAX_REPORTED_LINES),
          }),
          possible_writes_since_that_call: Math.min(earliestRecord.writes, MAX_REPORTED_COUNTS),
          tests_and_lints_since_that_call: Math.min(earliestRecord.checks, MAX_REPORTED_COUNTS),
          ...(earlierMessageIdx >= 0 && {
            new_message_since_that_call: messages
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
          earlier_call_outcome: fromEnum(earliestRecord.earlier.outcome),
          earlier_result_in_context: earlierMessageIdx >= 0,
        }),
      },
      countsAtStart,
      runsLeft + failuresLeft > 0,
    );
    if (meter.countedAsRunning) this.#a++;
    return meter;
  }
  #s() {
    return [this.#t, this.#i, this.#l, this.#o];
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
      if (toolCall.name === NOTEBOOK_EDIT_TOOL_NAME) this.#t++;
      else {
        this.#i++;
        this.#o++;
      }
    }, undefined);
  }
  clear() {
    this.#e.clear();
    this.#c = 0;
  }
  settle(info) {
    safeRepeatMeter(() => this.#u(info), undefined);
  }
  #u(info) {
    let { call, outcome, mayHaveWritten, linesWritten } = info;
    if (info.countedAsRunning) this.#a--;
    let didWork = outcome !== undefined || mayHaveWritten;
    let checks = didWork ? (call?.checks ?? 0) : 0;
    let writes = didWork ? (call?.writes ?? (mayHaveWritten ? 1 : 0)) : 0;
    let unseen = writes + checks > 0 && !info.diffTaken ? 1 : 0;
    this.#t += linesWritten;
    this.#i += writes;
    this.#l += checks;
    this.#o += unseen;
    if (didWork && call?.goesOnRunning) this.#c++;
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
        outputPersisted: info.outputPersisted,
      });
    }
    while (this.#e.size > REPEATABLE_READ_COMMANDS) this.#e.delete(this.#e.keys().next().value ?? "");
  }
}
//@ chunk-s61vbvea.js:615870-616862 placement
let BashRepeatMeter_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:615870", () => {
  BashRepeatMeter_2 = class BashRepeatMeter_2 {
    meter;
    call;
    fields;
    countsAtStart;
    countedAsRunning;
    outcome;
    exitedZero = false;
    outputPersisted = false;
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
    ended(result, failed, outputPersisted) {
      this.outputPersisted = outputPersisted;
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
          output_persisted: outputPersisted,
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
                count(
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
//@ chunk-s61vbvea.js:616862-619381 placement
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
//@ chunk-s61vbvea.js:619381-619504 placement
function safeRepeatMeter(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    logForDebugging(`Bash repeat meter: ${errorMessage(error)}`);
    logError(Error("The Bash repeat meter threw"));
    return fallback;
  }
}
//@ chunk-s61vbvea.js:619504-619721 placement
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
//@ chunk-s61vbvea.js:619721-619806 placement
/**
 * 判断重定向节点是否是输出到文件的重定向。
 */
function isOutputRedirect(node) {
  return (
    node.type === "file_redirect" && node.children.some((child) => OUTPUT_REDIRECT_NODE_TYPES.has(child.type))
  );
}
//@ chunk-s61vbvea.js:619806-619946 placement
function isFileOutputRedirect(redirect) {
  let text = redirect.children.at(-1)?.text ?? "";
  return (
    isOutputRedirect(redirect) &&
    text !== "/dev/null" &&
    !(redirect.children.some((child) => child.type === ">&") && /^(\d+|-)$/.test(text))
  );
}
//@ chunk-s61vbvea.js:619946-620047 placement
function statementParts(node, keepFileRedirects) {
  return node.type !== "redirected_statement"
    ? [node]
    : node.children.filter(
        (child) => !isOutputRedirect(child) || (keepFileRedirects && isFileOutputRedirect(child)),
      );
}
//@ chunk-s61vbvea.js:620047-620152 placement
function getCommandNode(node) {
  let commandNode = node.type === "redirected_statement" ? node.children[0] : node;
  return commandNode?.type === "command" ? commandNode : undefined;
}
//@ chunk-s61vbvea.js:620152-620272 placement
function getCommandBaseName(node) {
  let text = getCommandNode(node)?.children.find((child) => child.type === "command_name")?.text;
  return text?.slice(text.lastIndexOf("/") + 1) ?? "";
}
export { BashRepeatMeter };
