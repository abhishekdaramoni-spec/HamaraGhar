// Renders the 2D floor plan on HTML5 Canvas
const FloorPlan = {
  canvas: null,
  ctx: null,
  scale: 8, // 1 foot = 8 pixels
  offsetX: 40,
  offsetY: 40,
  
  init(canvasId) { 
      this.canvas = document.getElementById(canvasId); 
      if (this.canvas) {
          this.ctx = this.canvas.getContext('2d'); 
      }
  },
  
  render(planData) {
    if (!this.ctx) return;
    this.clear();
    this.drawGrid();
    this.drawRooms(planData.rooms);
    this.drawDoors(planData.doors);
    this.drawWindows(planData.windows);
    this.drawDimensions(planData.dimensions);
    this.drawCompass();
    this.drawLegend(planData.rooms);
  },
  
  clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
  
  drawGrid() {
      this.ctx.strokeStyle = '#eeeeee';
      this.ctx.lineWidth = 1;
      for (let x = 0; x < this.canvas.width; x += this.scale) {
          this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
      }
      for (let y = 0; y < this.canvas.height; y += this.scale) {
          this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); this.ctx.stroke();
      }
  },
  
  drawRooms(rooms) {
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#333';
      rooms.forEach(r => {
          this.ctx.fillStyle = r.color || this.ROOM_COLORS[r.type] || '#fff';
          this.ctx.fillRect(this.offsetX + r.x * this.scale, this.offsetY + r.y * this.scale, r.width * this.scale, r.height * this.scale);
          this.ctx.strokeRect(this.offsetX + r.x * this.scale, this.offsetY + r.y * this.scale, r.width * this.scale, r.height * this.scale);
          
          this.ctx.fillStyle = '#000';
          this.ctx.font = '14px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(r.name, this.offsetX + r.x * this.scale + (r.width * this.scale)/2, this.offsetY + r.y * this.scale + (r.height * this.scale)/2);
      });
  },
  
  drawDoors(doors) {
      this.ctx.strokeStyle = '#8d6e63';
      this.ctx.lineWidth = 3;
      doors.forEach(d => {
          this.ctx.beginPath();
          // Simplified door rendering
          this.ctx.arc(this.offsetX + d.x * this.scale, this.offsetY + d.y * this.scale, d.width * this.scale, 0, Math.PI/2);
          this.ctx.stroke();
      });
  },
  
  drawWindows(windows) {
      this.ctx.strokeStyle = '#4fc3f7';
      this.ctx.lineWidth = 4;
      windows.forEach(w => {
          this.ctx.beginPath();
          this.ctx.moveTo(this.offsetX + w.x * this.scale, this.offsetY + w.y * this.scale);
          this.ctx.lineTo(this.offsetX + (w.x + w.width) * this.scale, this.offsetY + w.y * this.scale);
          this.ctx.stroke();
      });
  },
  
  drawDimensions(dims) {
      this.ctx.fillStyle = '#555';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`${dims.width} ft`, this.offsetX + (dims.width * this.scale)/2, this.offsetY - 10);
      this.ctx.fillText(`${dims.length} ft`, this.offsetX - 20, this.offsetY + (dims.length * this.scale)/2);
  },
  
  drawCompass() {
      this.ctx.fillStyle = '#d32f2f';
      this.ctx.font = '16px Arial';
      this.ctx.fillText('N ⬆', this.canvas.width - 40, 40);
  },
  
  drawLegend(rooms) {
      // Draw small legend
  },
  
  downloadPNG() {
      if (!this.canvas) return;
      const link = document.createElement('a');
      link.download = 'floor_plan.png';
      link.href = this.canvas.toDataURL();
      link.click();
  }
};

// Room type colors
FloorPlan.ROOM_COLORS = {
  living: '#bbdefb',
  bedroom: '#c8e6c9',
  kitchen: '#fff9c4',
  bathroom: '#f3e5f5',
  parking: '#cfd8dc',
  balcony: '#ffe0b2',
  garden: '#dcedc8',
  staircase: '#e0e0e0'
};

window.FloorPlan = FloorPlan;

