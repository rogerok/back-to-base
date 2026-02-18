// 1
export interface Man {
  name: string;
}

export const structuralTyping = (): Man => {
  const manWithAge = {
    age: 18,
    name: "Alex",
  };

  return manWithAge;
};
