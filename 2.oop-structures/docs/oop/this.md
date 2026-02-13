# Контекст

В JavaScript this у метода может измениться:

```ts
const company1 = {
  name: 'Hexlet', getName: function getName() {
    return this.name
  }
}
const company2 = { name: 'Hexlet Plus' }

company1.getName() // "Hexlet"

company2.getName = company1.getName

// В обоих случаях одна и та же функция
company2.getName() // "Hexlet Plus"
company1.getName() // "Hexlet"
```

Что здесь произошло? Вызов той же самой функции из другого объекта привел к смене объекта, на который ссылается this.
Эта особенность называется поздним связыванием. Значение this ссылается на тот объект, из которого происходит вызов
метода.

