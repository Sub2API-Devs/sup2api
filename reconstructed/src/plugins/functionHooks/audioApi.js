/**
 * plugins/functionHooks/audioApi.ts
 *
 * 2.1.316 新增：插件 $.audio.play/speak 接口（读取音频片段并播放）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (40)
 * attribution: placement 40
 */
import { normalize, isAbsolute, join } from "path";
import { mkdtemp, writeFile, rm as rm_2, readFile } from "fs/promises";
import { tmpdir as tmpdir_2 } from "os";
import { spawn } from "child_process";
import { HooksError } from "./hooksErrors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { checkInsidePluginRoot } from "./moduleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { firstLineOf, truncateToLength } from "../../utils/stringUtils.js";
import { checkPluginFetchUrl, fetchManualRedirect } from "./httpApi.js";
import { forwardAbort } from "./dispatch/chain.js";
import { createSerialQueue } from "./panes.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { getPlatform } from "../../utils/platform.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { MAX_KEPT_TEXT_CHARS } from "./sites/siteRules.js";

//@ chunk-e6aww6q8.js:3731186-3731406 placement
function resolvePluginAssetPath(root, n) {
  let r = normalize(n);
  if (n.trim() === "" || isAbsolute(n) || r.startsWith("..") || r.split(/[\\/]/).includes(".."))
    throw new HooksError(
      `$.audio.play: asset must be a path inside the plugin's directory (got ${jsonStringify(n)})`,
    );
  return join(root, r);
}
//@ chunk-e6aww6q8.js:3731406-3731422 placement
/**
 * 26214400
 */
var MAX_AUDIO_CLIP_BYTES = 26214400;
//@ chunk-e6aww6q8.js:3731422-3731720 placement
async function resolveAudioAsset(e, asset, r) {
  let root = e.root;
  let pluginAssetPath = resolvePluginAssetPath(root, asset);
  let y = (w) => new HooksError(`$.audio.play: could not read ${asset} in ${r}'s directory: ` + w);
  let S;
  try {
    S = await checkInsidePluginRoot(pluginAssetPath, root, r);
  } catch (error) {
    logForDebugging(`$.audio.play (${r}): ${asset} refused: ${errorMessage(error)}`);
    throw y("no such file");
  }
  if (S.size > MAX_AUDIO_CLIP_BYTES) throw y(`the clip is over ${MAX_AUDIO_CLIP_BYTES} bytes`);
  return S.real;
}
//@ chunk-e6aww6q8.js:3731720-3731991 placement
async function readBodyWithLimit(manualRedirect, n) {
  let reader = manualRedirect.body?.getReader();
  if (reader === undefined) return new Uint8Array();
  let s = [];
  let h = 0;
  for (;;) {
    let { done: y, value: S } = await reader.read();
    if (y) break;
    h += S.byteLength;
    if (h > n) {
      await reader.cancel();
      throw new HooksError(`the clip is over ${n} bytes`);
    }
    s.push(S);
  }
  return Buffer.concat(s);
}
//@ chunk-e6aww6q8.js:3731991-3732233 placement
function audioExtensionForMime(e) {
  switch (firstLineOf(e, ";").trim().toLowerCase()) {
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return "wav";
    case "audio/aac":
      return "aac";
    case "audio/ogg":
      return "ogg";
    default:
      return "audio";
  }
}
//@ chunk-e6aww6q8.js:3732233-3732247 placement
/**
 * 30000
 */
var AUDIO_LOAD_TIMEOUT_MS = 30000;
//@ chunk-e6aww6q8.js:3732374-3732389 placement
/**
 * 4194304
 */
