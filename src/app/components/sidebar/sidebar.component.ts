import { Component } from '@angular/core';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false,

})
export class SidebarComponent {
  isClientesOpen = false;
  isClientesOpen2 = false;
  isVentasOpen = false; // Controlar si el submenú de Ventas está abierto
  isConsultasClientesOpen = false; // Controlar si el submenú de Consultas Clientes está abierto
  isAlmacenOpen = false; // Controlar si el submenú de Almacen está abierto
  isAuditoriaOpen = false; // Controlar si el submenú de Auditoria de Stock está abierto
  isProduccionOpen = false;
  isReportesOpen = false;  // Controla si el submenú de reportes está abierto
  isReciboProduccionOpen = false;  // Controla si el submenú de Recibo de Producción está abierto
  isGestionAlmacenamiento = false;  // Controla si el submenú de Recibo de Producción está abierto
  isDespachoVentas = false;  // Controla si el submenú de Recibo de Producción está abierto
  isPackingList = false;  // Controla si el submenú de Recibo de Producción está abierto
  isMercancia =  false;  // Controla si el submenú de reportes está abierto
  // Método para alternar la visibilidad del submenú
  isTrasladoInterno = false;  // Controla si el submenú de Recibo de Producción está abierto
  isPermisos = false;  // Controla si el submenú de Recibo de Producción está abierto
  isAutorizaciones = false;  // Controla si el submenú de Recibo de Producción está abierto
  isDashboard = false;  // Controla si el submenú de Recibo de Producción está abierto  
  isInventario = false;  // Controla si el submenú de Recibo de Producción está abierto
  isCompras = false;  // Controla si el submenú de Recibo de Producción está abierto
  isgestion = false;  // Controla si el submenú de Recibo de Producción está abierto
  isInicializaSistema = false;  // Controla si el submenú de Recibo de Producción está abierto
  isSubDefinicionOpen=  false; // Controlar si el submenú de Definición está abierto
  isSubFinanzasOpen = false; // Controlar si el submenú de Finanzas está abierto
  isSubOportunidadesOpen = false; // Controlar si el submenú de Oportunidades está abierto
  isSubVentasOpen=  false; // Controlar si el submenú de Ventas está abierto
  isSubComprasOpen =  false; // Controlar si el submenú de Compras está abierto
  isSubSocioNegociosOpen = false; // Controlar si el submenú de Socio de Negocios está abierto
  isSubGestionBancosOpen = false; // Controlar si el submenú de Gestión de Bancos está abierto
  isSubInventarioOpen = false; // Controlar si el submenú de Inventario está abierto
  isSubRecursosOpen = false; // Controlar si el submenú de Recursos está abierto
  isSubServicioOpen  = false; // Controlar si el submenú de Servicio está abierto
  isInicializacionOpen  = false; // Controlar si el submenú de Inicialización del Sistema está abierto
  issubInicializaSistema = false; // Controlar si el submenú de Inicializa Sistema está abierto  
  isSubProduccionOpen = false; // Controlar si el submenú de Producción está abierto
  isSubMantenimientoOpen  = false; // Controlar si el submenú de Mantenimiento está abierto
  isSubAutorizacionesOpen = false; // Controlar si el submenú de Autorizaciones está abierto
  isSubPropietarioDatosOpen = false; // Controlar si el submenú de Propietario de Datos está abierto
  isImportacionOpen = false; // Controlar si el submenú de Importación está abierto
  isSubCRMOpen = false; // Controlar si el submenú de CRM está abierto
  isInventarioB2 = false; // Controlar si el submenú de Inventario B2 está abierto
  isReqCompras = false; // Controlar si el submenú de Requerimiento de Compras está abierto
  isSociosNegocio = false;
  isReconciliacion = false;
  isSubReconciliacion = false;
  
  toggleClientes(): void {
    this.isClientesOpen = !this.isClientesOpen;
    
  }

  toggleClientes2(): void {
    this.isClientesOpen2 = !this.isClientesOpen2;
    
  }

  isSubMenuOpen = false; // Controlar si el submenú está abierto o cerrado

  toggleSubMenu() {
    this.isSubMenuOpen = !this.isSubMenuOpen; // Cambiar el estado cada vez que se hace clic
  }

    // Método para alternar la visibilidad del submenú de Ventas
    toggleVentas(): void {
      this.isVentasOpen = !this.isVentasOpen;
    }
  
    // Método para alternar la visibilidad del submenú de Consultas Clientes
    toggleConsultasClientes(): void {
      this.isConsultasClientesOpen = !this.isConsultasClientesOpen;
    }
  
    // Método para alternar la visibilidad del submenú de Almacen
    toggleAlmacen(): void {
      this.isAlmacenOpen = !this.isAlmacenOpen;
    }
  
