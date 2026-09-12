import * as THREE from 'three';

export class LightingRig {
  readonly keyLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color(0x08151f);
    scene.fog = new THREE.FogExp2(0x2d4453, 0.0085);

    const ambient = new THREE.HemisphereLight(0xb3cad9, 0x4c5354, 1.25);
    scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xb6d0e1, 2.6);
    this.keyLight.position.set(-13, 20, 8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -42;
    this.keyLight.shadow.camera.right = 42;
    this.keyLight.shadow.camera.top = 42;
    this.keyLight.shadow.camera.bottom = -42;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 95;
    this.keyLight.shadow.bias = -0.00035;
    this.keyLight.shadow.normalBias = 0.035;
    scene.add(this.keyLight);

    const stormRim = new THREE.DirectionalLight(0x7496b0, 1.15);
    stormRim.position.set(18, 10, -24);
    scene.add(stormRim);

    const horizonFill = new THREE.PointLight(0x356884, 1.05, 105, 2);
    horizonFill.position.set(0, 10, -72);
    scene.add(horizonFill);
  }
}
