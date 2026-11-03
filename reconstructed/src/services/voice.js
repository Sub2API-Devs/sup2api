/**
 * services/voice.ts
 *
 * 语音输入录音：原生 audio-capture-napi、arecord、SoX rec 三种后端的探测与启动停止，依赖检查与安装提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/voice.ts
 * pieces: chunk-g4k0hvs5.js (1), chunk-ga5txjrx.js (18), chunk-jx4rgw65.js (1)
 * attribution: fingerprint 13, sole-consumer 4, affinity 2, layout 1
 */
import { join } from "path";
import { homedir } from "os";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { HostScoped } from "../utils/hostScoped.js";
import { logForDebugging } from "../utils/debug.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { isAntBuild } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { getPlatform } from "../utils/platform.js";
import { Nd } from "../utils/toolCgroup.js";
import { resetLocalSettingsGitTrackedCache, isLocalSettingsGitTracked } from "../utils/config.js";
import { whichOnPath } from "../utils/which.js";
import { resolveExecutableSafely } from "../utils/findExecutableWindows.js";
import { safeExecFileSync } from "../utils/safeSpawn.js";
import { H } from "../remote/tools/serve/servedSettingsFreeze.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";

//@ chunk-ga5txjrx.js:1161-1244 sole-consumer
var G = join(homedir(), ".cache", "coder-audio", "port"),
  X = join(homedir(), ".cache", "coder-audio", "token");
/**
 * 每宿主的录音状态：napi 模块、探测缓存、当前录音进程、原生录音标记。
 */
//@ chunk-ga5txjrx.js:1244-1431 sole-consumer
class VoiceRecorderState {
  audioNapi = null;
  audioNapiPromise = null;
  arecordProbe = null;
  linuxAlsaCardsProbe = null;
  activeRecorder = null;
  activeForwardedSocket = null;
  forwardedStartGeneration = 0;
  nativeRecordingActive = !1;
}
//@ chunk-ga5txjrx.js:1431-1454 sole-consumer
var voiceRecorderStates = new HostScoped(() => new VoiceRecorderState());
//@ chunk-ga5txjrx.js:1454-1473 sole-consumer
var RECORDING_STARTED = { started: !0 };
//@ chunk-ga5txjrx.js:1473-1528 affinity
var RECORDING_NOT_STARTED = { started: !1, superseded: !1, hint: null, expected: !1 };
/**
 * 懒加载 audio-capture-napi 原生模块并记录耗时。
 */
//@ chunk-ga5txjrx.js:1528-1769 fingerprint = loadAudioNapi (0.594)
function loadAudioNapi(e) {
  return (
    (e.audioNapiPromise ??= (async () => {
      let t0 = Date.now(),
        mod = await import("./chunk-vztqnp39.js");
      return (
        mod.isNativeAudioAvailable(),
        (e.audioNapi = mod),
        logForDebugging(`[voice] audio-capture-napi loaded in ${Date.now() - t0}ms`),
        mod
      );
    })()),
    e.audioNapiPromise
  );
}
/**
 * 录音参数：16kHz、单声道、静音判停 2.0 秒、阈值 3%。
 */
//@ chunk-ga5txjrx.js:1769-1800 fingerprint = SILENCE_DURATION_SECS (1)
var SAMPLE_RATE = 16000,
  CHANNELS = 1,
  SILENCE_DURATION_SECS = "2.0",
  SILENCE_THRESHOLD = "3%";
//@ chunk-ga5txjrx.js:1800-1888 layout
async function commandExists(cmd) {
  return (await execFileNoThrow(cmd, ["--version"], { timeout: 3000, useCwd: !1 })).code === 0;
}
/**
 * 试跑 arecord 150ms 判断能否录音（结果缓存）。
 */
//@ chunk-ga5txjrx.js:1888-2376 fingerprint = probeArecord (0.95)
function probeArecord(e) {
  return (
    (e.arecordProbe ??= new Promise((resolve) => {
      let child = spawn(
          "arecord",
          ["-f", "S16_LE", "-r", String(SAMPLE_RATE), "-c", String(CHANNELS), "-t", "raw", "/dev/null"],
          { stdio: ["ignore", "ignore", "pipe"], windowsHide: !0 },
        ),
        stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      let timer = setTimeout(
        (a, d) => {
          (a.kill("SIGTERM"), d({ ok: !0, stderr: "" }));
        },
        150,
        child,
        resolve,
      );
      (child.once("close", (code) => {
        (clearTimeout(timer), resolve({ ok: code === 0, stderr: stderr.trim() }));
      }),
        child.once("error", () => {
          (clearTimeout(timer), resolve({ ok: !1, stderr: "arecord: command not found" }));
        }));
    })),
    e.arecordProbe
  );
}
//@ chunk-ga5txjrx.js:2376-2553 fingerprint = linuxHasAlsaCards (0.886)
function linuxHasAlsaCards(e) {
  return (
    (e.linuxAlsaCardsProbe ??= readFile("/proc/asound/cards", "utf8").then(
      (cards) => {
        let trimmed = cards.trim();
        return trimmed !== "" && !trimmed.includes("no soundcards");
      },
      () => !1,
    )),
    e.linuxAlsaCardsProbe
  );
}
/**
 * 探测 apt-get/dnf/pacman，给出安装 SoX 的命令。
 */
