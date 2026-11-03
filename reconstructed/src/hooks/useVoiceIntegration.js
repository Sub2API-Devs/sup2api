/**
 * hooks/useVoiceIntegration.tsx
 *
 * 语音与输入框的集成：按住说话键位、录音状态切换、把转写文本插入光标处（输入分歧时放弃）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoiceIntegration.tsx
 * pieces: chunk-tzghj6zv.js (19), chunk-v6kts6xw.js (1), chunk-yj65zw1g.js (1)
 * attribution: placement 5, layout 12, fingerprint 4
 */
import { init_react_production, Q, P, R, ce, zt, yt } from "../../vendor/react/cjs/react.production.js";
import { useSessionOrUndefined } from "../context/session.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { loginEventCounter } from "../services/oauth/loginEvents.js";
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { useVoiceEnabled } from "./useVoiceEnabled.js";
import { hasAnthropicOAuthToken, isVoiceModeAllowed } from "../voice/voiceModeEnabled.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logEvent } from "../services/analytics/index.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { keybindingsState, getKeybindings } from "../keybindings/loadUserBindings.js";
import { useNotifications } from "../context/notifications.js";
import { useGetVoiceState } from "../context/voice.js";
import { replaceIdeographicSpace } from "../utils/stringUtils.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { countWords } from "../utils/intl.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useThirdOverlayKeys } from "../context/overlayContext.js";
import { useClock } from "../ink/components/ClockContext.js";
import { keystrokesEqual } from "../keybindings/resolver.js";
import { keystrokeToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useVoiceStateStore } from "../_unattributed/chunk-yj65zw1g/part-001.js";

//@ chunk-tzghj6zv.js:11964-11968 placement
init_react_production();
//@ chunk-tzghj6zv.js:11968-12042 placement
/**
 * 函数 useVoiceLoginCompleted（语音登录完成计数）；位于「语音与输入框的集成：按住说话键位、录音状态切换、把转写文本插入光标处（输入分歧时放弃）」模块。
 */
function useVoiceLoginCompleted() {
  let sessionOrUndefined = useSessionOrUndefined();
  return (
    useStoreSelector(
      sessionOrUndefined && loginEventCounter.of(sessionOrUndefined),
      (h) => h.loginCompleted,
    ) ?? 0
  );
}
//@ chunk-tzghj6zv.js:12042-12324 placement
/**
 * 判断语音输入是否可用（设置开启、已认证且允许语音模式），首次计算时记录初始化事件。
 */
