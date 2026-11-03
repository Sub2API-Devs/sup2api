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
import { DIALOG_KIND_META, dialogLayout, dialogNotification, dialogCueBehindDraft } from "./dialogKinds.js";
import { useRenderMode } from "../../ink/renderModeContext.js";
import { useAutoDialogKind, getActiveBottomSurface, sessionStore } from "../../screens/repl/storeHooks.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import {
  RECENT_INPUT_GUARD_MS_2,
  INPUT_SETTLE_MS,
  isWithinRecentInput,
} from "../../hooks/useRecentInputGuard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { permissionTitleRef, useOnFirstReveal } from "../permissions/PermissionRequestTitle.js";
import { Text } from "../../ink/components/Text.js";
import { zt, y, R, Se, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { ScrollColumn, SCROLL_COLUMN_MIN_ROWS } from "../design-system/ScrollColumn.js";
import { usePermissionPromptNotification } from "../permissions/PermissionRequest.js";
import { useScreenReaderBell } from "../../hooks/useScreenReaderBell.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { CHROME_ROWS } from "../../ink/outputReplay.js";
import { WORKFLOW_PROGRESS_LIMITS } from "../workflow/WorkflowProgress.js";

//@ chunk-18hwfzwa.js:1445523-1445557 placement
function isNull(hn) {
  return hn === null;
}
//@ chunk-18hwfzwa.js:1445557-1445596 placement
function topBlockingOrAutoDialog(ee) {
  return topBlockingDialog(ee) ?? topAutoDialog(ee);
}
//@ chunk-18hwfzwa.js:1445596-1445628 placement
function selectOpen2(We) {
  return We.open;
}
//@ chunk-18hwfzwa.js:1445628-1445714 placement
function notifyAutoDenyPresence(input, key) {
  if (!key.wheelUp && !key.wheelDown) uiSignals.autoDenyPresence.emit();
  return false;
}
//@ chunk-18hwfzwa.js:1445714-1447866 placement
/**
 * 对话框宿主：按 dialogStore 中打开的对话框与 DIALOG_REGISTRY 渲染，处理 inline/fullscreen 变体、草稿遮挡时延迟显示、首次显示时响铃通知。
 */
function DialogHost(props) {
  let $ = w(38);
  let { transport, variant, components, meta, scrollRegion } = props;
  let Re = variant === undefined ? "inline" : variant;
  let components_2 = components === undefined ? DIALOG_REGISTRY : components;
  let He = meta === undefined ? DIALOG_KIND_META : meta;
  useExternalDialogBridge(transport);
  let dialogStore = useDialogStore();
  let renderMode = useRenderMode();
  let topUserDialog = useTopUserDialog();
  let autoDialogKind = useAutoDialogKind();
  let { hidden, reason } = useHiddenDialogReason();
  let It = topUserDialog !== null && dialogLayout(He, topUserDialog, renderMode) === Re;
  let Ot = autoDialogKind !== null && dialogLayout(He, autoDialogKind, renderMode) === Re;
  let Dt;
  if ($[0] !== hidden || $[1] !== He || $[2] !== renderMode || $[3] !== Re) {
    Dt =
      hidden !== null && dialogLayout(He, hidden, renderMode) === Re
        ? dialogNotification(He, hidden)
        : undefined;
    $[0] = hidden;
    $[1] = He;
    $[2] = renderMode;
    $[3] = Re;
    $[4] = Dt;
  } else Dt = $[4];
  let Lt = Dt;
  let suppressedAutoDialogs = useSuppressedAutoDialogs(autoDialogKind, hidden);
  let Xt = Ot ? autoDialogKind : It ? topUserDialog : null;
  let inputReleaseTiming = useInputReleaseTiming(Xt?.id ?? "");
  let { displacedAt } = inputReleaseTiming;
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS_2, displacedAt);
  let ao = displacedAt === 0 || timeout;
  let co = Xt !== null && Xt.userInvoked === true && !ao;
  let bo;
  if ($[5] !== hidden || $[6] !== Lt) {
    bo =
      hidden !== null && Lt !== undefined
        ? jsxProd_default(
            permissionTitleRef,
            {
              value: hidden.id,
              children: jsxProd_default(DialogBell, {
                notification: Lt,
              }),
            },
            hidden.id,
          )
        : null;
    $[5] = hidden;
    $[6] = Lt;
    $[7] = bo;
  } else bo = $[7];
  let Ao = bo;
  let Bo;
  if ($[8] !== hidden || $[9] !== reason || $[10] !== He || $[11] !== renderMode || $[12] !== Re) {
    Bo =
      hidden !== null && reason === "draft" && dialogLayout(He, hidden, renderMode) === Re
        ? jsxProd_default(Text, {
            dimColor: true,
            children:
              dialogCueBehindDraft(He, hidden) ??
              He[hidden.kind]?.draftHiddenCue ??
              (NON_BLOCKING_DIALOG_KINDS.has(hidden.kind)
                ? SUGGESTION_WAITING_NOTICE
                : QUESTION_WAITING_NOTICE),
          })
        : null;
    $[8] = hidden;
    $[9] = reason;
    $[10] = He;
    $[11] = renderMode;
    $[12] = Re;
    $[13] = Bo;
  } else Bo = $[13];
  let Ro = Bo;
  let Ho;
  if ($[14] !== He || $[15] !== renderMode || $[16] !== Re) {
    Ho = (Io) => dialogLayout(He, Io, renderMode) === Re;
    $[14] = He;
    $[15] = renderMode;
    $[16] = Re;
    $[17] = Ho;
  } else Ho = $[17];
  const filtered = suppressedAutoDialogs.filter(Ho);
  let mn;
  if ($[18] !== dialogStore || $[19] !== He) {
    mn = (Cn) => {
      let No = dialogNotification(He, Cn);
      return No === undefined || dialogStore.hasRevealed(Cn.id, BURIED_IDLE_CUE)
        ? null
        : jsxProd_default(
            BuriedPermissionCue,
            {
              requestId: Cn.id,
              notification: No,
            },
            Cn.id,
          );
    };
    $[18] = dialogStore;
    $[19] = He;
    $[20] = mn;
  } else mn = $[20];
  let mapped = filtered.map(mn);
  let Yo = Xt !== null && !co;
  let kn;
  let Fn;
  if ($[21] !== scrollRegion || $[22] !== Yo) {
    kn = () => (Yo ? () => scrollRegion?.onDialogLeft() : undefined);
    Fn = [scrollRegion, Yo];
    $[21] = scrollRegion;
    $[22] = Yo;
    $[23] = kn;
    $[24] = Fn;
  } else {
    kn = $[23];
    Fn = $[24];
  }
  zt(kn, Fn);
  if (Ao === null && Ro === null && !Yo && mapped.every(isNull)) {
    return null;
  }
  let bn;
  if (
    $[25] !== components_2 ||
    $[26] !== inputReleaseTiming ||
    $[27] !== He ||
    $[28] !== scrollRegion ||
    $[29] !== Yo ||
    $[30] !== Re ||
    $[31] !== Xt
  ) {
    bn =
      Yo &&
      jsxProd_default(
        DialogFrame,
        {
          variant: Re,
          request: Xt,
          components: components_2,
          notification: dialogNotification(He, Xt),
          hostShown: inputReleaseTiming,
          scrollRegion,
        },
        Xt.id,
      );
    $[25] = components_2;
    $[26] = inputReleaseTiming;
    $[27] = He;
    $[28] = scrollRegion;
    $[29] = Yo;
    $[30] = Re;
    $[31] = Xt;
    $[32] = bn;
  } else bn = $[32];
  let Go;
  if ($[33] !== mapped || $[34] !== Ro || $[35] !== Ao || $[36] !== bn) {
    Go = jsxProd_default_2(Fragment, {
      children: [Ao, mapped, Ro, bn],
    });
    $[33] = mapped;
    $[34] = Ro;
    $[35] = Ao;
    $[36] = bn;
    $[37] = Go;
  } else Go = $[37];
  return Go;
}
//@ chunk-18hwfzwa.js:1447866-1448155 placement
function useHiddenDialogReason() {
  let $ = w(5);
  let hidden = useDialogSelector(topBlockingOrAutoDialog);
  let activeBottomSurface = getActiveBottomSurface();
  switch (activeBottomSurface) {
    case "panel":
    case "progress":
    case "draft": {
      let L;
      if ($[0] !== hidden || $[1] !== activeBottomSurface) {
        L = {
          hidden,
          reason: activeBottomSurface,
        };
        $[0] = hidden;
        $[1] = activeBottomSurface;
        $[2] = L;
      } else L = $[2];
      return L;
    }
    case "typing":
    case null: {
      let L;
      if ($[3] !== activeBottomSurface) {
        L = {
          hidden: null,
          reason: activeBottomSurface,
        };
        $[3] = activeBottomSurface;
        $[4] = L;
      } else L = $[4];
      return L;
    }
  }
}
//@ chunk-18hwfzwa.js:1448155-1448609 placement
/**
 * 有用户对话框时返回空列表；否则列出被抑制的自动对话框（非用户触发、非当前顶层与指定排除项）。
 */
