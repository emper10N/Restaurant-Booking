import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as fabric from 'fabric';
import { AppApiService } from '../../core/services/app-api.service';
import { firstValueFrom, map } from 'rxjs';
import { TableItem, ZoneItem } from '../../core/models/models';

@Component({
  selector: 'app-planner-fabric',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: `./planner-fabric.component.html`,
  styleUrl:`./planner-fabric.component.scss` 
})
export class PlannerFabricComponent implements AfterViewInit {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;
  private gridSize = 10;
  private readonly api = inject(AppApiService);

  zones: ZoneItem[] = [];
  selectedZoneId: number | null = null;
  private nextZoneId = 1;
  private nextTableId = 1;

  showAddZoneForm = false;
  newZoneName = '';
  newZoneColor = '#cccccc';

  editingTable: any = null;
  editTableNumber: string = '';
  editTableCapacity: number = 4;
  editTableDescription: string = '';
  editTableStatus: 'free' | 'booked' | 'maintenance' = 'free';
  private originalTableStatus: 'free' | 'booked' | 'maintenance' = 'free';

  editingZone: ZoneItem | null = null;
  editZoneName: string = '';
  editZoneColor: string = '';

  private copiedTableData: any = null;
  private angleIndicator: any = null;
  tables: any;

  ngOnInit(){
    this.loadData();
  }

  get statusChanged(): boolean {
    return this.editingTable && this.editTableStatus !== this.originalTableStatus;
  }

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement);
    (this.canvas as any).setDimensions({ width: 650, height: 700 });
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

    private async loadData(): Promise<void> {
      try {
        const zonesResponse = await firstValueFrom(
          this.api.getZones().pipe(map(response => response.data))
        );
        this.zones = zonesResponse ?? [];
      } catch (error) {
        console.error('Ошибка загрузки схемы', error);
      }
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

  addZone(name?: string, color?: string): void {
    const newZone: ZoneItem = { id: this.nextZoneId++, name: this.newZoneName.trim(), active: true, tableCount: 0};
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

  editZone(zone: ZoneItem): void {
    this.editingZone = zone;
    this.editZoneName = zone.name;
  }

  saveZoneEdit(): void {
    if (!this.editingZone) return;
    this.editingZone.name = this.editZoneName;
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
    const strokeColor = '#999';
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
      rect.set('stroke', '#cccccc');
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

    getTables(zone: ZoneItem){
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
}