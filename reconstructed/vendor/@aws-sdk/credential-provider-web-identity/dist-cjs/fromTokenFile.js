/**
 * @aws-sdk/credential-provider-web-identity/dist-cjs/fromTokenFile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-web-identity@3.936.0
 * pieces: chunk-2pe5kgjj.js (1)
 * attribution: esm-fingerprint 1
 */
import { readFileSync } from "fs";
import { a, l, m, d } from "./fromWebToken.js";

//@ chunk-2pe5kgjj.js:1050-1694 esm-fingerprint
var AWS_WEB_IDENTITY_TOKEN_FILE = "AWS_WEB_IDENTITY_TOKEN_FILE",
  AWS_ROLE_ARN = "AWS_ROLE_ARN",
  AWS_ROLE_SESSION_NAME = "AWS_ROLE_SESSION_NAME",
  A =
    (e = {}) =>
    async (t) => {
      e.logger?.debug("@aws-sdk/credential-provider-web-identity - fromTokenFile");
      let o = e?.webIdentityTokenFile ?? process.env[AWS_WEB_IDENTITY_TOKEN_FILE],
        r = e?.roleArn ?? process.env[AWS_ROLE_ARN],
        s = e?.roleSessionName ?? process.env[AWS_ROLE_SESSION_NAME];
      if (!o || !r)
        throw new a.CredentialsProviderError("Web identity configuration not specified", {
          logger: e.logger,
        });
      let n = await l({
        ...e,
        webIdentityToken:
          m.externalDataInterceptor?.getTokenRecord?.()[o] ?? readFileSync(o, { encoding: "ascii" }),
        roleArn: r,
        roleSessionName: s,
      })(t);
      if (o === process.env[AWS_WEB_IDENTITY_TOKEN_FILE])
        d.setCredentialFeature(n, "CREDENTIALS_ENV_VARS_STS_WEB_ID_TOKEN", "h");
      return n;
    };
