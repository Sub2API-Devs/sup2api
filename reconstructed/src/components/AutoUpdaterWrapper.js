/**
 * components/AutoUpdaterWrapper.tsx
 *
 * 根据安装类型（native/package-manager/npm）选择对应的自动更新组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/AutoUpdaterWrapper.tsx
 * pieces: chunk-tzghj6zv.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { homedir } from "os";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import {
  Hi,
  Ipt,
  clearFailedAutoUpdaterResult,
  getPackageManagerUpgradeCommand,
  PackageManagerAutoUpdater_2,
} from "./PackageManagerAutoUpdater.js";
import { useHost } from "../context/session.js";
import { y, Oo, P } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  _2e,
  Pbt,
  wasInstallTypeProbed,
  getCurrentInstallationTypeProbed,
} from "../utils/doctorDiagnostic.js";
import { isAutoUpdaterDisabled } from "../utils/config.js";
import {
  isAutoUpdateCheckThrottled,
  Uun,
  fetchGcsVersion,
  getMaxVersion,
  shouldSkipVersion,
  remainingStartupGraceMs,
} from "../utils/autoUpdater.js";
import { y9 } from "../utils/updateChannel.js";
import { gt as gt_2, gte } from "../utils/semver.js";
import { logForDebugging } from "../utils/debug.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { logEvent } from "../services/analytics/index.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { logError } from "../utils/log.js";
import { useInterval } from "../ink/components/Input.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { NativeAutoUpdater } from "./NativeAutoUpdater.js";
import { AutoUpdater } from "./AutoUpdater.js";

//@ chunk-tzghj6zv.js:38943-38958 sole-consumer
var rr = 1800000;
/**
 * 包管理器（homebrew/winget 等）安装的自动更新组件：检查最新版本（受 maxVersion 上限与跳过版本限制），CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE 开启时执行包管理器升级命令并记录 tengu_pkg_manager_auto_updater_* 事件，否则只提示可用更新。
 */
