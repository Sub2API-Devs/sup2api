/**
 * components/AwsAuthRefresh.tsx
 *
 * 2.1.316 新增：AWS 凭据刷新组件：设置变更后触发刷新、显示状态框、处理冷却与项目级设置提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s5p7fp0c.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  getConfiguredAwsAuthRefresh,
  isAwsAuthRefreshFromProjectSettings,
  refreshAwsAuth,
  clearAwsCredentialsCache,
  resetAwsAuthRefreshCooldown,
} from "../utils/auth.js";
import { checkHasTrustDialogAccepted } from "../utils/config.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { AwsAuthStatusBox } from "./AwsAuthStatusBox.js";

//@ chunk-s5p7fp0c.js:24518-25025 placement = call (0.356)
function call(props) {
  let $ = useMemoCache(4);
  let { onComplete } = props;
  let refreshEffect;
  if ($[0] !== onComplete) {
    refreshEffect = () => {
      let configuredAwsAuthRefresh = getConfiguredAwsAuthRefresh();
      if (!configuredAwsAuthRefresh) {
        onComplete(false);
        return;
      }
      if (isAwsAuthRefreshFromProjectSettings() && !checkHasTrustDialogAccepted()) {
        onComplete(false);
        return;
      }
      let abortController = new AbortController();
      refreshAwsAuth(configuredAwsAuthRefresh, abortController.signal).then((refreshResult) => {
        if (abortController.signal.aborted) {
          return;
        }
        if (refreshResult) {
          clearAwsCredentialsCache();
          resetAwsAuthRefreshCooldown();
        }
        onComplete(refreshResult);
      });
      return () => abortController.abort();
    };
    $[0] = onComplete;
    $[1] = refreshEffect;
  } else refreshEffect = $[1];
  let effectDeps;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    effectDeps = [];
    $[2] = effectDeps;
  } else effectDeps = $[2];
  useEffect(refreshEffect, effectDeps);
  let statusElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    statusElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              children: "Running awsAuthRefresh\u2026",
            }),
          ],
        }),
        jsxProd_default(AwsAuthStatusBox, {}),
      ],
    });
    $[3] = statusElement;
  } else statusElement = $[3];
  return statusElement;
}
export { call };
