import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class GetRecordsOperation extends BaseBlueOperation {
	readonly name = 'getRecords';
	readonly description = 'Retrieve records (todos/tasks) with advanced filtering';

	async execute(context: BlueOperationContext): Promise<BlueOperationResult> {
		try {
			const companyId = context.executeFunctions.getNodeParameter('companyId', context.itemIndex) as string;
			const projectId = context.executeFunctions.getNodeParameter('projectId', context.itemIndex, '') as string;
			const searchTerm = context.executeFunctions.getNodeParameter('searchTerm', context.itemIndex, '') as string;
			const showCompleted = context.executeFunctions.getNodeParameter('showCompleted', context.itemIndex, false) as boolean;
			const limit = context.executeFunctions.getNodeParameter('limit', context.itemIndex, 50) as number;
			const skip = context.executeFunctions.getNodeParameter('skip', context.itemIndex, 0) as number;

			const query = `query ListRecordsAdvanced {
				todoQueries {
					todos(
						filter: {
							companyIds: ["${companyId}"]
							${projectId ? `projectIds: ["${projectId}"]` : ''}
							showCompleted: ${showCompleted}
							excludeArchivedProjects: true
							${searchTerm ? `search: "${searchTerm}"` : ''}
						}
						sort: [duedAt_ASC, position_ASC]
						limit: ${limit}
						skip: ${skip}
					) {
						items {
							id
							uid
							position
							title
							text
							html
							startedAt
							duedAt
							timezone
							color
							cover
							done
							archived
							createdAt
							updatedAt
							commentCount
							checklistCount
							checklistCompletedCount
							isRepeating
							todoList {
								id
								title
							}
							users {
								id
								username
								email
							}
							tags {
								id
								title
								color
							}
							customFields {
								id
								name
								type
								value
								text
								number
								latitude
								longitude
								currency
							}
							createdBy {
								id
								username
							}
						}
						pageInfo {
							totalPages
							totalItems
							page
							perPage
							hasNextPage
							hasPreviousPage
						}
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