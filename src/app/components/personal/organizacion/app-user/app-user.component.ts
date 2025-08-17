import { Component, OnInit } from '@angular/core';
import { AppUserService, User } from 'src/app/core/services/app-user.services';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { UserFormModalComponent, UserFormResult, UserData } from './user-form-modal/user-form-modal.component';
import { UserPermissionsModalComponent, UserPermissionsResult } from './user-permissions-modal/user-permissions-modal.component';
import { UpdateAppUser, CreateAppUser } from 'src/app/core/models/app-user.model';
import { ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { localeTextFiori } from 'src/app/shared/ag-grid-theme-fiori';

// Interfaz para tipos de Toast
interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Component({
  selector: 'app-app-user',
  templateUrl: './app-user.component.html',
  styleUrls: ['./app-user.component.css']
})
export class AppUserComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = false;
  searchTerm = '';
  
  // AG-Grid Configuration
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {};
  gridApi: any = null;
  loadingOverlayComponent: any = null;
  noRowsOverlayComponent: any = null;

  // Usuario logueado
  usernameLogueado: string = '';


  constructor(
    private appUserService: AppUserService,
    private dialog: MatDialog,
    private modalService: ModalService,
    private authService: AuthService,
    private toastService: ToastService

  ) { }

  ngOnInit() {
    this.setupAgGrid();
    this.loadUsers();
    this.loadCurrentUser();
  }

  exportToExcel() {
    if (!this.gridApi) {
      this.toastService.error('Error', 'La tabla no está lista para exportar.');
      return;
    }

    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'Usuarios': worksheet }, SheetNames: ['Usuarios'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_usuarios');
  }

  private getGridDataForExport(): any[] {
    const data: any[] = [];
    // We iterate through all nodes, including those not currently visible due to pagination
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      data.push({
        'Usuario': node.data.userName,
        'Nombre': node.data.firstName,
        'Apellido': node.data.lastName,
        'Email': node.data.email,
        'Estado': node.data.isActive ? 'Activo' : 'Inactivo',
        'Creado': this.formatDate(node.data.createdAt),
        'Actualizado': this.formatDate(node.data.updatedAt)
      });
    });
    return data;
  }

  private styleExcelSheet(worksheet: XLSX.WorkSheet) {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0A6ED1" } }, // Fiori Primary
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Usuario
      { wch: 20 }, // Nombre
      { wch: 20 }, // Apellido
      { wch: 30 }, // Email
      { wch: 10 }, // Estado
      { wch: 18 }, // Creado
      { wch: 18 }  // Actualizado
    ];
    worksheet['!cols'] = columnWidths;

    // Apply style to header
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:G1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[address]) {
        worksheet[address].s = headerStyle;
      }
    }
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + '.xlsx');
    this.toastService.success('Éxito', 'El reporte de usuarios ha sido exportado a Excel.');
  }

  exportToPdf() {
    if (!this.gridApi) {
      this.toastService.error('Error', 'La tabla no está lista para exportar.');
      return;
    }

    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const doc = new jsPDF();
    const head = [['Usuario', 'Nombre', 'Apellido', 'Email', 'Estado', 'Creado', 'Actualizado']];
    const body = dataToExport.map(row => [
      row.Usuario,
      row.Nombre,
      row.Apellido,
      row.Email,
      row.Estado,
      row.Creado,
      row.Actualizado
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Usuarios', 14, 22);

    autoTable(doc, {
      head: head,
      body: body,
      styles: {
        halign: 'center',
        fontSize: 8
      },
      headStyles: {
        fillColor: [10, 110, 209] // fiori-primary
      },
      startY: 30
    });

    doc.save('reporte_usuarios_' + new Date().getTime() + '.pdf');
    this.toastService.success('Éxito', 'El reporte de usuarios ha sido exportado a PDF.');
  }

 // cargamos el usuario logueado
 private loadCurrentUser() {
  const user = this.authService.getCurrentUser();
  if (user) {
    this.usernameLogueado = user.username;
  }

 }


  loadUsers() {
    this.loading = true;
    this.appUserService.getAllUsers().subscribe({
      next: users => {
        this.users = users;
        this.filteredUsers = [...this.users];
        this.loading = false;
      },
      error: (error) => {
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
        this.toastService.error('error', 'No se pudieron cargar los usuarios. Verifica tu conexión.');
        console.error('Error loading users:', error);
      }
    });
  }

  // Abrir modal para nuevo usuario
  openNewUserModal() {
    console.log('Abriendo modal para nuevo usuario');
    this.modalService.open({
      title: 'Nuevo Usuario',
      componentType: UserFormModalComponent,
      componentData: {
        userData: null,
        isEditMode: false
      },
      width: '600px',
    }).then((result: UserFormResult | null) => {

      console.log('✅ Resultado del modal finalmente recibido:', result);
      if (result && result.action === 'save' && result.data) {
        console.log('✅ Modal cerrado con datos válidos, creando usuario... ', result.data);
        this.createUser(result.data);
      } else {
        console.log('❌ Modal cerrado sin datos o cancelado');
      }
    }).catch((error) => {
      console.error('❌ Error en la promesa del modal:', error);
    });
  }

  // Crear usuario
  private createUser(userData: UserData) {
    console.log('Datos recibidos del modal:', userData);
    this.loading = true;
    const newUser: CreateAppUser = {
      userName: userData.userName,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      createdAt: new Date().toISOString(),
      createdBy: this.usernameLogueado,
      isActive: userData.isActive
    };

    console.log('Datos que se enviarán al API:', newUser);

    this.appUserService.addUser(newUser).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        this.toastService.success('success', `El usuario "${userData.userName}" ha sido registrado exitosamente.`);
        this.loadUsers();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error creating user:', error);
        console.error('Error details:', error.error);
        this.toastService.error('error', `Error: ${error.error?.message || error.message || 'No se pudo crear el usuario.'}`);
      }
    });
  }

  // Actualizar usuario
  private updateUser(userData: UserData) {
    if (!userData.userId) return;

    this.loading = true;
    const updatedUser: UpdateAppUser = {
      userName: userData.userName,
      email: userData.email,
      password: userData.password.length > 0 ? userData.password : null,
      firstName: userData.firstName,
      updatedAt: new Date().toISOString(),
      updatedBy: this.usernameLogueado,
      lastName: userData.lastName,
      isActive: userData.isActive
    };
    console.log('Datos que se enviarán al API:', updatedUser);
    console.log('ID del usuario a actualizar:', userData.userId);


    this.appUserService.updateUser(updatedUser, userData.userId).subscribe({
      next: _ => {
        this.toastService.success('success',  `El usuario "${userData.userName}" ha sido actualizado correctamente.`);
        this.loadUsers();
      },
      error: (error) => {
        this.loading = false;
        this.toastService.error('error', 'No se pudo actualizar el usuario. Inténtalo de nuevo.');
        console.error('Error updating user:', error);
      }
    });
  }

  editUser(user: User) {
    this.modalService.open({
      title: 'Editar Usuario',
      componentType: UserFormModalComponent,
      componentData: {
        userData: {
          userId: user.userId,
          userName: user.userName,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          password: '', // No cargar password por seguridad
          isActive: user.isActive
        },
        isEditMode: true
      },
      width: '600px',
    }).then((result: UserFormResult| null) => {
      if (result && result.action === 'save' && result.data) {
        this.updateUser(result.data);
      }
    });
  }

  deleteUser(user: User) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '350px',
      data: {
        tipo: 'danger',
        titulo: 'Eliminar usuario',
        mensaje: `¿Seguro que deseas eliminar el usuario "${user.userName}"?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appUserService.deleteUser(user.userId).subscribe({
          next: _ => {
            this.toastService.success('success', `El usuario "${user.userName}" ha sido eliminado correctamente.`);
            this.loadUsers();
          },
          error: (error) => {
            this.toastService.error('error', 'No se pudo eliminar el usuario. Inténtalo de nuevo.');
            console.error('Error deleting user:', error);
          }
        });
      }
    });
  }


  // Gestionar permisos de usuario
  managePermissions(user: User) {
    console.log('Abriendo modal de permisos para:', user);
    this.modalService.open({
      title: 'Gestionar Permisos',
      componentType: UserPermissionsModalComponent,
      componentData: {
        user: user
      },
      width: '800px',
    }).then((result: UserPermissionsResult | null) => {
      if (result && result.action === 'close') {
        console.log('Modal de permisos cerrado');
        this.toastService.success('success', `Los permisos de "${user.userName}" han sido gestionados.`);
      }
    }).catch((error) => {
      console.error('Error en el modal de permisos:', error);
      this.toastService.error('error', 'Ocurrió un error al gestionar los permisos.');
    });
  }

  // Setup AG-Grid configuration
  private setupAgGrid(): void {
    this.columnDefs = [
      {
        headerName: 'Usuario',
        field: 'userName',
        width: 150,
        cellRenderer: this.userCellRenderer,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Nombre',
        field: 'firstName',
        width: 140,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Apellido',
        field: 'lastName',
        width: 140,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Email',
        field: 'email',
        width: 200,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Estado',
        field: 'isActive',
        width: 100,
        cellRenderer: this.statusCellRenderer,
        filter: 'agSetColumnFilter'
      },
      {
        headerName: 'Creado',
        field: 'createdAt',
        width: 120,
        cellRenderer: this.createdDateCellRenderer,
        filter: 'agDateColumnFilter'
      },
      {
        headerName: 'Actualizado',
        field: 'updatedAt',
        width: 120,
        cellRenderer: this.updatedDateCellRenderer,
        filter: 'agDateColumnFilter'
      },
      {
        headerName: 'Acciones',
        width: 150,
        cellRenderer: this.actionsCellRenderer,
        sortable: false,
        filter: false,
        pinned: 'right'
      }
    ];

    this.gridOptions = {
      theme: 'legacy',
      rowHeight: 60,
      headerHeight: 45,
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100
      },
      pagination: false,
      paginationPageSize: 10,
      paginationPageSizeSelector: [10, 25, 50, 100],
      animateRows: true,
      suppressHorizontalScroll: false,
      localeText:localeTextFiori,
      onCellClicked: (event) => this.onCellClicked(event),
      onGridReady: (params) => {
        this.gridApi = params.api;
        // Ajustar columnas al contenedor para evitar espacios en blanco
        params.api.sizeColumnsToFit();
      }
    };
  }

  // Search functionality for AG-Grid
  onSearchChange() {
    if (this.gridApi) {
      this.gridApi.setGlobalFilter(this.searchTerm);
    }
  }

  // Handle cell clicks for action buttons
  onCellClicked(event: any) {
    const target = event.event.target;
    const action = target.closest('button')?.getAttribute('data-action');
    const userId = target.closest('button')?.getAttribute('data-user-id');
    
    if (action && userId) {
      const user = this.users.find(u => u.userId.toString() === userId);
      if (user) {
        switch (action) {
          case 'permissions':
            this.managePermissions(user);
            break;
          case 'edit':
            this.editUser(user);
            break;
          case 'delete':
            this.deleteUser(user);
            break;
        }
      }
    }
  }

  // Helper methods for statistics
  getActiveCount(): number {
    return this.users.filter(user => user.isActive).length;
  }

  // Formatear fecha para mostrar en la tabla
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // TrackBy function para mejorar rendimiento
  trackByUserId(index: number, user: User): number {
    return user.userId;
  }




  // Método para enfocar el input del formulario (ahora abre el modal)
  focusUserNameInput() {
    this.openNewUserModal();
  }

  // Cell Renderers personalizados para AG-Grid
  userCellRenderer = (params: ICellRendererParams) => {
    const user = params.data;
    return `
      <div class="flex items-center h-full py-2">
        <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center mr-3">
          <svg class="w-4 h-4 text-fiori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <div>
          <div class="text-sm font-medium text-fiori-text">${user.userName}</div>
          <div class="text-xs text-fiori-subtext">ID: ${user.userId}</div>
        </div>
      </div>
    `;
  };

  createdDateCellRenderer = (params: ICellRendererParams) => {
    const date = params.data.createdAt;
    if (!date) return '<span class="text-fiori-subtext">-</span>';
    return `<span class="text-sm text-fiori-text">${this.formatDate(date)}</span>`;
  };

  updatedDateCellRenderer = (params: ICellRendererParams) => {
    const date = params.data.updatedAt;
    if (!date) return '<span class="text-fiori-subtext">-</span>';
    return `<span class="text-sm text-fiori-text">${this.formatDate(date)}</span>`;
  };

  statusCellRenderer = (params: ICellRendererParams) => {
    const user = params.data;
    if (user.isActive) {
      return `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          Activo
        </span>
      `;
    } else {
      return `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          Inactivo
        </span>
      `;
    }
  };

  actionsCellRenderer = (params: ICellRendererParams) => {
    const user = params.data;
    return `
      <div class="flex items-center justify-end space-x-2 h-full">
        <button 
          data-action="permissions" 
          data-user-id="${user.userId}"
          class="inline-flex items-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors" 
          title="Gestionar permisos">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
        </button>
        <button 
          data-action="edit" 
          data-user-id="${user.userId}"
          class="inline-flex items-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors" 
          title="Editar usuario">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button 
          data-action="delete" 
          data-user-id="${user.userId}"
          class="inline-flex items-center p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" 
          title="Eliminar usuario">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `;
  };
}
