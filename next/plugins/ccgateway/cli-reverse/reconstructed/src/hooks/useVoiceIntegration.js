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
import { useVoiceStateStore, useGetVoiceState } from "../context/voice.js";
import {
  init_react_production,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
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
import { replaceIdeographicSpace } from "../utils/stringUtils.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { countWords } from "../utils/intl.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useThirdOverlayKeys } from "../context/overlayContext.js";
import { useClock } from "../ink/components/ClockContext.js";
import { keystrokesEqual } from "../keybindings/resolver.js";
import { keystrokeToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-yj65zw1g.js:1203-1240 placement
/**
 * 函数 voiceSetState（取语音 store 的 setState）；位于「new in 2.1.316 (2.1.88 has no file at this path)」模块。
 */
function voiceSetState() {
  return useVoiceStateStore().setState;
}
//@ chunk-v6kts6xw.js:2603-2710 fingerprint = DEFAULT_VOICE_KEYSTROKE (1)
function DEFAULT_VOICE_KEYSTROKE(event) {
  return (
    event.shift &&
    !event.ctrl &&
    !event.alt &&
    !event.meta &&
    !event.super &&
    event.key.length === 1 &&
    event.key >= "a" &&
    event.key <= "z"
  );
}
//@ chunk-tzghj6zv.js:11964-11968 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:11964", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:11968-12042 placement
/**
 * 函数 useVoiceLoginCompleted（语音登录完成计数）；位于「语音与输入框的集成：按住说话键位、录音状态切换、把转写文本插入光标处（输入分歧时放弃）」模块。
 */
function useVoiceLoginCompleted() {
  let sessionOrUndefined = useSessionOrUndefined();
  return (
    useStoreSelector(
      sessionOrUndefined && loginEventCounter.of(sessionOrUndefined),
      (loginState) => loginState.loginCompleted,
    ) ?? 0
  );
}
//@ chunk-tzghj6zv.js:12042-12324 placement
/**
 * 判断语音输入是否可用（设置开启、已认证且允许语音模式），首次计算时记录初始化事件。
 */
function useVoiceAvailable() {
  let userIntent = useAppState((state) => useVoiceEnabled(state.settings));
  let voiceLoginCompleted = useVoiceLoginCompleted();
  let hasAuth = useMemo(() => userIntent && hasAnthropicOAuthToken(), [voiceLoginCompleted, userIntent]);
  useEffect(() => {
    if (!claimOnce().claim("voice_init_gate")) return;
    logEvent("tengu_voice_init_gate", {
      user_intent_store: userIntent,
      user_intent_disk: useVoiceEnabled(getInitialSettings_2()),
      has_voice_auth: hasAnthropicOAuthToken(),
      voice_mode_allowed: isVoiceModeAllowed(),
      auth_version: voiceLoginCompleted,
    });
  }, []);
  return hasAuth && isVoiceModeAllowed();
}
//@ chunk-tzghj6zv.js:12324-12328 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:12324", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:12328-12365 layout
function selectVoiceState(state) {
  return state.voiceState;
}
//@ chunk-tzghj6zv.js:12365-12420 layout
function selectVoiceModeSetting(state) {
  return state.settings.voice?.mode ?? "hold";
}
//@ chunk-tzghj6zv.js:12420-12501 layout
function clearVoiceWarmingUp(state) {
  if (!state.voiceWarmingUp) {
    return state;
  }
  return {
    ...state,
    voiceWarmingUp: false,
  };
}
//@ chunk-tzghj6zv.js:12501-12610 layout
function clearVoiceDoubleTap(state) {
  if (!state.awaitingVoiceSubmitDoubleTap) {
    return state;
  }
  return {
    ...state,
    awaitingVoiceSubmitDoubleTap: false,
  };
}
//@ chunk-tzghj6zv.js:12610-12691 layout
function clearVoiceWarmingUp_2(state) {
  if (!state.voiceWarmingUp) {
    return state;
  }
  return {
    ...state,
    voiceWarmingUp: false,
  };
}
//@ chunk-tzghj6zv.js:12691-12800 layout
function clearVoiceDoubleTap_2(state) {
  if (!state.awaitingVoiceSubmitDoubleTap) {
    return state;
  }
  return {
    ...state,
    awaitingVoiceSubmitDoubleTap: false,
  };
}
//@ chunk-tzghj6zv.js:12800-12909 layout
function clearVoiceDoubleTap_3(state) {
  if (!state.awaitingVoiceSubmitDoubleTap) {
    return state;
  }
  return {
    ...state,
    awaitingVoiceSubmitDoubleTap: false,
  };
}
//@ chunk-tzghj6zv.js:12909-12990 layout
function clearVoiceWarmingUp_3(state) {
  if (!state.voiceWarmingUp) {
    return state;
  }
  return {
    ...state,
    voiceWarmingUp: false,
  };
}
//@ chunk-tzghj6zv.js:12990-13070 layout
function markVoiceWarmingUp(state) {
  if (state.voiceWarmingUp) {
    return state;
  }
  return {
    ...state,
    voiceWarmingUp: true,
  };
}
//@ chunk-tzghj6zv.js:13070-13140 layout
var voiceControllerModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var VOICE_PARTIAL_FLUSH_MS;
var VOICE_IDLE_TIMEOUT_MS;
var VOICE_MAX_RETRIES;
var VOICE_MIN_CHARS;
var VOICE_DEBOUNCE_MS;
deferInit("chunk-tzghj6zv.js:13070", () => {
  voiceControllerModule = require("./useVoice.lazy.js");
  VOICE_PARTIAL_FLUSH_MS = 120;
  VOICE_IDLE_TIMEOUT_MS = 2000;
  VOICE_MAX_RETRIES = 5;
  VOICE_MIN_CHARS = 2;
  VOICE_DEBOUNCE_MS = 300;
});
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
function subscribeVoiceChanged(listener) {
  return keybindingsState.changed.subscribe(listener);
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
  let setVoiceState = voiceSetState();
  let getVoiceState = useGetVoiceState();
  let voicePrefixRef = useRef(null);
  let voiceSuffixRef = useRef("");
  let lastSetInputRef = useRef(null);
  let stripTrailing = useCallback(
    (maxStrip, { char = " ", anchor = false, floor = 0 } = {}) => {
      let { value, cursorOffset } = composer;
      let beforeCursor = value.slice(0, cursorOffset);
      let afterCursor = value.slice(cursorOffset);
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
      if (newValue === value && stripCount === 0) return remaining;
      composer.setValueWithCursor(newValue, stripped.length);
      return remaining;
    },
    [composer],
  );
  let resetAnchor = useCallback(() => {
    let prefix = voicePrefixRef.current;
    if (prefix === null) return;
    let suffix = voiceSuffixRef.current;
    voicePrefixRef.current = null;
    voiceSuffixRef.current = "";
    if (composer.value !== lastSetInputRef.current) return;
    composer.setValueWithCursor(prefix + suffix, prefix.length);
  }, [composer]);
  let voiceEnabled = useVoiceAvailable();
  let autoSubmit = useAppState((state) => state.settings.voice?.autoSubmit === true);
  let voiceMode = useAppState((state) => state.settings.voice?.mode ?? "hold");
  let voiceState = useAppState_2((state) => state.voiceState);
  let voiceInterimTranscript = useAppState_2((s_0) => s_0.voiceInterimTranscript);
  useEffect(() => {
    if (isActive && getVoiceState().voiceState === "recording" && voicePrefixRef.current === null) {
      let { value: input, cursorOffset: offset } = composer;
      voicePrefixRef.current = input.slice(0, offset);
      voiceSuffixRef.current = input.slice(offset);
      lastSetInputRef.current = input;
    }
    if (voiceState === "idle") {
      voicePrefixRef.current = null;
      voiceSuffixRef.current = "";
      lastSetInputRef.current = null;
    }
  }, [voiceState, getVoiceState, composer, isActive]);
  useEffect(() => {
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
  let handleVoiceTranscript = useCallback(
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
      let shouldAutoSubmit = voiceMode === "tap" || autoSubmit;
      let submitted =
        composer.submit !== undefined &&
        shouldAutoSubmit &&
        countWords(text) >= 3 &&
        composer.submit(newInput, true);
      setVoiceState((previous) => {
        let awaitingDoubleTap = composer.submit !== undefined && voiceMode !== "tap" && !submitted;
        if (previous.awaitingVoiceSubmitDoubleTap === awaitingDoubleTap) return previous;
        return {
          ...previous,
          awaitingVoiceSubmitDoubleTap: awaitingDoubleTap,
        };
      });
    },
    [composer, setVoiceState, autoSubmit, voiceMode],
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
    mode: voiceMode,
  });
  let interimRange = useMemo(() => {
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
  useLayoutEffect(() => {
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
  let $ = useMemoCache(32);
  let {
    voiceHandleKeyEvent,
    voiceCancelRecording,
    stripTrailing,
    resetAnchor,
    isActive,
    composerTakesTypedKeys,
    composer,
  } = props;
  let composerTakesTypedKeysDefault = composerTakesTypedKeys === undefined ? true : composerTakesTypedKeys;
  let getVoiceState = useGetVoiceState();
  let setVoiceState = voiceSetState();
  let keybindingContext = useKeybindingContext();
  let isModalOverlayActive = useThirdOverlayKeys();
  let voiceAvailable = useVoiceAvailable();
  let appState = useAppState_2(selectVoiceState);
  let appState_2 = useAppState(selectVoiceModeSetting);
  let clock = useClock();
  let bindings = useSyncExternalStore(subscribeVoiceChanged, voiceSnapshot);
  let bindings_2 = keybindingContext ? keybindingContext.bindings : bindings;
  let pushToTalkBinding;
  ye: {
    if (!voiceAvailable) {
      pushToTalkBinding = null;
      break ye;
    }
    let result = null;
    if ($[0] !== bindings_2) {
      for (const binding of bindings_2) {
        if (binding.context !== "Chat") {
          continue;
        }
        if (binding.chord.length !== 1) {
          continue;
        }
        let ks = binding.chord[0];
        if (!ks) {
          continue;
        }
        if (binding.action === "voice:pushToTalk") result = ks;
        else if (result !== null && keystrokesEqual(ks, result)) result = null;
      }
      $[0] = bindings_2;
      $[1] = result;
    } else result = $[1];
    pushToTalkBinding = result;
  }
  let target = pushToTalkBinding;
  let displayLabel;
  if ($[2] !== target) {
    displayLabel = target ? keystrokeToDisplayString(target, getShortcutDisplayPlatform()) : null;
    $[2] = target;
    $[3] = displayLabel;
  } else displayLabel = $[3];
  let voiceKeyDisplay = displayLabel;
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
  let rapidCountRef = useRef(0);
  let charsInInputRef = useRef(0);
  let recordingFloorRef = useRef(0);
  let isHoldActiveRef = useRef(false);
  let resetTimerRef = useRef(null);
  let lastKeyAtRef = useRef(0);
  let flushTimerRef = useRef(null);
  let resetOnStateChange;
  let resetDeps;
  if ($[4] !== setVoiceState || $[5] !== appState) {
    resetOnStateChange = () => {
      if (appState !== "recording") {
        isHoldActiveRef.current = false;
        recordingFloorRef.current = 0;
        setVoiceState(clearVoiceWarmingUp);
      } else {
        lastKeyAtRef.current = 0;
        if (flushTimerRef.current) {
          flushTimerRef.current();
          flushTimerRef.current = null;
        }
        setVoiceState(clearVoiceDoubleTap);
      }
    };
    resetDeps = [appState, setVoiceState];
    $[4] = setVoiceState;
    $[5] = appState;
    $[6] = resetOnStateChange;
    $[7] = resetDeps;
  } else {
    resetOnStateChange = $[6];
    resetDeps = $[7];
  }
  useEffect(resetOnStateChange, resetDeps);
  let cleanupEffect;
  let cleanupDeps;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    cleanupEffect = () => () => {
      if (flushTimerRef.current) {
        flushTimerRef.current();
        flushTimerRef.current = null;
      }
    };
    cleanupDeps = [];
    $[8] = cleanupEffect;
    $[9] = cleanupDeps;
  } else {
    cleanupEffect = $[8];
    cleanupDeps = $[9];
  }
  useEffect(cleanupEffect, cleanupDeps);
  let resetRapidTyping;
  if ($[10] !== setVoiceState) {
    resetRapidTyping = function resetRapidTypingImpl() {
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
    $[11] = resetRapidTyping;
  } else resetRapidTyping = $[11];
  let flushRapidTyping = resetRapidTyping;
  let handleKeyDown;
  if (
    $[12] !== key ||
    $[13] !== clock ||
    $[14] !== composer ||
    $[15] !== composerTakesTypedKeysDefault ||
    $[16] !== getVoiceState ||
    $[17] !== isActive ||
    $[18] !== isModalOverlayActive ||
    $[19] !== resetAnchor ||
    $[20] !== flushRapidTyping ||
    $[21] !== setVoiceState ||
    $[22] !== stripTrailing ||
    $[23] !== voiceCancelRecording ||
    $[24] !== voiceAvailable ||
    $[25] !== voiceHandleKeyEvent ||
    $[26] !== target ||
    $[27] !== appState_2
  ) {
    handleKeyDown = (prev) => {
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
      if (key !== null && !composerTakesTypedKeysDefault) {
        return;
      }
      if (
        appState_2 !== "tap" &&
        composer.submit !== undefined &&
        getVoiceState().awaitingVoiceSubmitDoubleTap
      ) {
        let submit = composer.submit;
        let clearHold = () => {
          lastKeyAtRef.current = 0;
          if (flushTimerRef.current) {
            flushTimerRef.current();
            flushTimerRef.current = null;
          }
        };
        let abandonDoubleTap = () => {
          clearHold();
          setVoiceState(clearVoiceDoubleTap_2);
        };
        let typedVoiceKey =
          key !== null &&
          !prev.ctrl &&
          !prev.meta &&
          !prev.shift &&
          (key === " " ? replaceIdeographicSpace(prev.key) : prev.key)[0] === key;
        let isAtEnd = composer.cursorOffset === composer.value.length;
        if (!typedVoiceKey || !isAtEnd) abandonDoubleTap();
        else if (flushTimerRef.current !== null) abandonDoubleTap();
        else if (getVoiceState().voiceState === "idle") {
          let now = Date.now();
          let lastAt = lastKeyAtRef.current;
          if (lastAt !== 0 && now - lastAt <= VOICE_DEBOUNCE_MS) {
            prev.stopImmediatePropagation();
            lastKeyAtRef.current = 0;
            flushTimerRef.current = clock.setTimeout(() => {
              flushTimerRef.current = null;
              let voiceState = getVoiceState();
              if (voiceState.voiceState !== "idle" || !voiceState.awaitingVoiceSubmitDoubleTap) {
                return;
              }
              let value = composer.value;
              let withoutVoiceKey =
                value.endsWith(key) || (key === " " && value.endsWith("\u3000")) ? value.slice(0, -1) : value;
              if (!submit(withoutVoiceKey, true)) {
                return;
              }
              setVoiceState(clearVoiceDoubleTap_3);
            }, VOICE_PARTIAL_FLUSH_MS);
            return;
          }
          if (lastAt !== 0) abandonDoubleTap();
          else lastKeyAtRef.current = now;
        }
      }
      if (target === null) {
        return;
      }
      let matchedChars;
      if (key !== null) {
        let typedKey = key === " " ? replaceIdeographicSpace(prev.key) : prev.key;
        matchedChars =
          !prev.ctrl &&
          !prev.meta &&
          !prev.shift &&
          typedKey[0] === key &&
          (typedKey.length === 1 || typedKey === key.repeat(typedKey.length))
            ? typedKey.length
            : null;
      } else matchedChars = matchesKeyboardEvent(prev, target) ? 1 : null;
      if (matchedChars === null) {
        flushRapidTyping();
        return;
      }
      if (appState_2 === "tap") {
        let currentVoiceState = getVoiceState().voiceState;
        if (currentVoiceState === "processing") {
          if (key === null) prev.stopImmediatePropagation();
          return;
        }
        let isIdle = currentVoiceState === "idle";
        if (isIdle && composer.value.length > 0) {
          return;
        }
        prev.stopImmediatePropagation();
        let isFirstPress = rapidCountRef.current === 0;
        rapidCountRef.current = rapidCountRef.current + matchedChars;
        if (resetTimerRef.current) resetTimerRef.current();
        resetTimerRef.current = clock.setTimeout(() => {
          resetTimerRef.current = null;
          flushRapidTyping();
        }, VOICE_PARTIAL_FLUSH_MS);
        if (!isFirstPress) {
          if (key !== null)
            stripTrailing(matchedChars, {
              char: key,
              floor: 0,
            });
          return;
        }
        if (isIdle) {
          if (key !== null)
            stripTrailing(matchedChars, {
              char: key,
              anchor: true,
            });
          else
            stripTrailing(0, {
              anchor: true,
            });
        } else if (key !== null)
          stripTrailing(matchedChars, {
            char: key,
            floor: 0,
          });
        voiceHandleKeyEvent();
        if (isIdle && getVoiceState().voiceState === "idle") resetAnchor();
        return;
      }
      let voiceState = getVoiceState().voiceState;
      if (isHoldActiveRef.current && voiceState !== "idle") {
        prev.stopImmediatePropagation();
        if (key !== null)
          stripTrailing(matchedChars, {
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
      rapidCountRef.current = rapidCountRef.current + matchedChars;
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
          recordingFloorRef.current = stripTrailing(charsInInputRef.current + matchedChars, {
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
        stripTrailing(matchedChars, {
          char: key,
          floor: charsInInputRef.current,
        });
      } else charsInInputRef.current = charsInInputRef.current + matchedChars;
      if (voiceState === "idle" && rapidCountRef.current >= VOICE_MIN_CHARS)
        setVoiceState(markVoiceWarmingUp);
      if (resetTimerRef.current) resetTimerRef.current();
      resetTimerRef.current = clock.setTimeout(() => {
        resetTimerRef.current = null;
        flushRapidTyping();
      }, VOICE_PARTIAL_FLUSH_MS);
    };
    $[12] = key;
    $[13] = clock;
    $[14] = composer;
    $[15] = composerTakesTypedKeysDefault;
    $[16] = getVoiceState;
    $[17] = isActive;
    $[18] = isModalOverlayActive;
    $[19] = resetAnchor;
    $[20] = flushRapidTyping;
    $[21] = setVoiceState;
    $[22] = stripTrailing;
    $[23] = voiceCancelRecording;
    $[24] = voiceAvailable;
    $[25] = voiceHandleKeyEvent;
    $[26] = target;
    $[27] = appState_2;
    $[28] = handleKeyDown;
  } else handleKeyDown = $[28];
  let handleKeyDown_2 = handleKeyDown;
  let result;
  if ($[29] !== handleKeyDown_2 || $[30] !== voiceKeyDisplay) {
    result = {
      handleKeyDown: handleKeyDown_2,
      voiceKeyDisplay,
    };
    $[29] = handleKeyDown_2;
    $[30] = voiceKeyDisplay;
    $[31] = result;
  } else result = $[31];
  return result;
}
export {
  useVoiceAvailable,
  useVoiceLoginCompleted,
  useVoiceIntegration,
  useVoiceKeybindingHandler,
  DEFAULT_VOICE_KEYSTROKE,
};