//@ chunk-ga5txjrx.js:2553-2931 fingerprint = detectPackageManager (0.895)
async function detectPackageManager() {
  if (await commandExists("apt-get"))
    return {
      cmd: "sudo",
      args: ["apt-get", "install", "-y", "sox"],
      displayCommand: "sudo apt-get install sox",
    };
  if (await commandExists("dnf"))
    return { cmd: "sudo", args: ["dnf", "install", "-y", "sox"], displayCommand: "sudo dnf install sox" };
  if (await commandExists("pacman"))
    return {
      cmd: "sudo",
      args: ["pacman", "-S", "--noconfirm", "sox"],
      displayCommand: "sudo pacman -S sox",
    };
  return null;
}
//@ chunk-ga5txjrx.js:2931-3313 fingerprint = checkVoiceDependencies (0.721)
async function checkVoiceDependencies(e) {
  let of = voiceRecorderStates.of(e);
  if ((await loadAudioNapi(of)).isNativeAudioAvailable() && (await linuxHasAlsaCards(of)))
    return { available: !0, missing: [], installCommand: null };
  if (await commandExists("arecord")) return { available: !0, missing: [], installCommand: null };
  let missing = [];
  if (!(await commandExists("sox"))) missing.push("sox (rec command)");
  let pm = missing.length > 0 ? await detectPackageManager() : null;
  return { available: missing.length === 0, missing: missing, installCommand: pm?.displayCommand ?? null };
}
/**
 * 原生录音可用时试启动一次录音以触发系统麦克风授权。
 */
//@ chunk-ga5txjrx.js:3313-3476 fingerprint = requestMicrophonePermission (0.851)
async function requestMicrophonePermission(e) {
  if (!(await loadAudioNapi(voiceRecorderStates.of(e))).isNativeAudioAvailable()) return !0;
  if (
    (
      await startRecording(
        e,
        (s) => {},
        () => {},
        { silenceDetection: !1 },
      )
    ).started
  )
    return (stopRecording(e), !0);
  return !1;
}
/**
 * 判断能否录音：远程/云环境不可用；原生 napi+ALSA、arecord、SoX rec 依次尝试；WSL 与缺 SoX 时给出具体安装说明。
 */
//@ chunk-ga5txjrx.js:3476-4952 fingerprint = checkRecordingAvailability (0.714)
async function checkRecordingAvailability(e, o = {}) {
  if (isAntBuild() || env.CLAUDE_CODE_REMOTE)
    return {
      available: !1,
      reason: `Voice mode requires microphone access, but no audio device is available in this environment.

To use voice mode, run Claude Code locally instead.`,
    };
  let of = voiceRecorderStates.of(e);
  if ((await loadAudioNapi(of)).isNativeAudioAvailable() && (await linuxHasAlsaCards(of)))
    return { available: !0, reason: null };
  let n =
    `Voice mode could not find a working audio recorder in WSL.

` +
    `WSL2 with WSLg provides audio via PulseAudio \u2014 install SoX with its PulseAudio backend (sudo apt install sox libsox-fmt-pulse) so Claude Code can record through it.

` +
    "If WSLg is not available (for example WSL1), run Claude Code in native Windows instead.";
  if (await commandExists("arecord")) {
    let d = await probeArecord(of);
    if (d.ok) return { available: !0, reason: null };
    logForDebugging(`[voice] arecord probe failed: ${d.stderr}`);
  }
  let a = await commandExists("sox");
  if (a && (await commandExists("rec"))) return { available: !0, reason: null };
  if (getPlatform() === "wsl") return { available: !1, reason: n };
  if (!a) {
    let napi = await detectPackageManager();
    return {
      available: !1,
      reason: napi
        ? `Voice mode requires SoX for audio recording. Install it with: ${napi.displayCommand}`
        : `Voice mode requires SoX for audio recording. Install SoX manually:
  macOS: brew install sox
  Ubuntu/Debian: sudo apt-get install sox
  Fedora: sudo dnf install sox`,
    };
  }
  return {
    available: !1,
    reason: `Voice mode requires a microphone, but SoX could not open an audio capture device.

This usually means the host has no microphone (for example, a remote server). Run Claude Code on a machine with a microphone to use voice input.`,
  };
}
/**
 * 开始录音：优先原生录音，其次 arecord，最后 SoX rec；数据回调 onData，结束回调 onEnd。
 */
