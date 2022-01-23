/*
   Batch loader
 */

// @ts-ignore
import DataLoader from 'dataloader';
import { DefaultSchema } from './schemas';
import { Client, dynamoExecutedCommandsTracer, Table } from './utils/init';

const table = new Table({
  name: 'BatchTest',
  client: Client,
  schema: DefaultSchema,
  dataloader: DataLoader
});

let users: any[];

let data = [
  { name: 'Peter Smith', email: 'peter@example.com', status: 'active' },
  { name: 'Patty O\'Furniture', email: 'patty@example.com', status: 'active' },
  { name: 'Cu Later', email: 'cu@example.com', status: 'inactive' }
];

describe('Loader', () => {
  test('Create', async () => {
    if (!(await table.exists())) {
      await table.createTable();
    }
  });

  test('Seed data', async () => {
    const batch = {};
    for (let item of data) {
      await table.create('User', item, { batch });
    }
    await table.batchWrite(batch);
    users = await table.scan('User');
  });

  test('Batch load', async () => {
    // this will accumulate all gets request into a single batch request
    const items = await Promise.all(
      users.map(user => {
        return table.load('User', { id: user.id });
      })
    );

    expect(dynamoExecutedCommandsTracer).toHaveBeenCalledWith(
      expect.objectContaining({
        commandName: 'BatchGetItemCommand'
      })
    );
    expect(items.length).toBe(data.length);

    for (let item of items) {
      let datum = data.find(i => i.name == item.name);
      expect(item).toMatchObject(datum);
    }
  });

  test('Batch load (duplicate keys on batch get)', async () => {
    // this will perform a single batch get operation with just one item get, and will return to each get the same value
    const items = await Promise.all([
      table.load('User', { id: users[0].id }),
      table.load('User', { id: users[0].id }),
      table.load('User', { id: users[0].id })
    ]);

    expect(dynamoExecutedCommandsTracer).toHaveBeenCalledWith(
      expect.objectContaining({
        commandName: 'BatchGetItemCommand'
      })
    );

    expect(items.length).toBe(3);
    expect(items[0]).toEqual(users[0]);
    expect(items[1]).toEqual(users[0]);
    expect(items[2]).toEqual(users[0]);
  });

  test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever');
  });
});
