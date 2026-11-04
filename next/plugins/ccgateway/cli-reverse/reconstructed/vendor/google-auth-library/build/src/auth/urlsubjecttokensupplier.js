/**
 * google-auth-library/build/src/auth/urlsubjecttokensupplier.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_authclient } from "./authclient.js";

//@ chunk-na3pph4p.js:113780-114685 cjs-fingerprint
var require_urlsubjecttokensupplier = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.UrlSubjectTokenSupplier = undefined;
  var authclient_1 = require_authclient();
  class UrlSubjectTokenSupplier {
    url;
    headers;
    formatType;
    subjectTokenFieldName;
    additionalGaxiosOptions;
    constructor(opts) {
      this.url = opts.url;
      this.formatType = opts.formatType;
      this.subjectTokenFieldName = opts.subjectTokenFieldName;
      this.headers = opts.headers;
      this.additionalGaxiosOptions = opts.additionalGaxiosOptions;
    }
    async getSubjectToken(context) {
      let tokenContext = {
        ...this.additionalGaxiosOptions,
        url: this.url,
        method: "GET",
        headers: this.headers,
        responseType: this.formatType,
      };
      authclient_1.AuthClient.setMethodName(tokenContext, "getSubjectToken");
      let subjectToken;
      if (this.formatType === "text") subjectToken = (await context.transporter.request(tokenContext)).data;
      else if (this.formatType === "json" && this.subjectTokenFieldName)
        subjectToken = (await context.transporter.request(tokenContext)).data[this.subjectTokenFieldName];
      if (!subjectToken) throw Error("Unable to parse the subject_token from the credential_source URL");
      return subjectToken;
    }
  }
  cjsExports.UrlSubjectTokenSupplier = UrlSubjectTokenSupplier;
});
export { require_urlsubjecttokensupplier };
