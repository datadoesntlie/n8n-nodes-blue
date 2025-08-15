import {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { 
	BlueGraphQLClient, 
	GET_CUSTOM_FIELDS,
	SEARCH_CUSTOM_FIELDS,
	GET_CUSTOM_FIELD_OPTIONS,
	CustomFieldsResponse,
	CustomFieldOptionsResponse 
} from '../graphql';

export async function searchCustomFields(
	context: ILoadOptionsFunctions,
	filter?: string
): Promise<INodeListSearchResult> {
	try {
		const { companyId, projectId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId || !projectId) {
			return {
				results: [{
					name: 'Please Select Company and Project First',
					value: '',
				}],
			};
		}

		const query = filter ? SEARCH_CUSTOM_FIELDS : GET_CUSTOM_FIELDS;
		const variables = filter ? { projectId, filter } : { projectId };

		const data = await BlueGraphQLClient.request<CustomFieldsResponse>(context, {
			query,
			variables,
			companyId,
		});

		const customFields = data.customFields || [];
		return BlueGraphQLClient.formatSearchResult(customFields);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Custom Fields',
				value: '',
				description: error.message,
			}],
		};
	}
}

export async function getCustomFields(
	context: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	try {
		const { companyId, projectId } = BlueGraphQLClient.getContextIds(context);
		
		if (!companyId || !projectId) {
			return BlueGraphQLClient.formatPropertyOptions([], 'Please Select Company and Project First');
		}

		const data = await BlueGraphQLClient.request<CustomFieldsResponse>(context, {
			query: GET_CUSTOM_FIELDS,
			variables: { projectId },
			companyId,
		});

		const customFields = data.customFields || [];
		return BlueGraphQLClient.formatPropertyOptions(customFields, 'No Custom Fields Found');
	} catch (error) {
		return [{
			name: 'Error Loading Custom Fields',
			value: '',
		}];
	}
}

export async function getCustomFieldOptions(
	context: ILoadOptionsFunctions
): Promise<INodePropertyOptions[]> {
	try {
		const { companyId } = BlueGraphQLClient.getContextIds(context);
		const customFieldId = context.getCurrentNodeParameter('customFieldId') as string;
		
		if (!companyId || !customFieldId) {
			return BlueGraphQLClient.formatPropertyOptions([], 'Please Select Company and Custom Field First');
		}

		const data = await BlueGraphQLClient.request<CustomFieldOptionsResponse>(context, {
			query: GET_CUSTOM_FIELD_OPTIONS,
			variables: { customFieldId },
			companyId,
		});

		const options = data.customFieldOptions || [];
		return options.map(option => ({
			name: option.label || option.value,
			value: option.value,
		}));
	} catch (error) {
		return [{
			name: 'Error Loading Custom Field Options',
			value: '',
		}];
	}
}