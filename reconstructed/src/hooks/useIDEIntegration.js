/**
 * hooks/useIDEIntegration.tsx
 *
 * IDE 集成：自动检测并连接 IDE（ws-ide/sse-ide），可选自动安装扩展，返回安装状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIDEIntegration.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { y, R, P } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { shouldShowDisableAutoConnectDialog } from "../components/IdeAutoConnectDialog.js";
import { createAbortController } from "../utils/abortController.js";
import { initializeIdeIntegration, abortIdeSearch } from "../utils/ide.js";
import { IDE_ONBOARDING_DIALOG } from "../screens/replDialogState.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-18hwfzwa.js:1688782-1690353 fingerprint = useIDEIntegration (0.621)
/**
 * IDE 集成：检测可连接的 IDE（ws-ide/sse-ide），按 autoConnectIde 设置/flag 自动连接并加入动态 MCP 配置，必要时自动安装扩展，返回 {installationStatus, installExtension}。
 */
function useIDEIntegration(props) {
  let $ = w(13);
  let { autoConnectIdeFlag, onAutoConnectIde, requestDialog } = props;
  let { storageV5 } = useTheme_2();
  let [ke, onInstallationComplete] = y(null);
  let [Be, He] = y(null);
  let ze;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ze = Promise.resolve();
    $[0] = ze;
  } else ze = $[0];
  let Xe = R(ze);
  let rt;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    rt = new Map();
    $[1] = rt;
  } else rt = $[1];
  let kt = R(rt);
  let At;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    At = (It) => {
      let Ot = kt.current;
      let Et = Ot.get(It);
      if (Et) {
        return Et;
      }
      let oo = Xe.current.then(
        () =>
          new Promise((resolve) => {
            onInstallationComplete((Lt) => (Lt?.ideType === It ? null : Lt));
            He({
              ide: It,
              onComplete: resolve,
            });
          }),
      );
      Xe.current = oo;
      Ot.set(It, oo);
      oo.then(() => Ot.delete(It));
      return oo;
    };
    $[2] = At;
  } else At = $[2];
  let installExtension = At;
  let ide = Be?.ide ?? null;
  let so = R(false);
  let po;
  let ao;
  if (
    $[3] !== autoConnectIdeFlag ||
    $[4] !== ide ||
    $[5] !== Be ||
    $[6] !== onAutoConnectIde ||
    $[7] !== requestDialog ||
    $[8] !== storageV5
  ) {
    po = () => {
      if (isRemoteSessionAvailable()) {
        Be?.onComplete(null);
        return;
      }
      if (isBgSession() && !ide) {
        return;
      }
      let addIde = function bo(ide_2) {
        if (!ide_2) {
          return;
        }
        if (!shouldShowDisableAutoConnectDialog(Boolean(autoConnectIdeFlag || ide))) {
          return;
        }
        onAutoConnectIde({
          type: ide_2.url.startsWith("ws:") ? "ws-ide" : "sse-ide",
          url: ide_2.url,
          ideName: ide_2.name,
          authToken: ide_2.authToken,
          ideRunningInWindows: ide_2.ideRunningInWindows,
          scope: "dynamic",
        });
      };
      let globalConfig = createAbortController();
      initializeIdeIntegration(
        addIde,
        ide,
        (installationStatus) => {
          if (isBgSession() || so.current) {
            return;
          }
          so.current = true;
          let Ro = function Ro() {
            so.current = false;
          };
          requestDialog(
            IDE_ONBOARDING_DIALOG,
            {
              installationStatus,
            },
            {
              place: "under",
            },
          ).then(Ro, Ro);
        },
        onInstallationComplete,
        globalConfig.signal,
        storageV5,
      ).then(
        (prev) => Be?.onComplete(prev),
        (status) => {
          if (!Be) {
            return;
          }
          let Wo = {
            installed: false,
            error: errorMessage(status),
            installedVersion: null,
            ideType: Be.ide,
          };
          onInstallationComplete(Wo);
          Be.onComplete(Wo);
        },
      );
      return () => {
        globalConfig.abort();
        abortIdeSearch();
      };
    };
    ao = [autoConnectIdeFlag, Be, ide, onAutoConnectIde, requestDialog, storageV5];
    $[3] = autoConnectIdeFlag;
    $[4] = ide;
    $[5] = Be;
    $[6] = onAutoConnectIde;
    $[7] = requestDialog;
    $[8] = storageV5;
    $[9] = po;
    $[10] = ao;
  } else {
    po = $[9];
    ao = $[10];
  }
  P(po, ao);
  let mn;
  if ($[11] !== ke) {
    mn = {
      installationStatus: ke,
      installExtension,
    };
    $[11] = ke;
    $[12] = mn;
  } else mn = $[12];
  return mn;
}
export { useIDEIntegration };