//@ chunk-tzghj6zv.js:38958-46626 sole-consumer
function PackageManagerAutoUpdater(props) {
  let $ = w(54),
    {
      isUpdating: isUpdating,
      onChangeIsUpdating: onChangeIsUpdating,
      showSuccessMessage: showSuccessMessage,
      verbose: verbose,
      withSeparator: withSeparator,
    } = props,
    O = useAppState(Hi),
    I = useSetAppState(),
    of = Ipt.of(useHost()),
    [Y, N] = y(of.packageManagerLatestVersion),
    [B, pe] = y("unknown"),
    [oe, ne] = y(null),
    we;
  if ($[0] !== isUpdating) ((we = () => isUpdating), ($[0] = isUpdating), ($[1] = we));
  else we = $[1];
  let Te = Oo(we),
    L,
    ee;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((L = () => {
      _2e().then((ye) => {
        if ((pe(ye), ye === "homebrew")) ne(Pbt());
      });
    }),
      (ee = []),
      ($[2] = L),
      ($[3] = ee));
  else ((L = $[2]), (ee = $[3]));
  P(L, ee);
  let Se;
  if (
    $[4] !== O?.status ||
    $[5] !== isUpdating ||
    $[6] !== onChangeIsUpdating ||
    $[7] !== Te ||
    $[8] !== I ||
    $[9] !== of
  )
    ((Se = async () => {
      if (isUpdating) {
        return;
      }
      if (O?.status === "success") {
        return;
      }
      if (isAutoUpdaterDisabled()) {
        return;
      }
      if (isAutoUpdateCheckThrottled()) {
        return;
      }
      if (O?.status === "install_failed") {
        if (Date.now() - of.packageManagerUpdateLastFailedAt < rr) {
          return;
        }
        I(clearFailedAutoUpdaterResult);
      }
      let [te, ae] = await Promise.all([y9(), _2e()]);
      let X = te;
      let F = null;
      if (ae === "homebrew") ((F = Pbt()), (X = F === "claude-code@latest" ? "latest" : "stable"));
      let re = ae === "homebrew" ? await Uun(F ?? "claude-code", X) : await fetchGcsVersion(X);
      let H = await getMaxVersion();
      let D = !1;
      if (H && re && gt_2(re, H)) {
        if (
          (logForDebugging(
            `PackageManagerAutoUpdater: maxVersion ${H} is set, capping update from ${re} to ${H}`,
          ),
          gte(
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            H,
          ))
        ) {
          (logForDebugging(
            `PackageManagerAutoUpdater: current version ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} is already at or above maxVersion ${H}, skipping update`,
          ),
            of.recordPackageManagerLatestVersion(null),
            N(null));
          return;
        }
        ((re = H), (D = !0));
      }
      let J =
        re &&
        !gte(
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
          re,
        ) &&
        !shouldSkipVersion(re);
      let K = J ? re : null;
      if ((of.recordPackageManagerLatestVersion(K), N(K), !J)) {
        return;
      }
      logForDebugging(
        `PackageManagerAutoUpdater: Update available ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} -> ${re}`,
      );
      let me = isEnvTruthy(process.env.CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE);
      let se = getPackageManagerUpgradeCommand(ae, F);
      if (!me || !se || D) {
        return;
      }
      if (Te()) {
        return;
      }
      onChangeIsUpdating(!0);
      let now = Date.now();
      let Ce = { pm_homebrew: ae === "homebrew", pm_winget: ae === "winget" };
      logEvent("tengu_pkg_manager_auto_updater_start", Ce);
      let [de, ..._e] = se;
      let Pe = await execFileNoThrowWithCwd(de, _e, {
        cwd: homedir(),
        timeout: 300000,
        env: ae === "homebrew" ? { ...process.env, HOMEBREW_NO_AUTO_UPDATE: "" } : void 0,
      });
      let Ge = Date.now() - now;
      if ((onChangeIsUpdating(!1), Pe.code === 0))
        (logEvent("tengu_pkg_manager_auto_updater_success", { ...Ce, latency_ms: Ge }),
          I((_) => {
            let autoUpdaterResult = _.autoUpdaterResult;
            if (autoUpdaterResult?.version === re && autoUpdaterResult?.status === "success") {
              return _;
            }
            return { ..._, autoUpdaterResult: { version: re, status: "success" } };
          }));
      else
        (logForDebugging(
          `PackageManagerAutoUpdater: ${de} exited ${Pe.code}: ${Pe.stderr || Pe.error || Pe.stdout}`,
        ),
          logEvent("tengu_pkg_manager_auto_updater_fail", { ...Ce, latency_ms: Ge, exit_code: Pe.code }),
          of.recordPackageManagerUpdateFailure(Date.now()),
          I((ke) => {
            if (ke.autoUpdaterResult?.status === "install_failed") {
              return ke;
            }
            return { ...ke, autoUpdaterResult: { version: re, status: "install_failed" } };
          }));
    }),
      ($[4] = O?.status),
      ($[5] = isUpdating),
      ($[6] = onChangeIsUpdating),
      ($[7] = Te),
      ($[8] = I),
      ($[9] = of),
      ($[10] = Se));
  else Se = $[10];
  let q = Oo(Se),
    U;
  if ($[11] !== onChangeIsUpdating)
    ((U = (xe) => {
      (onChangeIsUpdating(!1), logError(xe));
    }),
      ($[11] = onChangeIsUpdating),
      ($[12] = U));
  else U = $[12];
  let Ee = Oo(U),
    qe;
  if ($[13] !== q || $[14] !== Ee)
    ((qe = () => {
      q().catch(Ee);
    }),
      ($[13] = q),
      ($[14] = Ee),
      ($[15] = qe));
  else qe = $[15];
  let ut;
  if ($[16] === MEMO_CACHE_SENTINEL) ((ut = []), ($[16] = ut));
  else ut = $[16];
  P(qe, ut);
  let He;
  if ($[17] !== q || $[18] !== Ee) ((He = () => void q().catch(Ee)), ($[17] = q), ($[18] = Ee), ($[19] = He));
  else He = $[19];
  useInterval(He, rr);
  let Xe;
  if ($[20] !== withSeparator)
    ((Xe =
      withSeparator === void 0 ? null : e(Text, { dimColor: !0, children: withSeparator ? " \xB7" : "" })),
      ($[20] = withSeparator),
      ($[21] = Xe));
  else Xe = $[21];
  let Ne = Xe;
  if (O?.status === "success") {
    if (!showSuccessMessage) {
      return null;
    }
    let De;
    if ($[22] !== O || $[23] !== verbose)
      ((De =
        verbose &&
        r(Text, {
          dimColor: !0,
          wrap: "truncate",
          children: [
            "current: ",
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            " \xB7 latest:",
            " ",
            O.version,
          ],
        })),
        ($[22] = O),
        ($[23] = verbose),
        ($[24] = De));
    else De = $[24];
    const Ue = B !== "unknown" && ` via ${B}`;
    let Fe;
    if ($[25] !== Ue)
      ((Fe = r(Text, {
        color: "success",
        wrap: "truncate",
        children: ["\u2713 Update installed", Ue, " \xB7 Restart to apply"],
      })),
        ($[25] = Ue),
        ($[26] = Fe));
    else Fe = $[26];
    let Ve;
    if ($[27] !== Ne || $[28] !== De || $[29] !== Fe)
      ((Ve = r(Box, { flexDirection: "row", gap: 1, children: [Ne, De, Fe] })),
        ($[27] = Ne),
        ($[28] = De),
        ($[29] = Fe),
        ($[30] = Ve));
    else Ve = $[30];
    return Ve;
  }
  if (isUpdating) {
    const De = B === "unknown" ? "Updating\u2026" : `Updating via ${B}\u2026`;
    let Ue;
    if ($[31] !== De)
      ((Ue = e(Text, { dimColor: !0, wrap: "truncate", children: De })), ($[31] = De), ($[32] = Ue));
    else Ue = $[32];
    let Fe;
    if ($[33] !== Ne || $[34] !== Ue)
      ((Fe = r(Box, { flexDirection: "row", gap: 1, children: [Ne, Ue] })),
        ($[33] = Ne),
        ($[34] = Ue),
        ($[35] = Fe));
    else Fe = $[35];
    return Fe;
  }
  let et = O?.status === "install_failed";
  if ((!Y && !et) || B === "unknown") {
    return null;
  }
  let De;
  if ($[36] !== verbose)
    ((De =
      verbose &&
      r(Text, {
        dimColor: !0,
        wrap: "truncate",
        children: [
          "currentVersion: ",
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
        ],
      })),
      ($[36] = verbose),
      ($[37] = De));
  else De = $[37];
  let Ue;
  if ($[38] !== oe || $[39] !== B)
    ((Ue = PackageManagerAutoUpdater_2(B, oe)), ($[38] = oe), ($[39] = B), ($[40] = Ue));
  else Ue = $[40];
  let Fe;
  if ($[41] !== Ue) ((Fe = e(Text, { bold: !0, children: Ue })), ($[41] = Ue), ($[42] = Fe));
  else Fe = $[42];
  let Ve;
  if ($[43] !== et)
    ((Ve = et && e(Text, { dimColor: !0, children: " (auto-update failed)" })), ($[43] = et), ($[44] = Ve));
  else Ve = $[44];
  let xt;
  if ($[45] !== Fe || $[46] !== Ve)
    ((xt = r(Text, {
      color: "warning",
      wrap: "truncate",
      children: ["Update available! Run:", " ", Fe, Ve],
    })),
      ($[45] = Fe),
      ($[46] = Ve),
      ($[47] = xt));
  else xt = $[47];
  let mt;
  if ($[48] !== De || $[49] !== xt)
    ((mt = r(Box, { flexDirection: "column", alignItems: "flex-end", children: [De, xt] })),
      ($[48] = De),
      ($[49] = xt),
      ($[50] = mt));
  else mt = $[50];
  let zr;
  if ($[51] !== Ne || $[52] !== mt)
    ((zr = r(Box, { flexDirection: "row", gap: 1, alignItems: "flex-end", children: [Ne, mt] })),
      ($[51] = Ne),
      ($[52] = mt),
      ($[53] = zr));
  else zr = $[53];
  return zr;
}
/**
 * 检测安装类型后渲染 NativeAutoUpdater / PackageManagerAutoUpdater / AutoUpdater。
 */
