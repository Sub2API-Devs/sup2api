"""Pure rollout guardrail tests. Docker and production services are never used."""

import copy
import importlib.util
from pathlib import Path
import unittest
from unittest import mock


spec = importlib.util.spec_from_file_location(
    "roll_gateway", Path(__file__).with_name("roll-gateway.py")
)
roll = importlib.util.module_from_spec(spec)
spec.loader.exec_module(roll)


class ComposeGuardTests(unittest.TestCase):
    def setUp(self):
        self.current = {
            "services": {
                node: {
                    "image": "old:unique",
                    "environment": {"SECRET": "example-only"},
                    "volumes": ["state:/data"],
                }
                for node in roll.ORDER
            },
            "x-node": {"image": "old:unique", "cpus": 2},
            "volumes": {"state": {}},
        }
        self.pending = copy.deepcopy(self.current)
        self.pending["x-node"]["image"] = "new:unique"
        for node in roll.ORDER:
            self.pending["services"][node]["image"] = "new:unique"

    def test_only_gateway_and_anchor_images_may_change(self):
        original = copy.deepcopy(self.current)
        roll.verify_config(self.current, self.pending, "new:unique")
        self.assertEqual(self.current, original)
        self.assertEqual(self.pending["x-node"]["image"], "new:unique")

    def test_environment_and_volume_changes_are_rejected(self):
        for field, value in (("environment", {}), ("volumes", [])):
            with self.subTest(field=field):
                pending = copy.deepcopy(self.pending)
                pending["services"][roll.ORDER[0]][field] = value
                with self.assertRaises(roll.RollError):
                    roll.verify_config(self.current, pending, "new:unique")

    def test_other_anchor_changes_are_rejected(self):
        self.pending["x-node"]["cpus"] = 4
        with self.assertRaises(roll.RollError):
            roll.verify_config(self.current, self.pending, "new:unique")

    def test_wrong_target_image_is_rejected(self):
        for location in ("service", "anchor"):
            with self.subTest(location=location):
                pending = copy.deepcopy(self.pending)
                if location == "service":
                    pending["services"][roll.ORDER[0]]["image"] = "unexpected:unique"
                else:
                    pending["x-node"]["image"] = "unexpected:unique"
                with self.assertRaises(roll.RollError):
                    roll.verify_config(self.current, pending, "new:unique")


class RollbackImageGuardTests(unittest.TestCase):
    running_id = "sha256:" + "a" * 64
    fallback_id = "sha256:" + "b" * 64

    @staticmethod
    def hashes(letter):
        return "\n".join(letter * 64 + "  " + path for path in roll.ROLLBACK_BINARIES)

    def image_lookup(self, image):
        if image == self.running_id:
            raise roll.RollError("injected missing image")
        self.assertEqual(image, "old:unique")
        return self.fallback_id

    def test_missing_image_without_explicit_fallback_is_rejected(self):
        with mock.patch.object(roll, "image_id", side_effect=self.image_lookup), mock.patch.object(roll, "run") as run:
            with self.assertRaises(roll.RollError):
                roll.rollback_image("sup2api-1", self.running_id, None)
            run.assert_not_called()

    def test_matching_fallback_records_hashes_and_uses_isolated_container(self):
        with mock.patch.object(roll, "image_id", side_effect=self.image_lookup), mock.patch.object(roll, "run", return_value=self.hashes("c")) as run:
            image, proof = roll.rollback_image("sup2api-1", self.running_id, "old:unique")
        self.assertEqual(image, self.fallback_id)
        self.assertEqual(proof["verified_binaries"], {path: "c" * 64 for path in roll.ROLLBACK_BINARIES})
        self.assertEqual(run.call_count, 2)
        self.assertEqual(run.call_args_list[0].args[0][:3], ["docker", "exec", "sup2api-managed-sup2api-1-1"])
        verifier = run.call_args_list[1].args[0]
        self.assertEqual(verifier[:2], ["docker", "run"])
        self.assertEqual(verifier[verifier.index("--network") + 1], "none")
        self.assertEqual(verifier[verifier.index("--pull") + 1], "never")
        self.assertIn("--rm", verifier)
        self.assertIn("--read-only", verifier)
        self.assertIn(self.fallback_id, verifier)

    def test_mismatched_fallback_is_rejected(self):
        with mock.patch.object(roll, "image_id", side_effect=self.image_lookup), mock.patch.object(roll, "run", side_effect=[self.hashes("c"), self.hashes("d")]):
            with self.assertRaises(roll.RollError):
                roll.rollback_image("sup2api-1", self.running_id, "old:unique")

    def test_available_original_image_never_uses_fallback(self):
        with mock.patch.object(roll, "image_id", return_value=self.running_id) as inspect, mock.patch.object(roll, "run") as run:
            image, proof = roll.rollback_image("sup2api-1", self.running_id, "old:unique")
        self.assertEqual(image, self.running_id)
        self.assertEqual(proof, {})
        inspect.assert_called_once_with(self.running_id)
        run.assert_not_called()


