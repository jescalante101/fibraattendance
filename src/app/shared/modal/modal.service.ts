import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Injectable, Type } from '@angular/core';
import { ModalComponent } from './modal.component';

interface ModalConfig {
  title?: string | number;
  componentType?: Type<any>;
  componentData?: any;
  width?: string;
  height?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalRef: ComponentRef<ModalComponent> | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  open(config: ModalConfig): Promise<any> {
    return new Promise((resolve) => {
      if (this.modalRef) {
        this.close();
      }

      // Crear el componente modal
      this.modalRef = createComponent(ModalComponent, {
        environmentInjector: this.injector
      });

      // Configurar el modal
      this.modalRef.instance.title = String(config.title || '');
      this.modalRef.instance.componentType = config.componentType || null;
      this.modalRef.instance.componentData = config.componentData || {};
      this.modalRef.instance.width = config.width || '600px';
      this.modalRef.instance.height = config.height || 'auto';
      this.modalRef.instance.isOpen = true;
      
      console.log('Modal Service - Configurando width:', config.width, 'height:', config.height);

      // Suscribirse al evento de cierre
      this.modalRef.instance.closeEvent.subscribe((data?: any) => {
        resolve(data || null);
        this.close();
      });

      // Añadir al DOM
      this.appRef.attachView(this.modalRef.hostView);
      document.body.appendChild(this.modalRef.location.nativeElement);

      // Detectar cambios
      this.modalRef.changeDetectorRef.detectChanges();
    });
  }

  close() {
    if (this.modalRef) {
      this.appRef.detachView(this.modalRef.hostView);
      this.modalRef.destroy();
      this.modalRef = null;
    }
  }
}