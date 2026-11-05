/**
 * @aws-sdk/credential-provider-web-identity/dist-cjs/fromWebToken.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-web-identity@3.936.0
 * pieces: chunk-z5f8ea78.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_client } from "../../core/dist-cjs/submodules/client/index.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";

//@ chunk-z5f8ea78.js:335-372 esm-layout
var import_client = __toESM(require_client());
var import_property_provider = __toESM(require_property_provider());
var import_shared_ini_file_loader = __toESM(require_shared_ini_file_loader());
//@ chunk-z5f8ea78.js:406-1050 esm-fingerprint
var fromWebToken = (init) => async (awsIdentityProperties) => {
  init.logger?.debug("@aws-sdk/credential-provider-web-identity - fromWebToken");
  let { roleArn, roleSessionName, webIdentityToken, providerId, policyArns, policy, durationSeconds } = init;
  let { roleAssumerWithWebIdentity } = init;
  if (!roleAssumerWithWebIdentity) {
    let { getDefaultRoleAssumerWithWebIdentity } = await import("../../nested-clients/sts-default.js").then(
      (mod) => __toESM(mod.default),
    );
    roleAssumerWithWebIdentity = getDefaultRoleAssumerWithWebIdentity(
      {
        ...init.clientConfig,
        credentialProviderLogger: init.logger,
        parentClientConfig: {
          ...awsIdentityProperties?.callerClientConfig,
          ...init.parentClientConfig,
        },
      },
      init.clientPlugins,
    );
  }
  return roleAssumerWithWebIdentity({
    RoleArn: roleArn,
    RoleSessionName: roleSessionName ?? `aws-sdk-js-session-${Date.now()}`,
    WebIdentityToken: webIdentityToken,
    ProviderId: providerId,
    PolicyArns: policyArns,
    Policy: policy,
    DurationSeconds: durationSeconds,
  });
};
export { import_property_provider, fromWebToken, import_shared_ini_file_loader, import_client };
