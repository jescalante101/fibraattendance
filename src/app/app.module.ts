import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { FlatpickrModule } from 'angularx-flatpickr';
import { CommonModule } from '@angular/common';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { routing } from './app.routing';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LoginComponent } from './components/login/login.component';
import { NgxTinymceModule } from 'ngx-tinymce';

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
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
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
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppUserComponent } from './components/personal/organizacion/app-user/app-user.component';
import { UserFormModalComponent } from './components/personal/organizacion/app-user/user-form-modal/user-form-modal.component';
import { UserPermissionsModalComponent } from './components/personal/organizacion/app-user/user-permissions-modal/user-permissions-modal.component';
import { UserSiteFormModalComponent } from './components/personal/organizacion/usuario-sede/user-site-form-modal/user-site-form-modal.component';
import { SedeCcostoFormModalComponent } from './components/personal/organizacion/sede-ccosto/sede-ccosto-form-modal/sede-ccosto-form-modal.component';
import { SedeAreaCostoComponent } from './components/personal/organizacion/sede-area-costo/sede-area-costo.component';
import { AddNewSacComponent } from './components/personal/organizacion/sede-area-costo/add-new-sac/add-new-sac.component';
import { UsuarioSedeComponent } from './components/personal/organizacion/usuario-sede/usuario-sede.component';
import { SedeCcostoComponent } from './components/personal/organizacion/sede-ccosto/sede-ccosto.component';
import { IclockTransactionComponent } from './components/personal/empleado/iclock-transaction/iclock-transaction.component';
import { MatBadgeModule } from '@angular/material/badge';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { SpanishPaginatorIntl } from './spanish-paginator-intl.service';
import { MarcacionManualComponent } from './components/asistencia/aprobaciones/marcacion-manual/marcacion-manual.component';
import { NuevaMarcacionManualComponent } from './components/asistencia/aprobaciones/marcacion-manual/nueva-marcacion-manual/nueva-marcacion-manual.component';
import { EditarMarcionManualComponent } from './components/asistencia/aprobaciones/marcacion-manual/editar-marcion-manual/editar-marcion-manual.component';
import { AnalisisMarcacionesComponent } from './components/asistencia/marcaciones/analisis-marcaciones/analisis-marcaciones.component';
import { ModalRegistrarMarcacionComponent } from './components/asistencia/marcaciones/analisis-marcaciones/modal-registrar-marcacion/modal-registrar-marcacion.component';
import { ReporteAsistenciaExcelComponent } from './components/asistencia/marcaciones/reporte-asistencia-excel/reporte-asistencia-excel.component';
import { ReporteCentroCostosComponent } from './components/asistencia/marcaciones/reportes-excel/reporte-centro-costos/reporte-centro-costos.component';
import { ReporteAsistenciaMensualComponent } from './components/asistencia/marcaciones/reportes-excel/reporte-asistencia-mensual/reporte-asistencia-mensual.component';
import { ReporteMarcacionesDetalleComponent } from './components/asistencia/marcaciones/reportes-excel/reporte-marcaciones-detalle/reporte-marcaciones-detalle.component';
import { ModalVerHorarioComponent } from './components/personal/empleado/asignar-horario-empleado/modal-ver-horario/modal-ver-horario.component';
import { ModalEditarAsignacionComponent } from './components/personal/empleado/asignar-horario-empleado/modal-editar-asignacion/modal-editar-asignacion.component';
import { ModalRegistrarExcepcionComponent } from './components/personal/empleado/asignar-horario-empleado/modal-registrar-excepcion/modal-registrar-excepcion.component';
import { LucideAngularModule, Building, MapPin, CalendarDays, Calendar, Users, IdCard, Clock, CheckSquare, FileText, Settings, User, LogOut, ChevronRight, ChevronDown, ChevronLeft, ChevronUp, Layers, Menu, Info, FileSpreadsheet, Search, RefreshCw, Save, Plus, X, AlertCircle, UserPen, UserPlus, Table, Edit, Trash2, CheckCircle, XCircle, Eye, EyeOff, Play, Square, ArrowRight, Timer, Zap, Hand, BarChart3, Database, Download, Filter, CalendarRange, LogIn, LogOut as LogOutIcon, Columns, Globe, Coffee, Badge, Group, FileEdit, ClipboardList, Check, PlusCircle, Star, TrendingUp, SearchX, CalendarX, RefreshCcw, AlertTriangle, HelpCircle, RotateCw, ShieldX, Mail, Shield, UserCheck, Lock, UserCheck2, ShieldCheck, Folder, Building2, ArrowRightLeft, Target, CalendarPlus, Send } from 'lucide-angular';
import { ReporteAsistenciaComponent } from './components/asistencia/reportes/reporte-asistencia/reporte-asistencia.component';
import { HolidaysComponent } from './components/asistencia/holidays/holidays.component';
import { NoPermissionsComponent } from './components/no-permissions/no-permissions.component';
import { PersonalTransferComponent } from './components/personal/transferencias/personal-transfer.component';
import { TransferModalComponent } from './components/personal/transferencias/transfer-modal/transfer-modal.component';
import { MassiveTransferModalComponent } from './components/personal/transferencias/massive-transfer-modal/massive-transfer-modal.component';
import { AgGridModule } from 'ag-grid-angular';
import { ModuleRegistry, AllCommunityModule, GridOptions } from 'ag-grid-community';
import { AG_GRID_LOCALE_ES } from './ag-grid-locale.es';

