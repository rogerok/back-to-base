// Task 6: Either chaining
// Rewrite using Either with chain to sequence validations and transformations
// Each step can fail — compose them without nested if/else

type AppError =
  | { message: string; type: 'NotFoundError'; }
  | { message: string; type: 'ParseError'; }
  | { message: string; type: 'ValidationError'; };

interface Order {
  amount: number;
  id: number;
  status: 'cancelled' | 'paid' | 'pending';
  userId: number;
}

const orders: Order[] = [
  { amount: 250, id: 1, status: 'paid', userId: 10 },
  { amount: 80, id: 2, status: 'pending',  userId: 10 },
  { amount: 410, id: 3, status: 'cancelled', userId: 11 },
];

function parseOrderId(raw: string): AppError | number {
  const id = parseInt(raw, 10);
  if (isNaN(id)) return { message: `"${raw}" is not a valid ID`, type: 'ParseError' };
  return id;
}

function findOrder(id: number): AppError | Order {
  const order = orders.find(o => o.id === id);
  if (!order) return { message: `Order ${id} not found`, type: 'NotFoundError' };
  return order;
}

function validateOrderStatus(order: Order): AppError | Order {
  if (order.status === 'cancelled') {
    return { message: 'Cannot process a cancelled order', type: 'ValidationError' };
  }
  return order;
}

function applyDiscount(order: Order): AppError | { discount: number; order: Order; } {
  if (order.amount < 100) {
    return { message: 'Order amount too low for discount', type: 'ValidationError' };
  }
  return { discount: order.amount * 0.1, order };
}

function processOrder(rawId: string): string {
  const id = parseOrderId(rawId);
  if ('type' in id) return `Error [${id.type}]: ${id.message}`;

  const order = findOrder(id);
  if ('type' in order) return `Error [${order.type}]: ${order.message}`;

  const validated = validateOrderStatus(order);
  if ('type' in validated) return `Error [${validated.type}]: ${validated.message}`;

  const result = applyDiscount(validated);
  if ('type' in result) return `Error [${result.type}]: ${result.message}`;

  return `Order #${result.order.id} processed. Discount: $${result.discount}`;
}

console.log(processOrder('1'));   // "Order #1 processed. Discount: $25"
console.log(processOrder('2'));   // Error [ValidationError]: Order amount too low for discount
console.log(processOrder('3'));   // Error [ValidationError]: Cannot process a cancelled order
console.log(processOrder('99'));  // Error [NotFoundError]: Order 99 not found
console.log(processOrder('abc')); // Error [ParseError]: "abc" is not a valid ID
