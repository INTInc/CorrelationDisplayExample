import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, OnInit } from '@angular/core';
import { TemplateService, CurveService, WellService, TopsService } from '../../services/index';
import { RemoteDataSource } from '../../data/index';
import { MultiWellComponent } from '../multiwell/multiwell.component';
import { from } from 'rxjs';

@Component({
  selector: 'app-correlation-component',
  templateUrl: './correlation.component.html',
  styleUrls: ['./correlation.component.css']
})
export class CorrelationComponent implements OnInit, AfterViewInit {
  @ViewChild(MultiWellComponent) welllog: MultiWellComponent;
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
    const wellTemplate = await this.templateService.getTemplate('template1.json');
    const wells = await this.wellService.getWellsList();
    const wellsArray = wells.json()['data'];
    let minDepth = Number.MAX_VALUE;
    wellsArray.forEach(async (well) => {
      minDepth = Math.min(+well['minDepth'], minDepth);
    });
    this.welllog.suspendUpdate();
    const wellsToAdd = [];
    for (let i = 0; i < wellsArray.length; ++i) {
      let well = wellsArray[i];
      const dataSource = RemoteDataSource.create(well, this.curveService);
      wellsToAdd.push({
        'position': new geotoolkit.util.Range(+well['minDepth'] - minDepth, +well['maxDepth'] - minDepth),
        'depths': new geotoolkit.util.Range(+well['minDepth'], +well['maxDepth']),
        'template': wellTemplate,
        'data': dataSource
      });
    }
    this.welllog.addWells(wellsToAdd);
    const tops = await this.topsService.getTopsList();
    this.addCorrelation(tops.json());
    this.welllog.resumeUpdate();
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
