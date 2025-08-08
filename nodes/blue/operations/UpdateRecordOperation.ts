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
			
			// Custom fields collection (fixedCollection format)
			const customFieldsData = context.executeFunctions.getNodeParameter('customFields', context.itemIndex, {}) as any;
			const customFields = customFieldsData.customField || [];

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

			// Step 2: Update custom fields if provided (collection structure)
			if (customFields && Array.isArray(customFields) && customFields.length > 0) {
				for (let i = 0; i < customFields.length; i++) {
					const customField = customFields[i];
					const customFieldIdParam = customField.customFieldId;
					const customFieldValue = customField.customFieldValue;
					
					// Extract custom field ID from resourceLocator format
					let customFieldId = '';
					if (typeof customFieldIdParam === 'object' && customFieldIdParam.value) {
						customFieldId = customFieldIdParam.value;
					} else if (typeof customFieldIdParam === 'string') {
						customFieldId = customFieldIdParam;
					}
					
					if (customFieldId && customFieldId.trim() !== '') {
						// Extract field ID and type from the combined value
						let fieldId = customFieldId;
						let fieldType = '';
						
						if (typeof customFieldId === 'string' && customFieldId.includes('|')) {
							const parts = customFieldId.split('|');
							fieldId = parts[0];
							fieldType = parts[1];
						}
						
						// Get the actual value
						const actualValue = customFieldValue || '';
						
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

	private buildDynamicCustomFieldMutation(recordId: string, fieldId: string, fieldType: string, value: string): string {
		const inputs = [`customFieldId: "${fieldId}"`, `todoId: "${recordId}"`];

		// Handle different field types with precise mutations
		switch (fieldType) {
			case 'TEXT_SINGLE':
			case 'TEXT_MULTI':
			case 'PHONE':
			case 'EMAIL':
			case 'URL':
				inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				break;
				
			case 'NUMBER':
			case 'PERCENT':
			case 'RATING':
				inputs.push(`number: ${Number(value)}`);
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
				
			case 'DATE':
				// Parse date range format "startDate,endDate" or single date "date,date"
				const dateParts = value.split(',').map(d => d.trim());
				
				if (dateParts.length === 2) {
					// Format start date
					let formattedStartDate = dateParts[0];
					try {
						const startDate = new Date(dateParts[0]);
						if (!isNaN(startDate.getTime())) {
							formattedStartDate = startDate.toISOString();
						}
					} catch (e) {
						// Use original value if parsing fails
					}
					
					// Format end date  
					let formattedEndDate = dateParts[1];
					try {
						const endDate = new Date(dateParts[1]);
						if (!isNaN(endDate.getTime())) {
							formattedEndDate = endDate.toISOString();
						}
					} catch (e) {
						// Use original value if parsing fails
					}
					
					inputs.push(`startDate: "${formattedStartDate}"`);
					inputs.push(`endDate: "${formattedEndDate}"`);
				} else {
					// Fallback: treat as single date, use same for start and end
					let formattedDate = value;
					try {
						const date = new Date(value);
						if (!isNaN(date.getTime())) {
							formattedDate = date.toISOString();
						}
					} catch (e) {
						// Use original value if parsing fails
					}
					inputs.push(`startDate: "${formattedDate}"`);
					inputs.push(`endDate: "${formattedDate}"`);
				}
				break;
				
			case 'LOCATION':
				const [lat, lng] = value.split(',').map(v => v.trim());
				if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
					inputs.push(`latitude: ${lat}`);
					inputs.push(`longitude: ${lng}`);
				}
				break;
				
			case 'CURRENCY':
				// Parse currency value from formats like "100 USD", "USD 100", "100", or "USD100"
				const currencyMatch = value.match(/^(\$?[A-Z]{3})?\s*(\d+(?:\.\d+)?)\s*([A-Z]{3})?$/i) || 
								     value.match(/^(\d+(?:\.\d+)?)\s*([A-Z]{3})$/i);
				
				if (currencyMatch) {
					let amount: number;
					let currency: string;
					
					// Handle different formats
					if (currencyMatch[2] && currencyMatch[3]) {
						// Format: "100 USD" or "USD 100"
						amount = parseFloat(currencyMatch[2]);
						currency = currencyMatch[3] || currencyMatch[1]?.replace('$', '') || 'USD';
					} else if (currencyMatch[1] && currencyMatch[2]) {
						// Format: "USD100" or "$100"
						amount = parseFloat(currencyMatch[2]);
						currency = currencyMatch[1].replace('$', '');
					} else {
						// Just a number, default to USD
						amount = parseFloat(value);
						currency = 'USD';
					}
					
					inputs.push(`number: ${amount}`);
					inputs.push(`currency: "${currency.toUpperCase()}"`);
				} else {
					// Fallback to text if parsing fails
					inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				}
				break;
				
			case 'COUNTRY':
				// Parse country value from formats like "AF,Afghanistan" or "Afghanistan,AF"
				const countryParts = value.split(',').map(part => part.trim());
				
				if (countryParts.length === 2) {
					let countryCode = '';
					let countryName = '';
					
					// Check if first part is a 2-letter country code
					if (countryParts[0].length === 2 && /^[A-Z]{2}$/i.test(countryParts[0])) {
						// Format: "AF,Afghanistan"
						countryCode = countryParts[0].toUpperCase();
						countryName = countryParts[1];
					} else if (countryParts[1].length === 2 && /^[A-Z]{2}$/i.test(countryParts[1])) {
						// Format: "Afghanistan,AF"
						countryName = countryParts[0];
						countryCode = countryParts[1].toUpperCase();
					} else {
						// Can't determine format, fallback to text only
						inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
						break;
					}
					
					inputs.push(`countryCodes: ["${countryCode}"]`);
					inputs.push(`text: "${this.escapeGraphQLString(countryName)}"`);
				} else {
					// Single value, assume it's country name only
					inputs.push(`text: "${this.escapeGraphQLString(value)}"`);
				}
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
					${inputs.join(',\n\t\t\t\t\t')}
				}
			)
		}`;
	}

	private escapeGraphQLString(str: string): string {
		return str.replace(/"/g, '\\\\"').replace(/\\n/g, '\\\\n').replace(/\\r/g, '\\\\r');
	}
}