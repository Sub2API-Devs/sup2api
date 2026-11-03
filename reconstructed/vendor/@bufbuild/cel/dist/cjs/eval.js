/**
 * @bufbuild/cel/dist/cjs/eval.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:469618-470154 cjs-fingerprint
var require_eval = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.setEvalContext = setEvalContext;
  cjsExports.getEvalContext = getEvalContext;
  cjsExports.withEvalContext = withEvalContext;
  cjsExports.getMsgDesc = getMsgDesc;
  var contextStack = [];
  function setEvalContext(context) {
    contextStack.push(context);
    return () => contextStack.pop();
  }
  function getEvalContext() {
    if (contextStack.length === 0) throw Error("cannot use `getEvalContext` outside of an evaluation");
    return contextStack[contextStack.length - 1];
  }
  function withEvalContext(context, next) {
    return {
      id: next.id,
      eval(ctx) {
        let unset = setEvalContext(context);
        try {
          return next.eval(ctx);
        } finally {
          unset();
        }
      },
    };
  }
  function getMsgDesc(typeName) {
    let schema = getEvalContext().registry.getMessage(typeName);
    if (!schema) throw Error(`Message ${typeName} not found in registry`);
    return schema;
  }
});
export { require_eval };
