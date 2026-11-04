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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
    let tempDir = await mkdtemp(join(tmpdir(), PREVIEW_COPY_DIR_PREFIX));
    try {
      let pagePath = join(tempDir, `page${extname(fileName).toLowerCase()}`);
      await writeFile(pagePath, bytes, {
        flag: "wx",
      });
      await chmod(pagePath, 420);
      await chmod(tempDir, 493);
      return {
        engine: "emulator",
        look: await runEmulatorLook(
          {
            kind: "page",
            source: pagePath,
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
      await rm_2(tempDir, {
        recursive: true,
        force: true,
      });
    }
  },
};
//@ chunk-8wvtd8sr.js:165818-165926 placement
let PreviewBrowserGone; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8wvtd8sr.js:165818", () => {
  PreviewBrowserGone = class PreviewBrowserGone extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(message) {
      super(message, "artifact preview: browser gone");
      this.name = "PreviewBrowserGone";
    }
  };
});
//@ chunk-8wvtd8sr.js:165926-166065 placement
let CdpCommandError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8wvtd8sr.js:165926", () => {
  CdpCommandError = class CdpCommandError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    method;
    constructor(method, message) {
      super(message, "artifact preview: protocol command failed");
      this.method = method;
      this.name = "CdpCommandError";
    }
  };
});
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
  constructor(pipeOut, pipeIn, onFailed) {
    this.out = pipeOut;
    this.onFailed = onFailed;
    pipeIn.on("data", (chunk) => this.receive(chunk));
    let onClosed = onFailed ? () => {} : () => this.fail(new PreviewBrowserGone("Chrome closed the pipe"));
    pipeIn.on("end", onClosed);
    pipeIn.on("close", onClosed);
    pipeIn.on("error", onClosed);
    pipeOut.on("error", onClosed);
  }
  get closedBecause() {
    return this.gone;
  }
  send(method, params = {}, sessionId) {
    if (this.gone) return Promise.reject(this.gone);
    let id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        method,
        resolve,
        reject,
      });
      let payload = jsonStringify(
        sessionId === undefined
          ? {
              id,
              method,
              params,
            }
          : {
              id,
              method,
              params,
              sessionId,
            },
      );
      this.out.write(payload + "\x00", (error) => {
        if (error && this.pending.delete(id))
          reject(this.gone ?? new PreviewBrowserGone("the pipe to Chrome broke"));
      });
    });
  }
  on(event, handler) {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }
  onGone(listener) {
    return this.gone ? () => {} : this.ended.subscribe(listener);
  }
  fail(error) {
    if (this.gone) return;
    this.gone = error;
    for (let pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    try {
      this.ended.emit(error);
    } catch {}
    this.ended.clear();
    this.onFailed?.(error);
  }
  receive(data) {
    if (this.gone) return;
    let offset = 0;
    for (;;) {
      let index = data.indexOf(0, offset);
      let nulIndex = index === -1 ? data.length : index;
      if (this.partialBytes + (nulIndex - offset) > MAX_CDP_MESSAGE_BYTES) {
        this.partial = [];
        this.partialBytes = 0;
        this.fail(
          new PreviewBrowserGone("the page produced a browser message too large to handle; preview stopped"),
        );
        return;
      }
      if (index === -1) {
        if (offset < data.length) {
          this.partial.push(offset === 0 ? data : data.subarray(offset));
          this.partialBytes += data.length - offset;
        }
        return;
      }
      let chunk = data.subarray(offset, index);
      let message = this.partial.length === 0 ? chunk : Buffer.concat([...this.partial, chunk]);
      this.partial = [];
      this.partialBytes = 0;
      this.dispatch(message.toString("utf8"));
      if (this.gone) return;
      offset = index + 1;
    }
  }
  dispatch(text) {
    let message;
    try {
      message = asRecord(jsonParse(text));
    } catch {
      return;
    }
    if (typeof message.id === "number") {
      let pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      let error = asRecord(message.error);
      if (message.error !== undefined)
        pending.reject(
          new CdpCommandError(
            pending.method,
            `${pending.method}: ${stringOrEmpty(error.message) || "failed"}`,
          ),
        );
      else pending.resolve(asRecord(message.result));
      return;
    }
    if (typeof message.method === "string") {
      let method = this.handlers.get(message.method);
      if (!method) return;
      let sessionId = asRecord(message.params);
      let sessionId_2 = typeof message.sessionId === "string" ? message.sessionId : undefined;
      for (let reply of method)
        try {
          reply(sessionId, sessionId_2);
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
  push(chunk) {
    this.chunks.push(chunk);
    this.size += chunk.length;
    while (this.size > this.max && this.chunks.length > 1) this.size -= this.chunks.shift().length;
  }
  text() {
    let str = Buffer.concat(this.chunks).toString("utf8");
    return str.length > this.max ? str.slice(-this.max) : str;
  }
}
//@ chunk-8wvtd8sr.js:168424-168680 placement
var DEFAULT_CHROME_DEPS = {
  spawn: (file, args) =>
    safeSpawn(file, args, {
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
  registerCleanup: (deps) => registerCleanup(deps),
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
  let profileDir = await deps.mkdtemp(join(tmpdir_2(), CLAUDE_ARTIFACT_PREVIEW));
  let removeProfileDir = () =>
    deps
      .rm(profileDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
      })
      .catch(() => {});
  let child;
  try {
    child = deps.spawn(chromePath, [...args, `--user-data-dir=${profileDir}`]);
  } catch {
    await removeProfileDir();
    throw new PreviewBrowserGone("Chrome did not start");
  }
  child.on("error", () => {});
  let stderrTail = new TailBuffer(STDERR_TAIL_BYTES);
  child.stderr?.on("data", (handle) => stderrTail.push(handle));
  child.stderr?.on("error", () => {});
  let pipeOut = child.stdio[3];
  let pipeIn = child.stdio[4];
  if (!isWritablePipe(pipeOut) || !isFileReadDenied(pipeIn)) {
    child.kill("SIGKILL");
    await removeProfileDir();
    throw new PreviewBrowserGone("Chrome did not start");
  }
  child.unref();
  for (let cdp of [child.stderr, pipeOut, pipeIn]) unrefStream(cdp);
  let exited = false;
  let cdp = new CdpPipeConnection(pipeOut, pipeIn, () => {
    if (!exited) child.kill("SIGKILL");
  });
  let promise = new Promise((resolve) => {
    let stderrTail = (stdoutTail) => {
      if (exited) return;
      exited = true;
      cdp.fail(new PreviewBrowserGone(stdoutTail));
      resolve();
    };
    child.once("exit", (exited, resolveExit) =>
      stderrTail(resolveExit ? `Chrome was killed (${resolveExit})` : `Chrome exited (${exited ?? "?"})`),
    );
    child.once("error", () => stderrTail("Chrome did not start"));
  });
  let killed;
  let shutdown = (kill) => {
    if (!kill && !exited) child.kill("SIGKILL");
    killed ??= (async () => {
      stderrText();
      if (!exited && kill && cdp.closedBecause === undefined) {
        cdp.send("Browser.close").catch(() => {});
        let connectDeadline;
        let promise_2 = new Promise((resolve) => {
          connectDeadline = deps.setTimeout(() => resolve("lingered"), CHROME_CLOSE_GRACE_MS);
        });
        let winner = await Promise.race([promise, promise_2]);
        if (connectDeadline !== undefined) deps.clearTimeout(connectDeadline);
        if (winner === "lingered" && !exited) child.kill("SIGKILL");
      } else if (!exited) child.kill("SIGKILL");
      await promise;
      await removeProfileDir();
    })();
    return killed;
  };
  let stderrText = deps.registerCleanup(() => shutdown(false));
  return {
    cdp,
    profileDir,
    exited: promise,
    stderrTail: () => stderrTail.text(),
    close: () => shutdown(true),
    kill: () => shutdown(false),
  };
}
//@ chunk-8wvtd8sr.js:169908-170008 placement
function unrefStream(stream) {
  if (
    stream !== null &&
    typeof stream === "object" &&
    "unref" in stream &&
    typeof stream.unref === "function"
  )
    stream.unref();
}
//@ chunk-8wvtd8sr.js:170008-170073 placement
/**
 * 判断对象是否是可写管道。
 */
function isWritablePipe(pipeOut) {
  return pipeOut !== null && typeof pipeOut === "object" && "write" in pipeOut;
}
//@ chunk-8wvtd8sr.js:170073-170147 placement (2.1.88 match: isFileReadDenied, 1)
function isFileReadDenied(pipeIn) {
  return pipeIn !== null && typeof pipeIn === "object" && "on" in pipeIn && "read" in pipeIn;
}
//@ chunk-8wvtd8sr.js:170147-170204 placement
/**
 * 非空对象原样返回，否则空对象。
 */
function asRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
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
  let forgetBrowser = (browser) => {
    if (current?.browser === browser) current = undefined;
  };
  let release = () => {
    let browser = current?.browser;
    if (browser !== undefined && waiting === 0) {
      timers.clearTimeout(idleTimer);
      idleTimer = timers.setTimeout(() => {
        if (!leased && current?.browser === browser) browser.close().catch(() => {});
      }, timers.idleMs);
    }
  };
  return {
    async acquire(lease) {
      let resolveLease;
      let promise = new Promise((resolve) => (resolveLease = resolve));
      let acquire = resolved;
      resolved = acquire.then(() => promise);
      waiting++;
      let armIdleTimer;
      let promise_2 = new Promise((resolve) => {
        armIdleTimer = () => resolve("abandoned");
        lease?.addEventListener("abort", armIdleTimer, {
          once: true,
        });
      });
      let poll = lease?.aborted === true ? "abandoned" : await Promise.race([acquire, promise_2]);
      lease?.removeEventListener("abort", armIdleTimer);
      waiting--;
      if (poll === "abandoned") {
        acquire.then(() => {
          release();
          resolveLease();
        });
        throw new PreviewBrowserGone("the preview was interrupted while waiting for the browser");
      }
      leased = true;
      timers.clearTimeout(idleTimer);
      let host = current?.host ?? randomPreviewHost();
      let cached = false;
      let timerId = 0;
      let reject = false;
      let onTimer;
      let handleDefer = () => {
        if (reject) return;
        reject = true;
        leased = false;
        timers.clearTimeout(onTimer);
        release();
        resolveLease();
      };
      let entry = () => {
        if (cached && timerId === 0) handleDefer();
      };
      let leaseEntry = () => new PreviewBrowserGone("the preview stopped waiting for the browser");
      return {
        host,
        async browser(next, waiter, resolveWaiter) {
          if (cached) throw leaseEntry();
          timerId++;
          try {
            let joined = [next, ...waiter].join("\x00");
            if (
              current !== undefined &&
              (current.key !== joined || current.browser.cdp.closedBecause !== undefined)
            ) {
              let browser = current.browser;
              current = undefined;
              await browser.kill();
            }
            if (reject) throw leaseEntry();
            if (current === undefined) {
              let idleTimer = await resolveWaiter(next, waiter);
              if (reject) {
                idleTimer.kill().catch(() => {});
                throw leaseEntry();
              }
              let browser = {
                ...idleTimer,
                close: () => {
                  forgetBrowser(browser);
                  return idleTimer.close();
                },
                kill: () => {
                  forgetBrowser(browser);
                  return idleTimer.kill();
                },
              };
              current = {
                browser,
                key: joined,
                host,
              };
              idleTimer.exited.then(() => browser.close().catch(() => {}));
            }
            if (cached) throw leaseEntry();
            return current.browser;
          } finally {
            timerId--;
            entry();
          }
        },
        release() {
          if (cached) return;
          cached = true;
          if (timerId > 0) onTimer = timers.setTimeout(handleDefer, timers.startMs);
          entry();
        },
      };
    },
  };
}
//@ chunk-8wvtd8sr.js:171754-171875 placement
/**
 * 预览用浏览器进程池（懒创建，带空闲回收与启动超时）。
 */
var previewBrowserPool; // deferred: uses createPreviewBrowserPool of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8wvtd8sr.js:171754", () => {
  previewBrowserPool = new HostScoped(() =>
    createPreviewBrowserPool({
      setTimeout: (fn, delayMs) => setTimeout(fn, delayMs).unref(),
      clearTimeout: (timerId) => clearTimeout(timerId),
      idleMs: BROWSER_IDLE_MS,
      startMs: BROWSER_START_TIMEOUT_MS,
    }),
  );
});
//@ chunk-8wvtd8sr.js:171875-174709 placement
/**
 * 预览租用池的默认参数与报告上限：启动/稳定等待、各类清单条数、CSP 与注入脚本。
 */
var PREVIEW_SETTLE_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PREVIEW_START_TIMEOUT_MS;
var PREVIEW_SETTLE_DELAY_MS;
var MAX_PAGE_USES;
var MAX_PAGE_OBSERVERS;
var MAX_SVG_CLIPS;
var MAX_FAILED_CHECKS;
var MAX_LISTED_MISSING_FILES;
var MAX_TRACKED_SESSIONS;
var MAX_LISTED_UNLOADED_FILES;
var MAX_LISTED_REFS;
var MAX_COLLECTED_USES;
var MAX_CDP_EVENT_CHARS;
var PREVIEW_CSP_POLICY;
var CSP_ALLOWED_ORIGINS;
var CSP_AND_RTC_BLOCK_SCRIPT;
var CSP_VIOLATION_COLLECTOR_SCRIPT;
deferInit("chunk-8wvtd8sr.js:171875", () => {
  PREVIEW_SETTLE_TIMEOUT_MS = 20000;
  PREVIEW_START_TIMEOUT_MS = 60000;
  PREVIEW_SETTLE_DELAY_MS = 2000;
  MAX_PAGE_USES = 24;
  MAX_PAGE_OBSERVERS = 6;
  MAX_SVG_CLIPS = 6;
  MAX_FAILED_CHECKS = 6;
  MAX_LISTED_MISSING_FILES = 5;
  MAX_TRACKED_SESSIONS = 8;
  MAX_LISTED_UNLOADED_FILES = 8;
  MAX_LISTED_REFS = 8;
  MAX_COLLECTED_USES = 16;
  MAX_CDP_EVENT_CHARS = 262144;
  PREVIEW_CSP_POLICY =
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; form-action 'self'; frame-src 'self' blob: data:; object-src 'none'; webrtc 'block'; base-uri 'self'";
  CSP_ALLOWED_ORIGINS = new Set(PREVIEW_CSP_POLICY.match(/https:\/\/[^\s;']+/g) ?? []);
  CSP_AND_RTC_BLOCK_SCRIPT =
    "(function(){for(var k of ['RTCPeerConnection','webkitRTCPeerConnection','RTCDataChannel','RTCSessionDescription','RTCIceCandidate']){try{Object.defineProperty(window,k,{value:undefined,writable:false,configurable:true})}catch(e){try{delete window[k]}catch(e2){}}}})();(function(){var ap=Reflect.apply,gd=Object.getOwnPropertyDescriptor,EP=Element.prototype,MR=MutationRecord.prototype,NL=NodeList.prototype;var ln=gd(EP,'localName').get,ga=EP.getAttribute,ra=EP.removeAttribute,rm=EP.remove,qsa=EP.querySelectorAll,dq=Document.prototype.querySelectorAll,fq=DocumentFragment.prototype.querySelectorAll,sr=gd(EP,'shadowRoot').get,AS=EP.attachShadow,nt=gd(Node.prototype,'nodeType').get;var mA=gd(MR,'addedNodes').get,mT=gd(MR,'target').get,mK=gd(MR,'type').get,nL=gd(NL,'length').get,nI=NL.item,test=RegExp.prototype.test,observe=MutationObserver.prototype.observe;var H=/(^|\\s)(preconnect|dns-prefetch|prerender)(\\s|$)/i,S=/^\\s*speculationrules\\s*$/i,Q='link[rel],script[type]',opts={subtree:true,childList:true,attributes:true,attributeFilter:['rel','type']};function each(l,f){for(var i=0,n=ap(nL,l,[]);i<n;i++)f(ap(nI,l,[i]))}function all(root,sel){var t=ap(nt,root,[]);return ap(t===9?dq:t===11?fq:qsa,root,[sel])}function watch(root){try{ap(observe,obs,[root,opts]);each(all(root,Q),strip);each(all(root,'*'),hosted)}catch(e){}}function hosted(n){try{var s=ap(sr,n,[]);if(s)watch(s)}catch(e){}}function strip(n){try{if(!n||ap(nt,n,[])!==1)return;var l=ap(ln,n,[]);if(l==='link'&&ap(test,H,[ap(ga,n,['rel'])||'']))ap(ra,n,['rel']);if(l==='script'&&ap(test,S,[ap(ga,n,['type'])||''])){ap(rm,n,[]);return}hosted(n);each(all(n,Q),strip);each(all(n,'*'),hosted)}catch(e){}}var obs=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(ap(mK,m,[])==='attributes')strip(ap(mT,m,[]));else each(ap(mA,m,[]),strip)}});try{EP.attachShadow=function(init){var r=ap(AS,this,[init]);watch(r);return r}}catch(e){}watch(document)})();";
  CSP_VIOLATION_COLLECTOR_SCRIPT =
    "<script>window.__claudePreviewCsp=[];document.addEventListener('securitypolicyviolation',function(e){var l=window.__claudePreviewCsp;if(l.length<64)l.push({uri:String(e.blockedURI||'').slice(0,512),directive:String(e.effectiveDirective||e.violatedDirective||'').slice(0,64)})});</script>";
});
//@ chunk-8wvtd8sr.js:174709-174894 placement
let PreviewStepTimeout; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8wvtd8sr.js:174709", () => {
  PreviewStepTimeout = class PreviewStepTimeout extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    step;
    ms;
    constructor(stepName, timeoutMs) {
      super(
        `${stepName} timed out after ${Math.round(timeoutMs / 1000)}s`,
        "artifact preview step timed out",
      );
      this.step = stepName;
      this.ms = timeoutMs;
      this.name = "PreviewStepTimeout";
    }
  };
});
//@ chunk-8wvtd8sr.js:174894-175158 placement
let PreviewNavigatedAway; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8wvtd8sr.js:174894", () => {
  PreviewNavigatedAway = class PreviewNavigatedAway extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    destination;
    constructor(destination, expectedUrl) {
      super(
        `the page navigated itself to ${describeNavigationTarget(destination, expectedUrl)}; preview renders only this file and the published viewer blocks navigation`,
        "artifact preview page navigated away",
      );
      this.destination = destination;
      this.name = "PreviewNavigatedAway";
    }
  };
});
//@ chunk-8wvtd8sr.js:175158-175274 placement
/**
 * 判断 URL 是否为与给定地址同源的 http 地址（解析失败时比较字符串）。
 */
