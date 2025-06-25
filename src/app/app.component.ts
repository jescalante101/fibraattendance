import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'admin';
  sidebarCollapsed = false;

  onSidebarToggled(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  activeItem = 'personal';

onSectionSelected(section: string) {
  this.activeItem = section;
}
}
