import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

interface Registro {
  dayIndex: number;
  inTime: string;
}

@Component({
  selector: 'app-thorassemanal',
  templateUrl: './thorassemanal.component.html',
  styleUrls: ['./thorassemanal.component.css']
})
export class ThorassemanalComponent implements OnChanges  {
  

 @Input() datos: any[] = [];
  tablaHorarios: { dia: string; horario: string }[] = [];
  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['datos']) {
      console.log('Datos recibidos en el hijo:', this.datos);
      this.generarTabla();
    }
  }

  generarTabla(): void {
    this.tablaHorarios = [];
    if (!this.datos || this.datos.length === 0) {
      console.log('No hay datos para generar la tabla de horarios.');
      return;
    }

    // Ordenamos los datos por dayIndex para asegurar el orden cronológico
    const datosOrdenados = [...this.datos].sort((a, b) => a.dayIndex - b.dayIndex);

    for (const registro of datosOrdenados) {
      const diaIndex = registro.dayIndex % 7;
      this.tablaHorarios.push({ dia: this.diasSemana[diaIndex], horario: this.formatTime(registro.inTime) });
    }

    console.log('Tabla de Horarios generada:', this.tablaHorarios);
  }

  formatTime(timeString: string): string {
    // Aquí puedes agregar lógica para formatear la hora si es necesario
    return timeString.substring(11, 16); // Extrae la parte de la hora (HH:MM)
  }
}
