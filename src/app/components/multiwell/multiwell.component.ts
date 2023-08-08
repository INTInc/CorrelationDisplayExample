import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {CurveBinding} from '../../data/index';
import {Plot} from '@int/geotoolkit/plot/Plot';
import {MultiWellWidget} from '@int/geotoolkit/welllog/multiwell/MultiWellWidget';
import {WellLogVisualsEditingTool} from '@int/geotoolkit/welllog/widgets/tools/WellLogVisualsEditingTool';
import {DeleteNode} from '@int/geotoolkit/controls/tools/editors/commands/DeleteNode';
import {ColorUtil, KnownColors} from '@int/geotoolkit/util/ColorUtil';
import {TrackType} from '@int/geotoolkit/welllog/multiwell/TrackType';
import {Events as NodeEvents, isNode, Node, StateChanges} from '@int/geotoolkit/scene/Node';
import {LogTrack} from '@int/geotoolkit/welllog/LogTrack';
import {LogMarker} from '@int/geotoolkit/welllog/LogMarker';
import {from, from as fromNode} from '@int/geotoolkit/selection/from';
import {Events as RubberBandEvents, RubberBand} from '@int/geotoolkit/controls/tools/RubberBand';
import {RubberBandRenderMode} from '@int/geotoolkit/controls/tools/RubberBandRenderMode';
import {Events as AbstractToolEvents} from '@int/geotoolkit/controls/tools/AbstractTool';
import {LogVisualHeaderProvider} from '@int/geotoolkit/welllog/header/LogVisualHeaderProvider';
import {HeaderType as LogAxisVisualHeaderType, LogAxisVisualHeader} from '@int/geotoolkit/welllog/header/LogAxisVisualHeader';
import {AdaptiveLogCurveVisualHeader} from '@int/geotoolkit/welllog/header/AdaptiveLogCurveVisualHeader';
import {CorrelationRange} from '@int/geotoolkit/welllog/multiwell/correlation/CorrelationRange';
import {LineStyle, Patterns as LineStylePatterns} from '@int/geotoolkit/attributes/LineStyle';
import {AlignmentStyle, TextStyle} from '@int/geotoolkit/attributes/TextStyle';
import {AnchorType} from '@int/geotoolkit/util/AnchorType';
import {CirclePainter} from '@int/geotoolkit/scene/shapes/painters/CirclePainter';
import {CorrelationTrack} from '@int/geotoolkit/welllog/multiwell/CorrelationTrack';
import {ResponsiveStyle} from '@int/geotoolkit/responsive/ResponsiveStyle';
import {MathUtil, MathUtil as IntMath} from '@int/geotoolkit/util/MathUtil';
import {Point} from '@int/geotoolkit/util/Point';
import {Events as SelectionEvents} from '@int/geotoolkit/controls/tools/Selection';
import {ToolTipTool} from '@int/geotoolkit/controls/tools/ToolTipTool';
import {Layer} from '@int/geotoolkit/scene/Layer';
import {CssStyle} from '@int/geotoolkit/css/CssStyle';
import {SymbolShape} from '@int/geotoolkit/scene/shapes/SymbolShape';
import {SquarePainter} from '@int/geotoolkit/scene/shapes/painters/SquarePainter';
import {WellTrack} from '@int/geotoolkit/welllog/multiwell/WellTrack';
import {EditEvents} from '@int/geotoolkit/controls/tools/EditEvents';
import {VisualsEditor} from './visualeditor';
import {EditMode} from '@int/geotoolkit/controls/tools/EditMode';
import {ITrack} from '@int/geotoolkit/welllog/ITrack';
import {TopCorrelation} from '@int/geotoolkit/welllog/multiwell/correlation/TopCorrelation';
import {isInstanceOf} from '@int/geotoolkit/base';
import {Selector} from '@int/geotoolkit/selection/Selector';
import {EventArgs} from '@int/geotoolkit/controls/tools/EventArgs';

export const Modes = {
    Edit: 'Edit',
    Insert: 'Insert',
    Delete: 'Delete',
    Off: 'Off'
};
let colorOfInsertedMarker = ColorUtil.getRandomColorRgb();

