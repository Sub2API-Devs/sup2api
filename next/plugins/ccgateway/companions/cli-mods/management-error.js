// One bounded JSON line on stderr for `claude ccgateway-mgmt`, in the request
// command's frame format (ccgateway-request-error.js owns the protocol name and
// the encoder). A management command writes its answer to files, so stderr is
// errors only.
import { encodeErrorFrame, errorProtocol } from './request-error.js';

export { encodeErrorFrame, errorProtocol };

// ManagementInputError is a caller fault: arguments, the route allowlist, or
// the login the command needs. It is exit code 1, except an unusable login
// (not_logged_in), which is exit code 4 so the caller can ask for a new
// authorization instead of reporting a broken command.
export class ManagementInputError extends Error {
  constructor(message, code = 'cli_invalid_input') {
    super(message);
    this.name = 'ManagementInputError';
    this.code = code;
  }
}

// ManagementResponseTooLarge is the answer passing --max-bytes: the command
// stops reading, removes the partial file and exits 3.
export class ManagementResponseTooLarge extends Error {
  constructor(message = 'Management response exceeds --max-bytes', code = 'response_too_large') {
    super(message);
    this.name = 'ManagementResponseTooLarge';
    this.code = code;
  }
}

// ManagementOutputError is a local file fault while the answer is being
// written (the exchange itself may have succeeded): exit 1, never a transport
// failure.
export class ManagementOutputError extends Error {
  constructor(message, code = 'cli_output_error') {
    super(message);
    this.name = 'ManagementOutputError';
    this.code = code;
  }
}

const inputCodes = new Set(['cli_invalid_input', 'cli_invalid_management_path', 'not_logged_in']);

// managementErrorFrame classifies the failure by the phase it happened in. A
// timeout is its own source (DNS, connect, TLS and a stalled body all end a
// transport phase as exit code 2).
export function managementErrorFrame(error, { phase = 'input', timedOut = false } = {}) {
  let source = 'input', status = 400, type = 'invalid_request_error', code = 'cli_invalid_input';
  let message = 'Invalid ccgateway management request';
  if (phase === 'transport' || timedOut) {
    source = 'transport'; status = 502; type = 'api_error'; code = 'cli_transport_error';
    message = 'CC management request transport failed';
  } else if (phase === 'output') {
    source = 'internal'; status = 502; type = 'api_error'; code = 'cli_output_error';
    message = 'CC management response output failed';
  }
  if (timedOut) {
    source = 'timeout'; status = 504; type = 'timeout_error'; code = 'cli_timeout';
    message = 'CC management request timed out';
  }
  if (error instanceof ManagementResponseTooLarge || error?.code === 'response_too_large') {
    source = 'response'; status = 502; type = 'api_error'; code = 'response_too_large';
    message = 'Management response exceeds --max-bytes';
  }
  if (error instanceof ManagementOutputError || error?.code === 'cli_output_error') {
    source = 'internal'; status = 502; type = 'api_error'; code = 'cli_output_error';
    message = 'CC management response output failed';
  }
  if (typeof error?.message === 'string' && error.message) message = error.message;
  if (source === 'input') {
    if (error instanceof ManagementInputError && inputCodes.has(error.code)) code = error.code;
    if (code === 'not_logged_in') { status = 401; type = 'authentication_error'; }
  } else if (source === 'transport') {
    const nativeCode = error?.code ?? error?.cause?.code;
    if (typeof nativeCode === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(nativeCode)) code = nativeCode;
  }
  return { protocol: errorProtocol, source, status, error: { type, code, message } };
}
