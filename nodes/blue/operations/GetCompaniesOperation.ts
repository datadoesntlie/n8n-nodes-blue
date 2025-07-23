import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class GetCompaniesOperation extends BaseBlueOperation {
	readonly name = 'getCompanies';
	readonly description = 'List all companies you have access to';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
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

			const response = await this.makeGraphQLRequest(context, query);
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