# Skills independent review — 2026-10-08

Reviewed gateway Skills upload/list/get/download/delete, providerresources parent/version persistence, and root's model request/output version mapper. No production request or credential changes. Database execution is reserved for the Linux isolated run (`SUB2API_TESTPG=off` locally).

## Confirmed defects and fixes

1. **Frozen output version could change.** The response mapper checked owner and issuer, but accepted another registered version of the same parent after this request had frozen version A. Independent `TestReviewSkillOutputCannotChangeFrozenVersion` first failed with provider version B accepted. Root fixed the mapper; the independent regression now passes. Requests without an explicit skill selection on a reused container need an owner/binding-scoped remote lookup, not enumeration of a shared provider workspace. Root/audit own that path.

2. **Successful upload evidence disappeared after metadata failure.** Initial POST may create a provider skill, then its version metadata GET can fail. Previously only the uncertain state survived, with no observed remote IDs for targeted reconciliation. Added typed `SkillUploadEvidence` to the failure transition, populated only from the authenticated provider response and core request identity. Facts persist under version metadata `upload_evidence`; the resource stays uncertain, and no ready access or public provider ID is granted. Same owner/operation/issuer is required; empty updates preserve evidence, contradictory updates fail, existing JSON number precision is preserved. A persistence failure emits a structured log with core request/public IDs only.

Files changed for finding 2: core/ports_skills.go, gateway/resource_skills_upload.go, providerresources/skills_upload.go. No schema migration needed. Evidence supports subsequent reconciliation; it does not claim an automatic reconciliation service has been implemented.

## Other reviewed boundaries

- Version reads are scoped to an owned parent; `latest` is resolved before dispatch and is not used for destructive download/delete selectors.
- Provider delete outcomes retain uncertain states unless confirmed; parent deletion blocks unfinished version mutations; owner serialization protects concurrent mutations.
- ZIP uploads preserve multipart bytes; compressed and decompressed data are bounded, CRC/read errors rejected, no archive extraction or script execution occurs in core.
- Custom listing is owner/account scoped; builtin listing forces source=anthropic independent of cursor, validates returned scope, and pins cursor account plus issuer generation. Changing issuer invalidates the cursor.
- Stable and legacy public selectors are distinct; legacy epoch is retained from provider evidence rather than derived from created_at.

Official reference checked 2026-10-08:
- https://platform.claude.com/docs/en/api/skills/retrieve
- https://platform.claude.com/docs/en/api/skills/versions/retrieve

## Verification and limits

`resource_skills_independent_review_test.go`: frozen A / observed B regression; HTTP POST200 followed by metadata503 retains observed IDs, does not retry POST, and does not expose provider IDs.

`skills_evidence_review_test.go`: append-only identity evidence, issuer mismatch, nil update preservation, exact prior numeric metadata, plus a new persistent DB scenario awaiting Linux.

Local Skills/review tests and vet passed with `SUB2API_TESTPG=off`. The DB test compiled but was explicitly skipped locally; this is not PostgreSQL execution evidence. Existing Skills HTTP protocol tests passed, including stable/legacy, cursor scoping, partial ZIP rejection. Real provider Skills eligibility and full Linux DB concurrency remain integration gates.

## Real CLI isolated model-path follow-up

Added engine/skill_execution_cli_test.go. TestRealCLISkillExecutionGateway ran CLI 2.1.292 against a fake provider: custom and Anthropic builtin skills, five flows each (initial, continuation, cold session, rollback, SSE), 10 model calls total, PASS 12.757s. Custom version_fixed was admitted by the exact ResourceSkillVersionsHeader and typed skill/container/file grants plus output capability. Every upstream container.skills object, response JSON/SSE container skill version, and CodeExec history block was compared exactly; no private version header reached the provider. This demonstrates codec/CLI compatibility only, not provider Skills execution eligibility or production deployment.
