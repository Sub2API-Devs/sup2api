/**
 * screens/repl/SandboxStartup.ts
 *
 * 2.1.316 新增。REPL 启动时的沙箱初始化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SandboxManager, isMisleadingConsentHost } from "../../utils/sandbox/sandbox-adapter.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { errorMessage } from "../../utils/errors.js";
import { getModeBaseBehavior } from "../../utils/permissions/PermissionMode.js";
import { vjt, W3n, G3n } from "../../tools/BashTool/sandboxNetwork.js";
import { conversationSnapshot } from "../../utils/inboxClassification.js";
import { classifySandboxNetworkHost } from "../../utils/permissions/sandboxNetworkClassifier.js";
import { isModelDrivenSession } from "../../utils/teammate.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  Yqe,
  generateSandboxRequestId,
  sendSandboxPermissionRequestViaMailbox,
} from "../../utils/swarm/permissionSync.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { registerSandboxPermissionCallback } from "../../hooks/useSwarmPermissionPoller.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

/**
 * SandboxStartup：REPL 启动时初始化沙箱并处理失败提示。
 */
//@ chunk-18hwfzwa.js:412092-415122 placement
class SandboxStartup {
  #e;
  constructor(h) {
    this.#e = h;
  }
  start() {
    let { store: store, setAppState: setAppState, isRemoteSession: isRemoteSession } = this.#e,
      sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
    if (sandboxUnavailableReason && SandboxManager.isSandboxRequired())
      return (
        process.stderr.write(
          `
Error: sandbox required but unavailable: ${sandboxUnavailableReason}
` +
            `  sandbox.failIfUnavailable is set \u2014 refusing to start without a working sandbox.

`,
        ),
        gracefulShutdownSync(1, "other"),
        { stop: () => {}, refused: !0 }
      );
    if (sandboxUnavailableReason)
      logForDebugging(`sandbox disabled: ${sandboxUnavailableReason}`, { level: "warn" });
    let ee = sandboxUnavailableReason ? void 0 : SandboxManager.getMaskCredentialWarning();
    if (ee) logForDebugging(`sandbox: ${ee}`, { level: "warn" });
    if (sandboxUnavailableReason || ee)
      (logSetupIssues("sandbox", 1),
        setAppState((Be) => {
          if (Be.setupIssues.sandboxIssueCount === 1) return Be;
          return { ...Be, setupIssues: { ...Be.setupIssues, sandboxIssueCount: 1 } };
        }));
    let ke =
      sandboxUnavailableReason && !isRemoteSession ? SandboxManager.getSandboxSetUpAgainWarning() : void 0;
    if (ke !== void 0)
      setAppState((Be) =>
        Be.setupIssues.securityWarnings.some((securityWarning) => securityWarning.text === ke)
          ? Be
          : {
              ...Be,
              setupIssues: {
                ...Be.setupIssues,
                securityWarnings: [...Be.setupIssues.securityWarnings, { text: ke }],
              },
            },
      );
    if (isRemoteSession) return { stop: () => {}, refused: !1 };
    return {
      stop: createDependencyWatcher(
        [store],
        () => [SandboxManager.isSandboxingEnabled(), SandboxManager.getSandboxRestartWarning()],
        (Be, He) => {
          if (He !== void 0)
            return (
              setAppState((We) =>
                We.setupIssues.securityWarnings.some((securityWarning) => securityWarning.text === He)
                  ? We
                  : {
                      ...We,
                      setupIssues: {
                        ...We.setupIssues,
                        securityWarnings: [...We.setupIssues.securityWarnings, { text: He }],
                      },
                    },
              ),
              () => {
                setAppState((We) => ({
                  ...We,
                  setupIssues: {
                    ...We.setupIssues,
                    securityWarnings: We.setupIssues.securityWarnings.filter(
                      (securityWarning) => securityWarning.text !== He,
                    ),
                  },
                }));
              }
            );
          if (!Be) return;
          if (ke !== void 0)
            setAppState((We) =>
              We.setupIssues.securityWarnings.some((securityWarning) => securityWarning.text === ke)
                ? {
                    ...We,
                    setupIssues: {
                      ...We.setupIssues,
                      securityWarnings: We.setupIssues.securityWarnings.filter(
                        (securityWarning) => securityWarning.text !== ke,
                      ),
                    },
                  }
                : We,
            );
          SandboxManager.initialize(this.ask)
            .then(() => {
              let profileReadSecurityWarnings = SandboxManager.getProfileReadSecurityWarnings();
              if (profileReadSecurityWarnings.length === 0) return;
              setAppState((ze) => ({
                ...ze,
                setupIssues: {
                  ...ze.setupIssues,
                  securityWarnings: [
                    ...ze.setupIssues.securityWarnings.filter(
                      (securityWarning) => !profileReadSecurityWarnings.includes(securityWarning.text),
                    ),
                    ...profileReadSecurityWarnings.map((Xe) => ({ text: Xe })),
                  ],
                },
              }));
            })
            .catch((We) => {
              (process.stderr.write(`
\u274C Sandbox Error: ${errorMessage(We)}
`),
                gracefulShutdownSync(1, "other"));
            });
        },
      ),
      refused: !1,
    };
  }
  ask = async (h) => {
    let {
        store: store,
        storageV5: storageV5,
        credentials: credentials,
        scope: scope,
        getMessages: getMessages,
      } = this.#e,
      state = store.getState(),
      { mode: mode, isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable } =
        state.toolPermissionContext;
    switch (getModeBaseBehavior(mode, isBypassPermissionsModeAvailable)) {
      case "allow":
        return !0;
      case "deny":
        return !1;
      case "classify":
        if (vjt()) return W3n();
        let ze = G3n();
        if (ze !== void 0) return ze;
        return scope
          .sandboxClassifierVerdicts()
          .getOrClassify(h.host, h.port, conversationSnapshot(getMessages()), () =>
            classifySandboxNetworkHost(
              h.host,
              h.port,
              getMessages(),
              scope.computeTools(),
              state.toolPermissionContext,
              new AbortController().signal,
              {
                isSubagentLoop: isModelDrivenSession(void 0),
                recordPresumed: !0,
                storageV5: storageV5,
                credentials: credentials,
              },
            ),
          );
      case "ask":
        return this.#t(h, void 0);
    }
  };
  async #t(h, x) {
    let { setAppState: setAppState, storageV5: storageV5, networkPrompts: networkPrompts } = this.#e;
    if (isAgentSwarmsEnabled() && Yqe()) {
      if (isMisleadingConsentHost(h.host))
        return (
          logForDebugging(
            `[sandbox] Refusing to forward a worker ask for a host srt would re-spell: ${toApprovalLabel(h.host) ?? "(unshowable)"}`,
            { level: "warn" },
          ),
          !1
        );
      let ke = generateSandboxRequestId();
      if (!(await sendSandboxPermissionRequestViaMailbox(h.host, ke, void 0, storageV5)))
        return networkPrompts.ask(h, { forwardToBridge: !1, expiry: x });
      return new Promise((Be) => {
        (registerSandboxPermissionCallback({ requestId: ke, host: h.host, resolve: Be }),
          setAppState((He) => ({ ...He, pendingSandboxRequest: { requestId: ke, host: h.host } })));
      });
    }
    return networkPrompts.ask(h, { expiry: x });
  }
}
//@ chunk-18hwfzwa.js:415122-415126 placement
j();
//@ chunk-18hwfzwa.js:415164-415168 placement
j();

export { SandboxStartup };
