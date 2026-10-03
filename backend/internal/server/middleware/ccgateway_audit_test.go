package middleware

import "testing"

func TestCCGatewayCredentialBodiesAreOmitted(t *testing.T) {
	for _, route := range []string{"PUT /api/v1/admin/plugins/builtin/ccgateway/remote", "PUT /api/v1/admin/plugins/builtin/ccgateway/proxy", "POST /api/v1/admin/plugins/builtin/ccgateway/auth/:action"} {
		if _, ok := auditBodyOmittedRoutes[route]; !ok {
			t.Fatalf("credential body must not be audited: %s", route)
		}
	}
}
