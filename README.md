# Bitvocation Bot

## Installation

To install the necessary dependencies, run:
```bash
npm install
```

## Starting the Server

To start the server, use:
```bash
npm run start
```

## Docker

You can also use Docker to build and run the Bitvocation Bot.

### Docker Hub

The Docker image is available on Docker Hub:
[Bitvocation Bot on Docker Hub](https://hub.docker.com/r/ericstrohmaier/bitvocation_bot/tags)

### Build Docker Image

To build the Docker image locally, run:
```bash
docker build -t bitvocation_bot .
```

### Run Docker Container

To run the Docker container, use the following command, replacing the placeholders with your actual Supabase and Telegram bot credentials:
```bash
docker run --name bitvocation_bot -d -e SUPABASE_KEY='<KEY>' -e BITVOCATION_BOT_TOKEN='<TELEGRAM_BOT_TOKEN>' -e SUPABASE_URL="<URL>" bitvocation_bot:latest
```

## Environment Variables

Make sure to replace the placeholders in the Docker run command with your actual credentials:
- `SUPABASE_KEY`: Your Supabase API key.
- `BITVOCATION_BOT_TOKEN`: Your Telegram bot token.
- `SUPABASE_URL`: Your Supabase project URL.

You can set these variables in your shell or in a `.env` file if you're using a tool like `dotenv`.

```env
SUPABASE_KEY=your_supabase_key
BITVOCATION_BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
```

And then use a command to load them:
```bash
export $(cat .env | xargs) && docker run --name bitvocation_bot -d bitvocation_bot:latest
```

## Root Route

The root route can be accessed at:
```
GET /
```

This route will respond with a status code of 200 and "Hello World!".
```