    // Método para alternar la visibilidad del submenú de Auditoria de Stock
    toggleAuditoria(): void {
      this.isAuditoriaOpen = !this.isAuditoriaOpen;
    }
  
    // Método para alternar la visibilidad del submenú de Producción
    toggleProduccion(): void {
      this.isProduccionOpen = !this.isProduccionOpen;
    }
    // Método para alternar la visibilidad del submenú de Producción

    toggleReportes(): void {
      this.isReportesOpen = !this.isReportesOpen;  // Cambia el estado cada vez que se hace clic
    }
 


    // Método para alternar la visibilidad del submenú de Recibo de Producción
    toggleReciboProduccion(): void {
      this.isReciboProduccionOpen = !this.isReciboProduccionOpen;
    }

    toggleGestionAlmacenamiento(): void {
      this.isGestionAlmacenamiento = !this.isGestionAlmacenamiento;
    }


    toggleDespachoVentas(): void {
      this.isDespachoVentas = !this.isDespachoVentas;
    }


    togglePackingList(): void {
      this.isPackingList = !this.isPackingList;
    }

    toggleMercancia(): void {
      this.isMercancia = !this.isMercancia;
    }


    toggleTrasladoInterno(): void {
      this.isTrasladoInterno = !this.isTrasladoInterno;
    }


    togglePermisos(): void {
      this.isPermisos = !this.isPermisos;
    }


    toggleAuditoriaStock(): void {
      this.isAutorizaciones = !this.isAutorizaciones;
    }

    toggleDashboard(): void { 
      this.isDashboard = !this.isDashboard;
    }

    toggleInventario(): void {  
      this.isInventario = !this.isInventario;
    }

    toggleCompras(): void {
      this.isCompras = !this.isCompras;
    }



    toggleInicializaSistema(): void {
      this.isInicializaSistema = !this.isInicializaSistema;
    }

    isGestionOpen: boolean = false;
    isGeneralOpen: boolean = false;
    isDefinicionOpen: boolean = false;
  
    toggleGestion() {
      this.isGestionOpen = !this.isGestionOpen;
    }
  
    toggleGeneral() {
      this.isGeneralOpen = !this.isGeneralOpen;
    }
  
    toggleDefinicion() {
      this.isDefinicionOpen = !this.isDefinicionOpen;
    }

    toggleSubDefinicion() {
      this.isSubDefinicionOpen = !this.isSubDefinicionOpen;
    }

    toggleSubFinanzas(){
      this.isSubFinanzasOpen = !this.isSubFinanzasOpen;
    }



    toggleOportunidades(){
      this.isSubOportunidadesOpen = !this.isSubOportunidadesOpen;
    }

    togglesubVentas(){
      this.isSubVentasOpen = !this.isSubVentasOpen;
    }

    togglesubCompras(){
      this.isSubComprasOpen = !this.isSubComprasOpen;
    }


    togglesubSocioNegocios(){
      this.isSubSocioNegociosOpen = !this.isSubSocioNegociosOpen;
    }

    togglesubGestionBancos(){
      this.isSubGestionBancosOpen = !this.isSubGestionBancosOpen;
    }

    togglesubInventario(){
      this.isSubInventarioOpen = !this.isSubInventarioOpen;
    }
    togglesubRecursos(){
      this.isSubRecursosOpen = !this.isSubRecursosOpen;
    }

    togglesubServicio(){
      this.isSubServicioOpen = !this.isSubServicioOpen;
    }

    toggleInicializacionSistema(){
      this.isInicializacionOpen = !this.isInicializacionOpen;
    }

    togglesubInicializaSistema(){
      this.issubInicializaSistema = !this.issubInicializaSistema;
    }

    toggleSubProduccion(){
      this.isSubProduccionOpen = !this.isSubProduccionOpen;
    }

    toggleSubMantenimiento(){ 
      this.isSubMantenimientoOpen = !this.isSubMantenimientoOpen;
    }
    toggleSubAutorizaciones(){
      this.isSubAutorizacionesOpen = !this.isSubAutorizacionesOpen;
    }

    toggleSubPropietarioDatos(){
      this.isSubPropietarioDatosOpen = !this.isSubPropietarioDatosOpen;
    }

    toggleImportacion(){  
      this.isImportacionOpen = !this.isImportacionOpen;
    }

    toggleSubCRM(){
      this.isSubCRMOpen = !this.isSubCRMOpen;
    }
    toggleInventarioB2(){
      this.isInventarioB2 = !this.isInventarioB2;
    }

    toggleRequeCompras(){
      this.isReqCompras = !this.isReqCompras;
    }
    toggleSociosNegocio(){
      this.isSociosNegocio = !this.isSociosNegocio;
    }
    toggleReconciliacionInterna(){
      this.isReconciliacion = !this.isReconciliacion;
    }
    toggleReconciliacion(){
      this.isSubReconciliacion = !this.isSubReconciliacion;
    }

}
