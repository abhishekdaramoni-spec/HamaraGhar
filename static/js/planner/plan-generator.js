// Generates room layout from requirements
// Returns array of room objects for floor-plan rendering
const PlanGenerator = {
  generate(config) {
    // config: { plotLength, plotWidth, bedrooms, bathrooms, floors, style, parking, balcony, garden, kitchen }
    // Scale: 1 foot = 8 pixels internally here if needed, but return generic units (feet)
    
    const rooms = [];
    const doors = [];
    const windows = [];
    
    const margin = 2; // offset from boundary
    const lW = config.plotWidth - margin*2;
    const lL = config.plotLength - margin*2;
    
    // Simplistic layout generator for demonstration
    // Living Room (Front)
    rooms.push({ type: 'living', name: 'Living Room', x: margin, y: margin, width: lW, height: lL * 0.4, color: '#bbdefb' });
    
    // Kitchen (Back left)
    rooms.push({ type: 'kitchen', name: 'Kitchen', x: margin, y: margin + lL * 0.4, width: lW * 0.4, height: lL * 0.3, color: '#fff9c4' });
    
    // Bedroom 1 (Back right)
    rooms.push({ type: 'bedroom', name: 'Bedroom 1', x: margin + lW * 0.4, y: margin + lL * 0.4, width: lW * 0.6, height: lL * 0.3, color: '#c8e6c9' });
    
    if (config.bathrooms > 0) {
        // Bathroom (Back corner)
        rooms.push({ type: 'bathroom', name: 'Bathroom', x: margin + lW * 0.4, y: margin + lL * 0.7, width: lW * 0.3, height: lL * 0.3, color: '#f3e5f5' });
    }
    
    // Add generic doors and windows
    doors.push({ x: margin + lW/2, y: margin, width: 4, wall: 'north', roomId: 1 }); // Main door
    windows.push({ x: margin + lW*0.2, y: margin, width: 4, wall: 'north', roomId: 1 });
    
    return { 
        rooms, 
        walls: [], 
        doors, 
        windows, 
        dimensions: { length: config.plotLength, width: config.plotWidth } 
    };
  }
};
