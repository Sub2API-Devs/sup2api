/**
 * components/tasks/CloudTasksDialog.tsx
 *
 * 2.1.316 新增。云任务对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { pM } from "../CustomSelect/select.js";
import { RemoteAgentTaskLabel } from "./RemoteSessionProgress.js";
import { j, y, R, zt, P } from "../../../vendor/react/cjs/react.production.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ml, Jn } from "../../remote/remoteMode.js";
import { logEvent } from "../../services/analytics/index.js";
import { hr } from "../../utils/invisibleChars.js";
import { errorMessage } from "../../utils/errors.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { HintText } from "../design-system/HintText.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { GENERAL_PURPOSE_AGENT } from "../../tools/AgentTool/built-in/generalPurposeAgent.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

/**
 * 列表分组标题："标签 (数量)"。
 */
//@ chunk-18hwfzwa.js:765561-765801 placement
function SectionHeading(h) {
  let $ = w(5),
    { label: label, size: size } = h,
    ee;
  if ($[0] !== label) ((ee = e(Text, { bold: !0, children: label })), ($[0] = label), ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] !== size || $[3] !== ee)
    ((ke = r(Text, { dimColor: !0, children: [ee, " (", size, ")"] })),
      ($[2] = size),
      ($[3] = ee),
      ($[4] = ke));
  else ke = $[4];
  return ke;
}
/**
 * 任务列表项的标签：队友与远程代理用 RemoteAgentTaskLabel，其他直接显示 label。
 */
//@ chunk-18hwfzwa.js:765801-766213 placement
function TaskItemLabel(h) {
  let $ = w(7),
    { item: item } = h;
  const L = pM() ? "suggestion" : void 0;
  let ke;
  if ($[0] !== item.label || $[1] !== item.task || $[2] !== item.type)
    ((ke =
      item.type === "in_process_teammate" || item.type === "remote_agent"
        ? e(RemoteAgentTaskLabel, { task: item.task })
        : item.label),
      ($[0] = item.label),
      ($[1] = item.task),
      ($[2] = item.type),
      ($[3] = ke));
  else ke = $[3];
  let Re;
  if ($[4] !== L || $[5] !== ke)
    ((Re = e(Text, { color: L, wrap: "truncate-end", children: ke })), ($[4] = L), ($[5] = ke), ($[6] = Re));
  else Re = $[6];
  return Re;
}
//@ chunk-18hwfzwa.js:766213-766217 placement
j();
//@ chunk-18hwfzwa.js:766217-766266 placement
function selectRemoteBackgroundTasks(wn) {
  return wn.remoteBackgroundTasks;
}
//@ chunk-18hwfzwa.js:766266-766318 placement
function selectRemoteWorkerReportedGone_2(mr) {
  return mr.remoteWorkerReportedGone;
}
//@ chunk-18hwfzwa.js:766318-766334 placement
function V4t() {}
/**
 * CloudTasksDialog：查看云端任务的对话框。
 */
