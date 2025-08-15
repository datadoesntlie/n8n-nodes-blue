export const GET_CUSTOM_FIELDS = `
	query ListCustomFields($projectId: ID!) {
		customFields(filter: { projectId: $projectId }) {
			id
			title
			type
			options {
				id
				value
				label
			}
		}
	}
`;

export const SEARCH_CUSTOM_FIELDS = `
	query SearchCustomFields($projectId: ID!, $filter: String) {
		customFields(filter: { projectId: $projectId, search: $filter }) {
			id
			title
			type
			options {
				id
				value
				label
			}
		}
	}
`;

export const GET_CUSTOM_FIELD_OPTIONS = `
	query GetCustomFieldOptions($customFieldId: ID!) {
		customFieldOptions(filter: { customFieldId: $customFieldId }) {
			id
			value
			label
		}
	}
`;