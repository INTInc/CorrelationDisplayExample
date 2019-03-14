/**
 * Define interface foe data source for well
 */
export interface IWellDataSource {
    /**
     * Return curve data source
     * @param {string|number} id
     * @returns {geotoolkit.welllog.data.LogCurveDataSource}
     */
    getCurveSource(id: string): geotoolkit.welllog.data.LogCurveDataSource;
    /**
     * Returns curve value limits
     * @param {string} id curve id
     * @returns {geotoolkit.util.Range} limits
     */
    getCurveValueLimits(id: string): geotoolkit.util.Range;
    /**
     * Connect well
     * @param {geotoolkit.welllog.multiwell.IWellTrack} well well
     * @param {geotoolkit.welllog.multiwell.MultiWellWidget} widget widget
     */
    connect(well: geotoolkit.welllog.multiwell.IWellTrack,
        widget: geotoolkit.welllog.multiwell.MultiWellWidget);
}
