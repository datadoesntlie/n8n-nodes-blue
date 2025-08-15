// Company related types
export interface Company {
	id: string;
	name: string;
	slug: string;
	description?: string;
	createdAt: string;
}

export interface CompanyListResponse {
	companyList: {
		items: Company[];
	};
}

// Project related types
export interface Project {
	id: string;
	name: string;
	description?: string;
	status: string;
	createdAt?: string;
}

export interface ProjectListResponse {
	projectList: {
		items: Project[];
	};
}

export interface TodoList {
	id: string;
	title: string;
	description?: string;
	position: number;
}

export interface TodoListsResponse {
	todoLists: TodoList[];
}

// User related types
export interface ProjectUser {
	id: string;
	name: string;
	email: string;
	role: string;
}

export interface ProjectUsersResponse {
	projectUsers: ProjectUser[];
}

// Tag related types
export interface Tag {
	id: string;
	title: string;
	color?: string;
}

export interface TagsResponse {
	tags: Tag[];
}

// Custom field related types
export interface CustomFieldOption {
	id: string;
	value: string;
	label: string;
}

export interface CustomField {
	id: string;
	title: string;
	type: string;
	options?: CustomFieldOption[];
}

export interface CustomFieldsResponse {
	customFields: CustomField[];
}

export interface CustomFieldOptionsResponse {
	customFieldOptions: CustomFieldOption[];
}

// Role related types
export interface ProjectUserRole {
	id: string;
	name: string;
}

export interface ProjectUserRolesResponse {
	projectUserRoles: ProjectUserRole[];
}