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
  PAGE_PROBE_ERROR_FRAME_LEFT,
  PAGE_PROBE_ERROR_NO_ANSWER,
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
async function assertNetworkLockdown(probeUrl, newProbe) {
  let server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      new Response("reachable", {
        status: 200,
      }),
  });
  try {
    for (let host of ["127.0.0.1", "localhost"]) {
      let navigatePromise = newProbe();
      navigatePromise.catch(() => {});
      let probeResult = await probeUrl(`http://${host}:${server.port}/preview-selftest`);
      if (asProbeString(probeResult.errorText) !== "net::ERR_NAME_NOT_RESOLVED")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "this browser ignored the preview network lock-down; preview stopped before loading the page",
          "artifact preview: browser ignored host rules",
        );
      await navigatePromise;
    }
  } finally {
    server.stop(true);
  }
}
//@ chunk-8wvtd8sr.js:200976-208758 placement
/**
 * headless Chrome 预览会话：打开页面、收集控制台/网络错误并截图。
 */
function createChromePreviewSession(chromeHost, lease, launch = launchPreviewChrome) {
  return {
    async open(width, height, allowedHosts, signal) {
      let consoleErrors = [];
      let pageErrors = [];
      let seenUrls = new Set();
      let markSeenUrl = (url) => {
        if (seenUrls.size < 256) seenUrls.add(url.slice(0, 512));
      };
      let hasSeenUrl = (url) => seenUrls.has(url.slice(0, 512));
      let loadedPageUrl;
      let loadedWrapperUrl;
      let mainFrameId = "";
      let recordConsoleError = (errorText) => {
        if (consoleErrors.length < 200) consoleErrors.push(errorText.slice(0, 400));
      };
      let chrome = await chromeHost.resolveChrome();
      if (chrome === undefined) {
        let hint = chromeHost.installHint();
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          hint !== undefined
            ? `Chrome not found. Run via Bash first (one-time, ~270 MB): ${hint}`
            : "Chrome not found: install Chrome or Chromium, or point BUN_CHROME_PATH at one.",
          "artifact preview: chrome not found",
        );
      }
      if (signal?.aborted) throw new PreviewBrowserGone("the preview gave up before its browser started");
      let browser = await lease.browser(
        chrome,
        previewChromeArgs(chromeHost.noSandbox(), allowedHosts),
        launch,
      );
      let killOnAbort = () => void browser.kill().catch(() => {});
      if (signal?.aborted) await browser.kill();
      signal?.addEventListener("abort", killOnAbort, {
        once: true,
      });
      let cdp = browser.cdp;
      let sessionId = "";
      let targetId = "";
      let browserContextId = "";
      let cleanups = [() => signal?.removeEventListener("abort", killOnAbort)];
      let runCleanups = () => {
        for (let runCleanup of cleanups.splice(0)) runCleanup();
      };
      let sendToPage = (method, params) => cdp.send(method, params, sessionId);
      let event = (eventName, handler) => {
        let offEvent = cdp.on(eventName, (payload, payloadSessionId) => {
          if (payloadSessionId === sessionId) handler(payload);
        });
        cleanups.push(offEvent);
        return offEvent;
      };
      let eventName = (awaitedName) =>
        new Promise((resolve, reject) => {
          if (cdp.closedBecause !== undefined) {
            reject(cdp.closedBecause);
            return;
          }
          let off = event(awaitedName, (payload) => {
            off();
            offGone();
            resolve(payload);
          });
          let offGone = cdp.onGone((reason) => {
            off();
            reject(reason);
          });
          cleanups.push(() => {
            offGone();
            reject(new PreviewBrowserGone("the preview tab was closed"));
          });
        });
      let setMetrics = (width, height) =>
        sendToPage("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
      let usedIds = new Set();
      let requestId = (otherTarget) =>
        otherTarget.type === "page" &&
        asProbeString(otherTarget.targetId) !== targetId &&
        !usedIds.has(asProbeString(otherTarget.targetId));
      let closeTarget = (infoToClose) =>
        cdp
          .send("Target.closeTarget", {
            targetId: asProbeString(infoToClose.targetId),
          })
          .catch(() => {});
      try {
        let existingContextIds = new Set(
          asArray(asProbeRecord(await cdp.send("Target.getBrowserContexts")).browserContextIds).map(
            (contextIdValue) => asProbeString(contextIdValue),
          ),
        );
        for (let listedTarget of asArray(asProbeRecord(await cdp.send("Target.getTargets")).targetInfos)) {
          let listedRecord = asProbeRecord(listedTarget);
          if (
            listedRecord.type === "page" &&
            !existingContextIds.has(asProbeString(listedRecord.browserContextId))
          )
            usedIds.add(asProbeString(listedRecord.targetId));
          else if (requestId(listedRecord)) closeTarget(listedRecord);
        }
        await cdp.send("Fetch.disable");
        browser.betweenCalls?.();
        browser.betweenCalls = undefined;
        browserContextId = asProbeString(
          (
            await cdp.send("Target.createBrowserContext", {
              disposeOnDetach: true,
            })
          ).browserContextId,
        );
        targetId = asProbeString(
          (
            await cdp.send("Target.createTarget", {
              url: "about:blank",
              browserContextId,
            })
          ).targetId,
        );
        sessionId = asProbeString(
          (
            await cdp.send("Target.attachToTarget", {
              targetId,
              flatten: true,
            })
          ).sessionId,
        );
        cleanups.push(
          cdp.on("Target.targetCreated", (event) => {
            let targetInfo = asProbeRecord(event.targetInfo);
            if (requestId(targetInfo)) closeTarget(targetInfo);
          }),
        );
        await cdp.send("Target.setDiscoverTargets", {
          discover: true,
        });
        for (let targetInfo of asArray(asProbeRecord(await cdp.send("Target.getTargets")).targetInfos))
          if (requestId(asProbeRecord(targetInfo))) closeTarget(asProbeRecord(targetInfo));
        await sendToPage("Page.enable");
        await assertNetworkLockdown(
          (url) =>
            sendToPage("Page.navigate", {
              url,
            }),
          () => eventName("Page.loadEventFired"),
        );
        await sendToPage("Runtime.enable");
        await sendToPage("Log.enable");
        mainFrameId = asProbeString(
          asProbeRecord(asProbeRecord(asProbeRecord(await sendToPage("Page.getFrameTree")).frameTree).frame)
            .id,
        );
        await setMetrics(width, height);
        await sendToPage("Page.addScriptToEvaluateOnNewDocument", {
          source: CSP_AND_RTC_BLOCK_SCRIPT + pageProbeScriptBuilder,
        });
        let onRequestPaused = (params, sessionId) => {
          let requestId = asProbeString(params.requestId);
          let request = asProbeRecord(params.request);
          let url = asProbeString(request.url);
          let hasBody = request.hasPostData === true || typeof request.postData === "string";
          let method = asProbeString(request.method) || "GET";
          if (
            loadedWrapperUrl !== undefined && asProbeString(params.frameId) === mainFrameId
              ? isSameUrlGetRequest(url, loadedWrapperUrl, method, hasBody)
              : isAllowedPreviewRequest(
                  url,
                  loadedPageUrl,
                  method,
                  hasBody,
                  asProbeString(params.resourceType),
                )
          ) {
            cdp
              .send(
                "Fetch.continueRequest",
                {
                  requestId,
                },
                sessionId,
              )
              .catch(() => {});
            return;
          }
          if (!hasSeenUrl(url) && pageErrors.length < 64)
            pageErrors.push({
              url: url.slice(0, 512),
              type: asProbeString(params.resourceType),
            });
          markSeenUrl(url);
          cdp
            .send(
              "Fetch.failRequest",
              {
                requestId,
                errorReason: "BlockedByClient",
              },
              sessionId,
            )
            .catch(() => {});
        };
        cleanups.push(cdp.on("Fetch.requestPaused", onRequestPaused));
        await sendToPage("Fetch.enable", {
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
        let autoAttach = async (sessionId) => {
          await cdp.send(
            "Target.setAutoAttach",
            {
              autoAttach: true,
              waitForDebuggerOnStart: true,
              flatten: true,
            },
            sessionId,
          );
        };
        let onAttached = cdp.on("Target.attachedToTarget", (params, sessionId) => {
          if (sessionId === undefined) return;
          let workerSessionId = asProbeString(params.sessionId);
          let targetType = asProbeString(asProbeRecord(params.targetInfo).type);
          if (
            !(
              targetType === "worker" ||
              targetType === "shared_worker" ||
              targetType === "service_worker" ||
              targetType === "worklet"
            ) ||
            params.waitingForDebugger !== true
          ) {
            cdp.fail(
              new PreviewBrowserGone("part of the page started outside the preview sandbox; preview stopped"),
            );
            browser.kill().catch(() => {});
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
                workerSessionId,
              );
              await autoAttach(workerSessionId);
            } catch {
            } finally {
              cdp.send("Runtime.runIfWaitingForDebugger", {}, workerSessionId).catch(() => {});
            }
          })();
        });
        cleanups.push(onAttached);
        await autoAttach(sessionId);
        await sendToPage("Page.setDownloadBehavior", {
          behavior: "deny",
        });
        event("Page.downloadWillBegin", (event) => {
          let fileName = asProbeString(event.suggestedFilename) || asProbeString(event.url);
          if (!hasSeenUrl(`download:${fileName}`) && pageErrors.length < 64)
            pageErrors.push({
              url: fileName.slice(0, 512),
              type: "download",
            });
          markSeenUrl(`download:${fileName}`);
        });
        event("Page.windowOpen", (event) => {
          let url = asProbeString(event.url);
          if (!hasSeenUrl(`popup:${url}`) && pageErrors.length < 64)
            pageErrors.push({
              url: url.slice(0, 512),
              type: "popup",
            });
          markSeenUrl(`popup:${url}`);
        });
        event("Page.javascriptDialogOpening", (event) => {
          let dialogType = asProbeString(event.type);
          sendToPage("Page.handleJavaScriptDialog", {
            accept: dialogType === "alert",
          }).catch(() => {});
          if (!hasSeenUrl(`dialog:${dialogType}`) && pageErrors.length < 64)
            pageErrors.push({
              url: dialogType || "modal",
              type: "dialog",
            });
          markSeenUrl(`dialog:${dialogType}`);
        });
        event("Runtime.consoleAPICalled", (event) => {
          if (event.type === "error" || event.type === "assert")
            recordConsoleError(asArray(event.args).map(remoteObjectText).join(" "));
        });
        event("Runtime.exceptionThrown", (event) => {
          let details = asProbeRecord(event.exceptionDetails);
          let exception = asProbeRecord(details.exception);
          let text =
            getFirstLine(asProbeString(exception.description)) || asProbeString(details.text) || "exception";
          recordConsoleError(text.startsWith("Uncaught") ? text : `Uncaught ${text}`);
        });
        event("Log.entryAdded", (event) => {
          let entry = asProbeRecord(event.entry);
          let match = /^Not allowed to load local resource: (\S+)/.exec(asProbeString(entry.text));
          if (match) {
            if (!hasSeenUrl(match[1]) && pageErrors.length < 64)
              pageErrors.push({
                url: match[1].slice(0, 512),
                type: "Local",
              });
            markSeenUrl(match[1]);
            return;
          }
          if (entry.level !== "error" || entry.source === "security" || entry.source === "intervention")
            return;
          let entryUrl = asProbeString(entry.url);
          let entryText = asProbeString(entry.text);
          if (hasSeenUrl(entryUrl) || entryText.startsWith("Unrecognized Content-Security-Policy directive"))
            return;
          recordConsoleError(`${entryText}${entryUrl ? ` (${entryUrl})` : ""}`);
        });
      } catch (error) {
        runCleanups();
        await browser.close();
        throw error;
      }
      let firstChildFrame = async () => {
        let frameTree = asProbeRecord(asProbeRecord(await sendToPage("Page.getFrameTree")).frameTree);
        let childFrame = asArray(frameTree.childFrames).map((child) =>
          asProbeRecord(asProbeRecord(child).frame),
        )[0];
        return childFrame === undefined
          ? undefined
          : {
              id: asProbeString(childFrame.id),
              url: asProbeString(childFrame.url) + asProbeString(childFrame.urlFragment),
            };
      };
      let evaluate = async (expression) => {
        let result = await sendToPage("Runtime.evaluate", {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (result.exceptionDetails !== undefined) {
          let details = asProbeRecord(result.exceptionDetails);
          let exception = asProbeRecord(details.exception);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            stripPrefix(getFirstLine(asProbeString(exception.description)), "Error: ") ||
              asProbeString(details.text) ||
              "the page script failed",
            "artifact preview: wrapper script threw",
          );
        }
        return asProbeRecord(result.result).value;
      };
      let runInPage = async (run, args) => {
        let expectedUrl = loadedPageUrl;
        if (loadedWrapperUrl === undefined || expectedUrl === undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "no page is loaded in the preview tab",
            "artifact preview: measure before load",
          );
        let checkFrameNav = async () => {
          let frame = await firstChildFrame();
          return frame !== undefined && isSameHttpOrigin(frame.url, expectedUrl)
            ? undefined
            : (frame?.url ?? "about:blank");
        };
        let isRetriable = (error) =>
          error instanceof Error &&
          (error.message.includes(PAGE_PROBE_ERROR_FRAME_LEFT) ||
            error.message.includes(PAGE_PROBE_ERROR_NO_ANSWER));
        for (let j = 0; ; j++) {
          let navigatedTo = await checkFrameNav();
          if (navigatedTo !== undefined) throw new PreviewNavigatedAway(navigatedTo, expectedUrl);
          try {
            return await evaluate(previewEvalScript(run, args));
          } catch (error) {
            if (!isRetriable(error)) throw error;
            if (j === 1)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                "the page reloaded or rewrote itself during the checks",
                "artifact preview: page reloaded during checks",
              );
          }
        }
      };
      return {
        async load(pageUrl, value, wrapperUrl) {
          loadedPageUrl = pageUrl;
          loadedWrapperUrl = wrapperUrl;
          await sendToPage("Emulation.setEmulatedMedia", {
            media: "screen",
            features: [
              {
                name: "prefers-color-scheme",
                value,
              },
            ],
          });
          let loadEvent = eventName("Page.loadEventFired");
          loadEvent.catch(() => {});
          let navigateResult = await sendToPage("Page.navigate", {
            url: wrapperUrl,
          });
          if (asProbeString(navigateResult.errorText) !== "")
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `the preview wrapper did not load (${asProbeString(navigateResult.errorText)})`,
              "artifact preview: wrapper navigation failed",
            );
          await loadEvent;
          if ((await firstChildFrame()) === undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "the page did not load in the preview frame",
              "artifact preview: frame missing",
            );
        },
        async resize(width, height) {
          await setMetrics(width, height);
        },
        measure: (settleMs) => runInPage("probe", [settleMs]),
        settle: () => runInPage("settle", []),
        async screenshot() {
          let capture = await sendToPage("Page.captureScreenshot", {
            format: "png",
          });
          return new Uint8Array(Buffer.from(asProbeString(capture.data), "base64"));
        },
        takeErrors: () => consoleErrors.splice(0),
        takeBlocked: () => pageErrors.splice(0),
        async closeStrayWindows() {
          let targetInfos = asArray(asProbeRecord(await cdp.send("Target.getTargets")).targetInfos);
          let closedCount = 0;
          for (let targetInfo of targetInfos)
            if (requestId(asProbeRecord(targetInfo))) {
              await closeTarget(asProbeRecord(targetInfo));
              closedCount++;
            }
          return closedCount;
        },
        stopLoading: async () => {
          await sendToPage("Page.stopLoading");
        },
        async close({ broken: options = false } = {}) {
          if (options || cdp.closedBecause !== undefined || chromeHost.noSandbox()) {
            runCleanups();
            await browser.close();
            return;
          }
          try {
            await cdp.send("Target.disposeBrowserContext", {
              browserContextId,
            });
          } catch {
            await browser.close();
          } finally {
            runCleanups();
            browser.betweenCalls?.();
            browser.betweenCalls = cdp.on("Fetch.requestPaused", (params, sessionId) => {
              cdp
                .send(
                  "Fetch.failRequest",
                  {
                    requestId: asProbeString(params.requestId),
                    errorReason: "BlockedByClient",
                  },
                  sessionId,
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
function isAllowedPreviewRequest(url, pageUrl, method = "GET", hasBody = false, resourceType = "") {
  if (!((method === "GET" || method === "HEAD") && !hasBody)) return false;
  if (pageUrl !== undefined && urlsEqual(url, pageUrl)) return true;
  try {
    let parsed = new URL(url);
    if (
      pageUrl !== undefined &&
      resourceType === "Script" &&
      parsed.pathname === MERMAID_RUNTIME_PATH &&
      parsed.search === "" &&
      parsed.origin === new URL(pageUrl).origin
    )
      return true;
    if (parsed.protocol === "data:" || parsed.protocol === "blob:" || parsed.href === "about:blank")
      return true;
    return (
      CSP_ALLOWED_ORIGINS.has(parsed.origin) &&
      ASSET_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))
    );
  } catch {
    return false;
  }
}
//@ chunk-8wvtd8sr.js:209148-209234 placement
/**
 * 判断请求是否是可复用缓存的 GET/HEAD 且地址相同。
 */
function isSameUrlGetRequest(url, expectedUrl, method = "GET", hasBody = false) {
  return (
    expectedUrl !== undefined &&
    (method === "GET" || method === "HEAD") &&
    !hasBody &&
    urlsEqual(url, expectedUrl)
  );
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
function urlsEqual(left, right) {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return left === right;
  }
}
//@ chunk-8wvtd8sr.js:209375-209605 placement
function remoteObjectText(arg) {
  if (typeof arg === "string") return arg;
  let record = asProbeRecord(arg);
  if (typeof record.description === "string") return getFirstLine(record.description);
  if ("value" in record && (typeof record.value === "string" || typeof record.value === "number"))
    return String(record.value);
  return String(arg);
}
export { createChromePreviewSession };
