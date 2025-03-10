import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    const movieId = event.pathParameters?.movieId;
    
    // 验证 movieId 是否存在且为数字
    if (!movieId || isNaN(Number(movieId))) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid movie ID format" }),
      };
    }

    const commandOutput = await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: Number(movieId) }, // 假设主键是数字类型的 "id"
        ReturnValues: "ALL_OLD", // 返回被删除的条目数据
      })
    );

    // 如果条目不存在
    if (!commandOutput.Attributes) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Movie not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Movie deleted successfully",
        deletedItem: commandOutput.Attributes,
      }),
    };
  } catch (error) {
    console.error("Delete Error:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};