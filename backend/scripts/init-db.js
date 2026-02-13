#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SubnetScore = require('../models/SubnetScore');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deai-nexus';

async function initializeDatabase() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     DeAI Nexus Database Initialization v2.0           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@deai.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isActive: true,
        preferences: {
          theme: 'dark',
          minScore: 0,
          favoriteSubnets: [],
          watchlist: []
        }
      });
      console.log('✓ Admin user created');
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
      console.log('  ⚠️  Please change the password after first login!\n');
    } else {
      console.log('✓ Admin user already exists\n');
    }

    // Create demo user
    console.log('👤 Creating demo user...');
    let demoUser = await User.findOne({ email: 'demo@deai.com' });
    if (!demoUser) {
      demoUser = await User.create({
        username: 'demo',
        email: 'demo@deai.com',
        password: 'demo123',
        role: 'user',
        isActive: true,
        preferences: {
          theme: 'dark',
          minScore: 0,
          favoriteSubnets: [],
          watchlist: []
        }
      });
      console.log('✓ Demo user created');
      console.log('  Email: demo@deai.com');
      console.log('  Password: demo123\n');
    } else {
      console.log('✓ Demo user already exists\n');
    }

    // Create sample subnet scores if none exist
    console.log('📊 Checking subnet scores...');
    const scoreCount = await SubnetScore.countDocuments();
    
    if (scoreCount === 0) {
      console.log('📝 Creating sample subnet scores...');
      
      const sampleSubnets = [
        {
          netuid: 1,
          name: 'Subnet 1',
          category: 'Inference',
          scores: {
            composite: 85,
            fundamental: 80,
            performance: 88,
            economic: 82,
            development: 85,
            decentralization: 78
          },
          metrics: {
            price: 1250,
            marketCap: 125000000,
            volume24h: 5000000,
            emission: 100,
            fundamentalValue: 1200,
            premium: 0.04,
            emissionEfficiency: 1000,
            validators: 50,
            miners: 200,
            holders: 5000,
            topHolderPct: 15
          },
          recommendation: 'Buy',
          risk: 'Low',
          rank: { overall: 1, byCategory: 1, byMarketCap: 1, byEfficiency: 2 }
        },
        {
          netuid: 3,
          name: 'Subnet 3',
          category: 'Data Preparation',
          scores: {
            composite: 78,
            fundamental: 75,
            performance: 80,
            economic: 76,
            development: 79,
            decentralization: 75
          },
          metrics: {
            price: 850,
            marketCap: 85000000,
            volume24h: 3000000,
            emission: 80,
            fundamentalValue: 820,
            premium: 0.036,
            emissionEfficiency: 1062.5,
            validators: 40,
            miners: 150,
            holders: 3000,
            topHolderPct: 18
          },
          recommendation: 'Hold',
          risk: 'Low',
          rank: { overall: 3, byCategory: 1, byMarketCap: 3, byEfficiency: 1 }
        },
        {
          netuid: 4,
          name: 'Subnet 4',
          category: 'Text Prompt',
          scores: {
            composite: 72,
            fundamental: 70,
            performance: 75,
            economic: 71,
            development: 73,
            decentralization: 68
          },
          metrics: {
            price: 650,
            marketCap: 65000000,
            volume24h: 2500000,
            emission: 70,
            fundamentalValue: 620,
            premium: 0.048,
            emissionEfficiency: 928.6,
            validators: 35,
            miners: 120,
            holders: 2500,
            topHolderPct: 20
          },
          recommendation: 'Monitor',
          risk: 'Medium',
          rank: { overall: 5, byCategory: 1, byMarketCap: 5, byEfficiency: 5 }
        }
      ];

      await SubnetScore.insertMany(sampleSubnets);
      console.log(`✓ Created ${sampleSubnets.length} sample subnet scores\n`);
    } else {
      console.log(`✓ ${scoreCount} subnet scores already exist\n`);
    }

    // Create indexes
    console.log('🔧 Creating database indexes...');
    await User.collection.createIndex({ email: 1 });
    await User.collection.createIndex({ username: 1 });
    await SubnetScore.collection.createIndex({ netuid: 1 });
    await SubnetScore.collection.createIndex({ 'scores.composite': -1 });
    console.log('✓ Indexes created\n');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Database initialization completed successfully!      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('🚀 Next steps:');
    console.log('   1. npm install (if not done already)');
    console.log('   2. npm start');
    console.log('   3. Open http://localhost:3000 in your browser\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
