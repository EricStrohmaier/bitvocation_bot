# Use an official Node.js runtime as a parent image, specifying the platform
FROM --platform=linux/amd64 node:16

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript (assuming your build script is configured in package.json)
RUN npm run build

EXPOSE 8080

# Specify the command to run on container start
CMD ["npm", "start"]
