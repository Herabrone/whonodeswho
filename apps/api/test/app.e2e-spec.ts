import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { PersistedState } from '@relationflow/contracts';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { SEED_GRAPH, SEED_POSITIONS } from './../src/auth/seed-data';
import { PrismaService } from './../src/prisma/prisma.service';

const projectRoot = join(__dirname, '..');
const testDatabasePath = join(__dirname, 'relationflow.e2e.db');
const testDatabaseUrl = 'file:../test/relationflow.e2e.db';

function removeTestDatabase() {
  for (const filePath of [
    testDatabasePath,
    `${testDatabasePath}-journal`,
    `${testDatabasePath}-shm`,
    `${testDatabasePath}-wal`,
  ]) {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}

function pushTestSchema() {
  const command = join(
    projectRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
  );
  const schemaPath = join(projectRoot, 'prisma', 'schema.prisma');
  execSync(`"${command}" db push --skip-generate --schema "${schemaPath}"`, {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: 'pipe',
  });
}

describe('Auth and graph endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailCounter = 0;

  function createEmail(prefix: string): string {
    emailCounter += 1;
    return `${prefix}-${emailCounter}@example.com`;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.SESSION_SECRET = 'relationflow-e2e-secret';
    removeTestDatabase();
    pushTestSchema();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser());
    app.use(
      session({
        name: 'relationflow.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          maxAge: 1000 * 60 * 60 * 24 * 7,
        },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    removeTestDatabase();
  });

  it('registers a user, sets a session cookie, and seeds graph data', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: createEmail('register'), password: 'password123' })
      .expect(201);

    expect(response.body.user).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email: expect.stringMatching(/register-\d+@example\.com/),
      }),
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('relationflow.sid=')]),
    );

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: response.body.user.email },
    });
    expect(JSON.parse(user.graphJson)).toEqual(SEED_GRAPH);
    expect(JSON.parse(user.positionsJson)).toEqual(SEED_POSITIONS);
  });

  it('rejects duplicate registration', async () => {
    const email = createEmail('duplicate');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(409);
  });

  it('logs in with valid credentials and returns a session cookie', async () => {
    const email = createEmail('login');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    expect(response.body).toEqual({
      user: expect.objectContaining({
        id: expect.any(String),
        email,
      }),
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('relationflow.sid=')]),
    );
  });

  it('rejects login with a wrong password', async () => {
    const email = createEmail('wrong-password');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'not-the-password' })
      .expect(401);
  });

  it('returns the current user when a session exists', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = createEmail('me');

    const registerResponse = await agent
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await agent.get('/auth/me').expect(200).expect({
      user: registerResponse.body.user,
    });
  });

  it('returns null from /auth/me without a session', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(200).expect({ user: null });
  });

  it('destroys the session on logout', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/auth/register')
      .send({ email: createEmail('logout'), password: 'password123' })
      .expect(201);

    await agent.post('/auth/logout').send({}).expect(201).expect({ user: null });
    await agent.get('/auth/me').expect(200).expect({ user: null });
  });

  it('rejects unauthenticated graph requests', async () => {
    await request(app.getHttpServer()).get('/graph').expect(401);
  });

  it('returns the seeded graph for a newly registered user', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/auth/register')
      .send({ email: createEmail('graph-seed'), password: 'password123' })
      .expect(201);

    await agent.get('/graph').expect(200).expect({
      graph: SEED_GRAPH,
      positions: SEED_POSITIONS,
      layout: {
        layoutMode: 'free',
        treeShape: 'grouped',
        treeRootId: null,
      },
    });
  });

  it('saves and loads graph changes for the signed-in user', async () => {
    const agent = request.agent(app.getHttpServer());
    const payload: PersistedState = {
      graph: {
        people: [
          {
            id: 'p1',
            name: 'Avery Stone',
            notes: 'Test person',
            createdAt: '2024-02-01T00:00:00.000Z',
            updatedAt: '2024-02-01T00:00:00.000Z',
          },
        ],
        relationships: [],
      },
      positions: {
        p1: { x: 10, y: 20 },
      },
      layout: {
        layoutMode: 'tree',
        treeShape: 'layered',
        treeRootId: 'p1',
      },
    };

    await agent
      .post('/auth/register')
      .send({ email: createEmail('graph-save'), password: 'password123' })
      .expect(201);

    await agent.put('/graph').send(payload).expect(200).expect(payload);
    await agent.get('/graph').expect(200).expect(payload);
  });

  it('clears the graph for the signed-in user', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/auth/register')
      .send({ email: createEmail('graph-clear'), password: 'password123' })
      .expect(201);

    await agent.delete('/graph').expect(200).expect({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: {
        layoutMode: 'free',
        treeShape: 'grouped',
        treeRootId: null,
      },
    });
  });
});
