import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
	INodeListSearchItems,
	NodeOperationError,
} from 'n8n-workflow';
import { BlueCredentials } from '../types';

export interface GraphQLResponse<T = any> {
	data?: T;
	errors?: Array<{ message: string }>;
}

export interface GraphQLRequestOptions {
	query: string;
	variables?: Record<string, any>;
	companyId?: string;
}

export class BlueGraphQLClient {
	private static readonly API_URL = 'https://api.blue.cc/graphql';
	private static readonly USER_AGENT = 'n8n-blue-node/1.0';

	/**
	 * Execute a GraphQL query with authentication and error handling
	 */
	static async request<T = any>(
		context: ILoadOptionsFunctions,
		options: GraphQLRequestOptions
	): Promise<T> {
		const credentials = await context.getCredentials('blueApi') as BlueCredentials;
		
		const requestOptions = {
			method: 'POST' as const,
			url: this.API_URL,
			headers: {
				'X-Bloo-Token-ID': credentials.tokenId,
				'X-Bloo-Token-Secret': credentials.tokenSecret,
				'Content-Type': 'application/json',
				'User-Agent': this.USER_AGENT,
				...(options.companyId && { 'X-Bloo-Company-ID': options.companyId }),
			},
			body: {
				query: options.query.trim(),
				variables: options.variables || {},
			},
			json: true,
		};

		try {
			const response: GraphQLResponse<T> = await context.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map(err => err.message).join(', ');
				throw new NodeOperationError(context.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			return response.data as T;
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(context.getNode(), `Request failed: ${error.message}`);
		}
	}

	/**
	 * Convert GraphQL response to n8n search result format
	 */
	static formatSearchResult(
		items: Array<{ id: string; name?: string; title?: string; description?: string }>
	): INodeListSearchResult {
		const searchItems: INodeListSearchItems[] = items.map(item => ({
			name: item.name || item.title || item.id,
			value: item.id,
			description: item.description,
		}));

		return {
			results: searchItems,
		};
	}

	/**
	 * Convert GraphQL response to n8n property options format
	 */
	static formatPropertyOptions(
		items: Array<{ id: string; name?: string; title?: string }>,
		errorMessage: string = 'No items found'
	): INodePropertyOptions[] {
		if (!items || items.length === 0) {
			return [{
				name: errorMessage,
				value: '',
			}];
		}

		return items.map(item => ({
			name: item.name || item.title || item.id,
			value: item.id,
		}));
	}

	/**
	 * Extract company ID from resource locator format
	 */
	static extractCompanyId(companyParam: any): string {
		if (typeof companyParam === 'object' && companyParam.value) {
			return companyParam.value;
		}
		if (typeof companyParam === 'string') {
			return companyParam;
		}
		return '';
	}

	/**
	 * Extract project ID from resource locator format
	 */
	static extractProjectId(projectParam: any): string {
		if (typeof projectParam === 'object' && projectParam.value) {
			return projectParam.value;
		}
		if (typeof projectParam === 'string') {
			return projectParam;
		}
		return '';
	}

	/**
	 * Get company and project IDs from current node parameters
	 */
	static getContextIds(context: ILoadOptionsFunctions): { companyId: string; projectId: string } {
		const companyParam = context.getCurrentNodeParameter('companyId');
		const projectParam = context.getCurrentNodeParameter('projectId');

		return {
			companyId: this.extractCompanyId(companyParam),
			projectId: this.extractProjectId(projectParam),
		};
	}
}