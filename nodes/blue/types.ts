import { IDataObject, IExecuteFunctions } from 'n8n-workflow';

export interface BlueRequestOptions {
	method: 'POST';
	url: string;
	headers: {
		'Content-Type': string;
		'User-Agent': string;
		'X-Bloo-Company-ID'?: string;
		'X-Bloo-Project-ID'?: string;
	};
	body: {
		query: string;
		variables: IDataObject;
	};
	json: boolean;
	timeout: number;
}

export interface BlueOperationResult {
	success: boolean;
	data?: any;
	error?: string;
}

export interface BlueOperationContext {
	executeFunctions: IExecuteFunctions;
	itemIndex: number;
	additionalOptions: IDataObject;
}

export abstract class BaseBlueOperation {
	abstract readonly name: string;
	abstract readonly description: string;

	abstract execute(context: BlueOperationContext): Promise<BlueOperationResult>;

	protected async makeGraphQLRequest(
		context: BlueOperationContext,
		query: string,
		variables: IDataObject = {},
		companyId?: string,
		projectId?: string,
	): Promise<any> {
		const additionalHeaders: IDataObject = {
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-blue-node/1.0',
		};

		if (companyId) {
			additionalHeaders['X-Bloo-Company-ID'] = companyId;
		}

		if (projectId) {
			additionalHeaders['X-Bloo-Project-ID'] = projectId;
		}

		const requestOptions = {
			method: 'POST' as const,
			url: 'https://api.blue.cc/graphql',
			headers: additionalHeaders,
			body: {
				query: query.trim(),
				variables,
			},
			json: true,
			timeout: (context.additionalOptions.timeout as number) || 30000,
		};

		return await context.executeFunctions.helpers.httpRequestWithAuthentication.call(
			context.executeFunctions,
			'blueApi',
			requestOptions
		);
	}

	protected handleGraphQLResponse(response: any, fullResponse: boolean = false): any {
		if (response.errors && response.errors.length > 0) {
			const errorMessage = response.errors.map((err: any) => err.message).join(', ');
			throw new Error(`GraphQL Error: ${errorMessage}`);
		}

		return fullResponse ? response : (response.data || response);
	}
}