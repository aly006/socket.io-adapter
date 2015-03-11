/**
 * Module dependencies.
 */

import { EventEmitter } from 'events';
import parser from 'socket.io-parser';

/**
 * Memory adapter constructor.
 *
 * @param {Namespace} nsp
 * @api public
 */

export default class Adapter extends EventEmitter {
  constructor(nsp){
    this.nsp = nsp;
    this.rooms = new Map();
    this.sids = new Map();
    this.encoder = new parser.Encoder();
  }

  /**
   * Adds a socket to a room.
   *
   * @param {String} socket id
   * @param {String} room name
   * @param {Function} callback
   * @api public
   */

  add(id, room, fn){
    if (!this.sids.has(id)) this.sids.set(id, new Set());
    this.sids.get(id).add(room);

    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(id);

    if (fn) process.nextTick(fn.bind(null, null));
  }

  /**
   * Removes a socket from a room.
   *
   * @param {String} socket id
   * @param {String} room name
   * @param {Function} callback
   * @api public
   */

  del(id, room, fn){ 
    this.sids.get(id).delete(room);
    this.rooms.get(room).delete(id);
    if (this.rooms.get(room).size == 0) {
       this.rooms.delete(room);     
    }

    if (fn) process.nextTick(fn.bind(null, null));
  }

  /**
   * Removes a socket from all rooms it's joined.
   *
   * @param {String} socket id
   * @param {Function} callback
   * @api public
   */

  delAll(id, fn){
    let rooms = this.sids.get(id);
    for (let room of rooms) {
        this.rooms.get(room).delete(id); 
        if (this.rooms.get(room).size == 0) {
           this.rooms.delete(room);     
        }
    }
    this.sids.delete(id);

    if (fn) process.nextTick(fn.bind(null, null));
  }

  /**
   * Broadcasts a packet.
   *
   * Options:
   *  - `flags` {Object} flags for this packet
   *  - `except` {Array} sids that should be excluded
   *  - `rooms` {Array} list of rooms to broadcast to
   *
   * @param {Object} packet object
   * @api public
   */

  broadcast(packet, opts){
    let rooms = opts.rooms || [];
    let except = opts.except || [];
    let flags = opts.flags || {};
    let ids = {};
    let socket;

    packet.nsp = this.nsp.name;
   
    this.encoder.encode((packet, encodedPackets) => {
      if (rooms.length) {
        for (let i = 0; i < rooms.length; i++) {
          let room = this.rooms.get(rooms[i]);
          if (!room) continue;
          for (let id of room) {
            if (ids[id] || ~except.indexOf(id)) continue;
            socket = this.nsp.connected[id];
            if (socket) {
              socket.packet(encodedPackets, true, flags.volatile);
              ids[id] = true;
            }
          }
        }
      } else {
        for (let id in this.sids) {
          if (~except.indexOf(id)) continue;
          socket = this.nsp.connected[id];
          if (socket) socket.packet(encodedPackets, true, flags.volatile);
        }
      }
    });
  }

  /**
   * Gets a list of clients by sid.
   *
   * @param {Array} explicit set of rooms to check.
   * @api public
   */

  clients(rooms, fn){
    if ('function' == typeof rooms){
      fn = rooms;
      rooms = null;
    }

    rooms = rooms || [];

    let ids = {};
    let sids = [];
    let socket;

    if (rooms.length) {
      for (let i = 0; i < rooms.length; i++) {
        let room = this.rooms.get(rooms[i]);
        if (!room) continue;
        for (let id of room) {
          if (ids[id]) continue;
          socket = this.nsp.connected[id];
          if (socket) {
            sids.push(id);
            ids[id] = true;
          }
        }
      }
    } else {
      for (let id of this.sids) {
        socket = this.nsp.connected[id];
        if (socket) sids.push(id);
      }
    }

    if (fn) process.nextTick(fn.bind(null, null, sids));
  }
}