function useVoiceAvailable() {
  let d = useAppState((C) => useVoiceEnabled(C.settings));
  let voiceLoginCompleted = useVoiceLoginCompleted();
  let x = Q(() => d && hasAnthropicOAuthToken(), [voiceLoginCompleted, d]);
  P(() => {
    if (!claimOnce().claim("voice_init_gate")) return;
    logEvent("tengu_voice_init_gate", {
      user_intent_store: d,
      user_intent_disk: useVoiceEnabled(getInitialSettings_2()),
      has_voice_auth: hasAnthropicOAuthToken(),
      voice_mode_allowed: isVoiceModeAllowed(),
      auth_version: voiceLoginCompleted,
    });
  }, []);
  return x && isVoiceModeAllowed();
}
//@ chunk-tzghj6zv.js:12324-12328 placement
init_react_production();
//@ chunk-tzghj6zv.js:12328-12365 layout
function selectVoiceState(rs) {
  return rs.voiceState;
}
//@ chunk-tzghj6zv.js:12365-12420 layout
function selectVoiceModeSetting(ns) {
  return ns.settings.voice?.mode ?? "hold";
}
//@ chunk-tzghj6zv.js:12420-12501 layout
function clearVoiceWarmingUp(Qr) {
  if (!Qr.voiceWarmingUp) {
    return Qr;
  }
  return {
    ...Qr,
    voiceWarmingUp: false,
  };
}
//@ chunk-tzghj6zv.js:12501-12610 layout
function clearVoiceDoubleTap(qr) {
  if (!qr.awaitingVoiceSubmitDoubleTap) {
    return qr;
  }
  return {
    ...qr,
    awaitingVoiceSubmitDoubleTap: false,
  };
}
//@ chunk-tzghj6zv.js:12610-12691 layout
function clearVoiceWarmingUp_2(Xr) {
  if (!Xr.voiceWarmingUp) {
    return Xr;
  }
  return {
    ...Xr,
    voiceWarmingUp: false,
  };
}
//@ chunk-tzghj6zv.js:12691-12800 layout
function clearVoiceDoubleTap_2(Jr) {
  if (!Jr.awaitingVoiceSubmitDoubleTap) {
    return Jr;
  }
  return {
    ...Jr,
    awaitingVoiceSubmitDoubleTap: false,
  };
}
//@ chunk-tzghj6zv.js:12800-12909 layout
function clearVoiceDoubleTap_3(Zr) {
  if (!Zr.awaitingVoiceSubmitDoubleTap) {
    return Zr;
  }
  return {
    ...Zr,
    awaitingVoiceSubmitDoubleTap: false,
  };
}
//@ chunk-tzghj6zv.js:12909-12990 layout
function clearVoiceWarmingUp_3(en) {
  if (!en.voiceWarmingUp) {
    return en;
  }
  return {
    ...en,
    voiceWarmingUp: false,
  };
}
//@ chunk-tzghj6zv.js:12990-13070 layout
function markVoiceWarmingUp(tn) {
  if (tn.voiceWarmingUp) {
    return tn;
  }
  return {
    ...tn,
    voiceWarmingUp: true,
  };
}
//@ chunk-tzghj6zv.js:13070-13140 layout
var voiceControllerModule = require("./chunk-a658aeqp.js");
var VOICE_PARTIAL_FLUSH_MS = 120;
var VOICE_IDLE_TIMEOUT_MS = 2000;
var VOICE_MAX_RETRIES = 5;
var VOICE_MIN_CHARS = 2;
var VOICE_DEBOUNCE_MS = 300;
//@ chunk-tzghj6zv.js:13140-13361 fingerprint = matchesKeyboardEvent (0.906)
function matchesKeyboardEvent(e, target) {
  if ((e.key === "return" ? "enter" : e.key.toLowerCase()) !== target.key) return false;
  if (e.ctrl !== target.ctrl) return false;
  if (e.shift !== target.shift) return false;
  if (e.meta !== (target.alt || target.meta)) return false;
  if (e.superKey !== target.super) return false;
  return true;
}
//@ chunk-tzghj6zv.js:13361-13407 layout
function subscribeVoiceChanged(d) {
  return keybindingsState.changed.subscribe(d);
}
//@ chunk-tzghj6zv.js:13407-13436 layout
function voiceSnapshot() {
  return getKeybindings(keybindingsState);
}
//@ chunk-tzghj6zv.js:13436-16010 fingerprint = useVoiceIntegration (0.686)
/**
 * 语音集成：录音状态变化时在光标处插入/替换临时转写文本（interimRange），最终转写落地；输入在录音期间被改动则放弃插入（input_diverged）。
 */
