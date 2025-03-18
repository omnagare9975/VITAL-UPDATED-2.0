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

app.get('/run-python/:age/:description', (req, res) => {
  // Execute the Python script
  let { age, description } = req.params;
  // let age = "true";
  // const description = "My eyes feel dry.";
  age = age.charAt(0).toUpperCase() + age.slice(1);
  // const command = `python check.py ${age} "Vega" False "${description}"`;
  // const description = "My bones feel weak.";
  exec(`python check.py ${age} "Vega" False "${description}" "fish"`, {maxBuffer: undefined}, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error}`);
      return res.status(501).json({ error: 'Description is not specific enough, hence, no detection.' });
    }

    // Assuming the Python script prints a JSON result to stdout
    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (parseError) {
      console.error(`Error parsing Python script output: ${parseError}`);
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