/**
 * commands/workflows/workflows.tsx
 *
 * 2.1.316 新增：工作流运行列表/详情视图（键盘导航、控制按钮）；云端工作流对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wnym76ss.js (27)
 * attribution: placement 27
 */
import { j, y, fo, Qr, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { readWorkflowSnapshot } from "../../services/workflow/snapshots.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { useAppState } from "../../state/AppState.js";
import { useSetVoiceState } from "../../context/voice.js";
import {
  killWorkflowTask,
  pauseWorkflowTask,
  skipWorkflowAgent,
  retryWorkflowAgent,
} from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { WorkflowDetailDialog } from "../../components/workflows/WorkflowDetailDialog.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { slugifyWorkflowName } from "../../services/workflow/scriptFile.js";
import { WorkflowSaveDialog } from "../../components/workflows/WorkflowSaveDialog.js";
import { count } from "../../utils/collections.js";
import { Text } from "../../ink/components/Text.js";
import { HintText } from "../../components/design-system/HintText.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { formatDuration, formatTokens } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { useNotifications } from "../../context/notifications.js";
import { Upo } from "../../remote/remoteSessionEvents.js";
import { zZt } from "../../components/StatusNotices.js";
import { ml, Jn } from "../../remote/remoteMode.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../../utils/resultError.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-wnym76ss.js:15138-15142 placement
j();
//@ chunk-wnym76ss.js:15142-15146 placement
j();
//@ chunk-wnym76ss.js:15146-15169 placement
function Nt() {
  return [];
}
//@ chunk-wnym76ss.js:15169-15199 placement
function Ft(i) {
  return i.tasks;
}
//@ chunk-wnym76ss.js:15199-15249 placement
function At(ce) {
  return ce.type === "local_workflow";
}
//@ chunk-wnym76ss.js:15249-15289 placement
function Mt(ie) {
  return ie.workflowRunId;
}
//@ chunk-wnym76ss.js:15289-15314 placement
function jt(_) {
  return !!_;
}
//@ chunk-wnym76ss.js:15314-15359 placement
function Jt(C) {
  return { task: workflowSnapshotToTask(C), snapshot: C };
}
//@ chunk-wnym76ss.js:15359-15389 placement
function Xt(k) {
  return { task: k };
}
//@ chunk-wnym76ss.js:15389-15447 placement = getTotalDuration (0.658)
function getTotalDuration(I, K) {
  return K.task.startTime - I.task.startTime;
}
//@ chunk-wnym76ss.js:15447-15497 placement
function Gt(Ss) {
  return Ss.task.status === "running";
}
/**
 * 把工作流运行快照转换成 local_workflow 任务对象。
 */
//@ chunk-wnym76ss.js:15497-16077 placement
function workflowSnapshotToTask(o) {
  return {
    id: o.taskId,
    type: "local_workflow",
    description: o.summary ?? "Dynamic workflow",
    status: o.status,
    startTime: o.startTime,
    endTime: o.startTime + o.durationMs,
    toolUseId: void 0,
    outputFile: "",
    outputOffset: 0,
    notified: !0,
    script: o.script,
    scriptPath: o.scriptPath,
    prompt: o.script,
    summary: o.summary,
    workflowName: o.workflowName,
    phases: o.phases,
    defaultModel: o.defaultModel,
    workflowRunId: o.runId,
    workflowProgress: o.workflowProgress,
    progressVersion: 0,
    agentCount: o.agentCount,
    totalTokens: o.totalTokens ?? 0,
    totalToolCalls: o.totalToolCalls ?? 0,
    logs: o.logs,
    result: o.result,
    error: o.error,
  };
}
//@ chunk-wnym76ss.js:16077-16151 placement
function te(o) {
  o("Dynamic workflows dialog dismissed", { display: "system" });
}
/**
 * /workflows 历史对话框：加载本会话的动态工作流历史。
 */
//@ chunk-wnym76ss.js:16151-16948 placement
function WorkflowHistoryDialog(o) {
  let f = w(15),
    { onDone: onDone, storageV5: storageV5, promptVisibleBelow: promptVisibleBelow } = o;
  useRegisterOverlay("workflow-history-dialog");
  let L;
  if (f[0] !== storageV5)
    ((L = () => readWorkflowSnapshot(storageV5).catch(Nt)), (f[0] = storageV5), (f[1] = L));
  else L = f[1];
  let [a] = y(L),
    l;
  if (f[2] !== onDone) ((l = () => te(onDone)), (f[2] = onDone), (f[3] = l));
  else l = f[3];
  let x, B;
  if (f[4] === MEMO_CACHE_SENTINEL)
    ((x = e(Byline, { children: e(KeyboardShortcutHint, { chord: "escape", action: "close" }) })),
      (B = e(WorkerBadge, { message: "Loading dynamic workflow history\u2026", dimColor: !0 })),
      (f[4] = x),
      (f[5] = B));
  else ((x = f[4]), (B = f[5]));
  let s;
  if (f[6] !== l)
    ((s = e(Dialog, {
      title: "Dynamic workflows",
      onCancel: l,
      color: "background",
      inputGuide: x,
      children: B,
    })),
      (f[6] = l),
      (f[7] = s));
  else s = f[7];
  let D;
  if (f[8] !== onDone || f[9] !== promptVisibleBelow || f[10] !== a)
    ((D = e(WorkflowHistoryList, {
      snapshotsPromise: a,
      onDone: onDone,
      promptVisibleBelow: promptVisibleBelow,
    })),
      (f[8] = onDone),
      (f[9] = promptVisibleBelow),
      (f[10] = a),
      (f[11] = D));
  else D = f[11];
  let N;
  if (f[12] !== s || f[13] !== D)
    ((N = e(fo, { fallback: s, children: D })), (f[12] = s), (f[13] = D), (f[14] = N));
  else N = f[14];
  return N;
}
/**
 * 合并快照与当前任务，渲染动态工作流列表。
 */
//@ chunk-wnym76ss.js:16948-17788 placement
function WorkflowHistoryList(o) {
  let l = w(11),
    { snapshotsPromise: snapshotsPromise, onDone: onDone, promptVisibleBelow: promptVisibleBelow } = o,
    f = Qr(snapshotsPromise),
    L = useAppState(Ft),
    a = useSetVoiceState(),
    x;
  if (l[0] !== f || l[1] !== L) {
    let filtered = Object.values(L ?? {}).filter(At);
    let s = new Set(filtered.map(Mt).filter(jt));
    let mapped = f.filter((D) => !s.has(D.runId)).map(Jt);
    x = [...filtered.map(Xt), ...mapped].sort(getTotalDuration);
    ((l[0] = f), (l[1] = L), (l[2] = x));
  } else x = l[2];
  let v = x,
    A;
  if (l[3] !== onDone || l[4] !== a)
    ((A = (re) => {
      let { id: id, status: status } = re;
      return {
        onResume: (ue) => onDone(ue, { shouldQuery: !0, display: "system", metaMessages: [ue] }),
        ...(status === "running" && {
          onKill: () => killWorkflowTask(id, a, "user"),
          onPause: () => pauseWorkflowTask(id, a),
          onSkipAgent: (W) => skipWorkflowAgent(id, W, a),
          onRetryAgent: (fe) => retryWorkflowAgent(id, fe, a),
        }),
      };
    }),
      (l[3] = onDone),
      (l[4] = a),
      (l[5] = A));
  else A = l[5];
  let re;
  if (l[6] !== v || l[7] !== onDone || l[8] !== promptVisibleBelow || l[9] !== A)
    ((re = e(WorkflowRunList, {
      runs: v,
      controlsFor: A,
      emptyText: "No dynamic workflows in this session.",
      onDone: onDone,
      promptVisibleBelow: promptVisibleBelow,
    })),
      (l[6] = v),
      (l[7] = onDone),
      (l[8] = promptVisibleBelow),
      (l[9] = A),
      (l[10] = re));
  else re = l[10];
  return re;
}
/**
 * 工作流运行列表/详情视图（键盘导航、控制按钮）。
 */
//@ chunk-wnym76ss.js:17788-22212 placement
function WorkflowRunList(o) {
  let s = w(78),
    {
      runs: runs,
      controlsFor: controlsFor,
      emptyText: emptyText,
      keepsListOfOne: keepsListOfOne,
      listNote: listNote,
      now: now,
      onDone: onDone,
      promptVisibleBelow: promptVisibleBelow,
    } = o,
    B = keepsListOfOne === void 0 ? !1 : keepsListOfOne,
    D;
  if (s[0] !== runs[0] || s[1] !== runs.length)
    ((D = () =>
      runs.length === 1 ? { mode: "detail", itemId: runs[0].task.id, isFromList: !1 } : { mode: "list" }),
      (s[0] = runs[0]),
      (s[1] = runs.length),
      (s[2] = D));
  else D = s[2];
  let [N, v] = y(D),
    [A, re] = y(0),
    [g, pe] = y(),
    ue = useIsScreenReaderEnabled(),
    W = runs.length === 1 && !B ? runs[0] : void 0,
    fe;
  if (s[3] !== W || s[4] !== N)
    ((fe = N.mode === "list" && W ? { mode: "detail", itemId: W.task.id, isFromList: !1 } : N),
      (s[3] = W),
      (s[4] = N),
      (s[5] = fe));
  else fe = s[5];
  let i = fe;
  if (i !== N) v(i);
  let ce;
  if (s[6] !== g) ((ce = (ie) => ie.task.id === g), (s[6] = g), (s[7] = ce));
  else ce = s[7];
  let index = runs.findIndex(ce),
    C = index < 0 ? Math.min(A, runs.length - 1) : index,
    k = runs[C],
    [I, K] = y(!1);
  if (g !== void 0 && index < 0) (pe(void 0), K(!0));
  let Z;
  if (s[8] !== B || s[9] !== runs.length || s[10] !== onDone || s[11] !== i.isFromList || s[12] !== i.mode)
    ((Z = () => {
      let xe = B && i.mode === "detail" && i.isFromList;
      if (runs.length <= 1 && !xe) {
        te(onDone);
        return;
      }
      (K(!1), v({ mode: "list" }));
    }),
      (s[8] = B),
      (s[9] = runs.length),
      (s[10] = onDone),
      (s[11] = i.isFromList),
      (s[12] = i.mode),
      (s[13] = Z));
  else Z = s[13];
  let ke = Z;
  if (i.mode === "detail") {
    let M, b;
    if (
      s[14] !== controlsFor ||
      s[15] !== ke ||
      s[16] !== runs ||
      s[17] !== onDone ||
      s[18] !== promptVisibleBelow ||
      s[19] !== i.itemId
    ) {
      b = EARLY_RETURN_SENTINEL;
      $o: {
        let c;
        if (s[22] !== i.itemId) ((c = (ge) => ge.task.id === i.itemId), (s[22] = i.itemId), (s[23] = c));
        else c = s[23];
        let found = runs.find(c);
        if (!found) {
          b = (v({ mode: "list" }), K(!0), null);
          break $o;
        }
        let h;
        if (s[24] !== onDone)
          ((h = (Be) => (Be ? onDone(Be, { display: "system" }) : onDone())), (s[24] = onDone), (s[25] = h));
        else h = s[25];
        M = e(
          WorkflowDetailDialog,
          {
            workflow: found.task,
            onDone: h,
            onBack: ke,
            promptVisibleBelow: promptVisibleBelow,
            ...controlsFor(found.task),
          },
          found.task.id,
        );
      }
      ((s[14] = controlsFor),
        (s[15] = ke),
        (s[16] = runs),
        (s[17] = onDone),
        (s[18] = promptVisibleBelow),
        (s[19] = i.itemId),
        (s[20] = M),
        (s[21] = b));
    } else ((M = s[20]), (b = s[21]));
    if (b !== EARLY_RETURN_SENTINEL) return b;
    return M;
  }
  if (i.mode === "save") {
    let V, M, b;
    if (s[26] !== runs || s[27] !== i.itemId) {
      b = EARLY_RETURN_SENTINEL;
      ae: {
        let c;
        if (s[31] !== i.itemId) ((c = (Pe) => Pe.task.id === i.itemId), (s[31] = i.itemId), (s[32] = c));
        else c = s[32];
        V = runs.find(c);
        if (!V || V.task.script.length === 0) {
          b = (v({ mode: "list" }), null);
          break ae;
        }
        let Ne = parseWorkflowScript(V.task.script);
        M = !("error" in Ne) ? Ne.meta.name : slugifyWorkflowName(V.task.summary ?? V.task.description);
      }
      ((s[26] = runs), (s[27] = i.itemId), (s[28] = V), (s[29] = M), (s[30] = b));
    } else ((V = s[28]), (M = s[29]), (b = s[30]));
    if (b !== EARLY_RETURN_SENTINEL) return b;
    let Fe = M;
    let c;
    if (s[33] !== onDone)
      ((c = (Ze) => {
        if (Ze) onDone(Ze, { display: "system" });
        else v({ mode: "list" });
      }),
        (s[33] = onDone),
        (s[34] = c));
    else c = s[34];
    let h;
    if (s[35] !== Fe || s[36] !== V.task.script || s[37] !== c)
      ((h = e(WorkflowSaveDialog, { script: V.task.script, defaultName: Fe, onDone: c })),
        (s[35] = Fe),
        (s[36] = V.task.script),
        (s[37] = c),
        (s[38] = h));
    else h = s[38];
    return h;
  }
  let H = count(runs, Gt),
    Re = runs.length - H,
    M;
  if (s[39] !== onDone) ((M = () => te(onDone)), (s[39] = onDone), (s[40] = M));
  else M = s[40];
  let Ae = M,
    b;
  if (s[41] !== controlsFor)
    ((b = (c) => {
      let { task: task } = c;
      return task.status === "running" ? controlsFor(task).onKill : void 0;
    }),
      (s[41] = controlsFor),
      (s[42] = b));
  else b = s[42];
  let U = b,
    T = runs.length > 0 && !ue,
    c;
  if (s[43] !== Re || s[44] !== listNote || s[45] !== runs.length || s[46] !== H)
    ((c =
      runs.length === 0
        ? void 0
        : e(Text, {
            dimColor: !0,
            children:
              listNote ?? r(Byline, { children: [H > 0 && `${H} running`, Re > 0 && `${Re} completed`] }),
          })),
      (s[43] = Re),
      (s[44] = listNote),
      (s[45] = runs.length),
      (s[46] = H),
      (s[47] = c));
  else c = s[47];
  let h;
  if (s[48] !== T)
    ((h = T && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select" })),
      (s[48] = T),
      (s[49] = h));
  else h = s[49];
  let me;
  if (s[50] !== T)
    ((me = T && e(KeyboardShortcutHint, { chord: "enter", action: "view" })), (s[50] = T), (s[51] = me));
  else me = s[51];
  let E;
  if (s[52] !== k || s[53] !== T || s[54] !== U)
    ((E = T && k && U(k) && e(KeyboardShortcutHint, { chord: "x", action: "stop" })),
      (s[52] = k),
      (s[53] = T),
      (s[54] = U),
      (s[55] = E));
  else E = s[55];
  let de;
  if (s[56] !== k || s[57] !== T)
    ((de = T && k && k.task.script.length > 0 && e(KeyboardShortcutHint, { chord: "s", action: "save" })),
      (s[56] = k),
      (s[57] = T),
      (s[58] = de));
  else de = s[58];
  let eo;
  if (s[59] === MEMO_CACHE_SENTINEL)
    ((eo = e(KeyboardShortcutHint, { chord: "escape", action: "close" })), (s[59] = eo));
  else eo = s[59];
  let he;
  if (s[60] !== me || s[61] !== E || s[62] !== de || s[63] !== h)
    ((he = r(Byline, { children: [h, me, E, de, eo] })),
      (s[60] = me),
      (s[61] = E),
      (s[62] = de),
      (s[63] = h),
      (s[64] = he));
  else he = s[64];
  let De;
  if (
    s[65] !== emptyText ||
    s[66] !== C ||
    s[67] !== g ||
    s[68] !== I ||
    s[69] !== runs ||
    s[70] !== now ||
    s[71] !== U
  )
    ((De =
      runs.length === 0
        ? e(HintText, { children: emptyText })
        : e(OrderedListWithItem, {
            defaultFocusIndex: C,
            onFocus: (Me) => {
              let oo = runs[Me]?.task.id;
              if (oo !== g && (g !== void 0 || Me !== C)) K(!1);
              (re(Me), pe(oo));
            },
            onSelect: (Ko) => {
              let to = runs[Ko];
              if (to) (K(!1), v({ mode: "detail", itemId: to.task.id, isFromList: !0 }));
            },
            onRowKeyDown: (z, Ds) => {
              let je = runs[Ds];
              if (!je || z.ctrl || z.meta) {
                return;
              }
              let Uo = U(je);
              if (z.key === "x" && I) (z.preventDefault(), K(!1));
              else if (z.key === "x" && Uo) (z.preventDefault(), Uo());
              else if (z.key === "s" && je.task.script.length > 0)
                (z.preventDefault(), v({ mode: "save", itemId: je.task.id }));
            },
            children: runs.map((qo) =>
              e(OrderedListWithItem.Item, { ...workflowRunRow(qo, now) }, qo.task.id),
            ),
          })),
      (s[65] = emptyText),
      (s[66] = C),
      (s[67] = g),
      (s[68] = I),
      (s[69] = runs),
      (s[70] = now),
      (s[71] = U),
      (s[72] = De));
  else De = s[72];
  let Eo;
  if (s[73] !== Ae || s[74] !== he || s[75] !== De || s[76] !== c)
    ((Eo = e(Dialog, {
      title: "Dynamic workflows",
      subtitle: c,
      onCancel: Ae,
      color: "background",
      inputGuide: he,
      children: De,
    })),
      (s[73] = Ae),
      (s[74] = he),
      (s[75] = De),
      (s[76] = c),
      (s[77] = Eo));
  else Eo = s[77];
  return Eo;
}
/**
 * 生成一条工作流运行的显示行（名称、状态图标、耗时、令牌）。
 */
//@ chunk-wnym76ss.js:22212-22531 placement
function workflowRunRow({ task: task, snapshot: snapshot }, p) {
  let m = snapshot?.totalTokens ?? task.totalTokens ?? 0,
    max = Math.max(0, (task.endTime ?? p ?? Date.now()) - task.startTime - (task.totalPausedMs ?? 0));
  return {
    label: task.workflowName ?? task.summary ?? task.description,
    icon: WORKFLOW_STATUS_ICONS[task.status],
    meta: [
      formatDuration(max),
      task.agentCount > 0 ? `${task.agentCount} ${plural(task.agentCount, "agent")}` : "",
      m > 0 ? `${formatTokens(m)} tok` : "",
    ],
  };
}
//@ chunk-wnym76ss.js:22531-22776 placement
var WORKFLOW_STATUS_ICONS = {
  pending: e(StatusIcon, { status: "pending" }),
  running: e(StatusIcon, { status: "running" }),
  paused: e(StatusIcon, { status: "off", "aria-label": "paused:" }),
  completed: e(StatusIcon, { status: "success" }),
  failed: e(StatusIcon, { status: "error" }),
  killed: e(StatusIcon, { status: "error", "aria-label": "stopped:" }),
};
//@ chunk-wnym76ss.js:22776-22821 placement
function ks(he) {
  return he.remoteWorkflowRuns;
}
//@ chunk-wnym76ss.js:22821-22872 placement
function ws(De) {
  return De.remoteWorkerReportedGone;
}
//@ chunk-wnym76ss.js:22872-22905 placement
function gs() {
  return new WeakMap();
}
//@ chunk-wnym76ss.js:22905-22934 placement
function ys(Me) {
  return Me.id;
}
//@ chunk-wnym76ss.js:22934-22996 placement
function Rs(oo, Ko) {
  return Ko.task.startTime - oo.task.startTime;
}
//@ chunk-wnym76ss.js:22996-23055 placement
function hs(o) {
  let { task: task } = o;
  return task.status === "running";
}
/**
 * 云端工作流对话框。
 */
//@ chunk-wnym76ss.js:23055-25610 placement
function CloudWorkflowsDialog(o) {
  let a = w(36),
    { onDone: onDone, promptVisibleBelow: promptVisibleBelow } = o;
  useRegisterOverlay("cloud-workflows-dialog");
  let m = useAppState(ks),
    f = useAppState(ws),
    { addNotification: addNotification } = useNotifications(),
    l;
  if (a[0] === MEMO_CACHE_SENTINEL) ((l = new Set()), (a[0] = l));
  else l = a[0];
  let [x, B] = y(l),
    s;
  if (a[1] === MEMO_CACHE_SENTINEL) ((s = new Map()), (a[1] = s));
  else s = a[1];
  let [D, N] = y(s),
    v;
  if (a[2] === MEMO_CACHE_SENTINEL) ((v = new Map()), (a[2] = v));
  else v = a[2];
  let [A, re] = y(v),
    g = R(!0),
    pe,
    ue;
  if (a[3] === MEMO_CACHE_SENTINEL)
    ((pe = () => () => {
      g.current = !1;
    }),
      (ue = []),
      (a[3] = pe),
      (a[4] = ue));
  else ((pe = a[3]), (ue = a[4]));
  P(pe, ue);
  let [W] = y(gs),
    fe;
  if (a[5] !== m) ((fe = new Set(m.map(ys))), (a[5] = m), (a[6] = fe));
  else fe = a[6];
  let i = fe,
    ce;
  if (a[7] !== A || a[8] !== i || a[9] !== W || a[10] !== m || a[11] !== D) {
    const mapped = m.map((ie) => ({
      run: ie,
      stopped: A.get(ie.id)?.run.runId === ie.runId ? D.get(ie.id) : void 0,
    }));
    const C = [...A.values()];
    let k;
    if (a[13] !== i)
      ((k = (I) => {
        let { run: run } = I;
        return !i.has(run.id);
      }),
        (a[13] = i),
        (a[14] = k));
    else k = a[14];
    const filtered = C.filter(k);
    let Z;
    if (a[15] !== D)
      ((Z = (xe) => {
        let { run: run, at: at } = xe;
        return { run: run, stopped: D.get(run.id) ?? at };
      }),
        (a[15] = D),
        (a[16] = Z));
    else Z = a[16];
    const xe = [...mapped, ...filtered.map(Z)];
    let b;
    if (a[17] !== W)
      ((b = (c) => {
        let { run: run, stopped: stopped } = c;
        let $o = W.get(run.wireProgress) ?? Upo(run.wireProgress);
        return (W.set(run.wireProgress, $o), { task: cloudWorkflowToTask(run, $o, stopped) });
      }),
        (a[17] = W),
        (a[18] = b));
    else b = a[18];
    ce = xe.map(b).sort(Rs);
    ((a[7] = A), (a[8] = i), (a[9] = W), (a[10] = m), (a[11] = D), (a[12] = ce));
  } else ce = a[12];
  let h = ce,
    any = h.some(hs),
    V = zZt(any ? 1000 : null),
    _;
  if (a[19] !== f) ((_ = ml() && !f), (a[19] = f), (a[20] = _));
  else _ = a[20];
  let Pe = _,
    C;
  if (a[21] !== addNotification || a[22] !== onDone || a[23] !== m)
    ((C = function E(ae) {
      let Ne = Jn();
      if (!Ne) {
        return;
      }
      B((Fe) => new Set(Fe).add(ae));
      let found = m.find((Ze) => Ze.id === ae);
      if (found !== void 0) re((Re) => new Map(Re).set(ae, { run: found, at: Date.now() }));
      Ne.sendControlRequest({ subtype: "stop_task", task_id: ae })
        .then(
          () => N((Ae) => new Map(Ae).set(ae, Date.now())),
          (He) => {
            let U = `Couldn't stop the workflow: ${sanitizeDisplayText(errorMessage(He), { maxCodeUnits: MAX_TITLE_LENGTH })}`;
            if (g.current) onDone(U, { display: "system" });
            else
              addNotification({
                key: "cloud-workflow-stop",
                kind: "feedback",
                text: U,
                color: "error",
                priority: "immediate",
              });
          },
        )
        .finally(() =>
          B((T) => {
            let me = new Set(T);
            return (me.delete(ae), me);
          }),
        );
    }),
      (a[21] = addNotification),
      (a[22] = onDone),
      (a[23] = m),
      (a[24] = C));
  else C = a[24];
  let E = C,
    k;
  if (a[25] !== Pe || a[26] !== E || a[27] !== x)
    ((k = (I) => {
      let { id: id, status: status } = I;
      return Pe && status === "running" && !x.has(id) ? { onKill: () => E(id) } : {};
    }),
      (a[25] = Pe),
      (a[26] = E),
      (a[27] = x),
      (a[28] = k));
  else k = a[28];
  const I = f && any ? "The cloud session may have stopped, and its workflows too" : void 0;
  let Z;
  if (
    a[29] !== V ||
    a[30] !== onDone ||
    a[31] !== promptVisibleBelow ||
    a[32] !== h ||
    a[33] !== k ||
    a[34] !== I
  )
    ((Z = e(WorkflowRunList, {
      runs: h,
      controlsFor: k,
      emptyText:
        "No dynamic workflows to show. Runs that ended before this terminal attached may not be listed.",
      keepsListOfOne: !0,
      listNote: I,
      now: V,
      onDone: onDone,
      promptVisibleBelow: promptVisibleBelow,
    })),
      (a[29] = V),
      (a[30] = onDone),
      (a[31] = promptVisibleBelow),
      (a[32] = h),
      (a[33] = k),
      (a[34] = I),
      (a[35] = Z));
  else Z = a[35];
  return Z;
}
/**
 * 把云端工作流记录转换成 local_workflow 任务对象。
 */
//@ chunk-wnym76ss.js:25610-26062 placement
function cloudWorkflowToTask(o, t, p) {
  let m = p !== void 0 && o.status === "running";
  return {
    id: o.id,
    type: "local_workflow",
    description: o.description || "Dynamic workflow",
    status: m ? "killed" : o.status,
    startTime: o.startTime,
    endTime: m ? p : o.endTime,
    outputFile: "",
    outputOffset: 0,
    notified: !0,
    script: "",
    prompt: "",
    workflowName: o.workflowName,
    workflowProgress: t,
    progressVersion: 0,
    agentCount: count(t, (f) => f.type === "workflow_agent"),
    totalTokens: o.totalTokens,
    totalToolCalls: o.totalToolCalls,
    logs: [],
  };
}
/**
 * /workflows 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-wnym76ss.js:26062-26235 placement
async function callWorkflowsCommand(onDone, context) {
  if (Jn()) return e(CloudWorkflowsDialog, { onDone: onDone, promptVisibleBelow: context.isMidTurn === !0 });
  return e(WorkflowHistoryDialog, {
    onDone: onDone,
    storageV5: context.storageV5,
    promptVisibleBelow: context.isMidTurn === !0,
  });
}
