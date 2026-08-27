export class OutputCapture {
  private active = false;
  private chunks: string[] = [];

  start(): void {
    this.chunks = [];
    this.active = true;
  }

  push(data: string): void {
    if (this.active) this.chunks.push(data);
  }

  stop(): string {
    this.active = false;
    return this.chunks.join("");
  }
}
