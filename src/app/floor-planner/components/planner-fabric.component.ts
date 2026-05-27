import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as fabric from 'fabric';

interface Zone {
  id: number;
  name: string;
  color: string;
}

@Component({
  selector: 'app-planner-fabric',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fabric-planner">
      <div class="left-panel">
        <div class="zones-panel">
          <h3><i class="fas fa-layer-group"></i> Зоны</h3>
          <div class="zone-list">
            @for (zone of zones; track zone.id) {
              <div 
                class="zone-item" 
                [style.borderLeftColor]="zone.color"
                [class.selected]="selectedZoneId === zone.id"
                (click)="selectZone(zone.id)"
              >
                <span class="zone-name">{{ zone.name }}</span>
                <div class="zone-actions-buttons">
                  <button (click)="editZone(zone); $event.stopPropagation()"><i class="fas fa-edit"></i></button>
                  <button (click)="deleteZone(zone.id); $event.stopPropagation()"><i class="fas fa-trash-alt"></i></button>
                </div>
              </div>
            }
          </div>
          <div class="zone-add">
            <button (click)="showAddZoneForm = !showAddZoneForm"><i class="fas fa-plus"></i> Добавить зону</button>
            <div *ngIf="showAddZoneForm" class="zone-add-form">
              <input placeholder="Название зоны" [(ngModel)]="newZoneName" />
              <div class="color-picker-row">
                <span class="color-label">Задать цвет:</span>
                <input type="color" [(ngModel)]="newZoneColor" />
              </div>
              <div class="form-buttons">
                <button (click)="addZone()"><i class="fas fa-check"></i> Создать</button>
                <button (click)="cancelAddZone()"><i class="fas fa-times"></i> Отмена</button>
              </div>
            </div>
          </div>
          <div class="assign-actions">
            <button (click)="assignSelectedTablesToZone()" [disabled]="selectedZoneId === null">
              <i class="fas fa-link"></i> Привязать выделенные столы
            </button>
          </div>
        </div>
      </div>

      <div class="main-content">
        <div class="toolbar">
          <div class="tool-group">
            <button (click)="addTable()" [disabled]="zones.length === 0"><i class="fas fa-table"></i> Стол</button>
            <button (click)="addText()"><i class="fas fa-font"></i> Текст</button>
            <button (click)="deleteSelected()"><i class="fas fa-trash"></i> Удалить</button>
            <button (click)="clearSelection()"><i class="fas fa-arrow-pointer"></i> Снять</button>
          </div>
          <div class="tool-group">
            <button (click)="clearAll()"><i class="fas fa-broom"></i> Очистить всё</button>
          </div>
          <div class="tool-group">
            <button (click)="exportToPNG()"><i class="fas fa-camera"></i> PNG</button>
            <button (click)="saveToLocalStorage()"><i class="fas fa-save"></i> Сохранить</button>
            <button (click)="loadFromLocalStorage()"><i class="fas fa-folder-open"></i> Загрузить</button>
            <button (click)="exportToFile()"><i class="fas fa-file-export"></i> Экспорт</button>
          </div>
        </div>

        <div class="canvas-wrapper">
          <canvas #canvasEl id="floorCanvas" width="1000" height="600"></canvas>
        </div>
      </div>
    </div>

    <!-- Модальные окна -->
    <div *ngIf="editingTable" class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>Редактирование стола</h3>
        <label>Номер стола (1-100):</label>
        <input type="number" min="1" max="100" [(ngModel)]="editTableNumber" (change)="validateNumber()" />
        <label>Вместимость (гостей, 1-30):</label>
        <input type="number" min="1" max="30" [(ngModel)]="editTableCapacity" (change)="updateTableSizeFromCapacity()" />
        <label>Описание:</label>
        <textarea rows="3" [(ngModel)]="editTableDescription"></textarea>
        <label>Статус:</label>
        <select [(ngModel)]="editTableStatus">
          <option value="free">Свободен</option>
          <option value="booked">Забронирован</option>
          <option value="maintenance">Техобслуживание</option>
        </select>
        <div *ngIf="statusChanged" class="status-warning">⚠️ Изменение статуса может повлиять на бронирования!</div>
        <label>Зона:</label>
        <input [value]="getZoneNameForTable()" disabled />
        <div class="modal-buttons">
          <button (click)="saveTableEdit()">Сохранить</button>
          <button (click)="closeModal()">Отмена</button>
        </div>
      </div>
    </div>

    <div *ngIf="editingZone" class="modal-overlay" (click)="closeZoneModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>Редактирование зоны</h3>
        <label>Название зоны:</label>
        <input [(ngModel)]="editZoneName" />
        <label>Цвет зоны:</label>
        <input type="color" [(ngModel)]="editZoneColor" />
        <div class="modal-buttons">
          <button (click)="saveZoneEdit()">Сохранить</button>
          <button (click)="closeZoneModal()">Отмена</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fabric-planner {
      display: flex;
      gap: 20px;
      padding: 20px;
      background: #f0f2f5;
      min-height: 100vh;
    }
    .left-panel {
      width: 280px;
      flex-shrink: 0;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
    }
    .zones-panel h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #1f2937;
    }
    .zone-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
      max-height: 300px;
      overflow-y: auto;
    }
    .zone-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f9fafb;
      border-left: 4px solid;
      border-radius: 6px;
      cursor: pointer;
    }
    .zone-item.selected {
      background: #e0e7ff;
      font-weight: 500;
    }
    .zone-name {
      flex: 1;
      color: #1f2937;
    }
    .zone-actions-buttons {
      display: flex;
      gap: 6px;
    }
    .zone-actions-buttons button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.7;
      color: #1f2937;
    }
    .zone-actions-buttons button i {
      color: #1f2937;
    }
    .zone-add {
      margin-bottom: 16px;
    }
    .zone-add > button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
    }
    .zone-add-form {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .color-label {
      font-size: 14px;
      color: #1f2937;
    }
    .zone-add-form input[type="text"] {
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 100%;
    }
    .zone-add-form input[type="color"] {
      width: 40px;
      height: 30px;
    }
    .form-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .form-buttons button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .assign-actions button {
      background: #4caf50;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
    }
    .assign-actions button:disabled {
      background: #9ca3af;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .tool-group {
      display: flex;
      gap: 6px;
      border-right: 1px solid #e5e7eb;
      padding-right: 12px;
      margin-right: 6px;
    }
    .tool-group:last-child {
      border-right: none;
      padding-right: 0;
      margin-right: 0;
    }
    .toolbar button {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #1f2937;
    }
    .toolbar button i {
      color: #1f2937;
    }
    .toolbar button:hover {
      background: #e5e7eb;
    }
    .toolbar button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .canvas-wrapper {
      background: white;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: inline-block;
    }
    #floorCanvas {
      border: 1px solid #ddd;
      background: #f9f9f9;
      display: block;
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  color: #000; /* добавить эту строку */
}
.modal-content label {
  display: block;
  margin-top: 12px;
  font-weight: 500;
  color: #000; /* добавить эту строку */
}
.modal-content input, 
.modal-content textarea, 
.modal-content select {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  color: #000; /* добавить эту строку */
  background: white;
}
.modal-content h3 {
  color: #000; /* добавить эту строку */
  margin: 0 0 16px 0;
}
    .status-warning {
      color: #dc2626;
      font-size: 12px;
      margin-top: 6px;
      background: #fee2e2;
      padding: 4px;
      border-radius: 4px;
    }
    .modal-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      justify-content: flex-end;
    }
    .modal-buttons button {
      padding: 6px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .modal-buttons button:first-child {
      background: #3b82f6;
      color: white;
    }
    .modal-buttons button:last-child {
      background: #e5e7eb;
      color: #1f2937;
    }
  `]
})
export class PlannerFabricComponent implements AfterViewInit {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;
  private gridSize = 20;

  zones: Zone[] = [];
  selectedZoneId: number | null = null;
  private nextZoneId = 1;
  private nextTableId = 1; // следующий свободный ID стола (без пропусков)

  showAddZoneForm = false;
  newZoneName = '';
  newZoneColor = '#cccccc';

  editingTable: any = null;
  editTableNumber: string = '';
  editTableCapacity: number = 4;
  editTableDescription: string = '';
  editTableStatus: 'free' | 'booked' | 'maintenance' = 'free';
  private originalTableStatus: 'free' | 'booked' | 'maintenance' = 'free';

  editingZone: Zone | null = null;
  editZoneName: string = '';
  editZoneColor: string = '';

  private copiedTableData: any = null;
  private angleIndicator: any = null;

  get statusChanged(): boolean {
    return this.editingTable && this.editTableStatus !== this.originalTableStatus;
  }

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement);
    (this.canvas as any).setDimensions({ width: 1000, height: 600 });
    this.canvas.setZoom(1);
    this.drawGrid();
    this.enableSnapToGrid();
    this.setupDoubleClick();
    this.setupCopyPaste();
    this.setupRotation();
    this.setupTableTextSync();
    this.loadDemoData();
    this.snapAllTablesToGrid();
    this.canvas.renderAll();
  }

  private snapAllTablesToGrid(): void {
    const tables = this.getTablesOnCanvas();
    for (const table of tables) {
      this.snapToGrid(table);
    }
  }

  private snapToGrid(obj: fabric.Object): void {
    if (!obj) return;
    const left = Math.round(obj.left / this.gridSize) * this.gridSize;
    const top = Math.round(obj.top / this.gridSize) * this.gridSize;
    if (obj.left !== left || obj.top !== top) {
      obj.set({ left, top });
      obj.setCoords();
    }
  }

  private drawGrid(): void {
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();
    const oldGrid = this.canvas.getObjects().filter((obj: any) => obj.data?.isGridLine);
    oldGrid.forEach(obj => this.canvas.remove(obj));
    for (let i = 0; i < width; i += this.gridSize) {
      const line = new fabric.Line([i, 0, i, height], { stroke: '#ccc', strokeWidth: 1, selectable: false, evented: false });
      (line as any).data = { isGridLine: true };
      this.canvas.add(line);
      this.canvas.sendObjectToBack(line);
    }
    for (let i = 0; i < height; i += this.gridSize) {
      const line = new fabric.Line([0, i, width, i], { stroke: '#ccc', strokeWidth: 1, selectable: false, evented: false });
      (line as any).data = { isGridLine: true };
      this.canvas.add(line);
      this.canvas.sendObjectToBack(line);
    }
    this.canvas.renderAll();
  }

  private enableSnapToGrid(): void {
    this.canvas.on('object:moving', (e: any) => {
      const obj = e.target;
      if (obj && obj.type === 'group' && obj.data?.type === 'table') {
        this.snapToGrid(obj);
      }
    });
    this.canvas.on('object:modified', (e: any) => {
      const obj = e.target;
      if (obj && obj.type === 'group' && obj.data?.type === 'table') {
        this.snapToGrid(obj);
        this.updateTableTextPosition(obj);
      }
    });
  }

  private setupRotation(): void {
    let rotatingObj: any = null;
    this.canvas.on('object:rotating', (e: any) => {
      const obj = e.target;
      if (obj && obj.type === 'group' && obj.data?.type === 'table') {
        rotatingObj = obj;
        let angle = obj.angle || 0;
        const snapped = Math.round(angle / 15) * 15;
        if (angle !== snapped) {
          obj.set('angle', snapped);
          obj.setCoords();
        }
        this.showAngleIndicator(obj);
      }
    });
    this.canvas.on('mouse:up', () => {
      if (rotatingObj) {
        this.hideAngleIndicator();
        rotatingObj = null;
      }
    });
  }

  private showAngleIndicator(obj: any): void {
    this.hideAngleIndicator();
    const angle = obj.angle || 0;
    const x = obj.left + obj.width + 15;
    const y = obj.top + obj.height / 2;
    this.angleIndicator = new fabric.Text(`${angle}°`, {
      left: x,
      top: y,
      fontSize: 12,
      fill: '#000',
      backgroundColor: 'rgba(255,255,255,0.8)',
      padding: 2,
      selectable: false,
      evented: false
    });
    this.canvas.add(this.angleIndicator);
    this.canvas.renderAll();
  }

  private hideAngleIndicator(): void {
    if (this.angleIndicator) {
      this.canvas.remove(this.angleIndicator);
      this.angleIndicator = null;
      this.canvas.renderAll();
    }
  }

  private setupTableTextSync(): void {
    this.canvas.on('object:moving', (e: any) => {
      const obj = e.target;
      if (obj && obj.type === 'group' && obj.data?.type === 'table') {
        this.updateTableTextPosition(obj);
      }
    });
    this.canvas.on('object:rotating', (e: any) => {
      const obj = e.target;
      if (obj && obj.type === 'group' && obj.data?.type === 'table') {
        this.updateTableTextPosition(obj);
      }
    });
  }

  private updateTableTextPosition(group: any): void {
    if (!group.textObj) return;
    const center = group.getCenterPoint();
    group.textObj.set({
      left: center.x - group.textObj.width / 2,
      top: center.y - group.textObj.height / 2,
      angle: 0
    });
    group.textObj.setCoords();
    this.canvas.renderAll();
  }

  private setupDoubleClick(): void {
    this.canvas.on('mouse:dblclick', (e: any) => {
      const target = e.target;
      if (target && target.type === 'group' && target.data?.type === 'table') {
        this.editSelectedTable(target);
      }
    });
  }

  private setupCopyPaste(): void {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        const active = this.canvas.getActiveObjects();
        const table = active.find(obj => obj.type === 'group' && (obj as any).data?.type === 'table');
        if (table) {
          const rect = (table as any).getObjects()[0] as fabric.Rect;
          this.copiedTableData = {
            zoneId: (table as any).data.zoneId,
            capacity: (table as any).data.capacity,
            description: (table as any).data.description,
            status: (table as any).data.status,
            left: table.left,
            top: table.top,
            width: rect.width,
            height: rect.height
          };
        }
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        if (this.copiedTableData && this.selectedZoneId !== null) {
          if (this.zones.length === 0) {
            alert('Сначала создайте зону');
            return;
          }
          const allTables = this.getTablesOnCanvas();
          const maxId = allTables.length === 0 ? 0 : Math.max(...allTables.map(t => t.data.tableId));
          const newId = maxId + 1;
          let newLeft = this.copiedTableData.left + 30;
          let newTop = this.copiedTableData.top + 30;
          newLeft = Math.round(newLeft / this.gridSize) * this.gridSize;
          newTop = Math.round(newTop / this.gridSize) * this.gridSize;
          this.addTableAt(newLeft, newTop, {
            tableId: newId,
            zoneId: this.copiedTableData.zoneId,
            capacity: this.copiedTableData.capacity,
            description: this.copiedTableData.description,
            status: this.copiedTableData.status,
            number: newId.toString()
          });
        }
      }
    });
  }

  private getTablesOnCanvas(): any[] {
    return this.canvas.getObjects().filter(obj => obj.type === 'group' && (obj as any).data?.type === 'table');
  }

  // ========== Зоны ==========
  addZone(name?: string, color?: string): void {
    if (name !== undefined && color !== undefined) {
      const newZone: Zone = { id: this.nextZoneId++, name: name.trim(), color };
      this.zones.push(newZone);
      if (this.zones.length === 1) this.selectedZoneId = newZone.id;
      return;
    }
    if (!this.newZoneName.trim()) {
      alert('Введите название зоны');
      return;
    }
    const newZone: Zone = { id: this.nextZoneId++, name: this.newZoneName.trim(), color: this.newZoneColor };
    this.zones.push(newZone);
    if (this.zones.length === 1) this.selectedZoneId = newZone.id;
    this.newZoneName = '';
    this.newZoneColor = '#cccccc';
    this.showAddZoneForm = false;
  }

  cancelAddZone(): void {
    this.showAddZoneForm = false;
    this.newZoneName = '';
    this.newZoneColor = '#cccccc';
  }

  editZone(zone: Zone): void {
    this.editingZone = zone;
    this.editZoneName = zone.name;
    this.editZoneColor = zone.color;
  }

  saveZoneEdit(): void {
    if (!this.editingZone) return;
    this.editingZone.name = this.editZoneName;
    this.editingZone.color = this.editZoneColor;
    const tables = this.getTablesOnCanvas();
    for (const table of tables) {
      if (table.data.zoneId === this.editingZone.id) {
        const rect = (table as any).getObjects()[0] as fabric.Rect;
        rect.set('stroke', this.editZoneColor);
      }
    }
    this.canvas.renderAll();
    this.closeZoneModal();
  }

  closeZoneModal(): void {
    this.editingZone = null;
  }

  deleteZone(zoneId: number): void {
    const tablesWithZone = this.getTablesOnCanvas().filter(t => t.data?.zoneId === zoneId);
    if (tablesWithZone.length > 0) {
      alert(`Нельзя удалить зону, к ней привязано ${tablesWithZone.length} столов.`);
      return;
    }
    if (confirm('Удалить зону?')) {
      this.zones = this.zones.filter(z => z.id !== zoneId);
      if (this.selectedZoneId === zoneId) {
        this.selectedZoneId = this.zones.length ? this.zones[0].id : null;
      }
    }
  }

  selectZone(zoneId: number): void {
    this.selectedZoneId = zoneId;
  }

  getZoneNameForTable(): string {
    if (!this.editingTable) return '';
    const zoneId = this.editingTable.data?.zoneId;
    const zone = this.zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Не выбрана';
  }

  // ========== Столы ==========
  addTable(): void {
    if (this.zones.length === 0) {
      alert('Сначала создайте хотя бы одну зону');
      return;
    }
    if (this.selectedZoneId === null) {
      alert('Выберите зону');
      return;
    }
    const left = Math.round((this.canvas.getWidth() / 2 - 30) / this.gridSize) * this.gridSize;
    const top = Math.round((this.canvas.getHeight() / 2 - 30) / this.gridSize) * this.gridSize;
    this.addTableAt(left, top);
  }

  private calculateWidth(capacity: number): number {
    if (capacity < 1) capacity = 1;
    if (capacity > 30) capacity = 30;
    let cells = 3 + Math.floor((capacity - 1) / 2);
    if (cells > 10) cells = 10;
    return cells * this.gridSize;
  }

  private updateNextTableId(): void {
    const tables = this.getTablesOnCanvas();
    let maxId = 0;
    for (const t of tables) {
      if (t.data.tableId > maxId) maxId = t.data.tableId;
    }
    this.nextTableId = maxId + 1;
  }

  private addTableAt(left: number, top: number, customData?: any): any {
    const zone = this.zones.find(z => z.id === (customData?.zoneId || this.selectedZoneId));
    const strokeColor = zone ? zone.color : '#999';
    let tableId = customData?.tableId;
    if (!tableId) {
      tableId = this.nextTableId;
      this.nextTableId++;
    }
    const capacity = customData?.capacity || 4;
    const width = this.calculateWidth(capacity);
    const number = customData?.number || tableId.toString();
    const description = customData?.description || '';
    const status = customData?.status || 'free';

    const statusColor = status === 'free' ? '#d4edda' : status === 'booked' ? '#f8d7da' : '#fff3cd';
    const rect = new fabric.Rect({
      width: width, height: 60,
      fill: statusColor,
      stroke: strokeColor,
      strokeWidth: 3,
      rx: 6, ry: 6,
      lockScalingX: false, lockScalingY: true
    });
    const group = new fabric.Group([rect], {
      left, top, hasControls: true,
      lockScalingX: false, lockScalingY: true
    });
    group.data = {
      tableId,
      zoneId: customData?.zoneId || this.selectedZoneId,
      type: 'table',
      number,
      capacity,
      description,
      status
    };
    const textObj = new fabric.Text(number, {
      fontSize: 14,
      fill: '#000',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    });
    (group as any).textObj = textObj;
    this.canvas.add(group);
    this.canvas.add(textObj);
    this.updateTableTextPosition(group);
    this.snapToGrid(group);
    this.canvas.renderAll();
    return group;
  }

  editSelectedTable(table: any): void {
    this.editingTable = table;
    this.editTableNumber = table.data.number || '';
    this.editTableCapacity = table.data.capacity || 4;
    this.editTableDescription = table.data.description || '';
    this.editTableStatus = table.data.status || 'free';
    this.originalTableStatus = table.data.status || 'free';
  }

  validateNumber(): void {
    let num = parseInt(this.editTableNumber);
    if (isNaN(num)) num = 1;
    if (num < 1) num = 1;
    if (num > 100) num = 100;
    this.editTableNumber = num.toString();
  }

  updateTableSizeFromCapacity(): void {
    let cap = this.editTableCapacity;
    if (cap < 1) cap = 1;
    if (cap > 30) cap = 30;
    this.editTableCapacity = cap;
    const newWidth = this.calculateWidth(cap);
    if (this.editingTable) {
      const rect = (this.editingTable as any).getObjects()[0] as fabric.Rect;
      rect.set('width', newWidth);
      this.editingTable.setCoords();
      this.canvas.renderAll();
    }
  }

  saveTableEdit(): void {
    if (!this.editingTable) return;
    if (this.statusChanged) {
      const confirmChange = confirm('⚠️ Вы уверены, что хотите изменить статус стола? Это может повлиять на бронирования.');
      if (!confirmChange) return;
    }
    let num = parseInt(this.editTableNumber);
    if (isNaN(num)) num = 1;
    if (num < 1) num = 1;
    if (num > 100) num = 100;
    this.editTableNumber = num.toString();
    let cap = this.editTableCapacity;
    if (cap < 1) cap = 1;
    if (cap > 30) cap = 30;
    this.editTableCapacity = cap;
    this.editingTable.data.number = this.editTableNumber;
    this.editingTable.data.capacity = this.editTableCapacity;
    this.editingTable.data.description = this.editTableDescription;
    this.editingTable.data.status = this.editTableStatus;
    if (this.editingTable.textObj) {
      this.editingTable.textObj.set('text', this.editTableNumber);
    }
    const rect = (this.editingTable as any).getObjects()[0] as fabric.Rect;
    const newWidth = this.calculateWidth(this.editTableCapacity);
    rect.set('width', newWidth);
    const statusColor = this.editTableStatus === 'free' ? '#d4edda' : this.editTableStatus === 'booked' ? '#f8d7da' : '#fff3cd';
    rect.set('fill', statusColor);
    this.editingTable.setCoords();
    this.updateTableTextPosition(this.editingTable);
    this.snapToGrid(this.editingTable);
    this.canvas.renderAll();
    this.closeModal();
  }

  closeModal(): void {
    this.editingTable = null;
  }

  deleteSelected(): void {
    const active = this.canvas.getActiveObjects();
    const toDelete = active.filter(obj => obj.type === 'group' || (obj as any).data?.type === 'text');
    if (toDelete.length === 0) {
      alert('Выделите объекты для удаления');
      return;
    }
    if (confirm(`Удалить ${toDelete.length} выбранных элементов?`)) {
      toDelete.forEach(obj => {
        if ((obj as any).textObj) this.canvas.remove((obj as any).textObj);
        this.canvas.remove(obj);
      });
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
      // После удаления обновляем nextTableId (чтобы при создании нового стола номер шёл без пропусков)
      this.updateNextTableId();
    }
  }

  assignSelectedTablesToZone(): void {
    if (this.selectedZoneId === null) { alert('Выберите зону'); return; }
    const active = this.canvas.getActiveObjects();
    const tables = active.filter(obj => obj.type === 'group' && (obj as any).data?.type === 'table');
    if (!tables.length) { alert('Выделите столы'); return; }
    const newZone = this.zones.find(z => z.id === this.selectedZoneId)!;
    for (const t of tables) {
      t.data.zoneId = this.selectedZoneId;
      const rect = (t as any).getObjects()[0] as fabric.Rect;
      rect.set('stroke', newZone.color);
    }
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  clearSelection(): void {
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  clearAll(): void {
    if (confirm('Очистить всю схему? Все столы и тексты будут удалены.')) {
      const toRemove = this.canvas.getObjects().filter((obj: any) => !obj.data?.isGridLine);
      toRemove.forEach(obj => {
        if ((obj as any).textObj) this.canvas.remove((obj as any).textObj);
        this.canvas.remove(obj);
      });
      this.canvas.renderAll();
      this.updateNextTableId();
    }
  }

  addText(): void {
    const left = this.canvas.getWidth() / 2;
    const top = this.canvas.getHeight() / 2;
    const text = new fabric.IText('Новый текст', {
      left, top, fontSize: 20, fill: '#000', editable: true, hasControls: true
    });
    text.data = { type: 'text' };
    this.canvas.add(text);
    this.canvas.renderAll();
  }

  exportToPNG(): void {
    const dataURL = this.canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = `floor_plan_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }

  saveToLocalStorage(): void {
    const tablesData = this.getTablesOnCanvas().map(table => {
      const rect = (table as any).getObjects()[0] as fabric.Rect;
      return {
        tableId: table.data.tableId,
        zoneId: table.data.zoneId,
        left: table.left,
        top: table.top,
        width: rect.width,
        height: rect.height,
        angle: table.angle,
        number: table.data.number,
        capacity: table.data.capacity,
        description: table.data.description,
        status: table.data.status
      };
    });
    const textsData = this.canvas.getObjects()
      .filter((obj: any) => obj.data?.type === 'text')
      .map(t => ({ text: (t as fabric.Text).text, left: t.left, top: t.top, fontSize: (t as fabric.Text).fontSize, fill: (t as fabric.Text).fill }));
    const state = { zones: this.zones, tables: tablesData, texts: textsData, version: 8 };
    localStorage.setItem('floor_plan', JSON.stringify(state));
    alert('Схема сохранена');
  }

  loadFromLocalStorage(): void {
    const saved = localStorage.getItem('floor_plan');
    if (!saved) { alert('Нет сохранённой схемы'); return; }
    try {
      const state = JSON.parse(saved);
      this.zones = state.zones;
      this.nextZoneId = Math.max(0, ...this.zones.map(z => z.id), 0) + 1;
      this.selectedZoneId = this.zones.length ? this.zones[0].id : null;
      const gridLines = this.canvas.getObjects().filter((obj: any) => obj.data?.isGridLine);
      this.canvas.clear();
      gridLines.forEach(line => this.canvas.add(line));
      let maxTableId = 0;
      for (const t of (state.tables || [])) {
        const zone = this.zones.find(z => z.id === t.zoneId);
        const strokeColor = zone ? zone.color : '#999';
        const statusColor = t.status === 'free' ? '#d4edda' : t.status === 'booked' ? '#f8d7da' : '#fff3cd';
        const rect = new fabric.Rect({
          width: t.width || 60,
          height: t.height || 60,
          fill: statusColor,
          stroke: strokeColor,
          strokeWidth: 3,
          rx: 6, ry: 6,
          lockScalingX: false, lockScalingY: true
        });
        const group = new fabric.Group([rect], {
          left: t.left, top: t.top, angle: t.angle || 0, hasControls: true,
          lockScalingX: false, lockScalingY: true
        });
        group.data = {
          tableId: t.tableId,
          zoneId: t.zoneId,
          type: 'table',
          number: t.number,
          capacity: t.capacity,
          description: t.description,
          status: t.status
        };
        const textObj = new fabric.Text(t.number || t.tableId.toString(), {
          fontSize: 14,
          fill: '#000',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false
        });
        (group as any).textObj = textObj;
        this.canvas.add(group);
        this.canvas.add(textObj);
        this.updateTableTextPosition(group);
        this.snapToGrid(group);
        if (t.tableId > maxTableId) maxTableId = t.tableId;
      }
      for (const txt of (state.texts || [])) {
        const textObj = new fabric.IText(txt.text, { left: txt.left, top: txt.top, fontSize: txt.fontSize || 20, fill: txt.fill || '#000', editable: true });
        textObj.data = { type: 'text' };
        this.canvas.add(textObj);
      }
      this.nextTableId = maxTableId + 1;
      this.canvas.renderAll();
      alert('Схема загружена');
    } catch(e) { console.error(e); alert('Ошибка загрузки'); }
  }

  exportToFile(): void {
    const tablesData = this.getTablesOnCanvas().map(table => {
      const rect = (table as any).getObjects()[0] as fabric.Rect;
      return {
        tableId: table.data.tableId,
        zoneId: table.data.zoneId,
        left: table.left,
        top: table.top,
        width: rect.width,
        height: rect.height,
        angle: table.angle,
        number: table.data.number,
        capacity: table.data.capacity,
        description: table.data.description,
        status: table.data.status
      };
    });
    const textsData = this.canvas.getObjects()
      .filter((obj: any) => obj.data?.type === 'text')
      .map(t => ({ text: (t as fabric.Text).text, left: t.left, top: t.top, fontSize: (t as fabric.Text).fontSize, fill: (t as fabric.Text).fill }));
    const state = { zones: this.zones, tables: tablesData, texts: textsData, version: 8, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `floor_plan_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private loadDemoData(): void {
    this.nextTableId = 1;
    this.addZone('Терраса', '#00aa00');
    this.addZone('VIP зал', '#ffaa00');
    this.selectedZoneId = this.zones[0].id;
    this.addTableAt(200, 150);
    this.addTableAt(400, 300);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.key === 'Delete') {
      this.deleteSelected();
    }
  }
}