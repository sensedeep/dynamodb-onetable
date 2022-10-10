import {Client, Table} from './utils/init'
import {DynamoDBRecord} from "aws-lambda/trigger/dynamodb-stream";

const table = new Table({
    name: 'StreamTestTable',
    client: Client,
    partial: false,
    schema: {
        format: 'onetable:1.1.0',
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
        },
        models: {
            User: {
                pk: {type: String, value: '${_type}#${id}'},
                sk: {type: String, value: '${_type}#'},
                id: {type: String},
                name: {type: String},
                registered: {type: Date},
                profile: {
                    type: Object,
                    schema: {
                        dob: {type: Date},
                    },
                },
            },
        },
        params: {
            isoDates: true,
            timestamps: true,
        },
    },
})

const event = {
    Records: [
        {
            eventID: 'f07f8ca4b0b26cb9c4e5e77e42f274ee',
            eventName: 'INSERT',
            eventVersion: '1.1',
            eventSource: 'aws:dynamodb',
            awsRegion: 'us-east-1',
            dynamodb: {
                ApproximateCreationDateTime: 1480642020,
                Keys: {
                    val: {
                        S: 'data'
                    },
                    key: {
                        S: 'binary'
                    }
                },
                NewImage: {
                    _type: {S: 'User'},
                    pk: {S: 'User#1234'},
                    sk: {S: 'User#'},
                    id: {S: '1234'},
                    name: {S: 'alice'},
                    registered: {S: '2022-01-01Z'},
                    profile: {
                        M: {
                            dob: {S: '2000-01-01Z'},
                        },
                    },
                },
            },
            eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/Example-Table/stream/2016-12-01T00:00:00.000'
        },
        {
            eventID: 'f07f8ca4b0b26cb9c4e5e77e42f274ee',
            eventName: 'MODIFY',
            eventVersion: '1.1',
            eventSource: 'aws:dynamodb',
            awsRegion: 'us-east-1',
            dynamodb: {
                ApproximateCreationDateTime: 1480642020,
                Keys: {
                    val: {
                        S: 'data'
                    },
                    key: {
                        S: 'binary'
                    }
                },
                NewImage: {
                    _type: {S: 'User'},
                    pk: {S: 'User#1235'},
                    sk: {S: 'User#'},
                    id: {S: '1235'},
                    name: {S: 'bob'},
                    registered: {S: '2022-01-02Z'},
                    profile: {
                        M: {
                            dob: {S: '1999-06-01Z'},
                        },
                    },
                },
                OldImage: {
                    _type: {S: 'User'},
                    pk: {S: 'User#1235'},
                    sk: {S: 'User#'},
                    id: {S: '1235'},
                    name: {S: 'rob'},
                    registered: {S: '2022-01-02Z'},
                    profile: {
                        M: {
                            dob: {S: '1999-06-01Z'},
                        },
                    },
                },
                eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/Example-Table/stream/2016-12-01T00:00:00.000'
            }
        }
    ]
}

test('Stream has New Images', async () => {
    const streamModels = table.stream(event.Records as DynamoDBRecord[]);
    const newModels = streamModels.User.filter((streamModel) => !!streamModel.new)
      .map((streamModel) => streamModel.new)

    expect(newModels).toHaveLength(2);
    expect(newModels[0]).toEqual(
        expect.objectContaining({
            id: '1234',
            name: 'alice',
            registered: new Date('2022-01-01Z'),
        })
    )
    expect(newModels[1]).toEqual(
      expect.objectContaining({
          id: '1235',
          name: 'bob',
          registered: new Date('2022-01-02Z'),
      })
    )
})

test('Stream has Old Images', async () => {
    const streamModels = table.stream(event.Records as DynamoDBRecord[]);
    const oldModels = streamModels.User.filter((streamModel) => !!streamModel.old)
      .map((streamModel) => streamModel.old)

    expect(oldModels).toHaveLength(1);
    expect(oldModels[0]).toEqual(
      expect.objectContaining({
          name: 'rob',
          registered: new Date('2022-01-02Z'),
      })
    )
})