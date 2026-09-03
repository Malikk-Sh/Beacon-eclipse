export type EnergySystemName = 'bridge' | 'warehouse' | 'lights' | 'pumps';

export interface EnergySystemDefinition {
  id: EnergySystemName;
  label: string;
  cost: number;
}

export class EnergySystem {
  readonly capacity = 8;
  readonly definitions: EnergySystemDefinition[] = [
    { id: 'bridge', label: 'ГЛАВНЫЙ МОСТ', cost: 6 },
    { id: 'warehouse', label: 'СКЛАД 04', cost: 4 },
    { id: 'lights', label: 'ОСВЕЩЕНИЕ ПОРТА', cost: 2 },
    { id: 'pumps', label: 'НАСОСЫ', cost: 5 },
  ];

  private readonly active = new Set<EnergySystemName>();
  onChange?: (system: EnergySystemName, enabled: boolean) => void;
  onInsufficientPower?: () => void;

  toggle(system: EnergySystemName) {
    const definition = this.definitions.find((item) => item.id === system);
    if (!definition) return false;

    if (this.active.has(system)) {
      this.active.delete(system);
      this.onChange?.(system, false);
      return true;
    }

    if (this.used + definition.cost > this.capacity) {
      this.onInsufficientPower?.();
      return false;
    }

    this.active.add(system);
    this.onChange?.(system, true);
    return true;
  }

  isActive(system: EnergySystemName) {
    return this.active.has(system);
  }

  get used() {
    return this.definitions.reduce((sum, item) => sum + (this.active.has(item.id) ? item.cost : 0), 0);
  }

  get available() {
    return this.capacity - this.used;
  }
}
