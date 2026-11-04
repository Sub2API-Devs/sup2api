/**
 * google-auth-library/build/src/auth/defaultawssecuritycredentialssupplier.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_authclient } from "./authclient.js";

//@ chunk-na3pph4p.js:123454-125888 cjs-fingerprint
var require_defaultawssecuritycredentialssupplier = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DefaultAwsSecurityCredentialsSupplier = undefined;
  var authclient_1 = require_authclient();
  class DefaultAwsSecurityCredentialsSupplier {
    regionUrl;
    securityCredentialsUrl;
    imdsV2SessionTokenUrl;
    additionalGaxiosOptions;
    constructor(opts) {
      this.regionUrl = opts.regionUrl;
      this.securityCredentialsUrl = opts.securityCredentialsUrl;
      this.imdsV2SessionTokenUrl = opts.imdsV2SessionTokenUrl;
      this.additionalGaxiosOptions = opts.additionalGaxiosOptions;
    }
    async getAwsRegion(context) {
      if (this.#s) return this.#s;
      let metadataHeaders = new Headers();
      if (!this.#s && this.imdsV2SessionTokenUrl)
        metadataHeaders.set("x-aws-ec2-metadata-token", await this.#e(context.transporter));
      if (!this.regionUrl)
        throw RangeError(
          'Unable to determine AWS region due to missing "options.credential_source.region_url"',
        );
      let opts = {
        ...this.additionalGaxiosOptions,
        url: this.regionUrl,
        method: "GET",
        responseType: "text",
        headers: metadataHeaders,
      };
      authclient_1.AuthClient.setMethodName(opts, "getAwsRegion");
      let response = await context.transporter.request(opts);
      return response.data.substr(0, response.data.length - 1);
    }
    async getAwsSecurityCredentials(context) {
      if (this.#n) return this.#n;
      let metadataHeaders = new Headers();
      if (this.imdsV2SessionTokenUrl)
        metadataHeaders.set("x-aws-ec2-metadata-token", await this.#e(context.transporter));
      let roleName = await this.#t(metadataHeaders, context.transporter);
      let awsCreds = await this.#r(roleName, metadataHeaders, context.transporter);
      return {
        accessKeyId: awsCreds.AccessKeyId,
        secretAccessKey: awsCreds.SecretAccessKey,
        token: awsCreds.Token,
      };
    }
    async #e(transporter) {
      let opts = {
        ...this.additionalGaxiosOptions,
        url: this.imdsV2SessionTokenUrl,
        method: "PUT",
        responseType: "text",
        headers: {
          "x-aws-ec2-metadata-token-ttl-seconds": "300",
        },
      };
      authclient_1.AuthClient.setMethodName(opts, "#getImdsV2SessionToken");
      return (await transporter.request(opts)).data;
    }
    async #t(headers, transporter) {
      if (!this.securityCredentialsUrl)
        throw Error('Unable to determine AWS role name due to missing "options.credential_source.url"');
      let opts = {
        ...this.additionalGaxiosOptions,
        url: this.securityCredentialsUrl,
        method: "GET",
        responseType: "text",
        headers,
      };
      authclient_1.AuthClient.setMethodName(opts, "#getAwsRoleName");
      return (await transporter.request(opts)).data;
    }
    async #r(roleName, headers, transporter) {
      let opts = {
        ...this.additionalGaxiosOptions,
        url: `${this.securityCredentialsUrl}/${roleName}`,
        headers,
        responseType: "json",
      };
      authclient_1.AuthClient.setMethodName(opts, "#retrieveAwsSecurityCredentials");
      return (await transporter.request(opts)).data;
    }
    get #s() {
      return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null;
    }
    get #n() {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
        return {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          token: process.env.AWS_SESSION_TOKEN,
        };
      return null;
    }
  }
  cjsExports.DefaultAwsSecurityCredentialsSupplier = DefaultAwsSecurityCredentialsSupplier;
});
export { require_defaultawssecuritycredentialssupplier };
