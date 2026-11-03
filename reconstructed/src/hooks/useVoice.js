/**
 * hooks/useVoice.ts
 *
 * 语音输入引擎：录音、电平、语音转写连接（STT）、静音超时、错误提示与语言规范化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoice.ts
 * pieces: chunk-0777tkjc.js (2), chunk-a658aeqp.js (10)
 * attribution: fingerprint 4, sole-consumer 6, affinity 1, layout 1
 */
import { basename } from "path";
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { I, getVoiceKeyterms } from "./_new/useVoiceController.js";
import { createSignal } from "../utils/signal.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import { splitIdentifier } from "../services/voiceKeyterms.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { sleep } from "../utils/sleep.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { getSystemLocaleLanguage } from "../utils/intl.js";
import { hBe } from "../services/analytics/metadata.js";

//@ chunk-a658aeqp.js:5030-5034 sole-consumer
j();
//@ chunk-a658aeqp.js:5034-5048 sole-consumer
var A = 1e4,
  D = 3;
/**
 * 语音模块句柄与早期失败记录（用于熔断）。
 */
//@ chunk-a658aeqp.js:5048-5347 sole-consumer
class VoiceSessionState {
  voiceModule = null;
  recentEarlyFailures = [];
  breakerTrippedLogged = !1;
  lastExpectedHint = null;
  recordEarlyFailure(e = null) {
    (this.recentEarlyFailures.push(Date.now()), (this.lastExpectedHint = e));
  }
  clearEarlyFailures() {
    ((this.recentEarlyFailures.length = 0), (this.breakerTrippedLogged = !1), (this.lastExpectedHint = null));
  }
}
//@ chunk-a658aeqp.js:5347-5370 sole-consumer
var K = new HostScoped(() => new VoiceSessionState());
//@ chunk-a658aeqp.js:5370-5450 sole-consumer
function L(e) {
  return `voice_transcription_connection_failed_${e ?? "no_response"}`;
}
//@ chunk-a658aeqp.js:5450-5466 sole-consumer
var O = 200,
  z = 600;
//@ chunk-a658aeqp.js:5466-5499 affinity
var G = 5000,
  U = 15000,
  q = 120000,
  X = 16;
//@ chunk-a658aeqp.js:5499-5688 fingerprint = computeLevel (1)
function computeLevel(chunk) {
  let i = chunk.length >> 1;
  if (i === 0) return 0;
  let r = 0;
  for (let h = 0; h < chunk.length - 1; h += 2) {
    let T = ((chunk[h] | (chunk[h + 1] << 8)) << 16) >> 16;
    r += T * T;
  }
  let rms = Math.sqrt(r / i),
    normalized = Math.min(rms / 2000, 1);
  return Math.sqrt(normalized);
}
/**
 * 没有转写结果时的提示：麦克风无信号、连接失败或没检测到语音。
 */
//@ chunk-a658aeqp.js:5688-6145 layout
function describeEmptyTranscription({ hadAudioSignal: hadAudioSignal, wsConnected: wsConnected }) {
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
  return { message: "No speech detected.", errorCode: "voice_transcription_no_speech" };
}
/**
 * 语音引擎类：管理麦克风录音、电平计算、连接语音转写服务、静音超时自动结束与错误映射（no audio/no speech/连接失败）。
 */
