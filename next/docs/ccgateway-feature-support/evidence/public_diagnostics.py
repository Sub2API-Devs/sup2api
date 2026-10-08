"""Two real diagnostics requests, process-only key, no retries or routing overrides."""
import argparse
import hashlib
import json
import os
from pathlib import Path

from live_api_smoke import Probe, user, redact_evidence


def valid_diagnostic_message(result):
    return (result.get('type') == 'message' and result.get('role') == 'assistant'
            and isinstance(result.get('id'), str) and bool(result['id'])
            and isinstance(result.get('content'), list) and bool(result.get('stop_reason'))
            and 'diagnostics' in result
            and (result['diagnostics'] is None or isinstance(result['diagnostics'], dict)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get('SUP2API_API_KEY')
    if not key:
        parser.error('SUP2API_API_KEY is required')
    probe = Probe(args.base, key, 'claude-opus-5-5')
    messages = [user('Reply with exactly DIAGNOSTICS_READY.')]
    first = probe.call('diagnostics-initial', probe.body(messages, diagnostics={}),
                       lambda r: valid_diagnostic_message(r), protocol_only=True)
    facts = []
    if first:
        facts.append({'name': 'initial', 'message_id_sha256': hashlib.sha256(first['id'].encode()).hexdigest(),
                      'diagnostics_present': 'diagnostics' in first, 'diagnostics': first.get('diagnostics')})
        messages += [{'role': 'assistant', 'content': first['content']}, user('Reply with exactly DIAGNOSTICS_CONTINUED.')]
        second = probe.call('diagnostics-previous', probe.body(messages, diagnostics={'previous_message_id': first['id']}),
                            lambda r: valid_diagnostic_message(r), protocol_only=True)
        if second:
            facts.append({'name': 'previous', 'message_id_sha256': hashlib.sha256(second['id'].encode()).hexdigest(),
                          'diagnostics_present': 'diagnostics' in second, 'diagnostics': second.get('diagnostics')})
    report = {'model': probe.model, 'results': probe.results, 'provider_facts': facts,
              'scope': 'At most two public JSON requests; real previous message ID reused in memory. No forced account or cache-hit expectation.'}
    # Fixture responses only. Known credentials never enter the evidence file.
    encoded = json.dumps(redact_evidence(report, key), ensure_ascii=False, indent=2)
    args.output.write_text(encoded, encoding='utf-8')
    raise SystemExit(0 if len(probe.results) == 2 and all(r['passed'] for r in probe.results) else 1)


if __name__ == '__main__':
    main()
