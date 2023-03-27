const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

// Database configuration

const userSchema = new Schema({
  username: {
    type: String
  }
}, { versionKey: false });

const exerciseSchema = new Schema({
  username: {
    type: String
  },
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: Date
  },
  userId: {
    type: String
  }
}, { versionKey: false });

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// POST method route for creating a new user
app.post('/api/users', async function (req, res) {
  try {
    const username = req.body.username;
    const foundUser = await User.findOne({ username })

    if (foundUser) {
      res.json(foundUser)
    }

    let newUser = new User({ username: username })
    await newUser.save();
    console.log('User created successfully');
    res.json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating user');
  }
});

// GET method route for retrieving all users
app.get('/api/users', async function (req, res) {
  try {
    const users = await User.find({});
    console.log('Retrieved all users successfully');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving users');
  }
});

// Handle POST requests to create a new exercise for a specific user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.params._id);

    if (!user) {
      // Return a 404 error if the user was not found
      return res.status(404).json({ message: 'User not found' });
    }
    // Create a new exercise object with the request body data
    const exercise = new Exercise({
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      userId: user._id
    });

    // Save the exercise to the database
    const savedExercise = await exercise.save();

    // Return the new exercise object as JSON
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date ? new Date(savedExercise.date).toDateString() : new Date().toDateString(),
      _id: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get("/api/users/:_id/logs", async function (req, res) {
  let { from, to, limit } = req.query;
  const userId = req.params._id;
  const foundUser = await User.findById(userId)

  if (!foundUser) {
    // Return a 404 error if the user was not found
    return res.status(404).json({ message: 'User not found' });
  }

  let filter = { userId };
  let dateFilter = {};
  if (from) {
    dateFilter["$gte"] = new Date(from)
  }
  if (to) {
    dateFilter["$lte"] = new Date(to)
  }
  if (from || to) {
    filter.date = dateFilter;
  }

  if (!limit) {
    limit = 100;
  }

  let exercises = await Exercise.find(filter).limit(limit)
  exercises = exercises.map((exercise) => {
    return {
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    }
  })

  res.json({
    username: foundUser.username,
    count: exercises.length,
    _id: userId,
    log: exercises
  })
})