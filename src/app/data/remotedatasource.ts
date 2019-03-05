import { CurveService } from '../services/index';

const depthColumnName = 'DEPTH';
function getCurveInfo(columns, name: string) {
    for (let i = 0; i < columns.length; ++i) {
        if (columns[i]['name'] === name) {
            return columns[i];
        }
    }
    return null;
}
class CurveBinding extends geotoolkit.data.DataBinding {
    private dataTable: geotoolkit.data.DataTable;
    private dataSet: geotoolkit.data.DataSet;
    constructor(dataTable: geotoolkit.data.DataTable, dataSet: geotoolkit.data.DataSet) {
        super();
        this.dataTable = dataTable;
        this.dataSet = dataSet;
    }
    public accept(node) {
        return node instanceof geotoolkit.welllog.LogCurve;
    }
    public bind(curve, data) {
        if (data == null) {
            return;
        }
        const id = curve.getName();
        const curves = this.dataTable.getMetaData()['curvesInfo'];
        const index = this.dataTable.indexOfColumn(this.dataTable.getColumnByName(id));
        const column = getCurveInfo(curves, id);
        if (index === -1 && column) {
            this.dataTable.addColumn(column);
            // Invalidate table (At the current moment table cannot be invalidated by column)
            this.dataSet.invalidateRange();
        } else {
            return;
        }
        const source = data.getCurveSource(id);
        if (source != null) {
            curve.setData(source, false, true);
        }
        curve.setNormalizationLimits(column['min'], column['max']);
    }
    public unbind(curve, data) {
        // TODO: We are not allowed to set data = null
    }
}
geotoolkit.obfuscate(CurveBinding, geotoolkit.data.DataBinding);

export class RemoteDataSource extends geotoolkit.data.DataSource {
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
        const binding = well.getDataBinding() as geotoolkit.data.DataBindingRegistry;
        const dataTable = this.dataSet.getTable(0);
        this.curveBinding = this.curveBinding || new CurveBinding(dataTable, this.dataSet);
        binding.add(this.curveBinding);
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
     * Add curve to update
     * @param {string} curveId curve's id
     */
    public async addCurve(curveId) {
        const curveMetaData = await this.curveService.getCurveMetaData(this.wellInfo['id'], curveId);
        this.logData.addColumn(curveMetaData);
    }
    /**
     * Return curve data source
     * @param id
     * @returns {geotoolkit.welllog.data.LogCurveDataSource}
     */
    public getCurveSource(id) {
        const depths = this.dataSet.getIndexColumn(0);
        const values = this.dataSet.getTable(0).getColumnByName(id);
        return values !== null ? (new geotoolkit.welllog.data.LogCurveDataSource({
                'depths': depths,
                'values': values,
                'name': id
            })) :
            null;
    }
    private init() {
        const curvesInfo = this.wellInfo['curves'];
        const depthColumn = getCurveInfo(curvesInfo, depthColumnName);
        if (!depthColumn) {
            throw new Error('Wrong depth column meta data');
        }
        // Create a data table to keep some data in memory
        this.logData = new geotoolkit.data.DataTable({
            cols: [depthColumn],
            colsdata: [],
            meta: {
                'curvesInfo': curvesInfo
            }
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
            const start = this.widget.convertModelDepthToTrackDepth(this.well, args.start);
            const end = this.widget.convertModelDepthToTrackDepth(this.well, args.end);
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
        const cells = await this.getRangedData(args['limits'], args['scale'], this.dataSet.isDecimationEnabled());
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
}
geotoolkit.obfuscate(RemoteDataSource, geotoolkit.data.DataSource);

