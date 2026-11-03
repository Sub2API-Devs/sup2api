/**
 * components/dialogs/DialogHost.tsx
 *
 * 2.1.316 新增。REPL 统一对话框宿主。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (21)
 * attribution: placement 19, affinity 1, sole-consumer 1
 */
import { topBlockingDialog, NON_BLOCKING_DIALOG_KINDS } from "../../screens/replDialogState.js";
import {
  topAutoDialog,
  useDialogStore,
  useTopUserDialog,
  useDialogSelector,
  topUserDialog,
  useHasAutoDialog,
} from "../../state/dialogQueue.js";
import { uiSignals } from "../../state/uiSignals.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { DIALOG_REGISTRY, useHasBlockingDialog } from "./registry.js";
import { DIALOG_KIND_META, dialogLayout, dialogNotification, tW } from "./dialogKinds.js";
import { useRenderMode } from "../../ink/renderModeContext.js";
import { tO, getActiveBottomSurface, op } from "../../screens/repl/storeHooks.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import {
  RECENT_INPUT_GUARD_MS,
  INPUT_SETTLE_MS,
  isWithinRecentInput,
} from "../../hooks/useRecentInputGuard.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ODe, useOnFirstReveal } from "../permissions/PermissionRequestTitle.js";
import { Text } from "../../ink/components/Text.js";
import { zt, y, R, Se, P, j } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { endAnnouncementHold } from "../../utils/accessibility/screenReader.js";
import { useInputClock, nodeRowRange, nodeScreenBox } from "../../ink/components/Input.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { isDecstbmRendererEnabled } from "../../ink/nativeCursor.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { dispatcher } from "../../ink/reconciler.js";
import { KeybindingActionEvent } from "../../keybindings/KeybindingProviderSetup.js";
import { KeyboardEvent } from "../../ink/events/keyboard-event.js";
import { ScrollColumn, NV } from "../design-system/ScrollColumn.js";
import { usePermissionPromptNotification } from "../permissions/PermissionRequest.js";
import { useScreenReaderBell } from "../../hooks/useScreenReaderBell.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { UXe } from "../../ink/outputReplay.js";
import { WORKFLOW_PROGRESS_LIMITS } from "../workflow/WorkflowProgress.js";

//@ chunk-18hwfzwa.js:1445523-1445557 placement
function ljo(hn) {
  return hn === null;
}
//@ chunk-18hwfzwa.js:1445557-1445596 placement
function djo(ee) {
  return topBlockingDialog(ee) ?? topAutoDialog(ee);
}
//@ chunk-18hwfzwa.js:1445596-1445628 placement
function selectOpen2(We) {
  return We.open;
}
//@ chunk-18hwfzwa.js:1445628-1445714 placement
function ujo(kn, Fn) {
  if (!Fn.wheelUp && !Fn.wheelDown) uiSignals.autoDenyPresence.emit();
  return !1;
}
/**
 * 对话框宿主：按 dialogStore 中打开的对话框与 DIALOG_REGISTRY 渲染，处理 inline/fullscreen 变体、草稿遮挡时延迟显示、首次显示时响铃通知。
 */
