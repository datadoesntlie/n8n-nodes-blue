import {
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';
import { BlueGraphQLClient, GET_COMPANIES, CompanyListResponse } from '../graphql';

export async function searchCompanies(
	context: ILoadOptionsFunctions,
	filter?: string
): Promise<INodeListSearchResult> {
	try {
		const data = await BlueGraphQLClient.request<CompanyListResponse>(context, {
			query: GET_COMPANIES,
		});

		const companies = data.companyList?.items || [];
		
		// Apply client-side filtering if filter is provided
		const filteredCompanies = filter 
			? companies.filter(company => 
				company.name.toLowerCase().includes(filter.toLowerCase()) ||
				company.description?.toLowerCase().includes(filter.toLowerCase())
			)
			: companies;

		return BlueGraphQLClient.formatSearchResult(filteredCompanies);
	} catch (error) {
		return {
			results: [{
				name: 'Error Loading Companies',
				value: '',
				description: error.message,
			}],
		};
	}
}