import {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { 
	BlueGraphQLClient, 
	GET_PROJECT_TAGS,
	SEARCH_PROJECT_TAGS,
	TagsResponse 
} from '../graphql';

export async function searchProjectTags(
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

		const query = filter ? SEARCH_PROJECT_TAGS : GET_PROJECT_TAGS;
		const variables = filter ? { projectId, filter } : { projectId };

		const data = await BlueGraphQLClient.request<TagsResponse>(context, {
			query,
			variables,
			companyId,
		});

		const tags = data.tags || [];
		return BlueGraphQLClient.formatSearchResult(tags);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Project Tags',
				value: '',
				description: error.message,
			}],
		};
	}
}

export async function getProjectTags(
	context: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	try {
		const { companyId, projectId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId || !projectId) {
			return BlueGraphQLClient.formatPropertyOptions([], 'Please Select Company and Project First');
		}

		const data = await BlueGraphQLClient.request<TagsResponse>(context, {
			query: GET_PROJECT_TAGS,
			variables: { projectId },
			companyId,
		});

		const tags = data.tags || [];
		return BlueGraphQLClient.formatPropertyOptions(tags, 'No Tags Found');
	} catch (error) {
		return [{
			name: 'Error Loading Project Tags',
			value: '',
		}];
	}
}