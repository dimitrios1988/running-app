import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CountdownTimerElementModel } from '../../shared/page.element/page.element.model';
import { cssFilterFromHex } from 'src/app/shared/color.utils';
import { DatePipe } from '@angular/common';

@Component({
  imports: [DatePipe],
  selector: 'app-countdowntimer',
  templateUrl: './countdowntimer.component.html',
  styleUrls: ['./countdowntimer.component.scss'],
})
export class CountdowntimerComponent implements OnInit, AfterViewInit {
  @ViewChild('countdownTimerElement', { static: true })
  countdownTimerElement!: ElementRef;
  @Input() CountdownTimerElementModel!: CountdownTimerElementModel;

  @ViewChild('days', { static: true }) days!: ElementRef;
  @ViewChild('hours', { static: true }) hours!: ElementRef;
  @ViewChild('minutes', { static: true }) minutes!: ElementRef;
  @ViewChild('seconds', { static: true }) seconds!: ElementRef;

  targetDate!: Date;
  constructor() {}

  ngOnInit() {
    this.targetDate = new Date(
      this.CountdownTimerElementModel.targetDateTime.getFullYear(),
      this.CountdownTimerElementModel.targetDateTime.getMonth(),
      this.CountdownTimerElementModel.targetDateTime.getDate()
    );

    if (this.CountdownTimerElementModel.textColor) {
      const filterColor = cssFilterFromHex(
        this.CountdownTimerElementModel.textColor
      );
      this.countdownTimerElement.nativeElement.style.setProperty(
        '--filter-color',
        filterColor
      );
    }
  }

  ngAfterViewInit() {
    setInterval(() => {
      const now = new Date();
      const difference = this.getDateDifference(
        now,
        this.CountdownTimerElementModel.targetDateTime
      );
      this.days.nativeElement.innerText = difference.days.toString();
      this.hours.nativeElement.innerText = difference.hours.toString();
      this.minutes.nativeElement.innerText = difference.minutes.toString();
      this.seconds.nativeElement.innerText = difference.seconds.toString();
    }, 1000);
  }

  private getDateDifference(
    startDate: Date,
    endDate: Date
  ): { days: number; hours: number; minutes: number; seconds: number } {
    // Calculate the difference in milliseconds
    const diffInMs = Math.abs(endDate.getTime() - startDate.getTime());

    // Convert milliseconds to days, minutes, and seconds
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(diffInMs / (1000 * 60)) % 60;
    const seconds = Math.floor(diffInMs / 1000) % 60;

    return { days, hours, minutes, seconds };
  }
}
