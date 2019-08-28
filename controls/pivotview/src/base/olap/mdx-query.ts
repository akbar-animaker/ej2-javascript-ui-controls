import { OlapEngine, ConnectionInfo, FieldData, IOlapField, IOlapFieldListOptions } from './engine';
import { IFieldOptions, IDataOptions, IValueSortSettings, IDrillOptions, IDrilledItem, IPageSettings, IFilter } from '../engine';
import { ICalculatedFieldSettings } from '../engine';
import { extend, isNullOrUndefined } from '@syncfusion/ej2-base';
import { Operators, FilterType } from '../types';

/**
 * This is a file to create MDX query for the provided OLAP datasource
 * @hidden
 */

/* tslint:disable:all */
/** @hidden */
export class MDXQuery {
    /** @hidden */
    private static engine: OlapEngine;
    /** @hidden */
    private static rows: IFieldOptions[];
    /** @hidden */
    private static columns: IFieldOptions[];
    /** @hidden */
    private static values: IFieldOptions[];
    /** @hidden */
    private static filters: IFieldOptions[];
    /** @hidden */
    private static calculatedFieldSettings: ICalculatedFieldSettings[];
    /** @hidden */
    private static valueSortSettings: IValueSortSettings;
    /** @hidden */
    public static drilledMembers: IDrillOptions[];
    /** @hidden */
    private static filterMembers: { [key: string]: string[] | IFilter[] };
    /** @hidden */
    private static fieldDataObj: FieldData;
    /** @hidden */
    private static fieldList: IOlapFieldListOptions;
    /** @hidden */
    private static valueAxis: string;
    /** @hidden */
    private static cellSetInfo: string;
    /** @hidden */
    private static isMeasureAvail: boolean;
    /** @hidden */
    private static isMondrian: boolean;
    /** @hidden */
    private static isPaging: boolean;
    /** @hidden */
    private static pageSettings: IPageSettings;
    /** @hidden */
    private static allowLabelFilter: boolean;
    /** @hidden */
    private static allowValueFilter: boolean;

