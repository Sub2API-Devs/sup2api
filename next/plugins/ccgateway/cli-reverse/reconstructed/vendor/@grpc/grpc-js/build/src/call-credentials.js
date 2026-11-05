/**
 * @grpc/grpc-js/build/src/call-credentials.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_metadata } from "./metadata.js";

//@ chunk-3k21nfa0.js:8822-10380 cjs-fingerprint
var require_call_credentials = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CallCredentials = undefined;
  var metadata_1 = require_metadata();
  function isCurrentOauth2Client(client) {
    return "getRequestHeaders" in client && typeof client.getRequestHeaders === "function";
  }
  class CallCredentials {
    static createFromMetadataGenerator(metadataGenerator) {
      return new SingleCallCredentials(metadataGenerator);
    }
    static createFromGoogleCredential(googleCredentials) {
      return CallCredentials.createFromMetadataGenerator((options, callback) => {
        let getHeaders;
        if (isCurrentOauth2Client(googleCredentials))
          getHeaders = googleCredentials.getRequestHeaders(options.service_url);
        else
          getHeaders = new Promise((resolve, reject) => {
            googleCredentials.getRequestMetadata(options.service_url, (err, headers) => {
              if (err) {
                reject(err);
                return;
              }
              if (!headers) {
                reject(Error("Headers not set by metadata plugin"));
                return;
              }
              resolve(headers);
            });
          });
        getHeaders.then(
          (headers) => {
            let metadata = new metadata_1.Metadata();
            for (let key of Object.keys(headers)) metadata.add(key, headers[key]);
            callback(null, metadata);
          },
          (err) => {
            callback(err);
          },
        );
      });
    }
    static createEmpty() {
      return new EmptyCallCredentials();
    }
  }
  cjsExports.CallCredentials = CallCredentials;
  class ComposedCallCredentials extends CallCredentials {
    constructor(creds) {
      super();
      this.creds = creds;
    }
    async generateMetadata(options) {
      let base = new metadata_1.Metadata();
      let generated = await Promise.all(this.creds.map((cred) => cred.generateMetadata(options)));
      for (let gen of generated) base.merge(gen);
      return base;
    }
    compose(other) {
      return new ComposedCallCredentials(this.creds.concat([other]));
    }
    _equals(other) {
      if (this === other) return true;
      if (other instanceof ComposedCallCredentials)
        return this.creds.every((value, index) => value._equals(other.creds[index]));
      else return false;
    }
  }
  class SingleCallCredentials extends CallCredentials {
    constructor(metadataGenerator) {
      super();
      this.metadataGenerator = metadataGenerator;
    }
    generateMetadata(options) {
      return new Promise((resolve, reject) => {
        this.metadataGenerator(options, (err, metadata) => {
          if (metadata !== undefined) resolve(metadata);
          else reject(err);
        });
      });
    }
    compose(other) {
      return new ComposedCallCredentials([this, other]);
    }
    _equals(other) {
      if (this === other) return true;
      if (other instanceof SingleCallCredentials) return this.metadataGenerator === other.metadataGenerator;
      else return false;
    }
  }
  class EmptyCallCredentials extends CallCredentials {
    generateMetadata(options) {
      return Promise.resolve(new metadata_1.Metadata());
    }
    compose(other) {
      return other;
    }
    _equals(other) {
      return other instanceof EmptyCallCredentials;
    }
  }
});
export { require_call_credentials };