//@ chunk-tzghj6zv.js:46626-47769 fingerprint = AutoUpdaterWrapper (0.58)
function AutoUpdaterWrapper(t0) {
  let $ = w(18),
    {
      isUpdating: isUpdating,
      onChangeIsUpdating: onChangeIsUpdating,
      showSuccessMessage: showSuccessMessage,
      verbose: verbose,
      withSeparator: withSeparator,
      atPrompt: atPrompt,
    } = t0,
    [I, V] = y(null),
    [Y, N] = y(null),
    pe;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((pe = async function we() {
      let oe = !wasInstallTypeProbed();
      let now = Date.now();
      let z = await getCurrentInstallationTypeProbed();
      (logFeatureOk("update_detection", {
        duration_ms: Date.now() - now,
        first_in_process: oe,
        installation_type: fromEnum(z),
      }),
        logForDebugging(`AutoUpdaterWrapper: Installation type: ${z}`),
        V(z === "native"),
        N(z === "package-manager"));
    }),
      ($[0] = pe));
  else pe = $[0];
  let we = pe,
    [Te] = y(remainingStartupGraceMs),
    L;
  if ($[1] === MEMO_CACHE_SENTINEL) ((L = () => void we()), ($[1] = L));
  else L = $[1];
  if ((useTimeout(L, Te), I === null || Y === null)) {
    return null;
  }
  if (Y) {
    let ee;
    if (
      $[2] !== isUpdating ||
      $[3] !== onChangeIsUpdating ||
      $[4] !== showSuccessMessage ||
      $[5] !== verbose ||
      $[6] !== withSeparator
    )
      ((ee = e(PackageManagerAutoUpdater, {
        verbose: verbose,
        isUpdating: isUpdating,
        onChangeIsUpdating: onChangeIsUpdating,
        showSuccessMessage: showSuccessMessage,
        withSeparator: withSeparator,
      })),
        ($[2] = isUpdating),
        ($[3] = onChangeIsUpdating),
        ($[4] = showSuccessMessage),
        ($[5] = verbose),
        ($[6] = withSeparator),
        ($[7] = ee));
    else ee = $[7];
    return ee;
  }
  let ee;
  if (
    $[8] !== isUpdating ||
    $[9] !== onChangeIsUpdating ||
    $[10] !== showSuccessMessage ||
    $[11] !== verbose ||
    $[12] !== withSeparator
  )
    ((ee = {
      verbose: verbose,
      isUpdating: isUpdating,
      onChangeIsUpdating: onChangeIsUpdating,
      showSuccessMessage: showSuccessMessage,
      withSeparator: withSeparator,
    }),
      ($[8] = isUpdating),
      ($[9] = onChangeIsUpdating),
      ($[10] = showSuccessMessage),
      ($[11] = verbose),
      ($[12] = withSeparator),
      ($[13] = ee));
  else ee = $[13];
  let ye = ee,
    Se;
  if ($[14] !== atPrompt || $[15] !== ye || $[16] !== I)
    ((Se = I ? e(NativeAutoUpdater, { ...ye, atPrompt: atPrompt }) : e(AutoUpdater, { ...ye })),
      ($[14] = atPrompt),
      ($[15] = ye),
      ($[16] = I),
      ($[17] = Se));
  else Se = $[17];
  return Se;
}

export { AutoUpdaterWrapper };
