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
						operation: ['getCompanies', 'updateRecord', 'createRecord', 'createProject'],
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
					{
						name: 'Update Record',
						value: 'updateRecord',
						description: 'Update a record (todo/task) with custom fields',
						action: 'Update a record todo task with custom fields',
					},
					{
						name: 'Create Record',
						value: 'createRecord',
						description: 'Create a new record (todo/task) with custom fields',
						action: 'Create a new record todo task with custom fields',
					},
					{
						name: 'Create Project',
						value: 'createProject',
						description: 'Create a new project from a template',
						action: 'Create a new project from a template',
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
			// Update Record Section
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				required: true,
				description: 'Company containing the record',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a company...',
						typeOptions: {
							searchListMethod: 'searchCompanies',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., ana',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Company ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Project',
				name: 'projectId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				required: false,
				description: 'Project containing the record (optional)',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a project...',
						typeOptions: {
							searchListMethod: 'searchProjects',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., crm-113',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Project ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Todo List',
				name: 'todoListId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				required: false,
				description: 'Todo list to move the record to (optional)',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a todo list...',
						typeOptions: {
							searchListMethod: 'searchTodoLists',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., list-123',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Todo List ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to update',
				placeholder: 'e.g., record-123',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Title of the record (optional)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Description/text content of the record (optional)',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Start date for the record (optional)',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Due date for the record (optional)',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Position number for the record in the list (optional)',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Color code for the record (optional)',
				placeholder: 'e.g., #FF5733',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'fixedCollection',
				placeholder: 'Add Custom Field',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customField',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'string',
								default: '',
								required: true,
								description: 'ID of the custom field to update',
							},
							{
								displayName: 'Field Type',
								name: 'fieldType',
								type: 'options',
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'Number', value: 'number' },
									{ name: 'Selection', value: 'selection' },
									{ name: 'Checkbox', value: 'checkbox' },
									{ name: 'Phone', value: 'phone' },
									{ name: 'Location', value: 'location' },
									{ name: 'Countries', value: 'countries' },
								],
								default: 'text',
								description: 'Type of the custom field',
							},
							{
								displayName: 'Text Value',
								name: 'textValue',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['text'],
									},
								},
								default: '',
								description: 'Text value for the field',
							},
							{
								displayName: 'Number Value',
								name: 'numberValue',
								type: 'number',
								displayOptions: {
									show: {
										fieldType: ['number'],
									},
								},
								default: 0,
								description: 'Numeric value for the field',
							},
							{
								displayName: 'Checkbox Value',
								name: 'checkboxValue',
								type: 'boolean',
								displayOptions: {
									show: {
										fieldType: ['checkbox'],
									},
								},
								default: false,
								description: 'Boolean value for checkbox field',
							},
							{
								displayName: 'Selection Option IDs',
								name: 'selectionIds',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['selection'],
									},
								},
								default: '',
								description: 'Comma-separated list of option IDs for selection fields',
								placeholder: 'option1,option2,option3',
							},
							{
								displayName: 'Phone Number',
								name: 'phoneNumber',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['phone'],
									},
								},
								default: '',
								description: 'Phone number with country code',
								placeholder: '+33642526644',
							},
							{
								displayName: 'Region Code',
								name: 'regionCode',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['phone'],
									},
								},
								default: '',
								description: 'Country/region code for phone number',
								placeholder: 'FR',
							},
							{
								displayName: 'Latitude',
								name: 'latitude',
								type: 'number',
								displayOptions: {
									show: {
										fieldType: ['location'],
									},
								},
								default: 0,
								description: 'Latitude coordinate',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'number',
								displayOptions: {
									show: {
										fieldType: ['location'],
									},
								},
								default: 0,
								description: 'Longitude coordinate',
							},
							{
								displayName: 'Location Text',
								name: 'locationText',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['location'],
									},
								},
								default: '',
								description: 'Human-readable location description',
							},
							{
								displayName: 'Country Codes',
								name: 'countryCodes',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['countries'],
									},
								},
								default: '',
								description: 'Comma-separated list of country codes',
								placeholder: 'US,FR,DE',
							},
							{
								displayName: 'Countries Text',
								name: 'countriesText',
								type: 'string',
								displayOptions: {
									show: {
										fieldType: ['countries'],
									},
								},
								default: '',
								description: 'Human-readable country names',
								placeholder: 'United States, France, Germany',
							},
						],
					},
				],
				description: 'Custom fields to update for this record',
			},
			// Create Record Section  
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				required: true,
				description: 'Company where the record will be created',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a company...',
						typeOptions: {
							searchListMethod: 'searchCompanies',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Company ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Project',
				name: 'projectId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				required: true,
				description: 'Project where the record will be created',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a project...',
						typeOptions: {
							searchListMethod: 'searchProjects',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Project ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Todo List',
				name: 'todoListId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				required: true,
				description: 'Todo list where the record will be created',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a todo list...',
						typeOptions: {
							searchListMethod: 'searchTodoLists',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Todo List ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: '',
				required: true,
				description: 'Title of the record',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: '',
				description: 'Description/text content of the record (optional)',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: '',
				description: 'Start date for the record (optional)',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: '',
				description: 'Due date for the record (optional)',
			},
			{
				displayName: 'Placement',
				name: 'placement',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				options: [
					{ name: 'Top', value: 'TOP' },
					{ name: 'Bottom', value: 'BOTTOM' },
				],
				default: 'BOTTOM',
				description: 'Where to place the record in the list',
			},
			{
				displayName: 'Notify Assignees',
				name: 'notify',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: false,
				description: 'Whether to notify assignees about this record',
			},
			{
				displayName: 'Assignee Names or IDs',
				name: 'assigneeIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: [],
				description: 'Users to assign to this record. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectUsers',
				},
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tagIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: [],
				description: 'Tags to add to this record. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectTags',
				},
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'fixedCollection',
				placeholder: 'Add Custom Field',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customField',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Custom Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								default: '',
								required: true,
								description: 'Select the custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Value for the custom field',
							},
						],
					},
				],
				description: 'Custom fields to set for this record',
			},
			{
				displayName: 'Checklists',
				name: 'checklists',
				type: 'fixedCollection',
				placeholder: 'Add Checklist',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'checklist',
						displayName: 'Checklist',
						values: [
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								description: 'Title of the checklist',
							},
							{
								displayName: 'Position',
								name: 'position',
								type: 'number',
								default: 1,
								description: 'Position of the checklist',
							},
						],
					},
				],
				description: 'Checklists to create for this record',
			},
			// Create Project Section
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['createProject'],
					},
				},
				required: true,
				description: 'Company where the project will be created',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a company...',
						typeOptions: {
							searchListMethod: 'searchCompanies',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Company ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Project Name',
				name: 'name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createProject'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the new project',
				placeholder: 'My New Project',
			},
			{
				displayName: 'Template Name or ID',
				name: 'templateId',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createProject'],
					},
				},
				default: '',
				required: true,
				description: 'Template to use for creating the project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectTemplates',
					loadOptionsDependsOn: ['companyId'],
				},
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

	methods = {
		listSearch: {
			searchCompanies: this.searchCompanies,
			searchProjects: this.searchProjects,
			searchTodoLists: this.searchTodoLists,
			searchProjectUsers: this.searchProjectUsers,
			searchProjectTags: this.searchProjectTags,
			searchCustomFields: this.searchCustomFields,
		},
		loadOptions: {
			getProjectUsers: this.getProjectUsers,
			getProjectTags: this.getProjectTags,
			getCustomFields: this.getCustomFields,
			getProjectTemplates: this.getProjectTemplates,
		},
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

	// Resource locator methods for dynamic dropdowns
	async searchCompanies(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		try {
			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new Error(`GraphQL Error: ${errorMessage}`);
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
						name: 'Please select a company first',
						value: '',
					}]
				};
			}

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new Error(`GraphQL Error: ${errorMessage}`);
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
						name: 'Please select a company first',
						value: '',
					}]
				};
			}

			if (!actualProjectId) {
				return {
					results: [{
						name: 'Please select a project first',
						value: '',
					}]
				};
			}

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'X-Bloo-Company-ID': actualCompanyId,
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new Error(`GraphQL Error: ${errorMessage}`);
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new Error(`GraphQL Error: ${errorMessage}`);
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new Error(`GraphQL Error: ${errorMessage}`);
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query,
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				const errorMessage = response.errors.map((err: any) => err.message).join(', ');
				throw new Error(`GraphQL Error: ${errorMessage}`);
			}

			const customFields = response.data?.customFields?.items || [];
			const results: INodeListSearchItems[] = customFields
				.filter((field: any) => 
					!filter || 
					field.name.toLowerCase().includes(filter.toLowerCase())
				)
				.map((field: any) => ({
					name: `${field.name} (${field.type})`,
					value: field.id,
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

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

			if (!actualCompanyId || !actualProjectId) {
				return [{
					name: 'Please Select a Company and Project First',
					value: '',
				}];
			}

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

			if (response.errors && response.errors.length > 0) {
				return [{
					name: 'Error Loading Custom Fields',
					value: '',
				}];
			}

			const customFields = response.data?.customFields?.items || [];
			return customFields.map((field: any) => ({
				name: `${field.name} (${field.type})`,
				value: field.id,
			}));

		} catch (error) {
			return [{
				name: 'Error Loading Custom Fields',
				value: '',
			}];
		}
	}

	async getProjectTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
			const query = `query FilteredProjectList {
				projectList(
					filter: {
						companyIds: ["${actualCompanyId}"]
						archived: false
						isTemplate: true
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
				}
			}`;

			const requestOptions = {
				method: 'POST' as const,
				url: 'https://api.blue.cc/graphql',
				headers: {
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-blue-node/1.0',
				},
				body: {
					query: query.trim(),
					variables: {},
				},
				json: true,
			};

			const response = await this.helpers.request(requestOptions);

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

}