import { BaseBlueOperation } from '../types';
import { GetCompaniesOperation } from './GetCompaniesOperation';
import { GetProjectsOperation } from './GetProjectsOperation';
import { GetRecordsOperation } from './GetRecordsOperation';
import { UpdateRecordOperation } from './UpdateRecordOperation';
import { CreateRecordOperation } from './CreateRecordOperation';
import { CreateProjectOperation } from './CreateProjectOperation';
import { CustomQueryOperation } from './CustomQueryOperation';

export const operations: Record<string, BaseBlueOperation> = {
	getCompanies: new GetCompaniesOperation(),
	getProjects: new GetProjectsOperation(),
	getRecords: new GetRecordsOperation(),
	updateRecord: new UpdateRecordOperation(),
	createRecord: new CreateRecordOperation(),
	createProject: new CreateProjectOperation(),
	customQuery: new CustomQueryOperation(),
};

export {
	BaseBlueOperation,
	GetCompaniesOperation,
	GetProjectsOperation,
	GetRecordsOperation,
	UpdateRecordOperation,
	CreateRecordOperation,
	CreateProjectOperation,
	CustomQueryOperation,
};