# Worker 0.1.67 deployment — 2026-10-08

Status: Worker image and both existing account containers are deployed and verified. Core/default-image publication remains a separate operation.

Git candidate `779c0630d8451ca9ff5840c2a552c5b3568aca0b` was fetched on cc-max into a new clean detached worktree `/root/ccgateway-features-779c0630d`. No local source archive was uploaded. Artifacts are under `/opt/ccgateway-runtime/feature-validation-779c0630d`.

Scope: independent CC per-turn beta admission, constrained loaded forced-tool compatibility and catalog .9. Core/catalog publication is handled separately by root/API agent.

Sequential Linux Go tests use 2 CPU/2 GiB/GOMAXPROCS=2 and existing compiler/module cache volumes. `go test -race -count=1` reruns current-commit tests; previous-SHA test results are not substituted. New image tag is `ccgateway-worker:0.1.67`; old tags must remain untouched.


## Artifacts and checks

- Standalone deployed binary SHA256: `ce7b5dcd3b2edb50b39b8ea9d00c84debf22411ca68d36b534c03f22a41e67b8`.
- Image ID: `sha256:84ca20e9fa449926f3721b7cc92fed59f5d05aa0fddf6310b92de10aa7869307`; OCI revision is the exact candidate above.
- Image internal binary SHA256: `bfd6f02c79c88c1725b0146603d3dd667f838772c23d532bd6ccd067bfcabb2f`. Dockerfile and standalone trimpath builds use different flags; artifact identities are separately recorded, not claimed identical.
- Linux engine race PASS16.327s; Worker config1.037s/server1.279s/worker7.122s; contracts credits/features/httpfacts/resources all PASS, diagnostics has no tests. Engine/Worker/contracts vet PASS.
- Independent fixture-key image health/features HTTP200: Version0.1.67, revision779c0630d8451ca9ff5840c2a552c5b3568aca0b, modified=false, code_catalog2026-10-08.9, CLI2.1.292. Default port8787. Verification container removed after success.

## Existing accounts preserved

Updated #22, verified it completely, then #21. Before each replacement, no active CLI was permitted and the current binary had to match the expected 0.1.66 hash. Backup, temporary executable SHA verification, atomic rename and original-container restart followed.

- #22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`; #21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`.
- Both original image reference `ccgateway:0.1.56` and image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d` remain. Complete before/after identity/image/user/mount/path/args snapshots compare equal.
- New backup paths `/opt/ccgateway-runtime/manual-backups/20261008-779c0630d-22` and `...-21`; preserved old binary SHA256 `51c09e8408e5e3ac0ac93e143dbdf83d07e8fe1d2c50de21140578298caee221` (0.1.66). Includes identity snapshots, CLI symlink, deployed hash, verification output.
- Both health/features reports match version/revision/catalog/CLI above. Login remains true: #22 claude.ai; #21 api_key. No authorization change, rebuild or container replacement.
- One real Opus5.5 READY per account, no retry: #22 HTTP200/end_turn/input65/output4/cache0; #21 HTTP200/end_turn/input52/output4/cache0.

This agent did not modify default image/controller/core configuration. API and root were notified only after both accounts stabilized. Real public local-Claude Read and per-turn directive no-downgrade verification follows their coordinated core/controller completion; it is not inferred from the short READY checks. No credentials or original account context are included in this report.

## Real local-Claude per-turn acceptance

Following coordinated core0.1.66/Worker0.1.67/default0.1.67 publication, root ran local Claude Read against the public gateway. Root evidence `local-claude-0.1.67.json`: 17.877s, exit0, two turns, paired Read/result, input4/output628/cachecreation6986/cacheread2674. This agent only inspected logs; no duplicate model calls.

Scanning both accounts by this request metadata hash `891e0bb2545f9b12` found exactly two matching requests, both in account22:

- `e214e9dc-c23c-4781-9eb3-1ae9b8e03359`, 05:14:55.269 UTC, HTTP200, one upstream request.
- `df11122b-9f3a-411e-83c7-05e80595f879`, 05:15:06.044 UTC, HTTP200, one upstream request.

There was no same-session 400 or subsequent directive deletion. Both client and actual outbound headers retained `per-turn-control-2026-07-01`, without replacing it with the public API beta. The client's messages[1].output_config.effort remained medium in a system message at the same conversational point. Its raw array index changed to 2 in the first outbound request because gateway system context was inserted; it remained 1 on continuation. This is role/order preservation, not an assertion that raw array indices cannot shift with configured attachments.

Both outbound tool lists contain native Read. Tool-result original text length3606, hash `46b590c71636af8c`, remains an exact prefix of length4179; the trusted context inner-text hash `8798029338750562` occurs once per request. Top-level system text is exactly equal; raw JSON differs in cache metadata, so no byte-identical JSON claim is made.

This is successful real-provider evidence for the observed CC beta on this account/model/version and a Read roundtrip. It does not establish universal provider/model beta eligibility.
