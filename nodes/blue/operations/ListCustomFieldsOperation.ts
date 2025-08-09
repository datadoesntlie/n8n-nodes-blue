import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class ListCustomFieldsOperation extends BaseBlueOperation {
	readonly name = 'listCustomFields';
	readonly description = 'List custom fields in a project with detailed information';

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

			// Optional pagination parameters
			const skip = context.executeFunctions.getNodeParameter('skip', context.itemIndex, 0) as number;
			const take = context.executeFunctions.getNodeParameter('take', context.itemIndex, 50) as number;
			const sortOrder = context.executeFunctions.getNodeParameter('sortOrder', context.itemIndex, 'name_ASC') as string;

			// Validate required fields
			if (!companyId || !companyId.trim()) {
				throw new Error('Company ID is required');
			}
			
			if (!projectId || !projectId.trim()) {
				throw new Error('Project ID is required');
			}

			// Validate pagination parameters
			if (skip < 0) {
				throw new Error('Skip must be >= 0');
			}
			
			if (take < 1 || take > 100) {
				throw new Error('Take must be between 1 and 100');
			}

			const query = this.buildCustomFieldsQuery(projectId, sortOrder, skip, take);
			
			const response = await this.makeGraphQLRequest(context, query, {}, companyId, projectId);
			const data = this.handleGraphQLResponse(
				response,
				context.additionalOptions.fullResponse as boolean,
			);

			return {
				success: true,
				data: {
					projectId,
					pagination: {
						skip,
						take,
						sortOrder,
					},
					result: data,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	private buildCustomFieldsQuery(projectId: string, sortOrder: string, skip: number, take: number): string {
		return `query ListCustomFieldsAdvanced {
			customFields(
				filter: {
					projectId: "${projectId}"
				}
				sort: ${sortOrder}
				skip: ${skip}
				take: ${take}
			) {
				items {
					id
					uid
					name
					type
					position
					description
					
					# Type-specific fields
					min              # For NUMBER, RATING, PERCENT
					max              # For NUMBER, RATING, PERCENT
					currency         # For CURRENCY type
					prefix           # For UNIQUE_ID type
					isDueDate        # For DATE type
					formula          # For FORMULA type
					
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
	}
}