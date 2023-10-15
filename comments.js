// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

// Create web server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object to store comments
const commentsByPostId = {};

// Create a route for getting comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a route for posting comments
app.post('/posts/:id/comments', async (req, res) => {
  // Create a random id for the comment
  const commentId = randomBytes(4).toString('hex');
  // Get the content from the request body
  const { content } = req.body;
  // Get the comments for the post id
  const comments = commentsByPostId[req.params.id] || [];
  // Add a new comment to the comments list
  comments.push({ id: commentId, content, status: 'pending' });
  // Update the comments list
  commentsByPostId[req.params.id] = comments;
  // Send an event to the event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });
  // Send the new comments list
  res.status(201).send(comments);
});

// Create a route for receiving events
app.post('/events', async (req, res) => {
  // Get the event from the request body
  const { type, data } = req.body;
  // Check if the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comments for the post id
    const comments = commentsByPostId[data.postId];
    // Find the comment with the same id
    const comment = comments.find(comment => {
      return comment.id === data.id;
    });
    // Update the comment status
    comment.status = data.status;
    // Send an event to the event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'Comment