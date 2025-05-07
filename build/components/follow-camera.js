AFRAME.registerComponent('follow-camera', {
  schema: {
    distance: { type: 'number', default: 2 }
  },

  init: function() {
    // Get camera entity
    this.camera = document.querySelector('[camera]');
    if (!this.camera) {
      console.warn('No camera found for follow-camera component');
      return;
    }

    // Bind tick function
    this.tick = AFRAME.utils.throttleTick(this.tick, 16, this); // ~60fps
  },

  tick: function() {
    if (!this.camera) return;

    // Get camera's world position and rotation
    const cameraEl = this.camera.object3D;
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    cameraEl.getWorldPosition(worldPos);
    cameraEl.getWorldQuaternion(worldQuat);

    // Calculate position in front of camera
    const forward = new THREE.Vector3(0, 0, -this.data.distance);
    forward.applyQuaternion(worldQuat);
    const targetPosition = worldPos.add(forward);

    // Update entity position
    this.el.object3D.position.copy(targetPosition);

    // Make entity face camera
    this.el.object3D.lookAt(worldPos);
  }
}); 