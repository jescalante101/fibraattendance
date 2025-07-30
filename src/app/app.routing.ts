import { Routes, RouterModule } from "@angular/router";

import { ModuleWithProviders } from "@angular/core";
import { LoginComponent } from "./components/login/login.component";

import { DispositivoComponent } from "./components/dispositivo/dispositivo.component";
import { PersonalComponent } from "./components/personal/organizacion/empresa/personal.component";
import { AsistenciaComponent } from "./components/asistencia/asistencia/asistencia.component";
import { DepartamentoComponent } from "./components/personal/organizacion/departamento/departamento.component";
import { MarcacionesComponent } from "./components/dispositivo/marcaciones/marcaciones.component";
import { AreaComponent } from "./components/personal/organizacion/area/area.component";
import { CargoComponent } from "./components/personal/organizacion/cargo/cargo.component";
import { EmpleadoComponent } from "./components/personal/empleado/empleado/empleado.component";
import { CeseComponent } from "./components/personal/empleado/cese/cese.component";
import { HorarioComponent } from "./components/asistencia/horarios/horario/horario.component";
import { TurnoComponent } from "./components/asistencia/horarios/turno/turno.component";
import { DescansoComponent } from "./components/asistencia/horarios/descanso/descanso.component";
import { AsignarHorarioEmpleadoComponent } from "./components/personal/empleado/asignar-horario-empleado/asignar-horario-empleado.component";
import { AppUserComponent } from "./components/personal/organizacion/app-user/app-user.component";
import { SedeAreaCostoComponent } from "./components/personal/organizacion/sede-area-costo/sede-area-costo.component";
import { UsuarioSedeComponent } from "./components/personal/organizacion/usuario-sede/usuario-sede.component";
import { SedeCcostoComponent } from "./components/personal/organizacion/sede-ccosto/sede-ccosto.component";
import { MarcacionManualComponent } from "./components/asistencia/aprobaciones/marcacion-manual/marcacion-manual.component";
import { AnalisisMarcacionesComponent } from "./components/asistencia/marcaciones/analisis-marcaciones/analisis-marcaciones.component";
import { ReporteAsistenciaExcelComponent } from "./components/asistencia/marcaciones/reporte-asistencia-excel/reporte-asistencia-excel.component";
import { ConfigCatalogosComponent } from "./components/asistencia/marcaciones/reportes-excel/config-catalogos/config-catalogos.component";
import { ReporteCentroCostosComponent } from "./components/asistencia/marcaciones/reportes-excel/reporte-centro-costos/reporte-centro-costos.component";
import { ReporteAsistenciaMensualComponent } from "./components/asistencia/marcaciones/reportes-excel/reporte-asistencia-mensual/reporte-asistencia-mensual.component";
import { ReporteMarcacionesDetalleComponent } from "./components/asistencia/marcaciones/reportes-excel/reporte-marcaciones-detalle/reporte-marcaciones-detalle.component";



const appRoutes: Routes = [
    {path : '', redirectTo:'inicio', pathMatch : 'full'},
    {path:'',component:PersonalComponent,},
    {path: 'panel', children:[
       

        
        //TODO: Agregar las vistas para el panel de personal
        {path: 'personal/organizacion',component:PersonalComponent},
        {path:'personal/organizacion/app-user',component:AppUserComponent},
        {path:'personal/organizacion/sede-area-costo',component:SedeAreaCostoComponent},
        {path:'personal/organizacion/departamento',component:DepartamentoComponent},
        {path:"personal/organizacion/area",component:AreaComponent},
        {path:"personal/organizacion/cargo",component:CargoComponent},
        {path:"personal/organizacion/usuario-sede",component:UsuarioSedeComponent},
        {path:"personal/organizacion/sede-ccosto",component:SedeCcostoComponent},

        {path:'personal/empleado/empleado',component:EmpleadoComponent},
        {path:'personal/empleado/cese',component:CeseComponent},
        {path:'personal/empleado/asignar-horario',component:AsignarHorarioEmpleadoComponent},

        //TODO:agregar las vistas para el panel de los dispositivos
        {path: 'dispositivo',component: DispositivoComponent},
        {path:'dispositivo/marcaciones',component:MarcacionesComponent},
        
        //TODO: Agregar las vistas para el panel de asistencia
        {path: 'asistencia', component:AsistenciaComponent},
        {path: 'asistencia/descansos', component:DescansoComponent},
        {path: 'asistencia/horarios', component:HorarioComponent},
        {path: 'asistencia/turno', component:TurnoComponent},
        {path:'asistencia/aprobaciones/marcacion-manual',component:MarcacionManualComponent},
        {path:'asistencia/marcaciones/analisis',component:AnalisisMarcacionesComponent},
        {path:'asistencia/marcaciones/reporte-asistencia-excel',component:ReporteAsistenciaExcelComponent},
        {path:'asistencia/marcaciones/reportes-excel/config-catalogos',component:ConfigCatalogosComponent},
        {path:'asistencia/marcaciones/reportes-excel/centro-costos',component:ReporteCentroCostosComponent},
        {path:'asistencia/marcaciones/reportes-excel/asistencia-mensual',component:ReporteAsistenciaMensualComponent},
        {path:'asistencia/marcaciones/reportes-excel/marcaciones-detalle',component:ReporteMarcacionesDetalleComponent},


    ]},
    {path: 'login', component:LoginComponent}
    
];

export const AppRoutingProviders: any[] = [];
export const routing: ModuleWithProviders<any> = RouterModule.forRoot(appRoutes);
