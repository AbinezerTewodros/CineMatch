const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const test = async () => {
  try {
    console.log('--- Starting Backend Verification ---');

    // 1. Health check
    console.log('Testing Health Check...');
    const health = await axios.get('http://localhost:5000/health');
    console.log('Health:', health.data.status);

    // 2. Register
    console.log('Testing Registration...');
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      username: `tester_${Date.now()}`,
      password: 'password123'
    };
    const regRes = await axios.post(`${API_URL}/auth/register`, testUser);
    const token = regRes.data.token;
    console.log('Successfully registered user:', testUser.username);

    // 3. Login
    console.log('Testing Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('Successfully logged in.');

    // 4. Movies
    console.log('Testing Movie Listing...');
    const moviesRes = await axios.get(`${API_URL}/movies`);
    console.log(`Found ${moviesRes.data.length} movies.`);

    // 5. Recommendations
    console.log('Testing Recommendations...');
    const recsRes = await axios.get(`${API_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Received ${recsRes.data.length} personalized recommendations.`);

    // 6. Chat
    console.log('Testing Chatbot (OpenRouter)...');
    const chatRes = await axios.post(`${API_URL}/chat`, {
      message: 'Recommend a good space movie for me.'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('AI Reply:', chatRes.data.reply);

    console.log('--- Verification SUCCESSFUL ---');
    process.exit(0);
  } catch (err) {
    console.error('Verification FAILED:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.stack || err.message);
    }
    process.exit(1);
  }
};

test();
