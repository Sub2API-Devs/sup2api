package ccgateway

import "fmt"

func validateAttachmentPolicy(p RequestPolicy) error {
	for k, v := range p.EnvironmentFields {
		if (k != "workingDirectory" && k != "platform") || (v != "client" && v != "gateway") {
			return fmt.Errorf("invalid environment field policy: %s", k)
		}
	}
	known := map[string]bool{"environment": true, "model": true, "total_tokens_reminder": true, "session_context": true, "date": true}
	for k, v := range p.AttachmentSources {
		if !known[k] || (v != "client" && v != "gateway" && v != "both") {
			return fmt.Errorf("invalid attachment source override: %s", k)
		}
	}
	for _, v := range []string{p.UnknownClientAttachment, p.UnknownGatewayAttachment} {
		if v != "" && v != "pass" && v != "ignore" {
			return fmt.Errorf("invalid unknown attachment policy")
		}
	}
	return nil
}
