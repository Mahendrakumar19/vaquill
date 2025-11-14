const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini() {
  try {
    // Try gemini-pro first
    console.log('\nTrying gemini-pro...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Say hello');
    const response = await result.response;
    console.log('✅ gemini-pro works!');
    console.log('Response:', response.text());
  } catch (error) {
    console.log('❌ gemini-pro failed:', error.message);
    
    // Try gemini-1.5-flash
    try {
      console.log('\nTrying gemini-1.5-flash...');
      const model2 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result2 = await model2.generateContent('Say hello');
      const response2 = await result2.response;
      console.log('✅ gemini-1.5-flash works!');
      console.log('Response:', response2.text());
    } catch (error2) {
      console.log('❌ gemini-1.5-flash failed:', error2.message);
    }
  }
}

testGemini();
