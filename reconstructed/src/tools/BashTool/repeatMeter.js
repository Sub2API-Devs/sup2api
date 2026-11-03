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
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
} from "path";
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
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getTotalLinesAdded, getTotalLinesRemoved } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sT } from "../../utils/pastedContent.js";
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
var REPEATABLE_READ_COMMANDS = 500,
  mG = 8,
  gG = 20,
  ME = 1000,
  hG = 1e5,
  yG = 86400,
  SG = 1073741824,
  _G = new Set([
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TASKSTOP,
    EXITPLANMODE,
    SKILL,
  ]),
  bG = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]),
  wG = new Set([
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
  ]),
  DE = /^-[if]|system|getline|[>|]/,
  NE = { sed: /^(-[A-Za-z]*i|--in-place)/, sort: /^(-[A-Za-z]*o|--output)/, awk: DE, gawk: DE },
  kG = new Set(["echo", "true", "false"]),
  EG = new Set([
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
  ]),
  RG = new Set(["declaration_command", "unset_command", "variable_assignment", "variable_assignments"]),
  xG = /(^|\/)activate(\.\w+)?$/,
  TG =
    /^(--fix.*|--write|-w|-i|--in-place|--apply.*|--unsafe-fixes|-a|-A|--autocorrect.*|-F|-u|-update|--update.*|--snapshot-update|--force-regen|--bless|--accept|[A-Z0-9_]*(UPDATE|ACCEPT|BLESS|REGEN|OVERWRITE|RECORD)[A-Z0-9_]*=.*|(.*[-_:/])?(fix|fmt|format|write)([-_:].*)?|(.*\/)?(black|isort|rustfmt|autopep8|yapf|pre-commit))$/,
  vG = /^(--check.*|--diff|--dry-run)$/,
  LE = /\b(cd|pushd|popd)\b/,
  FE = /[`]|[$<>]\(/,
  CG = new Set([">", ">>", ">&", "&>", "&>>", ">|"]),
  AG = new Set(["&&", "||", ";", "&"]),
  PG = /^[\w@%+=:,./][\w@%+=:,./ -]*$/;
/**
 * 跟踪重复执行的只读 Bash 命令（tail/grep 等），用于提示改用后台或 Monitor
 */
//@ chunk-s61vbvea.js:611839-615870 placement
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
    return safeRepeatMeter(() => this.#r(e), new BashRepeatMeter_2(this, void 0, {}, [0, 0, 0, 0], !1));
  }
  #r(e) {
    let n = getTotalLinesAdded() + getTotalLinesRemoved();
    ((this.#t += n < this.#n ? n : n - this.#n), (this.#n = n));
    let { toolUseId: toolUseId, messages: messages } = e;
    if (toolUseId === void 0 || messages.length === 0)
      return (this.#a++, new BashRepeatMeter_2(this, void 0, {}, this.#s(), !0));
    let {
        command: command,
        description: description,
        timeout: timeout,
        run_in_background: run_in_background,
        ...R
      } = e.input,
      x = commandShapeKey(command, e.cwd, e.isReadOnly),
      any = x.some((ie) => ie.heavy && !ie.onlyOnFailure),
      j = [
        e.agentId ?? "",
        jsonStringify({ ...R, dangerouslyDisableSandbox: R.dangerouslyDisableSandbox === !0, ...!1 }),
      ],
      G = this.#s(),
      [L, q, Q, Z] = G,
      ee = 0,
      ae = 0,
      se = [],
      re = 0,
      he;
    for (let ie of x.length > 0
      ? x
      : [
          {
            place: e.cwd,
            stem: command.trim(),
            text: command.trim(),
            heavy: !1,
            testsOrLints: !1,
            onlyOnFailure: !1,
            ranOnlyIf: void 0,
            goesOnRunning: !1,
          },
        ]) {
      let Ee = !ie.onlyOnFailure && (!any || ie.heavy),
        Ie = sT([...j, ie.place, ie.stem].join("\x00")),
        ke = sT(ie.text),
        Me = Ee ? this.#e.get(Ie) : void 0;
      if (Me !== void 0) {
        let We = Me.backgroundCommandsAtStart + this.#a + this.#c,
          nt = {
            earlier: Me,
            sameText: Me.textHashes.includes(ke),
            lines: L - Me.linesChanged,
            writes: q - Me.possibleWrites + We + ee,
            checks: Q - Me.testsAndLints + ae,
            unseen: Z - Me.unseenWrites + We + ee + ae,
          };
        if (nt.lines + nt.writes === 0) re++;
        if (
          he === void 0 ||
          nt.lines + nt.writes < he.lines + he.writes ||
          (nt.lines + nt.writes === he.lines + he.writes && nt.checks < he.checks)
        )
          he = nt;
      }
      if (ie.testsOrLints) ae++;
      else if (x.length > 0) ee++;
      if (Ee) se.push({ key: Ie, textHash: ke, writes: ee, checks: ae, ranOnlyIf: ie.ranOnlyIf });
    }
    let Se = he?.earlier,
      ce =
        Se === void 0
          ? -1
          : messages.findLastIndex(
              (ie) =>
                ie.type === "user" &&
                !ie.isVirtual &&
                Array.isArray(ie.message.content) &&
                ie.message.content.some(
                  (Ee) =>
                    Ee.type === "tool_result" &&
                    Ee.tool_use_id === Se.toolUseId &&
                    (Se.outputPersisted
                      ? Ee.content !== TOOL_RESULT_CLEARED_MESSAGE
                      : isContentAlreadyCompacted(Ee.content)),
                ),
            ),
      we = new BashRepeatMeter_2(
        this,
        {
          pieces: se,
          writes: ee,
          checks: ae,
          goesOnRunning: x.some((ie) => ie.goesOnRunning),
          toolUseId: toolUseId,
          startsInBackground: run_in_background === !0,
          backgroundCommandsAtStart: count(
            Object.values(e.taskRegistry.all()),
            (ie) => isLocalShellTask(ie) && ie.isBackgrounded && ie.status === "running",
          ),
        },
        {
          repeat: he !== void 0,
          compared_statements: se.length,
          unchanged_repeats: re,
          ...(he !== void 0 && {
            same_text_as_earlier_call: he.sameText,
            seconds_since_that_call: Math.min(
              Math.max(0, Math.round((Date.now() - he.earlier.returnedAt) / 1000)),
              yG,
            ),
            ...((he.lines > 0 || he.unseen === 0) && {
              lines_changed_since_that_call: Math.min(he.lines, hG),
            }),
            possible_writes_since_that_call: Math.min(he.writes, ME),
            tests_and_lints_since_that_call: Math.min(he.checks, ME),
            ...(ce >= 0 && {
              new_message_since_that_call: messages
                .slice(ce + 1)
                .some((ie) =>
                  ie.type === "attachment"
                    ? ie.attachment.type === "queued_command"
                    : ie.type === "user" &&
                      (!ie.isMeta || ie.origin !== void 0) &&
                      !ie.isVirtual &&
                      !(
                        Array.isArray(ie.message.content) &&
                        ie.message.content.some((Ee) => Ee.type === "tool_result")
                      ),
                ),
            }),
            earlier_call_outcome: fromEnum(he.earlier.outcome),
            earlier_result_in_context: ce >= 0,
          }),
        },
        G,
        ee + ae > 0,
      );
    if (we.countedAsRunning) this.#a++;
    return we;
  }
  #s() {
    return [this.#t, this.#i, this.#l, this.#o];
  }
  noteOtherToolCall(e, n) {
    safeRepeatMeter(
      () => {
        if (!n || e.name === BASH_TOOL_NAME || bG.has(e.underlyingV1ToolName ?? e.name) || _G.has(e.name))
          return;
        if (e.name === NOTEBOOK_EDIT_TOOL_NAME) this.#t++;
        else (this.#i++, this.#o++);
      },
      void 0,
    );
  }
  clear() {
    (this.#e.clear(), (this.#c = 0));
  }
  settle(e) {
    safeRepeatMeter(() => this.#u(e), void 0);
  }
  #u(e) {
    let { call: n, outcome: outcome, mayHaveWritten: mayHaveWritten, linesWritten: linesWritten } = e;
    if (e.countedAsRunning) this.#a--;
    let y = outcome !== void 0 || mayHaveWritten,
      S = y ? (n?.checks ?? 0) : 0,
      w = y ? (n?.writes ?? (mayHaveWritten ? 1 : 0)) : 0,
      R = w + S > 0 && !e.diffTaken ? 1 : 0;
    if (((this.#t += linesWritten), (this.#i += w), (this.#l += S), (this.#o += R), y && n?.goesOnRunning))
      this.#c++;
    if (n === void 0 || outcome === void 0) return;
    let [x, P, j, G] = e.countsAtStart,
      filtered = n.pieces.filter((piece) =>
        outcome === "succeeded" && e.exitedZero
          ? piece.ranOnlyIf !== "unknown"
          : piece.ranOnlyIf === void 0 &&
            (outcome === "succeeded" || outcome === "failed" || piece.writes + piece.checks <= 1),
      );
    for (let q of filtered) {
      let Q = q.writes === n.writes && q.checks === n.checks,
        Z = this.#e.get(q.key)?.textHashes.filter((ee) => ee !== q.textHash) ?? [];
      (this.#e.delete(q.key),
        this.#e.set(q.key, {
          textHashes: [...Z, q.textHash].slice(-mG),
          toolUseId: n.toolUseId,
          returnedAt: Date.now(),
          linesChanged: x + (Q ? linesWritten : 0),
          possibleWrites: P + q.writes,
          testsAndLints: j + q.checks,
          unseenWrites: G + (Q ? R : 0),
          backgroundCommandsAtStart: n.backgroundCommandsAtStart,
          outcome: outcome,
          outputPersisted: e.outputPersisted,
        }));
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
  exitedZero = !1;
  outputPersisted = !1;
  mayHaveWritten = !1;
  linesWritten = 0;
  diffTaken = !1;
  constructor(e, n, r, s, h) {
    this.meter = e;
    this.call = n;
    this.fields = r;
    this.countsAtStart = s;
    this.countedAsRunning = h;
  }
  ended(e, n, r) {
    return (
      (this.outputPersisted = r),
      (this.exitedZero = e.code === 0),
      (this.outcome =
        e.backgroundTaskId !== void 0
          ? this.call?.startsInBackground
            ? "started_in_background"
            : e.timedOutAfterMs !== void 0
              ? "moved_to_background_at_timeout"
              : "moved_to_background"
          : e.timedOut
            ? "killed_at_timeout"
            : e.interrupted
              ? "interrupted"
              : n
                ? "failed"
                : "succeeded"),
      {
        ...this.fields,
        ...(e.outputFileSize !== void 0 && {
          output_total_bytes: Math.min(e.outputFileSize, SG),
          output_persisted: r,
        }),
      }
    );
  }
  sawEditDiff(e, n) {
    if (!n || e?.unavailable || e?.shared || e?.skipped) return;
    ((this.diffTaken = !0),
      (this.linesWritten = safeRepeatMeter(
        () =>
          (e?.files ?? []).reduce(
            (r, s) =>
              r +
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
      )));
  }
  [Symbol.dispose]() {
    this.meter.settle(this);
  }
}
/**
 * 从 Bash AST 计算命令形状键，用于重复命令计数
 */
//@ chunk-s61vbvea.js:616862-619381 placement
function commandShapeKey(e, n, r) {
  let s = e.length <= SPLIT_MAX_LEN ? (getParserModule()?.parse(e) ?? null) : null,
    h = [];
  for (let L of s?.type === "program" ? flattenStatements(s) : [])
    if (AG.has(L.type)) {
      if (h.length > 0) h.at(-1).then = L.type;
    } else if (L.type.endsWith("_redirect")) h.at(-1)?.redirects.push(L);
    else h.push({ node: L, redirects: [], then: ";" });
  if (h.length === 0 || h.length > gG)
    return [
      {
        place: n,
        stem: e.trim(),
        text: e.trim(),
        heavy: !1,
        testsOrLints: !1,
        onlyOnFailure: !1,
        ranOnlyIf: void 0,
        goesOnRunning: !1,
      },
    ];
  let y = n,
    S = !1,
    w = [],
    R = h.slice(0, -1).findLastIndex(({ then: L }) => L !== "&&") + 1,
    lastIndex = h.findLastIndex(
      ({ node: node, then: q }, Q) =>
        node.text === "wait" && q !== "&" && [";", "&"].includes(h[Q - 1]?.then ?? ""),
    ),
    P = !1,
    j = !1,
    G = [];
  for (let [L, { node: q, redirects: Q, then: Z }] of h.entries()) {
    let joined = [q, ...Q].map((Re) => Re.text).join(" "),
      ae = h[L - 1]?.then;
    if (ae !== "&&") ((P = !1), (j = !1));
    let [se, ...re] = q.type === "redirected_statement" ? q.children : [q],
      any = [...re, ...Q].some(isFileOutputRedirect),
      Se = !1;
    if (se !== void 0 && (RG.has(se.type) || EG.has(getCommandBaseName(se)))) {
      let [Re, Ne, ...Je] = se.children,
        lt =
          Ne?.type === "raw_string" ||
          (Ne?.type === "string" &&
            Ne.children.every((gt) => gt.type === '"' || gt.type === "string_content")),
        Ae = lt ? Ne?.text.slice(1, -1) : Ne?.text,
        included = ["cd", "pushd", "popd"].includes(Re?.text ?? "");
      if (
        Re?.text === "cd" &&
        !S &&
        !any &&
        Z !== "||" &&
        Z !== "&" &&
        ae !== "||" &&
        Je.length === 0 &&
        (lt || Ne?.type === "word") &&
        Ae !== void 0 &&
        PG.test(Ae)
      ) {
        y = resolve_11(y, Ae);
        continue;
      }
      if (Z !== "&") (w.push(joined), (S ||= included), (Se = !0));
      if (
        Z !== "&" &&
        !any &&
        !FE.test(joined) &&
        ((Re?.text !== "source" && Re?.text !== ".") || xG.test(Ae ?? ""))
      )
        continue;
    }
    let ce = new Set(String(classifyBashCommand(q.text).bash_command_kinds).split(",")),
      we = ce.has("builds") || ce.has("installs_packages"),
      ie = !we && (ce.has("runs_tests") || ce.has("lints")),
      Ee = we || ie;
    if (!Ee && !any && ((kG.has(getCommandBaseName(q)) && !FE.test(q.text)) || r(q.text))) {
      if (LE.test(q.text)) (w.push(joined), (S = !0));
      j = !0;
      continue;
    }
    let [Ie, ...ke] = statementParts(q, !Ee),
      Me = Ie?.type === "pipeline" ? Ie.children : Ie ? [Ie] : [],
      We = Me.length;
    while (We >= 3) {
      let Re = Me[We - 1],
        Ne = getCommandBaseName(Re),
        Je = Object.hasOwn(NE, Ne) ? NE[Ne] : void 0;
      if (!wG.has(Ne) || getCommandNode(Re)?.children.some((lt) => Je?.test(lt.text))) break;
      We -= 2;
    }
    if (!Ee && We === 1 && Me.length > 1 && r(Me[0].text)) We = Me.length;
    let joined_2 = [
        ...Me.slice(0, We - 1),
        ...Me.slice(We - 1, We).flatMap((Re) => statementParts(Re, !Ee)),
        ...ke,
        ...Q.filter((Re) => !kp(Re) || (!Ee && isFileOutputRedirect(Re))),
      ]
        .map((Re) => Re.text)
        .concat(Z === "&" ? ["&"] : [])
        .join(" "),
      parts = joined_2.split(/\s+/);
    if (
      (G.push({
        place: [y, ...w].join("\x00"),
        stem: joined_2,
        text: joined,
        heavy: Ee,
        testsOrLints: ie && (!parts.some((Re) => TG.test(Re)) || parts.some((Re) => vG.test(Re))),
        onlyOnFailure: ae === "||",
        ranOnlyIf: P ? (L >= R ? "the line exited 0" : "unknown") : j ? "light work succeeded" : void 0,
        goesOnRunning: Z === "&" && L > lastIndex,
      }),
      (P ||= Ee),
      (j = !0),
      !Se && q.type !== "subshell" && LE.test(q.text))
    )
      (w.push(joined), (S = !0));
  }
  return G;
}
//@ chunk-s61vbvea.js:619381-619504 placement
function safeRepeatMeter(e, n) {
  try {
    return e();
  } catch (error) {
    return (
      logForDebugging(`Bash repeat meter: ${errorMessage(error)}`),
      logError(Error("The Bash repeat meter threw")),
      n
    );
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
function kp(e) {
  return e.type === "file_redirect" && e.children.some((n) => CG.has(n.type));
}
//@ chunk-s61vbvea.js:619806-619946 placement
function isFileOutputRedirect(e) {
  let n = e.children.at(-1)?.text ?? "";
  return kp(e) && n !== "/dev/null" && !(e.children.some((r) => r.type === ">&") && /^(\d+|-)$/.test(n));
}
//@ chunk-s61vbvea.js:619946-620047 placement
function statementParts(e, n) {
  return e.type !== "redirected_statement"
    ? [e]
    : e.children.filter((r) => !kp(r) || (n && isFileOutputRedirect(r)));
}
//@ chunk-s61vbvea.js:620047-620152 placement
function getCommandNode(e) {
  let n = e.type === "redirected_statement" ? e.children[0] : e;
  return n?.type === "command" ? n : void 0;
}
//@ chunk-s61vbvea.js:620152-620272 placement
function getCommandBaseName(e) {
  let n = getCommandNode(e)?.children.find((r) => r.type === "command_name")?.text;
  return n?.slice(n.lastIndexOf("/") + 1) ?? "";
}

export { BashRepeatMeter };
