package updater

import "testing"

func TestAuditActions(t *testing.T) {
	for _, tc := range []struct{ method, path, action string }{
		{"POST", "/api/v1/system/upgrades", "system.upgrade.create"},
		{"POST", "/api/v1/system/upgrades/:id/rollback", "system.upgrade.rollback"},
		{"POST", "/api/v1/system/nodes/:id/disable", "system.node.disable"},
		{"POST", "/api/v1/system/upgrades/preflight", ""},
		{"GET", "/api/v1/system/upgrades", ""},
		{"PUT", "/api/v1/system/offload", "system.offload.update"},
	} {
		if action, _ := auditAction(tc.method, tc.path); action != tc.action {
			t.Fatalf("%s %s: %s", tc.method, tc.path, action)
		}
	}
}