@Component({
    selector: 'app-multiwell-component',
    templateUrl: './multiwell.component.html',
    styleUrls: ['./multiwell.component.css']
})
export class MultiWellComponent implements AfterViewInit {
    private static readonly CorrelationTrackWidth = 50;
    @ViewChild('plot', {static: true})
    canvas: ElementRef;
    @ViewChild('parent', {static: true})
    parent: ElementRef;
    private plot: Plot;
    private widget: MultiWellWidget;
    private wellCounter = 1;
    private panning = false;
    private topsEditingMode = false;
    private addTopsMode = false;
    private removeTopsMode = false;
    private horizontalScale = false;
    private curveBinding: CurveBinding = null;
    private mode = Modes.Edit;
    private currentDepth = 0;
    private globalId: string | number = 0;
    private listOfTracks: ITrack[] = [];
    constructor () {
    }
    ngAfterViewInit () {
        this.init();
    }
    @HostListener('window:resize', ['$event'])
    onResize (event) {
        this.resize(event);
    }
    /**
     * Zoom it
     */
    public zoomIn () {
        this.widget.scale(this.horizontalScale ? 2.0 : 1.0, 2.0);
    }
    /**
     * Zoom Out
     */
    public zoomOut () {
        this.widget.scale(this.horizontalScale ? 0.5 : 1.0, 0.5);
    }
    /**
     * Returns true if widgets is in single well mode
     * @returns {boolean}
     */
    public isSingleWellPanning (): boolean {
        return this.panning;
    }
    public isTopsEditingMode (): boolean {
        return this.topsEditingMode;
    }
    public isAddTopsMode (): boolean {
        return this.addTopsMode;
    }
    public isRemoveTopsMode (): boolean {
        return this.removeTopsMode;
    }
    /**
     * Enable or disable single well mode
     * @param {boolean} enable enable mode
     */
    public setSingleWellPanning (enable: boolean) {
        if (this.widget != null) {
            this.panning = enable;
            if (enable) {
                this.setTopsEditingMode(false);
                this.setRemoveTopsMode(false);
                this.setAddTopsMode(false);
            }
            this.widget.getToolByName('panningTools').setEnabled(true);
            const wellToolsContainer = this.widget.getToolByName('well-tools');
            wellToolsContainer.setEnabled(!enable);
        }
    }
    public setTopsEditingMode (enable: boolean) {
        if (this.widget != null) {
            this.topsEditingMode = enable;
            const markerTool = this.widget.getToolByName('markereditor') as WellLogVisualsEditingTool;
            if (enable) {
                this.setSingleWellPanning(false);
                this.setRemoveTopsMode(false);
                this.setAddTopsMode(false);
                this.mode = Modes.Edit;
                this.listOfTracks = [];
            }
            markerTool.setEnabled(enable);
            markerTool.editNode(null);
        }
    }

    public setAddTopsMode (enable: boolean) {
        if (this.widget != null) {
            this.addTopsMode = enable;
            const markerTool = this.widget.getToolByName('markereditor') as VisualsEditor;
            if (enable) {
                this.setSingleWellPanning(false);
                this.setTopsEditingMode(false);
                this.setRemoveTopsMode(false);
                this.mode = Modes.Insert;
                colorOfInsertedMarker = ColorUtil.getRandomColorRgb();
                this.globalId = +this.globalId + 1;
                markerTool.insertNode(this.getMarkerOptions());
            } else {
                this.mode = Modes.Edit;
            }
            markerTool.setEnabled(enable);
        }
    }

