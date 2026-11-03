/**
 * tools/ArtifactTool/preview/chromeSession.ts
 *
 * 2.1.316 新增：Chrome CDP 会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (23)
 * attribution: placement 23
 */
import { mkdtemp, writeFile, chmod, rm as rm_2 } from "fs/promises";
import { join, extname } from "path";
import { tmpdir as tmpdir_2 } from "os";
import { randomUUID } from "crypto";
import { tmpdir, PREVIEW_COPY_DIR_PREFIX } from "../../../utils/tempDir.js";
import { runEmulatorLook } from "./emulatorLook.js";
import {
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../../utils/errors.js";
import { createSignal } from "../../../utils/signal.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { safeSpawn } from "../../../utils/safeSpawn.js";
import { registerCleanup } from "../../../utils/cleanupRegistry.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import {
  sanitizeDisplay,
  PreviewIssueCollector,
  staticPageIssues,
  composePreviewPage,
  raceWithStepTimeout,
  servePreviewPages,
  themeForViewportWidth,
  parsePageMeasurement,
  layoutIssuesFromMeasurement,
  cspViolationIssues,
  dialogIssues,
  blockedRequestIssues,
  consoleErrorIssues,
  identicalThemeRenderIssues,
  relativeRefsNotLoadedIssues,
  missingRuntimeCapabilityIssues,
} from "./pageChecks.js";
import { prepareArtifactBody } from "../../../services/artifacts/pagePreparation.js";
import { composeArtifactPage } from "../../../services/artifacts/composePage.js";
import { encodePreviewJpeg } from "../../../utils/imageResizer.js";
import { DEFAULT_PREVIEW_WIDTHS, MAX_PREVIEW_SCREENSHOT_HEIGHT } from "../promptText.js";
import { ensureToolResultsDir, writeToolResultFile } from "../../../utils/toolResultStorage.js";

//@ chunk-8wvtd8sr.js:165072-165606 placement
/**
 * 仿真预览后端（artifact 查看器）：把页面字节写到私有临时目录，交给查看器仿真"看一眼"，返回 {engine:"emulator", look, durationMs}；中断时 look 为 aborted，结束后删除临时目录。
 */
var EMULATOR_PREVIEW_BACKEND = {
  name: "emulator",
  async refusal() {
    return;
  },
  async render({ bytes, fileName, shotDir, shotName, signal }) {
    let now = Date.now();
    let p = await mkdtemp(join(tmpdir(), PREVIEW_COPY_DIR_PREFIX));
    try {
      let w = join(p, `page${extname(fileName).toLowerCase()}`);
      await writeFile(w, bytes, {
        flag: "wx",
      });
      await chmod(w, 420);
      await chmod(p, 493);
      return {
        engine: "emulator",
        look: await runEmulatorLook(
          {
            kind: "page",
            source: w,
          },
          {
            signal,
            shotDir,
            shotName,
          },
        ),
        durationMs: Date.now() - now,
      };
    } catch (error) {
      if (error instanceof AbortError)
        return {
          engine: "emulator",
          look: {
            kind: "aborted",
          },
          durationMs: Date.now() - now,
        };
      throw error;
    } finally {
      await rm_2(p, {
        recursive: true,
        force: true,
      });
    }
  },
};
//@ chunk-8wvtd8sr.js:165818-165926 placement
class PreviewBrowserGone extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(e, "artifact preview: browser gone");
    this.name = "PreviewBrowserGone";
  }
}
//@ chunk-8wvtd8sr.js:165926-166065 placement
class CdpCommandError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  method;
  constructor(method, n) {
    super(n, "artifact preview: protocol command failed");
    this.method = method;
    this.name = "CdpCommandError";
  }
}
//@ chunk-8wvtd8sr.js:166065-166081 placement
/**
 * CDP 消息的字节上限（超过即判定浏览器异常）。
 */
var MAX_CDP_MESSAGE_BYTES = 67108864;
//@ chunk-8wvtd8sr.js:166081-168131 placement
/**
 * 通过 --remote-debugging-pipe 与 Chrome 通信的 CDP 连接：以 NUL 分隔的 JSON 消息收发，按 id 匹配请求应答、按事件名分发；消息过大或管道断开时以 PreviewBrowserGone 失败所有挂起请求。
 */
