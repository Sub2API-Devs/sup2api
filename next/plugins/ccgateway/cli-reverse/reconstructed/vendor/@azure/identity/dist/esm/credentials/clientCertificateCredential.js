/**
 * @azure/identity/dist/esm/credentials/clientCertificateCredential.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createPrivateKey, createHash } from "crypto";
import { readFile } from "fs/promises";
import { credentialLogger } from "../util/logging.js";
import { resolveAdditionallyAllowedTenantIds, processMultiTenantRequest } from "../../index.js";
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { tracingClient } from "../util/tracing.js";

//@ chunk-b5df2wx1.js:321799-321845 esm-fingerprint
var credentialName = "ClientCertificateCredential";
var logger_8 = credentialLogger(credentialName);
//@ chunk-b5df2wx1.js:321845-323667 esm-fingerprint
class ClientCertificateCredential {
  constructor(tenantId, clientId, certificatePathOrConfiguration, options = {}) {
    if (!tenantId || !clientId)
      throw Error(`${credentialName}: tenantId and clientId are required parameters.`);
    this.tenantId = tenantId;
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.sendCertificateChain = options.sendCertificateChain;
    this.certificateConfiguration = Object.assign(
      {},
      typeof certificatePathOrConfiguration === "string"
        ? {
            certificatePath: certificatePathOrConfiguration,
          }
        : certificatePathOrConfiguration,
    );
    let certificate = this.certificateConfiguration.certificate;
    let certificatePath = this.certificateConfiguration.certificatePath;
    if (!this.certificateConfiguration || !(certificate || certificatePath))
      throw Error(
        `${credentialName}: Provide either a PEM certificate in string form, or the path to that certificate in the filesystem. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`,
      );
    if (certificate && certificatePath)
      throw Error(
        `${credentialName}: To avoid unexpected behaviors, providing both the contents of a PEM certificate and the path to a PEM certificate is forbidden. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`,
      );
    this.msalClient = createMsalClient(
      clientId,
      tenantId,
      Object.assign(Object.assign({}, options), {
        logger: logger_8,
        tokenCredentialOptions: options,
      }),
    );
  }
  async getToken(scopes, options = {}) {
    return tracingClient.withSpan(`${credentialName}.getToken`, options, async (newOptions) => {
      newOptions.tenantId = processMultiTenantRequest(
        this.tenantId,
        newOptions,
        this.additionallyAllowedTenantIds,
        logger_8,
      );
      let arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
      let certificate = await this.buildClientCertificate();
      return this.msalClient.getTokenByClientCertificate(arrayScopes, certificate, newOptions);
    });
  }
  async buildClientCertificate() {
    var _a;
    let parts = await parseCertificate(
      this.certificateConfiguration,
      (_a = this.sendCertificateChain) !== null && _a !== undefined ? _a : false,
    );
    let privateKey;
    if (this.certificateConfiguration.certificatePassword !== undefined)
      privateKey = createPrivateKey({
        key: parts.certificateContents,
        passphrase: this.certificateConfiguration.certificatePassword,
        format: "pem",
      })
        .export({
          format: "pem",
          type: "pkcs8",
        })
        .toString();
    else privateKey = parts.certificateContents;
    return {
      thumbprint: parts.thumbprint,
      thumbprintSha256: parts.thumbprintSha256,
      privateKey,
      x5c: parts.x5c,
    };
  }
}
//@ chunk-b5df2wx1.js:323667-324245 esm-fingerprint
async function parseCertificate(certificateConfiguration, sendCertificateChain) {
  let { certificate, certificatePath } = certificateConfiguration;
  let certificateContents = certificate || (await readFile(certificatePath, "utf8"));
  let x5c = sendCertificateChain ? certificateContents : undefined;
  let certificatePattern =
    /(-+BEGIN CERTIFICATE-+)(\n\r?|\r\n?)([A-Za-z0-9+/\n\r]+=*)(\n\r?|\r\n?)(-+END CERTIFICATE-+)/g;
  let publicKeys = [];
  let match;
  do {
    match = certificatePattern.exec(certificateContents);
    if (match) publicKeys.push(match[3]);
  } while (match);
  if (publicKeys.length === 0)
    throw Error("The file at the specified path does not contain a PEM-encoded certificate.");
  let thumbprint = createHash("sha1")
    .update(Buffer.from(publicKeys[0], "base64"))
    .digest("hex")
    .toUpperCase();
  let thumbprintSha256 = createHash("sha256")
    .update(Buffer.from(publicKeys[0], "base64"))
    .digest("hex")
    .toUpperCase();
  return {
    certificateContents,
    thumbprintSha256,
    thumbprint,
    x5c,
  };
}
export { ClientCertificateCredential };
