"""Bounded real generation-control checks, stop on first failed expectation."""
import argparse
import contextlib
import io
import json
import os
from pathlib import Path

from live_api_smoke import Probe, streamed_message, text
from public_inline_search import evidence_rows, valid_message

STOP = "STOP_FIXTURE_6318"


def zero(message):
    usage = message.get("usage", {}) if isinstance(message, dict) else {}
    return (valid_message(message) and message["content"] == []
            and message["stop_reason"] == "max_tokens"
            and message.get("stop_sequence") is None
            and type(usage.get("output_tokens")) is int and usage["output_tokens"] == 0)


def one(message):
    usage = message.get("usage", {}) if isinstance(message, dict) else {}
    return (valid_message(message) and message["stop_reason"] == "max_tokens"
            and message.get("stop_sequence") is None
            and all(isinstance(b, dict) and b.get("type") == "text" for b in message["content"])
            and type(usage.get("output_tokens")) is int and usage["output_tokens"] == 1)


def stopped(response):
    message = streamed_message(response)
    tokens = message.get("usage", {}).get("output_tokens")
    return (valid_message(message) and message["stop_reason"] == "stop_sequence"
            and type(tokens) is int and tokens > 0
            and all(isinstance(b, dict) and b.get("type") == "text" for b in message["content"])
            and message.get("stop_sequence") == STOP and STOP not in text(message)
            and "ALPHA" in text(message) and "OMEGA" not in text(message))


def run(probe):
    common = {"model": probe.model,
              "messages": [{"role": "user", "content": "Count from one to twenty in English words."}]}
    cases = [
        ("zero-output", dict(common, max_tokens=0), zero),
        ("one-output-token", dict(common, max_tokens=1), one),
        ("stream-stop-sequence", dict(common, max_tokens=128, stream=True,
            stop_sequences=[STOP], messages=[{"role": "user", "content":
                "Output exactly this text with no commentary: ALPHA " + STOP + " OMEGA"}]), stopped),
    ]
    for name, body, check in cases:
        if probe.call(name, body, check, protocol_only=True) is None:
            break
    return {"model": probe.model, "results": evidence_rows(probe.results),
            "passed": len(probe.results) == len(cases) and all(r["passed"] for r in probe.results),
            "scope": "At most three requests, no retries. Zero-output checks response fidelity only, "
                     "not cache warming or billing savings. A failed text expectation is not itself a gateway bug. "
                     "Worker logs must independently verify exact outgoing limits and upstream call count."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    key = os.environ.get("SUP2API_API_KEY")
    if not key:
        parser.error("SUP2API_API_KEY is required")
    with contextlib.redirect_stdout(io.StringIO()):
        report = run(Probe(args.base, key, "claude-opus-5-5"))
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    args.output.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
