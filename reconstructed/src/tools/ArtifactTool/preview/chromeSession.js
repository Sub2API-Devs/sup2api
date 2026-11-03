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
import {
  mkdtemp,
  mkdtemp as mkdtemp_2,
  writeFile,
  writeFile as writeFile_2,
  chmod,
  rm as rm_2,
  rm as rm_3,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  extname,
  extname as extname_2,
  extname as extname_3,
} from "path";
import { tmpdir as tmpdir_2, tmpdir as tmpdir_3 } from "os";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
} from "crypto";
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
  Ht,
  PreviewIssueCollector,
  staticPageIssues,
  composePreviewPage,
  raceWithStepTimeout,
  servePreviewPages,
  Hf,
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
import { pHo, Z$r } from "../promptText.js";
import { ensureToolResultsDir, writeToolResultFile } from "../../../utils/toolResultStorage.js";

/**
 * 仿真预览后端（artifact 查看器）：把页面字节写到私有临时目录，交给查看器仿真"看一眼"，返回 {engine:"emulator", look, durationMs}；中断时 look 为 aborted，结束后删除临时目录。
 */
//@ chunk-8wvtd8sr.js:165072-165606 placement
var EMULATOR_PREVIEW_BACKEND = {
  name: "emulator",
  async refusal() {
    return;
  },
  async render({ bytes: e, fileName: n, shotDir: s, shotName: r, signal: h }) {
    let now = Date.now(),
      p = await mkdtemp(join_3(tmpdir(), PREVIEW_COPY_DIR_PREFIX));
    try {
      let w = join_3(p, `page${extname_3(n).toLowerCase()}`);
      return (
        await writeFile_2(w, e, { flag: "wx" }),
        await chmod(w, 420),
        await chmod(p, 493),
        {
          engine: "emulator",
          look: await runEmulatorLook({ kind: "page", source: w }, { signal: h, shotDir: s, shotName: r }),
          durationMs: Date.now() - now,
        }
      );
    } catch (error) {
      if (error instanceof AbortError)
        return { engine: "emulator", look: { kind: "aborted" }, durationMs: Date.now() - now };
      throw error;
    } finally {
      await rm_2(p, { recursive: !0, force: !0 });
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
  constructor(e, n) {
    super(n, "artifact preview: protocol command failed");
    this.method = e;
    this.name = "CdpCommandError";
  }
}
//@ chunk-8wvtd8sr.js:166065-166081 placement
var Cw = 67108864;
/**
 * 通过 --remote-debugging-pipe 与 Chrome 通信的 CDP 连接：以 NUL 分隔的 JSON 消息收发，按 id 匹配请求应答、按事件名分发；消息过大或管道断开时以 PreviewBrowserGone 失败所有挂起请求。
 */
//@ chunk-8wvtd8sr.js:166081-168131 placement
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
  constructor(e, n, s) {
    this.out = e;
    this.onFailed = s;
    n.on("data", (h) => this.receive(h));
    let r = s ? () => {} : () => this.fail(new PreviewBrowserGone("Chrome closed the pipe"));
    (n.on("end", r), n.on("close", r), n.on("error", r), e.on("error", r));
  }
  get closedBecause() {
    return this.gone;
  }
  send(e, n = {}, s) {
    if (this.gone) return Promise.reject(this.gone);
    let r = ++this.nextId;
    return new Promise((h, y) => {
      this.pending.set(r, { method: e, resolve: h, reject: y });
      let p = jsonStringify(
        s === void 0 ? { id: r, method: e, params: n } : { id: r, method: e, params: n, sessionId: s },
      );
      this.out.write(p + "\x00", (w) => {
        if (w && this.pending.delete(r)) y(this.gone ?? new PreviewBrowserGone("the pipe to Chrome broke"));
      });
    });
  }
  on(e, n) {
    let s = this.handlers.get(e);
    if (!s) ((s = new Set()), this.handlers.set(e, s));
    return (s.add(n), () => s.delete(n));
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
    (this.ended.clear(), this.onFailed?.(e));
  }
  receive(e) {
    if (this.gone) return;
    let n = 0;
    for (;;) {
      let index = e.indexOf(0, n),
        r = index === -1 ? e.length : index;
      if (this.partialBytes + (r - n) > Cw) {
        ((this.partial = []),
          (this.partialBytes = 0),
          this.fail(
            new PreviewBrowserGone(
              "the page produced a browser message too large to handle; preview stopped",
            ),
          ));
        return;
      }
      if (index === -1) {
        if (n < e.length)
          (this.partial.push(n === 0 ? e : e.subarray(n)), (this.partialBytes += e.length - n));
        return;
      }
      let chunk = e.subarray(n, index),
        y = this.partial.length === 0 ? chunk : Buffer.concat([...this.partial, chunk]);
      if (((this.partial = []), (this.partialBytes = 0), this.dispatch(y.toString("utf8")), this.gone))
        return;
      n = index + 1;
    }
  }
  dispatch(e) {
    let n;
    try {
      n = Na(jsonParse(e));
    } catch {
      return;
    }
    if (typeof n.id === "number") {
      let s = this.pending.get(n.id);
      if (!s) return;
      this.pending.delete(n.id);
      let r = Na(n.error);
      if (n.error !== void 0)
        s.reject(new CdpCommandError(s.method, `${s.method}: ${Lw(r.message) || "failed"}`));
      else s.resolve(Na(n.result));
      return;
    }
    if (typeof n.method === "string") {
      let s = this.handlers.get(n.method);
      if (!s) return;
      let r = Na(n.params),
        h = typeof n.sessionId === "string" ? n.sessionId : void 0;
      for (let y of s)
        try {
          y(r, h);
        } catch {}
    }
  }
}
//@ chunk-8wvtd8sr.js:168131-168424 placement
class TailBuffer {
  max;
  chunks = [];
  size = 0;
  constructor(e) {
    this.max = e;
  }
  push(e) {
    (this.chunks.push(e), (this.size += e.length));
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
        detached: !1,
        windowsHide: !0,
        cwd: void 0,
        toolCgroupClass: "helper",
      }),
    mkdtemp: mkdtemp_2,
    rm: rm_3,
    setTimeout,
    clearTimeout,
    registerCleanup: (e) => registerCleanup(e),
  },
  CHROME_CLOSE_GRACE_MS = 2000,
  CLAUDE_ARTIFACT_PREVIEW = "claude-artifact-preview-",
  STDERR_TAIL_BYTES = 8192;
