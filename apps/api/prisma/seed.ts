import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const defaultPassword = await bcrypt.hash('Nidhivan@2024', 10);

  const users = [
    { name: 'Rishabh Sharma', email: 'nidhivanproperty@gmail.com', role: Role.ADMIN, phone: null },
    { name: 'Dolly Sharma', email: 'dolly@nidhivanproperty.com', role: Role.SALES_AGENT, phone: null },
    { name: 'Archana', email: 'archana@nidhivanproperty.com', role: Role.SALES_AGENT, phone: null },
    { name: 'Sandhya Rajput', email: 'sandhya@nidhivanproperty.com', role: Role.SALES_AGENT, phone: null },
    { name: 'Uma Joshi', email: 'uma@nidhivanproperty.com', role: Role.SALES_AGENT, phone: null },
    { name: 'Rashi', email: 'rashi@nidhivanproperty.com', role: Role.TELECALLER, phone: null },
    { name: 'Khushi Agnihotri', email: 'khushi@nidhivanproperty.com', role: Role.TELECALLER, phone: null },
    { name: 'Anushka', email: 'anushka@nidhivanproperty.com', role: Role.TELECALLER, phone: null },
  ];

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: defaultPassword,
        role: u.role,
        isActive: true,
      },
    });
    createdUsers.push(user);
    console.log(`  ✓ User: ${user.name} (${user.role})`);
  }

  // Set up round-robin for Sales Agents + Telecallers
  const assignableUsers = createdUsers.filter(
    (u) => u.role === Role.SALES_AGENT || u.role === Role.TELECALLER,
  );
  for (let i = 0; i < assignableUsers.length; i++) {
    await prisma.roundRobinConfig.upsert({
      where: { userId: assignableUsers[i].id },
      update: {},
      create: {
        userId: assignableUsers[i].id,
        queueOrder: i,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ Round-robin configured for ${assignableUsers.length} agents`);

  console.log('\nSeed complete. Login credentials:');
  console.log('  Admin: nidhivanproperty@gmail.com / Nidhivan@2024');
  console.log('  Agents: [name]@nidhivanproperty.com / Nidhivan@2024');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
