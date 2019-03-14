import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { IWellDataSource, CurveBinding } from '../../data/index';

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
  private wellCounter = 0;
  private panning = false;
  private horizontalScale = false;
  private curveBinding: CurveBinding = null;
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
  /**
   * Enable or disable single well mode
   * @param {boolean} enable enable mode
   */
  public setSingleWellPanning(enable: boolean) {
    if (this.widget != null) {
      this.panning = enable;
      this.widget.getToolByName('panningTools').setEnabled(true);
      const wellToolsContainer = this.widget.getToolByName('well-tools');
      wellToolsContainer.setEnabled(!this.panning);
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
   * Add well
   * @param {geotoolkit.util.Range} position position inside the display
   * @param {geotoolkit.util.Range} depths depths
   * @param {object|string} template template
   * @param {IWellDataSource} data data
   */
  public addWell(position: geotoolkit.util.Range, depths: geotoolkit.util.Range, template?: object | string, data?: IWellDataSource) {
    let correlation;
    if (this.widget.getTracksCount() > 0) {
      correlation = this.widget.createTrack(geotoolkit.welllog.multiwell.TrackType.CorrelationTrack, {
        'width': MultiWellComponent.CorrelationTrackWidth
      });
      this.widget.addTrack(correlation);
    }
    const well = this.widget.createTrack(geotoolkit.welllog.multiwell.TrackType.WellTrack, {
      'width': 0,
      'range': position,
      'welllog': {
        'range': depths
      },
      'title': 'Well ' + (this.wellCounter++)
    }) as geotoolkit.welllog.multiwell.IWellTrack;
    if (template) {
      well.loadTemplate(JSON.stringify(template));
    }
    // Add data binding
    const binding = well.getDataBinding() as geotoolkit.data.DataBindingRegistry;
    binding.add(this.curveBinding);
    if (data) {
      data.connect(well, this.widget);
    }
    this.widget.addTrack(well);
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
    this.widget.suspendUpdate();
  }
  /**
   * Resume widget update
   */
  public resumeUpdate() {
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
  public fitToBounds() {
    this.widget.setCenterVisibleModelLimits(this.widget.getCenterModelLimits());
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
          top = new geotoolkit.welllog.LogMarker(depth, name);
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
            track.setWells(leftWell, rightWell);
            track.addChild(new geotoolkit.welllog.multiwell.correlation.CorrelationMarker(depth, depth, {
              'linestyle': {
                'color': color,
                'width': 2,
                'pixelsnapmode': { 'x': true, 'y': true }
              }
            }));
          }
        }
      }
    }
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
  }
  private createWell(position, depths, template) {
    const well = this.widget.createTrack(geotoolkit.welllog.multiwell.TrackType.WellTrack, {
      'width': 0,
      'range': position,
      'welllog': {
        'range': depths
      },
      'title': 'Well ' + (this.wellCounter++)
    }) as any; //geotoolkit.welllog.multiwell.IWellTrack;
    if (template) {
      well.suspendUpdate();
      well.loadTemplate(JSON.stringify(template));
      well.resumeUpdate();
    }
    // Add data binding
    const binding = well.getDataBinding() as geotoolkit.data.DataBindingRegistry;
    binding.add(this.curveBinding);
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
    // init tools container to support interactions with widget
    const toolContainer = new geotoolkit.controls.tools.ToolsContainer(this.plot);
    toolContainer.add(widget.getTool());
    widget.invalidate();
    this.widget = widget;
  }
  private createWidget(): geotoolkit.welllog.multiwell.MultiWellWidget {
    this.curveBinding = new CurveBinding();
    const widget = new geotoolkit.welllog.multiwell.MultiWellWidget({
      'offscreentrackpanning': 0.08,
      'header': {
        'viewcache': true
      }
    });
    this.initRubberBandTool(widget);
    this.setLevelOfDetails(widget);
    return widget;
  }
  private initRubberBandTool(widget) {
    const rubberBandTool = new geotoolkit.controls.tools.RubberBand(widget.getTrackManipulatorLayer(),
      geotoolkit.controls.tools.RubberBandRenderMode.AspectRatio)
      .setEnabled(false)
      .addListener(geotoolkit.controls.tools.AbstractTool.Events.onStateChanged, function (sender) {
        widget.getToolByName('panningTools').setEnabled(!sender.isEnabled());
        this.panning = false;
        widget.getToolByName('panningTools').setEnabled(!sender.isEnabled());
        widget.getToolByName('multiwell-splitter').setEnabled(!sender.isEnabled());
        const wellToolsContainer = widget.getToolByName('well-tools');
        wellToolsContainer.setEnabled(!sender.isEnabled());
      })
      .addListener(geotoolkit.controls.tools.RubberBand.Events.onZoomEnd, function (sender, eventArgs) {
        let newModelLimits = eventArgs.getArea();
        // convert to device coordinate
        newModelLimits = widget.getTrackManipulatorLayer().getSceneTransform().transformRect(newModelLimits);
        // convert to track container model
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
    const rules = [{
      'condition': function (node) {
        var transform = node.getSceneTransform();
        return Math.abs(transform.getScaleX()) < 1;
      },
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
        return Math.abs(transform.getScaleX()) >= 1;
      },
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
        widget.updateState(undefined, geotoolkit.scene.Node.StateChanges.Rebuild);
        geotoolkit.scene.Node.enableSceneGraphNotification(true);
      }
    }));
  }
}
