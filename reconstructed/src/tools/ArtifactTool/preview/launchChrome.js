/**
 * tools/ArtifactTool/preview/launchChrome.ts
 *
 * 2.1.316 新增：启动 headless Chrome
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (9)
 * attribution: placement 9
 */
import { pt, Fs, Rt, p_, eh, ad, previewEvalScript } from "./pageChecks.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";
import {
  launchPreviewChrome,
  PreviewBrowserGone,
  Kw,
  isSameHttpOrigin,
  PreviewNavigatedAway,
  Yf,
} from "./chromeSession.js";
import { getFirstLine, stripPrefix } from "../../../utils/stringUtils.js";
import { MERMAID_RUNTIME_PATH } from "../../../services/artifacts/pageRuntimes.js";

//@ chunk-8wvtd8sr.js:199726-199836 placement
function hostResolverRules(e) {
  return `MAP * ^NOTFOUND, EXCLUDE ${e}, EXCLUDE fonts.googleapis.com, EXCLUDE fonts.gstatic.com`;
}
/**
 * 预览用 headless Chrome 的启动参数：管道远程调试、按规则屏蔽域名解析、关闭代理/扩展/同步/后台网络等，需要时加 --no-sandbox。
 */
//@ chunk-8wvtd8sr.js:199836-200499 placement
function previewChromeArgs(noSandbox, allowedHosts) {
  return [
    "--headless=new",
    "--remote-debugging-pipe",
    `--host-resolver-rules=${hostResolverRules(allowedHosts)}`,
    "--no-proxy-server",
    "--no-first-run",
    "--no-default-browser-check",
    "--use-mock-keychain",
    "--password-store=basic",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-breakpad",
    "--disable-component-extensions-with-background-pages",
    "--disable-site-isolation-trials",
    "--disable-features=IsolateSandboxedIframes,OriginKeyedProcessesByDefault,MediaRouter,Translate,OptimizationHints",
    "--no-pings",
    "--mute-audio",
    "--disable-gpu",
    "--block-new-web-contents",
    ...(noSandbox ? ["--no-sandbox"] : []),
  ];
}
/**
 * 自检预览浏览器的网络封锁：起一个本地 HTTP 服务，访问 127.0.0.1 与 localhost 必须得到 ERR_NAME_NOT_RESOLVED，否则说明浏览器忽略了主机规则，抛错停止预览。
 */
//@ chunk-8wvtd8sr.js:200499-200976 placement
async function assertNetworkLockdown(e, n) {
  let serve = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => new Response("reachable", { status: 200 }),
  });
  try {
    for (let r of ["127.0.0.1", "localhost"]) {
      let h = n();
      h.catch(() => {});
      let y = await e(`http://${r}:${serve.port}/preview-selftest`);
      if (pt(y.errorText) !== "net::ERR_NAME_NOT_RESOLVED")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "this browser ignored the preview network lock-down; preview stopped before loading the page",
          "artifact preview: browser ignored host rules",
        );
      await h;
    }
  } finally {
    serve.stop(!0);
  }
}
/**
 * headless Chrome 预览会话：打开页面、收集控制台/网络错误并截图。
 */
