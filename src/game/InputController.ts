import * as THREE from 'three';

export class InputController {
  readonly movement = new THREE.Vector2();
  private readonly keys = new Set<string>();
  private joystickPointer: number | null = null;
  private lookPointer: number | null = null;
  private lookDelta = new THREE.Vector2();

  constructor(
    private readonly joystick: HTMLElement,
    private readonly stick: HTMLElement,
    private readonly lookSurface: HTMLElement,
  ) {
    addEventListener('keydown', (event) => this.keys.add(event.code));
    addEventListener('keyup', (event) => this.keys.delete(event.code));

    joystick.addEventListener('pointerdown', (event) => {
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

    lookSurface.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || this.lookPointer !== null) return;
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
  }

  private readonly lastLook = new THREE.Vector2();

  update() {
    if (this.joystickPointer !== null) return;
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    this.movement.set(x, y);
    if (this.movement.lengthSq() > 1) this.movement.normalize();
  }

  consumeLookDelta() {
    const delta = this.lookDelta.clone();
    this.lookDelta.set(0, 0);
    return delta;
  }

  private updateJoystick(clientX: number, clientY: number) {
    const rect = this.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.32;
    const raw = new THREE.Vector2(clientX - centerX, clientY - centerY);
    if (raw.length() > radius) raw.setLength(radius);
    this.stick.style.transform = `translate(${raw.x}px, ${raw.y}px)`;
    this.movement.set(raw.x / radius, -raw.y / radius);
  }
}
