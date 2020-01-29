import {LogCurveDataSource} from '@int/geotoolkit/welllog/data/LogCurveDataSource';
import {Range} from '@int/geotoolkit/util/Range';
import {IWellTrack} from '@int/geotoolkit/welllog/multiwell/IWellTrack';
import {MultiWellWidget} from '@int/geotoolkit/welllog/multiwell/MultiWellWidget';
/**
 * Define interface foe data source for well
 */
export interface IWellDataSource {
    /**
     * Return curve data source
     * @param {string|number} id
     * @returns {geotoolkit.welllog.data.LogCurveDataSource}
     */
    getCurveSource(id: string): LogCurveDataSource;
    /**
     * Returns curve value limits
     * @param {string} id curve id
     * @returns {geotoolkit.util.Range} limits
     */
    getCurveValueLimits(id: string): Range;
    /**
     * Connect well
     * @param {geotoolkit.welllog.multiwell.IWellTrack} well well
     * @param {geotoolkit.welllog.multiwell.MultiWellWidget} widget widget
     */
    connect(well: IWellTrack,
        widget: MultiWellWidget);
}