/**
 * 启动无头 Chrome 预览进程：临时 user-data-dir、fd 3/4 作为 CDP 管道、保留 stderr 尾部；返回 {cdp, profileDir, exited, stderrTail, close, kill}。
 * close 先发 Browser.close 等待片刻再强杀，最后删除临时目录；进程注册了退出清理。
 */
//@ chunk-8wvtd8sr.js:168680-169908 placement
async function launchPreviewChrome(chromePath, args, deps = DEFAULT_CHROME_DEPS) {
  let mkdtemp = await deps.mkdtemp(join_6(tmpdir_3(), CLAUDE_ARTIFACT_PREVIEW)),
    removeProfileDir = () => deps.rm(mkdtemp, { recursive: !0, force: !0, maxRetries: 3 }).catch(() => {}),
    child;
  try {
    child = deps.spawn(chromePath, [...args, `--user-data-dir=${mkdtemp}`]);
  } catch {
    throw (await removeProfileDir(), new PreviewBrowserGone("Chrome did not start"));
  }
  child.on("error", () => {});
  let stderrTail = new TailBuffer(STDERR_TAIL_BYTES);
  (child.stderr?.on("data", (M) => stderrTail.push(M)), child.stderr?.on("error", () => {}));
  let pipeOut = child.stdio[3],
    pipeIn = child.stdio[4];
  if (!Ow(pipeOut) || !isFileReadDenied(pipeIn))
    throw (child.kill("SIGKILL"), await removeProfileDir(), new PreviewBrowserGone("Chrome did not start"));
  child.unref();
  for (let M of [child.stderr, pipeOut, pipeIn]) unrefStream(M);
  let exited = !1,
    cdp = new CdpPipeConnection(pipeOut, pipeIn, () => {
      if (!exited) child.kill("SIGKILL");
    }),
    promise = new Promise((M) => {
      let x = (q) => {
        if (exited) return;
        ((exited = !0), cdp.fail(new PreviewBrowserGone(q)), M());
      };
      (child.once("exit", (q, re) => x(re ? `Chrome was killed (${re})` : `Chrome exited (${q ?? "?"})`)),
        child.once("error", () => x("Chrome did not start")));
    }),
    P,
    shutdown = (M) => {
      if (!M && !exited) child.kill("SIGKILL");
      return (
        (P ??= (async () => {
          if ((registerCleanup(), !exited && M && cdp.closedBecause === void 0)) {
            cdp.send("Browser.close").catch(() => {});
            let x,
              promise_2 = new Promise((Z) => {
                x = deps.setTimeout(() => Z("lingered"), CHROME_CLOSE_GRACE_MS);
              }),
              winner = await Promise.race([promise, promise_2]);
            if (x !== void 0) deps.clearTimeout(x);
            if (winner === "lingered" && !exited) child.kill("SIGKILL");
          } else if (!exited) child.kill("SIGKILL");
          (await promise, await removeProfileDir());
        })()),
        P
      );
    },
    registerCleanup = deps.registerCleanup(() => shutdown(!1));
  return {
    cdp: cdp,
    profileDir: mkdtemp,
    exited: promise,
    stderrTail: () => stderrTail.text(),
    close: () => shutdown(!0),
    kill: () => shutdown(!1),
  };
}
//@ chunk-8wvtd8sr.js:169908-170008 placement
function unrefStream(e) {
  if (e !== null && typeof e === "object" && "unref" in e && typeof e.unref === "function") e.unref();
}
//@ chunk-8wvtd8sr.js:170008-170073 placement
function Ow(e) {
  return e !== null && typeof e === "object" && "write" in e;
}
//@ chunk-8wvtd8sr.js:170073-170147 placement = isFileReadDenied (1)
function isFileReadDenied(e) {
  return e !== null && typeof e === "object" && "on" in e && "read" in e;
}
//@ chunk-8wvtd8sr.js:170147-170204 placement
function Na(e) {
  return e !== null && typeof e === "object" ? e : {};
}
//@ chunk-8wvtd8sr.js:170204-170251 placement
function Lw(e) {
  return typeof e === "string" ? e : "";
}
//@ chunk-8wvtd8sr.js:170288-170311 placement
var Fw = 300000,
  Nw = 60000;
