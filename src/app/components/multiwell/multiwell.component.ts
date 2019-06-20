import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { IWellDataSource, CurveBinding } from '../../data/index';

let currentDepth;
let listOfTracks = [];
let colorOfInsertedMarker = geotoolkit.util.ColorUtil.getRandomColorRgb();
let globalId = 0;
@Component({
  selector: 'app-multiwell-component',
  templateUrl: './multiwell.component.html',
  styleUrls: ['./multiwell.component.css']
})
export class MultiWellComponent implements AfterViewInit {
  private static readonly CorrelationTrackWidth = 50;
  @ViewChild('plot') canvas: ElementRef;
  @ViewChild('parent') parent: ElementRef;
  private plot: geotoolkit.plot.Plot;
  private widget: geotoolkit.welllog.multiwell.MultiWellWidget;
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
      const nodes = new geotoolkit.selection.Selector().select(this.widget.getRoot(), event.offsetX, event.offsetY, 2);
      let well = null;
      for (let i = 0; i < nodes.length; ++i) {
          if (nodes[i].getCssClass() === 'WellTrack') { well = nodes[i]; }
      }
      const markerTool = this.widget.getToolByName('markereditor') as geotoolkit.welllog.widgets.tools.MarkerEditor;

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
          const markerTool = this.widget.getToolByName('markereditor') as geotoolkit.welllog.widgets.tools.MarkerEditor;
          if (enable) {
              this.setSingleWellPanning(false);
              this.setRemoveTopsMode(false);
              this.setAddTopsMode(false);
              markerTool.setMode(geotoolkit.welllog.widgets.tools.MarkerEditor.Modes.Edit);
          }
          markerTool.setEnabled(enable);
      }
  }

  public setAddTopsMode(enable: boolean) {
      if (this.widget != null) {
          this.addTopsMode = enable;
          const markerTool = this.widget.getToolByName('markereditor') as geotoolkit.welllog.widgets.tools.MarkerEditor;
          if (enable) {
              this.setSingleWellPanning(false);
              this.setTopsEditingMode(false);
              this.setRemoveTopsMode(false);
              markerTool.setMode(geotoolkit.welllog.widgets.tools.MarkerEditor.Modes.Insert);
              colorOfInsertedMarker = geotoolkit.util.ColorUtil.getRandomColorRgb();
              globalId++;
              geotoolkit.window.addEventListener('pointermove', this.onPointerMove);
              // markerTool.setShape(this.markerShape);
          } else {
            listOfTracks = [];
            markerTool.setMode(geotoolkit.welllog.widgets.tools.MarkerEditor.Modes.Edit);
            geotoolkit.window.removeEventListener('pointermove', this.onPointerMove);
          }
          markerTool.setEnabled(enable);
      }
  }

  public setRemoveTopsMode(enable: boolean) {
      if (this.widget != null) {
          this.removeTopsMode = enable;
          const markerTool = this.widget.getToolByName('markereditor') as geotoolkit.welllog.widgets.tools.MarkerEditor;
          if (enable) {
              this.setSingleWellPanning(false);
              this.setTopsEditingMode(false);
              this.setAddTopsMode(false);
              markerTool.setMode('delete');
          } else {
              markerTool.setMode(geotoolkit.welllog.widgets.tools.MarkerEditor.Modes.Edit);
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
        tracks.push(this.widget.createTrack(geotoolkit.welllog.multiwell.TrackType.CorrelationTrack, {
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
    this.widget.addTrack((tracks as unknown) as geotoolkit.welllog.multiwell.IWellTrack);
  }
  /**
   * Suspend widget update
   */
  public suspendUpdate() {
    geotoolkit.scene.Node.enableSceneGraphNotification(false);
    this.widget.suspendUpdate();
  }
  /**
   * Resume widget update
   */
  public resumeUpdate() {
    geotoolkit.scene.Node.enableSceneGraphNotification(true);
    this.widget.resumeUpdate();
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
    geotoolkit.selection.from(this.widget.getTrackContainer()).where(function (node ) {
        return node.getVisible() && node instanceof geotoolkit.welllog.LogTrack && node.getCssClass() === 'INDEX_TRACK';
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
      const track = this.widget.getSelectedTrack() as geotoolkit.welllog.multiwell.IWellTrack;
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
      return (node instanceof geotoolkit.welllog.LogMarker) && node.getDepth() === depth;
    };
    const isMarkerCorrelation = function (node) {
      return (node instanceof geotoolkit.welllog.multiwell.correlation.CorrelationMarker) &&
        (node.getLeftDepth() === depth) && (node.getRightDepth() === depth);
    };
    for (let i = 0; i < this.widget.getTracksCount(); ++i) {
      const track = this.widget.getTrackAt(i);
      if (!(track instanceof geotoolkit.welllog.multiwell.CorrelationTrack)) {
        const wellTrack = track as geotoolkit.welllog.multiwell.IWellTrack;
        let top = geotoolkit.selection.from(wellTrack.getMarkerLayer()).where(isMarker).selectFirst();
        if (!top) {
          top = new geotoolkit.welllog.LogMarker(depth, name).setId(globalId);
          top.setLineStyle(geotoolkit.attributes.LineStyle.fromObject({ 'color': color }));
          top.setTextStyle(geotoolkit.attributes.TextStyle.fromObject({
            'color': color,
            'alignment': 'left',
            'font': '12px sans-serif'
          }));
          top.setNameLabel(name);
          top.setNameLabelPosition(geotoolkit.util.AnchorType.TopCenter);
          top.setDepthLabel(depth);
          top.setDepthLabelPosition(geotoolkit.util.AnchorType.BottomCenter);
          wellTrack.getMarkerLayer().addChild(top);
        }
      } else {
        const correlation = geotoolkit.selection.from(track).where(isMarkerCorrelation).selectFirst();
        if (!correlation) {
          let leftWell, rightWell;
          if (i >= 1) {
            leftWell = this.widget.getTrackAt(i - 1);
          }
          if (i < this.widget.getTracksCount() - 1) {
            rightWell = this.widget.getTrackAt(i + 1);
          }
          if (rightWell && leftWell) {
            track.addChild(new geotoolkit.welllog.multiwell.correlation.CorrelationMarker(depth, depth, {
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
      return ((node instanceof geotoolkit.welllog.multiwell.correlation.CorrelationRange) &&
        (node.getLeftDepthRange().getLow() === startDepth) && (node.getRightDepthRange().getLow() === startDepth) &&
        (node.getLeftDepthRange().getHigh() === endDepth) && (node.getRightDepthRange().getHigh() === endDepth));
    };
    for (let i = 0; i < this.widget.getTracksCount(); ++i) {
      const track = this.widget.getTrackAt(i);
      if (track instanceof geotoolkit.welllog.multiwell.CorrelationTrack) {
        let leftWell, rightWell;
        if (i >= 1) {
          leftWell = this.widget.getTrackAt(i - 1);
        }
        if (i < this.widget.getTracksCount() - 1) {
          rightWell = this.widget.getTrackAt(i + 1);
        }
        if (rightWell && leftWell) {
          const correlation = geotoolkit.selection.from(track).where(isRangeCorrelation).selectFirst();
          if (!correlation) {
            track.setWells(leftWell, rightWell);
            track.addChild(new geotoolkit.welllog.multiwell.correlation.CorrelationRange(startDepth, startDepth,
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
    const well = this.widget.createTrack(geotoolkit.welllog.multiwell.TrackType.WellTrack, {
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
      well.on(geotoolkit.scene.Node.Events.BoundsChanged, function () {
          const markerEditor = this.widget.getToolByName('markereditor') as geotoolkit.welllog.widgets.tools.MarkerEditor;
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
    this.plot = new geotoolkit.plot.Plot({
      'canvasElement': this.canvas.nativeElement,
      'root': widget
    });
    widget.invalidate();
    this.widget = widget;

  }
  private createWidget(): geotoolkit.welllog.multiwell.MultiWellWidget {
    this.curveBinding = new CurveBinding();
    const widget = new geotoolkit.welllog.multiwell.MultiWellWidget({
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
    return widget;
  }
  private initRubberBandTool(widget) {
    const rubberBandTool = new geotoolkit.controls.tools.RubberBand(widget.getTrackManipulatorLayer(),
      geotoolkit.controls.tools.RubberBandRenderMode.AspectRatio)
      .setEnabled(false)
      .addListener(geotoolkit.controls.tools.AbstractTool.Events.onStateChanged, function (sender) {
        if (this.panning) {
            this.panning = false;
            widget.getToolByName('panningTools').setEnabled(false);
        }
        widget.getToolByName('multiwell-splitter').setEnabled(!sender.isEnabled());
        const wellToolsContainer = widget.getToolByName('well-tools');
        wellToolsContainer.setEnabled(!sender.isEnabled());
      })
      .addListener(geotoolkit.controls.tools.RubberBand.Events.onZoomEnd, function (sender, eventArgs) {
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
    const headerProvider = geotoolkit.welllog.header.LogVisualHeaderProvider.getDefaultInstance();
    // configure Depth ant Time axis header
    const logAxisVisualHeader = headerProvider.getHeaderProvider('geotoolkit.welllog.LogAxis') as
      geotoolkit.welllog.header.LogAxisVisualHeader;
    logAxisVisualHeader.setHeaderType(geotoolkit.welllog.header.LogAxisVisualHeader.HeaderType.Simple);

    // configure curve header
    const header = new geotoolkit.welllog.header.AdaptiveLogCurveVisualHeader()
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
        '}'
      ].join('\n')
    }];
    widget.getTrackContainer().setResponsiveStyle(new geotoolkit.responsive.ResponsiveStyle({
      'rules': rules,
      'target': widget,
      'start': function (node) {
        geotoolkit.scene.Node.enableSceneGraphNotification(false);
      },
      'end': function (node) {
        geotoolkit.scene.Node.enableSceneGraphNotification(true);
        widget.updateState(undefined, geotoolkit.scene.Node.StateChanges.Rebuild);
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
      const marker = new geotoolkit.welllog.multiwell.correlation.CorrelationMarker(leftDepth, rightDepth, {
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
        const top = new geotoolkit.welllog.LogMarker(depth, 'top').setId(globalId);
        top.setLineStyle({
            'color': color
        });
        top.setTextStyle({
            'color': color,
            'alignment': 'left',
            'font': '12px sans-serif'
        });
        top.setNameLabel(name);
        top.setNameLabelPosition(geotoolkit.util.AnchorType.TopCenter);
        top.setDepthLabel(depth);
        top.setDepthLabelPosition(geotoolkit.util.AnchorType.BottomCenter);
        well.getMarkerLayer().addChild(top);
        return top;
    }
    private getLogMarker = function (track, id) {
      return geotoolkit.selection.from(track).where(function (node) {
          return node.getId() === id && node instanceof geotoolkit.welllog.LogMarker;
      }).selectFirst() as geotoolkit.welllog.LogMarker;
    };
    private getCorrelationMarker = function (track, id) {
        return geotoolkit.selection.from(track).where(function (node) {
            return node.getId() === id && node instanceof geotoolkit.welllog.multiwell.correlation.CorrelationMarker;
        }).selectFirst() as geotoolkit.welllog.multiwell.correlation.CorrelationMarker;
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
          'activefillstyle': new geotoolkit.attributes.FillStyle('blue'),
          'activelinestyle': new geotoolkit.attributes.FillStyle('darkblue'),
          'inactivefillstyle': new geotoolkit.attributes.FillStyle('green'),
          'inactivelinestyle': new geotoolkit.attributes.LineStyle('darkgreen'),
          'ghostlinestyle': new geotoolkit.attributes.LineStyle('darkred')
      };
      const markerTool = new geotoolkit.welllog.widgets.tools.MarkerEditor(widget.getTrackManipulatorLayer())
          .setHandleStyles(handleStyles)
          .setHandlePainter(geotoolkit.scene.shapes.painters.SquarePainter)
          .setHandleSize(10)
          .setEnabled(false);
      // Setup event listeners for Marker Editor
      markerTool.addListener(geotoolkit.controls.editing.Events.DragEnd, function (sender, args) {
          args['shape'].setDepth(args['depth']);
          args['shape'].setDepthLabel(geotoolkit.util.Math.roundTo(args['depth'], 2));
          const id = args['shape'].getId();
          const well = geotoolkit.selection.from(args['shape'], geotoolkit.selection.Direction.Upwards).where(function (node) {
              return node && node.getCssClass() === 'WellTrack';
          }).selectFirst();
          this.updateCorrelations(well, id, args['depth']);
          sender.update();
      }.bind(this));
      markerTool.addListener(geotoolkit.controls.editing.Events.Dragging, function (sender, args) {
          const point = new geotoolkit.util.Point(0, args['depth']);
          sender.getManipulatorLayer().getSceneTransform().transformPoint(point, point);
          args['shape'].getSceneTransform().inverseTransformPoint(point, point);
          currentDepth = geotoolkit.util.Math.roundTo(point.getY(), 2);
      });
      markerTool.addListener(geotoolkit.controls.editing.Events.Insert, function (sender, args) {
          const track = widget.getSelectedTrack();
              if (track && track.getCssClass() === 'WellTrack') {
                  const rect = track.getMarkerLayer().getBounds();
                  currentDepth = geotoolkit.util.Math.roundTo(args['depth'], 2);
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
          .addListener(geotoolkit.controls.tools.Selection.Events.onSelectionEnd, function (selector, args) {
              const selection = args.getSelection();
              let selected = false;
              for (let i = 0; i < selection.length; i++) {
                  if (selection[i] instanceof geotoolkit.welllog.LogMarker) {
                      if (markerTool.getMode() === 'delete') {
                          const idOfNode = selection[i].getId();
                          geotoolkit.selection.from(widget).where(function (node) {
                              return node.getId() === idOfNode;
                          }).execute(function (node) {
                              if (node.getParent()) { node.getParent().removeChild(node); }
                          });
                          markerTool
                              .setShape(null);
                          break;
                      }
                      if (markerTool.getMode() === geotoolkit.welllog.widgets.tools.MarkerEditor.Modes.Edit) {
                          if (selection[i] !== markerTool.getShape()) {
                              markerTool.setShape(selection[i]);
                              selected = true;
                              break;
                          }
                      }
                  }
              }
          });
          widget.connectTool(new geotoolkit.controls.tools.ToolTipTool({
              'model': widget,
              'init': function (tool) {
                  tool._marker = new geotoolkit.scene.shapes.Symbol({
                      'ax': 0,
                      'ay': 0,
                      'width': 10,
                      'height': 10,
                      'sizeisindevicespace': true,
                      'linestyle': null,
                      'fillstyle': {
                          'color': 'transparent'
                      },
                      'painter': geotoolkit.scene.shapes.painters.CirclePainter,
                      'visible': false
                  });
                  tool._layer = new geotoolkit.scene.Layer({
                      'children': tool._marker
                  });
                  widget.addChild(tool._layer);
              },
              'divelement': document.getElementById('tooltip-container'),
              'callback': function () {
                  return markerTool.isActive() ? currentDepth : '';
              }
          }));
      widget.getTrackContainer().on(geotoolkit.scene.Node.Events.LocalTransformationChanged, function (sender) {
          markerTool.update(); });
      widget.getTool().insert(0, markerTool);
  }
}