//@ chunk-a658aeqp.js:6145-18557 fingerprint = useVoice (0.702)
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
  #N = !1;
  #E = !1;
  #P = { state: "idle" };
  #e = "idle";
  #s = null;
  #o = "";
  #d = null;
  #b = !1;
  #c = null;
  #i = !1;
  #p = !1;
  #v = null;
  #a = null;
  #l = null;
  #_ = !1;
  #C = 0;
  #G = 0;
  #u = 0;
  #F = !1;
  #f = [];
  #R = !1;
  #T = 0;
  #$ = 0;
  #k = !1;
  #B = !1;
  #H = null;
  #M = [];
  constructor(e) {
    ((this.#y = e.host),
      (this.#m = e.clock),
      (this.#n = e.voiceStore),
      (this.#L = e.loadVoiceModule),
      (this.#w = e.connectVoiceStream),
      (this.#V = e.credentials),
      (this.#O = e.isVoiceStreamAvailable),
      (this.#z = e.probeVoiceConnectivity),
      (this.#I = e.getVoiceKeyterms),
      (this.#h = K.of(e.host)),
      (this.#t = e.inputs));
  }
  subscribe = (e) => this.#j.subscribe(e);
  getSnapshot = () => this.#P;
  setInputs = (e) => {
    if (this.#E) return;
    let i = this.#t,
      r = !this.#N;
    ((this.#N = !0), (this.#t = e));
    let n = r || i.enabled !== e.enabled,
      c = n || i.focusMode !== e.focusMode || i.isFocused !== e.isFocused;
    if (!r) {
      if (c) this.#C++;
      if (n) this.#U();
    }
    if (n) this.#Y();
    if (c) this.#W();
  };
  dispose = () => {
    if (this.#E) return;
    (this.#C++, this.#U(), (this.#E = !0));
  };
  handleKeyEvent = (e = z) => {
    let { enabled: enabled, focusMode: focusMode, mode: mode } = this.#t;
    if (this.#E || !enabled || !this.#O()) return;
    if (this.#i) return;
    if (focusMode && this.#_) {
      (logForDebugging("[voice] Re-arming focus recording after silence timeout"),
        (this.#_ = !1),
        (this.#i = !0),
        this.#D(),
        this.#A());
      return;
    }
    let c = this.#e;
    if (c === "processing") return;
    if (mode === "tap") {
      if (c === "idle")
        (logForDebugging("[voice] toggle: starting recording"),
          (this.#p = !0),
          this.#D(),
          this.#K(),
          this.#q());
      else if (c === "recording") (logForDebugging("[voice] toggle: finishing recording"), this.#g());
      return;
    }
    if (c === "idle") {
      if (
        (logForDebugging("[voice] handleKeyEvent: idle, starting recording session immediately"),
        this.#D(),
        this.#c)
      )
        this.#c();
      this.#c = this.#m.setTimeout(() => {
        if (((this.#c = null), this.#e === "recording" && !this.#b))
          (logForDebugging("[voice] No auto-repeat seen, arming release timer via fallback"),
            (this.#b = !0),
            this.#x());
      }, e);
    } else if (c === "recording") {
      if (((this.#b = !0), this.#c)) (this.#c(), (this.#c = null));
    }
    if (this.#d) this.#d();
    if (this.#e === "recording" && this.#b) this.#x();
  };
  cancelRecording = () => {
    if (this.#E || this.#e === "idle") return;
    (logForDebugging("[voice] cancelRecording: discarding without submit"),
      logFeatureOk("voice_cancel"),
      this.#S(),
      this.#r("idle"));
  };
  #r(e) {
    if (((this.#e = e), this.#P.state !== e)) ((this.#P = { state: e }), this.#j.emit());
    this.#n.setState((i) => {
      if (i.voiceState === e) return i;
      return { ...i, voiceState: e };
    });
  }
  #x() {
    this.#d = this.#m.setTimeout(() => {
      if (((this.#d = null), this.#e === "recording")) this.#g();
    }, O);
  }
  #U() {
    if ((this.#S(), this.#e !== "idle")) this.#r("idle");
  }
  #S() {
    if ((this.#u++, this.#d)) (this.#d(), (this.#d = null));
    if (this.#c) (this.#c(), (this.#c = null));
    if (this.#v) (this.#v(), (this.#v = null));
    if (this.#a) (this.#a(), (this.#a = null));
    if (this.#l) (this.#l(), (this.#l = null));
    if (((this.#_ = !1), (this.#p = !1), this.#h.voiceModule?.stopRecording(this.#y), this.#s))
      (this.#s.close(), (this.#s = null));
    ((this.#o = ""),
      (this.#M = []),
      (this.#f = []),
      this.#n.setState((e) => {
        if (e.voiceInterimTranscript === "" && !e.voiceAudioLevels.length) return e;
        return { ...e, voiceInterimTranscript: "", voiceAudioLevels: [] };
      }));
  }
  #Y() {
    if (this.#t.enabled && !this.#h.voiceModule)
      this.#L().then((e) => {
        this.#h.voiceModule = e;
      });
  }
  #A() {
    if (this.#v) this.#v();
    this.#v = this.#m.setTimeout(() => {
      if (((this.#v = null), this.#e === "recording" && this.#i))
        (logForDebugging("[voice] Focus silence timeout \u2014 tearing down session"),
          (this.#_ = !0),
          this.#g());
    }, G);
  }
  #K() {
    if (this.#a) this.#a();
    this.#a = this.#m.setTimeout(() => {
      if (((this.#a = null), this.#e === "recording" && this.#p))
        (logForDebugging("[voice] Toggle silence timeout \u2014 auto-finishing"), this.#g());
    }, U);
  }
  #q() {
    if (this.#l) this.#l();
    this.#l = this.#m.setTimeout(() => {
      if (((this.#l = null), this.#e === "recording" && this.#p))
        (logForDebugging("[voice] Toggle max-duration cap \u2014 auto-finishing"), this.#g());
    }, q);
  }
  #W() {
    let { enabled: enabled, focusMode: focusMode, isFocused: isFocused } = this.#t;
    if (!enabled || !focusMode) {
      if (this.#i && this.#e === "recording")
        (logForDebugging("[voice] Focus mode disabled during recording, finishing"), this.#g());
      return;
    }
    if (isFocused && this.#e === "idle" && !this.#_) {
      let n = this.#C,
        c = () => {
          if (n !== this.#C || this.#e !== "idle" || this.#_) return;
          (logForDebugging("[voice] Focus gained, starting recording session"),
            (this.#i = !0),
            this.#D(),
            this.#A());
        };
      if (this.#h.voiceModule) c();
      else
        this.#L().then((h) => {
          ((this.#h.voiceModule = h), c());
        });
    } else if (!isFocused) {
      if (((this.#_ = !1), this.#e === "recording"))
        (logForDebugging("[voice] Focus lost, finishing recording"), this.#g());
    }
  }
  #g() {
    (logForDebugging("[voice] finishRecording: stopping recording, transitioning to processing"), this.#T++);
    let e = this.#i;
    if (((this.#i = !1), (this.#p = !1), this.#a)) (this.#a(), (this.#a = null));
    if (this.#l) (this.#l(), (this.#l = null));
    (this.#r("processing"), this.#h.voiceModule?.stopRecording(this.#y));
    let i = Date.now() - this.#G,
      r = this.#k,
      n = this.#F,
      c = this.#$,
      h = this.#B,
      T = this.#H,
      V = this.#u,
      b = () => this.#u !== V;
    (logForDebugging("[voice] Recording stopped"),
      (this.#s ? this.#s.finalize() : Promise.resolve(void 0))
        .then(async (C) => {
          if (b()) return;
          if (
            C === "no_data_timeout" &&
            r &&
            h &&
            !e &&
            c === 0 &&
            this.#o.trim() === "" &&
            !this.#R &&
            this.#f.length > 0
          ) {
            if (
              ((this.#R = !0),
              logForDebugging(
                `[voice] Silent-drop detected (no_data_timeout, ${String(this.#f.length)} chunks); replaying on fresh connection`,
              ),
              logEvent("tengu_voice_silent_drop_replay", {
                recordingDurationMs: i,
                chunkCount: this.#f.length,
              }),
              this.#s)
            )
              (this.#s.close(), (this.#s = null));
            let _ = this.#f;
            if ((await sleep(250), b())) return;
            let F = normalizeLanguageForSTT(getInitialSettings_2().language),
              d = await this.#I();
            if (b()) return;
            if (
              (await new Promise((S) => {
                this.#w(
                  {
                    onTranscript: (o, u) => {
                      if (b()) return;
                      if (u && o.trim()) {
                        if (this.#o) this.#o += " ";
                        this.#o += o.trim();
                      }
                    },
                    onError: () => S(),
                    onClose: () => {},
                    onReady: (o) => {
                      if (b()) {
                        (o.close(), S());
                        return;
                      }
                      this.#s = o;
                      let u = 32000,
                        s = [],
                        p = 0;
                      for (let E of _) {
                        if (p > 0 && p + E.length > u) (o.send(Buffer.concat(s)), (s = []), (p = 0));
                        (s.push(E), (p += E.length));
                      }
                      if (s.length) o.send(Buffer.concat(s));
                      o.finalize().then(() => {
                        (o.close(), S());
                      });
                    },
                  },
                  { language: F.code, keyterms: d },
                  this.#V,
                ).then(
                  (o) => {
                    if (!o) S();
                  },
                  () => S(),
                );
              }),
              b())
            )
              return;
          }
          this.#f = [];
          let trimmed = this.#o.trim();
          if (
            (logForDebugging(`[voice] Final transcript assembled (${String(trimmed.length)} chars)`),
            logEvent("tengu_voice_recording_completed", {
              transcriptChars: trimmed.length + c,
              recordingDurationMs: i,
              hadAudioSignal: r,
              retried: n,
              silentDropRetried: this.#R,
              wsConnected: h,
              focusTriggered: e,
            }),
            this.#s)
          )
            (this.#s.close(), (this.#s = null));
          if (trimmed)
            (logForDebugging(`[voice] Injecting transcript (${String(trimmed.length)} chars)`),
              logFeatureOk("voice_transcription"),
              this.#t.onTranscript(trimmed));
          else if (c === 0 && i > 2000) {
            let { message: message, errorCode: errorCode } = describeEmptyTranscription({
              hadAudioSignal: r,
              wsConnected: h,
            });
            if ((this.#t.onError(message), errorCode === "voice_transcription_connection_failed"))
              if (T) logFeatureBad("voice_transcription", L(T));
              else
                this.#z().then((d) => {
                  logFeatureBad("voice_transcription", L(`probe_${d}`));
                });
            else logFeatureBad("voice_transcription", errorCode);
          }
          ((this.#o = ""),
            this.#n.setState((_) => {
              if (_.voiceInterimTranscript === "") return _;
              return { ..._, voiceInterimTranscript: "" };
            }),
            this.#r("idle"));
        })
        .catch((C) => {
          if (
            (logFeatureBad("voice_transcription", "voice_transcription_finalize_failed"),
            logError(toError(C)),
            !b())
          )
            this.#r("idle");
        }));
  }
  async #D() {
    let voiceModule = this.#h.voiceModule;
    if (!voiceModule) {
      (logFeatureBad("voice_start", "voice_start_module_not_loaded"),
        this.#t.onError("Voice module not loaded yet. Try again in a moment."),
        (this.#i = !1));
      return;
    }
    let i = this.#h,
      now = Date.now();
    while (i.recentEarlyFailures.length > 0 && now - i.recentEarlyFailures[0] > A)
      i.recentEarlyFailures.shift();
    if (i.recentEarlyFailures.length < D) i.breakerTrippedLogged = !1;
    if (i.recentEarlyFailures.length >= D) {
      if (!i.breakerTrippedLogged)
        ((i.breakerTrippedLogged = !0),
          logForDebugging(
            `[voice] circuit breaker: ${String(i.recentEarlyFailures.length)} early failures in ${String(A)}ms \u2014 suppressing new sessions until one succeeds`,
            { level: "error" },
          ),
          logEvent("tengu_voice_circuit_breaker_tripped", {}),
          logFeatureBad("voice_start", "voice_start_breaker_paused"),
          this.#t.onError(
            i.lastExpectedHint
              ? `${i.lastExpectedHint} Voice input is paused for a moment.`
              : "Voice input is failing repeatedly and has been paused. Check your microphone and try again in a moment.",
          ));
      this.#i = !1;
      return;
    }
    (this.#r("recording"),
      (this.#G = Date.now()),
      (this.#o = ""),
      (this.#b = !1),
      (this.#k = !1),
      (this.#F = !1),
      (this.#R = !1),
      (this.#f = []),
      (this.#$ = 0),
      (this.#B = !1),
      (this.#H = null));
    let n = ++this.#u,
      checkRecordingAvailability = await voiceModule.checkRecordingAvailability(this.#y);
    if (this.#u !== n) return;
    if (!checkRecordingAvailability.available) {
      (logForDebugging(`[voice] Recording not available: ${checkRecordingAvailability.reason ?? "unknown"}`),
        logFeatureBad("voice_start", "voice_start_recording_unavailable"),
        this.#t.onError(checkRecordingAvailability.reason ?? "Audio recording is not available."),
        i.recordEarlyFailure(),
        (this.#i = !1),
        this.#S(),
        this.#r("idle"));
      return;
    }
    (logForDebugging("[voice] Starting recording session, connecting voice stream"),
      this.#n.setState((d) => {
        if (!d.voiceError) return d;
        return { ...d, voiceError: null };
      }));
    let h = [];
    (logForDebugging("[voice] startRecording: buffering audio while WebSocket connects"), (this.#M = []));
    let T = !1,
      startRecording = await voiceModule.startRecording(
        this.#y,
        (d) => {
          T = !0;
          let buffer = Buffer.from(d);
          if (!this.#i) this.#f.push(buffer);
          if (this.#s) this.#s.send(buffer);
          else h.push(buffer);
          let o = computeLevel(d);
          if (!this.#k && o > 0.01) this.#k = !0;
          let u = this.#M;
          if (u.length >= X) u.shift();
          u.push(o);
          let s = [...u];
          ((this.#M = s), this.#n.setState((p) => ({ ...p, voiceAudioLevels: s })));
        },
        () => {
          if (this.#e === "recording") {
            if (!T && this.#u === n) i.recordEarlyFailure();
            this.#g();
          }
        },
        { silenceDetection: !1 },
      );
    if (this.#u !== n) {
      if (startRecording.started && this.#e !== "recording") voiceModule.stopRecording(this.#y);
      return;
    }
    if (!startRecording.started) {
      if (startRecording.superseded) {
        logForDebugging("[voice] start superseded mid-connect; ignoring");
        return;
      }
      let hint = startRecording.hint;
      (logFeatureBad("voice_start", "voice_start_capture_failed"),
        logForDebugging(`[voice] Recording failed \u2014 ${hint ?? "no audio tool found"}`, {
          level: "error",
        }),
        this.#t.onError(hint ?? "Failed to start audio capture. Check that your microphone is accessible."),
        i.recordEarlyFailure(startRecording.expected ? hint : null),
        (this.#i = !1),
        this.#S(),
        this.#r("idle"),
        this.#n.setState((S) => ({
          ...S,
          voiceError: hint ?? "Recording failed \u2014 no audio tool found",
        })));
      return;
    }
    let language = getInitialSettings_2().language,
      k = normalizeLanguageForSTT(language),
      C = getSystemLocaleLanguage();
    (logFeatureOk("voice_start"),
      logEvent("tengu_voice_recording_started", {
        focusTriggered: this.#i,
        sttLanguage: hBe(k.code),
        sttLanguageIsDefault: !language?.trim(),
        sttLanguageFellBack: k.fellBackFrom !== void 0,
        systemLocaleLanguage: C == null ? void 0 : hBe(C),
      }));
    let v = !1,
      _ = () => this.#u !== n,
      F = (d) => {
        let S = this.#T;
        this.#w(
          {
            onTranscript: (o, u) => {
              if (_()) return;
              if (
                ((v = !0),
                i.clearEarlyFailures(),
                logForDebugging(`[voice] onTranscript: isFinal=${String(u)} (${String(o.length)} chars)`),
                u && o.trim())
              )
                if (this.#i)
                  (logForDebugging(
                    `[voice] Focus mode: flushing final transcript immediately (${String(o.trim().length)} chars)`,
                  ),
                    logFeatureOk("voice_transcription"),
                    this.#t.onTranscript(o.trim()),
                    (this.#$ += o.trim().length),
                    this.#n.setState((s) => {
                      if (s.voiceInterimTranscript === "") return s;
                      return { ...s, voiceInterimTranscript: "" };
                    }),
                    (this.#o = ""),
                    this.#A());
                else {
                  if (this.#p) this.#K();
                  if (this.#o) this.#o += " ";
                  ((this.#o += o.trim()),
                    logForDebugging(`[voice] Accumulated final transcript (${String(this.#o.length)} chars)`),
                    this.#n.setState((s) => {
                      let p = this.#o;
                      if (s.voiceInterimTranscript === p) return s;
                      return { ...s, voiceInterimTranscript: p };
                    }));
                }
              else if (!u) {
                if (this.#i) this.#A();
                else if (this.#p) this.#K();
                let trimmed = o.trim(),
                  p = this.#o ? this.#o + (trimmed ? " " + trimmed : "") : trimmed;
                this.#n.setState((E) => {
                  if (E.voiceInterimTranscript === p) return E;
                  return { ...E, voiceInterimTranscript: p };
                });
              }
            },
            onError: (o, u) => {
              if (_()) {
                logForDebugging(`[voice] ignoring onError from stale session: ${o}`);
                return;
              }
              if (this.#T !== S) {
                logForDebugging(`[voice] ignoring stale onError from superseded attempt: ${o}`);
                return;
              }
              if (u?.connectFailureCode) this.#H = u.connectFailureCode;
              if (!u?.fatal && !v && this.#e === "recording") {
                if (!this.#F) {
                  ((this.#F = !0),
                    logForDebugging(`[voice] early voice_stream error (pre-transcript), retrying once: ${o}`),
                    logEvent("tengu_voice_stream_early_retry", {}),
                    (this.#s = null),
                    this.#T++,
                    this.#m.setTimeout(() => {
                      if (this.#e === "recording") F(d);
                    }, 250));
                  return;
                }
              }
              if ((this.#T++, !v)) i.recordEarlyFailure();
              (logFeatureBad("voice_stream_connect", "voice_stream_connection_error"),
                logForDebugging(`[voice] voice_stream error: ${o}`, { level: "error" }));
              let trimmed = this.#o.trim();
              if (trimmed)
                (logForDebugging(
                  `[voice] mid-stream error: salvaging ${String(trimmed.length)} chars before cleanup`,
                ),
                  logFeatureSad("voice_transcription", "voice_transcription_partial_salvaged"),
                  this.#t.onTranscript(trimmed));
              (this.#t.onError(`Voice stream error: ${o}`),
                (h.length = 0),
                (this.#i = !1),
                this.#S(),
                this.#r("idle"));
            },
            onClose: () => {},
            onReady: (o) => {
              if (_() || this.#e !== "recording") {
                o.close();
                return;
              }
              ((this.#s = o), (this.#B = !0), logFeatureOk("voice_stream_connect"));
              let u = 32000;
              if (h.length > 0) {
                let s = 0;
                for (let R of h) s += R.length;
                let p = [[]],
                  E = 0;
                for (let R of h) {
                  if (E > 0 && E + R.length > u) (p.push([]), (E = 0));
                  (p.at(-1).push(R), (E += R.length));
                }
                logForDebugging(
                  `[voice] onReady: flushing ${String(h.length)} buffered chunks (${String(s)} bytes) as ${String(p.length)} coalesced frame(s)`,
                );
                for (let R of p) o.send(Buffer.concat(R));
              }
              if (((h.length = 0), this.#d)) this.#d();
              if (this.#b) this.#x();
            },
          },
          { language: k.code, keyterms: d },
          this.#V,
        ).then(
          (o) => {
            if (_()) {
              o?.close();
              return;
            }
            if (!o) {
              if (
                (logForDebugging("[voice] Failed to connect to voice_stream (no OAuth token?)"),
                logFeatureBad("voice_stream_connect", "voice_stream_no_auth"),
                this.#t.onError("Voice mode requires a Claude.ai account. Please run /login to sign in."),
                isStorageV5Enabled() && this.#V !== void 0)
              )
                (i.recordEarlyFailure("Voice mode could not read your Claude.ai login."), (this.#i = !1));
              ((h.length = 0), this.#S(), this.#r("idle"));
              return;
            }
            if (this.#e !== "recording") {
              ((h.length = 0), o.close());
              return;
            }
          },
          (o) => {
            if (
              (logError(toError(o)),
              logFeatureBad("voice_stream_connect", "voice_stream_connect_exception"),
              _())
            )
              return;
            if (this.#e !== "recording") return;
            (i.recordEarlyFailure(),
              this.#t.onError("Voice connection failed. Check your network and try again."),
              (h.length = 0),
              (this.#i = !1),
              this.#S(),
              this.#r("idle"));
          },
        );
      };
    this.#I().then(F);
  }
}
/**
 * 语言名（含本地写法）到 STT 语言代码的映射。
 */
//@ chunk-0777tkjc.js:1031-2049 fingerprint = LANGUAGE_NAME_TO_CODE (1)
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
  },
  SUPPORTED_STT_LANGUAGES = new Set([
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
  if (!language) return { code: "en" };
  let lower = language.toLowerCase().trim();
  if (!lower) return { code: "en" };
  if (SUPPORTED_STT_LANGUAGES.has(lower)) return { code: lower };
  let r = LANGUAGE_NAME_TO_CODE[lower];
  if (r) return { code: r };
  let o = lower.split("-")[0];
  if (o && SUPPORTED_STT_LANGUAGES.has(o)) return { code: o };
  return { code: "en", fellBackFrom: language };
}

export { normalizeLanguageForSTT, useVoice };
