# Guía de API para Días Compensatorios (CompensatoryDay)

Este documento proporciona las instrucciones para consumir la API de Días Compensatorios desde una aplicación Angular utilizando `HttpClient`.

**URL Base:** `https://[tu-api-url]/api/CompensatoryDay`


---

## 1. Modelos de Datos (Interfaces en TypeScript)

Es recomendable definir interfaces en Angular para asegurar el tipado correcto de los datos.

```typescript
// Interfaz para la respuesta paginada
export interface PaginatedList<T> {
  items: T[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Interfaz principal para un día compensatorio
export interface CompensatoryDay {
  id: number;
  employeeId: string;
  assignmentId: number;
  holidayWorkedDate: string; // formato YYYY-MM-DD
  compensatoryDayOffDate: string; // formato YYYY-MM-DD
  status: string; // 'P' (Pendiente), 'A' (Aprobado), 'R' (Rechazado), etc.
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  companyId?: string;
  employeeFullName?: string; // Nuevo: Nombre completo del empleado
  employeeArea?: string;     // Nuevo: Descripción del área del empleado
  employeeLocation?: string; // Nuevo: Nombre de la sede del empleado
}

// Interfaz para crear un nuevo registro
export interface CreateCompensatoryDay {
  employeeId: string;
  assignmentId: number;
  holidayWorkedDate: string; // formato YYYY-MM-DD
  compensatoryDayOffDate: string; // formato YYYY-MM-DD
  remarks?: string;
  companyId?: string;
}

// Interfaz para actualizar un registro
export interface UpdateCompensatoryDay {
  compensatoryDayOffDate: string; // formato YYYY-MM-DD
  status: string;
  remarks?: string;
}
```

---

## 2. Endpoints de la API

### 2.1. Listar y Filtrar Días Compensatorios

Devuelve una lista paginada de días compensatorios, con la opción de aplicar filtros.

- **Método:** `GET`
- **Endpoint:** `/api/CompensatoryDay`

#### Parámetros de Consulta (Query Params)

| Parámetro     | Tipo     | Opcional | Descripción                                                              |
|---------------|----------|----------|--------------------------------------------------------------------------|
| `pageNumber`  | `number` | Sí       | Número de la página a obtener. (Default: 1)                              |
| `pageSize`    | `number` | Sí       | Tamaño de la página. (Default: 10, Máx: 50)                              |
| `searchTerm`  | `string` | Sí       | Busca por nombre completo del empleado o número de documento.            |
| `status`      | `string` | Sí       | Filtra por el estado del registro (ej. 'P', 'A').                        |
| `startDate`   | `string` | Sí       | Filtra por fecha de inicio (`holidayWorkedDate`).                        |
| `endDate`     | `string` | Sí       | Filtra por fecha de fin (`holidayWorkedDate`).                           |
| `companyId`   | `string` | Sí       | Filtra por el ID de la compañía.                                         |

#### Ejemplo de Servicio en Angular

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CompensatoryDayService {
  private apiUrl = 'https://[tu-api-url]/api/CompensatoryDay';

  constructor(private http: HttpClient) { }

  getCompensatoryDays(params: any): Observable<PaginatedList<CompensatoryDay>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.append(key, params[key]);
      }
    });
    return this.http.get<PaginatedList<CompensatoryDay>>(this.apiUrl, { params: httpParams });
  }
}
```

### 2.2. Obtener un Día Compensatorio por ID

- **Método:** `GET`
- **Endpoint:** `/api/CompensatoryDay/{id}`

#### Ejemplo de Servicio en Angular

```typescript
// Dentro de CompensatoryDayService
getCompensatoryDayById(id: number): Observable<CompensatoryDay> {
  return this.http.get<CompensatoryDay>(`${this.apiUrl}/${id}`);
}
```

### 2.3. Crear un Nuevo Día Compensatorio

- **Método:** `POST`
- **Endpoint:** `/api/CompensatoryDay`
- **Body:** `CreateCompensatoryDay`

#### Ejemplo de Servicio en Angular

```typescript
// Dentro de CompensatoryDayService
createCompensatoryDay(data: CreateCompensatoryDay): Observable<CompensatoryDay> {
  return this.http.post<CompensatoryDay>(this.apiUrl, data);
}
```

### 2.4. Actualizar un Día Compensatorio

- **Método:** `PUT`
- **Endpoint:** `/api/CompensatoryDay/{id}`
- **Body:** `UpdateCompensatoryDay`

#### Ejemplo de Servicio en Angular

```typescript
// Dentro de CompensatoryDayService
updateCompensatoryDay(id: number, data: UpdateCompensatoryDay): Observable<void> {
  return this.http.put<void>(`${this.apiUrl}/${id}`, data);
}
```

### 2.5. Eliminar un Día Compensatorio

- **Método:** `DELETE`
- **Endpoint:** `/api/CompensatoryDay/{id}`

#### Ejemplo de Servicio en Angular

```typescript
// Dentro de CompensatoryDayService
deleteCompensatoryDay(id: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`);
}
```