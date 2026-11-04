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
import { getPlatform } from "../utils/platform.js";
import { HostScoped } from "../utils/hostScoped.js";
import { logForDebugging } from "../utils/debug.js";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import { isAntBuild } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { cgroupSpawnOptions } from "../utils/toolCgroup.js";
import { resetLocalSettingsGitTrackedCache, isLocalSettingsGitTracked } from "../utils/config.js";
import { whichOnPath } from "../utils/which.js";
import { resolveExecutableSafely } from "../utils/findExecutableWindows.js";
import { safeExecFileSync } from "../utils/safeSpawn.js";
import { SETTINGS_FREEZE_MIN_REFRESH_MS } from "../remote/tools/serve/servedSettingsFreeze.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";
import { deferInit, beginDeferredInits, runDeferredInits } from "../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ../remote/tools/serve/servedSettingsFreeze.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/remote/tools/serve/servedSettingsFreeze.js");
//@ chunk-jx4rgw65.js:7408-7501 fingerprint = stopRecording (0.781)
function killChildWithSignal(signal, child, handle) {
  if (signal === "SIGTERM" && getPlatform() === "windows") {
    handle.close();
    return true;
  }
  child.kill(signal);
  return false;
}
//@ chunk-ga5txjrx.js:1161-1244 sole-consumer
/**
 * 录音程序使用的本地端口与令牌文件路径。
 */
var VOICE_PORT_FILE = join(homedir(), ".cache", "coder-audio", "port");
var VOICE_TOKEN_FILE = join(homedir(), ".cache", "coder-audio", "token");
//@ chunk-ga5txjrx.js:1244-1431 sole-consumer
/**
 * 每宿主的录音状态：napi 模块、探测缓存、当前录音进程、原生录音标记。
 */
class VoiceRecorderState {
  audioNapi = null;
  audioNapiPromise = null;
  arecordProbe = null;
  linuxAlsaCardsProbe = null;
  activeRecorder = null;
  activeForwardedSocket = null;
  forwardedStartGeneration = 0;
  nativeRecordingActive = false;
}
//@ chunk-ga5txjrx.js:1431-1454 sole-consumer
var voiceRecorderStates; // deferred: uses VoiceRecorderState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ga5txjrx.js:1431", () => {
  voiceRecorderStates = new HostScoped(() => new VoiceRecorderState());
});
//@ chunk-ga5txjrx.js:1454-1473 sole-consumer
var RECORDING_STARTED = {
  started: true,
};
//@ chunk-ga5txjrx.js:1473-1528 affinity
var RECORDING_NOT_STARTED = {
  started: false,
  superseded: false,
  hint: null,
  expected: false,
};
//@ chunk-ga5txjrx.js:1528-1769 fingerprint = loadAudioNapi (0.594)
/**
 * 懒加载 audio-capture-napi 原生模块并记录耗时。
 */
function loadAudioNapi(napi) {
  napi.audioNapiPromise ??= (async () => {
    let now = Date.now();
    let mod = await import("./voice/isNativeAudioAvailable.lazy.js");
    mod.isNativeAudioAvailable();
    napi.audioNapi = mod;
    logForDebugging(`[voice] audio-capture-napi loaded in ${Date.now() - now}ms`);
    return mod;
  })();
  return napi.audioNapiPromise;
}
//@ chunk-ga5txjrx.js:1769-1800 fingerprint = SILENCE_DURATION_SECS (1)
/**
 * 录音参数：16kHz、单声道、静音判停 2.0 秒、阈值 3%。
 */
var SAMPLE_RATE = 16000;
var CHANNELS = 1;
var SILENCE_DURATION_SECS = "2.0";
var SILENCE_THRESHOLD = "3%";
//@ chunk-ga5txjrx.js:1800-1888 layout
async function commandExists(cmd) {
  return (
    (
      await execFileNoThrow(cmd, ["--version"], {
        timeout: 3000,
        useCwd: false,
      })
    ).code === 0
  );
}
//@ chunk-ga5txjrx.js:1888-2376 fingerprint = probeArecord (0.95)
/**
 * 试跑 arecord 150ms 判断能否录音（结果缓存）。
 */
function probeArecord(state) {
  state.arecordProbe ??= new Promise((resolve) => {
    let child = spawn(
      "arecord",
      ["-f", "S16_LE", "-r", String(SAMPLE_RATE), "-c", String(CHANNELS), "-t", "raw", "/dev/null"],
      {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      },
    );
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    let timer = setTimeout(
      (child, resolve) => {
        child.kill("SIGTERM");
        resolve({
          ok: true,
          stderr: "",
        });
      },
      150,
      child,
      resolve,
    );
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0,
        stderr: stderr.trim(),
      });
    });
    child.once("error", () => {
      clearTimeout(timer);
      resolve({
        ok: false,
        stderr: "arecord: command not found",
      });
    });
  });
  return state.arecordProbe;
}
//@ chunk-ga5txjrx.js:2376-2553 fingerprint = linuxHasAlsaCards (0.886)
function linuxHasAlsaCards(napi) {
  napi.linuxAlsaCardsProbe ??= readFile("/proc/asound/cards", "utf8").then(
    (cards) => {
      let trimmed = cards.trim();
      return trimmed !== "" && !trimmed.includes("no soundcards");
    },
    () => false,
  );
  return napi.linuxAlsaCardsProbe;
}
//@ chunk-ga5txjrx.js:2553-2931 fingerprint = detectPackageManager (0.895)
/**
 * 探测 apt-get/dnf/pacman，给出安装 SoX 的命令。
 */
