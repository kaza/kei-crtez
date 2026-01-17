/**
 * Apartment Utilities - Programmatic calculations and validations
 * Can be used in browser or Node.js
 */

const ApartmentUtils = {
  /**
   * Calculate area of a single room
   */
  roomArea(room) {
    return room.bounds.width * room.bounds.height;
  },

  /**
   * Calculate total apartment area
   */
  totalArea(apartment) {
    return apartment.rooms.reduce((sum, room) => sum + this.roomArea(room), 0);
  },

  /**
   * Calculate perimeter of a room
   */
  roomPerimeter(room) {
    return 2 * (room.bounds.width + room.bounds.height);
  },

  /**
   * Calculate total wall length by type
   */
  wallLengthByType(apartment) {
    const lengths = { building: 0, exterior: 0, interior: 0 };

    apartment.rooms.forEach(room => {
      room.walls?.forEach(wall => {
        if (wall.type === 'none') return;
        const length = (wall.side === 'north' || wall.side === 'south')
          ? room.bounds.width
          : room.bounds.height;
        lengths[wall.type] = (lengths[wall.type] || 0) + length;
      });
    });

    return lengths;
  },

  /**
   * Get bounding box of entire apartment
   */
  getBounds(apartment) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    apartment.rooms.forEach(room => {
      minX = Math.min(minX, room.bounds.x);
      minY = Math.min(minY, room.bounds.y);
      maxX = Math.max(maxX, room.bounds.x + room.bounds.width);
      maxY = Math.max(maxY, room.bounds.y + room.bounds.height);
    });

    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  },

  /**
   * Get rooms by type
   */
  getRoomsByType(apartment, type) {
    return apartment.rooms.filter(room => room.type === type);
  },

  /**
   * Find room by ID
   */
  findRoom(apartment, roomId) {
    return apartment.rooms.find(room => room.id === roomId);
  },

  /**
   * Check if two rooms are adjacent (share a wall)
   */
  areAdjacent(room1, room2) {
    const r1 = room1.bounds;
    const r2 = room2.bounds;

    // Check horizontal adjacency
    if (r1.x + r1.width === r2.x || r2.x + r2.width === r1.x) {
      // Check vertical overlap
      const overlapY = Math.max(0,
        Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y)
      );
      if (overlapY > 0) return true;
    }

    // Check vertical adjacency
    if (r1.y + r1.height === r2.y || r2.y + r2.height === r1.y) {
      // Check horizontal overlap
      const overlapX = Math.max(0,
        Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x)
      );
      if (overlapX > 0) return true;
    }

    return false;
  },

  /**
   * Get all adjacent rooms for a given room
   */
  getAdjacentRooms(apartment, roomId) {
    const room = this.findRoom(apartment, roomId);
    if (!room) return [];

    return apartment.rooms.filter(r => r.id !== roomId && this.areAdjacent(room, r));
  },

  /**
   * Validate apartment data structure
   */
  validate(apartment) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!apartment.meta) errors.push('Missing meta section');
    if (!apartment.rooms || !apartment.rooms.length) errors.push('No rooms defined');

    // Check for duplicate IDs
    const ids = apartment.rooms.map(r => r.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length) errors.push(`Duplicate room IDs: ${duplicates.join(', ')}`);

    // Check each room
    apartment.rooms.forEach(room => {
      if (!room.id) errors.push('Room missing ID');
      if (!room.bounds) errors.push(`Room ${room.id} missing bounds`);
      if (room.bounds) {
        if (room.bounds.width <= 0) errors.push(`Room ${room.id} has invalid width`);
        if (room.bounds.height <= 0) errors.push(`Room ${room.id} has invalid height`);
      }

      // Check openings reference valid walls
      room.openings?.forEach(opening => {
        if (!['north', 'south', 'east', 'west'].includes(opening.wall)) {
          errors.push(`Room ${room.id} has opening on invalid wall: ${opening.wall}`);
        }

        // Check opening position is within wall
        const wallLength = (opening.wall === 'north' || opening.wall === 'south')
          ? room.bounds.width
          : room.bounds.height;
        if (opening.position + opening.width > wallLength) {
          warnings.push(`Room ${room.id}: opening extends beyond wall`);
        }
      });
    });

    // Check for overlapping rooms
    for (let i = 0; i < apartment.rooms.length; i++) {
      for (let j = i + 1; j < apartment.rooms.length; j++) {
        if (this.roomsOverlap(apartment.rooms[i], apartment.rooms[j])) {
          warnings.push(`Rooms ${apartment.rooms[i].id} and ${apartment.rooms[j].id} overlap`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Check if two rooms overlap
   */
  roomsOverlap(room1, room2) {
    const r1 = room1.bounds;
    const r2 = room2.bounds;

    return !(r1.x + r1.width <= r2.x ||
             r2.x + r2.width <= r1.x ||
             r1.y + r1.height <= r2.y ||
             r2.y + r2.height <= r1.y);
  },

  /**
   * Move a room by offset
   */
  moveRoom(apartment, roomId, deltaX, deltaY) {
    const room = this.findRoom(apartment, roomId);
    if (room) {
      room.bounds.x += deltaX;
      room.bounds.y += deltaY;
    }
    return apartment;
  },

  /**
   * Resize a room
   */
  resizeRoom(apartment, roomId, newWidth, newHeight) {
    const room = this.findRoom(apartment, roomId);
    if (room) {
      room.bounds.width = newWidth;
      room.bounds.height = newHeight;
    }
    return apartment;
  },

  /**
   * Generate summary report
   */
  generateReport(apartment) {
    const bounds = this.getBounds(apartment);
    const wallLengths = this.wallLengthByType(apartment);

    let report = `# ${apartment.meta.name} - Floor Plan Report\n\n`;
    report += `## Overall Dimensions\n`;
    report += `- Width: ${bounds.width.toFixed(2)} m\n`;
    report += `- Height: ${bounds.height.toFixed(2)} m\n`;
    report += `- Total Area: ${this.totalArea(apartment).toFixed(2)} m²\n\n`;

    report += `## Rooms\n`;
    apartment.rooms.forEach(room => {
      const area = this.roomArea(room);
      report += `### ${room.name} (${room.type})\n`;
      report += `- Dimensions: ${room.bounds.width} × ${room.bounds.height} m\n`;
      report += `- Area: ${area.toFixed(2)} m²\n`;
      report += `- Position: (${room.bounds.x}, ${room.bounds.y})\n`;
      if (room.openings?.length) {
        report += `- Openings: ${room.openings.map(o => o.type).join(', ')}\n`;
      }
      report += '\n';
    });

    report += `## Wall Summary\n`;
    report += `- Building walls: ${wallLengths.building.toFixed(2)} m\n`;
    report += `- Exterior walls: ${wallLengths.exterior.toFixed(2)} m\n`;
    report += `- Interior walls: ${wallLengths.interior.toFixed(2)} m\n`;

    return report;
  },

  /**
   * Export to simple format for CAD import
   */
  toSimpleFormat(apartment) {
    return apartment.rooms.map(room => ({
      name: room.name,
      type: room.type,
      x: room.bounds.x,
      y: room.bounds.y,
      width: room.bounds.width,
      height: room.bounds.height,
      area: this.roomArea(room),
      walls: room.walls,
      openings: room.openings
    }));
  }
};

// Export for Node.js or make available globally in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApartmentUtils;
} else if (typeof window !== 'undefined') {
  window.ApartmentUtils = ApartmentUtils;
}
