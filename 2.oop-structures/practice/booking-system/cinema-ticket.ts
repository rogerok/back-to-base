import { Ticket, TicketInfo, TicketNumber } from "./ticket.ts";

export class CinemaTicket extends Ticket {
  constructor(
    public number: TicketNumber,
    public price: number,
    public date: string,
    public movieTitle: string,
    public seatNumber: string,
    public hallNumber: number,
  ) {
    super(number, price, date);
  }

  override getInfo(): TicketInfo {
    return (
      super.getInfo() +
      `, Фильм: ${this.movieTitle}, Место: ${this.seatNumber}, Зал: ${this.hallNumber.toString()}`
    );
  }
}
