import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { MessageDTO } from "./message";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-2",
  credentials: {
    accessKeyId: "AKIAQMU5WKGPWAGBC7Q2",
    secretAccessKey: "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",
  },
});
const docClient = DynamoDBDocumentClient.from(client);

export const sendMessage = async (message: MessageDTO) => {
  const command = new PutCommand({
    TableName: "mensagens",
    Item: {
      room: message.room,
      timestamp: Math.floor(new Date().getTime() / 1000),
      sender: message.sender,
      msg: message.text,
    },
  });

  const response = await docClient.send(command);
  console.log(response);
  return response.$metadata.httpStatusCode;
};

export const getMessagesByRoom = async (room: string) => {
  const command = new QueryCommand({
    TableName: "mensagens",
    KeyConditionExpression: "room = :room",
    ExpressionAttributeValues: {
      ":room": room,
    },
    ScanIndexForward: true, // true = ordem crescente (antigas para novas)
  });

  const response = await docClient.send(command);
  return response.Items ?? [];
};
