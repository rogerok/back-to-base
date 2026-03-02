/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export interface Component extends Record<string, any> {
  id?: string;
}

export type ComponentClass<T extends Component> = new (...args: any[]) => T;

export class ComponentContainer {
  private map = new Map<Function, Component>();

  add = (component: Component): void => {
    this.map.set(component.constructor, component);
  };

  get = <T extends Component>(componentClass: ComponentClass<T>) => {
    return this.map.get(componentClass) as T;
  };

  has = (componentClass: Function) => {
    return this.map.has(componentClass);
  };

  hasAll = (componentClasses: Iterable<Function>) => {
    for (const cls of componentClasses) {
      if (!this.map.has(cls)) {
        return false;
      }
    }

    return true;
  };

  delete = (componentClass: Function) => {
    this.map.delete(componentClass);
  };
}