var MAX_AUDIO_FILE_BYTES = 4194304;
//@ chunk-e6aww6q8.js:3739084-3739741 placement
async function fetchAudioClip(clip, n) {
  let { pluginName } = n;
  if (clip.url === undefined)
    return {
      bytes: Buffer.from(clip.base64, "base64"),
      extension: audioExtensionForMime(clip.mime),
      mime: clip.mime,
    };
  let s = checkPluginFetchUrl(clip.url, n, "$.audio.play");
  let now = Date.now();
  try {
    let manualRedirect = await fetchManualRedirect(s, {
      method: "GET",
      signal: AbortSignal.timeout(AUDIO_LOAD_TIMEOUT_MS),
    });
    if (!manualRedirect.ok) throw new HooksError(`HTTP ${manualRedirect.status}`);
    let bodyWithLimit = await readBodyWithLimit(manualRedirect, MAX_AUDIO_CLIP_BYTES);
    let w = manualRedirect.headers.get("content-type") ?? "audio/mpeg";
    logForDebugging(
      `$.audio.play (${pluginName}): fetched ${bodyWithLimit.byteLength} bytes (${w}) in ${Date.now() - now}ms from ${describeAudioClip(clip)}`,
    );
    return {
      bytes: bodyWithLimit,
      extension: audioExtensionForMime(w),
      mime: w,
    };
  } catch (error) {
    logForDebugging(`$.audio.play (${pluginName}): could not fetch ${clip.url}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new HooksError(`$.audio.play: could not fetch the clip: ${errorMessage(error)}`);
  }
}
//@ chunk-e6aww6q8.js:3739741-3740145 placement
/**
 * 准备要播放的音频文件：插件资源直接使用，否则把数据写入临时文件并返回清理函数。
 */
async function prepareAudioFile(request, pluginName) {
  let { clip, pluginStorageId } = request;
  if (clip.asset !== undefined)
    return {
      file: await resolveAudioAsset(request, clip.asset, pluginName),
      what: clip.asset,
      cleanup: async () => {},
    };
  let audioClip = await fetchAudioClip(clip, {
    pluginName,
    pluginStorageId,
  });
  let y = await mkdtemp(join(tmpdir_2(), "claude-audio-"));
  let S = join(y, `clip.${audioClip.extension}`);
  await writeFile(S, audioClip.bytes);
  return {
    file: S,
    what: `${S} (${audioClip.bytes.byteLength} bytes)`,
    cleanup: () =>
      rm_2(y, {
        recursive: true,
        force: true,
      }).catch(() => {}),
  };
}
//@ chunk-e6aww6q8.js:3740145-3740156 placement
/**
 * 80
 */
var MAX_FORWARDED_OUTPUT_CHARS = 80;
//@ chunk-e6aww6q8.js:3740156-3740339 placement
function describeAudioClip(e) {
  let n = e.asset === undefined;
  let r = e.url === undefined;
  let s = !r && e.url.length > MAX_FORWARDED_OUTPUT_CHARS;
  return n
    ? r
      ? `${e.mime} ${e.base64.length} base64 chars`
      : s
        ? `${truncateToLength(e.url, MAX_FORWARDED_OUTPUT_CHARS)}...`
        : e.url
    : `asset ${e.asset}`;
}
//@ chunk-e6aww6q8.js:3740339-3740420 placement
/**
 * loop/gain 描述
 */
var audioOptionsText = (request) =>
  `${request.shouldLoop ? " loop" : ""}${request.gain === undefined ? "" : ` gain ${request.gain}`}`;
//@ chunk-e6aww6q8.js:3740461-3740734 placement
function mimeForAudioFile(audioAsset) {
  switch (audioAsset.slice(audioAsset.lastIndexOf(".") + 1).toLowerCase()) {
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "aac":
    case "m4a":
      return "audio/aac";
    case "webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}
//@ chunk-e6aww6q8.js:3740734-3740783 placement
/**
 * 中止即 reject 的 Promise
 */
var abortedPromise = (signal) =>
  new Promise((resolve) => {
    forwardAbort(signal, {
      abort: resolve,
    });
  });
//@ chunk-e6aww6q8.js:3740783-3740912 placement
function checkAudioUrlAllowed({ clip, pluginStorageId }, pluginName) {
  if (typeof clip.url === "string")
    checkPluginFetchUrl(
      clip.url,
      {
        pluginName,
        pluginStorageId,
      },
      "$.audio.play",
    );
}
//@ chunk-e6aww6q8.js:3740912-3740926 placement
/**
 * 默认音频宿主
 */
var audioHostDefault = createSerialQueue();
//@ chunk-e6aww6q8.js:3740926-3740936 placement
/**
 * 4
 */
var MAX_CONCURRENT_AUDIO = 4;
//@ chunk-e6aww6q8.js:3740976-3741513 placement
var spawnAudioPlayer = ({ command, args, label, what, signal }) =>
  new Promise((resolve, reject) => {
    let w = spawn(command, args, {
      stdio: "ignore",
      windowsHide: true,
      cwd: undefined,
      ...cgroupSpawnOptions("plugin"),
    });
    logForDebugging(`${label}: ${command} ${what} (pid ${w.pid ?? "?"})`);
    let L = false;
    function G() {
      L = true;
      w.kill("SIGTERM");
    }
    let q = forwardAbort(signal, {
      abort: G,
    });
    w.once("error", (Z) => {
      q();
      logForDebugging(`${label}: ${command} failed to start: ${Z.message}`, {
        level: "warn",
      });
      reject(new HooksError(`${command} failed to start: ${Z.message}`));
    });
    w.once("exit", (Z) => {
      q();
      logForDebugging(`${label}: ${command} exited ${Z ?? "by signal"}${L ? " (stopped)" : ""}`);
      if (Z === 0 || L) resolve();
      else reject(new HooksError(`${command} exited ${Z ?? "by signal"}`));
    });
  });
//@ chunk-e6aww6q8.js:3741513-3741536 placement
/**
 * globalThis
 */
var globalThisRef = () => globalThis;
//@ chunk-e6aww6q8.js:3741536-3741549 placement
/**
 * 2500
 */
var AUDIO_START_GRACE_MS = 2500;
//@ chunk-e6aww6q8.js:3741549-3741830 placement
async function waitForVoices(synth) {
  let voices = synth.getVoices();
  if (voices.length > 0 || synth.addEventListener === undefined) return voices;
  await new Promise((resolve) => {
    function s() {
      clearTimeout(timer);
      synth.removeEventListener?.("voiceschanged", s);
      resolve();
    }
    synth.addEventListener?.("voiceschanged", s);
    let timer = setTimeout(s, AUDIO_START_GRACE_MS);
  });
  return synth.getVoices();
}
//@ chunk-e6aww6q8.js:3741830-3743208 placement
/**
 * 读取音频片段来源（插件目录内资源或 base64 数据）。
 */
async function readAudioClipSource(e, { request, pluginName, signal }) {
  let { Blob: h, URL: y, atob: S } = globalThisRef();
  let { clip, pluginStorageId } = request;
  let G;
  let q;
  function Z({ bytes, mime }) {
    if (h !== undefined && y !== undefined) {
      let we = y.createObjectURL(
        new h([bytes], {
          type: mime,
        }),
      );
      q = () => y.revokeObjectURL(we);
      return we;
    }
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  if (clip.url !== undefined)
    G = Z(
      await fetchAudioClip(
        {
          url: clip.url,
        },
        {
          pluginName,
          pluginStorageId,
        },
      ),
    );
  else if (clip.asset !== undefined) {
    let audioAsset = await resolveAudioAsset(request, clip.asset, pluginName);
    try {
      G = Z({
        bytes: new Uint8Array(await readFile(audioAsset)),
        mime: mimeForAudioFile(audioAsset),
      });
    } catch (error) {
      throw new HooksError(
        `$.audio.play: could not read ${clip.asset} in ${pluginName}'s directory: ${errorMessage(error)}`,
      );
    }
  } else if (S === undefined) G = `data:${clip.mime};base64,${clip.base64}`;
  else {
    let Se = S(clip.base64);
    let uint8Array = new Uint8Array(Se.length);
    for (let idx = 0; idx < Se.length; idx++) uint8Array[idx] = Se.charCodeAt(idx);
    G = Z({
      bytes: uint8Array,
      mime: clip.mime,
    });
  }
  logForDebugging(
    `$.audio.play (${pluginName}): <audio> ${describeAudioClip(clip)}` + audioOptionsText(request),
  );
  return new Promise((resolve, reject) => {
    let we = new e(G);
    if (request.shouldLoop) we.loop = true;
    if (request.gain !== undefined && "volume" in we) we.volume = Math.min(1, request.gain);
    function Ee() {
      q?.();
      resolve();
    }
    we.onended = Ee;
    if (signal !== undefined)
      abortedPromise(signal).then(() => {
        we.pause?.();
        Ee();
      });
    function Ae(Ie) {
      q?.();
      logForDebugging(`$.audio.play (${pluginName}): ${Ie}`, {
        level: "warn",
      });
      reject(new HooksError(`$.audio.play: ${Ie}`));
    }
    we.onerror = () =>
      Ae(
        `<audio> could not play ${clip.url ?? clip.asset ?? "the clip"} (blocked by the page's CSP, or not decodable)`,
      );
    we.play().catch((error) => Ae(`<audio>.play() rejected: ${errorMessage(error)}`));
  });
}
//@ chunk-e6aww6q8.js:3743208-3743533 placement
/**
 * 用 macOS afplay 播放音频（可设音量），支持中止并清理临时文件。
 */
