export const GET_PROJECT_USERS = `
	query GetProjectUsers($projectId: ID!) {
		projectUsers(filter: { projectId: $projectId }) {
			id
			name
			email
			role
		}
	}
`;

export const SEARCH_PROJECT_USERS = `
	query SearchProjectUsers($projectId: ID!, $filter: String) {
		projectUsers(filter: { projectId: $projectId, search: $filter }) {
			id
			name
			email
			role
		}
	}
`;