# Прототипы

В JavaScript с каждым объектом связан прототип. Прототип – это обычный объект, хранящийся в специальном служебном
поле `[[prototype]] `(к этому полю невозможно обратиться напрямую). Его можно извлечь так:

```ts
const date = new Date()
// Эта функция извлекает прототип объекта из самого объекта
const proto = Object.getPrototypeOf(date) // Date {}

// В прототипе хранится не конструктор
// Что там хранится узнаем дальше
proto === Date // false

const numbers = [1, 2]
Object.getPrototypeOf(numbers) // [] – отображение отличается, но это массив

// Прототипы есть и у конструкторов, которые мы определяем сами
function Company(name) {
  this.name = name
}

const company = new Company()
Object.getPrototypeOf(company) // Company {}
```

Если свойства в объекте нет, то JavaScript смотрит прототип этого объекта.
Если свойство не найдено в прототипе, то JavaScript смотрит прототип прототипа и так далее. Так он проходит до конца
цепочки прототипов, то есть до последнего прототипа — это всегда `null`. На базе этого механизма реализуется
наследование.

Прототипы есть у обычных объектов

```ts
Object.getPrototypeOf({}) // {} — это и есть Object
```

Теперь мы можем ответить на вопрос, откуда берется прототип. Прототип - это оюъект, находящийся в свойстве `prototype`
функции-конструктора, а не сам конструктор

```ts
// Добавляем свойство getName (делаем его методом) 

Company.prototype.getName = function getName() {
  return this.name;
}

const company = new Company('Hexlet');

//
Свойтсво
доступно
console.log(company.getName()) // => Hexlet
```

При этом мы можем заменить значение свойства `getName` в конкретном объекте. Это никаким образом не отобразится на
других объектах, так как они извлекают `getName` из прототипа:

```ts
const company1 = new Company('Hexlet');
const company2 = new Company('Google');
company2.getName = function getName() {
  return 'Alphabet'
}
// Этот вызов возьмет свойство из самого объекта
company2.getName() // Alphabet
// Этот вызов возьмет значение свойства из прототипа
company1.getName() // Hexlet
```