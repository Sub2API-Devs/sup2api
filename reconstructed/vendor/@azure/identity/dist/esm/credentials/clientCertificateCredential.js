/**
 * @azure/identity/dist/esm/credentials/clientCertificateCredential.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { createPrivateKey, createHash } from "crypto";
import { readFile, readFile as readFile_2 } from "fs/promises";
import { z } from "../util/logging.js";
import { ve, Ee } from "../../index.js";
import { Xt } from "../msal/nodeFlows/msalClient.js";
import { Z } from "../util/tracing.js";

//@ chunk-mrx6y2r5.js:321799-321845 esm-fingerprint
var CLIENTCERTIFICATECREDENTIAL = "ClientCertificateCredential",
  am = z(CLIENTCERTIFICATECREDENTIAL);
//@ chunk-mrx6y2r5.js:321845-323667 esm-fingerprint
class Uc {
  constructor(e, t, r, n = {}) {
    if (!e || !t)
      throw Error(`${CLIENTCERTIFICATECREDENTIAL}: tenantId and clientId are required parameters.`);
    ((this.tenantId = e),
      (this.additionallyAllowedTenantIds = ve(
        n === null || n === void 0 ? void 0 : n.additionallyAllowedTenants,
      )),
      (this.sendCertificateChain = n.sendCertificateChain),
      (this.certificateConfiguration = Object.assign(
        {},
        typeof r === "string" ? { certificatePath: r } : r,
      )));
    let certificate = this.certificateConfiguration.certificate,
      certificatePath = this.certificateConfiguration.certificatePath;
    if (!this.certificateConfiguration || !(certificate || certificatePath))
      throw Error(
        `${CLIENTCERTIFICATECREDENTIAL}: Provide either a PEM certificate in string form, or the path to that certificate in the filesystem. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`,
      );
    if (certificate && certificatePath)
      throw Error(
        `${CLIENTCERTIFICATECREDENTIAL}: To avoid unexpected behaviors, providing both the contents of a PEM certificate and the path to a PEM certificate is forbidden. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.`,
      );
    this.msalClient = Xt(
      t,
      e,
      Object.assign(Object.assign({}, n), { logger: am, tokenCredentialOptions: n }),
    );
  }
  async getToken(e, t = {}) {
    return Z.withSpan(`${CLIENTCERTIFICATECREDENTIAL}.getToken`, t, async (r) => {
      r.tenantId = Ee(this.tenantId, r, this.additionallyAllowedTenantIds, am);
      let n = Array.isArray(e) ? e : [e],
        clientCertificate = await this.buildClientCertificate();
      return this.msalClient.getTokenByClientCertificate(n, clientCertificate, r);
    });
  }
  async buildClientCertificate() {
    var e;
    let t = await yC(
        this.certificateConfiguration,
        (e = this.sendCertificateChain) !== null && e !== void 0 ? e : !1,
      ),
      r;
    if (this.certificateConfiguration.certificatePassword !== void 0)
      r = createPrivateKey({
        key: t.certificateContents,
        passphrase: this.certificateConfiguration.certificatePassword,
        format: "pem",
      })
        .export({ format: "pem", type: "pkcs8" })
        .toString();
    else r = t.certificateContents;
    return { thumbprint: t.thumbprint, thumbprintSha256: t.thumbprintSha256, privateKey: r, x5c: t.x5c };
  }
}
//@ chunk-mrx6y2r5.js:323667-324245 esm-fingerprint
async function yC(e, t) {
  let { certificate: certificate, certificatePath: certificatePath } = e,
    o = certificate || (await readFile_2(certificatePath, "utf8")),
    i = t ? o : void 0,
    s = /(-+BEGIN CERTIFICATE-+)(\n\r?|\r\n?)([A-Za-z0-9+/\n\r]+=*)(\n\r?|\r\n?)(-+END CERTIFICATE-+)/g,
    a = [],
    c;
  do if (((c = s.exec(o)), c)) a.push(c[3]);
  while (c);
  if (a.length === 0)
    throw Error("The file at the specified path does not contain a PEM-encoded certificate.");
  let upper = createHash("sha1").update(Buffer.from(a[0], "base64")).digest("hex").toUpperCase(),
    upper_2 = createHash("sha256").update(Buffer.from(a[0], "base64")).digest("hex").toUpperCase();
  return { certificateContents: o, thumbprintSha256: upper_2, thumbprint: upper, x5c: i };
}

export { Uc };
