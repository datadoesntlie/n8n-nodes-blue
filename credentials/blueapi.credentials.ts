import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class blueapi implements ICredentialType {
	name = 'blueApi';
	displayName = 'Blue API';
	documentationUrl = 'https://api.blue.cc/graphql';
	properties: INodeProperties[] = [
		{
			displayName: 'Token ID',
			name: 'tokenId',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Blue API Token ID (X-Bloo-Token-ID)',
			placeholder: 'e.g., abc123def456',
		},
		{
			displayName: 'Token Secret',
			name: 'tokenSecret',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			},
			description: 'Your Blue API Token Secret (X-Bloo-Token-Secret)',
			placeholder: 'Enter your token secret...',
		},

		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.blue.cc/graphql',
			required: true,
			description: 'Base URL for the Blue API endpoint',
		},
	];

	// Optional: Add credential testing
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			method: 'POST',
			headers: {
				'X-Bloo-Token-ID': '={{$credentials.tokenId}}',
				'X-Bloo-Token-Secret': '={{$credentials.tokenSecret}}',
				'Content-Type': 'application/json',
			},
			body: {
				query: `query TestConnection {
					companyList {
						items {
							id
							name
						}
					}
				}`,
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					message: 'Connection successful',
					key: 'data.companyList.items',
					value: undefined, // Just check that companies array exists
				},
			},
		],
	};
}