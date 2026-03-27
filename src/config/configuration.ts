export default () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    environment: process.env.NODE_ENV ?? 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiration: process.env.JWT_EXPIRATION || '24H',
    },
    openweather: {
        apiKey: process.env.OPENWEATHER_API_KEY,
        baseUrl: process.env.OPENWEATHER_URL || 'https://api.openweathermap.org/data/2.5',
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1000', 10),
    },
});