async function detectPackageManager() {
  if (await commandExists("apt-get"))
    return {
      cmd: "sudo",
      args: ["apt-get", "install", "-y", "sox"],
      displayCommand: "sudo apt-get install sox",
    };
  if (await commandExists("dnf"))
    return {
      cmd: "sudo",
      args: ["dnf", "install", "-y", "sox"],
      displayCommand: "sudo dnf install sox",
    };
  if (await commandExists("pacman"))
    return {
      cmd: "sudo",
      args: ["pacman", "-S", "--noconfirm", "sox"],
      displayCommand: "sudo pacman -S sox",
    };
  return null;
}
//@ chunk-ga5txjrx.js:2931-3313 fingerprint = checkVoiceDependencies (0.721)
async function checkVoiceDependencies(host) {
  let napi = voiceRecorderStates.of(host);
  if ((await loadAudioNapi(napi)).isNativeAudioAvailable() && (await linuxHasAlsaCards(napi)))
    return {
      available: true,
      missing: [],
      installCommand: null,
    };
  if (await commandExists("arecord"))
    return {
      available: true,
      missing: [],
      installCommand: null,
    };
  let missing = [];
  if (!(await commandExists("sox"))) missing.push("sox (rec command)");
  let pm = missing.length > 0 ? await detectPackageManager() : null;
  return {
    available: missing.length === 0,
    missing,
    installCommand: pm?.displayCommand ?? null,
  };
}
//@ chunk-ga5txjrx.js:3313-3476 fingerprint = requestMicrophonePermission (0.851)
/**
 * 原生录音可用时试启动一次录音以触发系统麦克风授权。
 */
async function requestMicrophonePermission(host) {
  if (!(await loadAudioNapi(voiceRecorderStates.of(host))).isNativeAudioAvailable()) return true;
  if (
    (
      await startRecording(
        host,
        (_chunk) => {},
        () => {},
        {
          silenceDetection: false,
        },
      )
    ).started
  ) {
    stopRecording(host);
    return true;
  }
  return false;
}
//@ chunk-ga5txjrx.js:3476-4952 fingerprint = checkRecordingAvailability (0.714)
/**
 * 判断能否录音：远程/云环境不可用；原生 napi+ALSA、arecord、SoX rec 依次尝试；WSL 与缺 SoX 时给出具体安装说明。
 */
async function checkRecordingAvailability(host, options = {}) {
  if (isAntBuild() || env.CLAUDE_CODE_REMOTE)
    return {
      available: false,
      reason: `Voice mode requires microphone access, but no audio device is available in this environment.

To use voice mode, run Claude Code locally instead.`,
    };
  let napi = voiceRecorderStates.of(host);
  if ((await loadAudioNapi(napi)).isNativeAudioAvailable() && (await linuxHasAlsaCards(napi)))
    return {
      available: true,
      reason: null,
    };
  let wslNoAudioReason =
    `Voice mode could not find a working audio recorder in WSL.

` +
    `WSL2 with WSLg provides audio via PulseAudio \u2014 install SoX with its PulseAudio backend (sudo apt install sox libsox-fmt-pulse) so Claude Code can record through it.

` +
    "If WSLg is not available (for example WSL1), run Claude Code in native Windows instead.";
  if (await commandExists("arecord")) {
    let probe = await probeArecord(napi);
    if (probe.ok)
      return {
        available: true,
        reason: null,
      };
    logForDebugging(`[voice] arecord probe failed: ${probe.stderr}`);
  }
  let hasSox = await commandExists("sox");
  if (hasSox && (await commandExists("rec")))
    return {
      available: true,
      reason: null,
    };
  if (getPlatform() === "wsl")
    return {
      available: false,
      reason: wslNoAudioReason,
    };
  if (!hasSox) {
    let napi = await detectPackageManager();
    return {
      available: false,
      reason: napi
        ? `Voice mode requires SoX for audio recording. Install it with: ${napi.displayCommand}`
        : `Voice mode requires SoX for audio recording. Install SoX manually:
  macOS: brew install sox
  Ubuntu/Debian: sudo apt-get install sox
  Fedora: sudo dnf install sox`,
    };
  }
  return {
    available: false,
    reason: `Voice mode requires a microphone, but SoX could not open an audio capture device.

This usually means the host has no microphone (for example, a remote server). Run Claude Code on a machine with a microphone to use voice input.`,
  };
}
//@ chunk-ga5txjrx.js:4952-5435 fingerprint = startRecording (0.704)
/**
 * 开始录音：优先原生录音，其次 arecord，最后 SoX rec；数据回调 onData，结束回调 onEnd。
 */