    public setRemoveTopsMode (enable: boolean) {
        if (this.widget != null) {
            this.removeTopsMode = enable;
            const markerTool = this.widget.getToolByName('markereditor') as WellLogVisualsEditingTool;
            if (enable) {
                this.setSingleWellPanning(false);
                this.setTopsEditingMode(false);
                this.setAddTopsMode(false);
                this.mode = Modes.Delete;
                this.listOfTracks = [];
            } else {
                this.mode = Modes.Off;
            }
            markerTool.setEnabled(enable);
            markerTool.editNode(null);
        }
    }
    /**
     * Return true if scaling is enable in horizontal direction
     * @returns {boolean}
     */
    public isHorizontalScale (): boolean {
        return this.horizontalScale;
    }
    /**
     * Enable or disable scaling in horizontal direction
     * @param {boolean} enable enable or disable
     */
    public setHorizontalScale (enable: boolean) {
        this.horizontalScale = enable;
    }
    /**
     * Add wells
     * @param {any[]} wells wells
     */
    public addWells (wells: any) {
        const tracks: CorrelationTrack[] & WellTrack[] = [];
        for (let i = 0; i < wells.length; ++i) {
            if (this.widget.getTracksCount() + i > 0) {
              this.widget.addTrack(this.widget.createTrack(TrackType.CorrelationTrack, {
                    'width': MultiWellComponent.CorrelationTrackWidth
                }));
            }
            const well = this.createWell(wells[i]['position'], wells[i]['depths'], wells[i]['template']);
            if (wells[i]['data']) {
                wells[i]['data'].connect(well, this.widget);
            }
            this.widget.addTrack(well);
        }
        for (let i = 0; i < this.widget.getTracksCount(); ++i) {
            const track = this.widget.getTrackAt(i);
            if (track instanceof CorrelationTrack) {
                let leftWell, rightWell;
                if (i >= 1) {
                    leftWell = this.widget.getTrackAt(i - 1);
                }
                if (i < this.widget.getTracksCount() - 1) {
                    rightWell = this.widget.getTrackAt(i + 1);
                }
                if (rightWell && leftWell) {
                    track.setWells(leftWell, rightWell);
                }
            }
        }
    }
    /**
     * Suspend widget update
     */
    public suspendUpdate () {
        Node.enableSceneGraphNotification(false);
        this.widget.suspendUpdate();
    }
    /**
     * Resume widget update
     */
    public resumeUpdate () {
        Node.enableSceneGraphNotification(true);
        this.widget.resumeUpdate();
        this.widget.updateLayout();
    }
    /**
     * Reset zoom
     * @param {?number} [depthScale=100] depth scale to reset
     */
    public resetZoom (depthScale?: number) {
        const transform = this.widget.getTrackContainer().getLocalTransform();
        const scaleX = transform ? transform.getScaleX() : 1;
        const scaleY = transform ? transform.getScaleY() : 1;
        const wellTrackArray = [];
        if (!depthScale) {
            depthScale = 100;
        }
        this.widget.scale(1.0 / scaleX, 1.0 / scaleY);
        let depthRange = null;
        this.widget.getTrackContainer().getChildren().forEach(function (element) {
            if (element.getClassName() === 'geotoolkit.welllog.multiwell.WellTrack') {
                wellTrackArray.push(element);
            }
        });
        wellTrackArray.map(function (element, index) {
            element.setDepthScale(depthScale);
            depthRange = element.getDepthLimits();
        });
        if (depthRange) {
            this.widget.alignToDepth((depthRange.getHigh() + depthRange.getLow()) / 2, 'center');
        }
    }
    /**
     * Fit widget to bounds
     */
    public fitToBounds () {
        // index track can be invisible
        let limits = this.widget.getCenterModelLimits();
        let width = 0;
        fromNode(this.widget.getTrackContainer()).where(function (node) {
            return node.getVisible() && node instanceof LogTrack && node.getCssClass() === 'INDEX_TRACK';
        }).select(function (node) {
            width += node.getWidth();
        });
        // we need to reduce a size
        limits = limits.clone().setWidth(limits.getWidth() - width);
        this.widget.setCenterVisibleModelLimits(limits);
    }
    /**
     * Scale selected well
     * @param {number} scale depth scale
     */
    public scaleWell (scale: number) {
        if (this.widget == null) {
            return;
        }
        if (this.panning === true && this.widget.getSelectedTrack() !== null) {
            const track = this.widget.getSelectedTrack() as WellTrack;
            track.setDepthScale(scale);
        } else if (this.panning === true && this.widget.getSelectedTrack() === null) {
            return;
        } else {
            this.widget.getTrackContainer().getChildren().forEach(function (element) {
                if (element instanceof WellTrack) {
                    element.setDepthScale(scale);
                }
            });
        }
    }
    /**
     * Return selected well
     * @returns {WellTrack}
     */
    public getSelectedTrack (): WellTrack {
        return this.widget.getSelectedTrack() as WellTrack;
    }
    /**
     * Activate rubber band zoom. It will be deactivated automatically
     */
    public activateRubberBand () {
        this.panning = false;
        this.widget.getToolByName('rubberband').toggle();
        this.widget.getToolByName('panningTools').setEnabled(false);
        this.widget.getToolByName('well-tools').setEnabled(false);
    }
    /**
     * Add tops correlation
     * @param {number} depth depth
     * @param {string} name name
     * @param {string} color color
     */
    public addTopsCorrelation (depth: number, name: string, color: string) {
        const isMarker = (node) => (node instanceof LogMarker) && node.getDepth() === depth;
        for (let i = 0; i < this.widget.getTracksCount(); ++i) {
            const track = this.widget.getTrackAt(i);
            if (!(track instanceof CorrelationTrack)) {
                const wellTrack = track as WellTrack;
                let top = fromNode(wellTrack.getMarkerLayer()).where(isMarker).selectFirst() as LogMarker;
                if (!top) {
                    top = new LogMarker(depth, name).setId(this.globalId);
                    const ls = LineStyle.fromObject({'color': color});
                    ls.setPattern(LineStylePatterns.Dot);
                    top.setLineStyle(ls);
                    top.setTextStyle(TextStyle.fromObject({
                        'color': color,
                        'alignment': AlignmentStyle.Left,
                        'font': '12px sans-serif'
                    }));
                    top.setNameLabel(name);
                    top.setNameLabelPosition(AnchorType.TopCenter);
                    top.setDepthLabel(String(depth));
                    top.setDepthLabelPosition(AnchorType.BottomCenter);
                    wellTrack.getMarkerLayer().addChild(top);
                }
            } else {
                const childIterator = track.getChildren((node) => node instanceof TopCorrelation);
                if (!childIterator.hasNext()) {
                    track.addChild(new TopCorrelation());
                }
            }
        }
        this.globalId = +this.globalId + 1;
    }
    /**
     * Add lithology correlation
     * @param {number} startDepth start depth
     * @param {number} endDepth end depth
     * @param {string} color color
     */
    public addFillCorrelation (startDepth: number, endDepth: number, color: string) {
        const isRangeCorrelation = function (node) {
            return ((node instanceof CorrelationRange) &&
                (node.getLeftDepthRange().getLow() === startDepth) && (node.getRightDepthRange().getLow() === startDepth) &&
                (node.getLeftDepthRange().getHigh() === endDepth) && (node.getRightDepthRange().getHigh() === endDepth));
        };
        for (let i = 0; i < this.widget.getTracksCount(); ++i) {
            const track = this.widget.getTrackAt(i);
            if (track instanceof CorrelationTrack) {
                let leftWell, rightWell;
                if (i >= 1) {
                    leftWell = this.widget.getTrackAt(i - 1);
                }
                if (i < this.widget.getTracksCount() - 1) {
                    rightWell = this.widget.getTrackAt(i + 1);
                }
                if (rightWell && leftWell) {
                    const correlation = fromNode(track).where(isRangeCorrelation).selectFirst();
                    if (!correlation) {
                        track.setWells(leftWell, rightWell);
                        track.addChild(new CorrelationRange({
                            'leftstartdepth': startDepth,
                            'leftenddepth': endDepth,
                            'rightstartdepth': startDepth,
                            'rightenddepth': endDepth,
                            'fillstyle': {
                                'color': color
                            }
                        }));
                    }
                }
            }
        }
        this.globalId = +this.globalId + 1;
    }
    private createWell (position, depths, template) {
        const well = this.widget.createTrack(TrackType.WellTrack, {
            'width': 0,
            'range': position,
            'welllog': {
                'range': depths
            },
            'title': 'Well ' + (this.wellCounter++),
            'cssclass': 'WellTrack'
        });
        if (template) {
            well.suspendUpdate();
            well.loadTemplate(JSON.stringify(template));
            well.resumeUpdate();
        }
        well.on(NodeEvents.BoundsChanged, function () {
            const markerEditor = this.widget.getToolByName('markereditor') as WellLogVisualsEditingTool;
            markerEditor.update();
        }.bind(this));
        well.setDataBinding(this.curveBinding);
        return well;
    }
    private init () {
        this.configureHeaders();
        this.initPlot();
        this.resize(null);
    }
    private initPlot () {
        const widget = this.createWidget();
        this.plot = new Plot({
            'canvaselement': this.canvas.nativeElement,
            'root': widget
        });
        widget.invalidate();
        this.widget = widget;
    }
    private createWidget (): MultiWellWidget {
        this.curveBinding = new CurveBinding();
        const widget = new MultiWellWidget({
            'offscreentrackpanning': 0.08,
            'header': {
                'viewcache': true
            },
            'footer': {
                'visible': 'none'
            }
        });
        this.initRubberBandTool(widget);
        this.initializeMarkerTool(widget, widget.getTrackManipulatorLayer());
        this.setLevelOfDetails(widget);
        this.setCss(widget);
        return widget;
    }
    private initRubberBandTool (widget) {
        const rubberBandTool = new RubberBand(widget.getTrackManipulatorLayer(), RubberBandRenderMode.AspectRatio)
            .setEnabled(false)
            .on(AbstractToolEvents.onStateChanged, function (eventType, sender, args) {
                if (this.panning) {
                    this.panning = false;
                    widget.getToolByName('panningTools').setEnabled(false);
                }
                widget.getToolByName('multiwell-splitter').setEnabled(!sender.isEnabled());
                const wellToolsContainer = widget.getToolByName('well-tools');
                wellToolsContainer.setEnabled(!sender.isEnabled());
            }.bind(this))
            .on(RubberBandEvents.onZoomEnd, function (eventType, sender, eventArgs) {
                let newModelLimits = eventArgs.getArea();
                newModelLimits = widget.getTrackManipulatorLayer().getSceneTransform().transformRect(newModelLimits);
                newModelLimits = widget.getTrackContainer().getSceneTransform().inverseTransformRect(newModelLimits);
                widget.setCenterVisibleModelLimits(newModelLimits);
            });
        widget.getTool().insert(0, rubberBandTool);
    }
    private resize (event) {
        if (this.plot) {
            this.plot.setSize(this.parent.nativeElement.clientWidth, this.parent.nativeElement.clientHeight);
        }
    }
    private configureHeaders () {
        const headerProvider = LogVisualHeaderProvider.getDefaultInstance();
        // configure Depth ant Time axis header
        const logAxisVisualHeader = headerProvider.getHeaderProvider('geotoolkit.welllog.LogAxis') as LogAxisVisualHeader;
        logAxisVisualHeader.setHeaderType(LogAxisVisualHeaderType.Simple);

        // configure curve header
        const header = new AdaptiveLogCurveVisualHeader()
            .setElement({
                'ScaleTo': {'horizontalpos': 'right', 'verticalpos': 'top'},
                'ScaleFrom': {'horizontalpos': 'left', 'verticalpos': 'top'},
                'Line': {'horizontalpos': 'center', 'verticalpos': 'center'},
                'Name': {'horizontalpos': 'center', 'verticalpos': 'top'},
                'Unit': {'horizontalpos': 'center', 'verticalpos': 'bottom'},
                'Tracking': {'horizontalpos': 'center', 'verticalpos': 'bottom'}
            });
        headerProvider.registerHeaderProvider('geotoolkit.welllog.CompositeLogCurve', header);
    }
    private setCss (widget) {
        widget.setCss(new CssStyle(
            {
                'css': [
                    '.geotoolkit.welllog.LogCurve:hover {',
                    '   linestyle-width: 3;',
                    '}',
                    '.geotoolkit.welllog.LogCurve:highlight {',
                    '   linestyle-width: 3;',
                    '}',
                    '.geotoolkit.welllog.LogTrack:hover {',
                    '   fillstyle: rgba(150,150,150,0.1);',
                    '}',
                    '.geotoolkit.welllog.LogTrack:highlight {',
                    '   fillstyle: rgba(255,232,166,0.4);',
                    '   linestyle-color: rgba(255,232,166,1);',
                    '   linestyle-width: 2;',
                    '}',
                    '.geotoolkit.welllog.LogTrack:highlight {',
                    '   fillstyle: rgba(255,232,166,0.2);',
                    '   linestyle-color: rgba(255,232,166,1);',
                    '   linestyle-width: 2;',
                    '}',
                    '.geotoolkit.welllog.header.LogVisualHeader:highlight {',
                    '   fillstyle: rgba(255,232,166,0.2);',
                    '   borderlinestyle-color: rgba(255,232,166,1);',
                    '   borderlinestyle-width: 2;',
                    '}'
                ].join('')
            }
        ));
    }
    private setLevelOfDetails (widget) {
        const epsilon = 10e-10;
        const rules = [{
            'condition': function (node) {
                const transform = node.getSceneTransform();
                return Math.abs(transform.getScaleX() + epsilon) < 1 || this.fitting;
            }.bind(this),
            'restore': false,
            'css': [
                '*[cssclass="INDEX_TRACK"] {',
                '   visible: false;',
                '}',
                '.geotoolkit.welllog.header.LogVisualHeader {',
                '   visible: false;',
                '}',
                '*[cssclass="horizontalGrid"] {',
                '   visible: false;',
                '}',
                '*[cssclass="verticalGrid"] {',
                '   visible: false;',
                '}',
                '.geotoolkit.welllog.LogTrack {',
                '   border-visible: false;',
                '}',
                '.geotoolkit.welllog.LogMarker {',
                '   visiblenamelabel: false;',
                '   visibledepthlabel: false;',
                '}',
                '.geotoolkit.welllog.LogCurve:hover {',
                '   linestyle-width: 3;',
                '}',
                '.geotoolkit.welllog.LogCurve:highlight {',
                '   linestyle-width: 3;',
                '}',
                '.geotoolkit.welllog.LogTrack:hover {',
                '   fillstyle: rgba(150,150,150,0.1);',
                '}',
                '.geotoolkit.welllog.LogTrack:highlight {',
                '   fillstyle: rgba(255,232,166,0.4);',
                '   linestyle-color: rgba(255,232,166,1);',
                '   linestyle-width: 2;',
                '}',
                '.geotoolkit.welllog.LogTrack:highlight {',
                '   fillstyle: rgba(255,232,166,0.2);',
                '   linestyle-color: rgba(255,232,166,1);',
                '   linestyle-width: 2;',
                '}',
                '.geotoolkit.welllog.header.LogVisualHeader:highlight {',
                '   fillstyle: rgba(255,232,166,0.2);',
                '   borderlinestyle-color: rgba(255,232,166,1);',
                '   borderlinestyle-width: 2;',
                '}'
            ].join('\n')
        }, {
            'condition': function (node) {
                const transform = node.getSceneTransform();
                return Math.abs(transform.getScaleX() + epsilon) >= 1 || this.restoring;
            }.bind(this),
            'restore': false,
            'css': [
                '*[cssclass="INDEX_TRACK"] {',
                '   visible: true;',
                '}',
                '.geotoolkit.welllog.header.LogVisualHeader {',
                '   visible: true;',
                '}',
                '*[cssclass="horizontalGrid"] {',
                '   visible: true;',
                '}',
                '*[cssclass="verticalGrid"] {',
                '   visible: true;',
                '}',
                '.geotoolkit.welllog.LogTrack {',
                '   border-visible: true;',
                '}',
                '.geotoolkit.welllog.LogMarker {',
                '   visiblenamelabel: true;',
                '   visibledepthlabel: true;',
                '}',
                '.geotoolkit.welllog.LogCurve:hover {',
                '   linestyle-width: 3;',
                '}',
                '.geotoolkit.welllog.LogCurve:highlight {',
                '   linestyle-width: 3;',
                '}',
                '.geotoolkit.welllog.LogTrack:hover {',
                '   fillstyle: rgba(150,150,150,0.1);',
                '}',
                '.geotoolkit.welllog.LogTrack:highlight {',
                '   fillstyle: rgba(255,232,166,0.4);',
                '   linestyle-color: rgba(255,232,166,1);',
                '   linestyle-width: 2;',
                '}',
                '.geotoolkit.welllog.LogTrack:highlight {',
                '   fillstyle: rgba(255,232,166,0.2);',
                '   linestyle-color: rgba(255,232,166,1);',
                '   linestyle-width: 2;',
                '}',
                '.geotoolkit.welllog.header.LogVisualHeader:highlight {',
                '   fillstyle: rgba(255,232,166,0.2);',
                '   borderlinestyle-color: rgba(255,232,166,1);',
                '   borderlinestyle-width: 2;',
                '}'
            ].join('\n')
        }];
        widget.getTrackContainer().setResponsiveStyle(new ResponsiveStyle({
            'rules': rules,
            'target': widget,
            'start': function (node) {
                Node.enableSceneGraphNotification(false);
            },
            'end': function (node) {
                Node.enableSceneGraphNotification(true);
                widget.updateState(undefined, StateChanges.Rebuild);
            }
        }));
    }
    private getLogMarker = function (track, id) {
        return fromNode(track).where(function (node) {
            return node.getId() === id && node instanceof LogMarker;
        }).selectFirst() as LogMarker;
    };
    getMarkerOptions () {
        return {
            'id': this.globalId,
            'depth': this.currentDepth,
            'linestyle': {
                'color': colorOfInsertedMarker
            },
            'textstyle': {
                'color': colorOfInsertedMarker,
                'alignment': AlignmentStyle.Left,
                'font': '12px sans-serif'
            },
            'displaynamelabel': 'name' + this.globalId,
            'displaydepthlabel': this.currentDepth.toString(),
            'namelabelposition': AnchorType.TopCenter,
            'depthlabelposition': AnchorType.BottomCenter
        };
    }
    private initializeMarkerTool (widget: MultiWellWidget, layer: Layer) {
        const markerTool = new VisualsEditor({
            'name': 'markereditor',
            'layer': layer,
            'widget': widget,
            'editor': {
                'handles': {
                    'bbox': {
                        'painter': SquarePainter,
                        'alignment': AnchorType.Center,
                        'sizeisindevicespace': true,
                        'width': 10,
                        'height': 10,
                        'fillstyle': {
                            'color': KnownColors.Green,
                            'shadow': {
                                'enable': true,
                                'color': 'rgba(0,0,0,0.3)',
                                'offsetx': 1,
                                'offsety': 1
                            }
                        },
                        'linestyle': {
                            'color': KnownColors.DarkGreen,
                            'pixelsnapmode': true
                        }
                    }
                },
                'bbox': {
                    'linestyle': {
                        'color': KnownColors.DarkBlue,
                        'pattern': [3, 3],
                        'pixelsnapmode': true
                    }
                },
                'ghost': {
                    'fillstyle': 'rgba(255, 0, 0, 0.3)',
                    'linestyle': {
                        'color': KnownColors.DarkRed,
                        'width': 1.0,
                        'pattern': [7, 3]
                    }
                }
            }
        });
        markerTool.setDataLayerCallback(this.onPointerMove.bind(this));
        const insertTop = () => {
            markerTool.insertNode(this.getMarkerOptions());
        };
        markerTool.on(EditEvents.End, () => {
            const wells = widget.getTrackContainer().getChildren((child) => isInstanceOf(child, WellTrack)).toArray();
            if (this.listOfTracks.length === wells.length) {
                this.setTopsEditingMode(true);
            } else {
                insertTop();
            }
        });
        markerTool.on(EditEvents.CommandApplied, (evt, sender, args) => {
            const command = args.getCommand();
            const marker = command.getNode() as LogMarker;
            switch (command.getEventName()) {
                case EditEvents.Translated:
                    if ((markerTool.getEditMode() & EditMode.CreateWithBounds) !== 0 || (markerTool.getEditMode() & EditMode.Ghost) !== 0) {
                        const bounds = sender.getEditor().getDeviceTransform().transformRect(marker.getBounds());
                        const point = new Point(0, bounds.getCenterY());
                        marker.getSceneTransform().inverseTransformPoint(point, point);
                        this.currentDepth = MathUtil.roundTo(point.getY(), 2);
                    } else {
                        this.currentDepth = MathUtil.roundTo((args.getNode() as LogMarker).getDepth(), 2);
                        marker.setDepthLabel(this.currentDepth.toString());
                    }
                    break;
                case EditEvents.Start:
                case EditEvents.NodeInserted:
                    const track = marker.getTrack();
                    if (track != null && !this.listOfTracks.includes(track)) {
                        this.listOfTracks.push(track);
                    }
            }
        });
        markerTool.on(AbstractToolEvents.onStateChanged, () => {
            if (markerTool.isActive()) {
                this.currentDepth = MathUtil.roundTo((markerTool.getShape() as LogMarker).getDepth(), 2);
            } else {
                (markerTool.getShape() as LogMarker)?.setDepthLabel(this.currentDepth.toString());
            }
        });
        markerTool.on(EditEvents.BeforeCommandApplied, (evt, sender, args) => {
            const command = args.getCommand();
            const marker = command.getNode() as LogMarker;
            let track = marker.getTrack() as WellTrack;
            switch (command.getEventName()) {
                case EditEvents.Start:
                    if (track == null) {
                        track = widget.getSelectedTrack() as WellTrack;
                        if (this.listOfTracks.indexOf(track) >= 0 || this.getLogMarker(track, this.globalId) != null) {
                            command.reject();
                        }
                    }
                case EditEvents.NodeDeleted:
                    if (track != null) {
                        const idx = this.listOfTracks.indexOf(track);
                        if (idx >= 0) {
                            this.listOfTracks.splice(idx, 1);
                            widget.setSelectedTrack(null);
                        }
                    }
                    break;
            }
        });

        let idOfNode: string | number;
        function getNodesById (node: Node) {
            return node.getId() === idOfNode;
        }
        widget.getToolByName('pick')
            .on(SelectionEvents.onSelectionEnd, (evt, selector, args) => {
                if (this.mode === Modes.Insert || this.mode === Modes.Off) return;

                const selection = args.getSelection().filter(isNode);
                let selected = false;
                for (let i = 0; i < selection.length; i++) {
                    if (selection[i] instanceof LogMarker) {
                        if (this.mode === Modes.Delete) {
                            idOfNode = selection[i].getId();
                            from(widget).where(getNodesById).execute((node) => {
                                markerTool.editNode(node);
                                markerTool.getHistory().push(new DeleteNode());
                            });
                            break;
                        }
                        if (this.mode === Modes.Edit) {
                            if (selection[i] !== markerTool.getShape()) {
                                markerTool.editNode(selection[i]);
                            }
                            selected = true;
                            break;
                        }
                    }
                }
                if (!selected) {
                    markerTool.editNode(null);
                }
            });
        const tooltipTool = new ToolTipTool({
            'init': function () {
                const markerShape = new SymbolShape({
                    'ax': 0,
                    'ay': 0,
                    'width': 10,
                    'height': 10,
                    'sizeisindevicespace': true,
                    'linestyle': null,
                    'fillstyle': {
                        'color': 'transparent'
                    },
                    'painter': CirclePainter,
                    'visible': false
                });
                const markerLayer = new Layer({
                    'children': markerShape
                });
                widget.addChild(markerLayer);
            },
            'divelement': document.getElementById('tooltip-container'),
            'callback': function () {
                return markerTool.isActive() ? this.currentDepth : '';
            }
        });
        widget.connectTool(tooltipTool);
        widget.getTrackContainer().on(NodeEvents.LocalTransformationChanged, function () {
            markerTool.update();
        });
        widget.getTool().insert(0, markerTool);
    }

    private onPointerMove (eventArgs: EventArgs) {
        const point = eventArgs.getPlotPoint();
        const nodes = Selector.select(eventArgs.getNode(), point.getX(), point.getY(), 0);
        let well: WellTrack = null;
        for (let i = 0; i < nodes.length; ++i) {
            const node = nodes[i];
            if (node instanceof WellTrack) {
                well = node;
            }
        }
        const markerTool = this.widget.getToolByName('markereditor') as VisualsEditor;

        if (well != null && this.widget.getSelectedTrack() === well) {
            if (this.listOfTracks.indexOf(well) >= 0) {
                markerTool.setDataLayer(null);
            }
            return;
        }
        if (well == null) {
            markerTool.setDataLayer(null);
        } else {
            markerTool.setDataLayer(well.getMarkerLayer());
        }
        this.widget.setSelectedTrack(well);
    }
}
