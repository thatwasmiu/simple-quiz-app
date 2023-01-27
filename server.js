// import libraries
const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');


//set up express
const app = express();

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

//set up mongo database

const DATABASE_NAME = 'wpr-quiz';
const MONGO_URL = `mongodb://localhost:27017/${ DATABASE_NAME }`;

let db = null;
let questions = null;
let attempts = null;

async function startServer() {
    const client = await mongodb.MongoClient.connect(MONGO_URL);
    // Set the db and collection variables before starting the server.
    db = client.db();
    questions = db.collection('questions');
    attempts = db.collection('attempts');

    await app.listen(3000);
    console.log('Server listening on port 3000');

}

startServer();

// get new attempt
app.post('/attempts', async (req, res) => {

    const docs = await questions.aggregate([{$sample: {size: 10 }}]);
    const ten_random_questions = await docs.toArray();
    
    const correctAnswers = {};
    for (const question of ten_random_questions) {
        correctAnswers[`${question._id}`] = question.correctAnswer;
        delete question.correctAnswer;
    }

    const id = new mongodb.ObjectId();
    const attempt = {
        questions: ten_random_questions,
        completed: false,
        score: 0,
        _id: id,
        correctAnswers: correctAnswers,
        startedAt: new Date(),
        __v: 0
    };
    
    const status = await attempts.insertOne(attempt);
    if (!status.acknowledged) {
        return res.status(501).send('Some thing went wrong');
    }

    delete attempt.correctAnswers;
    res.status(201).json(attempt);
});

// get attempt results
app.post('/attempts/:id/submit', async (req, res) => {
    
    const attemptId = req.params.id;
    const attempt = await attempts.findOne({_id : mongodb.ObjectId(attemptId)});

    if (attempt === null) {
        return res.status(400).send('Invalid request!');
    }
    
    const order = {
        questions: null,
        completed: null,
        score: null
    };


    if (attempt.completed) {
        const result = await Object.assign(order, attempt);
        return res.status(201).json(result);
    }

    const userAnswers = req.body.userAnswers;
    const correctAnswers = attempt.correctAnswers;
    let score = 0;


    for (const answer in userAnswers ) {
        if (Number(userAnswers[answer]) === correctAnswers[answer]) {
            score++;
        }
    }

    let scoreText = "";
    if (score < 5) {
        scoreText = "Practice more to improve it :D"
    } else if (score < 7) {
        scoreText = "Good, keep up!";
    } else if (score < 9) {
        scoreText = "Well done!"
    } else {
        scoreText = "Perfect!!"
    }

    attempt.completed = true;
    attempt.score = score;
    attempt.userAnswers = userAnswers;
    attempt.scoreText = scoreText;

    const status = await attempts.updateOne({_id : mongodb.ObjectId(attemptId)},
                             {$set: {completed: true, score: score, userAnswers: userAnswers, scoreText: scoreText}}
    );
    if (!status.acknowledged) {
        return res.status(501).send('Some thing went wrong');
    }

    const result = await Object.assign(order, attempt);
    res.status(200).json(result);
});