// Registrar módulos de AG-Grid globalmente
ModuleRegistry.registerModules([AllCommunityModule]);
registerLocaleData(localeEs);

@NgModule({
    declarations: [
        AppComponent,
        LoginComponent,
        SidebarComponent,
        FilterOrdenesPipe,
        InvLecturaComponent,
        ModalComponent,
        ToastContainerComponent,
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
        UserFormModalComponent,
        UserPermissionsModalComponent,
        UserSiteFormModalComponent,
        SedeCcostoFormModalComponent,
        SedeAreaCostoComponent,
        AddNewSacComponent,
        UsuarioSedeComponent,
        SedeCcostoComponent,
        IclockTransactionComponent,
        MarcacionManualComponent,
        NuevaMarcacionManualComponent,
        EditarMarcionManualComponent,
        AnalisisMarcacionesComponent,
        ModalRegistrarMarcacionComponent,
        ReporteAsistenciaExcelComponent,
        ReporteCentroCostosComponent,
        ReporteAsistenciaMensualComponent,
        ReporteMarcacionesDetalleComponent,
        ModalVerHorarioComponent,
        ModalEditarAsignacionComponent,
        ModalRegistrarExcepcionComponent,
        ReporteAsistenciaComponent,
        HolidaysComponent,
        NoPermissionsComponent,
        PersonalTransferComponent,
        TransferModalComponent,
        MassiveTransferModalComponent,


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
        FlatpickrModule.forRoot(),
        CommonModule,
        MatDatepickerModule,
        MatBadgeModule,
        ScrollingModule,
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
        ScrollingModule,
        NgxTinymceModule.forRoot({
            baseURL: '../../../assets/tinymce/'
        }),
        BrowserAnimationsModule,
        MatSlideToggleModule,
        ReactiveFormsModule,
        MatTooltipModule,
        AgGridModule,
        LucideAngularModule.pick({
            Building,
            MapPin,
            CalendarDays,
            Calendar, Users,
            IdCard,
            Clock, CheckSquare,
            FileText, Settings,
            User, LogOut,
            ChevronRight,
            ChevronDown,
            ChevronLeft,
            ChevronUp,
            Layers,
            Menu, Info,
            FileSpreadsheet,
            Search,
            RefreshCw,
            Save,
            Plus,
            X,
            AlertCircle,
            UserPen,
            UserPlus,
            Table,
            Edit,
            Trash2,
            CheckCircle,
            XCircle,
            Eye,
            EyeOff,
            Play,
            Square,
            ArrowRight,
            Timer,
            Zap,
            Hand,
            BarChart3,
            Database,
            Download,
            Filter,
            CalendarRange,
            LogIn,
            LogOutIcon,
            Columns,
            Globe,
            Coffee,
            Badge,
            Group,
            FileEdit,
            ClipboardList,
            Check,
            PlusCircle,
            Star,
            TrendingUp,
            SearchX,
            CalendarX,
            RefreshCcw,
            AlertTriangle,
            HelpCircle,
            UserCheck,
            UserCheck2,
            Lock,
            RotateCw,
            ShieldX,
            Mail,
            Shield,
            ShieldCheck,
            Folder,
            Building2,
            ArrowRightLeft,
            Target,
            CalendarPlus,
            Send,
            

        })
    ], providers: [
        provideHttpClient(withInterceptorsFromDi()),
        { provide: LOCALE_ID, useValue: 'es' },
        {
            provide: 'gridOptions', // Provide GridOptions using a string token
            useFactory: () => ({ // Use a factory to create the GridOptions object
                localeText: AG_GRID_LOCALE_ES,
                pagination: true,
                paginationPageSize: 30,
            }),
        },
        { provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ]
})
export class AppModule { }
