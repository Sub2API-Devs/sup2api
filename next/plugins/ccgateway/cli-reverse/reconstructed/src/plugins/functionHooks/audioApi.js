/**
 * plugins/functionHooks/audioApi.ts
 *
 * 2.1.316 新增：插件 $.audio.play/speak 接口（读取音频片段并播放）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (40)
 * attribution: placement 40
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalize, isAbsolute, join } from "path";
import { mkdtemp, writeFile, rm, readFile } from "fs/promises";
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
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { MAX_KEPT_TEXT_CHARS } from "./sites/siteRules.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3826920-3827140 placement
function resolvePluginAssetPath(root, assetPath) {
  let normalized = normalize(assetPath);
  if (
    assetPath.trim() === "" ||
    isAbsolute(assetPath) ||
    normalized.startsWith("..") ||
    normalized.split(/[\\/]/).includes("..")
  )
    throw new HooksError(
      `$.audio.play: asset must be a path inside the plugin's directory (got ${jsonStringify(assetPath)})`,
    );
  return join(root, normalized);
}
//@ chunk-5xgkngpb.js:3827140-3827156 placement
/**
 * 26214400
 */
var MAX_AUDIO_CLIP_BYTES = 26214400;
//@ chunk-5xgkngpb.js:3827156-3827454 placement
async function resolveAudioAsset(request, assetPath, pluginName) {
  let root = request.root;
  let pluginAssetPath = resolvePluginAssetPath(root, assetPath);
  let fail = (message) =>
    new HooksError(`$.audio.play: could not read ${assetPath} in ${pluginName}'s directory: ` + message);
  let stat;
  try {
    stat = await checkInsidePluginRoot(pluginAssetPath, root, pluginName);
  } catch (error) {
    logForDebugging(`$.audio.play (${pluginName}): ${assetPath} refused: ${errorMessage(error)}`);
    throw fail("no such file");
  }
  if (stat.size > MAX_AUDIO_CLIP_BYTES) throw fail(`the clip is over ${MAX_AUDIO_CLIP_BYTES} bytes`);
  return stat.real;
}
//@ chunk-5xgkngpb.js:3827454-3827725 placement
async function readBodyWithLimit(manualRedirect, maxBytes) {
  let reader = manualRedirect.body?.getReader();
  if (reader === undefined) return new Uint8Array();
  let chunks = [];
  let total = 0;
  for (;;) {
    let { done, value: chunk } = await reader.read();
    if (done) break;
    total += chunk.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HooksError(`the clip is over ${maxBytes} bytes`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
//@ chunk-5xgkngpb.js:3827725-3827967 placement
function audioExtensionForMime(mime) {
  switch (firstLineOf(mime, ";").trim().toLowerCase()) {
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
//@ chunk-5xgkngpb.js:3827967-3827981 placement
/**
 * 30000
 */
var AUDIO_LOAD_TIMEOUT_MS = 30000;
//@ chunk-5xgkngpb.js:3828108-3828123 placement
/**
 * 4194304
 */
var MAX_AUDIO_FILE_BYTES = 4194304;
//@ chunk-5xgkngpb.js:3834818-3835475 placement
async function fetchAudioClip(clip, ctx) {
  let { pluginName } = ctx;
  if (clip.url === undefined)
    return {
      bytes: Buffer.from(clip.base64, "base64"),
      extension: audioExtensionForMime(clip.mime),
      mime: clip.mime,
    };
  let url = checkPluginFetchUrl(clip.url, ctx, "$.audio.play");
  let now = Date.now();
  try {
    let manualRedirect = await fetchManualRedirect(url, {
      method: "GET",
      signal: AbortSignal.timeout(AUDIO_LOAD_TIMEOUT_MS),
    });
    if (!manualRedirect.ok) throw new HooksError(`HTTP ${manualRedirect.status}`);
    let bodyWithLimit = await readBodyWithLimit(manualRedirect, MAX_AUDIO_CLIP_BYTES);
    let mime = manualRedirect.headers.get("content-type") ?? "audio/mpeg";
    logForDebugging(
      `$.audio.play (${pluginName}): fetched ${bodyWithLimit.byteLength} bytes (${mime}) in ${Date.now() - now}ms from ${describeAudioClip(clip)}`,
    );
    return {
      bytes: bodyWithLimit,
      extension: audioExtensionForMime(mime),
      mime,
    };
  } catch (error) {
    logForDebugging(`$.audio.play (${pluginName}): could not fetch ${clip.url}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new HooksError(`$.audio.play: could not fetch the clip: ${errorMessage(error)}`);
  }
}
//@ chunk-5xgkngpb.js:3835475-3835879 placement
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
  let dir = await mkdtemp(join(tmpdir_2(), "claude-audio-"));
  let filePath = join(dir, `clip.${audioClip.extension}`);
  await writeFile(filePath, audioClip.bytes);
  return {
    file: filePath,
    what: `${filePath} (${audioClip.bytes.byteLength} bytes)`,
    cleanup: () =>
      rm(dir, {
        recursive: true,
        force: true,
      }).catch(() => {}),
  };
}
//@ chunk-5xgkngpb.js:3835879-3835890 placement
/**
 * 80
 */
var MAX_FORWARDED_OUTPUT_CHARS = 80;
//@ chunk-5xgkngpb.js:3835890-3836072 placement
function describeAudioClip(clip) {
  let hasAsset = clip.asset === undefined;
  let hasUrl = clip.url === undefined;
  let isLongUrl = !hasUrl && clip.url.length > MAX_FORWARDED_OUTPUT_CHARS;
  return hasAsset
    ? hasUrl
      ? `${clip.mime} ${clip.base64.length} base64 chars`
      : isLongUrl
        ? `${truncateToLength(clip.url, MAX_FORWARDED_OUTPUT_CHARS)}...`
        : clip.url
    : `asset ${clip.asset}`;
}
//@ chunk-5xgkngpb.js:3836072-3836153 placement
/**
 * loop/gain 描述
 */
var audioOptionsText = (request) =>
  `${request.shouldLoop ? " loop" : ""}${request.gain === undefined ? "" : ` gain ${request.gain}`}`;
//@ chunk-5xgkngpb.js:3836194-3836467 placement
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
//@ chunk-5xgkngpb.js:3836467-3836516 placement
/**
 * 中止即 reject 的 Promise
 */
var abortedPromise = (signal) =>
  new Promise((resolve) => {
    forwardAbort(signal, {
      abort: resolve,
    });
  });
//@ chunk-5xgkngpb.js:3836516-3836645 placement
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
//@ chunk-5xgkngpb.js:3836645-3836659 placement
/**
 * 默认音频宿主
 */
var audioHostDefault; // deferred: uses createSerialQueue (./panes.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3836645", () => {
  audioHostDefault = createSerialQueue();
});
//@ chunk-5xgkngpb.js:3836659-3836669 placement
/**
 * 4
 */
var MAX_CONCURRENT_AUDIO = 4;
//@ chunk-5xgkngpb.js:3836709-3837253 placement
var spawnAudioPlayer = ({ command, args, label, what, signal }) =>
  new Promise((resolve, reject) => {
    let child = spawn(command, args, {
      stdio: "ignore",
      windowsHide: true,
      cwd: undefined,
      ...cgroupSpawnOptions("plugin"),
    });
    logForDebugging(`${label}: ${command} ${what} (pid ${child.pid ?? "?"})`);
    let stopped = false;
    function stop() {
      stopped = true;
      child.kill("SIGTERM");
    }
    let unforward = forwardAbort(signal, {
      abort: stop,
    });
    child.once("error", (error) => {
      unforward();
      logForDebugging(`${label}: ${command} failed to start: ${error.message}`, {
        level: "warn",
      });
      reject(new HooksError(`${command} failed to start: ${error.message}`));
    });
    child.once("exit", (code) => {
      unforward();
      logForDebugging(`${label}: ${command} exited ${code ?? "by signal"}${stopped ? " (stopped)" : ""}`);
      if (code === 0 || stopped) resolve();
      else reject(new HooksError(`${command} exited ${code ?? "by signal"}`));
    });
  });
//@ chunk-5xgkngpb.js:3837253-3837276 placement
/**
 * globalThis
 */
var globalThisRef = () => globalThis;
//@ chunk-5xgkngpb.js:3837276-3837289 placement
/**
 * 2500
 */
var AUDIO_START_GRACE_MS = 2500;
//@ chunk-5xgkngpb.js:3837289-3837570 placement
async function waitForVoices(synth) {
  let voices = synth.getVoices();
  if (voices.length > 0 || synth.addEventListener === undefined) return voices;
  await new Promise((resolve) => {
    function onVoicesChanged() {
      clearTimeout(timer);
      synth.removeEventListener?.("voiceschanged", onVoicesChanged);
      resolve();
    }
    synth.addEventListener?.("voiceschanged", onVoicesChanged);
    let timer = setTimeout(onVoicesChanged, AUDIO_START_GRACE_MS);
  });
  return synth.getVoices();
}
//@ chunk-5xgkngpb.js:3837570-3838952 placement
/**
 * 读取音频片段来源（插件目录内资源或 base64 数据）。
 */
async function readAudioClipSource(AudioCtor, { request, pluginName, signal }) {
  let { Blob: BlobCtor, URL: URLCtor, atob: atobFn } = globalThisRef();
  let { clip, pluginStorageId } = request;
  let source;
  let revoke;
  function makeSource({ bytes, mime }) {
    if (BlobCtor !== undefined && URLCtor !== undefined) {
      let objectUrl = URLCtor.createObjectURL(
        new BlobCtor([bytes], {
          type: mime,
        }),
      );
      revoke = () => URLCtor.revokeObjectURL(objectUrl);
      return objectUrl;
    }
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  if (clip.url !== undefined)
    source = makeSource(
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
      source = makeSource({
        bytes: new Uint8Array(await readFile(audioAsset)),
        mime: mimeForAudioFile(audioAsset),
      });
    } catch (error) {
      throw new HooksError(
        `$.audio.play: could not read ${clip.asset} in ${pluginName}'s directory: ${errorMessage(error)}`,
      );
    }
  } else if (atobFn === undefined) source = `data:${clip.mime};base64,${clip.base64}`;
  else {
    let decoded = atobFn(clip.base64);
    let uint8Array = new Uint8Array(decoded.length);
    for (let idx = 0; idx < decoded.length; idx++) uint8Array[idx] = decoded.charCodeAt(idx);
    source = makeSource({
      bytes: uint8Array,
      mime: clip.mime,
    });
  }
  logForDebugging(
    `$.audio.play (${pluginName}): <audio> ${describeAudioClip(clip)}` + audioOptionsText(request),
  );
  return new Promise((resolve, reject) => {
    let audio = new AudioCtor(source);
    if (request.shouldLoop) audio.loop = true;
    if (request.gain !== undefined && "volume" in audio) audio.volume = Math.min(1, request.gain);
    function finish() {
      revoke?.();
      resolve();
    }
    audio.onended = finish;
    if (signal !== undefined)
      abortedPromise(signal).then(() => {
        audio.pause?.();
        finish();
      });
    function fail(reason) {
      revoke?.();
      logForDebugging(`$.audio.play (${pluginName}): ${reason}`, {
        level: "warn",
      });
      reject(new HooksError(`$.audio.play: ${reason}`));
    }
    audio.onerror = () =>
      fail(
        `<audio> could not play ${clip.url ?? clip.asset ?? "the clip"} (blocked by the page's CSP, or not decodable)`,
      );
    audio.play().catch((error) => fail(`<audio>.play() rejected: ${errorMessage(error)}`));
  });
}
//@ chunk-5xgkngpb.js:3838952-3839277 placement
/**
 * 用 macOS afplay 播放音频（可设音量），支持中止并清理临时文件。
 */
async function playWithAfplay({ request, pluginName, signal }) {
  let label = `$.audio.play (${pluginName})`;
  let gainArgs = request.gain === undefined ? [] : ["-v", String(request.gain)];
  let { file, what, cleanup } = await prepareAudioFile(request, pluginName);
  try {
    do {
      if (signal?.aborted) return;
      await spawnAudioPlayer({
        command: "afplay",
        args: [...gainArgs, file],
        label,
        what,
        signal,
      });
    } while (request.shouldLoop && signal !== undefined && !signal.aborted);
  } finally {
    await cleanup();
  }
}
//@ chunk-5xgkngpb.js:3839277-3839541 placement
function playAudioClip(request, pluginName, signal) {
  let { Audio } = globalThisRef();
  if (typeof Audio === "function")
    return readAudioClipSource(Audio, {
      request,
      pluginName,
      signal,
    });
  if (getPlatform() === "macos")
    return playWithAfplay({
      request,
      pluginName,
      signal,
    });
  logForDebugging(`$.audio.play (${pluginName}): no audio player on ${getPlatform()}; not played`);
  return Promise.resolve();
}
//@ chunk-5xgkngpb.js:3839541-3840840 placement
/**
 * 校验 $.audio.play 的片段参数：只能是 { asset }、{ url } 或 { base64 } 之一。
 */
function validateAudioClip(args) {
  if (!isPlainObject_6(args) || !isPlainObject_6(args.clip))
    throw new HooksError("$.audio.play: clip must be { asset }, { url } or { base64, mime }");
  let clip = args.clip;
  let filtered = ["asset", "url", "base64"].filter((key) => clip[key] !== undefined);
  let given = filtered[0];
  if (given === undefined || filtered.length !== 1)
    throw new HooksError(
      `$.audio.play: clip must carry exactly one of asset, url, base64 (got ${filtered.length === 0 ? "none" : filtered.join(" and ")})`,
    );
  if (typeof clip[given] !== "string" || clip[given] === "")
    throw new HooksError(`$.audio.play: clip.${given} must be a non-empty string`);
  if (given === "base64") {
    if (typeof clip.mime !== "string")
      throw new HooksError("$.audio.play: clip.mime must accompany clip.base64");
    if (typeof clip.base64 === "string" && Buffer.byteLength(clip.base64, "base64") > MAX_AUDIO_CLIP_BYTES)
      throw new HooksError(`$.audio.play: the clip is over ${MAX_AUDIO_CLIP_BYTES} bytes`);
  }
  if (given === "asset") {
    if (typeof clip.asset !== "string") throw new HooksError("$.audio.play: clip.asset must be a string");
    if (typeof args.root !== "string") throw new HooksError("$.audio.play: the plugin has no directory");
    resolvePluginAssetPath(args.root, clip.asset);
  }
  if (given === "url" && typeof args.pluginStorageId !== "string")
    throw new HooksError("$.audio.play: the plugin has no id");
  if (args.shouldLoop !== undefined && typeof args.shouldLoop !== "boolean")
    throw new HooksError("$.audio.play: options.shouldLoop must be a boolean");
  if (
    args.gain !== undefined &&
    (typeof args.gain !== "number" ||
      !Number.isFinite(args.gain) ||
      args.gain < 0 ||
      args.gain > MAX_CONCURRENT_AUDIO)
  )
    throw new HooksError(`$.audio.play: options.gain must be a number from 0 to ${MAX_CONCURRENT_AUDIO}`);
}
//@ chunk-5xgkngpb.js:3840840-3840957 placement
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
//@ chunk-5xgkngpb.js:3840957-3840971 placement
/**
 * 音频覆盖配置
 */
var audioOverrides; // deferred: uses createAudioOverrides of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3840957", () => {
  audioOverrides = createAudioOverrides();
});
//@ chunk-5xgkngpb.js:3840971-3841086 placement
function playValidatedClip(request, pluginName, signal) {
  try {
    validateAudioClip(request);
    checkAudioUrlAllowed(request, pluginName);
  } catch (error) {
    return Promise.reject(error);
  }
  return (audioOverrides.playerOverride() ?? playAudioClip)(request, pluginName, signal);
}
//@ chunk-5xgkngpb.js:3841086-3841099 placement
/**
 * "--"
 */
var STDIN_DASH = "--";
//@ chunk-5xgkngpb.js:3841099-3841255 placement
function describeSpeechError(event) {
  let error = event?.error ?? "error";
  return `speechSynthesis failed the utterance: ${error}${error === "not-allowed" ? " (the page has had no user gesture yet)" : ""}`;
}
//@ chunk-5xgkngpb.js:3841255-3842158 placement
/**
 * 插件 $.audio.speak：用系统语音朗读文本，找不到指定语音时警告。
 */
async function audioSpeakForPlugin({ synth, Utterance }, { request, pluginName, signal }) {
  let label = `$.audio.speak (${pluginName})`;
  function fail(reason) {
    logForDebugging(`${label}: ${reason}`, {
      level: "warn",
    });
    return new HooksError(`$.audio.speak: ${reason}`);
  }
  let voice = null;
  if (request.voice !== undefined) {
    let voices = await waitForVoices(synth);
    voice = voices.find((candidate) => candidate.name === request.voice) ?? null;
    if (voice === null)
      throw fail(
        `no system voice named "${request.voice}" among the ${voices.length} the browser lists (a voice installed after the browser started is listed after a browser restart)`,
      );
  }
  logForDebugging(
    `${label}: speechSynthesis, voice ${voice === null ? "default" : `"${voice.name}"`}, ${request.text.length} chars`,
  );
  let now = Date.now();
  return new Promise((resolve, reject) => {
    let utterance = new Utterance(request.text);
    if (voice !== null) utterance.voice = voice;
    let settled = false;
    utterance.onend = () => {
      settled = true;
      logForDebugging(`${label}: ended after ${Date.now() - now}ms`);
      resolve({
        via: "system",
      });
    };
    utterance.onerror = (event) => {
      settled = true;
      reject(fail(describeSpeechError(event)));
    };
    if (signal !== undefined)
      abortedPromise(signal).then(() => {
        if (!settled) {
          synth.cancel();
          reject(signal.reason);
        }
      });
    try {
      synth.speak(utterance);
    } catch (error) {
      reject(fail(`speechSynthesis.speak threw: ${errorMessage(error)}`));
    }
  });
}
//@ chunk-5xgkngpb.js:3842158-3842416 placement
async function speakWithSay(request, pluginName, signal) {
  await spawnAudioPlayer({
    command: "say",
    args: [...(request.voice === undefined ? [] : ["-v", request.voice]), STDIN_DASH, request.text],
    label: `$.audio.speak (${pluginName})`,
    what: `${request.voice === undefined ? "" : `-v ${request.voice} `}${request.text.length} chars`,
    signal,
  });
  signal?.throwIfAborted();
  return {
    via: "system",
  };
}
//@ chunk-5xgkngpb.js:3842416-3842786 placement
/**
 * 用语音合成朗读文本（有 speechSynthesis 时），否则交给后备实现。
 */
function speakText(request, pluginName, signal) {
  let { speechSynthesis, SpeechSynthesisUtterance } = globalThisRef();
  if (speechSynthesis !== undefined && typeof SpeechSynthesisUtterance === "function")
    return audioSpeakForPlugin(
      {
        synth: speechSynthesis,
        Utterance: SpeechSynthesisUtterance,
      },
      {
        request,
        pluginName,
        signal,
      },
    );
  if (getPlatform() === "macos") return speakWithSay(request, pluginName, signal);
  logForDebugging(`$.audio.speak (${pluginName}): no speech synthesizer on ${getPlatform()}`, {
    level: "warn",
  });
  return Promise.reject(new HooksError(`$.audio.speak: no speech synthesizer on ${getPlatform()}`));
}
//@ chunk-5xgkngpb.js:3842786-3842854 placement
/**
 * 截断朗读文本
 */
function clampSpeakText(request) {
  return request.text.length <= MAX_KEPT_TEXT_CHARS
    ? request
    : {
        ...request,
        text: truncateToLength(request.text, MAX_KEPT_TEXT_CHARS),
      };
}
//@ chunk-5xgkngpb.js:3842854-3843165 placement
/**
 * 校验 $.audio.speak 参数：text 必须是非空字符串，其余选项类型正确。
 */
function checkSpeakArgs(args) {
  if (!isPlainObject_6(args)) throw new HooksError("$.audio.speak: text must be a non-empty string");
  if (typeof args.text !== "string" || args.text.trim() === "")
    throw new HooksError("$.audio.speak: text must be a non-empty string");
  if (args.voice !== undefined && typeof args.voice !== "string")
    throw new HooksError("$.audio.speak: voice must be a string when given");
}
//@ chunk-5xgkngpb.js:3843165-3843319 placement
/**
 * $.audio.speak 实现：校验参数，串行执行朗读（可被覆盖的朗读器，默认系统语音）。
 */
function audioSpeakOp(args, plugin, signal) {
  try {
    checkSpeakArgs(args);
  } catch (error) {
    return Promise.reject(error);
  }
  let secondPlugin = audioOverrides.speakerOverride() ?? speakText;
  let secondSignal = clampSpeakText(args);
  return audioHostDefault(() => {
    signal?.throwIfAborted();
    return secondPlugin(secondSignal, plugin, signal);
  });
}
//@ chunk-5xgkngpb.js:3843319-3843334 placement
/**
 * 600000
 */
var MAX_LOOP_AUDIO_MS = 600000;
//@ chunk-5xgkngpb.js:3843334-3843344 placement
/**
 * 4
 */
var MAX_AUDIO_PER_PLUGIN = 4;
//@ chunk-5xgkngpb.js:3843344-3843434 placement
/**
 * 合并中止信号与超时
 */
function withTimeoutSignal(signal, ms) {
  let timeout = AbortSignal.timeout(ms);
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
}
//@ chunk-5xgkngpb.js:3843434-3843785 placement
/**
 * $.audio.play 宿主：每插件同时最多 4 个播放，循环播放有总时长上限。
 */
function createAudioPlayer(loopMs = MAX_LOOP_AUDIO_MS) {
  let running = new Map();
  return {
    play: async (request, pluginName, signal) => {
      let count = running.get(pluginName) ?? 0;
      if (count >= MAX_AUDIO_PER_PLUGIN)
        throw new HooksError(
          `${pluginName}: $.audio.play: refused: ${MAX_AUDIO_PER_PLUGIN} plays are going at once`,
        );
      running.set(pluginName, count + 1);
      let effectiveSignal = request.shouldLoop ? withTimeoutSignal(signal, loopMs) : signal;
      try {
        await playValidatedClip(request, pluginName, effectiveSignal);
      } finally {
        running.set(pluginName, (running.get(pluginName) ?? 1) - 1);
      }
      if (effectiveSignal?.aborted === true && signal?.aborted !== true)
        logForDebugging(`$.audio.play (${pluginName}): the loop ended at ${loopMs}ms`);
    },
  };
}
export { audioSpeakOp, MAX_AUDIO_FILE_BYTES, createAudioPlayer };
