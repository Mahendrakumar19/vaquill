const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing API Key:', apiKey ? `${apiKey.substring(0, 15)}...` : 'NOT FOUND');

// Test if API key is valid by listing models
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nStatus Code:', res.statusCode);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('\n✅ API Key is valid!');
      console.log('\nAvailable models:');
      response.models.forEach(model => {
        if (model.name.includes('gemini')) {
          console.log(`  - ${model.name.replace('models/', '')}`);
        }
      });
    } else {
      console.log('\n❌ API Key Error:');
      console.log(data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
