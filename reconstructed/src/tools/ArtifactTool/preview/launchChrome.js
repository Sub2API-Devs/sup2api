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
import {
  asProbeString,
  asArray,
  asProbeRecord,
  pageProbeScriptBuilder,
  PAGE_PROBE_MAX_VALUE_CHARS,
  pageProbeRequestScript,
  previewEvalScript,
} from "./pageChecks.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";
import {
  launchPreviewChrome,
  PreviewBrowserGone,
  CSP_AND_RTC_BLOCK_SCRIPT,
  isSameHttpOrigin,
  PreviewNavigatedAway,
  CSP_ALLOWED_ORIGINS,
} from "./chromeSession.js";
import { getFirstLine, stripPrefix } from "../../../utils/stringUtils.js";
import { MERMAID_RUNTIME_PATH } from "../../../services/artifacts/pageRuntimes.js";

//@ chunk-8wvtd8sr.js:199726-199836 placement
function hostResolverRules(allowedHosts) {
  return `MAP * ^NOTFOUND, EXCLUDE ${allowedHosts}, EXCLUDE fonts.googleapis.com, EXCLUDE fonts.gstatic.com`;
}
//@ chunk-8wvtd8sr.js:199836-200499 placement
/**
 * 预览用 headless Chrome 的启动参数：管道远程调试、按规则屏蔽域名解析、关闭代理/扩展/同步/后台网络等，需要时加 --no-sandbox。
 */
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
//@ chunk-8wvtd8sr.js:200499-200976 placement
/**
 * 自检预览浏览器的网络封锁：起一个本地 HTTP 服务，访问 127.0.0.1 与 localhost 必须得到 ERR_NAME_NOT_RESOLVED，否则说明浏览器忽略了主机规则，抛错停止预览。
 */
async function assertNetworkLockdown(e, n) {
  let s = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      new Response("reachable", {
        status: 200,
      }),
  });
  try {
    for (let r of ["127.0.0.1", "localhost"]) {
      let h = n();
      h.catch(() => {});
      let y = await e(`http://${r}:${s.port}/preview-selftest`);
      if (asProbeString(y.errorText) !== "net::ERR_NAME_NOT_RESOLVED")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "this browser ignored the preview network lock-down; preview stopped before loading the page",
          "artifact preview: browser ignored host rules",
        );
      await h;
    }
  } finally {
    s.stop(true);
  }
}
//@ chunk-8wvtd8sr.js:200976-208758 placement
/**
 * headless Chrome 预览会话：打开页面、收集控制台/网络错误并截图。
 */
