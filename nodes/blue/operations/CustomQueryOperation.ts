import { IDataObject } from 'n8n-workflow';
import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class CustomQueryOperation extends BaseBlueOperation {
	readonly name = 'customQuery';
	readonly description = 'Execute a custom GraphQL query';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
			const query = context.executeFunctions.getNodeParameter('query', context.itemIndex) as string;
			const variables = context.executeFunctions.getNodeParameter('variables', context.itemIndex) as IDataObject;
			const companyId = context.executeFunctions.getNodeParameter('companyId', context.itemIndex, '') as string;
			const projectId = context.executeFunctions.getNodeParameter('projectId', context.itemIndex, '') as string;

			// Validate query
			if (!query || query.trim() === '') {
				return {
					success: false,
					error: 'GraphQL query cannot be empty',
				};
			}

			// Validate variables if provided
			let parsedVariables: IDataObject = {};
			if (variables && typeof variables === 'string') {
				try {
					parsedVariables = JSON.parse(variables);
				} catch (error) {
					return {
						success: false,
						error: 'Invalid JSON in variables field',
					};
				}
			} else if (variables && typeof variables === 'object') {
				parsedVariables = variables;
			}

			const response = await this.makeGraphQLRequest(
				context,
				query,
				parsedVariables,
				companyId || undefined,
				projectId || undefined,
			);

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