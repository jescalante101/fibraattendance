import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CompaniResponse } from '../models/compania-reponse.model';
import { PlanillaResponse } from '../models/planilla-response.model';
import { PeriodoResponse } from '../models/periodo-response.model';

export interface HeaderConfig {
  selectedEmpresa: CompaniResponse | null;
  selectedPlanilla: PlanillaResponse | null;
  selectedAno: string;
  selectedPeriodo: PeriodoResponse | null;
}

@Injectable({
  providedIn: 'root'
})
export class HeaderConfigService {
  private readonly STORAGE_KEY = 'fibra_header_config';
  
  // BehaviorSubject para notificar cambios en la configuración
  private headerConfigSubject = new BehaviorSubject<HeaderConfig | null>(null);
  public headerConfig$ = this.headerConfigSubject.asObservable();

  constructor() { 
    // Cargar configuración inicial
    const initialConfig = this.loadHeaderConfig();
    this.headerConfigSubject.next(initialConfig);
  }

  /**
   * Guarda la configuración del header en localStorage
   */
  saveHeaderConfig(config: HeaderConfig): void {
    try {
      const configToSave = {
        selectedEmpresa: config.selectedEmpresa,
        selectedPlanilla: config.selectedPlanilla,
        selectedAno: config.selectedAno,
        selectedPeriodo: config.selectedPeriodo,
        timestamp: new Date().getTime()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configToSave));
      
      // Notificar a todos los subscribers sobre el cambio
      this.headerConfigSubject.next(config);
    } catch (error) {
      console.error('Error al guardar configuración del header:', error);
    }
  }

  /**
   * Carga la configuración del header desde localStorage
   */
  loadHeaderConfig(): HeaderConfig | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        return null;
      }

      const config = JSON.parse(saved);
      
      // Verificar que la configuración no sea muy antigua (opcional - 30 días)
      const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
      if (config.timestamp && config.timestamp < thirtyDaysAgo) {
        this.clearHeaderConfig();
        return null;
      }

      return {
        selectedEmpresa: config.selectedEmpresa,
        selectedPlanilla: config.selectedPlanilla,
        selectedAno: config.selectedAno,
        selectedPeriodo: config.selectedPeriodo
      };
    } catch (error) {
      console.error('Error al cargar configuración del header:', error);
      return null;
    }
  }

  /**
   * Limpia la configuración del header
   */
  clearHeaderConfig(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error al limpiar configuración del header:', error);
    }
  }

  /**
   * Guarda solo la empresa seleccionada
   */
  saveSelectedEmpresa(empresa: CompaniResponse | null): void {
    const currentConfig = this.loadHeaderConfig() || {
      selectedEmpresa: null,
      selectedPlanilla: null,
      selectedAno: '',
      selectedPeriodo: null
    };
    
    currentConfig.selectedEmpresa = empresa;
    this.saveHeaderConfig(currentConfig);
  }

  /**
   * Obtiene la configuración actual como Observable
   */
  getHeaderConfig$(): Observable<HeaderConfig | null> {
    return this.headerConfig$;
  }

  /**
   * Obtiene la configuración actual de forma síncrona
   */
  getCurrentHeaderConfig(): HeaderConfig | null {
    return this.headerConfigSubject.value;
  }

  /**
   * Guarda solo la planilla seleccionada
   */
  saveSelectedPlanilla(planilla: PlanillaResponse | null): void {
    const currentConfig = this.loadHeaderConfig() || {
      selectedEmpresa: null,
      selectedPlanilla: null,
      selectedAno: '',
      selectedPeriodo: null
    };
    
    currentConfig.selectedPlanilla = planilla;
    this.saveHeaderConfig(currentConfig);
  }

  /**
   * Guarda solo el año seleccionado
   */
  saveSelectedAno(ano: string): void {
    const currentConfig = this.loadHeaderConfig() || {
      selectedEmpresa: null,
      selectedPlanilla: null,
      selectedAno: '',
      selectedPeriodo: null
    };
    
    currentConfig.selectedAno = ano;
    this.saveHeaderConfig(currentConfig);
  }

  /**
   * Guarda solo el periodo seleccionado
   */
  saveSelectedPeriodo(periodo: PeriodoResponse | null): void {
    const currentConfig = this.loadHeaderConfig() || {
      selectedEmpresa: null,
      selectedPlanilla: null,
      selectedAno: '',
      selectedPeriodo: null
    };
    
    currentConfig.selectedPeriodo = periodo;
    this.saveHeaderConfig(currentConfig);
  }
}