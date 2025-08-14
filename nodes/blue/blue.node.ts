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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Project',
						value: 'createProject',
						description: 'Create a new project from a template',
						action: 'Create a new project from a template',
					},
					{
						name: 'Create Record',
						value: 'createRecord',
						description: 'Create a new record (todo/task) with custom fields',
						action: 'Create a new record todo task with custom fields',
					},
					{
						name: 'Execute Custom GraphQL',
						value: 'customQuery',
						description: 'Execute a custom GraphQL query',
						action: 'Execute a custom graph ql query',
					},
					{
						name: 'Get Records',
						value: 'getRecords',
						description: 'Retrieve records (todos/tasks) with advanced filtering',
						action: 'Get records with advanced filtering',
					},
					{
						name: 'Invite User',
						value: 'inviteUser',
						description: 'Invite User to a Project',
						action: 'Invite a user to a project',
					},
					{
						name: 'List Companies',
						value: 'getCompanies',
						description: 'List all companies you have access to',
						action: 'List all companies you have access to',
					},
					{
						name: 'List Custom Fields',
						value: 'listCustomFields',
						description: 'List custom fields in a project with detailed information',
						action: 'List custom fields in a project with detailed information',
					},
					{
						name: 'List Projects',
						value: 'getProjects',
						description: 'Retrieve projects from a company',
						action: 'List projects from a company',
					},
					{
						name: 'Tag Record',
						value: 'tagRecord',
						description: 'Add tags to a record (todo/task)',
						action: 'Add tags to a record todo task',
					},
					{
						name: 'Update Record',
						value: 'updateRecord',
						description: 'Update a record (todo/task) with custom fields',
						action: 'Update a record todo task with custom fields',
					},
				],
				default: 'getCompanies',
			},
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['getProjects'],
					},
				},
				required: true,
				description: 'Company to retrieve projects from',
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
						placeholder: 'e.g., your-company-slug',
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
				displayName: 'Company',
				name: 'companyId',
				type: 'string',
				displayOptions: {
					hide: {
						operation: ['getCompanies', 'updateRecord', 'createRecord', 'createProject', 'getProjects', 'getRecords', 'tagRecord', 'inviteUser', 'listCustomFields'],
					},
				},
				default: '',
				required: true,
				description: 'Company ID or slug to work with',
				placeholder: 'e.g., your-company-slug',
			},
			// Tag field moved to correct position later
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
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				required: true,
				description: 'Company to retrieve records from',
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
						placeholder: 'e.g., your-company-slug',
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
						operation: ['getRecords'],
					},
				},
				description: 'Project to filter records from (optional)',
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
						operation: ['updateRecord', 'tagRecord'],
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
						operation: ['updateRecord', 'tagRecord'],
					},
				},
				description: 'Project containing the record (required for tagRecord)',
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
			// Tag Selection for tagRecord operation
			{
				displayName: 'Tag Names or IDs',
				name: 'tagIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['tagRecord'],
					},
				},
				required: true,
				description: 'Select tags to add to the record. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getProjectTags',
				},
			},
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['updateRecord', 'tagRecord'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to update or tag',
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
				type: 'color',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: '',
				description: 'Color code for the record (optional)',
				placeholder: 'e.g., #FF5733',
			},
			// Custom Field Selection (HIDDEN - using collection approach)
			{
				displayName: 'Custom Field',
				name: 'customFieldId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
					},
				},
				description: 'Custom field to update',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a custom field...',
						typeOptions: {
							searchListMethod: 'searchCustomFields',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., field-123|TEXT_SINGLE',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Custom Field ID cannot be empty',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Assignee Names or IDs',
				name: 'assigneeIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: [],
				description: 'Users to assign to this record. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectUsers',
					loadOptionsDependsOn: ['companyId', 'projectId'],
				},
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tagIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				default: [],
				description: 'Tags to add to this record. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectTags',
					loadOptionsDependsOn: ['companyId', 'projectId'],
				},
			},
			// Custom Fields to Update Collection
			{
				displayName: 'Add Custom Field to Update',
				name: 'customFields',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: ['updateRecord'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Click to add custom fields to update',
				placeholder: 'Add Custom Field to Update',
				options: [
					{
						displayName: 'Custom Field Update',
						name: 'customField',
						values: [
							{
								displayName: 'Custom Field',
								name: 'customFieldId',
								type: 'resourceLocator',
								default: { mode: 'list', value: '' },
								modes: [
									{
										displayName: 'From List',
										name: 'list',
										type: 'list',
										placeholder: 'Select a custom field...',
										typeOptions: {
											searchListMethod: 'searchCustomFields',
											searchable: true,
										},
									},
									{
										displayName: 'By ID',
										name: 'id',
										type: 'string',
										placeholder: 'e.g., field-123|TEXT_SINGLE',
										validation: [
											{
												type: 'regex',
												properties: {
													regex: '^[a-zA-Z0-9]+\\|[A-Z_]+$',
													errorMessage: 'Custom field ID must be in format: fieldId|fieldType',
												},
											},
										],
									},
								],
							},
							{
								displayName: 'Custom Field Value',
								name: 'customFieldValue',
								type: 'string',
								default: '',
								description: 'Format examples:• Currency: "100 USD"• Date: "startDate,endDate" (ISO 8601: 2025-01-15T14:30:00Z)• Location: "latitude,longitude"• Country: "AF,Afghanistan" (CountryCode,Country Name)• Number/Percent/Rating: Enter number within range• Text/Email/URL: Enter directly• Phone: +50767890432• Checkbox: True/False• Select_Single: OptionID124• Select_Multi: OptionID123,OptionID124',
								placeholder: 'Enter field value...',
							},
						],
					},
				],
			},
			// Country Code - For COUNTRY fields (HIDDEN - using universal field)
			{
				displayName: 'Country Code',
				name: 'customFieldCountryValue',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
					},
				},
				default: '',
				description: 'Enter the ISO 3166 country code',
				placeholder: 'e.g., US, GB, JP',
			},
			// Date Picker - For DATE fields (HIDDEN - using universal field)
			{
				displayName: 'Date Value',
				name: 'customFieldDateValue',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
					},
				},
				default: '',
				description: 'Select a date for DATE fields',
			},
			// Manual Date Input - For DATE fields (ISO 8601) (HIDDEN - using universal field)
			{
				displayName: 'Manual Date Input (ISO 8601)',
				name: 'customFieldDateManual',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
					},
				},
				default: '',
				description: 'Manually enter date in ISO 8601 format (alternative to date picker)',
				placeholder: 'e.g., 2023-12-31T10:00:00Z',
			},
			// Location - Latitude
			{
				displayName: 'Latitude',
				name: 'customFieldLatitude',
				type: 'number',
				typeOptions: {
					numberPrecision: 6,
				},
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
					},
				},
				default: 0,
				description: 'Enter the latitude coordinate for LOCATION fields',
				placeholder: 'e.g., 37.7749',
			},
			// Location - Longitude
			{
				displayName: 'Longitude',
				name: 'customFieldLongitude',
				type: 'number',
				typeOptions: {
					numberPrecision: 6,
				},
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
					},
				},
				default: 0,
				description: 'Enter the longitude coordinate for LOCATION fields',
				placeholder: 'e.g., -122.4194',
			},
			// Checkbox - For CHECKBOX fields (HIDDEN - using universal field)
			{
				displayName: 'Checked',
				name: 'customFieldCheckboxValue',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
						customFieldId: ['/.*\\|CHECKBOX.*/'],
					},
				},
				default: false,
				description: 'Whether to check this checkbox for CHECKBOX fields',
			},
			// Single Select - For SELECT_SINGLE fields (HIDDEN - using universal field)
			{
				displayName: 'Select Option Name or ID',
				name: 'customFieldSelectValue',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
						customFieldId: ['/.*\\|SELECT_SINGLE.*/'],
					},
				},
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCustomFieldOptions',
					loadOptionsDependsOn: ['customFieldId'],
				},
				description: 'Select an option for SELECT_SINGLE fields. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			// Multi Select - For SELECT_MULTI fields (HIDDEN - using universal field)
			{
				displayName: 'Select Option Names or IDs',
				name: 'customFieldMultiSelectValue',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['NEVER_SHOW'],
						customFieldId: ['/.*\\|SELECT_MULTI.*/'],
					},
				},
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCustomFieldOptions',
					loadOptionsDependsOn: ['customFieldId'],
				},
				description: 'Select multiple options for SELECT_MULTI fields. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					loadOptionsDependsOn: ['companyId', 'projectId'],
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
					loadOptionsDependsOn: ['companyId', 'projectId'],
				},
			},
			// Custom Fields to Set Collection
			{
				displayName: 'Add Custom Field to Set',
				name: 'customFields',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: ['createRecord'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Click to add custom fields to set during record creation',
				placeholder: 'Add Custom Field to Set',
				options: [
					{
						displayName: 'Custom Field to Set',
						name: 'customField',
						values: [
							{
								displayName: 'Custom Field',
								name: 'customFieldId',
								type: 'resourceLocator',
								default: { mode: 'list', value: '' },
								modes: [
									{
										displayName: 'From List',
										name: 'list',
										type: 'list',
										placeholder: 'Select a custom field...',
										typeOptions: {
											searchListMethod: 'searchCustomFields',
											searchable: true,
										},
									},
									{
										displayName: 'By ID',
										name: 'id',
										type: 'string',
										placeholder: 'e.g., field-123|TEXT_SINGLE',
										validation: [
											{
												type: 'regex',
												properties: {
													regex: '^[a-zA-Z0-9]+\\|[A-Z_]+$',
													errorMessage: 'Custom field ID must be in format: fieldId|fieldType',
												},
											},
										],
									},
								],
							},
							{
								displayName: 'Custom Field Value',
								name: 'customFieldValue',
								type: 'string',
								default: '',
								description: 'Format examples:• Currency: "100 USD"• Date: "startDate,endDate" (ISO 8601: 2025-01-15T14:30:00Z)• Location: "latitude,longitude"• Country: "AF,Afghanistan" (CountryCode,Country Name)• Number/Percent/Rating: Enter number within range• Text/Email/URL: Enter directly• Phone: +50767890432• Checkbox: True/False• Select_Single: OptionID124• Select_Multi: OptionID123,OptionID124',
								placeholder: 'Enter field value...',
							},
						],
					},
				],
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
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['createProject'],
					},
				},
				required: true,
				description: 'Template to use for creating the project',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a template...',
						typeOptions: {
							searchListMethod: 'searchProjectTemplates',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., template-123',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.+',
									errorMessage: 'Template ID cannot be empty',
								},
							},
						],
					},
				],
			},
			// Invite User Section
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['inviteUser'],
					},
				},
				required: true,
				description: 'Company where the project is located',
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
						operation: ['inviteUser'],
					},
				},
				required: true,
				description: 'Project to invite the user to',
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
						placeholder: 'e.g., project-123',
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
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['inviteUser'],
					},
				},
				default: '',
				required: true,
				description: 'Email address of the user to invite',
				placeholder: 'user@example.com',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['inviteUser'],
					},
				},
				required: true,
				description: 'Role to assign to the user',
				options: [
					{
						name: 'Admin',
						value: 'ADMIN',
						description: 'Administrative access to the project',
					},
					{
						name: 'Client',
						value: 'CLIENT',
						description: 'Client-level access',
					},
					{
						name: 'Comment Only',
						value: 'COMMENT_ONLY',
						description: 'Can only add comments',
					},
					{
						name: 'Custom Role',
						value: 'CUSTOM_ROLE',
						description: 'Use a custom role defined in the project',
					},
					{
						name: 'Member',
						value: 'MEMBER',
						description: 'Standard member access',
					},
					{
						name: 'Owner',
						value: 'OWNER',
						description: 'Full access to all project features',
					},
					{
						name: 'View Only',
						value: 'VIEW_ONLY',
						description: 'Read-only access',
					},
				],
				default: 'MEMBER',
			},
			{
				displayName: 'Custom Role Name or ID',
				name: 'customRoleId',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['inviteUser'],
						role: ['CUSTOM_ROLE'],
					},
				},
				required: true,
				description: 'Custom role to assign to the user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getCustomRoles',
					loadOptionsDependsOn: ['companyId', 'projectId'],
				},
				default: '',
			},
			// List Custom Fields Section
			{
				displayName: 'Company',
				name: 'companyId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						operation: ['listCustomFields'],
					},
				},
				required: true,
				description: 'Company where the project is located',
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
						operation: ['listCustomFields'],
					},
				},
				required: true,
				description: 'Project to list custom fields from',
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
						placeholder: 'e.g., project-123',
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
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['listCustomFields'],
					},
				},
				default: 'name_ASC',
				description: 'How to sort the custom fields',
				options: [
					{
						name: 'Created Date (Newest First)',
						value: 'createdAt_DESC',
					},
					{
						name: 'Created Date (Oldest First)',
						value: 'createdAt_ASC',
					},
					{
						name: 'Name (A-Z)',
						value: 'name_ASC',
					},
					{
						name: 'Name (Z-A)',
						value: 'name_DESC',
					},
					{
						name: 'Position (High to Low)',
						value: 'position_DESC',
					},
					{
						name: 'Position (Low to High)',
						value: 'position_ASC',
					},
				],
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['listCustomFields'],
					},
				},
				default: 0,
				description: 'Number of custom fields to skip (for pagination)',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Take',
				name: 'take',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['listCustomFields'],
					},
				},
				default: 50,
				description: 'Maximum number of custom fields to return (1-100)',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;

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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
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

			const response = await this.helpers.request(requestOptions);

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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
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

			if (!actualCompanyId) {
				return [{
					name: 'Please Select a Company First',
					value: '',
				}];
			}

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
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

			const response = await this.helpers.request(requestOptions);

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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
			// Try to get the company ID using getCurrentNodeParameter like getCustomRoles does
			const companyIdParam = this.getCurrentNodeParameter('companyId') as any;
			
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

			const credentials = await this.getCredentials('blueApi') as BlueCredentials;
			
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
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

	async getCustomRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const credentials = await this.getCredentials('blueApi');
		
		// Get companyId and projectId from current parameters
		const companyId = this.getCurrentNodeParameter('companyId') as any;
		const projectId = this.getCurrentNodeParameter('projectId') as any;
		
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
					'X-Bloo-Token-ID': credentials.tokenId,
					'X-Bloo-Token-Secret': credentials.tokenSecret,
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

			const response = await this.helpers.request(requestOptions);

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