function createChromePreviewSession(e, lease, s = launchPreviewChrome) {
  return {
    async open(width, height, allowedHosts, p) {
      let w = [];
      let A = [];
      let S = new Set();
      let R = (oe) => {
        if (S.size < 256) S.add(oe.slice(0, 512));
      };
      let T = (oe) => S.has(oe.slice(0, 512));
      let P;
      let L;
      let V = "";
      let M = (oe) => {
        if (w.length < 200) w.push(oe.slice(0, 400));
      };
      let chrome = await e.resolveChrome();
      if (chrome === undefined) {
        let oe = e.installHint();
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          oe !== undefined
            ? `Chrome not found. Run via Bash first (one-time, ~270 MB): ${oe}`
            : "Chrome not found: install Chrome or Chromium, or point BUN_CHROME_PATH at one.",
          "artifact preview: chrome not found",
        );
      }
      if (p?.aborted) throw new PreviewBrowserGone("the preview gave up before its browser started");
      let q = await lease.browser(chrome, previewChromeArgs(e.noSandbox(), allowedHosts), s);
      let re = () => void q.kill().catch(() => {});
      if (p?.aborted) await q.kill();
      p?.addEventListener("abort", re, {
        once: true,
      });
      let cdp = q.cdp;
      let ue = "";
      let we = "";
      let browserContextId = "";
      let ie = [() => p?.removeEventListener("abort", re)];
      let _e = () => {
        for (let oe of ie.splice(0)) oe();
      };
      let Oe = (oe, ke) => cdp.send(oe, ke, ue);
      let me = (oe, ke) => {
        let Se = cdp.on(oe, (ce, Re) => {
          if (Re === ue) ke(ce);
        });
        ie.push(Se);
        return Se;
      };
      let ge = (oe) =>
        new Promise((resolve, reject) => {
          if (cdp.closedBecause !== undefined) {
            reject(cdp.closedBecause);
            return;
          }
          let ce = me(oe, (Fe) => {
            ce();
            Re();
            resolve(Fe);
          });
          let Re = cdp.onGone((Fe) => {
            ce();
            reject(Fe);
          });
          ie.push(() => {
            Re();
            reject(new PreviewBrowserGone("the preview tab was closed"));
          });
        });
      let Je = (width, height) =>
        Oe("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
      let He = new Set();
      let se = (oe) =>
        oe.type === "page" && asProbeString(oe.targetId) !== we && !He.has(asProbeString(oe.targetId));
      let B = (oe) =>
        cdp
          .send("Target.closeTarget", {
            targetId: asProbeString(oe.targetId),
          })
          .catch(() => {});
      try {
        let oe = new Set(
          asArray(asProbeRecord(await cdp.send("Target.getBrowserContexts")).browserContextIds).map((Re) =>
            asProbeString(Re),
          ),
        );
        for (let Re of asArray(asProbeRecord(await cdp.send("Target.getTargets")).targetInfos)) {
          let Fe = asProbeRecord(Re);
          if (Fe.type === "page" && !oe.has(asProbeString(Fe.browserContextId)))
            He.add(asProbeString(Fe.targetId));
          else if (se(Fe)) B(Fe);
        }
        await cdp.send("Fetch.disable");
        q.betweenCalls?.();
        q.betweenCalls = undefined;
        browserContextId = asProbeString(
          (
            await cdp.send("Target.createBrowserContext", {
              disposeOnDetach: true,
            })
          ).browserContextId,
        );
        we = asProbeString(
          (
            await cdp.send("Target.createTarget", {
              url: "about:blank",
              browserContextId,
            })
          ).targetId,
        );
        ue = asProbeString(
          (
            await cdp.send("Target.attachToTarget", {
              targetId: we,
              flatten: true,
            })
          ).sessionId,
        );
        ie.push(
          cdp.on("Target.targetCreated", (Re) => {
            let Fe = asProbeRecord(Re.targetInfo);
            if (se(Fe)) B(Fe);
          }),
        );
        await cdp.send("Target.setDiscoverTargets", {
          discover: true,
        });
        for (let Re of asArray(asProbeRecord(await cdp.send("Target.getTargets")).targetInfos))
          if (se(asProbeRecord(Re))) B(asProbeRecord(Re));
        await Oe("Page.enable");
        await assertNetworkLockdown(
          (url) =>
            Oe("Page.navigate", {
              url,
            }),
          () => ge("Page.loadEventFired"),
        );
        await Oe("Runtime.enable");
        await Oe("Log.enable");
        V = asProbeString(
          asProbeRecord(asProbeRecord(asProbeRecord(await Oe("Page.getFrameTree")).frameTree).frame).id,
        );
        await Je(width, height);
        await Oe("Page.addScriptToEvaluateOnNewDocument", {
          source: CSP_AND_RTC_BLOCK_SCRIPT + pageProbeScriptBuilder,
        });
        let ke = (Re, Fe) => {
          let requestId = asProbeString(Re.requestId);
          let it = asProbeRecord(Re.request);
          let Tt = asProbeString(it.url);
          let ze = it.hasPostData === true || typeof it.postData === "string";
          let Mt = asProbeString(it.method) || "GET";
          if (
            L !== undefined && asProbeString(Re.frameId) === V
              ? isSameUrlGetRequest(Tt, L, Mt, ze)
              : isAllowedPreviewRequest(Tt, P, Mt, ze, asProbeString(Re.resourceType))
          ) {
            cdp
              .send(
                "Fetch.continueRequest",
                {
                  requestId,
                },
                Fe,
              )
              .catch(() => {});
            return;
          }
          if (!T(Tt) && A.length < 64)
            A.push({
              url: Tt.slice(0, 512),
              type: asProbeString(Re.resourceType),
            });
          R(Tt);
          cdp
            .send(
              "Fetch.failRequest",
              {
                requestId,
                errorReason: "BlockedByClient",
              },
              Fe,
            )
            .catch(() => {});
        };
        ie.push(cdp.on("Fetch.requestPaused", ke));
        await Oe("Fetch.enable", {
          patterns: [
            {
              urlPattern: "*",
            },
          ],
        });
        await cdp.send("Fetch.enable", {
          patterns: [
            {
              urlPattern: "*",
            },
          ],
        });
        let Se = async (Re) => {
          await cdp.send(
            "Target.setAutoAttach",
            {
              autoAttach: true,
              waitForDebuggerOnStart: true,
              flatten: true,
            },
            Re,
          );
        };
        let ce = cdp.on("Target.attachedToTarget", (Re, Fe) => {
          if (Fe === undefined) return;
          let xe = asProbeString(Re.sessionId);
          let it = asProbeString(asProbeRecord(Re.targetInfo).type);
          if (
            !(it === "worker" || it === "shared_worker" || it === "service_worker" || it === "worklet") ||
            Re.waitingForDebugger !== true
          ) {
            cdp.fail(
              new PreviewBrowserGone("part of the page started outside the preview sandbox; preview stopped"),
            );
            q.kill().catch(() => {});
            return;
          }
          (async () => {
            try {
              await cdp.send(
                "Fetch.enable",
                {
                  patterns: [
                    {
                      urlPattern: "*",
                    },
                  ],
                },
                xe,
              );
              await Se(xe);
            } catch {
            } finally {
              cdp.send("Runtime.runIfWaitingForDebugger", {}, xe).catch(() => {});
            }
          })();
        });
        ie.push(ce);
        await Se(ue);
        await Oe("Page.setDownloadBehavior", {
          behavior: "deny",
        });
        me("Page.downloadWillBegin", (Re) => {
          let Fe = asProbeString(Re.suggestedFilename) || asProbeString(Re.url);
          if (!T(`download:${Fe}`) && A.length < 64)
            A.push({
              url: Fe.slice(0, 512),
              type: "download",
            });
          R(`download:${Fe}`);
        });
        me("Page.windowOpen", (Re) => {
          let Fe = asProbeString(Re.url);
          if (!T(`popup:${Fe}`) && A.length < 64)
            A.push({
              url: Fe.slice(0, 512),
              type: "popup",
            });
          R(`popup:${Fe}`);
        });
        me("Page.javascriptDialogOpening", (Re) => {
          let Fe = asProbeString(Re.type);
          Oe("Page.handleJavaScriptDialog", {
            accept: Fe === "alert",
          }).catch(() => {});
          if (!T(`dialog:${Fe}`) && A.length < 64)
            A.push({
              url: Fe || "modal",
              type: "dialog",
            });
          R(`dialog:${Fe}`);
        });
        me("Runtime.consoleAPICalled", (Re) => {
          if (Re.type === "error" || Re.type === "assert")
            M(asArray(Re.args).map(remoteObjectText).join(" "));
        });
        me("Runtime.exceptionThrown", (Re) => {
          let Fe = asProbeRecord(Re.exceptionDetails);
          let xe = asProbeRecord(Fe.exception);
          let it = getFirstLine(asProbeString(xe.description)) || asProbeString(Fe.text) || "exception";
          M(it.startsWith("Uncaught") ? it : `Uncaught ${it}`);
        });
        me("Log.entryAdded", (Re) => {
          let Fe = asProbeRecord(Re.entry);
          let match = /^Not allowed to load local resource: (\S+)/.exec(asProbeString(Fe.text));
          if (match) {
            if (!T(match[1]) && A.length < 64)
              A.push({
                url: match[1].slice(0, 512),
                type: "Local",
              });
            R(match[1]);
            return;
          }
          if (Fe.level !== "error" || Fe.source === "security" || Fe.source === "intervention") return;
          let it = asProbeString(Fe.url);
          let Tt = asProbeString(Fe.text);
          if (T(it) || Tt.startsWith("Unrecognized Content-Security-Policy directive")) return;
          M(`${Tt}${it ? ` (${it})` : ""}`);
        });
      } catch (error) {
        _e();
        await q.close();
        throw error;
      }
      let U = async () => {
        let oe = asProbeRecord(asProbeRecord(await Oe("Page.getFrameTree")).frameTree);
        let ke = asArray(oe.childFrames).map((Se) => asProbeRecord(asProbeRecord(Se).frame))[0];
        return ke === undefined
          ? undefined
          : {
              id: asProbeString(ke.id),
              url: asProbeString(ke.url) + asProbeString(ke.urlFragment),
            };
      };
      let he = async (expression) => {
        let ke = await Oe("Runtime.evaluate", {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (ke.exceptionDetails !== undefined) {
          let Se = asProbeRecord(ke.exceptionDetails);
          let ce = asProbeRecord(Se.exception);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            stripPrefix(getFirstLine(asProbeString(ce.description)), "Error: ") ||
              asProbeString(Se.text) ||
              "the page script failed",
            "artifact preview: wrapper script threw",
          );
        }
        return asProbeRecord(ke.result).value;
      };
      let $e = async (run, ke) => {
        let Se = P;
        if (L === undefined || Se === undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "no page is loaded in the preview tab",
            "artifact preview: measure before load",
          );
        let ce = async () => {
          let Fe = await U();
          return Fe !== undefined && isSameHttpOrigin(Fe.url, Se) ? undefined : (Fe?.url ?? "about:blank");
        };
        let Re = (error) =>
          error instanceof Error &&
          (error.message.includes(PAGE_PROBE_MAX_VALUE_CHARS) ||
            error.message.includes(pageProbeRequestScript));
        for (let j = 0; ; j++) {
          let xe = await ce();
          if (xe !== undefined) throw new PreviewNavigatedAway(xe, Se);
          try {
            return await he(previewEvalScript(run, ke));
          } catch (error) {
            if (!Re(error)) throw error;
            if (j === 1)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                "the page reloaded or rewrote itself during the checks",
                "artifact preview: page reloaded during checks",
              );
          }
        }
      };
      return {
        async load(oe, value, Se) {
          P = oe;
          L = Se;
          await Oe("Emulation.setEmulatedMedia", {
            media: "screen",
            features: [
              {
                name: "prefers-color-scheme",
                value,
              },
            ],
          });
          let ce = ge("Page.loadEventFired");
          ce.catch(() => {});
          let Re = await Oe("Page.navigate", {
            url: Se,
          });
          if (asProbeString(Re.errorText) !== "")
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `the preview wrapper did not load (${asProbeString(Re.errorText)})`,
              "artifact preview: wrapper navigation failed",
            );
          await ce;
          if ((await U()) === undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "the page did not load in the preview frame",
              "artifact preview: frame missing",
            );
        },
        async resize(width, height) {
          await Je(width, height);
        },
        measure: (oe) => $e("probe", [oe]),
        settle: () => $e("settle", []),
        async screenshot() {
          let oe = await Oe("Page.captureScreenshot", {
            format: "png",
          });
          return new Uint8Array(Buffer.from(asProbeString(oe.data), "base64"));
        },
        takeErrors: () => w.splice(0),
        takeBlocked: () => A.splice(0),
        async closeStrayWindows() {
          let oe = asArray(asProbeRecord(await cdp.send("Target.getTargets")).targetInfos);
          let ke = 0;
          for (let Se of oe)
            if (se(asProbeRecord(Se))) {
              await B(asProbeRecord(Se));
              ke++;
            }
          return ke;
        },
        stopLoading: async () => {
          await Oe("Page.stopLoading");
        },
        async close({ broken: oe = false } = {}) {
          if (oe || cdp.closedBecause !== undefined || e.noSandbox()) {
            _e();
            await q.close();
            return;
          }
          try {
            await cdp.send("Target.disposeBrowserContext", {
              browserContextId,
            });
          } catch {
            await q.close();
          } finally {
            _e();
            q.betweenCalls?.();
            q.betweenCalls = cdp.on("Fetch.requestPaused", (ke, Se) => {
              cdp
                .send(
                  "Fetch.failRequest",
                  {
                    requestId: asProbeString(ke.requestId),
                    errorReason: "BlockedByClient",
                  },
                  Se,
                )
                .catch(() => {});
            });
          }
        },
      };
    },
  };
}
//@ chunk-8wvtd8sr.js:208758-209148 placement
/**
 * 预览页面允许的请求：只放行无请求体的 GET/HEAD；页面自身来源、同源 mermaid 运行时脚本、data:/blob:/about:blank，以及白名单来源下的特定路径。
 */