//@ chunk-18hwfzwa.js:766334-769919 placement
function CloudTasksDialog(h) {
  let $ = w(50),
    { onDone: onDone } = h;
  useRegisterOverlay("cloud-tasks-dialog");
  let D = useAppState(selectRemoteBackgroundTasks),
    L = useAppState(selectRemoteWorkerReportedGone_2),
    [ee, ke] = y(void 0),
    Be;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Be = new Set()), ($[0] = Be));
  else Be = $[0];
  let [He, We] = y(Be),
    ze;
  if ($[1] === MEMO_CACHE_SENTINEL) ((ze = new Set()), ($[1] = ze));
  else ze = $[1];
  let [Xe, rt] = y(ze),
    kt;
  if ($[2] !== Xe) ((kt = (At) => !Xe.has(At.id)), ($[2] = Xe), ($[3] = kt));
  else kt = $[3];
  let filtered = D.filter(kt),
    [Ot, Et] = y(null),
    Dt;
  if ($[4] === MEMO_CACHE_SENTINEL) ((Dt = ml()), ($[4] = Dt));
  else Dt = $[4];
  let Lt = Dt,
    oo = Lt && !L,
    Xt = R(!1),
    so = ee !== void 0 && !filtered.some((io) => io.id === ee),
    po,
    ao;
  if ($[5] !== so)
    ((po = () => {
      if (so) Xt.current = !0;
    }),
      (ao = [so]),
      ($[5] = so),
      ($[6] = po),
      ($[7] = ao));
  else ((po = $[6]), (ao = $[7]));
  zt(po, ao);
  let co;
  if ($[8] !== filtered.length || $[9] !== L)
    ((co = () => {
      logEvent("tengu_remote_background_tasks_shown", { count: filtered.length, worker_reported_gone: L });
    }),
      ($[8] = filtered.length),
      ($[9] = L),
      ($[10] = co));
  else co = $[10];
  let bo;
  if ($[11] === MEMO_CACHE_SENTINEL) ((bo = []), ($[11] = bo));
  else bo = $[11];
  P(co, bo);
  let Ao;
  if ($[12] !== onDone)
    ((Ao = () => onDone("Background dialog dismissed", { display: "skip" })), ($[12] = onDone), ($[13] = Ao));
  else Ao = $[13];
  let Bo = Ao,
    Ro;
  if (
    $[14] !== ee ||
    $[15] !== so ||
    $[16] !== Lt ||
    $[17] !== Et ||
    $[18] !== He ||
    $[19] !== filtered[0]?.id ||
    $[20] !== filtered.length ||
    $[21] !== L
  )
    ((Ro = function kn(Ho) {
      if (Ho.key !== "x" || Ho.ctrl || Ho.meta || !Lt) {
        return;
      }
      if (L) {
        if (filtered.length > 0) logEvent("tengu_remote_background_tasks_stop_unavailable", {});
        return;
      }
      if ((Ho.stopImmediatePropagation(), Xt.current || so)) {
        Xt.current = !1;
        return;
      }
      let Io = ee ?? filtered[0]?.id;
      let Wo = Jn();
      if (Io === void 0 || He.has(Io) || !Wo) {
        return;
      }
      (We((mn) => new Set(mn).add(Io)),
        Et(null),
        Wo.sendControlRequest({ subtype: "stop_task", task_id: Io })
          .then(
            () => rt((Cn) => new Set(Cn).add(Io)),
            (No) => Et(`Couldn't stop it: ${hr(errorMessage(No))}`),
          )
          .finally(() =>
            We((vo) => {
              let Yo = new Set(vo);
              return (Yo.delete(Io), Yo);
            }),
          ));
    }),
      ($[14] = ee),
      ($[15] = so),
      ($[16] = Lt),
      ($[17] = Et),
      ($[18] = He),
      ($[19] = filtered[0]?.id),
      ($[20] = filtered.length),
      ($[21] = L),
      ($[22] = Ro));
  else Ro = $[22];
  let kn = Ro;
  const Fn =
    L && filtered.length > 0
      ? "The cloud session may have stopped, and its tasks too"
      : "Running in the cloud session";
  let bn;
  if ($[23] !== filtered.length)
    ((bn = filtered.length > 0 && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" })),
      ($[23] = filtered.length),
      ($[24] = bn));
  else bn = $[24];
  let Go;
  if ($[25] !== oo || $[26] !== filtered.length)
    ((Go = filtered.length > 0 && oo && e(KeyboardShortcutHint, { chord: "x", action: "stop" })),
      ($[25] = oo),
      ($[26] = filtered.length),
      ($[27] = Go));
  else Go = $[27];
  let hn;
  if ($[28] === MEMO_CACHE_SENTINEL)
    ((hn = e(KeyboardShortcutHint, { chord: "escape", action: "close" })), ($[28] = hn));
  else hn = $[28];
  let Mn;
  if ($[29] !== bn || $[30] !== Go)
    ((Mn = r(Byline, { children: [bn, Go, hn] })), ($[29] = bn), ($[30] = Go), ($[31] = Mn));
  else Mn = $[31];
  let Xo;
  if ($[32] !== Bo || $[33] !== He || $[34] !== filtered)
    ((Xo =
      filtered.length === 0
        ? e(HintText, { children: "No tasks currently running" })
        : e(ModelSelector, {
            options: filtered.map((Sn) => ({
              value: Sn.id,
              label: (Sn.description || hr(Sn.id)) + (He.has(Sn.id) ? " \xB7 stopping\u2026" : ""),
              description:
                Sn.subagentType && Sn.subagentType !== GENERAL_PURPOSE_AGENT.agentType
                  ? Sn.subagentType
                  : Sn.taskType?.replace(/^local_/, ""),
            })),
            onFocus: ke,
            onChange: V4t,
            onCancel: Bo,
            visibleOptionCount: 10,
            hideIndexes: !0,
          })),
      ($[32] = Bo),
      ($[33] = He),
      ($[34] = filtered),
      ($[35] = Xo));
  else Xo = $[35];
  let $n;
  if ($[36] !== Ot)
    (($n = Ot !== null && e(Text, { color: "error", children: Ot })), ($[36] = Ot), ($[37] = $n));
  else $n = $[37];
  let on;
  if ($[38] === MEMO_CACHE_SENTINEL)
    ((on = e(Text, {
      dimColor: !0,
      wrap: "wrap-trim",
      children:
        "Each task's output reaches the transcript when it finishes; a per-task view isn't sent to this terminal.",
    })),
      ($[38] = on));
  else on = $[38];
  let _o;
  if ($[39] !== $n)
    ((_o = r(Box, { flexDirection: "column", children: [$n, on] })), ($[39] = $n), ($[40] = _o));
  else _o = $[40];
  let cn;
  if ($[41] !== Bo || $[42] !== Fn || $[43] !== Mn || $[44] !== Xo || $[45] !== _o)
    ((cn = r(Dialog, {
      title: "Background",
      subtitle: Fn,
      onCancel: Bo,
      color: "background",
      inputGuide: Mn,
      children: [Xo, _o],
    })),
      ($[41] = Bo),
      ($[42] = Fn),
      ($[43] = Mn),
      ($[44] = Xo),
      ($[45] = _o),
      ($[46] = cn));
  else cn = $[46];
  let Dn;
  if ($[47] !== kn || $[48] !== cn)
    ((Dn = e(FocusColumn, { onKeyDown: kn, children: cn })), ($[47] = kn), ($[48] = cn), ($[49] = Dn));
  else Dn = $[49];
  return Dn;
}

export { SectionHeading, TaskItemLabel, CloudTasksDialog };
