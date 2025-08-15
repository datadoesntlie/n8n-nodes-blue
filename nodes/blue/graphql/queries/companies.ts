export const GET_COMPANIES = `
	query GetCompanies {
		companyList {
			items {
				id
				name
				slug
				description
				createdAt
			}
		}
	}
`;