function isAllowedPreviewRequest(e, n, s = "GET", r = false, h = "") {
  if (!((s === "GET" || s === "HEAD") && !r)) return false;
  if (n !== undefined && urlsEqual(e, n)) return true;
  try {
    let p = new URL(e);
    if (
      n !== undefined &&
      h === "Script" &&
      p.pathname === MERMAID_RUNTIME_PATH &&
      p.search === "" &&
      p.origin === new URL(n).origin
    )
      return true;
    if (p.protocol === "data:" || p.protocol === "blob:" || p.href === "about:blank") return true;
    return CSP_ALLOWED_ORIGINS.has(p.origin) && ASSET_PATH_PREFIXES.some((w) => p.pathname.startsWith(w));
  } catch {
    return false;
  }
}
//@ chunk-8wvtd8sr.js:209148-209234 placement
/**
 * 判断请求是否是可复用缓存的 GET/HEAD 且地址相同。
 */
function isSameUrlGetRequest(e, n, s = "GET", r = false) {
  return n !== undefined && (s === "GET" || s === "HEAD") && !r && urlsEqual(e, n);
}
//@ chunk-8wvtd8sr.js:209234-209293 placement
/**
 * 预览代理的静态资源路径前缀。
 */
var ASSET_PATH_PREFIXES = ["/css", "/icon", "/earlyaccess/", "/s/", "/l/", "/ea/"];
//@ chunk-8wvtd8sr.js:209293-209375 placement
/**
 * 比较两个 URL 是否等价（解析失败退回字符串比较）。
 */
function urlsEqual(e, n) {
  try {
    return new URL(e).href === new URL(n).href;
  } catch {
    return e === n;
  }
}
//@ chunk-8wvtd8sr.js:209375-209605 placement
function remoteObjectText(e) {
  if (typeof e === "string") return e;
  let n = asProbeRecord(e);
  if (typeof n.description === "string") return getFirstLine(n.description);
  if ("value" in n && (typeof n.value === "string" || typeof n.value === "number")) return String(n.value);
  return String(e);
}
export { createChromePreviewSession };
