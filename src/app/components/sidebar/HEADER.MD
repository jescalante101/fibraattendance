# Rediseño Navbar y Sidebar con Flowbite

Rediseñar el navbar y sidebar con los componentes de Flowbite como se muestra a continuación. También debe incluir la opción de hacer **dock** al sidebar y cuando se haga click o pase sobre el icono, usar el componente `data-popover` de Flowbite.

**Versión de Flowbite:** `"flowbite": "^3.1.2"`

---

## 📋 Estructura del Sidebar

```
SIDEBAR
├── Personal
│   ├── Organización
│   │   ├── Usuario
│   │   ├── Usuario-Sede
│   │   ├── Sede-Area-Ccosto
│   │   └── Sede-CCosto
│   └── Empleados
│       └── Empleados con Turnos
│
├── Asistencia
│   ├── Horario-Turno
│   │   ├── Descanso
│   │   ├── Horario
│   │   └── Turno
│   ├── Aprobaciones
│   │   └── Marcaciones Manuales
│   └── Marcaciones
│       ├── Análisis de Marcaciones
│       ├── Reporte Marcaciones
│       ├── Reporte Marcación Mensual
│       ├── Reporte Ccosto
│       └── Reporte Detalle
│
└── ─────────────────────────
    └── ⚙️ Configuración/Soporte
```

### Funcionalidades del Sidebar:
- **Navegación jerárquica** con 2 secciones principales
- **Elementos colapsibles** para subsecciones
- **Modo Dock:** Sidebar se contrae mostrando solo iconos
- **Popover al hover/click:** Cuando está en modo dock, mostrar el texto completo usando `data-popover`
- **Elemento fijo:** Configuración/Soporte en la parte inferior

---

## 🔝 Estructura del Navbar/Topbar

```
NAVBAR/TOPBAR
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Fibra Asistencia  |  [Select Empresa▼]  [Select Sede▼]  [Select Periodo▼]  |  [👤▼] │
└─────────────────────────────────────────────────────────────────────────────────┘
   │                           │                  │                │                    │
   │                           │                  │                │                    └── Avatar Dropdown:
   │                           │                  │                │                        ├── Mi Perfil
   │                           │                  │                │                        ├── Configuración
   │                           │                  │                │                        ├── ──────────
   │                           │                  │                │                        └── Cerrar Sesión
   │                           │                  │                │
   │                           │                  │                └── Periodo Dropdown:
   │                           │                  │                    ├── Enero 2025
   │                           │                  │                    ├── Febrero 2025
   │                           │                  │                    └── Marzo 2025
   │                           │                  │
   │                           │                  └── Sede Dropdown:
   │                           │                      ├── Sede Lima
   │                           │                      ├── Sede Arequipa
   │                           │                      └── Sede Cusco
   │                           │
   │                           └── Empresa Dropdown:
   │                               ├── Fibrafil S.A.
   │                               ├── Textiles del Norte
   │                               └── Confecciones Sur
   │
   └── Logo + Texto: "Fibra Asistencia" (color: #0a6ed1 - azul fiori)
```

### Funcionalidades del Navbar:
- **Logo y título:** "Fibra Asistencia" en color azul Fiori (`#0a6ed1`)
- **3 Select/Dropdown:** Empresa, Sede, Periodo (usando componentes Flowbite)
- **Avatar con dropdown:** Perfil, Configuración, Cerrar Sesión
- **Layout responsivo:** Elementos alineados horizontalmente

---

## 🎯 Componentes Flowbite a Utilizar

### Para el Sidebar:
- **Sidebar component** (`data-drawer`)
- **Accordion/Collapse** para subsecciones
- **Popover component** (`data-popover`) para modo dock
- **Button toggle** para contraer/expandir

### Para el Navbar:
- **Navbar component**
- **Dropdown component** para selects y avatar
- **Avatar component** para el usuario

---

## 🔧 Configuración Técnica

### Inicialización en Angular:
```typescript
import { initFlowbite } from 'flowbite';

ngOnInit(): void {
  initFlowbite();
}
```

### Clases CSS personalizadas a mantener:
- Tema Fiori existente
- Colores: `fiori.primary`, `fiori.secondary`, etc.
- Componentes custom: `.btn-fiori`, `.card-fiori`, `.sidebar-item`

---

## 📱 Comportamiento Responsivo(este sistema solo se usara mas en desktop)

- **Desktop:** Sidebar expandido por defecto con opcion de volverlo modo Dock
- **Tablet/Mobile:** Sidebar como overlay/drawer
- **Modo Dock:** Disponible en todas las resoluciones
- **Navbar:** Elementos se adaptan según el espacio disponible

---

## ✅ Criterios de Aceptación

1. ✅ Sidebar funcional con navegación jerárquica
2. ✅ Modo dock con popovers al hover/click
3. ✅ Navbar con 3 dropdowns funcionales
4. ✅ Avatar dropdown con opciones de usuario
5. ✅ Integración con tema Fiori existente
6. ✅ Componentes Flowbite 3.1.2 funcionando correctamente
