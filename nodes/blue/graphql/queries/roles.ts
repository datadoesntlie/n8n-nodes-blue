export const GET_CUSTOM_ROLES = `
	query GetCustomRoles($projectId: ID!) {
		projectUserRoles(filter: { projectId: $projectId }) {
			id
			name
		}
	}
`;