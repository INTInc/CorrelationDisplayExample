import { IWellDataSource } from "./welldatasource";

export class CurveBinding extends geotoolkit.data.DataBinding {
    constructor() {
        super();
    }
    public accept(node) {
        return node instanceof geotoolkit.welllog.LogCurve;
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
geotoolkit.obfuscate(CurveBinding, geotoolkit.data.DataBinding);
