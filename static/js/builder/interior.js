// Interior customization module
const Interior = {
  currentRoom: 'living',
  roomStyles: {},
  sceneEl: null,
  
  furnitureCatalog: {
    living: [
      { id: 'sofa', name: 'Sofa', color: '#5c6bc0', width: 120, height: 40, depth: 50 },
      { id: 'tv_unit', name: 'TV Unit', color: '#37474f', width: 100, height: 20, depth: 30 },
      { id: 'coffee_table', name: 'Coffee Table', color: '#795548', width: 60, height: 15, depth: 40 },
      { id: 'plant', name: 'Indoor Plant', color: '#388e3c', width: 20, height: 40, depth: 20 }
    ],
    bedroom: [
      { id: 'bed', name: 'Bed', color: '#7e57c2', width: 120, height: 30, depth: 100 },
      { id: 'wardrobe', name: 'Wardrobe', color: '#6d4c41', width: 80, height: 100, depth: 30 },
      { id: 'side_table', name: 'Side Table', color: '#546e7a', width: 30, height: 35, depth: 30 }
    ],
    kitchen: [
      { id: 'counter', name: 'Counter', color: '#78909c', width: 150, height: 40, depth: 40 },
      { id: 'sink', name: 'Sink', color: '#b0bec5', width: 50, height: 40, depth: 40 },
      { id: 'fridge', name: 'Refrigerator', color: '#eceff1', width: 40, height: 80, depth: 35 }
    ],
    bathroom: [
      { id: 'toilet', name: 'Toilet', color: '#f5f5f5', width: 35, height: 35, depth: 55 },
      { id: 'sink_bath', name: 'Wash Basin', color: '#f5f5f5', width: 40, height: 40, depth: 35 },
      { id: 'shower', name: 'Shower', color: '#b3e5fc', width: 60, height: 5, depth: 60 }
    ]
  },
  
  init() {
      // Mock initialization
      this.sceneEl = document.getElementById('interior-scene');
  },
  
  selectRoom(roomType) { 
      this.currentRoom = roomType;
      this.renderInterior(roomType);
  },
  
  renderInterior(roomType) {
      if (!this.sceneEl) return;
      this.sceneEl.innerHTML = `<div>Interior view for ${roomType}</div>`;
      // Would use HouseBuilder.createCuboid to render an inverted room
  },
  
  addFurniture(furnitureId) {
      const items = this.furnitureCatalog[this.currentRoom] || [];
      const item = items.find(i => i.id === furnitureId);
      if (item && window.HouseBuilder && this.sceneEl) {
          const fObj = window.HouseBuilder.createCuboid(0, 0, 0, item.width, item.height, item.depth, item.color, 'full');
          this.sceneEl.appendChild(fObj.element);
      }
  },
  
  setWallColor(color) { 
      // Update interior wall color
  },
  
  setFloorMaterial(materialId) {
      // Update floor
  }
};
