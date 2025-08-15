import {
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';
import { 
	BlueGraphQLClient, 
	GET_FILTERED_PROJECTS, 
	GET_PROJECT_TEMPLATES,
	GET_PROJECT_LISTS,
	ProjectListResponse,
	TodoListsResponse 
} from '../graphql';

export async function searchProjects(
	context: ILoadOptionsFunctions,
	filter?: string
): Promise<INodeListSearchResult> {
	try {
		const { companyId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId) {
			return {
				results: [{
					name: 'Please Select Company First',
					value: '',
				}],
			};
		}

		const data = await BlueGraphQLClient.request<ProjectListResponse>(context, {
			query: GET_FILTERED_PROJECTS,
			variables: { companyId, filter },
			companyId,
		});

		const projects = data.projectList?.items || [];
		return BlueGraphQLClient.formatSearchResult(projects);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Projects',
				value: '',
				description: error.message,
			}],
		};
	}
}

export async function searchProjectTemplates(
	context: ILoadOptionsFunctions,
	filter?: string
): Promise<INodeListSearchResult> {
	try {
		const { companyId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId) {
			return {
				results: [{
					name: 'Please Select Company First',
					value: '',
				}],
			};
		}

		const data = await BlueGraphQLClient.request<ProjectListResponse>(context, {
			query: GET_PROJECT_TEMPLATES,
			variables: { companyId, filter },
			companyId,
		});

		const templates = data.projectList?.items || [];
		return BlueGraphQLClient.formatSearchResult(templates);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Project Templates',
				value: '',
				description: error.message,
			}],
		};
	}
}

export async function searchTodoLists(
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

		const data = await BlueGraphQLClient.request<TodoListsResponse>(context, {
			query: GET_PROJECT_LISTS,
			variables: { projectId },
			companyId,
		});

		const todoLists = data.todoLists || [];
		
		// Apply client-side filtering if filter is provided
		const filteredLists = filter 
			? todoLists.filter(list => 
				list.title.toLowerCase().includes(filter.toLowerCase())
			)
			: todoLists;

		return BlueGraphQLClient.formatSearchResult(filteredLists);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Todo Lists',
				value: '',
				description: error.message,
			}],
		};
	}
}