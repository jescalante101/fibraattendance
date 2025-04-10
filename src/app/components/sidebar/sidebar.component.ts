import { Component } from '@angular/core';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false,

})

export class SidebarComponent {
  // Guarda qué menú está abierto en cada nivel
  openMenus: { [level: number]: string | null } = {};

  toggleMenu(level: number, menuName: string): void {
    if (this.openMenus[level] === menuName) {
      this.openMenus[level] = null; // Cierra el menú si ya está abierto
    } else {
      this.openMenus[level] = menuName; // Abre el nuevo menú
    }

    // Cierra todos los submenús por debajo de este nivel
    Object.keys(this.openMenus).forEach((key) => {
      const keyNum = +key;
      if (keyNum > level) {
        this.openMenus[keyNum] = null;
      }
    });
  }

  isOpen(level: number, menuName: string): boolean {
    return this.openMenus[level] === menuName;
  }
<<<<<<< HEAD

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
    toggleInformesSociosNegocios(){
      this.isInformesSocios = !this.isInformesSocios;
    }
    toggleAntiguedad(){
      this.isAntiguedad = !this.isAntiguedad;
    }
    toggleReconciliacion2(){
      this.isReconciliacion2 = !this.isReconciliacion2;
    }

=======
>>>>>>> 685210553dd1e5a8d9648e88b8924dc27075b184
}
