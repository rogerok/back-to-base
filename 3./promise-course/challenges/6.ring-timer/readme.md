Эта практика включает в себя элементы асинхронного программирования (setTimeout), так как bind в основном используется в этом контексте

timer.js
Реализуйте и экспортируйте по умолчанию функцию, которая возвращает объект-таймер. Таймер "заводится" на определенное время и запускается. Каждые 100 миллисекунд он вызывает колбек, передавая туда два параметра: state со значением working и elapsedTime содержащий прошедшее время со старта таймера (в миллисекундах). Когда таймер завершился, то он вызывает тот же колбек с параметром state и значением finished.

```ts
// Колбек
const cb = ({ state, elapsedTime }) => {
  switch (state) {
    case "working":
      console.log(`Time elapsed: ${elapsedTime}`);
      break;
    case "finished":
      console.log(`Timer has finished!`);
  }
};

// Создается объект-таймер
const timer = makeTimer(300, cb); // Завели на 300 миллисекунд
timer.start();
// Time elapsed: 100
// Time elapsed: 200
// Time elapsed: 300
// Timer has finished!
```

Таймеры
https://ru.hexlet.io/courses/js-asynchronous-programming/lessons/timers/theory_unit

Для запуска таймера используйте setInterval
Для остановки clearInterval
Каждый новый тик не должен никак влиять на другие тики. Данные должны быть изолированы
