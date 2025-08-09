import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class CreateRecordOperation extends BaseBlueOperation {
	readonly name = 'createRecord';
	readonly description = 'Create a new record (todo/task) with custom fields';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
			const companyIdParam = context.executeFunctions.getNodeParameter('companyId', context.itemIndex) as any;
			
			// Extract company ID from resourceLocator format
			let companyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				companyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				companyId = companyIdParam;
			}
			
			// Extract projectId from resourceLocator format
			const projectIdParam = context.executeFunctions.getNodeParameter('projectId', context.itemIndex) as any;
			let projectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				projectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				projectId = projectIdParam;
			}

			// Extract todoListId from resourceLocator format
			const todoListIdParam = context.executeFunctions.getNodeParameter('todoListId', context.itemIndex) as any;
			let todoListId = '';
			if (typeof todoListIdParam === 'object' && todoListIdParam.value) {
				todoListId = todoListIdParam.value;
			} else if (typeof todoListIdParam === 'string') {
				todoListId = todoListIdParam;
			}

			// Basic required fields
			const title = context.executeFunctions.getNodeParameter('title', context.itemIndex) as string;
			
			// Optional fields
			const description = context.executeFunctions.getNodeParameter('description', context.itemIndex, '') as string;
			const startDate = context.executeFunctions.getNodeParameter('startDate', context.itemIndex, '') as string;
			const dueDate = context.executeFunctions.getNodeParameter('dueDate', context.itemIndex, '') as string;
			const placement = context.executeFunctions.getNodeParameter('placement', context.itemIndex, 'BOTTOM') as string;
			const notify = context.executeFunctions.getNodeParameter('notify', context.itemIndex, false) as boolean;
			
			// Assignee IDs (multiOptions array)
			const assigneeIds = context.executeFunctions.getNodeParameter('assigneeIds', context.itemIndex, []) as string[];
			
			// Tag IDs (multiOptions array)
			const tagIds = context.executeFunctions.getNodeParameter('tagIds', context.itemIndex, []) as string[];
			
			// Custom fields (manual input for now)
			const customFieldsCollection = context.executeFunctions.getNodeParameter('customFields', context.itemIndex, {}) as any;
			const customFields = customFieldsCollection.customField || [];
			
			// Checklists (manual input for now)
			const checklistsCollection = context.executeFunctions.getNodeParameter('checklists', context.itemIndex, {}) as any;
			const checklists = checklistsCollection.checklist || [];

			const createMutation = this.buildCreateMutation({
				todoListId,
				title,
				description,
				startDate,
				dueDate,
				placement,
				notify,
				assigneeIds,
				tagIds,
				customFields,
				checklists,
			});

			const response = await this.makeGraphQLRequest(context, createMutation, {}, companyId, projectId);
			const data = this.handleGraphQLResponse(
				response,
				context.additionalOptions.fullResponse as boolean,
			);

			return {
				success: true,
				data,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	private buildCreateMutation(fields: any): string {
		const inputs = [];
		
		// Required fields
		inputs.push(`todoListId: "${fields.todoListId}"`);
		inputs.push(`title: "${this.escapeGraphQLString(fields.title)}"`);
		inputs.push(`placement: ${fields.placement}`);
		
		// Optional basic fields
		if (fields.description && fields.description.trim() !== '') {
			inputs.push(`description: "${this.escapeGraphQLString(fields.description)}"`);
		}
		
		if (fields.startDate && fields.startDate.trim() !== '') {
			let formattedStartDate = fields.startDate;
			try {
				const date = new Date(fields.startDate);
				if (!isNaN(date.getTime())) {
					formattedStartDate = date.toISOString();
				}
			} catch (e) {
				// If date parsing fails, use the original value
			}
			inputs.push(`startedAt: "${formattedStartDate}"`);
		}
		
		if (fields.dueDate && fields.dueDate.trim() !== '') {
			let formattedDueDate = fields.dueDate;
			try {
				const date = new Date(fields.dueDate);
				if (!isNaN(date.getTime())) {
					formattedDueDate = date.toISOString();
				}
			} catch (e) {
				// If date parsing fails, use the original value
			}
			inputs.push(`duedAt: "${formattedDueDate}"`);
		}
		
		if (fields.notify !== undefined) {
			inputs.push(`notify: ${fields.notify}`);
		}
		
		// Assignee IDs
		if (fields.assigneeIds && fields.assigneeIds.length > 0) {
			const assigneeIdsStr = fields.assigneeIds.map((id: string) => `"${id}"`).join(', ');
			inputs.push(`assigneeIds: [${assigneeIdsStr}]`);
		}
		
		// Tags (from multiOptions - array of existing tag IDs)
		if (fields.tagIds && fields.tagIds.length > 0) {
			const tagsStr = fields.tagIds.map((tagId: string) => `{ id: "${tagId}" }`).join(', ');
			inputs.push(`tags: [${tagsStr}]`);
		}
		
		// Custom fields (with universal field support like UpdateRecordOperation)
		if (fields.customFields && fields.customFields.length > 0) {
			const customFieldsStr = fields.customFields.map((field: any) => {
				// Extract custom field ID from resourceLocator format
				let customFieldId = '';
				if (typeof field.customFieldId === 'object' && field.customFieldId.value) {
					customFieldId = field.customFieldId.value;
				} else if (typeof field.customFieldId === 'string') {
					customFieldId = field.customFieldId;
				}
				
				// Extract field ID and type from the combined value
				let fieldId = customFieldId;
				let fieldType = '';
				
				if (typeof customFieldId === 'string' && customFieldId.includes('|')) {
					const parts = customFieldId.split('|');
					fieldId = parts[0];
					fieldType = parts[1];
				}
				
				// Get the value (using customFieldValue for new format)
				const fieldValue = field.customFieldValue || field.value || '';
				
				// Only include if we have both field ID and value
				if (fieldId && fieldValue) {
					// Use the same value processing as UpdateRecordOperation
					const processedValue = this.processCustomFieldValue(fieldType, fieldValue);
					return `{ customFieldId: "${fieldId}", value: "${this.escapeGraphQLString(processedValue)}" }`;
				}
				return null;
			}).filter(Boolean).join(', ');
			
			if (customFieldsStr) {
				inputs.push(`customFields: [${customFieldsStr}]`);
			}
		}
		
		// Checklists
		if (fields.checklists && fields.checklists.length > 0) {
			const checklistsStr = fields.checklists.map((checklist: any, index: number) => {
				return `{ title: "${this.escapeGraphQLString(checklist.title)}", position: ${checklist.position || index + 1} }`;
			}).join(', ');
			inputs.push(`checklists: [${checklistsStr}]`);
		}

		return `mutation CreateRecordAdvanced {
			createTodo(
				input: {
					${inputs.join(',\n\t\t\t\t\t')}
				}
			) {
				id
				uid
				title
				position
				startedAt
				duedAt
				todoList {
					id
					title
				}
				users {
					id
					fullName
				}
				tags {
					id
					title
					color
				}
			}
		}`;
	}

	private escapeGraphQLString(str: string): string {
		return str.replace(/\"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
	}

	private processCustomFieldValue(fieldType: string, value: string): string {
		// Process different field types for create operations (simplified version)
		switch (fieldType) {
			case 'DATE':
				// For create operations, handle single dates
				try {
					const date = new Date(value);
					if (!isNaN(date.getTime())) {
						return date.toISOString();
					}
				} catch (e) {
					// Use original value if parsing fails
				}
				return value;
				
			case 'LOCATION':
				// Expect "latitude,longitude" format
				const parts = value.split(',').map(v => v.trim());
				if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
					return `${parts[0]},${parts[1]}`;
				}
				return value;
				
			case 'COUNTRY':
				// Handle "CountryCode,CountryName" format - for create we just use the name
				const countryParts = value.split(',').map(part => part.trim());
				if (countryParts.length === 2) {
					// Return country name part
					return countryParts[1] || countryParts[0];
				}
				return value;
				
			case 'CURRENCY':
				// Parse currency format for create operations
				const currencyMatch = value.match(/^(\$?[A-Z]{3})?\s*(\d+(?:\.\d+)?)\s*([A-Z]{3})?$/i) || 
								     value.match(/^(\d+(?:\.\d+)?)\s*([A-Z]{3})$/i);
				
				if (currencyMatch) {
					let amount: number;
					let currency: string;
					
					if (currencyMatch[2] && currencyMatch[3]) {
						amount = parseFloat(currencyMatch[2]);
						currency = currencyMatch[3] || currencyMatch[1]?.replace('$', '') || 'USD';
					} else if (currencyMatch[1] && currencyMatch[2]) {
						amount = parseFloat(currencyMatch[2]);
						currency = currencyMatch[1].replace('$', '');
					} else {
						amount = parseFloat(value);
						currency = 'USD';
					}
					
					return `${amount}${currency.toUpperCase()}`;
				}
				return value;
				
			default:
				// For all other types (TEXT, NUMBER, etc.), use value as-is
				return value;
		}
	}
}