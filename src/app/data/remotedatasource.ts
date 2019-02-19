import { CurveService } from '../services/index';

const depthColumnName = 'DEPTH';

class CurveBinding extends geotoolkit.data.DataBinding {
    private dataTable: geotoolkit.data.DataTable;
    constructor(dataTable: geotoolkit.data.DataTable) {
        super();
        this.dataTable = dataTable;
    }
    public accept(node) {
        return node instanceof geotoolkit.welllog.LogCurve;
    }
    public bind(curve, data) {
        if (data == null) {
            return;
        }
        const id = curve.getName();
        const index = this.dataTable.indexOfColumn(this.dataTable.getColumnByName(id));
        const source = data.getCurveSource(id);
        if (source != null) {
            curve.setData(source, true, true);
        }
        let curveLimits = this.dataTable.getMetaData()['curveLimits'];
        curve.setNormalizationLimits(curveLimits[index]['min'], curveLimits[index]['max']);
    }
    public unbind(curve, data) {
        // TODO: We are not allowed to set data = null
    }
}
geotoolkit.obfuscate(CurveBinding, geotoolkit.data.DataBinding);

export class RemoteDataSource extends geotoolkit.data.DataSource {
    private curveBinding: geotoolkit.data.DataBinding;
    private dataset: geotoolkit.data.DataSet;
    private logData: geotoolkit.data.DataTable;
    private onWidgetDataUpdated: any;
    private onDataSetDataFetching: any;
    private well: geotoolkit.welllog.multiwell.IWellTrack;
    private widget: geotoolkit.welllog.multiwell.MultiWellWidget;
    private constructor(public wellId: string, private curveService: CurveService) {
        super();
        this.onWidgetDataUpdated = this.fetchDataSet.bind(this);
        this.onDataSetDataFetching = this.dataSetDataFetching.bind(this);
    }
    static async create(wellId: string, curveService: CurveService) {
        const datasource = new RemoteDataSource(wellId, curveService);
        await datasource.init();
        return datasource;
    }
    public connect(well: geotoolkit.welllog.multiwell.IWellTrack,
            widget: geotoolkit.welllog.multiwell.MultiWellWidget) {
        this.well = well;
        this.widget = widget;
        const binding = well.getDataBinding() as geotoolkit.data.DataBindingRegistry;
        const dataTable = this.dataset.getTable(0);
        this.curveBinding = this.curveBinding || new CurveBinding(dataTable);
        binding.add(this.curveBinding);
        widget.on(geotoolkit.welllog.multiwell.MultiWellWidget.Events.DataUpdating,
                this.onWidgetDataUpdated);
        well.setData(this);
        well.setDepthLimits(this.dataset.getFullIndexRange().getLow(), this.dataset.getFullIndexRange().getHigh());
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
        const curveMetaData = await this.curveService.getCurveMetaData(this.wellId, curveId);
        this.logData.addColumn(curveMetaData);
    }
    /**
     * Return curve data source
     * @param id
     * @returns {geotoolkit.welllog.data.LogCurveDataSource}
     */
    public getCurveSource(id) {
        const depths = this.dataset.getIndexColumn(0);
        const values = this.dataset.getTable(0).getColumnByName(id);
        return values !== null ? (new geotoolkit.welllog.data.LogCurveDataSource({
                'depths': depths,
                'values': values,
                'name': id
            })) :
            null;
    }
    private async init() {
        // load meta data
        const depthColumnMetaData = await this.curveService.getCurveMetaData(this.wellId, depthColumnName);
        if (!depthColumnMetaData) {
            throw new Error('Wrong depth column meta data');
        }
        // Load existing data range from server
        const range = await this.curveService.getCurveRange(this.wellId, depthColumnName);
        if (!range) {
            throw new Error('Wrong depth range');
        }
        // Request existing supported curves
        const curves = await this.curveService.getCurvesList(this.wellId);
        // Create a data table to keep some data in memory
        this.logData = new geotoolkit.data.DataTable({
            cols: curves['data'],
            colsdata: [],
            meta: {
                'curveLimits': curves['data']
            }
        });
        // Create dataset, which keeps a dataset range and manage data to be loaded
        this.dataset = new geotoolkit.data.DataSet();
        this.dataset.on(geotoolkit.data.Events.DataFetching, this.onDataSetDataFetching);
        // Add log data to data set
        this.dataset.addTable(this.logData, new geotoolkit.util.Range( +range['min'], +range['max']));
    }
    private fetchDataSet(type, source, args) {
        // args = [{'start':..., 'end': ..., 'scale': ...]
        const visibleLimits = this.well.getVisibleDepthLimits();
        // Check it track is in the visible area
        if (visibleLimits.getSize() > 0) {
            const start = this.widget.convertModelDepthToTrackDepth(this.well, args.start);
            const end = this.widget.convertModelDepthToTrackDepth(this.well, args.end);
            const limits = new geotoolkit.util.Range(start, end);
            const scale = this.well.getDepthScale(null, 'px');
            this.dataset.fetch(limits, scale);
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
        const cells = await this.getRangedData(args['limits'], args['scale'], this.dataset.isDecimationEnabled());
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
        return this.curveService.getCurvesData(this.wellId, columns, range, scale, useDecimation);
    }
}
geotoolkit.obfuscate(RemoteDataSource, geotoolkit.data.DataSource);

