import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class CreateProjectOperation extends BaseBlueOperation {
	readonly name = 'createProject';
	readonly description = 'Create a new project from a template';

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

			// Required fields
			const name = context.executeFunctions.getNodeParameter('name', context.itemIndex) as string;
			const templateIdParam = context.executeFunctions.getNodeParameter('templateId', context.itemIndex) as any;
			
			// Extract template ID from resourceLocator format
			let templateId = '';
			if (typeof templateIdParam === 'object' && templateIdParam.value) {
				templateId = templateIdParam.value;
			} else if (typeof templateIdParam === 'string') {
				templateId = templateIdParam;
			}

			const createMutation = this.buildCreateProjectMutation({
				companyId,
				name,
				templateId,
			});

			const response = await this.makeGraphQLRequest(context, createMutation, {}, companyId);
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

	private buildCreateProjectMutation(fields: any): string {
		return `mutation CreateProject {
			createProject(
				input: {
					templateId: "${fields.templateId}"
					name: "${this.escapeGraphQLString(fields.name)}"
					companyId: "${fields.companyId}"
				}
			) {
				id
				name
				slug
				position
				archived
				company {
					id
					name
				}
				createdAt
				updatedAt
			}
		}`;
	}

	private escapeGraphQLString(str: string): string {
		return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
	}
}