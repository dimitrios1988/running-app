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

@Component({
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

  months: Array<string> = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  currentTime!: string;
  private targetTime!: number;
  private targetDate!: Date;
  private difference!: number;
  private date!: Date;
  private now!: number;
  constructor() {}

  ngOnInit() {
    this.targetDate = new Date(
      this.CountdownTimerElementModel.targetDateTime.getFullYear(),
      this.CountdownTimerElementModel.targetDateTime.getMonth(),
      this.CountdownTimerElementModel.targetDateTime.getDate()
    );
    this.currentTime = `${
      this.months[this.targetDate.getMonth()]
    } ${this.targetDate.getDate()}, ${this.targetDate.getFullYear()}`;

    this.targetTime = this.targetDate.getTime();

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
      //this.tickTock();
      this.difference = this.targetTime - this.now;
      this.difference = this.difference / (1000 * 60 * 60 * 24);
      this.days.nativeElement.innerText = Math.floor(this.difference);
      /* !isNaN(this.days.nativeElement.innerText)
        ? (this.days.nativeElement.innerText = Math.floor(this.difference))
        : (this.days.nativeElement.innerHTML = `<img src="https://i.gifer.com/VAyR.gif" />`); */
    }, 1000);
  }

  tickTock() {
    this.date = new Date();
    this.now = this.date.getTime();
    this.days.nativeElement.innerText = Math.floor(this.difference);
    this.hours.nativeElement.innerText = 23 - this.date.getHours();
    this.minutes.nativeElement.innerText = 60 - this.date.getMinutes();
    this.seconds.nativeElement.innerText = 60 - this.date.getSeconds();
  }
}
