// MongoDB init script — runs once when the container is first created
// Creates the "vital" database and a dedicated app user

db = db.getSiblingDB('vital');

db.createCollection('users');
db.createCollection('questions');

print('✅ VITAL database initialised');
