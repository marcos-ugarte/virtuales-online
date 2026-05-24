declare module 'odometer' {
  interface OdometerOptions {
    el: HTMLElement;
    value?: number;
    format?: string;
    theme?: string;
    duration?: number;
    animation?: 'count';
  }
  class Odometer {
    constructor(options: OdometerOptions);
    update(value: number): void;
    render(value?: number): void;
  }
  export default Odometer;
}

declare module 'odometer/themes/odometer-theme-default.css';
