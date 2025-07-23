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

import { operations } from './operations';
import { BlueCredentials, BlueOperationContext } from './types';

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
						action: 'List all companies you have access to',
					},
					{
						name: 'Custom Query',
						value: 'customQuery',
						description: 'Execute a custom GraphQL query',
						action: 'Execute a custom graph ql query',
					},
					{
						name: 'Get Projects',
						value: 'getProjects',
						description: 'Retrieve all projects',
						action: 'Retrieve all projects',
					},
					{
						name: 'Get Records',
						value: 'getRecords',
						description: 'Retrieve records (todos/tasks) with advanced filtering',
						action: 'Retrieve records todos tasks with advanced filtering',
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
			// Get Records Section
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				default: '',
				description: 'ID of the project to filter records from (optional)',
				placeholder: 'e.g., crm-113',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				default: '',
				description: 'Search for records containing this text (optional)',
				placeholder: 'e.g., Halaxy Create Patient',
			},
			{
				displayName: 'Show Completed',
				name: 'showCompleted',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				default: false,
				description: 'Whether to include completed records in results',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				default: 50,
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Number of records to skip (for pagination)',
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
						displayName: 'Timeout (Ms)',
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
						description: 'Whether to return the full GraphQL response including errors and extensions',
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
				const credentials = await this.getCredentials('blueApi') as BlueCredentials;

				// Get the operation handler
				const operationHandler = operations[operation];
				if (!operationHandler) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Create operation context
				const context: BlueOperationContext = {
					executeFunctions: this,
					itemIndex: i,
					credentials,
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
}