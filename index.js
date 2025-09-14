
const aedes = require('aedes')();
const server = require('net').createServer(aedes.handle);
const http = require('http').createServer();
const WebSocket = require('ws');
const mongoose = require('mongoose');
const express = require('express');
const app = express();
require('dotenv').config();

// Middleware
app.use(express.json());
const cors = require('cors');
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://rfid-frontend-vert.vercel.app'];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Input validation middleware
const validateHotelId = (req, res, next) => {
  const hotelId = req.params.hotelId;
  if (!hotelId || !/^[1-8]$/.test(hotelId)) {
    return res.status(400).json({ error: 'Invalid hotel ID. Must be 1-8' });
  }
  next();
};

// Database connection check middleware
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  next();
};
app.use('/api', checkDatabaseConnection);

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL;
mongoose.connect(mongoUrl)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Please make sure MongoDB is running or update MONGO_URL in .env file');
  });

// Schemas
const hotelSchema = new mongoose.Schema({
  id: String,
  name: String,
  location: String,
  address: String,
  phone: String,
  email: String,
  rating: Number,
  description: String,
  image: String,
  status: String,
  lastActivity: String,
  manager: {
    name: String,
    phone: String,
    email: String,
    status: String,
  },
}, { timestamps: true });

const roomSchema = new mongoose.Schema({
  hotelId: String,
  number: String,
  status: String,
  hasMasterKey: Boolean,
  hasLowPower: Boolean,
  powerStatus: String,
  occupantType: String,
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  hotelId: String,
  card_uid: String,
  role: String,
  check_in: String,
  check_out: String,
  duration: Number,
  room: String,
  building: String,
  floorNumber: String,
  timestamp: String,
  isCheckedIn: Boolean,
  deviceInfo: {
    ssid: String,
    mqttServer: String,
    mqttPort: Number,
    roomNumber: String,
    building: String,
    floorNumber: String,
    ntpServer: String,
    gmtOffset: Number
  }
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  hotelId: String,
  card_uid: String,
  role: String,
  alert_message: String,
  triggered_at: String,
  room: String,
  building: String,
  floorNumber: String,
  alertType: String,
  severity: String,
  resolved: Boolean,
}, { timestamps: true });

const deniedSchema = new mongoose.Schema({
  hotelId: String,
  card_uid: String,
  role: String,
  denial_reason: String,
  attempted_at: String,
  room: String,
  building: String,
  floorNumber: String,
  attemptCount: Number,
  ipAddress: String,
  deviceInfo: String,
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  hotelId: String,
  id: String,
  name: String,
  email: String,
  role: String,
  status: String,
  lastLogin: String,
  avatar: String,
}, { timestamps: true });

const cardSchema = new mongoose.Schema({
  hotelId: String,
  id: String,
  roomNumber: String,
  guestName: String,
  status: String,
  expiryDate: String,
  lastUsed: String,
  card_uid: String,
  role: String,
  building: String,
  floorNumber: String,
  isActive: Boolean,
  batteryLevel: Number,
  accessCount: Number,
}, { timestamps: true });

const deviceSchema = new mongoose.Schema({
  deviceId: String,
  hotelId: String,
  room: String,
  building: String,
  floorNumber: String,
  ssid: String,
  mqttServer: String,
  mqttPort: Number,
  lastSeen: Date,
  firmwareVersion: String,
  uptime: Number,
  freeHeap: Number,
  wifiSignal: Number,
  isOnline: Boolean,
}, { timestamps: true });

const presenceSchema = new mongoose.Schema({
  hotelId: String,
  card_uid: String,
  room: String,
  building: String,
  floorNumber: String,
  isPresent: Boolean,
  lastDetected: Date,
  presenceDuration: Number,
  cardAbsentCount: Number,
  deviceId: String,
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  hotelId: String,
  id: String,
  type: String,
  action: String,
  user: String,
  time: String,
}, { timestamps: true });

