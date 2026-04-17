export const lessOrEqual = (a: number) => (b: number) => b <= a;
export const greaterOrEqual = (a: number) => (b: number) => b >= a;
export const isPositive = (n: number) => greaterOrEqual(0)(n);

export const maxMileage = lessOrEqual(100000);
export const minYear = greaterOrEqual(2000);
export const maxYear = lessOrEqual(2026);
