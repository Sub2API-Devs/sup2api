/**
 * @aws-sdk/credential-provider-web-identity/dist-cjs/fromWebToken.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-web-identity@3.936.0
 * pieces: chunk-2pe5kgjj.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { SD } from "../../core/dist-cjs/submodules/client/index.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";

//@ chunk-2pe5kgjj.js:335-372 esm-layout
var d = Re(SD()),
  a = Re($h()),
  m = Re(hU());
//@ chunk-2pe5kgjj.js:406-1050 esm-fingerprint
var l = (e) => async (t) => {
  e.logger?.debug("@aws-sdk/credential-provider-web-identity - fromWebToken");
  let {
      roleArn: roleArn,
      roleSessionName: roleSessionName,
      webIdentityToken: webIdentityToken,
      providerId: providerId,
      policyArns: policyArns,
      policy: policy,
      durationSeconds: durationSeconds,
    } = e,
    { roleAssumerWithWebIdentity: roleAssumerWithWebIdentity } = e;
  if (!roleAssumerWithWebIdentity) {
    let { getDefaultRoleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity } =
      await import("./chunk-my7fcfze.js").then((m) => Re(m.default));
    roleAssumerWithWebIdentity = getDefaultRoleAssumerWithWebIdentity(
      {
        ...e.clientConfig,
        credentialProviderLogger: e.logger,
        parentClientConfig: { ...t?.callerClientConfig, ...e.parentClientConfig },
      },
      e.clientPlugins,
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

export { a, l, m, d };
