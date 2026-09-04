import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from '@/mocks/node';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
