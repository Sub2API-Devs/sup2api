/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/fromHttp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-0c72454j.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import fsPromises from "fs/promises";
import { m, h, N, E } from "./checkUrl.js";
import { _, I } from "./requestHelpers.js";

//@ chunk-0c72454j.js:2461-2594 esm-layout
var f = (e, o, n) => async () => {
  for (let r = 0; r < o; ++r)
    try {
      return await e();
    } catch (error) {
      await new Promise((s) => setTimeout(s, n));
    }
  return await e();
};
//@ chunk-0c72454j.js:2594-4271 esm-fingerprint
var AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
  HTTP_169_254_170_2 = "http://169.254.170.2",
  AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI",
  AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE = "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE",
  AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN",
  H = (e = {}) => {
    e.logger?.debug("@aws-sdk/credential-provider-http - fromHttp");
    let o,
      n = e.awsContainerCredentialsRelativeUri ?? process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI],
      r = e.awsContainerCredentialsFullUri ?? process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI],
      t = e.awsContainerAuthorizationToken ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN],
      s = e.awsContainerAuthorizationTokenFile ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE],
      a =
        e.logger?.constructor?.name === "NoOpLogger" || !e.logger?.warn
          ? console.warn
          : e.logger.warn.bind(e.logger);
    if (n && r)
      (a(
        "@aws-sdk/credential-provider-http: you have set both awsContainerCredentialsRelativeUri and awsContainerCredentialsFullUri.",
      ),
        a("awsContainerCredentialsFullUri will take precedence."));
    if (t && s)
      (a(
        "@aws-sdk/credential-provider-http: you have set both awsContainerAuthorizationToken and awsContainerAuthorizationTokenFile.",
      ),
        a("awsContainerAuthorizationToken will take precedence."));
    if (r) o = r;
    else if (n) o = `${HTTP_169_254_170_2}${n}`;
    else
      throw new m.CredentialsProviderError(
        `No HTTP credential provider host provided.
Set AWS_CONTAINER_CREDENTIALS_FULL_URI or AWS_CONTAINER_CREDENTIALS_RELATIVE_URI.`,
        { logger: e.logger },
      );
    let T = new URL(o);
    h(T, e.logger);
    let create = N.NodeHttpHandler.create({
      requestTimeout: e.timeout ?? 1000,
      connectionTimeout: e.timeout ?? 1000,
    });
    return f(
      async () => {
        let c = _(T);
        if (t) c.headers.Authorization = t;
        else if (s) c.headers.Authorization = (await fsPromises.readFile(s)).toString();
        try {
          let handle = await create.handle(c);
          return I(handle.response).then((R) => E.setCredentialFeature(R, "CREDENTIALS_HTTP", "z"));
        } catch (error) {
          throw new m.CredentialsProviderError(String(error), { logger: e.logger });
        }
      },
      e.maxRetries ?? 3,
      e.timeout ?? 1000,
    );
  };
