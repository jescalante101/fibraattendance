import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule }  from '@angular/forms';
import { HttpClient, provideHttpClient, withInterceptorsFromDi }  from '@angular/common/http';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { routing } from './app.routing';
import { InicioComponent } from './components/inicio/inicio.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LoginComponent } from './components/login/login.component';
import { NgxTinymceModule } from 'ngx-tinymce';
import { ConfigComponent } from './components/config/config.component';
import { TableComponent } from './components/table/table.component';

import { FilterOrdenesPipe } from './filter-ordenes.pipe';
import { NgxPaginationModule } from 'ngx-pagination';
import { GanttModule } from '@syncfusion/ej2-angular-gantt';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs'; // Importar MatTabsModule
import { MatButtonModule } from '@angular/material/button'; // Para botones
import { MatFormFieldModule } from '@angular/material/form-field'; // Para formularios
import { MatSelectModule } from '@angular/material/select';
import { InvLecturaComponent } from './components/modal/inv-lectura/inv-lectura.component';

import { ModalComponent } from './shared/modal/modal.component'; // Para selects
import { SharedModule } from './shared/shared.module';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { DispositivoComponent } from './components/dispositivo/dispositivo.component';
import { PersonalComponent } from './components/personal/organizacion/empresa/personal.component';
import { AsistenciaComponent } from './components/asistencia/asistencia/asistencia.component';
import { DepartamentoComponent } from './components/personal/organizacion/departamento/departamento.component';
import { MarcacionesComponent } from './components/dispositivo/marcaciones/marcaciones.component';
import { AreaComponent } from './components/personal/organizacion/area/area.component';
import { TerminalSyncComponent } from './components/modal/terminal-sync/terminal-sync.component';
import { ModalLoadingComponent } from './shared/modal-loading/modal-loading.component';
import { CargoComponent } from './components/personal/organizacion/cargo/cargo.component';
import { EmpleadoComponent } from './components/personal/empleado/empleado/empleado.component';

