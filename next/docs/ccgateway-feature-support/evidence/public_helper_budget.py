"""At most four real public requests; no retries, routing override or private headers."""
import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import uuid

from live_api_smoke import Probe, assistant, streamed_message, text, user
from public_inline_search import evidence_rows, valid_message

BETA = "task-budgets-2026-03-13,advanced-tool-use-2025-11-20"
TOOL = "lookup_fixture"
MARKER = "HELPER_BUDGET_RESULT_6842"
BRANCH = "HELPER_BUDGET_BRANCH_8291"


def normalize(value):
    return streamed_message(value) if value and "events" in value else value


def run(probe, *, inline=False):
    tool = {"name": TOOL, "description": "Return the supplied test marker for key fixture.",
            "defer_loading": True, "input_schema": {"type": "object", "properties": {
                "key": {"type": "string", "enum": ["fixture"]}},
                "required": ["key"], "additionalProperties": False}}
    initial = [user("Session fixture " + uuid.uuid4().hex + ". Find lookup_fixture and call it once "
                    "with key fixture. Use tool discovery if necessary. After receiving its result, "
                    "reply with that exact marker only. Never guess a tool result.")]
    beta = BETA
    if inline:
        beta += ",inline-tools-2026-09-15"
        initial.append({"role": "system", "content": [{"type": "tool_addition", "tool": {
            "type": "tool_definition", "definition": {"name": "spare_fixture",
                "description": "Unrelated fixture; do not call it for this task.",
                "defer_loading": True, "input_schema": {"type": "object"}}}}]})
    checks = {"external_tool_handoff": False, "result_continuation": False,
              "ordinary_sse_continuation": False, "rollback": False,
              "internal_rounds_verified": False, "durable_receipts_verified": False}

    def call(name, messages, *, budget=True, stream=False):
        config = {"effort": "low"}
        if budget:
            config["task_budget"] = {"type": "tokens", "total": 20000}
        result = probe.call(name, {"model": probe.model, "max_tokens": 512,
            "output_config": config, "stream": stream, "tools": [tool], "messages": messages},
            lambda value: valid_message(normalize(value)), protocol_only=True, beta=beta)
        return normalize(result)

    def completed(message, marker):
        return bool(message and message.get("stop_reason") == "end_turn"
                    and marker == text(message)
                    and not any(b.get("type") == "tool_use" for b in message["content"]))

    first = call("helper-budget-tool", initial)
    calls = [b for b in first.get("content", []) if b.get("type") == "tool_use"] if first else []
    if (first and first.get("stop_reason") == "tool_use" and len(calls) == 1
            and calls[0].get("name") == TOOL and calls[0].get("input") == {"key": "fixture"}
            and isinstance(calls[0].get("id"), str) and calls[0]["id"]):
        checks["external_tool_handoff"] = True
        tool_id = calls[0]["id"]
        checks["tool_call_id_sha256"] = hashlib.sha256(tool_id.encode()).hexdigest()
        history = initial + [assistant(first), user([{"type": "tool_result", "tool_use_id": tool_id,
                                                     "content": MARKER}])]
        if inline:
            history.append({"role": "system", "content": [{"type": "tool_removal",
                "tool": {"type": "tool_reference", "name": TOOL}}]})
        second = call("helper-budget-result", history)
        checks["result_continuation"] = completed(second, MARKER)
        if checks["result_continuation"]:
            ordinary = history + [assistant(second), user("Repeat the previous tool-result marker only.")]
            third = call("helper-budget-ordinary-sse", ordinary, budget=False, stream=True)
            checks["ordinary_sse_continuation"] = completed(third, MARKER)
            if checks["ordinary_sse_continuation"]:
                branch = initial + [assistant(first), user([{"type": "tool_result", "tool_use_id": tool_id,
                                                            "content": BRANCH}])]
                fourth = call("helper-budget-rollback", branch)
                checks["rollback"] = completed(fourth, BRANCH)
    passed = all(checks[k] for k in ("external_tool_handoff", "result_continuation",
                                    "ordinary_sse_continuation", "rollback"))
    return {"model": probe.model, "inline": inline, "results": evidence_rows(probe.results), "checks": checks,
            "passed": passed,
            "scope": "Public API evidence only. Worker logs and DB receipts must independently prove "
                     "internal search, hidden-history custody, account binding and single accounting. "
                     "No forced cold restart or provider billing/cache-savings claim. HTTP200 refusal is "
                     "a normal protocol result but not fixture completion. Stops on first mismatch."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--inline", action="store_true", help="Include inline addition, withdrawal and rollback")
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    with contextlib.redirect_stdout(io.StringIO()):
        report = run(Probe(args.base, key, args.model), inline=args.inline)
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
