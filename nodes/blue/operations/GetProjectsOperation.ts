import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class GetProjectsOperation extends BaseBlueOperation {
	readonly name = 'getProjects';
	readonly description = 'Retrieve all projects';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
			const companyIdParam = context.executeFunctions.getNodeParameter('companyId', context.itemIndex) as any;
			
			// Extract company ID from resourceLocator
			let companyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				companyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				companyId = companyIdParam;
			}
			
			if (!companyId) {
				throw new Error('Company ID is required');
			}

			const query = `query FilteredProjectList {
				projectList(
					filter: {
						companyIds: ["${companyId}"]
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

			const response = await this.makeGraphQLRequest(context, query, {}, companyId);
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
}