class CdpPipeConnection {
  out;
  onFailed;
  nextId = 0;
  pending = new Map();
  handlers = new Map();
  partial = [];
  partialBytes = 0;
  gone;
  ended = createSignal();
  constructor(pipeOut, pipeIn, s) {
    this.out = pipeOut;
    this.onFailed = s;
    pipeIn.on("data", (h) => this.receive(h));
    let r = s ? () => {} : () => this.fail(new PreviewBrowserGone("Chrome closed the pipe"));
    pipeIn.on("end", r);
    pipeIn.on("close", r);
    pipeIn.on("error", r);
    pipeOut.on("error", r);
  }
  get closedBecause() {
    return this.gone;
  }
  send(method, params = {}, s) {
    if (this.gone) return Promise.reject(this.gone);
    let r = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(r, {
        method,
        resolve,
        reject,
      });
      let p = jsonStringify(
        s === undefined
          ? {
              id: r,
              method,
              params,
            }
          : {
              id: r,
              method,
              params,
              sessionId: s,
            },
      );
      this.out.write(p + "\x00", (w) => {
        if (w && this.pending.delete(r))
          reject(this.gone ?? new PreviewBrowserGone("the pipe to Chrome broke"));
      });
    });
  }
  on(e, n) {
    let s = this.handlers.get(e);
    if (!s) {
      s = new Set();
      this.handlers.set(e, s);
    }
    s.add(n);
    return () => s.delete(n);
  }
  onGone(e) {
    return this.gone ? () => {} : this.ended.subscribe(e);
  }
  fail(e) {
    if (this.gone) return;
    this.gone = e;
    for (let n of this.pending.values()) n.reject(e);
    this.pending.clear();
    try {
      this.ended.emit(e);
    } catch {}
    this.ended.clear();
    this.onFailed?.(e);
  }
  receive(e) {
    if (this.gone) return;
    let n = 0;
    for (;;) {
      let index = e.indexOf(0, n);
      let r = index === -1 ? e.length : index;
      if (this.partialBytes + (r - n) > MAX_CDP_MESSAGE_BYTES) {
        this.partial = [];
        this.partialBytes = 0;
        this.fail(
          new PreviewBrowserGone("the page produced a browser message too large to handle; preview stopped"),
        );
        return;
      }
      if (index === -1) {
        if (n < e.length) {
          this.partial.push(n === 0 ? e : e.subarray(n));
          this.partialBytes += e.length - n;
        }
        return;
      }
      let chunk = e.subarray(n, index);
      let y = this.partial.length === 0 ? chunk : Buffer.concat([...this.partial, chunk]);
      this.partial = [];
      this.partialBytes = 0;
      this.dispatch(y.toString("utf8"));
      if (this.gone) return;
      n = index + 1;
    }
  }
  dispatch(e) {
    let n;
    try {
      n = asRecord(jsonParse(e));
    } catch {
      return;
    }
    if (typeof n.id === "number") {
      let s = this.pending.get(n.id);
      if (!s) return;
      this.pending.delete(n.id);
      let r = asRecord(n.error);
      if (n.error !== undefined)
        s.reject(new CdpCommandError(s.method, `${s.method}: ${stringOrEmpty(r.message) || "failed"}`));
      else s.resolve(asRecord(n.result));
      return;
    }
    if (typeof n.method === "string") {
      let s = this.handlers.get(n.method);
      if (!s) return;
      let r = asRecord(n.params);
      let sessionId = typeof n.sessionId === "string" ? n.sessionId : undefined;
      for (let y of s)
        try {
          y(r, sessionId);
        } catch {}
    }
  }
}
//@ chunk-8wvtd8sr.js:168131-168424 placement
class TailBuffer {
  max;
  chunks = [];
  size = 0;
  constructor(max) {
    this.max = max;
  }
  push(e) {
    this.chunks.push(e);
    this.size += e.length;
    while (this.size > this.max && this.chunks.length > 1) this.size -= this.chunks.shift().length;
  }
  text() {
    let str = Buffer.concat(this.chunks).toString("utf8");
    return str.length > this.max ? str.slice(-this.max) : str;
  }
}
//@ chunk-8wvtd8sr.js:168424-168680 placement
var DEFAULT_CHROME_DEPS = {
  spawn: (e, n) =>
    safeSpawn(e, n, {
      stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
      detached: false,
      windowsHide: true,
      cwd: undefined,
      toolCgroupClass: "helper",
    }),
  mkdtemp,
  rm: rm_2,
  setTimeout,
  clearTimeout,
  registerCleanup: (e) => registerCleanup(e),
};
var CHROME_CLOSE_GRACE_MS = 2000;
var CLAUDE_ARTIFACT_PREVIEW = "claude-artifact-preview-";
var STDERR_TAIL_BYTES = 8192;
//@ chunk-8wvtd8sr.js:168680-169908 placement
/**
 * 启动无头 Chrome 预览进程：临时 user-data-dir、fd 3/4 作为 CDP 管道、保留 stderr 尾部；返回 {cdp, profileDir, exited, stderrTail, close, kill}。
 * close 先发 Browser.close 等待片刻再强杀，最后删除临时目录；进程注册了退出清理。
 */