function isSameHttpOrigin(href, pageUrl) {
  try {
    let parsed = new URL(href);
    return parsed.protocol === "http:" && parsed.origin === new URL(pageUrl).origin;
  } catch {
    return href === pageUrl;
  }
}
//@ chunk-8wvtd8sr.js:175274-175650 placement
/**
 * 描述预览页被导航去的目标：同一文件的不同地址、另一个本地文件、http(s) 源、加载被拒的错误页，或其他协议的 URL。
 */
function describeNavigationTarget(destination, expectedUrl) {
  try {
    let parsed = new URL(destination);
    if (parsed.protocol === "file:")
      return parsed.pathname === new URL(expectedUrl).pathname
        ? "a different address for this file"
        : "another local file";
    if (parsed.protocol === "http:" || parsed.protocol === "https:")
      return sanitizeDisplay(parsed.origin, 80);
    if (parsed.protocol === "chrome-error:") return "another document (the load was refused)";
    return `a ${sanitizeDisplay(parsed.protocol, 20)} URL`;
  } catch {
    return "another document";
  }
}
//@ chunk-8wvtd8sr.js:175650-179080 placement
async function renderPreviewDocument(html, widths, themes, options) {
  let artifactBody = await prepareArtifactBody(html, {
    injectDiagramRuntime: true,
    injectHighlightRuntime: true,
  });
  let composedHtml = composeArtifactPage(
    artifactBody.body,
    artifactBody.roundTripLang,
    artifactBody.roundTripCover,
  );
  let publishedBytes = Buffer.byteLength(composedHtml, "utf8");
  let collector = new PreviewIssueCollector(widths.length * themes.length);
  for (let issue of staticPageIssues(html, publishedBytes)) collector.add(issue);
  let pages = new Map();
  for (let theme of themes) pages.set(theme, composePreviewPage(composedHtml, theme));
  let shots = [];
  let stepTimeoutMs = options.stepTimeoutMs ?? PREVIEW_SETTLE_TIMEOUT_MS;
  let startTimeoutMs = options.startTimeoutMs ?? PREVIEW_START_TIMEOUT_MS;
  let settleMs = options.settleMs ?? PREVIEW_SETTLE_DELAY_MS;
  let timers = options.timers ?? {
    setTimeout: (delayMs, fn) => setTimeout(delayMs, fn),
    clearTimeout: (timerId) => clearTimeout(timerId),
  };
  let encode = options.encode ?? encodePreviewJpeg;
  let step = (promise, stepName) =>
    raceWithStepTimeout(promise, stepTimeoutMs, stepName, timers, options.signal);
  let aborted = () => options.signal?.aborted === true;
  let isRetriable = (error) =>
    error instanceof PreviewStepTimeout || aborted() || error instanceof PreviewBrowserGone;
  let isBrowserLoss = (error) => error instanceof PreviewStepTimeout || error instanceof PreviewBrowserGone;
  let firstWidth = widths[0] ?? DEFAULT_PREVIEW_WIDTHS[0];
  let settleFailure = (error) => {
    let { issues, dropped } = collector.done();
    return {
      bytes: publishedBytes,
      shots,
      issues,
      issuesDropped: dropped,
      renderError: sanitizeDisplay(error instanceof Error ? error.message : String(error), 200),
    };
  };
  if (aborted()) return settleFailure(Error("preview aborted"));
  let server;
  try {
    server = await (options.serve ?? servePreviewPages)(pages, options.host);
  } catch (error) {
    return settleFailure(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the local preview server could not start (${error instanceof Error ? error.message : String(error)})`,
        "artifact preview: page server failed to start",
      ),
    );
  }
  if (aborted()) {
    server.close();
    return settleFailure(Error("preview aborted"));
  }
  let baseUrl = server.baseUrl;
  let page;
  let abortController = new AbortController();
  let promise = options.browser.open(
    firstWidth,
    themeForViewportWidth(firstWidth),
    new URL(baseUrl).hostname,
    abortController.signal,
  );
  try {
    page = await raceWithStepTimeout(promise, startTimeoutMs, "starting the browser", timers, options.signal);
  } catch (error) {
    abortController.abort();
    promise.then(
      (ctx) => void ctx.close().catch(() => {}),
      () => {},
    );
    server.close();
    return settleFailure(error);
  }
  let visitedThemes = new Set();
  let visitedWidths = new Set();
  let seenUrls = new Set();
  let failures = [];
  let visitedPairs = new Set();
  let stopped = false;
  let shotIndex = 0;
  let stopError;
  let finalizing = false;
  try {
    for (let theme of themes)
      for (let width of widths) {
        let shot = {
          width,
          theme,
        };
        shots.push(shot);
        let label = `${width} ${theme}`;
        if (stopError !== undefined) {
          shot.error = "render stopped before this capture";
          shotIndex++;
          continue;
        }
        let themeUrl = server.urlFor(theme);
        let issues = [];
        let notes = [];
        try {
          let darkTheme = themeForViewportWidth(width);
          await step(page.resize(width, darkTheme), "resize");
          await step(page.load(themeUrl, theme, server.topUrlFor(theme)), "load");
          let currentTheme = darkTheme;
          try {
            let measurement = parsePageMeasurement(await step(page.measure(settleMs), "checks"));
            if (!isSameHttpOrigin(measurement.href, themeUrl))
              throw new PreviewNavigatedAway(measurement.href, themeUrl);
            issues = layoutIssuesFromMeasurement(measurement);
            for (let use of measurement.uses)
              if (visitedPairs.size < MAX_COLLECTED_USES) visitedPairs.add(use);
              else if (!visitedPairs.has(use)) stopped = true;
            stopped ||= measurement.usesMore;
            notes = [
              ...cspViolationIssues(measurement, visitedThemes, collector),
              ...dialogIssues(measurement, visitedWidths),
            ];
            let max = Math.max(measurement.sh, darkTheme);
            currentTheme = Math.min(max, MAX_PREVIEW_SCREENSHOT_HEIGHT);
            if (max > currentTheme) shot.pageHeight = max;
          } catch (error) {
            if (isRetriable(error) || error instanceof PreviewNavigatedAway) throw error;
            collector.add(
              {
                kind: "load",
                text: `the checks could not run on this page (${sanitizeDisplay(error instanceof Error ? error.message : String(error), 100)})`,
              },
              label,
            );
          }
          shot.height = currentTheme;
          if (currentTheme !== darkTheme) await step(page.resize(width, currentTheme), "resize");
          let settled = await step(page.settle(), "settle");
          if (typeof settled === "string" && !isSameHttpOrigin(settled, themeUrl))
            throw new PreviewNavigatedAway(settled, themeUrl);
          let capture = await step(page.screenshot(), "capture");
          let { jpeg } = await encode(capture);
          await ensureToolResultsDir(options.shotDir, undefined);
          let shotPath = join(options.shotDir, `${options.shotName(shotIndex)}.jpg`);
          await writeToolResultFile(shotPath, jpeg);
          shot.path = shotPath;
          shot.base64 = jpeg.toString("base64");
        } catch (error) {
          shot.error = sanitizeDisplay(error instanceof Error ? error.message : String(error), 200);
          if (isRetriable(error)) {
            stopError = {
              label,
              error: shot.error,
            };
            finalizing ||= isBrowserLoss(error);
            page.stopLoading().catch(() => {});
          } else
            collector.add(
              {
                kind: "load",
                text: `not captured \u2014 ${shot.error}`,
              },
              label,
            );
        } finally {
          if (stopError === undefined)
            await step(page.closeStrayWindows(), "cleanup").catch((error) => {
              if (isRetriable(error)) {
                stopError = {
                  label,
                  error: sanitizeDisplay(errorMessage(error), 200),
                };
                finalizing ||= isBrowserLoss(error);
              }
            });
          for (let issue of notes) collector.add(issue);
          for (let issue of blockedRequestIssues(
            page.takeBlocked(),
            baseUrl,
            themeUrl,
            seenUrls,
            failures,
            collector,
          ))
            collector.add(issue);
          for (let issue of consoleErrorIssues(page.takeErrors())) collector.add(issue, label);
          for (let issue of issues) collector.add(issue, label);
          shotIndex++;
        }
      }
  } finally {
    await raceWithStepTimeout(
      page.close({
        broken: finalizing,
      }),
      aborted() ? CHROME_CLOSE_GRACE_MS : stepTimeoutMs,
      "cleanup",
      timers,
      undefined,
    ).catch(() =>
      page
        .close({
          broken: true,
        })
        .catch(() => {}),
    );
    server.close();
  }
  if (stopError !== undefined)
    collector.add({
      kind: "load",
      text: `render stopped at ${stopError.label}: ${stopError.error}`,
    });
  for (let issue of identicalThemeRenderIssues(shots)) collector.add(issue);
  let { issues, dropped } = collector.done();
  issues.push(
    ...relativeRefsNotLoadedIssues(failures),
    ...missingRuntimeCapabilityIssues(visitedPairs, stopped),
  );
  return {
    bytes: publishedBytes,
    shots,
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
