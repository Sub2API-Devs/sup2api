/**
 * hooks/useVoiceIntegration.tsx
 *
 * 语音与输入框的集成：按住说话键位、录音状态切换、把转写文本插入光标处（输入分歧时放弃）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoiceIntegration.tsx
 * pieces: chunk-tzghj6zv.js (19), chunk-v6kts6xw.js (1)
 * attribution: placement 4, layout 12, fingerprint 4
 */
import { j, Q, P, R, ce, zt, yt } from "../../vendor/react/cjs/react.production.js";
import { iP } from "../context/session.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { KV } from "../services/oauth/loginEvents.js";
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { useVoiceEnabled } from "./useVoiceEnabled.js";
import { G4r, isVoiceModeAllowed } from "../voice/voiceModeEnabled.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logEvent } from "../services/analytics/index.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { keybindingsState, getKeybindings } from "../keybindings/loadUserBindings.js";
import { useNotifications } from "../context/notifications.js";
import { CUn } from "./_new/useVoiceIntegration.helpers-yj65.js";
import { useGetVoiceState } from "../context/voice.js";
import { replaceIdeographicSpace } from "../utils/stringUtils.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { countWords } from "../utils/intl.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { UV } from "../context/overlayContext.js";
import { useClock } from "../ink/components/ClockContext.js";
import { keystrokesEqual } from "../keybindings/resolver.js";
import { keystrokeToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-tzghj6zv.js:11964-11968 placement
j();
//@ chunk-tzghj6zv.js:11968-12042 placement
function vXe() {
  let d = iP();
  return useStoreSelector(d && KV.of(d), (h) => h.loginCompleted) ?? 0;
}
/**
 * 判断语音输入是否可用（设置开启、已认证且允许语音模式），首次计算时记录初始化事件。
 */
//@ chunk-tzghj6zv.js:12042-12324 placement
function useVoiceAvailable() {
  let d = useAppState((C) => useVoiceEnabled(C.settings)),
    h = vXe(),
    x = Q(() => d && G4r(), [h, d]);
  return (
    P(() => {
      if (!claimOnce().claim("voice_init_gate")) return;
      logEvent("tengu_voice_init_gate", {
        user_intent_store: d,
        user_intent_disk: useVoiceEnabled(getInitialSettings_2()),
        has_voice_auth: G4r(),
        voice_mode_allowed: isVoiceModeAllowed(),
        auth_version: h,
      });
    }, []),
    x && isVoiceModeAllowed()
  );
}
//@ chunk-tzghj6zv.js:12324-12328 placement
j();
//@ chunk-tzghj6zv.js:12328-12365 layout
function Bo(rs) {
  return rs.voiceState;
}
//@ chunk-tzghj6zv.js:12365-12420 layout
function Ho(ns) {
  return ns.settings.voice?.mode ?? "hold";
}
//@ chunk-tzghj6zv.js:12420-12501 layout
function Fo(Qr) {
  if (!Qr.voiceWarmingUp) {
    return Qr;
  }
  return { ...Qr, voiceWarmingUp: !1 };
}
//@ chunk-tzghj6zv.js:12501-12610 layout
function clearVoiceDoubleTap(qr) {
  if (!qr.awaitingVoiceSubmitDoubleTap) {
    return qr;
  }
  return { ...qr, awaitingVoiceSubmitDoubleTap: !1 };
}
//@ chunk-tzghj6zv.js:12610-12691 layout
function jo(Xr) {
  if (!Xr.voiceWarmingUp) {
    return Xr;
  }
  return { ...Xr, voiceWarmingUp: !1 };
}
//@ chunk-tzghj6zv.js:12691-12800 layout
function clearVoiceDoubleTap_2(Jr) {
  if (!Jr.awaitingVoiceSubmitDoubleTap) {
    return Jr;
  }
  return { ...Jr, awaitingVoiceSubmitDoubleTap: !1 };
}
//@ chunk-tzghj6zv.js:12800-12909 layout
function clearVoiceDoubleTap_3(Zr) {
  if (!Zr.awaitingVoiceSubmitDoubleTap) {
    return Zr;
  }
  return { ...Zr, awaitingVoiceSubmitDoubleTap: !1 };
}
//@ chunk-tzghj6zv.js:12909-12990 layout
function Go(en) {
  if (!en.voiceWarmingUp) {
    return en;
  }
  return { ...en, voiceWarmingUp: !1 };
}
//@ chunk-tzghj6zv.js:12990-13070 layout
function Qo(tn) {
  if (tn.voiceWarmingUp) {
    return tn;
  }
  return { ...tn, voiceWarmingUp: !0 };
}
//@ chunk-tzghj6zv.js:13070-13140 layout
var bn = require("./chunk-a658aeqp.js"),
  ht = 120,
  rn = 2000,
  nn = 5,
  Wt = 2,
  on = 300;
//@ chunk-tzghj6zv.js:13140-13361 fingerprint = matchesKeyboardEvent (0.906)
function matchesKeyboardEvent(e, target) {
  if ((e.key === "return" ? "enter" : e.key.toLowerCase()) !== target.key) return !1;
  if (e.ctrl !== target.ctrl) return !1;
  if (e.shift !== target.shift) return !1;
  if (e.meta !== (target.alt || target.meta)) return !1;
  if (e.superKey !== target.super) return !1;
  return !0;
}
//@ chunk-tzghj6zv.js:13361-13407 layout
function an(d) {
  return keybindingsState.changed.subscribe(d);
}
//@ chunk-tzghj6zv.js:13407-13436 layout
function cn() {
  return getKeybindings(keybindingsState);
}
/**
 * 语音集成：录音状态变化时在光标处插入/替换临时转写文本（interimRange），最终转写落地；输入在录音期间被改动则放弃插入（input_diverged）。
 */
//@ chunk-tzghj6zv.js:13436-16010 fingerprint = useVoiceIntegration (0.686)
function useVoiceIntegration({ composer: composer, isActive: isActive = !0 }) {
  let { addNotification: addNotification } = useNotifications(),
    C = CUn(),
    A = useGetVoiceState(),
    voicePrefixRef = R(null),
    voiceSuffixRef = R(""),
    lastSetInputRef = R(null),
    stripTrailing = ce(
      (maxStrip, { char: ee = " ", anchor: ye = !1, floor: Se = 0 } = {}) => {
        let { value: te, cursorOffset: cursorOffset } = composer,
          beforeCursor = te.slice(0, cursorOffset),
          afterCursor = te.slice(cursorOffset),
          re = ee === " " ? replaceIdeographicSpace(beforeCursor) : beforeCursor,
          trailing = 0;
        while (trailing < re.length && re[re.length - 1 - trailing] === ee) trailing++;
        let stripCount = Math.max(0, Math.min(trailing - Se, maxStrip)),
          J = trailing - stripCount,
          stripped = beforeCursor.slice(0, beforeCursor.length - stripCount),
          gap = "";
        if (ye) {
          if (
            ((voicePrefixRef.current = stripped),
            (voiceSuffixRef.current = afterCursor),
            afterCursor.length > 0 && !/^\s/.test(afterCursor))
          )
            gap = " ";
        }
        let se = stripped + gap + afterCursor;
        if (ye) lastSetInputRef.current = se;
        if (se === te && stripCount === 0) return J;
        return (composer.setValueWithCursor(se, stripped.length), J);
      },
      [composer],
    ),
    resetAnchor = ce(() => {
      let prefix = voicePrefixRef.current;
      if (prefix === null) return;
      let suffix = voiceSuffixRef.current;
      if (
        ((voicePrefixRef.current = null),
        (voiceSuffixRef.current = ""),
        composer.value !== lastSetInputRef.current)
      )
        return;
      composer.setValueWithCursor(prefix + suffix, prefix.length);
    }, [composer]),
    N = useVoiceAvailable(),
    B = useAppState((L) => L.settings.voice?.autoSubmit === !0),
    pe = useAppState((L) => L.settings.voice?.mode ?? "hold"),
    oe = useAppState_2((L) => L.voiceState),
    ne = useAppState_2((s_0) => s_0.voiceInterimTranscript);
  (P(() => {
    if (isActive && A().voiceState === "recording" && voicePrefixRef.current === null) {
      let { value: L, cursorOffset: cursorOffset } = composer;
      ((voicePrefixRef.current = L.slice(0, cursorOffset)),
        (voiceSuffixRef.current = L.slice(cursorOffset)),
        (lastSetInputRef.current = L));
    }
    if (oe === "idle")
      ((voicePrefixRef.current = null), (voiceSuffixRef.current = ""), (lastSetInputRef.current = null));
  }, [oe, A, composer, isActive]),
    P(() => {
      if (voicePrefixRef.current === null) return;
      let input = voicePrefixRef.current,
        prefix_0 = voiceSuffixRef.current;
      if (composer.value !== lastSetInputRef.current) return;
      let ye = input.length > 0 && !/\s$/.test(input) && ne.length > 0,
        Se = prefix_0.length > 0 && !/^\s/.test(prefix_0),
        te = ye ? " " : "",
        ae = Se ? " " : "",
        X = input + te + ne + ae + prefix_0,
        F = input.length + te.length + ne.length;
      (composer.setValueWithCursor(X, F), (lastSetInputRef.current = X));
    }, [ne, composer]));
  let handleVoiceTranscript = ce(
      (text) => {
        let prefix_1 = voicePrefixRef.current;
        if (prefix_1 === null) {
          logFeatureBad("voice_transcript_insert", "no_anchor");
          return;
        }
        let suffix_1 = voiceSuffixRef.current;
        if (composer.value !== lastSetInputRef.current) {
          logFeatureSad("voice_transcript_insert", "input_diverged");
          return;
        }
        let Se = prefix_1.length > 0 && !/\s$/.test(prefix_1) && text.length > 0,
          te = suffix_1.length > 0 && !/^\s/.test(suffix_1) && text.length > 0,
          ae = Se ? " " : "",
          X = te ? " " : "",
          F = prefix_1 + ae + text + X + suffix_1,
          re = prefix_1.length + ae.length + text.length;
        (composer.setValueWithCursor(F, re),
          (lastSetInputRef.current = F),
          logFeatureOk("voice_transcript_insert"),
          (voicePrefixRef.current = prefix_1 + ae + text));
        let H = pe === "tap" || B,
          D = composer.submit !== void 0 && H && countWords(text) >= 3 && composer.submit(F, !0);
        C((J) => {
          let K = composer.submit !== void 0 && pe !== "tap" && !D;
          if (J.awaitingVoiceSubmitDoubleTap === K) return J;
          return { ...J, awaitingVoiceSubmitDoubleTap: K };
        });
      },
      [composer, C, B, pe],
    ),
    voice = bn.useVoice({
      onTranscript: handleVoiceTranscript,
      onError: (message) => {
        addNotification({
          key: "voice-error",
          kind: "warning",
          text: message,
          color: "error",
          priority: "immediate",
          timeoutMs: 1e4,
        });
      },
      enabled: N,
      focusMode: !1,
      mode: pe,
    }),
    interimRange = Q(() => {
      if (voicePrefixRef.current === null) return null;
      if (ne.length === 0) return null;
      let prefix_2 = voicePrefixRef.current,
        ee = prefix_2.length > 0 && !/\s$/.test(prefix_2) && ne.length > 0,
        ye = prefix_2.length + (ee ? 1 : 0),
        Se = ye + ne.length;
      return { start: ye, end: Se };
    }, [ne]);
  return (
    zt(() => {
      composer.setInterimRange?.(interimRange);
    }, [composer, interimRange]),
    {
      stripTrailing: stripTrailing,
      resetAnchor: resetAnchor,
      handleKeyEvent: voice.handleKeyEvent,
      cancelRecording: voice.cancelRecording,
      interimRange: interimRange,
    }
  );
}
/**
 * 语音快捷键：voice:pushToTalk 按住开始/松开结束，Esc 取消，处理 hold 与 toggle 两种模式。
 */
//@ chunk-tzghj6zv.js:16010-20376 fingerprint = useVoiceKeybindingHandler (0.721)
function useVoiceKeybindingHandler(d) {
  let $ = w(32),
    {
      voiceHandleKeyEvent: voiceHandleKeyEvent,
      voiceCancelRecording: voiceCancelRecording,
      stripTrailing: stripTrailing,
      resetAnchor: resetAnchor,
      isActive: isActive,
      composerTakesTypedKeys: composerTakesTypedKeys,
      composer: composer,
    } = d,
    V = composerTakesTypedKeys === void 0 ? !0 : composerTakesTypedKeys,
    getVoiceState = useGetVoiceState(),
    setVoiceState = CUn(),
    keybindingContext = useKeybindingContext(),
    isModalOverlayActive = UV(),
    oe = useVoiceAvailable(),
    ne = useAppState_2(Bo),
    z = useAppState(Ho),
    we = useClock(),
    Te = yt(an, cn),
    L = keybindingContext ? keybindingContext.bindings : Te,
    ee;
  ye: {
    if (!oe) {
      ee = null;
      break ye;
    }
    let result = null;
    if ($[0] !== L) {
      for (const ae of L) {
        if (ae.context !== "Chat") {
          continue;
        }
        if (ae.chord.length !== 1) {
          continue;
        }
        let ks = ae.chord[0];
        if (!ks) {
          continue;
        }
        if (ae.action === "voice:pushToTalk") result = ks;
        else if (result !== null && keystrokesEqual(ks, result)) result = null;
      }
      (($[0] = L), ($[1] = result));
    } else result = $[1];
    ee = result;
  }
  let F = ee,
    re;
  if ($[2] !== F)
    ((re = F ? keystrokeToDisplayString(F, getShortcutDisplayPlatform()) : null), ($[2] = F), ($[3] = re));
  else re = $[3];
  let H = re,
    D =
      F !== null && F.key.length === 1 && !F.ctrl && !F.alt && !F.shift && !F.meta && !F.super ? F.key : null,
    rapidCountRef = R(0),
    charsInInputRef = R(0),
    recordingFloorRef = R(0),
    isHoldActiveRef = R(!1),
    resetTimerRef = R(null),
    Ce = R(0),
    de = R(null),
    _e,
    Pe;
  if ($[4] !== setVoiceState || $[5] !== ne)
    ((_e = () => {
      if (ne !== "recording")
        ((isHoldActiveRef.current = !1), (recordingFloorRef.current = 0), setVoiceState(Fo));
      else {
        if (((Ce.current = 0), de.current)) (de.current(), (de.current = null));
        setVoiceState(clearVoiceDoubleTap);
      }
    }),
      (Pe = [ne, setVoiceState]),
      ($[4] = setVoiceState),
      ($[5] = ne),
      ($[6] = _e),
      ($[7] = Pe));
  else ((_e = $[6]), (Pe = $[7]));
  P(_e, Pe);
  let Ge, _;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((Ge = () => () => {
      if (de.current) (de.current(), (de.current = null));
    }),
      (_ = []),
      ($[8] = Ge),
      ($[9] = _));
  else ((Ge = $[8]), (_ = $[9]));
  P(Ge, _);
  let ge;
  if ($[10] !== setVoiceState)
    ((ge = function ke() {
      if (rapidCountRef.current === 0) {
        return;
      }
      if (resetTimerRef.current) (resetTimerRef.current(), (resetTimerRef.current = null));
      ((rapidCountRef.current = 0), (charsInInputRef.current = 0), setVoiceState(jo));
    }),
      ($[10] = setVoiceState),
      ($[11] = ge));
  else ge = $[11];
  let ke = ge,
    q;
  if (
    $[12] !== D ||
    $[13] !== we ||
    $[14] !== composer ||
    $[15] !== V ||
    $[16] !== getVoiceState ||
    $[17] !== isActive ||
    $[18] !== isModalOverlayActive ||
    $[19] !== resetAnchor ||
    $[20] !== ke ||
    $[21] !== setVoiceState ||
    $[22] !== stripTrailing ||
    $[23] !== voiceCancelRecording ||
    $[24] !== oe ||
    $[25] !== voiceHandleKeyEvent ||
    $[26] !== F ||
    $[27] !== z
  )
    ((q = (prev) => {
      if (!oe) {
        return;
      }
      if (!isActive || isModalOverlayActive) {
        return;
      }
      if (
        (prev.key === "escape" || (prev.key === "c" && prev.ctrl && !prev.shift && !prev.meta)) &&
        getVoiceState().voiceState !== "idle"
      ) {
        (prev.stopImmediatePropagation(), voiceCancelRecording(), resetAnchor());
        return;
      }
      if (D !== null && !V) {
        return;
      }
      if (z !== "tap" && composer.submit !== void 0 && getVoiceState().awaitingVoiceSubmitDoubleTap) {
        let submit = composer.submit;
        let Ee = () => {
          if (((Ce.current = 0), de.current)) (de.current(), (de.current = null));
        };
        let qe = () => {
          (Ee(), setVoiceState(clearVoiceDoubleTap_2));
        };
        let ut =
          D !== null &&
          !prev.ctrl &&
          !prev.meta &&
          !prev.shift &&
          (D === " " ? replaceIdeographicSpace(prev.key) : prev.key)[0] === D;
        let He = composer.cursorOffset === composer.value.length;
        if (!ut || !He) qe();
        else if (de.current !== null) qe();
        else if (getVoiceState().voiceState === "idle") {
          let now = Date.now();
          let Ne = Ce.current;
          if (Ne !== 0 && now - Ne <= on) {
            (prev.stopImmediatePropagation(),
              (Ce.current = 0),
              (de.current = we.setTimeout(() => {
                de.current = null;
                let De = getVoiceState();
                if (De.voiceState !== "idle" || !De.awaitingVoiceSubmitDoubleTap) {
                  return;
                }
                let Ue = composer.value;
                let Fe = Ue.endsWith(D) || (D === " " && Ue.endsWith("\u3000")) ? Ue.slice(0, -1) : Ue;
                if (!submit(Fe, !0)) {
                  return;
                }
                setVoiceState(clearVoiceDoubleTap_3);
              }, ht)));
            return;
          }
          if (Ne !== 0) qe();
          else Ce.current = now;
        }
      }
      if (F === null) {
        return;
      }
      let Ve;
      if (D !== null) {
        let et = D === " " ? replaceIdeographicSpace(prev.key) : prev.key;
        Ve =
          !prev.ctrl &&
          !prev.meta &&
          !prev.shift &&
          et[0] === D &&
          (et.length === 1 || et === D.repeat(et.length))
            ? et.length
            : null;
      } else Ve = matchesKeyboardEvent(prev, F) ? 1 : null;
      if (Ve === null) {
        ke();
        return;
      }
      if (z === "tap") {
        let currentVoiceState = getVoiceState().voiceState;
        if (currentVoiceState === "processing") {
          if (D === null) prev.stopImmediatePropagation();
          return;
        }
        let mt = currentVoiceState === "idle";
        if (mt && composer.value.length > 0) {
          return;
        }
        prev.stopImmediatePropagation();
        let zr = rapidCountRef.current === 0;
        if (((rapidCountRef.current = rapidCountRef.current + Ve), resetTimerRef.current))
          resetTimerRef.current();
        if (
          ((resetTimerRef.current = we.setTimeout(() => {
            ((resetTimerRef.current = null), ke());
          }, ht)),
          !zr)
        ) {
          if (D !== null) stripTrailing(Ve, { char: D, floor: 0 });
          return;
        }
        if (mt) {
          if (D !== null) stripTrailing(Ve, { char: D, anchor: !0 });
          else stripTrailing(0, { anchor: !0 });
        } else if (D !== null) stripTrailing(Ve, { char: D, floor: 0 });
        if ((voiceHandleKeyEvent(), mt && getVoiceState().voiceState === "idle")) resetAnchor();
        return;
      }
      let voiceState = getVoiceState().voiceState;
      if (isHoldActiveRef.current && voiceState !== "idle") {
        if ((prev.stopImmediatePropagation(), D !== null))
          stripTrailing(Ve, { char: D, floor: recordingFloorRef.current });
        voiceHandleKeyEvent();
        return;
      }
      if (voiceState === "recording") {
        if (D === null) prev.stopImmediatePropagation();
        return;
      }
      if (voiceState === "processing" && D === null) {
        prev.stopImmediatePropagation();
        return;
      }
      let countBefore = rapidCountRef.current;
      if (
        ((rapidCountRef.current = rapidCountRef.current + Ve),
        D === null || (voiceState === "idle" && rapidCountRef.current >= nn))
      ) {
        if ((prev.stopImmediatePropagation(), resetTimerRef.current))
          (resetTimerRef.current(), (resetTimerRef.current = null));
        if (((rapidCountRef.current = 0), (isHoldActiveRef.current = !0), setVoiceState(Go), D !== null))
          ((recordingFloorRef.current = stripTrailing(charsInInputRef.current + Ve, { char: D, anchor: !0 })),
            (charsInInputRef.current = 0),
            voiceHandleKeyEvent());
        else (stripTrailing(0, { anchor: !0 }), voiceHandleKeyEvent(rn));
        if (getVoiceState().voiceState === "idle") ((isHoldActiveRef.current = !1), resetAnchor());
        return;
      }
      if (countBefore >= Wt)
        (prev.stopImmediatePropagation(), stripTrailing(Ve, { char: D, floor: charsInInputRef.current }));
      else charsInInputRef.current = charsInInputRef.current + Ve;
      if (voiceState === "idle" && rapidCountRef.current >= Wt) setVoiceState(Qo);
      if (resetTimerRef.current) resetTimerRef.current();
      resetTimerRef.current = we.setTimeout(() => {
        ((resetTimerRef.current = null), ke());
      }, ht);
    }),
      ($[12] = D),
      ($[13] = we),
      ($[14] = composer),
      ($[15] = V),
      ($[16] = getVoiceState),
      ($[17] = isActive),
      ($[18] = isModalOverlayActive),
      ($[19] = resetAnchor),
      ($[20] = ke),
      ($[21] = setVoiceState),
      ($[22] = stripTrailing),
      ($[23] = voiceCancelRecording),
      ($[24] = oe),
      ($[25] = voiceHandleKeyEvent),
      ($[26] = F),
      ($[27] = z),
      ($[28] = q));
  else q = $[28];
  let Gr = q,
    po;
  if ($[29] !== Gr || $[30] !== H)
    ((po = { handleKeyDown: Gr, voiceKeyDisplay: H }), ($[29] = Gr), ($[30] = H), ($[31] = po));
  else po = $[31];
  return po;
}
//@ chunk-v6kts6xw.js:2603-2710 fingerprint = DEFAULT_VOICE_KEYSTROKE (1)
function DEFAULT_VOICE_KEYSTROKE(t) {
  return (
    t.shift && !t.ctrl && !t.alt && !t.meta && !t.super && t.key.length === 1 && t.key >= "a" && t.key <= "z"
  );
}

export { useVoiceAvailable, vXe, useVoiceIntegration, useVoiceKeybindingHandler, DEFAULT_VOICE_KEYSTROKE };
