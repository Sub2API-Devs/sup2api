/**
 * utils/preflightChecks.tsx
 *
 * 首次运行连通性预检：请求 /api/hello 与 /v1/oauth/hello，失败提示无法连接 Anthropic 服务
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/preflightChecks.tsx
 * pieces: chunk-p8fze0jh.js (4)
 * attribution: callgraph-fingerprint 1, layout 1, fingerprint 2
 */
import { setBgExitCause } from "./bgExitSidecars.js";
import { getProxyAuthFromHelper, getProxyFetchOptions, getProxyUrlWithSource } from "./proxy.js";
import { getOauthConfig } from "../constants/oauth.js";
import { getUserAgent } from "./http.js";
import { getSSLErrorHint } from "../services/api/errorUtils.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "./log.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { y, P } from "../../vendor/react/cjs/react.production.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "../components/Spinner.js";

//@ chunk-p8fze0jh.js:16221-16276 callgraph-fingerprint = _temp (0.39)
function exitPreflightFailed() {
  (setBgExitCause("preflight_endpoint"), process.exit(1));
}
//@ chunk-p8fze0jh.js:16276-16287 layout
var PREFLIGHT_TIMEOUT_MS = 1e4;
/**
 * 启动预检：用 10 秒超时请求 <BASE_API_URL>/api/hello 与 <TOKEN_URL 源>/v1/oauth/hello（走代理设置），返回第一个失败的错误说明。
 */
//@ chunk-p8fze0jh.js:16287-17402 fingerprint = checkEndpoints (0.823)
async function checkEndpoints() {
  try {
    await getProxyAuthFromHelper();
    let oauthConfig = getOauthConfig(),
      tokenUrl = new URL(oauthConfig.TOKEN_URL),
      endpoints = [`${oauthConfig.BASE_API_URL}/api/hello`, `${tokenUrl.origin}/v1/oauth/hello`],
      checkEndpoint = async (url) => {
        let hostname = new URL(url).hostname,
          u = getProxyFetchOptions({ url: url }),
          C = u.proxy !== void 0;
        try {
          let d = await fetch(url, {
            headers: { "User-Agent": getUserAgent() },
            signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
            ...u,
          });
          if ((d.body?.cancel().catch(() => {}), d.status !== 200))
            return {
              success: !1,
              error: `Failed to connect to ${hostname}: Status ${d.status}`,
              usedProxy: C,
            };
          return { success: !0 };
        } catch (error) {
          if (error instanceof Error && error.name === "TimeoutError")
            return {
              success: !1,
              error: `Connection to ${hostname} timed out after ${PREFLIGHT_TIMEOUT_MS / 1000} seconds`,
              usedProxy: C,
            };
          let sslHint = getSSLErrorHint(error);
          return {
            success: !1,
            error: `Failed to connect to ${hostname}: ${error instanceof Error ? error.code || error.message : String(error)}`,
            sslHint: sslHint ?? void 0,
            usedProxy: C,
          };
        }
      },
      failedResult = (await Promise.all(endpoints.map(checkEndpoint))).find((result) => !result.success);
    if (failedResult)
      logEvent("tengu_preflight_check_failed", {
        isConnectivityError: !1,
        hasErrorMessage: !!failedResult.error,
        isSSLError: !!failedResult.sslHint,
      });
    return failedResult || { success: !0 };
  } catch (error) {
    return (
      logError(error),
      logEvent("tengu_preflight_check_failed", { isConnectivityError: !0 }),
      {
        success: !1,
        error: `Connectivity check error: ${error instanceof Error ? error.code || error.message : String(error)}`,
      }
    );
  }
}
/**
 * 首次运行的连通性检查界面：显示 Checking connectivity...，失败时提示 Unable to connect to Anthropic services 并退出。
 */
//@ chunk-p8fze0jh.js:17402-19010 fingerprint = PreflightStep (0.303)
function PreflightStep(t0) {
  let u = w(14),
    { onSuccess: onSuccess } = t0,
    [t, x] = y(null),
    [h, p] = y(!0),
    c = getProxyUrlWithSource()?.source,
    showSpinner = useTimeout(1000) && h,
    C,
    d;
  if (u[0] === MEMO_CACHE_SENTINEL)
    ((C = () => {
      let run = async function I() {
        let checkResult = await checkEndpoints();
        (x(checkResult), p(!1));
      };
      run();
    }),
      (d = []),
      (u[0] = C),
      (u[1] = d));
  else ((C = u[0]), (d = u[1]));
  P(C, d);
  let W;
  if (u[2] !== onSuccess || u[3] !== t?.success)
    ((W = () => {
      if (t?.success) onSuccess();
    }),
      (u[2] = onSuccess),
      (u[3] = t?.success),
      (u[4] = W));
  else W = u[4];
  let N;
  if (u[5] !== onSuccess || u[6] !== t) ((N = [t, onSuccess]), (u[5] = onSuccess), (u[6] = t), (u[7] = N));
  else N = u[7];
  (P(W, N), useTimeout(exitPreflightFailed, t && !t.success ? 100 : null));
  let A;
  if (u[8] !== h || u[9] !== t || u[10] !== showSpinner)
    ((A =
      h && showSpinner
        ? r(Box, {
            paddingLeft: 1,
            children: [e(Spinner, {}), e(Text, { children: "Checking connectivity..." })],
          })
        : !t?.success &&
          !h &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(Text, { color: "error", children: "Unable to connect to Anthropic services" }),
              e(Text, { color: "error", children: t?.error }),
              t?.sslHint
                ? r(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      e(Text, { children: t.sslHint }),
                      e(Text, {
                        color: "suggestion",
                        children: "See https://code.claude.com/docs/en/network-config",
                      }),
                    ],
                  })
                : r(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      c && t?.usedProxy
                        ? r(Text, {
                            children: [
                              "A proxy is configured via ",
                              c,
                              ". Check that it allows connections to the host above.",
                              " ",
                              e(Text, {
                                color: "suggestion",
                                children: "See https://code.claude.com/docs/en/network-config",
                              }),
                            ],
                          })
                        : null,
                      e(Text, { children: "Please check your internet connection and network settings." }),
                      r(Text, {
                        children: [
                          "Note: Claude Code might not be available in your country. Check supported countries at",
                          " ",
                          e(Text, {
                            color: "suggestion",
                            children: "https://anthropic.com/supported-countries",
                          }),
                        ],
                      }),
                    ],
                  }),
            ],
          })),
      (u[8] = h),
      (u[9] = t),
      (u[10] = showSpinner),
      (u[11] = A));
  else A = u[11];
  let G;
  if (u[12] !== A)
    ((G = e(Box, { flexDirection: "column", gap: 1, paddingLeft: 1, children: A })),
      (u[12] = A),
      (u[13] = G));
  else G = u[13];
  return G;
}

export { PreflightStep };
