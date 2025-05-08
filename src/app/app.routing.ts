import { Routes, RouterModule } from "@angular/router";

import { ModuleWithProviders } from "@angular/core";
import { InicioComponent } from "./components/inicio/inicio.component";
import { LoginComponent } from "./components/login/login.component";
import { AdminGuard } from "./guards/admin.guard";
import { IndexClienteComponent } from "./components/clientes/index-cliente/index-cliente.component";
import { CreateClienteComponent } from "./components/clientes/create-cliente/create-cliente.component";
import { EditClienteComponent } from "./components/clientes/edit-cliente/edit-cliente.component";
import { CreateProductoComponent } from "./components/productos/create-producto/create-producto.component";
import { IndexProductoComponent } from "./components/productos/index-producto/index-producto.component";
import { GaleriaProductoComponent } from "./components/productos/galeria-producto/galeria-producto.component";
import { UpdateProductoComponent } from "./components/productos/update-producto/update-producto.component";
import { ConfigComponent } from "./components/config/config.component";
import { IndexDescuentoComponent } from "./components/descuento/index-descuento/index-descuento.component";
import { CreateDescuentoComponent } from "./components/descuento/create-descuento/create-descuento.component";
import { EditDescuentoComponent } from "./components/descuento/edit-descuento/edit-descuento.component";
import { OrdenProduccionComponent } from "./components/produccion/recibo-produccion/orden-produccion/orden-produccion.component";
import { PrefichaComponent } from "./components/produccion/preficha/preficha.component";
import { SeleccionarSocidadComponent } from "./components/gestion/seleccionar-socidad/seleccionar-socidad.component";
import { TipoCambioComponent } from "./components/gestion/tipo-cambio/tipo-cambio.component";
import { LecturaCodebarComponent } from "./components/inventario/despacho-ventas/lectura-codebar/lectura-codebar.component";
import { GanttProduccionComponent } from "./components/produccion/gantt-produccion/gantt-produccion.component";
import { RegistroComprasComponent } from "./components/compras/registro-compras/registro-compras.component";
import { RegistroReqComprasComponent } from "./components/socios-negocios/registro-req-compras/registro-req-compras.component";
import { IndexComponent } from "./components/inventario/data-maestro/index/index.component";
import { ReporteTurnoComponent } from "./components/produccion/reporte-turno/reporte-turno.component";
import { CrearReporteTurnoComponent } from "./components/produccion/crear-reporte-turno/crear-reporte-turno.component";
import { DispositivoComponent } from "./components/dispositivo/dispositivo.component";



const appRoutes: Routes = [
    {path : '', redirectTo:'inicio', pathMatch : 'full'},
    {path:'',component:InicioComponent,},
    {path: 'panel', children:[
        {path:'clientes',component:IndexClienteComponent,},
        {path:'clientes/registro',component:CreateClienteComponent,},
        {path:'produccion/orden-produccion',component:OrdenProduccionComponent,},
        {path: 'produccion/gantt-produccion', component:GanttProduccionComponent,},
        {path: 'clientes/:id', component: EditClienteComponent, },
        {path:'producto/registro', component:CreateProductoComponent,},
        { path: 'productos', component:IndexProductoComponent, },
        { path: 'productos/:id', component:UpdateProductoComponent,},
        {path:'productos/galeria/:id', component:GaleriaProductoComponent, },
        {path:'descuentos', component: IndexDescuentoComponent, },
        {path:'descuentos/registro', component: CreateDescuentoComponent,},
        {path:'descuentos/:id', component: EditDescuentoComponent,},
        {path:'configuraciones', component:ConfigComponent, },
        {path : 'produccion/pre-ficha', component:PrefichaComponent,},
        {path : 'gestion/seleccionar-socidad', component:SeleccionarSocidadComponent,},
        {path : 'gestion/tipo-cambio', component:TipoCambioComponent,},
        {path : 'inventario/despacho-ventas/lectura', component:LecturaCodebarComponent},
        {path : 'socios-negocios/registro-req-compras', component:RegistroReqComprasComponent},
        {path : 'inventario/data-maestro/index', component:IndexComponent},
        {path : 'produccion/reporte-turno', component:ReporteTurnoComponent},
        {path : 'produccion/crear-reporte-turno', component:CrearReporteTurnoComponent},
        {path: 'dispositivo',component: DispositivoComponent}

    ]},
    {path: 'login', component:LoginComponent}
    
];

export const AppRoutingProviders: any[] = [];
export const routing: ModuleWithProviders<any> = RouterModule.forRoot(appRoutes);
