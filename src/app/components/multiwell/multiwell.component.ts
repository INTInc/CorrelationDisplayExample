import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { IWellDataSource, CurveBinding } from '../../data/index';
import {Plot} from '@int/geotoolkit/plot/Plot';
import {MultiWellWidget} from '@int/geotoolkit/welllog/multiwell/MultiWellWidget';
import {Selector} from '@int/geotoolkit/selection/Selector';
import {MarkerEditor} from '@int/geotoolkit/welllog/widgets/tools/MarkerEditor';
import {Modes as MarkerEditorModes} from '@int/geotoolkit/welllog/widgets/tools/MarkerEditor';
import {ColorUtil} from '@int/geotoolkit/util/ColorUtil';
import {TrackType} from '@int/geotoolkit/welllog/multiwell/TrackType';
import {Node} from '@int/geotoolkit/scene/Node';
import {Events as NodeEvents} from '@int/geotoolkit/scene/Node';
import {StateChanges} from '@int/geotoolkit/scene/Node';
import {LogTrack} from '@int/geotoolkit/welllog/LogTrack';
import {LogMarker} from '@int/geotoolkit/welllog/LogMarker';
import {from as fromNode} from '@int/geotoolkit/selection/from';
import {RubberBand} from '@int/geotoolkit/controls/tools/RubberBand';
import {Events as RubberBandEvents} from '@int/geotoolkit/controls/tools/RubberBand';
import {RubberBandRenderMode} from '@int/geotoolkit/controls/tools/RubberBandRenderMode';
import {Events as AbstractToolEvents} from '@int/geotoolkit/controls/tools/AbstractTool';
import {LogVisualHeaderProvider} from '@int/geotoolkit/welllog/header/LogVisualHeaderProvider';
import {LogAxisVisualHeader} from '@int/geotoolkit/welllog/header/LogAxisVisualHeader';
import {HeaderType as LogAxisVisualHeaderType} from '@int/geotoolkit/welllog/header/LogAxisVisualHeader';
import {AdaptiveLogCurveVisualHeader} from '@int/geotoolkit/welllog/header/AdaptiveLogCurveVisualHeader';
import {CorrelationMarker} from '@int/geotoolkit/welllog/multiwell/correlation/CorrelationMarker';
import {CorrelationRange} from '@int/geotoolkit/welllog/multiwell/correlation/CorrelationRange';
import {LineStyle} from '@int/geotoolkit/attributes/LineStyle';
import {Patterns as LineStylePatterns} from '@int/geotoolkit/attributes/LineStyle';
import {TextStyle} from '@int/geotoolkit/attributes/TextStyle';
import {FillStyle} from '@int/geotoolkit/attributes/FillStyle';
import {AnchorType} from '@int/geotoolkit/util/AnchorType';
import {SquarePainter} from '@int/geotoolkit/scene/shapes/painters/SquarePainter';
import {CirclePainter} from '@int/geotoolkit/scene/shapes/painters/CirclePainter';
import {Events as EditingEvents} from '@int/geotoolkit/controls/editing/Events';
import { from } from 'rxjs';
import { IWellTrack } from '@int/geotoolkit/welllog/multiwell/IWellTrack';
import { CorrelationTrack } from '@int/geotoolkit/welllog/multiwell/CorrelationTrack';
import { ResponsiveStyle } from '@int/geotoolkit/responsive/ResponsiveStyle';
import { MathUtil as IntMath } from '@int/geotoolkit/util/MathUtil';
import { Point } from '@int/geotoolkit/util/Point';
import { Direction } from '@int/geotoolkit/selection/Direction';
import { Events as SelectionEvents } from '@int/geotoolkit/controls/tools/Selection';
import { ToolTipTool } from '@int/geotoolkit/controls/tools/ToolTipTool';
import { Symbol } from '@int/geotoolkit/scene/shapes/Symbol';
import { Layer } from '@int/geotoolkit/scene/Layer';
import { CssStyle } from '@int/geotoolkit/css/CssStyle';

