/**
 * hooks/useVoice.ts
 *
 * 语音输入引擎：录音、电平、语音转写连接（STT）、静音超时、错误提示与语言规范化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoice.ts
 * pieces: chunk-1vwpwerm.js (14), chunk-ndkzc8d3.js (2)
 * attribution: sole-consumer 7, affinity 1, fingerprint 4, layout 1, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { createSignal } from "../utils/signal.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { logEvent } from "../services/analytics/index.js";
import { splitIdentifier, GLOBAL_KEYTERMS } from "../services/voiceKeyterms.js";
import { sleep } from "../utils/sleep.js";
import { getInitialSettings } from "../utils/settings/settings.js";
import { getSystemLocaleLanguage } from "../utils/intl.js";
import { localeOrNonconforming } from "../services/analytics/metadata.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { getProjectRoot } from "../bootstrap/state.js";
import { getBranch } from "../utils/git.js";
import { useHost } from "../context/session.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useVoiceStateStore } from "../context/voice.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import {
  connectVoiceStream,
  isVoiceStreamAvailable,
  probeVoiceConnectivity,
} from "../services/voiceStreamSTT.js";
import { useStoreSelector } from "./useStoreSelector.js";

//@ chunk-ndkzc8d3.js:1033-2051 fingerprint (2.1.88 match: LANGUAGE_NAME_TO_CODE, 1)
/**
 * 语言名（含本地写法）到 STT 语言代码的映射。
 */
var LANGUAGE_NAME_TO_CODE = {
  english: "en",
  spanish: "es",
  español: "es",
  espanol: "es",
  french: "fr",
  français: "fr",
  francais: "fr",
  japanese: "ja",
  日本語: "ja",
  german: "de",
  deutsch: "de",
  portuguese: "pt",
  português: "pt",
  portugues: "pt",
  italian: "it",
  italiano: "it",
  korean: "ko",
  한국어: "ko",
  hindi: "hi",
  हिन्दी: "hi",
  हिंदी: "hi",
  indonesian: "id",
  "bahasa indonesia": "id",
  bahasa: "id",
  russian: "ru",
  русский: "ru",
  polish: "pl",
  polski: "pl",
  turkish: "tr",
  türkçe: "tr",
  turkce: "tr",
  dutch: "nl",
  nederlands: "nl",
  ukrainian: "uk",
  українська: "uk",
  greek: "el",
  ελληνικά: "el",
  czech: "cs",
  čeština: "cs",
  cestina: "cs",
  danish: "da",
  dansk: "da",
  swedish: "sv",
  svenska: "sv",
  norwegian: "no",
  norsk: "no",
};
var SUPPORTED_STT_LANGUAGES = new Set([
  "en",
  "es",
  "fr",
  "ja",
  "de",
  "pt",
  "it",
  "ko",
  "hi",
  "id",
  "ru",
  "pl",
  "tr",
  "nl",
  "uk",
  "el",
  "cs",
  "da",
  "sv",
  "no",
]);
//@ chunk-ndkzc8d3.js:2051-2287 fingerprint (2.1.88 match: normalizeLanguageForSTT, 1)
function normalizeLanguageForSTT(language) {
  if (!language)
    return {
      code: "en",
    };
  let lower = language.toLowerCase().trim();
  if (!lower)
    return {
      code: "en",
    };
  if (SUPPORTED_STT_LANGUAGES.has(lower))
    return {
      code: lower,
    };
  let fromName = LANGUAGE_NAME_TO_CODE[lower];
  if (fromName)
    return {
      code: fromName,
    };
  let base = lower.split("-")[0];
  if (base && SUPPORTED_STT_LANGUAGES.has(base))
    return {
      code: base,
    };
  return {
    code: "en",
    fellBackFrom: language,
  };
}
//@ chunk-1vwpwerm.js:5366-5370 sole-consumer
init_react_production();
//@ chunk-1vwpwerm.js:5370-5384 sole-consumer
var VOICE_MAX_RECORDING_MS = 1e4;
var VOICE_MAX_ATTEMPTS = 3;
//@ chunk-1vwpwerm.js:5384-5683 sole-consumer
/**
 * 语音模块句柄与早期失败记录（用于熔断）。
 */