async function launchPreviewChrome(chromePath, args, deps = DEFAULT_CHROME_DEPS) {
  let r = await deps.mkdtemp(join(tmpdir_2(), CLAUDE_ARTIFACT_PREVIEW));
  let removeProfileDir = () =>
    deps
      .rm(r, {
        recursive: true,
        force: true,
        maxRetries: 3,
      })
      .catch(() => {});
  let child;
  try {
    child = deps.spawn(chromePath, [...args, `--user-data-dir=${r}`]);
  } catch {
    await removeProfileDir();
    throw new PreviewBrowserGone("Chrome did not start");
  }
  child.on("error", () => {});
  let stderrTail = new TailBuffer(STDERR_TAIL_BYTES);
  child.stderr?.on("data", (M) => stderrTail.push(M));
  child.stderr?.on("error", () => {});
  let pipeOut = child.stdio[3];
  let pipeIn = child.stdio[4];
  if (!isWritablePipe(pipeOut) || !isFileReadDenied(pipeIn)) {
    child.kill("SIGKILL");
    await removeProfileDir();
    throw new PreviewBrowserGone("Chrome did not start");
  }
  child.unref();
  for (let M of [child.stderr, pipeOut, pipeIn]) unrefStream(M);
  let exited = false;
  let cdp = new CdpPipeConnection(pipeOut, pipeIn, () => {
    if (!exited) child.kill("SIGKILL");
  });
  let promise = new Promise((resolve) => {
    let x = (q) => {
      if (exited) return;
      exited = true;
      cdp.fail(new PreviewBrowserGone(q));
      resolve();
    };
    child.once("exit", (q, re) => x(re ? `Chrome was killed (${re})` : `Chrome exited (${q ?? "?"})`));
    child.once("error", () => x("Chrome did not start"));
  });
  let P;
  let shutdown = (M) => {
    if (!M && !exited) child.kill("SIGKILL");
    P ??= (async () => {
      V();
      if (!exited && M && cdp.closedBecause === undefined) {
        cdp.send("Browser.close").catch(() => {});
        let x;
        let promise_2 = new Promise((resolve) => {
          x = deps.setTimeout(() => resolve("lingered"), CHROME_CLOSE_GRACE_MS);
        });
        let winner = await Promise.race([promise, promise_2]);
        if (x !== undefined) deps.clearTimeout(x);
        if (winner === "lingered" && !exited) child.kill("SIGKILL");
      } else if (!exited) child.kill("SIGKILL");
      await promise;
      await removeProfileDir();
    })();
    return P;
  };
  let V = deps.registerCleanup(() => shutdown(false));
  return {
    cdp,
    profileDir: r,
    exited: promise,
    stderrTail: () => stderrTail.text(),
    close: () => shutdown(true),
    kill: () => shutdown(false),
  };
}
//@ chunk-8wvtd8sr.js:169908-170008 placement
function unrefStream(e) {
  if (e !== null && typeof e === "object" && "unref" in e && typeof e.unref === "function") e.unref();
}
//@ chunk-8wvtd8sr.js:170008-170073 placement
/**
 * 判断对象是否是可写管道。
 */