//@ chunk-18hwfzwa.js:1445714-1447866 placement
function DialogHost(h) {
  let $ = w(38),
    {
      transport: transport,
      variant: variant,
      components: components,
      meta: meta,
      scrollRegion: scrollRegion,
    } = h,
    Re = variant === void 0 ? "inline" : variant,
    Be = components === void 0 ? DIALOG_REGISTRY : components,
    He = meta === void 0 ? DIALOG_KIND_META : meta;
  useExternalDialogBridge(transport);
  let We = useDialogStore(),
    ze = useRenderMode(),
    Xe = useTopUserDialog(),
    rt = tO(),
    { hidden: hidden, reason: reason } = useHiddenDialogReason(),
    It = Xe !== null && dialogLayout(He, Xe, ze) === Re,
    Ot = rt !== null && dialogLayout(He, rt, ze) === Re,
    Dt;
  if ($[0] !== hidden || $[1] !== He || $[2] !== ze || $[3] !== Re)
    ((Dt = hidden !== null && dialogLayout(He, hidden, ze) === Re ? dialogNotification(He, hidden) : void 0),
      ($[0] = hidden),
      ($[1] = He),
      ($[2] = ze),
      ($[3] = Re),
      ($[4] = Dt));
  else Dt = $[4];
  let Lt = Dt,
    oo = useSuppressedAutoDialogs(rt, hidden),
    Xt = Ot ? rt : It ? Xe : null,
    io = useInputReleaseTiming(Xt?.id ?? ""),
    { displacedAt: displacedAt } = io,
    po = useTimeout(RECENT_INPUT_GUARD_MS, displacedAt),
    ao = displacedAt === 0 || po,
    co = Xt !== null && Xt.userInvoked === !0 && !ao,
    bo;
  if ($[5] !== hidden || $[6] !== Lt)
    ((bo =
      hidden !== null && Lt !== void 0
        ? e(ODe, { value: hidden.id, children: e(DialogBell, { notification: Lt }) }, hidden.id)
        : null),
      ($[5] = hidden),
      ($[6] = Lt),
      ($[7] = bo));
  else bo = $[7];
  let Ao = bo,
    Bo;
  if ($[8] !== hidden || $[9] !== reason || $[10] !== He || $[11] !== ze || $[12] !== Re)
    ((Bo =
      hidden !== null && reason === "draft" && dialogLayout(He, hidden, ze) === Re
        ? e(Text, {
            dimColor: !0,
            children:
              tW(He, hidden) ??
              He[hidden.kind]?.draftHiddenCue ??
              (NON_BLOCKING_DIALOG_KINDS.has(hidden.kind)
                ? SUGGESTION_WAITING_NOTICE
                : QUESTION_WAITING_NOTICE),
          })
        : null),
      ($[8] = hidden),
      ($[9] = reason),
      ($[10] = He),
      ($[11] = ze),
      ($[12] = Re),
      ($[13] = Bo));
  else Bo = $[13];
  let Ro = Bo,
    Ho;
  if ($[14] !== He || $[15] !== ze || $[16] !== Re)
    ((Ho = (Io) => dialogLayout(He, Io, ze) === Re), ($[14] = He), ($[15] = ze), ($[16] = Re), ($[17] = Ho));
  else Ho = $[17];
  const filtered = oo.filter(Ho);
  let mn;
  if ($[18] !== We || $[19] !== He)
    ((mn = (Cn) => {
      let No = dialogNotification(He, Cn);
      return No === void 0 || We.hasRevealed(Cn.id, BURIED_IDLE_CUE)
        ? null
        : e(BuriedPermissionCue, { requestId: Cn.id, notification: No }, Cn.id);
    }),
      ($[18] = We),
      ($[19] = He),
      ($[20] = mn));
  else mn = $[20];
  let mapped = filtered.map(mn),
    Yo = Xt !== null && !co,
    kn,
    Fn;
  if ($[21] !== scrollRegion || $[22] !== Yo)
    ((kn = () => (Yo ? () => scrollRegion?.onDialogLeft() : void 0)),
      (Fn = [scrollRegion, Yo]),
      ($[21] = scrollRegion),
      ($[22] = Yo),
      ($[23] = kn),
      ($[24] = Fn));
  else ((kn = $[23]), (Fn = $[24]));
  if ((zt(kn, Fn), Ao === null && Ro === null && !Yo && mapped.every(ljo))) {
    return null;
  }
  let bn;
  if (
    $[25] !== Be ||
    $[26] !== io ||
    $[27] !== He ||
    $[28] !== scrollRegion ||
    $[29] !== Yo ||
    $[30] !== Re ||
    $[31] !== Xt
  )
    ((bn =
      Yo &&
      e(
        DialogFrame,
        {
          variant: Re,
          request: Xt,
          components: Be,
          notification: dialogNotification(He, Xt),
          hostShown: io,
          scrollRegion: scrollRegion,
        },
        Xt.id,
      )),
      ($[25] = Be),
      ($[26] = io),
      ($[27] = He),
      ($[28] = scrollRegion),
      ($[29] = Yo),
      ($[30] = Re),
      ($[31] = Xt),
      ($[32] = bn));
  else bn = $[32];
  let Go;
  if ($[33] !== mapped || $[34] !== Ro || $[35] !== Ao || $[36] !== bn)
    ((Go = r(Fragment, { children: [Ao, mapped, Ro, bn] })),
      ($[33] = mapped),
      ($[34] = Ro),
      ($[35] = Ao),
      ($[36] = bn),
      ($[37] = Go));
  else Go = $[37];
  return Go;
}
//@ chunk-18hwfzwa.js:1447866-1448155 placement
function useHiddenDialogReason() {
  let $ = w(5),
    h = useDialogSelector(djo),
    x = getActiveBottomSurface();
  switch (x) {
    case "panel":
    case "progress":
    case "draft": {
      let L;
      if ($[0] !== h || $[1] !== x) ((L = { hidden: h, reason: x }), ($[0] = h), ($[1] = x), ($[2] = L));
      else L = $[2];
      return L;
    }
    case "typing":
    case null: {
      let L;
      if ($[3] !== x) ((L = { hidden: null, reason: x }), ($[3] = x), ($[4] = L));
      else L = $[4];
      return L;
    }
  }
}
/**
 * 有用户对话框时返回空列表；否则列出被抑制的自动对话框（非用户触发、非当前顶层与指定排除项）。
 */