class ClusterGuardTests(unittest.TestCase):
    def test_active_plan_blocks_rollout(self):
        for active in (1, 2):
            with self.subTest(active=active), self.assertRaises(roll.RollError):
                roll.validate_cluster({"active": active})

    def test_unchanged_idle_cluster_is_accepted(self):
        nodes = [{"id": node} for node in roll.ORDER]
        result = roll.validate_cluster({"active": 0, "primary": "sup2api-1", "baseline": "release", "nodes": nodes}, "release")
        self.assertEqual(set(result), set(roll.ORDER))

    def test_baseline_change_is_rejected(self):
        with self.assertRaises(roll.RollError):
            roll.validate_cluster({"active": 0, "primary": "sup2api-1", "baseline": "changed"}, "expected")


class FinalHealthGuardTests(unittest.TestCase):
    def setUp(self):
        self.old = {node: {"boot": "old"} for node in roll.ORDER}
        self.nodes = {node: {"id": node, "boot": "new", "core_boot": "core",
                            "enabled": True, "ready": True, "mode": "local", "release": "baseline"}
                      for node in roll.ORDER}
        self.containers = {node: {"running": True, "image": "target"} for node in roll.ORDER}
        self.http = {node: 401 for node in roll.ORDER}

    def verify(self):
        state = {"active": 0, "primary": "sup2api-1", "baseline": "baseline", "nodes": list(self.nodes.values())}
        with mock.patch.object(roll, "cluster_state", return_value=state), \
                mock.patch.object(roll, "container_state", side_effect=self.containers.__getitem__), \
                mock.patch.object(roll, "entrance_status", side_effect=self.http.__getitem__):
            roll.verify_completed_cluster("baseline", "target", self.old)

    def test_all_four_healthy_nodes_are_accepted(self):
        self.verify()

    def test_previously_verified_follower_failure_is_rejected(self):
        for field, value in (("ready", False), ("mode", "forward"), ("release", "other"), ("boot", "old")):
            with self.subTest(field=field):
                previous = self.nodes["sup2api-2"][field]
                self.nodes["sup2api-2"][field] = value
                with self.assertRaises(roll.RollError):
                    self.verify()
                self.nodes["sup2api-2"][field] = previous

    def test_stopped_or_wrong_image_follower_is_rejected(self):
        for field, value in (("running", False), ("image", "wrong")):
            with self.subTest(field=field):
                previous = self.containers["sup2api-3"][field]
                self.containers["sup2api-3"][field] = value
                with self.assertRaises(roll.RollError):
                    self.verify()
                self.containers["sup2api-3"][field] = previous

    def test_failed_entrance_on_any_node_is_rejected(self):
        for node in roll.ORDER:
            with self.subTest(node=node):
                self.http[node] = 503
                with self.assertRaises(roll.RollError):
                    self.verify()
                self.http[node] = 401


if __name__ == "__main__":
    unittest.main()
