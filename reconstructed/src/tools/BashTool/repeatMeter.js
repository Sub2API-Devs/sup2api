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
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-s61vbvea.js:610670-611839 placement
/**
 * 重复命令统计的常量与辅助集合：保留的文本哈希数、语句数上限、遥测计数封顶、视为中性的工具、敏感工具、只读管道命令、写文件类命令与重定向集合等。
 */
var REPEATABLE_READ_COMMANDS = 500;
var MAX_REPEAT_TEXT_HASHES = 8;
var MAX_REPEAT_STATEMENTS = 20;
var MAX_REPORTED_COUNTS = 1000;
var MAX_REPORTED_LINES = 1e5;
var MAX_REPORTED_SECONDS = 86400;
var MAX_REPORTED_BYTES = 1073741824;
var LARGE_OUTPUT_COMMANDS = new Set([
  TODO_WRITE_TOOL_NAME,
  TASK_CREATE_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  TASKSTOP,
  EXITPLANMODE,
  SKILL,
]);
var SENSITIVE_TOOLS = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]);
var READ_PIPE_COMMANDS = new Set([
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
var AWK_FILTER_RE = /^-[if]|system|getline|[>|]/;
var WRITE_FLAG_PATTERNS = {
  sed: /^(-[A-Za-z]*i|--in-place)/,
  sort: /^(-[A-Za-z]*o|--output)/,
  awk: AWK_FILTER_RE,
  gawk: AWK_FILTER_RE,
};
var NOOP_COMMANDS = new Set(["echo", "true", "false"]);
var SHELL_STATE_COMMANDS = new Set([
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
var DECLARATION_NODE_TYPES = new Set([
  "declaration_command",
  "unset_command",
  "variable_assignment",
  "variable_assignments",
]);
var ACTIVATE_SCRIPT_RE = /(^|\/)activate(\.\w+)?$/;
var FORMAT_WRITE_FLAG_RE =
  /^(--fix.*|--write|-w|-i|--in-place|--apply.*|--unsafe-fixes|-a|-A|--autocorrect.*|-F|-u|-update|--update.*|--snapshot-update|--force-regen|--bless|--accept|[A-Z0-9_]*(UPDATE|ACCEPT|BLESS|REGEN|OVERWRITE|RECORD)[A-Z0-9_]*=.*|(.*[-_:/])?(fix|fmt|format|write)([-_:].*)?|(.*\/)?(black|isort|rustfmt|autopep8|yapf|pre-commit))$/;
var DRY_RUN_FLAG_RE_2 = /^(--check.*|--diff|--dry-run)$/;
var CD_TEXT_RE = /\b(cd|pushd|popd)\b/;
var COMMAND_SUBSTITUTION_RE = /[`]|[$<>]\(/;
var OUTPUT_REDIRECT_NODE_TYPES = new Set([">", ">>", ">&", "&>", "&>>", ">|"]);
var CHAIN_NODE_TYPES = new Set(["&&", "||", ";", "&"]);
var SHELL_SAFE_ARG_RE = /^[\w@%+=:,./][\w@%+=:,./ -]*$/;
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
  begin(e) {
    return safeRepeatMeter(() => this.#r(e), new BashRepeatMeter_2(this, undefined, {}, [0, 0, 0, 0], false));
  }
  #r(e) {
    let n = getTotalLinesAdded() + getTotalLinesRemoved();
    this.#t += n < this.#n ? n : n - this.#n;
    this.#n = n;
    let { toolUseId, messages } = e;
    if (toolUseId === undefined || messages.length === 0) {
      this.#a++;
      return new BashRepeatMeter_2(this, undefined, {}, this.#s(), true);
    }
    let { command, description, timeout, run_in_background: runInBackground, ...R } = e.input;
    let x = commandShapeKey(command, e.cwd, e.isReadOnly);
    let any = x.some((ie) => ie.heavy && !ie.onlyOnFailure);
    let j = [
      e.agentId ?? "",
      jsonStringify({
        ...R,
        dangerouslyDisableSandbox: R.dangerouslyDisableSandbox === true,
        ...false,
      }),
    ];
    let countsAtStart = this.#s();
    let [L, q, Q, Z] = countsAtStart;
    let ee = 0;
    let ae = 0;
    let se = [];
    let re = 0;
    let he;
    for (let ie of x.length > 0
      ? x
      : [
          {
            place: e.cwd,
            stem: command.trim(),
            text: command.trim(),
            heavy: false,
            testsOrLints: false,
            onlyOnFailure: false,
            ranOnlyIf: undefined,
            goesOnRunning: false,
          },
        ]) {
      let Ee = !ie.onlyOnFailure && (!any || ie.heavy);
      let Ie = bunHashOf([...j, ie.place, ie.stem].join("\x00"));
      let ke = bunHashOf(ie.text);
      let Me = Ee ? this.#e.get(Ie) : undefined;
      if (Me !== undefined) {
        let We = Me.backgroundCommandsAtStart + this.#a + this.#c;
        let nt = {
          earlier: Me,
          sameText: Me.textHashes.includes(ke),
          lines: L - Me.linesChanged,
          writes: q - Me.possibleWrites + We + ee,
          checks: Q - Me.testsAndLints + ae,
          unseen: Z - Me.unseenWrites + We + ee + ae,
        };
        if (nt.lines + nt.writes === 0) re++;
        if (
          he === undefined ||
          nt.lines + nt.writes < he.lines + he.writes ||
          (nt.lines + nt.writes === he.lines + he.writes && nt.checks < he.checks)
        )
          he = nt;
      }
      if (ie.testsOrLints) ae++;
      else if (x.length > 0) ee++;
      if (Ee)
        se.push({
          key: Ie,
          textHash: ke,
          writes: ee,
          checks: ae,
          ranOnlyIf: ie.ranOnlyIf,
        });
    }
    let earlier = he?.earlier;
    let ce =
      earlier === undefined
        ? -1
        : messages.findLastIndex(
            (message) =>
              message.type === "user" &&
              !message.isVirtual &&
              Array.isArray(message.message.content) &&
              message.message.content.some(
                (Ee) =>
                  Ee.type === "tool_result" &&
                  Ee.tool_use_id === earlier.toolUseId &&
                  (earlier.outputPersisted
                    ? Ee.content !== TOOL_RESULT_CLEARED_MESSAGE
                    : isContentAlreadyCompacted(Ee.content)),
              ),
          );
    let we = new BashRepeatMeter_2(
      this,
      {
        pieces: se,
        writes: ee,
        checks: ae,
        goesOnRunning: x.some((ie) => ie.goesOnRunning),
        toolUseId,
        startsInBackground: runInBackground === true,
        backgroundCommandsAtStart: count(
          Object.values(e.taskRegistry.all()),
          (ie) => isLocalShellTask(ie) && ie.isBackgrounded && ie.status === "running",
        ),
      },
      {
        repeat: he !== undefined,
        compared_statements: se.length,
        unchanged_repeats: re,
        ...(he !== undefined && {
          same_text_as_earlier_call: he.sameText,
          seconds_since_that_call: Math.min(
            Math.max(0, Math.round((Date.now() - he.earlier.returnedAt) / 1000)),
            MAX_REPORTED_SECONDS,
          ),
          ...((he.lines > 0 || he.unseen === 0) && {
            lines_changed_since_that_call: Math.min(he.lines, MAX_REPORTED_LINES),
          }),
          possible_writes_since_that_call: Math.min(he.writes, MAX_REPORTED_COUNTS),
          tests_and_lints_since_that_call: Math.min(he.checks, MAX_REPORTED_COUNTS),
          ...(ce >= 0 && {
            new_message_since_that_call: messages
              .slice(ce + 1)
              .some((message) =>
                message.type === "attachment"
                  ? message.attachment.type === "queued_command"
                  : message.type === "user" &&
                    (!message.isMeta || message.origin !== undefined) &&
                    !message.isVirtual &&
                    !(
                      Array.isArray(message.message.content) &&
                      message.message.content.some((Ee) => Ee.type === "tool_result")
                    ),
              ),
          }),
          earlier_call_outcome: fromEnum(he.earlier.outcome),
          earlier_result_in_context: ce >= 0,
        }),
      },
      countsAtStart,
      ee + ae > 0,
    );
    if (we.countedAsRunning) this.#a++;
    return we;
  }
  #s() {
    return [this.#t, this.#i, this.#l, this.#o];
  }
  noteOtherToolCall(e, n) {
    safeRepeatMeter(() => {
      if (
        !n ||
        e.name === BASH_TOOL_NAME ||
        SENSITIVE_TOOLS.has(e.underlyingV1ToolName ?? e.name) ||
        LARGE_OUTPUT_COMMANDS.has(e.name)
      )
        return;
      if (e.name === NOTEBOOK_EDIT_TOOL_NAME) this.#t++;
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
  settle(e) {
    safeRepeatMeter(() => this.#u(e), undefined);
  }
  #u(e) {
    let { call: n, outcome, mayHaveWritten, linesWritten } = e;
    if (e.countedAsRunning) this.#a--;
    let y = outcome !== undefined || mayHaveWritten;
    let S = y ? (n?.checks ?? 0) : 0;
    let w = y ? (n?.writes ?? (mayHaveWritten ? 1 : 0)) : 0;
    let R = w + S > 0 && !e.diffTaken ? 1 : 0;
    this.#t += linesWritten;
    this.#i += w;
    this.#l += S;
    this.#o += R;
    if (y && n?.goesOnRunning) this.#c++;
    if (n === undefined || outcome === undefined) return;
    let [x, P, j, G] = e.countsAtStart;
    let filtered = n.pieces.filter((piece) =>
      outcome === "succeeded" && e.exitedZero
        ? piece.ranOnlyIf !== "unknown"
        : piece.ranOnlyIf === undefined &&
          (outcome === "succeeded" || outcome === "failed" || piece.writes + piece.checks <= 1),
    );
    for (let q of filtered) {
      let Q = q.writes === n.writes && q.checks === n.checks;
      let Z = this.#e.get(q.key)?.textHashes.filter((textHash) => textHash !== q.textHash) ?? [];
      this.#e.delete(q.key);
      this.#e.set(q.key, {
        textHashes: [...Z, q.textHash].slice(-MAX_REPEAT_TEXT_HASHES),
        toolUseId: n.toolUseId,
        returnedAt: Date.now(),
        linesChanged: x + (Q ? linesWritten : 0),
        possibleWrites: P + q.writes,
        testsAndLints: j + q.checks,
        unseenWrites: G + (Q ? R : 0),
        backgroundCommandsAtStart: n.backgroundCommandsAtStart,
        outcome,
        outputPersisted: e.outputPersisted,
      });
    }
    while (this.#e.size > REPEATABLE_READ_COMMANDS) this.#e.delete(this.#e.keys().next().value ?? "");
  }
}
//@ chunk-s61vbvea.js:615870-616862 placement
class BashRepeatMeter_2 {
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
  ended(e, n, r) {
    this.outputPersisted = r;
    this.exitedZero = e.code === 0;
    this.outcome =
      e.backgroundTaskId !== undefined
        ? this.call?.startsInBackground
          ? "started_in_background"
          : e.timedOutAfterMs !== undefined
            ? "moved_to_background_at_timeout"
            : "moved_to_background"
        : e.timedOut
          ? "killed_at_timeout"
          : e.interrupted
            ? "interrupted"
            : n
              ? "failed"
              : "succeeded";
    return {
      ...this.fields,
      ...(e.outputFileSize !== undefined && {
        output_total_bytes: Math.min(e.outputFileSize, MAX_REPORTED_BYTES),
        output_persisted: r,
      }),
    };
  }
  sawEditDiff(e, n) {
    if (!n || e?.unavailable || e?.shared || e?.skipped) return;
    this.diffTaken = true;
    this.linesWritten = safeRepeatMeter(
      () =>
        (e?.files ?? []).reduce(
          (acc, s) =>
            acc +
            Math.max(
              1,
              count(
                s.hunks.flatMap((hunk) => hunk.lines),
                (h) => h.startsWith("+") || h.startsWith("-"),
              ),
            ),
          e?.moreFiles ?? 0,
        ),
      1,
    );
  }
  [Symbol.dispose]() {
    this.meter.settle(this);
  }
}
//@ chunk-s61vbvea.js:616862-619381 placement
/**
 * 从 Bash AST 计算命令形状键，用于重复命令计数
 */
function commandShapeKey(command, cwd, isReadOnly) {
  let s = command.length <= SPLIT_MAX_LEN ? (getParserModule()?.parse(command) ?? null) : null;
  let h = [];
  for (let L of s?.type === "program" ? flattenStatements(s) : [])
    if (CHAIN_NODE_TYPES.has(L.type)) {
      if (h.length > 0) h.at(-1).then = L.type;
    } else if (L.type.endsWith("_redirect")) h.at(-1)?.redirects.push(L);
    else
      h.push({
        node: L,
        redirects: [],
        then: ";",
      });
  if (h.length === 0 || h.length > MAX_REPEAT_STATEMENTS)
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
  let y = cwd;
  let S = false;
  let w = [];
  let R = h.slice(0, -1).findLastIndex(({ then: L }) => L !== "&&") + 1;
  let lastIndex = h.findLastIndex(
    ({ node, then: q }, Q) => node.text === "wait" && q !== "&" && [";", "&"].includes(h[Q - 1]?.then ?? ""),
  );
  let P = false;
  let j = false;
  let G = [];
  for (let [L, { node: q, redirects: Q, then: Z }] of h.entries()) {
    let joined = [q, ...Q].map((Re) => Re.text).join(" ");
    let ae = h[L - 1]?.then;
    if (ae !== "&&") {
      P = false;
      j = false;
    }
    let [se, ...re] = q.type === "redirected_statement" ? q.children : [q];
    let any = [...re, ...Q].some(isFileOutputRedirect);
    let Se = false;
    if (
      se !== undefined &&
      (DECLARATION_NODE_TYPES.has(se.type) || SHELL_STATE_COMMANDS.has(getCommandBaseName(se)))
    ) {
      let [Re, Ne, ...Je] = se.children;
      let lt =
        Ne?.type === "raw_string" ||
        (Ne?.type === "string" &&
          Ne.children.every((child) => child.type === '"' || child.type === "string_content"));
      let Ae = lt ? Ne?.text.slice(1, -1) : Ne?.text;
      let included = ["cd", "pushd", "popd"].includes(Re?.text ?? "");
      if (
        Re?.text === "cd" &&
        !S &&
        !any &&
        Z !== "||" &&
        Z !== "&" &&
        ae !== "||" &&
        Je.length === 0 &&
        (lt || Ne?.type === "word") &&
        Ae !== undefined &&
        SHELL_SAFE_ARG_RE.test(Ae)
      ) {
        y = resolve(y, Ae);
        continue;
      }
      if (Z !== "&") {
        w.push(joined);
        S ||= included;
        Se = true;
      }
      if (
        Z !== "&" &&
        !any &&
        !COMMAND_SUBSTITUTION_RE.test(joined) &&
        ((Re?.text !== "source" && Re?.text !== ".") || ACTIVATE_SCRIPT_RE.test(Ae ?? ""))
      )
        continue;
    }
    let ce = new Set(String(classifyBashCommand(q.text).bash_command_kinds).split(","));
    let we = ce.has("builds") || ce.has("installs_packages");
    let ie = !we && (ce.has("runs_tests") || ce.has("lints"));
    let Ee = we || ie;
    if (
      !Ee &&
      !any &&
      ((NOOP_COMMANDS.has(getCommandBaseName(q)) && !COMMAND_SUBSTITUTION_RE.test(q.text)) ||
        isReadOnly(q.text))
    ) {
      if (CD_TEXT_RE.test(q.text)) {
        w.push(joined);
        S = true;
      }
      j = true;
      continue;
    }
    let [Ie, ...ke] = statementParts(q, !Ee);
    let Me = Ie?.type === "pipeline" ? Ie.children : Ie ? [Ie] : [];
    let We = Me.length;
    while (We >= 3) {
      let Re = Me[We - 1];
      let commandBaseName = getCommandBaseName(Re);
      let Je = Object.hasOwn(WRITE_FLAG_PATTERNS, commandBaseName)
        ? WRITE_FLAG_PATTERNS[commandBaseName]
        : undefined;
      if (
        !READ_PIPE_COMMANDS.has(commandBaseName) ||
        getCommandNode(Re)?.children.some((child) => Je?.test(child.text))
      )
        break;
      We -= 2;
    }
    if (!Ee && We === 1 && Me.length > 1 && isReadOnly(Me[0].text)) We = Me.length;
    let joined_2 = [
      ...Me.slice(0, We - 1),
      ...Me.slice(We - 1, We).flatMap((Re) => statementParts(Re, !Ee)),
      ...ke,
      ...Q.filter((Re) => !isOutputRedirect(Re) || (!Ee && isFileOutputRedirect(Re))),
    ]
      .map((Re) => Re.text)
      .concat(Z === "&" ? ["&"] : [])
      .join(" ");
    let parts = joined_2.split(/\s+/);
    G.push({
      place: [y, ...w].join("\x00"),
      stem: joined_2,
      text: joined,
      heavy: Ee,
      testsOrLints:
        ie &&
        (!parts.some((Re) => FORMAT_WRITE_FLAG_RE.test(Re)) ||
          parts.some((Re) => DRY_RUN_FLAG_RE_2.test(Re))),
      onlyOnFailure: ae === "||",
      ranOnlyIf: P ? (L >= R ? "the line exited 0" : "unknown") : j ? "light work succeeded" : undefined,
      goesOnRunning: Z === "&" && L > lastIndex,
    });
    P ||= Ee;
    j = true;
    if (!Se && q.type !== "subshell" && CD_TEXT_RE.test(q.text)) {
      w.push(joined);
      S = true;
    }
  }
  return G;
}
//@ chunk-s61vbvea.js:619381-619504 placement
function safeRepeatMeter(e, n) {
  try {
    return e();
  } catch (error) {
    logForDebugging(`Bash repeat meter: ${errorMessage(error)}`);
    logError(Error("The Bash repeat meter threw"));
    return n;
  }
}
//@ chunk-s61vbvea.js:619504-619721 placement
function flattenStatements(e) {
  switch (e.type) {
    case "program":
    case "list":
      return e.children.flatMap(flattenStatements);
    case "comment":
      return [];
    case "redirected_statement":
      return e.children[0]?.type === "list" ? e.children.flatMap(flattenStatements) : [e];
    default:
      return [e];
  }
}
//@ chunk-s61vbvea.js:619721-619806 placement
/**
 * 判断重定向节点是否是输出到文件的重定向。
 */
function isOutputRedirect(e) {
  return e.type === "file_redirect" && e.children.some((child) => OUTPUT_REDIRECT_NODE_TYPES.has(child.type));
}
//@ chunk-s61vbvea.js:619806-619946 placement
function isFileOutputRedirect(e) {
  let text = e.children.at(-1)?.text ?? "";
  return (
    isOutputRedirect(e) &&
    text !== "/dev/null" &&
    !(e.children.some((child) => child.type === ">&") && /^(\d+|-)$/.test(text))
  );
}
//@ chunk-s61vbvea.js:619946-620047 placement
function statementParts(e, n) {
  return e.type !== "redirected_statement"
    ? [e]
    : e.children.filter((child) => !isOutputRedirect(child) || (n && isFileOutputRedirect(child)));
}
//@ chunk-s61vbvea.js:620047-620152 placement
function getCommandNode(e) {
  let n = e.type === "redirected_statement" ? e.children[0] : e;
  return n?.type === "command" ? n : undefined;
}
//@ chunk-s61vbvea.js:620152-620272 placement
function getCommandBaseName(e) {
  let text = getCommandNode(e)?.children.find((child) => child.type === "command_name")?.text;
  return text?.slice(text.lastIndexOf("/") + 1) ?? "";
}
export { BashRepeatMeter };
