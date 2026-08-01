package tlsfingerprint

import (
	"testing"

	utls "github.com/refraction-networking/utls"
)

func TestBuildClientHelloSpecUsesImmutableProfileValues(t *testing.T) {
	profile := &Profile{
		CipherSuites: []uint16{0x1301}, Curves: []uint16{uint16(utls.X25519)},
		PointFormats: []uint16{0}, SignatureAlgorithms: []uint16{0x0403},
		ALPNProtocols: []string{"http/1.1"}, SupportedVersions: []uint16{utls.VersionTLS13},
		KeyShareGroups: []uint16{uint16(utls.X25519)}, PSKModes: []uint16{uint16(utls.PskModeDHE)},
		Extensions: []uint16{0, 10, 11, 13, 16, 43, 45, 51},
	}
	spec := buildClientHelloSpecFromProfile(profile)
	if len(spec.CipherSuites) != 1 || spec.CipherSuites[0] != 0x1301 {
		t.Fatalf("cipher suites = %v", spec.CipherSuites)
	}
	if len(spec.Extensions) != len(profile.Extensions) {
		t.Fatalf("extensions=%d want=%d", len(spec.Extensions), len(profile.Extensions))
	}
	profile.CipherSuites[0] = 0
	if spec.CipherSuites[0] != 0x1301 {
		t.Fatal("ClientHello spec aliases the mutable execution profile")
	}
}

func TestGREASEValueRecognition(t *testing.T) {
	if !isGREASEValue(0x0a0a) || !isGREASEValue(0xfafa) || isGREASEValue(0x1301) {
		t.Fatal("GREASE value recognition is incorrect")
	}
}
