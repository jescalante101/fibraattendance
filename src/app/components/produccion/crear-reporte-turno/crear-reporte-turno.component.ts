// crear-reporte-turno.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { DataService } from '../../../services/data.service';
import { ModalAlertaComponent } from '../../../shared/modal-alerta/modal-alerta.component';
import { ModalConfirmComponent } from '../../../shared/modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from '../../../shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-crear-reporte-turno',
  templateUrl: './crear-reporte-turno.component.html',
  styleUrls: ['./crear-reporte-turno.component.css']
})
export class CrearReporteTurnoComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  // Campos formulario ACTIVO
  itemActivo = '';
  propietarioActivo = '';
  telarActivo = '';
  supervisorActivo = '';
  eficienciaActivo = '';
  roturaUridoActivo: number | null = null;
  roturaTramaActivo: number | null = null;
  metrosProducidosActivo: number | null = null;
  comentariosActivo = '';

  // Campos formulario INACTIVO
  itemInactivo = '';
  propietarioInactivo = '';
  telarInactivo = '';
  supervisorInactivo = '';
  eficienciaInactivo = '';
  roturaUridoInactivo: number | null = null;
  roturaTramaInactivo: number | null = null;
  metrosProducidosInactivo: number | null = null;
  comentariosInactivo = '';

  // Listas para selects
  listaTelaresActivo: string[] = [];
  listaSupervisoresActivo: string[] = [];
  listaTelaresInactivo: string[] = [];
  listaSupervisoresInactivo: string[] = [];

  constructor(
    private dialog: MatDialog,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.resaltarEnlace();
    this.cargarFormularios();
    this.cargarSelects();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /** --------------------------
   *  Métodos de alerta genérica
   *  -------------------------- */
  abrirModalAlerta(mensaje: string): void {
    this.dialog.open(ModalAlertaComponent, {
      width: '400px',
      data: { mensaje }
    });
  }

  private alertCampo(field: string): void {
    this.dialog.open(ModalAlertaComponent, {
      width: '400px',
      data: { field }
    });
  }

  /** --------------------------
   *  Carga de datos inicial
   *  -------------------------- */
  private cargarFormularios(): void {
    this.subs.add(
      this.dataService.getFormActivos().subscribe({
        next: f => {
          this.itemActivo = f.item;
          this.propietarioActivo = f.propietario;
          this.telarActivo = f.telar;
          this.supervisorActivo = f.supervisor;
          this.eficienciaActivo = f.eficiencia;
          this.roturaUridoActivo = f.roturaUrido;
          this.roturaTramaActivo = f.roturaTrama;
          this.metrosProducidosActivo = f.metrosProducidos;
          this.comentariosActivo = f.comentarios || '';
        },
        error: () => this.abrirModalAlerta('Error al cargar datos Activo')
      })
    );

    this.subs.add(
      this.dataService.getFormInactivos().subscribe({
        next: f => {
          this.itemInactivo = f.item;
          this.propietarioInactivo = f.propietario;
          this.telarInactivo = f.telar;
          this.supervisorInactivo = f.supervisor;
          this.eficienciaInactivo = f.eficiencia;
          this.roturaUridoInactivo = f.roturaUrido;
          this.roturaTramaInactivo = f.roturaTrama;
          this.metrosProducidosInactivo = f.metrosProducidos;
          this.comentariosInactivo = f.comentarios || '';
        },
        error: () => this.abrirModalAlerta('Error al cargar datos Inactivo')
      })
    );
  }

  private cargarSelects(): void {
    this.subs.add(
      this.dataService.getFormActivos().subscribe({
        next: d => {
          const arr = Array.isArray(d) ? d : [d];
          this.listaTelaresActivo = Array.from(new Set(arr.map(x => x.telar)));
          this.listaSupervisoresActivo = Array.from(new Set(arr.map(x => x.supervisor)));
        },
        error: () => this.abrirModalAlerta('Error al cargar selects Activo')
      })
    );

    this.subs.add(
      this.dataService.getFormInactivos().subscribe({
        next: d => {
          const arr = Array.isArray(d) ? d : [d];
          this.listaTelaresInactivo = Array.from(new Set(arr.map(x => x.telar)));
          this.listaSupervisoresInactivo = Array.from(new Set(arr.map(x => x.supervisor)));
        },
        error: () => this.abrirModalAlerta('Error al cargar selects Inactivo')
      })
    );
  }

  /** --------------------------
   *  Scroll y resaltado
   *  -------------------------- */
  desplazar(id: string, e: MouseEvent): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  resaltarEnlace(): void {
    const cont = document.querySelector('.contenido-pedido');
    if (!cont) return;
    const sections = cont.querySelectorAll('section');
    const links = document.querySelectorAll('.pedidocliente a');
    cont.addEventListener('scroll', () => {
      let minD = Infinity, aid = '';
      const top = cont.getBoundingClientRect().top;
      sections.forEach(s => {
        const d = Math.abs(s.getBoundingClientRect().top - top);
        if (d < minD) { minD = d; aid = s.id; }
      });
      links.forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === `#${aid}`)
      );
    });
  }

  /** --------------------------
   *  Validaciones de formulario
   *  -------------------------- */
  private validarActivo(): boolean {
    if (!this.itemActivo)             { this.alertCampo('Item'); return false; }
    if (!this.propietarioActivo)      { this.alertCampo('Propietario'); return false; }
    if (!this.telarActivo)            { this.alertCampo('Telar'); return false; }
    if (!this.supervisorActivo)       { this.alertCampo('Supervisor'); return false; }
    if (!this.eficienciaActivo)       { this.alertCampo('Eficiencia'); return false; }
    if (this.roturaUridoActivo == null)    { this.alertCampo('Rotura Urido'); return false; }
    if (this.roturaTramaActivo == null)    { this.alertCampo('Rotura Trama'); return false; }
    if (this.metrosProducidosActivo == null) { this.alertCampo('Metros Producidos'); return false; }
    return true;
  }

  private validarInactivo(): boolean {
    if (!this.itemInactivo)             { this.alertCampo('Item'); return false; }
    if (!this.propietarioInactivo)      { this.alertCampo('Propietario'); return false; }
    if (!this.telarInactivo)            { this.alertCampo('Telar'); return false; }
    if (!this.supervisorInactivo)       { this.alertCampo('Supervisor'); return false; }
    if (!this.eficienciaInactivo)       { this.alertCampo('Eficiencia'); return false; }
    if (this.roturaUridoInactivo == null)    { this.alertCampo('Rotura Urido'); return false; }
    if (this.roturaTramaInactivo == null)    { this.alertCampo('Rotura Trama'); return false; }
    if (this.metrosProducidosInactivo == null) { this.alertCampo('Metros Producidos'); return false; }
    return true;
  }

  /** --------------------------
   *  Guardar y mostrar modales
   *  -------------------------- */
  async guardarActivo(): Promise<void> {
    if (!this.validarActivo()) return;

    // 1) mostrar indicador de carga
    const loadingRef = this.dialog.open(ModalLoadingComponent, {
      width: '120px',
      disableClose: true
    });

    // 2) simula envío
    await new Promise(res => setTimeout(res, 1500));

    // 3) cierra loading
    loadingRef.close();

    // 4) modal de confirmación/aviso
    this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: { mensaje: 'Datos del formulario Activo enviados con éxito.' }
    });
  }

  async guardarInactivo(): Promise<void> {
    if (!this.validarInactivo()) return;

    const loadingRef = this.dialog.open(ModalLoadingComponent, {
      width: '120px',
      disableClose: true
    });

    await new Promise(res => setTimeout(res, 1500));
    loadingRef.close();

    this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: { mensaje: 'Datos del formulario Inactivo enviados con éxito.' }
    });
  }
}
