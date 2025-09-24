export const properties = [
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
		// SHARED COMPANY FIELD - Used by ALL operations (except getCompanies)
		{
			displayName: 'Company',
			name: 'companyId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			displayOptions: {
				show: {
					operation: ['getProjects', 'getRecords', 'updateRecord', 'tagRecord', 'createRecord', 'createProject', 'inviteUser', 'listCustomFields'],
				},
			},
			required: true,
			description: 'Company containing the records/projects',
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
		// SHARED PROJECT FIELD - Used by operations that need projects
		{
			displayName: 'Project',
			name: 'projectId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			displayOptions: {
				show: {
					operation: ['getRecords', 'updateRecord', 'tagRecord', 'createRecord', 'inviteUser', 'listCustomFields'],
				},
			},
			description: 'Project to work with (optional for getRecords, required for others)',
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
		// Get Records Section - Uses shared company/project fields
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
		// Update Record Section - Uses shared company/project fields
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
				loadOptionsDependsOn: ['companyId', 'projectId'],
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
		// Create Record Section - Uses shared company/project fields
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
		// Create Project Section - Uses shared company field
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
		// Invite User Section - Uses shared company/project fields
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
		// List Custom Fields Section - Uses shared company/project fields
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
	];