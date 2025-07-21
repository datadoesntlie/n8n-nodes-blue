import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

export class blue implements INodeType {
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
		properties: [
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'string',
				displayOptions: {
					hide: {
						operation: ['getCompanies'],
					},
				},
				default: '',
				required: true,
				description: 'Company ID or slug to work with',
				placeholder: 'e.g., your-company-slug',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Companies',
						value: 'getCompanies',
						description: 'List all companies you have access to',
					},
					{
						name: 'Custom Query',
						value: 'customQuery',
						description: 'Execute a custom GraphQL query',
					},
					{
						name: 'Get Projects',
						value: 'getProjects',
						description: 'Retrieve all projects',
					},
					{
						name: 'Get Tasks',
						value: 'getTasks',
						description: 'Retrieve tasks for a project',
					},
				],
				default: 'getCompanies',
			},
			// Custom Query Section
			{
				displayName: 'GraphQL Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: ['customQuery'],
					},
				},
				default: `query {
  projects {
    id
    name
    status
  }
}`,
				description: 'Your GraphQL query',
				placeholder: 'Enter your GraphQL query here...',
			},
			{
				displayName: 'Variables (JSON)',
				name: 'variables',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['customQuery'],
					},
				},
				default: '{}',
				description: 'Variables to pass to the query as JSON object',
			},
			// Get Tasks Section
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getTasks'],
					},
				},
				default: '',
				description: 'ID of the project to get tasks from',
				required: true,
			},
			// Common Options
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 30000,
						description: 'Request timeout in milliseconds',
					},
					{
						displayName: 'Return Full Response',
						name: 'fullResponse',
						type: 'boolean',
						default: false,
						description: 'Return the full GraphQL response including errors and extensions',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as IDataObject;
				
				// Company ID is not needed for getCompanies operation
				let companyId = '';
				if (operation !== 'getCompanies') {
					companyId = this.getNodeParameter('companyId', i) as string;
				}
				const credentials = await this.getCredentials('blueApi');

				let query: string;
				let variables: IDataObject = {};

				// Build query based on operation
				switch (operation) {
					case 'getCompanies':
						query = `query GetCompanies {
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
						break;
					
					case 'customQuery':
						query = this.getNodeParameter('query', i) as string;
						variables = this.getNodeParameter('variables', i) as IDataObject;
						break;
					
					case 'getProjects':
						const companyIdForProjects = this.getNodeParameter('companyId', i) as string;
						query = `query FilteredProjectList {
							projectList(
								filter: {
									companyIds: ["${companyIdForProjects}"]
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
						variables = {};
						break;
					
					case 'getTasks':
						const projectId = this.getNodeParameter('projectId', i) as string;
						const companyIdForTasks = this.getNodeParameter('companyId', i) as string;
						query = `query GetTasks($projectId: ID!, $companyId: String!) {
							project(id: $projectId) {
								id
								name
								todos: todoQueries {
									todos(filter: { 
										projectIds: [$projectId], 
										companyIds: [$companyId] 
									}) {
										items {
											id
											title
											description
											status
											assignee {
												id
												name
											}
											createdAt
											updatedAt
										}
									}
								}
							}
						}`;
						variables = { projectId, companyId: companyIdForTasks };
						break;
					
					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Validate query
				if (!query || query.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'GraphQL query cannot be empty');
				}

				// Prepare request options
				const requestOptions: any = {
					method: 'POST' as const,
					url: 'https://api.blue.cc/graphql',
					headers: {
						'X-Bloo-Token-ID': credentials.tokenId as string,
						'X-Bloo-Token-Secret': credentials.tokenSecret as string,
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-blue-node/1.0',
					},
					body: {
						query: query.trim(),
						variables,
					},
					json: true,
					timeout: (additionalOptions.timeout as number) || 30000,
				};

				// Add company header only if companyId is provided
				if (companyId) {
					requestOptions.headers['X-Bloo-Company-ID'] = companyId;
				}

				const response = await this.helpers.request(requestOptions);

				// Handle GraphQL errors
				if (response.errors && response.errors.length > 0) {
					const errorMessage = response.errors.map((err: any) => err.message).join(', ');
					throw new NodeApiError(this.getNode(), {
						message: `GraphQL Error: ${errorMessage}`,
						description: 'The GraphQL query returned errors',
					});
				}

				// Process response based on user preference
				let responseData;
				if (additionalOptions.fullResponse) {
					responseData = response;
				} else {
					responseData = response.data || response;
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});

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
}