//@ chunk-8wvtd8sr.js:200976-208758 placement
function createChromePreviewSession(e, n, s = launchPreviewChrome) {
  return {
    async open(r, h, y, p) {
      let w = [],
        A = [],
        S = new Set(),
        R = (oe) => {
          if (S.size < 256) S.add(oe.slice(0, 512));
        },
        T = (oe) => S.has(oe.slice(0, 512)),
        P,
        L,
        V = "",
        M = (oe) => {
          if (w.length < 200) w.push(oe.slice(0, 400));
        },
        chrome = await e.resolveChrome();
      if (chrome === void 0) {
        let installHint = e.installHint();
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          installHint !== void 0
            ? `Chrome not found. Run via Bash first (one-time, ~270 MB): ${installHint}`
            : "Chrome not found: install Chrome or Chromium, or point BUN_CHROME_PATH at one.",
          "artifact preview: chrome not found",
        );
      }
      if (p?.aborted) throw new PreviewBrowserGone("the preview gave up before its browser started");
      let browser = await n.browser(chrome, previewChromeArgs(e.noSandbox(), y), s),
        re = () => void browser.kill().catch(() => {});
      if (p?.aborted) await browser.kill();
      p?.addEventListener("abort", re, { once: !0 });
      let cdp = browser.cdp,
        ue = "",
        we = "",
        Ie = "",
        ie = [() => p?.removeEventListener("abort", re)],
        _e = () => {
          for (let oe of ie.splice(0)) oe();
        },
        Oe = (oe, ke) => cdp.send(oe, ke, ue),
        me = (oe, ke) => {
          let on = cdp.on(oe, (ce, Re) => {
            if (Re === ue) ke(ce);
          });
          return (ie.push(on), on);
        },
        ge = (oe) =>
          new Promise((ke, Se) => {
            if (cdp.closedBecause !== void 0) {
              Se(cdp.closedBecause);
              return;
            }
            let ce = me(oe, (Fe) => {
                (ce(), onGone(), ke(Fe));
              }),
              onGone = cdp.onGone((Fe) => {
                (ce(), Se(Fe));
              });
            ie.push(() => {
              (onGone(), Se(new PreviewBrowserGone("the preview tab was closed")));
            });
          }),
        Je = (oe, ke) =>
          Oe("Emulation.setDeviceMetricsOverride", {
            width: oe,
            height: ke,
            deviceScaleFactor: 1,
            mobile: !1,
          }),
        He = new Set(),
        se = (oe) => oe.type === "page" && pt(oe.targetId) !== we && !He.has(pt(oe.targetId)),
        B = (oe) => cdp.send("Target.closeTarget", { targetId: pt(oe.targetId) }).catch(() => {});
      try {
        let oe = new Set(
          Fs(Rt(await cdp.send("Target.getBrowserContexts")).browserContextIds).map((Re) => pt(Re)),
        );
        for (let Re of Fs(Rt(await cdp.send("Target.getTargets")).targetInfos)) {
          let Fe = Rt(Re);
          if (Fe.type === "page" && !oe.has(pt(Fe.browserContextId))) He.add(pt(Fe.targetId));
          else if (se(Fe)) B(Fe);
        }
        (await cdp.send("Fetch.disable"),
          browser.betweenCalls?.(),
          (browser.betweenCalls = void 0),
          (Ie = pt(
            (await cdp.send("Target.createBrowserContext", { disposeOnDetach: !0 })).browserContextId,
          )),
          (we = pt(
            (await cdp.send("Target.createTarget", { url: "about:blank", browserContextId: Ie })).targetId,
          )),
          (ue = pt((await cdp.send("Target.attachToTarget", { targetId: we, flatten: !0 })).sessionId)),
          ie.push(
            cdp.on("Target.targetCreated", (Re) => {
              let Fe = Rt(Re.targetInfo);
              if (se(Fe)) B(Fe);
            }),
          ),
          await cdp.send("Target.setDiscoverTargets", { discover: !0 }));
        for (let Re of Fs(Rt(await cdp.send("Target.getTargets")).targetInfos)) if (se(Rt(Re))) B(Rt(Re));
        (await Oe("Page.enable"),
          await assertNetworkLockdown(
            (Re) => Oe("Page.navigate", { url: Re }),
            () => ge("Page.loadEventFired"),
          ),
          await Oe("Runtime.enable"),
          await Oe("Log.enable"),
          (V = pt(Rt(Rt(Rt(await Oe("Page.getFrameTree")).frameTree).frame).id)),
          await Je(r, h),
          await Oe("Page.addScriptToEvaluateOnNewDocument", { source: Kw + p_ }));
        let ke = (Re, Fe) => {
          let xe = pt(Re.requestId),
            it = Rt(Re.request),
            Tt = pt(it.url),
            ze = it.hasPostData === !0 || typeof it.postData === "string",
            Mt = pt(it.method) || "GET";
          if (
            L !== void 0 && pt(Re.frameId) === V
              ? F_(Tt, L, Mt, ze)
              : isAllowedPreviewRequest(Tt, P, Mt, ze, pt(Re.resourceType))
          ) {
            cdp.send("Fetch.continueRequest", { requestId: xe }, Fe).catch(() => {});
            return;
          }
          if (!T(Tt) && A.length < 64) A.push({ url: Tt.slice(0, 512), type: pt(Re.resourceType) });
          (R(Tt),
            cdp
              .send("Fetch.failRequest", { requestId: xe, errorReason: "BlockedByClient" }, Fe)
              .catch(() => {}));
        };
        (ie.push(cdp.on("Fetch.requestPaused", ke)),
          await Oe("Fetch.enable", { patterns: [{ urlPattern: "*" }] }),
          await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] }));
        let Se = async (Re) => {
            await cdp.send(
              "Target.setAutoAttach",
              { autoAttach: !0, waitForDebuggerOnStart: !0, flatten: !0 },
              Re,
            );
          },
          on = cdp.on("Target.attachedToTarget", (Re, Fe) => {
            if (Fe === void 0) return;
            let xe = pt(Re.sessionId),
              it = pt(Rt(Re.targetInfo).type);
            if (
              !(it === "worker" || it === "shared_worker" || it === "service_worker" || it === "worklet") ||
              Re.waitingForDebugger !== !0
            ) {
              (cdp.fail(
                new PreviewBrowserGone(
                  "part of the page started outside the preview sandbox; preview stopped",
                ),
              ),
                browser.kill().catch(() => {}));
              return;
            }
            (async () => {
              try {
                (await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] }, xe), await Se(xe));
              } catch {
              } finally {
                cdp.send("Runtime.runIfWaitingForDebugger", {}, xe).catch(() => {});
              }
            })();
          });
        (ie.push(on),
          await Se(ue),
          await Oe("Page.setDownloadBehavior", { behavior: "deny" }),
          me("Page.downloadWillBegin", (Re) => {
            let Fe = pt(Re.suggestedFilename) || pt(Re.url);
            if (!T(`download:${Fe}`) && A.length < 64) A.push({ url: Fe.slice(0, 512), type: "download" });
            R(`download:${Fe}`);
          }),
          me("Page.windowOpen", (Re) => {
            let Fe = pt(Re.url);
            if (!T(`popup:${Fe}`) && A.length < 64) A.push({ url: Fe.slice(0, 512), type: "popup" });
            R(`popup:${Fe}`);
          }),
          me("Page.javascriptDialogOpening", (Re) => {
            let Fe = pt(Re.type);
            if (
              (Oe("Page.handleJavaScriptDialog", { accept: Fe === "alert" }).catch(() => {}),
              !T(`dialog:${Fe}`) && A.length < 64)
            )
              A.push({ url: Fe || "modal", type: "dialog" });
            R(`dialog:${Fe}`);
          }),
          me("Runtime.consoleAPICalled", (Re) => {
            if (Re.type === "error" || Re.type === "assert") M(Fs(Re.args).map(remoteObjectText).join(" "));
          }),
          me("Runtime.exceptionThrown", (Re) => {
            let Fe = Rt(Re.exceptionDetails),
              xe = Rt(Fe.exception),
              it = getFirstLine(pt(xe.description)) || pt(Fe.text) || "exception";
            M(it.startsWith("Uncaught") ? it : `Uncaught ${it}`);
          }),
          me("Log.entryAdded", (Re) => {
            let Fe = Rt(Re.entry),
              match = /^Not allowed to load local resource: (\S+)/.exec(pt(Fe.text));
            if (match) {
              if (!T(match[1]) && A.length < 64) A.push({ url: match[1].slice(0, 512), type: "Local" });
              R(match[1]);
              return;
            }
            if (Fe.level !== "error" || Fe.source === "security" || Fe.source === "intervention") return;
            let it = pt(Fe.url),
              Tt = pt(Fe.text);
            if (T(it) || Tt.startsWith("Unrecognized Content-Security-Policy directive")) return;
            M(`${Tt}${it ? ` (${it})` : ""}`);
          }));
      } catch (error) {
        throw (_e(), await browser.close(), error);
      }
      let U = async () => {
          let oe = Rt(Rt(await Oe("Page.getFrameTree")).frameTree),
            ke = Fs(oe.childFrames).map((Se) => Rt(Rt(Se).frame))[0];
          return ke === void 0 ? void 0 : { id: pt(ke.id), url: pt(ke.url) + pt(ke.urlFragment) };
        },
        he = async (oe) => {
          let ke = await Oe("Runtime.evaluate", { expression: oe, awaitPromise: !0, returnByValue: !0 });
          if (ke.exceptionDetails !== void 0) {
            let Se = Rt(ke.exceptionDetails),
              ce = Rt(Se.exception);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              stripPrefix(getFirstLine(pt(ce.description)), "Error: ") ||
                pt(Se.text) ||
                "the page script failed",
              "artifact preview: wrapper script threw",
            );
          }
          return Rt(ke.result).value;
        },
        $e = async (oe, ke) => {
          let Se = P;
          if (L === void 0 || Se === void 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "no page is loaded in the preview tab",
              "artifact preview: measure before load",
            );
          let ce = async () => {
              let Fe = await U();
              return Fe !== void 0 && isSameHttpOrigin(Fe.url, Se) ? void 0 : (Fe?.url ?? "about:blank");
            },
            Re = (Fe) => Fe instanceof Error && (Fe.message.includes(eh) || Fe.message.includes(ad));
          for (let Fe = 0; ; Fe++) {
            let xe = await ce();
            if (xe !== void 0) throw new PreviewNavigatedAway(xe, Se);
            try {
              return await he(previewEvalScript(oe, ke));
            } catch (error) {
              if (!Re(error)) throw error;
              if (Fe === 1)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "the page reloaded or rewrote itself during the checks",
                  "artifact preview: page reloaded during checks",
                );
            }
          }
        };
      return {
        async load(oe, ke, Se) {
          ((P = oe),
            (L = Se),
            await Oe("Emulation.setEmulatedMedia", {
              media: "screen",
              features: [{ name: "prefers-color-scheme", value: ke }],
            }));
          let ce = ge("Page.loadEventFired");
          ce.catch(() => {});
          let Re = await Oe("Page.navigate", { url: Se });
          if (pt(Re.errorText) !== "")
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `the preview wrapper did not load (${pt(Re.errorText)})`,
              "artifact preview: wrapper navigation failed",
            );
          if ((await ce, (await U()) === void 0))
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "the page did not load in the preview frame",
              "artifact preview: frame missing",
            );
        },
        async resize(oe, ke) {
          await Je(oe, ke);
        },
        measure: (oe) => $e("probe", [oe]),
        settle: () => $e("settle", []),
        async screenshot() {
          let oe = await Oe("Page.captureScreenshot", { format: "png" });
          return new Uint8Array(Buffer.from(pt(oe.data), "base64"));
        },
        takeErrors: () => w.splice(0),
        takeBlocked: () => A.splice(0),
        async closeStrayWindows() {
          let oe = Fs(Rt(await cdp.send("Target.getTargets")).targetInfos),
            ke = 0;
          for (let Se of oe) if (se(Rt(Se))) (await B(Rt(Se)), ke++);
          return ke;
        },
        stopLoading: async () => {
          await Oe("Page.stopLoading");
        },
        async close({ broken: oe = !1 } = {}) {
          if (oe || cdp.closedBecause !== void 0 || e.noSandbox()) {
            (_e(), await browser.close());
            return;
          }
          try {
            await cdp.send("Target.disposeBrowserContext", { browserContextId: Ie });
          } catch {
            await browser.close();
          } finally {
            (_e(),
              browser.betweenCalls?.(),
              (browser.betweenCalls = cdp.on("Fetch.requestPaused", (ke, Se) => {
                cdp
                  .send(
                    "Fetch.failRequest",
                    { requestId: pt(ke.requestId), errorReason: "BlockedByClient" },
                    Se,
                  )
                  .catch(() => {});
              })));
          }
        },
      };
    },
  };
}
/**
 * 预览页面允许的请求：只放行无请求体的 GET/HEAD；页面自身来源、同源 mermaid 运行时脚本、data:/blob:/about:blank，以及白名单来源下的特定路径。
 */
