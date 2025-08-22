import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

interface Registro {
  dayIndex: number;
  inTime: string;
  workTimeDuration: number;
}

@Component({
  selector: 'app-thorassemanal',
  templateUrl: './thorassemanal.component.html',
  styleUrls: ['./thorassemanal.component.css']
})
export class ThorassemanalComponent implements OnChanges  {
  

 @Input() datos: Registro[] = [];
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
      const horaInicio = this.formatTime(registro.inTime);
      const horaFin = this.calcularHoraFin(registro.inTime, registro.workTimeDuration);
      this.tablaHorarios.push({ dia: this.diasSemana[diaIndex], horario: `${horaInicio} - ${horaFin}` });
    }

    console.log('Tabla de Horarios generada:', this.tablaHorarios);
  }

  formatTime(timeString: string): string {
    // Si ya está en formato HH:MM, devolverlo tal como está
    if (timeString && timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    // Si es una fecha completa, extraer la hora
    if (timeString && timeString.length > 10) {
      return timeString.substring(11, 16);
    }
    return timeString || '00:00';
  }

  calcularHoraFin(inTime: string, workTimeDuration: number): string {
    // Si inTime está en formato HH:MM, crear una fecha temporal para los cálculos
    let date: Date;
    
    if (inTime.match(/^\d{2}:\d{2}$/)) {
      // Formato HH:MM - crear fecha temporal
      const [hours, minutes] = inTime.split(':').map(Number);
      date = new Date();
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Formato de fecha completa
      date = new Date(inTime);
    }
    
    date.setMinutes(date.getMinutes() + workTimeDuration);
    return date.toTimeString().substring(0, 5); // Devuelve HH:MM
  }
}
