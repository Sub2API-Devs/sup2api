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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isMenuOpen } from "../CustomSelect/select.js";
import { RemoteAgentTaskLabel } from "./RemoteSessionProgress.js";
import { init_react_production, y, R, zt, P } from "../../../vendor/react/cjs/react.production.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { logEvent } from "../../services/analytics/index.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "../../utils/invisibleChars.js";
import { errorMessage } from "../../utils/errors.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { HintText } from "../design-system/HintText.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { GENERAL_PURPOSE_AGENT } from "../../tools/AgentTool/built-in/generalPurposeAgent.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

//@ chunk-18hwfzwa.js:765561-765801 placement
/**
 * 列表分组标题："标签 (数量)"。
 */
function SectionHeading(props) {
  let $ = w(5);
  let { label, size } = props;
  let ee;
  if ($[0] !== label) {
    ee = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[0] = label;
    $[1] = ee;
  } else ee = $[1];
  let ke;
  if ($[2] !== size || $[3] !== ee) {
    ke = jsxProd_default_2(Text, {
      dimColor: true,
      children: [ee, " (", size, ")"],
    });
    $[2] = size;
    $[3] = ee;
    $[4] = ke;
  } else ke = $[4];
  return ke;
}
//@ chunk-18hwfzwa.js:765801-766213 placement
/**
 * 任务列表项的标签：队友与远程代理用 RemoteAgentTaskLabel，其他直接显示 label。
 */
function TaskItemLabel(props) {
  let $ = w(7);
  let { item } = props;
  const color = isMenuOpen() ? "suggestion" : undefined;
  let children;
  if ($[0] !== item.label || $[1] !== item.task || $[2] !== item.type) {
    children =
      item.type === "in_process_teammate" || item.type === "remote_agent"
        ? jsxProd_default(RemoteAgentTaskLabel, {
            task: item.task,
          })
        : item.label;
    $[0] = item.label;
    $[1] = item.task;
    $[2] = item.type;
    $[3] = children;
  } else children = $[3];
  let Re;
  if ($[4] !== color || $[5] !== children) {
    Re = jsxProd_default(Text, {
      color,
      wrap: "truncate-end",
      children,
    });
    $[4] = color;
    $[5] = children;
    $[6] = Re;
  } else Re = $[6];
  return Re;
}
//@ chunk-18hwfzwa.js:766213-766217 placement
init_react_production();
//@ chunk-18hwfzwa.js:766217-766266 placement
function selectRemoteBackgroundTasks(wn) {
  return wn.remoteBackgroundTasks;
}
//@ chunk-18hwfzwa.js:766266-766318 placement
function selectRemoteWorkerReportedGone_2(mr) {
  return mr.remoteWorkerReportedGone;
}
//@ chunk-18hwfzwa.js:766318-766334 placement
function noopCloudTaskChange() {}
//@ chunk-18hwfzwa.js:766334-769919 placement
/**
 * CloudTasksDialog：查看云端任务的对话框。
 */
