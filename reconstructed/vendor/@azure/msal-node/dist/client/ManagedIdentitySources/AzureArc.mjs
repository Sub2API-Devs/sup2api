/**
 * @azure/msal-node/dist/client/ManagedIdentitySources/AzureArc.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { accessSync, constants, statSync, readFileSync } from "fs";
import path from "path";
import {
  Me,
  w,
  k,
  ne,
  ae,
  UNABLE_TO_CREATE_AZURE_ARC,
  He,
  J,
  Ne,
  ce,
  WWW_AUTHENTICATE_HEADER_MISSING,
  os,
  PLATFORM_NOT_SUPPORTED,
  INVALID_FILE_EXTENSION,
  INVALID_FILE_PATH,
  UNABLE_TO_READ_SECRET_FILE,
  Ah,
  INVALID_SECRET,
} from "../../../lib/msal-node.cjs";
import { b, me, AuthError, g, NETWORK_ERROR } from "../../../../msal-common/lib/index-node-DhUjlPuB.js";

//@ chunk-mrx6y2r5.js:273815-274154 esm-fingerprint
var FE = "2019-11-01",
  Bf = "http://127.0.0.1:40342/metadata/identity/oauth2/token",
  zf = "N/A: himds executable exists",
  Gf = {
    win32: `${process.env.ProgramData}\\AzureConnectedMachineAgent\\Tokens\\`,
    linux: "/var/opt/azcmagent/tokens/",
  },
  $E = {
    win32: `${process.env.ProgramFiles}\\AzureConnectedMachineAgent\\himds.exe`,
    linux: "/opt/azcmagent/bin/himds",
  };
//@ chunk-mrx6y2r5.js:274154-276388 esm-fingerprint
class Jt extends Me {
  constructor(e, t, r, n, o, i) {
    super(e, t, r, n, o);
    this.identityEndpoint = i;
  }
  static getEnvironmentVariables() {
    let e = process.env[w.IDENTITY_ENDPOINT],
      t = process.env[w.IMDS_ENDPOINT];
    if (!e || !t) {
      let linux = $E.linux;
      try {
        (accessSync(linux, constants.F_OK | constants.R_OK), (e = Bf), (t = zf));
      } catch (error) {}
    }
    return [e, t];
  }
  static tryCreate(e, t, r, n, o, i) {
    let [s, a] = Jt.getEnvironmentVariables();
    if (!s || !a)
      return (
        e.info(
          `[Managed Identity] ${k.AZURE_ARC} managed identity is unavailable through environment variables because one or both of '${w.IDENTITY_ENDPOINT}' and '${w.IMDS_ENDPOINT}' are not defined. ${k.AZURE_ARC} managed identity is also unavailable through file detection.`,
        ),
        null
      );
    if (a === zf)
      e.info(
        `[Managed Identity] ${k.AZURE_ARC} managed identity is available through file detection. Defaulting to known ${k.AZURE_ARC} endpoint: ${Bf}. Creating ${k.AZURE_ARC} managed identity.`,
      );
    else {
      let validatedEnvVariableUrlString = Jt.getValidatedEnvVariableUrlString(
        w.IDENTITY_ENDPOINT,
        s,
        k.AZURE_ARC,
        e,
      );
      (validatedEnvVariableUrlString.endsWith("/") && validatedEnvVariableUrlString.slice(0, -1),
        Jt.getValidatedEnvVariableUrlString(w.IMDS_ENDPOINT, a, k.AZURE_ARC, e),
        e.info(
          `[Managed Identity] Environment variables validation passed for ${k.AZURE_ARC} managed identity. Endpoint URI: ${validatedEnvVariableUrlString}. Creating ${k.AZURE_ARC} managed identity.`,
        ));
    }
    if (i.idType !== ne.SYSTEM_ASSIGNED) throw ae(UNABLE_TO_CREATE_AZURE_ARC);
    return new Jt(e, t, r, n, o, s);
  }
  createRequest(e) {
    let t = new He(J.GET, this.identityEndpoint.replace("localhost", "127.0.0.1"));
    return (
      (t.headers[Ne.METADATA_HEADER_NAME] = "true"),
      (t.queryParameters[ce.API_VERSION] = FE),
      (t.queryParameters[ce.RESOURCE] = e),
      t
    );
  }
  async getServerTokenResponseAsync(e, t, r, n) {
    let o;
    if (e.status === b.UNAUTHORIZED) {
      let i = e.headers["www-authenticate"];
      if (!i) throw ae(WWW_AUTHENTICATE_HEADER_MISSING);
      if (!i.includes("Basic realm=")) throw ae(os);
      let s = i.split("Basic realm=")[1];
      if (!Gf.hasOwnProperty("linux")) throw ae(PLATFORM_NOT_SUPPORTED);
      let linux = Gf.linux,
        base = path.basename(s);
      if (!base.endsWith(".key")) throw ae(INVALID_FILE_EXTENSION);
      if (linux + base !== s) throw ae(INVALID_FILE_PATH);
      let l;
      try {
        l = await statSync(s).size;
      } catch (error) {
        throw ae(UNABLE_TO_READ_SECRET_FILE);
      }
      if (l > Ah) throw ae(INVALID_SECRET);
      let d;
      try {
        d = readFileSync(s, me.UTF8);
      } catch (error) {
        throw ae(UNABLE_TO_READ_SECRET_FILE);
      }
      let u = `Basic ${d}`;
      (this.logger.info("[Managed Identity] Adding authorization header to the request."),
        (r.headers[Ne.AUTHORIZATION_HEADER_NAME] = u));
      try {
        o = await t.sendGetRequestAsync(r.computeUri(), n);
      } catch (error) {
        if (error instanceof AuthError) throw error;
        else throw g(NETWORK_ERROR);
      }
    }
    return this.getServerTokenResponse(o || e);
  }
}

export { Jt };
