import * as THREE from 'three';

export class LightingRig {
  readonly keyLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color(0x06111a);
    scene.fog = new THREE.FogExp2(0x07131c, 0.0145);

    const ambient = new THREE.HemisphereLight(0x6f94b2, 0x080d11, 0.52);
    scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0x9cc8ee, 2.35);
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

    const horizonFill = new THREE.PointLight(0x315f7c, 1.15, 105, 2);
    horizonFill.position.set(0, 10, -72);
    scene.add(horizonFill);
  }
}