async function playWithAfplay({ request, pluginName, signal }) {
  let label = `$.audio.play (${pluginName})`;
  let h = request.gain === undefined ? [] : ["-v", String(request.gain)];
  let { file, what, cleanup } = await prepareAudioFile(request, pluginName);
  try {
    do {
      if (signal?.aborted) return;
      await spawnAudioPlayer({
        command: "afplay",
        args: [...h, file],
        label,
        what,
        signal,
      });
    } while (request.shouldLoop && signal !== undefined && !signal.aborted);
  } finally {
    await cleanup();
  }
}
//@ chunk-e6aww6q8.js:3743533-3743797 placement
function playAudioClip(request, n, signal) {
  let { Audio } = globalThisRef();
  if (typeof Audio === "function")
    return readAudioClipSource(Audio, {
      request,
      pluginName: n,
      signal,
    });
  if (getPlatform() === "macos")
    return playWithAfplay({
      request,
      pluginName: n,
      signal,
    });
  logForDebugging(`$.audio.play (${n}): no audio player on ${getPlatform()}; not played`);
  return Promise.resolve();
}
//@ chunk-e6aww6q8.js:3743797-3745096 placement
/**
 * 校验 $.audio.play 的片段参数：只能是 { asset }、{ url } 或 { base64 } 之一。
 */