function isWritablePipe(pipeOut) {
  return pipeOut !== null && typeof pipeOut === "object" && "write" in pipeOut;
}
//@ chunk-8wvtd8sr.js:170073-170147 placement = isFileReadDenied (1)
function isFileReadDenied(pipeIn) {
  return pipeIn !== null && typeof pipeIn === "object" && "on" in pipeIn && "read" in pipeIn;
}
//@ chunk-8wvtd8sr.js:170147-170204 placement
/**
 * 非空对象原样返回，否则空对象。
 */
function asRecord(e) {
  return e !== null && typeof e === "object" ? e : {};
}
//@ chunk-8wvtd8sr.js:170204-170251 placement
/**
 * 字符串原样返回，否则空串。
 */
function stringOrEmpty(message) {
  return typeof message === "string" ? message : "";
}
//@ chunk-8wvtd8sr.js:170288-170311 placement
/**
 * 预览浏览器空闲关闭时间与启动超时。
 */
var BROWSER_IDLE_MS = 300000;
var BROWSER_START_TIMEOUT_MS = 60000;
//@ chunk-8wvtd8sr.js:170311-170371 placement
/**
 * 生成随机预览主机名（p<uuid>.localhost）。
 */
function randomPreviewHost() {
  return `p${randomUUID().replaceAll("-", "")}.localhost`;
}
//@ chunk-8wvtd8sr.js:170371-171754 placement
/**
 * 预览浏览器的串行租用池：acquire 排队获取（可被 signal 放弃），同参数复用已有 Chrome，否则启动新的；release 后空闲 idleMs 关闭浏览器。
 */
function createPreviewBrowserPool(timers) {
  let current;
  let idleTimer;
  let leased = false;
  let waiting = 0;
  let resolved = Promise.resolve();
  let p = (A) => {
    if (current?.browser === A) current = undefined;
  };
  let w = () => {
    let browser = current?.browser;
    if (browser !== undefined && waiting === 0) {
      timers.clearTimeout(idleTimer);
      idleTimer = timers.setTimeout(() => {
        if (!leased && current?.browser === browser) browser.close().catch(() => {});
      }, timers.idleMs);
    }
  };
  return {
    async acquire(A) {
      let S;
      let promise = new Promise((resolve) => (S = resolve));
      let T = resolved;
      resolved = T.then(() => promise);
      waiting++;
      let P;
      let promise_2 = new Promise((resolve) => {
        P = () => resolve("abandoned");
        A?.addEventListener("abort", P, {
          once: true,
        });
      });
      let V = A?.aborted === true ? "abandoned" : await Promise.race([T, promise_2]);
      A?.removeEventListener("abort", P);
      waiting--;
      if (V === "abandoned") {
        T.then(() => {
          w();
          S();
        });
        throw new PreviewBrowserGone("the preview was interrupted while waiting for the browser");
      }
      leased = true;
      timers.clearTimeout(idleTimer);
      let host = current?.host ?? randomPreviewHost();
      let x = false;
      let q = 0;
      let re = false;
      let Z;
      let ue = () => {
        if (re) return;
        re = true;
        leased = false;
        timers.clearTimeout(Z);
        w();
        S();
      };
      let we = () => {
        if (x && q === 0) ue();
      };
      let Ie = () => new PreviewBrowserGone("the preview stopped waiting for the browser");
      return {
        host,
        async browser(ie, _e, Oe) {
          if (x) throw Ie();
          q++;
          try {
            let joined = [ie, ..._e].join("\x00");
            if (
              current !== undefined &&
              (current.key !== joined || current.browser.cdp.closedBecause !== undefined)
            ) {
              let browser = current.browser;
              current = undefined;
              await browser.kill();
            }
            if (re) throw Ie();
            if (current === undefined) {
              let ge = await Oe(ie, _e);
              if (re) {
                ge.kill().catch(() => {});
                throw Ie();
              }
              let Je = {
                ...ge,
                close: () => {
                  p(Je);
                  return ge.close();
                },
                kill: () => {
                  p(Je);
                  return ge.kill();
                },
              };
              current = {
                browser: Je,
                key: joined,
                host,
              };
              ge.exited.then(() => Je.close().catch(() => {}));
            }
            if (x) throw Ie();
            return current.browser;
          } finally {
            q--;
            we();
          }
        },
        release() {
          if (x) return;
          x = true;
          if (q > 0) Z = timers.setTimeout(ue, timers.startMs);
          we();
        },
      };
    },
  };
}
//@ chunk-8wvtd8sr.js:171754-171875 placement
/**
 * 预览用浏览器进程池（懒创建，带空闲回收与启动超时）。
 */