function useSuppressedAutoDialogs(autoDialogKind, hidden) {
  let $ = w(12);
  let dialogSelector = useDialogSelector(selectOpen2);
  let ee;
  if ($[0] !== dialogSelector) {
    ee = topAutoDialog({
      open: dialogSelector,
    });
    $[0] = dialogSelector;
    $[1] = ee;
  } else ee = $[1];
  let ke = ee;
  if (
    topUserDialog({
      open: dialogSelector,
    }) !== null
  ) {
    let Re;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      Re = [];
      $[2] = Re;
    } else Re = $[2];
    return Re;
  }
  let Re;
  if ($[3] !== hidden || $[4] !== dialogSelector || $[5] !== ke || $[6] !== autoDialogKind) {
    let Be;
    if ($[8] !== hidden || $[9] !== ke || $[10] !== autoDialogKind) {
      Be = (He) => !He.userInvoked && He !== ke && He !== autoDialogKind && He !== hidden;
      $[8] = hidden;
      $[9] = ke;
      $[10] = autoDialogKind;
      $[11] = Be;
    } else Be = $[11];
    Re = dialogSelector.filter(Be);
    $[3] = hidden;
    $[4] = dialogSelector;
    $[5] = ke;
    $[6] = autoDialogKind;
    $[7] = Re;
  } else Re = $[7];
  return Re;
}
//@ chunk-18hwfzwa.js:1448609-1448805 placement
var QUESTION_WAITING_NOTICE =
  "Claude has a question for you \u2014 it shows once you send or clear what you're typing.";
