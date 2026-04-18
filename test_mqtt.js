const mqtt = require('mqtt');
require('dotenv').config({ path: './.env' });

const client = mqtt.connect(`${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`, {
  clientId: 'test_' + Math.random(),
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS
});

client.on('connect', () => {
  console.log('Connected');
  client.subscribe('tuan11ung/response');
  client.subscribe('tuan11ung/control');
  // Publish a fake control message to see if ESP replies
  client.publish('tuan11ung/control', 'FAN_ON');
});

client.on('message', (topic, message) => {
  console.log(`[${topic}]`, message.toString());
});

setTimeout(() => {
  client.end();
  process.exit(0);
}, 10000);
