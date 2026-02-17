/*


Онлайн-игра
Спроектируй систему классов для онлайн-RPG. Определи, какие связи должны быть composition, а какие — aggregation, и объясни почему:

Game содержит World
World содержит Location[]
Location содержит NPC[]
Location содержит Player[]
Player содержит Inventory
Inventory содержит Item[]
Guild содержит Player[]
ChatRoom содержит Player[]

Для каждой связи ответь:

Composition или Aggregation?
Что произойдёт с дочерней entity при удалении родительской?

 */

/*
 * Используем композицию т.к. мир без игры существовать не может, игра управляет миром, если класс Game перестанет существовать, то класс World должен быть удалён
 */
class Game {
  world: World;

  constructor() {
    this.world = new World([new Location([new Npc("first")])]);
  }
}

/*
 * Используем композицию т.к. локации не могут существовать отдельно от мира.
 * При удалении мира локации исчезнут
 */

class World {
  location: Location[] = [];

  constructor(location: Location[]) {
    this.location = location;
  }
}

/*
 * Используем агрегирование для игроков т.к. игроки могут существовать отдельно от локации,
 * локация не владеет игроками.
 * Используем композицию для npc т.к. npc не существуют без локации
 */

class Location {
  npc: Npc[] = [];
  player: Player[] = [];

  constructor(npc: Npc[]) {
    this.npc = npc;
  }

  addPlayer(player: Player) {
    this.player.push(player);
  }
}

class Npc {
  constructor(public name: string) {}
}

/*
 * Используем композицию. Инвентарь не существует отдельно от игрока, при удалении игрока инвентарь исчезает
 */

class Player {
  inventory: Inventory;

  constructor() {
    this.inventory = new Inventory();
  }
}

/*
 * Используем агрегирование. Вещи существуют независимо от инвентаря, при удалении инвентаря вещи продолжают существовать
 */

class Inventory {
  item: Item[] = [];

  addItem(item: Item) {
    this.item.push(item);
  }
}

class Item {
  constructor(public name: string) {}
}

/*
 * Используем агрегирование. Гильдия существует независимо от игрока, при удалении гильдии игрок продолжает существовать
 */

class Guild {
  player: Player[] = [];

  addPlayer(player: Player) {
    this.player.push(player);
  }
}

/*
 * Используем агрегирование. Чат существует независимо от игрока, при удалении гильдии игрок продолжает существовать
 */

class ChatRoom {
  player: Player[] = [];

  addPlayer(player: Player) {
    this.player.push(player);
  }
}