class VoiceSessionState {
  voiceModule = null;
  recentEarlyFailures = [];
  breakerTrippedLogged = false;
  lastExpectedHint = null;
  recordEarlyFailure(lastExpectedHint = null) {
    this.recentEarlyFailures.push(Date.now());
    this.lastExpectedHint = lastExpectedHint;
  }
  clearEarlyFailures() {
    this.recentEarlyFailures.length = 0;
    this.breakerTrippedLogged = false;
    this.lastExpectedHint = null;
  }
}
//@ chunk-1vwpwerm.js:5683-5706 sole-consumer
var voiceServiceSlot = new HostScoped(() => new VoiceSessionState());
//@ chunk-1vwpwerm.js:5706-5786 sole-consumer
function connectionFailureReason(code) {
  return `voice_transcription_connection_failed_${code ?? "no_response"}`;
}
//@ chunk-1vwpwerm.js:5786-5802 sole-consumer
var VOICE_FLUSH_MS = 200;
var VOICE_SILENCE_MS = 600;
//@ chunk-1vwpwerm.js:5802-5835 affinity
var VOICE_CONNECT_TIMEOUT_MS = 5000;
var VOICE_SESSION_TIMEOUT_MS = 15000;
var VOICE_MAX_SESSION_MS = 120000;
var VOICE_SAMPLE_CHUNK = 16;
//@ chunk-1vwpwerm.js:5835-6024 fingerprint (2.1.88 match: computeLevel, 1)
function computeLevel(chunk) {
  let samples = chunk.length >> 1;
  if (samples === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < chunk.length - 1; i += 2) {
    let sample = ((chunk[i] | (chunk[i + 1] << 8)) << 16) >> 16;
    sumSq += sample * sample;
  }
  let rms = Math.sqrt(sumSq / samples);
  let normalized = Math.min(rms / 2000, 1);
  return Math.sqrt(normalized);
}
//@ chunk-1vwpwerm.js:6024-6481 layout
/**
 * 没有转写结果时的提示：麦克风无信号、连接失败或没检测到语音。
 */
function describeEmptyTranscription({ hadAudioSignal, wsConnected }) {
  if (!hadAudioSignal)
    return {
      message:
        "No audio detected from microphone. Check that the correct input device is selected and that Claude Code has microphone access.",
      errorCode: "voice_transcription_no_audio_signal",
    };
  if (!wsConnected)
    return {
      message: "Voice connection failed. Check your network and try again.",
      errorCode: "voice_transcription_connection_failed",
    };
  return {
    message: "No speech detected.",
    errorCode: "voice_transcription_no_speech",
  };
}
//@ chunk-1vwpwerm.js:6481-18884 fingerprint (2.1.88 match: useVoice, 0.702)
/**
 * 语音引擎类：管理麦克风录音、电平计算、连接语音转写服务、静音超时自动结束与错误映射（no audio/no speech/连接失败）。
 */