//@ chunk-8wvtd8sr.js:170311-170371 placement
function Ql() {
  return `p${randomUUID_5().replaceAll("-", "")}.localhost`;
}
/**
 * 预览浏览器的串行租用池：acquire 排队获取（可被 signal 放弃），同参数复用已有 Chrome，否则启动新的；release 后空闲 idleMs 关闭浏览器。
 */
//@ chunk-8wvtd8sr.js:170371-171754 placement
function createPreviewBrowserPool(timers) {
  let current,
    idleTimer,
    leased = !1,
    waiting = 0,
    resolved = Promise.resolve(),
    p = (A) => {
      if (current?.browser === A) current = void 0;
    },
    w = () => {
      let A = current?.browser;
      if (A !== void 0 && waiting === 0)
        (timers.clearTimeout(idleTimer),
          (idleTimer = timers.setTimeout(() => {
            if (!leased && current?.browser === A) A.close().catch(() => {});
          }, timers.idleMs)));
    };
  return {
    async acquire(A) {
      let S,
        promise = new Promise((ie) => (S = ie)),
        T = resolved;
      ((resolved = T.then(() => promise)), waiting++);
      let P,
        promise_2 = new Promise((ie) => {
          ((P = () => ie("abandoned")), A?.addEventListener("abort", P, { once: !0 }));
        }),
        V = A?.aborted === !0 ? "abandoned" : await Promise.race([T, promise_2]);
      if ((A?.removeEventListener("abort", P), waiting--, V === "abandoned"))
        throw (
          T.then(() => {
            (w(), S());
          }),
          new PreviewBrowserGone("the preview was interrupted while waiting for the browser")
        );
      ((leased = !0), timers.clearTimeout(idleTimer));
      let M = current?.host ?? Ql(),
        x = !1,
        q = 0,
        re = !1,
        Z,
        ue = () => {
          if (re) return;
          ((re = !0), (leased = !1), timers.clearTimeout(Z), w(), S());
        },
        we = () => {
          if (x && q === 0) ue();
        },
        Ie = () => new PreviewBrowserGone("the preview stopped waiting for the browser");
      return {
        host: M,
        async browser(ie, _e, Oe) {
          if (x) throw Ie();
          q++;
          try {
            let joined = [ie, ..._e].join("\x00");
            if (
              current !== void 0 &&
              (current.key !== joined || current.browser.cdp.closedBecause !== void 0)
            ) {
              let browser = current.browser;
              ((current = void 0), await browser.kill());
            }
            if (re) throw Ie();
            if (current === void 0) {
              let ge = await Oe(ie, _e);
              if (re) throw (ge.kill().catch(() => {}), Ie());
              let Je = { ...ge, close: () => (p(Je), ge.close()), kill: () => (p(Je), ge.kill()) };
              ((current = { browser: Je, key: joined, host: M }),
                ge.exited.then(() => Je.close().catch(() => {})));
            }
            if (x) throw Ie();
            return current.browser;
          } finally {
            (q--, we());
          }
        },
        release() {
          if (x) return;
          if (((x = !0), q > 0)) Z = timers.setTimeout(ue, timers.startMs);
          we();
        },
      };
    },
  };
}
/**
 * 预览用浏览器进程池（懒创建，带空闲回收与启动超时）。
 */
