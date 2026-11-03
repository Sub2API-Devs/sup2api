/**
 * components/AwsAuthRefresh.tsx
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s5p7fp0c.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  getConfiguredAwsAuthRefresh,
  isAwsAuthRefreshFromProjectSettings,
  refreshAwsAuth,
  clearAwsCredentialsCache,
  resetAwsAuthRefreshCooldown,
} from "../utils/auth.js";
import { checkHasTrustDialogAccepted } from "../utils/config.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { P } from "../../vendor/react/cjs/react.production.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { AwsAuthStatusBox } from "./AwsAuthStatusBox.js";

//@ chunk-s5p7fp0c.js:24518-25025 placement = call (0.356)
function call(A) {
  let D = w(4),
    { onComplete: onComplete } = A,
    M;
  if (D[0] !== onComplete)
    ((M = () => {
      let L = getConfiguredAwsAuthRefresh();
      if (!L) {
        onComplete(!1);
        return;
      }
      if (isAwsAuthRefreshFromProjectSettings() && !checkHasTrustDialogAccepted()) {
        onComplete(!1);
        return;
      }
      let abortController = new AbortController();
      return (
        refreshAwsAuth(L, abortController.signal).then((F) => {
          if (abortController.signal.aborted) {
            return;
          }
          if (F) (clearAwsCredentialsCache(), resetAwsAuthRefreshCooldown());
          onComplete(F);
        }),
        () => abortController.abort()
      );
    }),
      (D[0] = onComplete),
      (D[1] = M));
  else M = D[1];
  let U;
  if (D[2] === MEMO_CACHE_SENTINEL) ((U = []), (D[2] = U));
  else U = D[2];
  P(M, U);
  let i;
  if (D[3] === MEMO_CACHE_SENTINEL)
    ((i = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Box, { children: [e(Spinner, {}), e(Text, { children: "Running awsAuthRefresh\u2026" })] }),
        e(AwsAuthStatusBox, {}),
      ],
    })),
      (D[3] = i));
  else i = D[3];
  return i;
}

export { call };