var SUGGESTION_WAITING_NOTICE =
  "Claude has a suggestion for you \u2014 it shows once you send or clear what you're typing.";
//@ chunk-18hwfzwa.js:1448805-1449346 placement
/**
 * 跟踪底部输入区占用状态：输入结束时记录释放时间与宽限期（有未发送草稿用更长宽限），输入内容被替换时记录时间，返回给对话框判断何时可以弹出。
 */
function useInputReleaseTiming(h) {
  let $ = w(5);
  let activeSurface = getActiveBottomSurface();
  let draftStore = sessionStore();
  let [lastSurface, setLastSurface] = y(activeSurface);
  let initialRelease;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialRelease = {
      at: 0,
      graceMs: RECENT_INPUT_GUARD_MS_2,
    };
    $[0] = initialRelease;
  } else initialRelease = $[0];
  let [release, setRelease] = y(initialRelease);
  if (lastSurface !== activeSurface) {
    setLastSurface(activeSurface);
    if (activeSurface === null) {
      let hadDraft =
        (lastSurface === "typing" || lastSurface === "draft") && draftStore.getState().value.trim() !== "";
      setRelease({
        at: Date.now(),
        graceMs: hadDraft ? INPUT_SETTLE_MS : RECENT_INPUT_GUARD_MS_2,
      });
      endAnnouncementHold();
    }
  }
  let [lastValue, setLastValue] = y(h);
  let [displacedAt, setDisplacedAt] = y(0);
  if (lastValue !== h) {
    setLastValue(h);
    if (lastValue !== "" && h !== "") setDisplacedAt(Date.now());
  }
  let result;
  if ($[1] !== displacedAt || $[2] !== release.at || $[3] !== release.graceMs) {
    result = {
      releasedAt: release.at,
      releaseGraceMs: release.graceMs,
      displacedAt,
    };
    $[1] = displacedAt;
    $[2] = release.at;
    $[3] = release.graceMs;
    $[4] = result;
  } else result = $[4];
  return result;
}
//@ chunk-18hwfzwa.js:1449346-1449713 placement
/**
 * 按对话框外层无边框无内边距的纵向容器偏移，修正可见行范围。
 */
