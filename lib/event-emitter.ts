/** Simple typed event emitter for local pub/sub */
type Listener<T> = (data: T) => void;

export class EventEmitter<T> {
  private listeners: Set<Listener<T>> = new Set();

  subscribe(cb: Listener<T>): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  emit(data: T) {
    this.listeners.forEach((cb) => cb(data));
  }
}
