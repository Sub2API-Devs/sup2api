/**
 * @azure/identity/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (35)
 * attribution: esm-fingerprint 33, esm-layout 2
 */
import { readFile, readFile as readFile_2 } from "fs/promises";
import * as child_processModule from "child_process";
import child_process, { default as child_process_2 } from "child_process";
import { q, z, Ho, he } from "./esm/util/logging.js";
import { DEVELOPER_SIGN_ON_CLIENT_ID, ALL_TENANTS } from "./esm/constants.js";
import { Xt } from "./esm/msal/nodeFlows/msalClient.js";
import { Z } from "./esm/util/tracing.js";
import { Hn, ws, Rs } from "./esm/util/scopeUtils.js";

//@ chunk-mrx6y2r5.js:27655-27745 esm-fingerprint
function Tm(e) {
  return e && typeof e.error === "string" && typeof e.error_description === "string";
}
//@ chunk-mrx6y2r5.js:27745-27781 esm-fingerprint
var CREDENTIALUNAVAILABLEERROR = "CredentialUnavailableError";
//@ chunk-mrx6y2r5.js:27781-27845 esm-layout
class R extends Error {
  constructor(e, t) {
    super(e, t);
    this.name = CREDENTIALUNAVAILABLEERROR;
  }
}
//@ chunk-mrx6y2r5.js:27845-27874 esm-fingerprint
var AUTHENTICATIONERROR = "AuthenticationError";
//@ chunk-mrx6y2r5.js:27874-28577 esm-fingerprint
class $n extends Error {
  constructor(e, t, r) {
    let n = {
      error: "unknown",
      errorDescription: "An unknown error occurred and no additional details are available.",
    };
    if (Tm(t)) n = al(t);
    else if (typeof t === "string")
      try {
        let parsed = JSON.parse(t);
        n = al(parsed);
      } catch (error) {
        if (e === 400)
          n = {
            error: "invalid_request",
            errorDescription: `The service indicated that the request was invalid.

${t}`,
          };
        else
          n = {
            error: "unknown_error",
            errorDescription: `An unknown error has occurred. Response body:

${t}`,
          };
      }
    else
      n = {
        error: "unknown_error",
        errorDescription: "An unknown error occurred and no additional details are available.",
      };
    super(
      `${n.error} Status code: ${e}
More details:
${n.errorDescription},`,
      r,
    );
    ((this.statusCode = e), (this.errorResponse = n), (this.name = AUTHENTICATIONERROR));
  }
}
//@ chunk-mrx6y2r5.js:28577-28615 esm-fingerprint
var AGGREGATEAUTHENTICATIONERROR = "AggregateAuthenticationError";
//@ chunk-mrx6y2r5.js:28615-28720 esm-fingerprint
class Fs extends Error {
  constructor(e, t) {
    let joined = e.join(`
`);
    super(`${t}
${joined}`);
    ((this.errors = e), (this.name = AGGREGATEAUTHENTICATIONERROR));
  }
}
//@ chunk-mrx6y2r5.js:28720-28891 esm-fingerprint
function al(e) {
  return {
    error: e.error,
    errorDescription: e.error_description,
    correlationId: e.correlation_id,
    errorCodes: e.error_codes,
    timestamp: e.timestamp,
    traceId: e.trace_id,
  };
}
//@ chunk-mrx6y2r5.js:28891-29078 esm-fingerprint
class AuthenticationRequiredError extends Error {
  constructor(e) {
    super(e.message, e.cause ? { cause: e.cause } : void 0);
    ((this.scopes = e.scopes),
      (this.getTokenOptions = e.getTokenOptions),
      (this.name = "AuthenticationRequiredError"));
  }
}
//@ chunk-mrx6y2r5.js:29078-29371 esm-fingerprint
function Am(e) {
  return `The current credential is not configured to acquire tokens for tenant ${e}. To enable acquiring tokens for this tenant add it to the AdditionallyAllowedTenants on the credential options, or add "*" to AdditionallyAllowedTenants to allow acquiring tokens for any tenant.`;
}
//@ chunk-mrx6y2r5.js:29371-29698 esm-fingerprint
function Ee(e, t, r = [], n) {
  var o;
  let i;
  if (process.env.AZURE_IDENTITY_DISABLE_MULTITENANTAUTH) i = e;
  else if (e === "adfs") i = e;
  else i = (o = t === null || t === void 0 ? void 0 : t.tenantId) !== null && o !== void 0 ? o : e;
  if (e && i !== e && !r.includes("*") && !r.some((s) => s.localeCompare(i) === 0)) {
    let s = Am(i);
    throw (n === null || n === void 0 || n.info(s), new R(s));
  }
  return i;
}
/**
 * Azure Identity：校验 tenant id 格式（第三方 @azure/identity 代码）。
 */
