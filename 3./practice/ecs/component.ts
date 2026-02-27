export class Component {
  constructor(public id?: string) {}
}

class MovementComponent extends Component {
  constructor() {
    super("id");
  }
}
