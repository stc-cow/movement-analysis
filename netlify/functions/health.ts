export default async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "ok",
      message: "Netlify Functions are working",
    }),
  };
};
