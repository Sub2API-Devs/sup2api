/**
 * @aws-sdk/credential-provider-process/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-process@3.936.0..3.972.46
 * pieces: chunk-skhq176t.js (5)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { promisify } from "util";
import { exec } from "child_process";
import { Re } from "../../../../runtime/bun-runtime.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { SD } from "../../core/dist-cjs/submodules/client/index.js";

//@ chunk-skhq176t.js:335-350 esm-layout
var i = Re(hU());
//@ chunk-skhq176t.js:350-376 esm-layout
var c = Re($h()),
  f = Re(hU());
//@ chunk-skhq176t.js:446-1211 esm-layout
var p = Re(SD()),
  a = (r, e, o) => {
    if (e.Version !== 1) throw Error(`Profile ${r} credential_process did not return Version 1.`);
    if (e.AccessKeyId === void 0 || e.SecretAccessKey === void 0)
      throw Error(`Profile ${r} credential_process returned invalid credentials.`);
    if (e.Expiration) {
      let date = new Date();
      if (new Date(e.Expiration) < date)
        throw Error(`Profile ${r} credential_process returned expired credentials.`);
    }
    let AccountId = e.AccountId;
    if (!AccountId && o?.[r]?.aws_account_id) AccountId = o[r].aws_account_id;
    let t = {
      accessKeyId: e.AccessKeyId,
      secretAccessKey: e.SecretAccessKey,
      ...(e.SessionToken && { sessionToken: e.SessionToken }),
      ...(e.Expiration && { expiration: new Date(e.Expiration) }),
      ...(e.CredentialScope && { credentialScope: e.CredentialScope }),
      ...(AccountId && { accountId: AccountId }),
    };
    return (p.setCredentialFeature(t, "CREDENTIALS_PROCESS", "w"), t);
  };
//@ chunk-skhq176t.js:1211-1798 esm-fingerprint
var u = async (r, e, o) => {
  let s = e[r];
  if (e[r]) {
    let credential_process = s.credential_process;
    if (credential_process !== void 0) {
      let d = promisify(f.externalDataInterceptor?.getTokenRecord?.().exec ?? exec);
      try {
        let { stdout: stdout } = await d(credential_process),
          l;
        try {
          l = JSON.parse(stdout.trim());
        } catch {
          throw Error(`Profile ${r} credential_process returned invalid JSON.`);
        }
        return a(r, l, e);
      } catch (error) {
        throw new c.CredentialsProviderError(error.message, { logger: o });
      }
    } else
      throw new c.CredentialsProviderError(`Profile ${r} did not contain credential_process.`, { logger: o });
  } else
    throw new c.CredentialsProviderError(`Profile ${r} could not be found in shared credentials file.`, {
      logger: o,
    });
};
//@ chunk-skhq176t.js:1798-2022 esm-fingerprint
var h =
  (r = {}) =>
  async ({ callerClientConfig: e } = {}) => {
    r.logger?.debug("@aws-sdk/credential-provider-process - fromProcess");
    let knownFiles = await i.parseKnownFiles(r);
    return u(i.getProfileName({ profile: r.profile ?? e?.profile }), knownFiles, r.logger);
  };
