"""At most three fixture-only public calls. Stop at first content failure; no retries."""
import argparse
import base64
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import struct
import zlib

from live_api_smoke import Probe, assistant, text, user
from public_inline_search import evidence_rows, valid_message


DOCUMENT = "The fictional sample named Lumen has the color violet. Its inventory count is 17."
TITLE = "Synthetic fixture"

def red_png():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    scan = (b"\x00" + bytes([255, 0, 0]) * 16) * 16
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 16, 16, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(scan)) + chunk(b"IEND", b""))


def cited_fact(message):
    if not valid_message(message) or message.get("stop_reason") != "end_turn" or "violet" not in text(message).lower():
        return False
    found = False
    for block in message["content"]:
        if not isinstance(block, dict):
            return False
        citations = block.get("citations")
        if citations is None:
            continue
        if not isinstance(citations, list):
            return False
        for citation in citations:
            if not isinstance(citation, dict):
                return False
            start, end = citation.get("start_char_index"), citation.get("end_char_index")
            index = citation.get("document_index")
            if (citation.get("type") != "char_location" or type(index) is not int or index != 0
                    or citation.get("document_title") != TITLE
                    or type(start) is not int or type(end) is not int
                    or not 0 <= start < end <= len(DOCUMENT)
                    or citation.get("cited_text") != DOCUMENT[start:end]):
                return False
            found |= "violet" in citation["cited_text"].lower()
    return found


def run(probe):
    png = red_png()
    document = DOCUMENT
    checks = {"image_color": False, "document_cited_fact": False, "citation_history_continued": False}
    hashes = {"png_sha256": hashlib.sha256(png).hexdigest(), "document_sha256": hashlib.sha256(document.encode()).hexdigest()}
    image = {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64.b64encode(png).decode()}}
    first = probe.call("synthetic-red-image", probe.body([user([image, {"type": "text", "text": "What is the single color of this image? Reply with its English color name only."}])]), valid_message, protocol_only=True)
    checks["image_color"] = bool(first and first.get("stop_reason") == "end_turn" and text(first).strip().lower().strip(".!") == "red")
    if checks["image_color"]:
        messages = [user([{"type": "document", "source": {"type": "text", "media_type": "text/plain", "data": document}, "title": TITLE, "citations": {"enabled": True}},
                          {"type": "text", "text": "What color is Lumen? Answer in English and cite the supplied document."}])]
        second = probe.call("synthetic-document-citations", probe.body(messages), valid_message, protocol_only=True)
        checks["document_cited_fact"] = cited_fact(second)
        if checks["document_cited_fact"]:
            citations = [c for b in second["content"] for c in (b.get("citations") or [])]
            hashes["citation_blocks_sha256"] = hashlib.sha256(json.dumps(citations, sort_keys=True).encode()).hexdigest()
            hashes["citation_count"] = len(citations)
            messages += [assistant(second), user("State Lumen's color again in English, citing the same supplied document.")]
            third = probe.call("citation-history-continuation", probe.body(messages), valid_message, protocol_only=True)
            checks["citation_history_continued"] = cited_fact(third)
    return {"model": probe.model, "results": evidence_rows(probe.results), "checks": checks, "fixture_facts": hashes,
            "passed": all(checks.values()), "scope": "Synthetic base64 PNG and text document; full assistant citation history reused in memory. No PDF/URL/file-ID inference."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", type=Path, required=True)
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
