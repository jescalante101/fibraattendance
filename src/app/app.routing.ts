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
        {path: 'asistencia/turno', component:TurnoComponent}



    ]},
    {path: 'login', component:LoginComponent}
    
];

export const AppRoutingProviders: any[] = [];
export const routing: ModuleWithProviders<any> = RouterModule.forRoot(appRoutes);
