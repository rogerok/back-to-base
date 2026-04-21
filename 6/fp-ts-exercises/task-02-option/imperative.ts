// Task 2: Option
// Rewrite using Option from fp-ts/Option
// Replace null checks with Option container

interface User {
  id: number;
  name: string;
  address?: {
    city?: string;
  };
}

const users: User[] = [
  { id: 1, name: 'Alice', address: { city: 'NYC' } },
  { id: 2, name: 'Bob', address: {} },
  { id: 3, name: 'Charlie' },
];

function getUserCity(id: number): string {
  const user = users.find(u => u.id === id);
  if (!user) return 'Unknown';
  if (!user.address) return 'Unknown';
  if (!user.address.city) return 'Unknown';
  return user.address.city;
}

console.log(getUserCity(1)); // "NYC"
console.log(getUserCity(2)); // "Unknown"
console.log(getUserCity(3)); // "Unknown"
console.log(getUserCity(4)); // "Unknown"
