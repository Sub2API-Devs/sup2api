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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "../components/Spinner.js";

//@ chunk-p8fze0jh.js:16221-16276 callgraph-fingerprint (2.1.88 match: _temp, 0.39)
function exitPreflightFailed() {
  setBgExitCause("preflight_endpoint");
  process.exit(1);
}
//@ chunk-p8fze0jh.js:16276-16287 layout
var PREFLIGHT_TIMEOUT_MS = 1e4;
//@ chunk-p8fze0jh.js:16287-17402 fingerprint (2.1.88 match: checkEndpoints, 0.823)
/**
 * 启动预检：用 10 秒超时请求 <BASE_API_URL>/api/hello 与 <TOKEN_URL 源>/v1/oauth/hello（走代理设置），返回第一个失败的错误说明。
 */
async function checkEndpoints() {
  try {
    await getProxyAuthFromHelper();
    let oauthConfig = getOauthConfig();
    let tokenUrl = new URL(oauthConfig.TOKEN_URL);
    let endpoints = [`${oauthConfig.BASE_API_URL}/api/hello`, `${tokenUrl.origin}/v1/oauth/hello`];
    let checkEndpoint = async (url) => {
      let hostname = new URL(url).hostname;
      let proxyFetchOptions = getProxyFetchOptions({
        url,
      });
      let usedProxy = proxyFetchOptions.proxy !== undefined;
      try {
        let response = await fetch(url, {
          headers: {
            "User-Agent": getUserAgent(),
          },
          signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
          ...proxyFetchOptions,
        });
        response.body?.cancel().catch(() => {});
        if (response.status !== 200)
          return {
            success: false,
            error: `Failed to connect to ${hostname}: Status ${response.status}`,
            usedProxy,
          };
        return {
          success: true,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError")
          return {
            success: false,
            error: `Connection to ${hostname} timed out after ${PREFLIGHT_TIMEOUT_MS / 1000} seconds`,
            usedProxy,
          };
        let sslHint = getSSLErrorHint(error);
        return {
          success: false,
          error: `Failed to connect to ${hostname}: ${error instanceof Error ? error.code || error.message : String(error)}`,
          sslHint: sslHint ?? undefined,
          usedProxy,
        };
      }
    };
    let failedResult = (await Promise.all(endpoints.map(checkEndpoint))).find((result) => !result.success);
    if (failedResult)
      logEvent("tengu_preflight_check_failed", {
        isConnectivityError: false,
        hasErrorMessage: !!failedResult.error,
        isSSLError: !!failedResult.sslHint,
      });
    return (
      failedResult || {
        success: true,
      }
    );
  } catch (error) {
    logError(error);
    logEvent("tengu_preflight_check_failed", {
      isConnectivityError: true,
    });
    return {
      success: false,
      error: `Connectivity check error: ${error instanceof Error ? error.code || error.message : String(error)}`,
    };
  }
}
//@ chunk-p8fze0jh.js:17402-19010 fingerprint (2.1.88 match: PreflightStep, 0.303)
/**
 * 首次运行的连通性检查界面：显示 Checking connectivity...，失败时提示 Unable to connect to Anthropic services 并退出。
 */
function PreflightStep(props) {
  let $ = useMemoCache(14);
  let { onSuccess } = props;
  let [result, setResult] = useState(null);
  let [isChecking, setIsChecking] = useState(true);
  let source = getProxyUrlWithSource()?.source;
  let showSpinner = useTimeout(1000) && isChecking;
  let t1;
  let t2;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = () => {
      let run = async function run() {
        let checkResult = await checkEndpoints();
        setResult(checkResult);
        setIsChecking(false);
      };
      run();
    };
    t2 = [];
    $[0] = t1;
    $[1] = t2;
  } else {
    t1 = $[0];
    t2 = $[1];
  }
  useEffect(t1, t2);
  let notifySuccess;
  if ($[2] !== onSuccess || $[3] !== result?.success) {
    notifySuccess = () => {
      if (result?.success) onSuccess();
    };
    $[2] = onSuccess;
    $[3] = result?.success;
    $[4] = notifySuccess;
  } else notifySuccess = $[4];
  let effectDeps;
  if ($[5] !== onSuccess || $[6] !== result) {
    effectDeps = [result, onSuccess];
    $[5] = onSuccess;
    $[6] = result;
    $[7] = effectDeps;
  } else effectDeps = $[7];
  useEffect(notifySuccess, effectDeps);
  useTimeout(exitPreflightFailed, result && !result.success ? 100 : null);
  let children;
  if ($[8] !== isChecking || $[9] !== result || $[10] !== showSpinner) {
    children =
      isChecking && showSpinner
        ? jsxProd_default_2(Box, {
            paddingLeft: 1,
            children: [
              jsxProd_default(Spinner, {}),
              jsxProd_default(Text, {
                children: "Checking connectivity...",
              }),
            ],
          })
        : !result?.success &&
          !isChecking &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(Text, {
                color: "error",
                children: "Unable to connect to Anthropic services",
              }),
              jsxProd_default(Text, {
                color: "error",
                children: result?.error,
              }),
              result?.sslHint
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      jsxProd_default(Text, {
                        children: result.sslHint,
                      }),
                      jsxProd_default(Text, {
                        color: "suggestion",
                        children: "See https://code.claude.com/docs/en/network-config",
                      }),
                    ],
                  })
                : jsxProd_default_2(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      source && result?.usedProxy
                        ? jsxProd_default_2(Text, {
                            children: [
                              "A proxy is configured via ",
                              source,
                              ". Check that it allows connections to the host above.",
                              " ",
                              jsxProd_default(Text, {
                                color: "suggestion",
                                children: "See https://code.claude.com/docs/en/network-config",
                              }),
                            ],
                          })
                        : null,
                      jsxProd_default(Text, {
                        children: "Please check your internet connection and network settings.",
                      }),
                      jsxProd_default_2(Text, {
                        children: [
                          "Note: Claude Code might not be available in your country. Check supported countries at",
                          " ",
                          jsxProd_default(Text, {
                            color: "suggestion",
                            children: "https://anthropic.com/supported-countries",
                          }),
                        ],
                      }),
                    ],
                  }),
            ],
          });
    $[8] = isChecking;
    $[9] = result;
    $[10] = showSpinner;
    $[11] = children;
  } else children = $[11];
  let t6;
  if ($[12] !== children) {
    t6 = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      paddingLeft: 1,
      children,
    });
    $[12] = children;
    $[13] = t6;
  } else t6 = $[13];
  return t6;
}
export { PreflightStep };
