import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { MessageDTO } from "./message";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const sendMessage = async (message: MessageDTO) => {
  const command = new PutCommand({
    TableName: "mensagens",
    Item: {
      room: message.room,
      msg: message.msg,
      sender: message.sender,
      text: message.text,
      time: new Date().toISOString(),
    },
  });

  const response = await docClient.send(command);
  console.log(response);
  return response;
};