function useVoiceIntegration({ composer, isActive = true }) {
  let { addNotification } = useNotifications();
  let C = voiceSetState();
  let getVoiceState = useGetVoiceState();
  let voicePrefixRef = R(null);
  let voiceSuffixRef = R("");
  let lastSetInputRef = R(null);
  let stripTrailing = ce(
    (maxStrip, { char = " ", anchor = false, floor = 0 } = {}) => {
      let { value: te, cursorOffset } = composer;
      let beforeCursor = te.slice(0, cursorOffset);
      let afterCursor = te.slice(cursorOffset);
      let scan = char === " " ? replaceIdeographicSpace(beforeCursor) : beforeCursor;
      let trailing = 0;
      while (trailing < scan.length && scan[scan.length - 1 - trailing] === char) trailing++;
      let stripCount = Math.max(0, Math.min(trailing - floor, maxStrip));
      let remaining = trailing - stripCount;
      let stripped = beforeCursor.slice(0, beforeCursor.length - stripCount);
      let gap = "";
      if (anchor) {
        voicePrefixRef.current = stripped;
        voiceSuffixRef.current = afterCursor;
        if (afterCursor.length > 0 && !/^\s/.test(afterCursor)) gap = " ";
      }
      let newValue = stripped + gap + afterCursor;
      if (anchor) lastSetInputRef.current = newValue;
      if (newValue === te && stripCount === 0) return remaining;
      composer.setValueWithCursor(newValue, stripped.length);
      return remaining;
    },
    [composer],
  );
  let resetAnchor = ce(() => {
    let prefix = voicePrefixRef.current;
    if (prefix === null) return;
    let suffix = voiceSuffixRef.current;
    voicePrefixRef.current = null;
    voiceSuffixRef.current = "";
    if (composer.value !== lastSetInputRef.current) return;
    composer.setValueWithCursor(prefix + suffix, prefix.length);
  }, [composer]);
  let voiceEnabled = useVoiceAvailable();
  let B = useAppState((L) => L.settings.voice?.autoSubmit === true);
  let pe = useAppState((L) => L.settings.voice?.mode ?? "hold");
  let oe = useAppState_2((L) => L.voiceState);
  let voiceInterimTranscript = useAppState_2((s_0) => s_0.voiceInterimTranscript);
  P(() => {
    if (isActive && getVoiceState().voiceState === "recording" && voicePrefixRef.current === null) {
      let { value: input, cursorOffset: offset } = composer;
      voicePrefixRef.current = input.slice(0, offset);
      voiceSuffixRef.current = input.slice(offset);
      lastSetInputRef.current = input;
    }
    if (oe === "idle") {
      voicePrefixRef.current = null;
      voiceSuffixRef.current = "";
      lastSetInputRef.current = null;
    }
  }, [oe, getVoiceState, composer, isActive]);
  P(() => {
    if (voicePrefixRef.current === null) return;
    let prefix = voicePrefixRef.current;
    let suffix = voiceSuffixRef.current;
    if (composer.value !== lastSetInputRef.current) return;
    let needsSpace = prefix.length > 0 && !/\s$/.test(prefix) && voiceInterimTranscript.length > 0;
    let needsTrailingSpace = suffix.length > 0 && !/^\s/.test(suffix);
    let leadingSpace = needsSpace ? " " : "";
    let trailingSpace = needsTrailingSpace ? " " : "";
    let newValue = prefix + leadingSpace + voiceInterimTranscript + trailingSpace + suffix;
    let cursorPos = prefix.length + leadingSpace.length + voiceInterimTranscript.length;
    composer.setValueWithCursor(newValue, cursorPos);
    lastSetInputRef.current = newValue;
  }, [voiceInterimTranscript, composer]);
  let handleVoiceTranscript = ce(
    (text) => {
      let prefix = voicePrefixRef.current;
      if (prefix === null) {
        logFeatureBad("voice_transcript_insert", "no_anchor");
        return;
      }
      let suffix = voiceSuffixRef.current;
      if (composer.value !== lastSetInputRef.current) {
        logFeatureSad("voice_transcript_insert", "input_diverged");
        return;
      }
      let needsSpace = prefix.length > 0 && !/\s$/.test(prefix) && text.length > 0;
      let needsTrailingSpace = suffix.length > 0 && !/^\s/.test(suffix) && text.length > 0;
      let leadingSpace = needsSpace ? " " : "";
      let trailingSpace = needsTrailingSpace ? " " : "";
      let newInput = prefix + leadingSpace + text + trailingSpace + suffix;
      let cursorPos = prefix.length + leadingSpace.length + text.length;
      composer.setValueWithCursor(newInput, cursorPos);
      lastSetInputRef.current = newInput;
      logFeatureOk("voice_transcript_insert");
      voicePrefixRef.current = prefix + leadingSpace + text;
      let H = pe === "tap" || B;
      let D = composer.submit !== undefined && H && countWords(text) >= 3 && composer.submit(newInput, true);
      C((J) => {
        let K = composer.submit !== undefined && pe !== "tap" && !D;
        if (J.awaitingVoiceSubmitDoubleTap === K) return J;
        return {
          ...J,
          awaitingVoiceSubmitDoubleTap: K,
        };
      });
    },
    [composer, C, B, pe],
  );
  let voice = voiceControllerModule.useVoice({
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
    enabled: voiceEnabled,
    focusMode: false,
    mode: pe,
  });
  let interimRange = Q(() => {
    if (voicePrefixRef.current === null) return null;
    if (voiceInterimTranscript.length === 0) return null;
    let prefix = voicePrefixRef.current;
    let needsSpace = prefix.length > 0 && !/\s$/.test(prefix) && voiceInterimTranscript.length > 0;
    let start = prefix.length + (needsSpace ? 1 : 0);
    let end = start + voiceInterimTranscript.length;
    return {
      start,
      end,
    };
  }, [voiceInterimTranscript]);
  zt(() => {
    composer.setInterimRange?.(interimRange);
  }, [composer, interimRange]);
  return {
    stripTrailing,
    resetAnchor,
    handleKeyEvent: voice.handleKeyEvent,
    cancelRecording: voice.cancelRecording,
    interimRange,
  };
}
//@ chunk-tzghj6zv.js:16010-20376 fingerprint = useVoiceKeybindingHandler (0.721)
/**
 * 语音快捷键：voice:pushToTalk 按住开始/松开结束，Esc 取消，处理 hold 与 toggle 两种模式。
 */
