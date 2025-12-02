const dotenv = require("dotenv");
const mongoose = require("mongoose");
const port = 3001
dotenv.config();
const cors = require('cors')

const { exec } = require('child_process');

const app = require("./app");
app.use(cors());

// IMPORTED ROUTES
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const questionRoutes = require("./routes/question");

// CONFIGURATIONS

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
const { execFile } = require('child_process');

app.get('/run-python/:age/:description', (req, res) => {
  let { age, description } = req.params;
  age = age.charAt(0).toUpperCase() + age.slice(1);

  // Use execFile for safer parameter passing
  execFile('python', ['check.py', age, "Vega", "False", description, "fish"], { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing Python script:', stderr || error.message);
      return res.status(400).json({ error: 'Description is not specific enough, hence, no detection.' });
    }

    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (parseError) {
      console.error('Error parsing Python script output:', parseError, 'Output:', stdout);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

// MONGOOSE SETUP

mongoose.connect(process.env.MONGODBURL)
.then(()=> console.log(`DB IS CONNECTED !!`))
.catch((error)=> console.log(`DB Failed To Connect ${error}`))


app.listen(port , ()=> console.log(`SERVER IS RUNNING ON PORT ${port}`))

module.exports = app;