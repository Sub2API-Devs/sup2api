package check

import (
	"fmt"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func (v *validator) routes() {
	if len(v.m.Routes) == 0 {
		return
	}
	v.needCap("routes", manifest.CapHTTPRoutes)
	seen := map[string]bool{}
	for i, r := range v.m.Routes {
		f := fmt.Sprintf("routes[%d]", i)
		method := strings.ToUpper(r.Method)
		if !allowedMethods[method] {
			v.add(f+".method", "invalid", "unsupported method %q", r.Method)
		}
		if !strings.HasPrefix(r.Path, "/") {
			v.add(f+".path", "invalid_path", "path must start with /")
		}
		sig := method + " " + NormalizeRoutePath(r.Path)
		if seen[sig] {
			v.add(f+".path", "duplicate", "route %s %s declared twice", method, r.Path)
		}
		seen[sig] = true
		switch r.Scope {
		case "admin", "user":
			if r.Permission == "" {
				v.add(f+".permission", "required", "permission is required for %s routes", r.Scope)
			} else if !v.userPerm(r.Permission) {
				v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", r.Permission)
			}
		case "public", "webhook":
		default:
			v.add(f+".scope", "invalid", "scope must be admin, user, public or webhook")
			continue
		}
		v.needPerm(f+".scope", "routes."+r.Scope, r.Scope+" routes")
	}
}
