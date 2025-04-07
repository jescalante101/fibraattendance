import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }  from '@angular/forms';
import { HttpClient,HttpClientModule }  from '@angular/common/http';



import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { routing } from './app.routing';
import { InicioComponent } from './components/inicio/inicio.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LoginComponent } from './components/login/login.component';
import { IndexClienteComponent } from './components/clientes/index-cliente/index-cliente.component';
import { CreateClienteComponent } from './components/clientes/create-cliente/create-cliente.component';
import { EditClienteComponent } from './components/clientes/edit-cliente/edit-cliente.component';
import { CreateProductoComponent } from './components/productos/create-producto/create-producto.component';
import { NgxTinymceModule } from 'ngx-tinymce';
import { IndexProductoComponent } from './components/productos/index-producto/index-producto.component';
import { GaleriaProductoComponent } from './components/productos/galeria-producto/galeria-producto.component';
import { UpdateProductoComponent } from './components/productos/update-producto/update-producto.component';
import { ConfigComponent } from './components/config/config.component';
import { CreateDescuentoComponent } from './components/descuento/create-descuento/create-descuento.component';
import { EditDescuentoComponent } from './components/descuento/edit-descuento/edit-descuento.component';
import { IndexDescuentoComponent } from './components/descuento/index-descuento/index-descuento.component';
import { TableComponent } from './components/table/table.component';
import { OrdenProduccionComponent } from './components/produccion/recibo-produccion/orden-produccion/orden-produccion.component';
import { PrefichaComponent } from './components/produccion/preficha/preficha.component';
import { SeleccionarSocidadComponent } from './components/gestion/seleccionar-socidad/seleccionar-socidad.component';
import { TipoCambioComponent } from './components/gestion/tipo-cambio/tipo-cambio.component';
import { UsuarioComponent } from './components/gestion/definiciones/general/usuario/usuario.component';
import { OpcionesUsuarioComponent } from './components/gestion/definiciones/general/opciones-usuario/opciones-usuario.component';
import { PermisosUsuarioComponent } from './components/gestion/definiciones/general/permisos-usuario/permisos-usuario.component';
import { DatoMaestroComercialComponent } from './components/cmr/dato-maestro-comercial/dato-maestro-comercial.component';
import { ActividadComponent } from './components/cmr/actividad/actividad.component';
import { AgregarComponent } from './components/produccion/recibo-produccion/agregar/agregar.component';
import { ResumenComponent } from './components/produccion/recibo-produccion/resumen/resumen.component';
import { FilterOrdenesPipe } from './filter-ordenes.pipe';
import { LecturaCodebarComponent } from './components/inventario/despacho-ventas/lectura-codebar/lectura-codebar.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { GanttProduccionComponent } from './components/produccion/gantt-produccion/gantt-produccion.component';
import { GanttModule } from '@syncfusion/ej2-angular-gantt';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs'; // Importar MatTabsModule
import { MatButtonModule } from '@angular/material/button'; // Para botones
import { MatFormFieldModule } from '@angular/material/form-field'; // Para formularios
import { MatSelectModule } from '@angular/material/select';
import { RegistroComprasComponent } from './components/compras/registro-compras/registro-compras.component';
import { InvLecturaComponent } from './components/modal/inv-lectura/inv-lectura.component'; // Para selects


@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    SidebarComponent,
    LoginComponent,
    IndexClienteComponent,
    CreateClienteComponent,
    EditClienteComponent,
    CreateProductoComponent,
    IndexProductoComponent,
    GaleriaProductoComponent,
    UpdateProductoComponent,
    ConfigComponent,
    CreateDescuentoComponent,
    EditDescuentoComponent,
    IndexDescuentoComponent,
    TableComponent,
    OrdenProduccionComponent,
    PrefichaComponent,
    SeleccionarSocidadComponent,
    TipoCambioComponent,
    UsuarioComponent,
    OpcionesUsuarioComponent,
    PermisosUsuarioComponent,
    DatoMaestroComercialComponent,
    ActividadComponent,
    AgregarComponent,
    ResumenComponent,
    FilterOrdenesPipe,
    LecturaCodebarComponent,
    GanttProduccionComponent,
    RegistroComprasComponent,
    InvLecturaComponent,



    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    routing,
    NgxPaginationModule,
    GanttModule,
    MatTabsModule,    MatTabsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    NgxTinymceModule.forRoot({
      baseURL : '../../../assets/tinymce/'
    }),
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