class useVoice {
  #y;
  #m;
  #n;
  #L;
  #w;
  #V;
  #O;
  #z;
  #I;
  #h;
  #j = createSignal();
  #t;
  #N = false;
  #E = false;
  #P = {
    state: "idle",
  };
  #e = "idle";
  #s = null;
  #o = "";
  #d = null;
  #b = false;
  #c = null;
  #i = false;
  #p = false;
  #v = null;
  #a = null;
  #l = null;
  #_ = false;
  #C = 0;
  #G = 0;
  #u = 0;
  #F = false;
  #f = [];
  #R = false;
  #T = 0;
  #$ = 0;
  #k = false;
  #B = false;
  #H = null;
  #M = [];
  constructor(options) {
    this.#y = options.host;
    this.#m = options.clock;
    this.#n = options.voiceStore;
    this.#L = options.loadVoiceModule;
    this.#w = options.connectVoiceStream;
    this.#V = options.credentials;
    this.#O = options.isVoiceStreamAvailable;
    this.#z = options.probeVoiceConnectivity;
    this.#I = options.getVoiceKeyterms;
    this.#h = voiceServiceSlot.of(options.host);
    this.#t = options.inputs;
  }
  subscribe = (listener) => this.#j.subscribe(listener);
  getSnapshot = () => this.#P;
  setInputs = (inputs) => {
    if (this.#E) return;
    let previousInputs = this.#t;
    let isFirstSet = !this.#N;
    this.#N = true;
    this.#t = inputs;
    let enabledChanged = isFirstSet || previousInputs.enabled !== inputs.enabled;
    let focusChanged =
      enabledChanged ||
      previousInputs.focusMode !== inputs.focusMode ||
      previousInputs.isFocused !== inputs.isFocused;
    if (!isFirstSet) {
      if (focusChanged) this.#C++;
      if (enabledChanged) this.#U();
    }
    if (enabledChanged) this.#Y();
    if (focusChanged) this.#W();
  };
  dispose = () => {
    if (this.#E) return;
    this.#C++;
    this.#U();
    this.#E = true;
  };
  handleKeyEvent = (autoRepeatMs = VOICE_SILENCE_MS) => {
    let { enabled, focusMode, mode } = this.#t;
    if (this.#E || !enabled || !this.#O()) return;
    if (this.#i) return;
    if (focusMode && this.#_) {
      logForDebugging("[voice] Re-arming focus recording after silence timeout");
      this.#_ = false;
      this.#i = true;
      this.#D();
      this.#A();
      return;
    }
    let state = this.#e;
    if (state === "processing") return;
    if (mode === "tap") {
      if (state === "idle") {
        logForDebugging("[voice] toggle: starting recording");
        this.#p = true;
        this.#D();
        this.#K();
        this.#q();
      } else if (state === "recording") {
        logForDebugging("[voice] toggle: finishing recording");
        this.#g();
      }
      return;
    }
    if (state === "idle") {
      logForDebugging("[voice] handleKeyEvent: idle, starting recording session immediately");
      this.#D();
      if (this.#c) this.#c();
      this.#c = this.#m.setTimeout(() => {
        this.#c = null;
        if (this.#e === "recording" && !this.#b) {
          logForDebugging("[voice] No auto-repeat seen, arming release timer via fallback");
          this.#b = true;
          this.#x();
        }
      }, autoRepeatMs);
    } else if (state === "recording") {
      this.#b = true;
      if (this.#c) {
        this.#c();
        this.#c = null;
      }
    }
    if (this.#d) this.#d();
    if (this.#e === "recording" && this.#b) this.#x();
  };
  cancelRecording = () => {
    if (this.#E || this.#e === "idle") return;
    logForDebugging("[voice] cancelRecording: discarding without submit");
    logFeatureOk("voice_cancel");
    this.#S();
    this.#r("idle");
  };
  #r(newState) {
    this.#e = newState;
    if (this.#P.state !== newState) {
      this.#P = {
        state: newState,
      };
      this.#j.emit();
    }
    this.#n.setState((prev) => {
      if (prev.voiceState === newState) return prev;
      return {
        ...prev,
        voiceState: newState,
      };
    });
  }
  #x() {
    this.#d = this.#m.setTimeout(() => {
      this.#d = null;
      if (this.#e === "recording") this.#g();
    }, VOICE_FLUSH_MS);
  }
  #U() {
    this.#S();
    if (this.#e !== "idle") this.#r("idle");
  }
  #S() {
    this.#u++;
    if (this.#d) {
      this.#d();
      this.#d = null;
    }
    if (this.#c) {
      this.#c();
      this.#c = null;
    }
    if (this.#v) {
      this.#v();
      this.#v = null;
    }
    if (this.#a) {
      this.#a();
      this.#a = null;
    }
    if (this.#l) {
      this.#l();
      this.#l = null;
    }
    this.#_ = false;
    this.#p = false;
    this.#h.voiceModule?.stopRecording(this.#y);
    if (this.#s) {
      this.#s.close();
      this.#s = null;
    }
    this.#o = "";
    this.#M = [];
    this.#f = [];
    this.#n.setState((prev) => {
      if (prev.voiceInterimTranscript === "" && !prev.voiceAudioLevels.length) return prev;
      return {
        ...prev,
        voiceInterimTranscript: "",
        voiceAudioLevels: [],
      };
    });
  }
  #Y() {
    if (this.#t.enabled && !this.#h.voiceModule)
      this.#L().then((voiceModule) => {
        this.#h.voiceModule = voiceModule;
      });
  }
  #A() {
    if (this.#v) this.#v();
    this.#v = this.#m.setTimeout(() => {
      this.#v = null;
      if (this.#e === "recording" && this.#i) {
        logForDebugging("[voice] Focus silence timeout \u2014 tearing down session");
        this.#_ = true;
        this.#g();
      }
    }, VOICE_CONNECT_TIMEOUT_MS);
  }
  #K() {
    if (this.#a) this.#a();
    this.#a = this.#m.setTimeout(() => {
      this.#a = null;
      if (this.#e === "recording" && this.#p) {
        logForDebugging("[voice] Toggle silence timeout \u2014 auto-finishing");
        this.#g();
      }
    }, VOICE_SESSION_TIMEOUT_MS);
  }
  #q() {
    if (this.#l) this.#l();
    this.#l = this.#m.setTimeout(() => {
      this.#l = null;
      if (this.#e === "recording" && this.#p) {
        logForDebugging("[voice] Toggle max-duration cap \u2014 auto-finishing");
        this.#g();
      }
    }, VOICE_MAX_SESSION_MS);
  }
  #W() {
    let { enabled, focusMode, isFocused } = this.#t;
    if (!enabled || !focusMode) {
      if (this.#i && this.#e === "recording") {
        logForDebugging("[voice] Focus mode disabled during recording, finishing");
        this.#g();
      }
      return;
    }
    if (isFocused && this.#e === "idle" && !this.#_) {
      let generation = this.#C;
      let startIfCurrent = () => {
        if (generation !== this.#C || this.#e !== "idle" || this.#_) return;
        logForDebugging("[voice] Focus gained, starting recording session");
        this.#i = true;
        this.#D();
        this.#A();
      };
      if (this.#h.voiceModule) startIfCurrent();
      else
        this.#L().then((voiceModule) => {
          this.#h.voiceModule = voiceModule;
          startIfCurrent();
        });
    } else if (!isFocused) {
      this.#_ = false;
      if (this.#e === "recording") {
        logForDebugging("[voice] Focus lost, finishing recording");
        this.#g();
      }
    }
  }
  #g() {
    logForDebugging("[voice] finishRecording: stopping recording, transitioning to processing");
    this.#T++;
    let focusTriggered = this.#i;
    this.#i = false;
    this.#p = false;
    if (this.#a) {
      this.#a();
      this.#a = null;
    }
    if (this.#l) {
      this.#l();
      this.#l = null;
    }
    this.#r("processing");
    this.#h.voiceModule?.stopRecording(this.#y);
    let recordingDurationMs = Date.now() - this.#G;
    let hadAudioSignal = this.#k;
    let retried = this.#F;
    let flushedChars = this.#$;
    let wsConnected = this.#B;
    let connectFailureCode = this.#H;
    let attemptGeneration = this.#u;
    let isStale = () => this.#u !== attemptGeneration;
    logForDebugging("[voice] Recording stopped");
    (this.#s ? this.#s.finalize() : Promise.resolve(undefined))
      .then(async (finalizeSource) => {
        if (isStale()) return;
        if (
          finalizeSource === "no_data_timeout" &&
          hadAudioSignal &&
          wsConnected &&
          !focusTriggered &&
          flushedChars === 0 &&
          this.#o.trim() === "" &&
          !this.#R &&
          this.#f.length > 0
        ) {
          this.#R = true;
          logForDebugging(
            `[voice] Silent-drop detected (no_data_timeout, ${String(this.#f.length)} chunks); replaying on fresh connection`,
          );
          logEvent("tengu_voice_silent_drop_replay", {
            recordingDurationMs,
            chunkCount: this.#f.length,
          });
          if (this.#s) {
            this.#s.close();
            this.#s = null;
          }
          let replayBuffer = this.#f;
          await sleep(250);
          if (isStale()) return;
          let stt = normalizeLanguageForSTT(getInitialSettings().language);
          let keyterms = await this.#I();
          if (isStale()) return;
          await new Promise((resolve) => {
            this.#w(
              {
                onTranscript: (t, isFinal) => {
                  if (isStale()) return;
                  if (isFinal && t.trim()) {
                    if (this.#o) this.#o += " ";
                    this.#o += t.trim();
                  }
                },
                onError: () => resolve(),
                onClose: () => {},
                onReady: (conn) => {
                  if (isStale()) {
                    conn.close();
                    resolve();
                    return;
                  }
                  this.#s = conn;
                  let SLICE = 32000;
                  let slice = [];
                  let bytes = 0;
                  for (let chunk of replayBuffer) {
                    if (bytes > 0 && bytes + chunk.length > SLICE) {
                      conn.send(Buffer.concat(slice));
                      slice = [];
                      bytes = 0;
                    }
                    slice.push(chunk);
                    bytes += chunk.length;
                  }
                  if (slice.length) conn.send(Buffer.concat(slice));
                  conn.finalize().then(() => {
                    conn.close();
                    resolve();
                  });
                },
              },
              {
                language: stt.code,
                keyterms,
              },
              this.#V,
            ).then(
              (connection) => {
                if (!connection) resolve();
              },
              () => resolve(),
            );
          });
          if (isStale()) return;
        }
        this.#f = [];
        let text = this.#o.trim();
        logForDebugging(`[voice] Final transcript assembled (${String(text.length)} chars)`);
        logEvent("tengu_voice_recording_completed", {
          transcriptChars: text.length + flushedChars,
          recordingDurationMs,
          hadAudioSignal,
          retried,
          silentDropRetried: this.#R,
          wsConnected,
          focusTriggered,
        });
        if (this.#s) {
          this.#s.close();
          this.#s = null;
        }
        if (text) {
          logForDebugging(`[voice] Injecting transcript (${String(text.length)} chars)`);
          logFeatureOk("voice_transcription");
          this.#t.onTranscript(text);
        } else if (flushedChars === 0 && recordingDurationMs > 2000) {
          let { message, errorCode } = describeEmptyTranscription({
            hadAudioSignal,
            wsConnected,
          });
          this.#t.onError(message);
          if (errorCode === "voice_transcription_connection_failed") {
            if (connectFailureCode)
              logFeatureBad("voice_transcription", connectionFailureReason(connectFailureCode));
            else
              this.#z().then((probeResult) => {
                logFeatureBad("voice_transcription", connectionFailureReason(`probe_${probeResult}`));
              });
          } else logFeatureBad("voice_transcription", errorCode);
        }
        this.#o = "";
        this.#n.setState((prev) => {
          if (prev.voiceInterimTranscript === "") return prev;
          return {
            ...prev,
            voiceInterimTranscript: "",
          };
        });
        this.#r("idle");
      })
      .catch((err) => {
        logFeatureBad("voice_transcription", "voice_transcription_finalize_failed");
        logError(toError(err));
        if (!isStale()) this.#r("idle");
      });
  }
  async #D() {
    let voiceModule = this.#h.voiceModule;
    if (!voiceModule) {
      logFeatureBad("voice_start", "voice_start_module_not_loaded");
      this.#t.onError("Voice module not loaded yet. Try again in a moment.");
      this.#i = false;
      return;
    }
    let breaker = this.#h;
    let now = Date.now();
    while (
      breaker.recentEarlyFailures.length > 0 &&
      now - breaker.recentEarlyFailures[0] > VOICE_MAX_RECORDING_MS
    )
      breaker.recentEarlyFailures.shift();
    if (breaker.recentEarlyFailures.length < VOICE_MAX_ATTEMPTS) breaker.breakerTrippedLogged = false;
    if (breaker.recentEarlyFailures.length >= VOICE_MAX_ATTEMPTS) {
      if (!breaker.breakerTrippedLogged) {
        breaker.breakerTrippedLogged = true;
        logForDebugging(
          `[voice] circuit breaker: ${String(breaker.recentEarlyFailures.length)} early failures in ${String(VOICE_MAX_RECORDING_MS)}ms \u2014 suppressing new sessions until one succeeds`,
          {
            level: "error",
          },
        );
        logEvent("tengu_voice_circuit_breaker_tripped", {});
        logFeatureBad("voice_start", "voice_start_breaker_paused");
        this.#t.onError(
          breaker.lastExpectedHint
            ? `${breaker.lastExpectedHint} Voice input is paused for a moment.`
            : "Voice input is failing repeatedly and has been paused. Check your microphone and try again in a moment.",
        );
      }
      this.#i = false;
      return;
    }
    this.#r("recording");
    this.#G = Date.now();
    this.#o = "";
    this.#b = false;
    this.#k = false;
    this.#F = false;
    this.#R = false;
    this.#f = [];
    this.#$ = 0;
    this.#B = false;
    this.#H = null;
    let sessionGeneration = ++this.#u;
    let availability = await voiceModule.checkRecordingAvailability(this.#y);
    if (this.#u !== sessionGeneration) return;
    if (!availability.available) {
      logForDebugging(`[voice] Recording not available: ${availability.reason ?? "unknown"}`);
      logFeatureBad("voice_start", "voice_start_recording_unavailable");
      this.#t.onError(availability.reason ?? "Audio recording is not available.");
      breaker.recordEarlyFailure();
      this.#i = false;
      this.#S();
      this.#r("idle");
      return;
    }
    logForDebugging("[voice] Starting recording session, connecting voice stream");
    this.#n.setState((prev) => {
      if (!prev.voiceError) return prev;
      return {
        ...prev,
        voiceError: null,
      };
    });
    let audioBuffer = [];
    logForDebugging("[voice] startRecording: buffering audio while WebSocket connects");
    this.#M = [];
    let sawAudio = false;
    let startResult = await voiceModule.startRecording(
      this.#y,
      (chunk) => {
        sawAudio = true;
        let owned = Buffer.from(chunk);
        if (!this.#i) this.#f.push(owned);
        if (this.#s) this.#s.send(owned);
        else audioBuffer.push(owned);
        let level = computeLevel(chunk);
        if (!this.#k && level > 0.01) this.#k = true;
        let levels = this.#M;
        if (levels.length >= VOICE_SAMPLE_CHUNK) levels.shift();
        levels.push(level);
        let snapshot = [...levels];
        this.#M = snapshot;
        this.#n.setState((prev) => ({
          ...prev,
          voiceAudioLevels: snapshot,
        }));
      },
      () => {
        if (this.#e === "recording") {
          if (!sawAudio && this.#u === sessionGeneration) breaker.recordEarlyFailure();
          this.#g();
        }
      },
      {
        silenceDetection: false,
      },
    );
    if (this.#u !== sessionGeneration) {
      if (startResult.started && this.#e !== "recording") voiceModule.stopRecording(this.#y);
      return;
    }
    if (!startResult.started) {
      if (startResult.superseded) {
        logForDebugging("[voice] start superseded mid-connect; ignoring");
        return;
      }
      let hint = startResult.hint;
      logFeatureBad("voice_start", "voice_start_capture_failed");
      logForDebugging(`[voice] Recording failed \u2014 ${hint ?? "no audio tool found"}`, {
        level: "error",
      });
      this.#t.onError(hint ?? "Failed to start audio capture. Check that your microphone is accessible.");
      breaker.recordEarlyFailure(startResult.expected ? hint : null);
      this.#i = false;
      this.#S();
      this.#r("idle");
      this.#n.setState((prev) => ({
        ...prev,
        voiceError: hint ?? "Recording failed \u2014 no audio tool found",
      }));
      return;
    }
    let rawLanguage = getInitialSettings().language;
    let stt = normalizeLanguageForSTT(rawLanguage);
    let systemLocaleLanguage = getSystemLocaleLanguage();
    logFeatureOk("voice_start");
    logEvent("tengu_voice_recording_started", {
      focusTriggered: this.#i,
      sttLanguage: localeOrNonconforming(stt.code),
      sttLanguageIsDefault: !rawLanguage?.trim(),
      sttLanguageFellBack: stt.fellBackFrom !== undefined,
      systemLocaleLanguage:
        systemLocaleLanguage == null ? undefined : localeOrNonconforming(systemLocaleLanguage),
    });
    let gotTranscript = false;
    let isStale = () => this.#u !== sessionGeneration;
    let connectStream = (keyterms) => {
      let myAttemptGen = this.#T;
      this.#w(
        {
          onTranscript: (text, isFinal) => {
            if (isStale()) return;
            gotTranscript = true;
            breaker.clearEarlyFailures();
            logForDebugging(
              `[voice] onTranscript: isFinal=${String(isFinal)} (${String(text.length)} chars)`,
            );
            if (isFinal && text.trim()) {
              if (this.#i) {
                logForDebugging(
                  `[voice] Focus mode: flushing final transcript immediately (${String(text.trim().length)} chars)`,
                );
                logFeatureOk("voice_transcription");
                this.#t.onTranscript(text.trim());
                this.#$ += text.trim().length;
                this.#n.setState((prev) => {
                  if (prev.voiceInterimTranscript === "") return prev;
                  return {
                    ...prev,
                    voiceInterimTranscript: "",
                  };
                });
                this.#o = "";
                this.#A();
              } else {
                if (this.#p) this.#K();
                if (this.#o) this.#o += " ";
                this.#o += text.trim();
                logForDebugging(`[voice] Accumulated final transcript (${String(this.#o.length)} chars)`);
                this.#n.setState((prev) => {
                  let preview = this.#o;
                  if (prev.voiceInterimTranscript === preview) return prev;
                  return {
                    ...prev,
                    voiceInterimTranscript: preview,
                  };
                });
              }
            } else if (!isFinal) {
              if (this.#i) this.#A();
              else if (this.#p) this.#K();
              let interim = text.trim();
              let preview = this.#o ? this.#o + (interim ? " " + interim : "") : interim;
              this.#n.setState((prev) => {
                if (prev.voiceInterimTranscript === preview) return prev;
                return {
                  ...prev,
                  voiceInterimTranscript: preview,
                };
              });
            }
          },
          onError: (error, errorInfo) => {
            if (isStale()) {
              logForDebugging(`[voice] ignoring onError from stale session: ${error}`);
              return;
            }
            if (this.#T !== myAttemptGen) {
              logForDebugging(`[voice] ignoring stale onError from superseded attempt: ${error}`);
              return;
            }
            if (errorInfo?.connectFailureCode) this.#H = errorInfo.connectFailureCode;
            if (!errorInfo?.fatal && !gotTranscript && this.#e === "recording") {
              if (!this.#F) {
                this.#F = true;
                logForDebugging(`[voice] early voice_stream error (pre-transcript), retrying once: ${error}`);
                logEvent("tengu_voice_stream_early_retry", {});
                this.#s = null;
                this.#T++;
                this.#m.setTimeout(() => {
                  if (this.#e === "recording") connectStream(keyterms);
                }, 250);
                return;
              }
            }
            this.#T++;
            if (!gotTranscript) breaker.recordEarlyFailure();
            logFeatureBad("voice_stream_connect", "voice_stream_connection_error");
            logForDebugging(`[voice] voice_stream error: ${error}`, {
              level: "error",
            });
            let trimmed = this.#o.trim();
            if (trimmed) {
              logForDebugging(
                `[voice] mid-stream error: salvaging ${String(trimmed.length)} chars before cleanup`,
              );
              logFeatureSad("voice_transcription", "voice_transcription_partial_salvaged");
              this.#t.onTranscript(trimmed);
            }
            this.#t.onError(`Voice stream error: ${error}`);
            audioBuffer.length = 0;
            this.#i = false;
            this.#S();
            this.#r("idle");
          },
          onClose: () => {},
          onReady: (conn) => {
            if (isStale() || this.#e !== "recording") {
              conn.close();
              return;
            }
            this.#s = conn;
            this.#B = true;
            logFeatureOk("voice_stream_connect");
            let SLICE_TARGET_BYTES = 32000;
            if (audioBuffer.length > 0) {
              let totalBytes = 0;
              for (let chunk of audioBuffer) totalBytes += chunk.length;
              let slices = [[]];
              let sliceBytes = 0;
              for (let chunk of audioBuffer) {
                if (sliceBytes > 0 && sliceBytes + chunk.length > SLICE_TARGET_BYTES) {
                  slices.push([]);
                  sliceBytes = 0;
                }
                slices.at(-1).push(chunk);
                sliceBytes += chunk.length;
              }
              logForDebugging(
                `[voice] onReady: flushing ${String(audioBuffer.length)} buffered chunks (${String(totalBytes)} bytes) as ${String(slices.length)} coalesced frame(s)`,
              );
              for (let slice of slices) conn.send(Buffer.concat(slice));
            }
            audioBuffer.length = 0;
            if (this.#d) this.#d();
            if (this.#b) this.#x();
          },
        },
        {
          language: stt.code,
          keyterms,
        },
        this.#V,
      ).then(
        (conn) => {
          if (isStale()) {
            conn?.close();
            return;
          }
          if (!conn) {
            logForDebugging("[voice] Failed to connect to voice_stream (no OAuth token?)");
            logFeatureBad("voice_stream_connect", "voice_stream_no_auth");
            this.#t.onError("Voice mode requires a Claude.ai account. Please run /login to sign in.");
            if (isStorageV5Enabled() && this.#V !== undefined) {
              breaker.recordEarlyFailure("Voice mode could not read your Claude.ai login.");
              this.#i = false;
            }
            audioBuffer.length = 0;
            this.#S();
            this.#r("idle");
            return;
          }
          if (this.#e !== "recording") {
            audioBuffer.length = 0;
            conn.close();
          }
        },
        (error) => {
          logError(toError(error));
          logFeatureBad("voice_stream_connect", "voice_stream_connect_exception");
          if (isStale()) return;
          if (this.#e !== "recording") return;
          breaker.recordEarlyFailure();
          this.#t.onError("Voice connection failed. Check your network and try again.");
          audioBuffer.length = 0;
          this.#i = false;
          this.#S();
          this.#r("idle");
        },
      );
    };
    this.#I().then(connectStream);
  }
}
//@ chunk-1vwpwerm.js:19191-19252 sole-consumer
function splitFileName(filePath) {
  let name = basename(filePath).replace(/\.[^.]+$/, "");
  return splitIdentifier(name);
}
//@ chunk-1vwpwerm.js:19252-19261 placement
var VOICE_TICK_MS = 50;
//@ chunk-1vwpwerm.js:19261-19528 placement
/**
 * 构造语音转写关键词：全局词表 + 项目目录名 + 当前分支名拆出的词 + 最近文件名中的词，最多 I 个。
 */