function validateAudioClip(e) {
  if (!isPlainObject_5(e) || !isPlainObject_5(e.clip))
    throw new HooksError("$.audio.play: clip must be { asset }, { url } or { base64, mime }");
  let clip = e.clip;
  let filtered = ["asset", "url", "base64"].filter((S) => clip[S] !== undefined);
  let s = filtered[0];
  if (s === undefined || filtered.length !== 1)
    throw new HooksError(
      `$.audio.play: clip must carry exactly one of asset, url, base64 (got ${filtered.length === 0 ? "none" : filtered.join(" and ")})`,
    );
  if (typeof clip[s] !== "string" || clip[s] === "")
    throw new HooksError(`$.audio.play: clip.${s} must be a non-empty string`);
  if (s === "base64") {
    if (typeof clip.mime !== "string")
      throw new HooksError("$.audio.play: clip.mime must accompany clip.base64");
    if (typeof clip.base64 === "string" && Buffer.byteLength(clip.base64, "base64") > MAX_AUDIO_CLIP_BYTES)
      throw new HooksError(`$.audio.play: the clip is over ${MAX_AUDIO_CLIP_BYTES} bytes`);
  }
  if (s === "asset") {
    if (typeof clip.asset !== "string") throw new HooksError("$.audio.play: clip.asset must be a string");
    if (typeof e.root !== "string") throw new HooksError("$.audio.play: the plugin has no directory");
    resolvePluginAssetPath(e.root, clip.asset);
  }
  if (s === "url" && typeof e.pluginStorageId !== "string")
    throw new HooksError("$.audio.play: the plugin has no id");
  if (e.shouldLoop !== undefined && typeof e.shouldLoop !== "boolean")
    throw new HooksError("$.audio.play: options.shouldLoop must be a boolean");
  if (
    e.gain !== undefined &&
    (typeof e.gain !== "number" || !Number.isFinite(e.gain) || e.gain < 0 || e.gain > MAX_CONCURRENT_AUDIO)
  )
    throw new HooksError(`$.audio.play: options.gain must be a number from 0 to ${MAX_CONCURRENT_AUDIO}`);
}
//@ chunk-e6aww6q8.js:3745096-3745213 placement
function createAudioOverrides() {
  let valueSlot = createValueSlot();
  let valueSlot_2 = createValueSlot();
  return {
    setPlayer: valueSlot.set,
    playerOverride: valueSlot.get,
    setSpeaker: valueSlot_2.set,
    speakerOverride: valueSlot_2.get,
  };
}
//@ chunk-e6aww6q8.js:3745213-3745227 placement
/**
 * 音频覆盖配置
 */
