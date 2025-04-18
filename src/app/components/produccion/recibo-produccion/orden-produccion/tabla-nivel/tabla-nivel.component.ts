import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tabla-nivel',
  templateUrl: './tabla-nivel.component.html',
  styleUrls: ['./tabla-nivel.component.css']
})
export class TablaNivelComponent {
  @Input() datos: any[] = [];
  @Input() nivel: number = 1;

  // control expand/collapse
  openMenus: { [level: number]: string | null } = {};

  toggleExpand(item: any, menuId: string): void {
    const isOpen = this.isOpen(this.nivel, menuId);
    item.expandido = !isOpen;
    if (!item.expandido) this.collapseSubLevels(item);
    this.toggleMenu(this.nivel, item.expandido ? menuId : null);
  }
  toggleMenu(level: number, menuName: string | null): void {
    this.openMenus[level] = menuName;
    Object.keys(this.openMenus).forEach(k => {
      if (+k > level) this.openMenus[+k] = null;
    });
  }
  isOpen(level: number, menuName: string): boolean {
    return this.openMenus[level] === menuName;
  }
  collapseSubLevels(item: any): void {
    item.expandido = false;
    item.subitems?.forEach((sub: any) => this.collapseSubLevels(sub));
  }

  // color de barra según porcentaje
  getColor(p: number): string {
    if (p < 30) return '#2196F3';
    if (p < 70) return '#FF9800';
    return '#4CAF50';
  }

  // cuenta todos los nodos hijos para rowspan
  private countDesc(item: any): number {
    let c = 0;
    if (item.subitems) {
      for (const sub of item.subitems) {
        c += 1 + this.countDesc(sub);
      }
    }
    return c;
  }
  getRowSpan(item: any): number {
    return 1 + this.countDesc(item);
  }
}
