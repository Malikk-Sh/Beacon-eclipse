import * as THREE from 'three';

export class InputController {
  readonly movement = new THREE.Vector2();
  private readonly keys = new Set<string>();
  private joystickPointer: number | null = null;
  private lookPointer: number | null = null;
  private readonly lookDelta = new THREE.Vector2();
  private readonly consumedLookDelta = new THREE.Vector2();
  private readonly joystickDelta = new THREE.Vector2();
  private enabled = true;

  constructor(
    private readonly joystick: HTMLElement,
    private readonly stick: HTMLElement,
    private readonly lookSurface: HTMLElement,
  ) {
    addEventListener('keydown', (event) => {
      if (this.enabled) this.keys.add(event.code);
    });
    addEventListener('keyup', (event) => this.keys.delete(event.code));
    addEventListener('blur', () => this.reset());

    joystick.addEventListener('pointerdown', (event) => {
      if (!this.enabled || this.joystickPointer !== null) return;
      event.preventDefault();
      event.stopPropagation();
      this.joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      this.updateJoystick(event.clientX, event.clientY);
    });
    joystick.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.updateJoystick(event.clientX, event.clientY);
    });
    const releaseJoystick = (event: PointerEvent) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      this.movement.set(0, 0);
      this.stick.style.transform = 'translate(0px, 0px)';
    };
    joystick.addEventListener('pointerup', releaseJoystick);
    joystick.addEventListener('pointercancel', releaseJoystick);
    joystick.addEventListener('lostpointercapture', releaseJoystick);

    lookSurface.addEventListener('pointerdown', (event) => {
      if (!this.enabled || event.button !== 0 || this.lookPointer !== null) return;
      this.lookPointer = event.pointerId;
      lookSurface.setPointerCapture(event.pointerId);
      this.lastLook.set(event.clientX, event.clientY);
    });
    lookSurface.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.lookPointer) return;
      this.lookDelta.x += event.clientX - this.lastLook.x;
      this.lookDelta.y += event.clientY - this.lastLook.y;
      this.lastLook.set(event.clientX, event.clientY);
    });
    const releaseLook = (event: PointerEvent) => {
      if (event.pointerId === this.lookPointer) this.lookPointer = null;
    };
    lookSurface.addEventListener('pointerup', releaseLook);
    lookSurface.addEventListener('pointercancel', releaseLook);
    lookSurface.addEventListener('lostpointercapture', releaseLook);
  }

  private readonly lastLook = new THREE.Vector2();

  update() {
    if (!this.enabled) return;
    if (this.joystickPointer !== null) return;
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    this.movement.set(x, y);
    if (this.movement.lengthSq() > 1) this.movement.normalize();
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.reset();
  }

  private reset() {
    const joystickPointer = this.joystickPointer;
    const lookPointer = this.lookPointer;
    this.joystickPointer = null;
    this.lookPointer = null;
    this.keys.clear();
    this.movement.set(0, 0);
    this.lookDelta.set(0, 0);
    this.stick.style.transform = 'translate(0px, 0px)';
    if (joystickPointer !== null && this.joystick.hasPointerCapture(joystickPointer)) {
      this.joystick.releasePointerCapture(joystickPointer);
    }
    if (lookPointer !== null && this.lookSurface.hasPointerCapture(lookPointer)) {
      this.lookSurface.releasePointerCapture(lookPointer);
    }
  }

  consumeLookDelta() {
    this.consumedLookDelta.copy(this.lookDelta);
    this.lookDelta.set(0, 0);
    return this.consumedLookDelta;
  }

  private updateJoystick(clientX: number, clientY: number) {
    const rect = this.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.32;
    this.joystickDelta.set(clientX - centerX, clientY - centerY);
    if (this.joystickDelta.length() > radius) this.joystickDelta.setLength(radius);
    this.stick.style.transform = `translate(${this.joystickDelta.x}px, ${this.joystickDelta.y}px)`;
    this.movement.set(this.joystickDelta.x / radius, -this.joystickDelta.y / radius);
  }
}
