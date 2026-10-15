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

func TestAttachmentHierarchyConflicts(t *testing.T) {
	for parent, children := range AttachmentChildren {
		for _, child := range children {
			if ValidateReplaceClientAttachments([]string{parent}, []string{child}) == nil || ValidateReplaceClientAttachments([]string{child}, []string{parent}) == nil {
				t.Fatalf("parent/child conflict accepted: %s/%s", parent, child)
			}
		}
		if ValidateReplaceClientAttachments(children[:1], children[1:]) != nil {
			t.Fatal(parent)
		}
	}
	if !AttachmentContains("environment", "shell") {
		t.Fatal("nested environment field missing")
	}
}