function CloudTasksDialog(props) {
  let $ = w(50);
  let { onDone } = props;
  useRegisterOverlay("cloud-tasks-dialog");
  let appState = useAppState(selectRemoteBackgroundTasks);
  let appState_2 = useAppState(selectRemoteWorkerReportedGone_2);
  let [ee, ke] = y(undefined);
  let Be;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Be = new Set();
    $[0] = Be;
  } else Be = $[0];
  let [He, We] = y(Be);
  let ze;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    ze = new Set();
    $[1] = ze;
  } else ze = $[1];
  let [Xe, rt] = y(ze);
  let kt;
  if ($[2] !== Xe) {
    kt = (At) => !Xe.has(At.id);
    $[2] = Xe;
    $[3] = kt;
  } else kt = $[3];
  let filtered = appState.filter(kt);
  let [Ot, Et] = y(null);
  let Dt;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    Dt = isRemoteControlChannelAvailable();
    $[4] = Dt;
  } else Dt = $[4];
  let Lt = Dt;
  let oo = Lt && !appState_2;
  let Xt = R(false);
  let so = ee !== undefined && !filtered.some((io) => io.id === ee);
  let po;
  let ao;
  if ($[5] !== so) {
    po = () => {
      if (so) Xt.current = true;
    };
    ao = [so];
    $[5] = so;
    $[6] = po;
    $[7] = ao;
  } else {
    po = $[6];
    ao = $[7];
  }
  zt(po, ao);
  let co;
  if ($[8] !== filtered.length || $[9] !== appState_2) {
    co = () => {
      logEvent("tengu_remote_background_tasks_shown", {
        count: filtered.length,
        worker_reported_gone: appState_2,
      });
    };
    $[8] = filtered.length;
    $[9] = appState_2;
    $[10] = co;
  } else co = $[10];
  let bo;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    bo = [];
    $[11] = bo;
  } else bo = $[11];
  P(co, bo);
  let Ao;
  if ($[12] !== onDone) {
    Ao = () =>
      onDone("Background dialog dismissed", {
        display: "skip",
      });
    $[12] = onDone;
    $[13] = Ao;
  } else Ao = $[13];
  let onCancel = Ao;
  let Ro;
  if (
    $[14] !== ee ||
    $[15] !== so ||
    $[16] !== Lt ||
    $[17] !== Et ||
    $[18] !== He ||
    $[19] !== filtered[0]?.id ||
    $[20] !== filtered.length ||
    $[21] !== appState_2
  ) {
    Ro = function kn(event) {
      if (event.key !== "x" || event.ctrl || event.meta || !Lt) {
        return;
      }
      if (appState_2) {
        if (filtered.length > 0) logEvent("tengu_remote_background_tasks_stop_unavailable", {});
        return;
      }
      event.stopImmediatePropagation();
      if (Xt.current || so) {
        Xt.current = false;
        return;
      }
      let Io = ee ?? filtered[0]?.id;
      let remoteCaps = getRemoteCaps();
      if (Io === undefined || He.has(Io) || !remoteCaps) {
        return;
      }
      We((mn) => new Set(mn).add(Io));
      Et(null);
      remoteCaps
        .sendControlRequest({
          subtype: "stop_task",
          task_id: Io,
        })
        .then(
          () => rt((Cn) => new Set(Cn).add(Io)),
          (error) => Et(`Couldn't stop it: ${stripInvisibleChars_3(errorMessage(error))}`),
        )
        .finally(() =>
          We((vo) => {
            let Yo = new Set(vo);
            Yo.delete(Io);
            return Yo;
          }),
        );
    };
    $[14] = ee;
    $[15] = so;
    $[16] = Lt;
    $[17] = Et;
    $[18] = He;
    $[19] = filtered[0]?.id;
    $[20] = filtered.length;
    $[21] = appState_2;
    $[22] = Ro;
  } else Ro = $[22];
  let onKeyDown = Ro;
  const subtitle =
    appState_2 && filtered.length > 0
      ? "The cloud session may have stopped, and its tasks too"
      : "Running in the cloud session";
  let bn;
  if ($[23] !== filtered.length) {
    bn =
      filtered.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "navigate",
      });
    $[23] = filtered.length;
    $[24] = bn;
  } else bn = $[24];
  let Go;
  if ($[25] !== oo || $[26] !== filtered.length) {
    Go =
      filtered.length > 0 &&
      oo &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    $[25] = oo;
    $[26] = filtered.length;
    $[27] = Go;
  } else Go = $[27];
  let hn;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    hn = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[28] = hn;
  } else hn = $[28];
  let inputGuide;
  if ($[29] !== bn || $[30] !== Go) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [bn, Go, hn],
    });
    $[29] = bn;
    $[30] = Go;
    $[31] = inputGuide;
  } else inputGuide = $[31];
  let Xo;
  if ($[32] !== onCancel || $[33] !== He || $[34] !== filtered) {
    Xo =
      filtered.length === 0
        ? jsxProd_default(HintText, {
            children: "No tasks currently running",
          })
        : jsxProd_default(ModelSelector, {
            options: filtered.map((Sn) => ({
              value: Sn.id,
              label:
                (Sn.description || stripInvisibleChars_3(Sn.id)) +
                (He.has(Sn.id) ? " \xB7 stopping\u2026" : ""),
              description:
                Sn.subagentType && Sn.subagentType !== GENERAL_PURPOSE_AGENT.agentType
                  ? Sn.subagentType
                  : Sn.taskType?.replace(/^local_/, ""),
            })),
            onFocus: ke,
            onChange: noopCloudTaskChange,
            onCancel,
            visibleOptionCount: 10,
            hideIndexes: true,
          });
    $[32] = onCancel;
    $[33] = He;
    $[34] = filtered;
    $[35] = Xo;
  } else Xo = $[35];
  let $n;
  if ($[36] !== Ot) {
    $n =
      Ot !== null &&
      jsxProd_default(Text, {
        color: "error",
        children: Ot,
      });
    $[36] = Ot;
    $[37] = $n;
  } else $n = $[37];
  let on;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    on = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Each task's output reaches the transcript when it finishes; a per-task view isn't sent to this terminal.",
    });
    $[38] = on;
  } else on = $[38];
  let _o;
  if ($[39] !== $n) {
    _o = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [$n, on],
    });
    $[39] = $n;
    $[40] = _o;
  } else _o = $[40];
  let children;
  if ($[41] !== onCancel || $[42] !== subtitle || $[43] !== inputGuide || $[44] !== Xo || $[45] !== _o) {
    children = jsxProd_default_2(Dialog, {
      title: "Background",
      subtitle,
      onCancel,
      color: "background",
      inputGuide,
      children: [Xo, _o],
    });
    $[41] = onCancel;
    $[42] = subtitle;
    $[43] = inputGuide;
    $[44] = Xo;
    $[45] = _o;
    $[46] = children;
  } else children = $[46];
  let Dn;
  if ($[47] !== onKeyDown || $[48] !== children) {
    Dn = jsxProd_default(FocusColumn, {
      onKeyDown,
      children,
    });
    $[47] = onKeyDown;
    $[48] = children;
    $[49] = Dn;
  } else Dn = $[49];
  return Dn;
}
export { CloudTasksDialog, SectionHeading, TaskItemLabel };
