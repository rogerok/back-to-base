import { Ticket, TicketNumber } from "./ticket.ts";

export class BookingSystem {
  tickets: Record<TicketNumber, Ticket> = {};

  bookTicket(ticket: Ticket): void {
    this.tickets[ticket.number] = ticket;
  }

  cancelBooking(ticketNumber: TicketNumber): boolean {
    if (ticketNumber in this.tickets) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.tickets[ticketNumber];
      return true;
    }

    return false;
  }

  getTicketInfo(ticketNumber: TicketNumber): Ticket | null {
    return this.tickets[ticketNumber] ?? null;
  }
}
