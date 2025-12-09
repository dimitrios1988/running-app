import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  HostBinding,
} from '@angular/core';
import { CountdownTimerElementModel } from '../../shared/page.element/page.element.model';
import { cssFilterFromHex } from '../../../app/shared/color.utils';
import { interval, Observable, of, Subject } from 'rxjs';
import { map, startWith, takeUntil, shareReplay } from 'rxjs/operators';
import { DatePipe, AsyncPipe } from '@angular/common';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

@Component({
  selector: 'app-countdowntimer',
  standalone: true,
  templateUrl: './countdowntimer.component.html',
  styleUrls: ['./countdowntimer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AsyncPipe],
})
export class CountdowntimerComponent implements OnInit, OnDestroy {
  @Input() countdownTimerElementModel!: CountdownTimerElementModel;

  // Expose the computed time as an observable for async pipe binding
  time$!: Observable<TimeLeft>;
  title!: string;

  // expose targetDate for template
  targetDate!: Date;

  // bind computed CSS filter to host style variable
  @HostBinding('style.--filter-color') filterColor?: string;
  @HostBinding('style.--bg-color') bgColor?: string;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // guard: ensure model exists
    const model = this.countdownTimerElementModel;
    this.title = model.title;
    if (!model || !model.targetDateTime) {
      this.time$ = of({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      this.targetDate = new Date();
      return;
    }

    this.targetDate = new Date(model.targetDateTime);

    if (model.textColor) {
      this.filterColor = cssFilterFromHex(model.textColor);
    }
    if (model.backgroundColor) {
      this.bgColor = model.backgroundColor;
    }

    // emit every second, start immediately
    this.time$ = interval(1000).pipe(
      startWith(0),
      map(() => this.calculateTimeLeft(new Date(), this.targetDate)),
      takeUntil(this.destroy$),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calculateTimeLeft(start: Date, end: Date): TimeLeft {
    const diffMs = Math.max(0, end.getTime() - start.getTime()); // don't go negative
    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds };
  }

  // small helper used in template for zero-padding
  formatTwo(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
}
