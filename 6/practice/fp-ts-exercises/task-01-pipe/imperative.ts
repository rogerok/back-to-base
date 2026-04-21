// Task 1: Basic pipe
// Rewrite using pipe() from fp-ts/function

function processPrice(price: number): string {
  const withTax = price * 1.2;
  const rounded = Math.round(withTax * 100) / 100;
  const formatted = `$${rounded.toFixed(2)}`;
  return formatted;
}

console.log(processPrice(9.99));   // "$11.99"
console.log(processPrice(49.5));   // "$59.40"