function offsetVisibleRows(h, x) {
  let D = 0;
  let L = x;
  while (
    L?.yogaNode &&
    L.style.flexDirection === "column" &&
    L.yogaNode.getComputedBorder(1) === 0 &&
    L.yogaNode.getComputedPadding(1) === 0
  ) {
    let found = L.childNodes.find((childNode) => childNode.yogaNode !== undefined);
    if (!found?.yogaNode) break;
    D += found.yogaNode.getComputedTop();
    L = found;
  }
  if (!h || D <= 0) return h;
  return h.last < D
    ? null
    : {
        first: Math.max(0, h.first - D),
        last: h.last - D,
        of: h.of - D,
      };
}
//@ chunk-18hwfzwa.js:1449713-1449800 placement
function isScrollAtEnd(h, x) {
  return h !== null && h.last === h.of - 1 && h.last - h.first + 1 >= Math.min(h.of, x);
}
//@ chunk-18hwfzwa.js:1449800-1452498 placement
function DialogFrame(props) {
  let $ = w(33);
  let { variant, request, components, notification, hostShown, scrollRegion } = props;
  let dialogStore = useDialogStore();
  let inputClock = useInputClock();
  let We = R(null);
  let ze = R(null);
  let Xe = R(false);
  let rt = R(undefined);
  let kt = R(0);
  let { subscribeFrames } = Se(kp);
  let Ot;
  let Et;
  if ($[0] !== scrollRegion || $[1] !== subscribeFrames) {
    Ot = () => {
      if (scrollRegion === undefined) {
        return;
      }
      let Lt = function Lt() {
        rt.current = offsetVisibleRows(nodeRowRange(We.current), We.current);
        let Dt = nodeScreenBox(We.current);
        kt.current = Dt?.viewportRows ?? 0;
        if (Xe.current && rt.current !== undefined && isScrollAtEnd(rt.current, kt.current)) {
          Xe.current = false;
          ze.current = Date.now();
        }
        scrollRegion?.followDialog(Dt);
      };
      Lt();
      return subscribeFrames(Lt);
    };
    Et = [scrollRegion, subscribeFrames];
    $[0] = scrollRegion;
    $[1] = subscribeFrames;
    $[2] = Ot;
    $[3] = Et;
  } else {
    Ot = $[2];
    Et = $[3];
  }
  zt(Ot, Et);
  let oo = components[request.kind];
  let reserve = dialogReservedRows({
    variant,
    fullscreen: useRenderMode() === "fullscreen",
    decstbm: isDecstbmRendererEnabled(),
    promptShown: !useHasBlockingDialog(),
    rows: useTerminalSize().rows,
  });
  usePreDispatchKeyHandler(notifyAutoDenyPresence);
  let io;
  if (
    $[4] !== dialogStore ||
    $[5] !== hostShown ||
    $[6] !== inputClock ||
    $[7] !== request.id ||
    $[8] !== request.payload ||
    $[9] !== scrollRegion
  ) {
    io = function Ho() {
      let found = dialogStore.getState().open.find((so) => so.id === request.id);
      if (!found) {
        return false;
      }
      if (found.payload !== request.payload) {
        return false;
      }
      if (isWithinRecentInput(inputClock, found.shownAt ?? 0)) {
        return false;
      }
      if (found.userInvoked) {
        return true;
      }
      let currentEvent = dispatcher.currentEvent;
      let co = currentEvent instanceof KeybindingActionEvent ? currentEvent.sourceEvent : currentEvent;
      let bo = co instanceof KeyboardEvent && co.name === "escape";
      let Ao = rt.current;
      let Bo = Ao === undefined && (nodeScreenBox(We.current)?.rows ?? 0) > 0;
      if (
        scrollRegion !== undefined &&
        co instanceof KeyboardEvent &&
        !bo &&
        (Bo || (Ao !== undefined && !isScrollAtEnd(Ao, kt.current)))
      ) {
        if (scrollRegion.showDialog(nodeScreenBox(We.current), Ao === null || Bo)) {
          ze.current = Date.now();
          Xe.current = true;
        } else if (ze.current !== null && isWithinRecentInput(inputClock, ze.current, INPUT_SETTLE_MS))
          ze.current = Date.now();
        return false;
      }
      let Ro =
        ze.current !== null &&
        isWithinRecentInput(inputClock, ze.current, bo ? RECENT_INPUT_GUARD_MS_2 : INPUT_SETTLE_MS);
      if (Ro && co instanceof KeyboardEvent && !bo) ze.current = Date.now();
      return !(
        isWithinRecentInput(inputClock, hostShown.displacedAt) ||
        isWithinRecentInput(
          inputClock,
          hostShown.releasedAt,
          bo ? RECENT_INPUT_GUARD_MS_2 : hostShown.releaseGraceMs,
        ) ||
        Ro
      );
    };
    $[4] = dialogStore;
    $[5] = hostShown;
    $[6] = inputClock;
    $[7] = request.id;
    $[8] = request.payload;
    $[9] = scrollRegion;
    $[10] = io;
  } else io = $[10];
  let Ho = io;
  if (!oo) {
    dialogStore.dismiss(request.id);
    return null;
  }
  let Io;
  if ($[11] !== request.onFirstReveal) {
    Io =
      request.onFirstReveal !== undefined &&
      jsxProd_default(OnFirstRevealHook, {
        onFirstReveal: request.onFirstReveal,
      });
    $[11] = request.onFirstReveal;
    $[12] = Io;
  } else Io = $[12];
  let Wo;
  if ($[13] !== notification) {
    Wo =
      notification !== undefined &&
      jsxProd_default(DialogBell, {
        notification,
      });
    $[13] = notification;
    $[14] = Wo;
  } else Wo = $[14];
  let answer;
  if ($[15] !== dialogStore || $[16] !== request.id || $[17] !== Ho) {
    answer = (Cn) => {
      if (!Ho()) {
        return false;
      }
      dialogStore.answer(request.id, Cn);
      return true;
    };
    $[15] = dialogStore;
    $[16] = request.id;
    $[17] = Ho;
    $[18] = answer;
  } else answer = $[18];
  let No;
  if ($[19] !== oo || $[20] !== request.payload || $[21] !== answer || $[22] !== Ho) {
    No = jsxProd_default(oo, {
      payload: request.payload,
      wouldTakeAnswer: Ho,
      answer,
    });
    $[19] = oo;
    $[20] = request.payload;
    $[21] = answer;
    $[22] = Ho;
    $[23] = No;
  } else No = $[23];
  let vo;
  if ($[24] !== request.id || $[25] !== reserve || $[26] !== Wo || $[27] !== No) {
    vo = jsxProd_default_2(
      ScrollColumn,
      {
        box: We,
        reserve,
        children: [Wo, No],
      },
      request.id,
    );
    $[24] = request.id;
    $[25] = reserve;
    $[26] = Wo;
    $[27] = No;
    $[28] = vo;
  } else vo = $[28];
  let Yo;
  if ($[29] !== request.id || $[30] !== Io || $[31] !== vo) {
    Yo = jsxProd_default_2(permissionTitleRef, {
      value: request.id,
      children: [Io, vo],
    });
    $[29] = request.id;
    $[30] = Io;
    $[31] = vo;
    $[32] = Yo;
  } else Yo = $[32];
  return Yo;
}
//@ chunk-18hwfzwa.js:1452498-1452573 placement
function OnFirstRevealHook(h) {
  let { onFirstReveal } = h;
  useOnFirstReveal("on-first-reveal", onFirstReveal);
  return null;
}
//@ chunk-18hwfzwa.js:1452573-1452718 placement
function DialogBell(props) {
  let $ = w(1);
  let { notification } = props;
  usePermissionPromptNotification(notification);
  let screenReaderBell = useScreenReaderBell();
  let ee;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ee = {
      perReveal: true,
    };
    $[0] = ee;
  } else ee = $[0];
  useOnFirstReveal("bell", screenReaderBell, ee);
  return null;
}
//@ chunk-18hwfzwa.js:1452718-1452744 affinity
var BURIED_IDLE_CUE = "buried-idle-cue";
//@ chunk-18hwfzwa.js:1452744-1452925 sole-consumer
function BuriedPermissionCue(props) {
  let $ = w(3);
  let { requestId, notification } = props;
  let dialogStore = useDialogStore();
  let ke;
  if ($[0] !== dialogStore || $[1] !== requestId) {
    ke = () => dialogStore.firstReveal(requestId, BURIED_IDLE_CUE);
    $[0] = dialogStore;
    $[1] = requestId;
    $[2] = ke;
  } else ke = $[2];
  usePermissionPromptNotification(notification, ke);
  return null;
}
//@ chunk-18hwfzwa.js:1452984-1453225 placement
function useLogDialogSuppressed(h) {
  let $ = w(5);
  let hasAutoDialog = useHasAutoDialog();
  let activeBottomSurface = getActiveBottomSurface();
  let ee;
  let ke;
  if ($[0] !== hasAutoDialog || $[1] !== h || $[2] !== activeBottomSurface) {
    ee = () => {
      if (!h || !hasAutoDialog || activeBottomSurface === null) {
        return;
      }
      logEvent("tengu_dialoghost_suppressed", {
        reason: fromEnum(activeBottomSurface),
      });
    };
    ke = [h, hasAutoDialog, activeBottomSurface];
    $[0] = hasAutoDialog;
    $[1] = h;
    $[2] = activeBottomSurface;
    $[3] = ee;
    $[4] = ke;
  } else {
    ee = $[3];
    ke = $[4];
  }
  P(ee, ke);
}
//@ chunk-18hwfzwa.js:1453225-1453828 placement
/**
 * 把外部对话框来源（SDK/桥接）接到对话框存储：订阅打开/取消/更新，关闭时回复结果或取消；卸载时把未答复的全部取消。
 */
