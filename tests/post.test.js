const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Post = require('../models/Post');

describe('Post Tests', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    const MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/facebook-pro-test';
    await mongoose.connect(MONGO_URI);

    // Create test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01'
      });

    token = response.body.token;
    userId = response.body.user._id;
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clear posts after each test
    await Post.deleteMany({});
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        content: 'This is a test post',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.post.content).toBe(postData.content);
      expect(response.body.post.author._id).toBe(userId);
    });

    it('should not create post without authentication', async () => {
      const postData = {
        content: 'This is a test post'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/posts/feed', () => {
    beforeEach(async () => {
      // Create test posts
      await Post.create([
        {
          content: 'Post 1',
          author: userId,
          visibility: 'public'
        },
        {
          content: 'Post 2',
          author: userId,
          visibility: 'public'
        }
      ]);
    });

    it('should get user feed', async () => {
      const response = await request(app)
        .get('/api/posts/feed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.posts.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/posts/:id/like', () => {
    let postId;

    beforeEach(async () => {
      const post = await Post.create({
        content: 'Test post',
        author: userId,
        visibility: 'public'
      });
      postId = post._id;
    });

    it('should like a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.likesCount).toBe(1);
    });

    it('should unlike a post', async () => {
      // Like first
      await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`);

      // Unlike
      const response = await request(app)
        .delete(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.likesCount).toBe(0);
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    let postId;

    beforeEach(async () => {
      const post = await Post.create({
        content: 'Test post',
        author: userId,
        visibility: 'public'
      });
      postId = post._id;
    });

    it('should add a comment to a post', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.comment.content).toBe(commentData.content);
    });
  });
});
