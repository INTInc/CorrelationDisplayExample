import { IWellDataSource } from "./welldatasource";
import {DataBinding} from '@int/geotoolkit/data/DataBinding';
import {LogCurve} from '@int/geotoolkit/welllog/LogCurve';
import {obfuscate} from '@int/geotoolkit/lib';
export class CurveBinding extends DataBinding {
    constructor() {
        super();
    }
    public accept(node) {
        return node instanceof LogCurve;
    }
    public bind(curve, data: IWellDataSource) {
        if (data == null || !this.accept(curve)) {
            return;
        }
        const id = curve.getName();
        const source = data.getCurveSource(id);
        if (source != null) {
            curve.setData(source, false, true);
        }
        const limits = data.getCurveValueLimits(id);
        if (limits) {
            curve.setNormalizationLimits(limits.getLow(), limits.getHigh());
        }
    }
    public unbind(curve, data) {
        // TODO: We are not allowed to set data = null
    }
}
obfuscate(CurveBinding);