//@ chunk-mrx6y2r5.js:29698-29959 esm-fingerprint
function checkTenantId(e, t) {
  if (!t.match(/^[0-9a-zA-Z-.]+$/)) {
    let r = Error(
      "Invalid tenant id provided. You can locate your tenant id by following the instructions listed here: https://learn.microsoft.com/partner-center/find-ids-and-domain-names.",
    );
    throw (e.info(q("", r)), r);
  }
}
/**
 * Azure Identity：解析 tenant（显式 tenant 校验后返回；否则按 clientId 返回 common/organizations）。
 */
//@ chunk-mrx6y2r5.js:29959-30058 esm-fingerprint
function resolveTenantId(e, t, r) {
  if (t) return (checkTenantId(e, t), t);
  if (!r) r = DEVELOPER_SIGN_ON_CLIENT_ID;
  if (r !== DEVELOPER_SIGN_ON_CLIENT_ID) return "common";
  return "organizations";
}
//@ chunk-mrx6y2r5.js:30058-30140 esm-layout
function ve(e) {
  if (!e || e.length === 0) return [];
  if (e.includes("*")) return ALL_TENANTS;
  return e;
}
//@ chunk-mrx6y2r5.js:302180-302218 esm-fingerprint
var Qf = z("ClientAssertionCredential");
//@ chunk-mrx6y2r5.js:302218-303019 esm-fingerprint
class wc {
  constructor(e, t, r, n = {}) {
    if (!e) throw new R("ClientAssertionCredential: tenantId is a required parameter.");
    if (!t) throw new R("ClientAssertionCredential: clientId is a required parameter.");
    if (!r) throw new R("ClientAssertionCredential: clientAssertion is a required parameter.");
    ((this.tenantId = e),
      (this.additionallyAllowedTenantIds = ve(
        n === null || n === void 0 ? void 0 : n.additionallyAllowedTenants,
      )),
      (this.options = n),
      (this.getAssertion = r),
      (this.msalClient = Xt(
        t,
        e,
        Object.assign(Object.assign({}, n), { logger: Qf, tokenCredentialOptions: this.options }),
      )));
  }
  async getToken(e, t = {}) {
    return Z.withSpan(`${this.constructor.name}.getToken`, t, async (r) => {
      r.tenantId = Ee(this.tenantId, r, this.additionallyAllowedTenantIds, Qf);
      let n = Array.isArray(e) ? e : [e];
      return this.msalClient.getTokenByClientAssertion(n, this.getAssertion, r);
    });
  }
}
//@ chunk-mrx6y2r5.js:303059-303174 esm-fingerprint
var WORKLOADIDENTITYCREDENTIAL = "WorkloadIdentityCredential",
  aC = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_FEDERATED_TOKEN_FILE"],
  Po = z(WORKLOADIDENTITYCREDENTIAL);