//@ chunk-8wvtd8sr.js:208758-209148 placement
function isAllowedPreviewRequest(e, n, s = "GET", r = !1, h = "") {
  if (!((s === "GET" || s === "HEAD") && !r)) return !1;
  if (n !== void 0 && sh(e, n)) return !0;
  try {
    let p = new URL(e);
    if (
      n !== void 0 &&
      h === "Script" &&
      p.pathname === MERMAID_RUNTIME_PATH &&
      p.search === "" &&
      p.origin === new URL(n).origin
    )
      return !0;
    if (p.protocol === "data:" || p.protocol === "blob:" || p.href === "about:blank") return !0;
    return Yf.has(p.origin) && N_.some((w) => p.pathname.startsWith(w));
  } catch {
    return !1;
  }
}
//@ chunk-8wvtd8sr.js:209148-209234 placement
function F_(e, n, s = "GET", r = !1) {
  return n !== void 0 && (s === "GET" || s === "HEAD") && !r && sh(e, n);
}
//@ chunk-8wvtd8sr.js:209234-209293 placement
var N_ = ["/css", "/icon", "/earlyaccess/", "/s/", "/l/", "/ea/"];
//@ chunk-8wvtd8sr.js:209293-209375 placement
function sh(e, n) {
  try {
    return new URL(e).href === new URL(n).href;
  } catch {
    return e === n;
  }
}
//@ chunk-8wvtd8sr.js:209375-209605 placement
function remoteObjectText(e) {
  if (typeof e === "string") return e;
  let n = Rt(e);
  if (typeof n.description === "string") return getFirstLine(n.description);
  if ("value" in n && (typeof n.value === "string" || typeof n.value === "number")) return String(n.value);
  return String(e);
}

export { createChromePreviewSession };
