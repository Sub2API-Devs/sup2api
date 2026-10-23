package features

import "time"

// RequestTimeout is how long one model request may run in the Worker by
// default: the CLI's request command gets it as --timeout-ms, including the
// response body (2026-10-23 audit C15). The Worker reads an account's own
// value from REQUEST_TIMEOUT (the older containers' CCG_TIMEOUT when unset),
// bounded by CLI_TIMEOUT; nothing else picks a default. A caller relaying to
// the Worker waits a little longer, so the Worker's own timeout answer
// reaches it.
const RequestTimeout = time.Hour
