// Task 4: ReadonlyArray
// Rewrite using fp-ts/ReadonlyArray and pipe
// Avoid mutation, use fp-ts array combinators

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

const products: Product[] = [
  { id: 1, name: 'Laptop',   price: 999,  category: 'electronics', inStock: true },
  { id: 2, name: 'Phone',    price: 599,  category: 'electronics', inStock: false },
  { id: 3, name: 'Desk',     price: 299,  category: 'furniture',   inStock: true },
  { id: 4, name: 'Chair',    price: 199,  category: 'furniture',   inStock: true },
  { id: 5, name: 'Tablet',   price: 449,  category: 'electronics', inStock: true },
  { id: 6, name: 'Monitor',  price: 349,  category: 'electronics', inStock: false },
];

// Get names of in-stock electronics sorted by price ascending
function getAvailableElectronicsNames(items: Product[]): string[] {
  const electronics = items.filter(
    p => p.category === 'electronics' && p.inStock
  );
  const sorted = electronics.sort((a, b) => a.price - b.price);
  return sorted.map(p => p.name);
}

// Get total price of all in-stock items
function getTotalStockValue(items: Product[]): number {
  let total = 0;
  for (const item of items) {
    if (item.inStock) {
      total += item.price;
    }
  }
  return total;
}

// Group products by category
function groupByCategory(items: Product[]): Record<string, Product[]> {
  const result: Record<string, Product[]> = {};
  for (const item of items) {
    if (!result[item.category]) {
      result[item.category] = [];
    }
    result[item.category].push(item);
  }
  return result;
}

console.log(getAvailableElectronicsNames(products)); // ['Tablet', 'Laptop']
console.log(getTotalStockValue(products));           // 1946
console.log(groupByCategory(products));
