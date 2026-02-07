const fs = require('fs');
const path = require('path');
require('dotenv').config();


const content = `
export const AUTH_CREDENTIALS = {
  app_url: '${process.env.AUTH_APP_URL}',
  app_name: '${process.env.AUTH_APP_NAME}',
  username: '${process.env.AUTH_USERNAME}',
  password: '${process.env.AUTH_PASSWORD}',
};

export const ONESIGNAL = {
  app_id: '${process.env.ONESIGNAL_APP_ID}',
};
`;

const filePath = path.join(__dirname, '../src/app/secrets.ts');
fs.writeFileSync(filePath, content);
console.log('✅ secrets.ts created');
