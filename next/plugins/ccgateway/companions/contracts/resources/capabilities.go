package resources

// These headers are an authenticated core-to-Worker contract, never public
// client configuration. The core strips all inbound resource headers first.
const (
	ResourceOutputsHeader       = "X-CCGateway-Resource-Outputs"
	ResourceRefsHeader          = "X-CCGateway-Resource-Refs"
	ResourceContextsHeader      = "X-CCGateway-Resource-Contexts"
	ResourceSkillVersionsHeader = "X-CCGateway-Resource-Skill-Versions"
	KindFile                    = "file"
	KindContainer               = "container"
	KindSkill                   = "skill"
)

type AdmissionReference struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
}

type AdmissionContext struct {
	Kind       string `json:"kind"`
	ParentID   string `json:"parent_id"`
	ResourceID string `json:"resource_id"`
}

type AdmissionSkillVersion struct {
	SkillID string `json:"skill_id"`
	Version string `json:"version"`
}
