const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Friendship = require('../models/Friendship');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...'.cyan.underline);
  } catch (err) {
    console.error('MongoDB connection error:'.red, err);
    process.exit(1);
  }
};

const users = [
  {
    email: 'admin@facebookpro.com',
    username: 'admin',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Pro',
    gender: 'other',
    role: 'admin',
    isVerified: true,
    bio: 'Platform Administrator'
  },
  {
    email: 'john.doe@example.com',
    username: 'johndoe',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'male',
    isVerified: true,
    bio: 'Software Developer | Tech Enthusiast | Coffee Lover ☕'
  },
  {
    email: 'jane.smith@example.com',
    username: 'janesmith',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Smith',
    gender: 'female',
    isVerified: true,
    bio: 'Digital Marketer | Traveler | Photography 📸'
  },
  {
    email: 'mike.johnson@example.com',
    username: 'mikejohnson',
    password: 'Password123!',
    firstName: 'Mike',
    lastName: 'Johnson',
    gender: 'male',
    isVerified: true,
    bio: 'Entrepreneur | Fitness Enthusiast'
  },
  {
    email: 'sarah.williams@example.com',
    username: 'sarahwilliams',
    password: 'Password123!',
    firstName: 'Sarah',
    lastName: 'Williams',
    gender: 'female',
    isVerified: true,
    bio: 'Graphic Designer | Artist | Nature Lover 🌿'
  },
  {
    email: 'david.brown@example.com',
    username: 'davidbrown',
    password: 'Password123!',
    firstName: 'David',
    lastName: 'Brown',
    gender: 'male',
    isVerified: true,
    bio: 'Data Scientist | AI Enthusiast'
  }
];

const posts = [
  { content: 'Just launched my new project! Excited to share it with everyone 🚀', visibility: 'public' },
  { content: 'Beautiful sunset today. Nature never fails to amaze me 🌅', visibility: 'public' },
  { content: 'Coffee and coding - the perfect morning combo ☕💻', visibility: 'friends' },
  { content: 'Had an amazing weekend with friends. Great memories! 🎉', visibility: 'friends' },
  { content: 'New blog post about React best practices is live!', visibility: 'public' },
  { content: 'Working on something big. Stay tuned! 🔥', visibility: 'public' },
  { content: 'Morning workout done. Feeling energized! 💪', visibility: 'public' }
];

const groups = [
  {
    name: 'Web Developers Hub',
    description: 'Community for web developers to share knowledge and projects',
    privacy: 'public',
    category: 'technology'
  },
  {
    name: 'Photography Lovers',
    description: 'Share your best shots and get feedback from fellow photographers',
    privacy: 'public',
    category: 'photography'
  },
  {
    name: 'Fitness Motivation',
    description: 'Daily motivation, tips, and support for your fitness journey',
    privacy: 'public',
    category: 'health'
  },
  {
    name: 'Startup Founders',
    description: 'Connect with entrepreneurs and grow your startup',
    privacy: 'private',
    category: 'business'
  }
];

const seedDB = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...'.yellow);
    await User.deleteMany({});
    await Post.deleteMany({});
    await Group.deleteMany({});
    await Friendship.deleteMany({});

    console.log('Creating users...'.green);
    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`.green);

    // Create friendships
    console.log('Creating friendships...'.green);
    const friendships = [];
    for (let i = 1; i < createdUsers.length - 1; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        friendships.push({
          requester: createdUsers[i]._id,
          recipient: createdUsers[j]._id,
          status: 'accepted'
        });
        createdUsers[i].friends.push(createdUsers[j]._id);
        createdUsers[j].friends.push(createdUsers[i]._id);
      }
    }
    await Friendship.insertMany(friendships);
    await Promise.all(createdUsers.map(u => u.save()));
    console.log(`Created friendships between users`.green);

    // Create posts
    console.log('Creating posts...'.green);
    const createdPosts = [];
    for (let i = 0; i < posts.length; i++) {
      const post = await Post.create({
        ...posts[i],
        user: createdUsers[(i % (createdUsers.length - 1)) + 1]._id
      });
      createdPosts.push(post);
    }
    console.log(`Created ${createdPosts.length} posts`.green);

    // Create groups
    console.log('Creating groups...'.green);
    for (let i = 0; i < groups.length; i++) {
      const creator = createdUsers[i % createdUsers.length];
      const group = await Group.create({
        ...groups[i],
        creator: creator._id,
        admins: [creator._id],
        members: [creator._id]
      });

      // Add random members
      const memberCount = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < memberCount; j++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        if (!group.members.includes(randomUser._id)) {
          group.members.push(randomUser._id);
        }
      }
      group.memberCount = group.members.length;
      await group.save();
    }
    console.log(`Created ${groups.length} groups with members`.green);

    console.log('\nDatabase seeded successfully! 🎉'.green.bold);
    console.log('\nLogin Credentials:'.cyan.bold);
    console.log('Admin: admin@facebookpro.com / Admin123!'.cyan);
    console.log('Users: [any user email] / Password123!'.cyan);

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:'.red, err);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    console.log('Destroying all data...'.red);
    await User.deleteMany({});
    await Post.deleteMany({});
    await Group.deleteMany({});
    await Friendship.deleteMany({});
    console.log('All data destroyed!'.red.bold);
    process.exit(0);
  } catch (err) {
    console.error('Destroy failed:'.red, err);
    process.exit(1);
  }
};

if (process.argv.includes('--destroy')) {
  destroyData();
} else {
  seedDB();
}
