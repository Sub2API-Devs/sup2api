/**
 * @azure/identity/dist/esm/credentials/azureCliCredential.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import child_process, { default as child_process_2 } from "child_process";
import { z, q, he } from "../util/logging.js";
import { checkTenantId, ve, Ee, R } from "../../index.js";
import { kc } from "../util/subscriptionUtils.js";
import { Z } from "../util/tracing.js";
import { Hn, ws } from "../util/scopeUtils.js";

//@ chunk-mrx6y2r5.js:312006-312416 esm-fingerprint
var Ze = z("AzureCliCredential"),
  Xf = {
    getSafeWorkingDir() {
      return "/bin";
    },
    async getAzureCliAccessToken(e, t, r, n) {
      let o = [],
        i = [];
      if (t) o = ["--tenant", t];
      if (r) i = ["--subscription", `"${r}"`];
      return new Promise((s, a) => {
        try {
          child_process.execFile(
            "az",
            ["account", "get-access-token", "--output", "json", "--resource", e, ...o, ...i],
            { cwd: Xf.getSafeWorkingDir(), shell: !0, timeout: n },
            (c, l, d) => {
              s({ stdout: l, stderr: d, error: c });
            },
          );
        } catch (error) {
          a(error);
        }
      });
    },
  };
//@ chunk-mrx6y2r5.js:312416-314736 esm-fingerprint
class bc {
  constructor(e) {
    if (e === null || e === void 0 ? void 0 : e.tenantId)
      (checkTenantId(Ze, e === null || e === void 0 ? void 0 : e.tenantId),
        (this.tenantId = e === null || e === void 0 ? void 0 : e.tenantId));
    if (e === null || e === void 0 ? void 0 : e.subscription)
      (kc(Ze, e === null || e === void 0 ? void 0 : e.subscription),
        (this.subscription = e === null || e === void 0 ? void 0 : e.subscription));
    ((this.additionallyAllowedTenantIds = ve(
      e === null || e === void 0 ? void 0 : e.additionallyAllowedTenants,
    )),
      (this.timeout = e === null || e === void 0 ? void 0 : e.processTimeoutInMs));
  }
  async getToken(e, t = {}) {
    let r = Ee(this.tenantId, t, this.additionallyAllowedTenantIds);
    if (r) checkTenantId(Ze, r);
    if (this.subscription) kc(Ze, this.subscription);
    let n = typeof e === "string" ? e : e[0];
    return (
      Ze.getToken.info(`Using the scope ${n}`),
      Z.withSpan(`${this.constructor.name}.getToken`, t, async () => {
        var o, i, s, a;
        try {
          Hn(n, Ze);
          let c = ws(n),
            azureCliAccessToken = await Xf.getAzureCliAccessToken(c, r, this.subscription, this.timeout),
            d =
              (o = azureCliAccessToken.stderr) === null || o === void 0
                ? void 0
                : o.match("(.*)az login --scope(.*)"),
            u =
              ((i = azureCliAccessToken.stderr) === null || i === void 0
                ? void 0
                : i.match("(.*)az login(.*)")) && !d;
          if (
            ((s = azureCliAccessToken.stderr) === null || s === void 0
              ? void 0
              : s.match("az:(.*)not found")) ||
            ((a = azureCliAccessToken.stderr) === null || a === void 0
              ? void 0
              : a.startsWith("'az' is not recognized"))
          ) {
            let p = new R(
              "Azure CLI could not be found. Please visit https://aka.ms/azure-cli for installation instructions and then, once installed, authenticate to your Azure account using 'az login'.",
            );
            throw (Ze.getToken.info(q(e, p)), p);
          }
          if (u) {
            let p = new R(
              "Please run 'az login' from a command prompt to authenticate before using this credential.",
            );
            throw (Ze.getToken.info(q(e, p)), p);
          }
          try {
            let stdout = azureCliAccessToken.stdout,
              rawResponse = this.parseRawResponse(stdout);
            return (Ze.getToken.info(he(e)), rawResponse);
          } catch (error) {
            if (azureCliAccessToken.stderr) throw new R(azureCliAccessToken.stderr);
            throw error;
          }
        } catch (error) {
          let l =
            error.name === "CredentialUnavailableError"
              ? error
              : new R(error.message || "Unknown error while trying to retrieve the access token");
          throw (Ze.getToken.info(q(e, l)), l);
        }
      })
    );
  }
  parseRawResponse(e) {
    let parsed = JSON.parse(e),
      accessToken = parsed.accessToken,
      n = Number.parseInt(parsed.expires_on, 10) * 1000;
    if (!isNaN(n))
      return (
        Ze.getToken.info("expires_on is available and is valid, using it"),
        { token: accessToken, expiresOnTimestamp: n, tokenType: "Bearer" }
      );
    if (((n = new Date(parsed.expiresOn).getTime()), isNaN(n)))
      throw new R(
        `Unexpected response from Azure CLI when getting token. Expected "expiresOn" to be a RFC3339 date string. Got: "${parsed.expiresOn}"`,
      );
    return { token: accessToken, expiresOnTimestamp: n, tokenType: "Bearer" };
  }
}

export { bc };
