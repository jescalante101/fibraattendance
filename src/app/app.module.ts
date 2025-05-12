import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule }  from '@angular/forms';
import { HttpClient,HttpClientModule }  from '@angular/common/http';


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



@NgModule({
  declarations: [

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


    DispositivoComponent,
    MarcacionesComponent,

    AsistenciaComponent,
  

  ],
  imports: [
    SharedModule, // 🔥 Aquí sí, aquí se importa todo lo de shared
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    MatMenuModule,
    routing,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    MatCardModule,
    NgxPaginationModule,
    GanttModule,
    MatTabsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxTinymceModule.forRoot({
      baseURL : '../../../assets/tinymce/'
    }),
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
