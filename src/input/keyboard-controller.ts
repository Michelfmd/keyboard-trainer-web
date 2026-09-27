export interface KeyboardInput {
  key: string;
  code: string;
  repeat: boolean;
}

export type KeyHandler = (input: KeyboardInput) => void;
export type KeyUpHandler = (input: KeyboardInput) => void;
export type ReleaseAllHandler = () => void;

export class KeyboardController {
  private keydownHandler: KeyHandler | null = null;
  private keyupHandler: KeyUpHandler | null = null;
  private releaseAllHandler: ReleaseAllHandler | null = null;
  private boundKeyDown: (event: KeyboardEvent) => void;
  private boundKeyUp: (event: KeyboardEvent) => void;
  private active = false;

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
  }

  setKeyDownHandler(handler: KeyHandler): void {
    this.keydownHandler = handler;
  }

  setKeyUpHandler(handler: KeyUpHandler): void {
    this.keyupHandler = handler;
  }

  setReleaseAllHandler(handler: ReleaseAllHandler): void {
    this.releaseAllHandler = handler;
  }

  activate(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.releaseAllKeys();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.keydownHandler || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('input, select, textarea, button, a, [contenteditable="true"]')) return;
    if (event.key === ' ' || event.key === 'Backspace') event.preventDefault();

    if (this.isModifierOnly(event)) {
      return;
    }

    if (event.repeat) {
      return;
    }

    const input: KeyboardInput = {
      key: event.key,
      code: event.code,
      repeat: event.repeat,
    };

    this.keydownHandler(input);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.keyupHandler) return;

    if (this.isModifierOnly(event)) {
      return;
    }

    const input: KeyboardInput = {
      key: event.key,
      code: event.code,
      repeat: false,
    };

    this.keyupHandler(input);
  }

  private isModifierOnly(event: KeyboardEvent): boolean {
    const modifierKeys = new Set([
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "Super",
      "Hyper",
      "Fn",
      "OS",
    ]);
    return modifierKeys.has(event.key) || event.key.startsWith("Meta");
  }

  private handleBlur = (): void => {
    this.releaseAllKeys();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.releaseAllKeys();
    }
  };

  private releaseAllKeys(): void {
    if (this.releaseAllHandler) {
      this.releaseAllHandler();
    }
  }

  get isActive(): boolean {
    return this.active;
  }
}

let controllerInstance: KeyboardController | null = null;

export function getKeyboardController(): KeyboardController {
  if (!controllerInstance) {
    controllerInstance = new KeyboardController();
  }
  return controllerInstance;
}

export function resetKeyboardController(): void {
  if (controllerInstance) {
    controllerInstance.deactivate();
    controllerInstance = null;
  }
}