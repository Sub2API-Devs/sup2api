package features

import "testing"

func TestIndependentEnvironmentAttachmentValidation(t *testing.T) {
	parts := []string{"working_directory", "platform", "environment_update"}
	if err := ValidateEraseClientAttachments(parts); err != nil {
		t.Fatal(err)
	}
	if err := ValidateReplaceClientAttachments(parts[:1], parts[1:]); err != nil {
		t.Fatal(err)
	}
	for _, part := range parts {
		for _, pair := range [][2]string{{part, part}, {part, "environment"}, {"environment", part}} {
			if ValidateReplaceClientAttachments([]string{pair[0]}, []string{pair[1]}) == nil {
				t.Fatalf("accepted overlapping replace %s and erase %s", pair[0], pair[1])
			}
		}
	}
}