var audioOverrides = createAudioOverrides();
//@ chunk-e6aww6q8.js:3745227-3745342 placement
function playValidatedClip(e, pluginName, r) {
  try {
    validateAudioClip(e);
    checkAudioUrlAllowed(e, pluginName);
  } catch (error) {
    return Promise.reject(error);
  }
  return (audioOverrides.playerOverride() ?? playAudioClip)(e, pluginName, r);
}
//@ chunk-e6aww6q8.js:3745342-3745355 placement
/**
 * "--"
 */
var STDIN_DASH = "--";
//@ chunk-e6aww6q8.js:3745355-3745511 placement
function describeSpeechError(e) {
  let error = e?.error ?? "error";
  return `speechSynthesis failed the utterance: ${error}${error === "not-allowed" ? " (the page has had no user gesture yet)" : ""}`;
}
//@ chunk-e6aww6q8.js:3745511-3746409 placement
/**
 * 插件 $.audio.speak：用系统语音朗读文本，找不到指定语音时警告。
 */
async function audioSpeakForPlugin({ synth, Utterance }, { request, pluginName, signal }) {
  let y = `$.audio.speak (${pluginName})`;
  function S(G) {
    logForDebugging(`${y}: ${G}`, {
      level: "warn",
    });
    return new HooksError(`$.audio.speak: ${G}`);
  }
  let w = null;
  if (request.voice !== undefined) {
    let G = await waitForVoices(synth);
    w = G.find((q) => q.name === request.voice) ?? null;
    if (w === null)
      throw S(
        `no system voice named "${request.voice}" among the ${G.length} the browser lists (a voice installed after the browser started is listed after a browser restart)`,
      );
  }
  logForDebugging(
    `${y}: speechSynthesis, voice ${w === null ? "default" : `"${w.name}"`}, ${request.text.length} chars`,
  );
  let now = Date.now();
  return new Promise((resolve, reject) => {
    let Z = new Utterance(request.text);
    if (w !== null) Z.voice = w;
    let Se = false;
    Z.onend = () => {
      Se = true;
      logForDebugging(`${y}: ended after ${Date.now() - now}ms`);
      resolve({
        via: "system",
      });
    };
    Z.onerror = (ke) => {
      Se = true;
      reject(S(describeSpeechError(ke)));
    };
    if (signal !== undefined)
      abortedPromise(signal).then(() => {
        if (!Se) {
          synth.cancel();
          reject(signal.reason);
        }
      });
    try {
      synth.speak(Z);
    } catch (error) {
      reject(S(`speechSynthesis.speak threw: ${errorMessage(error)}`));
    }
  });
}
//@ chunk-e6aww6q8.js:3746409-3746667 placement
async function speakWithSay(e, n, r) {
  await spawnAudioPlayer({
    command: "say",
    args: [...(e.voice === undefined ? [] : ["-v", e.voice]), STDIN_DASH, e.text],
    label: `$.audio.speak (${n})`,
    what: `${e.voice === undefined ? "" : `-v ${e.voice} `}${e.text.length} chars`,
    signal: r,
  });
  r?.throwIfAborted();
  return {
    via: "system",
  };
}
//@ chunk-e6aww6q8.js:3746667-3747037 placement
/**
 * 用语音合成朗读文本（有 speechSynthesis 时），否则交给后备实现。
 */
