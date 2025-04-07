import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterOrdenes'
})
export class FilterOrdenesPipe implements PipeTransform {

  transform(ordenes: any[], search: string): any[] {
    if (!ordenes || !search) {
      return ordenes;
    }

    search = search.toLowerCase();

    return ordenes.filter(orden => {
      return (
        (orden.descripcion && orden.descripcion.toLowerCase().includes(search)) ||
        (orden.codigo && orden.codigo.toLowerCase().includes(search)) ||
        (orden.fichaTecnica && orden.fichaTecnica.toString().includes(search)) ||
        (orden.cliente && orden.cliente.toLowerCase().includes(search))
      );
    });
  }


}
