// Usage: node updateCurrentQuestionsCount.js
const mongoose = require('mongoose');
const path = require('path');

// Load your dbConfig and models
const dbConfig = require('./dbConfig/dbConfig');
const Round = require('./models/rounds').default || require('./models/rounds');
const Question = require('./models/questions').default || require('./models/questions');

async function main() {
  await dbConfig.connect();
  const rounds = await Round.find({});
  for (const round of rounds) {
    const count = await Question.countDocuments({ roundname: round._id });
    round.currentQuestionsCount = count;
    await round.save();
    console.log(`Updated round ${round.roundname} (${round._id}): currentQuestionsCount = ${count}`);
  }
  mongoose.connection.close();
  console.log('All rounds updated.');
}

main().catch(err => {
  console.error(err);
  mongoose.connection.close();
}); 