function speakText(e, n, r) {
  let { speechSynthesis, SpeechSynthesisUtterance } = globalThisRef();
  if (speechSynthesis !== undefined && typeof SpeechSynthesisUtterance === "function")
    return audioSpeakForPlugin(
      {
        synth: speechSynthesis,
        Utterance: SpeechSynthesisUtterance,
      },
      {
        request: e,
        pluginName: n,
        signal: r,
      },
    );
  if (getPlatform() === "macos") return speakWithSay(e, n, r);
  logForDebugging(`$.audio.speak (${n}): no speech synthesizer on ${getPlatform()}`, {
    level: "warn",
  });
  return Promise.reject(new HooksError(`$.audio.speak: no speech synthesizer on ${getPlatform()}`));
}
//@ chunk-e6aww6q8.js:3747037-3747106 placement
/**
 * 截断朗读文本
 */
function clampSpeakText(e) {
  return e.text.length <= MAX_KEPT_TEXT_CHARS
    ? e
    : {
        ...e,
        text: truncateToLength(e.text, MAX_KEPT_TEXT_CHARS),
      };
}
//@ chunk-e6aww6q8.js:3747106-3747417 placement
/**
 * 校验 $.audio.speak 参数：text 必须是非空字符串，其余选项类型正确。
 */
function checkSpeakArgs(e) {
  if (!isPlainObject_5(e)) throw new HooksError("$.audio.speak: text must be a non-empty string");
  if (typeof e.text !== "string" || e.text.trim() === "")
    throw new HooksError("$.audio.speak: text must be a non-empty string");
  if (e.voice !== undefined && typeof e.voice !== "string")
    throw new HooksError("$.audio.speak: voice must be a string when given");
}
//@ chunk-e6aww6q8.js:3747417-3747571 placement
/**
 * $.audio.speak 实现：校验参数，串行执行朗读（可被覆盖的朗读器，默认系统语音）。
 */
function audioSpeakOp(e, plugin, signal) {
  try {
    checkSpeakArgs(e);
  } catch (error) {
    return Promise.reject(error);
  }
  let s = audioOverrides.speakerOverride() ?? speakText;
  let h = clampSpeakText(e);
  return audioHostDefault(() => {
    signal?.throwIfAborted();
    return s(h, plugin, signal);
  });
}
//@ chunk-e6aww6q8.js:3747571-3747586 placement
/**
 * 600000
 */
var MAX_LOOP_AUDIO_MS = 600000;
//@ chunk-e6aww6q8.js:3747586-3747596 placement
/**
 * 4
 */
var MAX_AUDIO_PER_PLUGIN = 4;
//@ chunk-e6aww6q8.js:3747596-3747686 placement
/**
 * 合并中止信号与超时
 */
function withTimeoutSignal(e, n) {
  let r = AbortSignal.timeout(n);
  return e === undefined ? r : AbortSignal.any([e, r]);
}
//@ chunk-e6aww6q8.js:3747686-3748037 placement
/**
 * $.audio.play 宿主：每插件同时最多 4 个播放，循环播放有总时长上限。
 */
function createAudioPlayer(e = MAX_LOOP_AUDIO_MS) {
  let n = new Map();
  return {
    play: async (r, s, h) => {
      let y = n.get(s) ?? 0;
      if (y >= MAX_AUDIO_PER_PLUGIN)
        throw new HooksError(`${s}: $.audio.play: refused: ${MAX_AUDIO_PER_PLUGIN} plays are going at once`);
      n.set(s, y + 1);
      let S = r.shouldLoop ? withTimeoutSignal(h, e) : h;
      try {
        await playValidatedClip(r, s, S);
      } finally {
        n.set(s, (n.get(s) ?? 1) - 1);
      }
      if (S?.aborted === true && h?.aborted !== true)
        logForDebugging(`$.audio.play (${s}): the loop ended at ${e}ms`);
    },
  };
}
export { MAX_AUDIO_FILE_BYTES, audioSpeakOp, createAudioPlayer };
