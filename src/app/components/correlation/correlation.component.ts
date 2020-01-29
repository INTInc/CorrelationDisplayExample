import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, OnInit } from '@angular/core';
import { TemplateService, CurveService, WellService, TopsService } from '../../services/index';
import { RemoteDataSource } from '../../data/index';
import { MultiWellComponent } from '../multiwell/multiwell.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { Range } from '@int/geotoolkit/util/Range';
@Component({
  selector: 'app-correlation-component',
  templateUrl: './correlation.component.html',
  styleUrls: ['./correlation.component.css']
})
export class CorrelationComponent implements OnInit, AfterViewInit {
  @ViewChild(MultiWellComponent, {static: true}) welllog: MultiWellComponent;
  @ViewChild(SpinnerComponent, {static: true}) spinner: SpinnerComponent;
  constructor(private templateService: TemplateService, private curveService: CurveService,
    private wellService: WellService, private topsService: TopsService) {

  }
  ngOnInit() {
  }
  ngAfterViewInit() {
    this.init();
  }
  public zoomIn(event) {
    this.welllog.zoomIn();
  }
  public zoomOut(event) {
    this.welllog.zoomOut();
  }
  public togglePanningMode(event) {
    this.welllog.setSingleWellPanning(!this.welllog.isSingleWellPanning());
  }
  public isSingleWellPanning(): boolean {
    return this.welllog.isSingleWellPanning();
  }
  public toggleTopsEditingMode(event) {
      this.welllog.setTopsEditingMode(!this.welllog.isTopsEditingMode());
  }
  public isTopsEditingMode(): boolean {
      return this.welllog.isTopsEditingMode();
  }
  public toggleAddTopsMode(event) {
        this.welllog.setAddTopsMode(!this.welllog.isAddTopsMode());
  }
  public isAddTopsMode(): boolean {
      return this.welllog.isAddTopsMode();
  }
  public toggleRemoveTopsMode(event) {
        this.welllog.setRemoveTopsMode(!this.welllog.isRemoveTopsMode());
  }
  public isRemoveTopsMode(): boolean {
      return this.welllog.isRemoveTopsMode();
  }
  public doRubberBandZoom(event) {
    this.welllog.activateRubberBand();
  }
  public fitToBounds() {
    this.welllog.fitToBounds();
  }
  public resetZoom() {
    this.welllog.resetZoom();
  }
  public toggleZoomMode() {
    this.welllog.setHorizontalScale(!this.welllog.isHorizontalScale());
  }
  public isHorizontalScale(): boolean {
    return this.welllog.isHorizontalScale();
  }
  public scaleWell(scale) {
    this.welllog.scaleWell(scale);
  }
  private async init() {
    this.spinner.show();
    const wellTemplate = await this.templateService.getTemplate('template1.json');
    const wells = await this.wellService.getWellsList();
    const wellsArray = wells['data'];
    let minDepth = Number.MAX_VALUE;
    wellsArray.forEach(async (well) => {
      minDepth = Math.min(+well['minDepth'], minDepth);
    });
    const performance1 = performance.now();
    this.welllog.suspendUpdate();
    const wellsToAdd = [];
    for (let i = 0; i < wellsArray.length; ++i) {
      const well = wellsArray[i];
      const dataSource = RemoteDataSource.create(well, this.curveService);
      wellsToAdd.push({
        'position': new Range(+well['minDepth'] - minDepth, +well['maxDepth'] - minDepth),
        'depths': new Range(+well['minDepth'], +well['maxDepth']),
        'template': wellTemplate,
        'data': dataSource
      });
    }
    this.welllog.addWells(wellsToAdd);
    const performance2 = performance.now();
    // geotoolkit.log(performance2 - performance1);
    const tops = await this.topsService.getTopsList();
    this.addCorrelation(tops);
    this.welllog.resumeUpdate();
    this.spinner.hide();
  }
  private addCorrelation(tops) {
    const topsItems = tops['tops'];
    const lithologyItems = tops['lithology'];
    for (let i = 0; i < lithologyItems.length; ++i) {
      const item = lithologyItems[i];
      this.welllog.addFillCorrelation(item['start'], item['end'], item['color']);
    }
    for (let i = 0; i < topsItems.length; ++i) {
      const item = topsItems[i];
      this.welllog.addTopsCorrelation(item['depth'], item['name'], item['color']);
    }
  }
}
