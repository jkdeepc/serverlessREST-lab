import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// 复用原文件中的 DynamoDB 客户端配置
const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // 复用原参数解析逻辑
    const movieId = event.pathParameters?.movieId;
    const includeCast = event.queryStringParameters?.cast === "true";

    if (!movieId || isNaN(Number(movieId))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid movie ID" }),
      };
    }

    // 复用原电影查询逻辑
    const movieResult = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: Number(movieId) },
      })
    );

    if (!movieResult.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Movie not found" }) };
    }

    // 新增演员查询逻辑
    let castData = [];
    if (includeCast) {
      const castResult = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.CAST_TABLE_NAME,
          KeyConditionExpression: "movieId = :movieId",
          ExpressionAttributeValues: { ":movieId": Number(movieId) },
        })
      );
      castData = castResult.Items || [];
    }

    // 保持与原响应格式兼容
    return {
      statusCode: 200,
      body: JSON.stringify({
        ...movieResult.Item,
        ...(includeCast && { cast: castData }) // 新增字段
      }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Error" }) };
  }
};