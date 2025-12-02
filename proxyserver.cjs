// pdf-proxy.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = 3003;

app.use(cors()); // allow http://localhost:3000 etc.

app.get('/proxy/pdf/:id', async (req, res) => {
  const { id } = req.params;
  const remoteUrl = `https://api.ods.od.nih.gov/dsld/s3/pdf/${id}.pdf`;

  try {
    const response = await fetch(remoteUrl);

    if (!response.ok) {
      console.error('PDF not found:', remoteUrl, response.status);
      return res.status(404).send('PDF not found');
    }

    res.setHeader(
      'Content-Type',
      response.headers.get('content-type') || 'application/pdf'
    );

    response.body.pipe(res);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).send('Error fetching PDF');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PDF proxy running at http://localhost:${PORT}`);
});
