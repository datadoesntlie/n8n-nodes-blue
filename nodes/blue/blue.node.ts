import {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
	NodeConnectionType,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { operations } from './operations';
import { BlueOperationContext } from './types';
import { properties } from './descriptions/description';

export class Blue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blue',
		name: 'blue',
		icon: 'file:blue.svg',
		group: ['transform'],
		version: 1,
		description: 'Interact with Blue Project Management via GraphQL API',
		defaults: {
			name: 'Blue',
		},
		inputs: ['main'] as NodeConnectionType[],
		outputs: ['main'] as NodeConnectionType[],
		credentials: [
			{
				name: 'blueApi',
				required: true,
			},
		],
		properties: properties as INodeProperties[],
	};

	methods = {
		listSearch: {
			searchCompanies: this.searchCompanies,
			searchProjects: this.searchProjects,
			searchProjectTemplates: this.searchProjectTemplates,
			searchTodoLists: this.searchTodoLists,
			searchProjectUsers: this.searchProjectUsers,
			searchProjectTags: this.searchProjectTags,
			searchCustomFields: this.searchCustomFields,
		},
		loadOptions: {
			getProjectUsers: this.getProjectUsers,
			getProjectTags: this.getProjectTags,
			getCustomFields: this.getCustomFields,
			getCustomFieldsWithType: this.getCustomFieldsWithType,
			getCustomFieldOptions: this.getCustomFieldOptions,
			getCustomRoles: this.getCustomRoles,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as IDataObject;

				// Get the operation handler
				const operationHandler = operations[operation];
				if (!operationHandler) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Create operation context
				const context: BlueOperationContext = {
					executeFunctions: this,
					itemIndex: i,
					additionalOptions,
				};

				// Execute the operation
				const result = await operationHandler.execute(context);

				if (result.success) {
					returnData.push({
						json: result.data,
						pairedItem: { item: i },
					});
				} else {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: result.error },
							pairedItem: { item: i },
						});
					} else {
						throw new NodeApiError(this.getNode(), {
							message: result.error || 'Unknown error',
							description: `An error occurred while executing the ${operation} operation`,
						});
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
					returnData.push({
						json: { error: errorMessage },
						pairedItem: { item: i },
					});
				} else {
					if (error instanceof NodeApiError || error instanceof NodeOperationError) {
						throw error;
					}
					throw new NodeApiError(this.getNode(), {
						message: error instanceof Error ? error.message : 'Unknown error',
						description: 'An error occurred while executing the Blue node',
					});
				}
			}
		}

		return [returnData];
	}

	// Resource locator methods for dynamic dropdowns
	async searchCompanies(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			// Use the same query as GetCompaniesOperation
			const query = `query GetCompanies {
				companyList {
					items {
						id
						name
						slug
						description
						createdAt
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
					'Content-Type': 'application/json',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const companies = response.data?.companyList?.items || [];
			const results: INodeListSearchItems[] = companies
				.filter((company: any) => 
					!filter || 
					company.name.toLowerCase().includes(filter.toLowerCase()) ||
					company.slug.toLowerCase().includes(filter.toLowerCase())
				)
				.map((company: any) => ({
					name: `${company.name} (${company.slug})`,
					value: company.id,
				}));

			return { results };
		} catch (error) {
			return { 
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async searchProjects(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const companyId = this.getNodeParameter('companyId') as any;
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyId === 'object' && companyId.value) {
				actualCompanyId = companyId.value;
			} else if (typeof companyId === 'string') {
				actualCompanyId = companyId;
			}

			if (!actualCompanyId) {
				return {
					results: [{
						name: 'Please Select a Company First',
						value: '',
					}]
				};
			}

			// Use the same query as GetProjectsOperation
			const query = `query FilteredProjectList {
				projectList(
					filter: {
						companyIds: ["${actualCompanyId}"]
						archived: false
						isTemplate: false
					}
					sort: [position_ASC, name_ASC]
					skip: 0
					take: 50
				) {
					items {
						id
						name
						slug
						position
						archived
					}
					totalCount
					pageInfo {
						totalItems
						hasNextPage
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
					'Content-Type': 'application/json',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const projects = response.data?.projectList?.items || [];
			const results: INodeListSearchItems[] = projects
				.filter((project: any) => 
					!filter || 
					project.name.toLowerCase().includes(filter.toLowerCase()) ||
					project.slug.toLowerCase().includes(filter.toLowerCase())
				)
				.map((project: any) => ({
					name: `${project.name} (${project.slug})`,
					value: project.id,
				}));

			return { results };
		} catch (error) {
			return { 
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async searchProjectTemplates(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const companyId = this.getNodeParameter('companyId') as any;
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyId === 'object' && companyId.value) {
				actualCompanyId = companyId.value;
			} else if (typeof companyId === 'string') {
				actualCompanyId = companyId;
			}

			if (!actualCompanyId) {
				return {
					results: [{
						name: 'Please Select a Company First',
						value: '',
					}]
				};
			}

			
			const query = `query SearchProjectTemplates {
				projectList(
					filter: {
						companyIds: ["${actualCompanyId}"]
						archived: false
						isTemplate: true
						inProject: true
						folderId: null
						${filter ? `name_contains: "${filter}"` : ''}
					}
					sort: [position_ASC, name_ASC]
					skip: 0
					take: 50
				) {
					items {
						id
						name
						slug
						position
					}
					totalCount
					pageInfo {
						totalItems
						hasNextPage
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'X-Bloo-Company-ID': actualCompanyId,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const templates = response.data?.projectList?.items || [];
			return {
				results: templates.map((template: any) => ({
					name: template.name,
					value: template.id,
				}))
			};

		} catch (error) {
			return {
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async searchTodoLists(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId) {
				return {
					results: [{
						name: 'Please Select a Company First',
						value: '',
					}]
				};
			}

			if (!actualProjectId) {
				return {
					results: [{
						name: 'Please Select a Project First',
						value: '',
					}]
				};
			}

						
			// Use the provided query for getting Todo Lists
			const query = `query GetProjectLists {
				todoLists(projectId: "${actualProjectId}") {
					id
					uid
					title
					position
					isDisabled
					isLocked
					createdAt
					updatedAt
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const todoLists = response.data?.todoLists || [];
			const results: INodeListSearchItems[] = todoLists
				.filter((list: any) => 
					!filter || 
					list.title.toLowerCase().includes(filter.toLowerCase()) ||
					list.uid.toLowerCase().includes(filter.toLowerCase())
				)
				.filter((list: any) => !list.isDisabled) // Filter out disabled lists
				.sort((a: any, b: any) => a.position - b.position) // Sort by position
				.map((list: any) => ({
					name: `${list.title} (${list.uid})`,
					value: list.id,
				}));

			return { results };
		} catch (error) {
			return { 
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async searchProjectUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId) {
				return {
					results: [{
						name: 'Please Select a Company First',
						value: '',
					}]
				};
			}

			if (!actualProjectId) {
				return {
					results: [{
						name: 'Please Select a Project First',
						value: '',
					}]
				};
			}

						
			// Use the provided query for getting project users
			const query = `query GetProjectUsers {
				projectUserList(projectId: "${actualProjectId}") {
					users {
						id
						uid
						fullName
						email
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const users = response.data?.projectUserList?.users || [];
			const results: INodeListSearchItems[] = users
				.filter((user: any) => 
					!filter || 
					user.fullName.toLowerCase().includes(filter.toLowerCase()) ||
					user.email.toLowerCase().includes(filter.toLowerCase())
				)
				.map((user: any) => ({
					name: `${user.fullName} (${user.email})`,
					value: user.id,
				}));

			return { results };
		} catch (error) {
			return { 
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async searchProjectTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId) {
				return {
					results: [{
						name: 'Please Select a Company First',
						value: '',
					}]
				};
			}

			if (!actualProjectId) {
				return {
					results: [{
						name: 'Please Select a Project First',
						value: '',
					}]
				};
			}

						
			// Use the provided query for getting project tags
			const query = `query ListOfTagsWithinProjects {
				tagList(filter: { projectIds: ["${actualProjectId}"], excludeArchivedProjects: false }) {
					items {
						id
						uid
						title
						color
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const tags = response.data?.tagList?.items || [];
			const results: INodeListSearchItems[] = tags
				.filter((tag: any) => 
					!filter || 
					tag.title.toLowerCase().includes(filter.toLowerCase())
				)
				.map((tag: any) => ({
					name: `${tag.title} (${tag.color || 'no color'})`,
					value: tag.id,
				}));

			return { results };
		} catch (error) {
			return { 
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async searchCustomFields(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId) {
				return {
					results: [{
						name: 'Please Select a Company First',
						value: '',
					}]
				};
			}

			if (!actualProjectId) {
				return {
					results: [{
						name: 'Please Select a Project First',
						value: '',
					}]
				};
			}

						
			// Use the provided query for getting custom fields
			const query = `query ListCustomFields {
				customFields(
					filter: { projectId: "${actualProjectId}" }
					sort: name_ASC
					take: 50
				) {
					items {
						id
						uid
						name
						type
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new NodeOperationError(this.getNode(), `GraphQL Error: ${errorMessage}`);
			}

			const customFields = response.data?.customFields?.items || [];
			const results: INodeListSearchItems[] = customFields
				.filter((field: any) => {
					// Exclude read-only field types that cannot be updated via API
					const excludedTypes = ['UNIQUE_ID', 'REFERENCE'];
					if (excludedTypes.includes(field.type)) {
						return false;
					}
					
					// Apply search filter if provided
					return !filter || field.name.toLowerCase().includes(filter.toLowerCase());
				})
				.map((field: any) => ({
					name: `${field.name} (${field.type})`,
					value: `${field.id}|${field.type}`,
				}));

			return { results };
		} catch (error) {
			return { 
				results: [{
					name: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: '',
				}]
			};
		}
	}

	async getProjectUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId || !actualProjectId) {
				return [{
					name: 'Please Select a Company and Project First',
					value: '',
				}];
			}

						
			const query = `query GetProjectUsers {
				projectUserList(projectId: "${actualProjectId}") {
					users {
						id
						uid
						fullName
						email
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Users',
					value: '',
				}];
			}

			const users = response.data?.projectUserList?.users || [];
			return users.map((user: any) => ({
				name: `${user.fullName} (${user.email})`,
				value: user.id,
			}));

		} catch (error) {
			return [{
				name: 'Error Loading Users',
				value: '',
			}];
		}
	}

	async getProjectTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId || !actualProjectId) {
				return [{
					name: 'Please Select a Company and Project First',
					value: '',
				}];
			}

						
			const query = `query ListTags {
				tagList(
					filter: { 
						projectIds: ["${actualProjectId}"] 
					}
					first: 50
					orderBy: title_ASC
				) {
					items {
						id
						uid
						title
						color
					}
					pageInfo {
						totalPages
						totalItems
						page
						perPage
						hasNextPage
						hasPreviousPage
					}
					totalCount
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Tags',
					value: '',
				}];
			}

			const tags = response.data?.tagList?.items || [];
			return tags.map((tag: any) => ({
				name: `${tag.title} (${tag.color || 'no color'})`,
				value: tag.id,
			}));

		} catch (error) {
			return [{
				name: 'Error Loading Tags',
				value: '',
			}];
		}
	}

	async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			// Extract project ID from resourceLocator
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId) {
				return [{
					name: 'Please Select a Company First',
					value: '',
				}];
			}

						
			// Build query based on whether project is selected
			let query;
			if (actualProjectId) {
				// Project-specific custom fields with advanced details
				query = `query ListCustomFieldsAdvanced {
					customFields(
						filter: { 
							projectId: "${actualProjectId}"
						}
						sort: name_ASC
						skip: 0
						take: 50
					) {
						items {
							id
							uid
							name
							type
							position
							description
							
							# Type-specific fields
							min
							max
							currency
							prefix
							isDueDate
							formula
							
							# Validation settings
							editable
							metadata
							
							# For SELECT types
							customFieldOptions {
								id
								title
								color
								position
							}
						}
						pageInfo {
							totalItems
							hasNextPage
							hasPreviousPage
						}
					}
				}`;
			} else {
				// Company-level custom fields (fallback - use simpler query as companyId filter may not support advanced features)
				query = `query ListCustomFields {
					customFields(
						filter: { companyId: "${actualCompanyId}" }
						sort: name_ASC
						take: 50
					) {
						items {
							id
							uid
							name
							type
							description
							
							# For SELECT types
							customFieldOptions {
								id
								title
								color
								position
							}
						}
					}
				}`;
			}

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Custom Fields',
					value: '',
				}];
			}

			const customFields = response.data?.customFields?.items || [];
			return customFields.map((field: any) => {
				let displayName = `${field.name} (${field.type})`;
				
				// Add description if available
				if (field.description && field.description.trim()) {
					displayName += ` - ${field.description}`;
				}
				
				// Add field-specific examples and information
				if (field.type === 'TEXT_SINGLE') {
					displayName += ` → Example: "Project Alpha"`;
				} else if (field.type === 'TEXT_MULTI') {
					displayName += ` → Example: "This is a\\nmulti-line description"`;
				} else if (field.type === 'SELECT_SINGLE') {
					if (field.customFieldOptions && field.customFieldOptions.length > 0) {
						const options = field.customFieldOptions
							.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
							.map((opt: any) => `"${opt.id}" (${opt.title})`)
							.join(', ');
						displayName += ` → Options: ${options}`;
					} else {
						displayName += ` → Example: "option_123456"`;
					}
				} else if (field.type === 'SELECT_MULTI') {
					if (field.customFieldOptions && field.customFieldOptions.length > 0) {
						const options = field.customFieldOptions
							.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
							.map((opt: any) => `"${opt.id}" (${opt.title})`)
							.join(', ');
						displayName += ` → Options: ${options} → Use comma-separated IDs`;
					} else {
						displayName += ` → Example: "option_123456,option_789012"`;
					}
				} else if (field.type === 'NUMBER') {
					const constraints = [];
					if (field.min !== undefined && field.min !== null) constraints.push(`min: ${field.min}`);
					if (field.max !== undefined && field.max !== null) constraints.push(`max: ${field.max}`);
					const constraintText = constraints.length > 0 ? ` (${constraints.join(', ')})` : '';
					displayName += ` → Example: "42"${constraintText}`;
				} else if (field.type === 'CHECKBOX') {
					displayName += ` → Example: "true", "false", "1", "0", or "checked"`;
				} else if (field.type === 'LOCATION') {
					displayName += ` → Example: "37.7749,-122.4194" (latitude,longitude)`;
				} else if (field.type === 'COUNTRY') {
					displayName += ` → Example: "US", "GB", "JP" (ISO country code)`;
				} else if (field.type === 'CURRENCY') {
					const currency = field.currency ? `${field.currency}` : 'USD';
					displayName += ` → Example: "${currency}200", "200${currency}", or "KHR4000"`;
				} else if (field.type === 'DATE') {
					const dateType = field.isDueDate ? ' (Due Date)' : '';
					displayName += ` → Example: "2023-12-31" or "2023-12-01,2023-12-31"${dateType}`;
				} else if (field.type === 'PHONE') {
					displayName += ` → Example: "+1-555-123-4567"`;
				} else if (field.type === 'EMAIL') {
					displayName += ` → Example: "contact@example.com"`;
				} else if (field.type === 'STAR_RATING') {
					displayName += ` → Example: "4" (rating 1-5)`;
				} else if (field.type === 'PERCENT') {
					displayName += ` → Example: "75" or "75%"`;
				} else if (field.type === 'URL') {
					displayName += ` → Example: "https://example.com"`;
				}
				
				return {
					name: displayName,
					value: field.id,
				};
			});

		} catch (error) {
			return [{
				name: 'Error Loading Custom Fields',
				value: '',
			}];
		}
	}

	async getCustomFieldsWithType(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const companyIdParam = this.getNodeParameter('companyId') as any;
			const projectIdParam = this.getNodeParameter('projectId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}
			// Extract project ID from resourceLocator (optional)
			let actualProjectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				actualProjectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				actualProjectId = projectIdParam;
			}

			if (!actualCompanyId) {
				return [{
					name: 'Please Select a Company First',
					value: '',
				}];
			}

						
			// Build query based on whether project is selected
			let query;
			if (actualProjectId) {
				// Project-specific custom fields
				query = `query ListCustomFieldsAdvanced {
					customFields(
						filter: { 
							projectId: "${actualProjectId}"
						}
						sort: name_ASC
						skip: 0
						take: 50
					) {
						items {
							id
							uid
							name
							type
							position
							description
							customFieldOptions {
								id
								title
								position
							}
						}
					}
				}`;
			} else {
				// Company-level custom fields
				query = `query ListCustomFieldsAdvanced {
					customFields(
						filter: { 
							companyId: "${actualCompanyId}"
						}
						sort: name_ASC
						skip: 0
						take: 50
					) {
						items {
							id
							uid
							name
							type
							position
							description
							customFieldOptions {
								id
								title
								position
							}
						}
					}
				}`;
			}

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);
			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Custom Fields',
					value: '',
				}];
			}

			const customFields = response.data?.customFields?.items || [];
			return customFields.map((field: any) => {
				let displayName = `${field.name} (${field.type})`;
				
				// Add description if available
				if (field.description && field.description.trim()) {
					displayName += ` - ${field.description}`;
				}
				
				return {
					name: displayName,
					// Value includes both field ID and type for the hidden field to use
					value: `${field.id}|${field.type}`,
				};
			});
		} catch (error) {
			return [{
				name: 'Error Loading Custom Fields',
				value: '',
			}];
		}
	}

	async getCustomFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const customFieldIdWithType = this.getNodeParameter('customFieldId') as string;
			
			if (!customFieldIdWithType || !customFieldIdWithType.includes('|')) {
				return [{
					name: 'Please Select a Custom Field First',
					value: '',
				}];
			}

			const [customFieldId] = customFieldIdWithType.split('|');
			const companyIdParam = this.getNodeParameter('companyId') as any;
			
			// Extract company ID from resourceLocator
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			if (!actualCompanyId) {
				return [{
					name: 'Please Select a Company First',
					value: '',
				}];
			}

						
			const query = `query GetCustomFieldOptions {
				customField(id: "${customFieldId}") {
					id
					name
					type
					customFieldOptions {
						id
						title
						position
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'Content-Type': 'application/json',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);
			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Options',
					value: '',
				}];
			}

			const customField = response.data?.customField;
			if (!customField || !customField.customFieldOptions) {
				return [{
					name: 'No Options Available for This Field',
					value: '',
				}];
			}

			return customField.customFieldOptions
				.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
				.map((option: any) => ({
					name: option.title,
					value: option.id,
				}));
		} catch (error) {
			return [{
				name: 'Error Loading Field Options',
				value: '',
			}];
		}
	}

	async getProjectTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			// Try to get the company ID using getNodeParameter
			const companyIdParam = this.getNodeParameter('companyId') as any;
			
			// Extract company ID from resourceLocator format
			let actualCompanyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				actualCompanyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				actualCompanyId = companyIdParam;
			}

			if (!actualCompanyId || actualCompanyId.trim() === '') {
				return [{
					name: 'Please Select a Company First',
					value: '',
				}];
			}

						
			const query = `query FilteredProjectList {
				projectList(
					filter: {
						companyIds: ["${actualCompanyId}"]
						archived: false
						isTemplate: true
						inProject: true
						folderId: null
					}
					sort: [position_ASC, name_ASC]
					skip: 0
					take: 50
				) {
					items {
						id
						name
						slug
						position
					}
					totalCount
					pageInfo {
						totalItems
						hasNextPage
					}
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'X-Bloo-Company-ID': actualCompanyId,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Templates',
					value: '',
				}];
			}

			const templates = response.data?.projectList?.items || [];
			return templates.map((template: any) => ({
				name: template.name,
				value: template.id,
			}));

		} catch (error) {
			return [{
				name: 'Error Loading Project Templates',
				value: '',
			}];
		}
	}

	async getCustomRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		
		// Get companyId and projectId from current parameters
		const companyId = this.getNodeParameter('companyId') as any;
		const projectId = this.getNodeParameter('projectId') as any;
		
		// Extract values from resourceLocator format
		let companyValue = '';
		let projectValue = '';
		
		if (typeof companyId === 'object' && companyId.value) {
			companyValue = companyId.value;
		} else if (typeof companyId === 'string') {
			companyValue = companyId;
		}
		
		if (typeof projectId === 'object' && projectId.value) {
			projectValue = projectId.value;
		} else if (typeof projectId === 'string') {
			projectValue = projectId;
		}

		if (!companyValue || !projectValue) {
			return [{
				name: 'Please Select Company and Project First',
				value: '',
			}];
		}

		try {
			const query = `
				query GetCustomRoles {
					projectUserRoles(filter: { projectId: "${projectValue}" }) {
						id
						name
					}
				}
			`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
										'X-Bloo-Company-ID': companyValue,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'blueApi', requestOptions);

			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Custom Roles',
					value: '',
				}];
			}

			const customRoles = response.data?.projectUserRoles || [];
			return customRoles.map((role: any) => ({
				name: role.name,
				value: role.id,
			}));

		} catch (error) {
			return [{
				name: 'Error Loading Custom Roles',
				value: '',
			}];
		}
	}

}