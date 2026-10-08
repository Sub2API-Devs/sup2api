# Files HTTP and account transport independent review

Reviewed the CC agent's Files HTTP/upload implementation and root-authored `ccgateway/resources.go`/account transport/app composition. This is independent of those components; the resource repository and file-reference gate were authored by this reviewer and are not relabeled as independently audited here.

## Corrections made

1. HTTP resource requests originally forwarded only the first beta header and always replaced the client's API version. They now preserve multiple beta values and an explicit version, applying the default version only when absent. Managed-agent scope detection checks all beta values. Actual HTTP regressions cover both controls and second-header scope rejection.

   Final freeze checks also reject any explicit workspace header (including an empty first value followed by a real scope) and multiple API-version header values. These ambiguous controls cannot silently select the first value. Two additional actual HTTP cases passed with the Files header review suite (5.007s); gateway vet and diff checks passed.
2. Successful responses dropped provider request/rate-limit facts, and error responses had a separate three-header list. Both now reuse shared `httpfacts.Apply`; the previous `Anthropic-Request-Id` alias is included in that shared narrow allowlist. Cookie, issuer, framing and unrelated headers are not copied. Success and error HTTP regressions cover this boundary.
3. Four authenticated stalled uploads could occupy all four node spool slots indefinitely. Incoming file reads now have a one-minute idle deadline, reset for each underlying read. This uses `http.ResponseController.SetReadDeadline`, because closing a net/http body alone may wait on the same lock as a blocked read. Cancellation also interrupts the network read; no per-read goroutine is started. A timeout returns 408 before reservation/dispatch. Real TCP tests exercise a stalled body and a progressing transfer whose total duration exceeds its idle limit.
4. Legacy filename validation was applied to the stable Files API. The [official Python SDK resource definition](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/resources/files.py) documents stable provider handling of filename paths and absent/empty names. Stable requests now preserve the original multipart filename, including absence/empty, for the provider to interpret. They use random private temporary files locally; filename never selects a local path. Bounded UTF-8/control-character validation remains. Legacy beta retains its distinct validation. Five actual HTTP cases verify stable values reach the provider unchanged.

## Other inspected boundaries

- Authentication precedes upload spooling; current group account membership and user/account concurrency remain required. Known resource operations stay on the stored account/issuer. Workspace scope is not silently assigned another workspace.
- Upload is fully measured and hashed into a private temporary file before resource reservation. Only one remote upload is attempted; cancellation/transport/ambiguous provider failure retains an uncertain intent. Confirmed provider rejection uses its separate failure transition.
- The resource transport accepts only its fixed verb/path surface, strips caller credentials, uses existing account discovery/private-network checks, and requires matching issuer headers on the response. Closing the response closes the account connection and execution context.
- App composition supplies the durable resource service and managed account resource transport. Public resource routes do not expose the controller endpoint or raw account credentials.

## Evidence and remaining verification

- Latest gateway review/Files targeted tests passed in 5.724s; gateway and ccgateway vet passed.
- Transport unit targets passed with `SUB2API_TESTPG=off`; `TestResourceTransportDBReusesAccountDiscoveryWithoutControllerBody` was skipped and still needs the Linux PostgreSQL checkpoint. Lifecycle/pagination DB tests belong to the same pending checkpoint.
- No actual 512 MiB provider transfer or cloud account scope qualification was performed in this review. Small configurable-limit fixtures test bounded spooling; fake HTTP/TCP tests establish core behavior, not provider acceptance.
- Core inbound spooling now has an idle limit, while Worker resource execution currently has a ten-minute total deadline and the shared core account transport has its longer execution timeout. These are distinct phases and are not a promise of arbitrarily slow large-file completion.
- No production deployment or Git commit was performed by this reviewer.
