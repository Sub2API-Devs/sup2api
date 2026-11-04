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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useState, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
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
  let $ = useMemoCache(13);
  let { autoConnectIdeFlag, onAutoConnectIde, requestDialog } = props;
  let { storageV5 } = useTheme_2();
  let [installState, setInstallState] = useState(null);
  let [extensionInstall, setExtensionInstall] = useState(null);
  let startPromise;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    startPromise = Promise.resolve();
    $[0] = startPromise;
  } else startPromise = $[0];
  let startedRef = useRef(startPromise);
  let startFn;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    startFn = new Map();
    $[1] = startFn;
  } else startFn = $[1];
  let startFnRef = useRef(startFn);
  let addIde;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    addIde = (ide) => {
      let map = startFnRef.current;
      let existing = map.get(ide);
      if (existing) {
        return existing;
      }
      let pending = startedRef.current.then(
        () =>
          new Promise((resolve) => {
            setInstallState((ide_2) => (ide_2?.ideType === ide ? null : ide_2));
            setExtensionInstall({
              ide,
              onComplete: resolve,
            });
          }),
      );
      startedRef.current = pending;
      map.set(ide, pending);
      pending.then(() => map.delete(ide));
      return pending;
    };
    $[2] = addIde;
  } else addIde = $[2];
  let installExtension = addIde;
  let ide = extensionInstall?.ide ?? null;
  let isRefreshing = useRef(false);
  let refreshFn;
  let state;
  if (
    $[3] !== autoConnectIdeFlag ||
    $[4] !== ide ||
    $[5] !== extensionInstall ||
    $[6] !== onAutoConnectIde ||
    $[7] !== requestDialog ||
    $[8] !== storageV5
  ) {
    refreshFn = () => {
      if (isRemoteSessionAvailable()) {
        extensionInstall?.onComplete(null);
        return;
      }
      if (isBgSession() && !ide) {
        return;
      }
      let addIde = function addIde_(ide_2) {
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
          if (isBgSession() || isRefreshing.current) {
            return;
          }
          isRefreshing.current = true;
          let finishInstall = function removeIde() {
            isRefreshing.current = false;
          };
          requestDialog(
            IDE_ONBOARDING_DIALOG,
            {
              installationStatus,
            },
            {
              place: "under",
            },
          ).then(finishInstall, finishInstall);
        },
        setInstallState,
        globalConfig.signal,
        storageV5,
      ).then(
        (prev) => extensionInstall?.onComplete(prev),
        (status) => {
          if (!extensionInstall) {
            return;
          }
          let result = {
            installed: false,
            error: errorMessage(status),
            installedVersion: null,
            ideType: extensionInstall.ide,
          };
          setInstallState(result);
          extensionInstall.onComplete(result);
        },
      );
      return () => {
        globalConfig.abort();
        abortIdeSearch();
      };
    };
    state = [autoConnectIdeFlag, extensionInstall, ide, onAutoConnectIde, requestDialog, storageV5];
    $[3] = autoConnectIdeFlag;
    $[4] = ide;
    $[5] = extensionInstall;
    $[6] = onAutoConnectIde;
    $[7] = requestDialog;
    $[8] = storageV5;
    $[9] = refreshFn;
    $[10] = state;
  } else {
    refreshFn = $[9];
    state = $[10];
  }
  useEffect(refreshFn, state);
  let snapshot;
  if ($[11] !== installState) {
    snapshot = {
      installationStatus: installState,
      installExtension,
    };
    $[11] = installState;
    $[12] = snapshot;
  } else snapshot = $[12];
  return snapshot;
}
export { useIDEIntegration };