async function startRecording(host, onData, onEnd, options) {
  logForDebugging("[voice] startRecording called, platform=linux");
  let state = voiceRecorderStates.of(host);
  let napi = await loadAudioNapi(state);
  let nativeAvailable = napi.isNativeAudioAvailable() && (await linuxHasAlsaCards(state));
  let useSilenceDetection = options?.silenceDetection !== false;
  if (nativeAvailable) {
    if (state.nativeRecordingActive || napi.isNativeRecordingActive()) {
      napi.stopNativeRecording();
      state.nativeRecordingActive = false;
    }
    if (
      napi.startNativeRecording(
        (data) => {
          onData(data);
        },
        () => {
          if (useSilenceDetection) {
            state.nativeRecordingActive = false;
            onEnd();
          }
        },
      )
    ) {
      state.nativeRecordingActive = true;
      return RECORDING_STARTED;
    }
  }
  if ((await commandExists("arecord")) && (await probeArecord(state)).ok)
    return startArecordRecording(state, onData, onEnd) ? RECORDING_STARTED : RECORDING_NOT_STARTED;
  return startSoxRecording(state, onData, onEnd, options) ? RECORDING_STARTED : RECORDING_NOT_STARTED;
}
//@ chunk-ga5txjrx.js:5435-5980 fingerprint = startSoxRecording (0.878)
/**
 * 用 SoX rec 录原始 16-bit PCM，开启静音判停时追加 silence 参数。
 */
function startSoxRecording(state, onData, onEnd, options) {
  let useSilenceDetection = options?.silenceDetection !== false;
  let args = [
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
  let child = spawn("rec", args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    ...cgroupSpawnOptions("helper"),
  });
  state.activeRecorder = child;
  child.stdout?.on("data", (chunk) => {
    onData(chunk);
  });
  child.stderr?.on("data", () => {});
  child.on("close", () => {
    state.activeRecorder = null;
    onEnd();
  });
  child.on("error", (err) => {
    logForDebugging(`[voice] SoX rec spawn failed: ${err instanceof Error ? err.message : String(err)}`, {
      level: "error",
    });
    state.activeRecorder = null;
    onEnd();
  });
  return true;
}
//@ chunk-ga5txjrx.js:5980-6396 fingerprint = startArecordRecording (0.791)
function startArecordRecording(state, onData, onEnd) {
  let args = ["-f", "S16_LE", "-r", String(SAMPLE_RATE), "-c", String(CHANNELS), "-t", "raw", "-q", "-"];
  let child = spawn("arecord", args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    ...cgroupSpawnOptions("helper"),
  });
  state.activeRecorder = child;
  child.stdout?.on("data", (chunk) => {
    onData(chunk);
  });
  child.stderr?.on("data", () => {});
  child.on("close", () => {
    state.activeRecorder = null;
    onEnd();
  });
  child.on("error", (err) => {
    logForDebugging(`[voice] arecord recorder spawn error: ${err}`, {
      level: "error",
    });
    state.activeRecorder = null;
    onEnd();
  });
  return true;
}
//@ chunk-ga5txjrx.js:6396-6608 affinity
/**
 * 停止录音（原生或子进程 SIGTERM）。
 */
function stopRecording(host) {
  let state = voiceRecorderStates.of(host);
  if (state.nativeRecordingActive && state.audioNapi) {
    state.audioNapi.stopNativeRecording();
    state.nativeRecordingActive = false;
    return;
  }
  if (state.activeRecorder) {
    state.activeRecorder.kill("SIGTERM");
    state.activeRecorder = null;
  }
}
//@ chunk-g4k0hvs5.js:1135-1437 fingerprint = hasCommand (0.375)
function hasCommand() {
  try {
    resetLocalSettingsGitTrackedCache();
    let gitPath = whichOnPath("git", env.PATH ?? "");
    if (gitPath === null || resolveExecutableSafely("git") === null) return false;
    let result = safeExecFileSync(gitPath, ["--version"], {
      reject: false,
      timeout: SETTINGS_FREEZE_MIN_REFRESH_MS,
      cwd: homedir(),
      stdin: "ignore",
    });
    if (result.exitCode !== 0 || !String(result.stdout).startsWith("git version")) return false;
    return !isLocalSettingsGitTracked({
      onIndeterminate: "untracked",
    });
  } catch (error) {
    logError(toError(error));
    return false;
  }
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/services/voice.js");
export {
  hasCommand,
  killChildWithSignal,
  checkRecordingAvailability,
  checkVoiceDependencies,
  requestMicrophonePermission,
  startRecording,
  stopRecording,
};
