import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { Role, BaptismStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import { execSync } from 'child_process';

// Generate unique Person ID
function generatePID(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `PID-${timestamp}-${random}`;
}

// POST - Seed database with sample data
export async function POST() {
  try {
    // Auto-create database tables if they don't exist
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', { timeout: 30000 });
    } catch (pushError) {
      console.error('prisma db push warning:', pushError);
      // Non-fatal - tables might already exist
    }

    // Check if data already exists
    const existingDivisions = await db.division.count();
    if (existingDivisions > 0) {
      return NextResponse.json({
        success: false,
        error: 'Database already seeded. Use reset first.',
      });
    }
    
    const passwordHash = await hashPassword('Password123');
    
    // Create Divisions
    const eud = await db.division.create({
      data: {
        code: 'EUD',
        name: 'Euro-Asia Division',
        headquarters: 'Moscow, Russia',
        description: 'Seventh-day Adventist Church in Euro-Asia region',
      },
    });
    
    const nad = await db.division.create({
      data: {
        code: 'NAD',
        name: 'North American Division',
        headquarters: 'Silver Spring, Maryland, USA',
        description: 'Seventh-day Adventist Church in North America',
      },
    });
    
    // Create Unions
    const uku = await db.union.create({
      data: {
        code: 'UKU',
        name: 'Ukrainian Union',
        divisionId: eud.id,
        headquarters: 'Kyiv, Ukraine',
      },
    });
    
    const buc = await db.union.create({
      data: {
        code: 'BUC',
        name: 'British Union Conference',
        divisionId: eud.id,
        headquarters: 'London, United Kingdom',
      },
    });
    
    const pac = await db.union.create({
      data: {
        code: 'PAC',
        name: 'Pacific Union Conference',
        divisionId: nad.id,
        headquarters: 'Westlake Village, California, USA',
      },
    });
    
    // Create Conferences
    const sec = await db.conference.create({
      data: {
        code: 'SEC',
        name: 'South England Conference',
        unionId: buc.id,
        headquarters: 'London, UK',
      },
    });
    
    const nec = await db.conference.create({
      data: {
        code: 'NEC',
        name: 'North England Conference',
        unionId: buc.id,
        headquarters: 'Manchester, UK',
      },
    });
    
    const uuc = await db.conference.create({
      data: {
        code: 'UUC',
        name: 'Ukrainian Union Conference',
        unionId: uku.id,
        headquarters: 'Kyiv, Ukraine',
      },
    });
    
    const sce = await db.conference.create({
      data: {
        code: 'SCE',
        name: 'Southern California Conference',
        unionId: pac.id,
        headquarters: 'Los Angeles, CA, USA',
      },
    });
    
    // Create Churches
    const churches = await Promise.all([
      db.church.create({
        data: {
          code: '001',
          name: 'London Central SDA Church',
          conferenceId: sec.id,
          address: "Cox's Square, Mile End",
          city: 'London',
          country: 'United Kingdom',
        },
      }),
      db.church.create({
        data: {
          code: '002',
          name: 'Brixton SDA Church',
          conferenceId: sec.id,
          address: 'Brixton Hill',
          city: 'London',
          country: 'United Kingdom',
        },
      }),
      db.church.create({
        data: {
          code: '003',
          name: 'Manchester Central SDA Church',
          conferenceId: nec.id,
          address: 'Oxford Road',
          city: 'Manchester',
          country: 'United Kingdom',
        },
      }),
      db.church.create({
        data: {
          code: '004',
          name: 'Birmingham SDA Church',
          conferenceId: nec.id,
          address: 'City Centre',
          city: 'Birmingham',
          country: 'United Kingdom',
        },
      }),
      db.church.create({
        data: {
          code: '001',
          name: 'Kyiv Central SDA Church',
          conferenceId: uuc.id,
          address: 'City Centre',
          city: 'Kyiv',
          country: 'Ukraine',
        },
      }),
      db.church.create({
        data: {
          code: '001',
          name: 'Los Angeles Central SDA Church',
          conferenceId: sce.id,
          address: 'Downtown LA',
          city: 'Los Angeles',
          country: 'United States',
        },
      }),
    ]);
    
    // Create Users
    const gcAdmin = await db.user.create({
      data: {
        email: 'gc.admin@adventify.org',
        passwordHash,
        fullName: 'General Conference Administrator',
        role: Role.GENERAL_CONFERENCE_ADMIN,
      },
    });
    
    const eudAdmin = await db.user.create({
      data: {
        email: 'eud.admin@adventify.org',
        passwordHash,
        fullName: 'Euro-Asia Division Administrator',
        role: Role.DIVISION_ADMIN,
        divisionId: eud.id,
      },
    });
    
    const bucAdmin = await db.user.create({
      data: {
        email: 'buc.admin@adventify.org',
        passwordHash,
        fullName: 'British Union Administrator',
        role: Role.UNION_ADMIN,
        unionId: buc.id,
      },
    });
    
    const secAdmin = await db.user.create({
      data: {
        email: 'sec.admin@adventify.org',
        passwordHash,
        fullName: 'South England Conference Administrator',
        role: Role.CONFERENCE_ADMIN,
        conferenceId: sec.id,
      },
    });
    
    const churchAdmin = await db.user.create({
      data: {
        email: 'church.admin@adventify.org',
        passwordHash,
        fullName: 'London Central Church Administrator',
        role: Role.CHURCH_ADMIN,
        churchId: churches[0].id,
      },
    });
    
    const churchClerk = await db.user.create({
      data: {
        email: 'church.clerk@adventify.org',
        passwordHash,
        fullName: 'London Central Church Clerk',
        role: Role.CHURCH_CLERK,
        churchId: churches[0].id,
      },
    });
    
    const churchPastor = await db.user.create({
      data: {
        email: 'church.pastor@adventify.org',
        passwordHash,
        fullName: 'Pastor James Wilson',
        role: Role.CHURCH_PASTOR,
        churchId: churches[0].id,
      },
    });
    
    // Create Persons
    const persons = await Promise.all([
      db.person.create({
        data: {
          pid: generatePID(),
          fullName: 'John Smith',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'Male',
          email: 'john.smith@email.com',
          phone: '+44 7700 900123',
          churchId: churches[0].id,
        },
      }),
      db.person.create({
        data: {
          pid: generatePID(),
          fullName: 'Maria Garcia',
          dateOfBirth: new Date('1985-08-22'),
          gender: 'Female',
          email: 'maria.garcia@email.com',
          phone: '+44 7700 900456',
          churchId: churches[0].id,
        },
      }),
      db.person.create({
        data: {
          pid: generatePID(),
          fullName: 'David Johnson',
          dateOfBirth: new Date('1995-03-10'),
          gender: 'Male',
          email: 'david.johnson@email.com',
          churchId: churches[1].id,
        },
      }),
      db.person.create({
        data: {
          pid: generatePID(),
          fullName: 'Sarah Williams',
          dateOfBirth: new Date('1988-11-28'),
          gender: 'Female',
          email: 'sarah.williams@email.com',
          churchId: churches[2].id,
        },
      }),
      db.person.create({
        data: {
          pid: generatePID(),
          fullName: 'Michael Brown',
          dateOfBirth: new Date('1992-07-04'),
          gender: 'Male',
          churchId: churches[0].id,
        },
      }),
    ]);
    
    // Create Baptism Records
    const baptismRecords = await Promise.all([
      db.baptismRecord.create({
        data: {
          personId: persons[0].id,
          churchId: churches[0].id,
          baptismDate: new Date('2024-06-15'),
          pastorName: 'Pastor James Wilson',
          pastorTitle: 'Senior Pastor',
          status: BaptismStatus.APPROVED,
          approvedBy: secAdmin.id,
          approvedAt: new Date('2024-06-16'),
        },
      }),
      db.baptismRecord.create({
        data: {
          personId: persons[1].id,
          churchId: churches[0].id,
          baptismDate: new Date('2024-06-15'),
          pastorName: 'Pastor James Wilson',
          pastorTitle: 'Senior Pastor',
          status: BaptismStatus.APPROVED,
          approvedBy: secAdmin.id,
          approvedAt: new Date('2024-06-16'),
        },
      }),
      db.baptismRecord.create({
        data: {
          personId: persons[2].id,
          churchId: churches[1].id,
          baptismDate: new Date('2024-12-01'),
          pastorName: 'Pastor Emily Thompson',
          status: BaptismStatus.PENDING,
        },
      }),
      db.baptismRecord.create({
        data: {
          personId: persons[3].id,
          churchId: churches[2].id,
          baptismDate: new Date('2024-09-20'),
          pastorName: 'Pastor Robert Davis',
          status: BaptismStatus.APPROVED,
          approvedBy: secAdmin.id,
          approvedAt: new Date('2024-09-21'),
        },
      }),
      db.baptismRecord.create({
        data: {
          personId: persons[4].id,
          churchId: churches[0].id,
          baptismDate: new Date('2025-01-10'),
          pastorName: 'Pastor James Wilson',
          pastorTitle: 'Senior Pastor',
          status: BaptismStatus.PENDING,
        },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        divisions: 2,
        unions: 3,
        conferences: 4,
        churches: churches.length,
        users: 8,
        persons: persons.length,
        baptismRecords: baptismRecords.length,
        credentials: [
          { email: 'gc.admin@adventify.org', password: 'Password123', role: 'General Conference Admin' },
          { email: 'eud.admin@adventify.org', password: 'Password123', role: 'Division Admin (Euro-Asia)' },
          { email: 'buc.admin@adventify.org', password: 'Password123', role: 'Union Admin (British)' },
          { email: 'sec.admin@adventify.org', password: 'Password123', role: 'Conference Admin (South England)' },
          { email: 'church.admin@adventify.org', password: 'Password123', role: 'Church Admin (London Central)' },
          { email: 'church.clerk@adventify.org', password: 'Password123', role: 'Church Clerk (London Central)' },
          { email: 'church.pastor@adventify.org', password: 'Password123', role: 'Church Pastor (London Central)' },
        ],
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}