const Hotel = mongoose.model('Hotel', hotelSchema);
const Room = mongoose.model('Room', roomSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Alert = mongoose.model('Alert', alertSchema);
const Denied = mongoose.model('Denied', deniedSchema);
const User = mongoose.model('User', userSchema);
const Card = mongoose.model('Card', cardSchema);
const Device = mongoose.model('Device', deviceSchema);
const Presence = mongoose.model('Presence', presenceSchema);
const Activity = mongoose.model('Activity', activitySchema);

// Initialize Hotel Data
async function initializeHotels() {
  const hotels = [
    {
      id: "1",
      name: "Coastal Grand Hotel - Ooty",
      location: "Ooty, Tamil Nadu",
      address: "456 Hill Road, Ooty, Tamil Nadu",
      phone: "+91 90476 28844",
      email: "rajesh.kumar@coastalgrand.com",
      rating: 4.7,
      description: "Scenic hill station hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "2 minutes ago",
      manager: {
        name: "Rajesh Kumar",
        phone: "+91 90476 28844",
        email: "rajesh.kumar@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "2",
      name: "Coastal Grand Hotel - Salem",
      location: "Salem, Tamil Nadu",
      address: "123 Main Street, Salem, Tamil Nadu",
      phone: "+91 90476 28844",
      email: "priya.devi@coastalgrand.com",
      rating: 4.8,
      description: "Premium hotel in the heart of Salem with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "5 minutes ago",
      manager: {
        name: "Priya Devi",
        phone: "+91 90476 28844",
        email: "priya.devi@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "3",
      name: "Coastal Grand Hotel - Yercaud",
      location: "Yercaud, Tamil Nadu",
      address: "789 Mountain View, Yercaud, Tamil Nadu",
      phone: "+91 90476 28844",
      email: "arun.balaji@coastalgrand.com",
      rating: 4.6,
      description: "Scenic hill station hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "10 minutes ago",
      manager: {
        name: "Arun Balaji",
        phone: "+91 90476 28844",
        email: "arun.balaji@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "4",
      name: "Coastal Grand Hotel - Puducherry",
      location: "Puducherry, Union Territory",
      address: "321 Beach Road, Puducherry, Union Territory",
      phone: "+91 90476 28844",
      email: "lakshmi.priya@coastalgrand.com",
      rating: 4.5,
      description: "Heritage hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "maintenance",
      lastActivity: "1 hour ago",
      manager: {
        name: "Lakshmi Priya",
        phone: "+91 90476 28844",
        email: "lakshmi.priya@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "5",
      name: "Coastal Grand Hotel - Namakkal",
      location: "Namakkal, Tamil Nadu",
      address: "654 City Center, Namakkal, Tamil Nadu",
      phone: "+91 90476 28844",
      email: "senthil.kumar@coastalgrand.com",
      rating: 4.4,
      description: "Premium hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "15 minutes ago",
      manager: {
        name: "Senthil Kumar",
        phone: "+91 90476 28844",
        email: "senthil.kumar@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "6",
      name: "Coastal Grand Hotel - Chennai",
      location: "Chennai, Tamil Nadu",
      address: "987 Marina Beach Road, Chennai, Tamil Nadu",
      phone: "+91 90476 28844",
      email: "vijay.anand@coastalgrand.com",
      rating: 4.9,
      description: "Metropolitan hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "30 minutes ago",
      manager: {
        name: "Vijay Anand",
        phone: "+91 90476 28844",
        email: "vijay.anand@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "7",
      name: "Coastal Grand Hotel - Bangalore",
      location: "Bangalore, Karnataka",
      address: "147 MG Road, Bangalore, Karnataka",
      phone: "+91 90476 28844",
      email: "deepa.sharma@coastalgrand.com",
      rating: 4.7,
      description: "Metropolitan hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "45 minutes ago",
      manager: {
        name: "Deepa Sharma",
        phone: "+91 90476 28844",
        email: "deepa.sharma@coastalgrand.com",
        status: "online",
      },
    },
    {
      id: "8",
      name: "Coastal Grand Hotel - Kotagiri",
      location: "Kotagiri, Tamil Nadu",
      address: "258 Tea Estate Road, Kotagiri, Tamil Nadu",
      phone: "+91 90476 28844",
      email: "mohan.raj@coastalgrand.com",
      rating: 4.6,
      description: "Scenic hill station hotel with modern amenities and exceptional service.",
      image: "/placeholder.jpg",
      status: "active",
      lastActivity: "1 hour ago",
      manager: {
        name: "Mohan Raj",
        phone: "+91 90476 28844",
        email: "mohan.raj@coastalgrand.com",
        status: "online",
      },
    },
  ];

  for (const hotel of hotels) {
    await Hotel.findOneAndUpdate({ id: hotel.id }, hotel, { upsert: true });
  }
  console.log("Hotels initialized");
}

// Initialize Room Data for all hotels
async function initializeRooms() {
  const hotels = await Hotel.find();
  
  for (const hotel of hotels) {
    const hotelId = hotel.id;
    const roomCount = getRoomCountForHotel(hotelId);
    
    const roomsPerFloor = Math.ceil(roomCount / 2);
    let roomId = 1;
    
    for (let i = 101; i <= 100 + roomsPerFloor; i++) {
      const roomData = {
        hotelId: hotelId,
        number: i.toString(),
        status: 'vacant',
        hasMasterKey: false,
        hasLowPower: false,
        powerStatus: 'off',
        occupantType: null,
      };
      
      await Room.findOneAndUpdate(
        { hotelId: hotelId, number: i.toString() },
        roomData,
        { upsert: true }
      );
      roomId++;
    }
    
    if (roomCount > roomsPerFloor) {
      const remainingRooms = roomCount - roomsPerFloor;
      for (let i = 201; i <= 200 + remainingRooms; i++) {
        const roomData = {
          hotelId: hotelId,
          number: i.toString(),
          status: 'vacant',
          hasMasterKey: false,
          hasLowPower: false,
          powerStatus: 'off',
          occupantType: null,
        };
        
        await Room.findOneAndUpdate(
          { hotelId: hotelId, number: i.toString() },
          roomData,
          { upsert: true }
        );
        roomId++;
      }
    }
  }
  console.log("Rooms initialized for all hotels");
}

function getRoomCountForHotel(hotelId) {
  const roomCounts = {
    "1": 25, // Ooty
    "2": 30, // Salem
    "3": 20, // Yercaud
    "4": 28, // Puducherry
    "5": 22, // Namakkal
    "6": 30, // Chennai
    "7": 30, // Bangalore
    "8": 18, // Kotagiri
  };
  return roomCounts[hotelId] || 20;
}

mongoose.connection.once('open', () => {
  initializeHotels();
  initializeRooms();
});

// MQTT Client (External Broker for Production/Render)
const mqtt = require('mqtt');
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const mqttClient = mqtt.connect(mqttBrokerUrl, {
  reconnectPeriod: 1000, // Reconnect every 1 second if disconnected
});

mqttClient.on('connect', () => {
  console.log(`Connected to MQTT broker: ${mqttBrokerUrl}`);
  mqttClient.subscribe('campus/room/+/+/+/+', (err) => {
    if (err) {
      console.error('MQTT subscription error:', err);
    } else {
      console.log('Subscribed to campus/room/+/+/+/+');
    }
  });
});

mqttClient.on('close', () => {
  console.log('Disconnected from MQTT broker, attempting to reconnect...');
});

mqttClient.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

mqttClient.on('message', async (topic, message) => {
  if (topic.startsWith('campus/room/')) {
    try {
      const data = JSON.parse(message.toString());
      const [, , building, floor, roomNum, type] = topic.split('/');
      
      if (!floor || !roomNum || !type) {
        console.error('Invalid MQTT topic format:', topic);
        return;
      }
      
      data.room = roomNum;
      data.hotelId = floor; // Map floor to hotelId
      data.building = building;
      data.floorNumber = floor;
      data.timestamp = new Date().toISOString();

      let newActivity = null;

      if (type === 'attendances') {
        const attendanceData = {
          ...data,
          card_uid: data.card_uid,
          role: data.role,
          check_in: data.check_in,
          check_out: data.check_out,
          duration: data.duration,
          isCheckedIn: data.check_in ? true : false,
          deviceInfo: {
            ssid: data.ssid || 'unknown',
            mqttServer: data.mqttServer || 'broker.hivemq.com',
            mqttPort: data.mqttPort || 1883,
            roomNumber: data.room,
            building: data.building,
            floorNumber: data.floorNumber,
            ntpServer: data.ntpServer || 'pool.ntp.org',
            gmtOffset: data.gmtOffset_sec || 19800
          }
        };
        
        await new Attendance(attendanceData).save();
        console.log(`Saved MQTT attendance for room ${roomNum} in hotel ${data.hotelId}:`, attendanceData);

        // Save device info
        const deviceData = {
          deviceId: data.deviceId || `ESP32_${roomNum}`,
          hotelId: data.hotelId,
          room: roomNum,
          building: data.building,
          floorNumber: data.floorNumber,
          ssid: data.ssid || 'unknown',
          mqttServer: data.mqttServer || 'broker.hivemq.com',
          mqttPort: data.mqttPort || 1883,
          lastSeen: new Date(),
          firmwareVersion: data.firmwareVersion || 'unknown',
          uptime: data.uptime || 0,
          freeHeap: data.freeHeap || 0,
          wifiSignal: data.wifiSignal || 0,
          isOnline: true
        };
        await Device.findOneAndUpdate(
          { deviceId: deviceData.deviceId },
          deviceData,
          { upsert: true }
        );

        // Save presence info
        const presenceData = {
          hotelId: data.hotelId,
          card_uid: data.card_uid,
          room: roomNum,
          building: data.building,
          floorNumber: data.floorNumber,
          isPresent: data.check_in ? true : false,
          lastDetected: new Date(),
          presenceDuration: data.duration || 0,
          cardAbsentCount: data.cardAbsentCount || 0,
          deviceId: deviceData.deviceId
        };
        await Presence.findOneAndUpdate(
          { hotelId: data.hotelId, card_uid: data.card_uid, room: roomNum },
          presenceData,
          { upsert: true }
        );

        let update = {};
        let hasMasterKeyUpdate = {};
        if (data.check_in) {
          const status = data.role === 'Maintenance' ? 'maintenance' : 'occupied';
          update = {
            status,
            occupantType: data.role.toLowerCase(),
            powerStatus: 'on',
          };
          if (data.role === 'Manager') {
            hasMasterKeyUpdate = { hasMasterKey: true };
          }
        } else {
          update = {
            status: 'vacant',
            occupantType: null,
            powerStatus: 'off',
          };
          if (data.role === 'Manager') {
            hasMasterKeyUpdate = { hasMasterKey: false };
          }
        }
        const fullUpdate = { ...update, ...hasMasterKeyUpdate };
        const updatedRoom = await Room.findOneAndUpdate(
          { hotelId: data.hotelId, number: roomNum },
          fullUpdate,
          { upsert: true, new: true }
        );
        broadcastToClients(`roomUpdate:${data.hotelId}`, { roomNum, ...fullUpdate });

        const activityType = data.check_in ? 'checkin' : 'checkout';
        const action = `${data.role} checked ${data.check_in ? 'in' : 'out'} to Room ${data.room}`;
        const time = data.check_in || data.check_out;
        newActivity = {
          hotelId: data.hotelId,
          id: new Date().getTime().toString(),
          type: activityType,
          action,
          user: data.role,
          time,
        };
      } else if (type === 'denied_access') {
        await new Denied(data).save();
        console.log(`Saved denied access for room ${roomNum} in hotel ${data.hotelId}:`, data);

        const action = `Denied access to ${data.role}: ${data.denial_reason} for Room ${data.room}`;
        const time = data.attempted_at;
        newActivity = {
          hotelId: data.hotelId,
          id: new Date().getTime().toString(),
          type: 'security',
          action,
          user: data.role,
          time,
        };
      }

      if (newActivity) {
        const savedActivity = await new Activity(newActivity).save();
        broadcastToClients(`activityUpdate:${data.hotelId}`, savedActivity);
      }
    } catch (err) {
      console.error('Error processing MQTT message:', err);
    }
  }
});

// Local MQTT Broker (Development Only)
if (process.env.NODE_ENV === 'development') {
  const mqttPort = process.env.MQTT_PORT || 1883;
  server.listen(mqttPort, () => {
    console.log(`Local MQTT broker listening on port ${mqttPort}`);
  });

  aedes.on('publish', async (packet, client) => {
    if (packet.topic.startsWith('campus/room/')) {
      try {
        const data = JSON.parse(packet.payload.toString());
        const [, , building, floor, roomNum, type] = packet.topic.split('/');
        
        if (!floor || !roomNum || !type) {
          console.error('Invalid MQTT topic format:', packet.topic);
          return;
        }
        
        data.room = roomNum;
        data.hotelId = floor;
        data.building = building;
        data.floorNumber = floor;

        let newActivity = null;

        if (type === 'attendances') {
          const attendanceData = {
            ...data,
            card_uid: data.card_uid,
            role: data.role,
            check_in: data.check_in,
            check_out: data.check_out,
            duration: data.duration,
            isCheckedIn: data.check_in ? true : false,
            deviceInfo: {
              ssid: data.ssid || 'unknown',
              mqttServer: data.mqttServer || 'localhost',
              mqttPort: data.mqttPort || 1883,
              roomNumber: data.room,
              building: data.building,
              floorNumber: data.floorNumber,
              ntpServer: data.ntpServer || 'pool.ntp.org',
              gmtOffset: data.gmtOffset_sec || 19800
            }
          };
          
          await new Attendance(attendanceData).save();
          console.log(`Saved local MQTT attendance for room ${roomNum} in hotel ${data.hotelId}:`, attendanceData);

          const deviceData = {
            deviceId: data.deviceId || `ESP32_${roomNum}`,
            hotelId: data.hotelId,
            room: roomNum,
            building: data.building,
            floorNumber: data.floorNumber,
            ssid: data.ssid || 'unknown',
            mqttServer: data.mqttServer || 'localhost',
            mqttPort: data.mqttPort || 1883,
            lastSeen: new Date(),
            firmwareVersion: data.firmwareVersion || 'unknown',
            uptime: data.uptime || 0,
            freeHeap: data.freeHeap || 0,
            wifiSignal: data.wifiSignal || 0,
            isOnline: true
          };
          await Device.findOneAndUpdate(
            { deviceId: deviceData.deviceId },
            deviceData,
            { upsert: true }
          );

          const presenceData = {
            hotelId: data.hotelId,
            card_uid: data.card_uid,
            room: roomNum,
            building: data.building,
            floorNumber: data.floorNumber,
            isPresent: data.check_in ? true : false,
            lastDetected: new Date(),
            presenceDuration: data.duration || 0,
            cardAbsentCount: data.cardAbsentCount || 0,
            deviceId: deviceData.deviceId
          };
          await Presence.findOneAndUpdate(
            { hotelId: data.hotelId, card_uid: data.card_uid, room: roomNum },
            presenceData,
            { upsert: true }
          );

          let update = {};
          let hasMasterKeyUpdate = {};
          if (data.check_in) {
            const status = data.role === 'Maintenance' ? 'maintenance' : 'occupied';
            update = {
              status,
              occupantType: data.role.toLowerCase(),
              powerStatus: 'on',
            };
            if (data.role === 'Manager') {
              hasMasterKeyUpdate = { hasMasterKey: true };
            }
          } else {
            update = {
              status: 'vacant',
              occupantType: null,
              powerStatus: 'off',
            };
            if (data.role === 'Manager') {
              hasMasterKeyUpdate = { hasMasterKey: false };
            }
          }
          const fullUpdate = { ...update, ...hasMasterKeyUpdate };
          const updatedRoom = await Room.findOneAndUpdate(
            { hotelId: data.hotelId, number: roomNum },
            fullUpdate,
            { upsert: true, new: true }
          );
          broadcastToClients(`roomUpdate:${data.hotelId}`, { roomNum, ...fullUpdate });

          const activityType = data.check_in ? 'checkin' : 'checkout';
          const action = `${data.role} checked ${data.check_in ? 'in' : 'out'} to Room ${data.room}`;
          const time = data.check_in || data.check_out;
          newActivity = {
            hotelId: data.hotelId,
            id: new Date().getTime().toString(),
            type: activityType,
            action,
            user: data.role,
            time,
          };
        } else if (type === 'denied_access') {
          await new Denied(data).save();
          console.log(`Saved denied access for room ${roomNum} in hotel ${data.hotelId}:`, data);

          const action = `Denied access to ${data.role}: ${data.denial_reason} for Room ${data.room}`;
          const time = data.attempted_at;
          newActivity = {
            hotelId: data.hotelId,
            id: new Date().getTime().toString(),
            type: 'security',
            action,
            user: data.role,
            time,
          };
        }

        if (newActivity) {
          const savedActivity = await new Activity(newActivity).save();
          broadcastToClients(`activityUpdate:${data.hotelId}`, savedActivity);
        }
      } catch (err) {
        console.error('Error processing local MQTT message:', err);
      }
    }
  });
}

// HTTP API Endpoints for Frontend
app.get('/api/hotel/:hotelId', validateHotelId, async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ id: req.params.hotelId });
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    const rooms = await Room.find({ hotelId: req.params.hotelId });
    const totalRooms = rooms.length;
    const activeRooms = rooms.filter((r) => r.status === 'occupied' || r.status === 'maintenance').length;
    const occupancy = totalRooms ? Math.round((activeRooms / totalRooms) * 100) : 0;
    res.json({ ...hotel.toObject(), totalRooms, activeRooms, occupancy });
  } catch (error) {
    console.error('Error fetching hotel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/hotel/:hotelId', validateHotelId, async (req, res) => {
  try {
    await Hotel.findOneAndUpdate({ id: req.params.hotelId }, req.body, { upsert: true });
    res.json({ message: 'Hotel updated successfully' });
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hotels', async (req, res) => {
  try {
    const hotels = await Hotel.find();
    const hotelsWithStats = await Promise.all(
      hotels.map(async (hotel) => {
        const rooms = await Room.find({ hotelId: hotel.id });
        const totalRooms = rooms.length;
        const activeRooms = rooms.filter((r) => r.status === 'occupied' || r.status === 'maintenance').length;
        const occupancy = totalRooms ? Math.round((activeRooms / totalRooms) * 100) : 0;
        return { ...hotel.toObject(), totalRooms, activeRooms, occupancy };
      })
    );
    res.json(hotelsWithStats);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/rooms/:hotelId', validateHotelId, async (req, res) => {
  try {
    const rooms = await Room.find({ hotelId: req.params.hotelId }).sort({ number: 1 });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attendance/:hotelId', validateHotelId, async (req, res) => {
  try {
    const data = await Attendance.find({ hotelId: req.params.hotelId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/alerts/:hotelId', validateHotelId, async (req, res) => {
  try {
    const data = await Alert.find({ hotelId: req.params.hotelId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/denied_access/:hotelId', validateHotelId, async (req, res) => {
  try {
    const data = await Denied.find({ hotelId: req.params.hotelId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Error fetching denied access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:hotelId', validateHotelId, async (req, res) => {
  try {
    const data = await User.find({ hotelId: req.params.hotelId });
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/cards/:hotelId', validateHotelId, async (req, res) => {
  try {
    const data = await Card.find({ hotelId: req.params.hotelId });
    res.json(data);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/activity/:hotelId', validateHotelId, async (req, res) => {
  try {
    const data = await Activity.find({ hotelId: req.params.hotelId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mount Express app on HTTP server
http.on('request', app);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server: http });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToClients(event, data) {
  const message = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start HTTP/WebSocket Server
const httpPort = process.env.HTTP_PORT || 3000;
http.listen(httpPort, () => {
  console.log(`HTTP/WebSocket server listening on port ${httpPort}`);
  console.log(`API endpoints available at http://localhost:${httpPort}/api`);
  console.log(`WebSocket server available at ws://localhost:${httpPort} (use wss://rfid-backend-odtg.onrender.com for Render)`);
});
