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
			
			// Custom field - now individual field instead of collection
			const customFieldId = context.executeFunctions.getNodeParameter('customFieldId', context.itemIndex, '') as string;

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

			// Step 2: Update custom field if provided (new single field structure)
			if (customFieldId && customFieldId.trim() !== '') {
				// Extract field ID and type from the combined value
				let fieldId = customFieldId;
				let fieldType = '';
				
				if (typeof customFieldId === 'string' && customFieldId.includes('|')) {
					const parts = customFieldId.split('|');
					fieldId = parts[0];
					fieldType = parts[1];
				}
				
				// Get the actual value based on field type and available parameters
				let actualValue = '';
				
				// Check each possible field type and get the corresponding value
				if (fieldType === 'TEXT_SINGLE' || fieldType === 'TEXT_MULTI' || fieldType === 'PHONE' || fieldType === 'EMAIL' || fieldType === 'URL') {
					actualValue = context.executeFunctions.getNodeParameter('customFieldTextValue', context.itemIndex, '') as string;
				} else if (fieldType === 'NUMBER') {
					const numValue = context.executeFunctions.getNodeParameter('customFieldNumberValue', context.itemIndex, 0) as number;
					actualValue = numValue !== 0 ? numValue.toString() : '';
				} else if (fieldType === 'PERCENT') {
					const percentValue = context.executeFunctions.getNodeParameter('customFieldPercentValue', context.itemIndex, 0) as number;
					actualValue = percentValue !== 0 ? percentValue.toString() : '';
				} else if (fieldType === 'STAR_RATING') {
					const ratingValue = context.executeFunctions.getNodeParameter('customFieldRatingValue', context.itemIndex, 0) as number;
					actualValue = ratingValue !== 0 ? ratingValue.toString() : '';
				} else if (fieldType === 'CURRENCY') {
					actualValue = context.executeFunctions.getNodeParameter('customFieldCurrencyValue', context.itemIndex, '') as string;
				} else if (fieldType === 'COUNTRY') {
					actualValue = context.executeFunctions.getNodeParameter('customFieldCountryValue', context.itemIndex, '') as string;
				} else if (fieldType === 'DATE') {
					// Try date picker first, then manual input
					const dateValue = context.executeFunctions.getNodeParameter('customFieldDateValue', context.itemIndex, '') as string;
					const manualDateValue = context.executeFunctions.getNodeParameter('customFieldDateManual', context.itemIndex, '') as string;
					actualValue = dateValue || manualDateValue || '';
				} else if (fieldType === 'LOCATION') {
					const latitude = context.executeFunctions.getNodeParameter('customFieldLatitude', context.itemIndex, 0) as number;
					const longitude = context.executeFunctions.getNodeParameter('customFieldLongitude', context.itemIndex, 0) as number;
					if (latitude !== 0 || longitude !== 0) {
						actualValue = `${latitude},${longitude}`;
					}
				} else if (fieldType === 'CHECKBOX') {
					const checkboxValue = context.executeFunctions.getNodeParameter('customFieldCheckboxValue', context.itemIndex, false) as boolean;
					actualValue = checkboxValue ? 'true' : 'false';
				} else if (fieldType === 'SELECT_SINGLE') {
					actualValue = context.executeFunctions.getNodeParameter('customFieldSelectValue', context.itemIndex, '') as string;
				} else if (fieldType === 'SELECT_MULTI') {
					const multiValues = context.executeFunctions.getNodeParameter('customFieldMultiSelectValue', context.itemIndex, []) as string[];
					actualValue = Array.isArray(multiValues) ? multiValues.join(',') : '';
				}
				
				// Only proceed if we have a value
				if (actualValue && actualValue.toString().trim() !== '') {
					const customFieldMutation = this.buildDynamicCustomFieldMutation(recordId, fieldId, fieldType, actualValue);
					
					try {
						const customFieldResponse = await this.makeGraphQLRequest(context, customFieldMutation, {}, companyId, projectId);
						const customFieldData = this.handleGraphQLResponse(
							customFieldResponse,
							context.additionalOptions.fullResponse as boolean,
						);
						results.push({ 
							type: 'custom_field_update', 
							fieldId: fieldId, 
							fieldType: fieldType,
							value: actualValue,
							data: customFieldData 
						});
					} catch (customFieldError) {
						// If custom field fails, throw error with mutation details for debugging
						throw new Error(`Custom field mutation failed for field ${fieldId} (${fieldType}) with value "${actualValue}". Mutation: ${customFieldMutation}. CompanyId: ${companyId}. ProjectId: ${projectId}. Error: ${customFieldError instanceof Error ? customFieldError.message : 'Unknown error'}`);
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
					${inputs.join(',\\n\\t\\t\\t\\t\\t')}
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

	private buildDynamicCustomFieldMutation(recordId: string, fieldId: string, fieldType: string, value: string): string {
		const inputs = [`customFieldId: "${fieldId}"`, `todoId: "${recordId}"`];

		// Handle different field types with precise mutations
		switch (fieldType) {
			case 'TEXT_SINGLE':
			case 'TEXT_MULTI':
			case 'PHONE':
			case 'EMAIL':
			case 'URL':
			case 'STAR_RATING':
			case 'PERCENT':
				inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				break;
				
			case 'SELECT_SINGLE':
				inputs.push(`customFieldOptionIds: ["${value}"]`);
				break;
				
			case 'SELECT_MULTI':
				const optionIds = value.split(',').map(id => id.trim()).filter(Boolean);
				inputs.push(`customFieldOptionIds: [${optionIds.map(id => `"${id}"`).join(', ')}]`);
				break;
				
			case 'CHECKBOX':
				const boolValue = value.toLowerCase() === 'true' || value === '1';
				inputs.push(`checked: ${boolValue}`);
				break;
				
			case 'NUMBER':
				inputs.push(`number: ${Number(value)}`);
				break;
				
			case 'DATE':
				// Ensure date is in proper ISO format
				let formattedDate = value;
				try {
					const date = new Date(value);
					if (!isNaN(date.getTime())) {
						formattedDate = date.toISOString();
					}
				} catch (e) {
					// Use original value if parsing fails
				}
				inputs.push(`text: "${formattedDate}"`);
				break;
				
			case 'LOCATION':
				const [lat, lng] = value.split(',').map(v => v.trim());
				if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
					inputs.push(`latitude: ${lat}`);
					inputs.push(`longitude: ${lng}`);
				}
				break;
				
			case 'CURRENCY':
				inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				break;
				
			case 'COUNTRY':
				inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				break;
				
			default:
				// Fallback to text for unknown types
				inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				break;
		}

		return this.buildMutationQuery(inputs);
	}

	private buildMutationQuery(inputs: string[]): string {
		return `mutation {
			setTodoCustomField(
				input: {
					${inputs.join(',\\n\\t\\t\\t\\t\\t')}
				}
			)
		}`;
	}

	private escapeGraphQLString(str: string): string {
		return str.replace(/"/g, '\\\\"').replace(/\\n/g, '\\\\n').replace(/\\r/g, '\\\\r');
	}
}