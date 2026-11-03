/**
 * hooks/useVoice.ts
 *
 * 语音输入引擎：录音、电平、语音转写连接（STT）、静音超时、错误提示与语言规范化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoice.ts
 * pieces: chunk-0777tkjc.js (2), chunk-a658aeqp.js (13)
 * attribution: fingerprint 4, sole-consumer 6, affinity 1, layout 1, placement 3
 */
import { basename } from "path";
import { init_react_production, y, P } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { createSignal } from "../utils/signal.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import { splitIdentifier, GLOBAL_KEYTERMS, fileNameWords } from "../services/voiceKeyterms.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { sleep } from "../utils/sleep.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { getSystemLocaleLanguage } from "../utils/intl.js";
import { localeOrNonconforming } from "../services/analytics/metadata.js";
import { getProjectRoot } from "../bootstrap/state.js";
import { getBranch } from "../utils/git.js";
import { useHost } from "../context/session.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useVoiceStateStore } from "../_unattributed/chunk-yj65zw1g/part-001.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import {
  connectVoiceStream,
  isVoiceStreamAvailable,
  probeVoiceConnectivity,
} from "../services/voiceStreamSTT.js";
import { useStoreSelector } from "./useStoreSelector.js";

//@ chunk-a658aeqp.js:5030-5034 sole-consumer
init_react_production();
//@ chunk-a658aeqp.js:5034-5048 sole-consumer
var VOICE_MAX_RECORDING_MS = 1e4;
var VOICE_MAX_ATTEMPTS = 3;
//@ chunk-a658aeqp.js:5048-5347 sole-consumer
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
//@ chunk-a658aeqp.js:5347-5370 sole-consumer
var voiceServiceSlot = new HostScoped(() => new VoiceSessionState());
//@ chunk-a658aeqp.js:5370-5450 sole-consumer
function connectionFailureReason(e) {
  return `voice_transcription_connection_failed_${e ?? "no_response"}`;
}
//@ chunk-a658aeqp.js:5450-5466 sole-consumer
var VOICE_FLUSH_MS = 200;
var VOICE_SILENCE_MS = 600;
//@ chunk-a658aeqp.js:5466-5499 affinity
var VOICE_CONNECT_TIMEOUT_MS = 5000;
var VOICE_SESSION_TIMEOUT_MS = 15000;
var VOICE_MAX_SESSION_MS = 120000;
var VOICE_SAMPLE_CHUNK = 16;
//@ chunk-a658aeqp.js:5499-5688 fingerprint = computeLevel (1)
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
//@ chunk-a658aeqp.js:5688-6145 layout
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
//@ chunk-a658aeqp.js:6145-18557 fingerprint = useVoice (0.702)
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
  constructor(e) {
    this.#y = e.host;
    this.#m = e.clock;
    this.#n = e.voiceStore;
    this.#L = e.loadVoiceModule;
    this.#w = e.connectVoiceStream;
    this.#V = e.credentials;
    this.#O = e.isVoiceStreamAvailable;
    this.#z = e.probeVoiceConnectivity;
    this.#I = e.getVoiceKeyterms;
    this.#h = voiceServiceSlot.of(e.host);
    this.#t = e.inputs;
  }
  subscribe = (e) => this.#j.subscribe(e);
  getSnapshot = () => this.#P;
  setInputs = (e) => {
    if (this.#E) return;
    let i = this.#t;
    let r = !this.#N;
    this.#N = true;
    this.#t = e;
    let n = r || i.enabled !== e.enabled;
    let c = n || i.focusMode !== e.focusMode || i.isFocused !== e.isFocused;
    if (!r) {
      if (c) this.#C++;
      if (n) this.#U();
    }
    if (n) this.#Y();
    if (c) this.#W();
  };
  dispose = () => {
    if (this.#E) return;
    this.#C++;
    this.#U();
    this.#E = true;
  };
  handleKeyEvent = (e = VOICE_SILENCE_MS) => {
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
    let c = this.#e;
    if (c === "processing") return;
    if (mode === "tap") {
      if (c === "idle") {
        logForDebugging("[voice] toggle: starting recording");
        this.#p = true;
        this.#D();
        this.#K();
        this.#q();
      } else if (c === "recording") {
        logForDebugging("[voice] toggle: finishing recording");
        this.#g();
      }
      return;
    }
    if (c === "idle") {
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
      }, e);
    } else if (c === "recording") {
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
      let n = this.#C;
      let c = () => {
        if (n !== this.#C || this.#e !== "idle" || this.#_) return;
        logForDebugging("[voice] Focus gained, starting recording session");
        this.#i = true;
        this.#D();
        this.#A();
      };
      if (this.#h.voiceModule) c();
      else
        this.#L().then((voiceModule) => {
          this.#h.voiceModule = voiceModule;
          c();
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
    let r = this.#k;
    let retried = this.#F;
    let c = this.#$;
    let h = this.#B;
    let T = this.#H;
    let V = this.#u;
    let isStale = () => this.#u !== V;
    logForDebugging("[voice] Recording stopped");
    (this.#s ? this.#s.finalize() : Promise.resolve(undefined))
      .then(async (finalizeSource) => {
        if (isStale()) return;
        if (
          finalizeSource === "no_data_timeout" &&
          r &&
          h &&
          !focusTriggered &&
          c === 0 &&
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
          let stt = normalizeLanguageForSTT(getInitialSettings_2().language);
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
                  for (let E of replayBuffer) {
                    if (bytes > 0 && bytes + E.length > SLICE) {
                      conn.send(Buffer.concat(slice));
                      slice = [];
                      bytes = 0;
                    }
                    slice.push(E);
                    bytes += E.length;
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
              (o) => {
                if (!o) resolve();
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
          transcriptChars: text.length + c,
          recordingDurationMs,
          hadAudioSignal: r,
          retried,
          silentDropRetried: this.#R,
          wsConnected: h,
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
        } else if (c === 0 && recordingDurationMs > 2000) {
          let { message, errorCode } = describeEmptyTranscription({
            hadAudioSignal: r,
            wsConnected: h,
          });
          this.#t.onError(message);
          if (errorCode === "voice_transcription_connection_failed") {
            if (T) logFeatureBad("voice_transcription", connectionFailureReason(T));
            else
              this.#z().then((d) => {
                logFeatureBad("voice_transcription", connectionFailureReason(`probe_${d}`));
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
    let i = this.#h;
    let now = Date.now();
    while (i.recentEarlyFailures.length > 0 && now - i.recentEarlyFailures[0] > VOICE_MAX_RECORDING_MS)
      i.recentEarlyFailures.shift();
    if (i.recentEarlyFailures.length < VOICE_MAX_ATTEMPTS) i.breakerTrippedLogged = false;
    if (i.recentEarlyFailures.length >= VOICE_MAX_ATTEMPTS) {
      if (!i.breakerTrippedLogged) {
        i.breakerTrippedLogged = true;
        logForDebugging(
          `[voice] circuit breaker: ${String(i.recentEarlyFailures.length)} early failures in ${String(VOICE_MAX_RECORDING_MS)}ms \u2014 suppressing new sessions until one succeeds`,
          {
            level: "error",
          },
        );
        logEvent("tengu_voice_circuit_breaker_tripped", {});
        logFeatureBad("voice_start", "voice_start_breaker_paused");
        this.#t.onError(
          i.lastExpectedHint
            ? `${i.lastExpectedHint} Voice input is paused for a moment.`
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
    let n = ++this.#u;
    let c = await voiceModule.checkRecordingAvailability(this.#y);
    if (this.#u !== n) return;
    if (!c.available) {
      logForDebugging(`[voice] Recording not available: ${c.reason ?? "unknown"}`);
      logFeatureBad("voice_start", "voice_start_recording_unavailable");
      this.#t.onError(c.reason ?? "Audio recording is not available.");
      i.recordEarlyFailure();
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
    let T = false;
    let V = await voiceModule.startRecording(
      this.#y,
      (chunk) => {
        T = true;
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
          if (!T && this.#u === n) i.recordEarlyFailure();
          this.#g();
        }
      },
      {
        silenceDetection: false,
      },
    );
    if (this.#u !== n) {
      if (V.started && this.#e !== "recording") voiceModule.stopRecording(this.#y);
      return;
    }
    if (!V.started) {
      if (V.superseded) {
        logForDebugging("[voice] start superseded mid-connect; ignoring");
        return;
      }
      let hint = V.hint;
      logFeatureBad("voice_start", "voice_start_capture_failed");
      logForDebugging(`[voice] Recording failed \u2014 ${hint ?? "no audio tool found"}`, {
        level: "error",
      });
      this.#t.onError(hint ?? "Failed to start audio capture. Check that your microphone is accessible.");
      i.recordEarlyFailure(V.expected ? hint : null);
      this.#i = false;
      this.#S();
      this.#r("idle");
      this.#n.setState((prev) => ({
        ...prev,
        voiceError: hint ?? "Recording failed \u2014 no audio tool found",
      }));
      return;
    }
    let rawLanguage = getInitialSettings_2().language;
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
    let v = false;
    let _ = () => this.#u !== n;
    let F = (keyterms) => {
      let myAttemptGen = this.#T;
      this.#w(
        {
          onTranscript: (text, isFinal) => {
            if (_()) return;
            v = true;
            i.clearEarlyFailures();
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
          onError: (error, u) => {
            if (_()) {
              logForDebugging(`[voice] ignoring onError from stale session: ${error}`);
              return;
            }
            if (this.#T !== myAttemptGen) {
              logForDebugging(`[voice] ignoring stale onError from superseded attempt: ${error}`);
              return;
            }
            if (u?.connectFailureCode) this.#H = u.connectFailureCode;
            if (!u?.fatal && !v && this.#e === "recording") {
              if (!this.#F) {
                this.#F = true;
                logForDebugging(`[voice] early voice_stream error (pre-transcript), retrying once: ${error}`);
                logEvent("tengu_voice_stream_early_retry", {});
                this.#s = null;
                this.#T++;
                this.#m.setTimeout(() => {
                  if (this.#e === "recording") F(keyterms);
                }, 250);
                return;
              }
            }
            this.#T++;
            if (!v) i.recordEarlyFailure();
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
            if (_() || this.#e !== "recording") {
              conn.close();
              return;
            }
            this.#s = conn;
            this.#B = true;
            logFeatureOk("voice_stream_connect");
            let SLICE_TARGET_BYTES = 32000;
            if (audioBuffer.length > 0) {
              let totalBytes = 0;
              for (let R of audioBuffer) totalBytes += R.length;
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
          if (_()) {
            conn?.close();
            return;
          }
          if (!conn) {
            logForDebugging("[voice] Failed to connect to voice_stream (no OAuth token?)");
            logFeatureBad("voice_stream_connect", "voice_stream_no_auth");
            this.#t.onError("Voice mode requires a Claude.ai account. Please run /login to sign in.");
            if (isStorageV5Enabled() && this.#V !== undefined) {
              i.recordEarlyFailure("Voice mode could not read your Claude.ai login.");
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
            return;
          }
        },
        (error) => {
          logError(toError(error));
          logFeatureBad("voice_stream_connect", "voice_stream_connect_exception");
          if (_()) return;
          if (this.#e !== "recording") return;
          i.recordEarlyFailure();
          this.#t.onError("Voice connection failed. Check your network and try again.");
          audioBuffer.length = 0;
          this.#i = false;
          this.#S();
          this.#r("idle");
        },
      );
    };
    this.#I().then(F);
  }
}
//@ chunk-a658aeqp.js:18925-18934 placement
var VOICE_TICK_MS = 50;
//@ chunk-a658aeqp.js:18934-19201 placement
/**
 * 构造语音转写关键词：全局词表 + 项目目录名 + 当前分支名拆出的词 + 最近文件名中的词，最多 I 个。
 */
async function getVoiceKeyterms(e) {
  let i = new Set(GLOBAL_KEYTERMS);
  try {
    let projectRoot = getProjectRoot();
    if (projectRoot) {
      let n = basename(projectRoot);
      if (n.length > 2 && n.length <= 50) i.add(n);
    }
  } catch {}
  try {
    let name = await getBranch();
    if (name) for (let n of splitIdentifier(name)) i.add(n);
  } catch {}
  if (e)
    for (let r of e) {
      if (i.size >= VOICE_TICK_MS) break;
      for (let n of fileNameWords(r)) i.add(n);
    }
  return [...i].slice(0, VOICE_TICK_MS);
}
//@ chunk-a658aeqp.js:19201-19798 placement
/**
 * 语音输入控制钩子：创建语音控制器，处理转写结果、错误、启用状态与按住/切换模式。
 */
function useVoiceController({ onTranscript, onError, enabled, focusMode, mode = "hold" }) {
  let host = useHost();
  let { credentials } = useTheme_2();
  let clock = useClock();
  let voiceStore = useVoiceStateStore();
  let isFocused = useTerminalFocus();
  let C = {
    onTranscript,
    onError,
    enabled,
    focusMode,
    mode,
    isFocused,
  };
  let [v] = y(
    () =>
      new useVoice({
        host,
        clock,
        voiceStore,
        loadVoiceModule: () => import("./chunk-ga5txjrx.js"),
        connectVoiceStream: (callbacks, options, credentials) =>
          connectVoiceStream(callbacks, options, credentials),
        credentials,
        isVoiceStreamAvailable: () => isVoiceStreamAvailable(),
        probeVoiceConnectivity: () => probeVoiceConnectivity(),
        getVoiceKeyterms: () => getVoiceKeyterms(),
        inputs: C,
      }),
  );
  P(() => {
    v.setInputs(C);
  });
  P(() => v.dispose, [v]);
  let { state } = useStoreSelector(v);
  return {
    state,
    handleKeyEvent: v.handleKeyEvent,
    cancelRecording: v.cancelRecording,
  };
}
//@ chunk-0777tkjc.js:1031-2049 fingerprint = LANGUAGE_NAME_TO_CODE (1)
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
//@ chunk-0777tkjc.js:2049-2285 fingerprint = normalizeLanguageForSTT (1)
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
export { normalizeLanguageForSTT };
