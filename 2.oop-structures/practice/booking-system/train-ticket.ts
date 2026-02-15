import { Ticket, TicketInfo } from "./ticket.ts";

export class TrainTicket extends Ticket {
  constructor(
    public number: number,
    public price: number,
    public date: string,
    public trainNumber: string,
    public seatNumber: string,
    public wagonType: string,
  ) {
    super(number, price, date);
  }

  override getInfo(): TicketInfo {
    return (
      super.getInfo() +
      `, Поезд: ${this.trainNumber}, Место: ${this.seatNumber}, Вагон: ${this.wagonType}`
    );
  }
}
