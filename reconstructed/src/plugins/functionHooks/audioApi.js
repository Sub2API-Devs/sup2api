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
import {
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  mkdtemp as mkdtemp_5,
  mkdtemp as mkdtemp_6,
  mkdtemp as mkdtemp_7,
  mkdtemp as mkdtemp_8,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import {
  tmpdir as tmpdir_2,
  tmpdir as tmpdir_3,
  tmpdir as tmpdir_4,
  tmpdir as tmpdir_5,
  tmpdir as tmpdir_6,
} from "os";
import { spawn, spawn as spawn_2, spawn as spawn_3 } from "child_process";
import { HooksError } from "./hooksErrors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { checkInsidePluginRoot } from "./moduleLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { firstLineOf, truncateToLength } from "../../utils/stringUtils.js";
import { checkPluginFetchUrl, fetchManualRedirect } from "./httpApi.js";
import { forwardAbort } from "./dispatch/chain.js";
import { bqe } from "./panes.js";
import { Nd } from "../../utils/toolCgroup.js";
import { getPlatform } from "../../utils/platform.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { to } from "../../utils/valueSlot.js";
import { cR } from "./sites/siteRules.js";

//@ chunk-e6aww6q8.js:3731186-3731406 placement
function resolvePluginAssetPath(e, n) {
  let r = normalize_9(n);
  if (n.trim() === "" || isAbsolute_49(n) || r.startsWith("..") || r.split(/[\\/]/).includes(".."))
    throw new HooksError(
      `$.audio.play: asset must be a path inside the plugin's directory (got ${jsonStringify(n)})`,
    );
  return join_96(e, r);
}
//@ chunk-e6aww6q8.js:3731406-3731422 placement
var uY = 26214400;
//@ chunk-e6aww6q8.js:3731422-3731720 placement
async function resolveAudioAsset(e, n, r) {
  let root = e.root,
    h = resolvePluginAssetPath(root, n),
    y = (w) => new HooksError(`$.audio.play: could not read ${n} in ${r}'s directory: ` + w),
    S;
  try {
    S = await checkInsidePluginRoot(h, root, r);
  } catch (error) {
    throw (logForDebugging(`$.audio.play (${r}): ${n} refused: ${errorMessage(error)}`), y("no such file"));
  }
  if (S.size > uY) throw y(`the clip is over ${uY} bytes`);
  return S.real;
}
//@ chunk-e6aww6q8.js:3731720-3731991 placement
async function readBodyWithLimit(e, n) {
  let r = e.body?.getReader();
  if (r === void 0) return new Uint8Array();
  let s = [],
    h = 0;
  for (;;) {
    let { done: y, value: S } = await r.read();
    if (y) break;
    if (((h += S.byteLength), h > n)) throw (await r.cancel(), new HooksError(`the clip is over ${n} bytes`));
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
var q$r = 30000;
//@ chunk-e6aww6q8.js:3732374-3732389 placement
var cY = 4194304;
//@ chunk-e6aww6q8.js:3739084-3739741 placement
async function fetchAudioClip(e, n) {
  let { pluginName: pluginName } = n;
  if (e.url === void 0)
    return { bytes: Buffer.from(e.base64, "base64"), extension: audioExtensionForMime(e.mime), mime: e.mime };
  let s = checkPluginFetchUrl(e.url, n, "$.audio.play"),
    now = Date.now();
  try {
    let y = await fetchManualRedirect(s, { method: "GET", signal: AbortSignal.timeout(q$r) });
    if (!y.ok) throw new HooksError(`HTTP ${y.status}`);
    let S = await readBodyWithLimit(y, uY),
      w = y.headers.get("content-type") ?? "audio/mpeg";
    return (
      logForDebugging(
        `$.audio.play (${pluginName}): fetched ${S.byteLength} bytes (${w}) in ${Date.now() - now}ms from ${describeAudioClip(e)}`,
      ),
      { bytes: S, extension: audioExtensionForMime(w), mime: w }
    );
  } catch (error) {
    throw (
      logForDebugging(`$.audio.play (${pluginName}): could not fetch ${e.url}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      new HooksError(`$.audio.play: could not fetch the clip: ${errorMessage(error)}`)
    );
  }
}
/**
 * 准备要播放的音频文件：插件资源直接使用，否则把数据写入临时文件并返回清理函数。
 */
//@ chunk-e6aww6q8.js:3739741-3740145 placement
async function prepareAudioFile(e, n) {
  let { clip: clip, pluginStorageId: pluginStorageId } = e;
  if (clip.asset !== void 0)
    return { file: await resolveAudioAsset(e, clip.asset, n), what: clip.asset, cleanup: async () => {} };
  let h = await fetchAudioClip(clip, { pluginName: n, pluginStorageId: pluginStorageId }),
    y = await mkdtemp_7(join_97(tmpdir_6(), "claude-audio-")),
    S = join_97(y, `clip.${h.extension}`);
  return (
    await writeFile_13(S, h.bytes),
    {
      file: S,
      what: `${S} (${h.bytes.byteLength} bytes)`,
      cleanup: () => rm_21(y, { recursive: !0, force: !0 }).catch(() => {}),
    }
  );
}
//@ chunk-e6aww6q8.js:3740145-3740156 placement
var XDn = 80;
//@ chunk-e6aww6q8.js:3740156-3740339 placement
function describeAudioClip(e) {
  let n = e.asset === void 0,
    r = e.url === void 0,
    s = !r && e.url.length > XDn;
  return n
    ? r
      ? `${e.mime} ${e.base64.length} base64 chars`
      : s
        ? `${truncateToLength(e.url, XDn)}...`
        : e.url
    : `asset ${e.asset}`;
}
//@ chunk-e6aww6q8.js:3740339-3740420 placement
var QDn = (e) => `${e.shouldLoop ? " loop" : ""}${e.gain === void 0 ? "" : ` gain ${e.gain}`}`;
//@ chunk-e6aww6q8.js:3740461-3740734 placement
function mimeForAudioFile(e) {
  switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
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
var ZDn = (e) =>
  new Promise((n) => {
    forwardAbort(e, { abort: n });
  });
//@ chunk-e6aww6q8.js:3740783-3740912 placement
function checkAudioUrlAllowed({ clip: clip, pluginStorageId: pluginStorageId }, r) {
  if (typeof clip.url === "string")
    checkPluginFetchUrl(clip.url, { pluginName: r, pluginStorageId: pluginStorageId }, "$.audio.play");
}
//@ chunk-e6aww6q8.js:3740912-3740926 placement
var G0r = bqe();
//@ chunk-e6aww6q8.js:3740926-3740936 placement
var eLn = 4;
//@ chunk-e6aww6q8.js:3740976-3741513 placement
var spawnAudioPlayer = ({ command: command, args: args, label: label, what: what, signal: signal }) =>
  new Promise((y, S) => {
    let w = spawn_3(command, args, { stdio: "ignore", windowsHide: !0, cwd: void 0, ...Nd("plugin") });
    logForDebugging(`${label}: ${command} ${what} (pid ${w.pid ?? "?"})`);
    let L = !1;
    function G() {
      ((L = !0), w.kill("SIGTERM"));
    }
    let q = forwardAbort(signal, { abort: G });
    (w.once("error", (Z) => {
      (q(),
        logForDebugging(`${label}: ${command} failed to start: ${Z.message}`, { level: "warn" }),
        S(new HooksError(`${command} failed to start: ${Z.message}`)));
    }),
      w.once("exit", (Z) => {
        (q(),
          logForDebugging(`${label}: ${command} exited ${Z ?? "by signal"}${L ? " (stopped)" : ""}`),
          Z === 0 || L ? y() : S(new HooksError(`${command} exited ${Z ?? "by signal"}`)));
      }));
  });
//@ chunk-e6aww6q8.js:3741513-3741536 placement
var Krt = () => globalThis;
//@ chunk-e6aww6q8.js:3741536-3741549 placement
var nLn = 2500;
//@ chunk-e6aww6q8.js:3741549-3741830 placement
async function waitForVoices(e) {
  let voices = e.getVoices();
  if (voices.length > 0 || e.addEventListener === void 0) return voices;
  return (
    await new Promise((r) => {
      function s() {
        (clearTimeout(h), e.removeEventListener?.("voiceschanged", s), r());
      }
      e.addEventListener?.("voiceschanged", s);
      let h = setTimeout(s, nLn);
    }),
    e.getVoices()
  );
}
/**
 * 读取音频片段来源（插件目录内资源或 base64 数据）。
 */
//@ chunk-e6aww6q8.js:3741830-3743208 placement
async function readAudioClipSource(e, { request: request, pluginName: pluginName, signal: signal }) {
  let { Blob: h, URL: y, atob: S } = Krt(),
    { clip: clip, pluginStorageId: pluginStorageId } = request,
    G,
    q;
  function Z({ bytes: bytes, mime: mime }) {
    if (h !== void 0 && y !== void 0) {
      let objectURL = y.createObjectURL(new h([bytes], { type: mime }));
      return ((q = () => y.revokeObjectURL(objectURL)), objectURL);
    }
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  if (clip.url !== void 0)
    G = Z(
      await fetchAudioClip({ url: clip.url }, { pluginName: pluginName, pluginStorageId: pluginStorageId }),
    );
  else if (clip.asset !== void 0) {
    let Se = await resolveAudioAsset(request, clip.asset, pluginName);
    try {
      G = Z({ bytes: new Uint8Array(await readFile_16(Se)), mime: mimeForAudioFile(Se) });
    } catch (error) {
      throw new HooksError(
        `$.audio.play: could not read ${clip.asset} in ${pluginName}'s directory: ${errorMessage(error)}`,
      );
    }
  } else if (S === void 0) G = `data:${clip.mime};base64,${clip.base64}`;
  else {
    let Se = S(clip.base64),
      uint8Array = new Uint8Array(Se.length);
    for (let we = 0; we < Se.length; we++) uint8Array[we] = Se.charCodeAt(we);
    G = Z({ bytes: uint8Array, mime: clip.mime });
  }
  return (
    logForDebugging(`$.audio.play (${pluginName}): <audio> ${describeAudioClip(clip)}` + QDn(request)),
    new Promise((Se, ke) => {
      let we = new e(G);
      if (request.shouldLoop) we.loop = !0;
      if (request.gain !== void 0 && "volume" in we) we.volume = Math.min(1, request.gain);
      function Ee() {
        (q?.(), Se());
      }
      if (((we.onended = Ee), signal !== void 0))
        ZDn(signal).then(() => {
          (we.pause?.(), Ee());
        });
      function Ae(Ie) {
        (q?.(),
          logForDebugging(`$.audio.play (${pluginName}): ${Ie}`, { level: "warn" }),
          ke(new HooksError(`$.audio.play: ${Ie}`)));
      }
      ((we.onerror = () =>
        Ae(
          `<audio> could not play ${clip.url ?? clip.asset ?? "the clip"} (blocked by the page's CSP, or not decodable)`,
        )),
        we.play().catch((Ie) => Ae(`<audio>.play() rejected: ${errorMessage(Ie)}`)));
    })
  );
}
/**
 * 用 macOS afplay 播放音频（可设音量），支持中止并清理临时文件。
 */
//@ chunk-e6aww6q8.js:3743208-3743533 placement
async function playWithAfplay({ request: request, pluginName: pluginName, signal: signal }) {
  let s = `$.audio.play (${pluginName})`,
    h = request.gain === void 0 ? [] : ["-v", String(request.gain)],
    { file: file, what: what, cleanup: cleanup } = await prepareAudioFile(request, pluginName);
  try {
    do {
      if (signal?.aborted) return;
      await spawnAudioPlayer({ command: "afplay", args: [...h, file], label: s, what: what, signal: signal });
    } while (request.shouldLoop && signal !== void 0 && !signal.aborted);
  } finally {
    await cleanup();
  }
}
//@ chunk-e6aww6q8.js:3743533-3743797 placement
function playAudioClip(e, n, r) {
  let { Audio: Audio } = Krt();
  if (typeof Audio === "function")
    return readAudioClipSource(Audio, { request: e, pluginName: n, signal: r });
  if (getPlatform() === "macos") return playWithAfplay({ request: e, pluginName: n, signal: r });
  return (
    logForDebugging(`$.audio.play (${n}): no audio player on ${getPlatform()}; not played`),
    Promise.resolve()
  );
}
/**
 * 校验 $.audio.play 的片段参数：只能是 { asset }、{ url } 或 { base64 } 之一。
 */
//@ chunk-e6aww6q8.js:3743797-3745096 placement
function validateAudioClip(e) {
  if (!isPlainObject_4(e) || !isPlainObject_4(e.clip))
    throw new HooksError("$.audio.play: clip must be { asset }, { url } or { base64, mime }");
  let clip = e.clip,
    filtered = ["asset", "url", "base64"].filter((S) => clip[S] !== void 0),
    s = filtered[0];
  if (s === void 0 || filtered.length !== 1)
    throw new HooksError(
      `$.audio.play: clip must carry exactly one of asset, url, base64 (got ${filtered.length === 0 ? "none" : filtered.join(" and ")})`,
    );
  if (typeof clip[s] !== "string" || clip[s] === "")
    throw new HooksError(`$.audio.play: clip.${s} must be a non-empty string`);
  if (s === "base64") {
    if (typeof clip.mime !== "string")
      throw new HooksError("$.audio.play: clip.mime must accompany clip.base64");
    if (typeof clip.base64 === "string" && Buffer.byteLength(clip.base64, "base64") > uY)
      throw new HooksError(`$.audio.play: the clip is over ${uY} bytes`);
  }
  if (s === "asset") {
    if (typeof clip.asset !== "string") throw new HooksError("$.audio.play: clip.asset must be a string");
    if (typeof e.root !== "string") throw new HooksError("$.audio.play: the plugin has no directory");
    resolvePluginAssetPath(e.root, clip.asset);
  }
  if (s === "url" && typeof e.pluginStorageId !== "string")
    throw new HooksError("$.audio.play: the plugin has no id");
  if (e.shouldLoop !== void 0 && typeof e.shouldLoop !== "boolean")
    throw new HooksError("$.audio.play: options.shouldLoop must be a boolean");
  if (
    e.gain !== void 0 &&
    (typeof e.gain !== "number" || !Number.isFinite(e.gain) || e.gain < 0 || e.gain > eLn)
  )
    throw new HooksError(`$.audio.play: options.gain must be a number from 0 to ${eLn}`);
}
//@ chunk-e6aww6q8.js:3745096-3745213 placement
function createAudioOverrides() {
  let e = to(),
    n = to();
  return { setPlayer: e.set, playerOverride: e.get, setSpeaker: n.set, speakerOverride: n.get };
}
//@ chunk-e6aww6q8.js:3745213-3745227 placement
var rPe = createAudioOverrides();
//@ chunk-e6aww6q8.js:3745227-3745342 placement
function playValidatedClip(e, n, r) {
  try {
    (validateAudioClip(e), checkAudioUrlAllowed(e, n));
  } catch (error) {
    return Promise.reject(error);
  }
  return (rPe.playerOverride() ?? playAudioClip)(e, n, r);
}
//@ chunk-e6aww6q8.js:3745342-3745355 placement
var lLn = "--";
//@ chunk-e6aww6q8.js:3745355-3745511 placement
function describeSpeechError(e) {
  let n = e?.error ?? "error";
  return `speechSynthesis failed the utterance: ${n}${n === "not-allowed" ? " (the page has had no user gesture yet)" : ""}`;
}
/**
 * 插件 $.audio.speak：用系统语音朗读文本，找不到指定语音时警告。
 */
//@ chunk-e6aww6q8.js:3745511-3746409 placement
async function audioSpeakForPlugin(
  { synth: synth, Utterance: Utterance },
  { request: request, pluginName: pluginName, signal: signal },
) {
  let y = `$.audio.speak (${pluginName})`;
  function S(G) {
    return (logForDebugging(`${y}: ${G}`, { level: "warn" }), new HooksError(`$.audio.speak: ${G}`));
  }
  let w = null;
  if (request.voice !== void 0) {
    let G = await waitForVoices(synth);
    if (((w = G.find((q) => q.name === request.voice) ?? null), w === null))
      throw S(
        `no system voice named "${request.voice}" among the ${G.length} the browser lists (a voice installed after the browser started is listed after a browser restart)`,
      );
  }
  logForDebugging(
    `${y}: speechSynthesis, voice ${w === null ? "default" : `"${w.name}"`}, ${request.text.length} chars`,
  );
  let now = Date.now();
  return new Promise((G, q) => {
    let Z = new Utterance(request.text);
    if (w !== null) Z.voice = w;
    let Se = !1;
    if (
      ((Z.onend = () => {
        ((Se = !0), logForDebugging(`${y}: ended after ${Date.now() - now}ms`), G({ via: "system" }));
      }),
      (Z.onerror = (ke) => {
        ((Se = !0), q(S(describeSpeechError(ke))));
      }),
      signal !== void 0)
    )
      ZDn(signal).then(() => {
        if (!Se) (synth.cancel(), q(signal.reason));
      });
    try {
      synth.speak(Z);
    } catch (error) {
      q(S(`speechSynthesis.speak threw: ${errorMessage(error)}`));
    }
  });
}
//@ chunk-e6aww6q8.js:3746409-3746667 placement
async function speakWithSay(e, n, r) {
  return (
    await spawnAudioPlayer({
      command: "say",
      args: [...(e.voice === void 0 ? [] : ["-v", e.voice]), lLn, e.text],
      label: `$.audio.speak (${n})`,
      what: `${e.voice === void 0 ? "" : `-v ${e.voice} `}${e.text.length} chars`,
      signal: r,
    }),
    r?.throwIfAborted(),
    { via: "system" }
  );
}
/**
 * 用语音合成朗读文本（有 speechSynthesis 时），否则交给后备实现。
 */
//@ chunk-e6aww6q8.js:3746667-3747037 placement
function speakText(e, n, r) {
  let { speechSynthesis: speechSynthesis, SpeechSynthesisUtterance: SpeechSynthesisUtterance } = Krt();
  if (speechSynthesis !== void 0 && typeof SpeechSynthesisUtterance === "function")
    return audioSpeakForPlugin(
      { synth: speechSynthesis, Utterance: SpeechSynthesisUtterance },
      { request: e, pluginName: n, signal: r },
    );
  if (getPlatform() === "macos") return speakWithSay(e, n, r);
  return (
    logForDebugging(`$.audio.speak (${n}): no speech synthesizer on ${getPlatform()}`, { level: "warn" }),
    Promise.reject(new HooksError(`$.audio.speak: no speech synthesizer on ${getPlatform()}`))
  );
}
//@ chunk-e6aww6q8.js:3747037-3747106 placement
function yHr(e) {
  return e.text.length <= cR ? e : { ...e, text: truncateToLength(e.text, cR) };
}
/**
 * 校验 $.audio.speak 参数：text 必须是非空字符串，其余选项类型正确。
 */
//@ chunk-e6aww6q8.js:3747106-3747417 placement
function checkSpeakArgs(e) {
  if (!isPlainObject_4(e)) throw new HooksError("$.audio.speak: text must be a non-empty string");
  if (typeof e.text !== "string" || e.text.trim() === "")
    throw new HooksError("$.audio.speak: text must be a non-empty string");
  if (e.voice !== void 0 && typeof e.voice !== "string")
    throw new HooksError("$.audio.speak: voice must be a string when given");
}
/**
 * $.audio.speak 实现：校验参数，串行执行朗读（可被覆盖的朗读器，默认系统语音）。
 */
//@ chunk-e6aww6q8.js:3747417-3747571 placement
function audioSpeakOp(e, n, r) {
  try {
    checkSpeakArgs(e);
  } catch (error) {
    return Promise.reject(error);
  }
  let s = rPe.speakerOverride() ?? speakText,
    h = yHr(e);
  return G0r(() => (r?.throwIfAborted(), s(h, n, r)));
}
//@ chunk-e6aww6q8.js:3747571-3747586 placement
var mLn = 600000;
//@ chunk-e6aww6q8.js:3747586-3747596 placement
var Vrt = 4;
//@ chunk-e6aww6q8.js:3747596-3747686 placement
function hLn(e, n) {
  let timeout = AbortSignal.timeout(n);
  return e === void 0 ? timeout : AbortSignal.any([e, timeout]);
}
/**
 * $.audio.play 宿主：每插件同时最多 4 个播放，循环播放有总时长上限。
 */
//@ chunk-e6aww6q8.js:3747686-3748037 placement
function createAudioPlayer(e = mLn) {
  let n = new Map();
  return {
    play: async (r, s, h) => {
      let y = n.get(s) ?? 0;
      if (y >= Vrt) throw new HooksError(`${s}: $.audio.play: refused: ${Vrt} plays are going at once`);
      n.set(s, y + 1);
      let S = r.shouldLoop ? hLn(h, e) : h;
      try {
        await playValidatedClip(r, s, S);
      } finally {
        n.set(s, (n.get(s) ?? 1) - 1);
      }
      if (S?.aborted === !0 && h?.aborted !== !0)
        logForDebugging(`$.audio.play (${s}): the loop ended at ${e}ms`);
    },
  };
}

export { cY, audioSpeakOp, createAudioPlayer };