    public static getCellSets(dataSourceSettings: IDataOptions, olapEngine: OlapEngine, refPaging?: boolean, drillInfo?: IDrilledItem, isQueryUpdate?: boolean): any {
        this.engine = olapEngine;
        this.isMondrian = olapEngine.isMondrian;
        this.isMeasureAvail = olapEngine.isMeasureAvail;
        this.isPaging = olapEngine.isPaging;
        this.pageSettings = olapEngine.pageSettings;
        this.rows = olapEngine.rows;
        this.columns = olapEngine.columns;
        this.values = olapEngine.values;
        this.filters = olapEngine.filters;
        this.allowLabelFilter = olapEngine.allowLabelFilter;
        this.allowValueFilter = olapEngine.allowValueFilter;
        this.valueSortSettings = dataSourceSettings.valueSortSettings ? dataSourceSettings.valueSortSettings : undefined;
        this.drilledMembers = olapEngine.updateDrilledItems(dataSourceSettings.drilledMembers);
        this.calculatedFieldSettings = olapEngine.calculatedFieldSettings;
        this.valueAxis = dataSourceSettings.valueAxis === 'row' ? 'rows' : 'columns';
        if (drillInfo) {
            drillInfo.axis = drillInfo.axis === 'row' ? 'rows' : 'columns';
        }
        this.filterMembers = extend({}, olapEngine.filterMembers, null, true) as { [key: string]: string[] | IFilter[] };
        this.fieldDataObj = olapEngine.fieldListObj;
        this.fieldList = olapEngine.fieldList;
        this.cellSetInfo = '\nDIMENSION PROPERTIES PARENT_UNIQUE_NAME, HIERARCHY_UNIQUE_NAME, CHILDREN_CARDINALITY, MEMBER_TYPE';
        let measureQuery: string = this.getMeasuresQuery(this.values);
        let rowQuery: string = this.getDimensionsQuery(this.rows, measureQuery, 'rows', drillInfo).replace(/\&/g, '&amp;');
        let columnQuery: string = this.getDimensionsQuery(this.columns, measureQuery, 'columns', drillInfo).replace(/\&/g, '&amp;');
        if (this.isPaging && refPaging && this.pageSettings !== undefined && rowQuery !== '' && columnQuery !== '') {
            let pagingQuery: pagingQuery = this.getPagingQuery(rowQuery, columnQuery);
            rowQuery = pagingQuery.rowQuery;
            columnQuery = pagingQuery.columnQuery;
        } else if (this.isPaging && !refPaging && this.pageSettings !== undefined && rowQuery !== '' && columnQuery !== '') {
            let pagingQuery: pagingQuery = this.getPagingCountQuery(rowQuery, columnQuery);
            rowQuery = pagingQuery.rowQuery;
            columnQuery = pagingQuery.columnQuery;
        }
        rowQuery = (rowQuery.length > 0 ? rowQuery + (this.isPaging && !refPaging ? '' : this.cellSetInfo + ' ON ROWS') : '');
        columnQuery = (columnQuery.length > 0 ? columnQuery + (this.isPaging && !refPaging ? '' : this.cellSetInfo + ' ON COLUMNS') : '');
        let slicerQuery: string = this.getSlicersQuery(this.filters, 'filters').replace(/\&/g, '&amp;');
        let filterQuery: string = this.getfilterQuery(this.filterMembers, dataSourceSettings.cube).replace(/\&/g, '&amp;').replace(/\>/g, '&gt;').replace(/\</g, '&lt;');
        let caclQuery: string = this.getCalculatedFieldQuery(this.calculatedFieldSettings).replace(/\&/g, '&amp;');
        let query: string = this.frameMDXQuery(rowQuery, columnQuery, slicerQuery, filterQuery, caclQuery, refPaging);
        let args: ConnectionInfo = {
            catalog: dataSourceSettings.catalog,
            cube: dataSourceSettings.cube,
            url: dataSourceSettings.url,
            request: query,
            LCID: dataSourceSettings.localeIdentifier.toString()
        };
        olapEngine.mdxQuery = query.replace(/\&amp;/g, '&').replace(/\&gt;/g, '>').replace(/\&lt;/g, '<').replace(/%280/g, '\"');
        console.log(olapEngine.mdxQuery);
        if (drillInfo) {
            drillInfo.axis = drillInfo.axis === 'rows' ? 'row' : 'column';
        }
        if (!isQueryUpdate) {
            this.getTableCellData(args, (this.isPaging && !refPaging ? this.engine.generatePagingData.bind(this.engine) : this.engine.generateEngine.bind(this.engine)),
                drillInfo ? { action: drillInfo.action, drillInfo: drillInfo } : { dataSourceSettings: dataSourceSettings, action: 'loadTableElements' });
        }
    }
    private static getTableCellData(args: ConnectionInfo, successMethod: Function, customArgs: object): void {
        let connectionString: ConnectionInfo = this.engine.getConnectionInfo(args.url, args.LCID);
        let soapMessage: string = '<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/"> <Header></Header> <Body> <Execute xmlns="urn:schemas-microsoft-com:xml-analysis"> <Command> <Statement>' +
            args.request + '</Statement> </Command> <Properties> <PropertyList> <Catalog>' +
            args.catalog + '</Catalog> <LocaleIdentifier>' + connectionString.LCID +
            '</LocaleIdentifier> </PropertyList> </Properties></Execute> </Body> </Envelope>';
        this.engine.doAjaxPost('POST', connectionString.url, soapMessage, successMethod, customArgs);
    }
    public static frameMDXQuery(rowQuery: string, columnQuery: string, slicerQuery: string, filterQuery: string, caclQuery: string, refPaging?: boolean): string {
        let query: string = ((this.isPaging && !refPaging) ? caclQuery !== '' ? '' : '\nWITH' : '\nSelect ');
        if (columnQuery.length > 0) {
            query = query + columnQuery;
        }
        if (rowQuery.length > 0) {
            query = query + (columnQuery.length > 0 ? this.isPaging && !refPaging ? '' : ', ' : '') + rowQuery;
        }
        query = caclQuery + query + (this.isPaging && !refPaging ? '\nMEMBER [Measures].[3d268ce0-664d-4092-b9cb-fece97175006] AS Count([e16a30d0-2174-4874-8dae-a5085a75a3e2]) ' +
            'MEMBER [Measures].[8d7fe8c1-f09f-410e-b9ba-eaab75a1fc3e] AS Count ([d1876d2b-e50e-4547-85fe-5b8ed9d629de])' +
            '\nSELECT { [Measures].[3d268ce0-664d-4092-b9cb-fece97175006] , [Measures].[8d7fe8c1-f09f-410e-b9ba-eaab75a1fc3e] } ON AXIS(0)' : '') +
            filterQuery + slicerQuery + '\nCELL PROPERTIES VALUE, FORMAT_STRING, FORMATTED_VALUE\n';
        return query;
    }
    private static getPagingQuery(rowQuery: string, columnQuery: string): pagingQuery {
        // let colCurrentPage: number = (Math.ceil(this.engine.columnCount / this.pageSettings.columnSize) < this.pageSettings.columnCurrentPage || this.pageSettings.columnCurrentPage === 0) ? ((Math.ceil(this.engine.columnCount / this.pageSettings.columnSize) < this.pageSettings.columnCurrentPage && this.engine.columnCount > 0) ? Math.ceil(this.engine.columnCount / this.pageSettings.columnSize) : this.pageSettings.columnCurrentPage) : this.pageSettings.columnCurrentPage;
        // let rowCurrentPage: number = (Math.ceil(this.engine.rowCount / this.pageSettings.rowSize) < this.pageSettings.rowCurrentPage || this.pageSettings.rowCurrentPage === 0) ? ((Math.ceil(this.engine.rowCount / this.pageSettings.rowSize) < this.pageSettings.rowCurrentPage && this.engine.rowCount > 0) ? Math.ceil(this.engine.rowCount / this.pageSettings.rowSize) : this.pageSettings.rowSize) : this.pageSettings.rowCurrentPage;
        rowQuery = rowQuery.replace('NON EMPTY ( ', '').slice(0, -1);
        columnQuery = columnQuery.replace('NON EMPTY ( ', '').slice(0, -1);
        let rowQueryCpy: string = rowQuery;
        // let axisQuery: pagingQuery = {
        //     rowQuery: rowQuery !== '' ? ('\nSUBSET ({ ' + (this.isMondrian ? '' : 'NONEMPTY') + ' (' + rowQuery + (!this.isMondrian && columnQuery !== '' ? ',' + columnQuery : '') + ')},' + (((rowCurrentPage === 0 ? 1 : rowCurrentPage) - 1) * (this.pageSettings.rowSize)) + ',' + this.pageSettings.rowSize + ')') : '',
        //     columnQuery: columnQuery !== '' ? ('\nSUBSET ({ ' + (this.isMondrian ? '' : 'NONEMPTY') + ' (' + columnQuery + (!this.isMondrian && rowQueryCpy !== '' ? ',' + rowQueryCpy : '') + ')},' + (((colCurrentPage === 0 ? 1 : colCurrentPage) - 1) * (this.pageSettings.columnSize)) + ',' + this.pageSettings.columnSize + ')') : ''
        // }
        let axisQuery: pagingQuery = {
            rowQuery: rowQuery !== '' ? ('\nSUBSET ({ ' + (this.isMondrian ? '' : 'NONEMPTY') + ' (' + rowQuery + (!this.isMondrian && columnQuery !== '' ? ',' + columnQuery : '') + ')},' + ((this.pageSettings.rowCurrentPage === 0 ? 1 : this.pageSettings.rowCurrentPage) - 1) + ',' + this.pageSettings.rowSize + ')') : '',
            columnQuery: columnQuery !== '' ? ('\nSUBSET ({ ' + (this.isMondrian ? '' : 'NONEMPTY') + ' (' + columnQuery + (!this.isMondrian && rowQueryCpy !== '' ? ',' + rowQueryCpy : '') + ')},' + ((this.pageSettings.columnCurrentPage === 0 ? 1 : this.pageSettings.columnCurrentPage) - 1) + ',' + this.pageSettings.columnSize + ')') : ''
        }
        return axisQuery;
    }
    private static getPagingCountQuery(rowQuery: string, columnQuery: string): pagingQuery {
        rowQuery = rowQuery.replace('NON EMPTY ( ', '').slice(0, -1);
        columnQuery = columnQuery.replace('NON EMPTY ( ', '').slice(0, -1);
        let rowQueryCpy: string = rowQuery;
        'WITH  SET [e16a30d0-2174-4874-8dae-a5085a75a3e2] as'
        'SET [d1876d2b-e50e-4547-85fe-5b8ed9d629de] as'
        let axisQuery: pagingQuery = {
            rowQuery: rowQuery !== '' ? ('\SET [d1876d2b-e50e-4547-85fe-5b8ed9d629de] as ' + (this.isMondrian ? '' : 'NONEMPTY') + ' (' + rowQuery + (!this.isMondrian && columnQuery !== '' ? ',' + columnQuery : '') + ')\n') : '',
            columnQuery: columnQuery !== '' ? ('\nSET [e16a30d0-2174-4874-8dae-a5085a75a3e2] as ' + (this.isMondrian ? '' : 'NONEMPTY') + ' (' + columnQuery + (!this.isMondrian && rowQueryCpy !== '' ? ',' + rowQueryCpy : '') + ')\n') : ''
        }
        return axisQuery;
    }
    public static getDimensionsQuery(dimensions: IFieldOptions[], measureQuery: string, axis: string, drillInfo?: IDrilledItem): string {
        let query: string = '';
        if (dimensions.length > 0) {
            query = '\nNON EMPTY ( ' + (this.drilledMembers.length > 0 ? 'HIERARCHIZE ({' : '');
            let i: number = 0;
            while (i < dimensions.length) {
                let hierarchy: string = ''
                if (i === 0) {
                    if (dimensions[i].name.toLowerCase() === '[measures]') {
                        if (measureQuery !== '') {
                            query = query + measureQuery;
                        }
                    } else {
                        hierarchy = '({' + this.getDimensionQuery(dimensions[i], axis) + '})';
                        query = query + hierarchy;
                    }
                } else {
                    if (dimensions[i].name.toLowerCase() === '[measures]') {
                        if (measureQuery !== '') {
                            query = query + ' * ' + measureQuery;
                        }
                    } else {
                        hierarchy = '({' + this.getDimensionQuery(dimensions[i], axis) + '})';
                        query = query + ' * ' + hierarchy;
                    }
                }
                i++;
            }
            // if (!this.isMeasureAvail && measureQuery !== '' && this.valueAxis === axis) {
            //     query = query + ' * ' + measureQuery;
            // }
            let drillQuery: string = this.getDrillQuery(dimensions, measureQuery, axis, drillInfo);
            query = (drillInfo && drillInfo.axis === axis ? '\nNON EMPTY ( ' + (this.drilledMembers.length > 0 ? 'HIERARCHIZE ({' : '') + drillQuery : query + (drillQuery !== '' ? ',' : '') + drillQuery);
            query = (this.valueAxis !== axis ? this.updateValueSortQuery(query, this.valueSortSettings) : query) +
                (this.drilledMembers.length > 0 ? '})' : '') + ')';
        }
        // else if (!this.isMeasureAvail && measureQuery !== '' && this.valueAxis === axis) {
        //     query = 'NON EMPTY (' + (this.drilledMembers.length > 0 ? 'HIERARCHIZE({' : '') + measureQuery;
        //     query = (this.valueAxis !== axis ? this.updateValueSortQuery(query, this.valueSortSettings) : query) +
        //         (this.drilledMembers.length > 0 ? '})' : '') + ') ' + this.cellSetInfo + ' ON ' + axis.toUpperCase();
        // }
        return query;
    }
    private static getDrillQuery(dimensions: IFieldOptions[], measureQuery: string, axis: string, drillInfo?: IDrilledItem): string {
        let query: string = '';
        let drilledMembers: IDrillOptions[] = [];
        let isOnDemandDrill: boolean = false;
        let onDemandDrillQuery: string = '';
        if (drillInfo && drillInfo.axis === axis && drillInfo.action.toLowerCase() === 'down') {
            isOnDemandDrill = true;
            drilledMembers = [{ name: drillInfo.fieldName, items: [drillInfo.memberName], delimiter: '~~' }];
        } else {
            drilledMembers = this.drilledMembers;
        }
        for (let field of drilledMembers) {
            for (let item of field.items) {
                let drillQuery: string[] = [];
                let i: number = 0;
                let drillInfo: string[] = item.split(field.delimiter ? field.delimiter : '~~');
                while (i < dimensions.length) {
                    if (drillInfo[i] && drillInfo[i].indexOf(dimensions[i].name) !== -1) {
                        if (drillInfo[drillInfo.length - 1].indexOf(dimensions[i].name) !== -1) {
                            if (isOnDemandDrill) {
                                onDemandDrillQuery = onDemandDrillQuery + (onDemandDrillQuery !== '' ? ' * ' : '') + '({' + drillInfo[i] + '.CHILDREN})';
                            } else {
                                drillQuery.push('(' + drillInfo[i] + '.CHILDREN)');
                            }
                        } else {
                            if (drillInfo[i].toLowerCase() === '[measures]' && measureQuery !== '') {
                                if (isOnDemandDrill) {
                                    onDemandDrillQuery = onDemandDrillQuery + (onDemandDrillQuery !== '' ? ' * ' : '') + '(' + measureQuery + ')';
                                } else {
                                    drillQuery.push('(' + measureQuery + ')');
                                }
                            } else if (drillInfo[i].toLowerCase().indexOf('[measures]') !== -1) {
                                if (isOnDemandDrill) {
                                    onDemandDrillQuery = onDemandDrillQuery + (onDemandDrillQuery !== '' ? ' * ' : '') + '({' + drillInfo[i] + '})';
                                } else {
                                    drillQuery.push('({' + drillInfo[i] + '})');
                                }
                            } else {
                                if (isOnDemandDrill) {
                                    onDemandDrillQuery = onDemandDrillQuery + (onDemandDrillQuery !== '' ? ' * ' : '') + '({' + drillInfo[i] + '})';
                                } else {
                                    drillQuery.push('(' + drillInfo[i] + ')');
                                }
                            }
                        }
                    } else if (!drillInfo[i] && dimensions[i]) {
                        if (dimensions[i].name.toLowerCase() === '[measures]' && measureQuery !== '') {
                            if (isOnDemandDrill) {
                                onDemandDrillQuery = onDemandDrillQuery + (onDemandDrillQuery !== '' ? ' * ' : '') + '(' + measureQuery + ')';
                            } else {
                                drillQuery.push('(' + measureQuery + ')');
                            }
                        } else {
                            if (isOnDemandDrill) {
                                onDemandDrillQuery = onDemandDrillQuery + (onDemandDrillQuery !== '' ? ' * ' : '') + '({' + this.getDimensionQuery(dimensions[i], axis) + '})';
                            } else {
                                drillQuery.push('(' + this.getDimensionQuery(dimensions[i], axis) + ')');
                            }
                        }
                    } else {
                        drillQuery = [];
                        break;
                    }
                    i++;
                }
                if (drillQuery.length > 0 && drillQuery.length < drillInfo.length) {
                    drillQuery = [];
                }
                // query = query + (query !== '' && drillQuery.length > 0 ? ',' : '') + (drillQuery.length > 0 ? '(' + drillQuery.toString().replace(/\&/g, "&amp;") + ')' : '');
                query = query + (query !== '' && drillQuery.length > 0 ? ',' : '') + (drillQuery.length > 0 ? '(' + drillQuery.toString() + ')' : '');
            }
        }
        // return (isOnDemandDrill ? onDemandDrillQuery.replace(/\&/g, "&amp;") : query);
        return (isOnDemandDrill ? onDemandDrillQuery : query);
    }
    private static updateValueSortQuery(query: string, valueSortSettings: IValueSortSettings): string {
        if (valueSortSettings && valueSortSettings.measure && valueSortSettings.measure !== '') {
            let heirarchize: string = (this.drilledMembers.length > 0 ? 'HIERARCHIZE ({' : '');
            let measure: string = (this.fieldList[valueSortSettings.measure].isCalculatedField ?
                this.fieldList[valueSortSettings.measure].tag : valueSortSettings.measure);
            switch (valueSortSettings.sortOrder) {
                case 'Ascending':
                    query = query.replace('NON EMPTY ( ' + heirarchize, 'NON EMPTY ( ' + heirarchize + ' ORDER ({');
                    query = query + '},(' + measure + '), ASC)';
                    // query = query + '},(' + valueSortSettings.measure + '), ' +
                    //     (valueSortSettings.preserveHierarchy ? 'BASC' : 'ASC') + ')';
                    break;
                case 'Descending':
                    query = query.replace('NON EMPTY ( ' + heirarchize, 'NON EMPTY ( ' + heirarchize + ' ORDER ({');
                    query = query + '},(' + measure + '), DESC)';
                    // query = query + '},(' + valueSortSettings.measure + '), ' +
                    //     (valueSortSettings.preserveHierarchy ? 'BDESC' : 'DESC') + ')';
                    break;
            }
        }
        return query;
    }
    public static getSlicersQuery(slicers: IFieldOptions[], axis: string): string {
        let query: string = '';
        let dataFields: IFieldOptions[] = extend([], this.rows, null, true) as IFieldOptions[];
        dataFields = dataFields.concat(this.columns);
        if (slicers.length > 0) {
            let i: number = 0;
            while (i < slicers.length) {
                let isCol: boolean = dataFields.filter((field: IOlapField) => {
                    let colUqName = this.getDimensionUniqueName(field.name);
                    let slicerUqName = this.getDimensionUniqueName(slicers[i].name);
                    let isMatch: boolean = false;
                    isMatch = colUqName === slicerUqName &&
                        !(this.isMondrian && slicerUqName === '' && colUqName === '');
                    return (isMatch);
                }).length > 0;
                if (!isCol) {
                    if (slicers[i].name !== undefined && !this.filterMembers[slicers[i].name]) {
                        query = query + (query !== '' ? ' * ' : '') + '{' + this.getDimensionQuery(slicers[i], axis) + '}';
                    } else if (this.filterMembers[slicers[i].name]) {
                        query = query + (query !== '' ? ' * ' : '') + '{' + (this.filterMembers[slicers[i].name].toString()) + '}';
                    }
                }
                i++;
            }
            query = '\nWHERE (' + query.replace(/DrilldownLevel/g, '') + ')';
        }
        return query;
    }
    private static getDimensionQuery(dimension: IFieldOptions, axis: string): string {
        let query: string = '';
        let name: string = dimension.isCalculatedField ? this.fieldList[dimension.name].tag : dimension.name;
        let hasAllMember: boolean = this.fieldList[dimension.name].hasAllMember;
        if (!hasAllMember && !dimension.isNamedSet) {
            query = '((' + name + ').levels(0).AllMembers)';
        } else {
            query = (dimension.isNamedSet ? '{' + name + '}' : this.isPaging ? name + '.CHILDREN' :
                'DrilldownLevel({' + name + '}' + ((axis === 'rows' || axis === 'columns') ? ',,,INCLUDE_CALC_MEMBERS' : '') + ')');
        }
        return query;
    }
    private static getDimensionUniqueName(headerText: string): string {
        let hierarchyNode: IOlapField[] = this.fieldDataObj.hierarchy;
        let curElement: IOlapField[] = [];
        if (hierarchyNode) {
            // let curElement: IOlapField[] = hierarchyNode.filter((item: IOlapField) => {
            //     return (item.id.toLowerCase() === headerText.toLowerCase());
            // });
            for (let item of hierarchyNode) {
                if (item.id.toLowerCase() === headerText.toLowerCase()) {
                    curElement.push(item);
                }
            }
            return (curElement.length > 0 ? curElement[0].pid : '');
        } else {
            return headerText.split('.')[0];
        }
    }
    public static getMeasuresQuery(measures: IFieldOptions[]): string {
        let query: string = '';
        if (measures.length > 0) {
            query = '{{'
            let values: string = ''
            for (let measure of measures) {
                let name: string = (measure.isCalculatedField ? this.fieldList[measure.name].tag : measure.name);
                if (values.length > 0) {
                    values = values + ', ' + name;
                } else {
                    values = name;
                }
            }
            query = query + values + '}}';
        }
        return query;
    }
    private static getfilterQuery(filters: { [key: string]: string[] | IFilter[] }, cube: string): string {
        let query: string = '\nFROM [' + cube + ']';
        let filterQuery: string = '\nFROM( SELECT (';
        let advancedFilters: IFilter[][] = [];
        let advancedFilterQuery: string[] = [];
        let rowFilter: string[][] = [];
        let columnFilter: string[][] = [];
        for (let field of this.rows) {
            if (filters[field.name] && filters[field.name].length > 0) {
                if (typeof filters[field.name][0] === 'string') {
                    rowFilter.push(filters[field.name] as string[]);
                } else {
                    advancedFilters.push(filters[field.name] as IFilter[]);
                    delete filters[field.name];
                }
            }
        }
        for (let field of this.columns) {
            if (filters[field.name] && filters[field.name].length > 0) {
                if (typeof filters[field.name][0] === 'string') {
                    columnFilter.push(filters[field.name] as string[]);
                } else {
                    advancedFilters.push(filters[field.name] as IFilter[]);
                    delete filters[field.name];
                }
            }
        }
        for (let field of this.filters) {
            let isFound: boolean = false;
            for (let column of this.columns) {
                if (this.getDimensionUniqueName(column.name) === this.getDimensionUniqueName(field.name)) {
                    if (filters[field.name]) {
                        columnFilter.push(filters[field.name] as string[]);
                        isFound = true;
                    }
                }
            }
            if (isFound) {
                for (let row of this.rows) {
                    if (this.getDimensionUniqueName(row.name) === this.getDimensionUniqueName(field.name)) {
                        if (filters[field.name]) {
                            rowFilter.push(filters[field.name] as string[]);
                        }
                    }
                }
            }
        }
        if (this.allowLabelFilter || this.allowValueFilter) {
            for (let filterItems of advancedFilters) {
                for (let item of filterItems) {
                    advancedFilterQuery.push(this.getAdvancedFilterQuery(item, filterQuery, 'COLUMNS'));
                }
            }
        }
        for (let i: number = 0, cnt: number = columnFilter.length; i < cnt; i++) {
            filterQuery = i === 0 ? filterQuery + '{' + columnFilter[i].toString() + '}' : filterQuery + ',{' + columnFilter[i].toString() + '}';
        }
        if (columnFilter.length > 0) {
            filterQuery = (rowFilter.length > 0) ? filterQuery + ' ) ON COLUMNS ' + ',(' : filterQuery + ' ) ON COLUMNS';
        }
        for (let i: number = 0, cnt: number = rowFilter.length; i < cnt; i++) {
            filterQuery = (i > 0) ? filterQuery + ',{' + rowFilter[i].toString() + '}' : filterQuery + '{' + rowFilter[i].toString() + '}';
        }
        filterQuery = (columnFilter.length > 0 && rowFilter.length > 0) ?
            filterQuery = filterQuery + ') ON ROWS ' : (columnFilter.length == 0 && rowFilter.length > 0) ?
                filterQuery + ') ON COLUMNS ' : filterQuery;
        let updatedFilterQuery: string = '';
        if (advancedFilterQuery.length > 0) {
            updatedFilterQuery = ((columnFilter.length > 0 || rowFilter.length > 0) ? filterQuery : '') +
                ' ' + advancedFilterQuery.join(' ') + ' ' + query + Array(advancedFilterQuery.length + 1 +
                    ((columnFilter.length > 0 || rowFilter.length > 0) ? 1 : 0)).join(')');
        }
        query = (columnFilter.length === 0 && rowFilter.length === 0) ? query : filterQuery + query + ')';
        return (updatedFilterQuery.length > 0) ? updatedFilterQuery : query;
    }
    private static getAdvancedFilterQuery(filterItem: IFilter, query: string, currentAxis: string): string {
        let filterQuery: string = '\nFROM (SELECT Filter(' + filterItem.selectedField + '.AllMembers, ' +
            this.getAdvancedFilterCondtions(filterItem.name, filterItem.condition, filterItem.value1 as string, filterItem.value2 as string, filterItem.type, filterItem.measure) +
            ")) on " + currentAxis;
        return filterQuery;
    }
    private static getAdvancedFilterCondtions(fieldName: string, filterOperator: Operators, value1: string, value2: string, filterType: FilterType, measures: string): string {
        let advancedFilterQuery: string = ''
        switch (filterOperator) {
            case 'Equals':
                advancedFilterQuery = '(' + (filterType !== 'Value' ? (fieldName + '.CurrentMember.member_caption =\"' + value1 + '\"') : (measures + ' = ' + value1));
                break;
            case 'DoesNotEquals':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption <>\"' + value1 + '\"') : (measures + ' <>' + value1));
                break;
            case 'Contains':
                advancedFilterQuery = '( InStr (1,' + fieldName + '.CurrentMember.member_caption,\"' + value1 + '\") >0';
                break;
            case 'DoesNotContains':
                advancedFilterQuery = '( InStr (1,' + fieldName + '.CurrentMember.member_caption,\"' + value1 + '\")=0';
                break;
            case 'BeginWith':
                advancedFilterQuery = '( Left (' + fieldName + '.CurrentMember.member_caption,' + value1.length + ')=\"' + value1 + '\"';
                break;
            case 'DoesNotBeginWith':
                advancedFilterQuery = '( Left (' + fieldName + '.CurrentMember.member_caption,' + value1.length + ') <>\"' + value1 + '\"';
                break;
            case 'EndsWith':
                advancedFilterQuery = '( Right (' + fieldName + '.CurrentMember.member_caption,' + value1.length + ')=\"' + value1 + '\"';
                break;
            case 'DoesNotEndsWith':
                advancedFilterQuery = '( Right (' + fieldName + '.CurrentMember.member_caption,' + value1.length + ') <>\"' + value1 + '\"';
                break;
            case 'GreaterThan':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption >\"' + value1 + '\"') : (measures + ' >' + value1 + ''));
                break;
            case 'GreaterThanOrEqualTo':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption >=\"' + value1 + '\"') : (measures + ' >=' + value1 + ''));
                break;
            case 'LessThan':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption <\"' + value1 + '\"') : (measures + ' <' + value1 + ''));
                break;
            case 'LessThanOrEqualTo':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption <=\"' + value1 + '\"') : (measures + ' <=' + value1 + ''));
                break;
            case 'Between':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption >=\"' + value1 + '\"AND ' + fieldName + '.CurrentMember.member_caption <=\"' + value2 + '\"') : (measures + ' >=' + value1 + ' AND ' + measures + ' <=' + value2));
                break;
            case 'NotBetween':
                advancedFilterQuery = '(' + (filterType != 'Value' ? (fieldName + '.CurrentMember.member_caption >=\"' + value1 + '\"OR ' + fieldName + '.CurrentMember.member_caption <=\"' + value2 + '\"') : (measures + ' >=' + value1 + ' OR ' + measures + ' <=' + value2));
                break;
            default:
                advancedFilterQuery = '( InStr (1,' + fieldName + '.CurrentMember.member_caption,\"' + value1 + '\") >0';
                break;
        }
        return advancedFilterQuery;
    }
    private static getCalculatedFieldQuery(calcMembers: ICalculatedFieldSettings[]): string {
        let calcQuery: string = '';
        if (calcMembers.length > 0) {
            calcQuery = '\nWITH';
            for (let member of calcMembers) {
                let prefixName: string = (member.formula.indexOf('Measure') > -1 ? '[Measures].' : member.hierarchyUniqueName + '.');
                let aliasName: string = prefixName + '[' + member.name + ']';
                let formatString: string = (!isNullOrUndefined(member.formatString) ? member.formatString : null);
                calcQuery += ('\nMEMBER ' + aliasName + 'as (' + member.formula + ') ' + (!isNullOrUndefined(formatString) ? ', FORMAT_STRING =\"' + formatString.trim() + '\"' : ''));
            }
        }
        return calcQuery;
    }
}

/**
 * @hidden
 */
export interface pagingQuery {
    rowQuery: string;
    columnQuery: string
}