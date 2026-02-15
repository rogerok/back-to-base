import { Ticket, TicketNumber } from "./ticket.ts";

export class AirplaneTicket extends Ticket {
  constructor(
    public number: TicketNumber,
    public price: number,
    public date: string,
    public airline: string,
    public seatNumber: string,
    public serviceClass: string,
  ) {
    super(number, price, date);
  }

  override getInfo(): string {
    return (
      super.getInfo() +
      `, Авиакомпания: ${this.airline}, Место: ${this.seatNumber}, Класс: ${this.serviceClass}`
    );
  }
}
