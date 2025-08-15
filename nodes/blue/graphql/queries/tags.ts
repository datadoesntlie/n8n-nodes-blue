export const GET_PROJECT_TAGS = `
	query ListOfTagsWithinProjects($projectId: ID!) {
		tags(filter: { projectId: $projectId }) {
			id
			title
			color
		}
	}
`;

export const SEARCH_PROJECT_TAGS = `
	query SearchProjectTags($projectId: ID!, $filter: String) {
		tags(filter: { projectId: $projectId, search: $filter }) {
			id
			title
			color
		}
	}
`;