import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { CeseComponent } from './components/personal/empleado/cese/cese.component';
import { HorarioComponent } from './components/asistencia/horarios/horario/horario.component';
import { TurnoComponent } from './components/asistencia/horarios/turno/turno.component';
import { ThorassemanalComponent } from './components/asistencia/horarios/turno/thorassemanal/thorassemanal.component';
import { ModalNuevoTurnoComponent } from './components/asistencia/horarios/turno/modal-nuevo-turno/modal-nuevo-turno.component';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; 
import { DescansoComponent } from './components/asistencia/horarios/descanso/descanso.component';
import { NuevoHorarioComponent } from './components/asistencia/horarios/horario/nuevo-horario/nuevo-horario.component';
import { ModalConfirmComponent } from './shared/modal-confirm/modal-confirm.component';
import { NuevoDescansoComponent } from './components/asistencia/horarios/descanso/nuevo-descanso/nuevo-descanso.component';
import { CustomHeaderComponent } from './components/sidebar/custom-header/custom-header.component';
import { AsignarHorarioEmpleadoComponent } from './components/personal/empleado/asignar-horario-empleado/asignar-horario-empleado.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AsignarTurnoMasivoComponent } from './components/personal/empleado/asignar-turno-masivo/asignar-turno-masivo.component';
import {MatStepperModule} from '@angular/material/stepper';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatRadioModule} from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import { AppUserComponent } from './components/personal/organizacion/app-user/app-user.component';
import { SedeAreaCostoComponent } from './components/personal/organizacion/sede-area-costo/sede-area-costo.component';
import { AddNewSacComponent } from './components/personal/organizacion/sede-area-costo/add-new-sac/add-new-sac.component';
import { UsuarioSedeComponent } from './components/personal/organizacion/usuario-sede/usuario-sede.component';
import { SedeCcostoComponent } from './components/personal/organizacion/sede-ccosto/sede-ccosto.component';
import { IclockTransactionComponent } from './components/personal/empleado/iclock-transaction/iclock-transaction.component';
import { MatBadgeModule } from '@angular/material/badge';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { SpanishPaginatorIntl } from './spanish-paginator-intl.service';
import { MarcacionManualComponent } from './components/asistencia/aprobaciones/marcacion-manual/marcacion-manual.component';
import { NuevaMarcacionManualComponent } from './components/asistencia/aprobaciones/marcacion-manual/nueva-marcacion-manual/nueva-marcacion-manual.component';
import { EditarMarcionManualComponent } from './components/asistencia/aprobaciones/marcacion-manual/editar-marcion-manual/editar-marcion-manual.component';
import { AnalisisMarcacionesComponent } from './components/asistencia/marcaciones/analisis-marcaciones/analisis-marcaciones.component';
import { ReporteAsistenciaExcelComponent } from './components/asistencia/marcaciones/reporte-asistencia-excel/reporte-asistencia-excel.component';
import { ConfigCatalogosComponent } from './components/asistencia/marcaciones/reportes-excel/config-catalogos/config-catalogos.component';
import { ReporteCentroCostosComponent } from './components/asistencia/marcaciones/reportes-excel/reporte-centro-costos/reporte-centro-costos.component';
import { ReporteAsistenciaMensualComponent } from './components/asistencia/marcaciones/reportes-excel/reporte-asistencia-mensual/reporte-asistencia-mensual.component';
import { ReporteMarcacionesDetalleComponent } from './components/asistencia/marcaciones/reportes-excel/reporte-marcaciones-detalle/reporte-marcaciones-detalle.component';
import { ModalVerHorarioComponent } from './components/personal/empleado/asignar-horario-empleado/modal-ver-horario/modal-ver-horario.component';
import { ModalEditarAsignacionComponent } from './components/personal/empleado/asignar-horario-empleado/modal-editar-asignacion/modal-editar-asignacion.component';
import { ModalRegistrarExcepcionComponent } from './components/personal/empleado/asignar-horario-empleado/modal-registrar-excepcion/modal-registrar-excepcion.component';
registerLocaleData(localeEs);
@NgModule({ declarations: [
        AppComponent,
        LoginComponent,
        ConfigComponent,
        InicioComponent,
        SidebarComponent,
        TableComponent,
        FilterOrdenesPipe,
        InvLecturaComponent,
        ModalComponent,
        // 🔥 Aquí ya NO pongas ModalAlertaComponent
        PersonalComponent,
        DepartamentoComponent,
        AreaComponent,
        CargoComponent,
        EmpleadoComponent,
        CeseComponent,
        DispositivoComponent,
        MarcacionesComponent,
        TerminalSyncComponent,
        AsistenciaComponent,
        DescansoComponent,
        HorarioComponent,
        TurnoComponent,
        NuevoHorarioComponent,
        ThorassemanalComponent,
        ModalNuevoTurnoComponent,
        NuevoDescansoComponent,
        CustomHeaderComponent,
        AsignarHorarioEmpleadoComponent,
        AsignarTurnoMasivoComponent,
        AppUserComponent,
        SedeAreaCostoComponent,
        AddNewSacComponent,
        UsuarioSedeComponent,
        SedeCcostoComponent,
        IclockTransactionComponent,
        MarcacionManualComponent,
        NuevaMarcacionManualComponent,
        EditarMarcionManualComponent,
        AnalisisMarcacionesComponent,
        ReporteAsistenciaExcelComponent,
        ConfigCatalogosComponent,
        ReporteCentroCostosComponent,
        ReporteAsistenciaMensualComponent,
        ReporteMarcacionesDetalleComponent,
        ModalVerHorarioComponent,
        ModalEditarAsignacionComponent,
        ModalRegistrarExcepcionComponent,
    ],
    exports: [
        TerminalSyncComponent,
        ModalLoadingComponent,
        ThorassemanalComponent,
        ModalNuevoTurnoComponent,
        NuevoHorarioComponent,
        ModalConfirmComponent,
        NuevoDescansoComponent,
        CustomHeaderComponent
    ],
    bootstrap: [AppComponent], imports: [
        MatDatepickerModule,
        MatBadgeModule,
        MatStepperModule,
        MatProgressSpinnerModule,
        MatNativeDateModule,
        MatTableModule,
        SharedModule, // 🔥 Aquí sí, aquí se importa todo lo de shared
        BrowserModule,
        AppRoutingModule,
        FormsModule,
        MatMenuModule,
        routing,
        MatCheckboxModule,
        MatIconModule,
        MatInputModule,
        MatCardModule,
        NgxPaginationModule,
        MatDialogModule,
        GanttModule,
        MatTabsModule,
        MatButtonModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatSelectModule,
        MatRadioModule,
        MatSnackBarModule,
        
        NgxTinymceModule.forRoot({
            baseURL: '../../../assets/tinymce/'
        }),
        BrowserAnimationsModule,
        MatSlideToggleModule,
        ReactiveFormsModule,
        MatTooltipModule
    ], providers: [
        provideHttpClient(withInterceptorsFromDi()),
        { provide: LOCALE_ID, useValue: 'es' },
        { provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl }
    ] })
export class AppModule { }
