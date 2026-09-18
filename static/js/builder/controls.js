// Enhanced 3D controls for the house builder
const Controls = {
  init(sceneEl, houseEl) {
      this.setupMouseDrag(sceneEl, houseEl);
      this.setupScrollZoom(sceneEl);
      this.setupTouch(sceneEl, houseEl);
      this.setupKeyboard();
  },
  setupMouseDrag(sceneEl, houseEl) {
      // Logic relies on HouseBuilder handling these
  },
  setupScrollZoom(sceneEl) {
      // Handled in HouseBuilder
  },
  setupTouch(sceneEl, houseEl) {
       // Handled in HouseBuilder
  },
  setupKeyboard() {
      if (!document.getElementById('scene')) return;  // Only on builder page
      document.addEventListener('keydown', (e) => {
          if (e.key === 'r' || e.key === 'R') {
              if (window.HouseBuilder) window.HouseBuilder.resetCamera();
          }
          if (window.HouseBuilder) {
              if (e.key === 'ArrowLeft') window.HouseBuilder.rotY -= 5;
              if (e.key === 'ArrowRight') window.HouseBuilder.rotY += 5;
              if (e.key === 'ArrowUp') window.HouseBuilder.rotX += 5;
              if (e.key === 'ArrowDown') window.HouseBuilder.rotX -= 5;
              window.HouseBuilder.updateTransform();
          }
      });
  },
  resetView() {
      if (window.HouseBuilder) window.HouseBuilder.resetCamera();
  }
};