//@ chunk-18hwfzwa.js:1448155-1448609 placement
function useSuppressedAutoDialogs(h, x) {
  let $ = w(12),
    D = useDialogSelector(selectOpen2),
    ee;
  if ($[0] !== D) ((ee = topAutoDialog({ open: D })), ($[0] = D), ($[1] = ee));
  else ee = $[1];
  let ke = ee;
  if (topUserDialog({ open: D }) !== null) {
    let Re;
    if ($[2] === MEMO_CACHE_SENTINEL) ((Re = []), ($[2] = Re));
    else Re = $[2];
    return Re;
  }
  let Re;
  if ($[3] !== x || $[4] !== D || $[5] !== ke || $[6] !== h) {
    let Be;
    if ($[8] !== x || $[9] !== ke || $[10] !== h)
      ((Be = (He) => !He.userInvoked && He !== ke && He !== h && He !== x),
        ($[8] = x),
        ($[9] = ke),
        ($[10] = h),
        ($[11] = Be));
    else Be = $[11];
    Re = D.filter(Be);
    (($[3] = x), ($[4] = D), ($[5] = ke), ($[6] = h), ($[7] = Re));
  } else Re = $[7];
  return Re;
}
//@ chunk-18hwfzwa.js:1448609-1448805 placement
var QUESTION_WAITING_NOTICE =
    "Claude has a question for you \u2014 it shows once you send or clear what you're typing.",
  SUGGESTION_WAITING_NOTICE =
    "Claude has a suggestion for you \u2014 it shows once you send or clear what you're typing.";
/**
 * 跟踪底部输入区占用状态：输入结束时记录释放时间与宽限期（有未发送草稿用更长宽限），输入内容被替换时记录时间，返回给对话框判断何时可以弹出。
 */
//@ chunk-18hwfzwa.js:1448805-1449346 placement
function useInputReleaseTiming(h) {
  let $ = w(5),
    activeSurface = getActiveBottomSurface(),
    draftStore = op(),
    [lastSurface, setLastSurface] = y(activeSurface),
    initialRelease;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((initialRelease = { at: 0, graceMs: RECENT_INPUT_GUARD_MS }), ($[0] = initialRelease));
  else initialRelease = $[0];
  let [release, setRelease] = y(initialRelease);
  if (lastSurface !== activeSurface) {
    if ((setLastSurface(activeSurface), activeSurface === null)) {
      let hadDraft =
        (lastSurface === "typing" || lastSurface === "draft") && draftStore.getState().value.trim() !== "";
      (setRelease({ at: Date.now(), graceMs: hadDraft ? INPUT_SETTLE_MS : RECENT_INPUT_GUARD_MS }),
        endAnnouncementHold());
    }
  }
  let [lastValue, setLastValue] = y(h),
    [displacedAt, setDisplacedAt] = y(0);
  if (lastValue !== h) {
    if ((setLastValue(h), lastValue !== "" && h !== "")) setDisplacedAt(Date.now());
  }
  let result;
  if ($[1] !== displacedAt || $[2] !== release.at || $[3] !== release.graceMs)
    ((result = { releasedAt: release.at, releaseGraceMs: release.graceMs, displacedAt: displacedAt }),
      ($[1] = displacedAt),
      ($[2] = release.at),
      ($[3] = release.graceMs),
      ($[4] = result));
  else result = $[4];
  return result;
}
/**
 * 按对话框外层无边框无内边距的纵向容器偏移，修正可见行范围。
 */
