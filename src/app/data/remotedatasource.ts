import { CurveService } from '../services/index';
import { IWellDataSource } from './welldatasource';

const depthColumnName = 'DEPTH';
function getCurveInfo(columns, name: string) {
    for (let i = 0; i < columns.length; ++i) {
        if (columns[i]['name'].indexOf(name) !== -1) {
            return columns[i];
        }
    }
    return null;
}
function getFirstCurveInfo(columns) {
    return columns.length > 0 ? columns[0] : null;
}
export class RemoteDataSource extends geotoolkit.data.DataSource implements IWellDataSource {
    private curveBinding: geotoolkit.data.DataBinding;
    private dataSet: geotoolkit.data.DataSet;
    private logData: geotoolkit.data.DataTable;
    private onWidgetDataUpdated: any;
    private onDataSetDataFetching: any;
    private well: geotoolkit.welllog.multiwell.IWellTrack;
    private widget: geotoolkit.welllog.multiwell.MultiWellWidget;
    private constructor(public wellInfo: any, private curveService: CurveService) {
        super();
        this.onWidgetDataUpdated = this.fetchDataSet.bind(this);
        this.onDataSetDataFetching = this.dataSetDataFetching.bind(this);
        this.init();
    }
    static create(wellInfo: any, curveService: CurveService) {
        return new RemoteDataSource(wellInfo, curveService);
    }
    public connect(well: geotoolkit.welllog.multiwell.IWellTrack,
            widget: geotoolkit.welllog.multiwell.MultiWellWidget) {
        this.well = well;
        this.widget = widget;
        widget.on(geotoolkit.welllog.multiwell.MultiWellWidget.Events.DataUpdating,
                this.onWidgetDataUpdated);
        well.setData(this);
        well.setDepthLimits(this.dataSet.getFullIndexRange().getLow(), this.dataSet.getFullIndexRange().getHigh());
    }
    public disconnect(well: geotoolkit.welllog.multiwell.IWellTrack, widget: geotoolkit.welllog.multiwell.MultiWellWidget) {
        widget.off(geotoolkit.welllog.multiwell.MultiWellWidget.Events.DataUpdating,
                this.onWidgetDataUpdated);
        const binding = well.getDataBinding() as geotoolkit.data.DataBindingRegistry;
        binding.remove(this.curveBinding);
        well.setData(null);
    }
    /**
     * Return curve data source
     * @param {string|number} id curve id
     * @returns {geotoolkit.welllog.data.LogCurveDataSource}
     */
    public getCurveSource(id: string): geotoolkit.welllog.data.LogCurveDataSource {
        const curvesInfo = this.wellInfo['curves'];
        const dataTable = this.getDataTable();
        const index =  dataTable.indexOfColumn(dataTable.getColumnByName(id));
        const column = getCurveInfo(curvesInfo, id);
        if (!column) {
            return null;
        }
        if (index === -1) {
            dataTable.addColumn(column);
            // Invalidate table (At the current moment table cannot be invalidated by column)
            this.dataSet.invalidateRange();
        }
        const depths = this.dataSet.getIndexColumn(0);
        const values = this.dataSet.getTable(0).getColumnByName(id);
        return values !== null ? (new geotoolkit.welllog.data.LogCurveDataSource({
                'depths': depths,
                'values': values,
                'name': id
            })) :
            null;
    }
    /**
     * Returns curve value limits
     * @param {string} id curve id
     * @returns {?geotoolkit.util.Range} limits
     */
    public getCurveValueLimits(id: string): geotoolkit.util.Range {
        const curvesInfo = this.wellInfo['curves'];
        const column = getCurveInfo(curvesInfo, id);
        if (!column) {
            return null;
        }
        return new geotoolkit.util.Range(column['min'], column['max']);
    }
    private init() {
        const curvesInfo = this.wellInfo['curves'];
        const depthColumn = getCurveInfo(curvesInfo, depthColumnName) || getFirstCurveInfo(curvesInfo);
        if (!depthColumn) {
            throw new Error('Wrong depth column meta data');
        }
        // Create a data table to keep some data in memory
        this.logData = new geotoolkit.data.DataTable({
            cols: [depthColumn],
            colsdata: []
        });
        // Create dataset, which keeps a dataset range and manage data to be loaded
        this.dataSet = new geotoolkit.data.DataSet();
        this.dataSet.on(geotoolkit.data.Events.DataFetching, this.onDataSetDataFetching);
        // Add log data to data set
        this.dataSet.addTable(this.logData, new geotoolkit.util.Range( +depthColumn['min'], +depthColumn['max']));
    }
    private fetchDataSet(type, source, args) {
        // args = [{'start':..., 'end': ..., 'scale': ...]
        const visibleLimits = this.well.getVisibleDepthLimits();
        // Check if a track is in the visible area
        if (visibleLimits.getSize() > 0) {
            const start = Math.floor(this.widget.convertModelDepthToTrackDepth(this.well, args.start));
            const end = Math.ceil(this.widget.convertModelDepthToTrackDepth(this.well, args.end));
            const limits = new geotoolkit.util.Range(start, end);
            const scale = this.well.getDepthScale(null, 'px');
            this.dataSet.fetch(limits, scale);
        }
    }
    /**
     * This method is called by dataset to receive data from serve
     * @param {string} type type of event
     * @param {object} source source of event
     * @param {object} args arguments
     */
    private async dataSetDataFetching(type, source, args) {
        // request a data range from server
        const limits = args['limits'];
        const scale = args['scale'];
        const cells = await this.getRangedData(limits, scale, this.dataSet.isDecimationEnabled());
        // call callback and pass received data
        args['callback'](null, [cells]);
    }
    /**
     * Get curve's ranged data from remote data provider
     * @private
     * @param {geotoolkit.util.Range} range requested range
     * @param {number} scale scale
     * @param {boolean} useDecimation is decimation used
     * @returns {*}
     */
    private async getRangedData(range, scale, useDecimation) {
        const columns = [];
        for (let i = 0; i < this.logData.getNumberOfColumns(); ++i) {
            columns.push(this.logData.getColumn(i).getName());
        }
        return this.curveService.getCurvesData(this.wellInfo['id'], columns, range, scale, useDecimation);
    }
    private getDataTable(): geotoolkit.data.DataTable {
        return this.dataSet.getTable(0);
    }
}
geotoolkit.obfuscate(RemoteDataSource, geotoolkit.data.DataSource);

