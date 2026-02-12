# Шаблонный метод

Позднее связывание приводит к одному интересному следствию. Из базового класса можно вызывать методы и свойства,
определенные в наследниках. Причем самих наследников может даже не существовать. Позднее связывание на то и позднее, что
проверка происходит только в тот момент, когда этот код используется.

Эту особенность используют в паттерне "шаблонный метод". Он применяется тогда, когда у подклассов есть общая логика,
которая частично опирается на поведение подклассов. Такая логика реализуется в методе базового класса, а та часть,
которая различается (для каждого подкласса), делегируется наследникам.

```ts
class HTMLElement {
  constructor(attributes = {}) {
    this.attributes = attributes
  }

  setAttribute(key, value) {
    this.attributes[key] = value
  }

  getAttribute(key) {
    return this.attributes[key]
  }

  getTextContent() {
    return this.body
  }

  setTextContent(body) {
    this.body = body
  }

  stringifyAttributes() {
    // build: key="value" key2="value2"
  }
}
```

Посмотрите на метод `toString()`. Видно, что его код останется идентичным для большинства тегов. Единственное, что
меняется – название самого тега.

```ts
class HTMLAnchorElement extends HTMLElement {
  toString() {
    // Родительский метод
    const attrLine = this.stringifyAttributes()
    // Родительский метод
    const body = this.getTextContent()
    return `<a${attrLine}>${body}</a>`
  }
}
```

Мы можем модифицировать код так, что метод toString() переместится в HTMLElement. И единственная вещь, которая останется
за подклассами – имя тега:

Теги бывают одиночные, а значит текущий вариант toString() не подойдет для них

Создадим у HTMLElement два подкласса: один HTMLSingleElement и HTMLPairElement. Теперь классы конкретных тегов должны
наследоваться от одного из указанных классов. В каждом из этих классов будет своя реализация метода toString().

```ts
class HTMLSingleElement extends HTMLElement {
  toString() {
    const attrLine = this.stringifyAttributes()
    // getTagName – метод, который должны реализовать все подклассы
    const tagName = this.getTagName()
    // Создается одиночный тег
    return `<${tagName}${attrLine}>`
  }
}

class HTMLPairElement extends HTMLElement {
  toString() {
    const attrLine = this.stringifyAttributes()
    const body = this.getTextContent()
    // getTagName – метод, который должны реализовать все подклассы
    const tagName = this.getTagName()
    return `<${tagName}${attrLine}>${body}</${tagName}>`
  }
}
```