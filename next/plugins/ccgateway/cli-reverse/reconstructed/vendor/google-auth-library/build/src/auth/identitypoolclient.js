/**
 * google-auth-library/build/src/auth/identitypoolclient.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_baseexternalclient } from "./baseexternalclient.js";
import { require_util } from "../util.js";
import { require_filesubjecttokensupplier } from "./filesubjecttokensupplier.js";
import { require_urlsubjecttokensupplier } from "./urlsubjecttokensupplier.js";
import { require_certificatesubjecttokensupplier } from "./certificatesubjecttokensupplier.js";
import { require_stscredentials } from "./stscredentials.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";

//@ chunk-e8d3a8an.js:118656-121087 cjs-fingerprint
var require_identitypoolclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.IdentityPoolClient = undefined;
  var baseexternalclient_1 = require_baseexternalclient();
  var util_1 = require_util();
  var filesubjecttokensupplier_1 = require_filesubjecttokensupplier();
  var urlsubjecttokensupplier_1 = require_urlsubjecttokensupplier();
  var certificatesubjecttokensupplier_1 = require_certificatesubjecttokensupplier();
  var stscredentials_1 = require_stscredentials();
  var gaxios_1 = require_gaxios_2();
  class IdentityPoolClient extends baseexternalclient_1.BaseExternalAccountClient {
    subjectTokenSupplier;
    constructor(options) {
      super(options);
      let opts = util_1.originalOrCamelOptions(options);
      let credentialSource = opts.get("credential_source");
      let subjectTokenSupplier = opts.get("subject_token_supplier");
      if (!credentialSource && !subjectTokenSupplier)
        throw Error("A credential source or subject token supplier must be specified.");
      if (credentialSource && subjectTokenSupplier)
        throw Error("Only one of credential source or subject token supplier can be specified.");
      if (subjectTokenSupplier) {
        this.subjectTokenSupplier = subjectTokenSupplier;
        this.credentialSourceType = "programmatic";
      } else {
        let credentialSourceOpts = util_1.originalOrCamelOptions(credentialSource);
        let formatOpts = util_1.originalOrCamelOptions(credentialSourceOpts.get("format"));
        let formatType = formatOpts.get("type") || "text";
        let formatSubjectTokenFieldName = formatOpts.get("subject_token_field_name");
        if (formatType !== "json" && formatType !== "text")
          throw Error(`Invalid credential_source format "${formatType}"`);
        if (formatType === "json" && !formatSubjectTokenFieldName)
          throw Error("Missing subject_token_field_name for JSON credential_source format");
        let file = credentialSourceOpts.get("file");
        let url = credentialSourceOpts.get("url");
        let certificate = credentialSourceOpts.get("certificate");
        let headers = credentialSourceOpts.get("headers");
        if ((file && url) || (url && certificate) || (file && certificate))
          throw Error(
            'No valid Identity Pool "credential_source" provided, must be either file, url, or certificate.',
          );
        else if (file) {
          this.credentialSourceType = "file";
          this.subjectTokenSupplier = new filesubjecttokensupplier_1.FileSubjectTokenSupplier({
            filePath: file,
            formatType,
            subjectTokenFieldName: formatSubjectTokenFieldName,
          });
        } else if (url) {
          this.credentialSourceType = "url";
          this.subjectTokenSupplier = new urlsubjecttokensupplier_1.UrlSubjectTokenSupplier({
            url,
            formatType,
            subjectTokenFieldName: formatSubjectTokenFieldName,
            headers,
            additionalGaxiosOptions: IdentityPoolClient.RETRY_CONFIG,
          });
        } else if (certificate) {
          this.credentialSourceType = "certificate";
          let certificateSubjecttokensupplier =
            new certificatesubjecttokensupplier_1.CertificateSubjectTokenSupplier({
              useDefaultCertificateConfig: certificate.use_default_certificate_config,
              certificateConfigLocation: certificate.certificate_config_location,
              trustChainPath: certificate.trust_chain_path,
            });
          this.subjectTokenSupplier = certificateSubjecttokensupplier;
        } else
          throw Error(
            'No valid Identity Pool "credential_source" provided, must be either file, url, or certificate.',
          );
      }
    }
    async retrieveSubjectToken() {
      let subjectToken = await this.subjectTokenSupplier.getSubjectToken(this.supplierContext);
      if (
        this.subjectTokenSupplier instanceof certificatesubjecttokensupplier_1.CertificateSubjectTokenSupplier
      ) {
        let mtlsAgent = await this.subjectTokenSupplier.createMtlsHttpsAgent();
        this.stsCredential = new stscredentials_1.StsCredentials({
          tokenExchangeEndpoint: this.getTokenUrl(),
          clientAuthentication: this.clientAuth,
          transporter: new gaxios_1.Gaxios({
            ...(this.transporter.defaults || {}),
            agent: mtlsAgent,
          }),
        });
        this.transporter = new gaxios_1.Gaxios({
          ...(this.transporter.defaults || {}),
          agent: mtlsAgent,
        });
      }
      return subjectToken;
    }
  }
  cjsExports.IdentityPoolClient = IdentityPoolClient;
});
export { require_identitypoolclient };
