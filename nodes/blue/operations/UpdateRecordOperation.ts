import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class UpdateRecordOperation extends BaseBlueOperation {
	readonly name = 'updateRecord';
	readonly description = 'Update a record (todo/task) with custom fields';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
			const recordId = context.executeFunctions.getNodeParameter('recordId', context.itemIndex) as string;
			const companyIdParam = context.executeFunctions.getNodeParameter('companyId', context.itemIndex) as any;
			
			// Extract company ID from resourceLocator format
			let companyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				companyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				companyId = companyIdParam;
			}
			
			// Extract projectId from resourceLocator format (might be needed for custom fields)
		const projectIdParam = context.executeFunctions.getNodeParameter('projectId', context.itemIndex, '') as any;
		let projectId = '';
		if (typeof projectIdParam === 'object' && projectIdParam.value) {
			projectId = projectIdParam.value;
		} else if (typeof projectIdParam === 'string') {
			projectId = projectIdParam;
		}
			
			// Basic fields
			const title = context.executeFunctions.getNodeParameter('title', context.itemIndex, '') as string;
			const description = context.executeFunctions.getNodeParameter('description', context.itemIndex, '') as string;
			const startDate = context.executeFunctions.getNodeParameter('startDate', context.itemIndex, '') as string;
			const dueDate = context.executeFunctions.getNodeParameter('dueDate', context.itemIndex, '') as string;
			// Extract todoListId from resourceLocator format
			const todoListIdParam = context.executeFunctions.getNodeParameter('todoListId', context.itemIndex, '') as any;
			let todoListId = '';
			if (typeof todoListIdParam === 'object' && todoListIdParam.value) {
				todoListId = todoListIdParam.value;
			} else if (typeof todoListIdParam === 'string') {
				todoListId = todoListIdParam;
			}
			const position = context.executeFunctions.getNodeParameter('position', context.itemIndex, '') as string;
			const color = context.executeFunctions.getNodeParameter('color', context.itemIndex, '') as string;
			
			// Custom fields collection
			const customFieldsCollection = context.executeFunctions.getNodeParameter('customFields', context.itemIndex, {}) as any;
			const customFields = customFieldsCollection.customField || [];

			const results = [];

			// Step 1: Update core record properties if any are provided
			const hasTitle = title && title.trim() !== '';
			const hasDescription = description && description.trim() !== '';
			const hasStartDate = startDate && startDate.trim() !== '';
			const hasDueDate = dueDate && dueDate.trim() !== '';
			const hasTodoListId = todoListId && todoListId.trim() !== '';
			const hasPosition = position && position !== '' && !isNaN(Number(position));
			const hasColor = color && color.trim() !== '';
			
			if (hasTitle || hasDescription || hasStartDate || hasDueDate || hasTodoListId || hasPosition || hasColor) {
				const coreUpdateMutation = this.buildCoreUpdateMutation(recordId, {
					title,
					description,
					startDate,
					dueDate,
					todoListId,
					position,
					color
				});

				const coreResponse = await this.makeGraphQLRequest(context, coreUpdateMutation, {}, companyId);
				const coreData = this.handleGraphQLResponse(
					coreResponse,
					context.additionalOptions.fullResponse as boolean,
				);
				results.push({ type: 'core_update', data: coreData });
			}

			// Step 2: Update custom fields if any are provided
			if (customFields && Array.isArray(customFields) && customFields.length > 0) {
				for (const field of customFields) {
					if (field.customFieldId && field.value && field.value.trim() !== '') {
						const customFieldMutation = this.buildSimpleCustomFieldMutation(recordId, field.customFieldId, field.value);
						
						try {
							const customFieldResponse = await this.makeGraphQLRequest(context, customFieldMutation, {}, companyId, projectId);
							const customFieldData = this.handleGraphQLResponse(
								customFieldResponse,
								context.additionalOptions.fullResponse as boolean,
							);
							results.push({ 
								type: 'custom_field_update', 
								fieldId: field.customFieldId, 
								value: field.value,
								data: customFieldData 
							});
						} catch (customFieldError) {
							// If custom field fails, throw error with mutation details for debugging
							throw new Error(`Custom field mutation failed for field ${field.customFieldId} with value "${field.value}". Mutation: ${customFieldMutation}. CompanyId: ${companyId}. ProjectId: ${projectId}. Error: ${customFieldError instanceof Error ? customFieldError.message : 'Unknown error'}`);
						}
					}
				}
			}

			return {
				success: true,
				data: {
					recordId,
					updates: results,
					message: `Successfully updated record with ${results.length} operations`
				},
			};
		} catch (error) {
			// For debugging GraphQL validation errors, include more context
			let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			if (errorMessage.includes('GRAPHQL_VALIDATION_FAILED')) {
				errorMessage += ' - Check n8n logs for GraphQL mutation details';
			}
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	private buildCoreUpdateMutation(recordId: string, fields: any): string {
		const inputs = [];
		
		if (fields.title && fields.title.trim() !== '') {
			inputs.push(`title: "${this.escapeGraphQLString(fields.title)}"`);
		}
		if (fields.description && fields.description.trim() !== '') {
			inputs.push(`html: "${this.escapeGraphQLString(fields.description)}"`);
			inputs.push(`text: "${this.escapeGraphQLString(fields.description)}"`);
		}
		if (fields.startDate && fields.startDate.trim() !== '') {
			// Ensure start date is in ISO 8601 format
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
			// Ensure due date is in ISO 8601 format
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
		if (fields.todoListId && fields.todoListId.trim() !== '') {
			inputs.push(`todoListId: "${fields.todoListId}"`);
		}
		if (fields.position && fields.position !== '' && !isNaN(Number(fields.position))) {
			inputs.push(`position: ${fields.position}`);
		}
		if (fields.color && fields.color.trim() !== '') {
			inputs.push(`color: "${fields.color}"`);
		}

		return `mutation UpdateRecordDetails {
			editTodo(
				input: {
					todoId: "${recordId}"${inputs.length > 0 ? ',' : ''}
					${inputs.join(',\n\t\t\t\t\t')}
				}
			) {
				id
				title
				position
				html
				text
				color
				duedAt
				updatedAt
			}
		}`;
	}

	private buildSimpleCustomFieldMutation(recordId: string, fieldId: string, value: string): string {
		// Parse different value formats based on the string content
		const inputs = [`customFieldId: "${fieldId}"`, `todoId: "${recordId}"`];

		// Handle different value formats
		if (value.includes(',') && (value.includes('.') || /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value))) {
			// Location format: "latitude,longitude"
			const [lat, lng] = value.split(',').map(v => v.trim());
			if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
				inputs.push(`latitude: ${lat}`);
				inputs.push(`longitude: ${lng}`);
				return this.buildMutationQuery(inputs);
			}
		}

		// Handle comma-separated values (multi-select options)
		if (value.includes(',') && !value.includes('.')) {
			const options = value.split(',').map(v => v.trim()).filter(Boolean);
			if (options.length > 1) {
				inputs.push(`customFieldOptionIds: [${options.map(id => `"${id}"`).join(', ')}]`);
				return this.buildMutationQuery(inputs);
			}
		}

		// Handle boolean-like values
		const lowerValue = value.toLowerCase();
		if (['true', 'false', '1', '0', 'checked', 'unchecked'].includes(lowerValue)) {
			const boolValue = ['true', '1', 'checked'].includes(lowerValue);
			inputs.push(`checked: ${boolValue}`);
			return this.buildMutationQuery(inputs);
		}

		// Handle numeric values
		if (!isNaN(Number(value)) && value.trim() !== '') {
			inputs.push(`number: ${Number(value)}`);
			return this.buildMutationQuery(inputs);
		}

		// Handle single option ID (if it looks like an option ID)
		if (value.startsWith('option_') || /^[a-zA-Z0-9_-]+$/.test(value)) {
			inputs.push(`customFieldOptionIds: ["${value}"]`);
			return this.buildMutationQuery(inputs);
		}

		// Default: treat as text
		inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
		return this.buildMutationQuery(inputs);
	}

	private buildMutationQuery(inputs: string[]): string {
		return `mutation {
			setTodoCustomField(
				input: {
					${inputs.join(',\n\t\t\t\t\t')}
				}
			)
		}`;
	}


	private escapeGraphQLString(str: string): string {
		return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
	}
}