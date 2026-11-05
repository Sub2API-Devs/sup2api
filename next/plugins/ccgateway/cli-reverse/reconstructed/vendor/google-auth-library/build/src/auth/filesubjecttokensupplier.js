/**
 * google-auth-library/build/src/auth/filesubjecttokensupplier.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:112832-113780 cjs-fingerprint
var require_filesubjecttokensupplier = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.FileSubjectTokenSupplier = undefined;
  var util_1 = importMetaRequire("util");
  var fs = importMetaRequire("fs");
  var readFile = util_1.promisify(fs.readFile ?? (() => {}));
  var realpath = util_1.promisify(fs.realpath ?? (() => {}));
  var lstat = util_1.promisify(fs.lstat ?? (() => {}));
  class FileSubjectTokenSupplier {
    filePath;
    formatType;
    subjectTokenFieldName;
    constructor(opts) {
      this.filePath = opts.filePath;
      this.formatType = opts.formatType;
      this.subjectTokenFieldName = opts.subjectTokenFieldName;
    }
    async getSubjectToken() {
      let parsedFilePath = this.filePath;
      try {
        parsedFilePath = await realpath(parsedFilePath);
        if (!(await lstat(parsedFilePath)).isFile()) throw Error();
      } catch (err) {
        if (err instanceof Error)
          err.message = `The file at ${parsedFilePath} does not exist, or it is not a file. ${err.message}`;
        throw err;
      }
      let subjectToken;
      let rawText = await readFile(parsedFilePath, {
        encoding: "utf8",
      });
      if (this.formatType === "text") subjectToken = rawText;
      else if (this.formatType === "json" && this.subjectTokenFieldName)
        subjectToken = JSON.parse(rawText)[this.subjectTokenFieldName];
      if (!subjectToken) throw Error("Unable to parse the subject_token from the credential_source file");
      return subjectToken;
    }
  }
  cjsExports.FileSubjectTokenSupplier = FileSubjectTokenSupplier;
});
export { require_filesubjecttokensupplier };
