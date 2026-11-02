
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{br}from"./chunk-2g090z7k.js";var kZt={invalid_path:"sad",unsupported_name:"sad",symlink_in_path:"sad",path_not_canonical:"sad",read_rule:"sad",not_found:"sad",not_a_directory:"sad",os_permission_denied:"sad",workspace_moved:"bad",unexpected_error:"bad"},t="list denied: ";function iB(e,n){return new br(`${t}${e}`,n,e)}function lpt(e){if(!(e instanceof br))return;let n=e.errorClass;return n!==void 0&&o(n)&&e.message===`${t}${n}`?n:void 0}function o(e){return Object.hasOwn(kZt,e)}
export{kZt,iB,lpt};
