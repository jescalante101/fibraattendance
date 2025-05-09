import { Component, OnInit } from '@angular/core';
import { elementAt } from 'rxjs';

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.component.html',
  styleUrls: ['./asistencia.component.css']
})
export class AsistenciaComponent implements OnInit {
  activeSection: string = 'basica';

  constructor() { }

  ngOnInit() {
    this.scrollToSection('hextras');   
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      this.activeSection = sectionId; 
    }
  }

   
}
