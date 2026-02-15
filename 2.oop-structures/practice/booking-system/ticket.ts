export type TicketNumber = number;
export type TicketInfo = string;

export abstract class Ticket {
  constructor(
    public number: TicketNumber,
    public price: number,
    public date: string,
  ) {}

  getInfo(): TicketInfo {
    return `Номер билета: ${this.number.toString()}, Цена: ${this.price.toString()}, Дата: ${this.date}`;
  }
}
