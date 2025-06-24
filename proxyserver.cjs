const express = require('express');
const fetch = require('node-fetch'); // Now this works!
const app = express();
const PORT = 3003;
const cors = require('cors')
app.use(cors()); // ✅ This enables CORS for all routes

app.get('/proxy/pdf/:id', async (req, res) => {
  const { id } = req.params;
  const remoteUrl = `https://api.ods.od.nih.gov/dsld/s3/pdf/${id}.pdf`;

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) throw new Error('PDF not found');

    res.setHeader('Content-Type', response.headers.get('content-type'));
    response.body.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching PDF');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
});
