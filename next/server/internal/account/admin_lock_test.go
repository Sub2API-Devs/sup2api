package account

import (
	"fmt"
	"net/http"
	"testing"
)

// W1-F10: an account an administrator disabled is locked for its creator
// (PATCH status active and reset-status answer 403 account_locked_by_admin)
// until an administrator enables or resets it; a disable of the creator's own
// stays the creator's to undo.
func TestAdminLock(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	admin := e.uid
	alice := e.addUser("alice@x.com")
	authz.keys[admin], authz.keys[alice] = adminKeys, supplierKeys

	id := int64(e.createAs(alice, "alice's", nil)["id"].(float64))
	path := fmt.Sprintf("/accounts/%d", id)
	patch := func(uid int64, body map[string]any) (int, map[string]any) {
		t.Helper()
		return e.doAs(uid, "PATCH", path, body)
	}
	// state reads the account as the administrator.
	state := func() (status, reason string, locked bool) {
		t.Helper()
		code, out := e.doAs(admin, "GET", path, nil)
		if code != 200 {
			t.Fatalf("get: %d %v", code, out)
		}
		d := data(out)
		return d["status"].(string), d["status_reason"].(string), d["admin_locked"].(bool)
	}
	want := func(step, status, reason string, locked bool) {
		t.Helper()
		if s, r, l := state(); s != status || r != reason || l != locked {
			t.Fatalf("%s: status %q reason %q locked %v, want %q %q %v", step, s, r, l, status, reason, locked)
		}
	}
	refused := func(step string, code int, out map[string]any) {
		t.Helper()
		errBody, _ := out["error"].(map[string]any)
		if code != http.StatusForbidden || errBody["code"] != "account_locked_by_admin" {
			t.Fatalf("%s: %d %v", step, code, out)
		}
	}
	ok := func(step string, code int, out map[string]any) {
		t.Helper()
		if code != 200 {
			t.Fatalf("%s: %d %v", step, code, out)
		}
	}

	// The creator's own disable is the creator's to undo, by either route.
	code, out := patch(alice, map[string]any{"status": "disabled"})
	ok("owner disables", code, out)
	if data(out)["admin_locked"] != false {
		t.Fatalf("owner disable must not lock: %v", data(out))
	}
	want("owner disabled", "disabled", "disabled by owner", false)
	code, out = patch(alice, map[string]any{"status": "active"})
	ok("owner enables own disable", code, out)
	code, out = patch(alice, map[string]any{"status": "disabled"})
	ok("owner disables again", code, out)
	code, out = e.doAs(alice, "POST", path+"/reset-status", nil)
	ok("owner resets own disable", code, out)
	want("owner reset", "active", "", false)

	// The administrator disables it: locked for the creator.
	code, out = patch(admin, map[string]any{"status": "disabled"})
	ok("admin disables", code, out)
	want("admin disabled", "disabled", "disabled by administrator", true)
	code, out = patch(alice, map[string]any{"status": "active"})
	refused("owner enables a locked account", code, out)
	code, out = e.doAs(alice, "POST", path+"/reset-status", nil)
	refused("owner resets a locked account", code, out)
	want("still locked", "disabled", "disabled by administrator", true)
	// The lock is on enabling only: other fields save, the form sent back as
	// it is (status disabled) included.
	code, out = patch(alice, map[string]any{"name": "renamed", "status": "disabled"})
	ok("owner edits a locked account", code, out)
	want("after the edit", "disabled", "disabled by administrator", true)

	// The administrator enables it: the creator runs it again.
	code, out = patch(admin, map[string]any{"status": "active"})
	ok("admin enables", code, out)
	want("admin enabled", "active", "", false)
	code, out = patch(alice, map[string]any{"status": "disabled"})
	ok("owner disables after the unlock", code, out)
	code, out = patch(alice, map[string]any{"status": "active"})
	ok("owner enables after the unlock", code, out)

	// An account its owner disabled, disabled by the administrator as well,
	// is taken over; the administrator's reset unlocks like enabling.
	code, out = patch(alice, map[string]any{"status": "disabled"})
	ok("owner disables", code, out)
	code, out = patch(admin, map[string]any{"status": "disabled"})
	ok("admin disables a disabled account", code, out)
	want("taken over", "disabled", "disabled by administrator", true)
	code, out = patch(alice, map[string]any{"status": "active"})
	refused("owner enables a taken over account", code, out)
	code, out = e.doAs(admin, "POST", path+"/reset-status", nil)
	ok("admin resets", code, out)
	want("admin reset", "active", "", false)

	// The administrator's own account is not locked by their disable.
	own := int64(e.createAs(admin, "admin's", nil)["id"].(float64))
	code, out = e.doAs(admin, "PATCH", fmt.Sprintf("/accounts/%d", own), map[string]any{"status": "disabled"})
	ok("admin disables their own", code, out)
	if d := data(out); d["admin_locked"] != false || d["status_reason"] != "disabled by administrator" {
		t.Fatalf("admin's own account: %v", d)
	}
}
