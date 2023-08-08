import {deepMergeObject, mergeObjects} from '@int/geotoolkit/base';
import {Registry as OperationsRegistry} from '@int/geotoolkit/controls/tools/editors/operations/Registry';
import {EditMode} from '@int/geotoolkit/controls/tools/EditMode';
import {OperationType} from '@int/geotoolkit/controls/tools/editors/operations/OperationType';
import {WellLogVisualsEditingTool} from '@int/geotoolkit/welllog/widgets/tools/WellLogVisualsEditingTool';
import {Events as WidgetEvents} from '@int/geotoolkit/welllog/widgets/Events';
import {Events as NodeEvents, Node} from '@int/geotoolkit/scene/Node';
import {from} from '@int/geotoolkit/selection/from';
import {LogAxis} from '@int/geotoolkit/welllog/LogAxis';
import {ColorUtil} from '@int/geotoolkit/util/ColorUtil';
import {Selector} from '@int/geotoolkit/selection/Selector';
import {LogTrack} from '@int/geotoolkit/welllog/LogTrack';
import type {WellLogWidget} from '@int/geotoolkit/welllog/widgets/WellLogWidget';
import {EventArgs} from '@int/geotoolkit/controls/tools/EventArgs';
import type {PaintEventArgs} from '@int/geotoolkit/controls/tools/PaintEventArgs';
import type {AbstractEditorBase} from '@int/geotoolkit/controls/tools/editors/AbstractEditorBase';
import type {MultiWellWidget} from '@int/geotoolkit/welllog/multiwell/MultiWellWidget';
import {Obfuscate, SetClassName} from '@int/geotoolkit/decorators';
import { LogMarker } from '@int/geotoolkit/welllog/LogMarker';

type Options = WellLogVisualsEditingTool.Options & {
    editmode?: EditMode;
    widget: WellLogWidget | MultiWellWidget;
    datalayercallback?: (eventArgs: EventArgs) => void;
    editor?: {
        freeresizemode?: false;
    };
};

@SetClassName('VisualsEditor')
@Obfuscate()
export class VisualsEditor extends WellLogVisualsEditingTool {
    private _freeResizeMode: boolean;
    private _widget: WellLogWidget | MultiWellWidget;
    private _dataLayerCallback: (eventArgs: EventArgs) => void;
    private _widgetChangedHandler: () => void;
    constructor (options: Options) {
        options = deepMergeObject(options, {
            'name': 'VisualsEditor',
            'editmode': EditMode.EditBbox,
            'editor': {
                'freeresizemode': false
            }
        }) as Options;
        super(options);
        this._freeResizeMode = options['editor']['freeresizemode'];
        this._widget = options['widget'];
        if (options['datalayercallback'] == null) {
            options['datalayercallback'] = (eventArgs) => {
                const point = eventArgs.getPlotPoint();
                const selection = Selector.select(eventArgs.getNode(), point.getX(), point.getY(), 0);
                const dataLayer = selection
                    .filter((node) => node instanceof LogTrack)
                    .filter((track: LogTrack) => from(track).where((node) => node instanceof LogAxis).selectFirst() == null)
                    .shift() as LogTrack;
                this.setDataLayer(dataLayer);
            };
        }
        this._dataLayerCallback = options['datalayercallback'];
        this._widgetChangedHandler = () => {
            this.update();
        };
        this.subscribeWidget(this._widget);
    }

    setDataLayerCallback (callback: (eventArgs: EventArgs) => void) {
        this._dataLayerCallback = callback;
    }

    getDataLayerCallback () {
        return this._dataLayerCallback;
    }

    isFreeResizeModeEnabled () {
        return this._freeResizeMode;
    }

    setFreeResizeModeEnabled (enabled: boolean) {
        this._freeResizeMode = enabled;
        this.setProperties({
            'editor': {
                'freeresizemode': this._freeResizeMode
            } as AbstractEditorBase.Options
        });
    }

    onMouseMove (eventArgs: EventArgs) {
        if ((this.getEditMode() & EditMode.CreateWithBounds) !== 0 && this._dataLayerCallback != null) {
            this._dataLayerCallback(eventArgs);
        }
        super.onMouseMove(eventArgs);
    }

    onNodeCreated (editor: AbstractEditorBase, eventArgs: PaintEventArgs) {
        if (eventArgs.getNode() != null) {
            this.editNode(eventArgs.getNode());
        }
        super.onNodeCreated(editor, eventArgs);
    }

    editNode (node: Node) {
        this.setEditMode(this.calcEditMode(node));

        return super.editNode(node);
    }

    insertNode (options?: Record<string, any>) {
        options = mergeObjects(options, {
            'fillstyle': ColorUtil.getRandomColorRgb(),
            'linestyle': {
                'width': 1.5,
                'color': 'black'
            }
        }, true);
        const node = new LogMarker(options);
        if (node == null) {
            this.editNode(null);
            return this;
        }

        this.editNode(node);
        if (this.getEditor() != null) {
            // Always use ghost mode while inserting visuals
            const mode = this.getEditor().getEditMode();
            this.getEditor().setEditMode(mode | EditMode.Ghost);
        }

        return this;
    }

    dispose () {
        this.unSubscribeWidget(this._widget);
        super.dispose();
    }

    calcEditMode (node: Node | Node[]) {
        let mode = this.getEditMode() & EditMode.Ghost;
        if (node == null) {
            return mode;
        }
        if (!Array.isArray(node) && node.getParent() == null) {
            mode |= EditMode.CreateWithBounds;
            return mode;
        }
        mode |= EditMode.EditBbox;
        const nodes = Array.isArray(node) ? node : [node];
        const opRegistry = OperationsRegistry.getInstance();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!opRegistry.isRegistered(node, OperationType.Translate)) {
                mode ^= EditMode.Translate;
            }
            if (!opRegistry.isRegistered(node, OperationType.Transform)) {
                mode ^= EditMode.Resize;
            }
            if (!opRegistry.isRegistered(node, OperationType.Rotate)) {
                mode ^= EditMode.Rotate;
            }
        }

        return mode;
    }

    subscribeWidget (widget: WellLogWidget | MultiWellWidget) {
        widget.on(NodeEvents.BoundsChanged, this._widgetChangedHandler);
        widget.on(WidgetEvents.TracksSizeChanged, this._widgetChangedHandler);
        if (widget.getTrackContainer() != null) {
            widget.getTrackContainer()
                .on(NodeEvents.LocalTransformationChanged, this._widgetChangedHandler);
        }

        return this;
    }

    unSubscribeWidget (widget: WellLogWidget | MultiWellWidget) {
        widget.off(WidgetEvents.TracksSizeChanged, this._widgetChangedHandler);
        widget.off(NodeEvents.BoundsChanged, this._widgetChangedHandler);
        if (widget.getTrackContainer() != null) {
            widget.getTrackContainer()
                .off(NodeEvents.LocalTransformationChanged, this._widgetChangedHandler);
        }

        return this;
    }
}
