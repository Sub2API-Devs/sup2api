import copy
import unittest
from unittest.mock import patch
import public_dynamic_mcp as dynamic
import public_forced_mixed as forced


def message(blocks, stop="end_turn"):
    return {"id": "msg_fixture", "type": "message", "role": "assistant", "content": blocks,
            "stop_reason": stop, "usage": {"input_tokens": 7, "output_tokens": 9}}


def dynamic_message(index, listing=True):
    sid, mid = "search_" + str(index), "mcp_" + str(index)
    blocks = ([{"type": "mcp_tool_listing", "mcp_server_name": dynamic.SERVER,
                "tools": [{"name": dynamic.TOOL, "input_schema": {"type": "object"}}]}] if listing else [])
    return message(blocks + [
        {"type": "server_tool_use", "id": sid, "name": "tool_search_tool_regex", "input": {"pattern": dynamic.TOOL}},
        {"type": "tool_search_tool_result", "tool_use_id": sid, "content": {"type": "tool_search_tool_search_result", "tool_references": [{"type": "tool_reference", "tool_name": dynamic.SERVER + "_" + dynamic.TOOL}]}},
        {"type": "mcp_tool_use", "id": mid, "name": dynamic.TOOL, "server_name": dynamic.SERVER, "input": {"repoName": dynamic.REPOSITORY}},
        {"type": "mcp_tool_result", "tool_use_id": mid, "is_error": False, "content": [{"type": "text", "text": "public fixture"}]},
        {"type": "text", "text": "done"}])


class FakeProbe:
    model = "fixture"
    def __init__(self, replies):
        self.replies, self.results, self.requests = replies, [], []
    def call(self, name, body, predicate, **kwargs):
        self.requests.append(copy.deepcopy(body))
        result = copy.deepcopy(self.replies[len(self.requests)-1])
        self.results.append({"name": name, "status": 200, "usage": result.get("usage"), "passed": predicate(result)})
        return result


class ProbeReview(unittest.TestCase):
    def setUp(self):
        self.network = patch("urllib.request.OpenerDirector.open", side_effect=AssertionError("offline tests must not network"))
        self.network.start()
        self.addCleanup(self.network.stop)

    def test_dynamic_three_bounded_calls_and_history(self):
        probe = FakeProbe([dynamic_message(0), dynamic_message(1, False), dynamic_message(2, False)])
        self.assertTrue(dynamic.run(probe)["passed"])
        self.assertEqual(len(probe.requests), 3)
        for req in probe.requests:
            self.assertNotIn("tools", req["tools"][1])
            self.assertNotIn("authorization_token", req["mcp_servers"][0])
        self.assertEqual(probe.requests[1]["messages"][:2], probe.requests[2]["messages"][:2])
        self.assertEqual(probe.requests[1]["messages"][1]["content"], dynamic_message(0)["content"])

    def test_dynamic_first_mismatch_stops(self):
        for variant in ("refusal", "missing-listing", "wrong-tool", "missing-id", "reordered", "result-error"):
            result = dynamic_message(0)
            if variant == "refusal": result["stop_reason"] = "refusal"
            if variant == "missing-listing": result["content"].pop(0)
            if variant == "wrong-tool": result["content"][3]["name"] = "private_tool"
            if variant == "missing-id": result["content"][1].pop("id")
            if variant == "reordered": result["content"][0], result["content"][1] = result["content"][1], result["content"][0]
            if variant == "result-error": result["content"][4]["is_error"] = True
            probe = FakeProbe([result])
            self.assertFalse(dynamic.run(probe)["passed"], variant)
            self.assertEqual(len(probe.requests), 1)

    def test_forced_three_and_failure(self):
        first = message([{"type": "tool_use", "id": "call_1", "name": forced.TOOL, "input": {"key": "fixture"}}], "tool_use")
        probe = FakeProbe([first, message([{"type": "text", "text": forced.MARKER}]), message([{"type": "text", "text": forced.BRANCH}])])
        self.assertTrue(forced.run(probe)["passed"])
        self.assertEqual([r["tool_choice"]["type"] for r in probe.requests], ["tool", "auto", "auto"])
        self.assertEqual(probe.requests[0]["tools"], probe.requests[2]["tools"])
        for variant in ("refusal", "wrong-name", "wrong-input", "missing-id"):
            bad = copy.deepcopy(first)
            if variant == "refusal": bad["stop_reason"] = "refusal"
            if variant == "wrong-name": bad["content"][0]["name"] = "unrelated_deferred_fixture"
            if variant == "wrong-input": bad["content"][0]["input"] = {}
            if variant == "missing-id": bad["content"][0].pop("id")
            p = FakeProbe([bad])
            self.assertFalse(forced.run(p)["passed"])
            self.assertEqual(len(p.requests), 1)

if __name__ == "__main__": unittest.main()
