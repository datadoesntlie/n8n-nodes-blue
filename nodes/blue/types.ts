import { IDataObject, IExecuteFunctions } from 'n8n-workflow';

export interface BlueCredentials {
	tokenId: string;
	tokenSecret: string;
	baseUrl: string;
}

export interface BlueRequestOptions {
	method: 'POST';
	url: string;
	headers: {
		'X-Bloo-Token-ID': string;
		'X-Bloo-Token-Secret': string;
		'Content-Type': string;
		'User-Agent': string;
		'X-Bloo-Company-ID'?: string;
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
	credentials: BlueCredentials;
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
	): Promise<any> {
		const requestOptions: BlueRequestOptions = {
			method: 'POST',
			url: 'https://api.blue.cc/graphql',
			headers: {
				'X-Bloo-Token-ID': context.credentials.tokenId,
				'X-Bloo-Token-Secret': context.credentials.tokenSecret,
				'Content-Type': 'application/json',
				'User-Agent': 'n8n-blue-node/1.0',
			},
			body: {
				query: query.trim(),
				variables,
			},
			json: true,
			timeout: (context.additionalOptions.timeout as number) || 30000,
		};

		if (companyId) {
			requestOptions.headers['X-Bloo-Company-ID'] = companyId;
		}

		return await context.executeFunctions.helpers.request(requestOptions);
	}

	protected handleGraphQLResponse(response: any, fullResponse: boolean = false): any {
		if (response.errors && response.errors.length > 0) {
			const errorMessage = response.errors.map((err: any) => err.message).join(', ');
			throw new Error(`GraphQL Error: ${errorMessage}`);
		}

		return fullResponse ? response : (response.data || response);
	}
}