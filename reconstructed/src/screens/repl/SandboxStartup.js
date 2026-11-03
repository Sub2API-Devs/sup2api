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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SandboxManager, isMisleadingConsentHost } from "../../utils/sandbox/sandbox-adapter.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { errorMessage } from "../../utils/errors.js";
import { getModeBaseBehavior } from "../../utils/permissions/PermissionMode.js";
import {
  areCommandNetworkListsOffered,
  commandDomainDenyReason,
  sandboxHostDenyReason,
} from "../../tools/BashTool/sandboxNetwork.js";
import { conversationSnapshot } from "../../utils/inboxClassification.js";
import { classifySandboxNetworkHost } from "../../utils/permissions/sandboxNetworkClassifier.js";
import { isModelDrivenSession } from "../../utils/teammate.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  isTeammateContextReady,
  generateSandboxRequestId,
  sendSandboxPermissionRequestViaMailbox,
} from "../../utils/swarm/permissionSync.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { registerSandboxPermissionCallback } from "../../hooks/useSwarmPermissionPoller.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:412092-415122 placement
/**
 * SandboxStartup：REPL 启动时初始化沙箱并处理失败提示。
 */
class SandboxStartup {
  #e;
  constructor(h) {
    this.#e = h;
  }
  start() {
    let { store, setAppState, isRemoteSession } = this.#e;
    let sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
    if (sandboxUnavailableReason && SandboxManager.isSandboxRequired()) {
      process.stderr.write(
        `
Error: sandbox required but unavailable: ${sandboxUnavailableReason}
` +
          `  sandbox.failIfUnavailable is set \u2014 refusing to start without a working sandbox.

`,
      );
      gracefulShutdownSync(1, "other");
      return {
        stop: () => {},
        refused: true,
      };
    }
    if (sandboxUnavailableReason)
      logForDebugging(`sandbox disabled: ${sandboxUnavailableReason}`, {
        level: "warn",
      });
    let ee = sandboxUnavailableReason ? undefined : SandboxManager.getMaskCredentialWarning();
    if (ee)
      logForDebugging(`sandbox: ${ee}`, {
        level: "warn",
      });
    if (sandboxUnavailableReason || ee) {
      logSetupIssues("sandbox", 1);
      setAppState((Be) => {
        if (Be.setupIssues.sandboxIssueCount === 1) return Be;
        return {
          ...Be,
          setupIssues: {
            ...Be.setupIssues,
            sandboxIssueCount: 1,
          },
        };
      });
    }
    let ke =
      sandboxUnavailableReason && !isRemoteSession ? SandboxManager.getSandboxSetUpAgainWarning() : undefined;
    if (ke !== undefined)
      setAppState((Be) =>
        Be.setupIssues.securityWarnings.some((securityWarning) => securityWarning.text === ke)
          ? Be
          : {
              ...Be,
              setupIssues: {
                ...Be.setupIssues,
                securityWarnings: [
                  ...Be.setupIssues.securityWarnings,
                  {
                    text: ke,
                  },
                ],
              },
            },
      );
    if (isRemoteSession)
      return {
        stop: () => {},
        refused: false,
      };
    return {
      stop: createDependencyWatcher(
        [store],
        () => [SandboxManager.isSandboxingEnabled(), SandboxManager.getSandboxRestartWarning()],
        (Be, He) => {
          if (He !== undefined) {
            setAppState((We) =>
              We.setupIssues.securityWarnings.some((securityWarning) => securityWarning.text === He)
                ? We
                : {
                    ...We,
                    setupIssues: {
                      ...We.setupIssues,
                      securityWarnings: [
                        ...We.setupIssues.securityWarnings,
                        {
                          text: He,
                        },
                      ],
                    },
                  },
            );
            return () => {
              setAppState((We) => ({
                ...We,
                setupIssues: {
                  ...We.setupIssues,
                  securityWarnings: We.setupIssues.securityWarnings.filter(
                    (securityWarning) => securityWarning.text !== He,
                  ),
                },
              }));
            };
          }
          if (!Be) return;
          if (ke !== undefined)
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
                    ...profileReadSecurityWarnings.map((text) => ({
                      text,
                    })),
                  ],
                },
              }));
            })
            .catch((error) => {
              process.stderr.write(`
\u274C Sandbox Error: ${errorMessage(error)}
`);
              gracefulShutdownSync(1, "other");
            });
        },
      ),
      refused: false,
    };
  }
  ask = async (h) => {
    let { store, storageV5, credentials, scope, getMessages } = this.#e;
    let state = store.getState();
    let { mode, isBypassPermissionsModeAvailable } = state.toolPermissionContext;
    switch (getModeBaseBehavior(mode, isBypassPermissionsModeAvailable)) {
      case "allow":
        return true;
      case "deny":
        return false;
      case "classify":
        if (areCommandNetworkListsOffered()) return commandDomainDenyReason();
        let ze = sandboxHostDenyReason();
        if (ze !== undefined) return ze;
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
                isSubagentLoop: isModelDrivenSession(undefined),
                recordPresumed: true,
                storageV5,
                credentials,
              },
            ),
          );
      case "ask":
        return this.#t(h, undefined);
    }
  };
  async #t(h, expiry) {
    let { setAppState, storageV5, networkPrompts } = this.#e;
    if (isAgentSwarmsEnabled() && isTeammateContextReady()) {
      if (isMisleadingConsentHost(h.host)) {
        logForDebugging(
          `[sandbox] Refusing to forward a worker ask for a host srt would re-spell: ${toApprovalLabel(h.host) ?? "(unshowable)"}`,
          {
            level: "warn",
          },
        );
        return false;
      }
      let requestId = generateSandboxRequestId();
      if (!(await sendSandboxPermissionRequestViaMailbox(h.host, requestId, undefined, storageV5)))
        return networkPrompts.ask(h, {
          forwardToBridge: false,
          expiry,
        });
      return new Promise((resolve) => {
        registerSandboxPermissionCallback({
          requestId,
          host: h.host,
          resolve,
        });
        setAppState((He) => ({
          ...He,
          pendingSandboxRequest: {
            requestId,
            host: h.host,
          },
        }));
      });
    }
    return networkPrompts.ask(h, {
      expiry,
    });
  }
}
//@ chunk-18hwfzwa.js:415122-415126 placement
init_react_production();
//@ chunk-18hwfzwa.js:415164-415168 placement
init_react_production();
export { SandboxStartup };
