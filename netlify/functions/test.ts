export default async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "ok",
      message: "Test function is working",
      timestamp: new Date().toISOString(),
    }),
  };
};
