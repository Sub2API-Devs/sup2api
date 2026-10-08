# Multiple tool-result trailing whitespace repair

## Production evidence

Account22 first response `cced1261-217d-4355-8299-f5c1804937c4` (05:03:16 UTC) returned five native Read calls. The client supplied all five matching tool results. Continuations `c6777e67-b541-4b19-9e5c-ae64e90f052d` (05:03:23) and `c5682b7a-f9a4-4b99-a54a-2881357fa4db` (05:03:38) failed before provider dispatch with `client user turn 3: client user block sequence changed`. Subsequent no-available-account responses must be distinguished from this first Worker502.

No user file was opened by the investigator. Shape/hash comparisons inside the container showed the first four result strings identical. The fifth original string had17205 characters ending in a TAB. CLI removed that final TAB before appending the authenticated573-character session-context wrapper, producing17777 characters. Actual equals original's terminal-ASCII-trimmed form plus the exact current-request registered wrapper. The earlier single-tool fix required a complete original prefix, so correctly rejected this as an unrecognized change.

## Narrow fix

`tool_result_context.go` recognizes the full original prefix, or a prefix with only the exact ECMAScript WhiteSpace + LineTerminator set removed, followed by the exact current authenticated session-context wrapper. During alignment the original full client result is restored; the final outbound content is the original including every trailing byte plus the trusted suffix. Metadata, result IDs, order, unknown suffix and arbitrary text validation remain strict.

The final helper implements the exact current JavaScript trimEnd set: TAB/LF/VT/FF/CR/SPACE/NBSP/U+1680/U+2000..200A/U+2028/U+2029/U+202F/U+205F/U+3000/U+FEFF. It does not use Go unicode.IsSpace; NEL, U+180E and U+200B must not be trimmed. Source: [ECMAScript WhiteSpace](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-white-space) and [trimEnd](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.trimend). No trim applies to ordinary unmodified results, unknown attachments, internal text or client fingerprints. No tool execution or cooldown policy is changed.

## Initial ASCII regression evidence

Author unit regression first failed for TAB/CRLF/spaces/mixed ASCII tails, then passed after the narrow fix. A test-only shape assertion initially used []any after history alignment returned []Object; it was corrected to use the shared historyContent reader. No production behavior was changed to satisfy that assertion.

The real CLI fixture contains only five public synthetic tool results, with the last ending in TAB/CRLF/spaces/plain text, through JSON/SSE initial/continuation/cold/rollback paths. Results will be appended after completion. User controller/token.go contents are not present in tests or this document.

## Completed author checks

Real CLI2.1.292 with isolated dummy OAuth/config and a fake upstream: 4 tail variants × JSON/SSE × initial/continuation/cold import/rollback =32 calls, PASS26.494s. The fixture requires five paired tool results in the original ID order, exact first four contents, and full client trailing bytes before the single authenticated suffix in the final result. At least one round per case must actually embed the context. This uses synthetic public tool fixtures, not user's source files or a real provider call.

Full engine tests PASS4.308s; vet PASS. Independent reviewer added Unicode/NEL/unknown-wrapper negative tests and a separate multi-tool ordering fixture; its tests are recorded separately and do not substitute for the actual context-triggering author matrix. Author source is frozen for independent review; no deployment in this step.


## Exact JavaScript whitespace completion

The initial ASCII-only patch was expanded before release to the exact specification set above. The unit suite enumerates every accepted code point independently and rejects NEL/U+180E/U+200B plus other control characters. Unchanged prefixes with these non-trim characters remain valid; only removing them is rejected. Added a real CLI five-tool fixture ending with NBSP + BOM + LINE SEPARATOR, requiring actual context insertion and exact recovery of original client bytes. This supersedes the earlier ASCII-only scope, without changing trusted-attachment, metadata or ordering requirements.

Final exact-set verification: author and independent trim unit cases PASS1.196s. Five tail variants (the original four plus NBSP+BOM+LS) × JSON/SSE × new/continuation/cold/rollback =40 real CLI fixture calls, PASS34.135s; vet PASS. The Unicode fixture actually triggers embedded session context and verifies complete original tail recovery. No unrelated MCP/inline matrix was rerun for this final cutset-only change.
