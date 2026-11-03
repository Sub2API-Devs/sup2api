/**
 * @azure/msal-common/dist/logger/Logger.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-common@15.13.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { f } from "../../lib/index-node-DhUjlPuB.js";

//@ chunk-mrx6y2r5.js:102514-102520 esm-layout
var G;
//@ chunk-mrx6y2r5.js:102520-102657 esm-fingerprint
(function (e) {
  ((e[(e.Error = 0)] = "Error"),
    (e[(e.Warning = 1)] = "Warning"),
    (e[(e.Info = 2)] = "Info"),
    (e[(e.Verbose = 3)] = "Verbose"),
    (e[(e.Trace = 4)] = "Trace"));
})(G || (G = {}));
//@ chunk-mrx6y2r5.js:102657-104712 esm-fingerprint
class Ue {
  constructor(e, t, r) {
    this.level = G.Info;
    let n = () => {
        return;
      },
      o = e || Ue.createDefaultLoggerOptions();
    ((this.localCallback = o.loggerCallback || n),
      (this.piiLoggingEnabled = o.piiLoggingEnabled || !1),
      (this.level = typeof o.logLevel === "number" ? o.logLevel : G.Info),
      (this.correlationId = o.correlationId || f.EMPTY_STRING),
      (this.packageName = t || f.EMPTY_STRING),
      (this.packageVersion = r || f.EMPTY_STRING));
  }
  static createDefaultLoggerOptions() {
    return { loggerCallback: () => {}, piiLoggingEnabled: !1, logLevel: G.Info };
  }
  clone(e, t, r) {
    return new Ue(
      {
        loggerCallback: this.localCallback,
        piiLoggingEnabled: this.piiLoggingEnabled,
        logLevel: this.level,
        correlationId: r || this.correlationId,
      },
      e,
      t,
    );
  }
  logMessage(e, t) {
    if (t.logLevel > this.level || (!this.piiLoggingEnabled && t.containsPii)) return;
    let o = `${`[${new Date().toUTCString()}] : [${t.correlationId || this.correlationId || ""}]`} : ${this.packageName}@${this.packageVersion} : ${G[t.logLevel]} - ${e}`;
    this.executeCallback(t.logLevel, o, t.containsPii || !1);
  }
  executeCallback(e, t, r) {
    if (this.localCallback) this.localCallback(e, t, r);
  }
  error(e, t) {
    this.logMessage(e, { logLevel: G.Error, containsPii: !1, correlationId: t || f.EMPTY_STRING });
  }
  errorPii(e, t) {
    this.logMessage(e, { logLevel: G.Error, containsPii: !0, correlationId: t || f.EMPTY_STRING });
  }
  warning(e, t) {
    this.logMessage(e, { logLevel: G.Warning, containsPii: !1, correlationId: t || f.EMPTY_STRING });
  }
  warningPii(e, t) {
    this.logMessage(e, { logLevel: G.Warning, containsPii: !0, correlationId: t || f.EMPTY_STRING });
  }
  info(e, t) {
    this.logMessage(e, { logLevel: G.Info, containsPii: !1, correlationId: t || f.EMPTY_STRING });
  }
  infoPii(e, t) {
    this.logMessage(e, { logLevel: G.Info, containsPii: !0, correlationId: t || f.EMPTY_STRING });
  }
  verbose(e, t) {
    this.logMessage(e, { logLevel: G.Verbose, containsPii: !1, correlationId: t || f.EMPTY_STRING });
  }
  verbosePii(e, t) {
    this.logMessage(e, { logLevel: G.Verbose, containsPii: !0, correlationId: t || f.EMPTY_STRING });
  }
  trace(e, t) {
    this.logMessage(e, { logLevel: G.Trace, containsPii: !1, correlationId: t || f.EMPTY_STRING });
  }
  tracePii(e, t) {
    this.logMessage(e, { logLevel: G.Trace, containsPii: !0, correlationId: t || f.EMPTY_STRING });
  }
  isPiiLoggingEnabled() {
    return this.piiLoggingEnabled || !1;
  }
}

export { G, Ue };