function useExternalDialogBridge(source) {
  let $ = w(4);
  useLogDialogSuppressed(source !== undefined);
  let dialogStore = useDialogStore();
  let L;
  let ee;
  if ($[0] !== dialogStore || $[1] !== source) {
    L = () => {
      if (!source) {
        return;
      }
      let ke = new Set();
      let Be = source.subscribe((Re) => {
        ke.add(Re.id);
        dialogStore.open(Re);
      });
      let We = source.onCancel((He) => {
        dialogStore.dismiss(He);
      });
      let kt = source.onUpdate((ze) => {
        let { id, payload } = ze;
        if (ke.has(id)) dialogStore.update(id, payload);
      });
      let It = dialogStore.onClosed((At) => {
        if (!ke.delete(At.id)) {
          return;
        }
        source.reply(
          At.type === "answered"
            ? {
                id: At.id,
                result: At.result,
              }
            : {
                id: At.id,
                cancelled: true,
              },
        );
      });
      return () => {
        Be();
        We();
        kt();
        It();
        for (const Ot of ke) {
          dialogStore.dismiss(Ot);
          source.reply({
            id: Ot,
            cancelled: true,
          });
        }
        ke.clear();
      };
    };
    ee = [source, dialogStore];
    $[0] = dialogStore;
    $[1] = source;
    $[2] = L;
    $[3] = ee;
  } else {
    L = $[2];
    ee = $[3];
  }
  P(L, ee);
}
//@ chunk-18hwfzwa.js:1453828-1453970 placement
function dialogReservedRows({ variant, fullscreen, decstbm, promptShown, rows }) {
  if (fullscreen) return variant === "inline" ? Math.floor(rows / 2) : 0;
  return (decstbm ? CHROME_ROWS : SCROLL_COLUMN_MIN_ROWS) + (promptShown ? WORKFLOW_PROGRESS_LIMITS : 0);
}
//@ chunk-18hwfzwa.js:1453970-1453974 placement
init_react_production();
//@ chunk-18hwfzwa.js:1453974-1453978 placement
init_react_production();
export { useExternalDialogBridge, DialogHost };
