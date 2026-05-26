import { Injectable } from '@angular/core';
import { BehaviorSubject, timer, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  public currentTime$: Observable<Date> = timer(0, 1000).pipe(
    map(() => new Date()),
    shareReplay(1)
  );
  
  private currentTimeSubject = new BehaviorSubject<Date>(new Date());
  public currentTime = this.currentTimeSubject.asObservable();
  
  constructor() {
    timer(0, 1000).subscribe(() => {
      this.currentTimeSubject.next(new Date());
    });
  }
  
  getCurrentTime(): Date {
    return this.currentTimeSubject.getValue();
  }
  
  public generateFutureTimeSlots(selectedDate?: string): string[] {
    const slots: string[] = [];
    const now = this.getCurrentTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let targetDay: Date;
    
    if (selectedDate) {
      targetDay = new Date(selectedDate);
    } else {
      targetDay = today;
    }
    
    let startHour = 10;
    let startMinute = 0;
    
    if (targetDay.getDay() === today.getDay()) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (currentHour >= 10) {
        if (currentMinute < 30) {
          startHour = currentHour;
          startMinute = 30;
        } else {
          startHour = currentHour + 1;
          startMinute = 0;
        }
      }
      
      if (currentHour >= 22) {
        return [];
      }
    }
    
    for (let h = startHour; h <= 22; h++) {
      for (const m of [0, 30]) {
        if (h === startHour && m < startMinute) continue;
        if (h === 22 && m > 0) break;
        
        slots.push(`${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`);
      }
    }
    return slots;
  }
  
  isTimeAvailable(date: string, time: string): boolean {
    const now = this.getCurrentTime();
    const slotDateTime = new Date(`${date}T${time}:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slotDay = new Date(slotDateTime.getFullYear(), slotDateTime.getMonth(), slotDateTime.getDate());
    
    if (slotDay.getTime() > today.getTime()) {
      return true;
    }
    
    if (slotDay.getTime() === today.getTime()) {
      return slotDateTime > now;
    }
    
    return false;
  }
  
  getMinTimeForDate(selectedDate: string): string | null {
    const slots = this.generateFutureTimeSlots(selectedDate);
    return slots.length > 0 ? slots[0] : null;
  }
  
  getNextAvailableTime(): string {
    const now = this.getCurrentTime();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    let nextHour = hours;
    let nextMinute = 0;
    
    if (minutes < 30) {
      nextMinute = 30;
    } else {
      nextHour++;
      nextMinute = 0;
    }
    
    if (nextHour > 22 || (nextHour === 22 && nextMinute > 0)) {
      return '10:00';
    }
    
    if (nextHour < 10) {
      return '10:00';
    }
    
    return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
  }
  
  canBookToday(): boolean {
    const now = this.getCurrentTime();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    return hours < 22 || (hours === 22 && minutes === 0);
  }
}