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
					if (field.fieldId) {
						const fieldValue = this.extractFieldValue(field);
						if (fieldValue !== null) {
							const customFieldMutation = this.buildCustomFieldMutation(recordId, field.fieldId, fieldValue);
							
							try {
								const customFieldResponse = await this.makeGraphQLRequest(context, customFieldMutation, {}, companyId, projectId);
								const customFieldData = this.handleGraphQLResponse(
									customFieldResponse,
									context.additionalOptions.fullResponse as boolean,
								);
								results.push({ 
									type: 'custom_field_update', 
									fieldId: field.fieldId, 
									fieldType: field.fieldType,
									data: customFieldData 
								});
							} catch (customFieldError) {
								// If custom field fails, throw error with mutation details for debugging
								throw new Error(`Custom field mutation failed. Mutation: ${customFieldMutation}. CompanyId: ${companyId}. ProjectId: ${projectId}. Error: ${customFieldError instanceof Error ? customFieldError.message : 'Unknown error'}`);
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

	private buildCustomFieldMutation(recordId: string, fieldId: string, fieldValue: any): string {
		// Handle different field types based on the value structure
		const inputs = [`customFieldId: "${fieldId}"`, `todoId: "${recordId}"`];

		if (typeof fieldValue === 'object' && fieldValue !== null) {
			// Handle complex field types
			if (fieldValue.type === 'phone' && fieldValue.text && fieldValue.regionCode) {
				inputs.push(`text: "${fieldValue.text}"`);
				inputs.push(`regionCode: "${fieldValue.regionCode}"`);
			} else if (fieldValue.type === 'location' && fieldValue.latitude && fieldValue.longitude) {
				inputs.push(`latitude: ${fieldValue.latitude}`);
				inputs.push(`longitude: ${fieldValue.longitude}`);
				if (fieldValue.text) inputs.push(`text: "${this.escapeGraphQLString(fieldValue.text)}"`);
			} else if (fieldValue.type === 'countries' && fieldValue.countryCodes) {
				inputs.push(`countryCodes: [${fieldValue.countryCodes.map((code: string) => `"${code}"`).join(', ')}]`);
				if (fieldValue.text) inputs.push(`text: "${this.escapeGraphQLString(fieldValue.text)}"`);
			} else if (fieldValue.type === 'selection' && fieldValue.optionIds) {
				inputs.push(`customFieldOptionIds: [${fieldValue.optionIds.map((id: string) => `"${id}"`).join(', ')}]`);
			} else if (fieldValue.type === 'checkbox' && typeof fieldValue.checked === 'boolean') {
				inputs.push(`checked: ${fieldValue.checked}`);
			}
		} else {
			// Handle simple field types
			if (typeof fieldValue === 'string') {
				inputs.push(`text: "${this.escapeGraphQLString(fieldValue)}"`);
			} else if (typeof fieldValue === 'number') {
				inputs.push(`number: ${fieldValue}`);
			} else if (typeof fieldValue === 'boolean') {
				inputs.push(`checked: ${fieldValue}`);
			}
		}

		return `mutation {
			setTodoCustomField(
				input: {
					${inputs.join(',\n\t\t\t\t\t')}
				}
			)
		}`;
	}

	private extractFieldValue(field: any): any {
		const { fieldType } = field;

		switch (fieldType) {
			case 'text':
				return field.textValue || null;

			case 'number':
				return field.numberValue !== undefined ? field.numberValue : null;

			case 'checkbox':
				return field.checkboxValue !== undefined ? field.checkboxValue : null;

			case 'selection':
				if (field.selectionIds) {
					const optionIds = field.selectionIds.split(',').map((id: string) => id.trim()).filter(Boolean);
					return optionIds.length > 0 ? { type: 'selection', optionIds } : null;
				}
				return null;

			case 'phone':
				if (field.phoneNumber && field.regionCode) {
					return {
						type: 'phone',
						text: field.phoneNumber,
						regionCode: field.regionCode
					};
				}
				return null;

			case 'location':
				if (field.latitude !== undefined && field.longitude !== undefined) {
					const locationData: any = {
						type: 'location',
						latitude: field.latitude,
						longitude: field.longitude
					};
					if (field.locationText) {
						locationData.text = field.locationText;
					}
					return locationData;
				}
				return null;

			case 'countries':
				if (field.countryCodes) {
					const codes = field.countryCodes.split(',').map((code: string) => code.trim()).filter(Boolean);
					if (codes.length > 0) {
						return {
							type: 'countries',
							countryCodes: codes,
							text: field.countriesText || ''
						};
					}
				}
				return null;

			default:
				return null;
		}
	}

	private escapeGraphQLString(str: string): string {
		return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
	}
}