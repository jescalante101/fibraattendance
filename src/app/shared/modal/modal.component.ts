

import { Component, Input, Output, EventEmitter, ViewContainerRef, ViewChild, Type, ChangeDetectorRef, ComponentRef, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() title: string = 'Modal';
  @Input() isOpen: boolean = false;
  @Input() componentType: Type<any> | null = null;
  @Input() componentData: any = {};
  @Input() width: string = '600px';
  @Input() height: string = 'auto';
  @Output() closeEvent = new EventEmitter<void>();

  @ViewChild('dynamicContent', { read: ViewContainerRef})
  dynamicContent!: ViewContainerRef;

  private componentRef: ComponentRef<any> | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    
  ) {}

  ngAfterViewInit() {
    if (this.dynamicContent) {
      this.dynamicContent.clear();
      this.loadComponent();
    }
  }
  

  ngOnInit() {
    if (this.componentType) {
      //this.loadComponent();
    }
  }

  ngOnDestroy() {
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
    this.dynamicContent.clear();
  }

  private loadComponent() {
    if (!this.componentType) return;
    this.dynamicContent.clear();
    this.componentRef = this.dynamicContent.createComponent(this.componentType);
  
    // Pasar datos al componente dinámico
    if (this.componentData) {
      console.log('componentData',this.componentData);
      /* Object.keys(this.componentData).forEach(key => {
        this.componentRef!.instance[key] = this.componentData[key];
      }); */
      this.componentRef.instance.data = this.componentData;
    }

    // Pasar referencia del modal al componente hijo para que pueda cerrarlo
    if (this.componentRef.instance) {
      this.componentRef.instance.modalRef = this;
      this.componentRef.instance.data = this.componentData;
    }
  
    // Llamar manualmente a ngOnInit si existe
    if (typeof this.componentRef!.instance.ngOnInit === 'function') {
      this.componentRef!.instance.ngOnInit();
    }
    
    this.cdr.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['componentType'] && this.componentType) {
      this.loadComponent();
    }
  }

  closeModal() {
    this.isOpen = false;
    this.closeEvent.emit();
  }

  // Método público para cerrar el modal desde el componente hijo
  closeModalFromChild(data?: any) {
    this.isOpen = false;
    this.closeEvent.emit(data);
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