//@ chunk-18hwfzwa.js:1449346-1449713 placement
function offsetVisibleRows(h, x) {
  let D = 0,
    L = x;
  while (
    L?.yogaNode &&
    L.style.flexDirection === "column" &&
    L.yogaNode.getComputedBorder(1) === 0 &&
    L.yogaNode.getComputedPadding(1) === 0
  ) {
    let found = L.childNodes.find((childNode) => childNode.yogaNode !== void 0);
    if (!found?.yogaNode) break;
    ((D += found.yogaNode.getComputedTop()), (L = found));
  }
  if (!h || D <= 0) return h;
  return h.last < D ? null : { first: Math.max(0, h.first - D), last: h.last - D, of: h.of - D };
}
//@ chunk-18hwfzwa.js:1449713-1449800 placement
function Cee(h, x) {
  return h !== null && h.last === h.of - 1 && h.last - h.first + 1 >= Math.min(h.of, x);
}
//@ chunk-18hwfzwa.js:1449800-1452498 placement
function DialogFrame(h) {
  let $ = w(33),
    {
      variant: variant,
      request: request,
      components: components,
      notification: notification,
      hostShown: hostShown,
      scrollRegion: scrollRegion,
    } = h,
    Be = useDialogStore(),
    He = useInputClock(),
    We = R(null),
    ze = R(null),
    Xe = R(!1),
    rt = R(void 0),
    kt = R(0),
    { subscribeFrames: subscribeFrames } = Se(kp),
    Ot,
    Et;
  if ($[0] !== scrollRegion || $[1] !== subscribeFrames)
    ((Ot = () => {
      if (scrollRegion === void 0) {
        return;
      }
      let Lt = function Lt() {
        rt.current = offsetVisibleRows(nodeRowRange(We.current), We.current);
        let Dt = nodeScreenBox(We.current);
        if (
          ((kt.current = Dt?.viewportRows ?? 0),
          Xe.current && rt.current !== void 0 && Cee(rt.current, kt.current))
        )
          ((Xe.current = !1), (ze.current = Date.now()));
        scrollRegion?.followDialog(Dt);
      };
      return (Lt(), subscribeFrames(Lt));
    }),
      (Et = [scrollRegion, subscribeFrames]),
      ($[0] = scrollRegion),
      ($[1] = subscribeFrames),
      ($[2] = Ot),
      ($[3] = Et));
  else ((Ot = $[2]), (Et = $[3]));
  zt(Ot, Et);
  let oo = components[request.kind],
    Xt = dialogReservedRows({
      variant: variant,
      fullscreen: useRenderMode() === "fullscreen",
      decstbm: isDecstbmRendererEnabled(),
      promptShown: !useHasBlockingDialog(),
      rows: useTerminalSize().rows,
    });
  usePreDispatchKeyHandler(ujo);
  let io;
  if (
    $[4] !== Be ||
    $[5] !== hostShown ||
    $[6] !== He ||
    $[7] !== request.id ||
    $[8] !== request.payload ||
    $[9] !== scrollRegion
  )
    ((io = function Ho() {
      let found = Be.getState().open.find((so) => so.id === request.id);
      if (!found) {
        return !1;
      }
      if (found.payload !== request.payload) {
        return !1;
      }
      if (isWithinRecentInput(He, found.shownAt ?? 0)) {
        return !1;
      }
      if (found.userInvoked) {
        return !0;
      }
      let currentEvent = dispatcher.currentEvent;
      let co = currentEvent instanceof KeybindingActionEvent ? currentEvent.sourceEvent : currentEvent;
      let bo = co instanceof KeyboardEvent && co.name === "escape";
      let Ao = rt.current;
      let Bo = Ao === void 0 && (nodeScreenBox(We.current)?.rows ?? 0) > 0;
      if (
        scrollRegion !== void 0 &&
        co instanceof KeyboardEvent &&
        !bo &&
        (Bo || (Ao !== void 0 && !Cee(Ao, kt.current)))
      ) {
        if (scrollRegion.showDialog(nodeScreenBox(We.current), Ao === null || Bo))
          ((ze.current = Date.now()), (Xe.current = !0));
        else if (ze.current !== null && isWithinRecentInput(He, ze.current, INPUT_SETTLE_MS))
          ze.current = Date.now();
        return !1;
      }
      let Ro =
        ze.current !== null &&
        isWithinRecentInput(He, ze.current, bo ? RECENT_INPUT_GUARD_MS : INPUT_SETTLE_MS);
      if (Ro && co instanceof KeyboardEvent && !bo) ze.current = Date.now();
      return !(
        isWithinRecentInput(He, hostShown.displacedAt) ||
        isWithinRecentInput(
          He,
          hostShown.releasedAt,
          bo ? RECENT_INPUT_GUARD_MS : hostShown.releaseGraceMs,
        ) ||
        Ro
      );
    }),
      ($[4] = Be),
      ($[5] = hostShown),
      ($[6] = He),
      ($[7] = request.id),
      ($[8] = request.payload),
      ($[9] = scrollRegion),
      ($[10] = io));
  else io = $[10];
  let Ho = io;
  if (!oo) {
    return (Be.dismiss(request.id), null);
  }
  let Io;
  if ($[11] !== request.onFirstReveal)
    ((Io = request.onFirstReveal !== void 0 && e($Me, { onFirstReveal: request.onFirstReveal })),
      ($[11] = request.onFirstReveal),
      ($[12] = Io));
  else Io = $[12];
  let Wo;
  if ($[13] !== notification)
    ((Wo = notification !== void 0 && e(DialogBell, { notification: notification })),
      ($[13] = notification),
      ($[14] = Wo));
  else Wo = $[14];
  let mn;
  if ($[15] !== Be || $[16] !== request.id || $[17] !== Ho)
    ((mn = (Cn) => {
      if (!Ho()) {
        return !1;
      }
      return (Be.answer(request.id, Cn), !0);
    }),
      ($[15] = Be),
      ($[16] = request.id),
      ($[17] = Ho),
      ($[18] = mn));
  else mn = $[18];
  let No;
  if ($[19] !== oo || $[20] !== request.payload || $[21] !== mn || $[22] !== Ho)
    ((No = e(oo, { payload: request.payload, wouldTakeAnswer: Ho, answer: mn })),
      ($[19] = oo),
      ($[20] = request.payload),
      ($[21] = mn),
      ($[22] = Ho),
      ($[23] = No));
  else No = $[23];
  let vo;
  if ($[24] !== request.id || $[25] !== Xt || $[26] !== Wo || $[27] !== No)
    ((vo = r(ScrollColumn, { box: We, reserve: Xt, children: [Wo, No] }, request.id)),
      ($[24] = request.id),
      ($[25] = Xt),
      ($[26] = Wo),
      ($[27] = No),
      ($[28] = vo));
  else vo = $[28];
  let Yo;
  if ($[29] !== request.id || $[30] !== Io || $[31] !== vo)
    ((Yo = r(ODe, { value: request.id, children: [Io, vo] })),
      ($[29] = request.id),
      ($[30] = Io),
      ($[31] = vo),
      ($[32] = Yo));
  else Yo = $[32];
  return Yo;
}
//@ chunk-18hwfzwa.js:1452498-1452573 placement
function $Me(h) {
  let { onFirstReveal: onFirstReveal } = h;
  return (useOnFirstReveal("on-first-reveal", onFirstReveal), null);
}
//@ chunk-18hwfzwa.js:1452573-1452718 placement
function DialogBell(h) {
  let $ = w(1),
    { notification: notification } = h;
  usePermissionPromptNotification(notification);
  let D = useScreenReaderBell(),
    ee;
  if ($[0] === MEMO_CACHE_SENTINEL) ((ee = { perReveal: !0 }), ($[0] = ee));
  else ee = $[0];
  return (useOnFirstReveal("bell", D, ee), null);
}
//@ chunk-18hwfzwa.js:1452718-1452744 affinity
var BURIED_IDLE_CUE = "buried-idle-cue";
//@ chunk-18hwfzwa.js:1452744-1452925 sole-consumer
function BuriedPermissionCue(h) {
  let $ = w(3),
    { requestId: requestId, notification: notification } = h,
    L = useDialogStore(),
    ke;
  if ($[0] !== L || $[1] !== requestId)
    ((ke = () => L.firstReveal(requestId, BURIED_IDLE_CUE)), ($[0] = L), ($[1] = requestId), ($[2] = ke));
  else ke = $[2];
  return (usePermissionPromptNotification(notification, ke), null);
}
//@ chunk-18hwfzwa.js:1452984-1453225 placement
function useLogDialogSuppressed(h) {
  let $ = w(5),
    x = useHasAutoDialog(),
    D = getActiveBottomSurface(),
    ee,
    ke;
  if ($[0] !== x || $[1] !== h || $[2] !== D)
    ((ee = () => {
      if (!h || !x || D === null) {
        return;
      }
      logEvent("tengu_dialoghost_suppressed", { reason: fromEnum(D) });
    }),
      (ke = [h, x, D]),
      ($[0] = x),
      ($[1] = h),
      ($[2] = D),
      ($[3] = ee),
      ($[4] = ke));
  else ((ee = $[3]), (ke = $[4]));
  P(ee, ke);
}
/**
 * 把外部对话框来源（SDK/桥接）接到对话框存储：订阅打开/取消/更新，关闭时回复结果或取消；卸载时把未答复的全部取消。
 */