//@ chunk-8wvtd8sr.js:171754-171875 placement
var previewBrowserPool = new HostScoped(() =>
  createPreviewBrowserPool({
    setTimeout: (e, n) => setTimeout(e, n).unref(),
    clearTimeout: (e) => clearTimeout(e),
    idleMs: Fw,
    startMs: Nw,
  }),
);
//@ chunk-8wvtd8sr.js:171875-174709 placement
var PREVIEW_SETTLE_TIMEOUT_MS = 20000,
  Hw = 60000,
  Ww = 2000,
  xw = 24,
  nd = 6,
  sd = 6,
  jf = 6,
  Vw = 5,
  zw = 8,
  zf = 8,
  qw = 8,
  Ma = 16,
  id = 262144,
  Kf =
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; form-action 'self'; frame-src 'self' blob: data:; object-src 'none'; webrtc 'block'; base-uri 'self'",
  Yf = new Set(Kf.match(/https:\/\/[^\s;']+/g) ?? []),
  Kw =
    "(function(){for(var k of ['RTCPeerConnection','webkitRTCPeerConnection','RTCDataChannel','RTCSessionDescription','RTCIceCandidate']){try{Object.defineProperty(window,k,{value:undefined,writable:false,configurable:true})}catch(e){try{delete window[k]}catch(e2){}}}})();(function(){var ap=Reflect.apply,gd=Object.getOwnPropertyDescriptor,EP=Element.prototype,MR=MutationRecord.prototype,NL=NodeList.prototype;var ln=gd(EP,'localName').get,ga=EP.getAttribute,ra=EP.removeAttribute,rm=EP.remove,qsa=EP.querySelectorAll,dq=Document.prototype.querySelectorAll,fq=DocumentFragment.prototype.querySelectorAll,sr=gd(EP,'shadowRoot').get,AS=EP.attachShadow,nt=gd(Node.prototype,'nodeType').get;var mA=gd(MR,'addedNodes').get,mT=gd(MR,'target').get,mK=gd(MR,'type').get,nL=gd(NL,'length').get,nI=NL.item,test=RegExp.prototype.test,observe=MutationObserver.prototype.observe;var H=/(^|\\s)(preconnect|dns-prefetch|prerender)(\\s|$)/i,S=/^\\s*speculationrules\\s*$/i,Q='link[rel],script[type]',opts={subtree:true,childList:true,attributes:true,attributeFilter:['rel','type']};function each(l,f){for(var i=0,n=ap(nL,l,[]);i<n;i++)f(ap(nI,l,[i]))}function all(root,sel){var t=ap(nt,root,[]);return ap(t===9?dq:t===11?fq:qsa,root,[sel])}function watch(root){try{ap(observe,obs,[root,opts]);each(all(root,Q),strip);each(all(root,'*'),hosted)}catch(e){}}function hosted(n){try{var s=ap(sr,n,[]);if(s)watch(s)}catch(e){}}function strip(n){try{if(!n||ap(nt,n,[])!==1)return;var l=ap(ln,n,[]);if(l==='link'&&ap(test,H,[ap(ga,n,['rel'])||'']))ap(ra,n,['rel']);if(l==='script'&&ap(test,S,[ap(ga,n,['type'])||''])){ap(rm,n,[]);return}hosted(n);each(all(n,Q),strip);each(all(n,'*'),hosted)}catch(e){}}var obs=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(ap(mK,m,[])==='attributes')strip(ap(mT,m,[]));else each(ap(mA,m,[]),strip)}});try{EP.attachShadow=function(init){var r=ap(AS,this,[init]);watch(r);return r}}catch(e){}watch(document)})();",
  Yw =
    "<script>window.__claudePreviewCsp=[];document.addEventListener('securitypolicyviolation',function(e){var l=window.__claudePreviewCsp;if(l.length<64)l.push({uri:String(e.blockedURI||'').slice(0,512),directive:String(e.effectiveDirective||e.violatedDirective||'').slice(0,64)})});</script>";
//@ chunk-8wvtd8sr.js:174709-174894 placement
class PreviewStepTimeout extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  step;
  ms;
  constructor(e, n) {
    super(`${e} timed out after ${Math.round(n / 1000)}s`, "artifact preview step timed out");
    this.step = e;
    this.ms = n;
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
/**
 * 判断 URL 是否为与给定地址同源的 http 地址（解析失败时比较字符串）。
 */
//@ chunk-8wvtd8sr.js:175158-175274 placement
function isSameHttpOrigin(e, n) {
  try {
    let s = new URL(e);
    return s.protocol === "http:" && s.origin === new URL(n).origin;
  } catch {
    return e === n;
  }
}
/**
 * 描述预览页被导航去的目标：同一文件的不同地址、另一个本地文件、http(s) 源、加载被拒的错误页，或其他协议的 URL。
 */
//@ chunk-8wvtd8sr.js:175274-175650 placement
function describeNavigationTarget(e, n) {
  try {
    let s = new URL(e);
    if (s.protocol === "file:")
      return s.pathname === new URL(n).pathname ? "a different address for this file" : "another local file";
    if (s.protocol === "http:" || s.protocol === "https:") return Ht(s.origin, 80);
    if (s.protocol === "chrome-error:") return "another document (the load was refused)";
    return `a ${Ht(s.protocol, 20)} URL`;
  } catch {
    return "another document";
  }
}
//@ chunk-8wvtd8sr.js:175650-179080 placement
async function renderPreviewDocument(e, n, s, r) {
  let h = await prepareArtifactBody(e, { injectDiagramRuntime: !0, injectHighlightRuntime: !0 }),
    y = composeArtifactPage(h.body, h.roundTripLang, h.roundTripCover),
    byteLength = Buffer.byteLength(y, "utf8"),
    w = new PreviewIssueCollector(n.length * s.length);
  for (let Se of staticPageIssues(e, byteLength)) w.add(Se);
  let A = new Map();
  for (let Se of s) A.set(Se, composePreviewPage(y, Se));
  let S = [],
    R = r.stepTimeoutMs ?? PREVIEW_SETTLE_TIMEOUT_MS,
    T = r.startTimeoutMs ?? Hw,
    P = r.settleMs ?? Ww,
    L = r.timers ?? { setTimeout: (Se, ce) => setTimeout(Se, ce), clearTimeout: (Se) => clearTimeout(Se) },
    V = r.encode ?? encodePreviewJpeg,
    M = (Se, ce) => raceWithStepTimeout(Se, R, ce, L, r.signal),
    x = () => r.signal?.aborted === !0,
    q = (Se) => Se instanceof PreviewStepTimeout || x() || Se instanceof PreviewBrowserGone,
    re = (Se) => Se instanceof PreviewStepTimeout || Se instanceof PreviewBrowserGone,
    Z = n[0] ?? pHo[0],
    ue = (Se) => {
      let { issues: issues, dropped: dropped } = w.done();
      return {
        bytes: byteLength,
        shots: S,
        issues: issues,
        issuesDropped: dropped,
        renderError: Ht(Se instanceof Error ? Se.message : String(Se), 200),
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
  if (x()) return (we.close(), ue(Error("preview aborted")));
  let baseUrl = we.baseUrl,
    ie,
    abortController = new AbortController(),
    open = r.browser.open(Z, Hf(Z), new URL(baseUrl).hostname, abortController.signal);
  try {
    ie = await raceWithStepTimeout(open, T, "starting the browser", L, r.signal);
  } catch (error) {
    return (
      abortController.abort(),
      open.then(
        (ce) => void ce.close().catch(() => {}),
        () => {},
      ),
      we.close(),
      ue(error)
    );
  }
  let me = new Set(),
    ge = new Set(),
    Je = new Set(),
    He = [],
    se = new Set(),
    B = !1,
    U = 0,
    he,
    $e = !1;
  try {
    for (let Se of s)
      for (let ce of n) {
        let Re = { width: ce, theme: Se };
        S.push(Re);
        let Fe = `${ce} ${Se}`;
        if (he !== void 0) {
          ((Re.error = "render stopped before this capture"), U++);
          continue;
        }
        let urlFor = we.urlFor(Se),
          it = [],
          Tt = [];
        try {
          let ze = Hf(ce);
          (await M(ie.resize(ce, ze), "resize"), await M(ie.load(urlFor, Se, we.topUrlFor(Se)), "load"));
          let Mt = ze;
          try {
            let Pt = parsePageMeasurement(await M(ie.measure(P), "checks"));
            if (!isSameHttpOrigin(Pt.href, urlFor)) throw new PreviewNavigatedAway(Pt.href, urlFor);
            it = layoutIssuesFromMeasurement(Pt);
            for (let use of Pt.uses)
              if (se.size < Ma) se.add(use);
              else if (!se.has(use)) B = !0;
            ((B ||= Pt.usesMore), (Tt = [...cspViolationIssues(Pt, me, w), ...dialogIssues(Pt, ge)]));
            let max = Math.max(Pt.sh, ze);
            if (((Mt = Math.min(max, Z$r)), max > Mt)) Re.pageHeight = max;
          } catch (error) {
            if (q(error) || error instanceof PreviewNavigatedAway) throw error;
            w.add(
              {
                kind: "load",
                text: `the checks could not run on this page (${Ht(error instanceof Error ? error.message : String(error), 100)})`,
              },
              Fe,
            );
          }
          if (((Re.height = Mt), Mt !== ze)) await M(ie.resize(ce, Mt), "resize");
          let Ct = await M(ie.settle(), "settle");
          if (typeof Ct === "string" && !isSameHttpOrigin(Ct, urlFor))
            throw new PreviewNavigatedAway(Ct, urlFor);
          let nn = await M(ie.screenshot(), "capture"),
            { jpeg: jpeg } = await V(nn);
          await ensureToolResultsDir(r.shotDir, void 0);
          let Et = join_5(r.shotDir, `${r.shotName(U)}.jpg`);
          (await writeToolResultFile(Et, jpeg), (Re.path = Et), (Re.base64 = jpeg.toString("base64")));
        } catch (error) {
          if (((Re.error = Ht(error instanceof Error ? error.message : String(error), 200)), q(error)))
            ((he = { label: Fe, error: Re.error }), ($e ||= re(error)), ie.stopLoading().catch(() => {}));
          else w.add({ kind: "load", text: `not captured \u2014 ${Re.error}` }, Fe);
        } finally {
          if (he === void 0)
            await M(ie.closeStrayWindows(), "cleanup").catch((ze) => {
              if (q(ze)) ((he = { label: Fe, error: Ht(errorMessage(ze), 200) }), ($e ||= re(ze)));
            });
          for (let ze of Tt) w.add(ze);
          for (let ze of blockedRequestIssues(ie.takeBlocked(), baseUrl, urlFor, Je, He, w)) w.add(ze);
          for (let ze of consoleErrorIssues(ie.takeErrors())) w.add(ze, Fe);
          for (let ze of it) w.add(ze, Fe);
          U++;
        }
      }
  } finally {
    (await raceWithStepTimeout(
      ie.close({ broken: $e }),
      x() ? CHROME_CLOSE_GRACE_MS : R,
      "cleanup",
      L,
      void 0,
    ).catch(() => ie.close({ broken: !0 }).catch(() => {})),
      we.close());
  }
  if (he !== void 0) w.add({ kind: "load", text: `render stopped at ${he.label}: ${he.error}` });
  for (let Se of identicalThemeRenderIssues(S)) w.add(Se);
  let { issues: issues, dropped: dropped } = w.done();
  return (
    issues.push(...relativeRefsNotLoadedIssues(He), ...missingRuntimeCapabilityIssues(se, B)),
    { bytes: byteLength, shots: S, issues: issues, issuesDropped: dropped }
  );
}

export {
  zf,
  Yw,
  Kf,
  xw,
  qw,
  Ma,
  nd,
  sd,
  id,
  jf,
  zw,
  Yf,
  Vw,
  PreviewStepTimeout,
  Ql,
  launchPreviewChrome,
  PreviewBrowserGone,
  Kw,
  isSameHttpOrigin,
  PreviewNavigatedAway,
  previewBrowserPool,
  renderPreviewDocument,
  EMULATOR_PREVIEW_BACKEND,
};
