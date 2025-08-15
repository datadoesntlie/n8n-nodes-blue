export const GET_FILTERED_PROJECTS = `
	query FilteredProjectList($companyId: ID!, $filter: String) {
		projectList(filter: { companyId: $companyId, search: $filter }) {
			items {
				id
				name
				description
				status
				createdAt
			}
		}
	}
`;

export const GET_PROJECT_TEMPLATES = `
	query SearchProjectTemplates($companyId: ID!, $filter: String) {
		projectList(filter: { companyId: $companyId, search: $filter, isTemplate: true }) {
			items {
				id
				name
				description
				status
			}
		}
	}
`;

export const GET_PROJECT_LISTS = `
	query GetProjectLists($projectId: ID!) {
		todoLists(filter: { projectId: $projectId }) {
			id
			title
			description
			position
		}
	}
`;