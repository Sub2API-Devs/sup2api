package core

import "testing"

func TestParseProxyURL(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		wantUser string
		wantPass string
		wantErr  bool
	}{
		{
			// Some providers put routing options in the username with "___":
			// it is the literal username, sent as is.
			name:     "triple underscore kept",
			raw:      "https://erio___accel.ipflygates.com___5001___gXJTnq2rsQhI2i:FgIkcAOi@host.clicodeplus.com:8443",
			wantUser: "erio___accel.ipflygates.com___5001___gXJTnq2rsQhI2i",
			wantPass: "FgIkcAOi",
		},
		{
			name:     "normal colon in password",
			raw:      "https://user:pass:with:colons@host:1080",
			wantUser: "user",
			wantPass: "pass:with:colons",
		},
		{
			name:     "no credentials",
			raw:      "socks5://host:1080",
			wantUser: "",
			wantPass: "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			spec, err := ParseProxyURL(tt.raw)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseProxyURL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}
			if spec.Username != tt.wantUser {
				t.Errorf("Username = %q, want %q", spec.Username, tt.wantUser)
			}
			if spec.Password != tt.wantPass {
				t.Errorf("Password = %q, want %q", spec.Password, tt.wantPass)
			}
		})
	}
}
