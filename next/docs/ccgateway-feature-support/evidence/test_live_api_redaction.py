"""Offline evidence redaction regression checks; never opens the network."""
import contextlib
import io
import json
import unittest

from live_api_smoke import Probe, redact_evidence


class RedactionReview(unittest.TestCase):
    def test_beta_names_survive_but_credentials_do_not(self):
        value = {"beta": "task-budgets-2026-03-13", "detail": [
            "requires task-budgets-2026-03-13", "sk-synthetic-secret",
            "key=(sk-another-secret)", "Bearer synthetic-bearer", "known-secret"]}
        encoded = json.dumps(redact_evidence(value, "known-secret"))
        self.assertEqual(encoded.count("task-budgets-2026-03-13"), 2)
        for secret in ("sk-synthetic-secret", "sk-another-secret", "synthetic-bearer", "known-secret"):
            self.assertNotIn(secret, encoded)

    def test_http_error_summary_preserves_missing_beta_name(self):
        class Response(io.BytesIO):
            status = 400
            headers = {"Content-Type": "application/json"}

        class OfflineOpener:
            def open(self, request, timeout):
                return Response(json.dumps({"error": {"type": "invalid_request_error", "message":
                    "requires task-budgets-2026-03-13; sk-synthetic-secret; Bearer synthetic-bearer"}}).encode())

        probe = Probe("https://fixture.invalid", "known-secret", "fixture")
        probe.opener = OfflineOpener()
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertIsNone(probe.call("fixture", {}, lambda _: True))
        row = probe.results[0]
        self.assertEqual(row["status"], 400)
        self.assertIn("task-budgets-2026-03-13", row["error_summary"])
        self.assertNotIn("synthetic-secret", json.dumps(row))
        self.assertNotIn("synthetic-bearer", json.dumps(row))


if __name__ == "__main__":
    unittest.main()