let currentDepth;
let listOfTracks = [];
let colorOfInsertedMarker = ColorUtil.getRandomColorRgb();
let globalId = 0;
@Component({
  selector: 'app-multiwell-component',
  templateUrl: './multiwell.component.html',
  styleUrls: ['./multiwell.component.css']
})
export class MultiWellComponent implements AfterViewInit {
  private static readonly CorrelationTrackWidth = 50;
  @ViewChild('plot', {static: true}) canvas: ElementRef;
  @ViewChild('parent', {static: true}) parent: ElementRef;
  private plot: Plot;
  private widget: MultiWellWidget;
  private wellCounter = 1;
  private panning = false;
  private topsEditingMode = false;
  private addTopsMode = false;
  private removeTopsMode = false;
  private horizontalScale = false;
  private curveBinding: CurveBinding = null;
  private fitting = false;
  private restoring = false;
  private onPointerMove = function (event) {
      const nodes = new Selector().select(this.widget.getRoot(), event.offsetX, event.offsetY, 2);
      let well = null;
      for (let i = 0; i < nodes.length; ++i) {
          if (nodes[i].getCssClass() === 'WellTrack') { well = nodes[i]; }
      }
      const markerTool = this.widget.getToolByName('markereditor') as MarkerEditor;

      if (this.widget.getSelectedTrack() === well) { return; }
      if (well == null) {
          markerTool.setShape(null);
      } else {
          markerTool.setShape(well.getMarkerLayer());
      }
      this.widget.setSelectedTrack(well);
  }.bind(this);
  constructor() {

  }
  ngAfterViewInit() {
    this.init();
  }
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.resize(event);
  }
  /**
   * Zoom it
   */
  public zoomIn() {
    this.widget.scale(this.horizontalScale ? 2.0 : 1.0, 2.0);
  }
  /**
   * Zoom Out
   */
  public zoomOut() {
    this.widget.scale(this.horizontalScale ? 0.5 : 1.0, 0.5);
  }
  /**
   * Returns true if widgets is in single well mode
   * @returns {boolean}
   */
  public isSingleWellPanning(): boolean {
    return this.panning;
  }
  public isTopsEditingMode(): boolean {
      return this.topsEditingMode;
  }
  public isAddTopsMode(): boolean {
      return this.addTopsMode;
  }
  public isRemoveTopsMode(): boolean {
      return this.removeTopsMode;
  }
  /**
   * Enable or disable single well mode
   * @param {boolean} enable enable mode
   */
  public setSingleWellPanning(enable: boolean) {
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
  public setTopsEditingMode(enable: boolean) {
      if (this.widget != null) {
          this.topsEditingMode = enable;
          const markerTool = this.widget.getToolByName('markereditor') as MarkerEditor;
          if (enable) {
              this.setSingleWellPanning(false);
              this.setRemoveTopsMode(false);
              this.setAddTopsMode(false);
              markerTool.setMode(MarkerEditorModes.Edit);
          }
          markerTool.setEnabled(enable);
      }
  }

  public setAddTopsMode(enable: boolean) {
      if (this.widget != null) {
          this.addTopsMode = enable;
          const markerTool = this.widget.getToolByName('markereditor') as MarkerEditor;
          if (enable) {
              this.setSingleWellPanning(false);
              this.setTopsEditingMode(false);
              this.setRemoveTopsMode(false);
              markerTool.setMode(MarkerEditorModes.Insert);
              colorOfInsertedMarker = ColorUtil.getRandomColorRgb();
              globalId++;
              window.addEventListener('pointermove', this.onPointerMove);
              // markerTool.setShape(this.markerShape);
          } else {
            listOfTracks = [];
            markerTool.setMode(MarkerEditorModes.Edit);
            window.removeEventListener('pointermove', this.onPointerMove);
          }
          markerTool.setEnabled(enable);
      }
  }

  public setRemoveTopsMode(enable: boolean) {
      if (this.widget != null) {
          this.removeTopsMode = enable;
          const markerTool = this.widget.getToolByName('markereditor') as MarkerEditor;
          if (enable) {
              this.setSingleWellPanning(false);
              this.setTopsEditingMode(false);
              this.setAddTopsMode(false);
              markerTool.setMode('delete');
          } else {
              markerTool.setMode(MarkerEditorModes.Edit);
          }
          markerTool.setEnabled(enable);
      }
  }
  /**
   * Return true if scaling is enable in horizontal direction
   * @returns {boolean}
   */
  public isHorizontalScale(): boolean {
    return this.horizontalScale;
  }
  /**
   * Enable or disable scaling in horizontal direction
   * @param {boolean} enable enable or disable
   */
  public setHorizontalScale(enable: boolean) {
    this.horizontalScale = enable;
  }
  /**
   * Add wells
   * @param {any[]} wells wells
   */
  public addWells(wells: any) {
    const tracks = [];
    for (let i = 0; i < wells.length; ++i) {
      if (this.widget.getTracksCount() + i > 0) {
        tracks.push(this.widget.createTrack(TrackType.CorrelationTrack, {
          'width': MultiWellComponent.CorrelationTrackWidth
        }));
      }
      const well = this.createWell(wells[i]['position'],
        wells[i]['depths'],
        wells[i]['template']);
      if (wells[i]['data']) {
        wells[i]['data'].connect(well, this.widget);
      }
      tracks.push(well);
    }
    // workaround for TypeScript. it will be replaced by a new version of toolkit
    this.widget.addTrack((tracks as unknown) as IWellTrack);
  }
  /**
   * Suspend widget update
   */
  public suspendUpdate() {
    Node.enableSceneGraphNotification(false);
    this.widget.suspendUpdate();
  }
  /**
   * Resume widget update
   */
  public resumeUpdate() {
    Node.enableSceneGraphNotification(true);
    this.widget.resumeUpdate();
  }
  /**
   * Update layout
   */
  public updateLayout() {
    this.widget.updateLayout();
  }
  /**
   * Reset zoom
   * @param {?number} [depthScale=100] depth scale to reset
   */
  public resetZoom(depthScale?: number) {
    const transform = this.widget.getTrackContainer().getLocalTransform();
    const scaleX = transform ? transform.getScaleX() : 1;
    const scaleY = transform ? transform.getScaleY() : 1;
    const wellTrackArray = [];
    if (!depthScale) {
      depthScale = 100;
    }
    this.restoring = true;
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
    this.restoring = false;
  }
  /**
   * Fit widget to bounds
   */
  public fitToBounds() {
    // index track can be invisible
    let limits = this.widget.getCenterModelLimits();
    let width = 0;
    fromNode(this.widget.getTrackContainer()).where(function (node ) {
        return node.getVisible() && node instanceof LogTrack && node.getCssClass() === 'INDEX_TRACK';
    }).select(function (node) {
        width += node.getWidth();
    });
    // we need to reduce a size
    limits = limits.clone().setWidth(limits.getWidth() - width);
    this.fitting = true;
    this.widget.setCenterVisibleModelLimits(limits);
    this.fitting = false;
  }
  /**
   * Scale selected well
   * @param {number} scale depth scale
   */
  public scaleWell(scale: number) {
    if (this.widget == null) {
      return;
    }
    if (this.panning === true && this.widget.getSelectedTrack() !== null) {
      const track = this.widget.getSelectedTrack() as IWellTrack;
      track.setDepthScale(scale);
    } else if (this.panning === true && this.widget.getSelectedTrack() === null) {
      return;
    } else {
      this.widget.getTrackContainer().getChildren().forEach(function (element) {
        if (element.getClassName() === 'geotoolkit.welllog.multiwell.WellTrack') {
          element.setDepthScale(scale);
        }
      });
    }
  }
  /**
   * Return selected well
   * @returns {IWellTrack}
   */
  public getSelectedTrack(): IWellTrack {
    return this.widget.getSelectedTrack() as IWellTrack;
  }
  /**
   * Activate rubber band zoom. It will be deactivated automatically
   */
  public activateRubberBand() {
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
  public addTopsCorrelation(depth: number, name: string, color: string) {
    const isMarker = function (node) {
      return (node instanceof LogMarker) && node.getDepth() === depth;
    };
    const isMarkerCorrelation = function (node) {
      return (node instanceof CorrelationMarker) &&
        (node.getLeftDepth() === depth) && (node.getRightDepth() === depth);
    };
    for (let i = 0; i < this.widget.getTracksCount(); ++i) {
      const track = this.widget.getTrackAt(i);
      if (!(track instanceof CorrelationTrack)) {
        const wellTrack = track as IWellTrack;
        let top = fromNode(wellTrack.getMarkerLayer()).where(isMarker).selectFirst();
        if (!top) {
          top = new LogMarker(depth, name).setId(globalId);
          const ls = LineStyle.fromObject({ 'color': color });
          ls.setPattern(LineStylePatterns.Dot);
          top.setLineStyle(ls);
          top.setTextStyle(TextStyle.fromObject({
            'color': color,
            'alignment': 'left',
            'font': '12px sans-serif'
          }));
          top.setNameLabel(name);
          top.setNameLabelPosition(AnchorType.TopCenter);
          top.setDepthLabel(depth);
          top.setDepthLabelPosition(AnchorType.BottomCenter);
          wellTrack.getMarkerLayer().addChild(top);
        }
      } else {
        const correlation = fromNode(track).where(isMarkerCorrelation).selectFirst();
        if (!correlation) {
          let leftWell, rightWell;
          if (i >= 1) {
            leftWell = this.widget.getTrackAt(i - 1);
          }
          if (i < this.widget.getTracksCount() - 1) {
            rightWell = this.widget.getTrackAt(i + 1);
          }
          if (rightWell && leftWell) {
            track.addChild(new CorrelationMarker(depth, depth, {
              'linestyle': {
                'color': color,
                'width': 2,
                'pixelsnapmode': { 'x': true, 'y': true }
              }
            }).setId(globalId));
            track.setWells(leftWell, rightWell);
          }
        }
      }
    }
    globalId++;
  }
  /**
   * Add lithology correlation
   * @param {number} startDepth start depth
   * @param {number} endDepth end depth
   * @param {string} color color
   */
  public addFillCorrelation(startDepth: number, endDepth: number, color: string) {
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
            track.addChild(new CorrelationRange(startDepth, startDepth,
              endDepth, endDepth, {
                'fillstyle': {
                  'color': color
                }
              }));
          }
        }
      }
    }
    globalId++;
  }
  private createWell(position, depths, template) {
    const well = this.widget.createTrack(TrackType.WellTrack, {
      'width': 0,
      'range': position,
      'welllog': {
        'range': depths
      },
      'title': 'Well ' + (this.wellCounter++),
      'cssclass': 'WellTrack'
    }) as any; // geotoolkit.welllog.multiwell.IWellTrack;
    if (template) {
      well.suspendUpdate();
      well.loadTemplate(JSON.stringify(template));
      well.resumeUpdate();
    }
      well.on(NodeEvents.BoundsChanged, function () {
          const markerEditor = this.widget.getToolByName('markereditor') as MarkerEditor;
              markerEditor.update();
      }.bind(this));
    well.setDataBinding(this.curveBinding);
    return well;
  }
  private init() {
    this.configureHeaders();
    this.initPlot();
    this.resize(null);
  }
  private initPlot() {
    const widget = this.createWidget();
    this.plot = new Plot({
      'canvasElement': this.canvas.nativeElement,
      'root': widget
    });
    widget.invalidate();
    this.widget = widget;

  }
  private createWidget(): MultiWellWidget {
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
    this.initializeMarkerTool(widget);
    this.setLevelOfDetails(widget);
    this.setCss(widget);
    return widget;
  }
  private initRubberBandTool(widget) {
    const rubberBandTool = new RubberBand(widget.getTrackManipulatorLayer(),
      RubberBandRenderMode.AspectRatio)
      .setEnabled(false)
      .addListener(AbstractToolEvents.onStateChanged, function (sender) {
        if (this.panning) {
            this.panning = false;
            widget.getToolByName('panningTools').setEnabled(false);
        }
        widget.getToolByName('multiwell-splitter').setEnabled(!sender.isEnabled());
        const wellToolsContainer = widget.getToolByName('well-tools');
        wellToolsContainer.setEnabled(!sender.isEnabled());
      })
      .addListener(RubberBandEvents.onZoomEnd, function (sender, eventArgs) {
        let newModelLimits = eventArgs.getArea();
        newModelLimits = widget.getTrackManipulatorLayer().getSceneTransform().transformRect(newModelLimits);
        newModelLimits = widget.getTrackContainer().getSceneTransform().inverseTransformRect(newModelLimits);
        widget.setCenterVisibleModelLimits(newModelLimits);
      });
    widget.getTool().insert(0, rubberBandTool);
  }
  private resize(event) {
    if (this.plot) {
      this.plot.setSize(this.parent.nativeElement.clientWidth, this.parent.nativeElement.clientHeight);
    }
  }
  private configureHeaders() {
    const headerProvider = LogVisualHeaderProvider.getDefaultInstance();
    // configure Depth ant Time axis header
    const logAxisVisualHeader = headerProvider.getHeaderProvider('geotoolkit.welllog.LogAxis') as
      LogAxisVisualHeader;
    logAxisVisualHeader.setHeaderType(LogAxisVisualHeaderType.Simple);

    // configure curve header
    const header = new AdaptiveLogCurveVisualHeader()
      .setElement({
        'ScaleTo': { 'horizontalpos': 'right', 'verticalpos': 'top' },
        'ScaleFrom': { 'horizontalpos': 'left', 'verticalpos': 'top' },
        'Line': { 'horizontalpos': 'center', 'verticalpos': 'center' },
        'Name': { 'horizontalpos': 'center', 'verticalpos': 'top' },
        'Unit': { 'horizontalpos': 'center', 'verticalpos': 'bottom' },
        'Tracking': { 'horizontalpos': 'center', 'verticalpos': 'bottom' }
      });
    headerProvider.registerHeaderProvider('geotoolkit.welllog.CompositeLogCurve', header);
  }
  private setCss(widget) {
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
  private setLevelOfDetails(widget) {
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
  private updateCorrelationMarker (track, id, leftDepth, rightDepth) {
    const correlaionMarker = this.getCorrelationMarker(track, id);
      if (correlaionMarker) {
        correlaionMarker.setDepth(leftDepth, rightDepth);
    } else {
      const index = this.widget.indexOfTrack(track);
      const leftWell = this.widget.getTrackAt(index - 1);
      const rightWell = this.widget.getTrackAt(index + 1);
      track.setWells(leftWell, rightWell);
      const marker = new CorrelationMarker(leftDepth, rightDepth, {
          'linestyle': {
              'color': colorOfInsertedMarker,
              'width': 2,
              'pixelsnapmode': {
                  'x': true,
                  'y': true
              }
          }
      }).setId(id);
      track.addChild(marker);
      }
  }
    private addTops (well, name, depth, color) {
        const top = new LogMarker(depth, 'top');
        top.setId(globalId);
        top.setLineStyle({
            'color': color
        });
        top.setTextStyle({
            'color': color,
            'alignment': 'left',
            'font': '12px sans-serif'
        });
        top.setNameLabel(name);
        top.setNameLabelPosition(AnchorType.TopCenter);
        top.setDepthLabel(depth);
        top.setDepthLabelPosition(AnchorType.BottomCenter);
        well.getMarkerLayer().addChild(top);
        return top;
    }
    private getLogMarker = function (track, id) {
      return fromNode(track).where(function (node) {
          return node.getId() === id && node instanceof LogMarker;
      }).selectFirst() as LogMarker;
    };
    private getCorrelationMarker = function (track, id) {
        return fromNode(track).where(function (node) {
            return node.getId() === id && node instanceof CorrelationMarker;
        }).selectFirst() as CorrelationMarker;
    };
    private getNeighbors (track) {
      const index = this.widget.indexOfTrack(track);
      let leftCorrelation, rightCorrelation, leftWell, rightWell;
          if (index - 1 > 0) {
              leftCorrelation = this.widget.getTrackAt(index - 1);
              leftWell = this.widget.getTrackAt(index - 2);
          }
          if (index + 2 < this.widget.getTracksCount()) {
              rightCorrelation = this.widget.getTrackAt(index + 1);
              rightWell = this.widget.getTrackAt(index + 2);
          }
          return {
              'leftWell': leftWell,
              'leftCorrelation': leftCorrelation,
              'rightWell': rightWell,
              'rightCorrelation': rightCorrelation
          };
      }
  private updateCorrelations = function (track, id, depth) {
      let marker;
      const neighbors = this.getNeighbors(track);
      if (neighbors['leftWell']) {
          marker = this.getLogMarker(neighbors['leftWell'], id);
          if (marker) {
              this.updateCorrelationMarker(neighbors['leftCorrelation'], id, marker.getDepth(), depth);
          }
      }
      if (neighbors['rightWell']) {
          marker = this.getLogMarker(neighbors['rightWell'], id);
          if (marker) {
              this.updateCorrelationMarker(neighbors['rightCorrelation'], id, depth, marker.getDepth());
          }
      }
  };
  private initializeMarkerTool (widget) {
      const handleStyles = {
          'activefillstyle': new FillStyle('blue'),
          'activelinestyle': new FillStyle('darkblue'),
          'inactivefillstyle': new FillStyle('green'),
          'inactivelinestyle': new LineStyle('darkgreen'),
          'ghostlinestyle': new LineStyle('darkred')
      };
      const markerTool = new MarkerEditor(widget.getTrackManipulatorLayer());
      markerTool.setHandleStyles(handleStyles);
      markerTool.setHandlePainter(SquarePainter);
      markerTool.setHandleSize(10);
      markerTool.setEnabled(false);
      // Setup event listeners for Marker Editor
      markerTool.addListener(EditingEvents.DragEnd, function (sender, args) {
          args['shape'].setDepth(args['depth']);
          args['shape'].setDepthLabel(IntMath.roundTo(args['depth'], 2));
          const id = args['shape'].getId();
          const well = fromNode(args['shape'], Direction.Upwards).where(function (node) {
              return node && node.getCssClass() === 'WellTrack';
          }).selectFirst();
          this.updateCorrelations(well, id, args['depth']);
          sender.update();
      }.bind(this));
      markerTool.addListener(EditingEvents.Dragging, function (sender, args) {
          const point = new Point(0, args['depth']);
          sender.getManipulatorLayer().getSceneTransform().transformPoint(point, point);
          args['shape'].getSceneTransform().inverseTransformPoint(point, point);
          currentDepth = IntMath.roundTo(point.getY(), 2);
      });
      markerTool.addListener(EditingEvents.Insert, function (sender, args) {
          const track = widget.getSelectedTrack();
              if (track && track.getCssClass() === 'WellTrack') {
                  const rect = track.getMarkerLayer().getBounds();
                  currentDepth = IntMath.roundTo(args['depth'], 2);
                  const marker = this.getLogMarker(track, globalId);
                  if (listOfTracks.indexOf(track) === -1 &&
                      !marker && !(currentDepth < rect.getY() || currentDepth > rect.getBottom())) {
                      this.addTops(track, '', currentDepth, colorOfInsertedMarker);
                      listOfTracks.push(track);
                      this.updateCorrelations(track, globalId, currentDepth);

                  }
          }
      }.bind(this));
      widget.getToolByName('pick')
          .addListener(SelectionEvents.onSelectionEnd, function (selector, args) {
              const selection = args.getSelection();
              let selected = false;
              for (let i = 0; i < selection.length; i++) {
                  if (selection[i] instanceof LogMarker) {
                      if (markerTool.getMode() === 'delete') {
                          const idOfNode = selection[i].getId();
                          fromNode(widget).where(function (node) {
                              return node.getId() === idOfNode;
                          }).execute(function (node) {
                              if (node.getParent()) { node.getParent().removeChild(node); }
                          });
                          markerTool
                              .setShape(null);
                          break;
                      }
                      if (markerTool.getMode() === MarkerEditorModes.Edit) {
                          if (selection[i] !== markerTool.getShape()) {
                              markerTool.setShape(selection[i]);
                              selected = true;
                              break;
                          }
                      }
                  }
              }
          });
          widget.connectTool(new ToolTipTool({
              'model': widget,
              'init': function (tool) {
                  tool._marker = new Symbol({
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
                  tool._layer = new Layer({
                      'children': tool._marker
                  });
                  widget.addChild(tool._layer);
              },
              'divelement': document.getElementById('tooltip-container'),
              'callback': function () {
                  return markerTool.isActive() ? currentDepth : '';
              }
          }));
      widget.getTrackContainer().on(NodeEvents.LocalTransformationChanged, function (sender) {
          markerTool.update(); });
      widget.getTool().insert(0, markerTool);
  }
}