function useVoiceKeybindingHandler(props) {
  let $ = w(32);
  let {
    voiceHandleKeyEvent,
    voiceCancelRecording,
    stripTrailing,
    resetAnchor,
    isActive,
    composerTakesTypedKeys,
    composer,
  } = props;
  let V = composerTakesTypedKeys === undefined ? true : composerTakesTypedKeys;
  let getVoiceState = useGetVoiceState();
  let setVoiceState = voiceSetState();
  let keybindingContext = useKeybindingContext();
  let isModalOverlayActive = useThirdOverlayKeys();
  let voiceAvailable = useVoiceAvailable();
  let appState = useAppState_2(selectVoiceState);
  let appState_2 = useAppState(selectVoiceModeSetting);
  let clock = useClock();
  let Te = yt(subscribeVoiceChanged, voiceSnapshot);
  let L = keybindingContext ? keybindingContext.bindings : Te;
  let ee;
  ye: {
    if (!voiceAvailable) {
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
      $[0] = L;
      $[1] = result;
    } else result = $[1];
    ee = result;
  }
  let target = ee;
  let re;
  if ($[2] !== target) {
    re = target ? keystrokeToDisplayString(target, getShortcutDisplayPlatform()) : null;
    $[2] = target;
    $[3] = re;
  } else re = $[3];
  let voiceKeyDisplay = re;
  let key =
    target !== null &&
    target.key.length === 1 &&
    !target.ctrl &&
    !target.alt &&
    !target.shift &&
    !target.meta &&
    !target.super
      ? target.key
      : null;
  let rapidCountRef = R(0);
  let charsInInputRef = R(0);
  let recordingFloorRef = R(0);
  let isHoldActiveRef = R(false);
  let resetTimerRef = R(null);
  let Ce = R(0);
  let de = R(null);
  let _e;
  let Pe;
  if ($[4] !== setVoiceState || $[5] !== appState) {
    _e = () => {
      if (appState !== "recording") {
        isHoldActiveRef.current = false;
        recordingFloorRef.current = 0;
        setVoiceState(clearVoiceWarmingUp);
      } else {
        Ce.current = 0;
        if (de.current) {
          de.current();
          de.current = null;
        }
        setVoiceState(clearVoiceDoubleTap);
      }
    };
    Pe = [appState, setVoiceState];
    $[4] = setVoiceState;
    $[5] = appState;
    $[6] = _e;
    $[7] = Pe;
  } else {
    _e = $[6];
    Pe = $[7];
  }
  P(_e, Pe);
  let Ge;
  let _;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    Ge = () => () => {
      if (de.current) {
        de.current();
        de.current = null;
      }
    };
    _ = [];
    $[8] = Ge;
    $[9] = _;
  } else {
    Ge = $[8];
    _ = $[9];
  }
  P(Ge, _);
  let ge;
  if ($[10] !== setVoiceState) {
    ge = function ke() {
      if (rapidCountRef.current === 0) {
        return;
      }
      if (resetTimerRef.current) {
        resetTimerRef.current();
        resetTimerRef.current = null;
      }
      rapidCountRef.current = 0;
      charsInInputRef.current = 0;
      setVoiceState(clearVoiceWarmingUp_2);
    };
    $[10] = setVoiceState;
    $[11] = ge;
  } else ge = $[11];
  let ke = ge;
  let q;
  if (
    $[12] !== key ||
    $[13] !== clock ||
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
    $[24] !== voiceAvailable ||
    $[25] !== voiceHandleKeyEvent ||
    $[26] !== target ||
    $[27] !== appState_2
  ) {
    q = (prev) => {
      if (!voiceAvailable) {
        return;
      }
      if (!isActive || isModalOverlayActive) {
        return;
      }
      if (
        (prev.key === "escape" || (prev.key === "c" && prev.ctrl && !prev.shift && !prev.meta)) &&
        getVoiceState().voiceState !== "idle"
      ) {
        prev.stopImmediatePropagation();
        voiceCancelRecording();
        resetAnchor();
        return;
      }
      if (key !== null && !V) {
        return;
      }
      if (
        appState_2 !== "tap" &&
        composer.submit !== undefined &&
        getVoiceState().awaitingVoiceSubmitDoubleTap
      ) {
        let submit = composer.submit;
        let Ee = () => {
          Ce.current = 0;
          if (de.current) {
            de.current();
            de.current = null;
          }
        };
        let qe = () => {
          Ee();
          setVoiceState(clearVoiceDoubleTap_2);
        };
        let ut =
          key !== null &&
          !prev.ctrl &&
          !prev.meta &&
          !prev.shift &&
          (key === " " ? replaceIdeographicSpace(prev.key) : prev.key)[0] === key;
        let He = composer.cursorOffset === composer.value.length;
        if (!ut || !He) qe();
        else if (de.current !== null) qe();
        else if (getVoiceState().voiceState === "idle") {
          let now = Date.now();
          let Ne = Ce.current;
          if (Ne !== 0 && now - Ne <= VOICE_DEBOUNCE_MS) {
            prev.stopImmediatePropagation();
            Ce.current = 0;
            de.current = clock.setTimeout(() => {
              de.current = null;
              let voiceState = getVoiceState();
              if (voiceState.voiceState !== "idle" || !voiceState.awaitingVoiceSubmitDoubleTap) {
                return;
              }
              let Ue = composer.value;
              let Fe = Ue.endsWith(key) || (key === " " && Ue.endsWith("\u3000")) ? Ue.slice(0, -1) : Ue;
              if (!submit(Fe, true)) {
                return;
              }
              setVoiceState(clearVoiceDoubleTap_3);
            }, VOICE_PARTIAL_FLUSH_MS);
            return;
          }
          if (Ne !== 0) qe();
          else Ce.current = now;
        }
      }
      if (target === null) {
        return;
      }
      let Ve;
      if (key !== null) {
        let et = key === " " ? replaceIdeographicSpace(prev.key) : prev.key;
        Ve =
          !prev.ctrl &&
          !prev.meta &&
          !prev.shift &&
          et[0] === key &&
          (et.length === 1 || et === key.repeat(et.length))
            ? et.length
            : null;
      } else Ve = matchesKeyboardEvent(prev, target) ? 1 : null;
      if (Ve === null) {
        ke();
        return;
      }
      if (appState_2 === "tap") {
        let currentVoiceState = getVoiceState().voiceState;
        if (currentVoiceState === "processing") {
          if (key === null) prev.stopImmediatePropagation();
          return;
        }
        let mt = currentVoiceState === "idle";
        if (mt && composer.value.length > 0) {
          return;
        }
        prev.stopImmediatePropagation();
        let zr = rapidCountRef.current === 0;
        rapidCountRef.current = rapidCountRef.current + Ve;
        if (resetTimerRef.current) resetTimerRef.current();
        resetTimerRef.current = clock.setTimeout(() => {
          resetTimerRef.current = null;
          ke();
        }, VOICE_PARTIAL_FLUSH_MS);
        if (!zr) {
          if (key !== null)
            stripTrailing(Ve, {
              char: key,
              floor: 0,
            });
          return;
        }
        if (mt) {
          if (key !== null)
            stripTrailing(Ve, {
              char: key,
              anchor: true,
            });
          else
            stripTrailing(0, {
              anchor: true,
            });
        } else if (key !== null)
          stripTrailing(Ve, {
            char: key,
            floor: 0,
          });
        voiceHandleKeyEvent();
        if (mt && getVoiceState().voiceState === "idle") resetAnchor();
        return;
      }
      let voiceState = getVoiceState().voiceState;
      if (isHoldActiveRef.current && voiceState !== "idle") {
        prev.stopImmediatePropagation();
        if (key !== null)
          stripTrailing(Ve, {
            char: key,
            floor: recordingFloorRef.current,
          });
        voiceHandleKeyEvent();
        return;
      }
      if (voiceState === "recording") {
        if (key === null) prev.stopImmediatePropagation();
        return;
      }
      if (voiceState === "processing" && key === null) {
        prev.stopImmediatePropagation();
        return;
      }
      let countBefore = rapidCountRef.current;
      rapidCountRef.current = rapidCountRef.current + Ve;
      if (key === null || (voiceState === "idle" && rapidCountRef.current >= VOICE_MAX_RETRIES)) {
        prev.stopImmediatePropagation();
        if (resetTimerRef.current) {
          resetTimerRef.current();
          resetTimerRef.current = null;
        }
        rapidCountRef.current = 0;
        isHoldActiveRef.current = true;
        setVoiceState(clearVoiceWarmingUp_3);
        if (key !== null) {
          recordingFloorRef.current = stripTrailing(charsInInputRef.current + Ve, {
            char: key,
            anchor: true,
          });
          charsInInputRef.current = 0;
          voiceHandleKeyEvent();
        } else {
          stripTrailing(0, {
            anchor: true,
          });
          voiceHandleKeyEvent(VOICE_IDLE_TIMEOUT_MS);
        }
        if (getVoiceState().voiceState === "idle") {
          isHoldActiveRef.current = false;
          resetAnchor();
        }
        return;
      }
      if (countBefore >= VOICE_MIN_CHARS) {
        prev.stopImmediatePropagation();
        stripTrailing(Ve, {
          char: key,
          floor: charsInInputRef.current,
        });
      } else charsInInputRef.current = charsInInputRef.current + Ve;
      if (voiceState === "idle" && rapidCountRef.current >= VOICE_MIN_CHARS)
        setVoiceState(markVoiceWarmingUp);
      if (resetTimerRef.current) resetTimerRef.current();
      resetTimerRef.current = clock.setTimeout(() => {
        resetTimerRef.current = null;
        ke();
      }, VOICE_PARTIAL_FLUSH_MS);
    };
    $[12] = key;
    $[13] = clock;
    $[14] = composer;
    $[15] = V;
    $[16] = getVoiceState;
    $[17] = isActive;
    $[18] = isModalOverlayActive;
    $[19] = resetAnchor;
    $[20] = ke;
    $[21] = setVoiceState;
    $[22] = stripTrailing;
    $[23] = voiceCancelRecording;
    $[24] = voiceAvailable;
    $[25] = voiceHandleKeyEvent;
    $[26] = target;
    $[27] = appState_2;
    $[28] = q;
  } else q = $[28];
  let handleKeyDown = q;
  let po;
  if ($[29] !== handleKeyDown || $[30] !== voiceKeyDisplay) {
    po = {
      handleKeyDown,
      voiceKeyDisplay,
    };
    $[29] = handleKeyDown;
    $[30] = voiceKeyDisplay;
    $[31] = po;
  } else po = $[31];
  return po;
}
//@ chunk-v6kts6xw.js:2603-2710 fingerprint = DEFAULT_VOICE_KEYSTROKE (1)
function DEFAULT_VOICE_KEYSTROKE(t) {
  return (
    t.shift && !t.ctrl && !t.alt && !t.meta && !t.super && t.key.length === 1 && t.key >= "a" && t.key <= "z"
  );
}
//@ chunk-yj65zw1g.js:1203-1240 placement
/**
 * 函数 voiceSetState（取语音 store 的 setState）；位于「new in 2.1.316 (2.1.88 has no file at this path)」模块。
 */
function voiceSetState() {
  return useVoiceStateStore().setState;
}
export {
  useVoiceAvailable,
  useVoiceLoginCompleted,
  useVoiceIntegration,
  useVoiceKeybindingHandler,
  DEFAULT_VOICE_KEYSTROKE,
};
