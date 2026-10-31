package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestNotificationDeclaration(t *testing.T) {
	for _, name := range []string{"valid", "no_capability", "no_declaration", "no_channels", "bad_id", "duplicate", "no_label", "bad_recipient"} {
		t.Run(name, func(t *testing.T) {
			ch := manifest.NotificationChannel{ID: "email", Label: manifest.LocalizedText{"en": "Email"}, Recipient: manifest.RecipientEmail}
			m := &manifest.Manifest{Capabilities: []manifest.Capability{{ID: manifest.CapNotifyChannel}}, Notifications: &manifest.Notifications{Channels: []manifest.NotificationChannel{ch}}}
			v := &validator{m: m, perms: map[string]*manifest.HostPermission{}}
			c := &m.Notifications.Channels[0]
			switch name {
			case "no_capability":
				m.Capabilities = nil
			case "no_declaration":
				m.Notifications = nil
			case "no_channels":
				m.Notifications.Channels = nil
			case "bad_id":
				c.ID = "E-mail"
			case "duplicate":
				m.Notifications.Channels = append(m.Notifications.Channels, ch)
			case "no_label":
				c.Label = nil
			case "bad_recipient":
				c.Recipient = "phone"
			}
			v.notifications()
			if name == "valid" && len(v.errs) != 0 {
				t.Fatal(v.errs)
			}
			if name != "valid" && len(v.errs) == 0 {
				t.Fatal("invalid notifications accepted")
			}
		})
	}
}