var previewBrowserPool = new HostScoped(() =>
  createPreviewBrowserPool({
    setTimeout: (e, n) => setTimeout(e, n).unref(),
    clearTimeout: (e) => clearTimeout(e),
    idleMs: BROWSER_IDLE_MS,
    startMs: BROWSER_START_TIMEOUT_MS,
  }),
);
//@ chunk-8wvtd8sr.js:171875-174709 placement
/**
 * 预览租用池的默认参数与报告上限：启动/稳定等待、各类清单条数、CSP 与注入脚本。
 */
var PREVIEW_SETTLE_TIMEOUT_MS = 20000;
var PREVIEW_START_TIMEOUT_MS = 60000;
var PREVIEW_SETTLE_DELAY_MS = 2000;
var MAX_PAGE_USES = 24;
var MAX_PAGE_OBSERVERS = 6;
var MAX_SVG_CLIPS = 6;
var MAX_FAILED_CHECKS = 6;
var MAX_LISTED_MISSING_FILES = 5;
var MAX_TRACKED_SESSIONS = 8;
var MAX_LISTED_UNLOADED_FILES = 8;
var MAX_LISTED_REFS = 8;
var MAX_COLLECTED_USES = 16;
var MAX_CDP_EVENT_CHARS = 262144;
var PREVIEW_CSP_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; form-action 'self'; frame-src 'self' blob: data:; object-src 'none'; webrtc 'block'; base-uri 'self'";
var CSP_ALLOWED_ORIGINS = new Set(PREVIEW_CSP_POLICY.match(/https:\/\/[^\s;']+/g) ?? []);
var CSP_AND_RTC_BLOCK_SCRIPT =
  "(function(){for(var k of ['RTCPeerConnection','webkitRTCPeerConnection','RTCDataChannel','RTCSessionDescription','RTCIceCandidate']){try{Object.defineProperty(window,k,{value:undefined,writable:false,configurable:true})}catch(e){try{delete window[k]}catch(e2){}}}})();(function(){var ap=Reflect.apply,gd=Object.getOwnPropertyDescriptor,EP=Element.prototype,MR=MutationRecord.prototype,NL=NodeList.prototype;var ln=gd(EP,'localName').get,ga=EP.getAttribute,ra=EP.removeAttribute,rm=EP.remove,qsa=EP.querySelectorAll,dq=Document.prototype.querySelectorAll,fq=DocumentFragment.prototype.querySelectorAll,sr=gd(EP,'shadowRoot').get,AS=EP.attachShadow,nt=gd(Node.prototype,'nodeType').get;var mA=gd(MR,'addedNodes').get,mT=gd(MR,'target').get,mK=gd(MR,'type').get,nL=gd(NL,'length').get,nI=NL.item,test=RegExp.prototype.test,observe=MutationObserver.prototype.observe;var H=/(^|\\s)(preconnect|dns-prefetch|prerender)(\\s|$)/i,S=/^\\s*speculationrules\\s*$/i,Q='link[rel],script[type]',opts={subtree:true,childList:true,attributes:true,attributeFilter:['rel','type']};function each(l,f){for(var i=0,n=ap(nL,l,[]);i<n;i++)f(ap(nI,l,[i]))}function all(root,sel){var t=ap(nt,root,[]);return ap(t===9?dq:t===11?fq:qsa,root,[sel])}function watch(root){try{ap(observe,obs,[root,opts]);each(all(root,Q),strip);each(all(root,'*'),hosted)}catch(e){}}function hosted(n){try{var s=ap(sr,n,[]);if(s)watch(s)}catch(e){}}function strip(n){try{if(!n||ap(nt,n,[])!==1)return;var l=ap(ln,n,[]);if(l==='link'&&ap(test,H,[ap(ga,n,['rel'])||'']))ap(ra,n,['rel']);if(l==='script'&&ap(test,S,[ap(ga,n,['type'])||''])){ap(rm,n,[]);return}hosted(n);each(all(n,Q),strip);each(all(n,'*'),hosted)}catch(e){}}var obs=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(ap(mK,m,[])==='attributes')strip(ap(mT,m,[]));else each(ap(mA,m,[]),strip)}});try{EP.attachShadow=function(init){var r=ap(AS,this,[init]);watch(r);return r}}catch(e){}watch(document)})();";
var CSP_VIOLATION_COLLECTOR_SCRIPT =
  "<script>window.__claudePreviewCsp=[];document.addEventListener('securitypolicyviolation',function(e){var l=window.__claudePreviewCsp;if(l.length<64)l.push({uri:String(e.blockedURI||'').slice(0,512),directive:String(e.effectiveDirective||e.violatedDirective||'').slice(0,64)})});</script>";
//@ chunk-8wvtd8sr.js:174709-174894 placement
class PreviewStepTimeout extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  step;
  ms;
  constructor(stepName, timeoutMs) {
    super(`${stepName} timed out after ${Math.round(timeoutMs / 1000)}s`, "artifact preview step timed out");
    this.step = stepName;
    this.ms = timeoutMs;
    this.name = "PreviewStepTimeout";
  }
}
//@ chunk-8wvtd8sr.js:174894-175158 placement
class PreviewNavigatedAway extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  destination;
  constructor(e, n) {
    super(
      `the page navigated itself to ${describeNavigationTarget(e, n)}; preview renders only this file and the published viewer blocks navigation`,
      "artifact preview page navigated away",
    );
    this.destination = e;
    this.name = "PreviewNavigatedAway";
  }
}
//@ chunk-8wvtd8sr.js:175158-175274 placement
/**
 * 判断 URL 是否为与给定地址同源的 http 地址（解析失败时比较字符串）。
 */
function isSameHttpOrigin(e, n) {
  try {
    let s = new URL(e);
    return s.protocol === "http:" && s.origin === new URL(n).origin;
  } catch {
    return e === n;
  }
}
//@ chunk-8wvtd8sr.js:175274-175650 placement
/**
 * 描述预览页被导航去的目标：同一文件的不同地址、另一个本地文件、http(s) 源、加载被拒的错误页，或其他协议的 URL。
 */
function describeNavigationTarget(e, n) {
  try {
    let s = new URL(e);
    if (s.protocol === "file:")
      return s.pathname === new URL(n).pathname ? "a different address for this file" : "another local file";
    if (s.protocol === "http:" || s.protocol === "https:") return sanitizeDisplay(s.origin, 80);
    if (s.protocol === "chrome-error:") return "another document (the load was refused)";
    return `a ${sanitizeDisplay(s.protocol, 20)} URL`;
  } catch {
    return "another document";
  }
}
//@ chunk-8wvtd8sr.js:175650-179080 placement
async function renderPreviewDocument(html, widths, themes, r) {
  let artifactBody = await prepareArtifactBody(html, {
    injectDiagramRuntime: true,
    injectHighlightRuntime: true,
  });
  let y = composeArtifactPage(artifactBody.body, artifactBody.roundTripLang, artifactBody.roundTripCover);
  let publishedBytes = Buffer.byteLength(y, "utf8");
  let collector = new PreviewIssueCollector(widths.length * themes.length);
  for (let Se of staticPageIssues(html, publishedBytes)) collector.add(Se);
  let A = new Map();
  for (let Se of themes) A.set(Se, composePreviewPage(y, Se));
  let S = [];
  let stepTimeoutMs = r.stepTimeoutMs ?? PREVIEW_SETTLE_TIMEOUT_MS;
  let startTimeoutMs = r.startTimeoutMs ?? PREVIEW_START_TIMEOUT_MS;
  let settleMs = r.settleMs ?? PREVIEW_SETTLE_DELAY_MS;
  let timers = r.timers ?? {
    setTimeout: (Se, ce) => setTimeout(Se, ce),
    clearTimeout: (Se) => clearTimeout(Se),
  };
  let encode = r.encode ?? encodePreviewJpeg;
  let M = (promise, stepName) => raceWithStepTimeout(promise, stepTimeoutMs, stepName, timers, r.signal);
  let x = () => r.signal?.aborted === true;
  let q = (error) => error instanceof PreviewStepTimeout || x() || error instanceof PreviewBrowserGone;
  let re = (error) => error instanceof PreviewStepTimeout || error instanceof PreviewBrowserGone;
  let Z = widths[0] ?? DEFAULT_PREVIEW_WIDTHS[0];
  let ue = (error) => {
    let { issues, dropped } = collector.done();
    return {
      bytes: publishedBytes,
      shots: S,
      issues,
      issuesDropped: dropped,
      renderError: sanitizeDisplay(error instanceof Error ? error.message : String(error), 200),
    };
  };
  if (x()) return ue(Error("preview aborted"));
  let we;
  try {
    we = await (r.serve ?? servePreviewPages)(A, r.host);
  } catch (error) {
    return ue(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the local preview server could not start (${error instanceof Error ? error.message : String(error)})`,
        "artifact preview: page server failed to start",
      ),
    );
  }
  if (x()) {
    we.close();
    return ue(Error("preview aborted"));
  }
  let baseUrl = we.baseUrl;
  let ie;
  let abortController = new AbortController();
  let promise = r.browser.open(
    Z,
    themeForViewportWidth(Z),
    new URL(baseUrl).hostname,
    abortController.signal,
  );
  try {
    ie = await raceWithStepTimeout(promise, startTimeoutMs, "starting the browser", timers, r.signal);
  } catch (error) {
    abortController.abort();
    promise.then(
      (ce) => void ce.close().catch(() => {}),
      () => {},
    );
    we.close();
    return ue(error);
  }
  let me = new Set();
  let ge = new Set();
  let seenUrls = new Set();
  let relativeRefs = [];
  let se = new Set();
  let B = false;
  let U = 0;
  let he;
  let $e = false;
  try {
    for (let Se of themes)
      for (let ce of widths) {
        let Re = {
          width: ce,
          theme: Se,
        };
        S.push(Re);
        let Fe = `${ce} ${Se}`;
        if (he !== undefined) {
          Re.error = "render stopped before this capture";
          U++;
          continue;
        }
        let pageUrl = we.urlFor(Se);
        let it = [];
        let Tt = [];
        try {
          let ze = themeForViewportWidth(ce);
          await M(ie.resize(ce, ze), "resize");
          await M(ie.load(pageUrl, Se, we.topUrlFor(Se)), "load");
          let Mt = ze;
          try {
            let measurement = parsePageMeasurement(await M(ie.measure(settleMs), "checks"));
            if (!isSameHttpOrigin(measurement.href, pageUrl))
              throw new PreviewNavigatedAway(measurement.href, pageUrl);
            it = layoutIssuesFromMeasurement(measurement);
            for (let use of measurement.uses)
              if (se.size < MAX_COLLECTED_USES) se.add(use);
              else if (!se.has(use)) B = true;
            B ||= measurement.usesMore;
            Tt = [...cspViolationIssues(measurement, me, collector), ...dialogIssues(measurement, ge)];
            let max = Math.max(measurement.sh, ze);
            Mt = Math.min(max, MAX_PREVIEW_SCREENSHOT_HEIGHT);
            if (max > Mt) Re.pageHeight = max;
          } catch (error) {
            if (q(error) || error instanceof PreviewNavigatedAway) throw error;
            collector.add(
              {
                kind: "load",
                text: `the checks could not run on this page (${sanitizeDisplay(error instanceof Error ? error.message : String(error), 100)})`,
              },
              Fe,
            );
          }
          Re.height = Mt;
          if (Mt !== ze) await M(ie.resize(ce, Mt), "resize");
          let Ct = await M(ie.settle(), "settle");
          if (typeof Ct === "string" && !isSameHttpOrigin(Ct, pageUrl))
            throw new PreviewNavigatedAway(Ct, pageUrl);
          let nn = await M(ie.screenshot(), "capture");
          let { jpeg } = await encode(nn);
          await ensureToolResultsDir(r.shotDir, undefined);
          let Et = join(r.shotDir, `${r.shotName(U)}.jpg`);
          await writeToolResultFile(Et, jpeg);
          Re.path = Et;
          Re.base64 = jpeg.toString("base64");
        } catch (error) {
          Re.error = sanitizeDisplay(error instanceof Error ? error.message : String(error), 200);
          if (q(error)) {
            he = {
              label: Fe,
              error: Re.error,
            };
            $e ||= re(error);
            ie.stopLoading().catch(() => {});
          } else
            collector.add(
              {
                kind: "load",
                text: `not captured \u2014 ${Re.error}`,
              },
              Fe,
            );
        } finally {
          if (he === undefined)
            await M(ie.closeStrayWindows(), "cleanup").catch((error) => {
              if (q(error)) {
                he = {
                  label: Fe,
                  error: sanitizeDisplay(errorMessage(error), 200),
                };
                $e ||= re(error);
              }
            });
          for (let ze of Tt) collector.add(ze);
          for (let ze of blockedRequestIssues(
            ie.takeBlocked(),
            baseUrl,
            pageUrl,
            seenUrls,
            relativeRefs,
            collector,
          ))
            collector.add(ze);
          for (let ze of consoleErrorIssues(ie.takeErrors())) collector.add(ze, Fe);
          for (let ze of it) collector.add(ze, Fe);
          U++;
        }
      }
  } finally {
    await raceWithStepTimeout(
      ie.close({
        broken: $e,
      }),
      x() ? CHROME_CLOSE_GRACE_MS : stepTimeoutMs,
      "cleanup",
      timers,
      undefined,
    ).catch(() =>
      ie
        .close({
          broken: true,
        })
        .catch(() => {}),
    );
    we.close();
  }
  if (he !== undefined)
    collector.add({
      kind: "load",
      text: `render stopped at ${he.label}: ${he.error}`,
    });
  for (let Se of identicalThemeRenderIssues(S)) collector.add(Se);
  let { issues, dropped } = collector.done();
  issues.push(...relativeRefsNotLoadedIssues(relativeRefs), ...missingRuntimeCapabilityIssues(se, B));
  return {
    bytes: publishedBytes,
    shots: S,
    issues,
    issuesDropped: dropped,
  };
}
export {
  MAX_LISTED_UNLOADED_FILES,
  CSP_VIOLATION_COLLECTOR_SCRIPT,
  PREVIEW_CSP_POLICY,
  MAX_PAGE_USES,
  MAX_LISTED_REFS,
  MAX_COLLECTED_USES,
  MAX_PAGE_OBSERVERS,
  MAX_SVG_CLIPS,
  MAX_CDP_EVENT_CHARS,
  MAX_FAILED_CHECKS,
  MAX_TRACKED_SESSIONS,
  CSP_ALLOWED_ORIGINS,
  MAX_LISTED_MISSING_FILES,
  PreviewStepTimeout,
  randomPreviewHost,
  launchPreviewChrome,
  PreviewBrowserGone,
  CSP_AND_RTC_BLOCK_SCRIPT,
  isSameHttpOrigin,
  PreviewNavigatedAway,
  previewBrowserPool,
  renderPreviewDocument,
  EMULATOR_PREVIEW_BACKEND,
};
