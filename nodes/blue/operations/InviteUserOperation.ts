import { BaseBlueOperation, BlueOperationContext, BlueOperationResult } from '../types';

export class InviteUserOperation extends BaseBlueOperation {
	readonly name = 'inviteUser';
	readonly description = 'Invite a user to a project with specified role';

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

			// Get email and role
			const email = context.executeFunctions.getNodeParameter('email', context.itemIndex) as string;
			const accessLevel = context.executeFunctions.getNodeParameter('role', context.itemIndex) as string;
			
			// Get custom role ID if CUSTOM_ROLE is selected
			let roleId = '';
			if (accessLevel === 'CUSTOM_ROLE') {
				const customRoleParam = context.executeFunctions.getNodeParameter('customRoleId', context.itemIndex) as any;
				if (typeof customRoleParam === 'object' && customRoleParam.value) {
					roleId = customRoleParam.value;
				} else if (typeof customRoleParam === 'string') {
					roleId = customRoleParam;
				}
			}

			// Validate required fields
			if (!companyId || !companyId.trim()) {
				throw new Error('Company ID is required');
			}
			
			if (!projectId || !projectId.trim()) {
				throw new Error('Project ID is required');
			}
			
			if (!email || !email.trim()) {
				throw new Error('Email is required');
			}
			
			if (!accessLevel || !accessLevel.trim()) {
				throw new Error('Role is required');
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				throw new Error('Invalid email format');
			}

			// If CUSTOM_ROLE is selected, validate roleId
			if (accessLevel === 'CUSTOM_ROLE' && (!roleId || !roleId.trim())) {
				throw new Error('Custom Role ID is required when CUSTOM_ROLE is selected');
			}

			const mutation = this.buildInviteUserMutation(email, companyId, projectId, accessLevel, roleId);
			
			const response = await this.makeGraphQLRequest(context, mutation, {}, companyId, projectId);
			const data = this.handleGraphQLResponse(
				response,
				context.additionalOptions.fullResponse as boolean,
			);

			return {
				success: true,
				data: {
					email,
					companyId,
					projectId,
					accessLevel,
					roleId: roleId || undefined,
					result: data,
					message: `Successfully invited ${email} to project with ${accessLevel} role${roleId ? ` (${roleId})` : ''}`
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	private buildInviteUserMutation(email: string, companyId: string, projectId: string, accessLevel: string, roleId?: string): string {
		const inputs = [
			`email: "${email}"`,
			`companyId: "${companyId}"`,
			`projectId: "${projectId}"`
		];

		// Use the actual role value if it's not CUSTOM_ROLE
		if (accessLevel !== 'CUSTOM_ROLE') {
			inputs.push(`accessLevel: ${accessLevel}`);
		} else {
			// For custom roles, use MEMBER as accessLevel and add roleId
			inputs.push(`accessLevel: MEMBER`);
			if (roleId) {
				inputs.push(`roleId: "${roleId}"`);
			}
		}

		return `mutation InviteUserToProject {
			inviteUser(
				input: {
					${inputs.join('\n\t\t\t\t\t')}
				}
			)
		}`;
	}
}