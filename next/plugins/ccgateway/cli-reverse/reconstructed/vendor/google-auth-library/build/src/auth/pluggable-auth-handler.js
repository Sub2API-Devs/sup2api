/**
 * google-auth-library/build/src/auth/pluggable-auth-handler.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_executable_response } from "./executable-response.js";

//@ chunk-na3pph4p.js:130576-132752 cjs-fingerprint
var require_pluggable_auth_handler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PluggableAuthHandler = cjsExports.ExecutableError = undefined;
  var executable_response_1 = require_executable_response();
  var childProcess = importMetaRequire("child_process");
  var fs = importMetaRequire("fs");
  class ExecutableError extends Error {
    code;
    constructor(message, code) {
      super(`The executable failed with exit code: ${code} and error message: ${message}.`);
      this.code = code;
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
  cjsExports.ExecutableError = ExecutableError;
  class PluggableAuthHandler {
    commandComponents;
    timeoutMillis;
    outputFile;
    constructor(options) {
      if (!options.command) throw Error("No command provided.");
      this.commandComponents = PluggableAuthHandler.parseCommand(options.command);
      this.timeoutMillis = options.timeoutMillis;
      if (!this.timeoutMillis) throw Error("No timeoutMillis provided.");
      this.outputFile = options.outputFile;
    }
    retrieveResponseFromExecutable(envMap) {
      return new Promise((resolve, reject) => {
        let child = childProcess.spawn(this.commandComponents[0], this.commandComponents.slice(1), {
          env: {
            ...process.env,
            ...Object.fromEntries(envMap),
          },
        });
        let output = "";
        child.stdout.on("data", (data) => {
          output += data;
        });
        child.stderr.on("data", (err) => {
          output += err;
        });
        let timeout = setTimeout(() => {
          child.removeAllListeners();
          child.kill();
          return reject(Error("The executable failed to finish within the timeout specified."));
        }, this.timeoutMillis);
        child.on("close", (code) => {
          clearTimeout(timeout);
          if (code === 0)
            try {
              let responseJson = JSON.parse(output);
              let response = new executable_response_1.ExecutableResponse(responseJson);
              return resolve(response);
            } catch (error) {
              if (error instanceof executable_response_1.ExecutableResponseError) return reject(error);
              return reject(
                new executable_response_1.ExecutableResponseError(
                  `The executable returned an invalid response: ${output}`,
                ),
              );
            }
          else return reject(new ExecutableError(output, code.toString()));
        });
      });
    }
    async retrieveCachedResponse() {
      if (!this.outputFile || this.outputFile.length === 0) return;
      let filePath;
      try {
        filePath = await fs.promises.realpath(this.outputFile);
      } catch {
        return;
      }
      if (!(await fs.promises.lstat(filePath)).isFile()) return;
      let responseString = await fs.promises.readFile(filePath, {
        encoding: "utf8",
      });
      if (responseString === "") return;
      try {
        let responseJson = JSON.parse(responseString);
        if (new executable_response_1.ExecutableResponse(responseJson).isValid())
          return new executable_response_1.ExecutableResponse(responseJson);
        return;
      } catch (error) {
        if (error instanceof executable_response_1.ExecutableResponseError) throw error;
        throw new executable_response_1.ExecutableResponseError(
          `The output file contained an invalid response: ${responseString}`,
        );
      }
    }
    static parseCommand(command) {
      let components = command.match(/(?:[^\s"]+|"[^"]*")+/g);
      if (!components) throw Error(`Provided command: "${command}" could not be parsed.`);
      for (let i = 0; i < components.length; i++)
        if (components[i][0] === '"' && components[i].slice(-1) === '"')
          components[i] = components[i].slice(1, -1);
      return components;
    }
  }
  cjsExports.PluggableAuthHandler = PluggableAuthHandler;
});
export { require_pluggable_auth_handler };
