import {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { 
	BlueGraphQLClient, 
	GET_PROJECT_USERS,
	SEARCH_PROJECT_USERS,
	ProjectUsersResponse 
} from '../graphql';

export async function searchProjectUsers(
	context: ILoadOptionsFunctions,
	filter?: string
): Promise<INodeListSearchResult> {
	try {
		const { companyId, projectId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId || !projectId) {
			return {
				results: [{
					name: 'Please Select Company and Project First',
					value: '',
				}],
			};
		}

		const query = filter ? SEARCH_PROJECT_USERS : GET_PROJECT_USERS;
		const variables = filter ? { projectId, filter } : { projectId };

		const data = await BlueGraphQLClient.request<ProjectUsersResponse>(context, {
			query,
			variables,
			companyId,
		});

		const users = data.projectUsers || [];
		return BlueGraphQLClient.formatSearchResult(users);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Project Users',
				value: '',
				description: error.message,
			}],
		};
	}
}

export async function getProjectUsers(
	context: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	try {
		const { companyId, projectId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId || !projectId) {
			return BlueGraphQLClient.formatPropertyOptions([], 'Please Select Company and Project First');
		}

		const data = await BlueGraphQLClient.request<ProjectUsersResponse>(context, {
			query: GET_PROJECT_USERS,
			variables: { projectId },
			companyId,
		});

		const users = data.projectUsers || [];
		return BlueGraphQLClient.formatPropertyOptions(users, 'No Users Found');
	} catch (error) {
		return [{
			name: 'Error Loading Project Users',
			value: '',
		}];
	}
}