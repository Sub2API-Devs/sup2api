"""Offline four-request budget/inline history review. Never opens a network."""
import copy
import unittest
from unittest.mock import patch

from public_helper_budget import BETA, BRANCH, MARKER, TOOL, run


def message(content, stop="end_turn"):
    return {"type": "message", "id": "msg_fixture", "role": "assistant",
            "content": content, "stop_reason": stop}


FIRST = message([
    {"type": "thinking", "thinking": "fixture thought", "signature": "fixture signature"},
    {"type": "server_tool_use", "id": "search_fixture", "name": "tool_search", "input": {}},
    {"type": "tool_search_tool_result", "tool_use_id": "search_fixture", "content": []},
    {"type": "tool_use", "id": "external_fixture_id", "name": TOOL, "input": {"key": "fixture"}},
], "tool_use")
SECOND = message([
    {"type": "thinking", "thinking": "continuation thought", "signature": "second signature"},
    {"type": "text", "text": MARKER},
])


def sse(value):
    envelope = copy.deepcopy(value)
    envelope["content"] = []
    envelope["stop_reason"] = None
    events = [{"type": "message_start", "message": envelope}]
    for index, block in enumerate(value["content"]):
        events += [{"type": "content_block_start", "index": index, "content_block": block},
                   {"type": "content_block_stop", "index": index}]
    events += [{"type": "message_delta", "delta": {"stop_reason": value["stop_reason"]}},
               {"type": "message_stop"}]
    return {"events": events}


class FakeProbe:
    model = "offline-fixture"

    def __init__(self, failure_at=None, failure=None):
        self.calls, self.results = [], []
        self.failure_at, self.failure = failure_at, failure

    def call(self, name, body, check, *, protocol_only, beta):
        self.calls.append((name, copy.deepcopy(body), protocol_only, beta))
        index = len(self.calls)
        if index > 4:
            raise AssertionError("exceeded public request budget")
        values = [FIRST, SECOND, sse(message([{"type": "text", "text": MARKER}])),
                  message([{"type": "text", "text": BRANCH}])]
        value = copy.deepcopy(self.failure if index == self.failure_at else values[index - 1])
        passed = value is not None and check(value)
        self.results.append({"name": name, "protocol_passed": passed, "passed": passed})
        return value if passed else None


class PublicHelperBudgetReview(unittest.TestCase):
    def invoke(self, probe, inline=False):
        with patch("socket.socket", side_effect=AssertionError("network forbidden")):
            return run(probe, inline=inline)

    def test_default_retains_four_requests_without_inline_operations(self):
        probe = FakeProbe()
        self.assertTrue(self.invoke(probe)["passed"])
        self.assertEqual(len(probe.calls), 4)
        for _, body, protocol_only, beta in probe.calls:
            self.assertTrue(protocol_only)
            self.assertEqual(beta, BETA)
            self.assertFalse(any(m["role"] == "system" for m in body["messages"]))

    def test_inline_history_ids_betas_rollback_and_complete_assistant_blocks(self):
        probe = FakeProbe()
        report = self.invoke(probe, inline=True)
        self.assertTrue(report["passed"])
        self.assertFalse(report["checks"]["internal_rounds_verified"])
        self.assertFalse(report["checks"]["durable_receipts_verified"])
        bodies = [call[1] for call in probe.calls]
        for _, body, protocol_only, beta in probe.calls:
            self.assertTrue(protocol_only)
            self.assertEqual(beta, BETA + ",inline-tools-2026-09-15")
            self.assertEqual([tool["name"] for tool in body["tools"]], [TOOL])
        first, second, third, fourth = [body["messages"] for body in bodies]
        self.assertEqual(first[1]["content"][0]["tool"]["definition"]["name"], "spare_fixture")
        self.assertEqual(first[1]["content"][0]["type"], "tool_addition")
        for history, marker in ((second, MARKER), (fourth, BRANCH)):
            self.assertEqual(history[2], {"role": "assistant", "content": FIRST["content"]})
            self.assertEqual(history[3]["content"], [{"type": "tool_result", "tool_use_id": "external_fixture_id", "content": marker}])
        self.assertEqual(second[4], {"role": "system", "content": [{"type": "tool_removal", "tool": {"type": "tool_reference", "name": TOOL}}]})
        self.assertEqual(third[:len(second)], second)
        self.assertEqual(third[len(second)], {"role": "assistant", "content": SECOND["content"]})
        self.assertEqual(fourth[:2], first)
        self.assertEqual(len(fourth), 4)
        self.assertFalse(any(block.get("type") == "tool_removal" for msg in fourth for block in msg["content"] if isinstance(block, dict)))
        for index, body in enumerate(bodies):
            self.assertEqual(body["stream"], index == 2)
            self.assertEqual("task_budget" in body["output_config"], index != 2)

    def test_first_error_or_refusal_stops_at_each_stage(self):
        refusal = message([{"type": "text", "text": MARKER}], "refusal")
        for inline in (False, True):
            for stage in range(1, 5):
                for failure in (None, refusal, message([{"type": "text", "text": "wrong marker"}])):
                    with self.subTest(inline=inline, stage=stage, failure=failure):
                        probe = FakeProbe(stage, failure)
                        self.assertFalse(self.invoke(probe, inline)["passed"])
                        self.assertEqual(len(probe.calls), stage)

    def test_bad_tool_handoffs_stop_before_result_request(self):
        for field, value in (("id", ""), ("id", 42), ("name", "spare_fixture"), ("input", {"key": "wrong"})):
            first = copy.deepcopy(FIRST)
            first["content"][-1][field] = value
            probe = FakeProbe(1, first)
            self.assertFalse(self.invoke(probe, True)["passed"])
            self.assertEqual(len(probe.calls), 1)


if __name__ == "__main__":
    unittest.main()
