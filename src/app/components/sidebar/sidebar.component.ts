import {
  Component,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements AfterViewInit {



  activeItem: string | null = "personal";

  selectItem(itemName: string) {
    this.activeItem = itemName;
    
    // Aquí puedes agregar más lógica si es necesario, como guardar el estado en un servicio, etc.
  }


  @Output() collapsedChange = new EventEmitter<boolean>();
  isCollapsed = false;

  openMenus: { [level: number]: string | null } = {};

  filtering = false;
  filterText = '';

  private menuItems: Array<{ level: number; name: string }> = [];

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const items: NodeListOf<HTMLElement> =
      this.el.nativeElement.querySelectorAll('li.nav-item');

    items.forEach((item) => {
      let lvl = 0;
      const lvlAttr = item.getAttribute('data-level');
      if (lvlAttr) {
        lvl = parseInt(lvlAttr, 10);
      } else {
        let p = item.parentElement;
        while (p && p.tagName !== 'NAV') {
          if (p.tagName === 'UL') lvl++;
          p = p.parentElement;
        }
      }

      let name = item.getAttribute('data-menu-name');
      if (!name) {
        const a = item.querySelector('a.nav-link');
        name = a?.textContent?.trim() || '';
      }

      this.menuItems.push({ level: lvl, name });
    });
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  toggleMenu(level: number, menuName: string): void {
    if (this.openMenus[level] === menuName) {
      this.openMenus[level] = null;
    } else {
      this.openMenus[level] = menuName;
    }

    Object.keys(this.openMenus).forEach((key) => {
      const k = +key;
      if (k > level) this.openMenus[k] = null;
    });
  }

  isOpen(level: number, menuName: string): boolean {
    if (this.filtering) return true;
    return this.openMenus[level] === menuName;
  }

  filtrarSidebar(valor: string): void {
    this.filterText = valor.toLowerCase().trim();
  
    const allItems: HTMLElement[] = Array.from(
      this.el.nativeElement.querySelectorAll('li.nav-item')
    );
  
    allItems.forEach((i) => i.classList.add('d-none'));
  
    if (this.filterText === '') {
      this.filtering = false;
      this.collapseAll();
      allItems.forEach((i) => i.classList.remove('d-none'));
      return;
    }
  
    this.filtering = true;
    this.collapseAll();
  
    const visibles = new Set<HTMLElement>();
    const abiertos: { [key: number]: string } = {};
  
    allItems.forEach((item) => {
      const link = item.querySelector('a.nav-link');
      const texto = link?.textContent?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
      if (texto.includes(this.filterText)) {
        visibles.add(item);
        this.agregarAncestros(item, visibles, abiertos);
      }
    });
  
    allItems.forEach((item) => {
      if (visibles.has(item)) {
        item.classList.remove('d-none');
      } else {
        item.classList.add('d-none');
      }
    });
  
    this.openMenus = { ...this.openMenus, ...abiertos };
  }
  
  

  private agregarAncestros(
    item: HTMLElement,
    visibles: Set<HTMLElement>,
    abiertos: { [key: number]: string }
  ): void {
    let actual: HTMLElement | null = item;
  
    while (actual && actual.tagName !== 'NAV') {
      if (actual.tagName === 'LI') {
        visibles.add(actual);
        const level = parseInt(actual.getAttribute('data-level') || '0', 10);
        const name = actual.getAttribute('data-menu-name');
        if (name) {
          abiertos[level] = name;
        }
      }
      actual = actual.parentElement;
    }
  }
  
  private collapseAll(): void {
    this.openMenus = {};
  }

  private expandAll(): void {
    this.menuItems.forEach((mi) => {
      this.openMenus[mi.level] = mi.name;
    });
  }

  showUserMenu = false;

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }
}
