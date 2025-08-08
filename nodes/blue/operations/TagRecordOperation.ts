import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class TagRecordOperation extends BaseBlueOperation {
	readonly name = 'tagRecord';
	readonly description = 'Add tags to a record (todo/task)';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
			const recordId = context.executeFunctions.getNodeParameter('recordId', context.itemIndex) as string;
			const companyIdParam = context.executeFunctions.getNodeParameter('companyId', context.itemIndex) as any;
			const projectIdParam = context.executeFunctions.getNodeParameter('projectId', context.itemIndex) as any;
			
			// Extract company ID from resourceLocator format
			let companyId = '';
			if (typeof companyIdParam === 'object' && companyIdParam.value) {
				companyId = companyIdParam.value;
			} else if (typeof companyIdParam === 'string') {
				companyId = companyIdParam;
			}
			
			// Extract project ID from resourceLocator format  
			let projectId = '';
			if (typeof projectIdParam === 'object' && projectIdParam.value) {
				projectId = projectIdParam.value;
			} else if (typeof projectIdParam === 'string') {
				projectId = projectIdParam;
			}
			
			// Get selected tags
			const tagIds = context.executeFunctions.getNodeParameter('tagIds', context.itemIndex) as string[];
			
			if (!recordId || !recordId.trim()) {
				throw new Error('Record ID is required');
			}
			
			if (!companyId || !companyId.trim()) {
				throw new Error('Company ID is required');
			}
			
			if (!projectId || !projectId.trim()) {
				throw new Error('Project ID is required');
			}
			
			if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
				throw new Error('At least one tag must be selected');
			}

			const mutation = this.buildTagRecordMutation(recordId, tagIds);
			
			const response = await this.makeGraphQLRequest(context, mutation, {}, companyId, projectId);
			const data = this.handleGraphQLResponse(
				response,
				context.additionalOptions.fullResponse as boolean,
			);

			return {
				success: true,
				data: {
					recordId,
					tagIds,
					result: data,
					message: `Successfully tagged record with ${tagIds.length} tag(s)`
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	private buildTagRecordMutation(recordId: string, tagIds: string[]): string {
		const tagIdsString = tagIds.map(id => `"${id}"`).join(', ');
		
		return `mutation TagRecord {
			setTodoTags(
				input: {
					todoId: "${recordId}"
					tagIds: [${tagIdsString}]
				}
			)
		}`;
	}
}