async function getVoiceKeyterms(filePaths) {
  let keyterms = new Set(GLOBAL_KEYTERMS);
  try {
    let projectRoot = getProjectRoot();
    if (projectRoot) {
      let projectName = basename(projectRoot);
      if (projectName.length > 2 && projectName.length <= 50) keyterms.add(projectName);
    }
  } catch {}
  try {
    let name = await getBranch();
    if (name) for (let word of splitIdentifier(name)) keyterms.add(word);
  } catch {}
  if (filePaths)
    for (let filePath of filePaths) {
      if (keyterms.size >= VOICE_TICK_MS) break;
      for (let word of splitFileName(filePath)) keyterms.add(word);
    }
  return [...keyterms].slice(0, VOICE_TICK_MS);
}
//@ chunk-1vwpwerm.js:19528-20125 placement
/**
 * 语音输入控制钩子：创建语音控制器，处理转写结果、错误、启用状态与按住/切换模式。
 */
function useVoiceController({ onTranscript, onError, enabled, focusMode, mode = "hold" }) {
  let host = useHost();
  let { credentials } = useTheme_2();
  let clock = useClock();
  let voiceStore = useVoiceStateStore();
  let isFocused = useTerminalFocus();
  let inputs = {
    onTranscript,
    onError,
    enabled,
    focusMode,
    mode,
    isFocused,
  };
  let [controller] = useState(
    () =>
      new useVoice({
        host,
        clock,
        voiceStore,
        loadVoiceModule: () => import("../services/voice.js"),
        connectVoiceStream: (callbacks, options, credentials) =>
          connectVoiceStream(callbacks, options, credentials),
        credentials,
        isVoiceStreamAvailable: () => isVoiceStreamAvailable(),
        probeVoiceConnectivity: () => probeVoiceConnectivity(),
        getVoiceKeyterms: () => getVoiceKeyterms(),
        inputs,
      }),
  );
  useEffect(() => {
    controller.setInputs(inputs);
  });
  useEffect(() => controller.dispose, [controller]);
  let { state } = useStoreSelector(controller);
  return {
    state,
    handleKeyEvent: controller.handleKeyEvent,
    cancelRecording: controller.cancelRecording,
  };
}
export { normalizeLanguageForSTT, useVoiceController };
