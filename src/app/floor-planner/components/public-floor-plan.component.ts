import { Component, AfterViewInit, ViewChild, ElementRef, input, Input, Signal, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableItem, ZoneItem } from '../../core/models/models';
import { firstValueFrom, map } from 'rxjs';
import { AppApiService } from '../../core/services/app-api.service';
import * as fabric from 'fabric';

@Component({
  selector: 'app-public-floor-plan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './public-floor-plan.component.html',
  styleUrl: './public-floor-plan.scss'
})
export class PublicFloorPlanComponent implements AfterViewInit {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;
  zones: ZoneItem[] | null= [];
  @Output()
  zone = new EventEmitter<ZoneItem>();
  tables: TableItem[] | null = [];
  private gridSize = 10;
  private readonly api = inject(AppApiService);
  @Output()
  selectedTable = new EventEmitter<TableItem>();
  @Input()
  selectedDateStr!: string;
  @Input()
  selectedTimeStr!: string;

  constructor() {}

  ngOnInit(){
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement);
    (this.canvas as any).setDimensions({ width: 400, height: 500 });
    this.canvas.setZoom(1);
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'pointer';
    this.canvas.on('mouse:down', (e: any) => {
      const target = e.target.data;
      this.showTableInfo(target);
    });
    this.render();
  }

  private async loadData(): Promise<void> {
    try {
      const tablesResponse = await firstValueFrom(
        this.api.getTables().pipe(map(response => response.data))
      );
      this.tables = tablesResponse ?? [];
      
      const zonesResponse = await firstValueFrom(
        this.api.getZones().pipe(map(response => response.data))
      );
      this.zones = zonesResponse ?? [];

      this.render();
      
    } catch (error) {
      console.error('Ошибка загрузки схемы', error);
    }
}

  private render(): void {
    this.canvas.clear();
    this.drawGrid();
    this.canvas.renderAll();
  }

  private drawGrid(): void {
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();
    for (let i = 0; i < width; i += this.gridSize) {
      const line = new fabric.Line([i, 0, i, height], { stroke: '#ccc', strokeWidth: 1, selectable: false, evented: false });
      this.canvas.add(line);
    }
    for (let i = 0; i < height; i += this.gridSize) {
      const line = new fabric.Line([0, i, width, i], { stroke: '#ccc', strokeWidth: 1, selectable: false, evented: false });
      this.canvas.add(line);
    }
  }

  private renderTables(tables: TableItem[] | null): void {
    
    if (!tables || tables.length === 0) return;
    
    tables.forEach((t, index) => {
      const strokeColor = '#999';
      let fillColor = '#00ff3c';
      if (!t.active) fillColor = '#f8d7da';
      
      const rect = new fabric.Rect({
        width: 50,
        height: 50,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 3,
        rx: 6,
        ry: 6,
        selectable: false,
        evented: true
      });
      
      const text = new fabric.Text(String(t.number), {
        fontSize: 14,
        fill: '#000000',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      });
      
      const col = index % 5;
      const row = Math.floor(index / 5);
      const spacing = 70;
      
      const group = new fabric.Group([rect, text], {
        left: col * spacing + 50,
        top: row * spacing + 50,
        angle: 0,
        selectable: false,
        evented: true,
        hasControls: false,
        hasBorders: false,
      });
      group.data = t;
      
      this.canvas.add(group);
    });
    
    this.canvas.renderAll();
}

  private showTableInfo(group: any): void {
    this.selectedTable.emit(group);
  }

  getZoneName(zoneId: number): string {
    let zone = this.zones!.find(zone => zone.id === zoneId)
    this.zone.emit(zone);
    return zone ? zone.name : 'Не выбрана';
  }

  getStatusText(table: TableItem): string {
    if (table.active) return 'Свободен';
    return 'Занят'
  }

  getStatusColor(table: TableItem): string {
    if (!table.active) return '#ea580c';
    return '#15803d';
  }

  reloadData(): void {
    this.loadData();
  }

  getTables(zone: ZoneItem){
    this.zone.emit(zone);
    let tableList: TableItem[] = [];
    for(let table of this.tables!){
      if(table.zoneId === zone.id){
        tableList.push(table)
      }
    }
    this.canvas.clear();
    this.drawGrid();
    this.renderTables(tableList);
    this.canvas.renderAll();
  }
}