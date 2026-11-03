/**
 * @aws-sdk/util-user-agent-node/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/util-user-agent-node@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Oae } from "../../middleware-user-agent/dist-cjs/index.js";

//@ chunk-edce4vxq.js:134734-135599 cjs-fingerprint
var Hme = x(function (Jl) {
  var Gn = importMetaRequire("os"),
    hr = importMetaRequire("process"),
    Xl = Oae(),
    Xn = { isCrtAvailable: !1 },
    Wl = () => {
      if (Xn.isCrtAvailable) return ["md/crt-avail"];
      return null;
    },
    Wn =
      ({ serviceId: serviceId, clientVersion: clientVersion }) =>
      async (r) => {
        let s = [
            ["aws-sdk-js", clientVersion],
            ["ua", "2.1"],
            [`os/${Gn.platform()}`, Gn.release()],
            ["lang/js"],
            ["md/nodejs", `${hr.versions.node}`],
          ],
          o = Wl();
        if (o) s.push(o);
        if (serviceId) s.push([`api/${serviceId}`, clientVersion]);
        if (hr.env.AWS_EXECUTION_ENV) s.push([`exec-env/${hr.env.AWS_EXECUTION_ENV}`]);
        let a = await r?.userAgentAppId?.();
        return a ? [...s, [`app/${a}`]] : [...s];
      },
    Kl = Wn,
    Kn = "AWS_SDK_UA_APP_ID",
    Qn = "sdk_ua_app_id",
    Ql = "sdk-ua-app-id",
    Yl = {
      environmentVariableSelector: (e) => e[Kn],
      configFileSelector: (e) => e[Qn] ?? e[Ql],
      default: Xl.DEFAULT_UA_APP_ID,
    };
  Jl.NODE_APP_ID_CONFIG_OPTIONS = Yl;
  Jl.UA_APP_ID_ENV_NAME = Kn;
  Jl.UA_APP_ID_INI_NAME = Qn;
  Jl.createDefaultUserAgentProvider = Wn;
  Jl.crtAvailability = Xn;
  Jl.defaultUserAgent = Kl;
});

export { Hme };
