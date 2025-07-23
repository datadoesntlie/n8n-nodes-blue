import { BaseBlueOperation } from '../types';
import { GetCompaniesOperation } from './GetCompaniesOperation';
import { GetProjectsOperation } from './GetProjectsOperation';
import { GetRecordsOperation } from './GetRecordsOperation';
import { CustomQueryOperation } from './CustomQueryOperation';

export const operations: Record<string, BaseBlueOperation> = {
	getCompanies: new GetCompaniesOperation(),
	getProjects: new GetProjectsOperation(),
	getRecords: new GetRecordsOperation(),
	customQuery: new CustomQueryOperation(),
};

export {
	BaseBlueOperation,
	GetCompaniesOperation,
	GetProjectsOperation,
	GetRecordsOperation,
	CustomQueryOperation,
};