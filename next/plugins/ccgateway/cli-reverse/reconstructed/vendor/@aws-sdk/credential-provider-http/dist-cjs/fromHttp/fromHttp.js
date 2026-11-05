/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/fromHttp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-48h98ags.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import fsPromises from "fs/promises";
import { import_property_provider, checkUrl, import_node_http_handler, import_client } from "./checkUrl.js";
import { createGetRequest, getCredentials } from "./requestHelpers.js";

//@ chunk-48h98ags.js:2461-2594 esm-layout
var retryWrapper = (fn, maxAttempts, sleepImpl) => async () => {
  for (let j = 0; j < maxAttempts; ++j)
    try {
      return await fn();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, sleepImpl));
    }
  return await fn();
};
//@ chunk-48h98ags.js:2594-4271 esm-fingerprint
var AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
var DEFAULT_LINK_LOCAL_HOST = "http://169.254.170.2";
var AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
var AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE = "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE";
var AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
var fromHttp = (options = {}) => {
  options.logger?.debug("@aws-sdk/credential-provider-http - fromHttp");
  let host;
  let relative =
    options.awsContainerCredentialsRelativeUri ?? process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI];
  let full = options.awsContainerCredentialsFullUri ?? process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI];
  let token = options.awsContainerAuthorizationToken ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN];
  let tokenFile =
    options.awsContainerAuthorizationTokenFile ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE];
  let warn =
    options.logger?.constructor?.name === "NoOpLogger" || !options.logger?.warn
      ? console.warn
      : options.logger.warn.bind(options.logger);
  if (relative && full) {
    warn(
      "@aws-sdk/credential-provider-http: you have set both awsContainerCredentialsRelativeUri and awsContainerCredentialsFullUri.",
    );
    warn("awsContainerCredentialsFullUri will take precedence.");
  }
  if (token && tokenFile) {
    warn(
      "@aws-sdk/credential-provider-http: you have set both awsContainerAuthorizationToken and awsContainerAuthorizationTokenFile.",
    );
    warn("awsContainerAuthorizationToken will take precedence.");
  }
  if (full) host = full;
  else if (relative) host = `${DEFAULT_LINK_LOCAL_HOST}${relative}`;
  else
    throw new import_property_provider.CredentialsProviderError(
      `No HTTP credential provider host provided.
Set AWS_CONTAINER_CREDENTIALS_FULL_URI or AWS_CONTAINER_CREDENTIALS_RELATIVE_URI.`,
      {
        logger: options.logger,
      },
    );
  let url = new URL(host);
  checkUrl(url, options.logger);
  let requestHandler = import_node_http_handler.NodeHttpHandler.create({
    requestTimeout: options.timeout ?? 1000,
    connectionTimeout: options.timeout ?? 1000,
  });
  return retryWrapper(
    async () => {
      let request = createGetRequest(url);
      if (token) request.headers.Authorization = token;
      else if (tokenFile) request.headers.Authorization = (await fsPromises.readFile(tokenFile)).toString();
      try {
        let result = await requestHandler.handle(request);
        return getCredentials(result.response).then((credentials) =>
          import_client.setCredentialFeature(credentials, "CREDENTIALS_HTTP", "z"),
        );
      } catch (e) {
        throw new import_property_provider.CredentialsProviderError(String(e), {
          logger: options.logger,
        });
      }
    },
    options.maxRetries ?? 3,
    options.timeout ?? 1000,
  );
};
export { fromHttp };