//@ chunk-mrx6y2r5.js:303174-305977 esm-fingerprint
class Fr {
  constructor(e) {
    ((this.azureFederatedTokenFileContent = void 0), (this.cacheDate = void 0));
    let joined = Ho(aC).assigned.join(", ");
    Po.info(`Found the following environment variables: ${joined}`);
    let r = e !== null && e !== void 0 ? e : {},
      n = r.tenantId || process.env.AZURE_TENANT_ID,
      o = r.clientId || process.env.AZURE_CLIENT_ID;
    if (((this.federatedTokenFilePath = r.tokenFilePath || process.env.AZURE_FEDERATED_TOKEN_FILE), n))
      checkTenantId(Po, n);
    if (!o)
      throw new R(`${WORKLOADIDENTITYCREDENTIAL}: is unavailable. clientId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_CLIENT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
    if (!n)
      throw new R(`${WORKLOADIDENTITYCREDENTIAL}: is unavailable. tenantId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_TENANT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
    if (!this.federatedTokenFilePath)
      throw new R(`${WORKLOADIDENTITYCREDENTIAL}: is unavailable. federatedTokenFilePath is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_FEDERATED_TOKEN_FILE".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
    (Po.info(
      `Invoking ClientAssertionCredential with tenant ID: ${n}, clientId: ${r.clientId} and federated token path: [REDACTED]`,
    ),
      (this.client = new wc(n, o, this.readFileContents.bind(this), e)));
  }
  async getToken(e, t) {
    if (!this.client) {
      let r = `${WORKLOADIDENTITYCREDENTIAL}: is unavailable. tenantId, clientId, and federatedTokenFilePath are required parameters. 
      In DefaultAzureCredential and ManagedIdentityCredential, these can be provided as environment variables - 
      "AZURE_TENANT_ID",
      "AZURE_CLIENT_ID",
      "AZURE_FEDERATED_TOKEN_FILE". See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`;
      throw (Po.info(r), new R(r));
    }
    return (Po.info("Invoking getToken() of Client Assertion Credential"), this.client.getToken(e, t));
  }
  async readFileContents() {
    if (this.cacheDate !== void 0 && Date.now() - this.cacheDate >= 300000)
      this.azureFederatedTokenFileContent = void 0;
    if (!this.federatedTokenFilePath)
      throw new R(
        `${WORKLOADIDENTITYCREDENTIAL}: is unavailable. Invalid file path provided ${this.federatedTokenFilePath}.`,
      );
    if (!this.azureFederatedTokenFileContent) {
      let trimmed = (await readFile(this.federatedTokenFilePath, "utf8")).trim();
      if (!trimmed)
        throw new R(
          `${WORKLOADIDENTITYCREDENTIAL}: is unavailable. No content on the file ${this.federatedTokenFilePath}.`,
        );
      else ((this.azureFederatedTokenFileContent = trimmed), (this.cacheDate = Date.now()));
    }
    return this.azureFederatedTokenFileContent;
  }
}
//@ chunk-mrx6y2r5.js:305977-306645 esm-fingerprint
var Jf = "ManagedIdentityCredential - Token Exchange",
  cC = z(Jf),
  vc = {
    name: "tokenExchangeMsi",
    async isAvailable(e) {
      let env = process.env,
        r = Boolean(
          (e || env.AZURE_CLIENT_ID) && env.AZURE_TENANT_ID && process.env.AZURE_FEDERATED_TOKEN_FILE,
        );
      if (!r)
        cC.info(
          `${Jf}: Unavailable. The environment variables needed are: AZURE_CLIENT_ID (or the client ID sent through the parameters), AZURE_TENANT_ID and AZURE_FEDERATED_TOKEN_FILE`,
        );
      return r;
    },
    async getToken(e, t = {}) {
      let { scopes: scopes, clientId: clientId } = e,
        o = {};
      return new Fr(
        Object.assign(
          Object.assign(
            {
              clientId: clientId,
              tenantId: process.env.AZURE_TENANT_ID,
              tokenFilePath: process.env.AZURE_FEDERATED_TOKEN_FILE,
            },
            o,
          ),
          { disableInstanceDiscovery: !0 },
        ),
      ).getToken(scopes, t);
    },
  };
//@ chunk-mrx6y2r5.js:314766-315144 esm-fingerprint
var Zt = z("AzureDeveloperCliCredential"),
  Zf = {
    getSafeWorkingDir() {
      return "/bin";
    },
    async getAzdAccessToken(e, t, r) {
      let n = [];
      if (t) n = ["--tenant-id", t];
      return new Promise((o, i) => {
        try {
          child_process_2.execFile(
            "azd",
            ["auth", "token", "--output", "json", ...e.reduce((s, a) => s.concat("--scope", a), []), ...n],
            { cwd: Zf.getSafeWorkingDir(), timeout: r },
            (s, a, c) => {
              o({ stdout: a, stderr: c, error: s });
            },
          );
        } catch (error) {
          i(error);
        }
      });
    },
  };
//@ chunk-mrx6y2r5.js:315144-317050 esm-fingerprint
class Pc {
  constructor(e) {
    if (e === null || e === void 0 ? void 0 : e.tenantId)
      (checkTenantId(Zt, e === null || e === void 0 ? void 0 : e.tenantId),
        (this.tenantId = e === null || e === void 0 ? void 0 : e.tenantId));
    ((this.additionallyAllowedTenantIds = ve(
      e === null || e === void 0 ? void 0 : e.additionallyAllowedTenants,
    )),
      (this.timeout = e === null || e === void 0 ? void 0 : e.processTimeoutInMs));
  }
  async getToken(e, t = {}) {
    let r = Ee(this.tenantId, t, this.additionallyAllowedTenantIds);
    if (r) checkTenantId(Zt, r);
    let n;
    if (typeof e === "string") n = [e];
    else n = e;
    return (
      Zt.getToken.info(`Using the scopes ${e}`),
      Z.withSpan(`${this.constructor.name}.getToken`, t, async () => {
        var o, i, s, a;
        try {
          n.forEach((u) => {
            Hn(u, Zt);
          });
          let azdAccessToken = await Zf.getAzdAccessToken(n, r, this.timeout),
            l =
              ((o = azdAccessToken.stderr) === null || o === void 0
                ? void 0
                : o.match("not logged in, run `azd login` to login")) ||
              ((i = azdAccessToken.stderr) === null || i === void 0
                ? void 0
                : i.match("not logged in, run `azd auth login` to login"));
          if (
            ((s = azdAccessToken.stderr) === null || s === void 0 ? void 0 : s.match("azd:(.*)not found")) ||
            ((a = azdAccessToken.stderr) === null || a === void 0
              ? void 0
              : a.startsWith("'azd' is not recognized")) ||
            (azdAccessToken.error && azdAccessToken.error.code === "ENOENT")
          ) {
            let u = new R(
              "Azure Developer CLI couldn't be found. To mitigate this issue, see the troubleshooting guidelines at https://aka.ms/azsdk/js/identity/azdevclicredential/troubleshoot.",
            );
            throw (Zt.getToken.info(q(e, u)), u);
          }
          if (l) {
            let u = new R(
              "Please run 'azd auth login' from a command prompt to authenticate before using this credential. For more information, see the troubleshooting guidelines at https://aka.ms/azsdk/js/identity/azdevclicredential/troubleshoot.",
            );
            throw (Zt.getToken.info(q(e, u)), u);
          }
          try {
            let parsed = JSON.parse(azdAccessToken.stdout);
            return (
              Zt.getToken.info(he(e)),
              {
                token: parsed.token,
                expiresOnTimestamp: new Date(parsed.expiresOn).getTime(),
                tokenType: "Bearer",
              }
            );
          } catch (error) {
            if (azdAccessToken.stderr) throw new R(azdAccessToken.stderr);
            throw error;
          }
        } catch (error) {
          let l =
            error.name === "CredentialUnavailableError"
              ? error
              : new R(error.message || "Unknown error while trying to retrieve the access token");
          throw (Zt.getToken.info(q(e, l)), l);
        }
      })
    );
  }
}
//@ chunk-mrx6y2r5.js:317083-317288 esm-fingerprint
var tm = {
  execFile(e, t, r) {
    return new Promise((n, o) => {
      child_processModule.execFile(e, t, r, (i, s, a) => {
        if (Buffer.isBuffer(s)) s = s.toString("utf8");
        if (Buffer.isBuffer(a)) a = a.toString("utf8");
        if (a || i) o(a ? Error(a) : i);
        else n(s);
      });
    });
  },
};
//@ chunk-mrx6y2r5.js:317288-317332 esm-fingerprint
var kt = z("AzurePowerShellCredential"),
  nm = !1;
//@ chunk-mrx6y2r5.js:317332-317384 esm-fingerprint
function om(e) {
  if (nm) return `${e}.exe`;
  else return e;
}
//@ chunk-mrx6y2r5.js:317384-317518 esm-fingerprint
async function rm(e, t) {
  let r = [];
  for (let n of e) {
    let [o, ...i] = n,
      execFile = await tm.execFile(o, i, { encoding: "utf8", timeout: t });
    r.push(execFile);
  }
  return r;
}
//@ chunk-mrx6y2r5.js:317518-318208 esm-fingerprint
var im = {
    login: "Run Connect-AzAccount to login",
    installed:
      "The specified module 'Az.Accounts' with version '2.2.0' was not loaded because no valid module file was found in any module directory",
  },
  Oc = {
    login: "Please run 'Connect-AzAccount' from PowerShell to authenticate before using this credential.",
    installed: `The 'Az.Account' module >= 2.2.0 is not installed. Install the Azure Az PowerShell module with: "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force".`,
    troubleshoot:
      "To troubleshoot, visit https://aka.ms/azsdk/js/identity/powershellcredential/troubleshoot.",
  },
  hC = (e) => e.message.match(`(.*)${im.login}(.*)`),
  fC = (e) => e.message.match(im.installed),
  Nc = [om("pwsh")];
//@ chunk-mrx6y2r5.js:318208-318240 esm-fingerprint
if (nm) Nc.push(om("powershell"));
//@ chunk-mrx6y2r5.js:318240-320501 esm-fingerprint
class xc {
  constructor(e) {
    if (e === null || e === void 0 ? void 0 : e.tenantId)
      (checkTenantId(kt, e === null || e === void 0 ? void 0 : e.tenantId),
        (this.tenantId = e === null || e === void 0 ? void 0 : e.tenantId));
    ((this.additionallyAllowedTenantIds = ve(
      e === null || e === void 0 ? void 0 : e.additionallyAllowedTenants,
    )),
      (this.timeout = e === null || e === void 0 ? void 0 : e.processTimeoutInMs));
  }
  async getAzurePowerShellAccessToken(e, t, r) {
    for (let n of [...Nc]) {
      try {
        await rm([[n, "/?"]], r);
      } catch (error) {
        Nc.shift();
        continue;
      }
      let i = (
        await rm([
          [
            n,
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `
          $tenantId = "${t !== null && t !== void 0 ? t : ""}"
          $m = Import-Module Az.Accounts -MinimumVersion 2.2.0 -PassThru
          $useSecureString = $m.Version -ge [version]'2.17.0'

          $params = @{
            ResourceUrl = "${e}"
          }

          if ($tenantId.Length -gt 0) {
            $params["TenantId"] = $tenantId
          }

          if ($useSecureString) {
            $params["AsSecureString"] = $true
          }

          $token = Get-AzAccessToken @params

          $result = New-Object -TypeName PSObject
          $result | Add-Member -MemberType NoteProperty -Name ExpiresOn -Value $token.ExpiresOn
          if ($useSecureString) {
            $result | Add-Member -MemberType NoteProperty -Name Token -Value (ConvertFrom-SecureString -AsPlainText $token.Token)
          } else {
            $result | Add-Member -MemberType NoteProperty -Name Token -Value $token.Token
          }

          Write-Output (ConvertTo-Json $result)
          `,
          ],
        ])
      )[0];
      return mC(i);
    }
    throw Error("Unable to execute PowerShell. Ensure that it is installed in your system");
  }
  async getToken(e, t = {}) {
    return Z.withSpan(`${this.constructor.name}.getToken`, t, async () => {
      let r = Ee(this.tenantId, t, this.additionallyAllowedTenantIds),
        n = typeof e === "string" ? e : e[0];
      if (r) checkTenantId(kt, r);
      try {
        (Hn(n, kt), kt.getToken.info(`Using the scope ${n}`));
        let o = ws(n),
          azurePowerShellAccessToken = await this.getAzurePowerShellAccessToken(o, r, this.timeout);
        return (
          kt.getToken.info(he(e)),
          {
            token: azurePowerShellAccessToken.Token,
            expiresOnTimestamp: new Date(azurePowerShellAccessToken.ExpiresOn).getTime(),
            tokenType: "Bearer",
          }
        );
      } catch (error) {
        if (fC(error)) {
          let s = new R(Oc.installed);
          throw (kt.getToken.info(q(n, s)), s);
        } else if (hC(error)) {
          let s = new R(Oc.login);
          throw (kt.getToken.info(q(n, s)), s);
        }
        let i = new R(`${error}. ${Oc.troubleshoot}`);
        throw (kt.getToken.info(q(n, i)), i);
      }
    });
  }
}
//@ chunk-mrx6y2r5.js:320501-320882 esm-fingerprint
async function mC(e) {
  let t = /{[^{}]*}/g,
    match = e.match(t),
    n = e;
  if (match)
    try {
      for (let o of match)
        try {
          let parsed = JSON.parse(o);
          if (parsed === null || parsed === void 0 ? void 0 : parsed.Token) {
            if (((n = n.replace(o, "")), n)) kt.getToken.warning(n);
            return parsed;
          }
        } catch (error) {
          continue;
        }
    } catch (error) {
      throw Error(`Unable to parse the output of PowerShell. Received output: ${e}`);
    }
  throw Error(`No access token found in the output. Received output: ${e}`);
}
//@ chunk-mrx6y2r5.js:320882-320917 esm-fingerprint
var Mc = z("ChainedTokenCredential");
//@ chunk-mrx6y2r5.js:320917-321699 esm-fingerprint
class Dc {
  constructor(...e) {
    ((this._sources = []), (this._sources = e));
  }
  async getToken(e, t = {}) {
    let { token: token } = await this.getTokenInternal(e, t);
    return token;
  }
  async getTokenInternal(e, t = {}) {
    let r = null,
      n,
      o = [];
    return Z.withSpan("ChainedTokenCredential.getToken", t, async (i) => {
      for (let s = 0; s < this._sources.length && r === null; s++)
        try {
          ((r = await this._sources[s].getToken(e, i)), (n = this._sources[s]));
        } catch (error) {
          if (error.name === "CredentialUnavailableError" || error.name === "AuthenticationRequiredError")
            o.push(error);
          else throw (Mc.getToken.info(q(e, error)), error);
        }
      if (!r && o.length > 0) {
        let s = new Fs(o, "ChainedTokenCredential authentication failed.");
        throw (Mc.getToken.info(q(e, s)), s);
      }
      if ((Mc.getToken.info(`Result for ${n.constructor.name}: ${he(e)}`), r === null))
        throw new R("Failed to retrieve a valid token");
      return { token: r, successfulCredential: n };
    });
  }
}
//@ chunk-mrx6y2r5.js:324245-324280 esm-fingerprint
var cm = z("ClientSecretCredential");
//@ chunk-mrx6y2r5.js:324280-325326 esm-fingerprint
class Lc {
  constructor(e, t, r, n = {}) {
    if (!e)
      throw new R(
        "ClientSecretCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.",
      );
    if (!t)
      throw new R(
        "ClientSecretCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.",
      );
    if (!r)
      throw new R(
        "ClientSecretCredential: clientSecret is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.",
      );
    ((this.clientSecret = r),
      (this.tenantId = e),
      (this.additionallyAllowedTenantIds = ve(
        n === null || n === void 0 ? void 0 : n.additionallyAllowedTenants,
      )),
      (this.msalClient = Xt(
        t,
        e,
        Object.assign(Object.assign({}, n), { logger: cm, tokenCredentialOptions: n }),
      )));
  }
  async getToken(e, t = {}) {
    return Z.withSpan(`${this.constructor.name}.getToken`, t, async (r) => {
      r.tenantId = Ee(this.tenantId, r, this.additionallyAllowedTenantIds, cm);
      let n = Rs(e);
      return this.msalClient.getTokenByClientSecret(n, this.clientSecret, r);
    });
  }
}
//@ chunk-mrx6y2r5.js:325326-325365 esm-fingerprint
var TC = z("UsernamePasswordCredential");
//@ chunk-mrx6y2r5.js:325365-326641 esm-fingerprint
class Hc {
  constructor(e, t, r, n, o = {}) {
    if (!e)
      throw new R(
        "UsernamePasswordCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    if (!t)
      throw new R(
        "UsernamePasswordCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    if (!r)
      throw new R(
        "UsernamePasswordCredential: username is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    if (!n)
      throw new R(
        "UsernamePasswordCredential: password is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.",
      );
    ((this.tenantId = e),
      (this.additionallyAllowedTenantIds = ve(
        o === null || o === void 0 ? void 0 : o.additionallyAllowedTenants,
      )),
      (this.username = r),
      (this.password = n),
      (this.msalClient = Xt(
        t,
        this.tenantId,
        Object.assign(Object.assign({}, o), { tokenCredentialOptions: o !== null && o !== void 0 ? o : {} }),
      )));
  }
  async getToken(e, t = {}) {
    return Z.withSpan(`${this.constructor.name}.getToken`, t, async (r) => {
      r.tenantId = Ee(this.tenantId, r, this.additionallyAllowedTenantIds, TC);
      let n = Rs(e);
      return this.msalClient.getTokenByUsernamePassword(n, this.username, this.password, r);
    });
  }
}

export {
  $n,
  AUTHENTICATIONERROR,
  AuthenticationRequiredError,
  R,
  resolveTenantId,
  vc,
  checkTenantId,
  ve,
  Ee,
  Lc,
  Hc,
  Fr,
  Pc,
  xc,
  Dc,
};