//@ chunk-ga5txjrx.js:4952-5435 fingerprint = startRecording (0.704)
async function startRecording(host, onData, onEnd, options) {
  logForDebugging("[voice] startRecording called, platform=linux");
  let of = voiceRecorderStates.of(host),
    a = await loadAudioNapi(of),
    nativeAvailable = a.isNativeAudioAvailable() && (await linuxHasAlsaCards(of)),
    useSilenceDetection = options?.silenceDetection !== !1;
  if (nativeAvailable) {
    if (of.nativeRecordingActive || a.isNativeRecordingActive())
      (a.stopNativeRecording(), (of.nativeRecordingActive = !1));
    if (
      a.startNativeRecording(
        (data) => {
          onData(data);
        },
        () => {
          if (useSilenceDetection) ((of.nativeRecordingActive = !1), onEnd());
        },
      )
    )
      return ((of.nativeRecordingActive = !0), RECORDING_STARTED);
  }
  if ((await commandExists("arecord")) && (await probeArecord(of)).ok)
    return startArecordRecording(of, onData, onEnd) ? RECORDING_STARTED : RECORDING_NOT_STARTED;
  return startSoxRecording(of, onData, onEnd, options) ? RECORDING_STARTED : RECORDING_NOT_STARTED;
}
/**
 * 用 SoX rec 录原始 16-bit PCM，开启静音判停时追加 silence 参数。
 */
//@ chunk-ga5txjrx.js:5435-5980 fingerprint = startSoxRecording (0.878)
function startSoxRecording(state, onData, onEnd, options) {
  let useSilenceDetection = options?.silenceDetection !== !1,
    args = [
      "-q",
      "--buffer",
      "1024",
      "-t",
      "raw",
      "-r",
      String(SAMPLE_RATE),
      "-e",
      "signed",
      "-b",
      "16",
      "-c",
      String(CHANNELS),
      "-",
    ];
  if (useSilenceDetection)
    args.push("silence", "1", "0.1", SILENCE_THRESHOLD, "1", SILENCE_DURATION_SECS, SILENCE_THRESHOLD);
  let child = spawn("rec", args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: !0, ...Nd("helper") });
  return (
    (state.activeRecorder = child),
    child.stdout?.on("data", (chunk) => {
      onData(chunk);
    }),
    child.stderr?.on("data", () => {}),
    child.on("close", () => {
      ((state.activeRecorder = null), onEnd());
    }),
    child.on("error", (err) => {
      (logForDebugging(`[voice] SoX rec spawn failed: ${err instanceof Error ? err.message : String(err)}`, {
        level: "error",
      }),
        (state.activeRecorder = null),
        onEnd());
    }),
    !0
  );
}
//@ chunk-ga5txjrx.js:5980-6396 fingerprint = startArecordRecording (0.791)
function startArecordRecording(state, onData, onEnd) {
  let args = ["-f", "S16_LE", "-r", String(SAMPLE_RATE), "-c", String(CHANNELS), "-t", "raw", "-q", "-"],
    child = spawn("arecord", args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: !0, ...Nd("helper") });
  return (
    (state.activeRecorder = child),
    child.stdout?.on("data", (chunk) => {
      onData(chunk);
    }),
    child.stderr?.on("data", () => {}),
    child.on("close", () => {
      ((state.activeRecorder = null), onEnd());
    }),
    child.on("error", (err) => {
      (logForDebugging(`[voice] arecord recorder spawn error: ${err}`, { level: "error" }),
        (state.activeRecorder = null),
        onEnd());
    }),
    !0
  );
}
/**
 * 停止录音（原生或子进程 SIGTERM）。
 */
//@ chunk-ga5txjrx.js:6396-6608 affinity
function stopRecording(host) {
  let of = voiceRecorderStates.of(host);
  if (of.nativeRecordingActive && of.audioNapi) {
    (of.audioNapi.stopNativeRecording(), (of.nativeRecordingActive = !1));
    return;
  }
  if (of.activeRecorder) (of.activeRecorder.kill("SIGTERM"), (of.activeRecorder = null));
}
//@ chunk-g4k0hvs5.js:1135-1437 fingerprint = hasCommand (0.375)
function hasCommand() {
  try {
    resetLocalSettingsGitTrackedCache();
    let s = whichOnPath("git", env.PATH ?? "");
    if (s === null || resolveExecutableSafely("git") === null) return !1;
    let result = safeExecFileSync(s, ["--version"], {
      reject: !1,
      timeout: H,
      cwd: homedir(),
      stdin: "ignore",
    });
    if (result.exitCode !== 0 || !String(result.stdout).startsWith("git version")) return !1;
    return !isLocalSettingsGitTracked({ onIndeterminate: "untracked" });
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-jx4rgw65.js:7408-7501 fingerprint = stopRecording (0.781)
function killChildWithSignal(signal, child, handle) {
  if (signal === "SIGTERM" && getPlatform() === "windows") return (handle.close(), !0);
  return (child.kill(signal), !1);
}

export { hasCommand, killChildWithSignal };