//@ chunk-18hwfzwa.js:1453225-1453828 placement
function useExternalDialogBridge(source) {
  let $ = w(4);
  useLogDialogSuppressed(source !== void 0);
  let x = useDialogStore(),
    L,
    ee;
  if ($[0] !== x || $[1] !== source)
    ((L = () => {
      if (!source) {
        return;
      }
      let ke = new Set();
      let subscribe = source.subscribe((Re) => {
        (ke.add(Re.id), x.open(Re));
      });
      let onCancel = source.onCancel((He) => {
        x.dismiss(He);
      });
      let onUpdate = source.onUpdate((ze) => {
        let { id: id, payload: payload } = ze;
        if (ke.has(id)) x.update(id, payload);
      });
      let onClosed = x.onClosed((At) => {
        if (!ke.delete(At.id)) {
          return;
        }
        source.reply(
          At.type === "answered" ? { id: At.id, result: At.result } : { id: At.id, cancelled: !0 },
        );
      });
      return () => {
        (subscribe(), onCancel(), onUpdate(), onClosed());
        for (const Ot of ke) (x.dismiss(Ot), source.reply({ id: Ot, cancelled: !0 }));
        ke.clear();
      };
    }),
      (ee = [source, x]),
      ($[0] = x),
      ($[1] = source),
      ($[2] = L),
      ($[3] = ee));
  else ((L = $[2]), (ee = $[3]));
  P(L, ee);
}
//@ chunk-18hwfzwa.js:1453828-1453970 placement
function dialogReservedRows({
  variant: variant,
  fullscreen: fullscreen,
  decstbm: decstbm,
  promptShown: promptShown,
  rows: rows,
}) {
  if (fullscreen) return variant === "inline" ? Math.floor(rows / 2) : 0;
  return (decstbm ? UXe : NV) + (promptShown ? WORKFLOW_PROGRESS_LIMITS : 0);
}
//@ chunk-18hwfzwa.js:1453970-1453974 placement
j();
//@ chunk-18hwfzwa.js:1453974-1453978 placement
j();

export { useExternalDialogBridge, DialogHost };
