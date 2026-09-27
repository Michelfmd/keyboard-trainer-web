import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyboardController, getKeyboardController, resetKeyboardController, type KeyboardInput } from "../src/input/keyboard-controller";

describe("KeyboardController", () => {
  let controller: KeyboardController;
  let mockWindow: any;

  beforeEach(() => {
    resetKeyboardController();
    controller = new KeyboardController();
    mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event) => true),
    };
    global.window = mockWindow as any;
    global.document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event) => true),
      hidden: false,
    } as any;
  });

  afterEach(() => {
    controller.deactivate();
    resetKeyboardController();
    vi.clearAllMocks();
    delete (global as any).window;
    delete (global as any).document;
  });

  it("activates and deactivates", () => {
    expect(controller.isActive).toBe(false);
    controller.activate();
    expect(controller.isActive).toBe(true);
    expect(mockWindow.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(mockWindow.addEventListener).toHaveBeenCalledWith("keyup", expect.any(Function));
    expect(mockWindow.addEventListener).toHaveBeenCalledWith("blur", expect.any(Function));
    controller.deactivate();
    expect(controller.isActive).toBe(false);
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("keyup", expect.any(Function));
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("blur", expect.any(Function));
  });

  it("calls keydown handler for printable keys", () => {
    const handler = vi.fn();
    controller.setKeyDownHandler(handler);
    controller.activate();

    const keydownHandler = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keydown")?.[1];
    const event = { key: "a", code: "KeyA", repeat: false } as KeyboardEvent;
    keydownHandler(event);

    expect(handler).toHaveBeenCalledWith({
      key: "a",
      code: "KeyA",
      repeat: false,
    });
  });

  it("ignores modifier-only keys", () => {
    const handler = vi.fn();
    controller.setKeyDownHandler(handler);
    controller.activate();

    const keydownHandler = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keydown")?.[1];
    const modifiers = ["Shift", "Control", "Alt", "Meta", "Super", "Hyper", "Fn", "OS"];
    for (const mod of modifiers) {
      handler.mockClear();
      const event = { key: mod, code: mod, repeat: false } as KeyboardEvent;
      keydownHandler(event);
      expect(handler).not.toHaveBeenCalled();
    }
  });

  it("ignores key repeat", () => {
    const handler = vi.fn();
    controller.setKeyDownHandler(handler);
    controller.activate();

    const keydownHandler = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keydown")?.[1];
    const event = { key: "a", code: "KeyA", repeat: true } as KeyboardEvent;
    keydownHandler(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls keyup handler", () => {
    const handler = vi.fn();
    controller.setKeyUpHandler(handler);
    controller.activate();

    const keyupHandler = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keyup")?.[1];
    const event = { key: "a", code: "KeyA" } as KeyboardEvent;
    keyupHandler(event);

    expect(handler).toHaveBeenCalledWith({
      key: "a",
      code: "KeyA",
      repeat: false,
    });
  });

  it("ignores modifier keyup", () => {
    const handler = vi.fn();
    controller.setKeyUpHandler(handler);
    controller.activate();

    const keyupHandler = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keyup")?.[1];
    const event = { key: "Shift", code: "ShiftLeft" } as KeyboardEvent;
    keyupHandler(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls releaseAllHandler on blur", () => {
    const handler = vi.fn();
    controller.setReleaseAllHandler(handler);
    controller.activate();

    const blurHandler = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "blur")?.[1];
    blurHandler(new Event("blur"));
    expect(handler).toHaveBeenCalled();
  });

  it("calls releaseAllHandler on visibility change hidden", () => {
    const handler = vi.fn();
    controller.setReleaseAllHandler(handler);
    controller.activate();

    const visibilityHandler = (global.document.addEventListener as any).mock.calls.find((c: any) => c[0] === "visibilitychange")?.[1];
    Object.defineProperty(global.document, "hidden", { value: true, configurable: true });
    visibilityHandler(new Event("visibilitychange"));
    expect(handler).toHaveBeenCalled();
  });

  it("does not call releaseAllHandler on visibility change visible", () => {
    const handler = vi.fn();
    controller.setReleaseAllHandler(handler);
    controller.activate();

    const visibilityHandler = (global.document.addEventListener as any).mock.calls.find((c: any) => c[0] === "visibilitychange")?.[1];
    Object.defineProperty(global.document, "hidden", { value: false, configurable: true });
    visibilityHandler(new Event("visibilitychange"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls releaseAllHandler on deactivate", () => {
    const handler = vi.fn();
    controller.setReleaseAllHandler(handler);
    controller.activate();
    controller.deactivate();
    expect(handler).toHaveBeenCalled();
  });

  it("ignores browser shortcuts and composing input", () => {
    const handler = vi.fn();
    controller.setKeyDownHandler(handler);
    controller.activate();
    const keydown = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keydown")[1];
    for (const flag of ["ctrlKey", "altKey", "metaKey", "isComposing"]) {
      keydown({ key: "a", code: "KeyA", [flag]: true });
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("leaves interactive controls and keyboard navigation available", () => {
    const handler = vi.fn();
    controller.setKeyDownHandler(handler);
    controller.activate();
    const keydown = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keydown")[1];
    const preventDefault = vi.fn();
    keydown({ key: " ", code: "Space", target: { closest: () => ({}) }, preventDefault });
    expect(handler).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    keydown({ key: "Tab", code: "Tab", preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("prevents scrolling from accepted practice spaces", () => {
    controller.setKeyDownHandler(vi.fn());
    controller.activate();
    const keydown = mockWindow.addEventListener.mock.calls.find((c: any) => c[0] === "keydown")[1];
    const preventDefault = vi.fn();
    keydown({ key: " ", code: "Space", preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("singleton getKeyboardController returns same instance", () => {
    resetKeyboardController();
    const c1 = getKeyboardController();
    const c2 = getKeyboardController();
    expect(c1).toBe(c2);
  });

  it("resetKeyboardController clears singleton", () => {
    const c1 = getKeyboardController();
    resetKeyboardController();
    const c2 = getKeyboardController();
    expect(c1).not.toBe(c2);
  });
});