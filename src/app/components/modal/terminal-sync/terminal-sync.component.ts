import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';



@Component({
  selector: 'app-terminal-sync',
  templateUrl: './terminal-sync.component.html',
  styleUrls: ['./terminal-sync.component.css']
})
export class TerminalSyncComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Información';
  @Input() message: string = '';
  @Output() closed = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<any>();

  closeModal(): void {
    this.isVisible = false;
    this.closed.emit(false);
  }

  confirm(): void {
    this.confirmed.emit();
    this.closeModal();
  }

}
