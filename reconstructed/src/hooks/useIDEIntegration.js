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
import { Me } from "../components/design-system/ThemeProvider.js";
import { y, R, P } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { wt } from "../remote/remoteMode.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { shouldShowDisableAutoConnectDialog } from "../components/IdeAutoConnectDialog.js";
import { createAbortController } from "../utils/abortController.js";
import { initializeIdeIntegration, abortIdeSearch } from "../utils/ide.js";
import { IDE_ONBOARDING_DIALOG } from "../screens/replDialogState.js";
import { errorMessage } from "../utils/errors.js";

/**
 * IDE 集成：检测可连接的 IDE（ws-ide/sse-ide），按 autoConnectIde 设置/flag 自动连接并加入动态 MCP 配置，必要时自动安装扩展，返回 {installationStatus, installExtension}。
 */
//@ chunk-18hwfzwa.js:1688782-1690353 fingerprint = useIDEIntegration (0.621)
function useIDEIntegration(t0) {
  let $ = w(13),
    {
      autoConnectIdeFlag: autoConnectIdeFlag,
      onAutoConnectIde: onAutoConnectIde,
      requestDialog: requestDialog,
    } = t0,
    { storageV5: storageV5 } = Me(),
    [ke, Re] = y(null),
    [Be, He] = y(null),
    ze;
  if ($[0] === MEMO_CACHE_SENTINEL) ((ze = Promise.resolve()), ($[0] = ze));
  else ze = $[0];
  let Xe = R(ze),
    rt;
  if ($[1] === MEMO_CACHE_SENTINEL) ((rt = new Map()), ($[1] = rt));
  else rt = $[1];
  let kt = R(rt),
    At;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((At = (It) => {
      let Ot = kt.current;
      let Et = Ot.get(It);
      if (Et) {
        return Et;
      }
      let oo = Xe.current.then(
        () =>
          new Promise((Dt) => {
            (Re((Lt) => (Lt?.ideType === It ? null : Lt)), He({ ide: It, onComplete: Dt }));
          }),
      );
      return ((Xe.current = oo), Ot.set(It, oo), oo.then(() => Ot.delete(It)), oo);
    }),
      ($[2] = At));
  else At = $[2];
  let Xt = At,
    io = Be?.ide ?? null,
    so = R(!1),
    po,
    ao;
  if (
    $[3] !== autoConnectIdeFlag ||
    $[4] !== io ||
    $[5] !== Be ||
    $[6] !== onAutoConnectIde ||
    $[7] !== requestDialog ||
    $[8] !== storageV5
  )
    ((po = () => {
      if (wt()) {
        Be?.onComplete(null);
        return;
      }
      if (isBgSession() && !io) {
        return;
      }
      let addIde = function bo(ide) {
        if (!ide) {
          return;
        }
        if (!shouldShowDisableAutoConnectDialog(Boolean(autoConnectIdeFlag || io))) {
          return;
        }
        onAutoConnectIde({
          type: ide.url.startsWith("ws:") ? "ws-ide" : "sse-ide",
          url: ide.url,
          ideName: ide.name,
          authToken: ide.authToken,
          ideRunningInWindows: ide.ideRunningInWindows,
          scope: "dynamic",
        });
      };
      let globalConfig = createAbortController();
      return (
        initializeIdeIntegration(
          addIde,
          io,
          (Bo) => {
            if (isBgSession() || so.current) {
              return;
            }
            so.current = !0;
            let Ro = function Ro() {
              so.current = !1;
            };
            requestDialog(IDE_ONBOARDING_DIALOG, { installationStatus: Bo }, { place: "under" }).then(Ro, Ro);
          },
          Re,
          globalConfig.signal,
          storageV5,
        ).then(
          (prev) => Be?.onComplete(prev),
          (status) => {
            if (!Be) {
              return;
            }
            let Wo = { installed: !1, error: errorMessage(status), installedVersion: null, ideType: Be.ide };
            (Re(Wo), Be.onComplete(Wo));
          },
        ),
        () => {
          (globalConfig.abort(), abortIdeSearch());
        }
      );
    }),
      (ao = [autoConnectIdeFlag, Be, io, onAutoConnectIde, requestDialog, storageV5]),
      ($[3] = autoConnectIdeFlag),
      ($[4] = io),
      ($[5] = Be),
      ($[6] = onAutoConnectIde),
      ($[7] = requestDialog),
      ($[8] = storageV5),
      ($[9] = po),
      ($[10] = ao));
  else ((po = $[9]), (ao = $[10]));
  P(po, ao);
  let mn;
  if ($[11] !== ke) ((mn = { installationStatus: ke, installExtension: Xt }), ($[11] = ke), ($[12] = mn));
  else mn = $[12];
  return mn;
}

export { useIDEIntegration };
