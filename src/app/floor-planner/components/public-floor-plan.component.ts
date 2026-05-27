import { Component, AfterViewInit, ViewChild, ElementRef, input, Input, Signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiResponse, ZoneItem } from '../../core/models/models';
import * as fabric from 'fabric';
import { Observable } from 'rxjs';

interface TableData {
  tableId: number;
  zoneId: number;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  number: string;
  capacity: number;
  description: string;
  status: string; // free, booked, maintenance
  booked: boolean; // реальный статус брони на выбранное время
}

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
  @Input()
  zones!: Signal<Observable<ApiResponse<ZoneItem[]>>>;
  private tables: TableData[] = [];
  private gridSize = 20;

  selectedTable: any = null;
  @Input()
  selectedDateStr!: string;
  @Input()
  selectedTimeStr!: string;

  constructor(private datePipe: DatePipe) {}

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement);
    (this.canvas as any).setDimensions({ width: 410, height: 610 });
    this.canvas.setZoom(1);
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'pointer';
    this.canvas.on('mouse:down', (e: any) => {
      const target = e.target;
      if (target && target.type === 'group' && target.data?.type === 'table') {
        this.showTableInfo(target);
      }
    });
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      // Здесь должен быть реальный вызов API
      // const response = await this.floorPlanApi.getPublic(this.selectedDateStr, this.selectedTimeStr).toPromise();
      // this.zones = response.zones;
      // this.tables = response.tables; // tables уже содержат поле booked
      // Пока используем демо-данные
      // Имитация бронирований: для текущего времени считаем, что стол 2 забронирован
      const isBooked = (tableId: number) => {
        // здесь должна быть логика на основе реальных броней
        return tableId === 2;
      };
      this.tables = [
        { tableId: 1, zoneId: 1, left: 200, top: 150, width: 80, height: 60, angle: 0,
          number: '1', capacity: 4, description: 'У окна', status: 'free', booked: isBooked(1) },
        { tableId: 2, zoneId: 2, left: 400, top: 300, width: 120, height: 60, angle: 0,
          number: '2', capacity: 6, description: 'VIP зона', status: 'free', booked: isBooked(2) }
      ];
    } catch (error) {
      console.error('Ошибка загрузки схемы', error);
    }
    this.render();
  }

  private render(): void {
    this.canvas.clear();
    this.drawGrid();
    this.renderTables();
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

  private renderTables(): void {
    for (const t of this.tables) {

      let zone:any ;
      this.zones().subscribe(response => {
        if (!response.data) return;
        zone = response.data.find(zone => zone.id === t.zoneId);
      });
      const strokeColor = '#999';
      let fillColor = '#d4edda'; // свободен
      if (t.booked) fillColor = '#f8d7da';
      else if (t.status === 'maintenance') fillColor = '#fff3cd';
      const rect = new fabric.Rect({
        width: t.width, height: t.height,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 3,
        rx: 6, ry: 6,
        selectable: false,
        evented: true
      });
      const text = new fabric.Text(t.number, {
        fontSize: 14,
        fill: '#000',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      });
      const group = new fabric.Group([rect, text], {
        left: t.left, top: t.top, angle: t.angle || 0,
        selectable: false,

        evented: true,
        hasControls: false,
        hasBorders: false
      });
      group.data = {
        tableId: t.tableId,
        zoneId: t.zoneId,
        type: 'table',
        number: t.number,
        capacity: t.capacity,
        description: t.description,
        status: t.status,
        booked: t.booked
      };
      this.canvas.add(group);
    }
  }

  private showTableInfo(group: any): void {
    this.selectedTable = group;
  }

  closeModal(): void {
    this.selectedTable = null;
  }

  getZoneName(zoneId: number): string {
    let zone:any ;
      this.zones().subscribe(response => {
        if (!response.data) return;
        zone = response.data.find(zone => zone.id === zoneId);
      });
    return zone ? zone.name : 'Не выбрана';
  }

  getStatusText(table: any): string {
    if (table.booked) return 'Забронирован';
    if (table.status === 'maintenance') return 'Техобслуживание';
    return 'Свободен';
  }

  getStatusColor(table: any): string {
    if (table.booked) return '#b91c1c';
    if (table.status === 'maintenance') return '#ea580c';
    return '#15803d';
  }

  reloadData(): void {
    this.loadData();
  }

  bookTable(): void {
    if (this.selectedTable && !this.selectedTable.data.booked) {
      // Перенаправляем на страницу бронирования с предзаполненным столом и датой/временем
      const tableId = this.selectedTable.data.tableId;
      // Используйте роутер для навигации
      alert(`Перейти к бронированию стола ${this.selectedTable.data.number}`);
      // this.router.navigate(['/booking'], { queryParams: { tableId, date: this.selectedDateStr, time: this.selectedTimeStr } });
    }
  }
}